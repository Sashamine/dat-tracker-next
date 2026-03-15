/**
 * Migrate purchase history from purchases-history.ts → D1 `purchases` table.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/migrate-to-d1/migrate-purchases.ts
 */

import { D1Client } from '../../src/lib/d1';
import { PURCHASES } from '../../src/lib/data/purchases-history';
import { ensureSchema, uuid, log, logSuccess, logError, approxEqual } from './helpers';

async function main() {
  const d1 = D1Client.fromEnv();
  await ensureSchema(d1);

  // Clear existing data for idempotent re-runs
  await d1.query('DELETE FROM purchases');
  log('Cleared existing purchases data');

  const tickers = Object.keys(PURCHASES);
  log(`Migrating purchases for ${tickers.length} companies...`);

  let inserted = 0;

  for (const ticker of tickers) {
    const company = PURCHASES[ticker];
    for (const purchase of company.purchases) {
      const id = uuid();
      await d1.query(
        `INSERT OR REPLACE INTO purchases (
          purchase_id, entity_id, asset, date, quantity,
          price_per_unit, total_cost, source, source_url, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          id,
          ticker,
          company.asset,
          purchase.date,
          purchase.quantity,
          purchase.pricePerUnit,
          purchase.totalCost,
          purchase.source || null,
          purchase.sourceUrl || null,
        ]
      );
      inserted++;
    }
  }

  log(`Inserted: ${inserted} purchases`);

  // Verification: compare totals per company
  log('Verifying...');
  let verified = 0;
  let mismatched = 0;

  for (const ticker of tickers) {
    const company = PURCHASES[ticker];
    const result = await d1.query<{ cnt: number; total_qty: number; total_cost: number }>(
      `SELECT COUNT(*) as cnt, SUM(quantity) as total_qty, SUM(total_cost) as total_cost
       FROM purchases WHERE entity_id = ?`,
      [ticker]
    );

    const row = result.results?.[0];
    if (!row) {
      logError(`MISSING: ${ticker} has no purchases in D1`);
      mismatched++;
      continue;
    }

    const fieldErrors: string[] = [];
    if (row.cnt !== company.purchases.length) {
      fieldErrors.push(`count: ${row.cnt} != ${company.purchases.length}`);
    }
    if (!approxEqual(row.total_qty, company.totalQuantity)) {
      fieldErrors.push(`totalQuantity: ${row.total_qty} != ${company.totalQuantity}`);
    }
    if (!approxEqual(row.total_cost, company.totalCost)) {
      fieldErrors.push(`totalCost: ${row.total_cost} != ${company.totalCost}`);
    }

    if (fieldErrors.length > 0) {
      logError(`MISMATCH [${ticker}]: ${fieldErrors.join(', ')}`);
      mismatched++;
    } else {
      verified++;
      log(`  ${ticker}: ${row.cnt} purchases, ${row.total_qty} ${company.asset}, $${(row.total_cost / 1e9).toFixed(1)}B`);
    }
  }

  if (mismatched > 0) {
    logError(`${mismatched} mismatches found!`);
    process.exit(1);
  }

  logSuccess('purchases', inserted);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
