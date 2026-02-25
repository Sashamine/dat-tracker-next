import { NextRequest, NextResponse } from 'next/server';
import { getLatestMetrics } from '@/lib/d1';

// Returns latest filed fundamentals from Cloudflare D1.
// Designed for client-side consumption on aggregate pages.

const DEFAULT_METRICS = ['cash_usd', 'debt_usd', 'basic_shares', 'bitcoin_holdings_usd'] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const tickersRaw: unknown = body?.tickers;

    const tickers = Array.isArray(tickersRaw)
      ? tickersRaw
          .map(t => String(t || '').trim().toUpperCase())
          .filter(Boolean)
          .slice(0, 200)
      : [];

    if (tickers.length === 0) {
      return NextResponse.json({ success: true, tickers: 0, results: {} });
    }

    // Query per ticker; with ~50-100 tickers this is fine and keeps SQL simple.
    // If this grows, we can optimize with a single IN-query.
    const entries = await Promise.all(
      tickers.map(async (ticker) => {
        const rows = await getLatestMetrics(ticker, [...DEFAULT_METRICS]);
        return [ticker, rows] as const;
      })
    );

    const results: Record<string, any> = {};
    for (const [ticker, rows] of entries) results[ticker] = rows;

    return NextResponse.json({ success: true, tickers: tickers.length, results });
  } catch (err) {
    // Hide D1 failures from the UI by returning a non-throwing payload.
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
