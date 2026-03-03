import { NextRequest, NextResponse } from 'next/server';
import { D1Client } from '@/lib/d1';

/**
 * GET /api/admin/events — debug reader for adoption_events.
 *
 * Query params:
 *   limit  (default 50, max 500)
 *   event  (optional filter)
 *   ticker (optional filter)
 *
 * Gated by ADMIN_SECRET env var (pass as ?secret= or x-admin-secret header).
 * Fails closed when ADMIN_SECRET is missing.
 */
export async function GET(request: NextRequest) {
  // --- admin gate ---
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized (ADMIN_SECRET not configured)' },
      { status: 401 }
    );
  }
  const { searchParams } = new URL(request.url);
  const provided =
    searchParams.get('secret') || request.headers.get('x-admin-secret') || '';
  if (provided !== adminSecret) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const limit = Math.min(500, Math.max(1, Number(searchParams.get('limit')) || 50));
    const eventFilter = searchParams.get('event');
    const tickerFilter = searchParams.get('ticker')?.toUpperCase();

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (eventFilter) {
      conditions.push('event = ?');
      params.push(eventFilter);
    }
    if (tickerFilter) {
      conditions.push('ticker = ?');
      params.push(tickerFilter);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const d1 = D1Client.fromEnv();
    const { results } = await d1.query(
      `SELECT * FROM adoption_events ${where} ORDER BY ts DESC LIMIT ?`,
      [...params, limit]
    );

    const { results: countRows } = await d1.query<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt FROM adoption_events ${where}`,
      params
    );

    return NextResponse.json({
      success: true,
      total: countRows[0]?.cnt ?? 0,
      showing: results.length,
      rows: results,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
