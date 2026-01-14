"use client";

import { useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createChart, ColorType, IChartApi, LineSeries, Time } from "lightweight-charts";
import { cn } from "@/lib/utils";
import { useStockHistory, TimeRange, ChartInterval } from "@/lib/hooks/use-stock-history";

interface CryptoHistoryPoint {
  time: string;
  price: number;
}

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

async function fetchCryptoHistory(symbol: string, range: TimeRange): Promise<CryptoHistoryPoint[]> {
  const response = await fetch(`/api/crypto/${symbol}/history?range=${range}`);
  if (!response.ok) return [];
  return response.json();
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
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Fetch stock history
  const { data: stockHistory, isLoading: stockLoading } = useStockHistory(ticker, timeRange, interval);

  // Fetch crypto history
  const { data: cryptoHistory, isLoading: cryptoLoading } = useQuery({
    queryKey: ["cryptoHistory", asset, timeRange],
    queryFn: () => fetchCryptoHistory(asset, timeRange),
    staleTime: 5 * 60 * 1000,
  });

  // Calculate mNAV history by anchoring to current mNAV and using price ratios
  // This avoids issues with historical shares outstanding changes
  const mnavHistory = useMemo(() => {
    if (!stockHistory || !cryptoHistory || stockHistory.length === 0 || cryptoHistory.length === 0) {
      return [];
    }
    if (!currentMNAV || !currentStockPrice || !currentCryptoPrice) {
      return [];
    }

    // Create a map of crypto prices by date and a sorted list of dates
    const cryptoPricesByDate = new Map<string, number>();
    const cryptoDates: string[] = [];
    for (const point of cryptoHistory) {
      cryptoPricesByDate.set(point.time, point.price);
      cryptoDates.push(point.time);
    }
    cryptoDates.sort();

    // Helper function to find the closest crypto price for a given date
    const findClosestCryptoPrice = (targetDate: string): number | null => {
      // Try exact match first
      const exactMatch = cryptoPricesByDate.get(targetDate);
      if (exactMatch) return exactMatch;

      // Binary search for closest date
      let left = 0;
      let right = cryptoDates.length - 1;

      while (left < right) {
        const mid = Math.floor((left + right) / 2);
        if (cryptoDates[mid] < targetDate) {
          left = mid + 1;
        } else {
          right = mid;
        }
      }

      // Find the closest date (could be left or left-1)
      let closestDate: string | null = null;
      if (left === 0) {
        closestDate = cryptoDates[0];
      } else if (left >= cryptoDates.length) {
        closestDate = cryptoDates[cryptoDates.length - 1];
      } else {
        const prevDate = cryptoDates[left - 1];
        const nextDate = cryptoDates[left];
        const targetTime = new Date(targetDate).getTime();
        const prevTime = new Date(prevDate).getTime();
        const nextTime = new Date(nextDate).getTime();

        // Choose the closer one (within 7 days tolerance)
        const prevDiff = Math.abs(targetTime - prevTime);
        const nextDiff = Math.abs(targetTime - nextTime);
        const maxDiff = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

        if (prevDiff <= nextDiff && prevDiff <= maxDiff) {
          closestDate = prevDate;
        } else if (nextDiff <= maxDiff) {
          closestDate = nextDate;
        }
      }

      return closestDate ? cryptoPricesByDate.get(closestDate) ?? null : null;
    };

    // Calculate mNAV for each stock data point using anchored approach:
    // Historical mNAV = Current mNAV × (Historical Stock / Current Stock) × (Current Crypto / Historical Crypto)
    const result: { time: Time; value: number }[] = [];

    for (const stockPoint of stockHistory) {
      // Extract date from stock time (could be Unix timestamp or YYYY-MM-DD)
      const isUnixTimestamp = /^\d+$/.test(stockPoint.time);
      let dateKey: string;
      let chartTime: Time;

      if (isUnixTimestamp) {
        const date = new Date(parseInt(stockPoint.time, 10) * 1000);
        dateKey = date.toISOString().split("T")[0];
        chartTime = parseInt(stockPoint.time, 10) as Time;
      } else {
        dateKey = stockPoint.time;
        chartTime = stockPoint.time as Time;
      }

      // Find matching or closest crypto price
      const historicalCryptoPrice = findClosestCryptoPrice(dateKey);
      if (!historicalCryptoPrice) continue;

      const historicalStockPrice = stockPoint.close;

      // Anchored mNAV calculation:
      // mNAV(t) = currentMNAV × (stockPrice(t) / currentStockPrice) × (currentCryptoPrice / cryptoPrice(t))
      const stockRatio = historicalStockPrice / currentStockPrice;
      const cryptoRatio = currentCryptoPrice / historicalCryptoPrice;
      const mnavValue = currentMNAV * stockRatio * cryptoRatio;

      if (mnavValue > 0 && mnavValue < 100) { // Filter outliers
        result.push({ time: chartTime, value: mnavValue });
      }
    }

    // Add the current real-time point so the chart ends at exact current mNAV
    if (result.length > 0 && currentMNAV !== null) {
      const lastPoint = result[result.length - 1];
      // Use same time format as existing data
      const lastTimeIsUnix = typeof lastPoint.time === 'number';
      if (lastTimeIsUnix) {
        const now = Math.floor(Date.now() / 1000) as Time;
        result.push({ time: now, value: currentMNAV });
      } else {
        // Use today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0] as Time;
        result.push({ time: today, value: currentMNAV });
      }
    }

    return result;
  }, [stockHistory, cryptoHistory, currentMNAV, currentStockPrice, currentCryptoPrice]);

  const isLoading = stockLoading || cryptoLoading;
  const hasData = mnavHistory.length > 0;

  // Initialize and update chart when data is available
  useEffect(() => {
    if (!chartContainerRef.current || !hasData) return;

    // Clean up existing chart
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
      height: 300,
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
