"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { DataTable } from "@/components/data-table";
import { FilterSidebar } from "@/components/filter-sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { OverviewSidebar } from "@/components/overview-sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { MobileFilterSheet, MobileFilterButton } from "@/components/mobile-filter-sheet";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { DataTableSkeleton } from "@/components/mobile-card-skeleton";
import { useCompanies } from "@/lib/hooks/use-companies";
import { Company } from "@/lib/types";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { useCompanyOverrides, mergeAllCompanies } from "@/lib/hooks/use-company-overrides";
import { useFilters } from "@/lib/hooks/use-filters";
import { useMNAVStats } from "@/lib/hooks/use-mnav-stats";

// Get unique assets and count companies
function getAssetStats(companies: Company[], prices: any) {
  const assets = [...new Set(companies.map(c => c.asset))];
  return assets.map(asset => {
    const assetCompanies = companies.filter(c => c.asset === asset);
    const price = prices?.crypto[asset]?.price || 0;
    const totalHoldings = assetCompanies.reduce((sum, c) => sum + c.holdings, 0);
    const totalValue = totalHoldings * price;
    return { asset, count: assetCompanies.length, totalHoldings, totalValue, price };
  }).sort((a, b) => b.totalValue - a.totalValue);
}


function HomeContent() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { data: prices, isConnected } = usePricesStream();
  const { overrides } = useCompanyOverrides();
  const { assets, companyTypes, minMarketCap, maxMarketCap, minMNAV, maxMNAV, search } = useFilters();

  // Calculate active filter count for mobile button
  const activeFilterCount =
    (assets.length > 0 ? 1 : 0) +
    (companyTypes.length > 0 ? 1 : 0) +
    (minMarketCap > 0 || maxMarketCap < Infinity ? 1 : 0) +
    (minMNAV > 0 || maxMNAV < Infinity ? 1 : 0) +
    (search.length > 0 ? 1 : 0);

  // Fetch companies from database API
  const { data: companiesData, isLoading: isLoadingCompanies, refetch: refetchCompanies } = useCompanies();

  // Pull to refresh handler
  const handleRefresh = async () => {
    await refetchCompanies();
  };

  // Merge database company data with Google Sheets overrides
  const companies = useMemo(() => {
    const baseCompanies = companiesData?.companies || [];
    return mergeAllCompanies(baseCompanies, overrides);
  }, [companiesData, overrides]);

  const assetStats = getAssetStats(companies, prices);
  const totalValue = assetStats.reduce((sum, a) => sum + a.totalValue, 0);
  const totalCompanies = companies.length;

  // Use shared mNAV stats hook - single source of truth
  const mnavStats = useMNAVStats(companies, prices);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <MobileHeader
        title="DAT Tracker"
        companies={companies}
        prices={prices ?? undefined}
        mnavStats={mnavStats}
      />

      {/* Left Sidebar - Navigation (Desktop only) */}
      <Suspense fallback={<div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-gray-50 dark:bg-gray-900" />}>
        <AppSidebar className="hidden lg:block fixed left-0 top-0 h-full overflow-y-auto" />
      </Suspense>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 lg:mr-72">
        <div className="px-3 py-4 lg:px-4 lg:py-6 max-w-full">
          {/* Header - Desktop only */}
          <div className="mb-4 lg:mb-6 hidden lg:flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                All DAT Companies
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isLoadingCompanies ? "Loading..." : `${totalCompanies} companies · ${(totalValue / 1_000_000_000).toFixed(1)}B treasury`}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/verify"
                className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Verify Holdings
              </Link>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {prices?.timestamp ? `Updated ${new Date(prices.timestamp).toLocaleTimeString()}` : "Connecting..."}
                </p>
                <div className="flex items-center justify-end gap-2 text-xs">
                  {/* Market Status */}
                  {prices?.marketOpen ? (
                    <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      Market Open
                    </span>
                  ) : prices?.extendedHours ? (
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                      Extended Hours
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-gray-500">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                      Market Closed
                    </span>
                  )}
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  {/* Stream Status */}
                  {isConnected ? (
                    <span className="inline-flex items-center gap-1 text-gray-400">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                      Live
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-yellow-500">
                      <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
                      Reconnecting
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Stats Bar */}
          <div className="lg:hidden mb-4 flex items-center justify-between text-sm">
            <p className="text-gray-500 dark:text-gray-400">
              {isLoadingCompanies ? "Loading..." : `${totalCompanies} companies · ${(totalValue / 1_000_000_000).toFixed(1)}B`}
            </p>
            <div className="flex items-center gap-3">
              <MobileFilterButton onClick={() => setIsFilterOpen(true)} activeCount={activeFilterCount} />
              <div className="flex items-center gap-2 text-xs">
                {isConnected ? (
                  <span className="inline-flex items-center gap-1 text-green-600">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    Live
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-yellow-500">
                    <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
                    Connecting
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Filter Sidebar - Desktop only */}
            <Suspense fallback={<div className="hidden lg:block w-56 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 animate-pulse h-96" />}>
              <div className="hidden lg:block">
                <FilterSidebar />
              </div>
            </Suspense>

            {/* Data Table */}
            <div className="flex-1 min-w-0 overflow-x-auto">
              {isLoadingCompanies ? (
                <DataTableSkeleton />
              ) : (
                <>
                  {/* Mobile: Pull to refresh wrapper */}
                  <div className="lg:hidden">
                    <PullToRefresh onRefresh={handleRefresh}>
                      <DataTable companies={companies} prices={prices ?? undefined} />
                    </PullToRefresh>
                  </div>
                  {/* Desktop: No pull to refresh */}
                  <div className="hidden lg:block">
                    <DataTable companies={companies} prices={prices ?? undefined} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>Real-time prices from Alpaca. Data from Railway PostgreSQL.</p>
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
        prices={prices ?? undefined}
        className="hidden lg:block fixed right-0 top-0 h-full"
      />

      {/* Mobile Filter Sheet */}
      <MobileFilterSheet isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>}>
      <HomeContent />
    </Suspense>
  );
}
// Build: 1768771609
