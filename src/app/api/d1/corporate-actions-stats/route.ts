import { NextRequest, NextResponse } from 'next/server';
import { D1Client } from '@/lib/d1';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Optional filter
  const sp = request.nextUrl.searchParams;
  const ticker = (sp.get('ticker') || '').trim().toUpperCase();

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

    const where = ticker ? 'WHERE entity_id = ?' : '';
    const params = ticker ? [ticker] : [];

    const totals = await d1.query<{ cnt: number }>(
      `SELECT COUNT(1) as cnt FROM corporate_actions ${where};`,
      params
    );

    const byTicker = await d1.query<{ entity_id: string; cnt: number; last_created_at: string }>(
      `SELECT entity_id, COUNT(1) as cnt, MAX(created_at) as last_created_at
       FROM corporate_actions
       ${where}
       GROUP BY entity_id
       ORDER BY cnt DESC, entity_id ASC
       LIMIT 500;`,
      params
    );

    const byType = await d1.query<{ action_type: string; cnt: number }>(
      `SELECT action_type, COUNT(1) as cnt
       FROM corporate_actions
       ${where}
       GROUP BY action_type
       ORDER BY cnt DESC, action_type ASC;`,
      params
    );

    // Anomaly diagnostic: same (entity_id, action_type, ratio) with two effective dates within +/- 1 day.
    // This catches churn like June 30 vs July 1 while ignoring legitimately repeated ratios years apart.
    const nearDupes = await d1.query<{ entity_id: string; action_type: string; ratio: number; date_a: string; date_b: string; days_apart: number }>(
      `WITH pairs AS (
         SELECT
           a.entity_id,
           a.action_type,
           a.ratio,
           a.effective_date AS date_a,
           b.effective_date AS date_b,
           ABS(julianday(a.effective_date) - julianday(b.effective_date)) AS days_apart
         FROM corporate_actions a
         JOIN corporate_actions b
           ON b.entity_id = a.entity_id
          AND b.action_type = a.action_type
          AND b.ratio = a.ratio
          AND b.effective_date > a.effective_date
         ${ticker ? 'WHERE a.entity_id = ?' : ''}
       )
       SELECT entity_id, action_type, ratio, date_a, date_b, days_apart
       FROM pairs
       WHERE days_apart <= 1
       ORDER BY days_apart ASC, entity_id ASC
       LIMIT 200;`,
      params
    );

    return NextResponse.json({
      success: true,
      ticker: ticker || null,
      total: totals.results[0]?.cnt || 0,
      byTicker: byTicker.results,
      byType: byType.results,
      nearDuplicatePairs: nearDupes.results,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
