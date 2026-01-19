#!/usr/bin/env npx tsx
/**
 * Verification script for market cap calculations.
 * Run with: npx tsx scripts/verify-market-cap.ts
 */

import { getMarketCap, isNonUsdTicker, EXPECTED_MNAV } from "../src/lib/utils/market-cap";
import { allCompanies } from "../src/lib/data/companies";
import { calculateMNAV } from "../src/lib/calculations";

// Simulated API data (as if fetched from /api/prices)
// Market caps are realistic values for mNAV verification
const MOCK_STOCK_DATA: Record<string, { price: number; marketCap: number }> = {
  // US stocks - price in USD, marketCap in USD
  // SBET: 863,424 ETH at $3300 = $2.85B NAV. At mNAV 0.82, market cap should be ~$2.34B
  SBET: { price: 11.90, marketCap: 2_340_000_000 },
  MSTR: { price: 350, marketCap: 85_000_000_000 },

  // Non-USD stocks - price in LOCAL currency, marketCap in USD
  "3350.T": { price: 7500, marketCap: 3_500_000_000 },  // Price JPY, mcap USD
};

// Crypto prices for NAV calculation
const MOCK_CRYPTO_PRICES: Record<string, number> = {
  ETH: 3300,
  BTC: 103000,
};

console.log("=== Market Cap Verification ===\n");

// Test 1: Verify non-USD tickers are identified
console.log("1. Non-USD Ticker Detection:");
const nonUsdTests = ["3350.T", "MSTR", "SBET", "0434.HK"];
for (const ticker of nonUsdTests) {
  const isNonUsd = isNonUsdTicker(ticker);
  console.log(`   ${ticker}: ${isNonUsd ? "NON-USD" : "USD"}`);
}
console.log();

// Test 2: Market cap resolution
console.log("2. Market Cap Resolution:");
for (const company of allCompanies.slice(0, 5)) {
  const stockData = MOCK_STOCK_DATA[company.ticker];
  const result = getMarketCap(company, stockData);
  console.log(`   ${company.ticker}:`);
  console.log(`     Source: ${result.source}`);
  console.log(`     Market Cap: $${(result.marketCap / 1e9).toFixed(2)}B`);
  if (result.warning) {
    console.log(`     Warning: ${result.warning}`);
  }
}
console.log();

// Test 3: mNAV calculation for key companies
console.log("3. mNAV Verification:");
const testCases = [
  { ticker: "SBET", expectedMnav: 0.82 },
  { ticker: "3350.T", expectedMnav: 1.0 },
];

for (const test of testCases) {
  const company = allCompanies.find(c => c.ticker === test.ticker);
  if (!company) {
    console.log(`   ${test.ticker}: Company not found`);
    continue;
  }

  const stockData = MOCK_STOCK_DATA[test.ticker];
  const cryptoPrice = MOCK_CRYPTO_PRICES[company.asset] || 0;

  // Use centralized market cap
  const { marketCap, source } = getMarketCap(company, stockData);

  // Calculate mNAV
  const mnav = calculateMNAV(
    marketCap,
    company.holdings,
    cryptoPrice,
    company.cashReserves || 0,
    company.otherInvestments || 0,
    company.totalDebt || 0,
    company.preferredEquity || 0
  );

  const expected = test.expectedMnav;
  const diff = mnav ? Math.abs(mnav - expected) / expected * 100 : 100;
  const ok = diff < 20; // Allow 20% variance for mock data

  console.log(`   ${test.ticker}:`);
  console.log(`     Holdings: ${company.holdings.toLocaleString()} ${company.asset}`);
  console.log(`     Market Cap: $${(marketCap / 1e9).toFixed(2)}B (from ${source})`);
  console.log(`     Crypto Price: $${cryptoPrice.toLocaleString()}`);
  console.log(`     Calculated mNAV: ${mnav?.toFixed(2) || "N/A"}x`);
  console.log(`     Expected mNAV: ~${expected}x`);
  console.log(`     Status: ${ok ? "OK" : "CHECK REQUIRED"}`);
  console.log();
}

// Test 4: Bug reproduction check
console.log("4. Currency Bug Check (Metaplanet):");
const metaplanet = allCompanies.find(c => c.ticker === "3350.T");
if (metaplanet) {
  const stockData = MOCK_STOCK_DATA["3350.T"];

  // OLD buggy calculation (shares × price in JPY)
  const buggyMarketCap = (metaplanet.sharesOutstandingFD || 0) * (stockData?.price || 0);

  // NEW correct calculation (API market cap in USD)
  const { marketCap: correctMarketCap, source } = getMarketCap(metaplanet, stockData);

  console.log(`   Buggy calculation (shares × JPY price): $${(buggyMarketCap / 1e12).toFixed(2)}T`);
  console.log(`   Correct calculation (API USD): $${(correctMarketCap / 1e9).toFixed(2)}B`);
  console.log(`   Source: ${source}`);
  console.log(`   Bug would cause: ${(buggyMarketCap / correctMarketCap).toFixed(0)}x overstatement`);
}

console.log("\n=== Verification Complete ===");
