"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/mobile-header";

interface VerificationResult {
  ticker: string;
  date: string;
  filingType: string;
  filename: string;
  secHoldings: number | null;
  ourHoldings: number | null;
  status: "match" | "mismatch" | "missing-sec" | "missing-ours" | "unverified";
  diff: number | null;
  diffPct: number | null;
  path: string;
}

export default function VerifyPage() {
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [stats, setStats] = useState({ total: 0, matched: 0, mismatched: 0, missing: 0 });

  useEffect(() => {
    fetch("/api/verify")
      .then((res) => res.json())
      .then((data) => {
        setResults(data.results || []);
        setStats(data.stats || { total: 0, matched: 0, mismatched: 0, missing: 0 });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Verification failed:", err);
        setLoading(false);
      });
  }, []);

  const filtered = results.filter((r) => {
    if (filter === "all") return true;
    if (filter === "issues") return r.status !== "match";
    return r.status === filter;
  });

  const statusColors: Record<string, string> = {
    match: "text-green-600 bg-green-50 dark:bg-green-900/20",
    mismatch: "text-red-600 bg-red-50 dark:bg-red-900/20",
    "missing-sec": "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20",
    "missing-ours": "text-orange-600 bg-orange-50 dark:bg-orange-900/20",
    unverified: "text-gray-500 bg-gray-50 dark:bg-gray-800",
  };

  const statusLabels: Record<string, string> = {
    match: "✓ Match",
    mismatch: "✗ Mismatch",
    "missing-sec": "? No SEC #",
    "missing-ours": "? No Data",
    unverified: "—",
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <MobileHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">Holdings Verification</h1>
              <p className="text-muted-foreground">
                Cross-reference SEC filings against our stored data
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-card border rounded-lg p-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total Filings</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">{stats.matched}</div>
                <div className="text-sm text-green-600">Verified Match</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-600">{stats.mismatched}</div>
                <div className="text-sm text-red-600">Mismatches</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-600">{stats.missing}</div>
                <div className="text-sm text-yellow-600">Missing Data</div>
              </div>
            </div>

            {/* Filter */}
            <div className="mb-4 flex gap-2">
              {["all", "issues", "match", "mismatch", "missing-sec", "missing-ours"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    filter === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {f === "all" ? "All" : f === "issues" ? "Issues Only" : statusLabels[f] || f}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-muted-foreground">Running verification...</div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Filing</th>
                      <th className="text-right p-3 font-medium">SEC Holdings</th>
                      <th className="text-right p-3 font-medium">Our Data</th>
                      <th className="text-right p-3 font-medium">Diff</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-center p-3 font-medium">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr key={i} className="border-t hover:bg-muted/50">
                        <td className="p-3 font-mono">{r.date}</td>
                        <td className="p-3">
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {r.filingType}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono">
                          {r.secHoldings ? r.secHoldings.toLocaleString() : "—"}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {r.ourHoldings ? r.ourHoldings.toLocaleString() : "—"}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {r.diff !== null ? (
                            <span className={r.diff === 0 ? "text-green-600" : "text-red-600"}>
                              {r.diff > 0 ? "+" : ""}{r.diff.toLocaleString()}
                              {r.diffPct !== null && r.diffPct !== 0 && (
                                <span className="text-xs ml-1">({r.diffPct.toFixed(2)}%)</span>
                              )}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[r.status]}`}>
                            {statusLabels[r.status]}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <a
                            href={`${r.path}#dat-btc-holdings`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs"
                          >
                            View →
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No results matching filter
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 text-sm text-muted-foreground">
              {filtered.length} of {results.length} filings shown
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
