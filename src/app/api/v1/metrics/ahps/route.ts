import { NextResponse } from 'next/server';
import { D1Client } from '@/lib/d1';
import { getEntities } from '@/lib/d1';
import { findSnapshotOnOrBefore } from '@/lib/utils/growth-snapshots';

/**
 * GET /api/v1/metrics/ahps
 *
 * Returns AHPS (Asset Holdings Per Share) growth leaderboard.
 * Reads all holdings + shares history from D1 and computes growth metrics.
 */

interface HpsGrowthRow {
  entity_id: string;
  as_of: string;
  holdings: number;
  shares: number;
  unit: string;
}

export async function GET() {
  try {
    const d1 = D1Client.fromEnv();
    const entities = await getEntities();

    // Map ticker → asset for unit filtering
    const tickerAsset = new Map<string, string>();
    for (const e of entities) {
      tickerAsset.set(e.entity_id.toUpperCase(), e.asset.toUpperCase());
    }

    const sql = `
      SELECT
        h.entity_id,
        h.as_of,
        h.value AS holdings,
        h.unit,
        s.shares
      FROM datapoints h
      INNER JOIN (
        SELECT entity_id, as_of, value AS shares,
               ROW_NUMBER() OVER (PARTITION BY entity_id, as_of ORDER BY created_at DESC) AS rn
        FROM datapoints
        WHERE metric = 'basic_shares' AND status = 'approved' AND as_of IS NOT NULL AND value > 0
      ) s ON h.entity_id = s.entity_id AND h.as_of = s.as_of AND s.rn = 1
      WHERE h.metric = 'holdings_native' AND status = 'approved' AND h.as_of IS NOT NULL AND h.value > 0
      ORDER BY h.entity_id ASC, h.as_of ASC
    `;

    const raw = await d1.query<HpsGrowthRow>(sql, []);

    // Group by ticker, filter to primary asset
    const byTicker = new Map<string, { date: string; holdings: number; shares: number }[]>();
    for (const row of raw.results) {
      const expectedAsset = tickerAsset.get(row.entity_id.toUpperCase());
      if (expectedAsset && row.unit.toUpperCase() !== expectedAsset) continue;

      const arr = byTicker.get(row.entity_id) || [];
      arr.push({ date: row.as_of, holdings: row.holdings, shares: row.shares });
      byTicker.set(row.entity_id, arr);
    }

    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
    const d90 = new Date(now.getTime() - 90 * 86400000).toISOString().split('T')[0];
    const d1y = new Date(now.getTime() - 365 * 86400000).toISOString().split('T')[0];

    const growth = (current: number, past: number | null): number | null =>
      past && past > 0 ? ((current - past) / past) * 100 : null;

    const results: {
      ticker: string;
      currentAhps: number;
      growth30d: number | null;
      growth90d: number | null;
      growth1y: number | null;
      currentHoldings: number;
      currentShares: number;
      latestDate: string;
      snapshotCount: number;
    }[] = [];

    for (const [ticker, snapshots] of byTicker) {
      if (snapshots.length === 0) continue;

      const latest = snapshots[snapshots.length - 1];
      const currentAhps = latest.holdings / latest.shares;

      const find = (targetDate: string) =>
        findSnapshotOnOrBefore(snapshots.slice(0, -1), new Date(`${targetDate}T00:00:00Z`), {
          getDate: (s) => s.date,
        });

      const s30 = find(d30);
      const s90 = find(d90);
      const s1y = find(d1y);

      results.push({
        ticker,
        currentAhps,
        growth30d: growth(currentAhps, s30 ? s30.holdings / s30.shares : null),
        growth90d: growth(currentAhps, s90 ? s90.holdings / s90.shares : null),
        growth1y: growth(currentAhps, s1y ? s1y.holdings / s1y.shares : null),
        currentHoldings: latest.holdings,
        currentShares: latest.shares,
        latestDate: latest.date,
        snapshotCount: snapshots.length,
      });
    }

    results.sort((a, b) => (b.growth90d ?? -Infinity) - (a.growth90d ?? -Infinity));

    return NextResponse.json({
      success: true,
      count: results.length,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
