import { NextRequest, NextResponse } from 'next/server';
import { D1Client } from '@/lib/d1';

export async function GET(_request: NextRequest) {
  if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_D1_DATABASE_ID || !process.env.CLOUDFLARE_API_TOKEN) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Missing Cloudflare D1 env (need CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_API_TOKEN)',
      },
      { status: 500 }
    );
  }

  try {
    const d1 = D1Client.fromEnv();

    const byType = await d1.query<{ source_type: string; cnt: number }>(
      `SELECT source_type, COUNT(1) as cnt
       FROM artifacts
       GROUP BY source_type
       ORDER BY cnt DESC, source_type ASC;`
    );

    const byTicker = await d1.query<{ ticker: string; cnt: number }>(
      `SELECT COALESCE(ticker, '(null)') as ticker, COUNT(1) as cnt
       FROM artifacts
       GROUP BY ticker
       ORDER BY cnt DESC, ticker ASC
       LIMIT 200;`
    );

    const totals = await d1.query<{ cnt: number }>(`SELECT COUNT(1) as cnt FROM artifacts;`);

    return NextResponse.json({
      success: true,
      total: totals.results[0]?.cnt || 0,
      bySourceType: byType.results,
      byTicker: byTicker.results,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
