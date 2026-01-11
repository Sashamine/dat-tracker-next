// Crypto prices - uses Alpaca (primary) + CoinGecko (fallback for altcoins)
import { getCryptoSnapshots, CRYPTO_SYMBOLS } from "./alpaca";

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

// Coins NOT on Alpaca - need CoinGecko
const COINGECKO_ONLY: Record<string, string> = {
  HYPE: "hyperliquid",
  BNB: "binancecoin",
  TAO: "bittensor",
  TRX: "tron",
  ZEC: "zcash",
  SUI: "sui",
  ADA: "cardano",
  HBAR: "hedera-hashgraph",
};

// Cache for CoinGecko (reduce rate limit hits)
let geckoCache: { data: Record<string, { price: number; change24h: number }>; timestamp: number } | null = null;
const GECKO_CACHE_TTL = 60 * 1000; // 60 seconds

// Fetch altcoins from CoinGecko (cached)
async function fetchCoinGeckoAltcoins(): Promise<Record<string, { price: number; change24h: number }>> {
  if (geckoCache && Date.now() - geckoCache.timestamp < GECKO_CACHE_TTL) {
    return geckoCache.data;
  }

  try {
    const ids = Object.values(COINGECKO_ONLY).join(",");
    const url = COINGECKO_BASE_URL + "/simple/price?ids=" + ids + "&vs_currencies=usd&include_24hr_change=true";
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      console.error("CoinGecko error:", response.status);
      return geckoCache?.data || {};
    }

    const data = await response.json();
    const result: Record<string, { price: number; change24h: number }> = {};

    for (const [symbol, geckoId] of Object.entries(COINGECKO_ONLY)) {
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

// Main function - Alpaca for major coins, CoinGecko for altcoins
export async function getBinancePrices(): Promise<Record<string, { price: number; change24h: number }>> {
  const result: Record<string, { price: number; change24h: number }> = {};

  try {
    // Fetch from Alpaca (BTC, ETH, SOL, etc.)
    const alpacaSymbols = Object.values(CRYPTO_SYMBOLS);
    const snapshots = await getCryptoSnapshots(alpacaSymbols);

    for (const [symbol, alpacaSymbol] of Object.entries(CRYPTO_SYMBOLS)) {
      const snapshot = snapshots[alpacaSymbol];
      if (snapshot) {
        const price = snapshot.latestTrade?.p || snapshot.latestQuote?.ap || 0;
        const prevClose = snapshot.prevDailyBar?.c || price;
        const change24h = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
        
        result[symbol] = { price, change24h };
      }
    }

    console.log("Alpaca crypto:", Object.keys(result).length, "coins");
  } catch (error) {
    console.error("Alpaca crypto error:", error);
  }

  try {
    // Fetch altcoins from CoinGecko (cached)
    const altcoins = await fetchCoinGeckoAltcoins();
    Object.assign(result, altcoins);
    console.log("Total crypto prices:", Object.keys(result).length);
  } catch (error) {
    console.error("CoinGecko altcoin error:", error);
  }

  return result;
}

// Single price lookup
export async function getBinancePrice(symbol: string): Promise<{ price: number; change24h: number } | null> {
  const prices = await getBinancePrices();
  return prices[symbol] || null;
}
