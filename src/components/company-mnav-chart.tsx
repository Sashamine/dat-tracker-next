"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { createChart, ColorType, IChartApi, LineSeries, Time, ISeriesApi } from "lightweight-charts";
import { cn } from "@/lib/utils";
import { TimeRange, ChartInterval } from "@/lib/hooks/use-stock-history";
import { useMnavHistory, type MnavDataPoint, type MnavCompanyData } from "@/lib/hooks/use-mnav-history";
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
  // Company data for intraday mNAV calculation (MSTR only)
  companyData?: MnavCompanyData;
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
  companyData,
}: CompanyMNAVChartProps) {
  // Silence unused variable warnings - these props are kept for API compatibility
  void asset;
  void currentStockPrice;
  void currentCryptoPrice;

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<MnavDataPoint | null>(null);

  const isMstr = ticker.toUpperCase() === "MSTR";
  const hasCompanyData = !!companyData; // Can calculate intraday mNAV if we have company data
  const isIntraday = timeRange === "1d" || timeRange === "7d" || timeRange === "1mo";

  // Use the mNAV history hook - works for any company with companyData (not just MSTR)
  const { data: mnavData, isLoading: isLoadingMnav } = useMnavHistory(ticker, timeRange, interval, companyData);

  // Get mNAV history - use hook data for MSTR, pre-calculated for others
  const { mnavHistory, dataPoints } = useMemo(() => {
    const result: { time: Time; value: number }[] = [];
    const points: Map<string, MnavDataPoint> = new Map();
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    if (mnavData && mnavData.length > 0) {
      // Use data from hook (works for MSTR and companies with holdings history like 3189.T)
      for (const point of mnavData) {
        // For intraday data, time is a Unix timestamp string - convert to number
        // For daily data, time is YYYY-MM-DD string - keep as string
        const isTimestamp = /^\d+$/.test(point.time);
        result.push({
          time: (isTimestamp ? parseInt(point.time, 10) : point.time) as Time,
          value: point.mnav,
        });
        points.set(point.time, point);
      }
    } else if (!hasCompanyData) {
      // Fallback: use pre-calculated data for companies without companyData
      // Calculate start date for filtering based on time range
      let startDate: Date;
      switch (timeRange) {
        case "1d":
          startDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
          break;
        case "7d":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "1mo":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "1y":
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        case "all":
          startDate = new Date("2020-01-01");
          break;
        default:
          startDate = new Date("2020-01-01");
          break;
      }

      // Use pre-calculated data for other companies
      for (const snapshot of MNAV_HISTORY) {
        const snapshotDate = new Date(snapshot.date);
        if (snapshotDate < startDate) continue;

        const companyData = snapshot.companies.find((c) => c.ticker === ticker);
        if (companyData) {
          result.push({
            time: snapshot.date as Time,
            value: companyData.mnav,
          });
        }
      }
    }

    // Ensure chart endpoint matches headline mNAV (single source of truth)
    if (currentMNAV && result.length > 0) {
      if (isIntraday) {
        // For intraday: update the last point's value to match headline
        // This ensures the chart endpoint always equals the live mNAV
        result[result.length - 1] = {
          ...result[result.length - 1],
          value: currentMNAV,
        };
      } else {
        // For daily (1Y/ALL): add today's point with headline mNAV
        const lastPoint = result[result.length - 1];
        if (!lastPoint || lastPoint.time !== today) {
          result.push({ time: today as Time, value: currentMNAV });
        } else {
          // Update existing today point to match headline
          result[result.length - 1] = { ...lastPoint, value: currentMNAV };
        }
      }
    }

    return { mnavHistory: result, dataPoints: points };
  }, [ticker, timeRange, currentMNAV, hasCompanyData, mnavData, isIntraday]);

  const isLoading = isLoadingMnav;
  const hasData = mnavHistory.length > 0;

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
        secondsVisible: false,
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
    seriesRef.current = mnavSeries;

    chart.timeScale().fitContent();

    // Add crosshair move handler to show point info on hover
    chart.subscribeCrosshairMove((param) => {
      if (param.time) {
        const timeStr = String(param.time);
        const point = dataPoints.get(timeStr);
        setSelectedPoint(point || null);
      } else {
        setSelectedPoint(null);
      }
    });

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasData, mnavHistory, hasCompanyData, dataPoints]);

  // Calculate current and change stats
  const stats = useMemo(() => {
    if (mnavHistory.length < 2) return null;
    const current = mnavHistory[mnavHistory.length - 1].value;
    const first = mnavHistory[0].value;
    const change = ((current - first) / first) * 100;
    const min = Math.min(...mnavHistory.map((d) => d.value));
    const max = Math.max(...mnavHistory.map((d) => d.value));
    return { current, change, min, max };
  }, [mnavHistory]);

  // Format timestamp for display
  const formatTime = (time: string): string => {
    // If it's a unix timestamp (number-like string), format as datetime
    if (/^\d+$/.test(time)) {
      const date = new Date(parseInt(time) * 1000);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    // Otherwise it's a date string
    return time;
  };

  return (
    <div className={cn("bg-gray-50 dark:bg-gray-900 rounded-lg p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            mNAV History
            {hasCompanyData && (
              <span
                className={cn(
                  "ml-2 text-xs font-normal px-2 py-0.5 rounded",
                  isIntraday
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                    : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400"
                )}
              >
                {isIntraday ? "Live" : "Daily"}
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500">
            {hasCompanyData
              ? "Enterprise Value / Crypto NAV"
              : "Market Cap / Net Asset Value over time"}
          </p>
        </div>
        {stats && (
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Period</p>
              <p
                className={cn(
                  "text-lg font-bold",
                  stats.change >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {stats.change >= 0 ? "+" : ""}
                {stats.change.toFixed(1)}%
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
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading mNAV history...</span>
          </div>
        </div>
      ) : hasData ? (
        <>
          {/* Show note for companies without provenance data on short timeframes */}
          {!hasCompanyData && (timeRange === "1d" || timeRange === "7d") && (
            <div className="mb-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Daily data only. Select 1M or longer for smoother trends.</span>
            </div>
          )}
          <div ref={chartContainerRef} className="w-full h-[300px]" />

          {/* Point info panel for provenance companies - shows on hover */}
          {hasCompanyData && selectedPoint && (
            <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatTime(selectedPoint.time)}
                </span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedPoint.mnav.toFixed(2)}x
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-gray-600 dark:text-gray-400">
                <div>
                  <span className="text-gray-500">BTC Price:</span>{" "}
                  <span className="font-medium">${selectedPoint.btcPrice.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-500">MSTR:</span>{" "}
                  <span className="font-medium">${selectedPoint.stockPrice.toFixed(2)}</span>
                </div>
                {selectedPoint.btcHoldings && (
                  <div>
                    <span className="text-gray-500">BTC:</span>{" "}
                    <span className="font-medium">{selectedPoint.btcHoldings.toLocaleString()}</span>
                  </div>
                )}
                {selectedPoint.btcPerShare && (
                  <div>
                    <span className="text-gray-500">BTC/Share:</span>{" "}
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      {selectedPoint.btcPerShare.toFixed(6)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Default attribution for provenance companies when not hovering */}
          {hasCompanyData && !selectedPoint && (
            <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                {isIntraday
                  ? "Real-time mNAV from live prices. Hover for details."
                  : "Daily mNAV with fully diluted shares. Hover for details."}
              </span>
            </div>
          )}
        </>
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
