/**
 * Quarterly Financial Refresh Cron Job
 *
 * Updates EV-related financial data (debt, cash, preferred equity) for companies.
 * Should be triggered after earnings season:
 * - Mid-February (Q4 results)
 * - Mid-May (Q1 results)
 * - Mid-August (Q2 results)
 * - Mid-November (Q3 results)
 *
 * Can also be triggered manually via ?manual=true
 */

import { NextResponse } from 'next/server';
import {
  runQuarterlyFinancialRefresh,
  refreshCompanyFinancials,
  COMPANIES_WITH_DEBT,
} from '@/lib/monitoring/sources/financial-data';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

// Verify cron secret for Vercel Cron
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isManual = searchParams.get('manual') === 'true';
  const tickersParam = searchParams.get('tickers');

  // Verify authorization
  if (!isManual) {
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    let result;

    if (tickersParam) {
      // Refresh specific tickers
      const tickers = tickersParam.split(',').map(t => t.trim().toUpperCase());
      console.log(`[Financials Cron] Refreshing specific tickers: ${tickers.join(', ')}`);
      result = await refreshCompanyFinancials(tickers);
    } else {
      // Full quarterly refresh
      console.log('[Financials Cron] Running quarterly financial refresh...');
      result = await runQuarterlyFinancialRefresh();
    }

    return NextResponse.json({
      success: true,
      ...result,
      companiesWithDebt: COMPANIES_WITH_DEBT,
    });
  } catch (error) {
    console.error('[Financials Cron] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
