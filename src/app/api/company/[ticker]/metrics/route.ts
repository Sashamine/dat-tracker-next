import { NextRequest, NextResponse } from 'next/server';
import { getLatestMetrics } from '@/lib/d1';

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
  _request: NextRequest,
  props: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await props.params;
    const t = (ticker || '').toUpperCase();

    if (!t) {
      return NextResponse.json({ success: false, error: 'Missing ticker' }, { status: 400 });
    }

    // Phase 10e-lite: return value + receipts from D1 latest_datapoints.
    // Note: getLatestMetrics() already normalizes share-related metrics to current basis.
    const rows = await getLatestMetrics(t, [...DEFAULT_METRICS]);

    return NextResponse.json({
      success: true,
      ticker: t,
      metrics: DEFAULT_METRICS,
      rows,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
