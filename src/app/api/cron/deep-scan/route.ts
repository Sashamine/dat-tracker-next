/**
 * Deep Scan Cron Endpoint
 * 
 * Weekly deep scan with 30-day lookback to catch any missed filings.
 * Runs on Sundays to backfill gaps from outages or missed filings.
 * 
 * Schedule: 0 6 * * 0 (6am UTC every Sunday)
 * 
 * Priority 4 from sec-monitor-optimizations.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkAllCompanyFilings } from '@/lib/verification/filing-checker';
import { getTickersNeedingReview, getFilingCheckStates } from '@/lib/verification/repository';
import { sendDiscordAlert } from '@/lib/discord';

// Verify cron secret for scheduled runs
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
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
    // Get optional parameters
    const tickersParam = searchParams.get('tickers');
    const tickers = tickersParam
      ? tickersParam.split(',').map(t => t.trim().toUpperCase())
      : undefined;
    
    // Allow custom lookback (default 30 days for deep scan)
    const lookbackDays = parseInt(searchParams.get('days') || '30');
    const dryRun = searchParams.get('dryRun') === 'true';

    console.log(`[Deep Scan] Starting ${isManual ? 'manual' : 'scheduled'} ${lookbackDays}-day deep scan...`);

    const startTime = Date.now();

    // Get current filing check states to identify gaps
    const checkStates = await getFilingCheckStates();
    const now = new Date();
    
    // Identify companies with gaps (not checked in > 7 days)
    const companiesWithGaps: string[] = [];
    const companiesNeverChecked: string[] = [];
    
    for (const [ticker, state] of Object.entries(checkStates)) {
      if (!state.lastCheckAt) {
        companiesNeverChecked.push(ticker);
      } else {
        const lastCheck = new Date(state.lastCheckAt);
        const daysSinceCheck = Math.floor((now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceCheck > 7) {
          companiesWithGaps.push(ticker);
        }
      }
    }

    console.log(`[Deep Scan] Found ${companiesWithGaps.length} companies with gaps, ${companiesNeverChecked.length} never checked`);

    // Run deep scan on all companies (or specified tickers)
    const result = await checkAllCompanyFilings({
      tickers,
      rateLimit: 300,  // Slightly slower for deep scan
    });

    const duration = Date.now() - startTime;

    // Send Discord notification for deep scan results
    if (!dryRun && (result.totalNewFilings > 0 || companiesWithGaps.length > 0)) {
      try {
        const lines: string[] = [];
        
        if (result.totalNewFilings > 0) {
          lines.push(`**Found ${result.totalNewFilings} filing(s)** from ${result.withNewFilings} company(ies)`);
          
          const companiesWithFilings = result.results
            .filter(r => r.newFilings.length > 0)
            .slice(0, 10)
            .map(r => {
              const filingDetails = r.newFilings.map(f => {
                if (f.formType.startsWith('8-K') && f.items && f.items.length > 0) {
                  return `${f.formType} [${f.items.join(',')}]`;
                }
                return f.formType;
              });
              return `• **${r.ticker}**: ${filingDetails.join(', ')}`;
            });
          
          lines.push('');
          lines.push(...companiesWithFilings);
          
          if (result.results.filter(r => r.newFilings.length > 0).length > 10) {
            lines.push(`_...and ${result.results.filter(r => r.newFilings.length > 0).length - 10} more_`);
          }
        }
        
        if (companiesWithGaps.length > 0) {
          lines.push('');
          lines.push(`**Backfilled ${companiesWithGaps.length} companies** with check gaps >7 days`);
        }
        
        if (companiesNeverChecked.length > 0) {
          lines.push(`**First scan for ${companiesNeverChecked.length} companies**`);
        }
        
        lines.push('');
        lines.push(`_Deep scan (${lookbackDays} days) completed in ${Math.round(duration / 1000)}s_`);

        await sendDiscordAlert(
          '🔍 Weekly Deep Scan Complete',
          lines.join('\n'),
          result.totalNewFilings > 0 ? 'info' : 'info',
          result.totalNewFilings > 0  // Mention only if new filings found
        );
      } catch (notifyError) {
        console.error('[Deep Scan] Failed to send Discord notification:', notifyError);
      }
    }

    // Get updated review queue
    const needsReview = await getTickersNeedingReview();

    console.log(`[Deep Scan] Complete in ${duration}ms`);

    return NextResponse.json({
      success: true,
      duration,
      lookbackDays,
      summary: {
        companiesChecked: result.checked,
        companiesWithNewFilings: result.withNewFilings,
        totalNewFilings: result.totalNewFilings,
        companiesNeedingReview: needsReview.length,
        companiesWithGaps: companiesWithGaps.length,
        companiesNeverChecked: companiesNeverChecked.length,
        errors: result.errors.length,
        itemFilterStats: result.itemFilterStats,
      },
      gaps: {
        companiesWithGaps: companiesWithGaps.slice(0, 20),
        companiesNeverChecked: companiesNeverChecked.slice(0, 20),
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
            items: f.items,
            itemFilterTier: f.itemFilter?.tier,
          })),
        })),
      errors: result.errors.length > 0 ? result.errors : undefined,
    });

  } catch (error) {
    console.error('[Deep Scan] Run failed:', error);

    // Alert on failure
    try {
      await sendDiscordAlert(
        '🚨 Deep Scan Failed',
        `Weekly deep scan encountered an error:\n\n\`${error instanceof Error ? error.message : String(error)}\``,
        'error',
        true  // Always mention on failures
      );
    } catch {}

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
