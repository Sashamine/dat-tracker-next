"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { createChart, ColorType, IChartApi, LineSeries, Time } from "lightweight-charts";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { useCompanies } from "@/lib/hooks/use-companies";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { enrichAllCompanies } from "@/lib/hooks/use-company-data";
import { useD1Fundamentals } from "@/lib/hooks/use-d1-fundamentals";
import { applyD1Overlay } from "@/lib/d1-overlay";
import { getCompanyMNAV } from "@/lib/math/mnav-engine";
import { useMNAVStats } from "@/lib/hooks/use-mnav-stats";
import { getCompanyAhpsMetrics, type AhpsHistoryEntry } from "@/lib/utils/ahps";
import { getMarketCapForMnavSync } from "@/lib/utils/market-cap";
import { getHoldingsGrowthByPeriod } from "@/lib/data/earnings-data";
import { MNAV_HISTORY } from "@/lib/data/mnav-history-calculated";
import { cn } from "@/lib/utils";
import { TreasuryYieldLeaderboard } from "@/components/earnings/treasury-yield-leaderboard";
import { EarningsCalendar } from "@/components/earnings/earnings-calendar";
import { Button } from "@/components/ui/button";
import type { Asset, CalendarQuarter } from "@/lib/types";

type HpsGrowthApiSnapshot = {
  date: string;
  holdings: number;
  sharesOutstanding: number;
  holdingsPerShare: number;
};

type HpsGrowthApiRow = {
  ticker: string;
  currentSnapshot: HpsGrowthApiSnapshot;
  snapshot30d: HpsGrowthApiSnapshot | null;
  snapshot90d: HpsGrowthApiSnapshot | null;
  snapshot1y: HpsGrowthApiSnapshot | null;
  history: HpsGrowthApiSnapshot[];
};

type ChartPoint = {
  id: string;
  ticker: string;
  name: string;
  asset: string;
  treasuryValue: number;
  marketCap: number;
  currentHps: number | null;
  ahpsGrowth90d: number | null;
  mNAV: number | null;
};

type AssetFilter = "ALL" | "BTC" | "ETH" | "SOL" | "HYPE" | "TAO" | "OTHER";
type TimeRange = "1d" | "7d" | "1mo" | "1y" | "all";
type MetricType = "median" | "average";
type GrowthPeriod = "30d" | "90d" | "1y" | "all";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const assetDotColors: Record<string, string> = {
  BTC: "bg-orange-500 border-orange-600",
  ETH: "bg-indigo-500 border-indigo-600",
  SOL: "bg-purple-500 border-purple-600",
  HYPE: "bg-green-500 border-green-600",
  BNB: "bg-yellow-500 border-yellow-600",
  TAO: "bg-cyan-500 border-cyan-600",
  LINK: "bg-blue-500 border-blue-600",
  TRX: "bg-red-500 border-red-600",
  XRP: "bg-gray-500 border-gray-600",
  ZEC: "bg-amber-500 border-amber-600",
  LTC: "bg-slate-500 border-slate-600",
  SUI: "bg-sky-500 border-sky-600",
  DOGE: "bg-amber-500 border-amber-600",
  AVAX: "bg-rose-500 border-rose-600",
  ADA: "bg-blue-500 border-blue-600",
  HBAR: "bg-gray-500 border-gray-600",
  MULTI: "bg-pink-500 border-pink-600",
};

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: "1d", label: "24H" },
  { value: "7d", label: "7D" },
  { value: "1mo", label: "1M" },
  { value: "1y", label: "1Y" },
  { value: "all", label: "ALL" },
];

function formatCompactUsd(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatHps(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value <= 0) return "—";
  if (value >= 100) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (value >= 1) return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  if (value >= 0.01) return value.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 4 });
  return value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

function formatSignedPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function ScatterCard({
  title,
  subtitle,
  xLabel,
  yLabel,
  points,
  xAccessor,
  yAccessor,
  sizeAccessor,
  onSelect,
}: {
  title: string;
  subtitle: string;
  xLabel: string;
  yLabel: string;
  points: ChartPoint[];
  xAccessor: (point: ChartPoint) => number | null;
  yAccessor: (point: ChartPoint) => number | null;
  sizeAccessor: (point: ChartPoint) => number;
  onSelect: (ticker: string) => void;
}) {
  const filtered = points.filter((point) => xAccessor(point) !== null && yAccessor(point) !== null) as ChartPoint[];
  const maxX = Math.max(1, ...filtered.map((point) => xAccessor(point) ?? 0));
  const minY = Math.min(0, ...filtered.map((point) => yAccessor(point) ?? 0));
  const maxY = Math.max(0, ...filtered.map((point) => yAccessor(point) ?? 0));
  const yPadding = Math.max(1, (maxY - minY) * 0.12 || 1);
  const chartMinY = minY - yPadding;
  const chartMaxY = maxY + yPadding;
  const yRange = Math.max(1, chartMaxY - chartMinY);
  const maxSize = Math.max(1, ...filtered.map((point) => sizeAccessor(point)));
  const labelTickers = new Set(
    [...filtered]
      .sort((a, b) => sizeAccessor(b) - sizeAccessor(a))
      .slice(0, 8)
      .map((point) => point.ticker)
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
      </div>
      <div className="relative h-[320px] overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 sm:h-[380px]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-1/4 border-t border-dashed border-gray-200 dark:border-gray-700" />
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-gray-200 dark:border-gray-700" />
          <div className="absolute inset-x-0 top-3/4 border-t border-dashed border-gray-200 dark:border-gray-700" />
          <div className="absolute inset-y-0 left-1/4 border-l border-dashed border-gray-200 dark:border-gray-700" />
          <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-gray-200 dark:border-gray-700" />
          <div className="absolute inset-y-0 left-3/4 border-l border-dashed border-gray-200 dark:border-gray-700" />
        </div>
        <div className="absolute inset-0 px-4 pb-10 pt-6 sm:px-8 sm:pb-12">
          {filtered.map((point) => {
            const x = ((xAccessor(point) ?? 0) / maxX) * 100;
            const y = 100 - (((yAccessor(point) ?? 0) - chartMinY) / yRange) * 100;
            const radius = 8 + Math.log10(Math.max(1, sizeAccessor(point))) / Math.log10(Math.max(10, maxSize)) * 14;
            return (
              <button
                key={point.id}
                type="button"
                className="group absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: `${y}%` }}
                onClick={() => onSelect(point.ticker)}
              >
                <span
                  className={cn(
                    "block rounded-full border-2 shadow-sm transition-transform duration-150 group-hover:scale-110",
                    assetDotColors[point.asset] || assetDotColors.BTC
                  )}
                  style={{ width: `${radius}px`, height: `${radius}px` }}
                />
                {labelTickers.has(point.ticker) && (
                  <span className="pointer-events-none absolute left-1/2 top-full mt-1 hidden -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-gray-700 dark:text-gray-200 sm:block">
                    {point.ticker}
                  </span>
                )}
                <span className="pointer-events-none absolute left-1/2 top-0 z-10 hidden w-48 -translate-x-1/2 -translate-y-[110%] rounded-lg border border-gray-200 bg-white/95 p-3 text-left shadow-lg group-hover:block dark:border-gray-700 dark:bg-gray-950/95">
                  <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">{point.name}</span>
                  <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{point.ticker}</span>
                  <span className="mt-2 block text-xs text-gray-500 dark:text-gray-400">Treasury {formatCompactUsd(point.treasuryValue)}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">HPS {formatHps(point.currentHps)}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">AHPS Growth {formatSignedPercent(point.ahpsGrowth90d)}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">mNAV {point.mNAV ? `${point.mNAV.toFixed(2)}x` : "—"}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="pointer-events-none absolute bottom-2 left-3 text-[11px] text-gray-500 dark:text-gray-400">{yLabel}</div>
        <div className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-gray-500 dark:text-gray-400">{xLabel}</div>
      </div>
    </div>
  );
}

function HistogramCard({
  title,
  subtitle,
  bins,
}: {
  title: string;
  subtitle: string;
  bins: Array<{ label: string; count: number; tone: "negative" | "neutral" | "positive" }>;
}) {
  const maxCount = Math.max(1, ...bins.map((bin) => bin.count));
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
      </div>
      <div className="space-y-3">
        {bins.map((bin) => (
          <div key={bin.label} className="flex items-center gap-3">
            <div className="w-24 text-xs text-gray-500 dark:text-gray-400">{bin.label}</div>
            <div className="flex-1 h-8 rounded bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  bin.tone === "positive"
                    ? "bg-green-500/80"
                    : bin.tone === "negative"
                      ? "bg-red-500/80"
                      : "bg-gray-400/70"
                )}
                style={{ width: `${(bin.count / maxCount) * 100}%` }}
              />
            </div>
            <div className="w-8 text-right text-sm font-medium text-gray-700 dark:text-gray-200">{bin.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}


function SectorMnavHistoryCard({
  mnavStats,
  timeRange,
  setTimeRange,
  metric,
  setMetric,
}: {
  mnavStats: { median: number; average: number };
  timeRange: TimeRange;
  setTimeRange: (value: TimeRange) => void;
  metric: MetricType;
  setMetric: (value: MetricType) => void;
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const isMedian = metric === "median";
  const color = isMedian ? "#6366f1" : "#a855f7";

  const historicalData = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const daysForRange: Record<TimeRange, number> = {
      "1d": 1,
      "7d": 7,
      "1mo": 30,
      "1y": 365,
      "all": 99999,
    };

    const cutoffDate = new Date(now.getTime() - daysForRange[timeRange] * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];
    const result: { time: Time; value: number }[] = [];

    for (const snapshot of MNAV_HISTORY) {
      if (snapshot.date < cutoffStr) continue;
      if (snapshot.date === today) continue;
      result.push({
        time: snapshot.date as Time,
        value: isMedian ? snapshot.median : snapshot.average,
      });
    }

    result.push({
      time: today as Time,
      value: isMedian ? mnavStats.median : mnavStats.average,
    });

    return result;
  }, [isMedian, mnavStats.average, mnavStats.median, timeRange]);

  const change = useMemo(() => {
    if (historicalData.length < 2) return 0;
    const first = historicalData[0].value;
    const last = historicalData[historicalData.length - 1].value;
    return ((last - first) / first) * 100;
  }, [historicalData]);

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
      rightPriceScale: { borderVisible: false },
      timeScale: {
        borderVisible: false,
        timeVisible: timeRange === "1d" || timeRange === "7d" || timeRange === "1mo",
        secondsVisible: false,
      },
    });

    const mainSeries = chart.addSeries(LineSeries, {
      color,
      lineWidth: 2,
      title: isMedian ? "Median" : "Average",
      priceFormat: {
        type: "custom",
        formatter: (price: number) => `${price.toFixed(2)}x`,
      },
    });
    mainSeries.setData(historicalData);

    const baselineSeries = chart.addSeries(LineSeries, {
      color: "rgba(156, 163, 175, 0.5)",
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    baselineSeries.setData(historicalData.map((point) => ({ time: point.time, value: 1.0 })));

    if (historicalData.length > 0) {
      chart.timeScale().setVisibleRange({
        from: historicalData[0].time,
        to: historicalData[historicalData.length - 1].time,
      });
    }

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
  }, [color, historicalData, isMedian, timeRange]);

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900 xl:col-span-2">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sector mNAV History</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Canonical sector-level mNAV trend from the pre-calculated history stack.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex gap-1 rounded-lg bg-white p-1 dark:bg-gray-950">
            <button
              onClick={() => setMetric("median")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                metric === "median"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              )}
            >
              Median
            </button>
            <button
              onClick={() => setMetric("average")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                metric === "average"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              )}
            >
              Average
            </button>
          </div>
          <div className="flex gap-1 rounded-lg bg-white p-1 dark:bg-gray-950">
            {timeRangeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeRange(option.value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors sm:px-3 sm:text-sm",
                  timeRange === option.value
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mb-3 flex items-center gap-2 text-sm">
        <span className="inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-gray-600 dark:text-gray-400">
          {(isMedian ? mnavStats.median : mnavStats.average).toFixed(2)}x
        </span>
        <span className={cn("text-xs font-medium", change >= 0 ? "text-green-600" : "text-red-600")}>
          ({change >= 0 ? "+" : ""}{change.toFixed(1)}%)
        </span>
      </div>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}

function AnalyticsContent() {
  const [selectedAsset, setSelectedAsset] = useState<AssetFilter>("ALL");
  const [growthPeriod, setGrowthPeriod] = useState<GrowthPeriod>("90d");
  const [historyRange, setHistoryRange] = useState<TimeRange>("1y");
  const [historyMetric, setHistoryMetric] = useState<MetricType>("median");
  const [showUpcomingEarnings, setShowUpcomingEarnings] = useState(true);
  const [selectedQuarter, setSelectedQuarter] = useState<CalendarQuarter | undefined>(undefined);

  const { data: prices } = usePricesStream();
  const { data: companiesData, isLoading } = useCompanies();
  const allCompanies = useMemo(() => {
    const baseCompanies = companiesData?.companies || [];
    return enrichAllCompanies(baseCompanies);
  }, [companiesData]);

  const tickers = useMemo(() => allCompanies.map((company) => company.ticker), [allCompanies]);
  const { data: d1Data, sources: d1Sources, dates: d1Dates, quotes: d1Quotes, searchTerms: d1SearchTerms, accessions: d1Accessions } = useD1Fundamentals(tickers);
  const d1AllCompanies = useMemo(
    () => applyD1Overlay(allCompanies, d1Data, d1Sources, d1Dates, d1Quotes, d1SearchTerms, d1Accessions),
    [allCompanies, d1Data, d1Sources, d1Dates, d1Quotes, d1SearchTerms, d1Accessions]
  );

  const companies = useMemo(() => {
    if (selectedAsset === "ALL") return d1AllCompanies;
    if (selectedAsset === "OTHER") {
      const mainAssets = ["BTC", "ETH", "SOL", "HYPE", "TAO"];
      return d1AllCompanies.filter((company) => !mainAssets.includes(company.asset));
    }
    return d1AllCompanies.filter((company) => company.asset === selectedAsset);
  }, [d1AllCompanies, selectedAsset]);

  const availableAssets = useMemo(() => {
    const assetCounts: Record<string, number> = {};
    d1AllCompanies.forEach((company) => {
      assetCounts[company.asset] = (assetCounts[company.asset] || 0) + 1;
    });
    return assetCounts;
  }, [d1AllCompanies]);

  const treasuries = useMemo(() => companies.filter((company) => !company.isMiner), [companies]);
  const mnavStats = useMNAVStats(treasuries, prices ?? null);

  const growthStats = useMemo(() => {
    const daysMap: Record<GrowthPeriod, number | undefined> = {
      "30d": 30,
      "90d": 90,
      "1y": 365,
      "all": undefined,
    };
    const days = daysMap[growthPeriod];
    const assetFilter = selectedAsset === "ALL" || selectedAsset === "OTHER"
      ? undefined
      : selectedAsset as "BTC" | "ETH" | "SOL" | "HYPE" | "TAO";

    let allGrowthData = getHoldingsGrowthByPeriod({ days, asset: assetFilter });

    if (selectedAsset === "OTHER") {
      const mainAssets = ["BTC", "ETH", "SOL", "HYPE", "TAO"];
      allGrowthData = allGrowthData.filter((metric) => !mainAssets.includes(metric.asset));
    }

    const treasuryTickers = new Set(treasuries.map((company) => company.ticker));
    const leaderboard = allGrowthData.filter((metric) => treasuryTickers.has(metric.ticker));
    const companiesWithData = new Set(leaderboard.map((metric) => metric.ticker));
    const insufficientData = treasuries.filter((company) => !companiesWithData.has(company.ticker)).length;

    if (leaderboard.length === 0) {
      return {
        median: 0,
        average: 0,
        positiveCount: 0,
        totalCount: 0,
        best: null as (typeof leaderboard)[number] | null,
        worst: null as (typeof leaderboard)[number] | null,
        insufficientData,
      };
    }

    const growths = leaderboard.map((metric) => metric.growthPct);
    const sortedGrowths = [...growths].sort((a, b) => a - b);
    const mid = Math.floor(sortedGrowths.length / 2);
    const medianGrowth = sortedGrowths.length % 2
      ? sortedGrowths[mid]
      : (sortedGrowths[mid - 1] + sortedGrowths[mid]) / 2;
    const averageGrowth = growths.reduce((sum, value) => sum + value, 0) / growths.length;

    return {
      median: medianGrowth,
      average: averageGrowth,
      positiveCount: growths.filter((value) => value > 0).length,
      totalCount: leaderboard.length,
      best: leaderboard[0],
      worst: leaderboard[leaderboard.length - 1],
      insufficientData,
    };
  }, [growthPeriod, selectedAsset, treasuries]);

  const { data: ahpsData } = useSWR<{ success: boolean; results: HpsGrowthApiRow[] }>(
    "/api/d1/hps-growth",
    fetcher,
    { revalidateOnFocus: false }
  );

  const points = useMemo<ChartPoint[]>(() => {
    const ahpsByTicker = new Map((ahpsData?.results || []).map((row) => [row.ticker.toUpperCase(), row]));
    return companies.map((company) => {
      const cryptoPrice = prices?.crypto[company.asset]?.price || 0;
      const treasuryValue = company.pendingMerger ? 0 : (company.holdings ?? 0) * cryptoPrice;
      const marketCap = getMarketCapForMnavSync(company, prices?.stocks?.[company.ticker], prices?.forex).marketCap;
      const mNAV = getCompanyMNAV(company, prices ?? null);
      const row = ahpsByTicker.get(company.ticker.toUpperCase());
      const history: AhpsHistoryEntry[] | undefined = row?.history?.length
        ? row.history.map((snapshot) => ({
              date: snapshot.date,
              holdings: snapshot.holdings,
              sharesOutstanding: snapshot.sharesOutstanding,
              holdingsPerShare: snapshot.holdingsPerShare,
            }))
        : undefined;
      const ahpsMetrics = getCompanyAhpsMetrics({
        ticker: company.ticker,
        company: row
          ? {
              ...company,
              holdings: row.currentSnapshot.holdings,
              sharesForMnav: row.currentSnapshot.sharesOutstanding,
              holdingsLastUpdated: row.currentSnapshot.date,
            }
          : company,
        history,
        currentStockPrice: prices?.stocks?.[company.ticker]?.price,
      });
      const currentHps = company.holdings > 0 && company.sharesForMnav ? company.holdings / company.sharesForMnav : null;
      return {
        id: company.id,
        ticker: company.ticker,
        name: company.name,
        asset: company.asset,
        treasuryValue,
        marketCap,
        currentHps,
        ahpsGrowth90d: ahpsMetrics.ahpsGrowth90d,
        mNAV,
      };
    });
  }, [ahpsData?.results, companies, prices]);

  const companyCount = companies.length;
  const growthValues = points
    .map((point) => point.ahpsGrowth90d)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const growthBins = [
    { label: "< -20%", min: Number.NEGATIVE_INFINITY, max: -20, tone: "negative" as const },
    { label: "-20 to -10%", min: -20, max: -10, tone: "negative" as const },
    { label: "-10 to 0%", min: -10, max: 0, tone: "negative" as const },
    { label: "0 to 10%", min: 0, max: 10, tone: "positive" as const },
    { label: "10 to 20%", min: 10, max: 20, tone: "positive" as const },
    { label: "20 to 50%", min: 20, max: 50, tone: "positive" as const },
    { label: "50%+", min: 50, max: Number.POSITIVE_INFINITY, tone: "positive" as const },
  ].map((bin) => ({
    label: bin.label,
    tone: bin.tone,
    count: growthValues.filter((value) => value >= bin.min && value < bin.max).length,
  }));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col lg:flex-row">
      <MobileHeader title="Sector" showBack />
      <Suspense fallback={<div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-gray-50 dark:bg-gray-900" />}>
        <AppSidebar className="hidden lg:block fixed left-0 top-0 h-full overflow-y-auto" />
      </Suspense>

      <main className="flex-1 lg:ml-64 px-3 py-4 lg:px-6 lg:py-8">
        <div className="mb-6 hidden lg:block">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            ← Back to tracker
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Sector Intelligence</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Structural patterns across {companyCount} DAT companies
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedAsset("ALL")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              selectedAsset === "ALL"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            )}
          >
            All ({d1AllCompanies.length})
          </button>
          {(["BTC", "ETH", "SOL", "HYPE", "TAO"] as const).map((asset) =>
            availableAssets[asset] > 0 ? (
              <button
                key={asset}
                onClick={() => setSelectedAsset(asset)}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  selectedAsset === asset
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                )}
              >
                {asset} ({availableAssets[asset]})
              </button>
            ) : null
          )}
          {Object.keys(availableAssets).filter((asset) => !["BTC", "ETH", "SOL", "HYPE", "TAO"].includes(asset)).length > 0 && (
            <button
              onClick={() => setSelectedAsset("OTHER")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                selectedAsset === "OTHER"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              )}
            >
              Other ({Object.entries(availableAssets).filter(([asset]) => !["BTC", "ETH", "SOL", "HYPE", "TAO"].includes(asset)).reduce((sum, [, count]) => sum + count, 0)})
            </button>
          )}
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SummaryCard title="AHPS Growth Summary">
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1 rounded-lg bg-white p-1 dark:bg-gray-950">
                {(["30d", "90d", "1y", "all"] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setGrowthPeriod(period)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium uppercase transition-colors sm:text-sm",
                      growthPeriod === period
                        ? "bg-indigo-600 text-white"
                        : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                    )}
                  >
                    {period}
                  </button>
                ))}
              </div>
              {growthStats.insufficientData > 0 && (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  {growthStats.insufficientData} lack history
                </span>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Median</p>
                <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{formatSignedPercent(growthStats.median)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Average</p>
                <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{formatSignedPercent(growthStats.average)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Positive</p>
                <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {growthStats.positiveCount}/{growthStats.totalCount}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Best / Worst</p>
                <p className="mt-1 text-sm font-semibold text-green-600">{growthStats.best ? `${growthStats.best.ticker} ${formatSignedPercent(growthStats.best.growthPct)}` : "—"}</p>
                <p className="text-sm font-semibold text-red-600">{growthStats.worst ? `${growthStats.worst.ticker} ${formatSignedPercent(growthStats.worst.growthPct)}` : "—"}</p>
              </div>
            </div>
          </SummaryCard>

          <SummaryCard title="mNAV Aggregate Stats">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Median</p>
                <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{mnavStats.median.toFixed(2)}x</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Average</p>
                <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{mnavStats.average.toFixed(2)}x</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Companies</p>
                <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{mnavStats.count}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Asset Filter</p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{selectedAsset === "ALL" ? "All assets" : selectedAsset}</p>
              </div>
            </div>
          </SummaryCard>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ScatterCard
            title="Treasury Density vs Scale"
            subtitle="Compare per-share crypto density against treasury scale. Dot size uses market cap."
            xLabel="Treasury Value"
            yLabel="HPS"
            points={points}
            xAccessor={(point) => point.treasuryValue}
            yAccessor={(point) => point.currentHps}
            sizeAccessor={(point) => point.marketCap}
            onSelect={(ticker) => (window.location.href = `/company/${ticker}`)}
          />
          <ScatterCard
            title="AHPS Growth vs. mNAV"
            subtitle="Per-share treasury growth on the y-axis, wrapper valuation on the x-axis. Dot size uses treasury value."
            xLabel="mNAV"
            yLabel="AHPS Growth (90D)"
            points={points}
            xAccessor={(point) => point.mNAV}
            yAccessor={(point) => point.ahpsGrowth90d}
            sizeAccessor={(point) => point.treasuryValue}
            onSelect={(ticker) => (window.location.href = `/company/${ticker}`)}
          />
          <HistogramCard
            title="Sector Growth Distribution"
            subtitle={`Median AHPS Growth (${growthPeriod.toUpperCase()}): ${formatSignedPercent(growthStats.median)}`}
            bins={growthBins}
          />
          <SectorMnavHistoryCard
            mnavStats={{ median: mnavStats.median, average: mnavStats.average }}
            timeRange={historyRange}
            setTimeRange={setHistoryRange}
            metric={historyMetric}
            setMetric={setHistoryMetric}
          />
        </div>

        {/* Quarterly Performance & Earnings — merged from /earnings */}
        <div id="quarterly" className="mt-10 scroll-mt-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Quarterly Performance</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Which companies are growing holdings per share the fastest?
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 lg:p-6">
            <TreasuryYieldLeaderboard
              key={`${selectedQuarter || 'default'}-${selectedAsset === "ALL" ? "all" : selectedAsset}`}
              quarter={selectedQuarter}
              asset={selectedAsset !== "ALL" && selectedAsset !== "OTHER" ? selectedAsset as Asset : undefined}
              onQuarterChange={(q: CalendarQuarter) => setSelectedQuarter(q)}
            />
          </div>

          <div className="mt-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {showUpcomingEarnings ? "Upcoming Earnings" : "Recent Results"}
              </h3>
              <div className="flex gap-2">
                <Button
                  variant={showUpcomingEarnings ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowUpcomingEarnings(true)}
                >
                  Upcoming
                </Button>
                <Button
                  variant={!showUpcomingEarnings ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowUpcomingEarnings(false)}
                >
                  Recent
                </Button>
              </div>
            </div>
            <EarningsCalendar
              days={90}
              asset={selectedAsset !== "ALL" && selectedAsset !== "OTHER" ? selectedAsset as Asset : undefined}
              upcoming={showUpcomingEarnings}
              limit={8}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>}>
      <AnalyticsContent />
    </Suspense>
  );
}
