/**
 * Historical mNAV API
 * 
 * GET /api/mnav/[ticker]?from=2024-01-01&to=2024-12-31
 * 
 * Returns daily mNAV values for a ticker over a date range.
 * Uses stored daily stock prices and historical crypto prices.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  calculateMNAVHistory,
  getAvailableDateRange,
  loadStockPrices,
} from "@/lib/mnav-calculator";
import { HOLDINGS_HISTORY, HoldingsSnapshot } from "@/lib/data/holdings-history";
import { allCompanies } from "@/lib/data/companies";

// CoinGecko historical prices endpoint
const COINGECKO_API = "https://api.coingecko.com/api/v3";

// Asset to CoinGecko ID mapping
const ASSET_TO_COINGECKO: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "ripple",
  DOGE: "dogecoin",
  LTC: "litecoin",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  TAO: "bittensor",
  HYPE: "hyperliquid",
  TRX: "tron",
  ZEC: "zcash",
  SUI: "sui",
  ADA: "cardano",
  HBAR: "hedera-hashgraph",
  BNB: "binancecoin",
};

/**
 * Fetch historical crypto prices from CoinGecko
 */
async function fetchCryptoPrices(
  asset: string,
  fromDate: string,
  toDate: string
): Promise<Map<string, number>> {
  const coinId = ASSET_TO_COINGECKO[asset];
  if (!coinId) {
    console.warn(`No CoinGecko ID for asset: ${asset}`);
    return new Map();
  }

  const from = Math.floor(new Date(fromDate).getTime() / 1000);
  const to = Math.floor(new Date(toDate).getTime() / 1000) + 86400;

  try {
    const response = await fetch(
      `${COINGECKO_API}/coins/${coinId}/market_chart/range?vs_currency=usd&from=${from}&to=${to}`,
      {
        headers: {
          Accept: "application/json",
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      console.error(`CoinGecko error: ${response.status}`);
      return new Map();
    }

    const data = await response.json();
    const prices = new Map<string, number>();

    for (const [timestamp, price] of data.prices || []) {
      const date = new Date(timestamp).toISOString().split("T")[0];
      // Keep last price of the day (closing)
      prices.set(date, price);
    }

    return prices;
  } catch (error) {
    console.error("CoinGecko fetch error:", error);
    return new Map();
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const searchParams = request.nextUrl.searchParams;

  // Validate ticker
  const company = allCompanies.find(
    (c) => c.ticker.toUpperCase() === ticker.toUpperCase()
  );
  if (!company) {
    return NextResponse.json(
      { error: "Company not found", ticker },
      { status: 404 }
    );
  }

  const normalizedTicker = company.ticker;

  // Check if we have data for this ticker
  const dateRange = getAvailableDateRange(normalizedTicker);
  if (!dateRange) {
    return NextResponse.json(
      {
        error: "No historical data available",
        ticker: normalizedTicker,
        hint: "Stock prices or holdings history missing",
      },
      { status: 404 }
    );
  }

  // Parse date range from query params
  const fromDate = searchParams.get("from") || dateRange.from;
  const toDate = searchParams.get("to") || dateRange.to;

  // Validate dates
  if (fromDate > toDate) {
    return NextResponse.json(
      { error: "Invalid date range: from > to" },
      { status: 400 }
    );
  }

  // Fetch crypto prices for the date range
  const cryptoPrices = await fetchCryptoPrices(company.asset, fromDate, toDate);
  if (cryptoPrices.size === 0) {
    return NextResponse.json(
      {
        error: "Could not fetch crypto prices",
        asset: company.asset,
      },
      { status: 500 }
    );
  }

  // Calculate mNAV history
  const mnavHistory = calculateMNAVHistory(
    normalizedTicker,
    fromDate,
    toDate,
    cryptoPrices
  );

  // Get holdings snapshots for reference
  const holdingsSnapshots = HOLDINGS_HISTORY[normalizedTicker]?.history || [];
  const relevantSnapshots = holdingsSnapshots.filter(
    (h: HoldingsSnapshot) => h.date >= fromDate && h.date <= toDate
  );

  return NextResponse.json({
    ticker: normalizedTicker,
    company: company.name,
    asset: company.asset,
    dateRange: {
      requested: { from: fromDate, to: toDate },
      available: dateRange,
    },
    dataPoints: mnavHistory.length,
    holdingsSnapshots: relevantSnapshots.length,
    data: mnavHistory,
    // Include holdings change dates for reference
    holdingsChanges: relevantSnapshots.map((h: HoldingsSnapshot) => ({
      date: h.date,
      holdings: h.holdings,
      shares: h.sharesOutstanding,
      source: h.source,
    })),
  });
}
