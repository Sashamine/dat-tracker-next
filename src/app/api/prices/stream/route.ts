import { NextRequest } from "next/server";
import { getBinancePrices } from "@/lib/binance";
import { getStockSnapshots, STOCK_TICKERS, CRYPTO_SYMBOLS, isMarketOpen, isExtendedHours } from "@/lib/alpaca";

// Use Edge Runtime for WebSocket support
export const runtime = "edge";

const ALPACA_API_KEY = process.env.ALPACA_API_KEY || "";
const ALPACA_SECRET_KEY = process.env.ALPACA_SECRET_KEY || "";

// FMP for market caps and fallback data
const FMP_API_KEY = process.env.FMP_API_KEY || "";

// WebSocket endpoints
const STOCK_WS_URL = "wss://stream.data.alpaca.markets/v2/iex";
const CRYPTO_WS_URL = "wss://stream.data.alpaca.markets/v1beta3/crypto/us";

// Stocks not on major exchanges (OTC/international) - use FMP
const FMP_TICKER_MAP: Record<string, string> = {
  "ALTBG.PA": "ALTBG",
  "HOGPF": "H100.ST",
};

// Fallback prices for illiquid stocks
const FALLBACK_STOCKS: Record<string, { price: number; marketCap: number }> = {
  "CEPO": { price: 10.50, marketCap: 3_500_000_000 },
  "XTAIF": { price: 0.75, marketCap: 20000000 },
  "IHLDF": { price: 0.10, marketCap: 10000000 },
  "ALTBG": { price: 0.50, marketCap: 200000000 },
  "H100.ST": { price: 0.10, marketCap: 150000000 },
};

// Market cap overrides
const MARKET_CAP_OVERRIDES: Record<string, number> = {
  "BMNR": 12_800_000_000,
  "3350.T": 3_500_000_000,
  "0434.HK": 315_000_000,
  "XXI": 4_000_000_000,
  "CEPO": 3_500_000_000,
  "FWDI": 1_600_000_000,
  "NXTT": 600_000_000,
  "BNC": 500_000_000,
  "CWD": 15_000_000,
  "SUIG": 150_000_000,
  "XRPN": 1_000_000_000,
  "CYPH": 65_000_000,
  "LITS": 55_000_000,
  "NA": 81_000_000,
  "FGNX": 110_000_000,
  "AVX": 130_000_000,
};

const FMP_ONLY_STOCKS = ["ALTBG.PA", "LUXFF", "NA", "3350.T", "HOGPF", "0434.HK"];

// Cache for market caps (update every 5 minutes)
let marketCapCache: { data: Record<string, number>; timestamp: number } | null = null;
const MARKET_CAP_CACHE_TTL = 5 * 60 * 1000;

async function fetchMarketCaps(): Promise<Record<string, number>> {
  if (marketCapCache && Date.now() - marketCapCache.timestamp < MARKET_CAP_CACHE_TTL) {
    return marketCapCache.data;
  }

  if (!FMP_API_KEY) return marketCapCache?.data || {};

  try {
    const tickerList = STOCK_TICKERS.join(",");
    const url = `https://financialmodelingprep.com/stable/batch-quote?symbols=${tickerList}&apikey=${FMP_API_KEY}`;
    const response = await fetch(url, { cache: "no-store" });
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

async function fetchFMPStocks(tickers: string[]): Promise<Record<string, any>> {
  if (tickers.length === 0 || !FMP_API_KEY) return {};

  try {
    const tickerList = tickers.join(",");
    const url = `https://financialmodelingprep.com/stable/batch-quote?symbols=${tickerList}&apikey=${FMP_API_KEY}`;
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

// Fetch initial snapshot data
async function fetchAllPrices() {
  const marketOpen = isMarketOpen();
  const extendedHours = isExtendedHours();

  const alpacaStockTickers = STOCK_TICKERS.filter(t => !FMP_ONLY_STOCKS.includes(t));

  const [cryptoPrices, stockSnapshots, fmpStocks, marketCaps] = await Promise.all([
    getBinancePrices(),
    getStockSnapshots(alpacaStockTickers).catch(() => ({})),
    fetchFMPStocks(FMP_ONLY_STOCKS),
    fetchMarketCaps(),
  ]);

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
        prevClose,
        change24h,
        volume: dailyBar.v || 0,
        marketCap: MARKET_CAP_OVERRIDES[ticker] || marketCaps[ticker] || 0,
        isAfterHours: extendedHours && !marketOpen,
        regularPrice: snapshot.prevDailyBar?.c || currentPrice,
      };
    }
  }

  for (const [ticker, data] of Object.entries(fmpStocks)) {
    const displayTicker = FMP_TICKER_MAP[ticker] || ticker;
    stockPrices[displayTicker] = {
      ...data,
      marketCap: MARKET_CAP_OVERRIDES[displayTicker] || data.marketCap,
    };
  }

  for (const [ticker, fallback] of Object.entries(FALLBACK_STOCKS)) {
    if (!stockPrices[ticker]) {
      stockPrices[ticker] = {
        price: fallback.price,
        change24h: 0,
        volume: 0,
        marketCap: fallback.marketCap,
        isStatic: true,
      };
    }
  }

  return {
    crypto: cryptoPrices,
    stocks: stockPrices,
    timestamp: new Date().toISOString(),
    marketOpen,
    extendedHours,
  };
}

// Create WebSocket connection to Alpaca
function createAlpacaWebSocket(
  url: string,
  symbols: string[],
  onTrade: (symbol: string, price: number, timestamp: string) => void
): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    // Debug: Check if env vars are present
    const keyPresent = !!ALPACA_API_KEY;
    const secretPresent = !!ALPACA_SECRET_KEY;
    const keyLength = ALPACA_API_KEY?.length || 0;
    const secretLength = ALPACA_SECRET_KEY?.length || 0;
    console.log(`[WS] Auth check - key: ${keyPresent} (${keyLength} chars), secret: ${secretPresent} (${secretLength} chars)`);

    if (!keyPresent || !secretPresent) {
      reject(new Error(`Missing credentials: key=${keyPresent}, secret=${secretPresent}`));
      return;
    }

    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log(`[WS] Connected to ${url}`);
      // Authenticate - Alpaca expects exact format
      const authMsg = {
        action: "auth",
        key: ALPACA_API_KEY,
        secret: ALPACA_SECRET_KEY,
      };
      console.log(`[WS] Sending auth with key prefix: ${ALPACA_API_KEY.substring(0, 4)}...`);
      ws.send(JSON.stringify(authMsg));
    };

    ws.onmessage = (event) => {
      try {
        const rawData = typeof event.data === 'string' ? event.data : event.data.toString();
        const messages = JSON.parse(rawData);

        for (const msg of Array.isArray(messages) ? messages : [messages]) {
          // Log all message types for debugging
          if (msg.T === "success") {
            console.log(`[WS] Success: ${msg.msg}`);
          }

          if (msg.T === "success" && msg.msg === "authenticated") {
            console.log(`[WS] Authenticated! Subscribing to ${symbols.length} symbols`);
            ws.send(JSON.stringify({
              action: "subscribe",
              trades: symbols,
            }));
            resolve(ws);
          }

          if (msg.T === "subscription") {
            console.log(`[WS] Subscribed to trades:`, msg.trades?.length || 0);
          }

          if (msg.T === "t") {
            const symbol = msg.S.includes("/") ? msg.S.replace("/USD", "") : msg.S;
            onTrade(symbol, msg.p, msg.t);
          }

          if (msg.T === "error") {
            console.error(`[WS] Error message:`, JSON.stringify(msg));
            if (msg.msg === "auth failed" || msg.msg?.includes("auth")) {
              reject(new Error(`Alpaca auth failed: ${msg.msg} (code: ${msg.code})`));
            }
          }
        }
      } catch (e) {
        console.error("[WS] Parse error:", e);
      }
    };

    ws.onerror = (error) => {
      console.error("[WS] WebSocket error event:", error);
      reject(error);
    };

    ws.onclose = (event) => {
      console.log(`[WS] Closed: code=${event.code}, reason=${event.reason}`);
    };
  });
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
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

  // SSE stream with real-time WebSocket data
  let stockWs: WebSocket | null = null;
  let cryptoWs: WebSocket | null = null;
  let isAborted = false;

  // Price state - updated by WebSocket
  let stockPrices: Record<string, any> = {};
  let cryptoPrices: Record<string, { price: number; change24h: number }> = {};
  let lastFullUpdate = 0;

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
        stockPrices = initialData.stocks;
        cryptoPrices = initialData.crypto;
        lastFullUpdate = Date.now();
        sendEvent(initialData);
      } catch (error) {
        console.error("Initial fetch error:", error);
        sendEvent({ error: "Failed to fetch initial prices" });
      }

      // Track if WebSocket is working
      let wsConnected = false;

      // Connect to Alpaca WebSockets for real-time updates
      if (ALPACA_API_KEY && ALPACA_SECRET_KEY) {
        try {
          // Stock WebSocket
          const stockSymbols = STOCK_TICKERS.filter(t => !FMP_ONLY_STOCKS.includes(t));
          stockWs = await createAlpacaWebSocket(
            STOCK_WS_URL,
            stockSymbols,
            (symbol, price, timestamp) => {
              if (stockPrices[symbol]) {
                const prevClose = stockPrices[symbol].prevClose || stockPrices[symbol].price;
                const change24h = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
                stockPrices[symbol] = {
                  ...stockPrices[symbol],
                  price,
                  change24h,
                  lastTrade: timestamp,
                };

                // Send real-time update
                sendEvent({
                  type: "trade",
                  symbol,
                  price,
                  change24h,
                  timestamp,
                  assetType: "stock",
                });
              }
            }
          );
          wsConnected = true;
          console.log("[Stream] Stock WebSocket connected");
        } catch (e: any) {
          console.error("[Stream] Stock WebSocket failed:", e?.message || e);
        }

        try {
          // Crypto WebSocket
          const cryptoSymbols = Object.values(CRYPTO_SYMBOLS);
          cryptoWs = await createAlpacaWebSocket(
            CRYPTO_WS_URL,
            cryptoSymbols,
            (symbol, price, timestamp) => {
              if (cryptoPrices[symbol]) {
                cryptoPrices[symbol] = {
                  ...cryptoPrices[symbol],
                  price,
                };

                sendEvent({
                  type: "trade",
                  symbol,
                  price,
                  timestamp,
                  assetType: "crypto",
                });
              }
            }
          );
          wsConnected = true;
          console.log("[Stream] Crypto WebSocket connected");
        } catch (e: any) {
          console.error("[Stream] Crypto WebSocket failed:", e?.message || e);
        }
      }

      // Fallback polling if WebSocket failed (every 5 seconds for stocks, 2 for crypto)
      let pollInterval: NodeJS.Timeout | null = null;
      if (!wsConnected) {
        console.log("[Stream] Using polling fallback (WebSocket unavailable)");
        let tickCount = 0;
        pollInterval = setInterval(async () => {
          if (isAborted) return;
          tickCount++;
          try {
            if (tickCount % 3 === 0) {
              // Full update every 15 seconds (3 ticks × 5s)
              const data = await fetchAllPrices();
              stockPrices = data.stocks;
              cryptoPrices = data.crypto;
              sendEvent(data);
            } else {
              // Crypto-only update
              const crypto = await getBinancePrices();
              cryptoPrices = crypto;
              sendEvent({
                crypto,
                timestamp: new Date().toISOString(),
                partialUpdate: true,
              });
            }
          } catch (e) {
            console.error("Poll error:", e);
          }
        }, 5000);
      }

      // Periodic full refresh for market caps (every 60 seconds)
      const fullRefreshInterval = setInterval(async () => {
        if (isAborted) return;
        try {
          const data = await fetchAllPrices();
          // Merge with real-time prices if WS is active
          if (wsConnected) {
            for (const [symbol, rtData] of Object.entries(stockPrices)) {
              if (data.stocks[symbol] && rtData.lastTrade) {
                data.stocks[symbol].price = rtData.price;
                data.stocks[symbol].change24h = rtData.change24h;
              }
            }
          }
          sendEvent({ ...data, fullRefresh: true });
        } catch (e) {
          console.error("Full refresh error:", e);
        }
      }, 60000);

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        isAborted = true;
        clearInterval(fullRefreshInterval);
        if (pollInterval) {
          clearInterval(pollInterval);
        }
        if (stockWs) {
          stockWs.close();
          stockWs = null;
        }
        if (cryptoWs) {
          cryptoWs.close();
          cryptoWs = null;
        }
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
