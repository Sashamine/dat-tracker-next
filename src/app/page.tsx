"use client";

import { Suspense, useState, useMemo } from "react";
import Link from "next/link";
import { DataTable } from "@/components/data-table";
import { FilterSidebar } from "@/components/filter-sidebar";
import { AppSidebar, YIELDING_ASSETS, NON_YIELDING_ASSETS } from "@/components/app-sidebar";
import { OverviewSidebar } from "@/components/overview-sidebar";
import { PremiumDiscountChart, MNAVScatterChart } from "@/components/premium-discount-chart";
import { allCompanies } from "@/lib/data/companies";
import { usePrices } from "@/lib/hooks/use-prices";
import { useCompanyOverrides, mergeAllCompanies } from "@/lib/hooks/use-company-overrides";
import { calculateMNAV } from "@/lib/calculations";
import { cn } from "@/lib/utils";

// Get unique assets and count companies
function getAssetStats(companies: typeof allCompanies, prices: any) {
  const assets = [...new Set(companies.map(c => c.asset))];
  return assets.map(asset => {
    const assetCompanies = companies.filter(c => c.asset === asset);
    const price = prices?.crypto[asset]?.price || 0;
    const totalHoldings = assetCompanies.reduce((sum, c) => sum + c.holdings, 0);
    const totalValue = totalHoldings * price;
    return { asset, count: assetCompanies.length, totalHoldings, totalValue, price };
  }).sort((a, b) => b.totalValue - a.totalValue);
}

// Calculate median of an array
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default function Home() {
  const { data: prices, isLoading, dataUpdatedAt } = usePrices();
  const { overrides } = useCompanyOverrides();
  const [viewMode, setViewMode] = useState<"table" | "bar" | "scatter">("table");

  // Merge base company data with Google Sheets overrides
  const companies = useMemo(
    () => mergeAllCompanies(allCompanies, overrides),
    [overrides]
  );

  const assetStats = getAssetStats(companies, prices);
  const totalValue = assetStats.reduce((sum, a) => sum + a.totalValue, 0);
  const totalCompanies = companies.length;

  // Calculate mNAV stats for all companies
  const mnavStats = useMemo(() => {
    const mnavs = companies
      .map((company) => {
        const cryptoPrice = prices?.crypto[company.asset]?.price || 0;
        const stockData = prices?.stocks[company.ticker];
        const marketCap = stockData?.marketCap || company.marketCap || 0;
        return calculateMNAV(marketCap, company.holdings, cryptoPrice);
      })
      .filter((mnav): mnav is number => mnav !== null && mnav > 0 && mnav < 10);

    if (mnavs.length === 0) return { median: 0, average: 0, count: 0, mnavs: [] };

    const avg = mnavs.reduce((sum, m) => sum + m, 0) / mnavs.length;
    const med = median(mnavs);

    return { median: med, average: avg, count: mnavs.length, mnavs };
  }, [companies, prices]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex">
      {/* Left Sidebar - Navigation */}
      <Suspense fallback={<div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-gray-50 dark:bg-gray-900" />}>
        <AppSidebar className="hidden lg:block fixed left-0 top-0 h-full overflow-y-auto" />
      </Suspense>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 lg:mr-72">
        <div className="px-4 py-6 max-w-full">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                All DAT Companies
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {totalCompanies} companies · ${(totalValue / 1_000_000_000).toFixed(1)}B treasury
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                {isLoading ? "Loading..." : `Updated ${new Date(dataUpdatedAt).toLocaleTimeString()}`}
              </p>
              <p className="text-xs text-gray-400">Auto-refreshes every 5s</p>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-500 mr-2">View:</span>
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors",
                viewMode === "table"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              )}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode("bar")}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors",
                viewMode === "bar"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              )}
            >
              Upside Chart
            </button>
            <button
              onClick={() => setViewMode("scatter")}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors",
                viewMode === "scatter"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              )}
            >
              mNAV Scatter
            </button>
          </div>

          {/* Main Content */}
          {viewMode === "table" ? (
            <div className="flex gap-4">
              {/* Filter Sidebar */}
              <Suspense fallback={<div className="w-56 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 animate-pulse h-96" />}>
                <FilterSidebar />
              </Suspense>

              {/* Data Table */}
              <div className="flex-1 min-w-0">
                <Suspense fallback={<div className="h-96 bg-gray-50 dark:bg-gray-900 rounded-lg animate-pulse" />}>
                  <DataTable companies={companies} prices={prices} />
                </Suspense>
              </div>
            </div>
          ) : viewMode === "bar" ? (
            <PremiumDiscountChart
              companies={companies}
              prices={prices}
              maxBars={20}
              sortBy="upside"
              title="Top 20 Companies by Upside to Fair Value"
            />
          ) : (
            <MNAVScatterChart companies={companies} prices={prices} />
          )}

          {/* Footer */}
          <footer className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>Prices from CoinGecko and FMP. Updates every 5 seconds.</p>
          </footer>
        </div>
      </main>

      {/* Right Sidebar - Overview */}
      <OverviewSidebar
        assetStats={assetStats}
        mnavStats={mnavStats}
        totalCompanies={totalCompanies}
        totalValue={totalValue}
        companies={companies}
        prices={prices}
        className="hidden lg:block fixed right-0 top-0 h-full"
      />
    </div>
  );
}
