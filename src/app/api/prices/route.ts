import { NextResponse } from "next/server";
import { getBinancePrices } from "@/lib/binance";
import { getStockSnapshots, STOCK_TICKERS, isMarketOpen, isExtendedHours } from "@/lib/alpaca";
import { MARKET_CAP_OVERRIDES, FALLBACK_STOCKS } from "@/lib/data/market-cap-overrides";
import { FALLBACK_RATES } from "@/lib/utils/currency";
import { getLSTExchangeRates, getSupportedLSTIds } from "@/lib/lst";

// FMP for market caps, OTC stocks, and forex
const FMP_API_KEY = process.env.FMP_API_KEY || "";

// Forex pairs we need (FMP format)
const FOREX_PAIRS = ["USDJPY", "USDHKD", "USDSEK", "USDCAD", "USDEUR"];

// Cache for forex rates (5 minute TTL - forex doesn't move that fast)
let forexCache: { data: Record<string, number>; timestamp: number } | null = null;
const FOREX_CACHE_TTL = 5 * 60 * 1000;

// Stocks not on major exchanges (OTC/international) - use FMP
// Map: FMP ticker -> display ticker (for tickers with different formats)
const FMP_TICKER_MAP: Record<string, string> = {
  "ALTBG.PA": "ALTBG",   // Euronext Paris
  "HOGPF": "H100.ST",    // H100 Group OTC ticker -> display as H100.ST
};
const FMP_ONLY_STOCKS = [
  "MSTR",      // Strategy - use FMP for price since Alpaca not working on Vercel
  // ETHM removed - pending SPAC merger, use FALLBACK_STOCKS instead
  "ALTBG.PA",  // The Blockchain Group (Euronext Paris) - FMP ticker
  "ALTBG",     // The Blockchain Group - display ticker (not valid on Alpaca)
  "LUXFF",     // Luxxfolio (OTC)
  "NA",        // Nano Labs
  "3350.T",    // Metaplanet (Tokyo)
  "HOGPF",     // H100 Group (OTC ticker for Swedish company)
  "H100.ST",   // H100 Group - display ticker (not valid on Alpaca)
  "0434.HK",   // Boyaa Interactive (Hong Kong)
  "XTAIF",     // xTAO Inc (Canadian OTC - TSX Venture)
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

// Fetch forex rates from FMP (cached)
async function fetchForexRates(): Promise<Record<string, number>> {
  if (forexCache && Date.now() - forexCache.timestamp < FOREX_CACHE_TTL) {
    return forexCache.data;
  }

  if (!FMP_API_KEY) {
    console.warn("[Forex] FMP_API_KEY not configured, using fallback rates");
    return FALLBACK_RATES;
  }

  try {
    const pairList = FOREX_PAIRS.join(",");
    const url = `https://financialmodelingprep.com/api/v3/quote/${pairList}?apikey=${FMP_API_KEY}`;
    console.log("[Forex] Fetching rates from FMP...");

    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      console.error(`[Forex] FMP API error: ${response.status}`);
      return forexCache?.data || FALLBACK_RATES;
    }

    const data = await response.json();

    // Convert from FMP format (USDJPY=156) to our format (JPY=156)
    const rates: Record<string, number> = { ...FALLBACK_RATES };

    if (Array.isArray(data)) {
      for (const quote of data) {
        if (quote?.symbol && quote?.price > 0) {
          // Extract currency from pair (USDJPY -> JPY)
          const currency = quote.symbol.replace("USD", "");
          rates[currency] = quote.price;
        }
      }
      console.log("[Forex] Fetched rates:", rates);
    } else {
      console.error("[Forex] FMP returned non-array:", data);
    }

    forexCache = { data: rates, timestamp: Date.now() };
    return rates;
  } catch (error) {
    console.error("[Forex] Error fetching rates:", error);
    return forexCache?.data || FALLBACK_RATES;
  }
}

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
    const [cryptoPrices, stockSnapshots, fmpStocks, marketCaps, forexRates, lstRatesMap] = await Promise.all([
      getBinancePrices(),
      getStockSnapshots(alpacaStockTickers).catch(e => { console.error("Alpaca error:", e.message); return {}; }),
      fetchFMPStocks(FMP_ONLY_STOCKS),
      fetchMarketCaps(),
      fetchForexRates(),
      getLSTExchangeRates(getSupportedLSTIds()).catch(e => {
        console.error("[LST] Error fetching rates:", e.message);
        return new Map();
      }),
    ]);

    // Convert LST rates Map to plain object for JSON serialization
    const lstRates: Record<string, { exchangeRate: number; provider: string; fetchedAt: string }> = {};
    if (lstRatesMap instanceof Map) {
      for (const [id, result] of lstRatesMap) {
        lstRates[id] = {
          exchangeRate: result.exchangeRate,
          provider: result.provider,
          fetchedAt: result.fetchedAt.toISOString(),
        };
      }
    }

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
      forex: forexRates,  // Live forex rates from FMP
      lst: lstRates,      // LST exchange rates (e.g., kHYPE -> HYPE)
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
