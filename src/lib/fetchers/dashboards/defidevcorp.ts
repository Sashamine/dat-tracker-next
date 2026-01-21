/**
 * DeFi Development Corp Dashboard Fetcher (DFDV)
 *
 * Fetches SOL holdings data from DFDV's official dashboard API.
 * API endpoint: https://defidevcorp.com/api/dashboard/sol
 *
 * This is the official source for DFDV holdings.
 */

import { FetchResult, Fetcher } from '../types';

const DFDV_API_BASE = 'https://defidevcorp.com/api/dashboard';

interface SolResponse {
  success: boolean;
  data: {
    id: number;
    date: string;
    sol_price: number;
    sol_count: number;
    sol_nav: number;
    shares_outstanding: number;
    sps_growth: number;
    sol_gain_qtd: number;
    sol_gain_ytd: number;
    sol_gain_3m: number;
    sol_gain_12m: number;
    created_at: string;
    updated_at: string;
  };
  message: string;
}

async function fetchSolData(): Promise<SolResponse['data'] | null> {
  try {
    const response = await fetch(`${DFDV_API_BASE}/sol`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DAT-Tracker/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`[defidevcorp] API error: ${response.status}`);
      return null;
    }

    const json: SolResponse = await response.json();
    if (!json.success || !json.data) {
      console.log('[defidevcorp] API returned unsuccessful response');
      return null;
    }

    return json.data;
  } catch (error) {
    console.error('[defidevcorp] Error fetching sol data:', error);
    return null;
  }
}

export const defidevcorpFetcher: Fetcher = {
  name: 'defidevcorp.com',

  async fetch(tickers: string[]): Promise<FetchResult[]> {
    // This fetcher only supports DFDV
    if (!tickers.includes('DFDV')) {
      return [];
    }

    console.log('[defidevcorp] Fetching DFDV data...');
    const results: FetchResult[] = [];
    const fetchedAt = new Date();

    const data = await fetchSolData();
    if (!data) {
      console.log('[defidevcorp] No data returned');
      return results;
    }

    // Parse date from API (format: "2026-01-21")
    const sourceDate = data.date;

    // SOL Holdings
    if (data.sol_count !== undefined) {
      results.push({
        ticker: 'DFDV',
        field: 'holdings',
        value: data.sol_count,
        source: {
          name: 'defidevcorp.com',
          url: 'https://defidevcorp.com/dashboard',
          date: sourceDate,
        },
        fetchedAt,
        raw: data,
      });
    }

    // Shares Outstanding (bonus data)
    if (data.shares_outstanding !== undefined) {
      results.push({
        ticker: 'DFDV',
        field: 'shares_outstanding',
        value: data.shares_outstanding,
        source: {
          name: 'defidevcorp.com',
          url: 'https://defidevcorp.com/dashboard',
          date: sourceDate,
        },
        fetchedAt,
        raw: data,
      });
    }

    console.log(`[defidevcorp] Got ${results.length} data points for DFDV`);
    return results;
  }
};

/**
 * Get list of tickers this fetcher supports
 */
export function getSupportedTickers(): string[] {
  return ['DFDV'];
}
