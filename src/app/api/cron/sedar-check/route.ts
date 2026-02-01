/**
 * SEDAR+ Filing Check Cron Endpoint
 *
 * Returns expected filing status for Canadian companies.
 * Actual scraping is done via GitHub Actions (scripts/sedar-check.ts).
 * 
 * This endpoint:
 * - Returns expected filings based on fiscal year ends
 * - Can be called manually to check status
 * - Used by the admin page to show filing tracker
 *
 * Note: Real-time filing detection runs via GitHub Actions with Playwright.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getExpectedFilings, getSedarSearchUrl } from '@/lib/sedar/filing-tracker';
import { CANADIAN_COMPANIES } from '@/lib/sedar/canadian-companies';

// Verify cron secret for scheduled runs
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // Allow in dev
  if (!authHeader) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const isManual = searchParams.get('manual') === 'true';

  if (!isManual && !verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[SEDAR Check] Fetching expected filings...');

    const expectedFilings = getExpectedFilings();
    const overdue = expectedFilings.filter(f => f.status === 'overdue');
    const pending = expectedFilings.filter(f => f.status === 'pending');

    // Calculate days until next expected filing
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dueSoon = pending.filter(f => new Date(f.expectedBy) <= weekFromNow);

    return NextResponse.json({
      success: true,
      summary: {
        companiesMonitored: CANADIAN_COMPANIES.length,
        overdue: overdue.length,
        dueSoon: dueSoon.length,
        pending: pending.length,
      },
      companies: CANADIAN_COMPANIES.map(c => ({
        ...c,
        sedarSearchUrl: getSedarSearchUrl(c.sedarProfileNumber),
      })),
      expectedFilings,
      note: 'Real-time filing detection runs via GitHub Actions with Playwright. This endpoint shows expected quarterly/annual filings.',
    });

  } catch (error) {
    console.error('[SEDAR Check] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
