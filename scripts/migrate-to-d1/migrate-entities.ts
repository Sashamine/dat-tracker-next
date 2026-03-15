/**
 * Migrate company metadata from companies.ts + company-sources.ts → D1 `entities` table.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/migrate-to-d1/migrate-entities.ts
 */

import { D1Client } from '../../src/lib/d1';
import { allCompanies } from '../../src/lib/data/companies';
import { COMPANY_SOURCES } from '../../src/lib/data/company-sources';
import { ensureSchema, log, logSuccess, logError } from './helpers';

async function main() {
  const d1 = D1Client.fromEnv();
  await ensureSchema(d1);

  // Clear dependent tables first (FK constraints), then entities
  for (const table of ['instruments', 'purchases', 'secondary_holdings', 'investments', 'capital_events', 'assumptions']) {
    try { await d1.query(`DELETE FROM ${table}`); } catch { /* table may not exist yet */ }
  }
  await d1.query('DELETE FROM entities');
  log('Cleared existing entities and dependent tables');

  log(`Migrating ${allCompanies.length} companies to entities table...`);

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const c of allCompanies) {
    const sources = COMPANY_SOURCES[c.ticker] || null;

    try {
      await d1.query(
        `INSERT OR REPLACE INTO entities (
          entity_id, name, asset, tier, country, jurisdiction, currency,
          exchange_mic, sec_cik, dat_start_date, is_miner, treasury_model,
          website, twitter, investor_relations_url, leader, strategy, notes,
          official_dashboard, official_dashboard_name, official_mnav_note,
          shares_source, shares_notes, reports_holdings_frequency, reports_mnav_daily,
          edinet_code, hkex_stock_code, euronext_isin, ngm_isin, sedar_isin,
          sedar_profile, cusip, isin, exchange,
          metadata_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          c.ticker,
          c.name,
          c.asset,
          c.tier || 2,
          c.country || null,
          c.jurisdiction || null,
          'USD',
          c.exchangeMic || null,
          c.secCik || null,
          c.datStartDate || null,
          c.isMiner ? 1 : 0,
          c.treasuryModel || null,
          c.website || null,
          c.twitter || null,
          c.investorRelations || sources?.investorRelations || null,
          c.leader || null,
          c.strategy || null,
          c.notes || null,
          sources?.officialDashboard || null,
          sources?.officialDashboardName || null,
          sources?.officialMnavNote || null,
          sources?.sharesSource || null,
          sources?.sharesNotes || null,
          sources?.reportsHoldingsFrequency || null,
          sources?.reportsMnavDaily ? 1 : 0,
          sources?.edinetCode || null,
          sources?.hkexStockCode || null,
          sources?.euronextIsin || null,
          sources?.ngmIsin || null,
          sources?.sedarIsin || null,
          (c as any).sedarProfile || null,
          (c as any).cusip || null,
          (c as any).isin || null,
          sources?.exchange || null,
          // metadata_json: store less-common fields
          JSON.stringify({
            authoritativeSource: c.authoritativeSource,
            filingType: (c as any).filingType,
            founded: (c as any).founded,
            headquarters: (c as any).headquarters,
            ceo: (c as any).ceo,
            logoUrl: (c as any).logoUrl,
            description: (c as any).description,
            trackers: sources?.trackers,
            blockworksUrl: sources?.blockworksUrl,
            lastVerified: sources?.lastVerified,
          }),
        ]
      );
      inserted++;
    } catch (err: any) {
      errors.push(`${c.ticker}: ${err.message}`);
      skipped++;
    }
  }

  log(`Inserted: ${inserted}, Skipped: ${skipped}`);

  // Verification: read back and compare
  log('Verifying...');
  let verified = 0;
  let mismatched = 0;

  for (const c of allCompanies) {
    const result = await d1.query<Record<string, unknown>>(
      'SELECT * FROM entities WHERE entity_id = ?',
      [c.ticker]
    );

    if (!result.results || result.results.length === 0) {
      logError(`MISSING: ${c.ticker}`);
      mismatched++;
      continue;
    }

    const row = result.results[0];
    const fieldErrors: string[] = [];

    if (row.name !== c.name) fieldErrors.push(`name: ${row.name} != ${c.name}`);
    if (row.asset !== c.asset) fieldErrors.push(`asset: ${row.asset} != ${c.asset}`);
    if (row.tier !== (c.tier || 2)) fieldErrors.push(`tier: ${row.tier} != ${c.tier || 2}`);

    if (fieldErrors.length > 0) {
      logError(`MISMATCH [${c.ticker}]: ${fieldErrors.join(', ')}`);
      mismatched++;
    } else {
      verified++;
    }
  }

  if (mismatched > 0) {
    logError(`${mismatched} mismatches found! Migration has errors.`);
    process.exit(1);
  }

  logSuccess('entities', verified);

  if (errors.length > 0) {
    log('Errors during insert:');
    errors.forEach(e => console.log(`  ${e}`));
  }
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
