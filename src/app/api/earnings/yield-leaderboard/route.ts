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

interface D1HoldingsRow {
  entity_id: string;
  as_of: string;
  value: number;
  unit: string;
  method: string | null;
  confidence: number | null;
}

interface D1SharesRow {
  entity_id: string;
  as_of: string;
  value: number;
}

interface HpsSnapshot {
  as_of: string;
  holdings: number;
  shares: number;
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

    // Fetch holdings and shares SEPARATELY to avoid excluding companies
    // where the two metrics have different as_of dates
    const holdingsSql = `
      SELECT entity_id, as_of, value, unit, method, confidence
      FROM datapoints
      WHERE metric = 'holdings_native' AND status = 'approved'
        AND as_of IS NOT NULL AND value > 0
      ORDER BY entity_id ASC, as_of ASC
    `;
    const sharesSql = `
      SELECT entity_id, as_of, value
      FROM datapoints
      WHERE metric = 'basic_shares' AND status = 'approved'
        AND as_of IS NOT NULL AND value > 0
      ORDER BY entity_id ASC, as_of ASC
    `;

    const [holdingsRaw, sharesRaw] = await Promise.all([
      d1.query<D1HoldingsRow>(holdingsSql, []),
      d1.query<D1SharesRow>(sharesSql, []),
    ]);

    // Group holdings by ticker, deduplicate by (entity_id, as_of)
    const methodPriority = (method: string | null): number => {
      switch (method) {
        case 'backfill_holdings_history_ts': return 4;
        case 'backfill_qe': return 3;
        case 'sec_filing_text': return 2;
        case 'sec_companyfacts_xbrl': return 1;
        default: return 0;
      }
    };

    const holdingsByTicker = new Map<string, D1HoldingsRow[]>();
    for (const row of holdingsRaw.results) {
      const expectedAsset = tickerAsset.get(row.entity_id.toUpperCase());
      if (expectedAsset && row.unit.toUpperCase() !== expectedAsset) continue;

      const arr = holdingsByTicker.get(row.entity_id) || [];
      // Deduplicate same date: prefer higher method priority
      const existingIdx = arr.findIndex(r => r.as_of === row.as_of);
      if (existingIdx >= 0) {
        const existing = arr[existingIdx];
        const ep = methodPriority(existing.method);
        const rp = methodPriority(row.method);
        if (rp > ep || (rp === ep && (row.confidence ?? 0) > (existing.confidence ?? 0))) {
          arr[existingIdx] = row;
        }
      } else {
        arr.push(row);
      }
      holdingsByTicker.set(row.entity_id, arr);
    }

    // Group shares by ticker, deduplicate by (entity_id, as_of) — keep latest created_at
    const sharesByTicker = new Map<string, D1SharesRow[]>();
    for (const row of sharesRaw.results) {
      const arr = sharesByTicker.get(row.entity_id) || [];
      const existingIdx = arr.findIndex(r => r.as_of === row.as_of);
      if (existingIdx >= 0) {
        // Keep the one with higher value (more conservative for diluted)
        if (row.value > arr[existingIdx].value) {
          arr[existingIdx] = row;
        }
      } else {
        arr.push(row);
      }
      sharesByTicker.set(row.entity_id, arr);
    }

    // Build HPS snapshots per ticker by pairing each holdings date
    // with the nearest shares snapshot (on or before that date)
    const byTicker = new Map<string, HpsSnapshot[]>();
    for (const [ticker, holdings] of holdingsByTicker) {
      const shares = sharesByTicker.get(ticker);
      if (!shares || shares.length === 0) continue;

      const sortedShares = [...shares].sort((a, b) => a.as_of.localeCompare(b.as_of));
      const hpsSnapshots: HpsSnapshot[] = [];

      for (const h of holdings) {
        // Find the nearest shares snapshot on or before this holdings date
        const nearestShares = findSnapshotOnOrBefore(sortedShares, new Date(h.as_of), {
          getDate: (s) => s.as_of,
        });
        if (!nearestShares || nearestShares.value <= 0) continue;

        hpsSnapshots.push({
          as_of: h.as_of,
          holdings: h.value,
          shares: nearestShares.value,
        });
      }

      // Also add HPS snapshots at shares dates that don't have holdings.
      // Use carry-forward: the most recent holdings on or before each shares date.
      const holdingsDates = new Set(holdings.map(h => h.as_of));
      const sortedHoldings = [...holdings].sort((a, b) => a.as_of.localeCompare(b.as_of));
      for (const s of sortedShares) {
        if (holdingsDates.has(s.as_of)) continue; // Already covered above
        const nearestHoldings = findSnapshotOnOrBefore(sortedHoldings, new Date(s.as_of), {
          getDate: (h) => h.as_of,
        });
        if (!nearestHoldings || nearestHoldings.value <= 0) continue;
        hpsSnapshots.push({
          as_of: s.as_of,
          holdings: nearestHoldings.value,
          shares: s.value,
        });
      }

      // Deduplicate by as_of (prefer earlier entry which has actual holdings data)
      const seen = new Set<string>();
      const deduped = hpsSnapshots.filter(s => {
        if (seen.has(s.as_of)) return false;
        seen.add(s.as_of);
        return true;
      });

      if (deduped.length >= 2) {
        byTicker.set(ticker, deduped.sort((a, b) => a.as_of.localeCompare(b.as_of)));
      }
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

    for (const [ticker, snapshots] of byTicker) {
      const company = companyByTicker.get(ticker.toUpperCase());
      // For tickers in D1 but not in companies.ts (e.g. removed miners),
      // derive name and asset from the D1 data itself
      const firstHoldings = holdingsByTicker.get(ticker)?.[0];
      const companyName = company?.name ?? ticker;
      const companyAsset = company?.asset ?? (firstHoldings?.unit?.toUpperCase() || "BTC");
      if (asset && companyAsset !== asset) continue;

      if (snapshots.length < 2) continue;

      // Find snapshot on or before quarter start (carry-forward, no limit).
      const startSnapshot = findSnapshotOnOrBefore(snapshots, qStart, {
        getDate: (s) => s.as_of,
      });

      // For the end snapshot, extend 45 days past quarter end.
      const endSearchDate = new Date(qEnd.getTime() + 45 * 86400000);
      const endSnapshot = findSnapshotOnOrBefore(snapshots, endSearchDate, {
        getDate: (s) => s.as_of,
      });

      if (!startSnapshot || !endSnapshot) continue;
      if (startSnapshot.as_of === endSnapshot.as_of) continue;

      // Adjust shares for corporate actions (splits)
      const actions = actionsByTicker[ticker.toUpperCase()] || [];
      const adjustShares = (shares: number, asOf: string): number => {
        if (actions.length === 0) return shares;
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
        ticker: company?.ticker ?? ticker,
        companyName,
        asset: companyAsset as Asset,
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
