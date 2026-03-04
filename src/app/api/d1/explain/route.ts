import { NextRequest, NextResponse } from 'next/server';
import { D1Client } from '@/lib/d1';
import { logApiCallEvent } from '@/lib/events';

export const runtime = 'nodejs';

type ExplainRow = {
  datapoint_id: string;
  entity_id: string;
  metric: string;
  value: number;
  unit: string;
  as_of: string | null;
  reported_at: string | null;
  artifact_id: string;
  run_id: string;
  method: string | null;
  confidence: number | null;
  source_url: string | null;
  accession: string | null;
  r2_key: string | null;
};

/**
 * Explain endpoint (minimal citation surface):
 * GET /api/d1/explain?ticker=MSTR&metric=bitcoin_holdings_usd
 */
export async function GET(request: NextRequest) {
  const t0 = Date.now();
  const { searchParams } = new URL(request.url);
  const clientHeader = request.headers.get('x-client');
  const client =
    clientHeader === 'web' || clientHeader === 'agent' || clientHeader === 'cron' || clientHeader === 'unknown'
      ? clientHeader
      : undefined;

  const ticker = (searchParams.get('ticker') || '').trim().toUpperCase();
  const metric = (searchParams.get('metric') || '').trim();

  if (!ticker) {
    logApiCallEvent({
      route: '/api/d1/explain',
      metric,
      status: 400,
      latency_ms: Date.now() - t0,
      client,
    });
    return NextResponse.json({ success: false, error: 'Missing ticker' }, { status: 400 });
  }

  if (!metric) {
    logApiCallEvent({
      route: '/api/d1/explain',
      ticker,
      status: 400,
      latency_ms: Date.now() - t0,
      client,
    });
    return NextResponse.json({ success: false, error: 'Missing metric' }, { status: 400 });
  }

  try {
    const d1 = D1Client.fromEnv();
    const out = await d1.query<ExplainRow>(
      `SELECT
         d.datapoint_id,
         d.entity_id,
         d.metric,
         d.value,
         d.unit,
         d.as_of,
         d.reported_at,
         d.artifact_id,
         d.run_id,
         d.method,
         d.confidence,
         a.source_url,
         a.accession,
         a.r2_key
       FROM latest_datapoints d
       LEFT JOIN artifacts a ON a.artifact_id = d.artifact_id
       WHERE d.entity_id = ?
         AND d.metric = ?
       LIMIT 1;`,
      [ticker, metric]
    );

    const row = out.results[0] || null;
    if (!row) {
      logApiCallEvent({
        route: '/api/d1/explain',
        ticker,
        metric,
        status: 404,
        latency_ms: Date.now() - t0,
        client,
      });
      return NextResponse.json(
        { success: false, error: 'Not found', message: `No latest datapoint for ${ticker}/${metric}` },
        { status: 404 }
      );
    }

    logApiCallEvent({
      route: '/api/d1/explain',
      ticker,
      metric,
      status: 200,
      latency_ms: Date.now() - t0,
      client,
    });

    return NextResponse.json({
      success: true,
      ticker,
      metric,
      datapoint: {
        datapoint_id: row.datapoint_id,
        value: row.value,
        unit: row.unit,
        as_of: row.as_of,
        reported_at: row.reported_at,
        artifact_id: row.artifact_id,
        run_id: row.run_id,
        method: row.method,
        confidence: row.confidence,
      },
      receipt: {
        source_url: row.source_url,
        accession: row.accession,
        r2_key: row.r2_key,
        artifact_id: row.artifact_id,
        run_id: row.run_id,
      },
    });
  } catch (err) {
    logApiCallEvent({
      route: '/api/d1/explain',
      ticker,
      metric,
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

