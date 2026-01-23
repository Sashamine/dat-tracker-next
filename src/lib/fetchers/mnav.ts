/**
 * mNAV.com Fetcher
 *
 * Fetches holdings data from mNAV.com's public API.
 * API endpoint: https://www.mnav.com/api/companies/{slug}/prepared-chart-data
 *
 * This wraps the existing mnav-api.ts module in the standardized Fetcher interface.
 */

import { FetchResult, Fetcher } from './types';

// Map our tickers to mNAV.com slugs
const MNAV_SLUGS: Record<string, string> = {
  // Major US companies
  'MSTR': 'strategy',
  'MARA': 'mara',
  'RIOT': 'riot',
  'CLSK': 'cleanspark',
  'CORZ': 'core-scientific',
  'BTDR': 'bitdeer',
  'HUT': 'hut-8',
  'BITF': 'bitfarms',
  'CIFR': 'cipher',
  'BTBT': 'bit-digital',
  // 'SMLR': 'semler', // Removed - acquired by ASST (Strive) Jan 2026
  'KULR': 'kulr',
  'DJT': 'trump-media',
  // 'XXI': 'xxi', // Disabled: mNAV.com tracks only Class A shares
  'NAKA': 'nakamoto',
  // International
  '3350.T': 'metaplanet',
  '0434.HK': 'boyaa',
  'H100.ST': 'h100',
  // 'NXTT': 'next-technology', // Disabled: mNAV.com hasn't adjusted for 200:1 reverse split (Sep 2025)
};

interface MnavApiResponse {
  company: {
    name: string;
    ticker: string;
    currency: string;
  };
  latest: {
    btcHeld: number;
    btcPrice: number;
    sharePrice: number;
    marketCap: number;
    enterpriseValue: number;
    mnav: number;
    issuedShares: number;
    fullyDilutedShares: number;
    totalDebt: number;
    totalCash: number;
    totalPreferredStock: number;
  };
  preparedAt: string;
}

async function fetchMnavData(slug: string): Promise<MnavApiResponse | null> {
  try {
    const url = `https://www.mnav.com/api/companies/${slug}/prepared-chart-data`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DAT-Tracker/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`[mNAV] ${slug}: HTTP ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`[mNAV] Error fetching ${slug}:`, error);
    return null;
  }
}

export const mnavFetcher: Fetcher = {
  name: 'mNAV.com',

  async fetch(tickers: string[]): Promise<FetchResult[]> {
    const results: FetchResult[] = [];

    for (const ticker of tickers) {
      const slug = MNAV_SLUGS[ticker];
      if (!slug) {
        console.log(`[mNAV] No slug for ${ticker}, skipping`);
        continue;
      }

      console.log(`[mNAV] Fetching ${ticker} (${slug})...`);
      const data = await fetchMnavData(slug);

      if (!data?.latest) {
        console.log(`[mNAV] No data for ${ticker}`);
        continue;
      }

      const fetchedAt = new Date();
      const sourceDate = data.preparedAt?.split('T')[0] || fetchedAt.toISOString().split('T')[0];

      // Holdings
      if (data.latest.btcHeld !== undefined) {
        results.push({
          ticker,
          field: 'holdings',
          value: data.latest.btcHeld,
          source: {
            name: 'mNAV.com',
            url: `https://www.mnav.com/companies/${slug}`,
            date: sourceDate,
          },
          fetchedAt,
          raw: data.latest,
        });
      }

      // Shares outstanding (fully diluted)
      if (data.latest.fullyDilutedShares !== undefined) {
        results.push({
          ticker,
          field: 'shares_outstanding',
          value: data.latest.fullyDilutedShares,
          source: {
            name: 'mNAV.com',
            url: `https://www.mnav.com/companies/${slug}`,
            date: sourceDate,
          },
          fetchedAt,
          raw: data.latest,
        });
      }

      // Debt
      if (data.latest.totalDebt !== undefined) {
        results.push({
          ticker,
          field: 'debt',
          value: data.latest.totalDebt,
          source: {
            name: 'mNAV.com',
            url: `https://www.mnav.com/companies/${slug}`,
            date: sourceDate,
          },
          fetchedAt,
          raw: data.latest,
        });
      }

      // Cash
      if (data.latest.totalCash !== undefined) {
        results.push({
          ticker,
          field: 'cash',
          value: data.latest.totalCash,
          source: {
            name: 'mNAV.com',
            url: `https://www.mnav.com/companies/${slug}`,
            date: sourceDate,
          },
          fetchedAt,
          raw: data.latest,
        });
      }

      // Preferred equity
      if (data.latest.totalPreferredStock !== undefined && data.latest.totalPreferredStock > 0) {
        results.push({
          ticker,
          field: 'preferred_equity',
          value: data.latest.totalPreferredStock,
          source: {
            name: 'mNAV.com',
            url: `https://www.mnav.com/companies/${slug}`,
            date: sourceDate,
          },
          fetchedAt,
          raw: data.latest,
        });
      }

      // Rate limit - be polite to their API
      await new Promise(r => setTimeout(r, 500));
    }

    return results;
  }
};

/**
 * Get list of tickers this fetcher supports
 */
export function getSupportedTickers(): string[] {
  return Object.keys(MNAV_SLUGS);
}
