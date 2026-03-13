#!/usr/bin/env npx tsx
/**
 * reconciliation-d1.ts
 *
 * Compares D1 latest_datapoints values against companies.ts.
 * Flags >1% divergence with details.
 *
 * Requires env vars: set -a && source .env.local && set +a
 *
 * Usage:
 *   npx tsx scripts/reconciliation-d1.ts              # all companies
 *   npx tsx scripts/reconciliation-d1.ts --ticker=MSTR # single company
 *   npx tsx scripts/reconciliation-d1.ts --verbose     # show passing too
 */

import { D1Client } from '../src/lib/d1';
import { allCompanies } from '../src/lib/data/companies';

function argVal(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}
const filterTicker = argVal('ticker')?.toUpperCase() ?? null;
const verbose = process.argv.includes('--verbose');

type Company = (typeof allCompanies)[0];

// D1 metric → companies.ts field + threshold
const METRIC_MAP = [
  { d1: 'holdings_native', field: 'holdings', label: 'Holdings', tol: 0.01 },
  { d1: 'basic_shares', field: 'sharesForMnav', label: 'Shares', tol: 0.05 },
  { d1: 'debt_usd', field: 'totalDebt', label: 'Debt', tol: 0.01 },
  { d1: 'cash_usd', field: 'cashReserves', label: 'Cash', tol: 0.05 },
  { d1: 'restricted_cash_usd', field: 'restrictedCash', label: 'Restricted Cash', tol: 0.05 },
  { d1: 'preferred_equity_usd', field: 'preferredEquity', label: 'Preferred Equity', tol: 0.01 },
] as const;

function getField(c: Company, field: string): number {
  return (c as Record<string, unknown>)[field] as number ?? 0;
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

  // Fetch all latest datapoints in one query
  const { results: rows } = await d1.query<{
    entity_id: string; metric: string; value: number; method: string; created_at: string;
  }>('SELECT entity_id, metric, value, method, created_at FROM latest_datapoints ORDER BY entity_id, metric');

  // Index by entity+metric
  const d1Data: Record<string, Record<string, { value: number; method: string; created_at: string }>> = {};
  for (const r of rows) {
    if (!d1Data[r.entity_id]) d1Data[r.entity_id] = {};
    d1Data[r.entity_id][r.metric] = { value: r.value, method: r.method, created_at: r.created_at };
  }

  // Index companies by ticker
  const companyMap: Record<string, Company> = {};
  for (const c of allCompanies) companyMap[c.ticker] = c;

  const stats = { pass: 0, warn: 0, fail: 0, zeroBoth: 0, missingD1: 0, missingCode: 0 };

  type Issue = { level: 'FAIL' | 'WARN'; ticker: string; metric: string; d1Val: number; codeVal: number; dev: string; method: string };
  const issues: Issue[] = [];

  const tickers = filterTicker ? [filterTicker] : [...new Set([...Object.keys(d1Data), ...allCompanies.map(c => c.ticker)])].sort();

  for (const ticker of tickers) {
    const company = companyMap[ticker];
    const entity = d1Data[ticker];

    if (!company) { stats.missingCode++; continue; }
    if (!entity) { stats.missingD1++; continue; }
    if (company.pendingMerger) continue;

    for (const m of METRIC_MAP) {
      const d1Entry = entity[m.d1];
      if (!d1Entry) continue;

      const codeVal = getField(company, m.field);
      const d1Val = d1Entry.value;

      if (d1Val === 0 && codeVal === 0) { stats.zeroBoth++; continue; }

      // One is zero
      if (d1Val === 0 || codeVal === 0) {
        const level: 'FAIL' | 'WARN' = d1Val === 0 ? 'WARN' : 'FAIL';
        issues.push({ level, ticker, metric: m.label, d1Val, codeVal, dev: d1Val === 0 ? 'D1=0' : 'code=0', method: d1Entry.method });
        level === 'FAIL' ? stats.fail++ : stats.warn++;
        continue;
      }

      const dev = Math.abs(d1Val - codeVal) / Math.max(Math.abs(d1Val), Math.abs(codeVal));
      if (dev > m.tol) {
        const level: 'FAIL' | 'WARN' = dev > 0.10 ? 'FAIL' : 'WARN';
        issues.push({ level, ticker, metric: m.label, d1Val, codeVal, dev: `${(dev * 100).toFixed(1)}%`, method: d1Entry.method });
        level === 'FAIL' ? stats.fail++ : stats.warn++;
      } else {
        stats.pass++;
        if (verbose) console.log(`  PASS ${ticker} ${m.label}: D1=${fmt(d1Val)} code=${fmt(codeVal)} (${(dev * 100).toFixed(2)}%)`);
      }
    }
  }

  // Output
  console.log(`\n${'='.repeat(60)}`);
  console.log('D1 vs companies.ts RECONCILIATION');
  console.log(`${'='.repeat(60)}`);
  console.log(`  Pass:            ${stats.pass}`);
  console.log(`  Warn (1-10%):    ${stats.warn}`);
  console.log(`  Fail (>10%):     ${stats.fail}`);
  console.log(`  Both zero:       ${stats.zeroBoth}`);
  console.log(`  Missing in D1:   ${stats.missingD1}`);
  console.log(`  Missing in code: ${stats.missingCode}`);

  issues.sort((a, b) => a.level !== b.level ? (a.level === 'FAIL' ? -1 : 1) : a.ticker.localeCompare(b.ticker));

  const fails = issues.filter(i => i.level === 'FAIL');
  const warns = issues.filter(i => i.level === 'WARN');

  if (fails.length > 0) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`FAIL (>10% divergence) — ${fails.length}:`);
    console.log(`${'─'.repeat(60)}`);
    for (const i of fails) console.log(`  ${i.ticker} ${i.metric}: D1=${fmt(i.d1Val)} vs code=${fmt(i.codeVal)} (${i.dev}) [${i.method}]`);
  }

  if (warns.length > 0) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`WARN (1-10% divergence) — ${warns.length}:`);
    console.log(`${'─'.repeat(60)}`);
    for (const i of warns) console.log(`  ${i.ticker} ${i.metric}: D1=${fmt(i.d1Val)} vs code=${fmt(i.codeVal)} (${i.dev}) [${i.method}]`);
  }

  if (issues.length === 0) console.log('\n  All metrics consistent!');

  // D1-only and code-only tickers
  const d1Only = Object.keys(d1Data).filter(t => !companyMap[t]).sort();
  if (d1Only.length > 0) console.log(`\nD1-only tickers: ${d1Only.join(', ')}`);

  const codeOnly = allCompanies.filter(c => !d1Data[c.ticker]).map(c => c.ticker).sort();
  if (codeOnly.length > 0) console.log(`\nCode-only tickers: ${codeOnly.join(', ')}`);

  if (stats.fail > 0) process.exit(1);
}

main().catch(console.error);
