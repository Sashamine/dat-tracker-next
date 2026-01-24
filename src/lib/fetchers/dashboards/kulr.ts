/**
 * KULR Bitcoin Treasury Tracker Fetcher (KULR)
 *
 * Fetches BTC holdings data from KULR's unofficial tracker API.
 * API endpoint: https://kulrbitcointracker.com/api/holdings
 *
 * Note: This is a third-party tracker, not KULR's official site.
 * mNAV is calculated client-side, so we only get holdings.
 */

import { FetchResult, Fetcher } from '../types';

const KULR_API_BASE = 'https://kulrbitcointracker.com/api';

interface HoldingsResponse {
  ok: boolean;
  data: {
    asOfDate: string;       // "2025-12-14T00:00:00.000Z"
    btcTotal: string;       // "1056.68549114"
    totalUsdCost: string;   // "104554700"
    btcSpotUsd: string;     // "88822"
    markToMarketUsd: string;// "93856918.69"
    pnlUsd: string;         // "-10697781.31"
    wacUsd: string;         // "98945.9" (weighted average cost)
  };
}

async function fetchHoldings(): Promise<HoldingsResponse['data'] | null> {
  try {
    const response = await fetch(`${KULR_API_BASE}/holdings`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DAT-Tracker/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`[kulr] API error: ${response.status}`);
      return null;
    }

    const json: HoldingsResponse = await response.json();
    if (!json.ok || !json.data) {
      console.log('[kulr] API returned unsuccessful response');
      return null;
    }

    return json.data;
  } catch (error) {
    console.error('[kulr] Error fetching holdings:', error);
    return null;
  }
}

export const kulrFetcher: Fetcher = {
  name: 'kulrbitcointracker.com',

  async fetch(tickers: string[]): Promise<FetchResult[]> {
    // This fetcher only supports KULR
    if (!tickers.includes('KULR')) {
      return [];
    }

    console.log('[kulr] Fetching KULR data...');
    const results: FetchResult[] = [];
    const fetchedAt = new Date();

    const data = await fetchHoldings();
    if (!data) {
      console.log('[kulr] No data returned');
      return results;
    }

    // Parse date from API
    const sourceDate = data.asOfDate.split('T')[0];

    // BTC Holdings
    const btcTotal = parseFloat(data.btcTotal);
    if (!isNaN(btcTotal) && btcTotal > 0) {
      results.push({
        ticker: 'KULR',
        field: 'holdings',
        value: btcTotal,
        source: {
          name: 'kulrbitcointracker.com',
          url: 'https://kulrbitcointracker.com',
          date: sourceDate,
        },
        fetchedAt,
        raw: data,
      });
      console.log(`[kulr] Found BTC holdings: ${btcTotal.toLocaleString()}`);
    }

    console.log(`[kulr] Got ${results.length} data points for KULR`);
    return results;
  }
};

/**
 * Get list of tickers this fetcher supports
 */
export function getSupportedTickers(): string[] {
  return ['KULR'];
}
