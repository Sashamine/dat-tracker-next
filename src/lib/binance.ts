// Binance API Service for free real-time crypto prices
// Docs: https://binance-docs.github.io/apidocs/spot/en/
// No API key needed for public market data

const BINANCE_BASE_URL = "https://api.binance.com";

// Map our symbols to Binance trading pairs
export const BINANCE_SYMBOLS: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
  BNB: "BNBUSDT",
  XRP: "XRPUSDT",
  DOGE: "DOGEUSDT",
  ADA: "ADAUSDT",
  AVAX: "AVAXUSDT",
  LINK: "LINKUSDT",
  TRX: "TRXUSDT",
  LTC: "LTCUSDT",
  SUI: "SUIUSDT",
  HBAR: "HBARUSDT",
  TAO: "TAOUSDT",
  ZEC: "ZECUSDT",
};

// Coins not on Binance - need CoinGecko fallback
export const NON_BINANCE_COINS = ["HYPE"];

interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
}

// Fetch all crypto prices in one call (free, no auth)
export async function getBinancePrices(): Promise<Record<string, { price: number; change24h: number }>> {
  try {
    // Get 24hr ticker for all symbols we care about
    const symbols = Object.values(BINANCE_SYMBOLS);
    const response = await fetch(
      `${BINANCE_BASE_URL}/api/v3/ticker/24hr?symbols=${JSON.stringify(symbols)}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data: BinanceTicker[] = await response.json();

    const result: Record<string, { price: number; change24h: number }> = {};

    for (const [symbol, binanceSymbol] of Object.entries(BINANCE_SYMBOLS)) {
      const ticker = data.find(t => t.symbol === binanceSymbol);
      if (ticker) {
        result[symbol] = {
          price: parseFloat(ticker.lastPrice),
          change24h: parseFloat(ticker.priceChangePercent),
        };
      }
    }

    return result;
  } catch (error) {
    console.error("Binance fetch error:", error);
    return {};
  }
}

// Fetch single price (useful for specific lookups)
export async function getBinancePrice(symbol: string): Promise<{ price: number; change24h: number } | null> {
  const binanceSymbol = BINANCE_SYMBOLS[symbol];
  if (!binanceSymbol) return null;

  try {
    const response = await fetch(
      `${BINANCE_BASE_URL}/api/v3/ticker/24hr?symbol=${binanceSymbol}`,
      { cache: "no-store" }
    );

    if (!response.ok) return null;

    const data: BinanceTicker = await response.json();
    return {
      price: parseFloat(data.lastPrice),
      change24h: parseFloat(data.priceChangePercent),
    };
  } catch (error) {
    console.error(`Binance fetch error for ${symbol}:`, error);
    return null;
  }
}
