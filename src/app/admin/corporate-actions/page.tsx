"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MobileHeader } from "@/components/mobile-header";

type CorporateAction = {
  id?: string;
  ticker: string;
  effective_date: string | null;
  action_type: string;
  ratio: number | null;
  quote?: string | null;
  source_url?: string | null;
  source_artifact_id?: string | null;
  created_at?: string | null;
};

type CorporateActionsStatsRow = {
  ticker: string;
  action_count: number;
  last_created_at: string | null;
  multiDateSameRatioCount?: number;
  multiDateSameRatio_count?: number;
  multi_date_same_ratio_count?: number;
  type_counts?: Record<string, number>;
};

type CorporateActionsStatsResponse = {
  success?: boolean;
  rows?: CorporateActionsStatsRow[];
  stats?: CorporateActionsStatsRow[];
  byTicker?: CorporateActionsStatsRow[];
  updated_at?: string;
  generated_at?: string;
  action_type_counts?: Record<string, number>;
  actionTypes?: Record<string, number>;
  total_actions?: number;
  totalActions?: number;
  tickers_with_actions?: number;
  tickersWithActions?: number;
};

function truncate(s: string, max = 200): string {
  if (!s) return s;
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

function anomalyCount(row: CorporateActionsStatsRow): number {
  return (
    row.multiDateSameRatioCount ??
    row.multiDateSameRatio_count ??
    row.multi_date_same_ratio_count ??
    0
  );
}

function formatDateTime(s?: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toISOString().replace("T", " ").replace(".000Z", "Z");
}

export default function CorporateActionsAdminPage() {
  const [stats, setStats] = useState<CorporateActionsStatsResponse | null>(null);
  const [statsRows, setStatsRows] = useState<CorporateActionsStatsRow[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);

  const [actionsLoading, setActionsLoading] = useState(false);
  const [actionsError, setActionsError] = useState<string | null>(null);
  const [actions, setActions] = useState<CorporateAction[]>([]);

  useEffect(() => {
    async function run() {
      setLoadingStats(true);
      setStatsError(null);

      try {
        const res = await fetch(`/api/d1/corporate-actions-stats?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as CorporateActionsStatsResponse;
        setStats(data);

        const rows = data.rows || data.stats || data.byTicker || [];
        setStatsRows(rows);
      } catch (e) {
        setStatsError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoadingStats(false);
      }
    }

    run();
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toUpperCase();
    const rows = [...statsRows];
    rows.sort((a, b) => (b.action_count || 0) - (a.action_count || 0) || a.ticker.localeCompare(b.ticker));
    if (!q) return rows;
    return rows.filter((r) => r.ticker.toUpperCase().includes(q));
  }, [statsRows, search]);

  const summary = useMemo(() => {
    const totalActions = stats?.total_actions ?? stats?.totalActions ?? statsRows.reduce((s, r) => s + (r.action_count || 0), 0);
    const tickersWithActions = stats?.tickers_with_actions ?? stats?.tickersWithActions ?? statsRows.length;

    const typeCounts = stats?.action_type_counts ?? stats?.actionTypes;

    // If API doesn't provide global type counts, aggregate from per-row type_counts (best effort)
    const aggregatedTypeCounts: Record<string, number> = {};
    if (!typeCounts) {
      for (const r of statsRows) {
        const tc = r.type_counts || {};
        for (const [k, v] of Object.entries(tc)) {
          aggregatedTypeCounts[k] = (aggregatedTypeCounts[k] || 0) + (v || 0);
        }
      }
    }

    return {
      totalActions,
      tickersWithActions,
      typeCounts: typeCounts || aggregatedTypeCounts,
    };
  }, [stats, statsRows]);

  async function toggleTicker(ticker: string) {
    const next = expandedTicker === ticker ? null : ticker;
    setExpandedTicker(next);
    setActions([]);
    setActionsError(null);

    if (!next) return;

    setActionsLoading(true);
    try {
      const res = await fetch(`/api/d1/corporate-actions?ticker=${encodeURIComponent(ticker)}&t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const rows = (data?.actions || data?.rows || data) as CorporateAction[];
      if (!Array.isArray(rows)) {
        throw new Error("Unexpected response shape");
      }

      setActions(rows);
    } catch (e) {
      setActionsError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setActionsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <MobileHeader />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
            <Link href="/" className="hover:text-gray-700 dark:hover:text-gray-300">
              Home
            </Link>
            <span>/</span>
            <span>Admin</span>
            <span>/</span>
            <span>Corporate Actions</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Corporate Actions – Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Coverage + anomalies + ticker drilldown. (Data from <code className="font-mono">/api/d1/corporate-actions-stats</code>)
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total actions</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary.totalActions}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Tickers with actions</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary.tickersWithActions}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Action types</div>
            <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              {Object.keys(summary.typeCounts || {}).length === 0 ? (
                <div className="text-gray-500 dark:text-gray-400">(no type counts)</div>
              ) : (
                Object.entries(summary.typeCounts)
                  .sort((a, b) => (b[1] || 0) - (a[1] || 0) || a[0].localeCompare(b[0]))
                  .map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between">
                      <span className="font-mono">{k}</span>
                      <span className="font-semibold">{v}</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Search + metadata */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticker..."
            className="w-full md:w-72 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Updated: {formatDateTime(stats?.updated_at || stats?.generated_at) || "(unknown)"}
          </div>
        </div>

        {/* Main list */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div className="font-semibold text-gray-900 dark:text-gray-100">Tickers</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Click a ticker to drill down</div>
          </div>

          {loadingStats ? (
            <div className="p-6 text-gray-600 dark:text-gray-400">Loading stats…</div>
          ) : statsError ? (
            <div className="p-6 text-red-700 dark:text-red-300">Error loading stats: {statsError}</div>
          ) : filteredRows.length === 0 ? (
            <div className="p-6 text-gray-600 dark:text-gray-400">No rows.</div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredRows.map((row) => {
                const isExpanded = expandedTicker === row.ticker;
                const anom = anomalyCount(row);
                return (
                  <div key={row.ticker}>
                    <button
                      onClick={() => toggleTicker(row.ticker)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{row.ticker}</span>
                          {anom > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                              anomaly ×{anom}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">actions:</span> <span className="font-semibold">{row.action_count}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">last_created_at:</span> {formatDateTime(row.last_created_at) || ""}
                          </div>
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4">
                        {actionsLoading ? (
                          <div className="py-3 text-gray-600 dark:text-gray-400">Loading actions…</div>
                        ) : actionsError ? (
                          <div className="py-3 text-red-700 dark:text-red-300">Error loading actions: {actionsError}</div>
                        ) : actions.length === 0 ? (
                          <div className="py-3 text-gray-600 dark:text-gray-400">No actions returned.</div>
                        ) : (
                          <div className="mt-2 overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                                  <th className="py-2 pr-4">effective_date</th>
                                  <th className="py-2 pr-4">action_type</th>
                                  <th className="py-2 pr-4">ratio</th>
                                  <th className="py-2 pr-4">quote</th>
                                  <th className="py-2 pr-4">source</th>
                                  <th className="py-2 pr-0">artifact</th>
                                </tr>
                              </thead>
                              <tbody className="text-gray-900 dark:text-gray-100">
                                {actions.map((a, idx) => (
                                  <tr key={a.id || `${a.ticker}-${idx}`} className="border-b border-gray-100 dark:border-gray-800/60">
                                    <td className="py-2 pr-4 font-mono whitespace-nowrap">{a.effective_date || ""}</td>
                                    <td className="py-2 pr-4 font-mono">{a.action_type}</td>
                                    <td className="py-2 pr-4 font-mono">{a.ratio ?? ""}</td>
                                    <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{truncate(a.quote || "")}</td>
                                    <td className="py-2 pr-4">
                                      {a.source_url ? (
                                        <a
                                          className="text-indigo-600 dark:text-indigo-400 hover:underline"
                                          href={a.source_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          link
                                        </a>
                                      ) : (
                                        ""
                                      )}
                                    </td>
                                    <td className="py-2 pr-0 font-mono text-xs">{a.source_artifact_id || ""}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
