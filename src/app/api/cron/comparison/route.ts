/**
 * Comparison Engine Cron Endpoint
 *
 * Triggered twice daily by Vercel Cron to compare our values (companies.ts)
 * against fetched values from sources (mNAV, dashboards, SEC XBRL).
 *
 * Schedule: 0 9,12 * * * (9am and 12pm UTC daily)
 *
 * This implements the ROADMAP architecture:
 * - Twice daily (9am, 12pm) → flag discrepancy → email digest → human review
 * - Discrepancies are recorded in database for review UI
 */

import { NextRequest, NextResponse } from 'next/server';
import { runComparison, type ComparisonResult } from '@/lib/comparison/engine';
import { sendDiscrepancySummary, sendDiscordAlert } from '@/lib/discord';

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
    const tickers = tickersParam ? tickersParam.split(',').map(t => t.trim().toUpperCase()) : undefined;

    const sourcesParam = searchParams.get('sources');
    const sources = sourcesParam ? sourcesParam.split(',').map(s => s.trim()) : undefined;

    const dryRun = searchParams.get('dryRun') === 'true';

    console.log(`[Comparison Cron] Starting ${isManual ? 'manual' : 'scheduled'} run...`);
    if (dryRun) {
      console.log('[Comparison Cron] DRY RUN mode enabled');
    }

    const startTime = Date.now();

    const result = await runComparison({
      tickers,
      sources,
      dryRun,
    });

    const duration = Date.now() - startTime;

    // Group discrepancies by severity
    const bySeverity = {
      major: result.discrepancies.filter(d => d.severity === 'major'),
      moderate: result.discrepancies.filter(d => d.severity === 'moderate'),
      minor: result.discrepancies.filter(d => d.severity === 'minor'),
    };

    console.log(`[Comparison Cron] Complete in ${duration}ms: ${result.discrepancies.length} discrepancies (${bySeverity.major.length} major, ${bySeverity.moderate.length} moderate, ${bySeverity.minor.length} minor)`);

    // Send Discord notification with discrepancy summary
    if (!dryRun) {
      try {
        if (result.discrepancies.length > 0) {
          await sendDiscrepancySummary(result.discrepancies, duration);
        } else {
          // Optionally notify on successful runs with no discrepancies
          // Disabled by default to reduce noise
          // await sendDiscordAlert('Data Verification Complete', 'No discrepancies found.', 'info');
        }

        // Alert on errors
        if (result.errors.length > 0) {
          await sendDiscordAlert(
            'Verification Errors',
            `${result.errors.length} error(s) during verification:\n${result.errors.map(e => `- ${e.source}: ${e.error}`).join('\n')}`,
            'warning'
          );
        }
      } catch (notifyError) {
        console.error('[Comparison Cron] Failed to send Discord notification:', notifyError);
      }
    }

    return NextResponse.json({
      success: true,
      duration,
      summary: {
        fetchResults: result.fetchResults,
        totalDiscrepancies: result.discrepancies.length,
        majorDiscrepancies: bySeverity.major.length,
        moderateDiscrepancies: bySeverity.moderate.length,
        minorDiscrepancies: bySeverity.minor.length,
        errors: result.errors.length,
      },
      discrepancies: result.discrepancies.map(d => ({
        ticker: d.ticker,
        field: d.field,
        ourValue: d.ourValue,
        ourSourceDate: d.ourSourceDate,  // When our data is from
        ourSourceUrl: d.ourSourceUrl,    // URL we cite as source
        ourSourceType: d.ourSourceType,  // Type of source
        verificationMethod: d.verificationMethod,  // How to verify: xbrl, fetcher, manual
        sourceValues: d.sourceValues,
        newerSourceDate: d.newerSourceDate,  // Newest external source date
        maxDeviationPct: d.maxDeviationPct.toFixed(2) + '%',
        severity: d.severity,
      })),
      errors: result.errors.length > 0 ? result.errors : undefined,
    });

  } catch (error) {
    console.error('[Comparison Cron] Run failed:', error);

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
