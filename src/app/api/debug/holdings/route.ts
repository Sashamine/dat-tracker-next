/**
 * Debug endpoint to check current holdings-history.ts values
 * Usage: /api/debug/holdings?ticker=BTCS
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLatestSnapshot, getLatestHoldings, getLatestDilutedShares } from '@/lib/data/holdings-history';
import { allCompanies } from '@/lib/data/companies';

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get('ticker')?.toUpperCase();

  if (!ticker) {
    // Return summary of all companies
    const summary = allCompanies.slice(0, 10).map(c => ({
      ticker: c.ticker,
      holdingsFromHistory: getLatestHoldings(c.ticker),
      sharesFromHistory: getLatestDilutedShares(c.ticker),
      sharesFromCompanies: c.sharesForMnav,
    }));
    return NextResponse.json({ sample: summary });
  }

  const company = allCompanies.find(c => c.ticker === ticker);
  const snapshot = getLatestSnapshot(ticker);
  const holdingsFromHistory = getLatestHoldings(ticker);
  const sharesFromHistory = getLatestDilutedShares(ticker);

  return NextResponse.json({
    ticker,
    found: !!company,
    snapshot,
    holdingsFromHistory,
    sharesFromHistory,
    sharesFromCompanies: company?.sharesForMnav,
    // Which value the comparison engine would use
    comparisonEngineWouldUse: {
      shares: sharesFromHistory ?? company?.sharesForMnav,
      holdings: holdingsFromHistory ?? company?.holdings,
    },
  });
}
