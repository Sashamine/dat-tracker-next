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
  scale: number;
  as_of: string | null;
  reported_at: string | null;
  method: string | null;
  confidence: number | null;
  flags_json: string | null;
  created_at: string;
  // artifact
  artifact_id: string | null;
  a_source_type: string | null;
  a_source_url: string | null;
  a_accession: string | null;
  a_r2_bucket: string | null;
  a_r2_key: string | null;
  a_content_hash: string | null;
  a_fetched_at: string | null;
  // run
  run_id: string | null;
  r_started_at: string | null;
  r_ended_at: string | null;
  r_trigger: string | null;
  r_code_sha: string | null;
  r_notes: string | null;
};

function resolveClient(req: NextRequest): 'web' | 'agent' | 'cron' | 'unknown' | undefined {
  const h = req.headers.get('x-client');
  if (h === 'web' || h === 'agent' || h === 'cron' || h === 'unknown') return h;
  return undefined;
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ ticker: string }> }
) {
  const t0 = Date.now();
  const client = resolveClient(request);

  const { ticker } = await props.params;
  const t = (ticker || '').toUpperCase();
  const { searchParams } = new URL(request.url);
  const metric = (searchParams.get('metric') || '').trim();

  if (!t) {
    logApiCallEvent({ route: '/api/company/[ticker]/explain', status: 400, latency_ms: Date.now() - t0, client });
    return NextResponse.json({ success: false, error: 'Missing ticker' }, { status: 400 });
  }
  if (!metric) {
    logApiCallEvent({ route: '/api/company/[ticker]/explain', ticker: t, status: 400, latency_ms: Date.now() - t0, client });
    return NextResponse.json({ success: false, error: 'Missing ?metric= parameter' }, { status: 400 });
  }

  try {
    const d1 = D1Client.fromEnv();

    const sql = `
      SELECT
        d.datapoint_id, d.entity_id, d.metric, d.value, d.unit, d.scale,
        d.as_of, d.reported_at, d.method, d.confidence, d.flags_json, d.created_at,
        d.artifact_id,
        a.source_type  AS a_source_type,
        a.source_url   AS a_source_url,
        a.accession     AS a_accession,
        a.r2_bucket     AS a_r2_bucket,
        a.r2_key        AS a_r2_key,
        a.content_hash  AS a_content_hash,
        a.fetched_at    AS a_fetched_at,
        d.run_id,
        r.started_at    AS r_started_at,
        r.ended_at      AS r_ended_at,
        r.trigger       AS r_trigger,
        r.code_sha      AS r_code_sha,
        r.notes         AS r_notes
      FROM latest_datapoints d
      LEFT JOIN artifacts a ON a.artifact_id = d.artifact_id
      LEFT JOIN runs r ON r.run_id = d.run_id
      WHERE d.entity_id = ?
        AND d.metric = ?
      LIMIT 1;
    `;

    const result = await d1.query<ExplainRow>(sql, [t, metric]);
    const row = result.results[0];

    if (!row) {
      logApiCallEvent({ route: '/api/company/[ticker]/explain', ticker: t, metric, status: 404, latency_ms: Date.now() - t0, client });
      return NextResponse.json(
        { success: false, error: 'not_found', message: `No datapoint for ${t}/${metric}` },
        { status: 404 }
      );
    }

    logApiCallEvent({ route: '/api/company/[ticker]/explain', ticker: t, metric, status: 200, latency_ms: Date.now() - t0, client });

    return NextResponse.json({
      success: true,
      ticker: t,
      metric,
      datapoint: {
        datapoint_id: row.datapoint_id,
        value: row.value,
        unit: row.unit,
        scale: row.scale,
        as_of: row.as_of,
        reported_at: row.reported_at,
        method: row.method,
        confidence: row.confidence,
        flags: (() => { try { return row.flags_json ? JSON.parse(row.flags_json) : null; } catch { return null; } })(),
        created_at: row.created_at,
      },
      artifact: row.artifact_id
        ? {
            artifact_id: row.artifact_id,
            source_type: row.a_source_type,
            source_url: row.a_source_url,
            accession: row.a_accession,
            r2_bucket: row.a_r2_bucket,
            r2_key: row.a_r2_key,
            content_hash: row.a_content_hash,
            fetched_at: row.a_fetched_at,
          }
        : null,
      run: row.run_id
        ? {
            run_id: row.run_id,
            started_at: row.r_started_at,
            ended_at: row.r_ended_at,
            trigger: row.r_trigger,
            code_sha: row.r_code_sha,
            notes: row.r_notes,
          }
        : null,
    });
  } catch (err) {
    logApiCallEvent({ route: '/api/company/[ticker]/explain', ticker: t, metric, status: 500, latency_ms: Date.now() - t0, client });
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
