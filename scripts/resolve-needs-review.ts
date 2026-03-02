#!/usr/bin/env npx tsx

/**
 * Resolve DLQ items: update status and write a manual verification row.
 *
 * Env vars:
 *   DATAPOINT_IDS - comma-separated datapoint_id values to resolve
 *   ENTITY_ID     - alternative: resolve all needs_review for this entity
 *   VERDICT       - pass | warn | fail (default: pass)
 *   NEW_STATUS    - target status (default: candidate)
 *   NOTES         - free-text reason for resolution
 *   DRY_RUN       - if true, print what would happen (default: true)
 *   CODE_SHA      - git sha for provenance
 */

import crypto from 'node:crypto';
import { D1Client } from '../src/lib/d1';

async function main() {
  const d1 = D1Client.fromEnv();

  const datapointIds = (process.env.DATAPOINT_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const entityId = process.env.ENTITY_ID || null;
  const verdict = (process.env.VERDICT || 'pass') as 'pass' | 'warn' | 'fail';
  const newStatus = process.env.NEW_STATUS || 'candidate';
  const notes = process.env.NOTES || 'Manual DLQ resolution';
  const dryRun = String(process.env.DRY_RUN || 'true').toLowerCase() !== 'false';
  const codeSha = process.env.CODE_SHA || null;

  if (!['pass', 'warn', 'fail'].includes(verdict)) {
    console.error(`Invalid VERDICT: ${verdict}. Must be pass, warn, or fail.`);
    process.exit(1);
  }

  // Find target datapoints
  let targetIds: string[] = [];

  if (datapointIds.length > 0) {
    targetIds = datapointIds;
  } else if (entityId) {
    const rows = await d1.query<{ datapoint_id: string }>(
      `SELECT datapoint_id FROM datapoints WHERE entity_id = ? AND status = 'needs_review' LIMIT 100;`,
      [entityId]
    );
    targetIds = rows.results.map(r => r.datapoint_id);
  } else {
    console.error('Must provide DATAPOINT_IDS or ENTITY_ID.');
    process.exit(1);
  }

  console.log(`resolve-needs-review: targets=${targetIds.length} verdict=${verdict} newStatus=${newStatus} dryRun=${dryRun}`);

  if (targetIds.length === 0) {
    console.log('No matching needs_review datapoints found.');
    return;
  }

  // Verify targets actually exist and are needs_review
  const placeholders = targetIds.map(() => '?').join(',');
  const existing = await d1.query<{ datapoint_id: string; entity_id: string; metric: string; status: string; confidence: number }>(
    `SELECT datapoint_id, entity_id, metric, status, confidence FROM datapoints WHERE datapoint_id IN (${placeholders});`,
    targetIds
  );

  const existingMap = new Map(existing.results.map(r => [r.datapoint_id, r]));
  let resolved = 0;
  let skipped = 0;

  const now = new Date().toISOString();

  for (const dpId of targetIds) {
    const dp = existingMap.get(dpId);
    if (!dp) {
      console.log(JSON.stringify({ datapoint_id: dpId, action: 'skip', reason: 'not found' }));
      skipped += 1;
      continue;
    }
    if (dp.status !== 'needs_review') {
      console.log(JSON.stringify({ datapoint_id: dpId, entity_id: dp.entity_id, metric: dp.metric, action: 'skip', reason: `status=${dp.status}, not needs_review` }));
      skipped += 1;
      continue;
    }

    const checksJson = JSON.stringify([{
      name: 'manual_resolution',
      status: verdict,
      details: notes,
    }]);

    if (dryRun) {
      console.log(JSON.stringify({
        datapoint_id: dpId,
        entity_id: dp.entity_id,
        metric: dp.metric,
        confidence: dp.confidence,
        action: 'would_resolve',
        new_status: newStatus,
        verdict,
        notes,
      }));
    } else {
      // Update status
      await d1.query(
        `UPDATE datapoints SET status = ? WHERE datapoint_id = ?;`,
        [newStatus, dpId]
      );

      // Write verification row
      const verificationId = crypto.randomUUID();
      await d1.query(
        `INSERT INTO datapoint_verifications (verification_id, datapoint_id, verdict, checks_json, checked_at, verifier, code_sha)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [verificationId, dpId, verdict, checksJson, now, 'manual', codeSha]
      );

      console.log(JSON.stringify({
        datapoint_id: dpId,
        entity_id: dp.entity_id,
        metric: dp.metric,
        confidence: dp.confidence,
        action: 'resolved',
        new_status: newStatus,
        verdict,
        verification_id: verificationId,
      }));
    }

    resolved += 1;
  }

  console.log(`\nSummary: resolved=${resolved} skipped=${skipped} dryRun=${dryRun}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
