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

// Check if a crypto symbol is available on Alpaca
export function isAlpacaCrypto(symbol: string): boolean {
  return symbol in CRYPTO_SYMBOLS;
}

// Stock tickers (must match companies.ts)
export const STOCK_TICKERS = [
  // ETH
  "BMNR", "SBET", "ETHM", "BTBT", "BTCS", "GAME", "FGNX",
  // BTC - US
  "MSTR", "XXI", "CEPO", "MARA", "RIOT", "CLSK", "ASST", "SMLR", "KULR", "DJT", "NAKA", "NXTT", "ABTC",
  "SQNS", "DDC", "FLD", "ZOOZ", "USBC", "ARLP", "LMFA", "FUFU",  // Added 2026-02-02
  // BTC - International
  "3350.T",    // Metaplanet (Japan)
  "0434.HK",   // Boyaa Interactive (Hong Kong)
  "ALCPB",     // The Blockchain Group (France/Euronext)
  "H100.ST",   // H100 Group (Sweden)
  "3825.T",    // Remixpoint (Japan) - Added 2026-02-02
  // "3189.T" removed - Alpaca doesn't support Tokyo Stock Exchange, use FALLBACK_STOCKS
  "SATS.L",    // Satsuma Technology (UK) - Added 2026-02-02
  // "SWC" removed - Alpaca returns wrong US stock, use FALLBACK_STOCKS for UK AQUIS
  "CASH3.SA",  // Méliuz (Brazil B3) - Added 2026-02-02
  "377030.KQ", // bitmax (South Korea) - Added 2026-02-02
  "SRAG.DU",   // Samara Asset Group (Germany) - Added 2026-02-02
  "PHX.AD",    // Phoenix Group (UAE) - Added 2026-02-02
  // "DCC.AX" removed - fetched via Yahoo Finance (FMP doesn't support ASX)
  // BTC - Canada
  "BTCT.V",    // Bitcoin Treasury Corp - Added 2026-02-02
  "NDA.V",     // Neptune Digital - Added 2026-02-02
  "DMGI.V",    // DMG Blockchain - Added 2026-02-02
  "HIVE",      // HIVE Digital - Added 2026-02-02
  // BTC - Norway
  "AKER",      // Aker ASA - Added 2026-02-02
  // SOL
  "FWDI", "HSDT", "DFDV", "UPXI", "STKE",
  // HYPE
  "PURR", "HYPD",
  // BNB
  "BNC", "NA",  // NA = Nano Labs
  // TAO
  "TAOX", "XTAIF", "TWAV",
  // LINK
  "CWD",
  // TRX
  "TRON",
  // XRP
  "XRPN",
  // ZEC
  "CYPH",
  // LTC
  "LITS", "LUXFF",  // LUXFF = Luxxfolio (OTC)
  // SUI
  "SUIG",
  // DOGE
  "ZONE", "TBH", "BTOG",
  // AVAX
  "AVX",
  // HBAR - IHLDF moved to FMP (OTC coverage)
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

// Fetch historical crypto bars
// timeframe: "1Min", "5Min", "15Min", "1Hour", "1Day"
export interface CryptoBar {
  t: string;  // timestamp (ISO 8601)
  o: number;  // open
  h: number;  // high
  l: number;  // low
  c: number;  // close
  v: number;  // volume
  vw: number; // volume weighted average price
  n: number;  // number of trades
}

export async function getCryptoBars(
  symbol: string,  // e.g., "BTC/USD"
  timeframe: string,  // e.g., "5Min", "1Hour", "1Day"
  start: string,  // ISO 8601 timestamp
  end?: string  // ISO 8601 timestamp (optional, defaults to now)
): Promise<CryptoBar[]> {
  if (!ALPACA_API_KEY || !ALPACA_SECRET_KEY) {
    throw new Error("Alpaca API keys not configured");
  }

  const encodedSymbol = encodeURIComponent(symbol);
  let url = `${DATA_BASE_URL}/v1beta3/crypto/us/bars?symbols=${encodedSymbol}&timeframe=${timeframe}&start=${start}`;
  if (end) {
    url += `&end=${end}`;
  }
  url += "&limit=10000";  // Max limit

  const response = await fetch(url, {
    headers: getHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error(`Alpaca crypto bars failed: ${response.status}`);
    return [];
  }

  const data = await response.json();
  // Bars are returned as { bars: { "BTC/USD": [...] } }
  return data.bars?.[symbol] || [];
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
