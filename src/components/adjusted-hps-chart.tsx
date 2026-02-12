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
  leverage: number;
}

// Get mNAV for a specific ticker at a specific date from MNAV_HISTORY
function getMNavAtDate(ticker: string, targetDate: string): { mNav: number; leverage: number } | null {
  const target = new Date(targetDate);
  
  // Find the closest snapshot on or before the target date
  let closestSnapshot = null;
  let closestDiff = Infinity;
  
  for (const snapshot of MNAV_HISTORY) {
    const snapshotDate = new Date(snapshot.date);
    const diff = target.getTime() - snapshotDate.getTime();
    
    // Only consider snapshots on or before target date
    if (diff >= 0 && diff < closestDiff) {
      // Check if this ticker is in the snapshot
      const companyData = snapshot.companies.find(c => c.ticker === ticker);
      if (companyData) {
        closestSnapshot = { snapshot, companyData };
        closestDiff = diff;
      }
    }
  }
  
  if (!closestSnapshot) return null;
  
  const { companyData } = closestSnapshot;
  
  // Calculate leverage: (EV - MarketCap) / CryptoNav = Net Debt / CryptoNav
  // EV = MarketCap + Debt - Cash, so Debt - Cash = EV - MarketCap
  const netDebt = companyData.enterpriseValue - companyData.marketCap;
  const leverage = companyData.cryptoNav > 0 ? Math.max(0, netDebt / companyData.cryptoNav) : 0;
  
  return {
    mNav: companyData.mnav,
    leverage,
  };
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
  const [timeRange, setTimeRange] = useState<TimeRange>("1y");

  // Get holdings history and match with mNAV history
  const chartData = useMemo(() => {
    const history = getHoldingsHistory(ticker);
    if (!history) return [];

    const data: ChartDataPoint[] = [];
    
    for (const snapshot of history.history) {
      const rawHPS = snapshot.holdingsPerShare;
      
      // Get point-in-time mNAV and leverage from MNAV_HISTORY
      const metrics = getMNavAtDate(ticker, snapshot.date);
      
      // Use historical data if available, fall back to current values
      const mNav = metrics?.mNav ?? currentMNav;
      const leverage = metrics?.leverage ?? currentLeverage;
      
      // Adjusted HPS = rawHPS / mNav * (1 - leverage)
      const adjustedHPS = rawHPS / mNav * (1 - leverage);
      
      data.push({
        date: snapshot.date,
        rawHPS,
        adjustedHPS,
        mNav,
        leverage,
      });
    }
    
    return data;
  }, [ticker, currentMNav, currentLeverage]);

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
    
    // Ensure we have at least a few points
    if (filtered.length < 3 && chartData.length >= 3) {
      return chartData.slice(-Math.max(3, filtered.length + 2));
    }
    
    return filtered;
  }, [chartData, timeRange]);

  // Calculate growth metrics
  const growthMetrics = useMemo(() => {
    if (filteredData.length < 2) return null;
    
    const first = filteredData[0];
    const last = filteredData[filteredData.length - 1];
    
    const rawGrowth = first.rawHPS > 0 ? (last.rawHPS - first.rawHPS) / first.rawHPS : 0;
    const adjustedGrowth = first.adjustedHPS > 0 ? (last.adjustedHPS - first.adjustedHPS) / first.adjustedHPS : 0;
    
    // Calculate what raw growth would be after just mNAV adjustment
    const avgMNav = (first.mNav + last.mNav) / 2;
    const afterMNavOnly = rawGrowth / avgMNav;
    
    return {
      rawGrowth,
      adjustedGrowth,
      mNavDrag: rawGrowth - afterMNavOnly,
      leverageDrag: afterMNavOnly - adjustedGrowth,
      startMNav: first.mNav,
      endMNav: last.mNav,
      startLeverage: first.leverage,
      endLeverage: last.leverage,
    };
  }, [filteredData]);

  // Create chart
  useEffect(() => {
    if (!chartContainerRef.current || filteredData.length < 2) return;

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
      height: isMobile ? 250 : 300,
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

    // Raw HPS line (faded)
    const rawSeries = chart.addSeries(LineSeries, {
      color: "rgba(156, 163, 175, 0.5)",
      lineWidth: 1,
      lineStyle: 2, // dashed
      title: `Raw ${asset}/Share`,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => {
          if (price >= 0.01) return price.toFixed(5);
          if (price >= 0.0001) return price.toFixed(7);
          return price.toFixed(9);
        },
      },
    });

    rawSeries.setData(
      filteredData.map((d) => ({
        time: d.date as Time,
        value: d.rawHPS,
      }))
    );

    // Adjusted HPS line (prominent)
    const adjustedSeries = chart.addSeries(LineSeries, {
      color: "#8b5cf6", // purple
      lineWidth: 2,
      title: `Adjusted ${asset}/Share`,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => {
          if (price >= 0.01) return price.toFixed(5);
          if (price >= 0.0001) return price.toFixed(7);
          return price.toFixed(9);
        },
      },
    });

    adjustedSeries.setData(
      filteredData.map((d) => ({
        time: d.date as Time,
        value: d.adjustedHPS,
      }))
    );

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const isMobileNow = window.innerWidth < 768;
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: isMobileNow ? 250 : 300,
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
  }, [filteredData, asset]);

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
    return `${sign}${pct.toFixed(1)}%`;
  };

  return (
    <div className={cn("bg-gray-50 dark:bg-gray-900 rounded-lg p-6", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Risk-Adjusted {asset}/Share
          </h3>
          <p className="text-sm text-gray-500">
            Adjusted for mNAV ({growthMetrics ? `${growthMetrics.startMNav.toFixed(1)}x → ${growthMetrics.endMNav.toFixed(1)}x` : `${currentMNav.toFixed(1)}x`}) 
            {" & leverage "}({growthMetrics ? `${(growthMetrics.startLeverage * 100).toFixed(0)}% → ${(growthMetrics.endLeverage * 100).toFixed(0)}%` : `${(currentLeverage * 100).toFixed(0)}%`})
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

      {/* Growth metrics */}
      {growthMetrics && (
        <div className="flex flex-wrap gap-6 mb-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Raw Growth</p>
            <p className={cn(
              "text-xl font-bold font-mono",
              "text-gray-400"
            )}>
              {formatPct(growthMetrics.rawGrowth)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Adjusted Growth</p>
            <p className={cn(
              "text-xl font-bold font-mono",
              growthMetrics.adjustedGrowth >= 0 ? "text-purple-600" : "text-red-600"
            )}>
              {formatPct(growthMetrics.adjustedGrowth)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">mNAV Drag</p>
            <p className="text-lg font-semibold font-mono text-amber-600">
              {formatPct(-Math.abs(growthMetrics.mNavDrag))}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Leverage Drag</p>
            <p className="text-lg font-semibold font-mono text-red-500">
              {formatPct(-Math.abs(growthMetrics.leverageDrag))}
            </p>
          </div>
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

      {/* Legend */}
      <div className="mt-4 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-gray-400" style={{ borderStyle: 'dashed' }} />
          <span>Raw {asset}/Share</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-purple-500" />
          <span>Adjusted {asset}/Share</span>
        </span>
      </div>
    </div>
  );
}
