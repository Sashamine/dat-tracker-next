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

    // Fetch stock prices from Yahoo Finance (no API key needed)
    const stockPrices: Record<string, any> = {};

    // Split tickers into chunks for Yahoo Finance
    const chunks = [];
    for (let i = 0; i < STOCK_TICKERS.length; i += 10) {
      chunks.push(STOCK_TICKERS.slice(i, i + 10));
    }

    for (const chunk of chunks) {
      try {
        const tickers = chunk.join(",");
        const yahooResponse = await fetch(
          `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers}`,
          {
            next: { revalidate: 30 },
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          }
        );
        const yahooData = await yahooResponse.json();

        if (yahooData?.quoteResponse?.result) {
          for (const stock of yahooData.quoteResponse.result) {
            stockPrices[stock.symbol] = {
              price: stock.regularMarketPrice || 0,
              change24h: stock.regularMarketChangePercent || 0,
              volume: stock.regularMarketVolume || 0,
              marketCap: stock.marketCap || 0,
            };
          }
        }
      } catch (e) {
        console.error("Error fetching stock chunk from Yahoo:", e);
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
