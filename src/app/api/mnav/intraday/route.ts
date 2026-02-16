/**
 * Intraday mNAV API
 * 
 * GET /api/mnav/intraday?range=1d|7d|1mo
 * 
 * Returns granular mNAV data using stored 15-min stock prices.
 */

import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { allCompanies } from "@/lib/data/companies";
import { HOLDINGS_HISTORY } from "@/lib/data/holdings-history";

const STOCK_PRICES_DIR = path.join(process.cwd(), "data", "stock-prices");

// CoinGecko for historical crypto prices
const COINGECKO_API = "https://api.coingecko.com/api/v3";

interface PriceRecord {
  date: string;
  time?: string;
  close: number;
}

interface TickerPriceFile {
  ticker: string;
  currency: string;
  prices: PriceRecord[];
}

interface MNAVDataPoint {
  timestamp: string; // ISO string
  median: number;
  average: number;
  count: number;
}

// Forex rates (static fallback)
const FOREX_RATES: Record<string, number> = {
  JPY: 150,
  HKD: 7.8,
  CAD: 1.35,
  AUD: 1.55,
  EUR: 0.92,
  SEK: 10.5,
  GBP: 0.79,
};

function getCurrencyMultiplier(ticker: string): number {
  if (ticker.endsWith(".T")) return 1 / FOREX_RATES.JPY;
  if (ticker.endsWith(".HK")) return 1 / FOREX_RATES.HKD;
  if (ticker.endsWith(".V")) return 1 / FOREX_RATES.CAD;
  if (ticker.endsWith(".AX")) return 1 / FOREX_RATES.AUD;
  if (ticker.endsWith(".DU") || ticker.endsWith(".DE")) return 1 / FOREX_RATES.EUR;
  if (ticker.endsWith(".ST")) return 1 / FOREX_RATES.SEK;
  // UK companies (AQSE) - no suffix convention, match by ticker
  // Note: SWC fallback price is pre-converted to USD, but stock-prices JSON (when added) will be in GBP
  if (ticker === "SWC") return 1 / FOREX_RATES.GBP;
  return 1;  // USD
}

function loadStockPrices(ticker: string): PriceRecord[] {
  const filePath = path.join(STOCK_PRICES_DIR, `${ticker.replace(/\./g, "_")}.json`);
  if (!fs.existsSync(filePath)) return [];
  
  try {
    const data: TickerPriceFile = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return data.prices || [];
  } catch {
    return [];
  }
}

function getHoldingsAtDate(ticker: string, date: string): { holdings: number; shares: number } | null {
  const history = HOLDINGS_HISTORY[ticker]?.history;
  if (!history || history.length === 0) return null;

  let result = null;
  for (const snapshot of history) {
    if (snapshot.date <= date) {
      result = { holdings: snapshot.holdings, shares: snapshot.sharesOutstanding };
    } else {
      break;
    }
  }
  return result;
}

async function fetchBTCPrices(fromTimestamp: number, toTimestamp: number): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  
  try {
    const response = await fetch(
      `${COINGECKO_API}/coins/bitcoin/market_chart/range?vs_currency=usd&from=${fromTimestamp}&to=${toTimestamp}`,
      { next: { revalidate: 300 } } // Cache 5 min
    );
    
    if (!response.ok) return prices;
    
    const data = await response.json();
    for (const [ts, price] of data.prices || []) {
      // Round to nearest hour for matching
      const hourTs = Math.floor(ts / 3600000) * 3600000;
      const key = new Date(hourTs).toISOString();
      prices.set(key, price);
    }
  } catch (error) {
    console.error("CoinGecko error:", error);
  }
  
  return prices;
}

export async function GET(request: NextRequest) {
  const range = request.nextUrl.searchParams.get("range") || "1d";
  
  const rangeMs: Record<string, number> = {
    "1d": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "1mo": 30 * 24 * 60 * 60 * 1000,
  };
  
  const cutoffMs = rangeMs[range] || rangeMs["1d"];
  const now = Date.now();
  const cutoffDate = new Date(now - cutoffMs);
  
  // Get BTC treasury companies only for now
  const btcCompanies = allCompanies.filter(
    c => c.asset === "BTC" && !c.isMiner && HOLDINGS_HISTORY[c.ticker]
  );
  
  // Fetch BTC prices for the range
  const btcPrices = await fetchBTCPrices(
    Math.floor(cutoffDate.getTime() / 1000),
    Math.floor(now / 1000)
  );
  
  if (btcPrices.size === 0) {
    return NextResponse.json({ error: "Could not fetch BTC prices" }, { status: 500 });
  }
  
  // Collect all timestamps from stock prices
  const timestampMnavs: Map<string, number[]> = new Map();
  
  for (const company of btcCompanies) {
    const stockPrices = loadStockPrices(company.ticker);
    
    for (const sp of stockPrices) {
      // Build timestamp
      const timestamp = sp.time 
        ? `${sp.date}T${sp.time}:00.000Z`
        : `${sp.date}T16:00:00.000Z`; // Default to market close
      
      const tsDate = new Date(timestamp);
      if (tsDate < cutoffDate) continue;
      
      // Get holdings at this date
      const holdings = getHoldingsAtDate(company.ticker, sp.date);
      if (!holdings || holdings.holdings === 0) continue;
      
      // Find closest BTC price (round to hour)
      const hourKey = new Date(Math.floor(tsDate.getTime() / 3600000) * 3600000).toISOString();
      let btcPrice = btcPrices.get(hourKey);
      
      // If no exact match, find closest
      if (!btcPrice) {
        const hourTs = Math.floor(tsDate.getTime() / 3600000) * 3600000;
        for (let offset = 0; offset <= 12; offset++) {
          const tryKey = new Date(hourTs + offset * 3600000).toISOString();
          if (btcPrices.has(tryKey)) {
            btcPrice = btcPrices.get(tryKey);
            break;
          }
          const tryKey2 = new Date(hourTs - offset * 3600000).toISOString();
          if (btcPrices.has(tryKey2)) {
            btcPrice = btcPrices.get(tryKey2);
            break;
          }
        }
      }
      
      if (!btcPrice) continue;
      
      // Calculate mNAV
      const currencyMult = getCurrencyMultiplier(company.ticker);
      const stockPriceUSD = sp.close * currencyMult;
      const marketCap = stockPriceUSD * holdings.shares;
      const cryptoNav = holdings.holdings * btcPrice;
      
      if (cryptoNav === 0) continue;
      
      const mnav = marketCap / cryptoNav;
      
      // Filter outliers
      if (mnav < 0.1 || mnav > 50) continue;
      
      // Group by timestamp (round to 15 min)
      const roundedTs = new Date(Math.floor(tsDate.getTime() / 900000) * 900000).toISOString();
      
      if (!timestampMnavs.has(roundedTs)) {
        timestampMnavs.set(roundedTs, []);
      }
      timestampMnavs.get(roundedTs)!.push(mnav);
    }
  }
  
  // Calculate median/average for each timestamp
  const result: MNAVDataPoint[] = [];
  
  for (const [timestamp, mnavs] of Array.from(timestampMnavs.entries()).sort()) {
    if (mnavs.length === 0) continue;
    
    const sorted = [...mnavs].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    const average = mnavs.reduce((a, b) => a + b, 0) / mnavs.length;
    
    result.push({
      timestamp,
      median,
      average,
      count: mnavs.length,
    });
  }
  
  return NextResponse.json({
    range,
    dataPoints: result.length,
    companies: btcCompanies.length,
    data: result,
  });
}
