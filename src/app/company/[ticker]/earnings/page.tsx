"use client";

import { Suspense, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useCompany } from "@/lib/hooks/use-companies";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCompanyEarnings, getNextEarnings } from "@/lib/data/earnings-data";
import { formatLargeNumber, formatPercent } from "@/lib/calculations";

// Asset colors
const assetColors: Record<string, string> = {
  ETH: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  BTC: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  SOL: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  HYPE: "bg-green-500/10 text-green-600 border-green-500/20",
  BNB: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  TAO: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  LINK: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string | null): string {
  if (!time) return "";
  switch (time) {
    case "BMO":
      return "Before Open";
    case "AMC":
      return "After Close";
    case "TNS":
      return "TBD";
    default:
      return "";
  }
}

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateStr);
  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export default function CompanyEarningsPage() {
  const params = useParams();
  const ticker = params.ticker as string;
  const { data: companyData, isLoading } = useCompany(ticker);

  const earnings = useMemo(() => getCompanyEarnings(ticker), [ticker]);
  const nextEarnings = useMemo(() => getNextEarnings(ticker), [ticker]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading earnings data...</p>
        </div>
      </div>
    );
  }

  const company = companyData?.company;

  if (!company) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Company not found
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            No company found with ticker: {ticker}
          </p>
          <Link href="/" className="mt-4 inline-block text-indigo-600 hover:underline">
            ← Back to tracker
          </Link>
        </div>
      </div>
    );
  }

  if (earnings.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col lg:flex-row">
        <MobileHeader title="Earnings" />
        <Suspense fallback={<div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-gray-50 dark:bg-gray-900" />}>
          <AppSidebar className="hidden lg:block fixed left-0 top-0 h-full overflow-y-auto" />
        </Suspense>
        <main className="flex-1 lg:ml-64">
          <div className="px-3 py-4 lg:px-6 lg:py-6 max-w-7xl mx-auto">
            {/* Breadcrumb */}
            <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              <Link href="/" className="hover:text-indigo-600">Home</Link>
              {" / "}
              <Link href={`/company/${ticker}`} className="hover:text-indigo-600">{ticker}</Link>
              {" / "}
              <span className="text-gray-900 dark:text-gray-100">Earnings</span>
            </div>

            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {company.name}
                </h1>
                <Badge variant="outline" className={cn("text-xs", assetColors[company.asset])}>
                  {company.asset}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Earnings History
              </p>
            </div>

            {/* No data message */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                No earnings data available for {ticker}
              </p>
              <Link
                href={`/company/${ticker}`}
                className="mt-4 inline-block text-indigo-600 hover:underline"
              >
                ← Back to company page
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const daysUntilNext = nextEarnings ? getDaysUntil(nextEarnings.earningsDate) : null;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <MobileHeader title="Earnings" />

      {/* Left Sidebar - Navigation (Desktop only) */}
      <Suspense fallback={<div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-gray-50 dark:bg-gray-900" />}>
        <AppSidebar className="hidden lg:block fixed left-0 top-0 h-full overflow-y-auto" />
      </Suspense>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        <div className="px-3 py-4 lg:px-6 lg:py-6 max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            <Link href="/" className="hover:text-indigo-600">Home</Link>
            {" / "}
            <Link href={`/company/${ticker}`} className="hover:text-indigo-600">{ticker}</Link>
            {" / "}
            <span className="text-gray-900 dark:text-gray-100">Earnings</span>
          </div>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {company.name}
              </h1>
              <Badge variant="outline" className={cn("text-xs", assetColors[company.asset])}>
                {company.asset}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Earnings History
            </p>
          </div>

          {/* Next Earnings Card */}
          {nextEarnings && (
            <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800 p-4 lg:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Next Earnings
                  </h2>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Date:</span> {formatDate(nextEarnings.earningsDate)}
                      {nextEarnings.earningsTime && ` (${formatTime(nextEarnings.earningsTime)})`}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Quarter:</span> Q{nextEarnings.fiscalQuarter} {nextEarnings.fiscalYear}
                    </p>
                  </div>
                </div>
                {daysUntilNext !== null && (
                  <div className="flex-shrink-0">
                    <div className={cn(
                      "px-4 py-2 rounded-lg text-center",
                      daysUntilNext === 0 ? "bg-green-500 text-white" :
                      daysUntilNext <= 7 ? "bg-orange-500 text-white" :
                      "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    )}>
                      <div className="text-2xl font-bold">
                        {daysUntilNext === 0 ? "Today" : daysUntilNext}
                      </div>
                      {daysUntilNext !== 0 && (
                        <div className="text-xs">
                          day{daysUntilNext !== 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Historical Earnings Table */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-4 lg:px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Historical Results
              </h2>
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Quarter
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      EPS
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Holdings
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Per Share
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {earnings.map((earning, idx) => {
                    const epsSurprise = earning.epsActual !== undefined && earning.epsEstimate !== undefined
                      ? earning.epsActual - earning.epsEstimate
                      : null;
                    const revenueSurprise = earning.revenueActual !== undefined && earning.revenueEstimate !== undefined
                      ? ((earning.revenueActual - earning.revenueEstimate) / earning.revenueEstimate) * 100
                      : null;

                    return (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {formatDate(earning.earningsDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          Q{earning.fiscalQuarter} {earning.fiscalYear}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {earning.epsActual !== undefined ? (
                            <div className="space-y-0.5">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                ${earning.epsActual.toFixed(2)}
                              </div>
                              {epsSurprise !== null && (
                                <div className={cn(
                                  "text-xs",
                                  epsSurprise >= 0 ? "text-green-600" : "text-red-600"
                                )}>
                                  {epsSurprise >= 0 ? "+" : ""}${epsSurprise.toFixed(2)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {earning.revenueActual !== undefined ? (
                            <div className="space-y-0.5">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                ${formatLargeNumber(earning.revenueActual)}
                              </div>
                              {revenueSurprise !== null && (
                                <div className={cn(
                                  "text-xs",
                                  revenueSurprise >= 0 ? "text-green-600" : "text-red-600"
                                )}>
                                  {revenueSurprise >= 0 ? "+" : ""}{revenueSurprise.toFixed(1)}%
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-gray-100">
                          {earning.holdingsAtQuarterEnd !== undefined ? (
                            formatLargeNumber(earning.holdingsAtQuarterEnd)
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-gray-100">
                          {earning.holdingsPerShare !== undefined ? (
                            earning.holdingsPerShare.toFixed(6)
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-gray-200 dark:divide-gray-800">
              {earnings.map((earning, idx) => {
                const epsSurprise = earning.epsActual !== undefined && earning.epsEstimate !== undefined
                  ? earning.epsActual - earning.epsEstimate
                  : null;
                const revenueSurprise = earning.revenueActual !== undefined && earning.revenueEstimate !== undefined
                  ? ((earning.revenueActual - earning.revenueEstimate) / earning.revenueEstimate) * 100
                  : null;

                return (
                  <div key={idx} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatDate(earning.earningsDate)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Q{earning.fiscalQuarter} {earning.fiscalYear}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">EPS</div>
                        {earning.epsActual !== undefined ? (
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              ${earning.epsActual.toFixed(2)}
                            </div>
                            {epsSurprise !== null && (
                              <div className={cn(
                                "text-xs",
                                epsSurprise >= 0 ? "text-green-600" : "text-red-600"
                              )}>
                                {epsSurprise >= 0 ? "+" : ""}${epsSurprise.toFixed(2)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Revenue</div>
                        {earning.revenueActual !== undefined ? (
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              ${formatLargeNumber(earning.revenueActual)}
                            </div>
                            {revenueSurprise !== null && (
                              <div className={cn(
                                "text-xs",
                                revenueSurprise >= 0 ? "text-green-600" : "text-red-600"
                              )}>
                                {revenueSurprise >= 0 ? "+" : ""}{revenueSurprise.toFixed(1)}%
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Holdings</div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {earning.holdingsAtQuarterEnd !== undefined ? (
                            formatLargeNumber(earning.holdingsAtQuarterEnd)
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Per Share</div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {earning.holdingsPerShare !== undefined ? (
                            earning.holdingsPerShare.toFixed(6)
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
