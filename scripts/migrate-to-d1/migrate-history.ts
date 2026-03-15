/**
 * Migrate holdings-history.ts snapshots → D1 `datapoints` rows.
 *
 * Each HoldingsSnapshot produces multiple datapoints:
 *   - holdings_native (crypto holdings)
 *   - basic_shares (shares outstanding)
 *   - debt_usd (total debt)
 *   - cash_usd (cash reserves)
 *   - preferred_equity_usd (preferred equity)
 *
 * All get method='migration_from_static' and confidence=1.0.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/migrate-to-d1/migrate-history.ts
 */

import { D1Client } from '../../src/lib/d1';
import { HOLDINGS_HISTORY, getHoldingsHistory, HoldingsSnapshot } from '../../src/lib/data/holdings-history';
import { ensureSchema, uuid, log, logSuccess, logError, approxEqual } from './helpers';

// Metrics to extract from each snapshot
type MetricExtractor = {
  metric: string;
  getValue: (s: HoldingsSnapshot) => number | undefined | null;
  unit: string;
};

const EXTRACTORS: MetricExtractor[] = [
  { metric: 'holdings_native', getValue: s => s.holdings, unit: 'native' },
  { metric: 'basic_shares', getValue: s => s.sharesOutstanding, unit: 'shares' },
  { metric: 'debt_usd', getValue: s => s.totalDebt, unit: 'USD' },
  { metric: 'cash_usd', getValue: s => s.cash, unit: 'USD' },
  { metric: 'preferred_equity_usd', getValue: s => s.preferredEquity, unit: 'USD' },
];

async function main() {
  const d1 = D1Client.fromEnv();
  await ensureSchema(d1);

  // Gather all holdings histories (including special-cased MSTR, BMNR, SBET)
  const allHistories: { ticker: string; asset: string; history: HoldingsSnapshot[] }[] = [];
  const seenTickers = new Set<string>();

  // Standard histories from HOLDINGS_HISTORY (deduplicate by ticker)
  for (const [key, entry] of Object.entries(HOLDINGS_HISTORY)) {
    if (seenTickers.has(entry.ticker)) {
      log(`  SKIP duplicate key "${key}" (already have ticker ${entry.ticker})`);
      continue;
    }
    seenTickers.add(entry.ticker);
    allHistories.push({ ticker: entry.ticker, asset: entry.asset, history: entry.history });
  }

  // MSTR uses getHoldingsHistory() which returns from verified financials
  const mstrHistory = getHoldingsHistory('MSTR');
  if (mstrHistory) {
    // Remove any duplicate MSTR from standard histories
    const idx = allHistories.findIndex(h => h.ticker === 'MSTR');
    if (idx >= 0) allHistories.splice(idx, 1);
    allHistories.push({ ticker: 'MSTR', asset: 'BTC', history: mstrHistory.history });
  }

  // Clear migrated-from-static datapoints for idempotent re-runs
  await d1.query("DELETE FROM datapoints WHERE method = 'migration_from_static'");
  log('Cleared existing migration_from_static datapoints');

  // Create a placeholder artifact and run for migrated data
  const migrationArtifactId = 'migration-static-files';
  const migrationRunId = 'migration-run-001';

  // Ensure placeholder artifact exists (all NOT NULL fields filled)
  await d1.query(
    `INSERT OR IGNORE INTO artifacts (artifact_id, source_type, source_url, content_hash, fetched_at, r2_bucket, r2_key, accession)
     VALUES (?, ?, ?, ?, datetime('now'), ?, ?, ?)`,
    [migrationArtifactId, 'migration', 'static://holdings-history.ts', 'migration-static', 'dat-tracker-filings', 'migration/placeholder', 'migration-from-static']
  );

  // Ensure placeholder run exists (all NOT NULL fields filled)
  await d1.query(
    `INSERT OR IGNORE INTO runs (run_id, started_at, trigger)
     VALUES (?, datetime('now'), ?)`,
    [migrationRunId, 'migration-script']
  );

  log(`Migrating history for ${allHistories.length} companies...`);

  let totalInserted = 0;
  let totalSnapshots = 0;

  for (const { ticker, asset, history } of allHistories) {
    let companyInserted = 0;

    for (const snapshot of history) {
      totalSnapshots++;

      for (const extractor of EXTRACTORS) {
        const value = extractor.getValue(snapshot);
        if (value == null) continue;

        await d1.query(
          `INSERT INTO datapoints (
            datapoint_id, entity_id, metric, value, unit, scale,
            as_of, reported_at, artifact_id, run_id, method, confidence,
            citation_quote, citation_search_term,
            created_at, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'approved')
          ON CONFLICT(datapoint_id) DO NOTHING`,
          [
            uuid(),
            ticker,
            extractor.metric,
            value,
            extractor.unit,
            1,
            snapshot.date,
            snapshot.date,
            migrationArtifactId,
            migrationRunId,
            'migration_from_static',
            1.0,
            snapshot.source || null,
            null,
          ]
        );
        companyInserted++;
      }
    }

    totalInserted += companyInserted;
    log(`  ${ticker}: ${history.length} snapshots → ${companyInserted} datapoints`);
  }

  log(`Total: ${totalSnapshots} snapshots → ${totalInserted} datapoints`);

  // Verification: for each company, verify holdings_native count matches snapshot count
  log('Verifying...');
  let verified = 0;
  let mismatched = 0;

  for (const { ticker, history } of allHistories) {
    // Count holdings_native datapoints from migration
    const result = await d1.query<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM datapoints
       WHERE entity_id = ? AND metric = 'holdings_native' AND method = 'migration_from_static'`,
      [ticker]
    );
    const d1Count = result.results?.[0]?.cnt || 0;
    // Each snapshot should have exactly one holdings_native (all snapshots have holdings)
    const expectedCount = history.filter(s => s.holdings != null).length;

    if (d1Count !== expectedCount) {
      logError(`COUNT MISMATCH [${ticker}] holdings_native: D1 has ${d1Count}, expected ${expectedCount}`);
      mismatched++;
    } else {
      verified++;
    }

    // Verify a sample datapoint value (latest snapshot)
    const latest = history[history.length - 1];
    if (latest) {
      const sampleResult = await d1.query<{ value: number }>(
        `SELECT value FROM datapoints
         WHERE entity_id = ? AND metric = 'holdings_native' AND as_of = ? AND method = 'migration_from_static'
         LIMIT 1`,
        [ticker, latest.date]
      );
      const sampleValue = sampleResult.results?.[0]?.value;
      if (sampleValue != null && !approxEqual(sampleValue, latest.holdings)) {
        logError(`VALUE MISMATCH [${ticker}] at ${latest.date}: D1=${sampleValue} vs source=${latest.holdings}`);
        mismatched++;
      }
    }
  }

  if (mismatched > 0) {
    logError(`${mismatched} mismatches found!`);
    process.exit(1);
  }

  logSuccess('datapoints (from history)', totalInserted);
  log(`Verified ${verified} companies`);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
