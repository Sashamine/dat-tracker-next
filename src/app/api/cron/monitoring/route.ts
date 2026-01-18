/**
 * Vercel Cron Monitoring Endpoint
 * Triggered hourly by Vercel Cron to run the monitoring agent
 *
 * Schedule: 0 * * * * (every hour)
 */

import { NextRequest, NextResponse } from 'next/server';
import { runMonitoringAgent } from '@/lib/monitoring';
import { MONITORING_SOURCES, type MonitoringSource } from '@/lib/monitoring/types';

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
    // Determine run type
    const runType = isManual ? 'manual' : 'hourly';

    // Get optional company filter
    const companyIds = searchParams.get('companyIds')
      ?.split(',')
      .map(id => parseInt(id))
      .filter(id => !isNaN(id));

    // Determine which sources to check
    // By default, check all configured sources
    const sourcesParam = searchParams.get('sources');
    const sources: MonitoringSource[] = sourcesParam
      ? (sourcesParam.split(',').filter(s =>
          MONITORING_SOURCES.includes(s as MonitoringSource)
        ) as MonitoringSource[])
      : [...MONITORING_SOURCES];

    console.log(`[Monitoring] Starting ${runType} run, sources: ${sources.join(', ')}`);

    const result = await runMonitoringAgent({
      runType: runType as 'hourly' | 'manual',
      sources,
      companyIds,
    });

    console.log(`[Monitoring] Completed. Detected: ${result.updatesDetected}, Auto-approved: ${result.updatesAutoApproved}, Pending: ${result.updatesPendingReview}`);

    return NextResponse.json({
      success: true,
      runId: result.runId,
      duration: result.duration,
      stats: {
        sourcesChecked: result.sourcesChecked,
        companiesChecked: result.companiesChecked,
        updatesDetected: result.updatesDetected,
        updatesAutoApproved: result.updatesAutoApproved,
        updatesPendingReview: result.updatesPendingReview,
        notificationsSent: result.notificationsSent,
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error('[Monitoring] Run failed:', error);

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
