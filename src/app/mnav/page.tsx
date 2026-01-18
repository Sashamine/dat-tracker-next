"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { createChart, ColorType, IChartApi, LineSeries, Time } from "lightweight-charts";
import { MobileHeader } from "@/components/mobile-header";
import { useCompanies } from "@/lib/hooks/use-companies";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { useCompanyOverrides, mergeAllCompanies } from "@/lib/hooks/use-company-overrides";
import { calculateMNAV } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import { Company } from "@/lib/types";

type TimeRange = "1d" | "7d" | "1mo" | "1y" | "all";

interface CryptoHistoryPoint {
  time: string;
  price: number;
}

// Calculate median of array
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Fetch BTC history for a given time range
async function fetchBTCHistory(range: TimeRange): Promise<CryptoHistoryPoint[]> {
  const response = await fetch(`/api/crypto/btc/history?range=${range}`);
  if (!response.ok) return [];
  return response.json();
}

interface MNAVChartProps {
  companies: Company[];
  prices: any;
  timeRange: TimeRange;
  title: string;
  showMedian?: boolean;
  showAverage?: boolean;
}

function MNAVChart({ companies, prices, timeRange, title, showMedian = true, showAverage = true }: MNAVChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Fetch BTC history for the selected time range
  const { data: btcHistory, isLoading } = useQuery({
    queryKey: ["btcHistory", timeRange],
    queryFn: () => fetchBTCHistory(timeRange),
    staleTime: 5 * 60 * 1000,
  });

  // Calculate current mNAV stats (excluding pending merger SPACs)
  const currentStats = useMemo(() => {
    const mnavs = companies
      .filter((company) => !company.pendingMerger) // Exclude pre-merger SPACs
      .map((company) => {
        const cryptoPrice = prices?.crypto[company.asset]?.price || 0;
        const stockData = prices?.stocks[company.ticker];
        const marketCap = company.marketCap || stockData?.marketCap || 0;
        return calculateMNAV(marketCap, company.holdings, cryptoPrice, company.cashReserves || 0, company.otherInvestments || 0, company.totalDebt || 0, company.preferredEquity || 0);
      })
      .filter((m): m is number => m !== null && m > 0 && m < 20);

    if (mnavs.length === 0) return { median: 0, average: 0 };

    return {
      median: median(mnavs),
      average: mnavs.reduce((a, b) => a + b, 0) / mnavs.length,
    };
  }, [companies, prices]);

  // Check if time format is Unix timestamp (intraday) or date string
  const isIntraday = timeRange === "1d" || timeRange === "7d" || timeRange === "1mo";

  // Calculate historical aggregate mNAV
  const historicalData = useMemo(() => {
    if (!btcHistory || btcHistory.length === 0 || !prices?.crypto?.BTC?.price) {
      return [];
    }

    const currentBTCPrice = prices.crypto.BTC.price;
    const result: { time: Time; median: number; average: number }[] = [];

    // Sample interval based on time range (data is already sampled by API)
    const sampleInterval = timeRange === "1y" || timeRange === "all" ? 7 : 1;

    for (let i = 0; i < btcHistory.length; i += sampleInterval) {
      const point = btcHistory[i];
      const historicalBTCPrice = point.price;

      const priceRatio = currentBTCPrice / historicalBTCPrice;
      const dampening = 0.5;
      const adjustedRatio = 1 + (priceRatio - 1) * dampening;

      const historicalMedian = currentStats.median / adjustedRatio;
      const historicalAverage = currentStats.average / adjustedRatio;

      if (historicalMedian > 0 && historicalMedian < 10 && historicalAverage > 0 && historicalAverage < 10) {
        // Convert time format: if it's all digits, it's a Unix timestamp
        const timeValue = /^\d+$/.test(point.time) ? parseInt(point.time, 10) : point.time;
        result.push({
          time: timeValue as Time,
          median: historicalMedian,
          average: historicalAverage,
        });
      }
    }

    // Add current point with matching time format
    if (isIntraday) {
      const nowUnix = Math.floor(Date.now() / 1000);
      result.push({
        time: nowUnix as Time,
        median: currentStats.median,
        average: currentStats.average,
      });
    } else {
      const today = new Date().toISOString().split("T")[0] as Time;
      result.push({
        time: today,
        median: currentStats.median,
        average: currentStats.average,
      });
    }

    return result;
  }, [btcHistory, prices, currentStats, timeRange, isIntraday]);

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
      height: 250,
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: timeRange === "1d" || timeRange === "7d" || timeRange === "1mo",
        secondsVisible: false,
      },
    });

    if (showMedian) {
      const medianSeries = chart.addSeries(LineSeries, {
        color: "#6366f1",
        lineWidth: 2,
        title: "Median",
        priceFormat: {
          type: "custom",
          formatter: (price: number) => price.toFixed(2) + "x",
        },
      });
      medianSeries.setData(historicalData.map(d => ({ time: d.time, value: d.median })));
    }

    if (showAverage) {
      const averageSeries = chart.addSeries(LineSeries, {
        color: "#a855f7",
        lineWidth: 2,
        title: "Average",
        priceFormat: {
          type: "custom",
          formatter: (price: number) => price.toFixed(2) + "x",
        },
      });
      averageSeries.setData(historicalData.map(d => ({ time: d.time, value: d.average })));
    }

    // Fair value line at 1.0x
    const fairValueSeries = chart.addSeries(LineSeries, {
      color: "rgba(156, 163, 175, 0.5)",
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
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
  }, [historicalData, showMedian, showAverage, timeRange]);

  if (isLoading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>
        <div className="h-[250px] flex items-center justify-center text-gray-500">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <div className="flex gap-3 text-sm">
          {showMedian && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-indigo-500 rounded-full" />
              <span className="text-gray-600 dark:text-gray-400">
                {currentStats.median.toFixed(2)}x
              </span>
              <span className={cn("text-xs", change.median >= 0 ? "text-green-600" : "text-red-600")}>
                ({change.median >= 0 ? "+" : ""}{change.median.toFixed(1)}%)
              </span>
            </div>
          )}
          {showAverage && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-purple-500 rounded-full" />
              <span className="text-gray-600 dark:text-gray-400">
                {currentStats.average.toFixed(2)}x
              </span>
              <span className={cn("text-xs", change.average >= 0 ? "text-green-600" : "text-red-600")}>
                ({change.average >= 0 ? "+" : ""}{change.average.toFixed(1)}%)
              </span>
            </div>
          )}
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}

export default function MNAVPage() {
  const [timeRange1, setTimeRange1] = useState<TimeRange>("7d");
  const [timeRange2, setTimeRange2] = useState<TimeRange>("1y");

  const { data: prices } = usePricesStream();
  const { overrides } = useCompanyOverrides();
  const { data: companiesData, isLoading } = useCompanies();

  const companies = useMemo(() => {
    const baseCompanies = companiesData?.companies || [];
    return mergeAllCompanies(baseCompanies, overrides);
  }, [companiesData, overrides]);

  // Calculate current stats for the header (excluding pending merger SPACs)
  const currentStats = useMemo(() => {
    const mnavs = companies
      .filter((company) => !company.pendingMerger) // Exclude pre-merger SPACs
      .map((company) => {
        const cryptoPrice = prices?.crypto[company.asset]?.price || 0;
        const stockData = prices?.stocks[company.ticker];
        const marketCap = company.marketCap || stockData?.marketCap || 0;
        return calculateMNAV(marketCap, company.holdings, cryptoPrice, company.cashReserves || 0, company.otherInvestments || 0, company.totalDebt || 0, company.preferredEquity || 0);
      })
      .filter((m): m is number => m !== null && m > 0 && m < 20);

    if (mnavs.length === 0) return { median: 0, average: 0, count: 0 };

    return {
      median: median(mnavs),
      average: mnavs.reduce((a, b) => a + b, 0) / mnavs.length,
      count: mnavs.length,
    };
  }, [companies, prices]);

  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: "1d", label: "24H" },
    { value: "7d", label: "7D" },
    { value: "1mo", label: "1M" },
    { value: "1y", label: "1Y" },
    { value: "all", label: "ALL" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <MobileHeader title="mNAV Charts" showBack />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <MobileHeader title="mNAV Charts" showBack />

      <main className="px-4 py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto">
        {/* Current Stats Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Aggregate mNAV
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm lg:text-base">
            Market-wide valuation trends across {currentStats.count} DAT companies
          </p>
          <div className="flex gap-4 mt-4">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg px-4 py-3 lg:px-6 lg:py-4">
              <p className="text-xs lg:text-sm text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Median</p>
              <p className="text-2xl lg:text-3xl font-bold text-indigo-600">{currentStats.median.toFixed(2)}x</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg px-4 py-3 lg:px-6 lg:py-4">
              <p className="text-xs lg:text-sm text-purple-600 dark:text-purple-400 uppercase tracking-wide">Average</p>
              <p className="text-2xl lg:text-3xl font-bold text-purple-600">{currentStats.average.toFixed(2)}x</p>
            </div>
          </div>
        </div>

        {/* Charts - Side by side on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Chart 1 */}
          <div>
            <div className="flex gap-1 mb-3">
              {timeRangeOptions.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setTimeRange1(value)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-lg transition-colors",
                    timeRange1 === value
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <MNAVChart
              companies={companies}
              prices={prices}
              timeRange={timeRange1}
              title={`mNAV History (${timeRangeOptions.find(t => t.value === timeRange1)?.label})`}
            />
          </div>

          {/* Chart 2 */}
          <div>
            <div className="flex gap-1 mb-3">
              {timeRangeOptions.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setTimeRange2(value)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-lg transition-colors",
                    timeRange2 === value
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <MNAVChart
              companies={companies}
              prices={prices}
              timeRange={timeRange2}
              title={`mNAV History (${timeRangeOptions.find(t => t.value === timeRange2)?.label})`}
            />
          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Dashed line = Fair Value (1.0x mNAV)</p>
        </div>
      </main>
    </div>
  );
}
