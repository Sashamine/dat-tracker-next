/**
 * SharpLink Dashboard API proxy
 * Fetches live ETH holdings data for SBET from their official dashboard API
 *
 * Returns: { holdings, ethNav, stakingRewards, avgPrice, lastUpdated }
 */

import { NextResponse } from 'next/server';

const SHARPLINK_API_BASE = 'https://sharplink-dashboard.vercel.app/api';

// Cache for SharpLink data (5 minutes)
let cache: { data: SharpLinkResponse; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

interface SharpLinkResponse {
  ticker: 'SBET';
  holdings: number;
  ethNav: number;
  stakingRewards: number;
  avgPrice: number;
  ethConcentration: number;
  lastUpdated: string;
  source: 'sharplink-dashboard';
}

async function fetchImpact3Data(): Promise<Impact3Response | null> {
  try {
    const response = await fetch(`${SHARPLINK_API_BASE}/impact3-data`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DAT-Tracker/1.0)',
        'Accept': 'application/json',
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
  const data = await fetchImpact3Data();

  if (!data?.data?.length) {
    return NextResponse.json(
      { error: 'No data available from SharpLink API' },
      { status: 404 }
    );
  }

  // Get most recent data point
  const latest = data.data[data.data.length - 1];

  const response: SharpLinkResponse = {
    ticker: 'SBET',
    holdings: latest.ethHeld,
    ethNav: latest.ethNav,
    stakingRewards: latest.stakingRewards,
    avgPrice: latest.avgPrice,
    ethConcentration: latest.ethConcentration,
    lastUpdated: latest.date,
    source: 'sharplink-dashboard',
  };

  // Update cache
  cache = { data: response, timestamp: Date.now() };

  return NextResponse.json({
    ...response,
    cached: false,
  });
}
