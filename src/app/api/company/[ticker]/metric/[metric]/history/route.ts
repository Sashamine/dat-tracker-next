import { NextRequest, NextResponse } from 'next/server';
import { getMetricHistory } from '@/lib/d1';
import { logApiCallEvent } from '@/lib/events';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ ticker: string; metric: string }> }
) {
  const t0 = Date.now();
  const clientHeader = request.headers.get('x-client');
  const client =
    clientHeader === 'web' || clientHeader === 'agent' || clientHeader === 'cron' || clientHeader === 'unknown'
      ? clientHeader
      : undefined;

  try {
    const { ticker, metric } = await props.params;
    const t = (ticker || '').toUpperCase();
    const m = (metric || '').trim();

    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get('limit');
    const orderRaw = (searchParams.get('order') || 'desc').toLowerCase();

    if (!t) {
      logApiCallEvent({
        route: '/api/company/[ticker]/metric/[metric]/history',
        metric: m,
        status: 400,
        latency_ms: Date.now() - t0,
        client,
      });
      return NextResponse.json({ success: false, error: 'Missing ticker' }, { status: 400 });
    }
    if (!m) {
      logApiCallEvent({
        route: '/api/company/[ticker]/metric/[metric]/history',
        ticker: t,
        status: 400,
        latency_ms: Date.now() - t0,
        client,
      });
      return NextResponse.json({ success: false, error: 'Missing metric' }, { status: 400 });
    }

    const limit = limitRaw ? Number(limitRaw) : undefined;
    const order = orderRaw === 'asc' ? 'asc' : 'desc';

    const rows = await getMetricHistory(t, m, { limit, order });

    logApiCallEvent({
      route: '/api/company/[ticker]/metric/[metric]/history',
      ticker: t,
      metric: m,
      status: 200,
      latency_ms: Date.now() - t0,
      client,
    });

    return NextResponse.json({
      success: true,
      ticker: t,
      metric: m,
      rows,
    });
  } catch (err) {
    logApiCallEvent({
      route: '/api/company/[ticker]/metric/[metric]/history',
      status: 500,
      latency_ms: Date.now() - t0,
      client,
    });
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
