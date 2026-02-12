"use client";

import { Suspense, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useCompany } from "@/lib/hooks/use-companies";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCompanyEarnings, getNextEarnings } from "@/lib/data/earnings-data";
import { MNAV_HISTORY } from "@/lib/data/mnav-history-calculated";
import { formatLargeNumber, formatPercent, formatTokenAmountPrecise } from "@/lib/calculations";
import type { EarningsRecord } from "@/lib/types";

// Get mNAV for a ticker at a specific quarter end date
function getMNavAtQuarterEnd(ticker: string, year: number, quarter: 1 | 2 | 3 | 4): number | null {
  // Quarter end dates
  const quarterEndDates: Record<number, string> = {
    1: `${year}-03-31`,
    2: `${year}-06-30`,
    3: `${year}-09-30`,
    4: `${year}-12-31`,
  };
  const targetDate = new Date(quarterEndDates[quarter]);
  
  let closestMNav = null;
  let closestDiff = Infinity;
  
  for (const snapshot of MNAV_HISTORY) {
    const snapshotDate = new Date(snapshot.date);
    const diff = Math.abs(targetDate.getTime() - snapshotDate.getTime());
    
    // Find closest date within 7 days
    if (diff < closestDiff && diff < 7 * 24 * 60 * 60 * 1000) {
      const companyData = snapshot.companies.find(c => c.ticker === ticker);
      if (companyData) {
        closestMNav = companyData.mnav;
        closestDiff = diff;
      }
    }
  }
  
  return closestMNav;
}

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

// Get quarter-end date for normalized comparison
// Q1 = Mar 31, Q2 = Jun 30, Q3 = Sep 30, Q4 = Dec 31
function getQuarterEndDate(calendarYear: number, calendarQuarter: 1 | 2 | 3 | 4): string {
  const quarterEnds: Record<number, string> = {
    1: `Mar 31, ${calendarYear}`,
    2: `Jun 30, ${calendarYear}`,
    3: `Sep 30, ${calendarYear}`,
    4: `Dec 31, ${calendarYear}`,
  };
  return quarterEnds[calendarQuarter];
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

// Aggregate quarterly data into annual data
function aggregateAnnualData(quarterlyData: EarningsRecord[]): EarningsRecord[] {
  const yearMap = new Map<number, EarningsRecord[]>();

  // Group records by fiscal year
  quarterlyData.forEach((record) => {
    if (!yearMap.has(record.fiscalYear)) {
      yearMap.set(record.fiscalYear, []);
    }
    yearMap.get(record.fiscalYear)!.push(record);
  });

  const annualData: EarningsRecord[] = [];

  // For each year, select the best representative quarter
  yearMap.forEach((records, year) => {
    // Sort quarters by quarter number descending (Q4, Q3, Q2, Q1)
    records.sort((a, b) => b.fiscalQuarter - a.fiscalQuarter);

    // Find the latest quarter with actual holdings data
    const representative = records.find(r => r.holdingsAtQuarterEnd !== undefined);

    // If no quarter has holdings data, use Q4 (for upcoming year-end)
    if (representative) {
      annualData.push(representative);
    } else if (records.find(r => r.fiscalQuarter === 4)) {
      annualData.push(records.find(r => r.fiscalQuarter === 4)!);
    }
  });

  // Sort by year descending
  return annualData.sort((a, b) => b.fiscalYear - a.fiscalYear);
}

export default function CompanyEarningsPage() {
  const params = useParams();
  const ticker = params.ticker as string;
  const { data: companyData, isLoading } = useCompany(ticker);
  const [viewType, setViewType] = useState<"quarterly" | "annual">("quarterly");

  const earnings = useMemo(() => getCompanyEarnings(ticker), [ticker]);
  const nextEarnings = useMemo(() => getNextEarnings(ticker), [ticker]);

  const displayEarnings = useMemo(() => {
    if (viewType === "annual") {
      return aggregateAnnualData(earnings);
    }
    return earnings;
  }, [earnings, viewType]);

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
            <div className="px-4 lg:px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Historical Results
              </h2>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setViewType("quarterly")}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    viewType === "quarterly"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  )}
                >
                  Quarterly
                </button>
                <button
                  onClick={() => setViewType("annual")}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    viewType === "annual"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  )}
                >
                  Annual
                </button>
              </div>
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
                      Period
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Holdings
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Per Share
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {viewType === "quarterly" ? "QoQ" : "YoY"} Growth
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-purple-500 dark:text-purple-400 uppercase tracking-wider">
                      Adjusted
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-purple-500 dark:text-purple-400 uppercase tracking-wider">
                      Adj. Growth
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {displayEarnings.map((earning, idx) => {
                    // Calculate growth in holdings per share (QoQ for quarterly, YoY for annual)
                    const prevEarning = idx < displayEarnings.length - 1 ? displayEarnings[idx + 1] : null;
                    const holdingsGrowth = earning.holdingsPerShare !== undefined && prevEarning?.holdingsPerShare !== undefined
                      ? ((earning.holdingsPerShare - prevEarning.holdingsPerShare) / prevEarning.holdingsPerShare) * 100
                      : null;

                    // Get mNAV at quarter end for adjusted calculation
                    const mNav = getMNavAtQuarterEnd(ticker, earning.calendarYear, earning.calendarQuarter);
                    const prevMNav = prevEarning 
                      ? getMNavAtQuarterEnd(ticker, prevEarning.calendarYear, prevEarning.calendarQuarter)
                      : null;
                    
                    // Adjusted HPS = HPS / max(mNAV, 1.0)
                    // Only penalize premiums (mNAV > 1), don't reward discounts
                    const adjustedHPS = earning.holdingsPerShare !== undefined && mNav !== null
                      ? earning.holdingsPerShare / Math.max(mNav, 1.0)
                      : null;
                    const prevAdjustedHPS = prevEarning?.holdingsPerShare !== undefined && prevMNav !== null
                      ? prevEarning.holdingsPerShare / Math.max(prevMNav, 1.0)
                      : null;
                    
                    // Adjusted growth
                    const adjustedGrowth = adjustedHPS !== null && prevAdjustedHPS !== null && prevAdjustedHPS > 0
                      ? ((adjustedHPS - prevAdjustedHPS) / prevAdjustedHPS) * 100
                      : null;

                    return (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {getQuarterEndDate(earning.calendarYear, earning.calendarQuarter)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {viewType === "quarterly"
                            ? `Q${earning.calendarQuarter} ${earning.calendarYear}`
                            : earning.calendarQuarter === 4
                              ? earning.calendarYear
                              : `${earning.calendarYear} (Q${earning.calendarQuarter})`
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-gray-100">
                          {earning.holdingsAtQuarterEnd !== undefined ? (
                            formatTokenAmountPrecise(earning.holdingsAtQuarterEnd, company.asset)
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-gray-100">
                          {earning.holdingsPerShare !== undefined ? (
                            earning.holdingsPerShare.toFixed(7)
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {holdingsGrowth !== null ? (
                            <span className={cn(
                              "text-sm font-semibold",
                              holdingsGrowth >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {holdingsGrowth >= 0 ? "+" : ""}{holdingsGrowth.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-purple-600 dark:text-purple-400">
                          {adjustedHPS !== null ? (
                            <span title={`@ ${mNav?.toFixed(2)}x mNAV`}>
                              {adjustedHPS.toFixed(7)}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {adjustedGrowth !== null ? (
                            <span className={cn(
                              "text-sm font-semibold",
                              adjustedGrowth >= 0 ? "text-purple-600" : "text-red-600"
                            )}>
                              {adjustedGrowth >= 0 ? "+" : ""}{adjustedGrowth.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
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
              {displayEarnings.map((earning, idx) => {
                // Calculate growth in holdings per share (QoQ for quarterly, YoY for annual)
                const prevEarning = idx < displayEarnings.length - 1 ? displayEarnings[idx + 1] : null;
                const holdingsGrowth = earning.holdingsPerShare !== undefined && prevEarning?.holdingsPerShare !== undefined
                  ? ((earning.holdingsPerShare - prevEarning.holdingsPerShare) / prevEarning.holdingsPerShare) * 100
                  : null;

                // Get mNAV at quarter end for adjusted calculation
                const mNav = getMNavAtQuarterEnd(ticker, earning.calendarYear, earning.calendarQuarter);
                const prevMNav = prevEarning 
                  ? getMNavAtQuarterEnd(ticker, prevEarning.calendarYear, prevEarning.calendarQuarter)
                  : null;
                
                // Adjusted HPS = HPS / max(mNAV, 1.0)
                // Only penalize premiums (mNAV > 1), don't reward discounts
                const adjustedHPS = earning.holdingsPerShare !== undefined && mNav !== null
                  ? earning.holdingsPerShare / Math.max(mNav, 1.0)
                  : null;
                const prevAdjustedHPS = prevEarning?.holdingsPerShare !== undefined && prevMNav !== null
                  ? prevEarning.holdingsPerShare / Math.max(prevMNav, 1.0)
                  : null;
                
                // Adjusted growth
                const adjustedGrowth = adjustedHPS !== null && prevAdjustedHPS !== null && prevAdjustedHPS > 0
                  ? ((adjustedHPS - prevAdjustedHPS) / prevAdjustedHPS) * 100
                  : null;

                return (
                  <div key={idx} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {getQuarterEndDate(earning.calendarYear, earning.calendarQuarter)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {viewType === "quarterly"
                            ? `Q${earning.calendarQuarter} ${earning.calendarYear}`
                            : earning.calendarQuarter === 4
                              ? earning.calendarYear
                              : `${earning.calendarYear} (Q${earning.calendarQuarter})`
                          }
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Holdings</div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {earning.holdingsAtQuarterEnd !== undefined ? (
                            formatTokenAmountPrecise(earning.holdingsAtQuarterEnd, company.asset)
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Per Share</div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {earning.holdingsPerShare !== undefined ? (
                            earning.holdingsPerShare.toFixed(7)
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{viewType === "quarterly" ? "QoQ" : "YoY"} Growth</div>
                        <div className="font-medium">
                          {holdingsGrowth !== null ? (
                            <span className={cn(
                              "font-semibold",
                              holdingsGrowth >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {holdingsGrowth >= 0 ? "+" : ""}{holdingsGrowth.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Adjusted section */}
                    {(adjustedHPS !== null || adjustedGrowth !== null) && (
                      <div className="grid grid-cols-2 gap-3 text-sm pt-3 border-t border-purple-200 dark:border-purple-800">
                        <div>
                          <div className="text-xs text-purple-500 dark:text-purple-400 mb-1">Adjusted</div>
                          <div className="font-medium text-purple-600 dark:text-purple-400">
                            {adjustedHPS !== null ? adjustedHPS.toFixed(7) : "—"}
                          </div>
                          {mNav !== null && (
                            <div className="text-xs text-gray-400">@ {mNav.toFixed(2)}x</div>
                          )}
                        </div>
                        <div>
                          <div className="text-xs text-purple-500 dark:text-purple-400 mb-1">Adj. Growth</div>
                          <div className="font-medium">
                            {adjustedGrowth !== null ? (
                              <span className={cn(
                                "font-semibold",
                                adjustedGrowth >= 0 ? "text-purple-600" : "text-red-600"
                              )}>
                                {adjustedGrowth >= 0 ? "+" : ""}{adjustedGrowth.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
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
