import { NextRequest, NextResponse } from "next/server";

interface HistoricalPrice {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Cache for historical data (5 minute TTL)
const cache: Map<string, { data: HistoricalPrice[]; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;

  // Check cache
  const cached = cache.get(ticker);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    // Try FMP first
    const fmpKey = process.env.FMP_API_KEY;
    if (fmpKey) {
      const fmpData = await fetchFromFMP(ticker, fmpKey);
      if (fmpData.length > 0) {
        cache.set(ticker, { data: fmpData, timestamp: Date.now() });
        return NextResponse.json(fmpData);
      }
    }

    // Fallback to Yahoo Finance (via unofficial API)
    const yahooData = await fetchFromYahoo(ticker);
    if (yahooData.length > 0) {
      cache.set(ticker, { data: yahooData, timestamp: Date.now() });
      return NextResponse.json(yahooData);
    }

    // Return empty array if no data
    return NextResponse.json([]);
  } catch (error) {
    console.error("Error fetching stock history:", error);
    return NextResponse.json([]);
  }
}

async function fetchFromFMP(ticker: string, apiKey: string): Promise<HistoricalPrice[]> {
  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-price-full/${ticker}?apikey=${apiKey}`,
      { next: { revalidate: 300 } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    if (!data.historical) return [];

    // Take last 180 days and reverse for chronological order
    return data.historical
      .slice(0, 180)
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

async function fetchFromYahoo(ticker: string): Promise<HistoricalPrice[]> {
  try {
    // Calculate date range (6 months)
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = endDate - 180 * 24 * 60 * 60;

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${startDate}&period2=${endDate}&interval=1d`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
        next: { revalidate: 300 },
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
        prices.push({
          time: date.toISOString().split("T")[0],
          open: quotes.open[i],
          high: quotes.high[i],
          low: quotes.low[i],
          close: quotes.close[i],
          volume: quotes.volume[i] || 0,
        });
      }
    }

    return prices;
  } catch {
    return [];
  }
}
