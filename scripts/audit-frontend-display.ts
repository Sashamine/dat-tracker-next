#!/usr/bin/env npx tsx
/**
 * audit-frontend-display.ts
 *
 * Verifies what users see matches D1 ground truth.
 *
 * After the provenance refactor, ALL company views (custom + generic) read
 * values from company.* fields, which get D1 overlay via applyD1Overlay().
 * The overlay uses pickNewest() — whoever has the newer as_of date wins.
 *
 * This audit checks:
 *   1. Value agreement: company.* static value vs D1 value
 *   2. Date-aware winner: which value the frontend would display
 *   3. Citation completeness: does the displayed value have a verifiable source?
 *
 * Usage:
 *   npx tsx scripts/audit-frontend-display.ts
 *   npx tsx scripts/audit-frontend-display.ts --ticker=MSTR
 *   npx tsx scripts/audit-frontend-display.ts --verbose
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

const METRIC_MAP = [
  { d1: 'holdings_native', field: 'holdings', dateField: 'holdingsLastUpdated', urlField: 'holdingsSourceUrl', searchField: 'sourceSearchTerm', label: 'Holdings' },
  { d1: 'basic_shares', field: 'sharesForMnav', dateField: 'sharesAsOf', urlField: 'sharesSourceUrl', searchField: 'sharesSearchTerm', label: 'Shares' },
  { d1: 'debt_usd', field: 'totalDebt', dateField: 'debtAsOf', urlField: 'debtSourceUrl', searchField: 'debtSearchTerm', label: 'Debt' },
  { d1: 'cash_usd', field: 'cashReserves', dateField: 'cashAsOf', urlField: 'cashSourceUrl', searchField: 'cashSearchTerm', label: 'Cash' },
  { d1: 'preferred_equity_usd', field: 'preferredEquity', dateField: 'preferredAsOf', urlField: 'preferredSourceUrl', searchField: 'preferredSearchTerm', label: 'Preferred' },
] as const;

// Tickers with custom CompanyView components
const CUSTOM_VIEW_TICKERS = new Set([
  'ABTC', 'ALCPB', 'ASST', 'AVX', 'BMNR', 'BTBT', 'DCC.AX', 'DDC', 'DFDV',
  'DJT', 'FWDI', 'H100.ST', 'HSDT', 'MARA', '3350.T', 'MSTR', 'NAKA',
  'SBET', 'SUIG', 'UPXI', 'XXI',
]);

function fmt(n: number): string {
  if (n === 0) return '0';
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return n.toLocaleString('en-US');
  return String(n);
}

function getField(c: Company, field: string): unknown {
  return (c as Record<string, unknown>)[field];
}

interface D1Row {
  entity_id: string; metric: string; value: number;
  as_of: string | null; method: string | null;
  citation_quote: string | null; citation_search_term: string | null;
  artifact_accession: string | null; artifact_source_url: string | null;
}

type Issue = {
  ticker: string;
  metric: string;
  level: 'DISPLAY_BUG' | 'NO_CITATION' | 'OVERLAY_FIXES';
  detail: string;
  viewType: 'custom' | 'generic';
};

/**
 * Simulate pickNewest() from d1-overlay.ts
 * Returns which value the frontend would display.
 */
function pickWinner(
  d1Val: number | undefined, d1Date: string | null,
  staticVal: number | undefined, staticDate: string | null
): { value: number; source: 'D1' | 'static' | 'none' } {
  if (d1Val !== undefined && staticVal === undefined) return { value: d1Val, source: 'D1' };
  if (d1Val === undefined && staticVal !== undefined) return { value: staticVal, source: 'static' };
  if (d1Val === undefined && staticVal === undefined) return { value: 0, source: 'none' };

  // Both exist — compare dates
  if (staticDate && d1Date && staticDate > d1Date) {
    return { value: staticVal!, source: 'static' };
  }
  // D1 wins by default (newer or no dates)
  return { value: d1Val!, source: 'D1' };
}

async function main() {
  const d1 = D1Client.fromEnv();

  const { results: rows } = await d1.query<D1Row>(`
    SELECT d.entity_id, d.metric, d.value, d.as_of, d.method,
           d.citation_quote, d.citation_search_term,
           a.accession AS artifact_accession, a.source_url AS artifact_source_url
    FROM latest_datapoints d
    LEFT JOIN artifacts a ON a.artifact_id = d.artifact_id
    ORDER BY d.entity_id, d.metric
  `);

  const d1Data: Record<string, Record<string, D1Row>> = {};
  for (const r of rows) {
    if (!d1Data[r.entity_id]) d1Data[r.entity_id] = {};
    d1Data[r.entity_id][r.metric] = r;
  }

  const companyMap: Record<string, Company> = {};
  for (const c of allCompanies) companyMap[c.ticker] = c;

  const issues: Issue[] = [];
  const stats = {
    total: 0, pass: 0,
    d1Wins: 0, staticWins: 0,
    displayBugs: 0, noCitation: 0, overlayFixes: 0,
  };

  const tickers = filterTicker
    ? [filterTicker]
    : [...new Set([...Object.keys(d1Data), ...allCompanies.map(c => c.ticker)])].sort();

  for (const ticker of tickers) {
    const company = companyMap[ticker];
    if (!company) continue;
    if (company.pendingMerger) continue;

    const d1Entity = d1Data[ticker];
    if (!d1Entity) continue;

    const isCustom = CUSTOM_VIEW_TICKERS.has(ticker);
    const viewType: 'custom' | 'generic' = isCustom ? 'custom' : 'generic';

    for (const m of METRIC_MAP) {
      const d1Row = d1Entity[m.d1];
      if (!d1Row) continue;

      stats.total++;

      const staticVal = getField(company, m.field) as number | undefined;
      const staticDate = getField(company, m.dateField) as string | undefined || null;
      const staticUrl = getField(company, m.urlField) as string | undefined;
      const staticSearch = getField(company, m.searchField) as string | undefined;

      const winner = pickWinner(d1Row.value, d1Row.as_of, staticVal, staticDate);

      if (winner.source === 'D1') stats.d1Wins++;
      else stats.staticWins++;

      // Check: does the displayed value diverge from D1?
      const denom = Math.max(Math.abs(d1Row.value), Math.abs(winner.value), 1);
      const dev = Math.abs(d1Row.value - winner.value) / denom;

      if (dev > 0.05 && d1Row.value !== 0 && winner.value !== 0) {
        // The overlay would pick a different value than D1
        // This means static wins with a different value — potential display bug
        if (winner.source === 'static') {
          issues.push({
            ticker, metric: m.label, level: 'DISPLAY_BUG', viewType,
            detail: `Static wins (${staticDate} > D1 ${d1Row.as_of}): static=${fmt(winner.value)} vs D1=${fmt(d1Row.value)} (${(dev * 100).toFixed(1)}%)`,
          });
          stats.displayBugs++;
        }
      } else if (staticVal !== undefined && dev > 0.05 && winner.source === 'D1') {
        // D1 overlay fixes a stale static value — good, but note it
        stats.overlayFixes++;
        if (verbose) {
          console.log(`  FIX ${ticker} ${m.label}: D1 overlay corrects static ${fmt(staticVal ?? 0)} → ${fmt(d1Row.value)}`);
        }
      } else {
        stats.pass++;
        if (verbose) console.log(`  PASS ${ticker} ${m.label} (${winner.source})`);
      }

      // Citation completeness: does the winning value have a source?
      if (winner.value !== 0) {
        const hasCitation = winner.source === 'D1'
          ? (d1Row.artifact_accession || d1Row.artifact_source_url)
          : (staticUrl && staticUrl.length > 0);

        if (!hasCitation) {
          issues.push({
            ticker, metric: m.label, level: 'NO_CITATION', viewType,
            detail: `${winner.source} value ${fmt(winner.value)} has no source URL for user verification`,
          });
          stats.noCitation++;
        }
      }
    }
  }

  // Print results
  console.log(`\n${'='.repeat(70)}`);
  console.log('FRONTEND DISPLAY AUDIT (post-provenance-refactor)');
  console.log(`${'='.repeat(70)}`);
  console.log(`  Total metrics checked:   ${stats.total}`);
  console.log(`  Pass:                    ${stats.pass}`);
  console.log(`  D1 overlay wins:         ${stats.d1Wins} (D1 has newer data)`);
  console.log(`  Static wins:             ${stats.staticWins} (companies.ts has newer data)`);
  console.log(`  D1 overlay auto-fixes:   ${stats.overlayFixes} (stale static corrected by D1)`);
  console.log(`  Display bugs:            ${stats.displayBugs} (static wins with wrong value)`);
  console.log(`  Missing citations:       ${stats.noCitation} (no source URL for verification)`);

  const displayBugs = issues.filter(i => i.level === 'DISPLAY_BUG');
  if (displayBugs.length > 0) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`DISPLAY BUGS — static value wins but differs from D1 (${displayBugs.length}):`);
    console.log(`${'─'.repeat(70)}`);
    for (const i of displayBugs) {
      console.log(`  [${i.viewType}] ${i.ticker} ${i.metric}: ${i.detail}`);
    }
  }

  const noCitation = issues.filter(i => i.level === 'NO_CITATION');
  if (noCitation.length > 0) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`MISSING CITATIONS — no source URL for verification (${noCitation.length}):`);
    console.log(`${'─'.repeat(70)}`);
    for (const i of noCitation) {
      console.log(`  [${i.viewType}] ${i.ticker} ${i.metric}: ${i.detail}`);
    }
  }

  if (issues.length === 0) {
    console.log('\n  All displayed values are correct and have verifiable sources!');
  }
}

main().catch(console.error);
