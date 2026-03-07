import { NextResponse } from 'next/server';
import { D1Client } from '@/lib/d1';

/**
 * GET /api/d1/hps-growth
 *
 * Returns HPS (Holdings Per Share) growth metrics for all companies
 * with sufficient D1 history. Single query, suitable for leaderboards.
 *
 * Response shape per ticker:
 * {
 *   ticker, currentHps, hps30dAgo, hps90dAgo, hps1yAgo,
 *   growth30d, growth90d, growth1y,
 *   currentHoldings, currentShares, latestDate
 * }
 */

interface HpsGrowthRow {
  entity_id: string;
  as_of: string;
  holdings: number;
  shares: number;
}

interface HpsGrowthResult {
  ticker: string;
  currentHps: number;
  hps30dAgo: number | null;
  hps90dAgo: number | null;
  hps1yAgo: number | null;
  growth30d: number | null;
  growth90d: number | null;
  growth1y: number | null;
  currentHoldings: number;
  currentShares: number;
  latestDate: string;
}

export async function GET() {
  try {
    const d1 = D1Client.fromEnv();

    // Get all holdings_native and basic_shares datapoints in one query.
    // We pivot holdings + shares by (entity_id, as_of) date.
    const sql = `
      WITH holdings AS (
        SELECT entity_id, as_of, value AS holdings
        FROM datapoints
        WHERE metric = 'holdings_native' AND as_of IS NOT NULL AND value > 0
      ),
      shares AS (
        SELECT entity_id, as_of, value AS shares
        FROM datapoints
        WHERE metric = 'basic_shares' AND as_of IS NOT NULL AND value > 0
      ),
      joined AS (
        SELECT h.entity_id, h.as_of, h.holdings, s.shares
        FROM holdings h
        INNER JOIN shares s ON h.entity_id = s.entity_id AND h.as_of = s.as_of
      )
      SELECT entity_id, as_of, holdings, shares
      FROM joined
      ORDER BY entity_id ASC, as_of ASC
    `;

    const raw = await d1.query<HpsGrowthRow>(sql, []);
    const rows = raw.results;

    // Group by ticker
    const byTicker = new Map<string, HpsGrowthRow[]>();
    for (const row of rows) {
      const arr = byTicker.get(row.entity_id) || [];
      arr.push(row);
      byTicker.set(row.entity_id, arr);
    }

    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
    const d90 = new Date(now.getTime() - 90 * 86400000).toISOString().split('T')[0];
    const d1y = new Date(now.getTime() - 365 * 86400000).toISOString().split('T')[0];

    const results: HpsGrowthResult[] = [];

    for (const [ticker, snapshots] of byTicker) {
      if (snapshots.length === 0) continue;

      const latest = snapshots[snapshots.length - 1];
      const currentHps = latest.holdings / latest.shares;

      // Find closest snapshot on or before each target date
      const findHps = (target: string): number | null => {
        let best: HpsGrowthRow | null = null;
        for (const s of snapshots) {
          if (s.as_of <= target) best = s;
        }
        return best ? best.holdings / best.shares : null;
      };

      const hps30dAgo = findHps(d30);
      const hps90dAgo = findHps(d90);
      const hps1yAgo = findHps(d1y);

      const growth = (current: number, past: number | null): number | null =>
        past && past > 0 ? ((current - past) / past) * 100 : null;

      results.push({
        ticker,
        currentHps,
        hps30dAgo,
        hps90dAgo,
        hps1yAgo,
        growth30d: growth(currentHps, hps30dAgo),
        growth90d: growth(currentHps, hps90dAgo),
        growth1y: growth(currentHps, hps1yAgo),
        currentHoldings: latest.holdings,
        currentShares: latest.shares,
        latestDate: latest.as_of,
      });
    }

    // Sort by 90d growth descending (nulls last)
    results.sort((a, b) => (b.growth90d ?? -Infinity) - (a.growth90d ?? -Infinity));

    return NextResponse.json({
      success: true,
      count: results.length,
      results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
