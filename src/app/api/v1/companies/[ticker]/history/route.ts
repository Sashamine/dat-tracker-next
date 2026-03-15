import { NextRequest, NextResponse } from 'next/server';
import { getFinancialHistory } from '@/lib/d1-read';

/**
 * GET /api/v1/companies/:ticker/history
 *
 * Returns historical datapoints for a company.
 * Supports ?metric=holdings_native (or basic_shares, debt_usd, cash_usd, preferred_equity_usd)
 * Supports ?limit=100 and ?order=asc|desc
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const entityId = ticker.toUpperCase();
    const { searchParams } = new URL(request.url);

    const metric = searchParams.get('metric') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '500', 10), 1000);
    const order = (searchParams.get('order') ?? 'asc') as 'asc' | 'desc';

    const rows = await getFinancialHistory(entityId, metric, { limit, order });

    return NextResponse.json({
      success: true,
      ticker: entityId,
      metric: metric ?? 'all',
      count: rows.length,
      datapoints: rows.map(r => ({
        metric: r.metric,
        value: r.value,
        unit: r.unit,
        as_of: r.as_of,
        reported_at: r.reported_at,
        method: r.method,
        confidence: r.confidence,
        citation_quote: r.citation_quote,
        source_url: r.artifact?.source_url ?? null,
        accession: r.artifact?.accession ?? null,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30;
