"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { createChart, ColorType, IChartApi, LineSeries, Time } from "lightweight-charts";
import { MobileHeader } from "@/components/mobile-header";
import { useCompanies } from "@/lib/hooks/use-companies";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { useCompanyOverrides, mergeAllCompanies } from "@/lib/hooks/use-company-overrides";
import { useMNAVStats } from "@/lib/hooks/use-mnav-stats";
import { cn } from "@/lib/utils";
import { Company } from "@/lib/types";
import { HOLDINGS_HISTORY } from "@/lib/data/holdings-history";
import { getQuarterlyYieldLeaderboard, getAvailableQuarters } from "@/lib/data/earnings-data";

type TimeRange = "1d" | "7d" | "1mo" | "1y" | "all";



// Fetch mNAV history from API
interface MNAVHistoryResponse {
  current: {
    timestamp: string;
    median: number;
    average: number;
    btcPrice: number;
  } | null;
  history: {
    timestamp: string;
    median: number;
    average: number;
    btcPrice: number;
  }[];
  historyCount: number;
}

async function fetchMNAVHistory(): Promise<MNAVHistoryResponse> {
  const response = await fetch("/api/mnav-history");
  if (!response.ok) return { current: null, history: [], historyCount: 0 };
  return response.json();
}

// Fetch BTC history for estimation fallback
interface CryptoHistoryPoint {
  time: string;
  price: number;
}

async function fetchBTCHistory(range: TimeRange): Promise<CryptoHistoryPoint[]> {
  const response = await fetch(`/api/crypto/btc/history?range=${range}`);
  if (!response.ok) return [];
  return response.json();
}

interface MNAVChartProps {
  mnavStats: { median: number; average: number };
  currentBTCPrice: number;
  timeRange: TimeRange;
  title: string;
  showMedian?: boolean;
  showAverage?: boolean;
}

function MNAVChart({ mnavStats, currentBTCPrice, timeRange, title, showMedian = true, showAverage = true }: MNAVChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Fetch real mNAV history from API
  const { data: mnavHistoryData, isLoading: isLoadingMNAV } = useQuery({
    queryKey: ["mnavHistory"],
    queryFn: fetchMNAVHistory,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Fetch BTC history for estimation fallback
  const { data: btcHistory, isLoading: isLoadingBTC } = useQuery({
    queryKey: ["btcHistory", timeRange],
    queryFn: () => fetchBTCHistory(timeRange),
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = isLoadingMNAV || isLoadingBTC;

  // Use stats from parent (single source of truth)
  const currentStats = mnavStats;

  // Determine if we have enough real data for the selected time range
  const realDataForRange = useMemo(() => {
    if (!mnavHistoryData?.history || mnavHistoryData.history.length === 0) {
      return [];
    }

    const now = Date.now();
    const rangeMs: Record<TimeRange, number> = {
      "1d": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "1mo": 30 * 24 * 60 * 60 * 1000,
      "1y": 365 * 24 * 60 * 60 * 1000,
      "all": Infinity,
    };

    const cutoff = now - rangeMs[timeRange];

    return mnavHistoryData.history
      .filter(point => new Date(point.timestamp).getTime() >= cutoff)
      .map(point => ({
        time: Math.floor(new Date(point.timestamp).getTime() / 1000) as Time,
        median: point.median,
        average: point.average,
      }))
      .filter(point => point.median > 0 && point.median < 10 && point.average > 0 && point.average < 10);
  }, [mnavHistoryData, timeRange]);

  // Use real data if we have enough points (5+), otherwise fall back to estimation
  const MIN_REAL_DATA_POINTS = 5;
  const useRealData = realDataForRange.length >= MIN_REAL_DATA_POINTS;

  // Generate historical data - real or estimated
  const historicalData = useMemo(() => {
    // If we have enough real data, use it
    if (useRealData) {
      const result = [...realDataForRange];
      // Add current point from live stats
      const nowUnix = Math.floor(Date.now() / 1000) as Time;
      result.push({
        time: nowUnix,
        median: currentStats.median,
        average: currentStats.average,
      });
      return result;
    }

    // Fall back to estimation from BTC price changes
    if (!btcHistory || btcHistory.length === 0 || !currentBTCPrice) {
      return [];
    }

    const result: { time: Time; median: number; average: number }[] = [];
    const sampleInterval = timeRange === "1y" || timeRange === "all" ? 7 : 1;

    for (let i = 0; i < btcHistory.length; i += sampleInterval) {
      const point = btcHistory[i];
      const historicalBTCPrice = point.price;

      // Estimate historical mNAV based on BTC price ratio with dampening
      const priceRatio = currentBTCPrice / historicalBTCPrice;
      const dampening = 0.5;
      const adjustedRatio = 1 + (priceRatio - 1) * dampening;

      const historicalMedian = currentStats.median / adjustedRatio;
      const historicalAverage = currentStats.average / adjustedRatio;

      if (historicalMedian > 0 && historicalMedian < 10 && historicalAverage > 0 && historicalAverage < 10) {
        const timeValue = /^\d+$/.test(point.time) ? parseInt(point.time, 10) : point.time;
        result.push({
          time: timeValue as Time,
          median: historicalMedian,
          average: historicalAverage,
        });
      }
    }

    // Add current point
    const isIntraday = timeRange === "1d" || timeRange === "7d" || timeRange === "1mo";
    if (isIntraday) {
      const nowUnix = Math.floor(Date.now() / 1000) as Time;
      result.push({
        time: nowUnix,
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
  }, [useRealData, realDataForRange, btcHistory, currentBTCPrice, currentStats, timeRange]);

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
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <p className="text-xs text-gray-400">
            {useRealData ? (
              <span className="text-green-500">Live data ({realDataForRange.length} snapshots)</span>
            ) : (
              <span className="text-amber-500">Estimated from BTC price</span>
            )}
          </p>
        </div>
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

  // Use shared mNAV stats hook - single source of truth
  const mnavStats = useMNAVStats(companies, prices);

  // Calculate holdings statistics
  const holdingsStats = useMemo(() => {
    const byAsset: Record<string, { total: number; companies: { ticker: string; holdings: number }[] }> = {};

    companies.forEach((company) => {
      if (company.holdings > 0) {
        if (!byAsset[company.asset]) {
          byAsset[company.asset] = { total: 0, companies: [] };
        }
        byAsset[company.asset].total += company.holdings;
        byAsset[company.asset].companies.push({ ticker: company.ticker, holdings: company.holdings });
      }
    });

    // Sort each asset's companies by holdings descending
    Object.values(byAsset).forEach((assetData) => {
      assetData.companies.sort((a, b) => b.holdings - a.holdings);
    });

    // Calculate concentration (top 5 as % of total) for each asset
    const concentration: Record<string, number> = {};
    Object.keys(byAsset).forEach((asset) => {
      const { total, companies: assetCompanies } = byAsset[asset];
      if (total > 0) {
        const top5Holdings = assetCompanies.slice(0, 5).reduce((sum, c) => sum + c.holdings, 0);
        concentration[asset] = (top5Holdings / total) * 100;
      } else {
        concentration[asset] = 0;
      }
    });

    // Get sorted list of assets by total holdings
    const sortedAssets = Object.keys(byAsset).sort((a, b) => byAsset[b].total - byAsset[a].total);

    return { byAsset, concentration, sortedAssets };
  }, [companies]);

  // Calculate company counts by asset
  const companyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    companies.forEach((company) => {
      counts[company.asset] = (counts[company.asset] || 0) + 1;
    });
    return counts;
  }, [companies]);

  // Calculate quarterly yield statistics
  const yieldStats = useMemo(() => {
    const quarters = getAvailableQuarters();
    const currentQuarter = quarters[0];
    const leaderboard = getQuarterlyYieldLeaderboard({ quarter: currentQuarter });

    if (leaderboard.length === 0) {
      return { median: 0, average: 0, positiveCount: 0, totalCount: 0, quarter: currentQuarter, best: null, worst: null };
    }

    const yields = leaderboard.map((m) => m.growthPct);
    const positiveCount = yields.filter((y) => y > 0).length;
    const sortedYields = [...yields].sort((a, b) => a - b);
    const mid = Math.floor(sortedYields.length / 2);
    const medianYield = sortedYields.length % 2 ? sortedYields[mid] : (sortedYields[mid - 1] + sortedYields[mid]) / 2;
    const avgYield = yields.reduce((a, b) => a + b, 0) / yields.length;

    return {
      median: medianYield,
      average: avgYield,
      positiveCount,
      totalCount: leaderboard.length,
      quarter: currentQuarter,
      best: leaderboard[0],
      worst: leaderboard[leaderboard.length - 1],
    };
  }, []);

  // Calculate dilution statistics
  const dilutionStats = useMemo(() => {
    const dilutionRates: { ticker: string; rate: number }[] = [];

    Object.entries(HOLDINGS_HISTORY).forEach(([ticker, data]) => {
      const history = data.history;
      if (history.length < 2) return;

      // Get last two data points to calculate recent dilution
      const recent = history[history.length - 1];
      const previous = history[history.length - 2];

      if (previous.sharesOutstanding > 0) {
        const dilutionRate = ((recent.sharesOutstanding - previous.sharesOutstanding) / previous.sharesOutstanding) * 100;
        dilutionRates.push({ ticker, rate: dilutionRate });
      }
    });

    const avgDilution = dilutionRates.length > 0
      ? dilutionRates.reduce((sum, d) => sum + d.rate, 0) / dilutionRates.length
      : 0;
    const highDilution = dilutionRates.filter((d) => d.rate > 10);

    return { avgDilution, highDilution, total: dilutionRates.length };
  }, []);

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
        <MobileHeader title="Sector Statistics" showBack />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <MobileHeader title="Sector Statistics" showBack />

      <main className="px-4 py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Sector Statistics
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm lg:text-base">
            Aggregate metrics across {companies.length} DAT companies
          </p>
        </div>

        {/* Holdings Statistics */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Total Holdings</h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {holdingsStats.sortedAssets.slice(0, 5).map((asset) => (
              <div key={asset} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{asset}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {holdingsStats.byAsset[asset].total.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {companyCounts[asset] || 0} companies
                </p>
                {holdingsStats.concentration[asset] > 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Top 5: {holdingsStats.concentration[asset].toFixed(0)}%
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quarterly Yield Statistics */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Treasury Yield ({yieldStats.quarter})
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Median Yield</p>
              <p className={cn("text-xl font-bold", yieldStats.median >= 0 ? "text-green-600" : "text-red-600")}>
                {yieldStats.median >= 0 ? "+" : ""}{yieldStats.median.toFixed(1)}%
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Average Yield</p>
              <p className={cn("text-xl font-bold", yieldStats.average >= 0 ? "text-green-600" : "text-red-600")}>
                {yieldStats.average >= 0 ? "+" : ""}{yieldStats.average.toFixed(1)}%
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Positive Yield</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {yieldStats.positiveCount}/{yieldStats.totalCount}
              </p>
              <p className="text-xs text-gray-500">
                {yieldStats.totalCount > 0 ? ((yieldStats.positiveCount / yieldStats.totalCount) * 100).toFixed(0) : 0}% of companies
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Best / Worst</p>
              {yieldStats.best && yieldStats.worst && (
                <div className="text-sm">
                  <p className="text-green-600 font-medium">{yieldStats.best.ticker} +{yieldStats.best.growthPct.toFixed(0)}%</p>
                  <p className="text-red-600 font-medium">{yieldStats.worst.ticker} {yieldStats.worst.growthPct.toFixed(0)}%</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dilution Statistics */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Share Dilution</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Avg Dilution Rate</p>
              <p className={cn("text-xl font-bold", dilutionStats.avgDilution > 5 ? "text-red-600" : "text-gray-900 dark:text-gray-100")}>
                {dilutionStats.avgDilution >= 0 ? "+" : ""}{dilutionStats.avgDilution.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">per filing period</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">High Dilution ({">"}10%)</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {dilutionStats.highDilution.length}
              </p>
              <p className="text-xs text-gray-500">companies</p>
            </div>
            {dilutionStats.highDilution.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 col-span-2 lg:col-span-1">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">High Dilution List</p>
                <div className="text-sm text-red-600 space-y-0.5">
                  {dilutionStats.highDilution.slice(0, 5).map((d) => (
                    <p key={d.ticker}>{d.ticker}: +{d.rate.toFixed(0)}%</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* mNAV Statistics */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">mNAV Valuation</h2>
          <div className="flex gap-4">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg px-4 py-3 lg:px-6 lg:py-4">
              <p className="text-xs lg:text-sm text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Median</p>
              <p className="text-2xl lg:text-3xl font-bold text-indigo-600">{mnavStats.median.toFixed(2)}x</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg px-4 py-3 lg:px-6 lg:py-4">
              <p className="text-xs lg:text-sm text-purple-600 dark:text-purple-400 uppercase tracking-wide">Average</p>
              <p className="text-2xl lg:text-3xl font-bold text-purple-600">{mnavStats.average.toFixed(2)}x</p>
            </div>
          </div>
        </div>

        {/* mNAV Charts */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">mNAV History</h2>
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
              mnavStats={mnavStats}
              currentBTCPrice={prices?.crypto?.BTC?.price || 0}
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
              mnavStats={mnavStats}
              currentBTCPrice={prices?.crypto?.BTC?.price || 0}
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
