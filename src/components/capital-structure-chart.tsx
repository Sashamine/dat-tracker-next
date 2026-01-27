"use client";

import { useEffect, useRef, useMemo } from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  AreaSeries,
  LineSeries,
  Time,
} from "lightweight-charts";
import { cn } from "@/lib/utils";
import {
  getCapitalStructureTimeline,
  type CapitalStructureSnapshot,
} from "@/lib/data/mstr-capital-structure";
import { formatLargeNumber } from "@/lib/calculations";

interface CapitalStructureChartProps {
  ticker: string;
  className?: string;
}

/**
 * Capital Structure Chart
 * Shows the evolution of capital structure over time for MSTR
 * - BTC holdings (count)
 * - Total debt
 * - Preferred equity
 * - Common shares outstanding
 */
export function CapitalStructureChart({
  ticker,
  className,
}: CapitalStructureChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Only MSTR has capital structure data
  const isSupported = ticker.toUpperCase() === "MSTR";

  // Get capital structure timeline
  const timeline = useMemo(() => {
    if (!isSupported) return [];
    return getCapitalStructureTimeline();
  }, [isSupported]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (timeline.length === 0) return null;

    const btcData: { time: Time; value: number }[] = [];
    const debtData: { time: Time; value: number }[] = [];
    const prefData: { time: Time; value: number }[] = [];
    const sharesData: { time: Time; value: number }[] = [];

    for (const snapshot of timeline) {
      const time = snapshot.date as Time;

      btcData.push({ time, value: snapshot.btcHoldings });
      debtData.push({ time, value: snapshot.totalDebt / 1e9 }); // In billions
      prefData.push({ time, value: snapshot.preferredEquity / 1e9 }); // In billions
      sharesData.push({ time, value: snapshot.commonSharesOutstanding / 1e6 }); // In millions
    }

    return { btcData, debtData, prefData, sharesData };
  }, [timeline]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (timeline.length < 2) return null;

    const first = timeline[0];
    const last = timeline[timeline.length - 1];

    const btcGrowth = ((last.btcHoldings - first.btcHoldings) / first.btcHoldings) * 100;
    const debtGrowth = first.totalDebt > 0
      ? ((last.totalDebt - first.totalDebt) / first.totalDebt) * 100
      : 0;
    const shareGrowth = ((last.commonSharesOutstanding - first.commonSharesOutstanding) / first.commonSharesOutstanding) * 100;

    return {
      currentBtc: last.btcHoldings,
      currentDebt: last.totalDebt,
      currentPref: last.preferredEquity,
      currentShares: last.commonSharesOutstanding,
      btcGrowth,
      debtGrowth,
      shareGrowth,
      periods: timeline.length,
    };
  }, [timeline]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || !chartData) return;

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
      height: isMobile ? 300 : 280,
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
      },
      crosshair: {
        horzLine: { visible: true, labelVisible: true },
        vertLine: { visible: true, labelVisible: true },
      },
    });

    // BTC holdings line (primary metric)
    const btcSeries = chart.addSeries(LineSeries, {
      color: "#f97316", // Orange
      lineWidth: 2,
      title: "BTC Holdings",
      priceFormat: {
        type: "custom",
        formatter: (price: number) => `${Math.round(price).toLocaleString()} BTC`,
      },
    });
    btcSeries.setData(chartData.btcData);

    chart.timeScale().fitContent();
    chartRef.current = chart;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const isMobileNow = window.innerWidth < 768;
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: isMobileNow ? 300 : 280,
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
  }, [chartData]);

  // Don't render for non-MSTR companies
  if (!isSupported || !chartData) {
    return null;
  }

  return (
    <div className={cn("bg-gray-50 dark:bg-gray-900 rounded-lg p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Capital Structure Timeline
          </h2>
          <p className="text-sm text-gray-500">
            BTC accumulation over {stats?.periods || 0} quarters (Q3 2020 - present)
          </p>
        </div>
        {stats && (
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">BTC Growth</p>
              <p className="text-lg font-bold text-orange-600">
                +{stats.btcGrowth.toFixed(0)}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      <div ref={chartContainerRef} className="w-full h-[280px] mb-4" />

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">BTC Holdings</p>
            <p className="text-lg font-bold text-orange-600 mt-1">
              {stats.currentBtc.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              +{stats.btcGrowth.toFixed(0)}% since Q3 2020
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Debt</p>
            <p className="text-lg font-bold text-red-600 mt-1">
              {formatLargeNumber(stats.currentDebt)}
            </p>
            {stats.debtGrowth > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">
                +{stats.debtGrowth.toFixed(0)}% since Q3 2020
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Preferred Equity</p>
            <p className="text-lg font-bold text-purple-600 mt-1">
              {stats.currentPref > 0 ? formatLargeNumber(stats.currentPref) : "-"}
            </p>
            {stats.currentPref > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">
                STRK, STRF, STRD, STRC, STRE
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Common Shares</p>
            <p className="text-lg font-bold text-blue-600 mt-1">
              {(stats.currentShares / 1e6).toFixed(0)}M
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              +{stats.shareGrowth.toFixed(0)}% dilution
            </p>
          </div>
        </div>
      )}

      {/* Source Attribution */}
      <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
        <span>Source: SEC XBRL filings (10-Q/10-K)</span>
        <a
          href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10&dateb=&owner=include&count=40"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          View filings
        </a>
      </div>
    </div>
  );
}
