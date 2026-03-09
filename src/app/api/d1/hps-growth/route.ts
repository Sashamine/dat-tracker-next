import { NextResponse } from 'next/server';
import { D1Client } from '@/lib/d1';
import { allCompanies } from '@/lib/data/companies';
import { findSnapshotOnOrBefore } from '@/lib/utils/growth-snapshots';

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
  unit: string;
  method: string | null;
  reported_at: string | null;
  confidence: number | null;
}

interface HpsSnapshot {
  date: string;
  holdings: number;
  sharesOutstanding: number;
  holdingsPerShare: number;
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
  currentSnapshot: HpsSnapshot;
  snapshot30d: HpsSnapshot | null;
  snapshot90d: HpsSnapshot | null;
  snapshot1y: HpsSnapshot | null;
  /** Full history of (date, holdings, shares) pairs for AHPS calculation */
  history: HpsSnapshot[];
}

export async function GET() {
  try {
    const d1 = D1Client.fromEnv();

    // Build ticker→asset map so we only use holdings matching the primary asset.
    // This prevents e.g. BTBT's 917 BTC from contaminating their 122K ETH history.
    const tickerAsset = new Map<string, string>();
    for (const c of allCompanies) {
      tickerAsset.set(c.ticker.toUpperCase(), c.asset.toUpperCase());
    }

    // Get all holdings_native and basic_shares datapoints in one query.
    // Returns all rows — dedup and unit filtering happen in JS.
    const sql = `
      SELECT
        h.entity_id,
        h.as_of,
        h.value AS holdings,
        h.unit,
        h.method,
        h.reported_at,
        h.confidence,
        s.shares
      FROM datapoints h
      INNER JOIN (
        SELECT entity_id, as_of, value AS shares,
               ROW_NUMBER() OVER (PARTITION BY entity_id, as_of ORDER BY created_at DESC) AS rn
        FROM datapoints
        WHERE metric = 'basic_shares' AND as_of IS NOT NULL AND value > 0
      ) s ON h.entity_id = s.entity_id AND h.as_of = s.as_of AND s.rn = 1
      WHERE h.metric = 'holdings_native' AND h.as_of IS NOT NULL AND h.value > 0
      ORDER BY h.entity_id ASC, h.as_of ASC
    `;

    const raw = await d1.query<HpsGrowthRow>(sql, []);
    const rows = raw.results;

    const methodPriority = (method: string | null): number => {
      switch (method) {
        case 'backfill_holdings_history_ts':
          return 4;
        case 'backfill_qe':
          return 3;
        case 'sec_filing_text':
          return 2;
        case 'sec_companyfacts_xbrl':
          return 1;
        default:
          return 0;
      }
    };

    const preferRow = (current: HpsGrowthRow, candidate: HpsGrowthRow): HpsGrowthRow => {
      const currentPriority = methodPriority(current.method);
      const candidatePriority = methodPriority(candidate.method);
      if (candidatePriority !== currentPriority) {
        return candidatePriority > currentPriority ? candidate : current;
      }
      const currentConfidence = current.confidence ?? 0;
      const candidateConfidence = candidate.confidence ?? 0;
      if (candidateConfidence !== currentConfidence) {
        return candidateConfidence > currentConfidence ? candidate : current;
      }
      const currentReported = current.reported_at || current.as_of;
      const candidateReported = candidate.reported_at || candidate.as_of;
      if (candidateReported !== currentReported) {
        return candidateReported > currentReported ? candidate : current;
      }
      return candidate;
    };

    // Group by ticker/date, filtering to only the company's primary asset unit.
    // Resolve duplicate datapoints for the same (ticker, date, unit) deterministically.
    const byTicker = new Map<string, Map<string, HpsGrowthRow>>();
    for (const row of rows) {
      const expectedAsset = tickerAsset.get(row.entity_id.toUpperCase());
      // Skip holdings that don't match the company's primary asset
      if (expectedAsset && row.unit.toUpperCase() !== expectedAsset) continue;

      const tickerRows = byTicker.get(row.entity_id) || new Map<string, HpsGrowthRow>();
      const existing = tickerRows.get(row.as_of);
      tickerRows.set(row.as_of, existing ? preferRow(existing, row) : row);
      byTicker.set(row.entity_id, tickerRows);
    }

    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
    const d90 = new Date(now.getTime() - 90 * 86400000).toISOString().split('T')[0];
    const d1y = new Date(now.getTime() - 365 * 86400000).toISOString().split('T')[0];

    const results: HpsGrowthResult[] = [];

    for (const [ticker, snapshotsByDate] of byTicker) {
      const snapshots = Array.from(snapshotsByDate.values()).sort((a, b) => a.as_of.localeCompare(b.as_of));
      if (snapshots.length === 0) continue;

      const latest = snapshots[snapshots.length - 1];
      const currentHps = latest.holdings / latest.shares;

      // Find closest snapshot on or before each target date.
      // No maxLagDays: carry-forward is correct. If nothing changed since
      // a snapshot 6 months ago, the state entering the window was still X.
      // Growth should show 0%, not "no data".
      const snapshot30d = findSnapshotOnOrBefore(snapshots.slice(0, -1), new Date(`${d30}T00:00:00Z`), {
        getDate: (snapshot) => snapshot.as_of,
      });
      const snapshot90d = findSnapshotOnOrBefore(snapshots.slice(0, -1), new Date(`${d90}T00:00:00Z`), {
        getDate: (snapshot) => snapshot.as_of,
      });
      const snapshot1y = findSnapshotOnOrBefore(snapshots.slice(0, -1), new Date(`${d1y}T00:00:00Z`), {
        getDate: (snapshot) => snapshot.as_of,
      });
      const hps30dAgo = snapshot30d ? snapshot30d.holdings / snapshot30d.shares : null;
      const hps90dAgo = snapshot90d ? snapshot90d.holdings / snapshot90d.shares : null;
      const hps1yAgo = snapshot1y ? snapshot1y.holdings / snapshot1y.shares : null;

      const growth = (current: number, past: number | null): number | null =>
        past && past > 0 ? ((current - past) / past) * 100 : null;

      const toSnapshot = (row: HpsGrowthRow): HpsSnapshot => ({
        date: row.as_of,
        holdings: row.holdings,
        sharesOutstanding: row.shares,
        holdingsPerShare: row.holdings / row.shares,
      });

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
        currentSnapshot: toSnapshot(latest),
        snapshot30d: snapshot30d ? toSnapshot(snapshot30d) : null,
        snapshot90d: snapshot90d ? toSnapshot(snapshot90d) : null,
        snapshot1y: snapshot1y ? toSnapshot(snapshot1y) : null,
        history: snapshots.map(toSnapshot),
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
