"use client";

import { useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Company } from "@/lib/types";
import type { HoldingsBasis } from "@/lib/d1-overlay";
import { HoldingsBasisBadge } from "@/components/holdings-basis-badge";

type CompanyType = "miners" | "treasuries" | "all";

interface HPSComparisonProps {
  companies: Company[];
  compact?: boolean;
  type?: CompanyType;
}

interface HpsGrowthApiRow {
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

interface CompanyStats {
  ticker: string;
  name: string;
  isMiner: boolean;
  displayHoldings: number;
  currentHPS: number;
  growth30d: number | null;
  growth90d: number | null;
  growth1y: number | null;
  currentHoldings: number;
  currentShares: number;
  latestDate: string;
  holdingsBasis?: HoldingsBasis;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function HPSComparison({ companies, compact, type = "all" }: HPSComparisonProps) {
  const { data, error, isLoading } = useSWR<{
    success: boolean;
    results: HpsGrowthApiRow[];
  }>("/api/d1/hps-growth", fetcher, { revalidateOnFocus: false });

  const companyMap = useMemo(() => {
    const map = new Map<string, Company>();
    for (const c of companies) {
      map.set(c.ticker.toUpperCase(), c);
    }
    return map;
  }, [companies]);

  const stats = useMemo(() => {
    if (!data?.results) return [];

    const merged: CompanyStats[] = [];
    for (const row of data.results) {
      const company = companyMap.get(row.ticker.toUpperCase());
      if (!company) continue;

      // Filter by type
      if (type === "miners" && !company.isMiner) continue;
      if (type === "treasuries" && company.isMiner) continue;

      merged.push({
        ticker: row.ticker,
        name: company.name,
        isMiner: company.isMiner || false,
        displayHoldings: company.holdings,
        currentHPS: row.currentHps,
        growth30d: row.growth30d,
        growth90d: row.growth90d,
        growth1y: row.growth1y,
        currentHoldings: row.currentHoldings,
        currentShares: row.currentShares,
        latestDate: row.latestDate,
        holdingsBasis: company.holdingsBasis,
      });
    }

    // Sort by 1Y growth descending (nulls last)
    merged.sort((a, b) => (b.growth1y ?? -Infinity) - (a.growth1y ?? -Infinity));
    return merged;
  }, [data, companyMap, type]);

  const typeLabel = type === "miners" ? "miner" : type === "treasuries" ? "treasury" : "company";

  if (isLoading) {
    return (
      <div className="text-xs text-gray-400 p-2">
        Loading {typeLabel} HPS data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-red-400 p-2">
        Failed to load HPS data
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="text-xs text-gray-400 p-2">
        No {typeLabel} HPS data available
      </div>
    );
  }

  const formatGrowth = (growth: number | null) => {
    if (growth === null) return "\u2014";
    const sign = growth >= 0 ? "+" : "";
    return `${sign}${growth.toFixed(1)}%`;
  };

  const formatHoldings = (holdings: number) =>
    holdings.toLocaleString(undefined, {
      minimumFractionDigits: Number.isInteger(holdings) ? 0 : 3,
      maximumFractionDigits: 3,
    });

  const getGrowthColor = (growth: number | null) => {
    if (growth === null) return "text-gray-400";
    if (growth > 0) return "text-green-600 dark:text-green-400";
    if (growth < 0) return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
          <span>Company</span>
          <span>HPS Growth (1Y)</span>
        </div>
        {stats.slice(0, 5).map((company) => (
          <Link
            key={company.ticker}
            href={`/company/${company.ticker.toLowerCase()}`}
            className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            <div>
              <span className="font-medium text-gray-900 dark:text-gray-100">{company.ticker}</span>
              {company.isMiner && <span className="text-xs text-gray-500 ml-1">⛏️</span>}
            </div>
            <span className={`text-sm font-semibold ${getGrowthColor(company.growth1y)}`}>
              {formatGrowth(company.growth1y)}
            </span>
          </Link>
        ))}
      </div>
    );
  }

  // Full table view
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Company</th>
            <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Holdings</th>
            <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">HPS</th>
            <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">30D</th>
            <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">90D</th>
            <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">1Y</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((company) => (
            <tr
              key={company.ticker}
              className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <td className="py-2 px-3">
                <Link href={`/company/${company.ticker.toLowerCase()}`} className="hover:underline">
                  <span className="font-medium text-gray-900 dark:text-gray-100">{company.ticker}</span>
                  {company.isMiner && <span className="text-xs text-gray-500 ml-1">⛏️</span>}
                </Link>
              </td>
              <td className="text-right py-2 px-3 text-gray-900 dark:text-gray-100">
                <span className="inline-flex items-center gap-1 justify-end">
                  {formatHoldings(company.displayHoldings)}
                  <HoldingsBasisBadge basis={company.holdingsBasis} />
                </span>
              </td>
              <td className="text-right py-2 px-3 font-mono text-gray-600 dark:text-gray-400">
                {(company.currentHPS * 1000000).toFixed(1)}
              </td>
              <td className={`text-right py-2 px-3 font-semibold ${getGrowthColor(company.growth30d)}`}>
                {formatGrowth(company.growth30d)}
              </td>
              <td className={`text-right py-2 px-3 font-semibold ${getGrowthColor(company.growth90d)}`}>
                {formatGrowth(company.growth90d)}
              </td>
              <td className={`text-right py-2 px-3 font-semibold ${getGrowthColor(company.growth1y)}`}>
                {formatGrowth(company.growth1y)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-400 mt-2 px-3">
        HPS = Holdings per share (x10^6). Growth based on SEC filings.
      </p>
    </div>
  );
}

// Backwards compatibility alias
export const MinersComparison = HPSComparison;
