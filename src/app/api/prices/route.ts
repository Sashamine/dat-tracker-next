import { NextResponse } from "next/server";

// Cache for prices (simple in-memory cache)
let priceCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 30000; // 30 seconds

// CoinGecko ID mapping
const COINGECKO_IDS: Record<string, string> = {
  ETH: "ethereum",
  BTC: "bitcoin",
  SOL: "solana",
  HYPE: "hyperliquid",
  BNB: "binancecoin",
  TAO: "bittensor",
  LINK: "chainlink",
  TRX: "tron",
  XRP: "ripple",
  ZEC: "zcash",
  LTC: "litecoin",
  SUI: "sui",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  ADA: "cardano",
  HBAR: "hedera-hashgraph",
};

// All stock tickers
const STOCK_TICKERS = [
  // ETH
  "BMNR", "SBET", "ETHM", "BTBT", "ETHZ", "BTCS", "GAME", "FGNX", "ICG", "EXOD",
  // BTC
  "MSTR", "XXI", "BSTR", "MARA", "RIOT", "CLSK", "HUT", "ASST", "SMLR", "BITF", "WULF", "KULR", "CIFR", "ALTBG",
  // SOL
  "FWDI", "HSDT", "DFDV", "UPXI", "STKE",
  // HYPE
  "PURR", "HYPD",
  // BNB
  "BNC", "WINT", "NA",
  // TAO
  "TAOX", "XTAIF", "TWAV",
  // LINK
  "CWD",
  // TRX
  "TRON",
  // XRP
  "XRPN", "VVPR", "WKSP", "GPUS",
  // ZEC
  "CYPH", "RELI",
  // LTC
  "LITS", "LUXFF",
  // SUI
  "SUIG", "DEFT",
  // DOGE
  "ZONE", "TBH", "BTOG",
  // AVAX
  "AVX", "MLAC",
  // ADA
  "CBLO",
  // HBAR
  "IMTL",
];

export async function GET() {
  // Return cached data if fresh
  if (priceCache && Date.now() - priceCache.timestamp < CACHE_TTL) {
    return NextResponse.json(priceCache.data);
  }

  try {
    // Fetch crypto prices from CoinGecko
    const cryptoIds = Object.values(COINGECKO_IDS).join(",");
    const cryptoResponse = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds}&vs_currencies=usd&include_24hr_change=true`,
      { next: { revalidate: 30 } }
    );
    const cryptoPrices = await cryptoResponse.json();

    // Format crypto prices
    const formattedCrypto: Record<string, any> = {};
    for (const [symbol, geckoId] of Object.entries(COINGECKO_IDS)) {
      formattedCrypto[symbol] = {
        price: cryptoPrices[geckoId]?.usd || 0,
        change24h: cryptoPrices[geckoId]?.usd_24h_change || 0,
      };
    }

    // Fetch stock prices from Yahoo Finance v8 chart endpoint (no API key needed)
    const stockPrices: Record<string, any> = {};

    // Fetch stocks in parallel with concurrency limit
    const fetchStock = async (ticker: string) => {
      try {
        const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          }
        );
        const data = await response.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (meta) {
          const price = meta.regularMarketPrice || 0;
          const prevClose = meta.chartPreviousClose || price;
          const change24h = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
          return {
            ticker,
            data: {
              price,
              change24h,
              volume: meta.regularMarketVolume || 0,
              marketCap: 0, // Chart endpoint doesn't have market cap, will use company data
            }
          };
        }
      } catch (e) {
        // Silently fail for individual stocks
      }
      return null;
    };

    // Process in batches of 5 to avoid rate limiting
    for (let i = 0; i < STOCK_TICKERS.length; i += 5) {
      const batch = STOCK_TICKERS.slice(i, i + 5);
      const results = await Promise.all(batch.map(fetchStock));
      for (const result of results) {
        if (result) {
          stockPrices[result.ticker] = result.data;
        }
      }
    }

    const result = {
      crypto: formattedCrypto,
      stocks: stockPrices,
      timestamp: new Date().toISOString(),
    };

    // Update cache
    priceCache = { data: result, timestamp: Date.now() };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching prices:", error);
    // Return cached data if available, even if stale
    if (priceCache) {
      return NextResponse.json(priceCache.data);
    }
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}
