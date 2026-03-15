/**
 * Migrate dilutive instruments from dilutive-instruments.ts → D1 `instruments` table.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/migrate-to-d1/migrate-instruments.ts
 */

import { D1Client } from '../../src/lib/d1';
import { dilutiveInstruments } from '../../src/lib/data/dilutive-instruments';
import { allCompanies } from '../../src/lib/data/companies';
import { ensureSchema, uuid, log, logSuccess, logError, approxEqual } from './helpers';

// Build a mapping from instrument ticker → entity_id (handles BTCT → BTCT.V etc.)
const entityIds = new Set(allCompanies.map(c => c.ticker));
function resolveEntityId(ticker: string): string | null {
  if (entityIds.has(ticker)) return ticker;
  // Try common suffixes
  for (const suffix of ['.V', '.T', '.HK', '.ST', '.AX']) {
    if (entityIds.has(ticker + suffix)) return ticker + suffix;
  }
  return null;
}

async function main() {
  const d1 = D1Client.fromEnv();
  await ensureSchema(d1);

  // Clear existing data for idempotent re-runs
  await d1.query('DELETE FROM instruments');
  log('Cleared existing instruments data');

  const tickers = Object.keys(dilutiveInstruments);
  log(`Migrating instruments for ${tickers.length} companies...`);

  let inserted = 0;
  let totalInstruments = 0;
  const idMap: Map<string, string> = new Map(); // index key → instrument_id

  const processedEntities = new Set<string>(); // Avoid double-inserting (e.g., BTCT + BTCT.V)

  for (const ticker of tickers) {
    const entityId = resolveEntityId(ticker);
    if (!entityId) {
      log(`  SKIP ${ticker}: no matching entity_id found`);
      continue;
    }

    // Skip if we already processed this entity_id via a different key
    if (processedEntities.has(entityId)) {
      log(`  SKIP ${ticker}: already processed as ${entityId}`);
      continue;
    }
    processedEntities.add(entityId);

    const instruments = dilutiveInstruments[ticker];
    for (let i = 0; i < instruments.length; i++) {
      const inst = instruments[i];
      const id = uuid();
      const key = `${ticker}-${i}`;
      idMap.set(key, id);
      totalInstruments++;

      // Determine status from expiration
      let status = 'active';
      if (inst.expiration) {
        const exp = new Date(inst.expiration);
        if (exp < new Date()) status = 'expired';
      }

      await d1.query(
        `INSERT OR REPLACE INTO instruments (
          instrument_id, entity_id, type, strike_price, potential_shares,
          face_value, settlement_type, issued_date, expiration,
          included_in_base, source, source_url, status, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          id,
          entityId,
          inst.type,
          inst.strikePrice,
          inst.potentialShares,
          inst.faceValue || null,
          inst.settlementType || null,
          inst.issuedDate || null,
          inst.expiration || null,
          inst.includedInBase ? 1 : 0,
          inst.source,
          inst.sourceUrl,
          status,
          inst.notes || null,
        ]
      );
      inserted++;
    }
  }

  log(`Inserted: ${inserted} instruments for ${tickers.length} companies`);

  // Verification
  log('Verifying...');
  let verified = 0;
  let mismatched = 0;

  const verifiedEntities = new Set<string>();
  for (const ticker of tickers) {
    const entityId = resolveEntityId(ticker);
    if (!entityId) continue;
    if (verifiedEntities.has(entityId)) continue;
    verifiedEntities.add(entityId);

    const instruments = dilutiveInstruments[ticker];
    const result = await d1.query<Record<string, unknown>>(
      'SELECT * FROM instruments WHERE entity_id = ? ORDER BY created_at',
      [entityId]
    );

    if (!result.results || result.results.length !== instruments.length) {
      logError(`COUNT MISMATCH [${ticker}]: D1 has ${result.results?.length || 0}, source has ${instruments.length}`);
      mismatched += instruments.length;
      continue;
    }

    // Verify each instrument by matching on type + strikePrice + potentialShares
    for (const inst of instruments) {
      const match = result.results.find(
        (r: any) =>
          r.type === inst.type &&
          approxEqual(r.strike_price, inst.strikePrice) &&
          approxEqual(r.potential_shares, inst.potentialShares)
      );

      if (!match) {
        logError(`MISSING [${ticker}]: ${inst.type} @ $${inst.strikePrice}, ${inst.potentialShares} shares`);
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

  logSuccess('instruments', verified);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
