import { NextRequest, NextResponse } from 'next/server';
import { getLatestMetrics } from '@/lib/d1';
import { logApiCallEvent } from '@/lib/events';

export const runtime = 'nodejs';

const DEFAULT_METRICS = [
  // Core denominators
  'basic_shares',

  // Holdings
  'btc',
  'eth',

  // Balance sheet (common)
  'cash_usd',
  'debt_usd',
] as const;

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

    if (!t) {
      logApiCallEvent({
        route: '/api/company/[ticker]/metrics',
        status: 400,
        latency_ms: Date.now() - t0,
        client,
      });
      return NextResponse.json({ success: false, error: 'Missing ticker' }, { status: 400 });
    }

    // Phase 10e-lite: return value + receipts from D1 latest_datapoints.
    // Note: getLatestMetrics() already normalizes share-related metrics to current basis.
    const rows = await getLatestMetrics(t, [...DEFAULT_METRICS]);

    logApiCallEvent({
      route: '/api/company/[ticker]/metrics',
      ticker: t,
      metric: DEFAULT_METRICS[0],
      status: 200,
      latency_ms: Date.now() - t0,
      client,
    });

    return NextResponse.json({
      success: true,
      ticker: t,
      metrics: DEFAULT_METRICS,
      rows,
    });
  } catch (err) {
    logApiCallEvent({
      route: '/api/company/[ticker]/metrics',
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
