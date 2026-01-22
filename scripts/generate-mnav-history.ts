/**
 * Generate Historical mNAV Data
 *
 * Uses hardcoded historical crypto prices (from public sources) and Yahoo Finance for stock prices.
 *
 * Usage: npx tsx scripts/generate-mnav-history.ts
 */

import * as fs from "fs";
import * as path from "path";

// Import holdings history
import { HOLDINGS_HISTORY, HoldingsSnapshot } from "../src/lib/data/holdings-history";

interface CompanyMNAV {
  ticker: string;
  asset: string;
  mnav: number;
  marketCap: number;
  enterpriseValue: number;
  cryptoNav: number;
  holdings: number;
  stockPrice: number;
  cryptoPrice: number;
  sharesOutstanding: number;
  totalDebt: number;
  cash: number;
}

interface HistoricalMNAVSnapshot {
  date: string;
  median: number;
  average: number;
  count: number;
  btcPrice: number;
  ethPrice: number;
  companies: CompanyMNAV[];
}

// Historical crypto prices (from CoinGecko/CoinMarketCap public data)
const HISTORICAL_CRYPTO_PRICES: Record<string, Record<string, number>> = {
  "2023-12-31": {
    BTC: 42265,
    ETH: 2282,
    SOL: 101,
    TAO: 305,
    LTC: 73,
    ZEC: 29,
    LINK: 15,
    SUI: 1.0,
    AVAX: 40,
    DOGE: 0.089,
    HYPE: 0, // Not launched yet
    TRX: 0.104,
    XRP: 0.62,
    BNB: 312,
    HBAR: 0.092,
    ADA: 0.59,
  },
  "2024-03-31": {
    BTC: 71333,
    ETH: 3611,
    SOL: 202,
    TAO: 682,
    LTC: 91,
    ZEC: 25,
    LINK: 18.4,
    SUI: 1.73,
    AVAX: 51,
    DOGE: 0.206,
    HYPE: 0,
    TRX: 0.117,
    XRP: 0.62,
    BNB: 602,
    HBAR: 0.125,
    ADA: 0.64,
  },
  "2024-06-30": {
    BTC: 62678,
    ETH: 3464,
    SOL: 143,
    TAO: 274,
    LTC: 72,
    ZEC: 21,
    LINK: 13.8,
    SUI: 0.87,
    AVAX: 27,
    DOGE: 0.124,
    HYPE: 0,
    TRX: 0.126,
    XRP: 0.47,
    BNB: 581,
    HBAR: 0.079,
    ADA: 0.39,
  },
  "2024-09-30": {
    BTC: 63497,
    ETH: 2659,
    SOL: 158,
    TAO: 529,
    LTC: 66,
    ZEC: 37,
    LINK: 11.5,
    SUI: 1.73,
    AVAX: 27,
    DOGE: 0.114,
    HYPE: 0,
    TRX: 0.151,
    XRP: 0.58,
    BNB: 583,
    HBAR: 0.056,
    ADA: 0.38,
  },
  // November 2024 - MSTR peaked at 3.4x mNAV when BTC hit ATH
  "2024-11-21": {
    BTC: 98000,
    ETH: 3350,
    SOL: 260,
    TAO: 620,
    LTC: 95,
    ZEC: 52,
    LINK: 17.5,
    SUI: 3.5,
    AVAX: 45,
    DOGE: 0.40,
    HYPE: 0,
    TRX: 0.20,
    XRP: 1.15,
    BNB: 650,
    HBAR: 0.15,
    ADA: 0.82,
  },
  "2024-12-31": {
    BTC: 93429,
    ETH: 3334,
    SOL: 189,
    TAO: 451,
    LTC: 103,
    ZEC: 62,
    LINK: 19.7,
    SUI: 4.19,
    AVAX: 39,
    DOGE: 0.316,
    HYPE: 25,
    TRX: 0.257,
    XRP: 2.06,
    BNB: 702,
    HBAR: 0.277,
    ADA: 0.90,
  },
  "2025-03-31": {
    BTC: 82549,
    ETH: 1822,
    SOL: 127,
    TAO: 267,
    LTC: 87,
    ZEC: 40,
    LINK: 13.2,
    SUI: 2.24,
    AVAX: 19,
    DOGE: 0.166,
    HYPE: 12.5,
    TRX: 0.238,
    XRP: 2.09,
    BNB: 616,
    HBAR: 0.170,
    ADA: 0.70,
  },
  "2025-06-30": {
    BTC: 109368,
    ETH: 2517,
    SOL: 173,
    TAO: 410,
    LTC: 98,
    ZEC: 51,
    LINK: 17.8,
    SUI: 3.84,
    AVAX: 29,
    DOGE: 0.223,
    HYPE: 31,
    TRX: 0.279,
    XRP: 2.44,
    BNB: 648,
    HBAR: 0.202,
    ADA: 0.79,
  },
  "2025-09-30": {
    BTC: 64021,
    ETH: 2547,
    SOL: 148,
    TAO: 359,
    LTC: 71,
    ZEC: 45,
    LINK: 12.9,
    SUI: 1.65,
    AVAX: 24,
    DOGE: 0.113,
    HYPE: 21,
    TRX: 0.162,
    XRP: 0.59,
    BNB: 559,
    HBAR: 0.055,
    ADA: 0.36,
  },
  "2025-12-31": {
    BTC: 93000,
    ETH: 3300,
    SOL: 200,
    TAO: 480,
    LTC: 105,
    ZEC: 58,
    LINK: 22,
    SUI: 4.5,
    AVAX: 42,
    DOGE: 0.35,
    HYPE: 28,
    TRX: 0.26,
    XRP: 2.30,
    BNB: 710,
    HBAR: 0.30,
    ADA: 1.0,
  },
};

// Target dates
const TARGET_DATES = Object.keys(HISTORICAL_CRYPTO_PRICES).sort();

// Rate limiting helper
async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Find holdings snapshot nearest to target date (within 45 days before)
function findHoldingsAtDate(
  history: HoldingsSnapshot[],
  targetDate: string
): HoldingsSnapshot | null {
  const target = new Date(targetDate).getTime();
  const maxDiff = 45 * 24 * 60 * 60 * 1000;

  let nearest: HoldingsSnapshot | null = null;
  let minDiff = Infinity;

  for (const snapshot of history) {
    const snapshotDate = new Date(snapshot.date).getTime();
    const diff = Math.abs(snapshotDate - target);

    if (snapshotDate <= target && diff < minDiff && diff <= maxDiff) {
      minDiff = diff;
      nearest = snapshot;
    }
  }

  return nearest;
}

// Fetch historical stock price from Yahoo Finance
async function fetchStockPrice(
  ticker: string,
  date: string
): Promise<number | null> {
  try {
    const targetDate = new Date(date);
    const startDate = new Date(targetDate);
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date(targetDate);
    endDate.setDate(endDate.getDate() + 1);

    const period1 = Math.floor(startDate.getTime() / 1000);
    const period2 = Math.floor(endDate.getTime() / 1000);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${period1}&period2=${period2}&interval=1d`;

    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result?.indicators?.quote?.[0]?.close) return null;

    const closes = result.indicators.quote[0].close;
    const timestamps = result.timestamp;

    const targetTs = targetDate.getTime() / 1000;
    let closestIdx = 0;
    let minDiff = Infinity;

    for (let i = 0; i < timestamps.length; i++) {
      const diff = Math.abs(timestamps[i] - targetTs);
      if (diff < minDiff && closes[i] != null) {
        minDiff = diff;
        closestIdx = i;
      }
    }

    return closes[closestIdx] || null;
  } catch {
    return null;
  }
}

// Fetch balance sheet from FMP
async function fetchBalanceSheet(
  ticker: string,
  date: string
): Promise<{ totalDebt: number; cash: number } | null> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?period=quarter&limit=20&apikey=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const targetDate = new Date(date).getTime();
    let nearest: any = null;
    let minDiff = Infinity;

    for (const bs of data) {
      const bsDate = new Date(bs.date).getTime();
      const diff = targetDate - bsDate;
      if (diff >= 0 && diff < minDiff) {
        minDiff = diff;
        nearest = bs;
      }
    }

    if (!nearest) return null;

    return {
      totalDebt:
        (nearest.shortTermDebt || 0) +
        (nearest.longTermDebt || 0) +
        (nearest.capitalLeaseObligations || 0),
      cash:
        (nearest.cashAndCashEquivalents || 0) +
        (nearest.shortTermInvestments || 0),
    };
  } catch {
    return null;
  }
}

// Calculate median
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Main function
async function generateHistoricalMNAV(): Promise<void> {
  console.log("Generating Historical mNAV Data...\n");

  const results: HistoricalMNAVSnapshot[] = [];

  for (const targetDate of TARGET_DATES) {
    console.log(`\nProcessing ${targetDate}...`);

    const cryptoPrices = HISTORICAL_CRYPTO_PRICES[targetDate];
    if (!cryptoPrices) {
      console.log(`  No crypto prices for ${targetDate}`);
      continue;
    }

    const companies: CompanyMNAV[] = [];

    for (const [ticker, companyData] of Object.entries(HOLDINGS_HISTORY)) {
      const holdings = findHoldingsAtDate(companyData.history, targetDate);
      if (!holdings) continue;

      const cryptoPrice = cryptoPrices[companyData.asset];
      if (!cryptoPrice || cryptoPrice <= 0) continue;

      // Get stock price
      const stockPrice = await fetchStockPrice(ticker, targetDate);
      await delay(100);

      if (!stockPrice || stockPrice <= 0) {
        console.log(`  ${ticker}: No stock price found`);
        continue;
      }

      // Calculate market cap
      const marketCap = stockPrice * holdings.sharesOutstandingDiluted;

      // Get balance sheet
      const balanceSheet = await fetchBalanceSheet(ticker, targetDate);
      await delay(200);

      const totalDebt = balanceSheet?.totalDebt || 0;
      const cash = balanceSheet?.cash || 0;

      // Calculate EV and mNAV
      const enterpriseValue = marketCap + totalDebt - cash;
      const cryptoNav = holdings.holdings * cryptoPrice;

      if (cryptoNav <= 0) continue;

      const mnav = enterpriseValue / cryptoNav;

      // Filter outliers
      if (mnav <= 0 || mnav > 50) {
        console.log(`  ${ticker}: Outlier mNAV ${mnav.toFixed(2)}x`);
        continue;
      }

      companies.push({
        ticker,
        asset: companyData.asset,
        mnav,
        marketCap,
        enterpriseValue,
        cryptoNav,
        holdings: holdings.holdings,
        stockPrice,
        cryptoPrice,
        sharesOutstanding: holdings.sharesOutstandingDiluted,
        totalDebt,
        cash,
      });

      console.log(`  ${ticker}: ${mnav.toFixed(2)}x mNAV`);
    }

    if (companies.length === 0) {
      console.log(`  No valid companies for ${targetDate}`);
      continue;
    }

    // Calculate aggregates
    const mnavValues = companies.map((c) => c.mnav);
    const medianMNAV = median(mnavValues);
    const averageMNAV = mnavValues.reduce((a, b) => a + b, 0) / mnavValues.length;

    results.push({
      date: targetDate,
      median: medianMNAV,
      average: averageMNAV,
      count: companies.length,
      btcPrice: cryptoPrices.BTC,
      ethPrice: cryptoPrices.ETH,
      companies,
    });

    console.log(`  Summary: Median ${medianMNAV.toFixed(2)}x, Average ${averageMNAV.toFixed(2)}x (${companies.length} companies)`);
  }

  // Generate output file
  const outputPath = path.join(__dirname, "../src/lib/data/mnav-history-calculated.ts");

  const output = `// Auto-generated historical mNAV data
// Generated: ${new Date().toISOString()}
// DO NOT EDIT - regenerate with: npx tsx scripts/generate-mnav-history.ts

export interface HistoricalMNAVCompany {
  ticker: string;
  asset: string;
  mnav: number;
  marketCap: number;
  enterpriseValue: number;
  cryptoNav: number;
}

export interface HistoricalMNAVSnapshot {
  date: string;
  median: number;
  average: number;
  count: number;
  btcPrice: number;
  ethPrice: number;
  companies: HistoricalMNAVCompany[];
}

export const MNAV_HISTORY: HistoricalMNAVSnapshot[] = ${JSON.stringify(
    results.map((r) => ({
      ...r,
      companies: r.companies.map((c) => ({
        ticker: c.ticker,
        asset: c.asset,
        mnav: Math.round(c.mnav * 1000) / 1000,
        marketCap: Math.round(c.marketCap),
        enterpriseValue: Math.round(c.enterpriseValue),
        cryptoNav: Math.round(c.cryptoNav),
      })),
    })),
    null,
    2
  )};
`;

  fs.writeFileSync(outputPath, output);
  console.log(`\nOutput written to: ${outputPath}`);
  console.log(`Total snapshots: ${results.length}`);
}

generateHistoricalMNAV().catch(console.error);
