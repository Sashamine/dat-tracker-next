import { NextRequest, NextResponse } from "next/server";
import { getStaticHistoryForRange } from "@/lib/data/stock-price-history";
import { adjustPricesForSplits, STOCK_SPLITS } from "@/lib/data/stock-splits";

interface HistoricalPrice {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Days to fetch per range (extra buffer for weekends/holidays)
const RANGE_DAYS: Record<string, number> = {
  "1d": 5,      // 5 days lookback to handle weekends
  "7d": 10,     // Extra days for holidays
  "1mo": 40,    // Buffer for month
  "1y": 400,    // Extra for holidays
  "all": 3650,  // ~10 years
};

// Valid intervals per range (based on Yahoo Finance limits)
// 5m/15m: 60 days max, 1h: 730 days max, 1d: unlimited
const VALID_INTERVALS: Record<string, string[]> = {
  "1d": ["5m", "15m", "1h", "1d"],  // Include 1d for international stocks without intraday
  "7d": ["15m", "1h", "1d"],
  "1mo": ["1h", "1d"],
  "1y": ["1d"],
  "all": ["1d"],
};

// Default intervals per range (optimized for maximum granularity)
const DEFAULT_INTERVAL: Record<string, string> = {
  "1d": "5m",   // 5-minute candles (~288 per day) - will fall back to 1d if no intraday
  "7d": "1h",   // Hourly candles (~168 per week)
  "1mo": "1h",  // Hourly candles (~720 per month) - Yahoo supports this
  "1y": "1d",   // Daily candles
  "all": "1d",  // Daily candles
};

// Cache for historical data (5 minute TTL)
const cache: Map<string, { data: HistoricalPrice[]; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// FMP API key
const FMP_API_KEY = process.env.FMP_API_KEY || "";

// Display ticker -> API ticker mapping for non-US exchanges
// The app uses display tickers (ALCPB, H100.ST) but Yahoo/FMP need exchange suffixes
const API_TICKER_MAP: Record<string, string> = {
  "ALCPB": "ALCPB.PA",   // Euronext Paris
};

// Tickers with known Yahoo data issues (incorrect split adjustments)
// These will try FMP first, and filter out corrupt old data
// Date is set to AFTER the most recent split to only show clean post-split data
const YAHOO_PROBLEM_TICKERS: Record<string, string> = {
  'SBET': '2025-06-15',  // Yahoo data inconsistently adjusted - show post-volatility only
  'HSDT': '2025-08-01',  // Split was ~June 2025 - needs split research
  'NXTT': '2025-10-01',  // 200:1 split Sep 2025 - needs split research
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker: displayTicker } = await params;
  const ticker = API_TICKER_MAP[displayTicker.toUpperCase()] || displayTicker;
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "1y";
  const requestedInterval = searchParams.get("interval");

  // Get days for this range
  const days = RANGE_DAYS[range] || RANGE_DAYS["1y"];

  // Validate and select interval
  const validIntervals = VALID_INTERVALS[range] || ["1d"];
  let interval = DEFAULT_INTERVAL[range] || "1d";
  if (requestedInterval && validIntervals.includes(requestedInterval)) {
    interval = requestedInterval;
  }

  // Determine if intraday (affects timestamp format)
  const intraday = interval !== "1d";
  // For "1d" range, show last 24 hours of trading (not just today's market hours)
  // This includes yesterday afternoon + today morning for a true 24H view
  const filterToLast24Hours = range === "1d" && intraday;

  // Cache key includes range and interval
  const cacheKey = `${ticker}-${range}-${interval}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  // Check if this ticker needs split adjustment
  const needsSplitAdjustment = ticker.toUpperCase() in STOCK_SPLITS;
  const minDateStr = YAHOO_PROBLEM_TICKERS[ticker.toUpperCase()];
  const hasYahooProblems = !!minDateStr;

  try {
    // Primary: Use FMP for daily data (more reliable, properly split-adjusted)
    if (!intraday && FMP_API_KEY) {
      let fmpData = await fetchFromFMP(ticker, days);
      if (fmpData.length > 0) {
        // Filter out data before the clean date for problem tickers
        if (hasYahooProblems) {
          fmpData = fmpData.filter(p => p.time >= minDateStr);
        }
        if (fmpData.length > 0) {
          console.log(`[StockHistory] Using FMP for ${ticker}: ${fmpData.length} points`);
          cache.set(cacheKey, { data: fmpData, timestamp: Date.now() });
          return NextResponse.json(fmpData);
        }
      }
    }

    // Fallback: Yahoo Finance for intraday data or when FMP fails
    let yahooData = await fetchFromYahoo(ticker, days, interval, intraday, false);
    if (yahooData.length > 0) {
      // Filter out corrupt old data for problem tickers
      if (hasYahooProblems && !intraday) {
        yahooData = yahooData.filter(p => p.time >= minDateStr);
      }
      // For 24H view, filter to last 24 hours of trading data
      // But keep at least the most recent trading day's data (for markets in different time zones)
      if (filterToLast24Hours && yahooData.length > 0) {
        const now = Date.now();
        const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
        const filtered = yahooData.filter(p => {
          const timestamp = parseInt(p.time, 10) * 1000;
          return timestamp >= twentyFourHoursAgo;
        });
        // Only apply filter if it leaves us with data, otherwise show all recent data
        if (filtered.length > 0) {
          yahooData = filtered;
        }
        // else: keep all data from Yahoo (most recent trading session)
      }
      // Apply split adjustments if needed (Yahoo sometimes doesn't adjust properly)
      if (needsSplitAdjustment) {
        yahooData = adjustPricesForSplits(ticker, yahooData);
      }
      cache.set(cacheKey, { data: yahooData, timestamp: Date.now() });
      return NextResponse.json(yahooData);
    }

    // If intraday failed, fall back to daily data from FMP (for international stocks)
    if (intraday && FMP_API_KEY) {
      console.log(`[StockHistory] No intraday for ${ticker}, trying FMP daily fallback`);
      let fmpData = await fetchFromFMP(ticker, days);
      if (fmpData.length > 0) {
        if (hasYahooProblems) {
          fmpData = fmpData.filter(p => p.time >= minDateStr);
        }
        if (fmpData.length > 0) {
          console.log(`[StockHistory] Using FMP daily fallback for ${ticker}: ${fmpData.length} points`);
          cache.set(cacheKey, { data: fmpData, timestamp: Date.now() });
          return NextResponse.json(fmpData);
        }
      }
    }

    // Fallback to static historical data for illiquid/international stocks
    let staticData = getStaticHistoryForRange(ticker, days, interval);
    if (staticData && staticData.length > 0) {
      console.log(`[StockHistory] Using static data for ${ticker}: ${staticData.length} points`);
      if (needsSplitAdjustment) {
        staticData = adjustPricesForSplits(ticker, staticData);
      }
      cache.set(cacheKey, { data: staticData, timestamp: Date.now() });
      return NextResponse.json(staticData);
    }

    // Return empty array if no data
    return NextResponse.json([]);
  } catch (error) {
    console.error("Error fetching stock history:", error);
    
    // Try static data on error as well
    let staticData = getStaticHistoryForRange(ticker, days, interval);
    if (staticData && staticData.length > 0) {
      console.log(`[StockHistory] Using static fallback for ${ticker} after error`);
      if (needsSplitAdjustment) {
        staticData = adjustPricesForSplits(ticker, staticData);
      }
      return NextResponse.json(staticData);
    }
    
    return NextResponse.json([]);
  }
}

async function fetchFromYahoo(
  ticker: string,
  days: number,
  interval: string,
  intraday: boolean,
  filterToLastDay: boolean = false
): Promise<HistoricalPrice[]> {
  try {
    // Calculate date range
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = endDate - days * 24 * 60 * 60;

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${startDate}&period2=${endDate}&interval=${interval}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};

    const prices: HistoricalPrice[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (quotes.open?.[i] != null && quotes.close?.[i] != null) {
        const date = new Date(timestamps[i] * 1000);
        // For intraday data, use Unix timestamp for proper time handling
        // For daily data, use YYYY-MM-DD format
        const time = intraday
          ? Math.floor(timestamps[i]).toString() // Unix timestamp as string
          : date.toISOString().split("T")[0];    // YYYY-MM-DD
        prices.push({
          time,
          open: quotes.open[i],
          high: quotes.high[i],
          low: quotes.low[i],
          close: quotes.close[i],
          volume: quotes.volume[i] || 0,
        });
      }
    }

    // For "1d" view with intraday intervals, filter to only the most recent trading day
    if (filterToLastDay && prices.length > 0) {
      const lastTimestamp = parseInt(prices[prices.length - 1].time, 10);
      const lastDate = new Date(lastTimestamp * 1000);
      const lastDateStr = lastDate.toISOString().split("T")[0];

      return prices.filter((p) => {
        const pDate = new Date(parseInt(p.time, 10) * 1000);
        return pDate.toISOString().split("T")[0] === lastDateStr;
      });
    }

    return prices;
  } catch {
    return [];
  }
}

/**
 * Fetch historical data from FMP (Financial Modeling Prep)
 * FMP provides properly split-adjusted data
 * Updated to use /stable/ endpoints (Aug 2025+)
 */
async function fetchFromFMP(
  ticker: string,
  days: number
): Promise<HistoricalPrice[]> {
  if (!FMP_API_KEY) return [];
  
  try {
    // FMP stable historical endpoint (new format as of Aug 2025)
    const url = `https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=${ticker}&apikey=${FMP_API_KEY}`;
    
    const response = await fetch(url, {
      headers: { "User-Agent": "DAT-Tracker" },
      cache: "no-store",
    });
    
    if (!response.ok) {
      console.log(`[FMP] Failed for ${ticker}: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    // New format returns array directly, not { historical: [...] }
    const historical = Array.isArray(data) ? data : (data.historical || []);
    
    // FMP returns data in reverse chronological order, limit to requested days
    const prices: HistoricalPrice[] = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    for (const item of historical) {
      const itemDate = new Date(item.date);
      if (itemDate < cutoffDate) break;
      
      prices.push({
        time: item.date, // YYYY-MM-DD format
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume || 0,
      });
    }
    
    // Reverse to chronological order
    return prices.reverse();
  } catch (e) {
    console.error(`[FMP] Error for ${ticker}:`, e);
    return [];
  }
}
