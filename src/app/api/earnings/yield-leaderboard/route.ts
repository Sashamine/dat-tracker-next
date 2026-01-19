// GET /api/earnings/yield-leaderboard - Treasury yield rankings (quarterly-based)
import { NextResponse } from "next/server";
import { getQuarterlyYieldLeaderboard, getAvailableQuarters } from "@/lib/data/earnings-data";
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

    const leaderboard = getQuarterlyYieldLeaderboard({
      quarter,
      asset: asset || undefined,
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
