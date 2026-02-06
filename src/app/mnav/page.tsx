"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi, LineSeries, Time } from "lightweight-charts";
import { MobileHeader } from "@/components/mobile-header";
import { useCompanies } from "@/lib/hooks/use-companies";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { enrichAllCompanies } from "@/lib/hooks/use-company-data";
import { useMNAVStats } from "@/lib/hooks/use-mnav-stats";
import { cn } from "@/lib/utils";
import { HOLDINGS_HISTORY } from "@/lib/data/holdings-history";
import { getQuarterlyYieldLeaderboard, getAvailableQuarters } from "@/lib/data/earnings-data";
import { MNAV_HISTORY } from "@/lib/data/mnav-history-calculated";

type TimeRange = "1d" | "7d" | "1mo" | "1y" | "all";

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

  // Always use mnavStats from props for consistency with the rest of the page
  const currentStats = mnavStats;

  // Generate historical data from pre-calculated MNAV_HISTORY
  const historicalData = useMemo(() => {
    const now = Date.now();
    const rangeMs: Record<TimeRange, number> = {
      "1d": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "1mo": 30 * 24 * 60 * 60 * 1000,
      "1y": 365 * 24 * 60 * 60 * 1000,
      "all": 10 * 365 * 24 * 60 * 60 * 1000, // 10 years
    };

    const cutoffDate = new Date(now - rangeMs[timeRange]);
    const result: { time: Time; median: number; average: number }[] = [];

    // Add historical snapshots from pre-calculated data
    for (const snapshot of MNAV_HISTORY) {
      const snapshotDate = new Date(snapshot.date);
      if (snapshotDate >= cutoffDate) {
        result.push({
          time: snapshot.date as Time,
          median: snapshot.median,
          average: snapshot.average,
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
  }, [currentStats, timeRange]);

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

    // Add Average first so Median appears on top in legend
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

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <p className="text-xs text-gray-400">
            <span className="text-green-500">Quarterly data ({historicalData.length - 1} historical + current)</span>
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

type AssetFilter = "ALL" | "BTC" | "ETH" | "SOL" | "HYPE" | "TAO" | "OTHER";

export default function MNAVPage() {
  const [timeRange1, setTimeRange1] = useState<TimeRange>("1y");
  const [selectedAsset, setSelectedAsset] = useState<AssetFilter>("ALL");

  const { data: prices } = usePricesStream();
  const { data: companiesData, isLoading } = useCompanies();

  const allCompanies = useMemo(() => {
    const baseCompanies = companiesData?.companies || [];
    return enrichAllCompanies(baseCompanies);
  }, [companiesData]);

  // Filter companies by selected asset
  const companies = useMemo(() => {
    if (selectedAsset === "ALL") return allCompanies;
    if (selectedAsset === "OTHER") {
      const mainAssets = ["BTC", "ETH", "SOL", "HYPE", "TAO"];
      return allCompanies.filter(c => !mainAssets.includes(c.asset));
    }
    return allCompanies.filter(c => c.asset === selectedAsset);
  }, [allCompanies, selectedAsset]);

  // Get available assets for filter tabs
  const availableAssets = useMemo(() => {
    const assetCounts: Record<string, number> = {};
    allCompanies.forEach(c => {
      assetCounts[c.asset] = (assetCounts[c.asset] || 0) + 1;
    });
    return assetCounts;
  }, [allCompanies]);

  // Separate treasuries from miners
  const treasuries = useMemo(() => companies.filter(c => !c.isMiner), [companies]);
  const miners = useMemo(() => companies.filter(c => c.isMiner), [companies]);

  // Use shared mNAV stats hook - treasuries only for mNAV stats
  const mnavStats = useMNAVStats(treasuries, prices);

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

  // Calculate quarterly yield statistics (filtered by selected asset)
  const yieldStats = useMemo(() => {
    const quarters = getAvailableQuarters();
    const currentQuarter = quarters[0];
    const allLeaderboard = getQuarterlyYieldLeaderboard({ quarter: currentQuarter });
    
    // Filter by selected asset's companies
    const tickerSet = new Set(companies.map(c => c.ticker));
    const leaderboard = allLeaderboard.filter(m => tickerSet.has(m.ticker));
    
    // Count companies without sufficient history data
    const companiesWithYieldData = new Set(leaderboard.map(m => m.ticker));
    const insufficientData = companies.filter(c => !companiesWithYieldData.has(c.ticker)).length;

    if (leaderboard.length === 0) {
      return { median: 0, average: 0, positiveCount: 0, totalCount: 0, quarter: currentQuarter, best: null, worst: null, insufficientData, totalCompanies: companies.length };
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
      insufficientData,
      totalCompanies: companies.length,
    };
  }, [companies]);

  // Calculate dilution statistics (filtered by selected asset)
  const dilutionStats = useMemo(() => {
    const tickerSet = new Set(companies.map(c => c.ticker));
    const dilutionRates: { ticker: string; rate: number }[] = [];
    const companiesWithData = new Set<string>();

    Object.entries(HOLDINGS_HISTORY).forEach(([ticker, data]) => {
      // Only include companies that match the selected asset filter
      if (!tickerSet.has(ticker)) return;
      
      const history = data.history;
      if (history.length < 2) return;

      // Get last two data points to calculate recent dilution
      const recent = history[history.length - 1];
      const previous = history[history.length - 2];

      if (previous.sharesOutstandingDiluted > 0) {
        const dilutionRate = ((recent.sharesOutstandingDiluted - previous.sharesOutstandingDiluted) / previous.sharesOutstandingDiluted) * 100;
        dilutionRates.push({ ticker, rate: dilutionRate });
        companiesWithData.add(ticker);
      }
    });

    const avgDilution = dilutionRates.length > 0
      ? dilutionRates.reduce((sum, d) => sum + d.rate, 0) / dilutionRates.length
      : 0;
    const highDilution = dilutionRates.filter((d) => d.rate > 10);
    const insufficientData = companies.filter(c => !companiesWithData.has(c.ticker)).length;

    return { avgDilution, highDilution, total: dilutionRates.length, insufficientData, totalCompanies: companies.length };
  }, [companies]);

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
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Sector Statistics
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm lg:text-base">
            Aggregate metrics across {companies.length} DAT companies ({treasuries.length} treasuries, {miners.length} miners)
          </p>
        </div>

        {/* Asset Filter Tabs */}
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedAsset("ALL")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              selectedAsset === "ALL"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            )}
          >
            All ({allCompanies.length})
          </button>
          {(["BTC", "ETH", "SOL", "HYPE", "TAO"] as const).map(asset => (
            availableAssets[asset] > 0 && (
              <button
                key={asset}
                onClick={() => setSelectedAsset(asset)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  selectedAsset === asset
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                {asset} ({availableAssets[asset]})
              </button>
            )
          ))}
          {Object.keys(availableAssets).filter(a => !["BTC", "ETH", "SOL", "HYPE", "TAO"].includes(a)).length > 0 && (
            <button
              onClick={() => setSelectedAsset("OTHER")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                selectedAsset === "OTHER"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              Other ({Object.entries(availableAssets).filter(([a]) => !["BTC", "ETH", "SOL", "HYPE", "TAO"].includes(a)).reduce((sum, [, c]) => sum + c, 0)})
            </button>
          )}
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
          <div className="flex items-baseline gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Treasury Yield ({yieldStats.quarter})
            </h2>
            {yieldStats.insufficientData > 0 && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                {yieldStats.insufficientData} of {yieldStats.totalCompanies} companies lack sufficient history
              </span>
            )}
          </div>
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
              {yieldStats.insufficientData > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  +{yieldStats.insufficientData} no data
                </p>
              )}
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
          <div className="flex items-baseline gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Share Dilution</h2>
            {dilutionStats.insufficientData > 0 && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                {dilutionStats.insufficientData} of {dilutionStats.totalCompanies} companies lack sufficient history
              </span>
            )}
          </div>
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
                {dilutionStats.highDilution.length}/{dilutionStats.total}
              </p>
              <p className="text-xs text-gray-500">companies</p>
              {dilutionStats.insufficientData > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  +{dilutionStats.insufficientData} no data
                </p>
              )}
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

        {/* mNAV Statistics - Treasuries Only */}
        <div className="mb-8">
          <div className="flex items-baseline gap-2 mb-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">mNAV Valuation</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Based on {mnavStats.count} of {treasuries.length} treasuries
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            {mnavStats.contributors.length > 0 && (
              <span>
                Included: {mnavStats.contributors.map(c => `${c.ticker} (${c.mnav.toFixed(2)}x)`).join(", ")}
              </span>
            )}
            {mnavStats.excluded.length > 0 && (
              <span className="text-amber-600 dark:text-amber-400 ml-2">
                • No data: {mnavStats.excluded.join(", ")}
              </span>
            )}
          </p>
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

        {/* mNAV Chart */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">mNAV History</h2>
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
          title="mNAV History"
        />

        {/* Legend */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Dashed line = Fair Value (1.0x mNAV)</p>
        </div>
      </main>
    </div>
  );
}
