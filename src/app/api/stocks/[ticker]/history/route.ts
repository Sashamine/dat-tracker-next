import { NextRequest, NextResponse } from "next/server";

interface HistoricalPrice {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Range configuration: days to fetch and Yahoo interval
// Yahoo Finance intraday intervals: 1m (7d max), 5m/15m (60d max), 1h (730d max)
// Note: 1d uses 5 days lookback to ensure we get data on weekends/holidays, then filters to last day
const RANGE_CONFIG: Record<string, { days: number; interval: string; intraday: boolean; filterToLastDay?: boolean }> = {
  "1d": { days: 5, interval: "5m", intraday: true, filterToLastDay: true },  // 5-minute candles, filtered to last trading day
  "7d": { days: 10, interval: "1d", intraday: false },  // Daily candles for 7 days (no overnight gaps)
  "1mo": { days: 40, interval: "1d", intraday: false }, // Daily candles for 1 month
  "1y": { days: 365, interval: "1d", intraday: false }, // Daily candles for 1 year
  "all": { days: 3650, interval: "1d", intraday: false }, // Daily candles for all time
};

// Cache for historical data (5 minute TTL)
const cache: Map<string, { data: HistoricalPrice[]; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "1y";
  const config = RANGE_CONFIG[range] || RANGE_CONFIG["1y"];

  // Cache key includes range
  const cacheKey = `${ticker}-${range}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    // Use Yahoo Finance for historical data
    const yahooData = await fetchFromYahoo(ticker, config.days, config.interval, config.intraday, config.filterToLastDay);
    if (yahooData.length > 0) {
      cache.set(cacheKey, { data: yahooData, timestamp: Date.now() });
      return NextResponse.json(yahooData);
    }

    // Return empty array if no data
    return NextResponse.json([]);
  } catch (error) {
    console.error("Error fetching stock history:", error);
    return NextResponse.json([]);
  }
}

async function fetchFromFMP(ticker: string, apiKey: string, days: number): Promise<HistoricalPrice[]> {
  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-price-full/${ticker}?apikey=${apiKey}`,
      { next: { revalidate: 300 } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    if (!data.historical) return [];

    // Take requested days and reverse for chronological order
    return data.historical
      .slice(0, days)
      .reverse()
      .map((d: { date: string; open: number; high: number; low: number; close: number; volume: number }) => ({
        time: d.date,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
      }));
  } catch {
    return [];
  }
}

async function fetchFromYahoo(ticker: string, days: number, interval: string, intraday: boolean, filterToLastDay: boolean = false): Promise<HistoricalPrice[]> {
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

    // For "1d" view, filter to only the most recent trading day
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
