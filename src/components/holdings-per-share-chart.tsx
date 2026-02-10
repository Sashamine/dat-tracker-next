"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { createChart, ColorType, IChartApi, LineSeries, Time } from "lightweight-charts";
import { cn } from "@/lib/utils";
import { getHoldingsHistory, calculateHoldingsGrowth } from "@/lib/data/holdings-history";

type TimeRange = "3mo" | "6mo" | "1y" | "all";

interface HoldingsPerShareChartProps {
  ticker: string;
  asset: string;
  currentHoldingsPerShare: number | null;
  className?: string;
  /** Provenance info for the current value */
  currentProvenance?: {
    holdings: number;
    shares: number;
    sharesSource: "verified" | "estimated";
    methodology?: string;
  };
}

export function HoldingsPerShareChart({
  ticker,
  asset,
  currentHoldingsPerShare,
  className,
  currentProvenance,
}: HoldingsPerShareChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");

  const historyData = useMemo(() => getHoldingsHistory(ticker), [ticker]);
  
  // Filter history based on time range, extending if insufficient data
  const { filteredHistory, rangeExtended } = useMemo(() => {
    if (!historyData) return { filteredHistory: null, rangeExtended: false };
    
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case "3mo":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "6mo":
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "all":
      default:
        return { filteredHistory: historyData.history, rangeExtended: false };
    }
    
    const filtered = historyData.history.filter(snapshot => new Date(snapshot.date) >= startDate);
    
    // If fewer than 3 data points in range, extend to include more history for a meaningful chart
    if (filtered.length < 3 && historyData.history.length >= 3) {
      const minPoints = Math.min(historyData.history.length, Math.max(3, filtered.length + 2));
      const extended = historyData.history.slice(-minPoints);
      return { filteredHistory: extended, rangeExtended: true };
    }
    
    return { filteredHistory: filtered, rangeExtended: false };
  }, [historyData, timeRange]);

  const growthMetrics = useMemo(
    () => (filteredHistory && filteredHistory.length >= 2 ? calculateHoldingsGrowth(filteredHistory) : null),
    [filteredHistory]
  );

  // Initialize and update chart
  useEffect(() => {
    if (!chartContainerRef.current || !filteredHistory || filteredHistory.length < 2) return;

    // Clean up existing chart
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
      height: isMobile ? 200 : 250,
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: false,
      },
      crosshair: {
        horzLine: { visible: true, labelVisible: true },
        vertLine: { visible: true, labelVisible: true },
      },
    });

    chartRef.current = chart;

    // Holdings per share line
    const series = chart.addSeries(LineSeries, {
      color: "#22c55e",
      lineWidth: 2,
      title: `${asset}/Share`,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => {
          if (price >= 0.01) return price.toFixed(4);
          if (price >= 0.0001) return price.toFixed(6);
          return price.toFixed(8);
        },
      },
    });

    // Format data for chart - historical snapshots
    const chartData = filteredHistory.map((snapshot) => ({
      time: snapshot.date as Time,
      value: snapshot.holdingsPerShare,
    }));
    
    // Add current point with estimated shares (if provided and different from last snapshot)
    if (currentHoldingsPerShare !== null && chartData.length > 0) {
      const today = new Date().toISOString().split("T")[0] as Time;
      const lastPoint = chartData[chartData.length - 1];
      // Only add if today is after the last snapshot date
      if (today > lastPoint.time) {
        chartData.push({
          time: today,
          value: currentHoldingsPerShare,
        });
      }
    }

    series.setData(chartData);
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const isMobileNow = window.innerWidth < 768;
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: isMobileNow ? 200 : 250,
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
  }, [filteredHistory, asset, currentHoldingsPerShare]);

  // If no historical data, show current value only
  if (!historyData || historyData.history.length < 2) {
    return (
      <div className={cn("bg-gray-50 dark:bg-gray-900 rounded-lg p-6", className)}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {asset} Per Share
            </h3>
            <p className="text-sm text-gray-500">
              Historical data not yet available for {ticker}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Current</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-mono">
              {currentHoldingsPerShare
                ? currentHoldingsPerShare >= 0.01
                  ? currentHoldingsPerShare.toFixed(4)
                  : currentHoldingsPerShare >= 0.0001
                  ? currentHoldingsPerShare.toFixed(6)
                  : currentHoldingsPerShare.toFixed(8)
                : "—"}
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          We&apos;re collecting {asset}/share data over time. Check back later for growth trends.
        </p>
      </div>
    );
  }

  const firstSnapshot = filteredHistory && filteredHistory.length > 0 ? filteredHistory[0] : historyData.history[0];
  const lastSnapshot = filteredHistory && filteredHistory.length > 0 ? filteredHistory[filteredHistory.length - 1] : historyData.history[historyData.history.length - 1];

  return (
    <div className={cn("bg-gray-50 dark:bg-gray-900 rounded-lg p-6", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {asset} Per Share Growth
          </h3>
          <p className="text-sm text-gray-500">
            {new Date(firstSnapshot.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            {" → "}
            {new Date(lastSnapshot.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            {rangeExtended && (
              <span className="ml-2 text-amber-600 dark:text-amber-400" title="Range extended to show available data">
                (extended - latest data from {new Date(lastSnapshot.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-1">
          {([
            { value: "3mo", label: "3M" },
            { value: "6mo", label: "6M" },
            { value: "1y", label: "1Y" },
            { value: "all", label: "ALL" },
          ] as const).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTimeRange(value)}
              className={cn(
                "px-3 py-1 text-sm rounded-md transition-colors",
                timeRange === value
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 sm:gap-6 mb-4">
        <div className="text-left">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total {asset}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 font-mono">
            {lastSnapshot.holdings >= 1000 
              ? lastSnapshot.holdings.toLocaleString(undefined, { maximumFractionDigits: 0 })
              : lastSnapshot.holdings.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-400">
            from {firstSnapshot.holdings >= 1000 
              ? firstSnapshot.holdings.toLocaleString(undefined, { maximumFractionDigits: 0 })
              : firstSnapshot.holdings.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="text-left">
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{asset}/Share</p>
            {currentProvenance?.sharesSource === "estimated" && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded">
                EST
              </span>
            )}
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 font-mono">
            {currentHoldingsPerShare !== null
              ? currentHoldingsPerShare >= 0.01
                ? currentHoldingsPerShare.toFixed(4)
                : currentHoldingsPerShare >= 0.0001
                ? currentHoldingsPerShare.toFixed(6)
                : currentHoldingsPerShare.toFixed(8)
              : lastSnapshot.holdingsPerShare >= 0.01
              ? lastSnapshot.holdingsPerShare.toFixed(4)
              : lastSnapshot.holdingsPerShare >= 0.0001
              ? lastSnapshot.holdingsPerShare.toFixed(6)
              : lastSnapshot.holdingsPerShare.toFixed(8)}
          </p>
          <p className="text-xs text-gray-400">
            from {firstSnapshot.holdingsPerShare >= 0.01
              ? firstSnapshot.holdingsPerShare.toFixed(4)
              : firstSnapshot.holdingsPerShare >= 0.0001
              ? firstSnapshot.holdingsPerShare.toFixed(6)
              : firstSnapshot.holdingsPerShare.toFixed(8)}
          </p>
          {currentProvenance && (
            <details className="mt-1">
              <summary className="text-[10px] text-amber-600 dark:text-amber-400 cursor-pointer hover:underline">
                {currentProvenance.holdings.toLocaleString()} {asset} ÷ {(currentProvenance.shares / 1_000_000).toFixed(0)}M shares
              </summary>
              {currentProvenance.methodology && (
                <p className="text-[10px] text-gray-500 mt-1 leading-relaxed max-w-xs">
                  {currentProvenance.methodology}
                </p>
              )}
            </details>
          )}
        </div>
        {growthMetrics && filteredHistory && filteredHistory.length >= 2 && (
          <>
            <div className="text-left">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Period Growth</p>
              <p className={cn(
                "text-xl font-bold",
                growthMetrics.totalGrowth >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {growthMetrics.totalGrowth >= 0 ? "+" : ""}{growthMetrics.totalGrowth.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400">
                {new Date(filteredHistory[0].date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} → {new Date(filteredHistory[filteredHistory.length - 1].date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} ({growthMetrics.periodYears.toFixed(1)}y)
              </p>
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-500 uppercase tracking-wide">CAGR</p>
              <p className={cn(
                "text-xl font-bold",
                growthMetrics.annualizedGrowth >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {growthMetrics.annualizedGrowth >= 0 ? "+" : ""}{growthMetrics.annualizedGrowth.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400">{filteredHistory.length} data points</p>
            </div>
          </>
        )}
      </div>

      {filteredHistory && filteredHistory.length >= 2 ? (
        <div ref={chartContainerRef} className="w-full" />
      ) : (
        <div className="h-[200px] flex items-center justify-center text-gray-500">
          Not enough data points for selected time range
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 space-y-1">
        {ticker === "MSTR" ? (
          <p>
            Source: SEC 8-K weekly filings with midpoint interpolation for chart smoothness (~3.5 day granularity).
            {" "}{asset}/share = Total {asset} Holdings ÷ Diluted Shares Outstanding
          </p>
        ) : ticker === "3350.T" ? (
          <p>
            Source: TDnet regulatory filings (TSE disclosure system). All data split-adjusted.
            {" "}{asset}/share = Total {asset} Holdings ÷ Diluted Shares Outstanding
          </p>
        ) : ticker.includes(".") ? (
          <p>
            Source: Company disclosures and local exchange filings.
            {" "}{asset}/share = Total {asset} Holdings ÷ Diluted Shares Outstanding
          </p>
        ) : (
          <p>
            Source: SEC 10-Q/10-K filings and 8-K announcements.
            {" "}{asset}/share = Total {asset} Holdings ÷ Diluted Shares Outstanding
          </p>
        )}
      </div>
    </div>
  );
}
