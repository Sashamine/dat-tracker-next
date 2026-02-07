"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi, LineSeries, Time } from "lightweight-charts";
import { MobileHeader } from "@/components/mobile-header";
import { StatTooltip } from "@/components/stat-tooltip";
import { useCompanies } from "@/lib/hooks/use-companies";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { enrichAllCompanies } from "@/lib/hooks/use-company-data";
import { useMNAVStats } from "@/lib/hooks/use-mnav-stats";
import { cn } from "@/lib/utils";
import { HOLDINGS_HISTORY } from "@/lib/data/holdings-history";
import { getQuarterlyYieldLeaderboard, getAvailableQuarters, getHoldingsGrowthByPeriod } from "@/lib/data/earnings-data";
import { MNAV_HISTORY } from "@/lib/data/mnav-history-calculated";
import { HPSComparison } from "@/components/miners-comparison";

type TimeRange = "1d" | "7d" | "1mo" | "1y" | "all";
type MetricType = "median" | "average";
type GrowthPeriod = "30d" | "90d" | "1y" | "all";

interface MNAVChartProps {
  mnavStats: { median: number; average: number };
  currentBTCPrice: number;
  timeRange: TimeRange;
  metric: MetricType;
  title: string;
}

function MNAVChart({ mnavStats, currentBTCPrice, timeRange, metric, title }: MNAVChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [intradayData, setIntradayData] = useState<{ time: Time; value: number }[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const currentStats = mnavStats;
  const isMedian = metric === "median";
  const color = isMedian ? "#6366f1" : "#a855f7";

  // Disable intraday API for now - we don't have proper intraday stock prices
  // All timeframes will use MNAV_HISTORY weekly data + current live value
  useEffect(() => {
    setIntradayData(null);
    setIsLoading(false);
  }, [timeRange, isMedian]);

  // Generate historical data from pre-calculated MNAV_HISTORY
  const historicalData = useMemo(() => {
    const now = Date.now();
    
    // Define how many data points to show for each timeframe
    const pointsForRange: Record<TimeRange, number> = {
      "1d": 7,    // Show last week of data for context
      "7d": 10,   // Show ~2 weeks
      "1mo": 12,  // Show ~3 months of weekly data
      "1y": 52,   // Show full year
      "all": MNAV_HISTORY.length,
    };

    const targetPoints = pointsForRange[timeRange];
    let result: { time: Time; value: number }[] = [];

    // Get last N snapshots from MNAV_HISTORY
    const today = new Date().toISOString().split("T")[0];
    const startIdx = Math.max(0, MNAV_HISTORY.length - targetPoints);
    for (let i = startIdx; i < MNAV_HISTORY.length; i++) {
      const snapshot = MNAV_HISTORY[i];
      // Skip today's historical data - we'll use live value instead
      if (snapshot.date === today) continue;
      result.push({
        time: snapshot.date as Time,
        value: isMedian ? snapshot.median : snapshot.average,
      });
    }

    // Always add today's LIVE value (matches the card display)
    result.push({
      time: today as Time,
      value: isMedian ? currentStats.median : currentStats.average,
    });

    return result;
  }, [currentStats, timeRange, isMedian]);

  // Calculate change from start
  const change = useMemo(() => {
    if (historicalData.length < 2) return 0;
    const first = historicalData[0].value;
    const last = historicalData[historicalData.length - 1].value;
    return ((last - first) / first) * 100;
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

    // Single metric line
    const mainSeries = chart.addSeries(LineSeries, {
      color,
      lineWidth: 2,
      title: isMedian ? "Median" : "Average",
      priceFormat: {
        type: "custom",
        formatter: (price: number) => price.toFixed(2) + "x",
      },
    });
    mainSeries.setData(historicalData);

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
  }, [historicalData, metric, timeRange, color, isMedian]);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <p className="text-xs text-gray-400">
            <span className="text-green-500">
              {historicalData.length} data points
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: color }}
          />
          <span className="text-gray-600 dark:text-gray-400">
            {(isMedian ? currentStats.median : currentStats.average).toFixed(2)}x
          </span>
          <span className={cn("text-xs", change >= 0 ? "text-green-600" : "text-red-600")}>
            ({change >= 0 ? "+" : ""}{change.toFixed(1)}%)
          </span>
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}

type AssetFilter = "ALL" | "BTC" | "ETH" | "SOL" | "HYPE" | "TAO" | "OTHER";

export default function MNAVPage() {
  const [timeRange1, setTimeRange1] = useState<TimeRange>("1y");
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("median");
  const [selectedAsset, setSelectedAsset] = useState<AssetFilter>("ALL");
  const [growthPeriod, setGrowthPeriod] = useState<GrowthPeriod>("90d");
  
  // Collapsible section states - all default to collapsed
  const [showHPSGrowth, setShowHPSGrowth] = useState(false);
  const [showTreasuryHPS, setShowTreasuryHPS] = useState(false);
  const [showMinerHPS, setShowMinerHPS] = useState(false);
  const [showMNAV, setShowMNAV] = useState(false);
  const [showMNAVChart, setShowMNAVChart] = useState(false);

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

  // Calculate holdings growth statistics (filtered by selected asset and time period)
  const growthStats = useMemo(() => {
    // Convert growth period to days
    const daysMap: Record<GrowthPeriod, number | undefined> = {
      "30d": 30,
      "90d": 90,
      "1y": 365,
      "all": undefined,
    };
    const days = daysMap[growthPeriod];
    
    // Get asset filter for the API call
    const assetFilter = selectedAsset === "ALL" || selectedAsset === "OTHER" 
      ? undefined 
      : selectedAsset as "BTC" | "ETH" | "SOL" | "HYPE" | "TAO";
    
    // Get growth data with time period and asset filter
    let allGrowthData = getHoldingsGrowthByPeriod({ days, asset: assetFilter });
    
    // For "OTHER" filter, we need to filter after the fact
    if (selectedAsset === "OTHER") {
      const mainAssets = ["BTC", "ETH", "SOL", "HYPE", "TAO"];
      allGrowthData = allGrowthData.filter(m => !mainAssets.includes(m.asset));
    }
    
    // Filter by selected asset's TREASURY companies only (exclude miners)
    const tickerSet = new Set(treasuries.map(c => c.ticker));
    const leaderboard = allGrowthData.filter(m => tickerSet.has(m.ticker));
    
    // Count treasuries without sufficient history data
    const companiesWithData = new Set(leaderboard.map(m => m.ticker));
    const insufficientData = treasuries.filter(c => !companiesWithData.has(c.ticker)).length;
    const missingTickers = treasuries.filter(c => !companiesWithData.has(c.ticker)).map(c => c.ticker);

    if (leaderboard.length === 0) {
      return { median: 0, average: 0, positiveCount: 0, totalCount: 0, period: growthPeriod, best: null, worst: null, insufficientData, totalCompanies: treasuries.length, leaderboard: [], missingTickers };
    }

    const growths = leaderboard.map((m) => m.growthPct);
    const positiveCount = growths.filter((y) => y > 0).length;
    const sortedGrowths = [...growths].sort((a, b) => a - b);
    const mid = Math.floor(sortedGrowths.length / 2);
    const medianGrowth = sortedGrowths.length % 2 ? sortedGrowths[mid] : (sortedGrowths[mid - 1] + sortedGrowths[mid]) / 2;
    const avgGrowth = growths.reduce((a, b) => a + b, 0) / growths.length;

    return {
      median: medianGrowth,
      average: avgGrowth,
      positiveCount,
      totalCount: leaderboard.length,
      period: growthPeriod,
      best: leaderboard[0],
      worst: leaderboard[leaderboard.length - 1],
      insufficientData,
      totalCompanies: companies.length,
      leaderboard,  // Full sorted leaderboard for tooltip
      missingTickers,  // Companies without growth data
    };
  }, [treasuries, growthPeriod, selectedAsset]);

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

        {/* Holdings Growth Statistics */}
        <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowHPSGrowth(!showHPSGrowth)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              📊 Holdings Per Share Growth (Treasuries)
            </h2>
            <svg
              className={cn("w-5 h-5 text-gray-500 transition-transform", showHPSGrowth && "rotate-180")}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showHPSGrowth && (
          <div className="p-4 bg-white dark:bg-gray-950">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Summary Statistics
              </span>
              {growthStats.insufficientData > 0 && (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  {growthStats.insufficientData} of {growthStats.totalCompanies} lack history
                </span>
              )}
            </div>
            {/* Time Period Selector */}
            <div className="flex gap-1">
              {(["30d", "90d", "1y", "all"] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setGrowthPeriod(period)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded transition-colors",
                    growthPeriod === period
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                >
                  {period === "all" ? "ALL" : period.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <StatTooltip 
            title={`Holdings Per Share Growth (${growthPeriod === "all" ? "All Time" : growthPeriod.toUpperCase()})`}
            data={[
              ...growthStats.leaderboard.map(m => ({
                label: m.ticker,
                value: `${m.growthPct >= 0 ? '+' : ''}${m.growthPct.toFixed(1)}%`,
                subValue: `${m.daysCovered}d`
              })),
              ...growthStats.missingTickers.map(t => ({
                label: t,
                value: 'No data',
              }))
            ]}
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Median Growth</p>
                <p className={cn("text-xl font-bold", growthStats.median >= 0 ? "text-green-600" : "text-red-600")}>
                  {growthStats.median >= 0 ? "+" : ""}{growthStats.median.toFixed(1)}%
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Average Growth</p>
                <p className={cn("text-xl font-bold", growthStats.average >= 0 ? "text-green-600" : "text-red-600")}>
                  {growthStats.average >= 0 ? "+" : ""}{growthStats.average.toFixed(1)}%
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Positive Growth</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {growthStats.positiveCount}/{growthStats.totalCount}
                </p>
                <p className="text-xs text-gray-500">
                  {growthStats.totalCount > 0 ? ((growthStats.positiveCount / growthStats.totalCount) * 100).toFixed(0) : 0}% of companies
                </p>
                {growthStats.insufficientData > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    +{growthStats.insufficientData} no data
                  </p>
                )}
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Best / Worst</p>
                {growthStats.best && growthStats.worst && (
                  <div className="text-sm">
                    <p className="text-green-600 font-medium">{growthStats.best.ticker} +{growthStats.best.growthPct.toFixed(0)}%</p>
                    <p className="text-red-600 font-medium">{growthStats.worst.ticker} {growthStats.worst.growthPct.toFixed(0)}%</p>
                  </div>
                )}
              </div>
            </div>
          </StatTooltip>
          </div>
          )}
        </div>

        {/* HPS Growth Comparison Tables */}
        <div className="mb-8 space-y-4">
          {/* Treasury HPS Growth Table */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowTreasuryHPS(!showTreasuryHPS)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <span>🏦</span> Treasury HPS Leaderboard
              </h3>
              <svg
                className={cn("w-5 h-5 text-gray-500 transition-transform", showTreasuryHPS && "rotate-180")}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showTreasuryHPS && (
              <div className="p-4 bg-white dark:bg-gray-950">
                <HPSComparison companies={allCompanies} prices={prices} type="treasuries" />
              </div>
            )}
          </div>

          {/* Miner HPS Growth Table */}
          {miners.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowMinerHPS(!showMinerHPS)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <span>⛏️</span> Miner HPS Leaderboard
                </h3>
                <svg
                  className={cn("w-5 h-5 text-gray-500 transition-transform", showMinerHPS && "rotate-180")}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showMinerHPS && (
                <div className="p-4 bg-white dark:bg-gray-950">
                  <HPSComparison companies={allCompanies} prices={prices} type="miners" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* mNAV Statistics - Treasuries Only */}
        <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowMNAV(!showMNAV)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              💰 mNAV Valuation
            </h2>
            <svg
              className={cn("w-5 h-5 text-gray-500 transition-transform", showMNAV && "rotate-180")}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showMNAV && (
          <div className="p-4 bg-white dark:bg-gray-950">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Based on {mnavStats.count} of {treasuries.length} treasuries.
              {mnavStats.contributors.length > 0 && (
                <span className="ml-1">
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
          )}
        </div>

        {/* mNAV Chart */}
        <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowMNAVChart(!showMNAVChart)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              📈 mNAV History Chart
            </h2>
            <svg
              className={cn("w-5 h-5 text-gray-500 transition-transform", showMNAVChart && "rotate-180")}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showMNAVChart && (
          <div className="p-4 bg-white dark:bg-gray-950">
            <div className="flex items-center justify-between mb-3">
              {/* Time range buttons */}
              <div className="flex gap-1">
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
              {/* Metric toggle */}
              <div className="flex gap-1">
                <button
                  onClick={() => setSelectedMetric("median")}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-lg transition-colors",
                    selectedMetric === "median"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                >
                  Median
                </button>
                <button
                  onClick={() => setSelectedMetric("average")}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-lg transition-colors",
                    selectedMetric === "average"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                >
                  Average
                </button>
              </div>
            </div>
            <MNAVChart
              mnavStats={mnavStats}
              currentBTCPrice={prices?.crypto?.BTC?.price || 0}
              timeRange={timeRange1}
              metric={selectedMetric}
              title="mNAV History"
            />
            {/* Legend */}
            <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
              <p>Dashed line = Fair Value (1.0x mNAV)</p>
            </div>
          </div>
          )}
        </div>
      </main>
    </div>
  );
}
