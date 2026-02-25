import { NextRequest, NextResponse } from 'next/server';
import { getLatestMetrics } from '@/lib/d1';

export async function GET(request: NextRequest) {
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
    return NextResponse.json({
      success: true,
      ticker,
      metrics: metrics || ['cash_usd', 'debt_usd', 'basic_shares'],
      rows,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
