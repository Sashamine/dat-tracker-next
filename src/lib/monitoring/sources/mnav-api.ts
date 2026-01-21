/**
 * mNAV.com API Monitor
 * Fetches holdings data from mNAV.com's public API
 *
 * API endpoint: https://www.mnav.com/api/companies/{slug}/prepared-chart-data
 *
 * mNAV.com provides dashboards for treasury companies and exposes
 * holdings data via their API. This is a reliable source for mid-tier
 * treasury companies (not MSTR/MARA which are too large).
 */

import { SourceCheckResult } from '../types';

// Map our tickers to mNAV.com slugs
// mNAV.com provides live balance sheet data (debt, cash, preferred equity, shares)
export const MNAV_COMPANY_SLUGS: Record<string, string> = {
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
  // 'XXI': 'xxi', // Disabled: mNAV.com tracks only Class A shares (346.5M), missing Class B (304.8M). Use static data (651M total).
  'NAKA': 'nakamoto',
  // International (data in local currency - handled separately)
  '3350.T': 'metaplanet',
  '0434.HK': 'boyaa',
  'H100.ST': 'h100',
  'NXTT': 'next-technology',
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
    fdShares: number;
    debt: number;
    cash: number;
  };
  btcTransactions: Array<{
    date: string;
    btcAcquired: number;
    btcHeld: number;
    acquisitionCost: number;
    avgCost: number;
  }>;
  preparedAt: string;
}

/**
 * Fetch holdings data from mNAV.com API
 */
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
      if (response.status === 404) {
        console.log(`[mNAV] Company not found: ${slug}`);
        return null;
      }
      console.error(`[mNAV] API error for ${slug}: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`[mNAV] Error fetching ${slug}:`, error);
    return null;
  }
}

/**
 * Check mNAV.com API for holdings updates
 */
export async function checkMnavApi(
  companies: Array<{
    id: number;
    ticker: string;
    name: string;
    asset: string;
    holdings: number;
  }>
): Promise<SourceCheckResult[]> {
  const results: SourceCheckResult[] = [];

  for (const company of companies) {
    const slug = MNAV_COMPANY_SLUGS[company.ticker];
    if (!slug) continue;

    // Only check BTC companies for now (mNAV.com is BTC-focused)
    if (company.asset !== 'BTC') continue;

    console.log(`[mNAV] Checking ${company.ticker} (${slug})...`);

    try {
      const data = await fetchMnavData(slug);
      if (!data?.latest?.btcHeld) continue;

      const detectedHoldings = data.latest.btcHeld;
      const percentChange = Math.abs(detectedHoldings - company.holdings) / company.holdings;

      console.log(`[mNAV] ${company.ticker}: ${detectedHoldings} BTC (current: ${company.holdings}, change: ${(percentChange * 100).toFixed(1)}%)`);

      // Only report if there's a meaningful difference (>1%)
      if (percentChange > 0.01) {
        results.push({
          sourceType: 'mnav_api',
          companyId: company.id,
          ticker: company.ticker,
          asset: company.asset,
          detectedHoldings,
          confidence: 0.95, // High confidence - direct API
          sourceUrl: `https://www.mnav.com/api/companies/${slug}/prepared-chart-data`,
          sourceText: JSON.stringify(data.latest, null, 2),
          sourceDate: new Date(data.preparedAt),
          trustLevel: 'verified',
          // Include additional useful data
          metadata: {
            mnav: data.latest.mnav,
            marketCap: data.latest.marketCap,
            enterpriseValue: data.latest.enterpriseValue,
            debt: data.latest.debt,
            cash: data.latest.cash,
            fdShares: data.latest.fdShares,
            lastTransaction: data.btcTransactions?.[data.btcTransactions.length - 1],
          },
        });
      }
    } catch (error) {
      console.error(`[mNAV] Error checking ${company.ticker}:`, error);
    }

    // Rate limit - be polite to their API
    await new Promise(r => setTimeout(r, 500));
  }

  return results;
}

/**
 * Get current holdings for a single company from mNAV.com
 */
export async function getMnavHoldings(ticker: string): Promise<{
  holdings: number;
  mnav: number;
  marketCap: number;
  lastUpdated: string;
} | null> {
  const slug = MNAV_COMPANY_SLUGS[ticker];
  if (!slug) return null;

  const data = await fetchMnavData(slug);
  if (!data?.latest) return null;

  return {
    holdings: data.latest.btcHeld,
    mnav: data.latest.mnav,
    marketCap: data.latest.marketCap,
    lastUpdated: data.preparedAt,
  };
}

/**
 * Get full mNAV.com data for a company including transaction history
 */
export async function getMnavFullData(ticker: string): Promise<MnavApiResponse | null> {
  const slug = MNAV_COMPANY_SLUGS[ticker];
  if (!slug) return null;

  return fetchMnavData(slug);
}

/**
 * Get list of companies we can monitor via mNAV.com
 */
export function getMnavMonitoredCompanies(): string[] {
  return Object.keys(MNAV_COMPANY_SLUGS);
}
