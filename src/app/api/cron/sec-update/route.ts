/**
 * SEC Auto-Update Cron Endpoint
 *
 * Triggered hourly by Vercel Cron to check for new SEC filings
 * and extract holdings data via hybrid XBRL + LLM pipeline.
 *
 * Schedule: 30 * * * * (every hour at minute 30)
 *
 * Architecture:
 * - Extraction results are written to D1 (works on Vercel)
 * - D1 overlay serves live values to the UI at runtime
 * - Filesystem writes (companies.ts, git) are blocked on Vercel (read-only)
 * - companies.ts is periodically synced from D1 via local script
 */

import { NextRequest, NextResponse } from 'next/server';
import { runSecAutoUpdate } from '@/lib/sec-auto-update';

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
  // Default is ENABLED. Set SEC_UPDATE_ENABLED=false to disable.
  const enabled = process.env.SEC_UPDATE_ENABLED !== 'false';
  if (!enabled) {
    return NextResponse.json({ success: true, skipped: true, reason: 'SEC_UPDATE_ENABLED is false' });
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
    
    // Filesystem dryRun: always true on Vercel (read-only filesystem).
    // D1 writes are independent — they work fine on Vercel.
    const isVercel = !!process.env.VERCEL;
    const explicitDryRun = searchParams.get('dryRun') === 'true';
    const fsDryRun = explicitDryRun || isVercel;

    console.log(`[SEC Update Cron] Starting ${isManual ? 'manual' : 'scheduled'} run...`);
    if (isVercel) {
      console.log('[SEC Update Cron] Vercel mode: filesystem writes blocked, D1 writes enabled');
    }
    if (explicitDryRun) {
      console.log('[SEC Update Cron] Full DRY RUN mode (filesystem + D1)');
    }

    const startTime = Date.now();

    const { results, stats } = await runSecAutoUpdate({
      tickers,
      dryRun: fsDryRun,          // Block filesystem writes on Vercel
      d1DryRun: explicitDryRun,  // Only block D1 writes on explicit dryRun
      sinceDays,
      autoCommit: !fsDryRun,     // Only commit if not dry run
      minConfidence: 0.7,
      maxChangePct: 50,
    });

    const duration = Date.now() - startTime;

    // Categorize results
    const updated = results.filter(r => r.committed);
    const needsReview = results.filter(r => r.newHoldings !== undefined && r.newHoldings !== r.previousHoldings && !r.committed);
    const errors = results.filter(r => r.error);
    const unchanged = results.filter(r => r.success && !r.error && (r.newHoldings === undefined || r.newHoldings === r.previousHoldings));
    const d1Writes = results
      .map(r => r.d1HoldingsNativeWrite?.status)
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
    const d1Summary = {
      inserted: d1Writes.filter(s => s === 'inserted').length,
      updated: d1Writes.filter(s => s === 'updated').length,
      seededProposalKey: d1Writes.filter(s => s === 'seededProposalKey').length,
      noop: d1Writes.filter(s => s === 'noop' || s === 'dry_run').length,
      skipped: d1Writes.filter(s => s === 'skipped').length,
      errors: d1Writes.filter(s => s === 'error').length,
    };

    console.log(
      `[SEC Update Cron] Complete in ${duration}ms: ` +
      `${updated.length} updated, ${needsReview.length} need review, ${errors.length} errors, ${unchanged.length} unchanged, ` +
      `D1 holdings_native {inserted:${d1Summary.inserted}, updated:${d1Summary.updated}, seeded:${d1Summary.seededProposalKey}, noop:${d1Summary.noop}, skipped:${d1Summary.skipped}, errors:${d1Summary.errors}}`
    );

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
        d1HoldingsNative: d1Summary,
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
