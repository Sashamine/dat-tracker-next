import { NextRequest, NextResponse } from 'next/server';
import { getMetricHistory } from '@/lib/d1';
import { logApiCallEvent } from '@/lib/events';

export const runtime = 'nodejs';

/**
 * Batch metric history for a company.
 *
 * GET /api/company/:ticker/history?metrics=cash_usd,debt_usd,basic_shares,holdings_native&limit=200&order=desc&includeArtifacts=true
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ ticker: string }> }
) {
  const t0 = Date.now();
  const clientHeader = request.headers.get('x-client');
  const client =
    clientHeader === 'web' || clientHeader === 'agent' || clientHeader === 'cron' || clientHeader === 'unknown'
      ? clientHeader
      : undefined;

  try {
    const { ticker } = await props.params;
    const t = (ticker || '').toUpperCase();

    const { searchParams } = new URL(request.url);
    const metricsParam = (searchParams.get('metrics') || '').trim();
    const limitRaw = searchParams.get('limit');
    const orderRaw = (searchParams.get('order') || 'desc').toLowerCase();
    const includeArtifactsRaw = (searchParams.get('includeArtifacts') || 'true').toLowerCase();

    if (!t) {
      logApiCallEvent({
        route: '/api/company/[ticker]/history',
        metric: metricsParam || undefined,
        status: 400,
        latency_ms: Date.now() - t0,
        client,
      });
      return NextResponse.json({ success: false, error: 'Missing ticker' }, { status: 400 });
    }
    if (!metricsParam) {
      logApiCallEvent({
        route: '/api/company/[ticker]/history',
        ticker: t,
        status: 400,
        latency_ms: Date.now() - t0,
        client,
      });
      return NextResponse.json({ success: false, error: 'Missing metrics' }, { status: 400 });
    }

    const metrics = metricsParam
      .split(',')
      .map(m => m.trim())
      .filter(Boolean);

    if (!metrics.length) {
      logApiCallEvent({
        route: '/api/company/[ticker]/history',
        ticker: t,
        status: 400,
        latency_ms: Date.now() - t0,
        client,
      });
      return NextResponse.json({ success: false, error: 'No metrics provided' }, { status: 400 });
    }

    const limit = limitRaw ? Number(limitRaw) : undefined;
    const order = orderRaw === 'asc' ? 'asc' : 'desc';
    const includeArtifacts = includeArtifactsRaw !== 'false';

    const entries = await Promise.all(
      metrics.map(async metric => {
        const rows = await getMetricHistory(t, metric, { limit, order, includeArtifacts });
        return [metric, rows] as const;
      })
    );

    const series = Object.fromEntries(entries);

    logApiCallEvent({
      route: '/api/company/[ticker]/history',
      ticker: t,
      metric: metrics[0],
      status: 200,
      latency_ms: Date.now() - t0,
      client,
    });

    return NextResponse.json({
      success: true,
      ticker: t,
      metrics,
      includeArtifacts,
      series,
    });
  } catch (err) {
    logApiCallEvent({
      route: '/api/company/[ticker]/history',
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
