// GET /api/earnings/yield-leaderboard - Treasury yield rankings
import { NextResponse } from "next/server";
import { getTreasuryYieldLeaderboard, getQuarterlyYieldLeaderboard, getAvailableQuarters } from "@/lib/data/earnings-data";
import { Asset, YieldPeriod, CalendarQuarter } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_PERIODS: YieldPeriod[] = ["1W", "1M", "3M", "1Y"];

function isValidQuarter(q: string): q is CalendarQuarter {
  return /^Q[1-4]-\d{4}$/.test(q);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get("period");
    const quarterParam = searchParams.get("quarter");
    const asset = searchParams.get("asset") as Asset | null;

    // If quarter is specified, use quarterly leaderboard
    if (quarterParam && isValidQuarter(quarterParam)) {
      const leaderboard = getQuarterlyYieldLeaderboard({
        quarter: quarterParam,
        asset: asset || undefined,
      });

      return NextResponse.json({
        leaderboard,
        quarter: quarterParam,
        availableQuarters: getAvailableQuarters(),
        count: leaderboard.length,
      });
    }

    // Otherwise use period-based leaderboard
    const period = VALID_PERIODS.includes(periodParam as YieldPeriod)
      ? (periodParam as YieldPeriod)
      : "1Y";

    const leaderboard = getTreasuryYieldLeaderboard({
      period,
      asset: asset || undefined,
    });

    return NextResponse.json({
      leaderboard,
      period,
      availableQuarters: getAvailableQuarters(),
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
