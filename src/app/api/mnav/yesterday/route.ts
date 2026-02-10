import { NextRequest, NextResponse } from "next/server";
import { allCompanies } from "@/lib/data/companies";
import { Company } from "@/lib/types";
import { getCompanyMNAV } from "@/lib/utils/mnav-calculation";
import { MSTR_PROVENANCE } from "@/lib/data/provenance/mstr";
import { BMNR_PROVENANCE, estimateBMNRShares } from "@/lib/data/provenance/bmnr";
import { getEffectiveShares } from "@/lib/data/dilutive-instruments";

/**
 * GET /api/mnav/yesterday
 * 
 * Returns yesterday's mNAV for all companies by:
 * 1. Fetching yesterday's stock and crypto prices
 * 2. For MSTR/BMNR: Using provenance data (same as company pages)
 * 3. For others: Using getCompanyMNAV function
 * 
 * This ensures 24h mNAV change uses the same calculation as company pages.
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

/**
 * Calculate mNAV using provenance data (same formula as company pages)
 */
function calculateProvenanceMnav(
  ticker: string,
  stockPrice: number,
  cryptoPrice: number
): number | null {
  if (ticker === "MSTR") {
    if (!MSTR_PROVENANCE.holdings || !MSTR_PROVENANCE.totalDebt || !MSTR_PROVENANCE.cashReserves) {
      return null;
    }
    
    const holdings = MSTR_PROVENANCE.holdings.value;
    const totalDebt = MSTR_PROVENANCE.totalDebt.value;
    const cashReserves = MSTR_PROVENANCE.cashReserves.value;
    const preferredEquity = MSTR_PROVENANCE.preferredEquity?.value || 0;
    const sharesOutstanding = MSTR_PROVENANCE.sharesOutstanding?.value || 0;
    
    // ITM convertible adjustment (same as MSTRCompanyView)
    const effectiveShares = getEffectiveShares("MSTR", sharesOutstanding, stockPrice);
    const inTheMoneyDebtValue = effectiveShares?.inTheMoneyDebtValue || 0;
    const adjustedDebt = Math.max(0, totalDebt - inTheMoneyDebtValue);
    
    const cryptoNav = holdings * cryptoPrice;
    const marketCap = sharesOutstanding * stockPrice;
    const ev = marketCap + adjustedDebt + preferredEquity - cashReserves;
    
    return cryptoNav > 0 ? ev / cryptoNav : null;
  }
  
  if (ticker === "BMNR") {
    if (!BMNR_PROVENANCE.holdings || !BMNR_PROVENANCE.cashReserves) {
      return null;
    }
    
    const holdings = BMNR_PROVENANCE.holdings.value;
    const totalDebt = BMNR_PROVENANCE.totalDebt?.value || 0;
    const cashReserves = BMNR_PROVENANCE.cashReserves.value;
    const preferredEquity = BMNR_PROVENANCE.preferredEquity?.value || 0;
    // Use estimated shares (10-Q baseline + ATM estimate)
    const sharesOutstanding = estimateBMNRShares().totalEstimated;
    
    const cryptoNav = holdings * cryptoPrice;
    const marketCap = sharesOutstanding * stockPrice;
    const ev = marketCap + totalDebt + preferredEquity - cashReserves;
    
    return cryptoNav > 0 ? ev / cryptoNav : null;
  }
  
  return null;
}

export async function GET(request: NextRequest) {
  // Get base URL from request (works on Vercel)
  const { origin } = new URL(request.url);
  
  // Check cache
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    // Get unique assets needed
    const assets: string[] = [...new Set(allCompanies.map((c: Company) => c.asset))];
    const tickers: string[] = allCompanies.map((c: Company) => c.ticker);

    // Fetch yesterday's crypto prices (use 7d history, find price from at least 24h ago)
    const cryptoPrices: Record<string, number> = {};
    for (const asset of assets) {
      try {
        const res = await fetch(
          `${origin}/api/crypto/${asset}/history?range=7d`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = await res.json();
          const now = Date.now();
          const oneDayAgo = now - 24 * 60 * 60 * 1000;
          
          // Find the most recent price point that is AT LEAST 24h old
          // This handles weekends/closures correctly (close price stands until next open)
          let bestMatch = null;
          for (const point of data) {
            const ts = parseInt(point.time) * 1000;
            if (ts <= oneDayAgo) {
              // This point is at least 24h old - keep the most recent one
              if (!bestMatch || ts > parseInt(bestMatch.time) * 1000) {
                bestMatch = point;
              }
            }
          }
          if (bestMatch) {
            cryptoPrices[asset] = bestMatch.price;
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
          `${origin}/api/stocks/${ticker}/history?range=7d&interval=1h`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = await res.json();
          const now = Date.now();
          const oneDayAgo = now - 24 * 60 * 60 * 1000;
          
          // Find the most recent price point that is AT LEAST 24h old
          // This handles weekends/closures correctly (close price stands until next open)
          let bestMatch = null;
          for (const point of data) {
            const ts = parseInt(point.time) * 1000;
            if (ts <= oneDayAgo) {
              // This point is at least 24h old - keep the most recent one
              if (!bestMatch || ts > parseInt(bestMatch.time) * 1000) {
                bestMatch = point;
              }
            }
          }
          if (bestMatch) {
            stockPrices[ticker] = bestMatch.close;
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
        `${origin}/api/prices`,
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

      // Try provenance-based calculation first (for MSTR, BMNR)
      let mnav = calculateProvenanceMnav(company.ticker, stockPrice, cryptoPrice);
      
      // Fall back to getCompanyMNAV for other companies
      if (mnav === null) {
        const yesterdayPrices = {
          crypto: {
            [company.asset]: { price: cryptoPrice, change24h: 0 },
          },
          stocks: {
            [company.ticker]: { price: stockPrice, change24h: 0, volume: 0, marketCap: 0 },
          },
          forex: forexRates,
        };
        mnav = getCompanyMNAV(company, yesterdayPrices);
      }

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
