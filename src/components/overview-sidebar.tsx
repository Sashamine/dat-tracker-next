"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CRYPTO_ICONS, ALL_ASSETS } from "@/components/app-sidebar";
import { AggregateMNAVChart } from "@/components/aggregate-mnav-chart";
import { Company } from "@/lib/types";

interface AssetStat {
  asset: string;
  count: number;
  totalHoldings: number;
  totalValue: number;
  price: number;
}

interface MNAVStats {
  median: number;
  average: number;
  count: number;
}

interface OverviewSidebarProps {
  assetStats: AssetStat[];
  mnavStats: MNAVStats;
  totalCompanies: number;
  totalValue: number;
  companies: Company[];
  prices: any;
  className?: string;
}

export function OverviewSidebar({
  assetStats,
  mnavStats,
  totalCompanies,
  totalValue,
  companies,
  prices,
  className,
}: OverviewSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showChart, setShowChart] = useState(true);
  const [showModal, setShowModal] = useState(false);

  if (!isExpanded) {
    return (
      <aside className={cn("w-12 bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800", className)}>
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full p-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          title="Expand sidebar"
        >
          <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </aside>
    );
  }

  return (
    <aside className={cn("w-72 bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 overflow-y-auto", className)}>
      <div className="p-4 space-y-4">
        {/* Header with collapse button */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">DAT Universe</h2>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="Collapse sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Summary Stats - Compact */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
            <p className="text-xs text-gray-500">Companies</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{totalCompanies}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
            <p className="text-xs text-gray-500">Treasury</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              ${(totalValue / 1_000_000_000).toFixed(1)}B
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
            <p className="text-xs text-gray-500">Med mNAV</p>
            <p className="text-lg font-bold text-indigo-600">{mnavStats.median.toFixed(2)}x</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
            <p className="text-xs text-gray-500">Avg mNAV</p>
            <p className="text-lg font-bold text-purple-600">{mnavStats.average.toFixed(2)}x</p>
          </div>
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        {/* Assets */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            Assets
            <span className="ml-auto text-gray-400 font-normal">
              {totalCompanies}
            </span>
          </h3>
          <div className="grid grid-cols-5 gap-1.5">
            {ALL_ASSETS.map((asset) => {
              const stats = assetStats.find((s) => s.asset === asset);
              return (
                <Link
                  key={asset}
                  href={`/asset/${asset.toLowerCase()}`}
                  className="flex flex-col items-center p-1.5 bg-white dark:bg-gray-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group"
                  title={`${asset}: ${stats?.count || 0} companies`}
                >
                  {CRYPTO_ICONS[asset] && (
                    <img
                      src={CRYPTO_ICONS[asset]}
                      alt={asset}
                      className="w-6 h-6 rounded-full group-hover:scale-110 transition-transform"
                    />
                  )}
                  <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 mt-0.5">
                    {stats?.count || 0}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        {/* mNAV History - Collapsible */}
        <div>
          <button
            onClick={() => setShowChart(!showChart)}
            className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2"
          >
            <span>mNAV History</span>
            <svg
              className={cn("w-4 h-4 transition-transform", showChart && "rotate-180")}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showChart && (
            <div
              className="bg-white dark:bg-gray-800 rounded-lg p-2 -mx-2 cursor-pointer hover:ring-2 hover:ring-indigo-500/50 transition-all"
              onClick={() => setShowModal(true)}
              title="Click to expand"
            >
              <AggregateMNAVChart companies={companies} prices={prices} compact />
            </div>
          )}
        </div>
      </div>

      {/* Full Chart Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Aggregate mNAV History
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <AggregateMNAVChart companies={companies} prices={prices} />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
