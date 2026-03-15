import { NextRequest, NextResponse } from "next/server";
import { D1Client } from "@/lib/d1";

/**
 * GET /api/mnav/yesterday
 *
 * Returns the most recent mNAV snapshot that is at least 20 hours old
 * for each company. Reads from D1 `mnav_snapshots` table, which is
 * populated by the /api/cron/mnav-snapshot cron job.
 *
 * This replaces the old approach of reconstructing yesterday's mNAV
 * from stock/crypto price history, which was fragile (currency mismatches,
 * missing history for illiquid stocks, dilution recalculation bugs).
 */

interface YesterdayMnavResult {
  [ticker: string]: {
    mnav: number | null;
    stockPrice: number;
    cryptoPrice: number;
    date: string;
  };
}

// Cache for 5 minutes (snapshots don't change frequently)
let cache: { data: YesterdayMnavResult; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET() {
  // Check cache
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const d1 = D1Client.fromEnv();

    // Find snapshots that are at least 20 hours old (handles timezone edge cases).
    // For each ticker, get the MOST RECENT snapshot that qualifies.
    // This means: if cron runs hourly, we get a snapshot from ~20-24h ago.
    const cutoff = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();

    const rows = await d1.query<{
      ticker: string;
      mnav: number | null;
      stock_price_usd: number;
      crypto_price_usd: number;
      capture_date: string;
    }>(
      `SELECT s.ticker, s.mnav, s.stock_price_usd, s.crypto_price_usd, s.capture_date
       FROM mnav_snapshots s
       INNER JOIN (
         SELECT ticker, MAX(captured_at) as max_captured
         FROM mnav_snapshots
         WHERE captured_at <= ?
         GROUP BY ticker
       ) latest ON s.ticker = latest.ticker AND s.captured_at = latest.max_captured`,
      [cutoff]
    );

    const result: YesterdayMnavResult = {};
    for (const row of rows.results) {
      result[row.ticker] = {
        mnav: row.mnav,
        stockPrice: row.stock_price_usd,
        cryptoPrice: row.crypto_price_usd,
        date: row.capture_date,
      };
    }

    cache = { data: result, timestamp: Date.now() };
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching yesterday mNAV snapshots:", error);
    return NextResponse.json({}, { status: 500 });
  }
}
