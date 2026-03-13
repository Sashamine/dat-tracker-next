#!/usr/bin/env npx tsx
/**
 * generate-browser-checklist.ts
 *
 * Generates a checklist of expected values for Browser Claude to verify
 * against the live site at dat-tracker-next.vercel.app.
 *
 * For each company, computes the expected displayed values using the same
 * functions the site uses, with live prices. Browser Claude visits each
 * company page and confirms the displayed values match.
 *
 * Usage:
 *   npx tsx scripts/generate-browser-checklist.ts              # all companies
 *   npx tsx scripts/generate-browser-checklist.ts --ticker=MSTR # single company
 *   npx tsx scripts/generate-browser-checklist.ts --sample=10   # random sample
 */

import { allCompanies } from '../src/lib/data/companies';
import { getCompanyMNAVDetailed } from '../src/lib/math/mnav-engine';
import { getMarketCapForMnavSync } from '../src/lib/utils/market-cap';
import { getCompanyAhpsMetrics } from '../src/lib/utils/ahps';
import { getHoldingsHistory } from '../src/lib/data/holdings-history';
import type { PricesData } from '../src/lib/types';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
function argVal(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}
const filterTicker = argVal('ticker')?.toUpperCase() ?? null;
const sampleSize = argVal('sample') ? parseInt(argVal('sample')!, 10) : null;

// ---------------------------------------------------------------------------
// Fetch live prices
// ---------------------------------------------------------------------------
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://dat-tracker-next.vercel.app';

async function fetchPrices(): Promise<PricesData> {
  const res = await fetch(`${BASE_URL}/api/prices`);
  if (!res.ok) throw new Error(`Failed to fetch prices: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Format helpers (match how the site displays values)
// ---------------------------------------------------------------------------
function fmtUsd(n: number): string {
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtNum(n: number): string {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  return n.toLocaleString();
}

function fmtMnav(n: number | null): string {
  if (n === null) return 'N/A';
  return `${n.toFixed(2)}x`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('Fetching live prices...');
  const prices = await fetchPrices();
  console.log(`BTC: $${prices.crypto?.BTC?.price?.toLocaleString() || 'N/A'}`);
  console.log(`ETH: $${prices.crypto?.ETH?.price?.toLocaleString() || 'N/A'}`);

  let companies = allCompanies.filter((c) => !c.pendingMerger);

  if (filterTicker) {
    companies = companies.filter((c) => c.ticker === filterTicker);
    if (companies.length === 0) {
      console.error(`Ticker ${filterTicker} not found`);
      process.exit(1);
    }
  }

  if (sampleSize && sampleSize < companies.length) {
    // Random sample for quick spot-checks
    const shuffled = [...companies].sort(() => Math.random() - 0.5);
    companies = shuffled.slice(0, sampleSize);
  }

  console.log(`\nGenerating checklist for ${companies.length} companies...\n`);
  console.log('='.repeat(80));
  console.log('BROWSER CLAUDE VERIFICATION CHECKLIST');
  console.log('='.repeat(80));
  console.log(`\nGenerated: ${new Date().toISOString()}`);
  console.log(`Site: ${BASE_URL}`);
  console.log(`\nInstructions for Browser Claude:`);
  console.log(`1. Visit each URL below`);
  console.log(`2. Find the Key Metrics section`);
  console.log(`3. Compare each expected value against what's displayed`);
  console.log(`4. Flag any value that differs by >5% as a MISMATCH`);
  console.log(`5. Note if any expected metric is missing from the page\n`);

  interface ChecklistItem {
    ticker: string;
    url: string;
    expectedMarketCap: string;
    expectedMnav: string;
    expectedHoldings: string;
    expectedLeverage: string;
    asset: string;
    ahps: string | null;
  }

  const checklist: ChecklistItem[] = [];
  const errors: { ticker: string; error: string }[] = [];

  for (const company of companies) {
    try {
      const stockPrice = prices.stocks?.[company.ticker]?.price;
      if (!stockPrice) {
        errors.push({ ticker: company.ticker, error: 'No stock price available' });
        continue;
      }

      // Market cap — getMarketCapForMnavSync expects StockPriceData, not full PricesData
      const stockData = prices.stocks?.[company.ticker];
      const mcResult = getMarketCapForMnavSync(company, stockData ?? null, prices.forex);
      const marketCap = mcResult?.marketCap ?? 0;

      // mNAV
      const mnavDetailed = getCompanyMNAVDetailed(company, prices);
      const mNav = mnavDetailed?.mnav ?? null;

      // Holdings
      const holdings = company.holdings ?? 0;

      // Leverage
      const totalDebt = company.totalDebt ?? 0;
      const cashReserves = company.cashReserves ?? 0;
      const cryptoNav = mnavDetailed?.cryptoNavUsd ?? 0;
      const netDebt = Math.max(0, totalDebt - cashReserves);
      const leverage = cryptoNav > 0 ? netDebt / cryptoNav : 0;

      // AHPS
      const history = getHoldingsHistory(company.ticker);
      const ahpsResult = history ? getCompanyAhpsMetrics({
        ticker: company.ticker,
        company,
        history,
        currentStockPrice: stockPrice,
      }) : null;
      const ahps = ahpsResult?.currentAhps ?? null;

      checklist.push({
        ticker: company.ticker,
        url: `${BASE_URL}/company/${company.ticker}`,
        expectedMarketCap: fmtUsd(marketCap),
        expectedMnav: fmtMnav(mNav),
        expectedHoldings: `${fmtNum(holdings)} ${company.asset}`,
        expectedLeverage: `${leverage.toFixed(2)}x`,
        asset: company.asset,
        ahps: ahps ? `${ahps.toFixed(6)} ${company.asset}/share` : null,
      });
    } catch (err) {
      errors.push({ ticker: company.ticker, error: String(err) });
    }
  }

  // Output checklist
  for (const item of checklist) {
    console.log(`${'─'.repeat(80)}`);
    console.log(`${item.ticker} — ${item.url}`);
    console.log(`  Market Cap:  ${item.expectedMarketCap}`);
    console.log(`  mNAV:        ${item.expectedMnav}`);
    console.log(`  Holdings:    ${item.expectedHoldings}`);
    console.log(`  Leverage:    ${item.expectedLeverage}`);
    if (item.ahps) {
      console.log(`  AHPS:        ${item.ahps}`);
    }
  }

  if (errors.length > 0) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`SKIPPED (${errors.length}):`);
    for (const e of errors) {
      console.log(`  ${e.ticker}: ${e.error}`);
    }
  }

  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log(`SUMMARY: ${checklist.length} companies to verify, ${errors.length} skipped`);
  console.log(`${'='.repeat(80)}`);

  // Also output as JSON for programmatic use
  const jsonPath = '/tmp/browser-checklist.json';
  const fs = await import('fs');
  fs.writeFileSync(jsonPath, JSON.stringify({ generated: new Date().toISOString(), prices: { btc: prices.crypto?.BTC?.price, eth: prices.crypto?.ETH?.price }, checklist, errors }, null, 2));
  console.log(`\nJSON checklist written to ${jsonPath}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
