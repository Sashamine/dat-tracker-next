"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getCompaniesNeedingData, getDataCoverageSummary } from "@/lib/data/holdings-data-status";
import { MobileHeader } from "@/components/mobile-header";

interface VerificationData {
  summary: {
    totalCompanies: number;
    recentSECFilings: number;
  };
  companies: Array<{
    ticker: string;
    name: string;
    asset: string;
    holdings: number;
    lastUpdated: string | null;
    source: string;
    sourceLabel: string;
    sourceUrl: string | null;
  }>;
  recentFilings: Array<{
    ticker: string;
    form: string;
    filingDate: string;
    description: string;
  }>;
  externalSources: {
    secEdgar: {
      available: boolean;
      recentFilings: number;
      relevantFilings: number;
      lastFetched: string | null;
    };
  };
  timestamp: string;
}

async function fetchVerificationData(): Promise<VerificationData> {
  const response = await fetch("/api/holdings-verification");
  if (!response.ok) throw new Error("Failed to fetch verification data");
  return response.json();
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined
  });
}

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

export default function VerifyPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["holdings-verification"],
    queryFn: fetchVerificationData,
    staleTime: 5 * 60 * 1000,
  });

  const companiesNeedingData = useMemo(() => getCompaniesNeedingData(), []);
  const dataCoverage = useMemo(() => getDataCoverageSummary(), []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error loading data</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <MobileHeader title="Data Sources" showBack />

      <main className="container mx-auto px-3 py-4 lg:px-4 lg:py-8">
        <div className="mb-6 hidden lg:block">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            ← Back to tracker
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Data Sources
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Holdings data with source links for verification
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500">Companies</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {data.summary.totalCompanies}
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <p className="text-sm text-blue-600">Recent SEC Filings</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {data.summary.recentSECFilings}
            </p>
          </div>
        </div>

        {/* Recent SEC Filings */}
        {data.recentFilings.length > 0 && (
          <div className="bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-4">
              Recent SEC Filings (Crypto-related)
            </h2>
            <div className="space-y-2">
              {data.recentFilings.map((filing, idx) => (
                <div
                  key={`${filing.ticker}-${idx}`}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                      {filing.ticker}
                    </span>
                    <Badge variant="outline">{filing.form}</Badge>
                    <span className="text-sm text-gray-500 truncate max-w-md">
                      {filing.description}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">{filing.filingDate}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Holdings Per Share Data Coverage */}
        <div className="bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-800 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-purple-700 dark:text-purple-400">
                Holdings/Share Historical Data
              </h2>
              <p className="text-sm text-gray-500">
                {dataCoverage.withData} of {dataCoverage.total} companies have historical data ({dataCoverage.coveragePercent}%)
              </p>
            </div>
            <div className="flex gap-2">
              {Object.entries(dataCoverage.byAsset).map(([asset, stats]) => (
                <Badge
                  key={asset}
                  variant="outline"
                  className={stats.withData === stats.total ? "border-green-500 text-green-600" : ""}
                >
                  {asset}: {stats.withData}/{stats.total}
                </Badge>
              ))}
            </div>
          </div>

          {companiesNeedingData.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Companies Needing Data Collection ({companiesNeedingData.length})
              </h3>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-gray-900">
                    <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
                      <th className="p-2">Ticker</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Asset</th>
                      <th className="p-2">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companiesNeedingData.slice(0, 10).map((company) => (
                      <tr key={company.ticker} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="p-2">
                          <Link href={`/company/${company.ticker}`} className="font-mono font-medium text-indigo-600 hover:underline">
                            {company.ticker}
                          </Link>
                        </td>
                        <td className="p-2 text-gray-600 dark:text-gray-400 truncate max-w-[180px]">
                          {company.name}
                        </td>
                        <td className="p-2">
                          <Badge variant="outline">{company.asset}</Badge>
                        </td>
                        <td className="p-2">
                          <Badge className={priorityColors[company.priority]}>
                            {company.priority}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* All Companies */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            All Companies
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
                  <th className="p-2">Ticker</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Asset</th>
                  <th className="p-2 text-right">Holdings</th>
                  <th className="p-2">Last Updated</th>
                  <th className="p-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {data.companies.map((company) => (
                  <tr key={company.ticker} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-2">
                      <Link href={`/company/${company.ticker}`} className="font-mono font-medium text-indigo-600 hover:underline">
                        {company.ticker}
                      </Link>
                    </td>
                    <td className="p-2 text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
                      {company.name}
                    </td>
                    <td className="p-2">
                      <Badge variant="outline">{company.asset}</Badge>
                    </td>
                    <td className="p-2 text-right font-mono">
                      {formatNumber(company.holdings)}
                    </td>
                    <td className="p-2 text-gray-500">
                      {formatDate(company.lastUpdated)}
                    </td>
                    <td className="p-2">
                      {company.sourceUrl ? (
                        <a
                          href={company.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                        >
                          {company.sourceLabel}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-gray-500">{company.sourceLabel}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          Last updated: {new Date(data.timestamp).toLocaleString()}
        </p>
      </main>
    </div>
  );
}
