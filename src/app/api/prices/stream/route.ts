import { NextRequest } from "next/server";
import { STOCK_TICKERS } from "@/lib/alpaca";

// Use Edge Runtime for streaming support
export const runtime = "edge";

// FMP API Key
const FMP_API_KEY = process.env.FMP_API_KEY || "";

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

// Fallback prices for illiquid/international stocks (FMP may not have data)
const FALLBACK_STOCKS: Record<string, { price: number; marketCap: number }> = {
  // BTC International
  "3350.T": { price: 7500, marketCap: 3_500_000_000 },     // Metaplanet (JPY ~7500)
  "0434.HK": { price: 1.50, marketCap: 500_000_000 },      // Boyaa Interactive (HKD)
  "ALTBG": { price: 0.50, marketCap: 200_000_000 },        // Blockchain Group (EUR)
  "H100.ST": { price: 0.10, marketCap: 150_000_000 },      // H100 Group (SEK)
  // OTC/Illiquid
  "CEPO": { price: 10.50, marketCap: 3_500_000_000 },
  "XTAIF": { price: 0.75, marketCap: 20_000_000 },
  "IHLDF": { price: 0.10, marketCap: 10_000_000 },
  "LUXFF": { price: 0.05, marketCap: 3_860_000 },          // Luxxfolio (OTC)
  "NA": { price: 1.50, marketCap: 81_000_000 },            // Nano Labs
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
          const newStockPrices = await fetchFMPStockQuotes();
          const timestamp = new Date().toISOString();

          // Send individual trade events for changed prices
          for (const [symbol, data] of Object.entries(newStockPrices)) {
            const newPrice = (data as any).price || 0;
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

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        isAborted = true;
        clearInterval(stockPollInterval);
        clearInterval(cryptoInterval);
        clearInterval(fullRefreshInterval);
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
