/**
 * Company Comparison Debug Endpoint
 *
 * Fetches and compares our values against external sources for a specific ticker.
 * Useful for debugging and verifying data for individual companies.
 *
 * Usage: GET /api/debug/compare/MSTR
 *        GET /api/debug/compare/SBET?sources=sharplink-dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { allCompanies } from '@/lib/data/companies';
import { getLatestSnapshot, getLatestHoldings, getLatestDilutedShares } from '@/lib/data/holdings-history';
import { fetchers, FetchResult } from '@/lib/fetchers';
import { calculateMNAV } from '@/lib/calculations';
import { getMarketCapForMnavSync } from '@/lib/utils/market-cap';
import { FALLBACK_RATES } from '@/lib/utils/currency';
import { getBinancePrices } from '@/lib/binance';

// Companies with official mNAV dashboards
const MNAV_DASHBOARD_TICKERS = new Set([
  '3350.T', 'MSTR', 'SBET', 'DFDV', 'LITS', 'KULR', 'UPXI', 'ALTBG',
]);

// Map tickers to their relevant fetchers
const TICKER_FETCHERS: Record<string, string[]> = {
  'MSTR': ['strategy-dashboard', 'sec-xbrl', 'yahoo-finance'],
  'SBET': ['sharplink-dashboard', 'sec-xbrl', 'yahoo-finance'],
  'LITS': ['litestrategy-dashboard', 'sec-xbrl', 'yahoo-finance'],
  'KULR': ['kulr-tracker', 'sec-xbrl', 'yahoo-finance'],
  'UPXI': ['upexi-dashboard', 'sec-xbrl', 'yahoo-finance'],
  'ALTBG': ['capital-b-dashboard'],
  '3350.T': ['metaplanet-dashboard'],
  'DFDV': ['defidevcorp-dashboard', 'sec-xbrl', 'yahoo-finance'],
  'XXI': ['xxi-mempool', 'sec-xbrl', 'yahoo-finance'],
};

interface OurValues {
  holdings: number;
  holdingsSource?: string;
  holdingsDate?: string;
  sharesOutstanding?: number;
  sharesSource?: string;
  sharesDate?: string;
  totalDebt?: number;
  debtSource?: string;
  debtDate?: string;
  cashReserves?: number;
  cashSource?: string;
  cashDate?: string;
  preferredEquity?: number;
  preferredEquityDate?: string;
  calculatedMnav?: number;
}

// Helper to compare dates - returns true if fetched date is newer or equal to our date
function isNewerOrEqual(fetchedDate: string, ourDate?: string): boolean {
  if (!ourDate) return true; // If we don't have a date, show all fetched data
  try {
    const fetched = new Date(fetchedDate);
    const ours = new Date(ourDate);
    return fetched >= ours;
  } catch {
    return true; // If date parsing fails, show the data
  }
}

async function fetchLivePrices() {
  try {
    const crypto = await getBinancePrices();
    return { crypto, forex: FALLBACK_RATES };
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const upperTicker = ticker.toUpperCase();

  const company = allCompanies.find(c => c.ticker === upperTicker);
  if (!company) {
    return NextResponse.json({ error: 'Company not found: ' + upperTicker }, { status: 404 });
  }

  const searchParams = request.nextUrl.searchParams;
  const sourcesParam = searchParams.get('sources');
  const requestedSources = sourcesParam
    ? sourcesParam.split(',').map(s => s.trim())
    : TICKER_FETCHERS[upperTicker] || Object.keys(fetchers);

  const snapshot = getLatestSnapshot(upperTicker);
  const holdingsFromHistory = getLatestHoldings(upperTicker);
  const sharesFromHistory = getLatestDilutedShares(upperTicker);

  const ourValues: OurValues = {
    holdings: holdingsFromHistory ?? company.holdings,
    holdingsSource: snapshot?.source || company.holdingsSource,
    holdingsDate: snapshot?.date || company.holdingsLastUpdated,
    sharesOutstanding: company.sharesForMnav ?? sharesFromHistory,
    sharesSource: snapshot?.sharesSource,
    sharesDate: snapshot?.date,
    totalDebt: company.totalDebt,
    debtSource: company.debtSource,
    debtDate: company.debtAsOf,
    cashReserves: company.cashReserves,
    cashSource: company.cashSource,
    cashDate: company.cashAsOf,
    preferredEquity: company.preferredEquity,
    preferredEquityDate: company.debtAsOf, // Usually from same filing
  };

  // Calculate our mNAV if applicable
  if (MNAV_DASHBOARD_TICKERS.has(upperTicker) && company.holdings > 0) {
    const prices = await fetchLivePrices();
    const cryptoPrice = prices?.crypto[company.asset]?.price;

    if (cryptoPrice && cryptoPrice > 0) {
      const { marketCap } = getMarketCapForMnavSync(company, null, prices?.forex);

      if (marketCap > 0) {
        ourValues.calculatedMnav = calculateMNAV(
          marketCap,
          company.holdings,
          cryptoPrice,
          company.cashReserves ?? 0,
          0,
          company.totalDebt ?? 0,
          company.preferredEquity ?? 0,
          company.restrictedCash ?? 0
        ) ?? undefined;
      }
    }
  }

  // Fetch from external sources
  const fetchResults: Record<string, FetchResult[]> = {};
  const errors: Record<string, string> = {};

  for (const sourceName of requestedSources) {
    const fetcher = fetchers[sourceName];
    if (!fetcher) {
      errors[sourceName] = 'Fetcher not found';
      continue;
    }

    try {
      const results = await fetcher.fetch([upperTicker]);
      if (results.length > 0) {
        fetchResults[sourceName] = results;
      }
    } catch (error) {
      errors[sourceName] = error instanceof Error ? error.message : String(error);
    }
  }

  // Organize fetched values by field
  const fetchedByField: Record<string, Array<{
    source: string;
    value: number;
    url: string;
    date: string;
    raw?: unknown;
  }>> = {};

  for (const [, results] of Object.entries(fetchResults)) {
    for (const result of results) {
      if (!fetchedByField[result.field]) {
        fetchedByField[result.field] = [];
      }
      fetchedByField[result.field].push({
        source: result.source.name,
        value: result.value,
        url: result.source.url,
        date: result.source.date,
        raw: result.raw,
      });
    }
  }

  // Build comparisons
  const comparisons: Record<string, {
    ourValue: number | undefined;
    ourSource?: string;
    ourDate?: string;
    fetched: Array<{
      source: string;
      value: number;
      url: string;
      date: string;
      deviationPct?: string;
    }>;
  }> = {};

  // Holdings comparison - only show fetched values newer than our date
  if (fetchedByField.holdings) {
    const relevantFetched = fetchedByField.holdings.filter(f =>
      isNewerOrEqual(f.date, ourValues.holdingsDate)
    );
    if (relevantFetched.length > 0) {
      comparisons.holdings = {
        ourValue: ourValues.holdings,
        ourSource: ourValues.holdingsSource,
        ourDate: ourValues.holdingsDate,
        fetched: relevantFetched.map(f => ({
          source: f.source, value: f.value, url: f.url, date: f.date,
          deviationPct: ourValues.holdings
            ? ((f.value - ourValues.holdings) / ourValues.holdings * 100).toFixed(2) + '%'
            : undefined,
        })),
      };
    }
  }

  // Shares comparison - only show fetched values newer than our date
  if (fetchedByField.shares_outstanding) {
    const relevantFetched = fetchedByField.shares_outstanding.filter(f =>
      isNewerOrEqual(f.date, ourValues.sharesDate)
    );
    if (relevantFetched.length > 0) {
      comparisons.shares_outstanding = {
        ourValue: ourValues.sharesOutstanding,
        ourSource: ourValues.sharesSource,
        ourDate: ourValues.sharesDate,
        fetched: relevantFetched.map(f => ({
          source: f.source, value: f.value, url: f.url, date: f.date,
          deviationPct: ourValues.sharesOutstanding
            ? ((f.value - ourValues.sharesOutstanding) / ourValues.sharesOutstanding * 100).toFixed(2) + '%'
            : undefined,
        })),
      };
    }
  }

  // Debt comparison - only show fetched values newer than our date
  if (fetchedByField.debt) {
    const relevantFetched = fetchedByField.debt.filter(f =>
      isNewerOrEqual(f.date, ourValues.debtDate)
    );
    if (relevantFetched.length > 0) {
      comparisons.debt = {
        ourValue: ourValues.totalDebt,
        ourSource: ourValues.debtSource,
        ourDate: ourValues.debtDate,
        fetched: relevantFetched.map(f => ({
          source: f.source, value: f.value, url: f.url, date: f.date,
          deviationPct: ourValues.totalDebt
            ? ((f.value - ourValues.totalDebt) / ourValues.totalDebt * 100).toFixed(2) + '%'
            : undefined,
        })),
      };
    }
  }

  // Cash comparison - only show fetched values newer than our date
  if (fetchedByField.cash) {
    const relevantFetched = fetchedByField.cash.filter(f =>
      isNewerOrEqual(f.date, ourValues.cashDate)
    );
    if (relevantFetched.length > 0) {
      comparisons.cash = {
        ourValue: ourValues.cashReserves,
        ourSource: ourValues.cashSource,
        ourDate: ourValues.cashDate,
        fetched: relevantFetched.map(f => ({
          source: f.source, value: f.value, url: f.url, date: f.date,
          deviationPct: ourValues.cashReserves
            ? ((f.value - ourValues.cashReserves) / ourValues.cashReserves * 100).toFixed(2) + '%'
            : undefined,
        })),
      };
    }
  }

  // mNAV comparison
  if (fetchedByField.mnav) {
    comparisons.mnav = {
      ourValue: ourValues.calculatedMnav,
      ourSource: 'calculated',
      ourDate: new Date().toISOString().split('T')[0],
      fetched: fetchedByField.mnav.map(f => ({
        source: f.source, value: f.value, url: f.url, date: f.date,
        deviationPct: ourValues.calculatedMnav
          ? ((f.value - ourValues.calculatedMnav) / ourValues.calculatedMnav * 100).toFixed(2) + '%'
          : undefined,
      })),
    };
  }

  return NextResponse.json({
    ticker: upperTicker,
    company: {
      name: company.name,
      asset: company.asset,
      tier: company.tier,
      website: company.website,
    },
    ourValues,
    comparisons,
    fetchedRaw: fetchResults,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
    sourcesQueried: requestedSources,
  });
}
