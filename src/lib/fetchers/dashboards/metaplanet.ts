/**
 * Metaplanet Dashboard Fetcher (3350.T)
 *
 * Fetches BTC holdings data from Metaplanet's official analytics page.
 * URL: https://metaplanet.jp/en/analytics
 *
 * Note: Metaplanet doesn't have a public API, so we parse the server-rendered HTML.
 * This is fragile and may break if they change their page structure.
 */

import { FetchResult, Fetcher } from '../types';

const METAPLANET_ANALYTICS_URL = 'https://metaplanet.jp/en/analytics';

/**
 * Parse BTC holdings from the HTML
 * Looks for patterns like "₿35,102" followed by "BTC Holdings"
 */
function parseBtcHoldings(html: string): number | null {
  // The page has "₿35,102" as BTC Holdings
  // We look for the pattern where BTC value appears before "BTC Holdings" text

  // Method 1: Look for ₿ symbol followed by numbers
  const btcPattern = /₿([0-9,]+(?:\.[0-9]+)?)/g;
  const matches = [...html.matchAll(btcPattern)];

  if (matches.length === 0) {
    return null;
  }

  // The first occurrence is typically the main BTC Holdings value
  // (shown prominently at the top of the analytics page)
  const firstMatch = matches[0][1];
  const value = parseFloat(firstMatch.replace(/,/g, ''));

  if (isNaN(value)) {
    return null;
  }

  return value;
}

/**
 * Parse mNAV from the HTML
 */
function parseMnav(html: string): number | null {
  // Look for mNAV value pattern - it's displayed as just a number like "1.26"
  // near the text "mNAV"
  const mnavPattern = /mNAV[^0-9]*([0-9]+\.[0-9]+)/i;
  const match = html.match(mnavPattern);

  if (!match) {
    // Try alternative pattern - look for the value before mNAV
    const altPattern = /([0-9]+\.[0-9]+)[^0-9]*mNAV/i;
    const altMatch = html.match(altPattern);
    if (altMatch) {
      return parseFloat(altMatch[1]);
    }
    return null;
  }

  return parseFloat(match[1]);
}

async function fetchAnalyticsPage(): Promise<string | null> {
  try {
    const response = await fetch(METAPLANET_ANALYTICS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      console.log(`[metaplanet] HTTP error: ${response.status}`);
      return null;
    }

    return await response.text();
  } catch (error) {
    console.error('[metaplanet] Error fetching analytics page:', error);
    return null;
  }
}

export const metaplanetFetcher: Fetcher = {
  name: 'metaplanet.jp',

  async fetch(tickers: string[]): Promise<FetchResult[]> {
    // This fetcher only supports Metaplanet (3350.T)
    if (!tickers.includes('3350.T')) {
      return [];
    }

    console.log('[metaplanet] Fetching Metaplanet analytics...');
    const results: FetchResult[] = [];
    const fetchedAt = new Date();

    const html = await fetchAnalyticsPage();
    if (!html) {
      console.log('[metaplanet] Failed to fetch page');
      return results;
    }

    // Today's date as source date (page shows live data)
    const sourceDate = new Date().toISOString().split('T')[0];

    // Parse BTC Holdings
    const btcHoldings = parseBtcHoldings(html);
    if (btcHoldings !== null && btcHoldings > 0) {
      results.push({
        ticker: '3350.T',
        field: 'holdings',
        value: btcHoldings,
        source: {
          name: 'metaplanet.jp',
          url: METAPLANET_ANALYTICS_URL,
          date: sourceDate,
        },
        fetchedAt,
        raw: { method: 'html-parse' },
      });
      console.log(`[metaplanet] Found BTC holdings: ${btcHoldings.toLocaleString()}`);
    } else {
      console.log('[metaplanet] Could not parse BTC holdings');
    }

    // Parse mNAV (optional)
    const mnav = parseMnav(html);
    if (mnav !== null && mnav > 0) {
      console.log(`[metaplanet] Found mNAV: ${mnav}`);
    }

    console.log(`[metaplanet] Got ${results.length} data points for Metaplanet`);
    return results;
  }
};

/**
 * Get list of tickers this fetcher supports
 */
export function getSupportedTickers(): string[] {
  return ['3350.T'];
}
