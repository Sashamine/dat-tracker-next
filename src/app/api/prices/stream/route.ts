import { NextRequest } from "next/server";
import { STOCK_TICKERS } from "@/lib/alpaca";

// Use Edge Runtime for WebSocket support
export const runtime = "edge";

// FMP API Key
const FMP_API_KEY = process.env.FMP_API_KEY || "";

// FMP WebSocket endpoint
const FMP_WS_URL = "wss://websockets.financialmodelingprep.com";

// Crypto - keep using CoinGecko (FMP crypto websocket is separate)
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

// Market cap overrides for stocks with incorrect data
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

// Fallback prices for illiquid stocks
const FALLBACK_STOCKS: Record<string, { price: number; marketCap: number }> = {
  "CEPO": { price: 10.50, marketCap: 3_500_000_000 },
  "XTAIF": { price: 0.75, marketCap: 20_000_000 },
  "IHLDF": { price: 0.10, marketCap: 10_000_000 },
  "ALTBG": { price: 0.50, marketCap: 200_000_000 },
  "H100.ST": { price: 0.10, marketCap: 150_000_000 },
};

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

// Fetch crypto from CoinGecko
async function fetchCryptoPrices(): Promise<Record<string, { price: number; change24h: number }>> {
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

// Fetch stock quotes from FMP REST API (for initial data)
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

    // Add fallbacks
    for (const [ticker, fallback] of Object.entries(FALLBACK_STOCKS)) {
      if (!result[ticker]) {
        result[ticker] = {
          price: fallback.price,
          prevClose: fallback.price,
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

// Fetch all initial prices
async function fetchAllPrices() {
  const marketOpen = isMarketOpen();
  const extendedHours = isExtendedHours();

  const [cryptoPrices, stockPrices] = await Promise.all([
    fetchCryptoPrices(),
    fetchFMPStockQuotes(),
  ]);

  return {
    crypto: cryptoPrices,
    stocks: stockPrices,
    timestamp: new Date().toISOString(),
    marketOpen,
    extendedHours,
  };
}

// Create FMP WebSocket connection
function createFMPWebSocket(
  symbols: string[],
  onTrade: (symbol: string, price: number, timestamp: string) => void,
  onQuote: (symbol: string, bid: number, ask: number, timestamp: string) => void
): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    if (!FMP_API_KEY) {
      reject(new Error("FMP API key not configured"));
      return;
    }

    console.log(`[FMP WS] Connecting to ${FMP_WS_URL}...`);
    const ws = new WebSocket(FMP_WS_URL);

    ws.onopen = () => {
      console.log("[FMP WS] Connected, sending login...");
      // Authenticate
      ws.send(JSON.stringify({
        event: "login",
        data: { apiKey: FMP_API_KEY }
      }));
    };

    let authenticated = false;

    ws.onmessage = (event) => {
      try {
        const rawData = typeof event.data === 'string' ? event.data : event.data.toString();
        const msg = JSON.parse(rawData);

        // Handle login response
        if (msg.event === "login" || msg.status === "connected" || msg.message?.includes("Authenticated")) {
          console.log("[FMP WS] Authenticated successfully");
          authenticated = true;

          // Subscribe to all symbols
          console.log(`[FMP WS] Subscribing to ${symbols.length} symbols...`);
          ws.send(JSON.stringify({
            event: "subscribe",
            data: { ticker: symbols.map(s => s.toLowerCase()) }
          }));

          resolve(ws);
          return;
        }

        // Handle subscription confirmation
        if (msg.event === "subscribe") {
          console.log("[FMP WS] Subscription confirmed");
          return;
        }

        // Handle price updates
        if (msg.s && msg.type) {
          const symbol = msg.s.toUpperCase();
          const timestamp = msg.t ? new Date(msg.t).toISOString() : new Date().toISOString();

          if (msg.type === "T" && msg.lp) {
            // Trade message
            onTrade(symbol, msg.lp, timestamp);
          } else if (msg.type === "Q" && (msg.bp || msg.ap)) {
            // Quote message
            onQuote(symbol, msg.bp || 0, msg.ap || 0, timestamp);
          }
          return;
        }

        // Handle errors
        if (msg.error || msg.status === "error") {
          console.error("[FMP WS] Error:", msg.error || msg.message);
          if (!authenticated) {
            reject(new Error(`FMP auth failed: ${msg.error || msg.message}`));
          }
        }

      } catch (e) {
        console.error("[FMP WS] Parse error:", e);
      }
    };

    ws.onerror = (error) => {
      console.error("[FMP WS] WebSocket error:", error);
      reject(error);
    };

    ws.onclose = (event) => {
      console.log(`[FMP WS] Closed: code=${event.code}, reason=${event.reason}`);
    };

    // Timeout for authentication
    setTimeout(() => {
      if (!authenticated) {
        console.log("[FMP WS] Auth timeout, resolving anyway...");
        resolve(ws);
      }
    }, 5000);
  });
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

  // SSE stream with FMP WebSocket
  let stockWs: WebSocket | null = null;
  let isAborted = false;

  // Price state
  let stockPrices: Record<string, any> = {};
  let cryptoPrices: Record<string, { price: number; change24h: number }> = {};

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
        sendEvent(initialData);
        console.log("[Stream] Sent initial data");
      } catch (error) {
        console.error("Initial fetch error:", error);
        sendEvent({ error: "Failed to fetch initial prices" });
      }

      // Track WebSocket status
      let wsConnected = false;

      // Connect to FMP WebSocket for real-time stock updates
      if (FMP_API_KEY) {
        try {
          stockWs = await createFMPWebSocket(
            STOCK_TICKERS,
            // On trade
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

                sendEvent({
                  type: "trade",
                  symbol,
                  price,
                  change24h,
                  timestamp,
                  assetType: "stock",
                });
              }
            },
            // On quote
            (symbol, bid, ask, timestamp) => {
              if (stockPrices[symbol] && (bid > 0 || ask > 0)) {
                const midPrice = bid > 0 && ask > 0 ? (bid + ask) / 2 : (bid || ask);
                const prevClose = stockPrices[symbol].prevClose || stockPrices[symbol].price;
                const change24h = prevClose > 0 ? ((midPrice - prevClose) / prevClose) * 100 : 0;

                stockPrices[symbol] = {
                  ...stockPrices[symbol],
                  price: midPrice,
                  bid,
                  ask,
                  change24h,
                  lastQuote: timestamp,
                };

                sendEvent({
                  type: "quote",
                  symbol,
                  price: midPrice,
                  bid,
                  ask,
                  change24h,
                  timestamp,
                  assetType: "stock",
                });
              }
            }
          );
          wsConnected = true;
          console.log("[Stream] FMP WebSocket connected");
        } catch (e: any) {
          console.error("[Stream] FMP WebSocket failed:", e?.message || e);
        }
      }

      // Fallback polling if WebSocket failed
      let pollInterval: NodeJS.Timeout | null = null;
      if (!wsConnected) {
        console.log("[Stream] Using polling fallback");
        let tickCount = 0;
        pollInterval = setInterval(async () => {
          if (isAborted) return;
          tickCount++;
          try {
            if (tickCount % 3 === 0) {
              // Full update every 15 seconds
              const data = await fetchAllPrices();
              stockPrices = data.stocks;
              cryptoPrices = data.crypto;
              sendEvent(data);
            } else {
              // Crypto-only update
              const crypto = await fetchCryptoPrices();
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

      // Periodic crypto refresh (every 30 seconds)
      const cryptoInterval = setInterval(async () => {
        if (isAborted) return;
        try {
          const crypto = await fetchCryptoPrices();
          cryptoPrices = crypto;
          sendEvent({
            crypto,
            timestamp: new Date().toISOString(),
            partialUpdate: true,
          });
        } catch (e) {
          console.error("Crypto refresh error:", e);
        }
      }, 30000);

      // Periodic full refresh for market caps (every 60 seconds)
      const fullRefreshInterval = setInterval(async () => {
        if (isAborted) return;
        try {
          const data = await fetchAllPrices();
          // Merge with real-time prices if WS active
          if (wsConnected) {
            for (const [symbol, rtData] of Object.entries(stockPrices)) {
              if (data.stocks[symbol] && (rtData.lastTrade || rtData.lastQuote)) {
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
        clearInterval(cryptoInterval);
        clearInterval(fullRefreshInterval);
        if (pollInterval) clearInterval(pollInterval);
        if (stockWs) {
          stockWs.close();
          stockWs = null;
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
