/**
 * Filing Check Cron Endpoint
 *
 * Periodically checks SEC EDGAR for new filings and marks companies
 * as needing review when new filings are found.
 *
 * Schedule: 0 14 * * * (2pm UTC daily - after market close)
 *
 * This is part of the verification state system:
 * 1. This cron marks companies with new filings as "needs_review"
 * 2. A separate process extracts data from new filings
 * 3. Extracted data updates baselines and share_events
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkAllCompanyFilings } from '@/lib/verification/filing-checker';
import { getTickersNeedingReview } from '@/lib/verification/repository';
import { sendDiscordAlert } from '@/lib/discord';

// Verify cron secret for scheduled runs
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Allow manual runs if no CRON_SECRET is set (dev mode)
  if (!cronSecret) return true;

  if (!authHeader) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const isManual = searchParams.get('manual') === 'true';

  // Verify authorization for cron runs
  if (!isManual && !verifyCronSecret(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Get optional parameters
    const tickersParam = searchParams.get('tickers');
    const tickers = tickersParam
      ? tickersParam.split(',').map(t => t.trim().toUpperCase())
      : undefined;

    const dryRun = searchParams.get('dryRun') === 'true';

    console.log(`[Filing Check] Starting ${isManual ? 'manual' : 'scheduled'} run...`);
    if (dryRun) {
      console.log('[Filing Check] DRY RUN mode - not updating database');
    }

    const startTime = Date.now();

    // Check all companies for new filings
    const result = await checkAllCompanyFilings({
      tickers,
      rateLimit: 250, // 250ms between requests to be polite to SEC
    });

    const duration = Date.now() - startTime;

    // Send Discord notification if new filings found
    if (!dryRun && result.totalNewFilings > 0) {
      try {
        const companiesWithFilings = result.results
          .filter(r => r.newFilings.length > 0)
          .map(r => {
            // Include item codes for 8-Ks
            const filingDetails = r.newFilings.map(f => {
              if (f.formType.startsWith('8-K') && f.items && f.items.length > 0) {
                const tier = f.itemFilter?.tier === 1 ? '🔴' : '🟡';
                return `${f.formType} ${tier} [${f.items.join(',')}]`;
              }
              return f.formType;
            });
            return `**${r.ticker}**: ${filingDetails.join(', ')}`;
          });

        const filterStats = result.itemFilterStats;
        const statsLine = filterStats 
          ? `\n\n_Item filtering: ${filterStats.tier1Processed} high-priority, ${filterStats.tier2Processed} need keyword check_`
          : '';

        await sendDiscordAlert(
          'New SEC Filings Detected',
          `Found ${result.totalNewFilings} new filing(s) from ${result.withNewFilings} company(ies):\n\n${companiesWithFilings.join('\n')}${statsLine}\n\nRun /api/cron/filing-check?manual=true to see details.`,
          'info',
          true  // Mention Clawdbot
        );
      } catch (notifyError) {
        console.error('[Filing Check] Failed to send Discord notification:', notifyError);
      }
    }

    // Get companies needing review
    const needsReview = await getTickersNeedingReview();

    console.log(`[Filing Check] Complete in ${duration}ms`);

    return NextResponse.json({
      success: true,
      duration,
      summary: {
        companiesChecked: result.checked,
        companiesWithNewFilings: result.withNewFilings,
        totalNewFilings: result.totalNewFilings,
        companiesNeedingReview: needsReview.length,
        errors: result.errors.length,
        itemFilterStats: result.itemFilterStats,
      },
      newFilings: result.results
        .filter(r => r.newFilings.length > 0)
        .map(r => ({
          ticker: r.ticker,
          cik: r.cik,
          filings: r.newFilings.map(f => ({
            accessionNumber: f.accessionNumber,
            formType: f.formType,
            filedDate: f.filedDate,
            periodDate: f.periodDate,
            // Include item codes and filter result for 8-Ks
            items: f.items,
            itemFilterTier: f.itemFilter?.tier,
            itemFilterReason: f.itemFilter?.reason,
          })),
        })),
      needsReview: needsReview.map(c => ({
        ticker: c.ticker,
        reason: c.reviewReason,
        latestFiling: c.latestFilingAccession,
        latestDate: c.latestFilingDate,
      })),
      errors: result.errors.length > 0 ? result.errors : undefined,
    });

  } catch (error) {
    console.error('[Filing Check] Run failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Vercel Cron configuration
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max
