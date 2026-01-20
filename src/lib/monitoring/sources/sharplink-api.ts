/**
 * SharpLink Dashboard API Monitor
 * Fetches ETH holdings data from SBET's official dashboard API
 *
 * API endpoints at: https://sharplink-dashboard.vercel.app/api/
 * - /impact3-data - ETH holdings, staking rewards, historical data
 * - /sbet-prices - Stock price, volume, change %
 */

import { SourceCheckResult } from '../types';

const SHARPLINK_API_BASE = 'https://sharplink-dashboard.vercel.app/api';

interface Impact3DataPoint {
  date: string;
  ethHeld: number;
  avgPrice: number;
  ethNav: number;
  stakingRewards: number;
  ethConcentration: number;
}

interface Impact3Response {
  data: Impact3DataPoint[];
}

interface SbetPricesResponse {
  lastPrice: number;
  change: number;
  changePercent: string;
  avgVolume30Day: number;
  prices: Array<{ date: string; price: number }>;
}

/**
 * Fetch ETH holdings data from SharpLink dashboard
 */
async function fetchImpact3Data(): Promise<Impact3Response | null> {
  try {
    const response = await fetch(`${SHARPLINK_API_BASE}/impact3-data`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DAT-Tracker/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[SharpLink] API error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[SharpLink] Error fetching impact3-data:', error);
    return null;
  }
}

/**
 * Fetch SBET stock price data
 */
async function fetchSbetPrices(): Promise<SbetPricesResponse | null> {
  try {
    const response = await fetch(`${SHARPLINK_API_BASE}/sbet-prices`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DAT-Tracker/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[SharpLink] Prices API error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[SharpLink] Error fetching sbet-prices:', error);
    return null;
  }
}

/**
 * Check SharpLink API for SBET holdings updates
 */
export async function checkSharpLinkApi(
  companies: Array<{
    id: number;
    ticker: string;
    name: string;
    asset: string;
    holdings: number;
  }>
): Promise<SourceCheckResult[]> {
  const results: SourceCheckResult[] = [];

  // Only check SBET
  const sbet = companies.find(c => c.ticker === 'SBET');
  if (!sbet) return results;

  console.log('[SharpLink] Checking SBET holdings...');

  try {
    const data = await fetchImpact3Data();
    if (!data?.data?.length) {
      console.log('[SharpLink] No data returned');
      return results;
    }

    // Get most recent data point
    const latest = data.data[data.data.length - 1];
    if (!latest?.ethHeld) {
      console.log('[SharpLink] No holdings in latest data point');
      return results;
    }

    const detectedHoldings = latest.ethHeld;
    const percentChange = Math.abs(detectedHoldings - sbet.holdings) / sbet.holdings;

    console.log(`[SharpLink] SBET: ${detectedHoldings.toLocaleString()} ETH (current: ${sbet.holdings.toLocaleString()}, change: ${(percentChange * 100).toFixed(1)}%)`);

    // Only report if there's a meaningful difference (>1%)
    if (percentChange > 0.01) {
      results.push({
        sourceType: 'sharplink_api',
        companyId: sbet.id,
        ticker: sbet.ticker,
        asset: sbet.asset,
        detectedHoldings,
        confidence: 0.98, // Very high confidence - official company API
        sourceUrl: `${SHARPLINK_API_BASE}/impact3-data`,
        sourceText: JSON.stringify(latest, null, 2),
        sourceDate: new Date(latest.date),
        trustLevel: 'official',
        metadata: {
          ethNav: latest.ethNav,
          stakingRewards: latest.stakingRewards,
          avgPrice: latest.avgPrice,
          ethConcentration: latest.ethConcentration,
        },
      });
    }
  } catch (error) {
    console.error('[SharpLink] Error checking SBET:', error);
  }

  return results;
}

/**
 * Get current SBET holdings from SharpLink API
 */
export async function getSharpLinkHoldings(): Promise<{
  holdings: number;
  stakingRewards: number;
  ethNav: number;
  lastUpdated: string;
} | null> {
  const data = await fetchImpact3Data();
  if (!data?.data?.length) return null;

  const latest = data.data[data.data.length - 1];
  if (!latest) return null;

  return {
    holdings: latest.ethHeld,
    stakingRewards: latest.stakingRewards,
    ethNav: latest.ethNav,
    lastUpdated: latest.date,
  };
}

/**
 * Get SBET stock price data
 */
export async function getSharpLinkPrices(): Promise<{
  price: number;
  change: number;
  changePercent: string;
  avgVolume: number;
} | null> {
  const data = await fetchSbetPrices();
  if (!data) return null;

  return {
    price: data.lastPrice,
    change: data.change,
    changePercent: data.changePercent,
    avgVolume: data.avgVolume30Day,
  };
}
