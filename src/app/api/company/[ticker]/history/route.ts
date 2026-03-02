import { NextRequest, NextResponse } from 'next/server';
import { getMetricHistory } from '@/lib/d1';

export const runtime = 'nodejs';

/**
 * Batch metric history for a company.
 *
 * GET /api/company/:ticker/history?metrics=cash_usd,debt_usd,basic_shares&limit=200&order=desc
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await props.params;
    const t = (ticker || '').toUpperCase();

    const { searchParams } = new URL(request.url);
    const metricsParam = (searchParams.get('metrics') || '').trim();
    const limitRaw = searchParams.get('limit');
    const orderRaw = (searchParams.get('order') || 'desc').toLowerCase();

    if (!t) {
      return NextResponse.json({ success: false, error: 'Missing ticker' }, { status: 400 });
    }
    if (!metricsParam) {
      return NextResponse.json({ success: false, error: 'Missing metrics' }, { status: 400 });
    }

    const metrics = metricsParam
      .split(',')
      .map(m => m.trim())
      .filter(Boolean);

    if (!metrics.length) {
      return NextResponse.json({ success: false, error: 'No metrics provided' }, { status: 400 });
    }

    const limit = limitRaw ? Number(limitRaw) : undefined;
    const order = orderRaw === 'asc' ? 'asc' : 'desc';

    const entries = await Promise.all(
      metrics.map(async metric => {
        const rows = await getMetricHistory(t, metric, { limit, order });
        return [metric, rows] as const;
      })
    );

    const series = Object.fromEntries(entries);

    return NextResponse.json({
      success: true,
      ticker: t,
      metrics,
      series,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
