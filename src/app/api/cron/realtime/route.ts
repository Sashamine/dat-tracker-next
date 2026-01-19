/**
 * Real-time Holdings Poll Cron Job
 *
 * Polls real-time sources (mempool, Arkham, validators, trackers) for holdings updates.
 * Should be run frequently (every 5-15 minutes) for real-time data.
 *
 * Can also be triggered manually via ?manual=true
 */

import { NextResponse } from 'next/server';
import { getXXIHoldings } from '@/lib/monitoring/sources/realtime/xxi-mempool';
import { getKULRHoldings } from '@/lib/monitoring/sources/realtime/kulr-tracker';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 1 minute max

// Verify cron secret for Vercel Cron
const CRON_SECRET = process.env.CRON_SECRET;

interface PollResult {
  source: string;
  ticker: string;
  success: boolean;
  holdings?: number;
  changed?: boolean;
  error?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isManual = searchParams.get('manual') === 'true';
  const sourceFilter = searchParams.get('source'); // Optional: filter to specific source

  // Verify authorization
  if (!isManual) {
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  console.log('[Realtime Cron] Starting poll...');
  const results: PollResult[] = [];
  const startTime = Date.now();

  try {
    // Poll XXI Mempool
    if (!sourceFilter || sourceFilter === 'xxi') {
      console.log('[Realtime Cron] Polling XXI Mempool...');
      try {
        const xxiResult = await getXXIHoldings();
        if (xxiResult) {
          // For now, just return the holdings without recording to DB
          // (DB recording requires the migration to be run first)
          results.push({
            source: 'mempool',
            ticker: 'XXI',
            success: true,
            holdings: xxiResult.holdings,
            changed: true, // We don't track changes yet without DB
          });
        } else {
          results.push({
            source: 'mempool',
            ticker: 'XXI',
            success: false,
            error: 'Failed to fetch holdings',
          });
        }
      } catch (error) {
        results.push({
          source: 'mempool',
          ticker: 'XXI',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Poll KULR Tracker
    if (!sourceFilter || sourceFilter === 'kulr') {
      console.log('[Realtime Cron] Polling KULR Tracker...');
      try {
        const kulrResult = await getKULRHoldings();
        if (kulrResult) {
          results.push({
            source: 'tracker',
            ticker: 'KULR',
            success: true,
            holdings: kulrResult.holdings,
            changed: true,
          });
        } else {
          results.push({
            source: 'tracker',
            ticker: 'KULR',
            success: false,
            error: 'Failed to fetch holdings',
          });
        }
      } catch (error) {
        results.push({
          source: 'tracker',
          ticker: 'KULR',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // TODO: Add Arkham polling when API key is available
    // TODO: Add STKE validator polling
    // TODO: Add Metaplanet analytics polling

    const duration = Date.now() - startTime;
    const successful = results.filter(r => r.success).length;
    const changed = results.filter(r => r.changed).length;

    console.log(`[Realtime Cron] Complete: ${successful}/${results.length} successful, ${changed} changed (${duration}ms)`);

    return NextResponse.json({
      success: true,
      duration,
      results,
      summary: {
        total: results.length,
        successful,
        changed,
        failed: results.length - successful,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Realtime Cron] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results,
      },
      { status: 500 }
    );
  }
}
