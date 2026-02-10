/**
 * MSTR Auto-Update Cron Endpoint
 * 
 * Checks for new MSTR 8-Ks and updates:
 * - mstr-holdings-verified.ts
 * - mstr-atm-sales.ts
 * - mstr-capital-events.ts
 * 
 * Schedule: Can be triggered hourly or daily
 * 
 * Usage:
 *   GET /api/cron/mstr-update              - Run with defaults
 *   GET /api/cron/mstr-update?manual=true  - Manual run (no auth required in dev)
 *   GET /api/cron/mstr-update?dryRun=true  - Dry run (no file changes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { runMSTRAutoUpdate } from '@/lib/mstr-auto-update';
import path from 'path';

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
    // Force dryRun on Vercel (read-only filesystem)
    const isVercel = !!process.env.VERCEL;
    const dryRun = searchParams.get('dryRun') === 'true' || isVercel;
    const maxFilings = parseInt(searchParams.get('maxFilings') || '10');

    if (isVercel && searchParams.get('dryRun') !== 'true') {
      console.log('[MSTR Update] Auto-enabled dryRun on Vercel (read-only filesystem)');
    }

    console.log(`[MSTR Update] Starting ${isManual ? 'manual' : 'scheduled'} run...`);
    console.log(`[MSTR Update] Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);

    const startTime = Date.now();

    // Get project root - works in both dev and production
    const projectRoot = process.cwd();

    const result = await runMSTRAutoUpdate({
      projectRoot,
      dryRun,
      maxFilings,
    });

    const duration = Date.now() - startTime;

    console.log(`[MSTR Update] Complete in ${duration}ms`);
    console.log(`[MSTR Update] New filings: ${result.newFilings}, Processed: ${result.processed.length}, Errors: ${result.errors.length}`);

    return NextResponse.json({
      success: result.success,
      duration,
      dryRun,
      summary: {
        newFilings: result.newFilings,
        processed: result.processed.length,
        errors: result.errors.length,
      },
      processed: result.processed.map(p => ({
        accession: p.accession,
        filingDate: p.filingDate,
        holdings: p.holdings,
        btcAcquired: p.btcAcquired,
        atmShares: p.atmShares,
        filesUpdated: p.updated,
      })),
      errors: result.errors.length > 0 ? result.errors : undefined,
    });

  } catch (error) {
    console.error('[MSTR Update] Run failed:', error);

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
export const maxDuration = 120; // 2 minutes max
