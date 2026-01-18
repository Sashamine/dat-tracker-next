// GET /api/earnings - Earnings calendar
import { NextResponse } from "next/server";
import { getEarningsCalendar } from "@/lib/data/earnings-data";
import { Asset } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "90", 10);
    const asset = searchParams.get("asset") as Asset | null;
    const upcoming = searchParams.get("upcoming") !== "false";

    const entries = getEarningsCalendar({
      days,
      asset: asset || undefined,
      upcoming,
    });

    return NextResponse.json({
      entries,
      count: entries.length,
    });
  } catch (error) {
    console.error("Error fetching earnings calendar:", error);
    return NextResponse.json(
      { error: "Failed to fetch earnings calendar" },
      { status: 500 }
    );
  }
}
