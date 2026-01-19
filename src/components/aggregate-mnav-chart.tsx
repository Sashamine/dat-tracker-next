"use client";

import { useEffect, useRef, useMemo } from "react";
import { createChart, ColorType, IChartApi, LineSeries, Time } from "lightweight-charts";
import { cn } from "@/lib/utils";
import { Company } from "@/lib/types";
import { calculateMNAV } from "@/lib/calculations";
import { getMarketCapForMnav } from "@/lib/utils/market-cap";
import { MNAV_HISTORY } from "@/lib/data/mnav-history-calculated";

interface AggregateData {
  time: Time;
  median: number;
  average: number;
}

interface AggregateMNAVChartProps {
  companies: Company[];
  prices: {
    crypto: Record<string, { price: number }>;
    stocks: Record<string, { price: number; marketCap: number }>;
  };
  mnavStats?: { median: number; average: number }; // Optional - use shared stats when provided
  compact?: boolean;
  className?: string;
}

// Calculate median of array
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function AggregateMNAVChart({ companies, prices, mnavStats, compact = false, className }: AggregateMNAVChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Use provided mnavStats (from useMNAVStats hook) or calculate fallback
  // This ensures consistency with the shared hook's filtering (mnav < 10)
  const currentStats = useMemo(() => {
    // If mnavStats provided from parent (via useMNAVStats hook), use it
    if (mnavStats && mnavStats.median > 0) {
      return mnavStats;
    }

    // Fallback calculation with same filter as useMNAVStats (< 10)
    const mnavs = companies
      .filter((company) => !company.pendingMerger)
      .map((company) => {
        const cryptoPrice = prices?.crypto[company.asset]?.price || 0;
        const stockData = prices?.stocks[company.ticker];
        const { marketCap } = getMarketCapForMnav(company, stockData);
        return calculateMNAV(marketCap, company.holdings, cryptoPrice, company.cashReserves || 0, company.otherInvestments || 0, company.totalDebt || 0, company.preferredEquity || 0);
      })
      .filter((m): m is number => m !== null && m > 0 && m < 10); // Consistent with useMNAVStats

    if (mnavs.length === 0) return { median: 0, average: 0 };

    return {
      median: median(mnavs),
      average: mnavs.reduce((a, b) => a + b, 0) / mnavs.length,
    };
  }, [companies, prices, mnavStats]);

  // Use pre-calculated historical mNAV data for 1Y view
  const historicalData = useMemo(() => {
    // Get data from the last year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const result: AggregateData[] = [];

    // Add historical snapshots from pre-calculated data
    for (const snapshot of MNAV_HISTORY) {
      const snapshotDate = new Date(snapshot.date);
      if (snapshotDate >= oneYearAgo) {
        result.push({
          time: snapshot.date as Time,
          median: snapshot.median,
          average: snapshot.average,
        });
      }
    }

    // Add current point
    const today = new Date().toISOString().split("T")[0] as Time;
    result.push({
      time: today,
      median: currentStats.median,
      average: currentStats.average,
    });

    return result;
  }, [currentStats]);

  // Calculate change from start
  const change = useMemo(() => {
    if (historicalData.length < 2) return { median: 0, average: 0 };
    const first = historicalData[0];
    const last = historicalData[historicalData.length - 1];
    return {
      median: ((last.median - first.median) / first.median) * 100,
      average: ((last.average - first.average) / first.average) * 100,
    };
  }, [historicalData]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || historicalData.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const isMobile = window.innerWidth < 768;
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "rgba(156, 163, 175, 0.1)" },
        horzLines: { color: "rgba(156, 163, 175, 0.1)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: compact ? 120 : (isMobile ? 280 : 250),
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: false,
      },
      crosshair: {
        horzLine: { visible: !compact, labelVisible: !compact },
        vertLine: { visible: !compact, labelVisible: !compact },
      },
    });

    // Median line (indigo)
    const medianSeries = chart.addSeries(LineSeries, {
      color: "#6366f1",
      lineWidth: 2,
      title: "Median",
      priceFormat: {
        type: "custom",
        formatter: (price: number) => price.toFixed(2) + "x",
      },
    });

    // Average line (purple)
    const averageSeries = chart.addSeries(LineSeries, {
      color: "#a855f7",
      lineWidth: 2,
      title: "Average",
      priceFormat: {
        type: "custom",
        formatter: (price: number) => price.toFixed(2) + "x",
      },
    });

    // Fair value reference line at 1.0x
    const fairValueSeries = chart.addSeries(LineSeries, {
      color: "rgba(156, 163, 175, 0.5)",
      lineWidth: 1,
      lineStyle: 2, // Dashed
      priceLineVisible: false,
      lastValueVisible: false,
    });

    medianSeries.setData(historicalData.map(d => ({ time: d.time, value: d.median })));
    averageSeries.setData(historicalData.map(d => ({ time: d.time, value: d.average })));
    fairValueSeries.setData(historicalData.map(d => ({ time: d.time, value: 1.0 })));

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const isMobileNow = window.innerWidth < 768;
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: compact ? 120 : (isMobileNow ? 280 : 250),
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [historicalData, compact]);

  // Compact view for sidebar
  if (compact) {
    return (
      <div className={className}>
        {/* Current values */}
        <div className="flex justify-between mb-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-indigo-500 rounded-full" />
            <span className="text-gray-500">Med:</span>
            <span className="font-semibold text-indigo-600">{currentStats.median.toFixed(2)}x</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-purple-500 rounded-full" />
            <span className="text-gray-500">Avg:</span>
            <span className="font-semibold text-purple-600">{currentStats.average.toFixed(2)}x</span>
          </div>
        </div>
        {/* Chart */}
        <div ref={chartContainerRef} className="w-full" />
        {/* Period change */}
        <div className="flex justify-between mt-1 text-[10px] text-gray-500">
          <span>1Y ago</span>
          <span className={cn(
            "font-medium",
            change.median >= 0 ? "text-green-600" : "text-red-600"
          )}>
            {change.median >= 0 ? "+" : ""}{change.median.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div className={cn("bg-gray-50 dark:bg-gray-900 rounded-lg p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Aggregate mNAV
          </h3>
          <p className="text-sm text-gray-500">
            Market-wide valuation trend over time
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-indigo-500 rounded-full" />
            <span className="text-gray-600 dark:text-gray-400">
              Median: <span className="font-semibold text-indigo-600">{currentStats.median.toFixed(2)}x</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full" />
            <span className="text-gray-600 dark:text-gray-400">
              Average: <span className="font-semibold text-purple-600">{currentStats.average.toFixed(2)}x</span>
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div ref={chartContainerRef} className="w-full" />

      {/* Insight */}
      <div className="flex justify-between mt-4 text-sm">
        <div className="text-gray-500">
          <span className="text-gray-400">1Y Change:</span>{" "}
          <span className={cn("font-medium", change.median >= 0 ? "text-green-600" : "text-red-600")}>
            {change.median >= 0 ? "+" : ""}{change.median.toFixed(1)}% (median)
          </span>
        </div>
        <div className="text-gray-500">
          Fair value = <span className="font-medium text-gray-700 dark:text-gray-300">1.0x</span>
        </div>
      </div>
    </div>
  );
}
