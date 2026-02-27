import { NextRequest, NextResponse } from 'next/server';
import { getLatestMetrics } from '@/lib/d1';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ ticker: string; metric: string }> }
) {
  try {
    const { ticker, metric } = await props.params;
    const t = (ticker || '').toUpperCase();
    const m = (metric || '').trim();

    if (!t) {
      return NextResponse.json({ success: false, error: 'Missing ticker' }, { status: 400 });
    }
    if (!m) {
      return NextResponse.json({ success: false, error: 'Missing metric' }, { status: 400 });
    }

    const rows = await getLatestMetrics(t, [m]);
    const row = rows[0] || null;

    return NextResponse.json({
      success: true,
      ticker: t,
      metric: m,
      row,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
