import { NextResponse } from "next/server";
import { getBinancePrices } from "@/lib/binance";
import { getStockSnapshots, STOCK_TICKERS, isMarketOpen, isExtendedHours } from "@/lib/alpaca";

// FMP for market caps and OTC stocks
const FMP_API_KEY = process.env.FMP_API_KEY || "";

// Stocks not on major exchanges (OTC/international) - use FMP
// Map: FMP ticker -> display ticker (for tickers with different formats)
const FMP_TICKER_MAP: Record<string, string> = {
  "ALTBG.PA": "ALTBG",   // Euronext Paris
  "HOGPF": "H100.ST",    // H100 Group OTC ticker -> display as H100.ST
};

// Fallback prices for illiquid stocks not covered by data providers
// These are stocks on minor exchanges (OTC, Euronext Growth, etc.)
const FALLBACK_STOCKS: Record<string, { price: number; marketCap: number; note: string }> = {
  "CEPO": { price: 10.50, marketCap: 200000000, note: "BSTR Holdings pre-merger SPAC" },
  "XTAIF": { price: 0.75, marketCap: 20000000, note: "xTAO Inc OTC" },
  "IHLDF": { price: 0.10, marketCap: 10000000, note: "Immutable Holdings OTC" },
  "ALTBG": { price: 0.50, marketCap: 200000000, note: "The Blockchain Group" },
  "H100.ST": { price: 0.10, marketCap: 150000000, note: "H100 Group" },
};

// Market cap overrides for stocks with incorrect FMP data
// These are manually updated based on current shares outstanding × price
// Common issues: FMP returns local currency as USD for non-US stocks
const MARKET_CAP_OVERRIDES: Record<string, number> = {
  "BMNR": 12_800_000_000,  // ~425M shares × $30.12 (Jan 2026)
  "3350.T": 3_500_000_000, // Metaplanet - FMP returns JPY as USD (422B JPY = ~2.8B USD)
  "0434.HK": 315_000_000,  // Boyaa Interactive - FMP returns HKD as USD (2.46B HKD = ~315M USD)
};
const FMP_ONLY_STOCKS = [
  "ALTBG.PA",  // The Blockchain Group (Euronext Paris)
  "LUXFF",     // Luxxfolio (OTC)
  "NA",        // Nano Labs
  "3350.T",    // Metaplanet (Tokyo)
  "HOGPF",     // H100 Group (OTC ticker for Swedish company)
  "0434.HK",   // Boyaa Interactive (Hong Kong)
  ];

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

// Fetch market caps from FMP (cached)
async function fetchMarketCaps(): Promise<Record<string, number>> {
  if (marketCapCache && Date.now() - marketCapCache.timestamp < MARKET_CAP_CACHE_TTL) {
    return marketCapCache.data;
  }

  if (!FMP_API_KEY) {
    console.error("FMP_API_KEY not configured");
    return marketCapCache?.data || {};
  }

  try {
    const tickerList = STOCK_TICKERS.join(",");
    const url = "https://financialmodelingprep.com/stable/batch-quote?symbols=" + tickerList + "&apikey=" + FMP_API_KEY;
    console.log("Fetching market caps from FMP:", STOCK_TICKERS.length, "tickers");
    
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json();

    const result: Record<string, number> = {};
    if (Array.isArray(data)) {
      for (const stock of data) {
        if (stock?.symbol && stock?.marketCap) {
          result[stock.symbol] = stock.marketCap;
        }
      }
      console.log("FMP returned market caps for", Object.keys(result).length, "stocks");
    } else {
      console.error("FMP returned non-array:", data);
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
  if (tickers.length === 0 || !FMP_API_KEY) return {};

  try {
    const tickerList = tickers.join(",");
    const url = "https://financialmodelingprep.com/stable/batch-quote?symbols=" + tickerList + "&apikey=" + FMP_API_KEY;
    const response = await fetch(url, { cache: "no-store" });
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

    // Parallel fetch - CoinGecko now handles all crypto including HYPE
    const [cryptoPrices, stockSnapshots, fmpStocks, marketCaps] = await Promise.all([
      getBinancePrices(),
      getStockSnapshots(alpacaStockTickers).catch(() => ({})),
      fetchFMPStocks(FMP_ONLY_STOCKS),
      fetchMarketCaps(),
    ]);

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
          marketCap: MARKET_CAP_OVERRIDES[ticker] || marketCaps[ticker] || 0,
          isAfterHours: extendedHours && !marketOpen,
          regularPrice: snapshot.prevDailyBar?.c || currentPrice,
        };
      }
    }

    // Merge FMP stocks (with ticker mapping and market cap overrides)
    for (const [ticker, data] of Object.entries(fmpStocks)) {
      const displayTicker = FMP_TICKER_MAP[ticker] || ticker;
      stockPrices[displayTicker] = {
        ...data,
        // Apply market cap override if available (fixes currency conversion issues)
        marketCap: MARKET_CAP_OVERRIDES[displayTicker] || data.marketCap,
      };
    }


    // Add fallback data for illiquid stocks without real-time data
    for (const [ticker, fallback] of Object.entries(FALLBACK_STOCKS)) {
      if (!stockPrices[ticker]) {
        stockPrices[ticker] = {
          price: fallback.price,
          change24h: 0,
          volume: 0,
          marketCap: fallback.marketCap,
          isStatic: true,  // Flag to indicate static/estimated data
        };
      }
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
