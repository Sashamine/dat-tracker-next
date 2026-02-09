import { NextResponse } from "next/server";
import { allCompanies } from "@/lib/data/companies";
import { Company } from "@/lib/types";
import { getCompanyMNAV } from "@/lib/utils/mnav-calculation";

/**
 * GET /api/mnav/yesterday
 * 
 * Returns yesterday's mNAV for all companies by:
 * 1. Fetching yesterday's stock and crypto prices
 * 2. Calculating mNAV using the same getCompanyMNAV function
 * 
 * This ensures 24h mNAV change is measured (not estimated).
 */

interface YesterdayMnavResult {
  [ticker: string]: {
    mnav: number | null;
    stockPrice: number;
    cryptoPrice: number;
    date: string;
  };
}

// Cache for 5 minutes
let cache: { data: YesterdayMnavResult; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET() {
  // Check cache
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    // Get unique assets needed
    const assets: string[] = [...new Set(allCompanies.map((c: Company) => c.asset))];
    const tickers: string[] = allCompanies.map((c: Company) => c.ticker);

    // Fetch yesterday's crypto prices (use 7d history, take yesterday)
    const cryptoPrices: Record<string, number> = {};
    for (const asset of assets) {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/crypto/${asset}/history?range=7d`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = await res.json();
          // Find yesterday's price (data is sorted, find entry from ~24h ago)
          const now = Date.now();
          const oneDayAgo = now - 24 * 60 * 60 * 1000;
          
          // Find closest price point to 24h ago
          let closest = data[0];
          let closestDiff = Infinity;
          for (const point of data) {
            const ts = parseInt(point.time) * 1000;
            const diff = Math.abs(ts - oneDayAgo);
            if (diff < closestDiff) {
              closestDiff = diff;
              closest = point;
            }
          }
          if (closest) {
            cryptoPrices[asset] = closest.price;
          }
        }
      } catch (e) {
        console.warn(`Failed to fetch ${asset} history:`, e);
      }
    }

    // Fetch yesterday's stock prices
    const stockPrices: Record<string, number> = {};
    for (const ticker of tickers) {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/stocks/${ticker}/history?range=7d&interval=1h`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = await res.json();
          const now = Date.now();
          const oneDayAgo = now - 24 * 60 * 60 * 1000;
          
          // Find closest price point to 24h ago
          let closest = data[0];
          let closestDiff = Infinity;
          for (const point of data) {
            const ts = parseInt(point.time) * 1000;
            const diff = Math.abs(ts - oneDayAgo);
            if (diff < closestDiff) {
              closestDiff = diff;
              closest = point;
            }
          }
          if (closest) {
            stockPrices[ticker] = closest.close;
          }
        }
      } catch (e) {
        console.warn(`Failed to fetch ${ticker} history:`, e);
      }
    }

    // Fetch current forex rates
    let forexRates: Record<string, number> = {};
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/prices`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        forexRates = data.forex || {};
      }
    } catch (e) {
      console.warn('Failed to fetch forex:', e);
    }

    // Calculate yesterday's mNAV for each company
    const result: YesterdayMnavResult = {};
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    for (const company of allCompanies) {
      const cryptoPrice = cryptoPrices[company.asset];
      const stockPrice = stockPrices[company.ticker];

      if (!cryptoPrice || !stockPrice) {
        result[company.ticker] = {
          mnav: null,
          stockPrice: stockPrice || 0,
          cryptoPrice: cryptoPrice || 0,
          date: yesterday,
        };
        continue;
      }

      // Build prices object for yesterday
      const yesterdayPrices = {
        crypto: {
          [company.asset]: { price: cryptoPrice, change24h: 0 },
        },
        stocks: {
          [company.ticker]: { price: stockPrice, change24h: 0, volume: 0, marketCap: 0 },
        },
        forex: forexRates,
      };

      // Calculate mNAV using same function as current
      const mnav = getCompanyMNAV(company, yesterdayPrices);

      result[company.ticker] = {
        mnav,
        stockPrice,
        cryptoPrice,
        date: yesterday,
      };
    }

    // Update cache
    cache = { data: result, timestamp: Date.now() };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error calculating yesterday mNAV:', error);
    return NextResponse.json({}, { status: 500 });
  }
}
