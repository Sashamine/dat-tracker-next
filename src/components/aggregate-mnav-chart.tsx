"use client";

import { useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createChart, ColorType, IChartApi, LineSeries, Time } from "lightweight-charts";
import { cn } from "@/lib/utils";
import { Company } from "@/lib/types";
import { calculateMNAV } from "@/lib/calculations";

interface AggregateData {
  time: Time;
  median: number;
  average: number;
}

interface CryptoHistoryPoint {
  time: string;
  price: number;
}

interface StockHistoryPoint {
  time: string;
  close: number;
}

interface AggregateMNAVChartProps {
  companies: Company[];
  prices: {
    crypto: Record<string, { price: number }>;
    stocks: Record<string, { price: number; marketCap: number }>;
  };
  compact?: boolean;
  className?: string;
}

// Fetch BTC history as the main reference for crypto price changes
async function fetchBTCHistory(): Promise<CryptoHistoryPoint[]> {
  const response = await fetch("/api/crypto/btc/history?range=1y");
  if (!response.ok) return [];
  return response.json();
}

// Calculate median of array
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function AggregateMNAVChart({ companies, prices, compact = false, className }: AggregateMNAVChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Fetch BTC history for price ratio calculations
  const { data: btcHistory } = useQuery({
    queryKey: ["btcHistory", "1y"],
    queryFn: fetchBTCHistory,
    staleTime: 30 * 60 * 1000,
  });

  // Calculate current mNAV stats
  const currentStats = useMemo(() => {
    const mnavs = companies
      .map((company) => {
        const cryptoPrice = prices?.crypto[company.asset]?.price || 0;
        const stockData = prices?.stocks[company.ticker];
        const marketCap = stockData?.marketCap || company.marketCap || 0;
        return calculateMNAV(marketCap, company.holdings, cryptoPrice);
      })
      .filter((m): m is number => m !== null && m > 0 && m < 20);

    if (mnavs.length === 0) return { median: 0, average: 0 };

    return {
      median: median(mnavs),
      average: mnavs.reduce((a, b) => a + b, 0) / mnavs.length,
    };
  }, [companies, prices]);

  // Calculate historical aggregate mNAV using BTC as a proxy for all crypto
  // This is an approximation: we assume mNAV scales inversely with crypto price
  const historicalData = useMemo(() => {
    if (!btcHistory || btcHistory.length === 0 || !prices?.crypto?.BTC?.price) {
      return [];
    }

    const currentBTCPrice = prices.crypto.BTC.price;
    const result: AggregateData[] = [];

    // Sample every 7th point to reduce noise (weekly)
    for (let i = 0; i < btcHistory.length; i += 7) {
      const point = btcHistory[i];
      const historicalBTCPrice = point.price;

      // Price ratio: how much has BTC moved since this historical point
      const priceRatio = currentBTCPrice / historicalBTCPrice;

      // Approximate historical mNAV:
      // If crypto price was lower, mNAV would have been higher (and vice versa)
      // mNAV = MarketCap / (Holdings * CryptoPrice)
      // Assuming market cap scaled roughly with crypto, mNAV stays relatively stable
      // But we apply a dampening factor since stock prices don't move 1:1 with crypto
      const dampening = 0.5; // Stock prices move ~50% as much as crypto
      const adjustedRatio = 1 + (priceRatio - 1) * dampening;

      const historicalMedian = currentStats.median / adjustedRatio;
      const historicalAverage = currentStats.average / adjustedRatio;

      // Filter outliers
      if (historicalMedian > 0 && historicalMedian < 10 && historicalAverage > 0 && historicalAverage < 10) {
        result.push({
          time: point.time as Time,
          median: historicalMedian,
          average: historicalAverage,
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
  }, [btcHistory, prices, currentStats]);

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
      height: compact ? 120 : 200,
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
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
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
