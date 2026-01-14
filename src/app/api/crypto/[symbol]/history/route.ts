import { NextRequest, NextResponse } from "next/server";

interface CryptoHistoryPoint {
  time: string;
  price: number;
}

// Map our asset symbols to CoinGecko IDs
const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  LINK: "chainlink",
  XRP: "ripple",
  LTC: "litecoin",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  ADA: "cardano",
  HBAR: "hedera-hashgraph",
  TAO: "bittensor",
  TRX: "tron",
  BNB: "binancecoin",
  ZEC: "zcash",
  SUI: "sui",
  HYPE: "hyperliquid",
};

// Days to fetch per range
const RANGE_DAYS: Record<string, number> = {
  "1d": 1,
  "7d": 7,
  "1mo": 30,
  "1y": 365,
  "all": 1825, // 5 years
};

// Cache for historical data (5 minute TTL)
const cache: Map<string, { data: CryptoHistoryPoint[]; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "1y";

  const coinId = COINGECKO_IDS[symbol.toUpperCase()];
  if (!coinId) {
    return NextResponse.json({ error: "Unknown crypto symbol" }, { status: 400 });
  }

  const days = RANGE_DAYS[range] || 365;
  const cacheKey = `${symbol}-${range}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return NextResponse.json([]);
    }

    const data = await response.json();
    const prices: CryptoHistoryPoint[] = (data.prices || []).map(([timestamp, price]: [number, number]) => ({
      time: new Date(timestamp).toISOString().split("T")[0],
      price,
    }));

    // Deduplicate by date (keep last price of each day)
    const byDate = new Map<string, number>();
    for (const p of prices) {
      byDate.set(p.time, p.price);
    }
    const deduped = Array.from(byDate.entries())
      .map(([time, price]) => ({ time, price }))
      .sort((a, b) => a.time.localeCompare(b.time));

    cache.set(cacheKey, { data: deduped, timestamp: Date.now() });
    return NextResponse.json(deduped);
  } catch (error) {
    console.error("Error fetching crypto history:", error);
    return NextResponse.json([]);
  }
}
