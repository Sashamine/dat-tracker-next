#!/usr/bin/env npx tsx
/**
 * Phase 4b: Delete orphaned artifacts (no linked datapoints).
 *
 * These are artifact rows in D1 with no datapoints referencing them.
 * The actual R2 files are NOT touched — only the D1 metadata is removed.
 *
 * Usage:
 *   npx tsx scripts/d1-cleanup-orphaned-artifacts.ts --dry-run   # audit only
 *   npx tsx scripts/d1-cleanup-orphaned-artifacts.ts              # delete
 */

import { D1Client } from '../src/lib/d1';

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const d1 = D1Client.fromEnv();

  // Find all orphaned artifacts
  const { results: orphans } = await d1.query<{
    artifact_id: string;
    ticker: string | null;
    source_type: string | null;
    accession: string | null;
    r2_key: string | null;
    r2_bucket: string | null;
  }>(`
    SELECT a.artifact_id, a.ticker, a.source_type, a.accession, a.r2_key, a.r2_bucket
    FROM artifacts a
    WHERE NOT EXISTS (
      SELECT 1 FROM datapoints d WHERE d.artifact_id = a.artifact_id
    )
    ORDER BY a.ticker, a.source_type
  `);

  console.log(`Orphaned artifacts: ${orphans.length}`);

  // Categorize
  const byCategory: Record<string, number> = {};
  for (const o of orphans) {
    const cat = o.source_type || 'null';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  }

  console.log(`\nBy source_type:`);
  for (const [cat, cnt] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${cnt}`);
  }

  const byTicker: Record<string, number> = {};
  for (const o of orphans) {
    const t = o.ticker || '(null)';
    byTicker[t] = (byTicker[t] || 0) + 1;
  }

  console.log(`\nTop tickers:`);
  for (const [t, cnt] of Object.entries(byTicker).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`  ${t}: ${cnt}`);
  }

  // Check for duplicates (orphans that share accession with a linked artifact)
  const { results: dupes } = await d1.query<{ cnt: number }>(`
    SELECT COUNT(*) as cnt
    FROM artifacts orphan
    WHERE NOT EXISTS (SELECT 1 FROM datapoints d WHERE d.artifact_id = orphan.artifact_id)
      AND orphan.accession IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM artifacts linked
        WHERE linked.accession = orphan.accession
          AND linked.artifact_id != orphan.artifact_id
          AND EXISTS (SELECT 1 FROM datapoints d2 WHERE d2.artifact_id = linked.artifact_id)
      )
  `);
  console.log(`\nDuplicate of linked artifact: ${dupes[0].cnt}`);

  // Safety check: confirm no datapoints reference any of these (batched for D1 param limit)
  const ids = orphans.map((o) => o.artifact_id);
  const SAFETY_BATCH = 40;
  let safetyTotal = 0;

  for (let i = 0; i < ids.length; i += SAFETY_BATCH) {
    const batch = ids.slice(i, i + SAFETY_BATCH);
    const { results: safety } = await d1.query<{ cnt: number }>(`
      SELECT COUNT(*) as cnt
      FROM datapoints
      WHERE artifact_id IN (${batch.map(() => '?').join(',')})
    `, batch);
    safetyTotal += safety[0].cnt;
  }

  if (safetyTotal > 0) {
    console.error(`\nSAFETY ABORT: ${safetyTotal} datapoints still reference these artifacts!`);
    process.exit(1);
  }

  console.log(`\nSafety check passed: 0 datapoints reference these artifacts`);

  if (DRY_RUN) {
    console.log('\n--- DRY RUN — no changes applied ---');
    return;
  }

  // Delete in batches of 50 (D1 parameter limit)
  const BATCH_SIZE = 50;
  let deleted = 0;

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    await d1.query(
      `DELETE FROM artifacts WHERE artifact_id IN (${batch.map(() => '?').join(',')})`,
      batch,
    );
    deleted += batch.length;
    if (deleted % 200 === 0 || deleted === ids.length) {
      console.log(`  Deleted ${deleted}/${ids.length}`);
    }
  }

  // Verify
  const { results: after } = await d1.query<{ total: number; orphaned: number }>(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN NOT EXISTS (SELECT 1 FROM datapoints d WHERE d.artifact_id = a.artifact_id) THEN 1 ELSE 0 END) as orphaned
    FROM artifacts a
  `);

  console.log(`\nAfter cleanup:`);
  console.log(`  Total artifacts: ${after[0].total}`);
  console.log(`  Orphaned: ${after[0].orphaned}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
