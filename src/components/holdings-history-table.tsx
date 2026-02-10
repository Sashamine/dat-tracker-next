"use client";

import { useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getHoldingsHistory, type HoldingsSnapshot } from "@/lib/data/holdings-history";

interface HoldingsHistoryTableProps {
  ticker: string;
  asset: string;
  className?: string;
}

function formatChange(current: number, previous: number): { text: string; positive: boolean } {
  const change = current - previous;
  const pctChange = ((change / previous) * 100).toFixed(1);
  const sign = change >= 0 ? "+" : "";
  return {
    text: `${sign}${change.toLocaleString()} (${sign}${pctChange}%)`,
    positive: change >= 0,
  };
}

function getSourceLink(snapshot: HoldingsSnapshot, ticker: string): { href: string; label: string; external: boolean } | null {
  // If there's a sourceUrl that's internal (/filings/...), use it
  if (snapshot.sourceUrl?.startsWith("/filings/") || snapshot.sourceUrl?.startsWith("/data/")) {
    return {
      href: snapshot.sourceUrl,
      label: snapshot.sourceType === "sec-filing" ? "SEC Filing" : "View Source",
      external: false,
    };
  }
  
  // If there's an external URL (https://...)
  if (snapshot.sourceUrl?.startsWith("http")) {
    return {
      href: snapshot.sourceUrl,
      label: snapshot.sourceType === "sec-filing" ? "SEC EDGAR" : 
             snapshot.sourceType === "press-release" ? "Press Release" :
             snapshot.sourceType === "company-website" ? "Company" :
             snapshot.sourceType === "regulatory-filing" ? "Regulatory Filing" : "Source",
      external: true,
    };
  }
  
  return null;
}

export function HoldingsHistoryTable({ ticker, asset, className }: HoldingsHistoryTableProps) {
  const historyData = useMemo(() => getHoldingsHistory(ticker), [ticker]);

  if (!historyData || historyData.history.length < 2) {
    return null;
  }

  // Filter out interpolated entries (chart smoothing only) and reverse to show most recent first
  const history = [...historyData.history]
    .filter(s => s.sourceType !== "interpolated")
    .reverse();

  return (
    <div className={cn("bg-gray-50 dark:bg-gray-900 rounded-lg p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Holdings History
          </h3>
          <p className="text-sm text-gray-500">
            {history.length} data points from SEC filings and announcements
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Date</th>
              <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">{asset} Holdings</th>
              <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Change</th>
              <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Source</th>
              <th className="text-center py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Filing</th>
            </tr>
          </thead>
          <tbody>
            {history.map((snapshot, idx) => {
              const previousSnapshot = history[idx + 1]; // Previous in reversed array = next chronologically
              const change = previousSnapshot 
                ? formatChange(snapshot.holdings, previousSnapshot.holdings)
                : null;
              const sourceLink = getSourceLink(snapshot, ticker);

              return (
                <tr 
                  key={snapshot.date}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="py-2 px-3 text-gray-900 dark:text-gray-100 font-mono">
                    {new Date(snapshot.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-gray-900 dark:text-gray-100">
                    {snapshot.holdings.toLocaleString()}
                  </td>
                  <td className={cn(
                    "py-2 px-3 text-right font-mono",
                    change?.positive ? "text-green-600" : "text-red-600",
                    !change && "text-gray-400"
                  )}>
                    {change?.text || "—"}
                  </td>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400 max-w-[200px]">
                    <span className="truncate block" title={snapshot.source}>
                      {snapshot.source || "—"}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    {sourceLink ? (
                      sourceLink.external ? (
                        <a
                          href={sourceLink.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          {sourceLink.label}
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ) : (
                        <Link
                          href={sourceLink.href}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                        >
                          {sourceLink.label}
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      )
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Data from quarterly 10-Q/10-K filings and 8-K announcements. Click "SEC Filing" to view the source document.
      </p>
    </div>
  );
}
