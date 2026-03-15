/**
 * Migrate assumptions from assumptions.ts → D1 `assumptions` table.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/migrate-to-d1/migrate-assumptions.ts
 */

import { D1Client } from '../../src/lib/d1';
import { ASSUMPTIONS } from '../../src/lib/data/assumptions';
import { ensureSchema, uuid, log, logSuccess, logError } from './helpers';

async function main() {
  const d1 = D1Client.fromEnv();
  await ensureSchema(d1);

  // Clear existing data for idempotent re-runs
  await d1.query('DELETE FROM assumptions');
  log('Cleared existing assumptions data');

  log(`Migrating ${ASSUMPTIONS.length} assumptions...`);

  let inserted = 0;

  for (const a of ASSUMPTIONS) {
    await d1.query(
      `INSERT OR REPLACE INTO assumptions (
        assumption_id, entity_id, field, assumption, reason,
        trigger_event, source_needed, resolution_path,
        sensitivity, materiality, status, last_reviewed,
        introduced_by, review_notes, resolved_date, resolved_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuid(),
        a.ticker,
        a.field,
        a.assumption,
        a.reason,
        a.trigger,
        a.sourceNeeded,
        a.resolutionPath,
        a.sensitivity,
        a.materiality,
        a.status,
        a.lastReviewed,
        a.introducedBy || null,
        a.reviewNotes || null,
        a.resolvedDate || null,
        a.resolvedNotes || null,
      ]
    );
    inserted++;
  }

  log(`Inserted: ${inserted} assumptions`);

  // Verification
  log('Verifying...');
  let verified = 0;
  let mismatched = 0;

  const result = await d1.query<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM assumptions'
  );
  const count = result.results?.[0]?.cnt || 0;

  if (count !== ASSUMPTIONS.length) {
    logError(`COUNT MISMATCH: D1 has ${count}, source has ${ASSUMPTIONS.length}`);
    process.exit(1);
  }

  // Verify each assumption by ticker + field
  for (const a of ASSUMPTIONS) {
    const found = await d1.query<Record<string, unknown>>(
      `SELECT * FROM assumptions WHERE entity_id = ? AND field = ? AND assumption = ?`,
      [a.ticker, a.field, a.assumption]
    );

    if (!found.results || found.results.length === 0) {
      logError(`MISSING: ${a.ticker}.${a.field}`);
      mismatched++;
    } else {
      const row = found.results[0];
      const fieldErrors: string[] = [];

      if (row.sensitivity !== a.sensitivity) fieldErrors.push(`sensitivity: ${row.sensitivity} != ${a.sensitivity}`);
      if (row.materiality !== a.materiality) fieldErrors.push(`materiality: ${row.materiality} != ${a.materiality}`);
      if (row.status !== a.status) fieldErrors.push(`status: ${row.status} != ${a.status}`);

      if (fieldErrors.length > 0) {
        logError(`MISMATCH [${a.ticker}.${a.field}]: ${fieldErrors.join(', ')}`);
        mismatched++;
      } else {
        verified++;
      }
    }
  }

  if (mismatched > 0) {
    logError(`${mismatched} mismatches found!`);
    process.exit(1);
  }

  logSuccess('assumptions', verified);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
