/**
 * mNAV.com API - Batch endpoint
 * Fetches live balance sheet data for all supported companies
 */

import { NextResponse } from 'next/server';
import { MNAV_COMPANY_SLUGS } from '@/lib/monitoring/sources/mnav-api';

// Cache for batch data (5 minutes)
let batchCache: { data: Record<string, MnavCompanyData>; timestamp: number } | null = null;
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

interface MnavCompanyData {
  ticker: string;
  holdings: number;
  debt: number;
  cash: number;
  fdShares: number;
  preferredEquity: number;
  lastUpdated: string;
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

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function GET() {
  // Return cached data if fresh
  if (batchCache && Date.now() - batchCache.timestamp < CACHE_TTL) {
    return NextResponse.json({
      data: batchCache.data,
      count: Object.keys(batchCache.data).length,
      cached: true,
      timestamp: new Date(batchCache.timestamp).toISOString(),
    });
  }

  // Fetch all companies in parallel
  const results: Record<string, MnavCompanyData> = {};
  const entries = Object.entries(MNAV_COMPANY_SLUGS);

  const promises = entries.map(async ([ticker, slug]) => {
    const data = await fetchMnavData(slug);
    if (data?.latest) {
      results[ticker] = {
        ticker,
        holdings: data.latest.btcHeld,
        debt: data.latest.totalDebt || 0,
        cash: data.latest.totalCash || 0,
        fdShares: data.latest.fullyDilutedShares || data.latest.issuedShares,
        preferredEquity: data.latest.totalPreferredStock || 0,
        lastUpdated: data.metadata?.preparedAt || new Date().toISOString(),
      };
    }
    // Small delay between requests to be polite
    await new Promise(r => setTimeout(r, 100));
  });

  await Promise.all(promises);

  // Update cache
  batchCache = { data: results, timestamp: Date.now() };

  return NextResponse.json({
    data: results,
    count: Object.keys(results).length,
    supported: Object.keys(MNAV_COMPANY_SLUGS),
    cached: false,
    timestamp: new Date().toISOString(),
  });
}
