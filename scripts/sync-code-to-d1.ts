#!/usr/bin/env npx tsx
/**
 * sync-code-to-d1.ts
 *
 * Pushes companies.ts values into D1 where code is demonstrably newer.
 * Only updates metrics where:
 *   1. D1 has stale data (older as_of date than code)
 *   2. The values diverge by >1%
 *
 * This does NOT blindly overwrite — it skips cases where D1 is newer or where
 * the divergence is intentional (PFW shares, stHYPE underlying, etc.).
 *
 * Usage:
 *   npx tsx scripts/sync-code-to-d1.ts              # dry run (default)
 *   npx tsx scripts/sync-code-to-d1.ts --apply       # apply changes
 *   npx tsx scripts/sync-code-to-d1.ts --ticker=MSTR # single ticker
 */

import { D1Client } from '../src/lib/d1';
import { allCompanies } from '../src/lib/data/companies';

function argVal(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}
const apply = process.argv.includes('--apply');
const filterTicker = argVal('ticker')?.toUpperCase() ?? null;

type Company = (typeof allCompanies)[0];

// D1 metric → companies.ts field + as_of field
const SYNC_MAP = [
  { d1: 'holdings_native', field: 'holdings', asOfField: 'holdingsLastUpdated', unit: 'native', sourceField: 'holdingsSource' },
  { d1: 'basic_shares', field: 'sharesForMnav', asOfField: 'sharesAsOf', unit: 'shares', sourceField: 'sharesSource' },
  { d1: 'debt_usd', field: 'totalDebt', asOfField: 'debtAsOf', unit: 'USD', sourceField: 'debtSource' },
  { d1: 'cash_usd', field: 'cashReserves', asOfField: 'cashAsOf', unit: 'USD', sourceField: 'cashSource' },
  { d1: 'restricted_cash_usd', field: 'restrictedCash', asOfField: 'cashAsOf', unit: 'USD', sourceField: 'cashSource' },
  { d1: 'preferred_equity_usd', field: 'preferredEquity', asOfField: 'preferredAsOf', unit: 'USD', sourceField: 'preferredSource' },
] as const;

// Skip list: tickers+metrics where divergence is intentional
const INTENTIONAL_DIVERGENCE = new Set([
  'CYPH:basic_shares',    // Code includes 80.8M pre-funded warrants
  'FWDI:basic_shares',    // Code includes 12.9M PFWs
  'HSDT:basic_shares',    // Code includes 23.9M PFWs
  'HYPD:holdings_native', // Code includes stHYPE underlying
  'BTCS:preferred_equity_usd', // Rounding difference ($2.0M both sides)
]);

function getField(c: Company, field: string): number | undefined {
  const val = (c as Record<string, unknown>)[field];
  return typeof val === 'number' ? val : undefined;
}

function getStringField(c: Company, field: string): string | undefined {
  const val = (c as Record<string, unknown>)[field];
  return typeof val === 'string' ? val : undefined;
}

function fmt(n: number): string {
  if (n === 0) return '0';
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return n.toLocaleString('en-US');
  return String(n);
}

async function main() {
  const d1 = D1Client.fromEnv();

  // Fetch all latest datapoints (need datapoint_id for UPDATE)
  const { results: rows } = await d1.query<{
    datapoint_id: string; entity_id: string; metric: string; value: number; as_of: string | null;
    method: string; created_at: string; artifact_id: string;
  }>('SELECT datapoint_id, entity_id, metric, value, as_of, method, created_at, artifact_id FROM latest_datapoints');

  // Index by entity+metric
  const d1Data: Record<string, Record<string, typeof rows[0]>> = {};
  for (const r of rows) {
    if (!d1Data[r.entity_id]) d1Data[r.entity_id] = {};
    d1Data[r.entity_id][r.metric] = r;
  }

  const companyMap: Record<string, Company> = {};
  for (const c of allCompanies) companyMap[c.ticker] = c;

  const updates: Array<{
    ticker: string; metric: string; oldVal: number; newVal: number;
    oldAsOf: string; newAsOf: string; reason: string;
  }> = [];

  const skipped: Array<{ ticker: string; metric: string; reason: string }> = [];

  const tickers = filterTicker ? [filterTicker] : Object.keys(d1Data).sort();

  for (const ticker of tickers) {
    const company = companyMap[ticker];
    if (!company) continue;
    if (company.pendingMerger) continue;

    const entity = d1Data[ticker];
    if (!entity) continue;

    for (const m of SYNC_MAP) {
      const d1Entry = entity[m.d1];
      if (!d1Entry) continue;

      const skipKey = `${ticker}:${m.d1}`;
      if (INTENTIONAL_DIVERGENCE.has(skipKey)) {
        skipped.push({ ticker, metric: m.d1, reason: 'intentional divergence' });
        continue;
      }

      const codeVal = getField(company, m.field);
      if (codeVal === undefined) continue;

      const d1Val = d1Entry.value;

      // Both zero — skip
      if (d1Val === 0 && codeVal === 0) continue;

      // Check divergence
      const denom = Math.max(Math.abs(d1Val), Math.abs(codeVal), 1);
      const dev = Math.abs(d1Val - codeVal) / denom;
      if (dev <= 0.01) continue; // within 1%, no update needed

      // Check dates: only update if code has a newer as_of
      const codeAsOf = getStringField(company, m.asOfField) || '';
      const d1AsOf = d1Entry.as_of || '';

      if (!codeAsOf) {
        skipped.push({ ticker, metric: m.d1, reason: `no as_of in code (D1=${d1AsOf})` });
        continue;
      }

      if (d1AsOf && codeAsOf < d1AsOf) {
        skipped.push({ ticker, metric: m.d1, reason: `code as_of ${codeAsOf} older than D1 ${d1AsOf}` });
        continue;
      }

      // Code is newer or same date with different value
      const reason = codeAsOf > d1AsOf
        ? `code newer (${codeAsOf} vs ${d1AsOf})`
        : `same date, value diverged ${(dev * 100).toFixed(1)}%`;

      updates.push({
        ticker, metric: m.d1, oldVal: d1Val, newVal: codeVal,
        oldAsOf: d1AsOf, newAsOf: codeAsOf, reason,
      });
    }
  }

  // Print plan
  console.log(`\n${'='.repeat(70)}`);
  console.log(apply ? 'APPLYING D1 UPDATES' : 'DRY RUN — D1 updates planned');
  console.log(`${'='.repeat(70)}`);

  if (updates.length === 0) {
    console.log('\n  No updates needed — all metrics are in sync or intentionally divergent.');
  } else {
    console.log(`\n${updates.length} updates:`);
    for (const u of updates) {
      console.log(`  ${u.ticker} ${u.metric}: ${fmt(u.oldVal)} → ${fmt(u.newVal)} (${u.reason})`);
    }
  }

  if (skipped.length > 0) {
    console.log(`\n${skipped.length} skipped:`);
    for (const s of skipped) {
      console.log(`  ${s.ticker} ${s.metric}: ${s.reason}`);
    }
  }

  if (!apply) {
    if (updates.length > 0) console.log(`\n→ Run with --apply to push ${updates.length} updates to D1`);
    return;
  }

  // Apply updates
  let applied = 0;
  let failed = 0;

  for (const u of updates) {
    const company = companyMap[u.ticker]!;
    const mapping = SYNC_MAP.find(m => m.d1 === u.metric)!;
    const source = getStringField(company, mapping.sourceField) || 'companies.ts';
    const entity = d1Data[u.ticker];
    const oldEntry = entity?.[u.metric];

    if (!oldEntry?.datapoint_id) {
      console.log(`  SKIP ${u.ticker} ${u.metric}: no datapoint_id to update`);
      failed++;
      continue;
    }

    const quote = `[Sync from companies.ts] ${source}`;

    try {
      await d1.query(
        `UPDATE datapoints SET value = ?, as_of = ?, citation_quote = ?, method = 'sync_companies_ts'
         WHERE datapoint_id = ?`,
        [u.newVal, u.newAsOf, quote, oldEntry.datapoint_id]
      );
      console.log(`  OK ${u.ticker} ${u.metric}`);
      applied++;
    } catch (err) {
      console.log(`  FAIL ${u.ticker} ${u.metric}: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  console.log(`\nApplied: ${applied}, Failed: ${failed}`);
}

main().catch(console.error);
