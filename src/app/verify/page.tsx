"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { trackCitationSourceClick } from "@/lib/client-events";

interface VerificationResult {
  ticker: string;
  name: string;
  asset: string;
  holdings: number;
  holdingsLastUpdated: string | null;
  holdingsSource: string | null;
  holdingsSourceUrl: string | null;
  sourceQuote: string | null;
  accessionNumber: string | null;
  filingUrl: string | null;
  historyEntries: number;
  latestHistoryDate: string | null;
  historyHoldingsMatch: boolean | null;
  status: "verified" | "quoted" | "sourced" | "unsourced";
}

interface Stats {
  total: number;
  verified: number;
  quoted: number;
  sourced: number;
  unsourced: number;
  historyMismatches: number;
}

export default function VerifyPage() {
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [stats, setStats] = useState<Stats>({ total: 0, verified: 0, quoted: 0, sourced: 0, unsourced: 0, historyMismatches: 0 });

  useEffect(() => {
    fetch("/api/verify")
      .then((res) => res.json())
      .then((data) => {
        setResults(data.results || []);
        setStats(data.stats || { total: 0, verified: 0, quoted: 0, sourced: 0, unsourced: 0, historyMismatches: 0 });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Verification failed:", err);
        setLoading(false);
      });
  }, []);

  const filtered = results.filter((r) => {
    if (filter === "all") return true;
    if (filter === "issues") return r.status !== "verified" || r.historyHoldingsMatch === false;
    return r.status === filter;
  });

  const statusColors: Record<string, string> = {
    verified: "text-green-600 bg-green-50 dark:bg-green-900/20",
    quoted: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    sourced: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20",
    unsourced: "text-red-600 bg-red-50 dark:bg-red-900/20",
  };

  const statusLabels: Record<string, string> = {
    verified: "Verified",
    quoted: "Quoted",
    sourced: "Sourced",
    unsourced: "Unsourced",
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
                Provenance status for every company&apos;s holdings data
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-card border rounded-lg p-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Companies</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
                <div className="text-sm text-green-600">Quote + Source</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.quoted}</div>
                <div className="text-sm text-blue-600">Quote Only</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-600">{stats.sourced}</div>
                <div className="text-sm text-yellow-600">Source Only</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-600">{stats.unsourced}</div>
                <div className="text-sm text-red-600">Unsourced</div>
              </div>
            </div>

            {stats.historyMismatches > 0 && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                {stats.historyMismatches} company(s) have holdings that don&apos;t match their latest holdings-history entry
              </div>
            )}

            {/* Filter */}
            <div className="mb-4 flex flex-wrap gap-2">
              {["all", "issues", "verified", "quoted", "sourced", "unsourced"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    filter === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {f === "all" ? "All" : f === "issues" ? "Issues Only" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-muted-foreground">Loading verification data...</div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">Company</th>
                      <th className="text-left p-3 font-medium">Asset</th>
                      <th className="text-right p-3 font-medium">Holdings</th>
                      <th className="text-left p-3 font-medium">Source</th>
                      <th className="text-left p-3 font-medium">Updated</th>
                      <th className="text-center p-3 font-medium">History</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-center p-3 font-medium">Filing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.ticker} className="border-t hover:bg-muted/50">
                        <td className="p-3">
                          <Link href={`/company/${r.ticker}`} className="font-medium text-blue-600 hover:underline">
                            {r.ticker}
                          </Link>
                          <span className="block text-xs text-muted-foreground">{r.name}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.asset}</span>
                        </td>
                        <td className="p-3 text-right font-mono">
                          {r.holdings.toLocaleString()}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground max-w-[200px]">
                          {r.sourceQuote ? (
                            <span className="line-clamp-2" title={r.sourceQuote}>&ldquo;{r.sourceQuote}&rdquo;</span>
                          ) : r.holdingsSource ? (
                            <span>{r.holdingsSource}</span>
                          ) : (
                            <span className="text-red-500">No source</span>
                          )}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground font-mono">
                          {r.holdingsLastUpdated || "—"}
                        </td>
                        <td className="p-3 text-center">
                          {r.historyHoldingsMatch === true ? (
                            <span className="text-green-600" title={`${r.historyEntries} entries, latest ${r.latestHistoryDate}`}>
                              {r.historyEntries}
                            </span>
                          ) : r.historyHoldingsMatch === false ? (
                            <span className="text-red-600" title="Holdings mismatch with latest history entry">
                              {r.historyEntries}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[r.status]}`}>
                            {statusLabels[r.status]}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {r.filingUrl ? (
                            <a
                              href={r.filingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() =>
                                trackCitationSourceClick({
                                  href: r.filingUrl || "",
                                  ticker: r.ticker,
                                  metric: "holdings_native",
                                })
                              }
                              className="text-blue-600 hover:underline text-xs"
                            >
                              View
                            </a>
                          ) : r.holdingsSourceUrl ? (
                            <a
                              href={r.holdingsSourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() =>
                                trackCitationSourceClick({
                                  href: r.holdingsSourceUrl || "",
                                  ticker: r.ticker,
                                  metric: "holdings_native",
                                })
                              }
                              className="text-blue-600 hover:underline text-xs"
                            >
                              Source
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
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
              {filtered.length} of {results.length} companies shown
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
