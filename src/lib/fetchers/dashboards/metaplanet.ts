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
 * Looks for patterns like "₿35,102" - the main holdings value
 */
function parseBtcHoldings(html: string): number | null {
  // The page has multiple ₿ values (holdings, historical purchases, etc.)
  // We need to find the main BTC Holdings which is a large number (thousands of BTC)

  // Method 1: Look for ₿ symbol followed by numbers
  const btcPattern = /₿([0-9,]+(?:\.[0-9]+)?)/g;
  const matches = [...html.matchAll(btcPattern)];

  if (matches.length === 0) {
    return null;
  }

  // Parse all matches and find the largest value that looks like total holdings
  // Main holdings is typically thousands of BTC (e.g., 35,102)
  // Filter out small values like prices, individual purchases, or per-share values
  const values = matches
    .map(m => parseFloat(m[1].replace(/,/g, '')))
    .filter(v => !isNaN(v) && v >= 1000); // Holdings should be at least 1000 BTC

  if (values.length === 0) {
    // Fallback to first match if no large values found
    const firstMatch = matches[0][1];
    const value = parseFloat(firstMatch.replace(/,/g, ''));
    return isNaN(value) ? null : value;
  }

  // Return the largest value (most likely the total holdings)
  // Usually this appears multiple times on the page
  return Math.max(...values);
}

/**
 * Parse mNAV from the HTML
 * Looks for JSON data with mNAV value
 */
function parseMnav(html: string): number | null {
  // The page includes JSON data with the mNAV value
  // Pattern: "value":1.2564770888675831 near mNAV context
  const jsonPattern = /"label":"mNAV"[^}]*"value":([0-9]+\.[0-9]+)/i;
  const jsonMatch = html.match(jsonPattern);

  if (jsonMatch) {
    return parseFloat(jsonMatch[1]);
  }

  // Fallback: Look for mNAV value pattern in text
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

    // Parse mNAV - this is the key validation metric
    const mnav = parseMnav(html);
    if (mnav !== null && mnav > 0) {
      results.push({
        ticker: '3350.T',
        field: 'mnav',
        value: mnav,
        source: {
          name: 'metaplanet.jp',
          url: METAPLANET_ANALYTICS_URL,
          date: sourceDate,
        },
        fetchedAt,
        raw: { method: 'html-parse' },
      });
      console.log(`[metaplanet] Found mNAV: ${mnav}`);
    } else {
      console.log('[metaplanet] Could not parse mNAV');
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
