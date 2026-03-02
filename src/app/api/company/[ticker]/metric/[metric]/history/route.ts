import { NextRequest, NextResponse } from 'next/server';
import { getMetricHistory } from '@/lib/d1';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ ticker: string; metric: string }> }
) {
  try {
    const { ticker, metric } = await props.params;
    const t = (ticker || '').toUpperCase();
    const m = (metric || '').trim();

    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get('limit');
    const orderRaw = (searchParams.get('order') || 'desc').toLowerCase();

    if (!t) {
      return NextResponse.json({ success: false, error: 'Missing ticker' }, { status: 400 });
    }
    if (!m) {
      return NextResponse.json({ success: false, error: 'Missing metric' }, { status: 400 });
    }

    const limit = limitRaw ? Number(limitRaw) : undefined;
    const order = orderRaw === 'asc' ? 'asc' : 'desc';

    const rows = await getMetricHistory(t, m, { limit, order });

    return NextResponse.json({
      success: true,
      ticker: t,
      metric: m,
      rows,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
