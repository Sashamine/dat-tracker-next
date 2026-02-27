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

    // Near-duplicate diagnostic: same (entity_id, action_type, ratio) with multiple dates
    const nearDupes = await d1.query<{ entity_id: string; action_type: string; ratio: number; dates: number }>(
      `SELECT entity_id, action_type, ratio, COUNT(DISTINCT effective_date) as dates
       FROM corporate_actions
       ${where}
       GROUP BY entity_id, action_type, ratio
       HAVING dates > 1
       ORDER BY dates DESC
       LIMIT 200;`,
      params
    );

    return NextResponse.json({
      success: true,
      ticker: ticker || null,
      total: totals.results[0]?.cnt || 0,
      byTicker: byTicker.results,
      byType: byType.results,
      multiDateSameRatio: nearDupes.results,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
