/**
 * mNAV.com API proxy
 * Fetches live balance sheet and holdings data from mNAV.com
 *
 * Returns: { holdings, debt, cash, fdShares, mnav, marketCap, enterpriseValue }
 */

import { NextRequest, NextResponse } from 'next/server';

// Map tickers to mNAV.com slugs
const MNAV_COMPANY_SLUGS: Record<string, string> = {
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
  'KULR': 'kulr',
  'DJT': 'trump-media',
  'NAKA': 'nakamoto',
  // '3350.T': 'metaplanet', // Disabled: mNAV.com displays JPY values as USD
  '0434.HK': 'boyaa',
  'H100.ST': 'h100',
  // 'NXTT': 'next-technology', // Disabled: mNAV.com hasn't adjusted for 200:1 reverse split (Sep 2025)
};

// Cache for mNAV data (5 minutes)
const cache = new Map<string, { data: MnavResponse; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Actual mNAV.com API response structure
interface MnavApiResponse {
  latest: {
    btcHeld: number;
    btcPrice: number;
    sharePrice: number;
    issuedShares: number;
    fullyDilutedShares: number;
    totalCash: number;
    totalDebt: number;
    totalPreferredStock: number;
  };
  metadata: {
    preparedAt: string;
    companyName: string;
    stockSymbol: string;
  };
}

interface MnavResponse {
  ticker: string;
  holdings: number;
  debt: number;
  cash: number;
  fdShares: number;
  preferredEquity: number;
  btcPrice: number;
  sharePrice: number;
  lastUpdated: string;
  source: 'mnav.com';
}

async function fetchMnavData(slug: string): Promise<MnavApiResponse | null> {
  try {
    const url = `https://www.mnav.com/api/companies/${slug}/prepared-chart-data`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DAT-Tracker/1.0)',
        'Accept': 'application/json',
      },
      next: { revalidate: 300 }, // Cache at edge for 5 min
    });

    if (!response.ok) {
      console.log(`[mNAV API] Error for ${slug}: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`[mNAV API] Error fetching ${slug}:`, error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const upperTicker = ticker.toUpperCase();

  // Check if this ticker is supported
  const slug = MNAV_COMPANY_SLUGS[upperTicker];
  if (!slug) {
    return NextResponse.json(
      { error: `Ticker ${upperTicker} not available on mNAV.com`, supported: Object.keys(MNAV_COMPANY_SLUGS) },
      { status: 404 }
    );
  }

  // Check cache
  const cached = cache.get(upperTicker);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({
      ...cached.data,
      cached: true,
    });
  }

  // Fetch from mNAV.com
  const data = await fetchMnavData(slug);

  if (!data?.latest) {
    return NextResponse.json(
      { error: `No data available for ${upperTicker}` },
      { status: 404 }
    );
  }

  const response: MnavResponse = {
    ticker: upperTicker,
    holdings: data.latest.btcHeld,
    debt: data.latest.totalDebt || 0,
    cash: data.latest.totalCash || 0,
    fdShares: data.latest.fullyDilutedShares || data.latest.issuedShares,
    preferredEquity: data.latest.totalPreferredStock || 0,
    btcPrice: data.latest.btcPrice,
    sharePrice: data.latest.sharePrice,
    lastUpdated: data.metadata?.preparedAt || new Date().toISOString(),
    source: 'mnav.com',
  };

  // Update cache
  cache.set(upperTicker, { data: response, timestamp: Date.now() });

  return NextResponse.json({
    ...response,
    cached: false,
  });
}
