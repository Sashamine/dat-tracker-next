// GET /api/earnings/yield-leaderboard - Treasury yield rankings
import { NextResponse } from "next/server";
import { getTreasuryYieldLeaderboard } from "@/lib/data/earnings-data";
import { Asset, YieldPeriod } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_PERIODS: YieldPeriod[] = ["1W", "1M", "3M", "1Y"];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get("period") || "1Y";
    const period = VALID_PERIODS.includes(periodParam as YieldPeriod)
      ? (periodParam as YieldPeriod)
      : "1Y";
    const asset = searchParams.get("asset") as Asset | null;

    const leaderboard = getTreasuryYieldLeaderboard({
      period,
      asset: asset || undefined,
    });

    return NextResponse.json({
      leaderboard,
      period,
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
