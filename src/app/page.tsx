"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { DataTable } from "@/components/data-table";
import { FilterSidebar } from "@/components/filter-sidebar";
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

// Asset colors for badges
const assetBgColors: Record<string, string> = {
  ETH: "bg-indigo-100 text-indigo-700 hover:bg-indigo-200",
  BTC: "bg-orange-100 text-orange-700 hover:bg-orange-200",
  SOL: "bg-purple-100 text-purple-700 hover:bg-purple-200",
  HYPE: "bg-green-100 text-green-700 hover:bg-green-200",
  BNB: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
  TAO: "bg-cyan-100 text-cyan-700 hover:bg-cyan-200",
  LINK: "bg-blue-100 text-blue-700 hover:bg-blue-200",
  TRX: "bg-red-100 text-red-700 hover:bg-red-200",
  XRP: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  ZEC: "bg-amber-100 text-amber-700 hover:bg-amber-200",
  LTC: "bg-slate-100 text-slate-700 hover:bg-slate-200",
  SUI: "bg-sky-100 text-sky-700 hover:bg-sky-200",
  DOGE: "bg-amber-100 text-amber-700 hover:bg-amber-200",
  AVAX: "bg-rose-100 text-rose-700 hover:bg-rose-200",
  ADA: "bg-blue-100 text-blue-700 hover:bg-blue-200",
  HBAR: "bg-gray-100 text-gray-700 hover:bg-gray-200",
};

export default function Home() {
  const { data: prices, isLoading, dataUpdatedAt } = usePrices();
  const [viewMode, setViewMode] = useState<"table" | "bar" | "scatter">("table");

  const assetStats = getAssetStats(allCompanies, prices);
  const totalValue = assetStats.reduce((sum, a) => sum + a.totalValue, 0);

  // Top 4 assets by value for header stats
  const topAssets = assetStats.slice(0, 4);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              DAT Tracker
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Digital Asset Treasury Companies - Real-time tracking
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">
              {isLoading ? "Loading..." : `Updated ${new Date(dataUpdatedAt).toLocaleTimeString()}`}
            </p>
            <p className="text-xs text-gray-400">Auto-refreshes every 10s</p>
          </div>
        </div>

        {/* Asset Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href="/"
            className="px-4 py-2 text-sm font-medium rounded-full bg-indigo-600 text-white"
          >
            All ({allCompanies.length})
          </Link>
          {assetStats.map(({ asset, count }) => (
            <Link
              key={asset}
              href={`/asset/${asset.toLowerCase()}`}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full transition-colors",
                assetBgColors[asset] || "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              {asset} ({count})
            </Link>
          ))}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              ${(totalValue / 1_000_000_000).toFixed(2)}B
            </p>
            <p className="text-xs text-gray-400">{allCompanies.length} companies</p>
          </div>
          {topAssets.map(({ asset, totalValue: assetValue, price, count }) => (
            <div key={asset} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">{asset} Value</p>
              <p className={cn("text-2xl font-bold",
                asset === "ETH" ? "text-indigo-600" :
                asset === "BTC" ? "text-orange-600" :
                asset === "SOL" ? "text-purple-600" :
                "text-gray-900 dark:text-gray-100"
              )}>
                ${assetValue >= 1_000_000_000
                  ? (assetValue / 1_000_000_000).toFixed(2) + "B"
                  : (assetValue / 1_000_000).toFixed(0) + "M"
                }
              </p>
              <p className="text-xs text-gray-400">
                @ ${price?.toLocaleString() || "—"} · {count} cos
              </p>
            </div>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 mb-6">
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
          <p>Prices from CoinGecko and FMP. Updates every 10 seconds.</p>
        </footer>
      </main>
    </div>
  );
}
