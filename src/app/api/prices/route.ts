import { NextResponse } from "next/server";
import { getBinancePrices } from "@/lib/binance";
import { getStockSnapshots, STOCK_TICKERS, isMarketOpen, isExtendedHours } from "@/lib/alpaca";

// FMP for market caps and OTC stocks
const FMP_API_KEY = process.env.FMP_API_KEY || "";

// Stocks not on major exchanges (OTC/international) - use FMP
const FMP_ONLY_STOCKS = ["ALTBG", "XTAIF", "LUXFF", "NA"];

// Cache for prices (2 second TTL)
let priceCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 2000;

// Cache for market caps (5 minute TTL)
let marketCapCache: { data: Record<string, number>; timestamp: number } | null = null;
const MARKET_CAP_CACHE_TTL = 5 * 60 * 1000;

// Response headers to prevent any caching
const RESPONSE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
};

// Fetch HYPE from CoinGecko (not on Binance)
async function fetchCoinGeckoFallback(): Promise<Record<string, { price: number; change24h: number }>> {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=hyperliquid&vs_currencies=usd&include_24hr_change=true",
      { cache: "no-store" }
    );
    const data = await response.json();

    const result: Record<string, { price: number; change24h: number }> = {};
    if (data.hyperliquid) {
      result["HYPE"] = {
        price: data.hyperliquid.usd || 0,
        change24h: data.hyperliquid.usd_24h_change || 0,
      };
    }
    return result;
  } catch (error) {
    console.error("CoinGecko fallback error:", error);
    return {};
  }
}

// Fetch market caps from FMP (cached)
async function fetchMarketCaps(): Promise<Record<string, number>> {
  if (marketCapCache && Date.now() - marketCapCache.timestamp < MARKET_CAP_CACHE_TTL) {
    return marketCapCache.data;
  }

  try {
    const response = await fetch(
      `https://financialmodelingprep.com/stable/batch-quote?symbols=${STOCK_TICKERS.join(",")}&apikey=${FMP_API_KEY}`,
      { cache: "no-store" }
    );
    const data = await response.json();

    const result: Record<string, number> = {};
    if (Array.isArray(data)) {
      for (const stock of data) {
        if (stock?.symbol && stock?.marketCap) {
          result[stock.symbol] = stock.marketCap;
        }
      }
    }

    marketCapCache = { data: result, timestamp: Date.now() };
    return result;
  } catch (error) {
    console.error("FMP market caps error:", error);
    return marketCapCache?.data || {};
  }
}

// Fetch FMP stocks (for OTC/international)
async function fetchFMPStocks(tickers: string[]): Promise<Record<string, any>> {
  if (tickers.length === 0) return {};

  try {
    const response = await fetch(
      `https://financialmodelingprep.com/stable/batch-quote?symbols=${tickers.join(",")}&apikey=${FMP_API_KEY}`,
      { cache: "no-store" }
    );
    const data = await response.json();

    const result: Record<string, any> = {};
    if (Array.isArray(data)) {
      for (const stock of data) {
        if (stock?.symbol) {
          result[stock.symbol] = {
            price: stock.price || 0,
            change24h: stock.changePercentage || 0,
            volume: stock.volume || 0,
            marketCap: stock.marketCap || 0,
          };
        }
      }
    }
    return result;
  } catch (error) {
    console.error("FMP stocks error:", error);
    return {};
  }
}

export async function GET() {
  // Return cached data if fresh
  if (priceCache && Date.now() - priceCache.timestamp < CACHE_TTL) {
    return NextResponse.json(priceCache.data, { headers: RESPONSE_HEADERS });
  }

  try {
    const marketOpen = isMarketOpen();
    const extendedHours = isExtendedHours();

    const alpacaStockTickers = STOCK_TICKERS.filter(t => !FMP_ONLY_STOCKS.includes(t));

    // Parallel fetch
    const [binanceCrypto, coinGeckoFallback, stockSnapshots, fmpStocks, marketCaps] = await Promise.all([
      getBinancePrices(),
      fetchCoinGeckoFallback(),
      getStockSnapshots(alpacaStockTickers).catch(() => ({})),
      fetchFMPStocks(FMP_ONLY_STOCKS),
      fetchMarketCaps(),
    ]);

    // Merge crypto prices
    const cryptoPrices: Record<string, { price: number; change24h: number }> = {
      ...binanceCrypto,
      ...coinGeckoFallback,
    };

    // Format stock prices
    const stockPrices: Record<string, any> = {};

    for (const ticker of alpacaStockTickers) {
      const snapshot = (stockSnapshots as any)[ticker];
      if (snapshot) {
        const currentPrice = snapshot.latestTrade?.p || snapshot.latestQuote?.ap || 0;
        const prevClose = snapshot.prevDailyBar?.c || currentPrice;
        const change24h = prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0;
        const dailyBar = snapshot.dailyBar || {};

        stockPrices[ticker] = {
          price: currentPrice,
          change24h,
          volume: dailyBar.v || 0,
          marketCap: marketCaps[ticker] || 0,
          isAfterHours: extendedHours && !marketOpen,
          regularPrice: snapshot.prevDailyBar?.c || currentPrice,
        };
      }
    }

    // Merge FMP stocks
    for (const [ticker, data] of Object.entries(fmpStocks)) {
      stockPrices[ticker] = data;
    }

    const result = {
      crypto: cryptoPrices,
      stocks: stockPrices,
      timestamp: new Date().toISOString(),
      marketOpen,
      extendedHours,
    };

    priceCache = { data: result, timestamp: Date.now() };

    return NextResponse.json(result, { headers: RESPONSE_HEADERS });
  } catch (error) {
    console.error("Error fetching prices:", error);
    if (priceCache) {
      return NextResponse.json(priceCache.data, { headers: RESPONSE_HEADERS });
    }
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500, headers: RESPONSE_HEADERS });
  }
}
