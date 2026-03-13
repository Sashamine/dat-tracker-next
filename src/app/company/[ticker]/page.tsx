"use client";

import { Suspense, useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useCompany, useCompanies } from "@/lib/hooks/use-companies";
import { latestRowByMetric, useCompanyD1Latest } from "@/lib/hooks/use-company-d1-latest";
import { useCompanyExplainBatch } from "@/lib/hooks/use-company-explain-batch";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { enrichCompany, enrichAllCompanies } from "@/lib/hooks/use-company-data";
import { useD1Fundamentals } from "@/lib/hooks/use-d1-fundamentals";
import { applyD1Overlay, getHoldingsBasis } from "@/lib/d1-overlay";
import { CORE_D1_METRICS, HISTORY_D1_METRICS } from "@/lib/metrics";
import { AppSidebar } from "@/components/app-sidebar";
import { OverviewSidebar } from "@/components/overview-sidebar";
import {
  useStockHistory,
  TimeRange,
  ChartInterval,
  DEFAULT_INTERVAL,
} from "@/lib/hooks/use-stock-history";
import { StockChart } from "@/components/stock-chart";
import { CompanyMNAVChart } from "@/components/company-mnav-chart";
import { HoldingsPerShareChart } from "@/components/holdings-per-share-chart";
import { HoldingsHistoryTable } from "@/components/holdings-history-table";
import { useCompanyMetricHistory } from "@/lib/hooks/use-company-metric-history";
import { getCompanyAhpsMetrics, getAhpsTimeSeries, type AhpsHistoryEntry } from "@/lib/utils/ahps";
import { CompanyMetricHistorySection } from "@/components/company-metric-history";
import { ScheduledEvents } from "@/components/scheduled-events";
import { Badge } from "@/components/ui/badge";
import { CitationPopover } from "@/components/ui/citation-popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataFlagBadge, FPIBadge } from "@/components/ui/data-flag-badge";
import { cn } from "@/lib/utils";
import { StalenessNote } from "@/components/staleness-note";
import {
  calculateNAV,
  calculateNAVPerShare,
  calculateNAVDiscount,
  calculateHoldingsPerShare,
  formatLargeNumber,
  formatTokenAmount,
  formatPercent,
  formatMNAV,
  NETWORK_STAKING_APY,
} from "@/lib/calculations";
import { getMarketCapForMnavSync } from "@/lib/utils/market-cap";
import { getCompanyMNAV, calculateTotalCryptoNAV } from "@/lib/math/mnav-engine";
import { calculateStakingYield } from "@/lib/math/yield-engine";
import { getDebtMaturity } from "@/lib/math/debt-engine";
import { DebtMaturityChart } from "@/components/debt-maturity-chart";
import { AdoptionTimeline } from "@/components/adoption-timeline";
import { StockPriceCell } from "@/components/price-cell";
import { FilingCite } from "@/components/wiki-citation";
import { getCompanyIntel } from "@/lib/data/company-intel";
import { MobileHeader } from "@/components/mobile-header";
import { CompanyPageTabs } from "@/components/company-page-tabs";
import { getEffectiveShares } from "@/lib/data/dilutive-instruments";
import { MSTRCompanyView } from "@/components/MSTRCompanyView";
import { BMNRCompanyView } from "@/components/BMNRCompanyView";
import { MARACompanyView } from "@/components/MARACompanyView";
import { XXICompanyView } from "@/components/XXICompanyView";
import { MetaplanetCompanyView } from "@/components/MetaplanetCompanyView";
import { SBETCompanyView } from "@/components/SBETCompanyView";
import { ASSTCompanyView } from "@/components/ASSTCompanyView";
import { AVXCompanyView } from "@/components/AVXCompanyView";
import { DJTCompanyView } from "@/components/DJTCompanyView";
import { FWDICompanyView } from "@/components/FWDICompanyView";
import { BTBTCompanyView } from "@/components/BTBTCompanyView";
import { ABTCCompanyView } from "@/components/ABTCCompanyView";
import { NAKACompanyView } from "@/components/NAKACompanyView";
import { HSDTCompanyView } from "@/components/HSDTCompanyView";
import { ALCPBCompanyView } from "@/components/ALCPBCompanyView";
import { DFDVCompanyView } from "@/components/DFDVCompanyView";
import { UPXICompanyView } from "@/components/UPXICompanyView";
import { DCCCompanyView } from "@/components/DCCCompanyView";
import { H100CompanyView } from "@/components/H100CompanyView";
import { DDCCompanyView } from "@/components/DDCCompanyView";
import { GenericCompanyView } from "@/components/GenericCompanyView";
import { MnavCalculationCard } from "@/components/mnav-calculation-card";
import { DataFreshnessIndicator } from "@/components/data-freshness-indicator";
import { trackCitationSourceClick, trackCompanyView } from "@/lib/client-events";
import { HoldingsBreakdownCard } from "@/components/holdings-breakdown-card";
import { CostBasisCard } from "@/components/cost-basis-card";
import { SECFilingTimeline } from "@/components/sec-filing-timeline";
import { getSBETFilingsList, SBET_CIK } from "@/lib/data/provenance/sbet";

import { ExternalLink, FileText, Star, ChevronDown, ChevronUp } from "lucide-react";
// Asset colors
const assetColors: Record<string, string> = {
  ETH: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  BTC: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  SOL: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  HYPE: "bg-green-500/10 text-green-600 border-green-500/20",
  BNB: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  TAO: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  LINK: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatHpsValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) return "—";
  if (value >= 100) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (value >= 1) return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  if (value >= 0.01) return value.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 4 });
  return value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

function formatSignedPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

// Source link component for provenance
function SourceLink({
  url,
  label,
  ticker,
  metric,
}: {
  url?: string;
  label?: string;
  ticker?: string;
  metric?: string;
}) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackCitationSourceClick({ href: url, ticker, metric })}
      className="text-[10px] text-blue-500 hover:text-blue-400 align-super ml-1 no-underline whitespace-nowrap"
      title={label || "View source"}
    >
      [src&nbsp;↗]
    </a>
  );
}

export default function CompanyPage() {
  const params = useParams();
  const ticker = params.ticker as string;
  const pathname = usePathname();
  const { data: prices } = usePricesStream();

  useEffect(() => {
    if (ticker) trackCompanyView(ticker, pathname);
  }, [ticker, pathname]);

  // Fetch company from database API
  const { data: companyData, isLoading: isLoadingCompany } = useCompany(ticker);

  // Enrich company data with holdings history and source tracking
  const company = useMemo(
    () => companyData?.company ? enrichCompany(companyData.company) : null,
    [companyData]
  );
  // Stock price chart timeframe
  const [timeRange, setTimeRange] = useState<TimeRange>("1y");
  const [interval, setInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const [chartMode, setChartMode] = useState<"price" | "volume" | "mnav" | "hps">("price");
  const { data: history, isLoading: historyLoading } = useStockHistory(ticker, timeRange, interval);

  // mNAV chart timeframe (separate from stock price)
  const [mnavTimeRange, setMnavTimeRange] = useState<TimeRange>("1y");
  const [mnavInterval, setMnavInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);

  // Company intel - must be called before any early returns (React hooks rule)
  const intel = useMemo(() => getCompanyIntel(ticker), [ticker]);

  // Fetch all companies for sidebar stats (shared cache with main page)
  // This is the SAME data source as the main page, ensuring mNAV consistency
  const { data: companiesData, isLoading: isLoadingCompanies } = useCompanies();
  const enrichedAllCompanies = useMemo(() => {
    const baseCompanies = companiesData?.companies || [];
    return enrichAllCompanies(baseCompanies);
  }, [companiesData]);

  // D1-first overlay for allCompanies — same pattern as overview pages
  const allTickers = useMemo(() => enrichedAllCompanies.map(c => c.ticker), [enrichedAllCompanies]);
  const { data: d1BatchData, sources: d1BatchSources, dates: d1BatchDates, quotes: d1BatchQuotes, searchTerms: d1BatchSearchTerms, accessions: d1BatchAccessions } = useD1Fundamentals(allTickers);
  const allCompanies = useMemo(
    () => applyD1Overlay(enrichedAllCompanies, d1BatchData, d1BatchSources, d1BatchDates, d1BatchQuotes, d1BatchSearchTerms, d1BatchAccessions),
    [enrichedAllCompanies, d1BatchData, d1BatchSources, d1BatchDates, d1BatchQuotes, d1BatchSearchTerms, d1BatchAccessions]
  );

  // Calculate sidebar stats
  const { assetStats, totalValue, mnavStats } = useMemo(() => {
    const assets = [...new Set(allCompanies.map(c => c.asset))];
    const assetStats = assets.map(asset => {
      const assetCompanies = allCompanies.filter(c => c.asset === asset);
      const price = prices?.crypto[asset]?.price || 0;
      const totalHoldings = assetCompanies.reduce((sum, c) => sum + c.holdings, 0);
      const totalValue = totalHoldings * price;
      return { asset, count: assetCompanies.length, totalHoldings, totalValue, price };
    }).sort((a, b) => b.totalValue - a.totalValue);

    const totalValue = assetStats.reduce((sum, a) => sum + a.totalValue, 0);

    // Calculate median helper
    const median = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    // Use getCompanyMNAV for consistency with overview page
    const mnavs = allCompanies
      .map((c) => getCompanyMNAV(c, prices))
      .filter((m): m is number => m !== null);

    const mnavStats = {
      median: mnavs.length > 0 ? median(mnavs) : 0,
      average: mnavs.length > 0 ? mnavs.reduce((a, b) => a + b, 0) / mnavs.length : 0,
      count: mnavs.length,
    };

    return { assetStats, totalValue, mnavStats };
  }, [allCompanies, prices]);

  // Update interval when time range changes (stock price chart)
  const handleTimeRangeChange = (newRange: TimeRange) => {
    setTimeRange(newRange);
    // Reset to default interval for the new range
    setInterval(DEFAULT_INTERVAL[newRange]);
  };

  // Update interval when time range changes (mNAV chart)
  const handleMnavTimeRangeChange = (newRange: TimeRange) => {
    setMnavTimeRange(newRange);
    setMnavInterval(DEFAULT_INTERVAL[newRange]);
  };

  // D1 canonical inputs (Balance Sheet + shares)
  const { data: d1LatestInputs } = useCompanyD1Latest(ticker, [...CORE_D1_METRICS]);
  const d1ByMetric = useMemo(() => latestRowByMetric(d1LatestInputs?.rows), [d1LatestInputs]);
  const { data: d1ExplainInputs } = useCompanyExplainBatch(ticker, [
    "holdings_native",
    "bitcoin_holdings_usd",
    "basic_shares",
    "cash_usd",
    "debt_usd",
    "preferred_equity_usd",
  ]);

  // D1 metric history (batch)
  const { data: metricHistory } = useCompanyMetricHistory(ticker, [...HISTORY_D1_METRICS], 12, 'desc');
  const { data: ahpsLeaderboardData } = useSWR<{
    success: boolean;
    results: Array<{
      ticker: string;
      currentSnapshot: {
        date: string;
        holdings: number;
        sharesOutstanding: number;
        holdingsPerShare: number;
      };
      snapshot30d: {
        date: string;
        holdings: number;
        sharesOutstanding: number;
        holdingsPerShare: number;
      } | null;
      snapshot90d: {
        date: string;
        holdings: number;
        sharesOutstanding: number;
        holdingsPerShare: number;
      } | null;
      snapshot1y: {
        date: string;
        holdings: number;
        sharesOutstanding: number;
        holdingsPerShare: number;
      } | null;
      history: Array<{
        date: string;
        holdings: number;
        sharesOutstanding: number;
        holdingsPerShare: number;
      }>;
    }>;
  }>("/api/d1/hps-growth", fetcher, { revalidateOnFocus: false });

  // Prefer company from allCompanies (same source as main page) for consistency
  // Fall back to separately fetched company if not found
  const companyFromAllCompanies = allCompanies.find(c => c.ticker === ticker);
  const displayCompany = companyFromAllCompanies || company;

  // Determine average confidence for the audit summary
  // NOTE: Must be above the early return to avoid Rules of Hooks violation
  const avgConfidence = useMemo(() => {
    if (!displayCompany?.confidenceScores) return null;
    const scores = Object.values(displayCompany.confidenceScores).filter(s => s !== null) as number[];
    if (scores.length === 0) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }, [displayCompany?.confidenceScores]);

  const CompanyPageSkeleton = () => (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col lg:flex-row">
      <MobileHeader title={ticker.toUpperCase()} showBack />
      <Suspense fallback={<div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-gray-50 dark:bg-gray-900" />}>
        <AppSidebar className="hidden lg:block fixed left-0 top-0 h-full overflow-y-auto" />
      </Suspense>
      <main className="flex-1 lg:ml-64 lg:mr-72 px-3 py-4 lg:px-6 lg:py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="space-y-3">
            <div className="h-9 w-40 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
            <div className="h-5 w-72 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
            <div className="h-10 w-full max-w-md rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-lg bg-gray-100 dark:bg-gray-900 animate-pulse" />
            ))}
          </div>
          <div className="h-80 rounded-lg bg-gray-100 dark:bg-gray-900 animate-pulse" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="h-64 rounded-lg bg-gray-100 dark:bg-gray-900 animate-pulse" />
            <div className="h-64 rounded-lg bg-gray-100 dark:bg-gray-900 animate-pulse" />
          </div>
        </div>
      </main>
    </div>
  );

  // Wait for BOTH data sources to load to ensure consistency with main page
  if (isLoadingCompany || isLoadingCompanies) {
    return <CompanyPageSkeleton />;
  }

  if (!displayCompany) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Company not found
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            No company found with ticker: {ticker}
          </p>
          <Link href="/" className="mt-4 inline-block text-indigo-600 hover:underline">
            ← Back to tracker
          </Link>
        </div>
      </div>
    );
  }

  // Use displayCompany (from allCompanies) for all calculations - same source as main page
  const stockData = prices?.stocks[displayCompany.ticker];
  const stockPrice = stockData?.price || 0;
  const stockChange = stockData?.change24h;
  const { marketCap } = getMarketCapForMnavSync(displayCompany, stockData, prices?.forex);

  // Other assets (cash + investments)
  const cashReserves = (d1ByMetric.cash_usd?.value ?? displayCompany.cashReserves ?? 0);
  const otherInvestments = displayCompany.otherInvestments ?? 0;
  const otherAssets = cashReserves + otherInvestments;

  // Calculate total crypto NAV using unified engine (multi-asset aware)
  const { 
    totalUsd: totalCryptoNav, 
    primaryAssetAmount: holdingsNative, 
    primaryAssetPrice: cryptoPrice,
    secondaryCryptoValue
  } = calculateTotalCryptoNAV(displayCompany, prices ?? null);

  const cryptoHoldingsValue = holdingsNative * cryptoPrice;
  const cryptoInvestmentsValue = totalCryptoNav - cryptoHoldingsValue;

  // Which tier resolved the holdings value?
  const holdingsBasis = getHoldingsBasis(d1ByMetric.holdings_native?.value, d1ByMetric.bitcoin_holdings_usd?.value);
  const d1Explain = d1ExplainInputs?.explain || {};
  // Prefer filing viewer URL (/filings/{ticker}/{accession}) when accession is available
  // for ?q= deep linking support. Falls back to artifact source_url, then Company field.
  const resolveUrl = (receipt?: { source_url: string | null; accession: string | null }, fallback?: string) => {
    if (receipt?.accession) return `/filings/${ticker.toLowerCase()}/${receipt.accession}`;
    return receipt?.source_url || fallback;
  };
  const holdingsSourceUrlResolved =
    resolveUrl(d1Explain.holdings_native?.receipt) ||
    resolveUrl(d1Explain.bitcoin_holdings_usd?.receipt) ||
    displayCompany.holdingsSourceUrl;
  const sharesSourceUrlResolved =
    resolveUrl(d1Explain.basic_shares?.receipt, displayCompany.sharesSourceUrl);
  const cashSourceUrlResolved =
    resolveUrl(d1Explain.cash_usd?.receipt, displayCompany.cashSourceUrl);
  const debtSourceUrlResolved =
    resolveUrl(d1Explain.debt_usd?.receipt, displayCompany.debtSourceUrl);
  const preferredSourceUrlResolved =
    resolveUrl(d1Explain.preferred_equity_usd?.receipt, displayCompany.preferredSourceUrl);

  const ahpsRow = ahpsLeaderboardData?.results.find(
    (row) => row.ticker.toUpperCase() === displayCompany.ticker.toUpperCase()
  );
  const ahpsHistory: AhpsHistoryEntry[] | undefined = ahpsRow?.history?.length
    ? ahpsRow.history.map((snapshot) => ({
          date: snapshot.date,
          holdings: snapshot.holdings,
          sharesOutstanding: snapshot.sharesOutstanding,
          holdingsPerShare: snapshot.holdingsPerShare,
        }))
    : undefined;
  const ahpsMetrics = getCompanyAhpsMetrics({
    ticker: displayCompany.ticker,
    company: ahpsRow
      ? {
          ...displayCompany,
          holdings: ahpsRow.currentSnapshot.holdings,
          sharesForMnav: ahpsRow.currentSnapshot.sharesOutstanding,
          holdingsLastUpdated: ahpsRow.currentSnapshot.date,
        }
      : displayCompany,
    history: ahpsHistory,
    currentStockPrice: stockPrice,
  });
  const ahpsSeries = ahpsHistory ? getAhpsTimeSeries(displayCompany.ticker, ahpsHistory) : [];
  const currentAhpsPoint = ahpsSeries[ahpsSeries.length - 1];
  const oneYearAhpsPoint = ahpsRow?.snapshot1y
    ? ahpsSeries.find((point) => point.date === ahpsRow.snapshot1y?.date)
    : undefined;
  const ahpsGrowth1y =
    currentAhpsPoint && oneYearAhpsPoint && oneYearAhpsPoint.ahps > 0
      ? ((currentAhpsPoint.ahps - oneYearAhpsPoint.ahps) / oneYearAhpsPoint.ahps) * 100
      : null;

  // Calculate staking yield and revenue offset
  const stakingYield = calculateStakingYield(displayCompany, prices);
  const { annualRevenueUsd, isSelfSustaining, yieldToBurnRatio } = stakingYield;

  // Leverage ratio = Net Debt / Crypto NAV (net debt = total debt - cash)
  const netDebt = Math.max(0, ((d1ByMetric.debt_usd?.value ?? displayCompany.totalDebt ?? 0)) - cashReserves);
  const debtToCryptoRatio = totalCryptoNav > 0 ? netDebt / totalCryptoNav : 0;

  // Calculate metrics (including other assets in NAV)
  const nav = calculateNAV(holdingsNative, cryptoPrice, cashReserves, otherInvestments + secondaryCryptoValue);

  // mNAV uses shared function with displayCompany (same source as main page)
  const mNAV = getCompanyMNAV(displayCompany, prices ?? null);

  // Debt maturity stats
  const debtStats = getDebtMaturity(displayCompany, stockPrice, annualRevenueUsd);
  const debtDiscrepancy = Math.abs((displayCompany.totalDebt || 0) - debtStats.totalFaceValue);
  const hasUnmodeledDebt = debtDiscrepancy > (displayCompany.totalDebt || 0) * 0.1;

  // Shares outstanding precedence (display-only: NAV/share, holdings/share):
  //   1. D1 basic_shares  – from useCompanyD1Latest, already split-normalized
  //      via normalizeLatestRowsForTicker() in the API layer.
  //   2. Curated           – sharesForMnav from companies.ts (manually verified).
  //   3. Computed fallback  – marketCap / stockPrice (last resort).
  // NOTE: mNAV calculation uses sharesForMnav independently via getMarketCapForMnavSync().
  const sharesOutstanding =
    (d1ByMetric.basic_shares?.value && d1ByMetric.basic_shares.value > 0 ? d1ByMetric.basic_shares.value : 0) ||
    displayCompany.sharesForMnav ||
    (marketCap && stockPrice ? marketCap / stockPrice : 0);
  const totalDebt = (d1ByMetric.debt_usd?.value ?? displayCompany.totalDebt ?? 0);
  const preferredEquity = (d1ByMetric.preferred_equity_usd?.value ?? displayCompany.preferredEquity ?? 0);
  const navPerShare = calculateNAVPerShare(holdingsNative, cryptoPrice, sharesOutstanding, cashReserves, otherInvestments + secondaryCryptoValue, totalDebt, preferredEquity);
  const navDiscount = calculateNAVDiscount(stockPrice, navPerShare);
  const holdingsPerShare = calculateHoldingsPerShare(holdingsNative, sharesOutstanding);
  const currentHps =
    displayCompany.holdings > 0 && displayCompany.sharesForMnav
      ? displayCompany.holdings / displayCompany.sharesForMnav
      : holdingsPerShare;

  // Network staking APY
  const networkStakingApy = NETWORK_STAKING_APY[displayCompany.asset] || 0;
  const companyStakingApy = displayCompany.stakingApy || networkStakingApy;

  // Effective shares (for dilution tracking)
  const effectiveSharesResult = stockPrice > 0 
    ? getEffectiveShares(displayCompany.ticker, displayCompany.sharesForMnav ?? 0, stockPrice)
    : null;


  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <MobileHeader title={displayCompany.ticker} showBack />

      {/* Left Sidebar - Navigation (Desktop only) */}
      <Suspense fallback={<div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-gray-50 dark:bg-gray-900" />}>
        <AppSidebar className="hidden lg:block fixed left-0 top-0 h-full overflow-y-auto" />
      </Suspense>

      <main className="flex-1 lg:ml-64 lg:mr-72 px-3 py-4 lg:px-6 lg:py-8">
        {/* Breadcrumb - Desktop only */}
        <div className="mb-6 hidden lg:block">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            ← Back to tracker
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {displayCompany.ticker}
              </h1>
              <Badge variant="outline" className={cn("font-medium", assetColors[displayCompany.asset] || assetColors.ETH)}>
                {displayCompany.asset}
              </Badge>
              {displayCompany.pendingMerger && (
                <Badge variant="outline" className="font-medium bg-amber-500/10 text-amber-600 border-amber-500/30">
                  Pending Merger
                </Badge>
              )}
              {/* FPI badge for Foreign Private Issuers */}
              <FPIBadge filingType={displayCompany.filingType} />
              {/* SEC Referenced badge - only when explicitly flagged */}
              {displayCompany.secReferenced && (
                <Badge variant="outline" className="font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                  SEC Referenced
                </Badge>
              )}
              {/* Shares verification badge - only when explicitly flagged */}
              {displayCompany.dataWarnings?.some(w => w.type === "unverified-shares") && (
                <Badge variant="outline" className="font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                  Shares: Company Reported
                </Badge>
              )}
              {isSelfSustaining && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="font-bold bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30 animate-pulse cursor-help">
                        ✨ Self-Sustaining
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm font-bold text-green-600 mb-1">Treasury Yield Logic</p>
                      <p className="text-xs">This company generates enough estimated gross staking yield (${formatLargeNumber(annualRevenueUsd)}/yr) to cover its operational burn ({(yieldToBurnRatio).toFixed(1)}x coverage).</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="mt-1 text-lg text-gray-600 dark:text-gray-400">
              {displayCompany.name}
              {displayCompany.datStartDate && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  • Tracking since {new Date(displayCompany.datStartDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </p>

            {/* Stale balance sheet banner */}
            {displayCompany.dataWarnings?.some(w => w.type === 'stale-data') && (
              <div className="mt-3 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400">⚠️</span>
                  <div className="text-sm text-amber-900 dark:text-amber-200">
                    <p className="font-medium">Balance sheet data may be stale</p>
                    <ul className="mt-1 list-disc pl-5 space-y-1">
                      {displayCompany.dataWarnings
                        .filter(w => w.type === 'stale-data')
                        .map((w, i) => (
                          <li key={i}>
                            {w.filingUrl ? (
                              <a
                                href={w.filingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() =>
                                  trackCitationSourceClick({
                                    href: w.filingUrl || "",
                                    ticker: displayCompany.ticker,
                                    metric: "filings",
                                  })
                                }
                                className="underline"
                              >
                                {w.message}
                              </a>
                            ) : (
                              w.message
                            )}
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            {displayCompany.leader && (
              <p className="mt-1 text-sm text-gray-500">Led by {displayCompany.leader}</p>
            )}
            {/* Links - Earnings, Website, Twitter, Tokenized Stock */}
            <div className="mt-3 flex flex-wrap gap-2">
              {/* Earnings page link */}
              <Link
                href={`/company/${displayCompany.ticker}/earnings`}
                className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
              >
                <span>Earnings</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </Link>
              {/* Audit report link */}
              <Link
                href={`/company/${displayCompany.ticker}/audit`}
                className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              >
                <span>Audit Report (PDF)</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </Link>
              {/* Hide website/twitter for companies with custom views (they show in Strategy & Overview) */}
              {displayCompany.website && !["MSTR","BMNR","MARA","XXI","3350.T","SBET","ASST","AVX","DJT","FWDI","ABTC","NAKA","BTBT","UPXI","DFDV","HSDT","ALCPB","DCC.AX","DDC"].includes(displayCompany.ticker) && (
                <a
                  href={displayCompany.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackCitationSourceClick({
                      href: displayCompany.website || "",
                      ticker: displayCompany.ticker,
                    })
                  }
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <span>Website</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              )}
              {displayCompany.twitter && !["MSTR","BMNR","MARA","XXI","3350.T","SBET","ASST","AVX","DJT","FWDI","ABTC","NAKA","BTBT","UPXI","DFDV","HSDT","ALCPB","DCC.AX","DDC"].includes(displayCompany.ticker) && (
                <a
                  href={displayCompany.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackCitationSourceClick({
                      href: displayCompany.twitter || "",
                      ticker: displayCompany.ticker,
                    })
                  }
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <span>Twitter</span>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
              )}
              {displayCompany.tokenizedAddress && (
                <a
                  href={`https://solscan.io/token/${displayCompany.tokenizedAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackCitationSourceClick({
                      href: `https://solscan.io/token/${displayCompany.tokenizedAddress}`,
                      ticker: displayCompany.ticker,
                    })
                  }
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                >
                  <span>Tokenized ({displayCompany.tokenizedChain})</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              )}
              {displayCompany.isMiner && (
                <span className="inline-flex items-center px-3 py-1 text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
                  Miner
                </span>
              )}
            </div>
            <CompanyPageTabs ticker={displayCompany.ticker} className="mt-5" />
          </div>
          <div className="text-right">
            <StockPriceCell price={stockPrice} change24h={stockChange} className="text-2xl" />
          </div>
        </div>

        {/* Pending Merger Banner */}
        {displayCompany.pendingMerger && (
          <div className="mb-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-300">Pre-Merger SPAC</h3>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  This company is a SPAC that has not yet completed its business combination.
                  Holdings data reflects expected post-merger values, not current holdings.
                </p>
                {displayCompany.expectedHoldings && (
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">
                    <strong>Expected Holdings:</strong> ~{displayCompany.expectedHoldings.toLocaleString()} {displayCompany.asset}
                    {displayCompany.mergerExpectedClose && (
                      <> (merger expected {new Date(displayCompany.mergerExpectedClose).toLocaleDateString()})</>
                    )}
                  </p>
                )}
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                  mNAV calculations are not shown for pre-merger SPACs.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Custom provenance views handle their own website/twitter links in Strategy & Overview */}
        {/* MSTR/BMNR/MARA/XXI/Metaplanet/SBET/ASST/AVX: Use fully provenance-tracked views */}
        {displayCompany.ticker === "MSTR" ? (
          <MSTRCompanyView company={displayCompany} />
        ) : displayCompany.ticker === "BMNR" ? (
          <BMNRCompanyView company={displayCompany} />
        ) : displayCompany.ticker === "MARA" ? (
          <MARACompanyView company={displayCompany} />
        ) : displayCompany.ticker === "XXI" ? (
          <XXICompanyView company={displayCompany} />
        ) : displayCompany.ticker === "3350.T" ? (
          <MetaplanetCompanyView company={displayCompany} />
        ) : displayCompany.ticker === "SBET" ? (
          <SBETCompanyView company={displayCompany} />
        ) : displayCompany.ticker === "ASST" ? (
          <ASSTCompanyView company={displayCompany} />
        ) : displayCompany.ticker === "AVX" ? (
          <AVXCompanyView company={displayCompany} />
        ) : displayCompany.ticker === "DJT" ? (
          <DJTCompanyView company={displayCompany} />
        ) : displayCompany.ticker === "FWDI" ? (
          <FWDICompanyView company={displayCompany} />
        ) : displayCompany.ticker === "ABTC" ? (
          <ABTCCompanyView company={displayCompany} />
        ) : displayCompany.ticker === "NAKA" ? (
          <NAKACompanyView company={displayCompany} />
        ) : displayCompany.ticker === "BTBT" ? (
          <BTBTCompanyView company={displayCompany} />
        ) : displayCompany.ticker === "UPXI" ? (
          <UPXICompanyView company={displayCompany} />
        ) : displayCompany.ticker === "DFDV" ? (
          <DFDVCompanyView company={displayCompany} />
        ) : displayCompany.ticker === "HSDT" ? (
          <HSDTCompanyView company={displayCompany} />
        ) : displayCompany.ticker === "ALCPB" ? (
          <ALCPBCompanyView company={displayCompany} />
        ) : displayCompany.ticker === "DCC.AX" ? (
          <DCCCompanyView company={displayCompany} />
        ) : displayCompany.ticker === "H100.ST" ? (
          <H100CompanyView company={displayCompany} />
        ) : displayCompany.ticker === "DDC" ? (
          <DDCCompanyView company={displayCompany} />
        ) : (
          <GenericCompanyView company={displayCompany} />
        )}

      </main>

      {/* Right Sidebar - Overview (Desktop only) */}
      <OverviewSidebar
        assetStats={assetStats}
        mnavStats={mnavStats}
        totalCompanies={allCompanies.length}
        totalValue={totalValue}
        companies={allCompanies}
        prices={prices ?? undefined}
        className="hidden lg:block fixed right-0 top-0 h-full"
      />
    </div>
  );
}
