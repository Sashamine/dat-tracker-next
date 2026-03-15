/**
 * Verify D1 read layer returns equivalent data to static files.
 *
 * Compares every company across all data dimensions:
 *   - Entity metadata vs companies.ts
 *   - Instruments vs dilutive-instruments.ts
 *   - Purchases vs purchases-history.ts
 *   - Holdings history vs holdings-history.ts
 *   - Assumptions vs assumptions.ts
 *   - Capital events vs mstr-capital-events.ts
 *   - Secondary holdings vs companies.ts secondaryCryptoHoldings
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/migrate-to-d1/verify-d1-reads.ts
 */

import {
  getEntity,
  getEntities,
  getInstruments,
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
} from '../../src/lib/d1-read';

import { allCompanies } from '../../src/lib/data/companies';
import { dilutiveInstruments, getEffectiveShares } from '../../src/lib/data/dilutive-instruments';
import { PURCHASES, getPurchaseStats } from '../../src/lib/data/purchases-history';
import { HOLDINGS_HISTORY, getHoldingsHistory } from '../../src/lib/data/holdings-history';
import { ASSUMPTIONS } from '../../src/lib/data/assumptions';
import { MSTR_CAPITAL_EVENTS } from '../../src/lib/data/mstr-capital-events';

let passed = 0;
let failed = 0;
const errors: string[] = [];

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    const msg = detail ? `FAIL: ${label} — ${detail}` : `FAIL: ${label}`;
    errors.push(msg);
    console.log(`  ✗ ${msg}`);
  }
}

function approxEqual(a: number | undefined | null, b: number | undefined | null, tolerance = 0.01): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (a === 0 && b === 0) return true;
  const diff = Math.abs(a - b);
  const max = Math.max(Math.abs(a), Math.abs(b));
  if (max === 0) return diff === 0;
  return diff / max < tolerance;
}

async function verifyEntities() {
  console.log('\n=== Entities ===');
  const entities = await getEntities();
  check('entities count', entities.length === allCompanies.length,
    `D1: ${entities.length}, static: ${allCompanies.length}`);

  for (const company of allCompanies) {
    const entity = await getEntity(company.ticker);
    check(`${company.ticker} exists`, entity !== null);
    if (!entity) continue;

    check(`${company.ticker} name`, entity.name === company.name,
      `D1: "${entity.name}", static: "${company.name}"`);
    check(`${company.ticker} asset`, entity.asset === company.asset,
      `D1: "${entity.asset}", static: "${company.asset}"`);
    check(`${company.ticker} tier`, entity.tier === (company.tier || 2),
      `D1: ${entity.tier}, static: ${company.tier || 2}`);
  }
}

async function verifyInstruments() {
  console.log('\n=== Instruments ===');
  const processedTickers = new Set<string>();

  // Build entity_id resolution map (handles aliases like BTCT → BTCT.V)
  const entityIdSet = new Set(allCompanies.map(c => c.ticker));
  function resolveEntityId(key: string): string {
    if (entityIdSet.has(key)) return key;
    for (const suffix of ['.V', '.T', '.HK', '.ST', '.AX']) {
      if (entityIdSet.has(key + suffix)) return key + suffix;
    }
    return key;
  }

  for (const [key, instruments] of Object.entries(dilutiveInstruments)) {
    const entityId = resolveEntityId(key);
    if (processedTickers.has(entityId)) continue;
    processedTickers.add(entityId);

    const d1Instruments = await getAllInstruments(entityId);
    check(`${entityId} instrument count`, d1Instruments.length === instruments.length,
      `D1: ${d1Instruments.length}, static: ${instruments.length}`);

    // Verify each instrument can be matched by type + strikePrice
    for (const inst of instruments) {
      const match = d1Instruments.find(d =>
        d.type === inst.type &&
        approxEqual(d.strike_price, inst.strikePrice) &&
        approxEqual(d.potential_shares, inst.potentialShares)
      );
      check(`${entityId} ${inst.type}@$${inst.strikePrice}`, match !== undefined);
    }
  }
}

async function verifyPurchases() {
  console.log('\n=== Purchases ===');

  for (const [ticker, company] of Object.entries(PURCHASES)) {
    const d1Purchases = await getPurchasesFromD1(ticker);
    check(`${ticker} purchase count`, d1Purchases.length === company.purchases.length,
      `D1: ${d1Purchases.length}, static: ${company.purchases.length}`);

    const d1Stats = await getPurchaseStatsFromD1(ticker);
    const staticStats = getPurchaseStats(ticker);

    if (d1Stats && staticStats) {
      check(`${ticker} totalQuantity`, approxEqual(d1Stats.totalQuantity, staticStats.totalQuantity),
        `D1: ${d1Stats.totalQuantity}, static: ${staticStats.totalQuantity}`);
      check(`${ticker} totalCost`, approxEqual(d1Stats.totalCost, staticStats.totalCost),
        `D1: ${d1Stats.totalCost}, static: ${staticStats.totalCost}`);
      check(`${ticker} costBasisAvg`, approxEqual(d1Stats.costBasisAvg, staticStats.costBasisAvg),
        `D1: ${d1Stats.costBasisAvg}, static: ${staticStats.costBasisAvg}`);
    }
  }
}

async function verifyHoldingsHistory() {
  console.log('\n=== Holdings History ===');
  const seenTickers = new Set<string>();

  for (const [key, entry] of Object.entries(HOLDINGS_HISTORY)) {
    if (seenTickers.has(entry.ticker)) continue;
    seenTickers.add(entry.ticker);

    const history = entry.history;
    if (history.length === 0) continue;

    // Check latest holdings value
    const latest = history[history.length - 1];
    const d1Holdings = await getHoldingsAtDateFromD1(entry.ticker, latest.date);
    check(`${entry.ticker} latest holdings (${latest.date})`,
      approxEqual(d1Holdings, latest.holdings),
      `D1: ${d1Holdings}, static: ${latest.holdings}`);

    // Check latest shares value
    if (latest.sharesOutstanding) {
      const d1Shares = await getSharesAtDateFromD1(entry.ticker, latest.date);
      check(`${entry.ticker} latest shares (${latest.date})`,
        approxEqual(d1Shares, latest.sharesOutstanding),
        `D1: ${d1Shares}, static: ${latest.sharesOutstanding}`);
    }

    // Check an early datapoint if history has multiple entries
    if (history.length > 2) {
      const early = history[0];
      const d1EarlyHoldings = await getHoldingsAtDateFromD1(entry.ticker, early.date);
      check(`${entry.ticker} early holdings (${early.date})`,
        approxEqual(d1EarlyHoldings, early.holdings),
        `D1: ${d1EarlyHoldings}, static: ${early.holdings}`);
    }
  }

  // Special check: MSTR uses verified financials
  const mstrHistory = getHoldingsHistory('MSTR');
  if (mstrHistory && mstrHistory.history.length > 0) {
    const latest = mstrHistory.history[mstrHistory.history.length - 1];
    const d1Holdings = await getHoldingsAtDateFromD1('MSTR', latest.date);
    check('MSTR latest holdings (verified financials)',
      approxEqual(d1Holdings, latest.holdings),
      `D1: ${d1Holdings}, static: ${latest.holdings}`);
  }
}

async function verifyAssumptions() {
  console.log('\n=== Assumptions ===');
  const d1Assumptions = await getAssumptions();
  check('assumptions count', d1Assumptions.length === ASSUMPTIONS.length,
    `D1: ${d1Assumptions.length}, static: ${ASSUMPTIONS.length}`);

  for (const a of ASSUMPTIONS) {
    const match = d1Assumptions.find(d =>
      d.entity_id === a.ticker && d.field === a.field && d.assumption === a.assumption
    );
    check(`${a.ticker}.${a.field}`, match !== undefined);
    if (match) {
      check(`${a.ticker}.${a.field} sensitivity`, match.sensitivity === a.sensitivity);
      check(`${a.ticker}.${a.field} status`, match.status === a.status);
    }
  }
}

async function verifyCapitalEvents() {
  console.log('\n=== Capital Events ===');
  const d1Events = await getCapitalEvents('MSTR');
  check('MSTR events count', d1Events.length === MSTR_CAPITAL_EVENTS.length,
    `D1: ${d1Events.length}, static: ${MSTR_CAPITAL_EVENTS.length}`);

  // Verify a few key events
  for (const event of MSTR_CAPITAL_EVENTS.slice(0, 5)) {
    const match = d1Events.find(d =>
      d.date === event.date && d.type === event.type && d.description === event.description
    );
    check(`MSTR event ${event.date} ${event.type}`, match !== undefined);
    if (match && event.btcAcquired != null) {
      const data = JSON.parse(match.data_json || '{}');
      check(`MSTR event ${event.date} btcAcquired`,
        data.btcAcquired === event.btcAcquired,
        `D1: ${data.btcAcquired}, static: ${event.btcAcquired}`);
    }
  }
}

async function verifySecondaryHoldings() {
  console.log('\n=== Secondary Holdings ===');
  for (const company of allCompanies) {
    if (!company.secondaryCryptoHoldings || company.secondaryCryptoHoldings.length === 0) continue;

    const d1Holdings = await getSecondaryHoldings(company.ticker);
    check(`${company.ticker} secondary count`,
      d1Holdings.length === company.secondaryCryptoHoldings.length,
      `D1: ${d1Holdings.length}, static: ${company.secondaryCryptoHoldings.length}`);

    for (const h of company.secondaryCryptoHoldings) {
      const match = d1Holdings.find(d => d.asset === h.asset && approxEqual(d.amount, h.amount));
      check(`${company.ticker} ${h.asset} ${h.amount}`, match !== undefined);
    }
  }
}

async function verifyEffectiveShares() {
  console.log('\n=== Effective Shares ===');
  // Test a few key companies at a reference stock price
  const testCases = [
    { ticker: 'MSTR', basicShares: 331_700_000, stockPrice: 160 },
    { ticker: 'BMNR', basicShares: 50_000_000, stockPrice: 10 },
    { ticker: 'BTCS', basicShares: 47_000_000, stockPrice: 5 },
  ];

  for (const { ticker, basicShares, stockPrice } of testCases) {
    const staticResult = getEffectiveShares(ticker, basicShares, stockPrice);
    const d1Result = await getEffectiveSharesFromD1(ticker, basicShares, stockPrice);

    check(`${ticker} diluted shares`, approxEqual(d1Result.diluted, staticResult.diluted),
      `D1: ${d1Result.diluted}, static: ${staticResult.diluted}`);
    check(`${ticker} ITM debt`, approxEqual(d1Result.inTheMoneyDebtValue, staticResult.inTheMoneyDebtValue),
      `D1: ${d1Result.inTheMoneyDebtValue}, static: ${staticResult.inTheMoneyDebtValue}`);
    check(`${ticker} ITM warrant proceeds`, approxEqual(d1Result.inTheMoneyWarrantProceeds, staticResult.inTheMoneyWarrantProceeds),
      `D1: ${d1Result.inTheMoneyWarrantProceeds}, static: ${staticResult.inTheMoneyWarrantProceeds}`);
  }
}

async function main() {
  console.log('=== D1 Read Layer Verification ===');
  console.log(`Comparing D1 data against ${allCompanies.length} static companies\n`);

  await verifyEntities();
  await verifyInstruments();
  await verifyPurchases();
  await verifyHoldingsHistory();
  await verifyAssumptions();
  await verifyCapitalEvents();
  await verifySecondaryHoldings();
  await verifyEffectiveShares();

  console.log('\n' + '='.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  if (failed > 0) {
    console.log('\nFailures:');
    for (const err of errors) {
      console.log(`  ${err}`);
    }
    process.exit(1);
  } else {
    console.log('\n✓ All D1 reads match static data!');
  }
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
