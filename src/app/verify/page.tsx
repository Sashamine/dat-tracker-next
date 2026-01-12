"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface VerificationData {
  summary: {
    totalCompanies: number;
    freshData: number;
    staleData: number;
    veryStaleData: number;
    unknownData: number;
    discrepanciesFound: number;
    recentSECFilings: number;
  };
  stalenessReport: Array<{
    ticker: string;
    name: string;
    asset: string;
    holdings: number;
    staleness: {
      level: string;
      daysOld: number | null;
      lastUpdated: string | null;
      color: string;
      label: string;
    };
    source: string;
  }>;
  discrepancies: Array<{
    ticker: string;
    ourHoldings: number;
    externalHoldings: number;
    externalSource: string;
    discrepancyPct: number;
    lastChecked: string;
  }>;
  needsVerification: Array<{
    ticker: string;
    reason: string;
    priority: string;
    details: string;
  }>;
  recentFilings: Array<{
    ticker: string;
    form: string;
    filingDate: string;
    description: string;
  }>;
  externalSources: {
    bitcoinTreasuries: {
      available: boolean;
      companiesMatched: number;
      lastFetched: string | null;
    };
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

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

const stalenessColors: Record<string, string> = {
  fresh: "text-green-600",
  stale: "text-yellow-600",
  very_stale: "text-red-600",
  unknown: "text-gray-400",
};

export default function VerifyPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["holdings-verification"],
    queryFn: fetchVerificationData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading verification data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error loading verification data</p>
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
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            ← Back to tracker
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Holdings Verification
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Data freshness, external cross-reference, and SEC filings
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {data.summary.totalCompanies}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <p className="text-sm text-green-600">Fresh</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">
              {data.summary.freshData}
            </p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
            <p className="text-sm text-yellow-600">Stale</p>
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
              {data.summary.staleData}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <p className="text-sm text-red-600">Very Stale</p>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">
              {data.summary.veryStaleData}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500">Unknown</p>
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {data.summary.unknownData}
            </p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
            <p className="text-sm text-orange-600">Discrepancies</p>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
              {data.summary.discrepanciesFound}
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <p className="text-sm text-blue-600">SEC Filings</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {data.summary.recentSECFilings}
            </p>
          </div>
        </div>

        {/* External Sources Status */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            External Data Sources
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">bitcointreasuries.net</p>
                <p className="text-sm text-gray-500">
                  {data.externalSources.bitcoinTreasuries.companiesMatched} companies matched
                </p>
              </div>
              <Badge variant={data.externalSources.bitcoinTreasuries.available ? "default" : "secondary"}>
                {data.externalSources.bitcoinTreasuries.available ? "Connected" : "Unavailable"}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">SEC EDGAR</p>
                <p className="text-sm text-gray-500">
                  {data.externalSources.secEdgar.recentFilings} filings checked
                </p>
              </div>
              <Badge variant={data.externalSources.secEdgar.available ? "default" : "secondary"}>
                {data.externalSources.secEdgar.available ? "Connected" : "Unavailable"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Needs Verification */}
        {data.needsVerification.length > 0 && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Needs Verification ({data.needsVerification.length})
            </h2>
            <div className="space-y-2">
              {data.needsVerification.slice(0, 20).map((item) => (
                <Link
                  key={item.ticker}
                  href={`/company/${item.ticker}`}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                      {item.ticker}
                    </span>
                    <Badge className={priorityColors[item.priority]}>
                      {item.priority}
                    </Badge>
                  </div>
                  <span className="text-sm text-gray-500">{item.details}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Discrepancies */}
        {data.discrepancies.length > 0 && (
          <div className="bg-white dark:bg-gray-900 border border-orange-200 dark:border-orange-800 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-orange-700 dark:text-orange-400 mb-4">
              Holdings Discrepancies
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="p-2">Ticker</th>
                    <th className="p-2 text-right">Our Data</th>
                    <th className="p-2 text-right">External</th>
                    <th className="p-2 text-right">Diff %</th>
                    <th className="p-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {data.discrepancies.map((d) => (
                    <tr key={d.ticker} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="p-2 font-mono font-medium">{d.ticker}</td>
                      <td className="p-2 text-right font-mono">{formatNumber(d.ourHoldings)}</td>
                      <td className="p-2 text-right font-mono">{formatNumber(d.externalHoldings)}</td>
                      <td className={cn(
                        "p-2 text-right font-mono",
                        d.discrepancyPct > 5 ? "text-red-600" : "text-yellow-600"
                      )}>
                        {d.discrepancyPct.toFixed(1)}%
                      </td>
                      <td className="p-2 text-gray-500">{d.externalSource}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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

        {/* Full Staleness Report */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            All Companies Staleness
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
                  <th className="p-2">Ticker</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Asset</th>
                  <th className="p-2 text-right">Holdings</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {data.stalenessReport.map((company) => (
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
                    <td className="p-2">
                      <span className={stalenessColors[company.staleness.level]}>
                        {company.staleness.label}
                      </span>
                    </td>
                    <td className="p-2 text-gray-500 capitalize">
                      {company.source}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Timestamp */}
        <p className="mt-4 text-center text-sm text-gray-500">
          Last updated: {new Date(data.timestamp).toLocaleString()}
        </p>
      </main>
    </div>
  );
}
