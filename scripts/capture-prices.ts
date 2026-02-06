/**
 * Real-time Price Capture
 * 
 * Captures current stock prices and appends to historical files.
 * Run every 15 minutes during market hours for granular mNAV tracking.
 * 
 * Usage:
 *   npx tsx scripts/capture-prices.ts
 */

import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

config({ path: ".env.local" });

const FMP_API_KEY = process.env.FMP_API_KEY?.replace(/"/g, "").trim() || "";
const OUTPUT_DIR = path.join(process.cwd(), "data", "stock-prices");

// All tickers to capture
const TICKERS = [
  "MSTR", "MARA", "RIOT", "CLSK", "KULR", "SMLR", "BTBT", "BTCS",
  "HUT", "WULF", "IREN", "CIFR", "HIVE", "BITF", "GREE", "ARBK",
  "SLNH", "DJT", "XXI", "ABTC", "CEPO", "EXOD", "BTOG", "NAKA",
  "ASST", "AVX", "STKE", "BNC", "BMNR", "SQNS", "ETHM", "CORZ",
  "BTDR", "MNMD", "BITO",
  // International
  "3350.T", "0434.HK", "DCC.AX", "BTCT.V", "SRAG.DU"
];

interface PriceRecord {
  date: string;
  time: string;  // HH:MM format
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TickerPriceFile {
  ticker: string;
  exchange: string;
  currency: string;
  lastUpdated: string;
  prices: PriceRecord[];
}

/**
 * Fetch current quotes from FMP batch endpoint
 */
async function fetchCurrentPrices(tickers: string[]): Promise<Map<string, any>> {
  const results = new Map();
  
  // FMP batch quote endpoint
  const tickerList = tickers.join(",");
  const url = `https://financialmodelingprep.com/stable/batch-quote?symbols=${tickerList}&apikey=${FMP_API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`FMP error: ${response.status}`);
      return results;
    }
    
    const data = await response.json();
    
    for (const quote of data) {
      if (quote.symbol && quote.price) {
        results.set(quote.symbol, {
          price: quote.price,
          open: quote.open || quote.price,
          high: quote.dayHigh || quote.price,
          low: quote.dayLow || quote.price,
          volume: quote.volume || 0,
          change: quote.change,
          changePercent: quote.changesPercentage,
        });
      }
    }
  } catch (error) {
    console.error("FMP fetch error:", error);
  }
  
  return results;
}

/**
 * Load existing price file for a ticker
 */
function loadPriceFile(ticker: string): TickerPriceFile | null {
  const filePath = path.join(OUTPUT_DIR, `${ticker.replace(/\./g, "_")}.json`);
  if (!fs.existsSync(filePath)) return null;
  
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Save price file
 */
function savePriceFile(data: TickerPriceFile): void {
  const filePath = path.join(OUTPUT_DIR, `${data.ticker.replace(/\./g, "_")}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Get exchange and currency for ticker
 */
function getTickerInfo(ticker: string): { exchange: string; currency: string } {
  if (ticker.endsWith(".T")) return { exchange: "TSE", currency: "JPY" };
  if (ticker.endsWith(".HK")) return { exchange: "HKEX", currency: "HKD" };
  if (ticker.endsWith(".ST")) return { exchange: "NASDAQ_NORDIC", currency: "SEK" };
  if (ticker.endsWith(".AX")) return { exchange: "ASX", currency: "AUD" };
  if (ticker.endsWith(".V")) return { exchange: "TSXV", currency: "CAD" };
  if (ticker.endsWith(".DU") || ticker.endsWith(".DE")) return { exchange: "XETRA", currency: "EUR" };
  return { exchange: "US", currency: "USD" };
}

/**
 * Check if we should capture (avoid duplicate entries for same time slot)
 */
function shouldCapture(existing: TickerPriceFile | null, date: string, time: string): boolean {
  if (!existing || !existing.prices.length) return true;
  
  // Check if we already have an entry for this date/time (within 10 min window)
  const timeMinutes = parseInt(time.split(":")[0]) * 60 + parseInt(time.split(":")[1]);
  
  for (const p of existing.prices) {
    if (p.date === date && p.time) {
      const existingMinutes = parseInt(p.time.split(":")[0]) * 60 + parseInt(p.time.split(":")[1]);
      if (Math.abs(existingMinutes - timeMinutes) < 10) {
        return false; // Already captured within this window
      }
    }
  }
  
  return true;
}

/**
 * Main capture function
 */
async function main() {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toTimeString().slice(0, 5); // HH:MM
  
  console.log(`\n📸 Price Capture - ${date} ${time}`);
  console.log(`Tickers: ${TICKERS.length}`);
  
  if (!FMP_API_KEY) {
    console.error("❌ No FMP API key");
    process.exit(1);
  }
  
  // Fetch all current prices
  const quotes = await fetchCurrentPrices(TICKERS);
  console.log(`Fetched: ${quotes.size} quotes`);
  
  let captured = 0;
  let skipped = 0;
  
  for (const ticker of TICKERS) {
    const quote = quotes.get(ticker);
    if (!quote) {
      console.log(`  ⚠️ ${ticker}: No quote`);
      continue;
    }
    
    const existing = loadPriceFile(ticker);
    
    // Check if we should capture
    if (!shouldCapture(existing, date, time)) {
      skipped++;
      continue;
    }
    
    const { exchange, currency } = getTickerInfo(ticker);
    
    const newPrice: PriceRecord = {
      date,
      time,
      open: quote.open,
      high: quote.high,
      low: quote.low,
      close: quote.price,
      volume: quote.volume,
    };
    
    const priceFile: TickerPriceFile = existing || {
      ticker,
      exchange,
      currency,
      lastUpdated: now.toISOString(),
      prices: [],
    };
    
    priceFile.prices.push(newPrice);
    priceFile.lastUpdated = now.toISOString();
    
    // Sort by date+time
    priceFile.prices.sort((a, b) => {
      const aKey = `${a.date} ${a.time || "16:00"}`;
      const bKey = `${b.date} ${b.time || "16:00"}`;
      return aKey.localeCompare(bKey);
    });
    
    savePriceFile(priceFile);
    captured++;
  }
  
  console.log(`✅ Captured: ${captured}, Skipped (duplicate): ${skipped}`);
}

/**
 * Git commit and push changes
 */
async function gitCommit(): Promise<void> {
  const { execSync } = require("child_process");
  
  try {
    // Check if there are changes
    const status = execSync("git status --porcelain data/stock-prices/", { 
      cwd: process.cwd(),
      encoding: "utf-8" 
    });
    
    if (!status.trim()) {
      console.log("📝 No changes to commit");
      return;
    }
    
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 16).replace("T", " ");
    
    execSync("git add data/stock-prices/", { cwd: process.cwd() });
    execSync(`git commit -m "📈 Price capture ${timestamp}"`, { cwd: process.cwd() });
    execSync("git push", { cwd: process.cwd() });
    
    console.log("✅ Committed and pushed");
  } catch (error) {
    console.error("⚠️ Git error:", error);
  }
}

main()
  .then(() => gitCommit())
  .catch(console.error);
