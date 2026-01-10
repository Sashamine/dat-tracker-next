import { NextResponse } from "next/server";

// FMP API Key - using stable endpoint (not legacy v3)
const FMP_API_KEY = process.env.FMP_API_KEY || "ZIzI2F5LvsoeNW2FhkPUtzcBZEItvxmU";

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

    // Fetch stock prices from FMP (using stable endpoint - not legacy v3)
    const stockPrices: Record<string, any> = {};

    // Fetch all stocks in parallel using stable endpoint
    const stockPromises = STOCK_TICKERS.map(async (ticker) => {
      try {
        const response = await fetch(
          `https://financialmodelingprep.com/stable/quote?symbol=${ticker}&apikey=${FMP_API_KEY}`,
          { next: { revalidate: 30 } }
        );
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const stock = data[0];
          return {
            symbol: stock.symbol,
            price: stock.price,
            change24h: stock.changePercentage,
            volume: stock.volume,
            marketCap: stock.marketCap,
          };
        }
        return null;
      } catch (e) {
        console.error(`Error fetching ${ticker}:`, e);
        return null;
      }
    });

    const stockResults = await Promise.all(stockPromises);
    for (const stock of stockResults) {
      if (stock) {
        stockPrices[stock.symbol] = {
          price: stock.price,
          change24h: stock.change24h,
          volume: stock.volume,
          marketCap: stock.marketCap,
        };
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
