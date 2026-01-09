import { NextResponse } from "next/server";

// FMP API Key (from your config)
const FMP_API_KEY = process.env.FMP_API_KEY || "ZIzI2F5LvsoeNW2FhkPUtzcBZEItvxmU";

// Cache for prices (simple in-memory cache)
let priceCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 30000; // 30 seconds

export async function GET() {
  // Return cached data if fresh
  if (priceCache && Date.now() - priceCache.timestamp < CACHE_TTL) {
    return NextResponse.json(priceCache.data);
  }

  try {
    // Fetch crypto prices from CoinGecko
    const cryptoIds = "ethereum,bitcoin,solana,hyperliquid,binancecoin,bittensor,chainlink";
    const cryptoResponse = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds}&vs_currencies=usd&include_24hr_change=true`,
      { next: { revalidate: 30 } }
    );
    const cryptoPrices = await cryptoResponse.json();

    // Fetch stock prices from FMP (batch quote)
    const tickers = "BMNR,SBET,ETHM,BTBT,MSTR,MARA,FWDI,DFDV,UPXI,SMLR";
    const stockResponse = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${tickers}?apikey=${FMP_API_KEY}`,
      { next: { revalidate: 30 } }
    );
    const stockData = await stockResponse.json();

    // Format stock prices
    const stockPrices: Record<string, any> = {};
    if (Array.isArray(stockData)) {
      for (const stock of stockData) {
        stockPrices[stock.symbol] = {
          price: stock.price,
          change24h: stock.changesPercentage,
          volume: stock.volume,
          marketCap: stock.marketCap,
        };
      }
    }

    // Format crypto prices
    const formattedCrypto: Record<string, any> = {
      ETH: {
        price: cryptoPrices.ethereum?.usd || 0,
        change24h: cryptoPrices.ethereum?.usd_24h_change || 0,
      },
      BTC: {
        price: cryptoPrices.bitcoin?.usd || 0,
        change24h: cryptoPrices.bitcoin?.usd_24h_change || 0,
      },
      SOL: {
        price: cryptoPrices.solana?.usd || 0,
        change24h: cryptoPrices.solana?.usd_24h_change || 0,
      },
      HYPE: {
        price: cryptoPrices.hyperliquid?.usd || 0,
        change24h: cryptoPrices.hyperliquid?.usd_24h_change || 0,
      },
      BNB: {
        price: cryptoPrices.binancecoin?.usd || 0,
        change24h: cryptoPrices.binancecoin?.usd_24h_change || 0,
      },
      TAO: {
        price: cryptoPrices.bittensor?.usd || 0,
        change24h: cryptoPrices.bittensor?.usd_24h_change || 0,
      },
      LINK: {
        price: cryptoPrices.chainlink?.usd || 0,
        change24h: cryptoPrices.chainlink?.usd_24h_change || 0,
      },
    };

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
