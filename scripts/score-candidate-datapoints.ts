#!/usr/bin/env npx tsx

import crypto from 'node:crypto';
import { D1Client } from '../src/lib/d1';
import { scoreDatapoint, classifyConfidence, verdictFromConfidence } from '../src/lib/d1-confidence';
import type { DatapointForScoring } from '../src/lib/d1-confidence';
import { sendDiscordAlert } from '../src/lib/discord';

type RawRow = {
  datapoint_id: string;
  entity_id: string;
  metric: string;
  value: number | null;
  unit: string | null;
  scale: number | null;
  as_of: string | null;
  reported_at: string | null;
  method: string | null;
  artifact_id: string | null;
  created_at: string;
  source_type: string | null;
  source_url: string | null;
  latest_verdict: string | null;
  latest_checks_json: string | null;
};

function rowToInput(row: RawRow): DatapointForScoring {
  return {
    ...row,
    latest_verdict: row.latest_verdict as DatapointForScoring['latest_verdict'],
  };
}

async function main() {
  const d1 = D1Client.fromEnv();

  const entityId = process.env.ENTITY_ID;
  const limit = Number(process.env.LIMIT || '200');
  const dryRun = String(process.env.DRY_RUN || 'true').toLowerCase() !== 'false';
  const codeSha = process.env.CODE_SHA || null;

  const now = new Date();

  // Build query for unscored candidate datapoints
  const whereClauses = [`d.status = 'candidate'`, `d.confidence_details_json IS NULL`];
  const params: any[] = [];

  if (entityId) {
    whereClauses.push('d.entity_id = ?');
    params.push(entityId);
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
      d.artifact_id,
      d.created_at,
      a.source_type,
      a.source_url,
      v.verdict AS latest_verdict,
      v.checks_json AS latest_checks_json
    FROM datapoints d
    LEFT JOIN artifacts a ON a.artifact_id = d.artifact_id
    LEFT JOIN (
      SELECT datapoint_id, verdict, checks_json,
             ROW_NUMBER() OVER (PARTITION BY datapoint_id ORDER BY checked_at DESC) AS rn
      FROM datapoint_verifications
    ) v ON v.datapoint_id = d.datapoint_id AND v.rn = 1
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY d.created_at DESC
    LIMIT ?;
  `;

  const rows = await d1.query<RawRow>(sql, params);

  console.log(`score-candidate-datapoints: entity=${entityId || '*'} limit=${limit} dryRun=${dryRun} found=${rows.results.length}`);

  if (rows.results.length === 0) {
    console.log('No unscored candidate datapoints found.');
    return;
  }

  // Score each datapoint
  const stats = { high: 0, medium: 0, dlq: 0, wrote: 0 };
  const dlqSamples: string[] = [];

  for (const row of rows.results) {
    const dp = rowToInput(row);
    const result = scoreDatapoint(dp, now);
    const level = classifyConfidence(result.confidence);
    const verdict = verdictFromConfidence(result.confidence);

    stats[level] += 1;

    const out = {
      datapoint_id: dp.datapoint_id,
      entity_id: dp.entity_id,
      metric: dp.metric,
      as_of: dp.as_of,
      method: dp.method,
      confidence: result.confidence,
      level,
      verdict,
      summary: result.confidence_details.summary,
    };

    console.log(JSON.stringify(out));

    if (level === 'dlq' && dlqSamples.length < 5) {
      dlqSamples.push(
        `${dp.entity_id} ${dp.metric} as_of=${dp.as_of || '?'} (${result.confidence.toFixed(2)}, ${dp.method || '?'})`
      );
    }

    if (!dryRun) {
      const detailsJson = JSON.stringify(result.confidence_details);

      // Update confidence + details on the datapoint
      await d1.query(
        `UPDATE datapoints SET confidence = ?, confidence_details_json = ? WHERE datapoint_id = ?;`,
        [result.confidence, detailsJson, dp.datapoint_id]
      );

      // Write verification row
      const verificationId = crypto.randomUUID();
      const checkedAt = now.toISOString();
      await d1.query(
        `INSERT INTO datapoint_verifications (verification_id, datapoint_id, verdict, checks_json, checked_at, verifier, code_sha)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [verificationId, dp.datapoint_id, verdict, detailsJson, checkedAt, 'confidence_scorer_v1', codeSha]
      );

      // DLQ: mark as needs_review
      if (level === 'dlq') {
        await d1.query(
          `UPDATE datapoints SET status = 'needs_review' WHERE datapoint_id = ?;`,
          [dp.datapoint_id]
        );
      }

      stats.wrote += 1;
    }
  }

  const total = rows.results.length;
  console.log(`\nSummary: scored=${total} high=${stats.high} medium=${stats.medium} dlq=${stats.dlq} wrote=${stats.wrote}`);

  // Discord notification if DLQ items exist
  if (stats.dlq > 0 && !dryRun) {
    const message = [
      `**Scored:** ${total} | **High (>=0.85):** ${stats.high} | **Medium:** ${stats.medium} | **DLQ (<0.50):** ${stats.dlq}`,
      '',
      '**DLQ samples:**',
      ...dlqSamples.map(s => `- ${s}`),
    ].join('\n');

    await sendDiscordAlert('Confidence Scoring: DLQ Items', message, 'warning');
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
