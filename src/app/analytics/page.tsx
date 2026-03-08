"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { useCompanies } from "@/lib/hooks/use-companies";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { enrichAllCompanies } from "@/lib/hooks/use-company-data";
import { useD1Fundamentals } from "@/lib/hooks/use-d1-fundamentals";
import { applyD1Overlay } from "@/lib/d1-overlay";
import { getCompanyMNAV } from "@/lib/math/mnav-engine";
import { getCompanyAhpsMetrics, type AhpsHistoryEntry } from "@/lib/utils/ahps";
import { getMarketCapForMnavSync } from "@/lib/utils/market-cap";
import { cn } from "@/lib/utils";

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
                  <span className="block text-xs text-gray-500 dark:text-gray-400">HPS Growth {formatSignedPercent(point.ahpsGrowth90d)}</span>
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

function AnalyticsContent() {
  const { data: prices } = usePricesStream();
  const { data: companiesData, isLoading } = useCompanies();
  const allCompanies = useMemo(() => {
    const baseCompanies = companiesData?.companies || [];
    return enrichAllCompanies(baseCompanies);
  }, [companiesData]);
  const tickers = useMemo(() => allCompanies.map((company) => company.ticker), [allCompanies]);
  const { data: d1Data, sources: d1Sources, dates: d1Dates } = useD1Fundamentals(tickers);
  const companies = useMemo(
    () => applyD1Overlay(allCompanies, d1Data, d1Sources, d1Dates),
    [allCompanies, d1Data, d1Sources, d1Dates]
  );
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
      const history: AhpsHistoryEntry[] | undefined = row
        ? [row.snapshot30d, row.snapshot90d, row.snapshot1y, row.currentSnapshot]
            .filter((snapshot): snapshot is HpsGrowthApiSnapshot => Boolean(snapshot))
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((snapshot) => ({
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
  const growthValues = points.map((point) => point.ahpsGrowth90d).filter((value): value is number => value !== null && Number.isFinite(value));
  const mnavValues = points.map((point) => point.mNAV).filter((value): value is number => value !== null && Number.isFinite(value));
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
  const mnavBins = [
    { label: "<0.5x", min: Number.NEGATIVE_INFINITY, max: 0.5 },
    { label: "0.5-1.0x", min: 0.5, max: 1.0 },
    { label: "1.0-1.5x", min: 1.0, max: 1.5 },
    { label: "1.5-2.0x", min: 1.5, max: 2.0 },
    { label: "2.0-3.0x", min: 2.0, max: 3.0 },
    { label: "3.0x+", min: 3.0, max: Number.POSITIVE_INFINITY },
  ].map((bin) => ({
    label: bin.label,
    tone: "neutral" as const,
    count: mnavValues.filter((value) => value >= bin.min && value < bin.max).length,
  }));
  const medianGrowth = median(growthValues);
  const medianMnav = median(mnavValues);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col lg:flex-row">
      <MobileHeader title="Analytics" showBack />
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Sector Analytics</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Structural patterns across {companyCount} DAT companies
          </p>
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
            title="Flywheel Dynamics"
            subtitle="Fallback framing: current mNAV on x-axis because 90D mNAV change is not yet exposed as a canonical series."
            xLabel="Current mNAV"
            yLabel="HPS Growth (90D)"
            points={points}
            xAccessor={(point) => point.mNAV}
            yAccessor={(point) => point.ahpsGrowth90d}
            sizeAccessor={(point) => point.treasuryValue}
            onSelect={(ticker) => (window.location.href = `/company/${ticker}`)}
          />
          <HistogramCard
            title="Sector Growth Distribution"
            subtitle={`Median HPS Growth (90D): ${formatSignedPercent(medianGrowth)}`}
            bins={growthBins}
          />
          <HistogramCard
            title="Sector mNAV Distribution (Current)"
            subtitle={`Median mNAV: ${medianMnav ? `${medianMnav.toFixed(2)}x` : "—"}`}
            bins={mnavBins}
          />
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
