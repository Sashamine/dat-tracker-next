// GET /api/earnings/yield-leaderboard - Treasury yield rankings (quarterly-based)
import { NextResponse } from "next/server";
import { getQuarterlyYieldLeaderboard, getAvailableQuarters, type CorporateActionsByTicker } from "@/lib/data/earnings-data";
import { D1Client } from "@/lib/d1";
import { Asset, CalendarQuarter } from "@/lib/types";

export const dynamic = "force-dynamic";

function isValidQuarter(q: string): q is CalendarQuarter {
  return /^Q[1-4]-\d{4}$/.test(q);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const quarterParam = searchParams.get("quarter");
    const asset = searchParams.get("asset") as Asset | null;

    // Get available quarters
    const availableQuarters = getAvailableQuarters();

    // Use specified quarter or default to most recent
    const quarter = (quarterParam && isValidQuarter(quarterParam))
      ? quarterParam
      : availableQuarters[0];

    // Preload corporate_actions once and pass into pure computation.
    // (Avoids async/DB access inside earnings-data.ts which is used by client components too.)
    let actionsByTicker: CorporateActionsByTicker | undefined = undefined;
    if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_D1_DATABASE_ID && process.env.CLOUDFLARE_API_TOKEN) {
      const d1 = D1Client.fromEnv();
      const out = await d1.query<{ entity_id: string; effective_date: string; ratio: number }>(
        `SELECT entity_id, effective_date, ratio
         FROM corporate_actions
         ORDER BY entity_id ASC, effective_date ASC, created_at ASC;`
      );
      actionsByTicker = {};
      for (const r of out.results) {
        const k = (r.entity_id || '').toUpperCase();
        if (!k) continue;
        (actionsByTicker[k] ||= []).push({ effective_date: r.effective_date, ratio: r.ratio });
      }
    }

    const leaderboard = getQuarterlyYieldLeaderboard({
      quarter,
      asset: asset || undefined,
      actionsByTicker,
    });

    return NextResponse.json({
      leaderboard,
      quarter,
      availableQuarters,
      count: leaderboard.length,
    });
  } catch (error) {
    console.error("Error fetching yield leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch yield leaderboard" },
      { status: 500 }
    );
  }
}
