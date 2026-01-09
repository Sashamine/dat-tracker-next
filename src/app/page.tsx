"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { DataTable } from "@/components/data-table";
import { FilterSidebar } from "@/components/filter-sidebar";
import { AppSidebar, CRYPTO_ICONS, YIELDING_ASSETS, NON_YIELDING_ASSETS } from "@/components/app-sidebar";
import { InvestmentFramework } from "@/components/investment-framework";
import { FairValueModel } from "@/components/fair-value-model";
import { PremiumDiscountChart, MNAVScatterChart } from "@/components/premium-discount-chart";
import { allCompanies } from "@/lib/data/companies";
import { usePrices } from "@/lib/hooks/use-prices";
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

export default function Home() {
  const { data: prices, isLoading, dataUpdatedAt } = usePrices();
  const [viewMode, setViewMode] = useState<"table" | "bar" | "scatter">("table");

  const assetStats = getAssetStats(allCompanies, prices);
  const totalValue = assetStats.reduce((sum, a) => sum + a.totalValue, 0);
  const totalCompanies = allCompanies.length;

  // Separate into yielding and non-yielding
  const yieldingStats = assetStats.filter(s => YIELDING_ASSETS.includes(s.asset));
  const nonYieldingStats = assetStats.filter(s => NON_YIELDING_ASSETS.includes(s.asset));

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex">
      {/* Sidebar */}
      <AppSidebar className="hidden lg:block fixed left-0 top-0 h-full overflow-y-auto" />

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                DAT Universe Overview
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Tracking the race to become institutional-grade crypto yield vehicles
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                {isLoading ? "Loading..." : `Updated ${new Date(dataUpdatedAt).toLocaleTimeString()}`}
              </p>
              <p className="text-xs text-gray-400">Auto-refreshes every 5s</p>
            </div>
          </div>

          {/* Investment Framework */}
          <InvestmentFramework />

          {/* Fair Value Model */}
          <FairValueModel companies={allCompanies} prices={prices} />

          {/* Yielding Assets Grid */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
              <span className="text-green-500">📈</span> Yielding Assets
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Benchmark: Native staking APY. Only EXCESS yield justifies premium.
            </p>
            <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
              {YIELDING_ASSETS.map((asset) => {
                const stats = assetStats.find(s => s.asset === asset);
                return (
                  <Link
                    key={asset}
                    href={`/asset/${asset.toLowerCase()}`}
                    className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                  >
                    {CRYPTO_ICONS[asset] && (
                      <img
                        src={CRYPTO_ICONS[asset]}
                        alt={asset}
                        className="w-10 h-10 rounded-full mb-2 group-hover:scale-110 transition-transform"
                      />
                    )}
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{asset}</span>
                    <span className="text-xs text-gray-500">{stats?.count || 0} cos</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Non-Yielding Assets Grid */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
              <span className="text-blue-500">💎</span> Non-Yielding Assets
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Benchmark: 1.0x NAV. Vol harvesting optionality drives premium.
            </p>
            <div className="grid grid-cols-6 gap-3">
              {NON_YIELDING_ASSETS.map((asset) => {
                const stats = assetStats.find(s => s.asset === asset);
                return (
                  <Link
                    key={asset}
                    href={`/asset/${asset.toLowerCase()}`}
                    className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                  >
                    {CRYPTO_ICONS[asset] && (
                      <img
                        src={CRYPTO_ICONS[asset]}
                        alt={asset}
                        className="w-10 h-10 rounded-full mb-2 group-hover:scale-110 transition-transform"
                      />
                    )}
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{asset}</span>
                    <span className="text-xs text-gray-500">{stats?.count || 0} cos</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Companies</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalCompanies}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Treasury Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ${(totalValue / 1_000_000_000).toFixed(2)}B
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Yielding Assets</p>
              <p className="text-2xl font-bold text-green-600">
                {yieldingStats.reduce((sum, s) => sum + s.count, 0)} cos
              </p>
              <p className="text-xs text-gray-400">{YIELDING_ASSETS.length} assets</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Non-Yielding Assets</p>
              <p className="text-2xl font-bold text-blue-600">
                {nonYieldingStats.reduce((sum, s) => sum + s.count, 0)} cos
              </p>
              <p className="text-xs text-gray-400">{NON_YIELDING_ASSETS.length} assets</p>
            </div>
          </div>

          {/* All DAT Companies Section */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">All DAT Companies</h2>

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
          </div>

          {/* Main Content */}
          {viewMode === "table" ? (
            <div className="flex gap-6">
              {/* Filter Sidebar */}
              <Suspense fallback={<div className="w-64 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 animate-pulse h-96" />}>
                <FilterSidebar />
              </Suspense>

              {/* Data Table */}
              <div className="flex-1 min-w-0">
                <Suspense fallback={<div className="h-96 bg-gray-50 dark:bg-gray-900 rounded-lg animate-pulse" />}>
                  <DataTable companies={allCompanies} prices={prices} />
                </Suspense>
              </div>
            </div>
          ) : viewMode === "bar" ? (
            <PremiumDiscountChart
              companies={allCompanies}
              prices={prices}
              maxBars={20}
              sortBy="upside"
              title="Top 20 Companies by Upside to Fair Value"
            />
          ) : (
            <MNAVScatterChart companies={allCompanies} prices={prices} />
          )}

          {/* Footer */}
          <footer className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>Prices from CoinGecko and FMP. Updates every 5 seconds.</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
