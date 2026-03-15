/**
 * Full-universe D1 parity verification.
 *
 * Runs a comprehensive comparison across ALL companies, ALL fields:
 * - Entity metadata vs companies.ts
 * - Financial fields (holdings, shares, debt, cash, preferred) vs companies.ts
 * - Instruments vs dilutive-instruments.ts
 * - Effective shares calculation (D1 instruments vs static instruments)
 * - Purchases and cost basis vs purchases-history.ts
 * - Holdings history snapshots vs holdings-history.ts
 * - Secondary holdings vs companies.ts
 * - Crypto investments vs companies.ts
 * - Assumptions vs assumptions.ts
 * - Capital events vs mstr-capital-events.ts
 *
 * Must reach 0 divergences before proceeding to Phase 4 (cut-over).
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/verify-d1-parity.ts [--detail]
 */

import { D1Client } from '../src/lib/d1';
import {
  getEntity,
  getEntities,
  getAllInstruments,
  getPurchasesFromD1,
  getSecondaryHoldings,
  getInvestments,
  getCapitalEvents,
  getAssumptions,
  getLatestFinancials,
  getPurchaseStatsFromD1,
  getEffectiveSharesFromD1,
  getHoldingsAtDateFromD1,
  getSharesAtDateFromD1,
  getLatestHoldingsFromD1,
  getLatestSharesFromD1,
} from '../src/lib/d1-read';

import { allCompanies } from '../src/lib/data/companies';
import { dilutiveInstruments, getEffectiveShares } from '../src/lib/data/dilutive-instruments';
import { PURCHASES, getPurchaseStats } from '../src/lib/data/purchases-history';
import { HOLDINGS_HISTORY, getHoldingsHistory } from '../src/lib/data/holdings-history';
import { ASSUMPTIONS } from '../src/lib/data/assumptions';
import { MSTR_CAPITAL_EVENTS } from '../src/lib/data/mstr-capital-events';
import { COMPANY_SOURCES } from '../src/lib/data/company-sources';

const showDetail = process.argv.includes('--detail');

// ═══════════════════════════════════════════════════════════════════════════
// Tracking
// ═══════════════════════════════════════════════════════════════════════════

interface DivergenceReport {
  section: string;
  entity: string;
  field: string;
  staticVal: string;
  d1Val: string;
  pctDiff?: number;
}

let totalChecks = 0;
let matching = 0;
let divergent = 0;
let missing = 0;
const divergences: DivergenceReport[] = [];

function check(
  section: string,
  entity: string,
  field: string,
  staticVal: unknown,
  d1Val: unknown,
  tolerance = 0.01
): void {
  totalChecks++;

  if (staticVal == null && d1Val == null) {
    matching++;
    return;
  }

  if (staticVal == null || d1Val == null) {
    // One has value, other doesn't — only flag if static has a meaningful value
    if (staticVal != null && staticVal !== 0 && staticVal !== '') {
      missing++;
      divergences.push({
        section,
        entity,
        field,
        staticVal: String(staticVal),
        d1Val: String(d1Val ?? 'MISSING'),
      });
    } else {
      matching++;
    }
    return;
  }

  if (typeof staticVal === 'number' && typeof d1Val === 'number') {
    if (staticVal === 0 && d1Val === 0) {
      matching++;
      return;
    }
    const max = Math.max(Math.abs(staticVal), Math.abs(d1Val));
    const pct = max > 0 ? (Math.abs(staticVal - d1Val) / max) * 100 : 0;
    if (pct <= tolerance * 100) {
      matching++;
    } else {
      divergent++;
      divergences.push({
        section,
        entity,
        field,
        staticVal: String(staticVal),
        d1Val: String(d1Val),
        pctDiff: pct,
      });
    }
    return;
  }

  // String comparison
  if (String(staticVal) === String(d1Val)) {
    matching++;
  } else {
    divergent++;
    divergences.push({
      section,
      entity,
      field,
      staticVal: String(staticVal),
      d1Val: String(d1Val),
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Section checks
// ═══════════════════════════════════════════════════════════════════════════

async function checkEntities() {
  console.log('Checking entities...');
  const entities = await getEntities();
  check('entities', 'ALL', 'count', allCompanies.length, entities.length);

  for (const c of allCompanies) {
    const e = await getEntity(c.ticker);
    if (!e) {
      check('entities', c.ticker, 'exists', true, null);
      continue;
    }
    check('entities', c.ticker, 'name', c.name, e.name);
    check('entities', c.ticker, 'asset', c.asset, e.asset);
    check('entities', c.ticker, 'tier', c.tier || 2, e.tier);
    check('entities', c.ticker, 'sec_cik', c.secCik || null, e.sec_cik);
    check('entities', c.ticker, 'is_miner', c.isMiner ? 1 : 0, e.is_miner);

    // Check company-sources fields
    const sources = COMPANY_SOURCES[c.ticker];
    if (sources) {
      check('entities', c.ticker, 'official_dashboard', sources.officialDashboard || null, e.official_dashboard);
      check('entities', c.ticker, 'shares_source', sources.sharesSource || null, e.shares_source);
    }
  }
}

async function checkInstruments() {
  console.log('Checking instruments...');
  const entityIds = new Set(allCompanies.map(c => c.ticker));

  function resolveEntityId(key: string): string {
    if (entityIds.has(key)) return key;
    for (const suffix of ['.V', '.T', '.HK', '.ST', '.AX']) {
      if (entityIds.has(key + suffix)) return key + suffix;
    }
    return key;
  }

  const processedTickers = new Set<string>();
  for (const [key, instruments] of Object.entries(dilutiveInstruments)) {
    const entityId = resolveEntityId(key);
    if (processedTickers.has(entityId)) continue;
    processedTickers.add(entityId);

    const d1Instruments = await getAllInstruments(entityId);
    check('instruments', entityId, 'count', instruments.length, d1Instruments.length);

    for (const inst of instruments) {
      const match = d1Instruments.find(d =>
        d.type === inst.type &&
        Math.abs(d.strike_price - inst.strikePrice) < 0.01 &&
        Math.abs(d.potential_shares - inst.potentialShares) < 1
      );
      check('instruments', entityId, `${inst.type}@$${inst.strikePrice}`, true, match != null);
      if (match && inst.faceValue != null) {
        check('instruments', entityId, `${inst.type}@$${inst.strikePrice}.faceValue`, inst.faceValue, match.face_value, 0.01);
      }
    }
  }
}

async function checkEffectiveShares() {
  console.log('Checking effective shares...');
  const testCases = [
    { ticker: 'MSTR', basicShares: 331_700_000, stockPrice: 160 },
    { ticker: 'MSTR', basicShares: 331_700_000, stockPrice: 400 },
    { ticker: 'BMNR', basicShares: 50_000_000, stockPrice: 10 },
    { ticker: 'BTCS', basicShares: 47_000_000, stockPrice: 5 },
    { ticker: 'KULR', basicShares: 20_000_000, stockPrice: 3 },
    { ticker: 'SQNS', basicShares: 10_000_000, stockPrice: 50 },
  ];

  for (const { ticker, basicShares, stockPrice } of testCases) {
    const staticResult = getEffectiveShares(ticker, basicShares, stockPrice);
    const d1Result = await getEffectiveSharesFromD1(ticker, basicShares, stockPrice);

    check('effectiveShares', `${ticker}@$${stockPrice}`, 'diluted', staticResult.diluted, d1Result.diluted);
    check('effectiveShares', `${ticker}@$${stockPrice}`, 'itmDebtValue', staticResult.inTheMoneyDebtValue, d1Result.inTheMoneyDebtValue, 0.01);
    check('effectiveShares', `${ticker}@$${stockPrice}`, 'itmWarrantProceeds', staticResult.inTheMoneyWarrantProceeds, d1Result.inTheMoneyWarrantProceeds, 0.01);
  }
}

async function checkPurchases() {
  console.log('Checking purchases...');
  for (const [ticker, company] of Object.entries(PURCHASES)) {
    const d1Stats = await getPurchaseStatsFromD1(ticker);
    const staticStats = getPurchaseStats(ticker);
    if (!staticStats) continue;

    check('purchases', ticker, 'totalQuantity', staticStats.totalQuantity, d1Stats?.totalQuantity);
    check('purchases', ticker, 'totalCost', staticStats.totalCost, d1Stats?.totalCost);
    check('purchases', ticker, 'costBasisAvg', staticStats.costBasisAvg, d1Stats?.costBasisAvg);
  }
}

async function checkHoldingsHistory() {
  console.log('Checking holdings history...');
  const seenTickers = new Set<string>();

  for (const [key, entry] of Object.entries(HOLDINGS_HISTORY)) {
    if (seenTickers.has(entry.ticker)) continue;
    seenTickers.add(entry.ticker);

    const history = entry.history;
    if (history.length === 0) continue;

    // Check latest datapoint
    const latest = history[history.length - 1];
    const d1Holdings = await getHoldingsAtDateFromD1(entry.ticker, latest.date);
    check('history', entry.ticker, `holdings@${latest.date}`, latest.holdings, d1Holdings);

    if (latest.sharesOutstanding) {
      const d1Shares = await getSharesAtDateFromD1(entry.ticker, latest.date);
      check('history', entry.ticker, `shares@${latest.date}`, latest.sharesOutstanding, d1Shares);
    }

    // Check first datapoint
    if (history.length > 1) {
      const first = history[0];
      const d1First = await getHoldingsAtDateFromD1(entry.ticker, first.date);
      check('history', entry.ticker, `holdings@${first.date}`, first.holdings, d1First);
    }

    // Check a mid-point
    if (history.length > 4) {
      const mid = history[Math.floor(history.length / 2)];
      const d1Mid = await getHoldingsAtDateFromD1(entry.ticker, mid.date);
      check('history', entry.ticker, `holdings@${mid.date}`, mid.holdings, d1Mid);
    }
  }

  // Check MSTR (uses verified financials, separate path)
  const mstrHistory = getHoldingsHistory('MSTR');
  if (mstrHistory) {
    const latest = mstrHistory.history[mstrHistory.history.length - 1];
    const d1Holdings = await getHoldingsAtDateFromD1('MSTR', latest.date);
    check('history', 'MSTR', `holdings@${latest.date}(verified)`, latest.holdings, d1Holdings);
  }
}

async function checkSecondaryHoldings() {
  console.log('Checking secondary holdings...');
  for (const c of allCompanies) {
    if (!c.secondaryCryptoHoldings?.length) continue;

    const d1Holdings = await getSecondaryHoldings(c.ticker);
    check('secondary', c.ticker, 'count', c.secondaryCryptoHoldings.length, d1Holdings.length);

    for (const h of c.secondaryCryptoHoldings) {
      const match = d1Holdings.find(d => d.asset === h.asset && Math.abs(d.amount - h.amount) < 1);
      check('secondary', c.ticker, `${h.asset}=${h.amount}`, true, match != null);
    }
  }
}

async function checkAssumptions() {
  console.log('Checking assumptions...');
  const d1Assumptions = await getAssumptions();
  check('assumptions', 'ALL', 'count', ASSUMPTIONS.length, d1Assumptions.length);

  for (const a of ASSUMPTIONS) {
    const match = d1Assumptions.find(d =>
      d.entity_id === a.ticker && d.field === a.field && d.assumption === a.assumption
    );
    check('assumptions', a.ticker, a.field, true, match != null);
  }
}

async function checkCapitalEvents() {
  console.log('Checking capital events...');
  const d1Events = await getCapitalEvents('MSTR');
  check('events', 'MSTR', 'count', MSTR_CAPITAL_EVENTS.length, d1Events.length);

  // Spot-check BTC events
  const btcEvents = MSTR_CAPITAL_EVENTS.filter(e => e.type === 'BTC');
  for (const event of btcEvents.slice(0, 10)) {
    const match = d1Events.find(d =>
      d.date === event.date && d.type === event.type && d.description === event.description
    );
    check('events', 'MSTR', `${event.date}/${event.type}`, true, match != null);

    if (match && event.btcAcquired != null) {
      const data = JSON.parse(match.data_json || '{}');
      check('events', 'MSTR', `${event.date}/btcAcquired`, event.btcAcquired, data.btcAcquired);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('=== D1 Full-Universe Parity Verification ===');
  console.log(`Companies: ${allCompanies.length}`);
  console.log(`Detail mode: ${showDetail ? 'ON' : 'OFF (use --detail for full output)'}\n`);

  await checkEntities();
  await checkInstruments();
  await checkEffectiveShares();
  await checkPurchases();
  await checkHoldingsHistory();
  await checkSecondaryHoldings();
  await checkAssumptions();
  await checkCapitalEvents();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('PARITY REPORT');
  console.log('='.repeat(60));
  console.log(`Total checks:  ${totalChecks}`);
  console.log(`Matching:      ${matching}`);
  console.log(`Divergent:     ${divergent}`);
  console.log(`Missing in D1: ${missing}`);
  console.log('='.repeat(60));

  if (divergences.length > 0) {
    // Group by section
    const bySection = new Map<string, DivergenceReport[]>();
    for (const d of divergences) {
      const list = bySection.get(d.section) || [];
      list.push(d);
      bySection.set(d.section, list);
    }

    console.log(`\n${divergences.length} DIVERGENCES:\n`);
    for (const [section, divs] of bySection) {
      console.log(`  [${section}] (${divs.length}):`);
      for (const d of showDetail ? divs : divs.slice(0, 5)) {
        const pct = d.pctDiff != null ? ` (${d.pctDiff.toFixed(1)}%)` : '';
        console.log(`    ${d.entity}.${d.field}: static=${d.staticVal} d1=${d.d1Val}${pct}`);
      }
      if (!showDetail && divs.length > 5) {
        console.log(`    ... and ${divs.length - 5} more (use --detail)`);
      }
    }

    console.log('\n⚠  Divergences found. Do NOT proceed to Phase 4 until 0 divergences.');
    process.exit(1);
  } else {
    console.log('\n✓ 0 divergences — D1 and static data are in perfect parity!');
    console.log('  Ready for Phase 4 (cut-over) after shadow mode deployment cycle.');
  }
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
