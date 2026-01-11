// CoinGecko API Service for free crypto prices
// Using CoinGecko instead of Binance (Binance blocks US servers with 451 error)
// Docs: https://www.coingecko.com/api/documentation

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

// Map our symbols to CoinGecko IDs
export const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  DOGE: "dogecoin",
  ADA: "cardano",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  TRX: "tron",
  LTC: "litecoin",
  SUI: "sui",
  HBAR: "hedera-hashgraph",
  TAO: "bittensor",
  ZEC: "zcash",
  HYPE: "hyperliquid",
};

// Fetch all crypto prices in one call (free, no auth)
export async function getBinancePrices(): Promise<Record<string, { price: number; change24h: number }>> {
  try {
    const ids = Object.values(COINGECKO_IDS).join(",");
    const response = await fetch(
      `${COINGECKO_BASE_URL}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
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

    return result;
  } catch (error) {
    console.error("CoinGecko fetch error:", error);
    return {};
  }
}

// Fetch single price (useful for specific lookups)
export async function getBinancePrice(symbol: string): Promise<{ price: number; change24h: number } | null> {
  const geckoId = COINGECKO_IDS[symbol];
  if (!geckoId) return null;

  try {
    const response = await fetch(
      `${COINGECKO_BASE_URL}/simple/price?ids=${geckoId}&vs_currencies=usd&include_24hr_change=true`,
      { cache: "no-store" }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const coinData = data[geckoId];
    if (!coinData) return null;

    return {
      price: coinData.usd || 0,
      change24h: coinData.usd_24h_change || 0,
    };
  } catch (error) {
    console.error(`CoinGecko fetch error for ${symbol}:`, error);
    return null;
  }
}
