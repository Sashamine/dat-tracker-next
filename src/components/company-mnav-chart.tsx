"use client";

import { useEffect, useRef, useMemo } from "react";
import { createChart, ColorType, IChartApi, LineSeries, Time } from "lightweight-charts";
import { cn } from "@/lib/utils";
import { TimeRange, ChartInterval } from "@/lib/hooks/use-stock-history";
import { MNAV_HISTORY } from "@/lib/data/mnav-history-calculated";

interface CompanyMNAVChartProps {
  ticker: string;
  asset: string;
  currentMNAV: number | null;
  currentStockPrice: number;
  currentCryptoPrice: number;
  timeRange: TimeRange;
  interval: ChartInterval;
  className?: string;
}

export function CompanyMNAVChart({
  ticker,
  asset,
  currentMNAV,
  currentStockPrice,
  currentCryptoPrice,
  timeRange,
  interval,
  className,
}: CompanyMNAVChartProps) {
  // Silence unused variable warnings - these props are kept for API compatibility
  void asset;
  void currentStockPrice;
  void currentCryptoPrice;
  void interval;

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Get mNAV history from pre-calculated data
  const mnavHistory = useMemo(() => {
    const result: { time: Time; value: number }[] = [];
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // For short ranges (1d, 7d), just show current mNAV
    if (timeRange === "1d" || timeRange === "7d") {
      if (currentMNAV) {
        return [{ time: today as Time, value: currentMNAV }];
      }
      return [];
    }

    // Calculate start date for filtering
    let startDate: Date;
    switch (timeRange) {
      case "1mo":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "all":
      default:
        startDate = new Date("2020-01-01");
        break;
    }

    // Extract this company's mNAV from each historical snapshot
    for (const snapshot of MNAV_HISTORY) {
      const snapshotDate = new Date(snapshot.date);
      if (snapshotDate < startDate) continue;

      const companyData = snapshot.companies.find(c => c.ticker === ticker);
      if (companyData) {
        result.push({
          time: snapshot.date as Time,
          value: companyData.mnav,
        });
      }
    }

    // Always add current mNAV as the latest point if available
    if (currentMNAV) {
      // Only add if we don't already have a point for today
      const lastPoint = result[result.length - 1];
      if (!lastPoint || lastPoint.time !== today) {
        result.push({ time: today as Time, value: currentMNAV });
      }
    }

    return result;
  }, [ticker, timeRange, currentMNAV]);

  const isLoading = false;
  const hasData = mnavHistory.length > 0;

  // Debug: log to console
  useEffect(() => {
    console.log('[CompanyMNAVChart] ticker:', ticker, 'timeRange:', timeRange, 'currentMNAV:', currentMNAV, 'historyLength:', mnavHistory.length);
  }, [ticker, timeRange, currentMNAV, mnavHistory.length]);

  // Initialize and update chart when data is available
  useEffect(() => {
    if (!chartContainerRef.current || !hasData) return;

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
      height: isMobile ? 280 : 250,
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
      },
      crosshair: {
        horzLine: {
          visible: true,
          labelVisible: true,
        },
        vertLine: {
          visible: true,
          labelVisible: true,
        },
      },
    });

    // mNAV line
    const mnavSeries = chart.addSeries(LineSeries, {
      color: "#6366f1", // Indigo
      lineWidth: 2,
      title: "mNAV",
      priceFormat: {
        type: "custom",
        formatter: (price: number) => price.toFixed(2) + "x",
      },
    });

    mnavSeries.setData(mnavHistory);
    chart.timeScale().fitContent();

    chartRef.current = chart;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const isMobileNow = window.innerWidth < 768;
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: isMobileNow ? 280 : 250,
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
  }, [hasData, mnavHistory]);

  // Calculate current and change stats
  const stats = useMemo(() => {
    if (mnavHistory.length < 2) return null;
    const current = mnavHistory[mnavHistory.length - 1].value;
    const first = mnavHistory[0].value;
    const change = ((current - first) / first) * 100;
    const min = Math.min(...mnavHistory.map(d => d.value));
    const max = Math.max(...mnavHistory.map(d => d.value));
    return { current, change, min, max };
  }, [mnavHistory]);

  return (
    <div className={cn("bg-gray-50 dark:bg-gray-900 rounded-lg p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            mNAV History
          </h2>
          <p className="text-sm text-gray-500">
            Market Cap / Net Asset Value over time
          </p>
        </div>
        {stats && (
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Period</p>
              <p className={cn(
                "text-lg font-bold",
                stats.change >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {stats.change >= 0 ? "+" : ""}{stats.change.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Range</p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {stats.min.toFixed(2)}x - {stats.max.toFixed(2)}x
              </p>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          Loading mNAV history...
        </div>
      ) : hasData ? (
        <div ref={chartContainerRef} className="w-full h-[300px]" />
      ) : (
        <div className="h-[300px] flex flex-col items-center justify-center text-gray-500">
          <p className="text-lg font-medium">No mNAV History Available</p>
          <p className="text-sm mt-2">
            Historical data requires both stock and crypto price history.
          </p>
        </div>
      )}
    </div>
  );
}
