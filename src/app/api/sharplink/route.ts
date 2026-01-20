/**
 * SharpLink Dashboard API proxy
 * Fetches live ETH holdings data for SBET from their official dashboard API
 *
 * Returns: { holdings, ethNav, stakingRewards, lastUpdated }
 */

import { NextResponse } from 'next/server';

const SHARPLINK_API_URL = 'https://sharplink-dashboard.vercel.app/api/impact3-data';

// Cache for SharpLink data (5 minutes)
let cache: { data: SharpLinkResponse; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Actual API response structure
interface SharpLinkApiResponse {
  total_eth_holdings: Array<{ row_number: number; Date: string; 'Total ETH Holdings': number }>;
  eth_nav: Array<{ row_number: number; Date: string; 'ETH NAV': number }>;
  staking_rewards: Array<{ row_number: number; Date: string; 'Staking Rewards (ETH)': number }>;
  eth_concentration: Array<{ row_number: number; Date: string; 'ETH Concentration': number }>;
  mnav_data: Array<{ Date: string; mNAV: string; 'Enterprise Value': string; NAV: string }>;
  fdmnav: Array<{ Date: string; 'Fully Diluted mNAV': string; 'Enterprise Value': string; 'Market Cap': string }>;
}

interface SharpLinkResponse {
  ticker: 'SBET';
  holdings: number;
  ethNav: number;
  stakingRewards: number;
  ethConcentration: number;
  mNAV: string;
  lastUpdated: string;
  source: 'sharplink-dashboard';
}

async function fetchSharpLinkData(): Promise<SharpLinkApiResponse | null> {
  try {
    const response = await fetch(SHARPLINK_API_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://sharplink.com/',
      },
      next: { revalidate: 300 }, // Cache at edge for 5 min
    });

    if (!response.ok) {
      console.log(`[SharpLink API] Error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[SharpLink API] Error:', error);
    return null;
  }
}

export async function GET() {
  // Return cached data if fresh
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json({
      ...cache.data,
      cached: true,
    });
  }

  // Fetch from SharpLink API
  const data = await fetchSharpLinkData();

  if (!data?.total_eth_holdings?.length) {
    return NextResponse.json(
      { error: 'No data available from SharpLink API' },
      { status: 404 }
    );
  }

  // Get most recent data points from each array
  const latestHoldings = data.total_eth_holdings[data.total_eth_holdings.length - 1];
  const latestNav = data.eth_nav[data.eth_nav.length - 1];
  const latestStaking = data.staking_rewards[data.staking_rewards.length - 1];
  const latestConcentration = data.eth_concentration[data.eth_concentration.length - 1];
  const latestFdMnav = data.fdmnav?.[0];  // Use fully diluted mNAV

  const response: SharpLinkResponse = {
    ticker: 'SBET',
    holdings: latestHoldings['Total ETH Holdings'],
    ethNav: latestNav?.['ETH NAV'] || 0,
    stakingRewards: latestStaking?.['Staking Rewards (ETH)'] || 0,
    ethConcentration: latestConcentration?.['ETH Concentration'] || 0,
    mNAV: latestFdMnav?.['Fully Diluted mNAV'] || 'N/A',  // Fully diluted mNAV
    lastUpdated: latestHoldings.Date,
    source: 'sharplink-dashboard',
  };

  // Update cache
  cache = { data: response, timestamp: Date.now() };

  return NextResponse.json({
    ...response,
    cached: false,
  });
}
