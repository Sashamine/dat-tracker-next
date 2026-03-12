/**
 * GET /api/admin/analytics — Usage analytics dashboard data
 *
 * Returns aggregated usage metrics for the admin dashboard.
 * Query params:
 *   days    — lookback window (default 7, max 90)
 *   secret  — ADMIN_SECRET (or x-admin-secret header)
 */

import { NextRequest, NextResponse } from 'next/server';
import { D1Client } from '@/lib/d1';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(90, Math.max(1, Number(searchParams.get('days')) || 7));
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();

  try {
    const d1 = D1Client.fromEnv();

    // Run all queries in parallel
    const [
      totalEvents,
      uniqueSessions,
      eventsByType,
      eventsByDay,
      topTickers,
      topRoutes,
      citationClicks,
      sessionActivity,
      recentEvents,
    ] = await Promise.all([
      // Total event count
      d1.query<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM adoption_events WHERE ts >= ?`,
        [cutoff]
      ),
      // Unique sessions
      d1.query<{ cnt: number }>(
        `SELECT COUNT(DISTINCT session_id) as cnt FROM adoption_events WHERE ts >= ?`,
        [cutoff]
      ),
      // Events by type
      d1.query<{ event: string; cnt: number }>(
        `SELECT event, COUNT(*) as cnt FROM adoption_events
         WHERE ts >= ?
         GROUP BY event ORDER BY cnt DESC`,
        [cutoff]
      ),
      // Events by day
      d1.query<{ day: string; cnt: number; sessions: number }>(
        `SELECT DATE(ts) as day, COUNT(*) as cnt, COUNT(DISTINCT session_id) as sessions
         FROM adoption_events
         WHERE ts >= ?
         GROUP BY DATE(ts) ORDER BY day DESC`,
        [cutoff]
      ),
      // Top tickers (by views)
      d1.query<{ ticker: string; views: number; citations: number }>(
        `SELECT ticker,
                SUM(CASE WHEN event = 'company_view' THEN 1 ELSE 0 END) as views,
                SUM(CASE WHEN event = 'citation_source_click' THEN 1 ELSE 0 END) as citations
         FROM adoption_events
         WHERE ts >= ? AND ticker IS NOT NULL AND ticker != ''
         GROUP BY ticker ORDER BY views DESC LIMIT 20`,
        [cutoff]
      ),
      // Top routes
      d1.query<{ route: string; cnt: number }>(
        `SELECT route, COUNT(*) as cnt FROM adoption_events
         WHERE ts >= ? AND route IS NOT NULL AND route != ''
         GROUP BY route ORDER BY cnt DESC LIMIT 20`,
        [cutoff]
      ),
      // Citation engagement: open → click rate
      d1.query<{ opens: number; clicks: number }>(
        `SELECT
           SUM(CASE WHEN event = 'citation_modal_open' THEN 1 ELSE 0 END) as opens,
           SUM(CASE WHEN event = 'citation_source_click' THEN 1 ELSE 0 END) as clicks
         FROM adoption_events WHERE ts >= ?`,
        [cutoff]
      ),
      // Session duration proxy: first→last event per session
      d1.query<{ session_id: string; first_ts: string; last_ts: string; events: number }>(
        `SELECT session_id,
                MIN(ts) as first_ts, MAX(ts) as last_ts,
                COUNT(*) as events
         FROM adoption_events
         WHERE ts >= ?
         GROUP BY session_id
         HAVING COUNT(*) >= 2
         ORDER BY events DESC LIMIT 50`,
        [cutoff]
      ),
      // Most recent events (for live feed)
      d1.query<{ ts: string; event: string; ticker: string | null; route: string | null; session_id: string }>(
        `SELECT ts, event, ticker, route, session_id FROM adoption_events
         ORDER BY ts DESC LIMIT 25`
      ),
    ]);

    // Compute derived metrics
    const citationData = citationClicks.results?.[0];
    const citationOpenRate = citationData && citationData.opens > 0
      ? Math.round((citationData.clicks / citationData.opens) * 100)
      : 0;

    const sessions = sessionActivity.results || [];
    const sessionDurations = sessions.map(s => {
      const first = new Date(s.first_ts).getTime();
      const last = new Date(s.last_ts).getTime();
      return (last - first) / 1000; // seconds
    }).filter(d => d > 0);
    const medianDuration = sessionDurations.length > 0
      ? sessionDurations.sort((a, b) => a - b)[Math.floor(sessionDurations.length / 2)]
      : 0;

    return NextResponse.json({
      success: true,
      period: { days, cutoff },
      summary: {
        totalEvents: totalEvents.results?.[0]?.cnt ?? 0,
        uniqueSessions: uniqueSessions.results?.[0]?.cnt ?? 0,
        citationClickRate: `${citationOpenRate}%`,
        citationOpens: citationData?.opens ?? 0,
        citationClicks: citationData?.clicks ?? 0,
        medianSessionDurationSec: Math.round(medianDuration),
        activeSessions: sessions.length,
      },
      eventsByType: eventsByType.results || [],
      eventsByDay: eventsByDay.results || [],
      topTickers: topTickers.results || [],
      topRoutes: topRoutes.results || [],
      recentEvents: recentEvents.results || [],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
