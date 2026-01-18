"use client";

import { useEffect, useRef, useMemo } from "react";
import { createChart, ColorType, IChartApi, LineSeries, Time } from "lightweight-charts";
import { cn } from "@/lib/utils";
import { getHoldingsHistory, calculateHoldingsGrowth } from "@/lib/data/holdings-history";

interface HoldingsPerShareChartProps {
  ticker: string;
  asset: string;
  currentHoldingsPerShare: number | null;
  className?: string;
}

export function HoldingsPerShareChart({
  ticker,
  asset,
  currentHoldingsPerShare,
  className,
}: HoldingsPerShareChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const historyData = useMemo(() => getHoldingsHistory(ticker), [ticker]);
  const growthMetrics = useMemo(
    () => (historyData ? calculateHoldingsGrowth(historyData.history) : null),
    [historyData]
  );

  // Initialize and update chart
  useEffect(() => {
    if (!chartContainerRef.current || !historyData || historyData.history.length < 2) return;

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
      color: "#22c55e", // Green for growth
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

    // Format data for chart
    const chartData = historyData.history.map((snapshot) => ({
      time: snapshot.date as Time,
      value: snapshot.holdingsPerShare,
    }));

    series.setData(chartData);
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        const isMobileNow = window.innerWidth < 768;
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: isMobileNow ? 200 : 250,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [historyData, asset]);

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

  const firstSnapshot = historyData.history[0];
  const lastSnapshot = historyData.history[historyData.history.length - 1];

  return (
    <div className={cn("bg-gray-50 dark:bg-gray-900 rounded-lg p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {asset} Per Share Growth
          </h3>
          <p className="text-sm text-gray-500">
            {new Date(firstSnapshot.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            {" → "}
            {new Date(lastSnapshot.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Current</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 font-mono">
              {lastSnapshot.holdingsPerShare >= 0.01
                ? lastSnapshot.holdingsPerShare.toFixed(4)
                : lastSnapshot.holdingsPerShare >= 0.0001
                ? lastSnapshot.holdingsPerShare.toFixed(6)
                : lastSnapshot.holdingsPerShare.toFixed(8)}
            </p>
          </div>
          {growthMetrics && (
            <>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Growth</p>
                <p className={cn(
                  "text-xl font-bold",
                  growthMetrics.totalGrowth >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {growthMetrics.totalGrowth >= 0 ? "+" : ""}{growthMetrics.totalGrowth.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">CAGR</p>
                <p className={cn(
                  "text-xl font-bold",
                  growthMetrics.annualizedGrowth >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {growthMetrics.annualizedGrowth >= 0 ? "+" : ""}{growthMetrics.annualizedGrowth.toFixed(1)}%
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <div ref={chartContainerRef} className="w-full" />

      <div className="mt-4 text-xs text-gray-500">
        <p>
          Source: Quarterly 10-Q/10-K filings and 8-K announcements.
          {asset}/share = Total {asset} Holdings ÷ Diluted Shares Outstanding
        </p>
      </div>
    </div>
  );
}
