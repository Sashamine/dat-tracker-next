import { NextRequest } from "next/server";
import { STOCK_TICKERS } from "@/lib/alpaca";
import { MARKET_CAP_OVERRIDES, FALLBACK_STOCKS } from "@/lib/data/market-cap-overrides";
import { FALLBACK_RATES } from "@/lib/utils/currency";

// Use Edge Runtime for streaming support
export const runtime = "edge";

// FMP API Key
const FMP_API_KEY = process.env.FMP_API_KEY || "";

// Forex pairs we need (FMP format)
const FOREX_PAIRS = ["USDJPY", "USDHKD", "USDSEK", "USDCAD", "USDEUR"];

// Ticker -> currency mapping for non-USD stocks (used for price conversion)
const TICKER_CURRENCY: Record<string, string> = {
  "3350.T": "JPY",
  "3189.T": "JPY",    // ANAP Holdings (Tokyo Stock Exchange)
  "3825.T": "JPY",    // Remixpoint (Tokyo Stock Exchange)
  "H100.ST": "SEK",
  "0434.HK": "HKD",
  "ALCPB": "EUR",
  "SRAG.DU": "EUR",  // Samara Asset Group (Frankfurt/XETRA)
  "ETHM": "CAD",
};

// Stocks to fetch from Yahoo Finance (FMP has wrong data or no coverage)
// Map: display ticker -> Yahoo ticker
const YAHOO_TICKERS: Record<string, string> = {
  "XTAIF": "XTAO-U.V",   // xTAO Inc (TSX Venture USD)
  "SWC": "TSWCF",        // Smarter Web Company - OTC ticker (FMP has wrong SWC)
  "DCC.AX": "DCC.AX",    // DigitalX - ASX (Yahoo supports .AX suffix)
};

// Cache for forex rates (5 minute TTL - forex doesn't move fast)
let forexCache: { data: Record<string, number>; timestamp: number } | null = null;
const FOREX_CACHE_TTL = 5 * 60 * 1000;

// Crypto - keep using CoinGecko
const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  LINK: "chainlink",
  XRP: "ripple",
  LTC: "litecoin",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  HYPE: "hyperliquid",
  BNB: "binancecoin",
  TAO: "bittensor",
  TRX: "tron",
  ZEC: "zcash",
  SUI: "sui",
  ADA: "cardano",
  HBAR: "hedera-hashgraph",
};

// Cache for CoinGecko
let geckoCache: { data: Record<string, { price: number; change24h: number }>; timestamp: number } | null = null;
const GECKO_CACHE_TTL = 30 * 1000; // 30 seconds

// Check if US stock market is open
function isMarketOpen(): boolean {
  const now = new Date();
  const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = etTime.getDay();
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  const isWeekday = day >= 1 && day <= 5;
  const isDuringHours = timeInMinutes >= 570 && timeInMinutes < 960;
  return isWeekday && isDuringHours;
}

function isExtendedHours(): boolean {
  const now = new Date();
  const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = etTime.getDay();
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  const isWeekday = day >= 1 && day <= 5;
  const isPreMarket = timeInMinutes >= 240 && timeInMinutes < 570;
  const isAfterHours = timeInMinutes >= 960 && timeInMinutes < 1200;
  return isWeekday && (isPreMarket || isAfterHours);
}

// Kraken pairs for crypto prices (free, no API key, no rate limits, US-friendly)
const KRAKEN_PAIRS: Record<string, string> = {
  BTC: "XXBTZUSD",
  ETH: "XETHZUSD",
  SOL: "SOLUSD",
  XRP: "XXRPZUSD",
  DOGE: "XDGUSD",
  ADA: "ADAUSD",
  AVAX: "AVAXUSD",
  LINK: "LINKUSD",
  SUI: "SUIUSD",
  LTC: "XLTCZUSD",
  TAO: "TAOUSD",
};

// Fetch crypto from Kraken (primary - no rate limits, US-friendly)
async function fetchCryptoPricesFromKraken(): Promise<Record<string, { price: number; change24h: number }>> {
  try {
    const pairs = Object.values(KRAKEN_PAIRS).join(",");
    const url = `https://api.kraken.com/0/public/Ticker?pair=${pairs}`;
    const response = await fetch(url, { cache: "no-store" });
    
    if (!response.ok) {
      console.error("Kraken error:", response.status);
      return {};
    }
    
    const data = await response.json();
    if (data.error?.length > 0) {
      console.error("Kraken API error:", data.error);
      return {};
    }
    
    const result: Record<string, { price: number; change24h: number }> = {};
    
    for (const [symbol, krakenPair] of Object.entries(KRAKEN_PAIRS)) {
      const ticker = data.result?.[krakenPair];
      if (ticker) {
        const price = parseFloat(ticker.c?.[0]) || 0; // c = last trade closed [price, lot volume]
        const open = parseFloat(ticker.o) || price;   // o = today's opening price
        const change24h = open > 0 ? ((price - open) / open) * 100 : 0;
        result[symbol] = { price, change24h };
      }
    }
    
    return result;
  } catch (error) {
    console.error("Kraken fetch error:", error);
    return {};
  }
}

// Fetch crypto from CoinGecko (fallback)
async function fetchCryptoPrices(): Promise<Record<string, { price: number; change24h: number }>> {
  // Try Kraken first (no rate limits, US-friendly)
  const krakenData = await fetchCryptoPricesFromKraken();
  if (Object.keys(krakenData).length > 0) {
    geckoCache = { data: krakenData, timestamp: Date.now() };
    return krakenData;
  }
  
  // Fall back to CoinGecko if Binance fails
  if (geckoCache && Date.now() - geckoCache.timestamp < GECKO_CACHE_TTL) {
    return geckoCache.data;
  }

  try {
    const ids = Object.values(COINGECKO_IDS).join(",");
    const url = `${COINGECKO_BASE_URL}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      console.error("CoinGecko error:", response.status);
      return geckoCache?.data || {};
    }

    const data = await response.json();
    const result: Record<string, { price: number; change24h: number }> = {};

    for (const [symbol, geckoId] of Object.entries(COINGECKO_IDS)) {
      const coinData = data[geckoId];
      if (coinData) {
        result[symbol] = {
          price: coinData.usd || 0,
          change24h: coinData.usd_24h_change || 0,
        };
      }
    }

    geckoCache = { data: result, timestamp: Date.now() };
    return result;
  } catch (error) {
    console.error("CoinGecko fetch error:", error);
    return geckoCache?.data || {};
  }
}

// Fetch forex rates from exchangerate-api.com (free, no API key needed)
async function fetchExchangeRateApi(): Promise<Record<string, number> | null> {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data?.result !== "success" || !data?.rates) return null;
    
    const rates: Record<string, number> = {};
    const currencies = ["AUD", "CAD", "EUR", "GBP", "JPY", "HKD", "SEK"];
    for (const cur of currencies) {
      if (data.rates[cur]) {
        rates[cur] = data.rates[cur];
      }
    }
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

  const rates: Record<string, number> = { ...FALLBACK_RATES };
  
  // Try exchangerate-api.com first
  const erApiRates = await fetchExchangeRateApi();
  if (erApiRates) {
    Object.assign(rates, erApiRates);
    forexCache = { data: rates, timestamp: Date.now() };
    return rates;
  }

  // Fallback to FMP
  if (FMP_API_KEY) {
    try {
      const pairList = FOREX_PAIRS.join(",");
      const url = `https://financialmodelingprep.com/api/v3/quote/${pairList}?apikey=${FMP_API_KEY}`;
      const response = await fetch(url, { cache: "no-store" });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          for (const quote of data) {
            if (quote?.symbol && quote?.price > 0) {
              const currency = quote.symbol.replace("USD", "");
              if (!rates[currency] || rates[currency] === FALLBACK_RATES[currency]) {
                rates[currency] = quote.price;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("[Forex] FMP error:", error);
    }
  }

  forexCache = { data: rates, timestamp: Date.now() };
  return rates;
}

// Fetch stock quotes from FMP REST API (for initial data)
// Note: Extended hours data requires legacy FMP subscription, so we only get regular market prices
async function fetchFMPStockQuotes(): Promise<Record<string, any>> {
  if (!FMP_API_KEY) return {};

  try {
    const tickerList = STOCK_TICKERS.join(",");
    const url = `https://financialmodelingprep.com/stable/batch-quote?symbols=${tickerList}&apikey=${FMP_API_KEY}`;
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json();

    const result: Record<string, any> = {};
    if (Array.isArray(data)) {
      for (const stock of data) {
        if (stock?.symbol) {
          result[stock.symbol] = {
            price: stock.price || 0,
            prevClose: stock.previousClose || stock.price || 0,
            change24h: stock.changePercentage || 0,
            volume: stock.volume || 0,
            marketCap: MARKET_CAP_OVERRIDES[stock.symbol] || stock.marketCap || 0,
          };
        }
      }
    }

    // Add fallbacks for international/illiquid stocks
    // Note: FALLBACK_STOCKS prices are in local currency, need to convert to USD
    // Currency mapping for fallback stocks that need conversion
    const FALLBACK_CURRENCIES: Record<string, string> = {
      "3350.T": "JPY",
      "3189.T": "JPY",
      "3825.T": "JPY",
      "0434.HK": "HKD",
      "H100.ST": "SEK",
      "SRAG.DU": "EUR",
      "DCC.AX": "AUD",
      "NDA.V": "CAD",
      "DMGI.V": "CAD",
      "ALCPB": "EUR",
    };
    
    const forexRates = await fetchForexRates();
    for (const [ticker, fallback] of Object.entries(FALLBACK_STOCKS)) {
      if (!result[ticker]) {
        // Convert price to USD if currency is specified
        const currency = FALLBACK_CURRENCIES[ticker];
        const rate = currency ? (forexRates[currency] || FALLBACK_RATES[currency]) : null;
        const priceUsd = rate && rate > 0 ? fallback.price / rate : fallback.price;
        
        result[ticker] = {
          price: priceUsd,
          prevClose: priceUsd,
          change24h: 0,
          volume: 0,
          marketCap: fallback.marketCap,
          isStatic: true,
        };
      }
    }

    return result;
  } catch (error) {
    console.error("FMP stocks error:", error);
    return {};
  }
}

// Fetch stocks from Yahoo Finance (for tickers FMP doesn't cover well)
async function fetchYahooStocks(): Promise<Record<string, any>> {
  const result: Record<string, any> = {};

  for (const [displayTicker, yahooTicker] of Object.entries(YAHOO_TICKERS)) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1d&range=2d`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        cache: "no-store",
      });

      if (!response.ok) continue;

      const data = await response.json();
      const quote = data?.chart?.result?.[0];
      if (!quote) continue;

      const meta = quote.meta;
      const indicators = quote.indicators?.quote?.[0];
      const closes = indicators?.close?.filter((c: number | null) => c !== null) || [];
      const currentPrice = meta?.regularMarketPrice || closes[closes.length - 1] || 0;
      const prevClose = meta?.previousClose || closes[closes.length - 2] || currentPrice;
      const change24h = prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0;

      result[displayTicker] = {
        price: currentPrice,
        prevClose,
        change24h,
        volume: indicators?.volume?.[indicators.volume.length - 1] || 0,
        marketCap: MARKET_CAP_OVERRIDES[displayTicker] || 0,
        source: "yahoo",
      };
    } catch (error) {
      console.error(`[Yahoo] Error fetching ${displayTicker}:`, error);
    }
  }

  return result;
}

// Fetch all initial prices
async function fetchAllPrices() {
  const marketOpen = isMarketOpen();
  const extendedHours = isExtendedHours();

  const [cryptoPrices, stockPrices, yahooStocks, forexRates] = await Promise.all([
    fetchCryptoPrices(),
    fetchFMPStockQuotes(),
    fetchYahooStocks(),
    fetchForexRates(),
  ]);

  // Convert foreign stock prices to USD
  console.log("[Stream DEBUG] Forex rates:", forexRates);
  for (const [ticker, data] of Object.entries(stockPrices)) {
    const currency = TICKER_CURRENCY[ticker];
    if (currency) {
      const rate = forexRates[currency] || FALLBACK_RATES[currency];
      if (rate && rate > 0) {
        // Debug logging for 3189.T
        if (ticker === "3189.T") {
          console.log(`[Stream DEBUG] 3189.T conversion:`, {
            rawPrice: data.price,
            currency,
            rate,
            convertedPrice: data.price / rate,
            rawMarketCap: data.marketCap,
          });
        }
        stockPrices[ticker] = {
          ...data,
          price: data.price / rate,
          prevClose: data.prevClose ? data.prevClose / rate : data.price / rate,
        };
      }
    }
  }

  // Merge Yahoo stocks (overwrites FMP data for these tickers)
  // Currency mapping for Yahoo tickers that need conversion
  const YAHOO_CURRENCIES: Record<string, string> = {
    "DCC.AX": "AUD",
  };
  
  for (const [ticker, data] of Object.entries(yahooStocks)) {
    // Convert price to USD if it's a foreign currency stock
    const currency = YAHOO_CURRENCIES[ticker];
    const rate = currency ? (forexRates[currency] || FALLBACK_RATES[currency]) : null;
    const priceUsd = rate && rate > 0 ? data.price / rate : data.price;
    
    // Calculate market cap: implied shares × USD price
    // Note: FALLBACK_STOCKS.marketCap is USD, .price is local currency
    const fallback = FALLBACK_STOCKS[ticker];
    const impliedShares = fallback && rate ? (fallback.marketCap * rate) / fallback.price : 0;
    const calculatedMarketCap = impliedShares > 0 ? impliedShares * priceUsd : (MARKET_CAP_OVERRIDES[ticker] || 0);
    
    if (currency) {
      console.log(`[Stream] ${ticker} converted: ${data.price} ${currency} → $${priceUsd.toFixed(4)} USD (rate: ${rate}, marketCap: $${(calculatedMarketCap/1e6).toFixed(1)}M)`);
    }
    
    stockPrices[ticker] = {
      ...data,
      price: priceUsd,
      prevClose: rate && rate > 0 ? data.prevClose / rate : data.prevClose,
      marketCap: calculatedMarketCap,
    };
  }

  return {
    crypto: cryptoPrices,
    stocks: stockPrices,
    forex: forexRates,  // Live forex rates for non-USD stock conversions
    timestamp: new Date().toISOString(),
    marketOpen,
    extendedHours,
  };
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const accept = request.headers.get("accept");
  const isSSE = accept?.includes("text/event-stream");

  if (!isSSE) {
    // Regular JSON response
    try {
      const data = await fetchAllPrices();
      return new Response(JSON.stringify(data), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      });
    } catch (error) {
      console.error("Price fetch error:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch prices" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // SSE stream with REST polling (5-second intervals for real-time updates)
  let isAborted = false;

  // Price state for tracking changes
  let lastStockPrices: Record<string, number> = {};

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        if (isAborted) return;
        try {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (e) {
          // Stream closed
        }
      };

      // Send initial full data
      try {
        const initialData = await fetchAllPrices();
        // Store initial prices for change detection
        for (const [symbol, data] of Object.entries(initialData.stocks)) {
          lastStockPrices[symbol] = (data as any).price || 0;
        }
        sendEvent(initialData);
        console.log("[Stream] Sent initial data");
      } catch (error) {
        console.error("Initial fetch error:", error);
        sendEvent({ error: "Failed to fetch initial prices" });
      }

      // 5-second polling for real-time stock prices
      const stockPollInterval = setInterval(async () => {
        if (isAborted) return;
        try {
          const [newStockPrices, forexRates] = await Promise.all([
            fetchFMPStockQuotes(),
            fetchForexRates(),
          ]);
          const timestamp = new Date().toISOString();

          // Send individual trade events for changed prices
          for (const [symbol, data] of Object.entries(newStockPrices)) {
            let newPrice = (data as any).price || 0;
            
            // Convert foreign currency prices to USD
            const currency = TICKER_CURRENCY[symbol];
            if (currency && newPrice > 0) {
              const rate = forexRates[currency] || FALLBACK_RATES[currency];
              if (rate && rate > 0) {
                newPrice = newPrice / rate;
              }
            }
            
            const lastPrice = lastStockPrices[symbol] || 0;

            // Only send update if price actually changed
            if (newPrice !== lastPrice && newPrice > 0) {
              lastStockPrices[symbol] = newPrice;
              sendEvent({
                type: "trade",
                symbol,
                price: newPrice,
                change24h: (data as any).change24h || 0,
                timestamp,
                assetType: "stock",
              });
            }
          }
        } catch (e) {
          console.error("Stock poll error:", e);
        }
      }, 5000);

      // Crypto refresh every 30 seconds (CoinGecko rate limit)
      const cryptoInterval = setInterval(async () => {
        if (isAborted) return;
        try {
          const crypto = await fetchCryptoPrices();
          sendEvent({
            crypto,
            timestamp: new Date().toISOString(),
            partialUpdate: true,
          });
        } catch (e) {
          console.error("Crypto refresh error:", e);
        }
      }, 30000);

      // Full data refresh every 60 seconds (includes market caps)
      const fullRefreshInterval = setInterval(async () => {
        if (isAborted) return;
        try {
          const data = await fetchAllPrices();
          sendEvent({ ...data, fullRefresh: true });
        } catch (e) {
          console.error("Full refresh error:", e);
        }
      }, 60000);

      // Auto-close after 15 minutes to avoid dev server timeout (~20min).
      // Client should auto-reconnect via EventSource.
      const MAX_STREAM_LIFETIME = 15 * 60 * 1000;
      const lifetimeTimeout = setTimeout(() => {
        console.log("[Stream] Closing after 15min lifetime (client will auto-reconnect)");
        isAborted = true;
        clearInterval(stockPollInterval);
        clearInterval(cryptoInterval);
        clearInterval(fullRefreshInterval);
        try {
          controller.close();
        } catch (e) {
          // Already closed
        }
      }, MAX_STREAM_LIFETIME);

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        isAborted = true;
        clearInterval(stockPollInterval);
        clearInterval(cryptoInterval);
        clearInterval(fullRefreshInterval);
        clearTimeout(lifetimeTimeout);
        try {
          controller.close();
        } catch (e) {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
