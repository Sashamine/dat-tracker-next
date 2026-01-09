"use client";

import { DataTable } from "@/components/data-table";
import { allCompanies } from "@/lib/data/companies";
import { usePrices } from "@/lib/hooks/use-prices";

export default function Home() {
  const { data: prices, isLoading, dataUpdatedAt } = usePrices();

  // Calculate total holdings values
  const ethValue = allCompanies
    .filter((c) => c.asset === "ETH")
    .reduce((sum, c) => sum + c.holdings * (prices?.crypto.ETH?.price || 0), 0);

  const btcValue = allCompanies
    .filter((c) => c.asset === "BTC")
    .reduce((sum, c) => sum + c.holdings * (prices?.crypto.BTC?.price || 0), 0);

  const solValue = allCompanies
    .filter((c) => c.asset === "SOL")
    .reduce((sum, c) => sum + c.holdings * (prices?.crypto.SOL?.price || 0), 0);

  const totalValue = ethValue + btcValue + solValue;

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

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              ${(totalValue / 1_000_000_000).toFixed(2)}B
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">ETH Value</p>
            <p className="text-2xl font-bold text-indigo-600">
              ${(ethValue / 1_000_000_000).toFixed(2)}B
            </p>
            <p className="text-xs text-gray-400">
              @ ${prices?.crypto.ETH?.price?.toLocaleString() || "—"}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">BTC Value</p>
            <p className="text-2xl font-bold text-orange-600">
              ${(btcValue / 1_000_000_000).toFixed(2)}B
            </p>
            <p className="text-xs text-gray-400">
              @ ${prices?.crypto.BTC?.price?.toLocaleString() || "—"}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">SOL Value</p>
            <p className="text-2xl font-bold text-purple-600">
              ${(solValue / 1_000_000_000).toFixed(2)}B
            </p>
            <p className="text-xs text-gray-400">
              @ ${prices?.crypto.SOL?.price?.toLocaleString() || "—"}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Companies</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {allCompanies.length}
            </p>
          </div>
        </div>

        {/* Data Table */}
        <DataTable companies={allCompanies} prices={prices} />

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Prices from CoinGecko and FMP. Updates every 10 seconds.</p>
        </footer>
      </main>
    </div>
  );
}
