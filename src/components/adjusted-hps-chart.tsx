"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { createChart, ColorType, IChartApi, LineSeries, Time } from "lightweight-charts";
import { cn } from "@/lib/utils";
import { getHoldingsHistory } from "@/lib/data/holdings-history";
import { MNAV_HISTORY } from "@/lib/data/mnav-history-calculated";

type TimeRange = "3mo" | "6mo" | "1y" | "all";

interface AdjustedHPSChartProps {
  ticker: string;
  asset: string;
  currentMNav: number;
  currentLeverage: number;
  className?: string;
}

interface ChartDataPoint {
  date: string;
  rawHPS: number;
  adjustedHPS: number;
  mNav: number;
}

// Get mNAV for a specific ticker at a specific date from MNAV_HISTORY
function getMNavAtDate(ticker: string, targetDate: string): number | null {
  const target = new Date(targetDate);
  
  let closestMNav = null;
  let closestDiff = Infinity;
  
  for (const snapshot of MNAV_HISTORY) {
    const snapshotDate = new Date(snapshot.date);
    const diff = target.getTime() - snapshotDate.getTime();
    
    if (diff >= 0 && diff < closestDiff) {
      const companyData = snapshot.companies.find(c => c.ticker === ticker);
      if (companyData) {
        closestMNav = companyData.mnav;
        closestDiff = diff;
      }
    }
  }
  
  return closestMNav;
}

export function AdjustedHPSChart({
  ticker,
  asset,
  currentMNav,
  currentLeverage,
  className,
}: AdjustedHPSChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");

  // Get holdings history and match with mNAV history
  const chartData = useMemo(() => {
    const history = getHoldingsHistory(ticker);
    if (!history) return [];

    const data: ChartDataPoint[] = [];
    
    for (const snapshot of history.history) {
      const rawHPS = snapshot.holdingsPerShare;
      const mNav = getMNavAtDate(ticker, snapshot.date) ?? currentMNav;
      
      // Adjusted HPS = what you actually own per share, accounting for the premium
      // If mNAV is 2x, you paid 2x for each unit of crypto exposure
      const adjustedHPS = rawHPS / mNav;
      
      data.push({
        date: snapshot.date,
        rawHPS,
        adjustedHPS,
        mNav,
      });
    }
    
    return data;
  }, [ticker, currentMNav]);

  // Filter by time range
  const filteredData = useMemo(() => {
    if (!chartData.length) return [];
    
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
        return chartData;
    }
    
    const filtered = chartData.filter(d => new Date(d.date) >= startDate);
    return filtered.length >= 2 ? filtered : chartData;
  }, [chartData, timeRange]);

  // Calculate growth metrics
  const metrics = useMemo(() => {
    if (filteredData.length < 2) return null;
    
    const first = filteredData[0];
    const last = filteredData[filteredData.length - 1];
    
    const companyGrowth = first.rawHPS > 0 ? (last.rawHPS - first.rawHPS) / first.rawHPS : 0;
    const yourGrowth = first.adjustedHPS > 0 ? (last.adjustedHPS - first.adjustedHPS) / first.adjustedHPS : 0;
    
    // Average mNAV over the period
    const avgMNav = filteredData.reduce((sum, d) => sum + d.mNav, 0) / filteredData.length;
    
    return {
      companyGrowth,
      yourGrowth,
      difference: companyGrowth - yourGrowth,
      avgMNav,
      currentMNav: last.mNav,
      startDate: first.date,
      endDate: last.date,
    };
  }, [filteredData]);

  // Create chart - single line showing "Your Actual Exposure"
  useEffect(() => {
    if (!chartContainerRef.current || filteredData.length < 2) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

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
      height: 200,
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: false,
      },
    });

    chartRef.current = chart;

    // Single line: Your actual crypto exposure per share
    const series = chart.addSeries(LineSeries, {
      color: "#8b5cf6",
      lineWidth: 2,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => {
          if (price >= 0.01) return price.toFixed(5);
          if (price >= 0.0001) return price.toFixed(7);
          return price.toFixed(9);
        },
      },
    });

    series.setData(
      filteredData.map((d) => ({
        time: d.date as Time,
        value: d.adjustedHPS,
      }))
    );

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
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
  }, [filteredData]);

  if (!chartData.length) {
    return (
      <div className={cn("bg-gray-50 dark:bg-gray-900 rounded-lg p-6", className)}>
        <p className="text-center text-gray-500">No data available</p>
      </div>
    );
  }

  const formatPct = (n: number) => {
    const pct = n * 100;
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(0)}%`;
  };

  return (
    <div className={cn("bg-gray-50 dark:bg-gray-900 rounded-lg p-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Your Actual {asset} Exposure
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            What you really own per share, adjusted for the price premium
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
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics - Plain English */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Company Performance */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">📈</span>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Company Performance
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {formatPct(metrics.companyGrowth)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {asset} per share growth
            </p>
          </div>

          {/* Your Actual Growth */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-purple-500">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">💰</span>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Your Actual Growth
              </span>
            </div>
            <p className={cn(
              "text-3xl font-bold",
              metrics.yourGrowth >= 0 ? "text-purple-600" : "text-red-600"
            )}>
              {formatPct(metrics.yourGrowth)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Adjusted for premium paid
            </p>
          </div>
        </div>
      )}

      {/* Explanation */}
      {metrics && metrics.avgMNav > 1 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Why the difference?</strong> On average, you paid{" "}
            <span className="font-semibold">{metrics.avgMNav.toFixed(1)}x</span> the value of the underlying {asset}.
            {metrics.avgMNav > 1.5 && (
              <> That premium reduces how much {asset} exposure each dollar actually buys you.</>
            )}
          </p>
        </div>
      )}

      {/* Chart */}
      {filteredData.length >= 2 ? (
        <div>
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
            Your {asset} exposure per share over time
          </p>
          <div ref={chartContainerRef} className="w-full" />
        </div>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-gray-500">
          Not enough data points
        </div>
      )}
    </div>
  );
}
