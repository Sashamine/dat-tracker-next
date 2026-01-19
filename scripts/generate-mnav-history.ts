/**
 * Generate Historical mNAV Data
 *
 * This script calculates historical mNAV values using:
 * - Holdings data from holdings-history.ts
 * - Stock prices from Yahoo Finance
 * - Crypto prices from CoinGecko
 * - Balance sheet data from FMP
 *
 * Usage: npx tsx scripts/generate-mnav-history.ts
 */

import * as fs from "fs";
import * as path from "path";

// Import holdings history
import { HOLDINGS_HISTORY } from "../src/lib/data/holdings-history";

// Types
interface HoldingsSnapshot {
  date: string;
  holdings: number;
  sharesOutstanding: number;
  holdingsPerShare: number;
  source?: string;
}

interface BalanceSheetData {
  date: string;
  totalDebt: number;
  cashAndEquivalents: number;
  preferredStock: number;
}

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

// Quarter-end dates to calculate (YYYY-MM-DD)
const TARGET_DATES = [
  "2023-12-31", // Q4 2023
  "2024-03-31", // Q1 2024
  "2024-06-30", // Q2 2024
  "2024-09-30", // Q3 2024
  "2024-12-31", // Q4 2024
  "2025-03-31", // Q1 2025
  "2025-06-30", // Q2 2025
  "2025-09-30", // Q3 2025
  "2025-12-31", // Q4 2025
];

// Crypto symbol to CoinGecko ID mapping
const CRYPTO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  LINK: "chainlink",
  XRP: "ripple",
  LTC: "litecoin",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  ADA: "cardano",
  HBAR: "hedera-hashgraph",
  TAO: "bittensor",
  TRX: "tron",
  BNB: "binancecoin",
  ZEC: "zcash",
  SUI: "sui",
  HYPE: "hyperliquid",
};

// Rate limiting helper
async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Find holdings snapshot nearest to target date (within 45 days)
function findHoldingsAtDate(
  history: HoldingsSnapshot[],
  targetDate: string
): HoldingsSnapshot | null {
  const target = new Date(targetDate).getTime();
  const maxDiff = 45 * 24 * 60 * 60 * 1000; // 45 days

  let nearest: HoldingsSnapshot | null = null;
  let minDiff = Infinity;

  for (const snapshot of history) {
    const snapshotDate = new Date(snapshot.date).getTime();
    const diff = Math.abs(snapshotDate - target);

    // Only consider snapshots before or on target date (not future data)
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
    // Yahoo Finance historical data
    const targetDate = new Date(date);
    const startDate = new Date(targetDate);
    startDate.setDate(startDate.getDate() - 7); // 7 days before
    const endDate = new Date(targetDate);
    endDate.setDate(endDate.getDate() + 1); // Day after

    const period1 = Math.floor(startDate.getTime() / 1000);
    const period2 = Math.floor(endDate.getTime() / 1000);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${period1}&period2=${period2}&interval=1d`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      console.log(`  Yahoo Finance error for ${ticker}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result?.indicators?.quote?.[0]?.close) {
      return null;
    }

    const closes = result.indicators.quote[0].close;
    const timestamps = result.timestamp;

    // Find closest date
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
  } catch (error) {
    console.log(`  Error fetching stock price for ${ticker}:`, error);
    return null;
  }
}

// Fetch historical crypto price from CoinGecko
async function fetchCryptoPrice(
  symbol: string,
  date: string
): Promise<number | null> {
  try {
    const coinId = CRYPTO_IDS[symbol];
    if (!coinId) {
      console.log(`  Unknown crypto symbol: ${symbol}`);
      return null;
    }

    // CoinGecko historical price endpoint
    const dateObj = new Date(date);
    const formattedDate = `${dateObj.getDate()}-${dateObj.getMonth() + 1}-${dateObj.getFullYear()}`;

    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/history?date=${formattedDate}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.log(`  CoinGecko error for ${symbol}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.market_data?.current_price?.usd || null;
  } catch (error) {
    console.log(`  Error fetching crypto price for ${symbol}:`, error);
    return null;
  }
}

// Fetch balance sheet data from FMP
async function fetchBalanceSheet(
  ticker: string,
  date: string
): Promise<BalanceSheetData | null> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const url = `https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?period=quarter&limit=20&apikey=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    // Find the balance sheet closest to but before the target date
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

    if (!nearest) {
      return null;
    }

    return {
      date: nearest.date,
      totalDebt:
        (nearest.shortTermDebt || 0) +
        (nearest.longTermDebt || 0) +
        (nearest.capitalLeaseObligations || 0),
      cashAndEquivalents:
        (nearest.cashAndCashEquivalents || 0) +
        (nearest.shortTermInvestments || 0),
      preferredStock: nearest.preferredStock || 0,
    };
  } catch (error) {
    return null;
  }
}

// Calculate mNAV for a single company at a specific date
async function calculateCompanyMNAV(
  ticker: string,
  asset: string,
  holdings: HoldingsSnapshot,
  targetDate: string,
  cryptoPriceCache: Map<string, number>
): Promise<CompanyMNAV | null> {
  // Get crypto price (use cache if available)
  let cryptoPrice = cryptoPriceCache.get(`${asset}-${targetDate}`);
  if (cryptoPrice === undefined) {
    cryptoPrice = (await fetchCryptoPrice(asset, targetDate)) || 0;
    if (cryptoPrice > 0) {
      cryptoPriceCache.set(`${asset}-${targetDate}`, cryptoPrice);
    }
    await delay(300); // Rate limit CoinGecko
  }

  if (!cryptoPrice || cryptoPrice <= 0) {
    return null;
  }

  // Get stock price
  const stockPrice = await fetchStockPrice(ticker, targetDate);
  await delay(200); // Rate limit Yahoo

  if (!stockPrice || stockPrice <= 0) {
    return null;
  }

  // Calculate market cap
  const marketCap = stockPrice * holdings.sharesOutstanding;

  // Get balance sheet data
  const balanceSheet = await fetchBalanceSheet(ticker, targetDate);
  await delay(300); // Rate limit FMP

  const totalDebt = balanceSheet?.totalDebt || 0;
  const cash = balanceSheet?.cashAndEquivalents || 0;
  const preferredStock = balanceSheet?.preferredStock || 0;

  // Calculate Enterprise Value and Crypto NAV
  const enterpriseValue = marketCap + totalDebt + preferredStock - cash;
  const cryptoNav = holdings.holdings * cryptoPrice;

  if (cryptoNav <= 0) {
    return null;
  }

  const mnav = enterpriseValue / cryptoNav;

  // Filter out extreme outliers
  if (mnav <= 0 || mnav > 50) {
    return null;
  }

  return {
    ticker,
    asset,
    mnav,
    marketCap,
    enterpriseValue,
    cryptoNav,
    holdings: holdings.holdings,
    stockPrice,
    cryptoPrice,
    sharesOutstanding: holdings.sharesOutstanding,
    totalDebt,
    cash,
  };
}

// Calculate median of array
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
  const cryptoPriceCache = new Map<string, number>();

  for (const targetDate of TARGET_DATES) {
    console.log(`\nProcessing ${targetDate}...`);

    const companies: CompanyMNAV[] = [];

    // Process each company
    for (const [ticker, companyData] of Object.entries(HOLDINGS_HISTORY)) {
      const holdings = findHoldingsAtDate(companyData.history, targetDate);

      if (!holdings) {
        continue;
      }

      console.log(`  ${ticker}: Found holdings from ${holdings.date}`);

      const result = await calculateCompanyMNAV(
        ticker,
        companyData.asset,
        holdings,
        targetDate,
        cryptoPriceCache
      );

      if (result) {
        companies.push(result);
        console.log(`    mNAV: ${result.mnav.toFixed(2)}x`);
      }
    }

    if (companies.length === 0) {
      console.log(`  No valid companies for ${targetDate}`);
      continue;
    }

    // Calculate aggregates
    const mnavValues = companies.map((c) => c.mnav);
    const medianMNAV = median(mnavValues);
    const averageMNAV =
      mnavValues.reduce((a, b) => a + b, 0) / mnavValues.length;

    // Get BTC and ETH prices for reference
    const btcPrice = cryptoPriceCache.get(`BTC-${targetDate}`) || 0;
    const ethPrice = cryptoPriceCache.get(`ETH-${targetDate}`) || 0;

    const snapshot: HistoricalMNAVSnapshot = {
      date: targetDate,
      median: medianMNAV,
      average: averageMNAV,
      count: companies.length,
      btcPrice,
      ethPrice,
      companies,
    };

    results.push(snapshot);

    console.log(`  Summary: Median ${medianMNAV.toFixed(2)}x, Average ${averageMNAV.toFixed(2)}x (${companies.length} companies)`);
  }

  // Generate output file
  const outputPath = path.join(
    __dirname,
    "../src/lib/data/mnav-history-calculated.ts"
  );

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

// Run
generateHistoricalMNAV().catch(console.error);
