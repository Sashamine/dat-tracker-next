/**
 * Upexi Fetcher (UPXI)
 *
 * Fetches SOL holdings and mNAV data from Upexi's website.
 * Data is embedded in the page as JSON in a data-page attribute.
 */

import { FetchResult, Fetcher } from '../types';

const UPEXI_URL = 'https://www.upexi.com';

interface TreasuryEntry {
  id: number;
  symbol_id: number;
  tokens: string;       // "45733.0000"
  purchase_price: string;
  created_at: string;
  updated_at: string;
}

interface UpexiPageData {
  props: {
    symbols: {
      UPXI: {
        current_price: string;
        market_cap: number;
      };
      'SOL-USD': {
        current_price: string;
        token_count: number;
        treasury: TreasuryEntry[];
      };
    };
    fullyLoadedNav: string;  // "0.9x"
    adjustedSolperShare: number;
  };
}

function parsePageData(html: string): UpexiPageData | null {
  try {
    // Find the data-page attribute with embedded JSON
    const match = html.match(/data-page="([^"]+)"/);
    if (!match) {
      console.log('[upexi] Could not find data-page attribute');
      return null;
    }

    // Decode HTML entities and parse JSON
    const jsonStr = match[1]
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#x27;/g, "'");

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('[upexi] Error parsing page data:', error);
    return null;
  }
}

function calculateTotalSol(treasury: TreasuryEntry[]): number {
  return treasury.reduce((sum, entry) => {
    const tokens = parseFloat(entry.tokens);
    return sum + (isNaN(tokens) ? 0 : tokens);
  }, 0);
}

export const upexiFetcher: Fetcher = {
  name: 'upexi.com',

  async fetch(tickers: string[]): Promise<FetchResult[]> {
    if (!tickers.includes('UPXI')) {
      return [];
    }

    console.log('[upexi] Fetching UPXI data...');
    const results: FetchResult[] = [];
    const fetchedAt = new Date();
    const today = fetchedAt.toISOString().split('T')[0];

    try {
      const response = await fetch(UPEXI_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DAT-Tracker/1.0)',
          'Accept': 'text/html',
        },
      });

      if (!response.ok) {
        console.log(`[upexi] HTTP error: ${response.status}`);
        return results;
      }

      const html = await response.text();
      const data = parsePageData(html);

      if (!data?.props?.symbols) {
        console.log('[upexi] Could not parse page data');
        return results;
      }

      const solData = data.props.symbols['SOL-USD'];

      // SOL Holdings
      if (solData?.treasury && solData.treasury.length > 0) {
        const totalSol = calculateTotalSol(solData.treasury);
        if (totalSol > 0) {
          // Get the most recent treasury entry date
          const latestEntry = solData.treasury.reduce((latest, entry) => {
            return new Date(entry.updated_at) > new Date(latest.updated_at) ? entry : latest;
          });
          const sourceDate = latestEntry.updated_at.split('T')[0];

          results.push({
            ticker: 'UPXI',
            field: 'holdings',
            value: totalSol,
            source: {
              name: 'upexi.com',
              url: UPEXI_URL,
              date: sourceDate,
            },
            fetchedAt,
            raw: { treasury: solData.treasury },
          });
          console.log(`[upexi] Found SOL holdings: ${totalSol.toLocaleString()}`);
        }
      }

      // mNAV (Fully Loaded NAV)
      if (data.props.fullyLoadedNav) {
        const mnavStr = data.props.fullyLoadedNav.replace('x', '');
        const mnav = parseFloat(mnavStr);
        if (!isNaN(mnav) && mnav > 0) {
          results.push({
            ticker: 'UPXI',
            field: 'mnav',
            value: mnav,
            source: {
              name: 'upexi.com',
              url: UPEXI_URL,
              date: today,
            },
            fetchedAt,
            raw: { fullyLoadedNav: data.props.fullyLoadedNav },
          });
          console.log(`[upexi] Found mNAV: ${mnav}`);
        }
      }

      console.log(`[upexi] Got ${results.length} data points for UPXI`);
    } catch (error) {
      console.error('[upexi] Error fetching data:', error);
    }

    return results;
  }
};

export function getSupportedTickers(): string[] {
  return ['UPXI'];
}
