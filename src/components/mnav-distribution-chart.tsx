"use client";

import { useMemo } from "react";
import { Company } from "@/lib/types";
import { calculateMNAV } from "@/lib/calculations";

interface PriceData {
  crypto: Record<string, { price: number; change24h: number }>;
  stocks: Record<string, { price: number; change24h: number; volume: number; marketCap: number }>;
}

interface MNAVDistributionChartProps {
  companies: Company[];
  prices?: PriceData;
  compact?: boolean;
}

// Define histogram buckets
const BUCKETS = [
  { min: 0, max: 0.5, label: "<0.5x" },
  { min: 0.5, max: 0.75, label: "0.5-0.75x" },
  { min: 0.75, max: 1.0, label: "0.75-1x" },
  { min: 1.0, max: 1.25, label: "1-1.25x" },
  { min: 1.25, max: 1.5, label: "1.25-1.5x" },
  { min: 1.5, max: 2.0, label: "1.5-2x" },
  { min: 2.0, max: 3.0, label: "2-3x" },
  { min: 3.0, max: 5.0, label: "3-5x" },
  { min: 5.0, max: 10.0, label: "5-10x" },
];

export function MNAVDistributionChart({ companies, prices, compact = false }: MNAVDistributionChartProps) {
  const { bucketCounts, median, average, totalCount } = useMemo(() => {
    // Calculate mNAV for each company
    const mnavs = companies
      .map((company) => {
        const cryptoPrice = prices?.crypto[company.asset]?.price || 0;
        const stockData = prices?.stocks[company.ticker];
        const marketCap = stockData?.marketCap || company.marketCap || 0;
        const mnav = calculateMNAV(marketCap, company.holdings, cryptoPrice, company.cashReserves || 0, company.otherInvestments || 0);
        return { ticker: company.ticker, mnav };
      })
      .filter((item): item is { ticker: string; mnav: number } =>
        item.mnav !== null && item.mnav > 0 && item.mnav < 10
      );

    // Count companies in each bucket
    const counts = BUCKETS.map((bucket) => ({
      ...bucket,
      count: mnavs.filter((m) => m.mnav >= bucket.min && m.mnav < bucket.max).length,
    }));

    // Calculate median and average
    const sortedMnavs = mnavs.map((m) => m.mnav).sort((a, b) => a - b);
    const mid = Math.floor(sortedMnavs.length / 2);
    const med = sortedMnavs.length % 2
      ? sortedMnavs[mid]
      : (sortedMnavs[mid - 1] + sortedMnavs[mid]) / 2 || 0;
    const avg = sortedMnavs.reduce((sum, m) => sum + m, 0) / sortedMnavs.length || 0;

    return {
      bucketCounts: counts,
      median: med,
      average: avg,
      totalCount: mnavs.length
    };
  }, [companies, prices]);

  const maxCount = Math.max(...bucketCounts.map((b) => b.count));

  // Find which bucket the median and average fall into for positioning
  const getPositionPercent = (value: number): number => {
    const bucketIndex = BUCKETS.findIndex((b) => value >= b.min && value < b.max);
    if (bucketIndex === -1) return 100;
    const bucket = BUCKETS[bucketIndex];
    const withinBucket = (value - bucket.min) / (bucket.max - bucket.min);
    return ((bucketIndex + withinBucket) / BUCKETS.length) * 100;
  };

  // Compact view for sidebar
  if (compact) {
    return (
      <div>
        {/* Compact Chart */}
        <div className="relative">
          <div className="flex items-end gap-0.5 h-24">
            {bucketCounts.map((bucket, i) => {
              const heightPercent = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;
              const isUndervalued = bucket.max <= 1.0;
              const isFairValue = bucket.min >= 1.0 && bucket.max <= 1.5;

              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full rounded-t transition-all duration-300 hover:opacity-80 relative group"
                    style={{
                      height: `${heightPercent}%`,
                      minHeight: bucket.count > 0 ? "4px" : "0",
                      backgroundColor: isUndervalued
                        ? "rgb(34, 197, 94)"
                        : isFairValue
                          ? "rgb(59, 130, 246)"
                          : "rgb(239, 68, 68)",
                    }}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      {bucket.count} ({bucket.label})
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Median line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-indigo-500 pointer-events-none"
            style={{ left: `${getPositionPercent(median)}%` }}
          />
        </div>
        {/* Compact Legend */}
        <div className="flex justify-between mt-2 text-[10px] text-gray-500">
          <span className="text-green-600">&lt;1x</span>
          <span className="text-gray-400">1x</span>
          <span className="text-red-600">&gt;1.5x</span>
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            mNAV Distribution
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            How DAT companies are valued relative to their treasury
          </p>
        </div>
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-indigo-500 rounded-full" />
            <span className="text-gray-600 dark:text-gray-400">
              Median: <span className="font-semibold text-indigo-600">{median.toFixed(2)}x</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full" />
            <span className="text-gray-600 dark:text-gray-400">
              Average: <span className="font-semibold text-purple-600">{average.toFixed(2)}x</span>
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        {/* Bars */}
        <div className="flex items-end gap-1 h-48">
          {bucketCounts.map((bucket, i) => {
            const heightPercent = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;
            const isUndervalued = bucket.max <= 1.0;
            const isFairValue = bucket.min >= 1.0 && bucket.max <= 1.5;

            return (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full rounded-t transition-all duration-300 hover:opacity-80 relative group"
                  style={{
                    height: `${heightPercent}%`,
                    minHeight: bucket.count > 0 ? "8px" : "0",
                    backgroundColor: isUndervalued
                      ? "rgb(34, 197, 94)" // green
                      : isFairValue
                        ? "rgb(59, 130, 246)" // blue
                        : "rgb(239, 68, 68)", // red
                  }}
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {bucket.count} companies ({bucket.label})
                  </div>
                </div>
                <span className="text-[10px] text-gray-500 mt-1 text-center">
                  {bucket.count > 0 && bucket.count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Median line */}
        <div
          className="absolute top-0 bottom-8 w-0.5 bg-indigo-500 pointer-events-none"
          style={{ left: `${getPositionPercent(median)}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-500 rounded-full" />
        </div>

        {/* Average line */}
        <div
          className="absolute top-0 bottom-8 w-0.5 bg-purple-500 pointer-events-none"
          style={{ left: `${getPositionPercent(average)}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-purple-500 rounded-full" />
        </div>

        {/* X-axis labels */}
        <div className="flex gap-1 mt-1">
          {bucketCounts.map((bucket, i) => (
            <div key={i} className="flex-1 text-center">
              <span className="text-[10px] text-gray-400">{bucket.label}</span>
            </div>
          ))}
        </div>

        {/* Fair value reference line at 1.0x */}
        <div className="absolute top-0 bottom-8 border-l border-dashed border-gray-400 pointer-events-none"
          style={{ left: `${getPositionPercent(1.0)}%` }}
        />
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span>Undervalued (&lt;1x)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span>Fair (1-1.5x)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded" />
          <span>Premium (&gt;1.5x)</span>
        </div>
      </div>

      {/* Insight */}
      <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {average > median ? (
            <>
              <span className="font-medium text-gray-900 dark:text-gray-100">Right-skewed distribution:</span>{" "}
              Average ({average.toFixed(2)}x) exceeds median ({median.toFixed(2)}x), indicating a few high-premium outliers are pulling the average up. Most companies trade closer to {median.toFixed(2)}x NAV.
            </>
          ) : (
            <>
              <span className="font-medium text-gray-900 dark:text-gray-100">Left-skewed distribution:</span>{" "}
              Median ({median.toFixed(2)}x) exceeds average ({average.toFixed(2)}x), suggesting some deeply discounted companies. The typical DAT trades at {median.toFixed(2)}x NAV.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
