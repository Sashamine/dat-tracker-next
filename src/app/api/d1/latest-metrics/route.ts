import { NextRequest, NextResponse } from 'next/server';
import { getLatestMetrics } from '@/lib/d1';
import { getHoldingsBasis } from '@/lib/d1-overlay';
import { CORE_D1_METRICS } from '@/lib/metrics';
import { logApiCallEvent } from '@/lib/events';

export async function GET(request: NextRequest) {
  const t0 = Date.now();
  const { searchParams } = new URL(request.url);
  const ticker = (searchParams.get('ticker') || '').toUpperCase();
  const metricsParam = searchParams.get('metrics');

  if (!ticker) {
    return NextResponse.json({ success: false, error: 'Missing ticker' }, { status: 400 });
  }

  const metrics = metricsParam
    ? metricsParam.split(',').map(m => m.trim()).filter(Boolean)
    : undefined;

  try {
    const rows = await getLatestMetrics(ticker, metrics);

    // Derive holdings basis from the returned rows
    const byMetric: Record<string, number> = {};
    for (const r of rows) byMetric[r.metric] = r.value;
    const holdings_basis = getHoldingsBasis(byMetric.holdings_native, byMetric.bitcoin_holdings_usd);

    logApiCallEvent({ route: '/api/d1/latest-metrics', ticker, status: 200, latencyMs: Date.now() - t0 });

    return NextResponse.json({
      success: true,
      ticker,
      metrics: metrics || [...CORE_D1_METRICS],
      holdings_basis,
      rows,
    });
  } catch (err) {
    logApiCallEvent({ route: '/api/d1/latest-metrics', ticker, status: 500, latencyMs: Date.now() - t0 });
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
