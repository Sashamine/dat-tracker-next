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
      
      // Adjusted HPS = what you actually own per share, accounting for the premium/discount
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

  // Get current values for display
  const currentValues = useMemo(() => {
    if (!filteredData.length) return null;
    const last = filteredData[filteredData.length - 1];
    return {
      rawHPS: last.rawHPS,
      adjustedHPS: last.adjustedHPS,
      mNav: last.mNav,
    };
  }, [filteredData]);

  // Create chart
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
      height: 250,
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: false,
      },
    });

    chartRef.current = chart;

    // Single line: adjusted HPS
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

  const formatHPS = (n: number) => {
    if (n >= 0.01) return n.toFixed(5);
    if (n >= 0.0001) return n.toFixed(7);
    return n.toFixed(9);
  };

  return (
    <div className={cn("bg-gray-50 dark:bg-gray-900 rounded-lg p-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {asset} Exposure Per Share
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Adjusted for mNAV premium/discount at each point in time
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

      {/* Current value */}
      {currentValues && (
        <div className="mb-4 flex items-baseline gap-3">
          <span className="text-2xl font-bold text-purple-600 font-mono">
            {formatHPS(currentValues.adjustedHPS)}
          </span>
          <span className="text-sm text-gray-500">
            {asset}/share @ {currentValues.mNav.toFixed(2)}x mNAV
          </span>
        </div>
      )}

      {/* Chart */}
      {filteredData.length >= 2 ? (
        <div ref={chartContainerRef} className="w-full" />
      ) : (
        <div className="h-[250px] flex items-center justify-center text-gray-500">
          Not enough data points
        </div>
      )}

      {/* Explanation */}
      <p className="mt-4 text-xs text-gray-500">
        Shows your actual {asset} exposure per share after accounting for the price premium or discount 
        you paid relative to the underlying {asset} value (mNAV).
      </p>
    </div>
  );
}
