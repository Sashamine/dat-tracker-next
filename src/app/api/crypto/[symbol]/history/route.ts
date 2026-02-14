import { NextRequest, NextResponse } from "next/server";

interface CryptoHistoryPoint {
  time: string;
  price: number;
}

// Binance.us trading pairs (SYMBOL + USDT)
// Most major cryptos are supported; TAO is not available on Binance.us
const BINANCE_SYMBOLS: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
  LINK: "LINKUSDT",
  XRP: "XRPUSDT",
  LTC: "LTCUSDT",
  DOGE: "DOGEUSDT",
  AVAX: "AVAXUSDT",
  ADA: "ADAUSDT",
  HBAR: "HBARUSDT",
  TRX: "TRXUSDT",
  BNB: "BNBUSDT",
  ZEC: "ZECUSDT",
  SUI: "SUIUSDT",
  HYPE: "HYPEUSDT",
};

// Map our asset symbols to CoinGecko IDs (fallback for coins not on Binance.us)
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

// Map our asset symbols to Yahoo Finance tickers (last-resort fallback)
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

// Binance interval mapping per range
const BINANCE_INTERVALS: Record<string, string> = {
  "1d": "5m",
  "7d": "15m",
  "1mo": "1h",
  "1y": "1d",
  "all": "1d",
};

/**
 * Fetch from Binance.us (PRIMARY source)
 * Uses /api/v3/klines endpoint. No API key needed for public market data.
 * Response: array of arrays [openTime, open, high, low, close, volume, closeTime, ...]
 */
async function fetchFromBinance(symbol: string, range: string): Promise<CryptoHistoryPoint[]> {
  const binancePair = BINANCE_SYMBOLS[symbol.toUpperCase()];
  if (!binancePair) return [];

  const interval = BINANCE_INTERVALS[range] || "1d";
  const days = RANGE_DAYS[range] || 365;
  const useUnixTime = range === "1d" || range === "7d" || range === "1mo";

  const now = Date.now();
  const startTime = now - days * 24 * 60 * 60 * 1000;

  try {
    // Binance limit is 1000 candles per request. For longer ranges, paginate.
    const allPrices: CryptoHistoryPoint[] = [];
    let fetchStart = startTime;
    const maxIterations = 10; // Safety limit
    let iterations = 0;

    while (iterations < maxIterations) {
      iterations++;
      const url = `https://api.binance.us/api/v3/klines?symbol=${binancePair}&interval=${interval}&startTime=${fetchStart}&limit=1000`;
      const response = await fetch(url, { cache: "no-store" });

      if (!response.ok) {
        console.error(`[CryptoHistory] Binance returned ${response.status} for ${symbol}`);
        break;
      }

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) break;

      for (const candle of data) {
        const openTimeMs = candle[0] as number;
        const closePrice = parseFloat(candle[4] as string);

        if (useUnixTime) {
          allPrices.push({ time: String(Math.floor(openTimeMs / 1000)), price: closePrice });
        } else {
          const date = new Date(openTimeMs).toISOString().split("T")[0];
          allPrices.push({ time: date, price: closePrice });
        }
      }

      // If we got fewer than 1000, we've reached the end
      if (data.length < 1000) break;

      // Move start to after the last candle
      const lastOpenTime = data[data.length - 1][0] as number;
      fetchStart = lastOpenTime + 1;
    }

    if (allPrices.length > 0) {
      console.log(`[CryptoHistory] Binance returned ${allPrices.length} candles for ${symbol} (${range})`);
    }

    // For daily data, deduplicate by date (in case of overlap)
    if (!useUnixTime) {
      const byDate = new Map<string, number>();
      for (const p of allPrices) {
        byDate.set(p.time, p.price);
      }
      return Array.from(byDate.entries())
        .map(([time, price]) => ({ time, price }))
        .sort((a, b) => a.time.localeCompare(b.time));
    }

    return allPrices;
  } catch (error) {
    console.error("[CryptoHistory] Binance fetch error:", error);
    return [];
  }
}

// Fetch from CoinGecko (fallback for altcoins not on Binance)
async function fetchFromCoinGecko(symbol: string, days: number, range: string): Promise<CryptoHistoryPoint[]> {
  const coinId = COINGECKO_IDS[symbol.toUpperCase()];
  if (!coinId) return [];

  const useUnixTime = range === "1d" || range === "7d" || range === "1mo";

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`,
      { cache: "no-store" }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const rawPrices = data.prices || [];

    let prices: CryptoHistoryPoint[];

    if (useUnixTime) {
      // For intraday ranges: use Unix timestamps
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

// Fetch from Yahoo Finance (last-resort fallback)
async function fetchFromYahoo(symbol: string, range: string): Promise<CryptoHistoryPoint[]> {
  const yahooTicker = YAHOO_TICKERS[symbol.toUpperCase()];
  if (!yahooTicker) return [];

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
        prices.push({ time: String(timestamps[i]), price: close });
      } else {
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "1y";

  const symbolUpper = symbol.toUpperCase();
  const hasBinance = !!BINANCE_SYMBOLS[symbolUpper];
  const coinId = COINGECKO_IDS[symbolUpper];
  const yahooTicker = YAHOO_TICKERS[symbolUpper];
  
  if (!hasBinance && !coinId && !yahooTicker) {
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

  // Priority: Binance (primary) > CoinGecko (altcoin fallback) > Yahoo (last resort)
  if (hasBinance) {
    prices = await fetchFromBinance(symbolUpper, range);
    
    if (prices.length === 0 && coinId) {
      console.log(`[CryptoHistory] Binance failed for ${symbol}, trying CoinGecko`);
      prices = await fetchFromCoinGecko(symbolUpper, Math.min(days, 365), range);
    }
  } else if (coinId) {
    // Use CoinGecko for coins not on Binance (e.g., TAO)
    prices = await fetchFromCoinGecko(symbolUpper, Math.min(days, 365), range);
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
