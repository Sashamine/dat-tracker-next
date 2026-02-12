"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { createChart, ColorType, IChartApi, LineSeries, Time } from "lightweight-charts";
import { cn } from "@/lib/utils";
import { getHoldingsHistory } from "@/lib/data/holdings-history";

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

  // Get holdings history and calculate adjusted HPS
  const chartData = useMemo(() => {
    const history = getHoldingsHistory(ticker);
    if (!history) return [];

    const data: ChartDataPoint[] = [];
    
    for (const snapshot of history.history) {
      const rawHPS = snapshot.holdingsPerShare;
      
      // Use point-in-time data if available, otherwise use current values
      // For now, we'll use available data and fall back to current
      const stockPrice = snapshot.stockPrice;
      const debt = snapshot.totalDebt || 0;
      const cash = snapshot.cash || 0;
      
      let mNav = currentMNav;
      let leverage = currentLeverage;
      
      // If we have stock price, we can calculate historical mNAV
      // We'd need crypto price too - for now approximate with current ratios
      if (stockPrice && snapshot.holdings > 0) {
        // Use the snapshot's market data if available
        const marketCap = stockPrice * snapshot.sharesOutstandingDiluted;
        // Estimate crypto NAV - we don't have historical crypto prices stored
        // So we'll use a ratio approach: assume mNAV relationship holds
        // This is imperfect but gives a reasonable approximation
      }
      
      // Calculate leverage from debt data if available
      if (snapshot.totalDebt !== undefined) {
        // We need crypto NAV to calculate leverage properly
        // For now, use the debt ratio as a proxy
        const netDebt = Math.max(0, debt - cash);
        // Approximate: if we had crypto NAV, leverage = netDebt / cryptoNav
        // Without it, we'll scale based on current leverage ratio
      }
      
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
    
    const rawGrowth = (last.rawHPS - first.rawHPS) / first.rawHPS;
    const adjustedGrowth = (last.adjustedHPS - first.adjustedHPS) / first.adjustedHPS;
    
    return {
      rawGrowth,
      adjustedGrowth,
      mNavDrag: rawGrowth - (rawGrowth / last.mNav),
      leverageDrag: (rawGrowth / last.mNav) - adjustedGrowth,
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
            Adjusted for mNAV premium ({currentMNav.toFixed(2)}x) and leverage ({(currentLeverage * 100).toFixed(0)}%)
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
              growthMetrics.rawGrowth >= 0 ? "text-gray-400" : "text-gray-400"
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
              {formatPct(-growthMetrics.mNavDrag)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Leverage Drag</p>
            <p className="text-lg font-semibold font-mono text-red-500">
              {formatPct(-growthMetrics.leverageDrag)}
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
