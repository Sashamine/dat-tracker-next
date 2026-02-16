import { NextResponse } from "next/server";
import { HOLDINGS_HISTORY } from "@/lib/data/holdings-history";

export const dynamic = "force-dynamic";

interface DataPoint {
  ticker: string;
  asset: string;
  date: string;
  holdings: number;
  sharesOutstanding: number;
  holdingsPerShare: number;
  source: string;
  sourceUrl: string | null;
  sourceType: string;
  verified?: boolean;
}

export async function GET() {
  const dataPoints: DataPoint[] = [];

  for (const [ticker, companyData] of Object.entries(HOLDINGS_HISTORY)) {
    for (const entry of companyData.history) {
      dataPoints.push({
        ticker,
        asset: companyData.asset,
        date: entry.date,
        holdings: entry.holdings,
        sharesOutstanding: entry.sharesOutstanding,
        holdingsPerShare: entry.holdingsPerShare,
        source: entry.source || "Unknown",
        sourceUrl: entry.sourceUrl || null,
        sourceType: entry.sourceType || "unknown",
        verified: false, // TODO: Load from database
      });
    }
  }

  // Sort by ticker then date (newest first)
  dataPoints.sort((a, b) => {
    if (a.ticker !== b.ticker) return a.ticker.localeCompare(b.ticker);
    return b.date.localeCompare(a.date);
  });

  return NextResponse.json({
    dataPoints,
    stats: {
      total: dataPoints.length,
      withSourceUrl: dataPoints.filter((d) => d.sourceUrl).length,
      bySourceType: dataPoints.reduce((acc, d) => {
        acc[d.sourceType] = (acc[d.sourceType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    },
  });
}
