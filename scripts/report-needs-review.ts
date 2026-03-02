#!/usr/bin/env npx tsx

/**
 * DLQ Report: lists all datapoints with status='needs_review',
 * including confidence factor breakdown, provenance bundle, and verification history.
 *
 * Env vars:
 *   ENTITY_ID  - optional entity filter (e.g. MSTR)
 *   METRIC     - optional metric filter (e.g. basic_shares)
 *   LIMIT      - max rows (default 50)
 *   DRY_RUN    - report-only, no writes (default true; this script never writes anyway)
 *
 * Also supports a RESOLVE mode (see resolve-needs-review.ts).
 */

import { D1Client } from '../src/lib/d1';

type ReportRow = {
  datapoint_id: string;
  entity_id: string;
  metric: string;
  value: number | null;
  unit: string | null;
  scale: number | null;
  as_of: string | null;
  reported_at: string | null;
  method: string | null;
  confidence: number | null;
  confidence_details_json: string | null;
  status: string;
  created_at: string;
  // artifact join
  artifact_id: string | null;
  run_id: string | null;
  source_type: string | null;
  source_url: string | null;
  r2_bucket: string | null;
  r2_key: string | null;
};

type VerificationRow = {
  verification_id: string;
  verdict: string;
  checks_json: string | null;
  checked_at: string;
  verifier: string;
  code_sha: string | null;
};

async function main() {
  const d1 = D1Client.fromEnv();

  const entityId = process.env.ENTITY_ID || null;
  const metric = process.env.METRIC || null;
  const limit = Number(process.env.LIMIT || '50');

  const whereClauses = [`d.status = 'needs_review'`];
  const params: (string | number)[] = [];

  if (entityId) {
    whereClauses.push('d.entity_id = ?');
    params.push(entityId);
  }
  if (metric) {
    whereClauses.push('d.metric = ?');
    params.push(metric);
  }

  params.push(limit);

  const sql = `
    SELECT
      d.datapoint_id,
      d.entity_id,
      d.metric,
      d.value,
      d.unit,
      d.scale,
      d.as_of,
      d.reported_at,
      d.method,
      d.confidence,
      d.confidence_details_json,
      d.status,
      d.created_at,
      d.artifact_id,
      d.run_id,
      a.source_type,
      a.source_url,
      a.r2_bucket,
      a.r2_key
    FROM datapoints d
    LEFT JOIN artifacts a ON a.artifact_id = d.artifact_id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY d.confidence ASC, d.entity_id, d.as_of
    LIMIT ?;
  `;

  const rows = await d1.query<ReportRow>(sql, params);

  console.log(`report-needs-review: entity=${entityId || '*'} metric=${metric || '*'} limit=${limit} found=${rows.results.length}`);

  if (rows.results.length === 0) {
    console.log('No needs_review datapoints found.');
    return;
  }

  for (const row of rows.results) {
    // Fetch verification history for this datapoint
    const verifications = await d1.query<VerificationRow>(
      `SELECT verification_id, verdict, checks_json, checked_at, verifier, code_sha
       FROM datapoint_verifications
       WHERE datapoint_id = ?
       ORDER BY checked_at DESC
       LIMIT 5;`,
      [row.datapoint_id]
    );

    // Parse confidence details
    let factors: Array<{ name: string; weight: number; score: number; detail: string }> = [];
    let version: string | null = null;
    if (row.confidence_details_json) {
      try {
        const details = JSON.parse(row.confidence_details_json);
        factors = details.factors || [];
        version = details.version || null;
      } catch { /* ignore parse errors */ }
    }

    const report = {
      datapoint_id: row.datapoint_id,
      entity_id: row.entity_id,
      metric: row.metric,
      value: row.value,
      unit: row.unit,
      as_of: row.as_of,
      reported_at: row.reported_at,
      confidence: row.confidence,
      scorer_version: version,
      status: row.status,

      factor_breakdown: factors.map(f => ({
        factor: f.name,
        score: f.score,
        weight: f.weight,
        detail: f.detail,
      })),

      provenance: {
        method: row.method,
        artifact_id: row.artifact_id,
        run_id: row.run_id,
        source_type: row.source_type,
        source_url: row.source_url,
        r2_bucket: row.r2_bucket,
        r2_key: row.r2_key,
      },

      verifications: verifications.results.map(v => ({
        verdict: v.verdict,
        verifier: v.verifier,
        checked_at: v.checked_at,
        code_sha: v.code_sha,
      })),
    };

    console.log(JSON.stringify(report));
  }

  // Summary
  const byEntity: Record<string, number> = {};
  for (const r of rows.results) {
    byEntity[r.entity_id] = (byEntity[r.entity_id] || 0) + 1;
  }
  const entitySummary = Object.entries(byEntity)
    .sort((a, b) => b[1] - a[1])
    .map(([e, c]) => `${e}(${c})`)
    .join(', ');

  console.log(`\nSummary: needs_review=${rows.results.length} entities=[${entitySummary}]`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
