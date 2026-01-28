/**
 * Strategy.com Dashboard Fetcher (MSTR)
 *
 * Fetches holdings data from Strategy's official API.
 * API endpoints:
 *   - https://api.strategy.com/btc/bitcoinKpis (BTC holdings, debt)
 *   - https://api.strategy.com/btc/mstrKpiData (shares, market data)
 *
 * This is the official source for MSTR holdings.
 */

import { FetchResult, Fetcher } from '../types';

interface BitcoinKpisResponse {
  timestamp: string;
  results: {
    latestPrice: number;
    prevDayPrice: number;
    btcHoldings: string;      // "709,715" (string with comma)
    btcNav: string;           // in millions as string
    btcNavNumber: number;     // in millions as number
    debtByBN: number;         // Debt in billions (e.g., 10 = $10B)
    prefByBN: number;         // Preferred in billions (e.g., 13 = $13B)
    debtPrefByBN: number;     // Combined debt + preferred as % of BTC NAV
  };
}

interface MstrKpiDataResponse {
  price: string;              // "158.52"
  marketCap: string;          // "52,338" (millions)
  entVal: string;             // "66,692" (millions) - Enterprise Value
  volume: string;             // Trading volume
  fdShares: string;           // Fully diluted shares (if available)
  timestamp: string;
}

async function fetchBitcoinKpis(): Promise<BitcoinKpisResponse | null> {
  try {
    const response = await fetch('https://api.strategy.com/btc/bitcoinKpis', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DAT-Tracker/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`[strategy.com] bitcoinKpis: HTTP ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[strategy.com] Error fetching bitcoinKpis:', error);
    return null;
  }
}

async function fetchMstrKpiData(): Promise<MstrKpiDataResponse | null> {
  try {
    const response = await fetch('https://api.strategy.com/btc/mstrKpiData', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DAT-Tracker/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`[strategy.com] mstrKpiData: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    // API returns an array with one element
    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    }
    return data;
  } catch (error) {
    console.error('[strategy.com] Error fetching mstrKpiData:', error);
    return null;
  }
}

/**
 * Parse number from string with commas, e.g. "709,715" -> 709715
 */
function parseNumber(str: string | undefined | null): number | null {
  if (!str) return null;
  const cleaned = str.replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export const strategyFetcher: Fetcher = {
  name: 'strategy.com',

  async fetch(tickers: string[]): Promise<FetchResult[]> {
    // This fetcher only supports MSTR
    if (!tickers.includes('MSTR')) {
      return [];
    }

    console.log('[strategy.com] Fetching MSTR data...');
    const results: FetchResult[] = [];
    const fetchedAt = new Date();
    const today = fetchedAt.toISOString().split('T')[0];

    // Fetch both endpoints in parallel
    const [btcKpis, mstrKpis] = await Promise.all([
      fetchBitcoinKpis(),
      fetchMstrKpiData(),
    ]);

    // BTC Holdings - under results.btcHoldings
    if (btcKpis?.results?.btcHoldings) {
      const holdings = parseNumber(btcKpis.results.btcHoldings);
      if (holdings !== null) {
        results.push({
          ticker: 'MSTR',
          field: 'holdings',
          value: holdings,
          source: {
            name: 'strategy.com',
            url: 'https://www.strategy.com/',
            date: today,
          },
          fetchedAt,
          raw: btcKpis,
        });
      }
    }

    // Debt - under results.debtByBN (in billions)
    if (btcKpis?.results?.debtByBN !== undefined) {
      results.push({
        ticker: 'MSTR',
        field: 'debt',
        value: btcKpis.results.debtByBN * 1_000_000_000, // Convert billions to dollars
        source: {
          name: 'strategy.com',
          url: 'https://www.strategy.com/',
          date: today,
        },
        fetchedAt,
        raw: { debtByBN: btcKpis.results.debtByBN, note: 'Converted from billions' },
      });
    }

    // Preferred Equity - under results.prefByBN (in billions)
    if (btcKpis?.results?.prefByBN !== undefined) {
      results.push({
        ticker: 'MSTR',
        field: 'preferred_equity',
        value: btcKpis.results.prefByBN * 1_000_000_000,
        source: {
          name: 'strategy.com',
          url: 'https://www.strategy.com/',
          date: today,
        },
        fetchedAt,
        raw: { prefByBN: btcKpis.results.prefByBN, note: 'Converted from billions' },
      });
    }

    // Fully Diluted Shares - from mstrKpiData endpoint
    // Primary: use fdShares if available
    // Fallback: derive from marketCap / price
    let sharesValue: number | null = null;
    let sharesSource: 'fdShares' | 'derived' = 'fdShares';

    if (mstrKpis?.fdShares) {
      sharesValue = parseNumber(mstrKpis.fdShares);
    }

    // Fallback: derive from marketCap / price if fdShares is empty
    if (sharesValue === null && mstrKpis?.marketCap && mstrKpis?.price) {
      const marketCapMillions = parseNumber(mstrKpis.marketCap);
      const price = parseNumber(mstrKpis.price);
      if (marketCapMillions !== null && price !== null && price > 0) {
        // marketCap is in millions, so: shares = (marketCap * 1M) / price
        sharesValue = Math.round((marketCapMillions * 1_000_000) / price);
        sharesSource = 'derived';
        console.log(`[strategy.com] Derived shares from marketCap/price: ${sharesValue.toLocaleString()}`);
      }
    }

    if (sharesValue !== null) {
      results.push({
        ticker: 'MSTR',
        field: 'shares_outstanding',
        value: sharesValue,
        source: {
          name: 'strategy.com',
          url: 'https://www.strategy.com/',
          date: today,
        },
        fetchedAt,
        raw: {
          fdShares: mstrKpis?.fdShares || null,
          marketCap: mstrKpis?.marketCap,
          price: mstrKpis?.price,
          derivedFrom: sharesSource,
          note: sharesSource === 'derived'
            ? 'Shares derived from marketCap / price (fdShares unavailable)'
            : 'Fully diluted shares from API',
        },
      });
    }

    // mNAV - calculated from Enterprise Value / BTC NAV
    // Both values are in millions from the API
    const entVal = parseNumber(mstrKpis?.entVal);
    const btcNav = btcKpis?.results?.btcNavNumber;
    if (entVal !== null && btcNav !== undefined && btcNav > 0) {
      const mnav = entVal / btcNav;
      results.push({
        ticker: 'MSTR',
        field: 'mnav',
        value: mnav,
        source: {
          name: 'strategy.com',
          url: 'https://www.strategy.com/',
          date: today,
        },
        fetchedAt,
        raw: { entVal, btcNav, note: 'mNAV = EV / BTC_NAV (both in millions)' },
      });
      console.log(`[strategy.com] Calculated mNAV: ${mnav.toFixed(3)}`);
    }

    console.log(`[strategy.com] Got ${results.length} data points for MSTR`);
    return results;
  }
};

/**
 * Get list of tickers this fetcher supports
 */
export function getSupportedTickers(): string[] {
  return ['MSTR'];
}
