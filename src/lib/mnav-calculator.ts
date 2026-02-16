/**
 * Historical mNAV Calculator
 * 
 * Calculates mNAV for any ticker at any date using:
 * - Holdings history (stepped between filings)
 * - Daily stock prices
 * - Historical crypto prices
 */

import { HOLDINGS_HISTORY, HoldingsSnapshot } from "./data/holdings-history";
import { allCompanies } from "./data/companies";
import * as fs from "fs";
import * as path from "path";

// Types
export interface DailyPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MNAVDataPoint {
  date: string;
  mnav: number;
  stockPrice: number;
  cryptoPrice: number;
  holdings: number;
  sharesOutstanding: number;
  marketCap: number;
  cryptoNav: number;
}

export interface TickerPriceFile {
  ticker: string;
  exchange: string;
  currency: string;
  lastUpdated: string;
  prices: DailyPrice[];
}

// Cache for loaded price files
const priceCache: Map<string, DailyPrice[]> = new Map();

/**
 * Load stock prices for a ticker
 */
export function loadStockPrices(ticker: string): DailyPrice[] {
  if (priceCache.has(ticker)) {
    return priceCache.get(ticker)!;
  }

  const filePath = path.join(
    process.cwd(),
    "data",
    "stock-prices",
    `${ticker.replace(/\./g, "_")}.json`
  );

  if (!fs.existsSync(filePath)) {
    console.warn(`No price file for ${ticker}`);
    return [];
  }

  try {
    const data: TickerPriceFile = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    priceCache.set(ticker, data.prices);
    return data.prices;
  } catch (error) {
    console.error(`Error loading prices for ${ticker}:`, error);
    return [];
  }
}

/**
 * Get stock price on or before a specific date
 */
export function getStockPriceAtDate(
  ticker: string,
  date: string
): DailyPrice | null {
  const prices = loadStockPrices(ticker);
  if (prices.length === 0) return null;

  // Binary search for the date or closest prior date
  let left = 0;
  let right = prices.length - 1;
  let result: DailyPrice | null = null;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (prices[mid].date <= date) {
      result = prices[mid];
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return result;
}

/**
 * Get holdings snapshot at or before a specific date
 */
export function getHoldingsAtDate(
  ticker: string,
  date: string
): HoldingsSnapshot | null {
  const history = HOLDINGS_HISTORY[ticker]?.history;
  if (!history || history.length === 0) return null;

  // Find most recent snapshot before or on date
  let result: HoldingsSnapshot | null = null;
  for (const snapshot of history) {
    if (snapshot.date <= date) {
      result = snapshot;
    } else {
      break;
    }
  }

  return result;
}

/**
 * Get currency conversion rate for a ticker
 */
function getCurrencyMultiplier(ticker: string, forexRates: Record<string, number>): number {
  if (ticker.endsWith(".T")) return 1 / (forexRates.JPY || 150);
  if (ticker.endsWith(".HK")) return 1 / (forexRates.HKD || 7.8);
  if (ticker.endsWith(".ST")) return 1 / (forexRates.SEK || 10.5);
  if (ticker.endsWith(".AX")) return 1 / (forexRates.AUD || 1.55);
  if (ticker.endsWith(".V")) return 1 / (forexRates.CAD || 1.35);
  if (ticker === "ALCPB" || ticker.endsWith(".PA")) return 1 / (forexRates.EUR || 0.95);
  if (ticker.endsWith(".DU") || ticker.endsWith(".DE")) return 1 / (forexRates.EUR || 0.95);
  return 1; // USD
}

/**
 * Calculate mNAV for a ticker on a specific date
 */
export function calculateMNAVAtDate(
  ticker: string,
  date: string,
  cryptoPrice: number,
  forexRates: Record<string, number> = {}
): MNAVDataPoint | null {
  // Get holdings at date
  const holdings = getHoldingsAtDate(ticker, date);
  if (!holdings) return null;

  // Get stock price at date
  const stockData = getStockPriceAtDate(ticker, date);
  if (!stockData) return null;

  // Get company info
  const company = allCompanies.find((c) => c.ticker === ticker);
  if (!company) return null;

  // Calculate values
  const currencyMultiplier = getCurrencyMultiplier(ticker, forexRates);
  const stockPriceUSD = stockData.close * currencyMultiplier;
  const sharesOutstanding = holdings.sharesOutstandingDiluted;
  const marketCap = stockPriceUSD * sharesOutstanding;
  const cryptoNav = holdings.holdings * cryptoPrice;

  if (cryptoNav === 0) return null;

  const mnav = marketCap / cryptoNav;

  return {
    date: stockData.date, // Use actual stock date (might differ from requested)
    mnav,
    stockPrice: stockData.close,
    cryptoPrice,
    holdings: holdings.holdings,
    sharesOutstanding,
    marketCap,
    cryptoNav,
  };
}

/**
 * Calculate mNAV history for a ticker over a date range
 */
export function calculateMNAVHistory(
  ticker: string,
  fromDate: string,
  toDate: string,
  cryptoPrices: Map<string, number>, // date -> price
  forexRates: Record<string, number> = {}
): MNAVDataPoint[] {
  const stockPrices = loadStockPrices(ticker);
  if (stockPrices.length === 0) return [];

  const results: MNAVDataPoint[] = [];

  for (const stockData of stockPrices) {
    if (stockData.date < fromDate || stockData.date > toDate) continue;

    const cryptoPrice = cryptoPrices.get(stockData.date);
    if (!cryptoPrice) continue;

    const holdings = getHoldingsAtDate(ticker, stockData.date);
    if (!holdings) continue;

    const company = allCompanies.find((c) => c.ticker === ticker);
    if (!company) continue;

    const currencyMultiplier = getCurrencyMultiplier(ticker, forexRates);
    const stockPriceUSD = stockData.close * currencyMultiplier;
    const sharesOutstanding = holdings.sharesOutstandingDiluted;
    const marketCap = stockPriceUSD * sharesOutstanding;
    const cryptoNav = holdings.holdings * cryptoPrice;

    if (cryptoNav === 0) continue;

    results.push({
      date: stockData.date,
      mnav: marketCap / cryptoNav,
      stockPrice: stockData.close,
      cryptoPrice,
      holdings: holdings.holdings,
      sharesOutstanding,
      marketCap,
      cryptoNav,
    });
  }

  return results;
}

/**
 * Get available date range for a ticker
 */
export function getAvailableDateRange(ticker: string): { from: string; to: string } | null {
  const prices = loadStockPrices(ticker);
  const holdings = HOLDINGS_HISTORY[ticker]?.history;

  if (!prices.length || !holdings?.length) return null;

  // Find overlap between stock prices and holdings
  const stockFrom = prices[0].date;
  const stockTo = prices[prices.length - 1].date;
  const holdingsFrom = holdings[0].date;

  const from = stockFrom > holdingsFrom ? stockFrom : holdingsFrom;
  const to = stockTo;

  return { from, to };
}
