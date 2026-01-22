import { NextResponse } from "next/server";
import { allCompanies } from "@/lib/data/companies";
import { calculateMNAV } from "@/lib/calculations";
import { getMarketCapForMnav, StockPriceData } from "@/lib/utils/market-cap";

// In-memory storage for mNAV history snapshots
// Note: This will reset on cold starts. For production, use Vercel KV or a database.
const mnavHistory: MNAVSnapshot[] = [];

interface MNAVSnapshot {
  timestamp: string;
  date: string;
  median: number;
  average: number;
  min: number;
  max: number;
  count: number;
  btcPrice: number;
  ethPrice: number;
}

// Calculate median of array
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Fetch current crypto prices
async function fetchCryptoPrices(): Promise<Record<string, number>> {
  try {
    const ids = "bitcoin,ethereum,solana,chainlink,ripple,litecoin,dogecoin,avalanche-2,cardano,hedera-hashgraph,bittensor,tron,binancecoin,zcash,sui,hyperliquid";
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      { cache: "no-store" }
    );
    const data = await response.json();

    return {
      BTC: data.bitcoin?.usd || 0,
      ETH: data.ethereum?.usd || 0,
      SOL: data.solana?.usd || 0,
      LINK: data.chainlink?.usd || 0,
      XRP: data.ripple?.usd || 0,
      LTC: data.litecoin?.usd || 0,
      DOGE: data.dogecoin?.usd || 0,
      AVAX: data["avalanche-2"]?.usd || 0,
      ADA: data.cardano?.usd || 0,
      HBAR: data["hedera-hashgraph"]?.usd || 0,
      TAO: data.bittensor?.usd || 0,
      TRX: data.tron?.usd || 0,
      BNB: data.binancecoin?.usd || 0,
      ZEC: data.zcash?.usd || 0,
      SUI: data.sui?.usd || 0,
      HYPE: data.hyperliquid?.usd || 0,
    };
  } catch {
    return {};
  }
}

// Fetch stock data from FMP
async function fetchStockData(): Promise<Record<string, { price: number; marketCap: number }>> {
  const FMP_API_KEY = process.env.FMP_API_KEY;
  if (!FMP_API_KEY) return {};

  try {
    const tickers = allCompanies.map(c => c.ticker).join(",");
    const response = await fetch(
      `https://financialmodelingprep.com/stable/batch-quote?symbols=${tickers}&apikey=${FMP_API_KEY}`,
      { cache: "no-store" }
    );
    const data = await response.json();

    const result: Record<string, { price: number; marketCap: number }> = {};
    if (Array.isArray(data)) {
      for (const quote of data) {
        if (quote.symbol && quote.price) {
          result[quote.symbol] = {
            price: quote.price,
            marketCap: quote.marketCap || 0
          };
        }
      }
    }
    return result;
  } catch {
    return {};
  }
}

// Calculate current mNAV stats
async function calculateMNAVStats(): Promise<MNAVSnapshot | null> {
  const [cryptoPrices, stockData] = await Promise.all([
    fetchCryptoPrices(),
    fetchStockData()
  ]);

  if (Object.keys(cryptoPrices).length === 0) {
    return null;
  }

  const mnavs: number[] = [];

  for (const company of allCompanies) {
    const cryptoPrice = cryptoPrices[company.asset] || 0;
    const stock = stockData[company.ticker];
    // Use getMarketCapForMnav for consistency with frontend
    const stockPriceData: StockPriceData | null = stock ? {
      price: stock.price || 0,
      marketCap: stock.marketCap || 0,
    } : null;
    const { marketCap } = await getMarketCapForMnav(company, stockPriceData);

    if (cryptoPrice > 0 && marketCap > 0) {
      const mnav = calculateMNAV(marketCap, company.holdings, cryptoPrice, company.cashReserves || 0, company.otherInvestments || 0, company.totalDebt || 0, company.preferredEquity || 0, company.restrictedCash || 0);
      if (mnav && mnav > 0 && mnav < 10) { // Filter outliers (consistent with useMNAVStats)
        mnavs.push(mnav);
      }
    }
  }

  if (mnavs.length === 0) return null;

  const now = new Date();
  return {
    timestamp: now.toISOString(),
    date: now.toISOString().split("T")[0],
    median: median(mnavs),
    average: mnavs.reduce((a, b) => a + b, 0) / mnavs.length,
    min: Math.min(...mnavs),
    max: Math.max(...mnavs),
    count: mnavs.length,
    btcPrice: cryptoPrices.BTC || 0,
    ethPrice: cryptoPrices.ETH || 0,
  };
}

// GET: Return mNAV history
export async function GET() {
  // Calculate current snapshot
  const current = await calculateMNAVStats();

  // Check if we should add a new snapshot (once per hour max)
  if (current) {
    const lastSnapshot = mnavHistory[mnavHistory.length - 1];
    const hourAgo = Date.now() - 60 * 60 * 1000;

    if (!lastSnapshot || new Date(lastSnapshot.timestamp).getTime() < hourAgo) {
      mnavHistory.push(current);

      // Keep last 30 days of hourly data (720 entries)
      if (mnavHistory.length > 720) {
        mnavHistory.shift();
      }
    }
  }

  return NextResponse.json({
    current,
    history: mnavHistory,
    historyCount: mnavHistory.length,
    timestamp: new Date().toISOString()
  });
}

// POST: Force a new snapshot (for manual updates or cron jobs)
export async function POST() {
  const snapshot = await calculateMNAVStats();

  if (snapshot) {
    mnavHistory.push(snapshot);

    // Keep last 30 days
    if (mnavHistory.length > 720) {
      mnavHistory.shift();
    }

    return NextResponse.json({
      success: true,
      snapshot,
      historyCount: mnavHistory.length
    });
  }

  return NextResponse.json({ success: false, error: "Failed to calculate mNAV" }, { status: 500 });
}
