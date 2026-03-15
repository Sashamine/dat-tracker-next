import { NextRequest, NextResponse } from 'next/server';
import { D1Client } from '@/lib/d1';

/**
 * GET /api/v1/datapoints?ticker=MSTR&metric=holdings_native&limit=100&order=desc
 *
 * Raw datapoints endpoint with full provenance chain.
 * Power-user endpoint for accessing underlying D1 data.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker')?.toUpperCase();
    const metric = searchParams.get('metric');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500);
    const order = (searchParams.get('order') ?? 'desc') as 'asc' | 'desc';
    const status = searchParams.get('status') ?? 'approved';

    if (!ticker) {
      return NextResponse.json(
        { success: false, error: 'ticker query param is required' },
        { status: 400 }
      );
    }

    const d1 = D1Client.fromEnv();

    let sql = `
      SELECT
        d.datapoint_id,
        d.entity_id,
        d.metric,
        d.value,
        d.unit,
        d.as_of,
        d.reported_at,
        d.method,
        d.confidence,
        d.status,
        d.citation_quote,
        d.citation_search_term,
        d.created_at,
        a.source_url,
        a.accession,
        a.source_type
      FROM datapoints d
      LEFT JOIN artifacts a ON d.artifact_id = a.artifact_id
      WHERE d.entity_id = ?
        AND d.status = ?
    `;

    const params: (string | number)[] = [ticker, status];

    if (metric) {
      sql += ` AND d.metric = ?`;
      params.push(metric);
    }

    sql += ` ORDER BY d.as_of ${order === 'asc' ? 'ASC' : 'DESC'}, d.created_at DESC`;
    sql += ` LIMIT ?`;
    params.push(limit);

    const result = await d1.query<{
      datapoint_id: string;
      entity_id: string;
      metric: string;
      value: number;
      unit: string;
      as_of: string | null;
      reported_at: string | null;
      method: string | null;
      confidence: number | null;
      status: string;
      citation_quote: string | null;
      citation_search_term: string | null;
      created_at: string;
      source_url: string | null;
      accession: string | null;
      source_type: string | null;
    }>(sql, params);

    return NextResponse.json({
      success: true,
      ticker,
      metric: metric ?? 'all',
      count: result.results.length,
      datapoints: result.results.map(r => ({
        id: r.datapoint_id,
        metric: r.metric,
        value: r.value,
        unit: r.unit,
        asOf: r.as_of,
        reportedAt: r.reported_at,
        method: r.method,
        confidence: r.confidence,
        status: r.status,
        citationQuote: r.citation_quote,
        citationSearchTerm: r.citation_search_term,
        createdAt: r.created_at,
        sourceUrl: r.source_url,
        accession: r.accession,
        sourceType: r.source_type,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30;
