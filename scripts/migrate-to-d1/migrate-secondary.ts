/**
 * Migrate secondaryCryptoHoldings + cryptoInvestments from companies.ts →
 * D1 `secondary_holdings` and `investments` tables.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/migrate-to-d1/migrate-secondary.ts
 */

import { D1Client } from '../../src/lib/d1';
import { allCompanies } from '../../src/lib/data/companies';
import { ensureSchema, uuid, log, logSuccess, logError, approxEqual } from './helpers';

async function main() {
  const d1 = D1Client.fromEnv();
  await ensureSchema(d1);

  // Clear existing data for idempotent re-runs
  await d1.query('DELETE FROM secondary_holdings');
  await d1.query('DELETE FROM investments');
  log('Cleared existing secondary_holdings and investments data');

  let holdingsInserted = 0;
  let investmentsInserted = 0;

  // Migrate secondaryCryptoHoldings
  for (const c of allCompanies) {
    if (!c.secondaryCryptoHoldings || c.secondaryCryptoHoldings.length === 0) continue;

    for (const h of c.secondaryCryptoHoldings) {
      await d1.query(
        `INSERT OR REPLACE INTO secondary_holdings (
          holding_id, entity_id, asset, amount, as_of, source, source_url, note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuid(),
          c.ticker,
          h.asset,
          h.amount,
          c.holdingsLastUpdated || null,
          null,
          null,
          h.note || null,
        ]
      );
      holdingsInserted++;
    }
  }

  log(`Inserted: ${holdingsInserted} secondary holdings`);

  // Migrate cryptoInvestments
  for (const c of allCompanies) {
    if (!c.cryptoInvestments || c.cryptoInvestments.length === 0) continue;

    for (const inv of c.cryptoInvestments) {
      await d1.query(
        `INSERT OR REPLACE INTO investments (
          investment_id, entity_id, name, type, underlying_asset,
          fair_value, source_date, source, source_url,
          lst_amount, exchange_rate, underlying_amount, note, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuid(),
          c.ticker,
          inv.name,
          inv.type,
          inv.underlyingAsset || null,
          inv.fairValue || null,
          inv.sourceDate || null,
          inv.source || null,
          inv.sourceUrl || null,
          inv.lstAmount || null,
          inv.exchangeRate || null,
          inv.underlyingAmount || null,
          inv.note || null,
          null,
        ]
      );
      investmentsInserted++;
    }
  }

  log(`Inserted: ${investmentsInserted} crypto investments`);

  // Verification
  log('Verifying secondary_holdings...');
  let verified = 0;
  let mismatched = 0;

  for (const c of allCompanies) {
    if (!c.secondaryCryptoHoldings || c.secondaryCryptoHoldings.length === 0) continue;

    const result = await d1.query<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM secondary_holdings WHERE entity_id = ?',
      [c.ticker]
    );

    const expected = c.secondaryCryptoHoldings.length;
    const actual = result.results?.[0]?.cnt || 0;

    if (actual !== expected) {
      logError(`MISMATCH [${c.ticker}] secondary_holdings: ${actual} != ${expected}`);
      mismatched++;
    } else {
      verified++;
    }
  }

  log('Verifying investments...');
  for (const c of allCompanies) {
    if (!c.cryptoInvestments || c.cryptoInvestments.length === 0) continue;

    const result = await d1.query<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM investments WHERE entity_id = ?',
      [c.ticker]
    );

    const expected = c.cryptoInvestments.length;
    const actual = result.results?.[0]?.cnt || 0;

    if (actual !== expected) {
      logError(`MISMATCH [${c.ticker}] investments: ${actual} != ${expected}`);
      mismatched++;
    } else {
      verified++;
    }
  }

  if (mismatched > 0) {
    logError(`${mismatched} mismatches found!`);
    process.exit(1);
  }

  logSuccess('secondary_holdings', holdingsInserted);
  logSuccess('investments', investmentsInserted);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
