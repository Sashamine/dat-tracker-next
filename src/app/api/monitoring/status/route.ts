/**
 * Monitoring Status API
 * GET: Get current monitoring system status
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Get last run info
    const lastRunResult = await query(`
      SELECT
        id,
        run_type as "runType",
        started_at as "startedAt",
        completed_at as "completedAt",
        duration_ms as "durationMs",
        status,
        sources_checked as "sourcesChecked",
        companies_checked as "companiesChecked",
        updates_detected as "updatesDetected",
        updates_auto_approved as "updatesAutoApproved",
        updates_pending_review as "updatesPendingReview",
        notifications_sent as "notificationsSent",
        errors_count as "errorsCount",
        error_details as "errorDetails"
      FROM monitoring_runs
      ORDER BY started_at DESC
      LIMIT 1
    `);

    // Get pending counts
    const pendingResult = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved' AND created_at > NOW() - INTERVAL '24 hours') as "approvedToday",
        COUNT(*) FILTER (WHERE status = 'rejected' AND created_at > NOW() - INTERVAL '24 hours') as "rejectedToday"
      FROM pending_updates
    `);

    // Get recent runs
    const recentRunsResult = await query(`
      SELECT
        id,
        run_type as "runType",
        started_at as "startedAt",
        completed_at as "completedAt",
        status,
        updates_detected as "updatesDetected",
        errors_count as "errorsCount"
      FROM monitoring_runs
      ORDER BY started_at DESC
      LIMIT 10
    `);

    // Get source statistics
    const sourceStatsResult = await query(`
      SELECT
        source_type as "sourceType",
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        AVG(confidence_score) as "avgConfidence"
      FROM pending_updates
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY source_type
    `);

    // Query returns rows directly as an array
    const lastRun = (lastRunResult as any[])[0] || null;
    const pendingCounts = (pendingResult as any[])[0] || { pending: '0', approvedToday: '0', rejectedToday: '0' };
    const recentRuns = recentRunsResult as any[];
    const sourceStats = sourceStatsResult as any[];

    return NextResponse.json({
      lastRun,
      pendingCounts: {
        pending: parseInt(pendingCounts.pending || '0'),
        approvedToday: parseInt(pendingCounts.approvedToday || '0'),
        rejectedToday: parseInt(pendingCounts.rejectedToday || '0'),
      },
      recentRuns,
      sourceStats: sourceStats.map(row => ({
        ...row,
        total: parseInt(row.total),
        approved: parseInt(row.approved),
        pending: parseInt(row.pending),
        avgConfidence: parseFloat(row.avgConfidence || '0'),
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching monitoring status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitoring status' },
      { status: 500 }
    );
  }
}
