import { NextRequest, NextResponse } from "next/server";
import { getCryptoBars, CRYPTO_SYMBOLS, isAlpacaCrypto } from "@/lib/alpaca";

interface CryptoHistoryPoint {
  time: string;
  price: number;
}

// Map our asset symbols to CoinGecko IDs (fallback for altcoins)
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

// Map our asset symbols to Yahoo Finance tickers (fallback)
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
  "all": 1825, // 5 years
};

// Cache for historical data (5 minute TTL)
const cache: Map<string, { data: CryptoHistoryPoint[]; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000;

// Alpaca timeframe mapping
const ALPACA_TIMEFRAMES: Record<string, string> = {
  "1d": "5Min",
  "7d": "15Min",
  "1mo": "1Hour",
  "1y": "1Day",
  "all": "1Day",
};

// Fetch from Alpaca (primary for major cryptos like BTC, ETH, SOL)
async function fetchFromAlpaca(symbol: string, range: string): Promise<CryptoHistoryPoint[]> {
  const alpacaSymbol = CRYPTO_SYMBOLS[symbol.toUpperCase()];
  if (!alpacaSymbol) return [];

  const timeframe = ALPACA_TIMEFRAMES[range] || "1Day";
  const days = RANGE_DAYS[range] || 365;
  const useUnixTime = range === "1d" || range === "7d" || range === "1mo";

  // Calculate start time
  const now = new Date();
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const startISO = start.toISOString();

  try {
    const bars = await getCryptoBars(alpacaSymbol, timeframe, startISO);
    
    if (bars.length === 0) {
      console.log(`[CryptoHistory] Alpaca returned no bars for ${symbol}`);
      return [];
    }

    console.log(`[CryptoHistory] Alpaca returned ${bars.length} bars for ${symbol}`);

    const prices: CryptoHistoryPoint[] = bars.map(bar => {
      if (useUnixTime) {
        // For intraday: use Unix timestamp in seconds
        const ts = Math.floor(new Date(bar.t).getTime() / 1000);
        return { time: String(ts), price: bar.c };
      } else {
        // For daily: use YYYY-MM-DD format
        const date = new Date(bar.t).toISOString().split("T")[0];
        return { time: date, price: bar.c };
      }
    });

    return prices;
  } catch (error) {
    console.error("[CryptoHistory] Alpaca fetch error:", error);
    return [];
  }
}

// Fetch from Yahoo Finance (fallback)
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
  const hasAlpaca = isAlpacaCrypto(symbolUpper);
  
  if (!coinId && !yahooTicker && !hasAlpaca) {
    return NextResponse.json({ error: "Unknown crypto symbol" }, { status: 400 });
  }

  const cacheKey = `${symbol}-${range}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  let prices: CryptoHistoryPoint[] = [];
  const days = RANGE_DAYS[range] || 365;

  // Priority: Alpaca (major cryptos) > CoinGecko (altcoins) > Yahoo (fallback)
  if (hasAlpaca) {
    // Use Alpaca for major cryptos (BTC, ETH, SOL, etc.)
    prices = await fetchFromAlpaca(symbolUpper, range);
    
    if (prices.length === 0) {
      // Fallback to CoinGecko if Alpaca fails
      console.log(`[CryptoHistory] Alpaca failed for ${symbol}, trying CoinGecko`);
      if (coinId) {
        prices = await fetchFromCoinGecko(symbolUpper, Math.min(days, 365));
      }
    }
  } else if (coinId) {
    // Use CoinGecko for altcoins not on Alpaca
    prices = await fetchFromCoinGecko(symbolUpper, Math.min(days, 365));
  }

  // Final fallback to Yahoo
  if (prices.length === 0 && yahooTicker) {
    console.log(`[CryptoHistory] Trying Yahoo fallback for ${symbol}`);
    prices = await fetchFromYahoo(symbolUpper, range);
  }

  if (prices.length > 0) {
    cache.set(cacheKey, { data: prices, timestamp: Date.now() });
  }

  return NextResponse.json(prices);
}
