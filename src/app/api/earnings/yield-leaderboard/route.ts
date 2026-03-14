// GET /api/earnings/yield-leaderboard - Quarterly AHPS growth rankings (D1-powered)
import { NextResponse } from "next/server";
import { getAvailableQuarters } from "@/lib/data/earnings-data";
import { D1Client } from "@/lib/d1";
import { allCompanies } from "@/lib/data/companies";
import { findSnapshotOnOrBefore } from "@/lib/utils/growth-snapshots";
import { Asset, CalendarQuarter, TreasuryYieldMetrics } from "@/lib/types";

export const dynamic = "force-dynamic";

function isValidQuarter(q: string): q is CalendarQuarter {
  return /^Q[1-4]-\d{4}$/.test(q);
}

interface D1Row {
  entity_id: string;
  as_of: string;
  holdings: number;
  shares: number;
  unit: string;
  method: string | null;
  confidence: number | null;
}

function getQuarterBounds(quarter: CalendarQuarter): { start: Date; end: Date } {
  const match = quarter.match(/Q([1-4])-(\d{4})/);
  if (!match) throw new Error(`Invalid quarter format: ${quarter}`);
  const q = parseInt(match[1]);
  const year = parseInt(match[2]);
  const quarters: Record<number, { startMonth: number; endMonth: number }> = {
    1: { startMonth: 0, endMonth: 2 },
    2: { startMonth: 3, endMonth: 5 },
    3: { startMonth: 6, endMonth: 8 },
    4: { startMonth: 9, endMonth: 11 },
  };
  const { startMonth, endMonth } = quarters[q];
  return {
    start: new Date(year, startMonth, 1),
    end: new Date(year, endMonth + 1, 0),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const quarterParam = searchParams.get("quarter");
    const asset = searchParams.get("asset") as Asset | null;

    const availableQuarters = getAvailableQuarters();
    const quarter = (quarterParam && isValidQuarter(quarterParam))
      ? quarterParam
      : availableQuarters[0];

    const { start: qStart, end: qEnd } = getQuarterBounds(quarter);

    // Build ticker→company map
    const companyByTicker = new Map(allCompanies.map(c => [c.ticker.toUpperCase(), c]));
    const tickerAsset = new Map(allCompanies.map(c => [c.ticker.toUpperCase(), c.asset.toUpperCase()]));

    const d1 = D1Client.fromEnv();

    // Same query as hps-growth: join holdings_native with basic_shares on (entity_id, as_of)
    const sql = `
      SELECT
        h.entity_id,
        h.as_of,
        h.value AS holdings,
        h.unit,
        h.method,
        h.confidence,
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

    const raw = await d1.query<D1Row>(sql, []);

    // Deduplicate: same method priority as hps-growth
    const methodPriority = (method: string | null): number => {
      switch (method) {
        case 'backfill_holdings_history_ts': return 4;
        case 'backfill_qe': return 3;
        case 'sec_filing_text': return 2;
        case 'sec_companyfacts_xbrl': return 1;
        default: return 0;
      }
    };

    const byTicker = new Map<string, Map<string, D1Row>>();
    for (const row of raw.results) {
      const expectedAsset = tickerAsset.get(row.entity_id.toUpperCase());
      if (expectedAsset && row.unit.toUpperCase() !== expectedAsset) continue;

      const tickerRows = byTicker.get(row.entity_id) || new Map<string, D1Row>();
      const existing = tickerRows.get(row.as_of);
      if (!existing) {
        tickerRows.set(row.as_of, row);
      } else {
        // Prefer higher method priority, then higher confidence
        const ep = methodPriority(existing.method);
        const rp = methodPriority(row.method);
        if (rp > ep || (rp === ep && (row.confidence ?? 0) > (existing.confidence ?? 0))) {
          tickerRows.set(row.as_of, row);
        }
      }
      byTicker.set(row.entity_id, tickerRows);
    }

    // Also fetch corporate actions for split adjustment
    let actionsByTicker: Record<string, Array<{ effective_date: string; ratio: number }>> = {};
    try {
      const actionsResult = await d1.query<{ entity_id: string; effective_date: string; ratio: number }>(
        `SELECT entity_id, effective_date, ratio FROM corporate_actions ORDER BY entity_id ASC, effective_date ASC`
      );
      for (const r of actionsResult.results) {
        const k = (r.entity_id || '').toUpperCase();
        if (!k) continue;
        (actionsByTicker[k] ||= []).push({ effective_date: r.effective_date, ratio: r.ratio });
      }
    } catch {
      // Corporate actions table may not exist — proceed without split adjustment
    }

    const metrics: TreasuryYieldMetrics[] = [];

    for (const [ticker, snapshotsByDate] of byTicker) {
      const company = companyByTicker.get(ticker.toUpperCase());
      if (!company) continue;
      if (asset && company.asset !== asset) continue;

      const snapshots = Array.from(snapshotsByDate.values()).sort((a, b) => a.as_of.localeCompare(b.as_of));
      if (snapshots.length < 2) continue;

      // Find snapshot on or before quarter start and end
      // Use carry-forward (no maxLagDays) — if a company's data hasn't changed since
      // before the quarter, that IS the baseline state entering the quarter.
      const startSnapshot = findSnapshotOnOrBefore(snapshots, qStart, {
        getDate: (s) => s.as_of,
      });
      const endSnapshot = findSnapshotOnOrBefore(snapshots, qEnd, {
        getDate: (s) => s.as_of,
      });

      if (!startSnapshot || !endSnapshot) continue;
      if (startSnapshot.as_of === endSnapshot.as_of) continue;

      // Adjust shares for corporate actions (splits)
      const actions = actionsByTicker[ticker.toUpperCase()] || [];
      const adjustShares = (shares: number, asOf: string): number => {
        if (actions.length === 0) return shares;
        // Apply all splits that happened AFTER asOf to normalize to current basis
        let adjusted = shares;
        for (const action of actions) {
          if (action.effective_date > asOf) {
            adjusted *= action.ratio;
          }
        }
        return adjusted;
      };

      const startShares = adjustShares(startSnapshot.shares, startSnapshot.as_of);
      const endShares = adjustShares(endSnapshot.shares, endSnapshot.as_of);

      const startHps = startShares > 0 ? startSnapshot.holdings / startShares : 0;
      const endHps = endShares > 0 ? endSnapshot.holdings / endShares : 0;

      if (startHps <= 0 || endHps <= 0) continue;

      const startDate = new Date(startSnapshot.as_of);
      const endDate = new Date(endSnapshot.as_of);
      const daysCovered = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysCovered < 7) continue;

      const growthPct = ((endHps / startHps) - 1) * 100;

      let annualizedGrowthPct: number | undefined;
      if (daysCovered >= 30) {
        const yearsFraction = daysCovered / 365.25;
        annualizedGrowthPct = (Math.pow(endHps / startHps, 1 / yearsFraction) - 1) * 100;
      }

      metrics.push({
        ticker: company.ticker,
        companyName: company.name,
        asset: company.asset,
        period: quarter,
        holdingsPerShareStart: startHps,
        holdingsPerShareEnd: endHps,
        growthPct,
        annualizedGrowthPct,
        startDate: startSnapshot.as_of,
        endDate: endSnapshot.as_of,
        daysCovered,
      });
    }

    // Sort by growth descending and add rank
    metrics.sort((a, b) => b.growthPct - a.growthPct);
    metrics.forEach((m, i) => { m.rank = i + 1; });

    return NextResponse.json({
      leaderboard: metrics,
      quarter,
      availableQuarters,
      count: metrics.length,
    });
  } catch (error) {
    console.error("Error fetching yield leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch yield leaderboard" },
      { status: 500 }
    );
  }
}
