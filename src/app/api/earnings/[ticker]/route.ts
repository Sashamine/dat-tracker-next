// GET /api/earnings/[ticker] - Company earnings history
import { NextResponse } from "next/server";
import { getCompanyEarnings, getNextEarnings } from "@/lib/data/earnings-data";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const upperTicker = ticker.toUpperCase();

    const earnings = getCompanyEarnings(upperTicker);
    const nextEarnings = getNextEarnings(upperTicker);

    return NextResponse.json({
      earnings,
      nextEarnings,
    });
  } catch (error) {
    console.error("Error fetching company earnings:", error);
    return NextResponse.json(
      { error: "Failed to fetch company earnings" },
      { status: 500 }
    );
  }
}
