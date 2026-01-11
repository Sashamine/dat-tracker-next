// Alpaca API Service for free real-time stock data (IEX feed)
// Docs: https://docs.alpaca.markets/docs/real-time-stock-pricing-data
// Free tier uses IEX data (~2-3% of market volume, but real-time)

const ALPACA_API_KEY = process.env.ALPACA_API_KEY || "";
const ALPACA_SECRET_KEY = process.env.ALPACA_SECRET_KEY || "";

// Use IEX feed (free) instead of SIP (paid)
const DATA_BASE_URL = "https://data.alpaca.markets";
const FEED = "iex"; // Free tier - real-time IEX data

// Headers for Alpaca API authentication
const getHeaders = () => ({
  "APCA-API-KEY-ID": ALPACA_API_KEY,
  "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
});

// Crypto symbol mapping (Alpaca uses SYMBOL/USD format)
export const CRYPTO_SYMBOLS: Record<string, string> = {
  ETH: "ETH/USD",
  BTC: "BTC/USD",
  SOL: "SOL/USD",
  LINK: "LINK/USD",
  XRP: "XRP/USD",
  LTC: "LTC/USD",
  DOGE: "DOGE/USD",
  AVAX: "AVAX/USD",
  // Note: Some altcoins may not be available on Alpaca
  // HYPE, BNB, TAO, TRX, ZEC, SUI, ADA, HBAR - check availability
};

// Stock tickers (must match companies.ts)
export const STOCK_TICKERS = [
  // ETH
  "BMNR", "SBET", "ETHM", "BTBT", "BTCS", "GAME", "FGNX", "ICG",
  // BTC
  "MSTR", "XXI", "BSTR", "MARA", "RIOT", "CLSK", "ASST", "SMLR", "KULR", "DJT", "NAKA", "NXTT", "GNS", "ABTC",
  // SOL
  "FWDI", "HSDT", "DFDV", "UPXI", "STKE",
  // HYPE
  "PURR", "HYPD",
  // BNB
  "BNC", "WINT",
  // TAO
  "TAOX", "TWAV",
  // LINK
  "CWD",
  // TRX
  "TRON",
  // XRP
  "XRPN", "VVPR", "WKSP",
  // ZEC
  "CYPH", "RELI",
  // LTC
  "LITS",
  // SUI
  "SUIG",
  // DOGE
  "ZONE", "TBH", "BTOG",
  // AVAX
  "AVX",
  // HBAR
  "IMTL",
];

export interface AlpacaStockQuote {
  symbol: string;
  ap: number; // ask price
  as: number; // ask size
  bp: number; // bid price
  bs: number; // bid size
  t: string;  // timestamp
}

export interface AlpacaStockTrade {
  symbol: string;
  p: number;  // price
  s: number;  // size
  t: string;  // timestamp
}

export interface AlpacaStockBar {
  symbol: string;
  o: number;  // open
  h: number;  // high
  l: number;  // low
  c: number;  // close
  v: number;  // volume
  t: string;  // timestamp
  vw: number; // volume weighted average price
}

export interface AlpacaCryptoQuote {
  symbol: string;
  ap: number; // ask price
  as: number; // ask size
  bp: number; // bid price
  bs: number; // bid size
  t: string;  // timestamp
}

export interface AlpacaCryptoTrade {
  symbol: string;
  p: number;  // price
  s: number;  // size
  t: string;  // timestamp
}

// Fetch latest stock quotes (batch)
export async function getStockQuotes(symbols: string[]): Promise<Record<string, AlpacaStockQuote>> {
  if (!ALPACA_API_KEY || !ALPACA_SECRET_KEY) {
    throw new Error("Alpaca API keys not configured");
  }

  const response = await fetch(
    `${DATA_BASE_URL}/v2/stocks/quotes/latest?symbols=${symbols.join(",")}`,
    {
      headers: getHeaders(),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Alpaca stock quotes failed: ${response.status}`);
  }

  const data = await response.json();
  return data.quotes || {};
}

// Fetch latest stock trades (for last price)
export async function getStockTrades(symbols: string[]): Promise<Record<string, AlpacaStockTrade>> {
  if (!ALPACA_API_KEY || !ALPACA_SECRET_KEY) {
    throw new Error("Alpaca API keys not configured");
  }

  const response = await fetch(
    `${DATA_BASE_URL}/v2/stocks/trades/latest?symbols=${symbols.join(",")}`,
    {
      headers: getHeaders(),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Alpaca stock trades failed: ${response.status}`);
  }

  const data = await response.json();
  return data.trades || {};
}

// Fetch latest stock bars (for daily stats)
export async function getStockBars(symbols: string[]): Promise<Record<string, AlpacaStockBar>> {
  if (!ALPACA_API_KEY || !ALPACA_SECRET_KEY) {
    throw new Error("Alpaca API keys not configured");
  }

  const response = await fetch(
    `${DATA_BASE_URL}/v2/stocks/bars/latest?symbols=${symbols.join(",")}`,
    {
      headers: getHeaders(),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Alpaca stock bars failed: ${response.status}`);
  }

  const data = await response.json();
  return data.bars || {};
}

// Fetch stock snapshots (combines quote, trade, bar, prevDailyBar)
// Uses IEX feed (free) - real-time but ~2-3% market volume
export async function getStockSnapshots(symbols: string[]): Promise<Record<string, any>> {
  if (!ALPACA_API_KEY || !ALPACA_SECRET_KEY) {
    throw new Error("Alpaca API keys not configured");
  }

  const response = await fetch(
    `${DATA_BASE_URL}/v2/stocks/snapshots?symbols=${symbols.join(",")}&feed=${FEED}`,
    {
      headers: getHeaders(),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Alpaca stock snapshots failed: ${response.status}`);
  }

  // Stock API returns data directly (not wrapped in snapshots)
  return response.json();
}

// Fetch latest crypto quotes (batch)
export async function getCryptoQuotes(symbols: string[]): Promise<Record<string, AlpacaCryptoQuote>> {
  if (!ALPACA_API_KEY || !ALPACA_SECRET_KEY) {
    throw new Error("Alpaca API keys not configured");
  }

  // URL-encode symbols (e.g., "ETH/USD" -> "ETH%2FUSD")
  const encodedSymbols = symbols.map(s => encodeURIComponent(s)).join(",");
  const response = await fetch(
    `${DATA_BASE_URL}/v1beta3/crypto/us/latest/quotes?symbols=${encodedSymbols}`,
    {
      headers: getHeaders(),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Alpaca crypto quotes failed: ${response.status}`);
  }

  const data = await response.json();
  return data.quotes || {};
}

// Fetch latest crypto trades (for last price)
export async function getCryptoTrades(symbols: string[]): Promise<Record<string, AlpacaCryptoTrade>> {
  if (!ALPACA_API_KEY || !ALPACA_SECRET_KEY) {
    throw new Error("Alpaca API keys not configured");
  }

  // URL-encode symbols (e.g., "ETH/USD" -> "ETH%2FUSD")
  const encodedSymbols = symbols.map(s => encodeURIComponent(s)).join(",");
  const response = await fetch(
    `${DATA_BASE_URL}/v1beta3/crypto/us/latest/trades?symbols=${encodedSymbols}`,
    {
      headers: getHeaders(),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Alpaca crypto trades failed: ${response.status}`);
  }

  const data = await response.json();
  return data.trades || {};
}

// Fetch crypto snapshots (combines trade, quote, bar, prevDailyBar)
export async function getCryptoSnapshots(symbols: string[]): Promise<Record<string, any>> {
  if (!ALPACA_API_KEY || !ALPACA_SECRET_KEY) {
    throw new Error("Alpaca API keys not configured");
  }

  // URL-encode symbols (e.g., "ETH/USD" -> "ETH%2FUSD")
  const encodedSymbols = symbols.map(s => encodeURIComponent(s)).join(",");
  const response = await fetch(
    `${DATA_BASE_URL}/v1beta3/crypto/us/snapshots?symbols=${encodedSymbols}`,
    {
      headers: getHeaders(),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Alpaca crypto snapshots failed: ${response.status}`);
  }

  const data = await response.json();
  return data.snapshots || {};
}

// Check if US stock market is open (9:30 AM - 4:00 PM ET, Mon-Fri)
export function isMarketOpen(): boolean {
  const now = new Date();
  const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = etTime.getDay();
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // Monday = 1, Friday = 5
  const isWeekday = day >= 1 && day <= 5;
  // 9:30 AM = 570 minutes, 4:00 PM = 960 minutes
  const isDuringHours = timeInMinutes >= 570 && timeInMinutes < 960;

  return isWeekday && isDuringHours;
}

// Check if it's extended hours (pre-market: 4 AM - 9:30 AM, after-hours: 4 PM - 8 PM ET)
export function isExtendedHours(): boolean {
  const now = new Date();
  const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = etTime.getDay();
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  const isWeekday = day >= 1 && day <= 5;
  // Pre-market: 4:00 AM (240) - 9:30 AM (570)
  // After-hours: 4:00 PM (960) - 8:00 PM (1200)
  const isPreMarket = timeInMinutes >= 240 && timeInMinutes < 570;
  const isAfterHours = timeInMinutes >= 960 && timeInMinutes < 1200;

  return isWeekday && (isPreMarket || isAfterHours);
}
