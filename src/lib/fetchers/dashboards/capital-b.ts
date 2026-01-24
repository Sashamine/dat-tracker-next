/**
 * Capital B (ALTBG) Fetcher
 *
 * Fetches BTC holdings and mNAV data from the mNAV.com API.
 * Capital B's dashboard at cptlb.com/analytics uses an embedded mNAV.com widget.
 * API endpoint: https://www.mnav.com/api/companies/the-blockchain-group/prepared-chart-data
 */

import { FetchResult, Fetcher } from '../types';

const MNAV_API_URL = 'https://www.mnav.com/api/companies/the-blockchain-group/prepared-chart-data';
const DASHBOARD_URL = 'https://cptlb.com/analytics/';

// API response structure based on actual mNAV.com response
interface MnavApiResponse {
  latest: {
    btcHeld: number;
    sharePrice: number;
    fullyDilutedShares: number;
    issuedShares: number;
    totalCash: number;
    totalDebt: number;
    totalPreferredStock: number;
    btcPrice: number;  // BTC price in local currency
    usdRate: number;
    marketCap: number;
    btcNav: number;
  };
  values: {
    sharePrice: [string, number][];
    btcPrice: [string, number][];
    btcHeld: [string, number][];
    issuedShares: [string, number][];
    fullyDilutedShares: [string, number][];
    totalCash: [string, number][];
    totalDebt: [string, number][];
    totalPreferredStock: [string, number][];
    usdRate: [string, number][];
  };
  metadata?: {
    currency?: string;
    name?: string;
    ticker?: string;
  };
  btcTransactions?: Array<{
    date: string;
    btcDelta: number;
    btcTotal: number;
  }>;
}

async function fetchMnavData(): Promise<MnavApiResponse | null> {
  try {
    const response = await fetch(MNAV_API_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DAT-Tracker/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`[capital-b] API error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[capital-b] Error fetching mNAV data:', error);
    return null;
  }
}

function calculateMnav(data: MnavApiResponse): number | null {
  const { latest } = data;

  if (!latest) {
    console.log('[capital-b] No latest data in API response');
    return null;
  }

  // Get current values
  const btcHeld = latest.btcHeld;
  const sharePrice = latest.sharePrice;
  const fullyDilutedShares = latest.fullyDilutedShares;
  const totalDebt = latest.totalDebt || 0;
  const totalCash = latest.totalCash || 0;
  const totalPreferred = latest.totalPreferredStock || 0;
  const btcPriceLocal = latest.btcPrice; // BTC price in local currency (EUR)

  if (!btcHeld || !sharePrice || !fullyDilutedShares || !btcPriceLocal) {
    console.log('[capital-b] Missing required fields for mNAV calculation');
    return null;
  }

  // Calculate market cap (diluted)
  const marketCap = sharePrice * fullyDilutedShares;

  // Calculate BTC NAV (BTC holdings * BTC price in local currency)
  const btcNav = btcHeld * btcPriceLocal;

  // Calculate Enterprise Value: Market Cap + Debt + Preferred - Cash
  const enterpriseValue = marketCap + totalDebt + totalPreferred - totalCash;

  // mNAV = Enterprise Value / BTC NAV
  const mnav = enterpriseValue / btcNav;

  return mnav;
}

export const capitalBFetcher: Fetcher = {
  name: 'cptlb.com (via mNAV.com)',

  async fetch(tickers: string[]): Promise<FetchResult[]> {
    // This fetcher only supports ALTBG
    if (!tickers.includes('ALTBG')) {
      return [];
    }

    console.log('[capital-b] Fetching ALTBG data...');
    const results: FetchResult[] = [];
    const fetchedAt = new Date();

    const data = await fetchMnavData();
    if (!data) {
      console.log('[capital-b] No data returned');
      return results;
    }

    // Find the most recent date from the btcHeld time series
    const btcHeldSeries = data.values?.btcHeld || [];
    let sourceDate = new Date().toISOString().split('T')[0];
    if (btcHeldSeries.length > 0) {
      const latestEntry = btcHeldSeries[btcHeldSeries.length - 1];
      if (latestEntry && latestEntry[0]) {
        const latestDate = latestEntry[0];
        sourceDate = typeof latestDate === 'string' && latestDate.includes('T')
          ? latestDate.split('T')[0]
          : String(latestDate);
      }
    }

    // BTC Holdings from 'latest' object
    const btcHeld = data.latest?.btcHeld;
    if (btcHeld && btcHeld > 0) {
      results.push({
        ticker: 'ALTBG',
        field: 'holdings',
        value: btcHeld,
        source: {
          name: 'cptlb.com (via mNAV.com)',
          url: DASHBOARD_URL,
          date: sourceDate,
        },
        fetchedAt,
        raw: {
          btcHeld: data.latest.btcHeld,
          btcNav: data.latest.btcNav,
          marketCap: data.latest.marketCap,
        },
      });
      console.log(`[capital-b] Found BTC holdings: ${btcHeld.toLocaleString()}`);
    }

    // mNAV (calculated from API data)
    const mnav = calculateMnav(data);
    if (mnav !== null && mnav > 0) {
      results.push({
        ticker: 'ALTBG',
        field: 'mnav',
        value: mnav,
        source: {
          name: 'cptlb.com (via mNAV.com)',
          url: DASHBOARD_URL,
          date: sourceDate,
        },
        fetchedAt,
        raw: {
          latest: {
            btcHeld: data.latest.btcHeld,
            sharePrice: data.latest.sharePrice,
            fullyDilutedShares: data.latest.fullyDilutedShares,
            btcPrice: data.latest.btcPrice,
            totalDebt: data.latest.totalDebt,
            totalCash: data.latest.totalCash,
            totalPreferredStock: data.latest.totalPreferredStock,
          },
          calculatedMnav: mnav,
          note: 'mNAV = (MarketCap + Debt + Preferred - Cash) / (BTC * BTCPrice)',
        },
      });
      console.log(`[capital-b] Found mNAV: ${mnav.toFixed(3)}x`);
    }

    console.log(`[capital-b] Got ${results.length} data points for ALTBG`);
    return results;
  }
};

/**
 * Get list of tickers this fetcher supports
 */
export function getSupportedTickers(): string[] {
  return ['ALTBG'];
}
