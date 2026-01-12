import { NextRequest, NextResponse } from "next/server";

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
  "1d": ["5m", "15m", "1h"],
  "7d": ["15m", "1h", "1d"],
  "1mo": ["1h", "1d"],
  "1y": ["1d"],
  "all": ["1d"],
};

// Default intervals per range
const DEFAULT_INTERVAL: Record<string, string> = {
  "1d": "5m",
  "7d": "1h",
  "1mo": "1d",
  "1y": "1d",
  "all": "1d",
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
  // Filter to last day only for "1d" range with intraday intervals
  const filterToLastDay = range === "1d" && intraday;

  // Cache key includes range and interval
  const cacheKey = `${ticker}-${range}-${interval}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    // Use Yahoo Finance for historical data
    const yahooData = await fetchFromYahoo(ticker, days, interval, intraday, filterToLastDay);
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
