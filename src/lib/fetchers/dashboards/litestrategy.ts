/**
 * Lite Strategy Dashboard Fetcher (LITS)
 *
 * Fetches LTC holdings data from Lite Strategy's official dashboard.
 * URL: https://www.litestrategy.com/dashboard/
 *
 * Note: Lite Strategy doesn't have a public API, so we parse the server-rendered HTML.
 * This is fragile and may break if they change their page structure.
 */

import { FetchResult, Fetcher } from '../types';

const LITESTRATEGY_DASHBOARD_URL = 'https://www.litestrategy.com/dashboard/';

/**
 * Parse LTC holdings from the HTML
 * Looks for "LTC Holdings" followed by a number like "929,548.46"
 */
function parseLtcHoldings(html: string): number | null {
  // Method 1: Look for "LTC Holdings" section followed by a number
  // The page structure has heading-value pairs
  const holdingsPattern = /LTC\s*Holdings[^0-9]*([0-9,]+(?:\.[0-9]+)?)/i;
  const match = html.match(holdingsPattern);

  if (match) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    if (!isNaN(value) && value > 0) {
      return value;
    }
  }

  // Method 2: Look for large numbers that could be LTC holdings (100k+)
  // This is a fallback if the label pattern changes
  const largeNumberPattern = /([0-9]{3},?[0-9]{3}(?:\.[0-9]+)?)/g;
  const matches = [...html.matchAll(largeNumberPattern)];

  for (const m of matches) {
    const value = parseFloat(m[1].replace(/,/g, ''));
    // LITS holdings are expected to be in the 900k+ range
    if (value > 800000 && value < 2000000) {
      return value;
    }
  }

  return null;
}

/**
 * Parse mNAV from the HTML
 */
function parseMnav(html: string): number | null {
  // Look for mNAV value - displayed as "0.60" or "0.60×"
  const mnavPattern = /mNAV[^0-9]*([0-9]+\.[0-9]+)/i;
  const match = html.match(mnavPattern);

  if (match) {
    return parseFloat(match[1]);
  }

  // Try alternative pattern
  const altPattern = /([0-9]+\.[0-9]+)\s*[×x]\s*mNAV/i;
  const altMatch = html.match(altPattern);
  if (altMatch) {
    return parseFloat(altMatch[1]);
  }

  return null;
}

/**
 * Parse LITS stock price from the HTML
 */
function parseStockPrice(html: string): number | null {
  // Look for "LITS Price" followed by "$X.XX"
  const pricePattern = /LITS\s*Price[^$]*\$([0-9]+\.[0-9]+)/i;
  const match = html.match(pricePattern);

  if (match) {
    return parseFloat(match[1]);
  }

  return null;
}

async function fetchDashboardPage(): Promise<string | null> {
  try {
    const response = await fetch(LITESTRATEGY_DASHBOARD_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      console.log(`[litestrategy] HTTP error: ${response.status}`);
      return null;
    }

    return await response.text();
  } catch (error) {
    console.error('[litestrategy] Error fetching dashboard page:', error);
    return null;
  }
}

export const litestrategyFetcher: Fetcher = {
  name: 'litestrategy.com',

  async fetch(tickers: string[]): Promise<FetchResult[]> {
    // This fetcher only supports LITS
    if (!tickers.includes('LITS')) {
      return [];
    }

    console.log('[litestrategy] Fetching Lite Strategy dashboard...');
    const results: FetchResult[] = [];
    const fetchedAt = new Date();

    const html = await fetchDashboardPage();
    if (!html) {
      console.log('[litestrategy] Failed to fetch page');
      return results;
    }

    // Today's date as source date (page shows live data)
    const sourceDate = new Date().toISOString().split('T')[0];

    // Parse LTC Holdings
    const ltcHoldings = parseLtcHoldings(html);
    if (ltcHoldings !== null && ltcHoldings > 0) {
      results.push({
        ticker: 'LITS',
        field: 'holdings',
        value: ltcHoldings,
        source: {
          name: 'litestrategy.com',
          url: LITESTRATEGY_DASHBOARD_URL,
          date: sourceDate,
        },
        fetchedAt,
        raw: { method: 'html-parse' },
      });
      console.log(`[litestrategy] Found LTC holdings: ${ltcHoldings.toLocaleString()}`);
    } else {
      console.log('[litestrategy] Could not parse LTC holdings');
    }

    // Parse mNAV (optional, for logging)
    const mnav = parseMnav(html);
    if (mnav !== null && mnav > 0) {
      console.log(`[litestrategy] Found mNAV: ${mnav}x`);
    }

    // Parse stock price (optional, for logging)
    const stockPrice = parseStockPrice(html);
    if (stockPrice !== null) {
      console.log(`[litestrategy] Found stock price: $${stockPrice}`);
    }

    console.log(`[litestrategy] Got ${results.length} data points for LITS`);
    return results;
  }
};

/**
 * Get list of tickers this fetcher supports
 */
export function getSupportedTickers(): string[] {
  return ['LITS'];
}
