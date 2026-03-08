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
  currentSnapshot: {
    date: string;
    holdings: number;
    sharesOutstanding: number;
    holdingsPerShare: number;
  };
  snapshot30d: {
    date: string;
    holdings: number;
    sharesOutstanding: number;
    holdingsPerShare: number;
  } | null;
  snapshot90d: {
    date: string;
    holdings: number;
    sharesOutstanding: number;
    holdingsPerShare: number;
  } | null;
  snapshot1y: {
    date: string;
    holdings: number;
    sharesOutstanding: number;
    holdingsPerShare: number;
  } | null;
}

export async function GET() {
  try {
    const d1 = D1Client.fromEnv();

    // Get all holdings_native and basic_shares datapoints in one query.
    // We pivot holdings + shares by (entity_id, as_of) date.
    // Dedup: when multiple entries exist for the same (entity, metric, date),
    // prefer backfill_holdings_history_ts (manually verified) over XBRL
    // (which can report subsets like staked-only holdings). Fall back to MAX.
    const sql = `
      WITH holdings_deduped AS (
        SELECT entity_id, as_of,
          COALESCE(
            MAX(CASE WHEN method = 'backfill_holdings_history_ts' THEN value END),
            MAX(value)
          ) AS holdings
        FROM datapoints
        WHERE metric = 'holdings_native' AND as_of IS NOT NULL AND value > 0
        GROUP BY entity_id, as_of
      ),
      shares_deduped AS (
        SELECT entity_id, as_of,
          COALESCE(
            MAX(CASE WHEN method = 'backfill_holdings_history_ts' THEN value END),
            MAX(value)
          ) AS shares
        FROM datapoints
        WHERE metric = 'basic_shares' AND as_of IS NOT NULL AND value > 0
        GROUP BY entity_id, as_of
      ),
      joined AS (
        SELECT h.entity_id, h.as_of, h.holdings, s.shares
        FROM holdings_deduped h
        INNER JOIN shares_deduped s ON h.entity_id = s.entity_id AND h.as_of = s.as_of
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
      const findSnapshot = (target: string): HpsGrowthRow | null => {
        let best: HpsGrowthRow | null = null;
        for (const s of snapshots) {
          if (s.as_of <= target) best = s;
        }
        return best;
      };

      const snapshot30d = findSnapshot(d30);
      const snapshot90d = findSnapshot(d90);
      const snapshot1y = findSnapshot(d1y);
      const hps30dAgo = snapshot30d ? snapshot30d.holdings / snapshot30d.shares : null;
      const hps90dAgo = snapshot90d ? snapshot90d.holdings / snapshot90d.shares : null;
      const hps1yAgo = snapshot1y ? snapshot1y.holdings / snapshot1y.shares : null;

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
        currentSnapshot: {
          date: latest.as_of,
          holdings: latest.holdings,
          sharesOutstanding: latest.shares,
          holdingsPerShare: currentHps,
        },
        snapshot30d: snapshot30d
          ? {
              date: snapshot30d.as_of,
              holdings: snapshot30d.holdings,
              sharesOutstanding: snapshot30d.shares,
              holdingsPerShare: hps30dAgo!,
            }
          : null,
        snapshot90d: snapshot90d
          ? {
              date: snapshot90d.as_of,
              holdings: snapshot90d.holdings,
              sharesOutstanding: snapshot90d.shares,
              holdingsPerShare: hps90dAgo!,
            }
          : null,
        snapshot1y: snapshot1y
          ? {
              date: snapshot1y.as_of,
              holdings: snapshot1y.holdings,
              sharesOutstanding: snapshot1y.shares,
              holdingsPerShare: hps1yAgo!,
            }
          : null,
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
