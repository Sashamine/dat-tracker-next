import { NextRequest, NextResponse } from "next/server";

interface CryptoHistoryPoint {
  time: string;
  price: number;
}

// Map our asset symbols to CoinGecko IDs
const COINGECKO_IDS: Record<string, string> = {
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

// Map our asset symbols to Yahoo Finance tickers
const YAHOO_TICKERS: Record<string, string> = {
  BTC: "BTC-USD",
  ETH: "ETH-USD",
  SOL: "SOL-USD",
  LINK: "LINK-USD",
  XRP: "XRP-USD",
  LTC: "LTC-USD",
  DOGE: "DOGE-USD",
  AVAX: "AVAX-USD",
  ADA: "ADA-USD",
  HBAR: "HBAR-USD",
  TAO: "TAO-USD",
  TRX: "TRX-USD",
  BNB: "BNB-USD",
  ZEC: "ZEC-USD",
  SUI: "SUI-USD",
  HYPE: "HYPE-USD",
};

// Days to fetch per range
const RANGE_DAYS: Record<string, number> = {
  "1d": 1,
  "7d": 7,
  "1mo": 30,
  "1y": 365,
  "all": 1825, // 5 years - Yahoo supports this
};

// Use Yahoo for all ranges (consistency across timeframes)
const USE_YAHOO_FOR_RANGE: Record<string, boolean> = {
  "1d": true,
  "7d": true,
  "1mo": true,
  "1y": true,
  "all": true,
};

// Cache for historical data (5 minute TTL)
const cache: Map<string, { data: CryptoHistoryPoint[]; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000;

// Fetch from Yahoo Finance
async function fetchFromYahoo(symbol: string, range: string): Promise<CryptoHistoryPoint[]> {
  const yahooTicker = YAHOO_TICKERS[symbol.toUpperCase()];
  if (!yahooTicker) return [];

  // Map our ranges to Yahoo ranges and intervals
  let yahooRange = range;
  let interval = "1d";
  let useUnixTime = false;

  switch (range) {
    case "1d":
      yahooRange = "1d";
      interval = "5m";
      useUnixTime = true;
      break;
    case "7d":
      yahooRange = "7d";
      interval = "15m";
      useUnixTime = true;
      break;
    case "1mo":
      yahooRange = "1mo";
      interval = "1h";
      useUnixTime = true;
      break;
    case "1y":
      yahooRange = "1y";
      interval = "1d";
      break;
    case "all":
      yahooRange = "5y";
      interval = "1d";
      break;
  }
  
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=${interval}&range=${yahooRange}`,
      { cache: "no-store" }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];

    const prices: CryptoHistoryPoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i];
      if (close == null) continue;
      
      if (useUnixTime) {
        // For intraday: use Unix timestamp in seconds
        prices.push({ time: String(timestamps[i]), price: close });
      } else {
        // For daily: use YYYY-MM-DD format
        const date = new Date(timestamps[i] * 1000).toISOString().split("T")[0];
        prices.push({ time: date, price: close });
      }
    }

    return prices;
  } catch (error) {
    console.error("[CryptoHistory] Yahoo fetch error:", error);
    return [];
  }
}

// Fetch from CoinGecko (better for intraday/short-term)
async function fetchFromCoinGecko(symbol: string, days: number): Promise<CryptoHistoryPoint[]> {
  const coinId = COINGECKO_IDS[symbol.toUpperCase()];
  if (!coinId) return [];

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`,
      { cache: "no-store" }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const rawPrices = data.prices || [];

    let prices: CryptoHistoryPoint[];

    if (days <= 1) {
      // For 1d: CoinGecko returns 5-min data
      prices = rawPrices.map(([timestamp, price]: [number, number]) => ({
        time: String(Math.floor(timestamp / 1000)),
        price,
      }));
    } else if (days <= 30) {
      // For 7d/1mo: CoinGecko returns hourly data
      prices = rawPrices.map(([timestamp, price]: [number, number]) => ({
        time: String(Math.floor(timestamp / 1000)),
        price,
      }));
    } else {
      // For longer ranges: daily data (YYYY-MM-DD format)
      prices = rawPrices.map(([timestamp, price]: [number, number]) => ({
        time: new Date(timestamp).toISOString().split("T")[0],
        price,
      }));
      // Deduplicate by date
      const byDate = new Map<string, number>();
      for (const p of prices) {
        byDate.set(p.time, p.price);
      }
      prices = Array.from(byDate.entries())
        .map(([time, price]) => ({ time, price }))
        .sort((a, b) => a.time.localeCompare(b.time));
    }

    return prices;
  } catch (error) {
    console.error("[CryptoHistory] CoinGecko fetch error:", error);
    return [];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "1y";

  const symbolUpper = symbol.toUpperCase();
  const coinId = COINGECKO_IDS[symbolUpper];
  const yahooTicker = YAHOO_TICKERS[symbolUpper];
  
  if (!coinId && !yahooTicker) {
    return NextResponse.json({ error: "Unknown crypto symbol" }, { status: 400 });
  }

  const cacheKey = `${symbol}-${range}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  let prices: CryptoHistoryPoint[] = [];
  const useYahoo = USE_YAHOO_FOR_RANGE[range] ?? false;
  const days = RANGE_DAYS[range] || 365;

  if (useYahoo && yahooTicker) {
    // Use Yahoo for 1y/all ranges (better long-term history)
    prices = await fetchFromYahoo(symbolUpper, range);
    if (prices.length === 0 && coinId) {
      // Fallback to CoinGecko if Yahoo fails
      console.log(`[CryptoHistory] Yahoo failed for ${symbol}, trying CoinGecko`);
      prices = await fetchFromCoinGecko(symbolUpper, Math.min(days, 365));
    }
  } else if (coinId) {
    // Use CoinGecko for short-term ranges (better intraday)
    prices = await fetchFromCoinGecko(symbolUpper, days);
  }

  if (prices.length > 0) {
    cache.set(cacheKey, { data: prices, timestamp: Date.now() });
  }

  return NextResponse.json(prices);
}
