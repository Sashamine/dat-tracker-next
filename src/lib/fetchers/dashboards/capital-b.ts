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

interface MnavApiResponse {
  settings: {
    name: string;
    ticker: string;
    btcHeld: number;
    sharePrice: number;
    sharesOutstandingIssued: number;
    fullyDilutedShares: number;
    totalCash: number;
    totalDebt: number;
    totalPreferredStock: number;
    currency: string;
    companyLink: string;
    trackerLink: string;
    fiatBtcRate: number;
    usdRate: number;
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
  btcCostTotalLocal: number;
  btcCostTotalUsd: number;
  btcInvestments: Array<{
    date: string;
    btcDelta: number;
    btcTotal: number;
    cashDelta: number | null;
    cashCostBasis: number | null;
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
  const { settings, btcCostTotalLocal } = data;

  // Get current values
  const btcHeld = settings.btcHeld;
  const sharePrice = settings.sharePrice;
  const fullyDilutedShares = settings.fullyDilutedShares;
  const totalDebt = settings.totalDebt || 0;
  const totalCash = settings.totalCash || 0;
  const totalPreferred = settings.totalPreferredStock || 0;
  const btcPriceLocal = settings.fiatBtcRate; // BTC price in local currency (EUR)

  if (!btcHeld || !sharePrice || !fullyDilutedShares || !btcPriceLocal) {
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
    const latestDate = btcHeldSeries.length > 0
      ? btcHeldSeries[btcHeldSeries.length - 1][0]
      : new Date().toISOString().split('T')[0];
    const sourceDate = latestDate.split('T')[0];

    // BTC Holdings
    const btcHeld = data.settings?.btcHeld;
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
          btcHeld: data.settings.btcHeld,
          btcCostTotalLocal: data.btcCostTotalLocal,
          btcCostTotalUsd: data.btcCostTotalUsd,
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
          settings: {
            btcHeld: data.settings.btcHeld,
            sharePrice: data.settings.sharePrice,
            fullyDilutedShares: data.settings.fullyDilutedShares,
            fiatBtcRate: data.settings.fiatBtcRate,
            totalDebt: data.settings.totalDebt,
            totalCash: data.settings.totalCash,
            totalPreferredStock: data.settings.totalPreferredStock,
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
