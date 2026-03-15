/**
 * Migrate MSTR capital events from mstr-capital-events.ts → D1 `capital_events` table.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/migrate-to-d1/migrate-events.ts
 */

import { D1Client } from '../../src/lib/d1';
import { MSTR_CAPITAL_EVENTS, CapitalEvent } from '../../src/lib/data/mstr-capital-events';
import { ensureSchema, uuid, log, logSuccess, logError } from './helpers';

function eventToDataJson(event: CapitalEvent): string {
  // Extract type-specific fields into data_json
  const data: Record<string, unknown> = {};

  // BTC fields
  if (event.btcAcquired != null) data.btcAcquired = event.btcAcquired;
  if (event.btcPurchasePrice != null) data.btcPurchasePrice = event.btcPurchasePrice;
  if (event.btcAvgPrice != null) data.btcAvgPrice = event.btcAvgPrice;
  if (event.btcCumulative != null) data.btcCumulative = event.btcCumulative;

  // Debt fields
  if (event.debtPrincipal != null) data.debtPrincipal = event.debtPrincipal;
  if (event.debtCoupon != null) data.debtCoupon = event.debtCoupon;
  if (event.debtMaturity != null) data.debtMaturity = event.debtMaturity;
  if (event.debtType != null) data.debtType = event.debtType;
  if (event.conversionPrice != null) data.conversionPrice = event.conversionPrice;

  // Preferred fields
  if (event.prefTicker != null) data.prefTicker = event.prefTicker;
  if (event.prefShares != null) data.prefShares = event.prefShares;
  if (event.prefGrossProceeds != null) data.prefGrossProceeds = event.prefGrossProceeds;
  if (event.prefDividendRate != null) data.prefDividendRate = event.prefDividendRate;

  // ATM fields
  if (event.atmCapacity != null) data.atmCapacity = event.atmCapacity;
  if (event.atmSecurities != null) data.atmSecurities = event.atmSecurities;
  if (event.atmMstrShares != null) data.atmMstrShares = event.atmMstrShares;
  if (event.atmMstrProceeds != null) data.atmMstrProceeds = event.atmMstrProceeds;
  if (event.atmPrefSales != null) data.atmPrefSales = event.atmPrefSales;
  if (event.atmTotalProceeds != null) data.atmTotalProceeds = event.atmTotalProceeds;

  // Corporate fields
  if (event.splitRatio != null) data.splitRatio = event.splitRatio;
  if (event.newName != null) data.newName = event.newName;

  return JSON.stringify(data);
}

async function main() {
  const d1 = D1Client.fromEnv();
  await ensureSchema(d1);

  // Clear existing data for idempotent re-runs
  await d1.query('DELETE FROM capital_events');
  log('Cleared existing capital_events data');

  log(`Migrating ${MSTR_CAPITAL_EVENTS.length} MSTR capital events...`);

  let inserted = 0;

  for (const event of MSTR_CAPITAL_EVENTS) {
    await d1.query(
      `INSERT OR REPLACE INTO capital_events (
        event_id, entity_id, date, type, description,
        filed_date, accession_number, source_url,
        item, section, data_json, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        uuid(),
        'MSTR',
        event.date,
        event.type,
        event.description,
        event.filedDate,
        event.accessionNumber,
        event.secUrl,
        event.item || null,
        event.section || null,
        eventToDataJson(event),
        event.notes || null,
      ]
    );
    inserted++;
  }

  log(`Inserted: ${inserted} events`);

  // Verification
  log('Verifying...');

  const result = await d1.query<{ cnt: number; types: string }>(
    `SELECT COUNT(*) as cnt FROM capital_events WHERE entity_id = 'MSTR'`
  );
  const count = result.results?.[0]?.cnt || 0;

  if (count !== MSTR_CAPITAL_EVENTS.length) {
    logError(`COUNT MISMATCH: D1 has ${count}, source has ${MSTR_CAPITAL_EVENTS.length}`);
    process.exit(1);
  }

  // Verify each event can be found by date + type
  let verified = 0;
  let mismatched = 0;

  for (const event of MSTR_CAPITAL_EVENTS) {
    const found = await d1.query<{ description: string; data_json: string }>(
      `SELECT description, data_json FROM capital_events
       WHERE entity_id = 'MSTR' AND date = ? AND type = ?`,
      [event.date, event.type]
    );

    // Some dates may have multiple events of same type - check description
    const match = found.results?.find(r => r.description === event.description);
    if (!match) {
      logError(`MISSING: ${event.date} ${event.type} "${event.description}"`);
      mismatched++;
    } else {
      // Verify data_json round-trips correctly for key fields
      const data = JSON.parse(match.data_json);
      if (event.btcAcquired != null && data.btcAcquired !== event.btcAcquired) {
        logError(`MISMATCH [${event.date}]: btcAcquired ${data.btcAcquired} != ${event.btcAcquired}`);
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

  logSuccess('capital_events', verified);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
