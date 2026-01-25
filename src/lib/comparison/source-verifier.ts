/**
 * Source Verifier (Phase 7b)
 *
 * Verifies our data sources when discrepancies are found.
 * Checks if our sourceUrl is still valid and confirms our value.
 *
 * Verification flow:
 * 1. If no sourceUrl → "unverified"
 * 2. If sourceUrl is 404 → "source_invalid"
 * 3. If we can fetch and parse the source:
 *    - Value matches → "verified"
 *    - Value differs → "source_drift"
 * 4. If we can't parse (unknown source type) → "source_available"
 */

import type { ComparisonField } from './engine';
import type { HoldingsSource } from '../types';
import { fetchers } from '../fetchers';
import { fetchBitcoinHoldings } from '../fetchers/sec-xbrl';

export type VerificationStatus =
  | 'verified'           // Our source confirms our value
  | 'source_drift'       // Our source shows different value
  | 'source_invalid'     // Our sourceUrl is 404/unreachable
  | 'source_available'   // URL is reachable but we can't parse value
  | 'unverified';        // No sourceUrl on our data

export interface VerificationResult {
  status: VerificationStatus;
  sourceUrl?: string;
  sourceType?: HoldingsSource;
  sourceFetchedValue?: number;  // What the source actually shows (if parseable)
  error?: string;
}

/**
 * Check if two values match exactly
 * NO TOLERANCE - any discrepancy triggers adversarial investigation
 * Accepting drift leads to compounding errors over time
 */
function valuesMatch(ourValue: number, fetchedValue: number): boolean {
  return ourValue === fetchedValue;
}

/**
 * Check if a URL is reachable (returns 200)
 */
async function isUrlReachable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'DAT-Tracker-Verification/1.0',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Extract CIK from SEC EDGAR URL
 * Example: https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=8-K
 */
function extractCikFromUrl(url: string): string | null {
  const match = url.match(/CIK[=:]?(\d+)/i);
  return match ? match[1].padStart(10, '0') : null;
}

/**
 * Determine which fetcher to use based on sourceUrl
 */
function getFetcherForUrl(sourceUrl: string, ticker: string): string | null {
  const url = sourceUrl.toLowerCase();

  // SEC EDGAR → use sec-xbrl fetcher (only for balance sheet data, not holdings)
  if (url.includes('sec.gov')) {
    return 'sec-xbrl';
  }

  // Company dashboards
  if (url.includes('strategy.com') || url.includes('microstrategy.com')) {
    return 'strategy-dashboard';
  }
  if (url.includes('sharplink.com')) {
    return 'sharplink-dashboard';
  }
  if (url.includes('metaplanet.jp')) {
    return 'metaplanet-dashboard';
  }
  if (url.includes('defidevcorp.com')) {
    return 'defidevcorp-dashboard';
  }
  if (url.includes('litestrategy.com')) {
    return 'litestrategy-dashboard';
  }
  if (url.includes('mempool.space')) {
    return 'xxi-mempool';
  }

  return null;
}

/**
 * Verify a source by fetching and comparing values
 */
export async function verifySource(
  ticker: string,
  field: ComparisonField,
  ourValue: number,
  sourceUrl?: string,
  sourceType?: HoldingsSource
): Promise<VerificationResult> {
  // No source URL → unverified
  if (!sourceUrl) {
    return { status: 'unverified' };
  }

  // Determine which fetcher to use
  const fetcherName = getFetcherForUrl(sourceUrl, ticker);

  // If we have a fetcher for this source
  if (fetcherName && fetchers[fetcherName]) {
    try {
      // SEC XBRL can now verify holdings via company-specific XBRL namespaces
      if (fetcherName === 'sec-xbrl' && field === 'holdings') {
        // Try to extract holdings from XBRL
        const xbrlResult = await fetchBitcoinHoldings(ticker);

        if (xbrlResult) {
          // We found holdings in XBRL - compare values
          if (valuesMatch(ourValue, xbrlResult.holdings)) {
            return {
              status: 'verified',
              sourceUrl,
              sourceType,
              sourceFetchedValue: xbrlResult.holdings,
            };
          } else {
            return {
              status: 'source_drift',
              sourceUrl,
              sourceType,
              sourceFetchedValue: xbrlResult.holdings,
              error: `Our value ${ourValue} differs from XBRL value ${xbrlResult.holdings}`,
            };
          }
        }

        // No XBRL holdings found - fall back to URL availability check
        // (holdings might be disclosed in 8-K text, not XBRL)
        const isReachable = await isUrlReachable(sourceUrl);
        if (!isReachable) {
          return {
            status: 'source_invalid',
            sourceUrl,
            sourceType,
            error: 'SEC filing URL returned 404 or is unreachable',
          };
        }
        return {
          status: 'source_available',
          sourceUrl,
          sourceType,
        };
      }

      // Fetch from the source
      const fetcher = fetchers[fetcherName];
      const results = await fetcher.fetch([ticker]);

      // Find matching result for our field
      const matchingResult = results.find(r => r.ticker === ticker && r.field === field);

      if (!matchingResult) {
        // Fetcher doesn't return this field for this ticker
        // Fall back to URL availability check
        const isReachable = await isUrlReachable(sourceUrl);
        if (!isReachable) {
          return {
            status: 'source_invalid',
            sourceUrl,
            sourceType,
            error: 'Source URL returned 404 or is unreachable',
          };
        }
        return {
          status: 'source_available',
          sourceUrl,
          sourceType,
        };
      }

      // Compare values
      const fetchedValue = matchingResult.value;
      if (valuesMatch(ourValue, fetchedValue)) {
        return {
          status: 'verified',
          sourceUrl,
          sourceType,
          sourceFetchedValue: fetchedValue,
        };
      } else {
        return {
          status: 'source_drift',
          sourceUrl,
          sourceType,
          sourceFetchedValue: fetchedValue,
          error: `Our value ${ourValue} differs from source value ${fetchedValue}`,
        };
      }
    } catch (error) {
      // Fetcher error - check if URL is at least reachable
      const isReachable = await isUrlReachable(sourceUrl);
      if (!isReachable) {
        return {
          status: 'source_invalid',
          sourceUrl,
          sourceType,
          error: error instanceof Error ? error.message : 'Source unreachable',
        };
      }
      return {
        status: 'source_available',
        sourceUrl,
        sourceType,
        error: `Fetcher error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // No fetcher for this source type - just check URL availability
  const isReachable = await isUrlReachable(sourceUrl);
  if (!isReachable) {
    return {
      status: 'source_invalid',
      sourceUrl,
      sourceType,
      error: 'Source URL returned 404 or is unreachable',
    };
  }

  return {
    status: 'source_available',
    sourceUrl,
    sourceType,
  };
}

/**
 * Batch verify sources for multiple discrepancies
 */
export async function verifySourcesBatch(
  items: Array<{
    ticker: string;
    field: ComparisonField;
    ourValue: number;
    sourceUrl?: string;
    sourceType?: HoldingsSource;
  }>
): Promise<Map<string, VerificationResult>> {
  const results = new Map<string, VerificationResult>();

  // Process in sequence to avoid rate limiting
  for (const item of items) {
    const key = `${item.ticker}:${item.field}`;
    const result = await verifySource(
      item.ticker,
      item.field,
      item.ourValue,
      item.sourceUrl,
      item.sourceType
    );
    results.set(key, result);

    // Small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}
