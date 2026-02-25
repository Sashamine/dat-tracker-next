/**
 * SEC Auto-Update Cron Endpoint
 *
 * Triggered hourly by Vercel Cron to check for new 8-K filings
 * and automatically update companies.ts when holdings changes are detected.
 *
 * Schedule: 0 * * * * (every hour at minute 0)
 *
 * This implements the ROADMAP architecture:
 * - SEC is authoritative, auto-update + notify
 * - Changes are committed to git for review via diffs
 */

import { NextRequest, NextResponse } from 'next/server';
import { runSecAutoUpdate, type SecUpdateResult } from '@/lib/sec-auto-update';

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

  // Feature flag: allow disabling this cron without removing the Vercel schedule.
  // Default is disabled unless explicitly enabled.
  const enabled = process.env.SEC_UPDATE_ENABLED === 'true';
  if (!enabled) {
    return NextResponse.json({ success: true, skipped: true, reason: 'SEC_UPDATE_ENABLED is not true' });
  }

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
    const sinceDays = parseInt(searchParams.get('sinceDays') || '7');
    
    // Force dryRun on Vercel (read-only filesystem)
    const isVercel = !!process.env.VERCEL;
    const dryRun = searchParams.get('dryRun') === 'true' || isVercel;
    
    if (isVercel && searchParams.get('dryRun') !== 'true') {
      console.log('[SEC Update Cron] Auto-enabled dryRun on Vercel (read-only filesystem)');
    }

    console.log(`[SEC Update Cron] Starting ${isManual ? 'manual' : 'scheduled'} run...`);
    if (dryRun) {
      console.log('[SEC Update Cron] DRY RUN mode enabled');
    }

    const startTime = Date.now();

    const { results, stats } = await runSecAutoUpdate({
      tickers,
      dryRun,
      sinceDays,
      autoCommit: !dryRun, // Only commit if not dry run
      minConfidence: 0.7,
      maxChangePct: 50,
    });

    const duration = Date.now() - startTime;

    // Categorize results
    const updated = results.filter(r => r.committed);
    const needsReview = results.filter(r => r.newHoldings !== undefined && r.newHoldings !== r.previousHoldings && !r.committed);
    const errors = results.filter(r => r.error);
    const unchanged = results.filter(r => r.success && !r.error && (r.newHoldings === undefined || r.newHoldings === r.previousHoldings));

    console.log(`[SEC Update Cron] Complete in ${duration}ms: ${updated.length} updated, ${needsReview.length} need review, ${errors.length} errors, ${unchanged.length} unchanged`);

    // Alerting is now handled by the monitoring module in runSecAutoUpdate

    return NextResponse.json({
      success: true,
      duration,
      summary: {
        totalChecked: results.length,
        updated: updated.length,
        needsReview: needsReview.length,
        errors: errors.length,
        unchanged: unchanged.length,
        // Include monitoring stats
        extraction: {
          xbrl: { attempted: stats.xbrlAttempted, success: stats.xbrlSuccess, failed: stats.xbrlFailed },
          llm: { attempted: stats.llmAttempted, success: stats.llmSuccess, failed: stats.llmFailed, skipped: stats.llmSkipped },
        },
      },
      updated: updated.map(r => ({
        ticker: r.ticker,
        previousHoldings: r.previousHoldings,
        newHoldings: r.newHoldings,
        filingDate: r.filingDate,
        confidence: r.confidence,
      })),
      needsReview: needsReview.map(r => ({
        ticker: r.ticker,
        previousHoldings: r.previousHoldings,
        newHoldings: r.newHoldings,
        reasoning: r.reasoning,
      })),
      errors: errors.length > 0 ? errors.map(r => ({
        ticker: r.ticker,
        error: r.error,
      })) : undefined,
    });

  } catch (error) {
    console.error('[SEC Update Cron] Run failed:', error);

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
