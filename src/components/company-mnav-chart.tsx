"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { createChart, ColorType, IChartApi, LineSeries, Time } from "lightweight-charts";
import { cn } from "@/lib/utils";
import { TimeRange, ChartInterval } from "@/lib/hooks/use-stock-history";
import { MNAV_HISTORY } from "@/lib/data/mnav-history-calculated";
import { MSTR_MNAV_HISTORY, type AuditedMNAVSnapshot } from "@/lib/data/mstr-mnav-history";

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
  const [selectedSnapshot, setSelectedSnapshot] = useState<AuditedMNAVSnapshot | null>(null);

  // Check if this is MSTR (use auditable data)
  const isMstr = ticker.toUpperCase() === "MSTR";

  // Get mNAV history - use auditable data for MSTR, pre-calculated for others
  const { mnavHistory, auditableSnapshots } = useMemo(() => {
    const result: { time: Time; value: number }[] = [];
    const snapshots: Map<string, AuditedMNAVSnapshot> = new Map();
    const now = new Date();
    const today = now.toISOString().split('T')[0];

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

    if (isMstr) {
      // Use auditable MSTR data
      for (const snapshot of MSTR_MNAV_HISTORY) {
        const snapshotDate = new Date(snapshot.date);
        if (snapshotDate < startDate) continue;

        result.push({
          time: snapshot.date as Time,
          value: snapshot.mnav,
        });
        snapshots.set(snapshot.date, snapshot);
      }
    } else {
      // Use pre-calculated data for other companies
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
    }

    // Always add current mNAV as the latest point if available
    if (currentMNAV) {
      // Only add if we don't already have a point for today
      const lastPoint = result[result.length - 1];
      if (!lastPoint || lastPoint.time !== today) {
        result.push({ time: today as Time, value: currentMNAV });
      }
    }

    return { mnavHistory: result, auditableSnapshots: snapshots };
  }, [ticker, timeRange, currentMNAV, isMstr]);

  const isLoading = false;
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

    // Add crosshair move handler for MSTR to show audit info
    if (isMstr) {
      chart.subscribeCrosshairMove((param) => {
        if (param.time) {
          const dateStr = param.time as string;
          const snapshot = auditableSnapshots.get(dateStr);
          setSelectedSnapshot(snapshot || null);
        } else {
          setSelectedSnapshot(null);
        }
      });
    }

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
  }, [hasData, mnavHistory, isMstr, auditableSnapshots]);

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
            {isMstr && (
              <span className="ml-2 text-xs font-normal px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                Audited
              </span>
            )}
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
        <>
          <div ref={chartContainerRef} className="w-full h-[300px]" />

          {/* Audit info panel for MSTR - shows on hover */}
          {isMstr && selectedSnapshot && (
            <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {selectedSnapshot.date}
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-medium",
                  selectedSnapshot.confidence === "high"
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                    : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                )}>
                  {selectedSnapshot.methodology.toUpperCase()} ({selectedSnapshot.confidence})
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-gray-600 dark:text-gray-400">
                <div>
                  <span className="text-gray-500">BTC:</span>{" "}
                  <span className="font-medium">{selectedSnapshot.btcHoldings.value.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-500">Shares:</span>{" "}
                  <span className="font-medium">{(selectedSnapshot.sharesOutstanding.value / 1e6).toFixed(1)}M</span>
                </div>
                <div>
                  <span className="text-gray-500">Debt:</span>{" "}
                  <span className="font-medium">${(selectedSnapshot.totalDebt.value / 1e9).toFixed(1)}B</span>
                </div>
                <div>
                  <span className="text-gray-500">mNAV:</span>{" "}
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedSnapshot.mnav.toFixed(2)}x</span>
                </div>
              </div>
              <div className="mt-2 text-gray-500">
                Source: {selectedSnapshot.btcHoldings.source}
              </div>
            </div>
          )}

          {/* Default audit attribution for MSTR when not hovering */}
          {isMstr && !selectedSnapshot && (
            <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Data sourced from SEC XBRL filings + 8-K events. Hover for details.</span>
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
