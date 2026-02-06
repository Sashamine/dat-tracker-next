/**
 * Comprehensive Daily Stock Price Backfill
 * 
 * Fetches historical daily closing prices for all DAT companies.
 * - US stocks: FMP API
 * - International: Yahoo Finance
 * 
 * Stores prices in data/stock-prices/{ticker}.json
 * 
 * Usage:
 *   npx tsx scripts/backfill-daily-prices.ts           # Backfill all
 *   npx tsx scripts/backfill-daily-prices.ts MSTR      # Single ticker
 *   npx tsx scripts/backfill-daily-prices.ts --update  # Daily update (yesterday only)
 */

import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

// Load env
config({ path: ".env.local" });

const FMP_API_KEY = process.env.FMP_API_KEY?.replace(/"/g, "") || "";
const OUTPUT_DIR = path.join(process.cwd(), "data", "stock-prices");

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Stock exchange classification
const US_STOCKS = [
  "MSTR", "MARA", "RIOT", "CLSK", "KULR", "SMLR", "BTBT", "BTCS",
  "CORZ", "HUT", "BTDR", "WULF", "IREN", "CIFR", "HIVE", "BITF",
  "GREE", "ARBK", "SLNH", "CBIT", "DJT", "XXI", "ABTC", "CEPO",
  "MNMD", "EXOD", "BITO", "BTOG", "NAKA", "ASST", "AVX", "STKE",
  "BNC", "BMNR", "SQNS", "ETHM"
];

const YAHOO_STOCKS: Record<string, string> = {
  // Japan
  "3350.T": "3350.T",
  // Hong Kong  
  "0434.HK": "0434.HK",
  // Sweden
  "H100.ST": "H100-B.ST",
  // Australia
  "DCC.AX": "DCC.AX",
  // Canada
  "BTCT.V": "BTCT.V",
  // France/Euronext
  "ALTBG": "ALTBG.PA",
  // Germany
  "SRAG.DU": "5765.DE",
};

interface PriceRecord {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TickerPrices {
  ticker: string;
  exchange: string;
  currency: string;
  lastUpdated: string;
  prices: PriceRecord[];
}

// Rate limiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch historical prices from FMP
 */
async function fetchFMP(ticker: string, fromDate: string, toDate: string): Promise<PriceRecord[]> {
  if (!FMP_API_KEY) {
    console.log(`  ⚠️ No FMP API key, skipping ${ticker}`);
    return [];
  }

  // Use new /stable/ endpoint (v3 is legacy)
  const url = `https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=${ticker}&from=${fromDate}&to=${toDate}&apikey=${FMP_API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`  ❌ FMP error for ${ticker}: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    // New /stable/ endpoint returns flat array
    const records = Array.isArray(data) ? data : data.historical;
    if (!records || !Array.isArray(records) || records.length === 0) {
      console.log(`  ❌ No historical data for ${ticker}`);
      return [];
    }

    return records.map((d: any) => ({
      date: d.date,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
    })).sort((a: PriceRecord, b: PriceRecord) => a.date.localeCompare(b.date));
  } catch (error) {
    console.log(`  ❌ FMP fetch error for ${ticker}:`, error);
    return [];
  }
}

/**
 * Fetch historical prices from Yahoo Finance
 */
async function fetchYahoo(ticker: string, yahooTicker: string, fromDate: string, toDate: string): Promise<PriceRecord[]> {
  // Convert dates to Unix timestamps
  const from = Math.floor(new Date(fromDate).getTime() / 1000);
  const to = Math.floor(new Date(toDate).getTime() / 1000) + 86400; // Add a day to include toDate

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?period1=${from}&period2=${to}&interval=1d&events=history`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    if (!response.ok) {
      console.log(`  ❌ Yahoo error for ${ticker}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result || !result.timestamp) {
      console.log(`  ❌ No Yahoo data for ${ticker}`);
      return [];
    }

    const timestamps = result.timestamp;
    const quotes = result.indicators?.quote?.[0];
    if (!quotes) {
      console.log(`  ❌ No quote data for ${ticker}`);
      return [];
    }

    const prices: PriceRecord[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (quotes.close[i] !== null) {
        const date = new Date(timestamps[i] * 1000).toISOString().split("T")[0];
        prices.push({
          date,
          open: quotes.open[i] || quotes.close[i],
          high: quotes.high[i] || quotes.close[i],
          low: quotes.low[i] || quotes.close[i],
          close: quotes.close[i],
          volume: quotes.volume[i] || 0,
        });
      }
    }

    return prices.sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.log(`  ❌ Yahoo fetch error for ${ticker}:`, error);
    return [];
  }
}

/**
 * Load existing prices for a ticker
 */
function loadExisting(ticker: string): TickerPrices | null {
  const filePath = path.join(OUTPUT_DIR, `${ticker.replace(/\./g, "_")}.json`);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Save prices for a ticker
 */
function savePrices(data: TickerPrices): void {
  const filePath = path.join(OUTPUT_DIR, `${data.ticker.replace(/\./g, "_")}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Merge new prices with existing, avoiding duplicates
 */
function mergePrices(existing: PriceRecord[], newPrices: PriceRecord[]): PriceRecord[] {
  const dateMap = new Map<string, PriceRecord>();
  
  for (const p of existing) {
    dateMap.set(p.date, p);
  }
  for (const p of newPrices) {
    dateMap.set(p.date, p); // New prices overwrite old
  }
  
  return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get the earliest date we need prices for a ticker
 * Based on holdings history start date
 */
function getStartDate(ticker: string): string {
  // Default start dates based on when companies started holding crypto
  const startDates: Record<string, string> = {
    MSTR: "2020-08-01",
    MARA: "2021-01-01", 
    RIOT: "2021-01-01",
    CLSK: "2021-06-01",
    "3350.T": "2024-04-01",
    KULR: "2024-12-01",
    SMLR: "2024-10-01",
    DJT: "2025-01-01",
    XXI: "2025-01-01",
  };
  
  return startDates[ticker] || "2024-01-01";
}

/**
 * Detect exchange and currency for a ticker
 */
function getTickerInfo(ticker: string): { exchange: string; currency: string } {
  if (ticker.endsWith(".T")) return { exchange: "TSE", currency: "JPY" };
  if (ticker.endsWith(".HK")) return { exchange: "HKEX", currency: "HKD" };
  if (ticker.endsWith(".ST")) return { exchange: "NASDAQ_NORDIC", currency: "SEK" };
  if (ticker.endsWith(".AX")) return { exchange: "ASX", currency: "AUD" };
  if (ticker.endsWith(".V")) return { exchange: "TSXV", currency: "CAD" };
  if (ticker === "ALTBG") return { exchange: "EURONEXT", currency: "EUR" };
  if (ticker.endsWith(".DU") || ticker.endsWith(".DE")) return { exchange: "XETRA", currency: "EUR" };
  return { exchange: "US", currency: "USD" };
}

/**
 * Backfill a single ticker
 */
async function backfillTicker(ticker: string, updateOnly: boolean = false): Promise<void> {
  console.log(`\n📈 ${ticker}`);
  
  const existing = loadExisting(ticker);
  const { exchange, currency } = getTickerInfo(ticker);
  
  // Determine date range
  let fromDate: string;
  const toDate = new Date().toISOString().split("T")[0];
  
  if (updateOnly && existing && existing.prices.length > 0) {
    // Just get last 7 days for updates
    const lastDate = new Date();
    lastDate.setDate(lastDate.getDate() - 7);
    fromDate = lastDate.toISOString().split("T")[0];
  } else if (existing && existing.prices.length > 0) {
    // Continue from last known date
    fromDate = existing.prices[existing.prices.length - 1].date;
  } else {
    // Start from beginning
    fromDate = getStartDate(ticker);
  }
  
  console.log(`  Range: ${fromDate} → ${toDate}`);
  
  // Fetch prices
  let newPrices: PriceRecord[] = [];
  
  // Try FMP first (paid plan with global coverage)
  if (FMP_API_KEY) {
    console.log(`  Source: FMP`);
    await sleep(200); // Rate limit
    newPrices = await fetchFMP(ticker, fromDate, toDate);
  }
  
  // Fallback to Yahoo for any FMP gaps
  if (newPrices.length === 0) {
    const yahooTicker = YAHOO_STOCKS[ticker] || ticker;
    console.log(`  Fallback: Yahoo (${yahooTicker})`);
    await sleep(500);
    newPrices = await fetchYahoo(ticker, yahooTicker, fromDate, toDate);
  }
  
  if (newPrices.length === 0) {
    console.log(`  ⚠️ No new prices fetched`);
    return;
  }
  
  // Merge with existing
  const allPrices = existing 
    ? mergePrices(existing.prices, newPrices)
    : newPrices;
  
  // Save
  const data: TickerPrices = {
    ticker,
    exchange,
    currency,
    lastUpdated: new Date().toISOString(),
    prices: allPrices,
  };
  
  savePrices(data);
  console.log(`  ✅ ${allPrices.length} total prices (${newPrices.length} new)`);
}

/**
 * Get all tickers that need prices
 */
function getAllTickers(): string[] {
  // Combine US and Yahoo stocks
  const all = [...US_STOCKS, ...Object.keys(YAHOO_STOCKS)];
  return [...new Set(all)].sort();
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  const updateOnly = args.includes("--update");
  const singleTicker = args.find(a => !a.startsWith("--"));
  
  console.log("=== Daily Stock Price Backfill ===\n");
  console.log(`FMP API Key: ${FMP_API_KEY ? "✅ Present" : "❌ Missing"}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Mode: ${updateOnly ? "Update (last 7 days)" : "Full backfill"}`);
  
  const tickers = singleTicker ? [singleTicker] : getAllTickers();
  console.log(`\nTickers: ${tickers.length}`);
  
  let success = 0;
  let failed = 0;
  
  for (const ticker of tickers) {
    try {
      await backfillTicker(ticker, updateOnly);
      success++;
    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
      failed++;
    }
  }
  
  console.log(`\n=== Complete ===`);
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);
}

main().catch(console.error);
