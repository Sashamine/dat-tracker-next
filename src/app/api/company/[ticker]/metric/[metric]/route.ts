import { NextRequest, NextResponse } from 'next/server';
import { getLatestMetrics } from '@/lib/d1';
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

    if (!t) {
      logApiCallEvent({
        route: '/api/company/[ticker]/metric/[metric]',
        metric: m,
        status: 400,
        latency_ms: Date.now() - t0,
        client,
      });
      return NextResponse.json({ success: false, error: 'Missing ticker' }, { status: 400 });
    }
    if (!m) {
      logApiCallEvent({
        route: '/api/company/[ticker]/metric/[metric]',
        ticker: t,
        status: 400,
        latency_ms: Date.now() - t0,
        client,
      });
      return NextResponse.json({ success: false, error: 'Missing metric' }, { status: 400 });
    }

    const rows = await getLatestMetrics(t, [m]);
    const row = rows[0] || null;

    logApiCallEvent({
      route: '/api/company/[ticker]/metric/[metric]',
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
      row,
    });
  } catch (err) {
    logApiCallEvent({
      route: '/api/company/[ticker]/metric/[metric]',
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
