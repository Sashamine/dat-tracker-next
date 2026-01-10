import { NextRequest } from "next/server";
import { getBinancePrices, NON_BINANCE_COINS } from "@/lib/binance";
import { getStockSnapshots, STOCK_TICKERS, isMarketOpen, isExtendedHours } from "@/lib/alpaca";

// FMP for market caps and fallback data
const FMP_API_KEY = process.env.FMP_API_KEY || "";

// Stocks not on major exchanges (OTC/international) - use FMP
const FMP_ONLY_STOCKS = ["ALTBG", "XTAIF", "LUXFF", "NA"];

// Cache for market caps (update every 5 minutes, not every tick)
let marketCapCache: { data: Record<string, number>; timestamp: number } | null = null;
const MARKET_CAP_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

// Fetch market caps from FMP (cached for 5 minutes)
async function fetchMarketCaps(): Promise<Record<string, number>> {
  // Return cached if fresh
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

    // Update cache
    marketCapCache = { data: result, timestamp: Date.now() };
    return result;
  } catch (error) {
    console.error("FMP market caps error:", error);
    return marketCapCache?.data || {};
  }
}

// Fetch FMP stocks (for OTC/international not on Alpaca)
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

async function fetchAllPrices() {
  const marketOpen = isMarketOpen();
  const extendedHours = isExtendedHours();

  // Alpaca stocks (excluding OTC/international)
  const alpacaStockTickers = STOCK_TICKERS.filter(t => !FMP_ONLY_STOCKS.includes(t));

  // Parallel fetch all data sources
  const [binanceCrypto, coinGeckoFallback, stockSnapshots, fmpStocks, marketCaps] = await Promise.all([
    getBinancePrices(),                           // Free real-time crypto
    fetchCoinGeckoFallback(),                     // HYPE (not on Binance)
    getStockSnapshots(alpacaStockTickers).catch(() => ({})), // Free IEX stocks
    fetchFMPStocks(FMP_ONLY_STOCKS),              // OTC stocks from FMP
    fetchMarketCaps(),                            // Cached market caps
  ]);

  // Merge crypto prices (Binance + CoinGecko fallback)
  const cryptoPrices: Record<string, { price: number; change24h: number }> = {
    ...binanceCrypto,
    ...coinGeckoFallback,
  };

  // Format stock prices from Alpaca
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

  // Merge FMP stocks (OTC/international)
  for (const [ticker, data] of Object.entries(fmpStocks)) {
    stockPrices[ticker] = data;
  }

  return {
    crypto: cryptoPrices,
    stocks: stockPrices,
    timestamp: new Date().toISOString(),
    marketOpen,
    extendedHours,
  };
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  // Check if client wants SSE stream
  const accept = request.headers.get("accept");
  const isSSE = accept?.includes("text/event-stream");

  if (!isSSE) {
    // Regular JSON response (fallback)
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

  // SSE stream - crypto every 2s, full update every 15s
  let tickCount = 0;
  const FULL_UPDATE_INTERVAL = 15; // Every 15 ticks (30 seconds)

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      // Send initial full data immediately
      try {
        const initialData = await fetchAllPrices();
        sendEvent(initialData);
      } catch (error) {
        console.error("Initial fetch error:", error);
        sendEvent({ error: "Failed to fetch initial prices" });
      }

      // Stream updates - crypto fast, stocks slower
      const interval = setInterval(async () => {
        try {
          tickCount++;

          if (tickCount % FULL_UPDATE_INTERVAL === 0) {
            // Full update including stocks (every 30 seconds)
            const data = await fetchAllPrices();
            sendEvent(data);
          } else {
            // Crypto-only update (every 2 seconds) - this is the "live" feel
            const [binanceCrypto, coinGeckoFallback] = await Promise.all([
              getBinancePrices(),
              fetchCoinGeckoFallback(),
            ]);

            sendEvent({
              crypto: { ...binanceCrypto, ...coinGeckoFallback },
              timestamp: new Date().toISOString(),
              partialUpdate: true, // Signal this is crypto-only
            });
          }
        } catch (error) {
          console.error("Stream fetch error:", error);
        }
      }, 2000); // Every 2 seconds

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
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
