import { NextResponse } from "next/server";
import { getBinancePrices } from "@/lib/binance";
import { getStockSnapshots, STOCK_TICKERS, isMarketOpen, isExtendedHours } from "@/lib/alpaca";
import { MARKET_CAP_OVERRIDES, FALLBACK_STOCKS } from "@/lib/data/market-cap-overrides";
import { FALLBACK_RATES } from "@/lib/utils/currency";
import { getLSTExchangeRates, getSupportedLSTIds } from "@/lib/lst";

// FMP for market caps, OTC stocks, and forex
const FMP_API_KEY = process.env.FMP_API_KEY || "";

// Forex pairs we need (FMP format)
// Note: FMP uses GBPUSD format for some pairs
const FOREX_PAIRS = ["USDJPY", "USDHKD", "USDSEK", "USDCAD", "USDEUR", "GBPUSD", "USDAUD"];

// Cache for forex rates (5 minute TTL - forex doesn't move that fast)
let forexCache: { data: Record<string, number>; timestamp: number } | null = null;
const FOREX_CACHE_TTL = 5 * 60 * 1000;

// Ticker -> currency mapping for non-USD stocks (used for price conversion)
const TICKER_CURRENCY: Record<string, string> = {
  "3350.T": "JPY",
  "3189.T": "JPY",    // ANAP Holdings (Tokyo Stock Exchange)
  "3825.T": "JPY",    // Remixpoint (Tokyo Stock Exchange)
  "H100.ST": "SEK",
  "0434.HK": "HKD",
  "ALTBG": "EUR",
  "ETHM": "CAD",
  "SWC": "GBP",     // Smarter Web Company (AQUIS UK)
  "TSWCF": "GBP",   // SWC OTC ticker
  "DCC.AX": "AUD",  // DigitalX (ASX Australia)
  "NDA.V": "CAD",   // Neptune Digital Assets (TSX Venture)
  "DMGI.V": "CAD",  // DMG Blockchain (TSX Venture)
};

// Stocks not on major exchanges (OTC/international) - use FMP
// Map: FMP ticker -> display ticker (for tickers with different formats)
const FMP_TICKER_MAP: Record<string, string> = {
  "ALTBG.PA": "ALTBG",   // Euronext Paris
  "HOGPF": "H100.ST",    // H100 Group OTC ticker -> display as H100.ST
  "TSWCF": "SWC",        // Smarter Web Company OTC ticker -> display as SWC (AQUIS primary)
};
const FMP_ONLY_STOCKS = [
  "MSTR",      // Strategy - use FMP for price since Alpaca not working on Vercel
  // ETHM removed - pending SPAC merger, use FALLBACK_STOCKS instead
  "ALTBG.PA",  // The Blockchain Group (Euronext Paris) - FMP ticker
  "ALTBG",     // The Blockchain Group - display ticker (not valid on Alpaca)
  "LUXFF",     // Luxxfolio (OTC)
  "IHLDF",     // Immutable Holdings (OTC) - Alpaca has poor OTC coverage
  "NA",        // Nano Labs
  "3350.T",    // Metaplanet (Tokyo)
  // "3189.T" removed - using FALLBACK_STOCKS with verified TDnet data instead
  "HOGPF",     // H100 Group (OTC ticker for Swedish company)
  "H100.ST",   // H100 Group - display ticker (not valid on Alpaca)
  "0434.HK",   // Boyaa Interactive (Hong Kong)
  // SWC removed - FMP has wrong ticker. Using FALLBACK_STOCKS instead.
  // SOL treasury companies - Alpaca IEX often has no data (low volume)
  "DFDV",      // DeFi Development
  "UPXI",      // Upexi
  "STKE",      // Sol Strategies
  "FWDI",      // Forwardly
  "HSDT",      // Heliogen
  ];

// Stocks using Yahoo Finance (FMP doesn't cover well)
// Yahoo ticker format varies by exchange
const YAHOO_TICKERS: Record<string, string> = {
  "XTAIF": "XTAO-U.V",   // xTAO Inc (TSX Venture USD) - also trades as XTAO.V in CAD
  // SWC removed - Yahoo TSWCF returns wrong price (~$11 vs actual ~$0.57). Using FALLBACK_STOCKS instead.
  "DCC.AX": "DCC.AX",    // DigitalX - ASX (Yahoo supports .AX suffix, returns AUD)
};

// Yahoo tickers that need currency conversion (ticker -> currency)
const YAHOO_CURRENCIES: Record<string, string> = {
  "DCC.AX": "AUD",
};

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

// Fetch forex rates from exchangerate-api.com (free, no API key needed)
async function fetchExchangeRateApi(): Promise<Record<string, number> | null> {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data?.result !== "success" || !data?.rates) return null;
    
    // Map to our format (1 USD = X currency)
    const rates: Record<string, number> = {};
    const currencies = ["AUD", "CAD", "EUR", "GBP", "JPY", "HKD", "SEK"];
    for (const cur of currencies) {
      if (data.rates[cur]) {
        rates[cur] = data.rates[cur];
      }
    }
    console.log("[Forex] exchangerate-api rates:", rates);
    return rates;
  } catch (error) {
    console.error("[Forex] exchangerate-api error:", error);
    return null;
  }
}

// Fetch forex rates (primary: exchangerate-api, fallback: FMP, final: static)
async function fetchForexRates(): Promise<Record<string, number>> {
  if (forexCache && Date.now() - forexCache.timestamp < FOREX_CACHE_TTL) {
    return forexCache.data;
  }

  // Start with fallback rates
  const rates: Record<string, number> = { ...FALLBACK_RATES };
  
  // Try exchangerate-api.com first (free, reliable, covers all currencies)
  const erApiRates = await fetchExchangeRateApi();
  if (erApiRates) {
    Object.assign(rates, erApiRates);
    console.log("[Forex] Using exchangerate-api.com rates");
    forexCache = { data: rates, timestamp: Date.now() };
    return rates;
  }

  // Fallback to FMP for any missing rates
  if (FMP_API_KEY) {
    try {
      const pairList = FOREX_PAIRS.join(",");
      const url = `https://financialmodelingprep.com/api/v3/quote/${pairList}?apikey=${FMP_API_KEY}`;
      console.log("[Forex] Fetching rates from FMP...");

      const response = await fetch(url, { cache: "no-store" });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          for (const quote of data) {
            if (quote?.symbol && quote?.price > 0) {
              const currency = quote.symbol.replace("USD", "");
              // Only use FMP if we don't already have a rate
              if (!rates[currency] || rates[currency] === FALLBACK_RATES[currency]) {
                rates[currency] = quote.price;
              }
            }
          }
          console.log("[Forex] FMP supplemented rates:", rates);
        }
      }
    } catch (error) {
      console.error("[Forex] FMP error:", error);
    }
  }

  forexCache = { data: rates, timestamp: Date.now() };
  return rates;
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

// Fetch Yahoo Finance stocks (for TSX Venture and other stocks FMP doesn't cover)
async function fetchYahooStocks(tickerMap: Record<string, string>): Promise<Record<string, any>> {
  const entries = Object.entries(tickerMap);
  if (entries.length === 0) return {};

  const result: Record<string, any> = {};

  for (const [displayTicker, yahooTicker] of entries) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1d&range=2d`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        console.log(`[Yahoo] ${displayTicker} (${yahooTicker}): HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      const meta = data?.chart?.result?.[0]?.meta;
      const indicators = data?.chart?.result?.[0]?.indicators?.quote?.[0];

      if (meta?.regularMarketPrice) {
        const currentPrice = meta.regularMarketPrice;
        const prevClose = meta.chartPreviousClose || meta.previousClose || currentPrice;
        const change24h = prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0;

        result[displayTicker] = {
          price: currentPrice,
          change24h,
          volume: indicators?.volume?.[indicators.volume.length - 1] || 0,
          marketCap: 0, // Yahoo doesn't return market cap in chart endpoint
          source: "yahoo",
        };
        console.log(`[Yahoo] ${displayTicker}: $${currentPrice.toFixed(2)} (${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%)`);
      }
    } catch (error) {
      console.error(`[Yahoo] Error fetching ${displayTicker}:`, error);
    }
  }

  return result;
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
          // Debug logging for TSWCF to diagnose pricing issue
          if (stock.symbol === "TSWCF") {
            console.log("[FMP DEBUG] TSWCF raw response:", JSON.stringify(stock));
          }
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
  console.log("[Prices] GET called at", new Date().toISOString());
  
  // Return cached data if fresh
  if (priceCache && Date.now() - priceCache.timestamp < CACHE_TTL) {
    console.log("[Prices] Returning cached data");
    return NextResponse.json(priceCache.data, { headers: RESPONSE_HEADERS });
  }
  
  console.log("[Prices] Cache miss, fetching fresh data...");

  try {
    const marketOpen = isMarketOpen();
    const extendedHours = isExtendedHours();

    const alpacaStockTickers = STOCK_TICKERS.filter(t => !FMP_ONLY_STOCKS.includes(t));

    // Parallel fetch - CoinGecko now handles all crypto including HYPE
    const [cryptoPrices, stockSnapshots, fmpStocks, yahooStocks, marketCaps, forexRates, lstRatesMap] = await Promise.all([
      getBinancePrices(),
      getStockSnapshots(alpacaStockTickers).catch(e => { console.error("Alpaca error:", e.message); return {}; }),
      fetchFMPStocks(FMP_ONLY_STOCKS),
      fetchYahooStocks(YAHOO_TICKERS).catch(e => { console.error("Yahoo error:", e.message); return {}; }),
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

        // Convert price to USD if it's a foreign currency stock (Alpaca returns native currency)
        const currency = TICKER_CURRENCY[ticker];
        const rate = currency ? (forexRates[currency] || FALLBACK_RATES[currency]) : null;
        const priceUsd = rate && rate > 0 ? currentPrice / rate : currentPrice;
        const regularPriceUsd = rate && rate > 0 ? (snapshot.prevDailyBar?.c || currentPrice) / rate : (snapshot.prevDailyBar?.c || currentPrice);

        stockPrices[ticker] = {
          price: priceUsd,
          change24h,
          volume: dailyBar.v || 0,
          marketCap: MARKET_CAP_OVERRIDES[ticker] || marketCaps[ticker] || 0,
          isAfterHours: extendedHours && !marketOpen,
          regularPrice: regularPriceUsd,
        };
      }
    }

    // Merge FMP stocks (with ticker mapping, currency conversion, and market cap overrides)
    for (const [ticker, data] of Object.entries(fmpStocks)) {
      const displayTicker = FMP_TICKER_MAP[ticker] || ticker;
      // Convert price to USD if it's a foreign currency stock
      const currency = TICKER_CURRENCY[displayTicker];
      const rate = currency ? (forexRates[currency] || FALLBACK_RATES[currency]) : null;
      const priceUsd = rate && rate > 0 ? data.price / rate : data.price;
      
      stockPrices[displayTicker] = {
        ...data,
        price: priceUsd,
        // Apply market cap override if available (fixes currency conversion issues)
        marketCap: MARKET_CAP_OVERRIDES[displayTicker] || data.marketCap,
      };
    }

    // Merge Yahoo Finance stocks (for TSX Venture, ASX, etc.)
    for (const [ticker, data] of Object.entries(yahooStocks)) {
      // Convert price to USD if it's a foreign currency stock (e.g., DCC.AX in AUD)
      const currency = YAHOO_CURRENCIES[ticker];
      const rate = currency ? (forexRates[currency] || FALLBACK_RATES[currency]) : null;
      const priceUsd = rate && rate > 0 ? data.price / rate : data.price;
      
      // Calculate market cap: use shares from company data × USD price
      // Note: FALLBACK_STOCKS.marketCap is in USD, .price is in local currency
      // shares = marketCap_USD / (price_local / rate) = marketCap_USD * rate / price_local
      const fallback = FALLBACK_STOCKS[ticker];
      const impliedShares = fallback && rate ? (fallback.marketCap * rate) / fallback.price : 0;
      const calculatedMarketCap = impliedShares > 0 ? impliedShares * priceUsd : 0;
      
      stockPrices[ticker] = {
        ...data,
        price: priceUsd,
        // Use override or calculate from fallback based on new price
        marketCap: MARKET_CAP_OVERRIDES[ticker] || calculatedMarketCap,
      };
      
      if (currency) {
        console.log(`[Yahoo] ${ticker} converted: ${data.price} ${currency} → $${priceUsd.toFixed(4)} USD (rate: ${rate})`);
      }
    }


    // Add fallback data for illiquid stocks without real-time data
    for (const [ticker, fallback] of Object.entries(FALLBACK_STOCKS)) {
      // Debug: check if 3189.T already has data (shouldn't, since we removed it from FMP_ONLY_STOCKS)
      if (ticker === "3189.T" && stockPrices[ticker]) {
        console.log(`[Prices DEBUG] 3189.T already has data (NOT using fallback):`, stockPrices[ticker]);
      }
      if (!stockPrices[ticker]) {
        // Convert fallback price to USD if it's a foreign currency stock
        const currency = TICKER_CURRENCY[ticker];
        const rate = currency ? (forexRates[currency] || FALLBACK_RATES[currency]) : null;
        const priceUsd = rate && rate > 0 ? fallback.price / rate : fallback.price;

        // Debug logging for 3189.T
        if (ticker === "3189.T") {
          console.log(`[Prices DEBUG] 3189.T fallback:`, {
            fallbackPrice: fallback.price,
            currency,
            forexRateFromFMP: forexRates[currency as string],
            fallbackRate: FALLBACK_RATES[currency as string],
            rateUsed: rate,
            priceUsd,
            fallbackMarketCap: fallback.marketCap,
          });
        }

        stockPrices[ticker] = {
          price: priceUsd,
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
