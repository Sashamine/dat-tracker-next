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
import crypto from 'node:crypto';
import { checkAllCompanyFilings } from '@/lib/verification/filing-checker';
import { getTickersNeedingReview } from '@/lib/verification/repository';
import { sendDiscordAlert, sendDiscordEmbed } from '@/lib/discord';
import { notifyNewFilings } from '@/lib/clawdbot';
import { autoExtractBatch, formatExtractionForDiscord, getProposedUpdates, type AutoExtractionResult } from '@/lib/sec/auto-extract-8k';
import { getCompanyByTicker } from '@/lib/data/companies';
import { D1Client } from '@/lib/d1';
import { writeExtractionProposals } from '@/lib/d1/proposals';

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

    // Auto-extract from Tier 1 8-K filings
    let extractionResults: AutoExtractionResult[] = [];
    const tier1_8Ks = result.results
      .filter(r => r.newFilings.length > 0)
      .flatMap(r => r.newFilings
        .filter(f => f.formType.startsWith('8-K') && f.itemFilter?.tier === 1)
        .map(f => ({
          ticker: r.ticker,
          cik: r.cik,
          accessionNumber: f.accessionNumber,
          formType: f.formType,
          filedDate: f.filedDate,
          primaryDocument: f.primaryDocument,
        }))
      );

    let proposalWriteStats: { written: number; skipped: number; errors: number } | null = null;

    if (!dryRun && tier1_8Ks.length > 0) {
      try {
        console.log(`[Filing Check] Auto-extracting from ${tier1_8Ks.length} Tier 1 8-K(s)...`);
        extractionResults = await autoExtractBatch(tier1_8Ks);
        const extracted = extractionResults.filter(r => r.extracted);
        console.log(`[Filing Check] Extracted holdings from ${extracted.length}/${tier1_8Ks.length} filings`);

        // Write high-confidence proposals to D1
        const proposedUpdates = getProposedUpdates(extractionResults);
        if (proposedUpdates.length > 0) {
          try {
            const d1 = D1Client.fromEnv();
            const runId = crypto.randomUUID();
            proposalWriteStats = await writeExtractionProposals(d1, proposedUpdates, runId);
            console.log(`[Filing Check] D1 proposals: ${proposalWriteStats.written} written, ${proposalWriteStats.skipped} skipped, ${proposalWriteStats.errors} errors`);
          } catch (d1Error) {
            console.error('[Filing Check] D1 proposal write failed:', d1Error);
          }
        }
      } catch (extractError) {
        console.error('[Filing Check] Auto-extraction failed:', extractError);
      }
    }

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

        // Include auto-extraction results in Discord message
        const extractionSummary = formatExtractionForDiscord(extractionResults);
        const proposedUpdates = getProposedUpdates(extractionResults);

        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'https://dat-tracker-next.vercel.app';

        let proposalLine = '';
        if (proposedUpdates.length > 0) {
          proposalLine = `\n\n⚠️ **${proposedUpdates.length} proposed data update(s)**`;
          if (proposalWriteStats?.written) {
            proposalLine += ` (${proposalWriteStats.written} written to D1)`;
          }
          proposalLine += `\n[Review proposals](${baseUrl}/api/proposals)`;
        }

        await sendDiscordAlert(
          'New SEC Filings Detected',
          `Found ${result.totalNewFilings} new filing(s) from ${result.withNewFilings} company(ies):\n\n${companiesWithFilings.join('\n')}${statsLine}${extractionSummary ? `\n\n${extractionSummary}` : ''}${proposalLine}`,
          proposedUpdates.length > 0 ? 'warning' : 'info',
          true  // Mention Clawdbot
        );

        // Also notify Clawdbot directly to trigger action
        const filingsForClawdbot = result.results
          .filter(r => r.newFilings.length > 0)
          .flatMap(r => r.newFilings.map(f => ({
            ticker: r.ticker,
            formType: f.formType,
            items: f.items,
          })));
        await notifyNewFilings(filingsForClawdbot);
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
      autoExtraction: extractionResults.length > 0 ? {
        attempted: extractionResults.length,
        extracted: extractionResults.filter(r => r.extracted).length,
        d1Proposals: proposalWriteStats,
        proposedUpdates: getProposedUpdates(extractionResults).map(r => ({
          ticker: r.ticker,
          accession: r.accessionNumber,
          holdings: r.holdings,
          currentHoldings: r.currentHoldings,
          delta: r.holdingsDelta,
          confidence: r.confidence,
          pattern: r.patternName,
          asOfDate: r.asOfDate,
        })),
        results: extractionResults.map(r => ({
          ticker: r.ticker,
          accession: r.accessionNumber,
          extracted: r.extracted,
          type: r.type,
          holdings: r.holdings,
          transactionAmount: r.transactionAmount,
          confidence: r.confidence,
          pattern: r.patternName,
          error: r.error,
        })),
      } : undefined,
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
