/**
 * SharpLink Dashboard Fetcher (SBET)
 *
 * Fetches ETH holdings data from SBET's official dashboard API.
 * API endpoint: https://sharplink-dashboard.vercel.app/api/impact3-data
 *
 * This is the official source for SBET holdings.
 */

import { FetchResult, Fetcher } from '../types';

const SHARPLINK_API_BASE = 'https://sharplink-dashboard.vercel.app/api';

interface HoldingsDataPoint {
  row_number: number;
  Date: string;
  'Total ETH Holdings': number;
}

interface Impact3Response {
  total_eth_holdings: HoldingsDataPoint[];
  staking_rewards?: Array<{ Date: string; 'Staking Rewards (ETH)': number }>;
  eth_nav?: Array<{ Date: string; 'ETH NAV': number }>;
}

async function fetchImpact3Data(): Promise<Impact3Response | null> {
  try {
    const response = await fetch(`${SHARPLINK_API_BASE}/impact3-data`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DAT-Tracker/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`[sharplink] API error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[sharplink] Error fetching impact3-data:', error);
    return null;
  }
}

export const sharplinkFetcher: Fetcher = {
  name: 'sharplink.com',

  async fetch(tickers: string[]): Promise<FetchResult[]> {
    // This fetcher only supports SBET
    if (!tickers.includes('SBET')) {
      return [];
    }

    console.log('[sharplink] Fetching SBET data...');
    const results: FetchResult[] = [];
    const fetchedAt = new Date();

    const data = await fetchImpact3Data();
    if (!data?.total_eth_holdings?.length) {
      console.log('[sharplink] No data returned');
      return results;
    }

    // Get most recent data point (last in array)
    const holdings = data.total_eth_holdings;
    const latest = holdings[holdings.length - 1];
    if (!latest) {
      console.log('[sharplink] No latest data point');
      return results;
    }

    // Parse date like "January 18, 2026" to "2026-01-18"
    const dateStr = latest.Date;
    const parsedDate = new Date(dateStr);
    const sourceDate = parsedDate.toISOString().split('T')[0];

    // ETH Holdings
    const ethHeld = latest['Total ETH Holdings'];
    if (ethHeld !== undefined) {
      results.push({
        ticker: 'SBET',
        field: 'holdings',
        value: ethHeld,
        source: {
          name: 'sharplink.com',
          url: 'https://www.sharplink.com/eth-dashboard',
          date: sourceDate,
        },
        fetchedAt,
        raw: latest,
      });
    }

    console.log(`[sharplink] Got ${results.length} data points for SBET`);
    return results;
  }
};

/**
 * Get list of tickers this fetcher supports
 */
export function getSupportedTickers(): string[] {
  return ['SBET'];
}
