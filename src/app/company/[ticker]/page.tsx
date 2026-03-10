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
          <>
        {process.env.NODE_ENV === 'development' && displayCompany._d1Fields && (
          <div className="mb-2 text-[10px] font-mono text-gray-400 dark:text-gray-600">
            D1: {displayCompany._d1Fields.join(', ')}
          </div>
        )}

        {/* Balance Sheet */}
        {(otherAssets > 0 || cryptoHoldingsValue > 0) && (
          <section className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-lg">🏦</span>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance Sheet</h2>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 sm:p-6">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-700 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                    Equity NAV
                    <span 
                      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-200 dark:bg-indigo-800 text-[10px] text-indigo-600 dark:text-indigo-300 cursor-help"
                      title="Crypto NAV + Cash − Debt − Preferred"
                    >?</span>
                  </p>
                  <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                    <CitationPopover
                      sourceUrl={holdingsSourceUrlResolved}
                      sourceLabel={displayCompany.holdingsSource}
                      sourceQuote={displayCompany.sourceQuote}
                      searchTerm={displayCompany.sourceSearchTerm}
                      ticker={displayCompany.ticker}
                      metric="holdings_native"
                      confidenceScore={displayCompany.confidenceScores?.['holdings_native']}
                      jurisdiction={displayCompany.jurisdiction}
                      legacy={displayCompany.holdingsBasis === 'static_fallback'}
                    >
                      {formatLargeNumber(nav + cryptoInvestmentsValue - totalDebt - preferredEquity)}
                    </CitationPopover>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Market Cap</p>
                  <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                    <CitationPopover
                      sourceUrl={sharesSourceUrlResolved}
                      sourceLabel={displayCompany.sharesSource}
                      sourceQuote={displayCompany.sharesSourceQuote}
                      searchTerm={displayCompany.sharesSearchTerm}
                      ticker={displayCompany.ticker}
                      metric="basic_shares"
                      confidenceScore={displayCompany.confidenceScores?.['basic_shares']}
                      jurisdiction={displayCompany.jurisdiction}
                      legacy={!sharesSourceUrlResolved}
                    >
                      {formatLargeNumber(marketCap)}
                    </CitationPopover>
                  </p>
                </div>
              </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 mb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">How it&apos;s calculated</p>
              <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
                <CitationPopover
                  sourceUrl={holdingsSourceUrlResolved}
                  sourceLabel={displayCompany.holdingsSource}
                  sourceQuote={displayCompany.sourceQuote}
                  searchTerm={displayCompany.sourceSearchTerm}
                  ticker={displayCompany.ticker}
                  metric="holdings_native"
                  confidenceScore={displayCompany.confidenceScores?.['holdings_native']}
                  jurisdiction={displayCompany.jurisdiction}
                  legacy={displayCompany.holdingsBasis === 'static_fallback'}
                >
                  <span className="text-gray-900 dark:text-gray-100">{formatLargeNumber(cryptoHoldingsValue)}</span>
                </CitationPopover>
                <span className="text-gray-400"> {displayCompany.asset}</span>
                {displayCompany.cryptoInvestments && displayCompany.cryptoInvestments.map((investment, idx) => {
                  // Get dynamic exchange rate if available
                  const lstData = investment.lstConfigId ? prices?.lst?.[investment.lstConfigId] : undefined;
                  const exchangeRate = lstData?.exchangeRate || investment.exchangeRate || 1;

                  // Calculate value for this investment
                  let investmentValue = investment.fairValue;
                  if (investment.type === "lst" && investment.lstAmount && prices) {
                    const underlyingAmount = investment.lstAmount * exchangeRate;
                    const lstPrice = prices.crypto[investment.underlyingAsset]?.price || 0;
                    investmentValue = underlyingAmount * lstPrice;
                  } else if (investment.type === "lst" && investment.underlyingAmount && prices) {
                    investmentValue = investment.underlyingAmount * (prices.crypto[investment.underlyingAsset]?.price || 0);
                  }

                  const label = investment.type === "lst" ? "staked" : investment.type;
                  return (
                    <span key={idx}>
                      <span className="text-purple-600"> + {formatLargeNumber(investmentValue)}</span>
                      <span className="text-gray-400" title={investment.name}> {label}</span>
                    </span>
                  );
                })}
                {cashReserves > 0 && (
                  <>
                    <CitationPopover
                      sourceUrl={cashSourceUrlResolved}
                      sourceLabel={displayCompany.cashSource}
                      sourceQuote={displayCompany.cashSourceQuote}
                      searchTerm={displayCompany.cashSearchTerm}
                      ticker={displayCompany.ticker}
                      metric="cash_usd"
                      confidenceScore={displayCompany.confidenceScores?.['cash_usd']}
                      jurisdiction={displayCompany.jurisdiction}
                      legacy={!cashSourceUrlResolved}
                    >
                      <span className="text-green-600"> + {formatLargeNumber(cashReserves)}</span>
                    </CitationPopover>
                    <span className="text-gray-400"> cash</span>
                  </>
                )}
                {totalDebt > 0 && (
                  <>
                    <CitationPopover
                      sourceUrl={debtSourceUrlResolved}
                      sourceLabel={displayCompany.debtSource}
                      sourceQuote={displayCompany.debtSourceQuote}
                      searchTerm={displayCompany.debtSearchTerm}
                      ticker={displayCompany.ticker}
                      metric="debt_usd"
                      confidenceScore={displayCompany.confidenceScores?.['debt_usd']}
                      jurisdiction={displayCompany.jurisdiction}
                      legacy={!debtSourceUrlResolved}
                    >
                      <span className="text-red-600"> − {formatLargeNumber(totalDebt)}</span>
                    </CitationPopover>
                    <span className="text-gray-400"> debt</span>
                  </>
                )}
                {preferredEquity > 0 && (
                  <>
                    <CitationPopover
                      sourceUrl={preferredSourceUrlResolved}
                      sourceLabel={displayCompany.preferredSource}
                      sourceQuote={displayCompany.preferredSourceQuote}
                      searchTerm={displayCompany.preferredSearchTerm}
                      ticker={displayCompany.ticker}
                      metric="preferred_equity_usd"
                      confidenceScore={displayCompany.confidenceScores?.['preferred_equity_usd']}
                      jurisdiction={displayCompany.jurisdiction}
                      legacy={!preferredSourceUrlResolved}
                    >
                      <span className="text-red-600"> − {formatLargeNumber(preferredEquity)}</span>
                    </CitationPopover>
                    <span className="text-gray-400"> preferred</span>
                  </>
                )}
                <span className="text-indigo-600 font-semibold"> = {formatLargeNumber(nav + cryptoInvestmentsValue - totalDebt - preferredEquity)}</span>
              </p>
              </div>

              <StalenessNote
                dates={[
                  displayCompany.holdingsLastUpdated,
                  displayCompany.debtAsOf,
                  displayCompany.cashAsOf,
                  displayCompany.sharesAsOf,
                ]}
                secCik={displayCompany.secCik}
              />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {displayCompany.asset} Holdings {cryptoInvestmentsValue > 0 && "(Direct)"}
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  <CitationPopover
                    sourceUrl={holdingsSourceUrlResolved}
                    sourceLabel={displayCompany.holdingsSource}
                    sourceQuote={displayCompany.sourceQuote}
                    searchTerm={displayCompany.sourceSearchTerm}
                    ticker={displayCompany.ticker}
                    metric="holdings_native"
                    confidenceScore={displayCompany.confidenceScores?.['holdings_native']}
                    jurisdiction={displayCompany.jurisdiction}
                    legacy={displayCompany.holdingsBasis === 'static_fallback'}
                  >
                    {formatLargeNumber(cryptoHoldingsValue)}
                  </CitationPopover>
                  {!holdingsSourceUrlResolved && displayCompany.ticker === "MSTR" && displayCompany.holdingsSource === "sec-filing" ? (
                    <FilingCite 
                      ticker="MSTR" 
                      date="2026-02-02" 
                      anchor="btc-holdings"
                      filingType="8-K"
                    />
                  ) : !holdingsSourceUrlResolved && displayCompany.ticker === "BMNR" && displayCompany.holdingsSource === "sec-filing" ? (
                    <FilingCite 
                      ticker="BMNR" 
                      date="2026-02-01" 
                      anchor="holdings"
                      filingType="8-K"
                    />
                  ) : null}
                </p>
                <p className="text-xs text-gray-400">
                  {formatTokenAmount(displayCompany.holdings, displayCompany.asset)}
                </p>
              </div>

              {/* Audit & Verification Summary */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-900/30">
                <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide">Audit Status</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded uppercase tracking-tighter",
                    (avgConfidence || 0) >= 0.85 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  )}>
                    { (avgConfidence || 0) >= 0.85 ? "Institutionally Verified" : "Community Verified" }
                  </span>
                  <span className="text-xs font-mono text-gray-500">
                    {avgConfidence !== null ? Math.round(avgConfidence * 100) + "%" : "N/A"}
                  </span>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  <Link 
                    href={`/company/${displayCompany.ticker}/audit`}
                    className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <FileText size={10} /> View Full Audit Report (PDF)
                  </Link>
                  <a 
                    href={`/api/company/${displayCompany.ticker}/audit-report?format=json`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
                  >
                    <div className="w-1 h-1 rounded-full bg-gray-400" /> Inspect Raw Payload (JSON)
                  </a>
                </div>
              </div>

              {/* Annual Staking Revenue (if applicable) */}
              {annualRevenueUsd > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-900/30">
                  <p className="text-xs text-green-600 dark:text-green-400 uppercase tracking-wide flex items-center gap-1">
                    Est. Gross Yield
                    {isSelfSustaining && <span title="Covers 100%+ of burn">✨</span>}
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help border-b border-dotted border-gray-300">
                            ${formatLargeNumber(annualRevenueUsd)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="p-0 border-none shadow-none">
                          <div className="bg-gray-900 text-white p-3 rounded-lg shadow-xl w-64">
                            <p className="font-bold mb-2 border-b border-gray-700 pb-1">Yield Breakdown</p>
                            <div className="space-y-1">
                              {stakingYield.breakdown.map((b, i) => (
                                <div key={i} className="flex justify-between text-[10px]">
                                  <span>{b.asset} staking</span>
                                  <span>${formatLargeNumber(b.annualYieldUsd)}/yr</span>
                                </div>
                              ))}
                              <div className="mt-2 pt-1 border-t border-gray-700 flex justify-between text-xs font-bold text-green-400">
                                <span>Total Gross Yield</span>
                                <span>${formatLargeNumber(annualRevenueUsd)}</span>
                              </div>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </p>
                  <p className="text-xs text-gray-400">
                    Annual Network Revenue
                  </p>
                </div>
              )}

              {/* Crypto fund/ETF/LST investments */}
              {displayCompany.cryptoInvestments && displayCompany.cryptoInvestments.map((investment, idx) => {
                // Get dynamic exchange rate if available, otherwise use static
                const lstData = investment.lstConfigId ? prices?.lst?.[investment.lstConfigId] : undefined;
                const dynamicRate = lstData?.exchangeRate;
                const exchangeRate = dynamicRate || investment.exchangeRate || 1;
                const isLiveRate = !!dynamicRate;

                // Calculate current value for LSTs or use fairValue for funds
                let currentValue = investment.fairValue;
                let underlyingAmount = investment.underlyingAmount || 0;
                if (investment.type === "lst" && investment.lstAmount && prices) {
                  underlyingAmount = investment.lstAmount * exchangeRate;
                  const lstPrice = prices.crypto[investment.underlyingAsset]?.price || 0;
                  currentValue = underlyingAmount * lstPrice;
                } else if (investment.type === "lst" && investment.underlyingAmount && prices) {
                  const lstPrice = prices.crypto[investment.underlyingAsset]?.price || 0;
                  currentValue = investment.underlyingAmount * lstPrice;
                }

                // Build tooltip for LSTs showing exchange rate calculation
                const lstTooltip = investment.type === "lst" && investment.lstAmount
                  ? `${investment.lstAmount.toLocaleString()} ${investment.name} × ${exchangeRate.toFixed(4)}x = ${underlyingAmount.toLocaleString()} ${investment.underlyingAsset}${isLiveRate ? ' (live rate)' : ' (static)'}`
                  : investment.name;

                return (
                  <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {investment.underlyingAsset} ({investment.type === "lst" ? "Staked" : investment.type})
                    </p>
                    <p className="text-lg font-bold text-purple-600">
                      +{formatLargeNumber(currentValue)}
                    </p>
                    {investment.type === "lst" && underlyingAmount > 0 ? (
                      <p className="text-xs text-gray-400" title={lstTooltip}>
                        {formatTokenAmount(underlyingAmount, investment.underlyingAsset)} via {investment.name}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 truncate" title={investment.name}>
                        {investment.name}
                      </p>
                    )}
                    {/* Exchange rate for LSTs - show if live or static */}
                    {investment.type === "lst" && investment.lstAmount && (
                      <p className={`text-xs mt-1 ${isLiveRate ? 'text-green-500' : 'text-purple-400'}`} title={lstTooltip}>
                        {investment.lstAmount.toLocaleString()} × {exchangeRate.toFixed(2)}x {isLiveRate ? '(live)' : '(static)'}
                      </p>
                    )}
                  </div>
                );
              })}
              {cashReserves > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Cash Reserves <DataFlagBadge flags={displayCompany.dataFlags} field="cash" />
                  </p>
                  <p className="text-lg font-bold text-green-600">
                   <CitationPopover
                     sourceUrl={cashSourceUrlResolved}
                     sourceLabel={displayCompany.cashSource}
                     sourceQuote={displayCompany.cashSourceQuote}
                     searchTerm={displayCompany.cashSearchTerm}
                     ticker={displayCompany.ticker}
                     metric="cash_usd"
                     confidenceScore={displayCompany.confidenceScores?.['cash_usd']}
                     jurisdiction={displayCompany.jurisdiction}
                     legacy={!cashSourceUrlResolved}
                   >
                     +{formatLargeNumber(cashReserves)}
                   </CitationPopover>
                    {!cashSourceUrlResolved && displayCompany.ticker === "MSTR" && displayCompany.cashAsOf ? (
                      <FilingCite 
                        ticker="MSTR" 
                       date="2026-01-05" 
                       anchor="cash-reserves"
                       filingType="8-K"
                     />
                   ) : !cashSourceUrlResolved && displayCompany.ticker === "BMNR" && displayCompany.cashAsOf ? (
                     <FilingCite 
                       ticker="BMNR" 
                       date="2026-02-01" 
                       anchor="holdings"
                       filingType="8-K"
                     />
                   ) : null}
                  </p>
                  <p className="text-xs text-gray-400">USD</p>
                </div>
              )}
              {totalDebt > 0 && (() => {
                // Calculate ITM converts for display
                const effectiveShares = stockPrice ? getEffectiveShares(displayCompany.ticker, displayCompany.sharesForMnav ?? 0, stockPrice) : null;
                const itmConvertValue = effectiveShares?.inTheMoneyDebtValue || 0;
                const itmConverts = effectiveShares?.breakdown.filter(b => b.type === "convertible" && b.inTheMoney) || [];
                
                return (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-red-200 dark:border-red-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Total Debt <DataFlagBadge flags={displayCompany.dataFlags} field="debt" />
                    </p>
                    <p className="text-lg font-bold text-red-600">
                      <CitationPopover
                        sourceUrl={debtSourceUrlResolved}
                        sourceLabel={displayCompany.debtSource}
                        sourceQuote={displayCompany.debtSourceQuote}
                        searchTerm={displayCompany.debtSearchTerm}
                        ticker={displayCompany.ticker}
                        metric="debt_usd"
                        confidenceScore={displayCompany.confidenceScores?.['debt_usd']}
                        jurisdiction={displayCompany.jurisdiction}
                        legacy={!debtSourceUrlResolved}
                      >
                        −{formatLargeNumber(totalDebt)}
                      </CitationPopover>
                      {!debtSourceUrlResolved && displayCompany.ticker === "MSTR" && displayCompany.debtAsOf ? (
                        <FilingCite 
                          ticker="MSTR" 
                          date="2025-11-03" 
                          anchor="long-term-debt"
                          filingType="10-Q"
                        />
                      ) : null}
                    </p>
                    <p className="text-xs text-gray-400">
                      {itmConvertValue > 0 ? (
                        <span title={`${itmConverts.length} convertible notes in-the-money at $${stockPrice?.toFixed(0)}`}>
                          Incl. {formatLargeNumber(itmConvertValue)} ITM converts
                        </span>
                      ) : (
                        "Convertibles & loans"
                      )}
                    </p>
                  </div>
                );
              })()}
              {preferredEquity > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-red-200 dark:border-red-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Preferred Equity
                  </p>
                  <p className="text-lg font-bold text-red-600">
                    <CitationPopover
                      sourceUrl={preferredSourceUrlResolved}
                      sourceLabel={displayCompany.preferredSource}
                      sourceQuote={displayCompany.preferredSourceQuote}
                      searchTerm={displayCompany.preferredSearchTerm}
                      ticker={displayCompany.ticker}
                      metric="preferred_equity_usd"
                      confidenceScore={displayCompany.confidenceScores?.['preferred_equity_usd']}
                      jurisdiction={displayCompany.jurisdiction}
                      legacy={!preferredSourceUrlResolved}
                    >
                      −{formatLargeNumber(preferredEquity)}
                    </CitationPopover>
                    {!preferredSourceUrlResolved && displayCompany.ticker === "MSTR" && displayCompany.preferredAsOf ? (
                      <FilingCite 
                        ticker="MSTR" 
                        date="2026-01-26" 
                        anchor="preferred-equity"
                        filingType="8-K"
                      />
                    ) : null}
                  </p>
                  <p className="text-xs text-gray-400">Senior to common</p>
                </div>
              )}
              </div>
            </div>
          </section>
        )}

        {/* Key Metrics */}
        <section className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-lg">📊</span>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Key Metrics</h2>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">HPS</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatHpsValue(currentHps)}</p>
              <p className="text-xs text-gray-400 font-mono">
                {displayCompany.holdings.toLocaleString(undefined, { maximumFractionDigits: 3 })} / {(displayCompany.sharesForMnav ?? sharesOutstanding).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">AHPS Growth</p>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">90D</span>
                  <span className={cn("font-semibold", ahpsMetrics.ahpsGrowth90d && ahpsMetrics.ahpsGrowth90d > 0 ? "text-green-600" : ahpsMetrics.ahpsGrowth90d && ahpsMetrics.ahpsGrowth90d < 0 ? "text-red-600" : "text-gray-900 dark:text-gray-100")}>
                    {formatSignedPercent(ahpsMetrics.ahpsGrowth90d)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">1Y</span>
                  <span className={cn("font-semibold", ahpsGrowth1y && ahpsGrowth1y > 0 ? "text-green-600" : ahpsGrowth1y && ahpsGrowth1y < 0 ? "text-red-600" : "text-gray-900 dark:text-gray-100")}>
                    {formatSignedPercent(ahpsGrowth1y)}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">mNAV</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                <CitationPopover
                  sourceUrl={holdingsSourceUrlResolved}
                  sourceLabel={displayCompany.holdingsSource}
                  sourceQuote={displayCompany.sourceQuote}
                  searchTerm={displayCompany.sourceSearchTerm}
                  ticker={displayCompany.ticker}
                  metric="mnav"
                  confidenceScore={displayCompany.confidenceScores?.['mnav']}
                  jurisdiction={displayCompany.jurisdiction}
                  legacy={displayCompany.holdingsBasis === 'static_fallback'}
                >
                  {displayCompany.pendingMerger ? "—" : formatMNAV(mNAV)}
                </CitationPopover>
              </p>
              <p className="text-xs text-gray-400">{displayCompany.pendingMerger ? "N/A for pre-merger" : "EV / Crypto NAV"}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Leverage</p>
              <p className={cn("text-2xl font-bold", debtToCryptoRatio >= 1 ? "text-amber-600" : "text-gray-900 dark:text-gray-100")}>
                <CitationPopover
                  sourceUrl={debtSourceUrlResolved}
                  sourceLabel={displayCompany.debtSource}
                  sourceQuote={displayCompany.debtSourceQuote}
                  searchTerm={displayCompany.debtSearchTerm}
                  ticker={displayCompany.ticker}
                  metric="debt_usd"
                  confidenceScore={displayCompany.confidenceScores?.['debt_usd']}
                  jurisdiction={displayCompany.jurisdiction}
                  legacy={!debtSourceUrlResolved}
                >
                  {debtToCryptoRatio > 0 ? `${debtToCryptoRatio.toFixed(2)}x` : "—"}
                </CitationPopover>
              </p>
              <p className="text-xs text-gray-400">{debtToCryptoRatio >= 1 ? "High leverage" : debtToCryptoRatio > 0 ? "Net debt / crypto NAV" : "No debt"}</p>
            </div>
          </div>
          {(displayCompany.stakingPct != null && displayCompany.stakingPct > 0) || (displayCompany.quarterlyBurnUsd != null && displayCompany.quarterlyBurnUsd > 0) || displayCompany.preferredDividendAnnual || displayCompany.debtInterestAnnual || (displayCompany.btcMinedAnnual != null && displayCompany.btcMinedAnnual > 0) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
              {displayCompany.stakingPct != null && displayCompany.stakingPct > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Staking Yield</p>
                  <p className="text-2xl font-bold text-green-600">
                    +{Math.round(displayCompany.holdings * displayCompany.stakingPct * companyStakingApy).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">
                    {displayCompany.asset}/yr ({(displayCompany.stakingPct * 100).toFixed(0)}% @ {(companyStakingApy * 100).toFixed(1)}%)
                  </p>
                </div>
              )}
              {displayCompany.quarterlyBurnUsd != null && displayCompany.quarterlyBurnUsd > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Operating Burn</p>
                  <p className="text-2xl font-bold text-red-600">-${(displayCompany.quarterlyBurnUsd / 1e6).toFixed(0)}M</p>
                  <p className="text-xs text-gray-400">USD/qtr</p>
                </div>
              )}
              {(displayCompany.preferredDividendAnnual || displayCompany.debtInterestAnnual) && (() => {
                const annualBurn = (displayCompany.quarterlyBurnUsd || 0) * 4;
                const prefDividends = displayCompany.preferredDividendAnnual || 0;
                const debtInterest = displayCompany.debtInterestAnnual || 0;
                const totalObligations = annualBurn + prefDividends + debtInterest;
                if (totalObligations <= 0) return null;
                return (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cash Obligations</p>
                    <p className="text-2xl font-bold text-amber-600">${(totalObligations / 1e6).toFixed(0)}M</p>
                    <p className="text-xs text-gray-400">Annual burn + debt/dividend obligations</p>
                  </div>
                );
              })()}
              {(displayCompany.btcMinedAnnual != null && displayCompany.btcMinedAnnual > 0) && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Annual Mining</p>
                  <p className="text-2xl font-bold text-orange-600">+{displayCompany.btcMinedAnnual.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">BTC/yr</p>
                </div>
              )}
            </div>
          ) : null}
        </section>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* CHARTS SECTION */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-lg">📈</span>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Charts</h2>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Unified Chart Section */}
        <div className="mb-8 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          {/* Chart type toggles */}
          <div className="flex justify-center gap-6 mb-4">
            {(["price", "volume", "mnav", "hps"] as const).map((mode) => (
              <label key={mode} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="chartMode"
                  checked={chartMode === mode}
                  onChange={() => setChartMode(mode)}
                  className="w-4 h-4 border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-base font-semibold text-gray-900 dark:text-white">
                  {mode === "price" ? "Price" : mode === "volume" ? "Volume" : mode === "mnav" ? "mNAV" : "HPS"}
                </span>
              </label>
            ))}
          </div>
          
          {/* Time range selector */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="flex gap-1">
              {(["1d", "7d", "1mo", "1y", "all"] as const).map((value) => {
                const label = value === "1d" 
                  ? (chartMode === "volume" ? "1D" : "24H")
                  : value === "7d" ? "7D"
                  : value === "1mo" ? "1M"
                  : value === "1y" ? "1Y"
                  : "ALL";
                return (
                  <button
                    key={value}
                    onClick={() => chartMode === "mnav" ? handleMnavTimeRangeChange(value) : handleTimeRangeChange(value)}
                    className={cn(
                      "px-3 py-1 text-sm rounded-md transition-colors",
                      (chartMode === "mnav" ? mnavTimeRange : timeRange) === value
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Chart content */}
          {(chartMode === "price" || chartMode === "volume") && (
            historyLoading ? (
              <div className="h-[400px] flex items-center justify-center text-gray-500">
                Loading chart...
              </div>
            ) : history && history.length > 0 ? (
              <StockChart data={history} chartMode={chartMode === "volume" ? "volume" : "price"} onChartModeChange={(m) => setChartMode(m)} />
            ) : (
              <div className="h-[400px] flex items-center justify-center text-gray-500">
                No historical data available
              </div>
            )
          )}
          
          {chartMode === "mnav" && mNAV && stockPrice > 0 && cryptoPrice > 0 && !displayCompany.pendingMerger && (
            <CompanyMNAVChart
              ticker={displayCompany.ticker}
              asset={displayCompany.asset}
              currentMNAV={mNAV}
              currentStockPrice={stockPrice}
              currentCryptoPrice={cryptoPrice}
              timeRange={mnavTimeRange}
              interval={mnavInterval}
              className=""
              companyData={{
                holdings: displayCompany.holdings,
                sharesForMnav: displayCompany.sharesForMnav ?? 0,
                totalDebt: displayCompany.totalDebt ?? 0,
                preferredEquity: displayCompany.preferredEquity ?? 0,
                cashReserves: displayCompany.cashReserves ?? 0,
                restrictedCash: displayCompany.restrictedCash ?? 0,
                asset: displayCompany.asset,
                currency: displayCompany.currency,
              }}
            />
          )}
          
        {chartMode === "hps" && (
            <HoldingsPerShareChart
              ticker={displayCompany.ticker}
              asset={displayCompany.asset}
              currentHoldingsPerShare={holdingsPerShare}
              className=""
            />
          )}
        </div>

        {/* Strategy / Overview */}
        <div className="mb-4 mt-8 flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Strategy / Overview</h2>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg mb-8 p-6">
          <div className="flex items-center gap-3 mb-6">
            {displayCompany.website && (
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
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                Website
              </a>
            )}
            {displayCompany.twitter && (
              <a
                href={`https://twitter.com/${displayCompany.twitter.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackCitationSourceClick({
                    href: displayCompany.twitter ? `https://twitter.com/${displayCompany.twitter.replace('@', '')}` : "",
                    ticker: displayCompany.ticker,
                  })
                }
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                {displayCompany.twitter}
              </a>
            )}
          </div>

          {displayCompany.description && (
            <div className="mb-6">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{displayCompany.description}</p>
            </div>
          )}

          {(displayCompany.founded || displayCompany.headquarters || displayCompany.ceo) && (
            <div className="flex flex-wrap gap-3 mb-6">
              {displayCompany.founded && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  <span className="text-gray-500 dark:text-gray-400 mr-1">Founded:</span> {displayCompany.founded}
                </span>
              )}
              {displayCompany.headquarters && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  <span className="text-gray-500 dark:text-gray-400 mr-1">HQ:</span> {displayCompany.headquarters}
                </span>
              )}
              {displayCompany.ceo && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  <span className="text-gray-500 dark:text-gray-400 mr-1">CEO:</span> {displayCompany.ceo}
                </span>
              )}
            </div>
          )}

          {(intel?.strategySummary || displayCompany.strategy || displayCompany.notes) && (
            <div className="mb-6">
              {intel?.strategySummary ? (
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{intel.strategySummary}</p>
              ) : (
                <>
                  {displayCompany.strategy && (
                    <p className="text-gray-700 dark:text-gray-300 mb-2"><span className="font-medium">Strategy:</span> {displayCompany.strategy}</p>
                  )}
                  {displayCompany.notes && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{displayCompany.notes}</p>
                  )}
                </>
              )}
            </div>
          )}

          {intel?.keyBackers && intel.keyBackers.length > 0 && (
            <div className="mb-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
                Key Backers & Investors
              </h4>
              <div className="flex flex-wrap gap-2">
                {intel.keyBackers.map((backer, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full font-medium"
                  >
                    {backer}
                  </span>
                ))}
              </div>
            </div>
          )}

          {intel?.recentDevelopments && intel.recentDevelopments.length > 0 && (
            <div className="mb-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
                Recent Developments
              </h4>
              <ul className="space-y-2">
                {intel.recentDevelopments.map((dev, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                    <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-indigo-500" />
                    <span>{dev}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {intel?.outlook2026 && (() => {
            const outlookItems = intel.outlook2026
              .split(/(?:^|\n)\s*[-•]\s*|(?<=[.!])\s+/)
              .map(s => s.trim())
              .filter(s => s.length > 0 && !s.startsWith('**'));

            return (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Outlook & Catalysts
                </h4>
                <ul className="space-y-2">
                  {outlookItems.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                      <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-purple-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}
        </div>

        {!displayCompany.pendingMerger && (
          <div className="mb-8">
            <MnavCalculationCard
              ticker={displayCompany.ticker}
              asset={displayCompany.asset}
              marketCap={marketCap}
              totalDebt={totalDebt}
              preferredEquity={preferredEquity}
              cashReserves={cashReserves}
              restrictedCash={displayCompany.restrictedCash}
              holdings={holdingsNative}
              cryptoPrice={cryptoPrice}
              holdingsValue={cryptoHoldingsValue}
              mNAV={mNAV}
              sharesForMnav={displayCompany.sharesForMnav}
              stockPrice={stockPrice}
              hasDilutiveInstruments={!!effectiveSharesResult?.breakdown?.length}
              basicShares={effectiveSharesResult?.basic}
              itmDilutionShares={effectiveSharesResult ? effectiveSharesResult.diluted - effectiveSharesResult.basic : undefined}
              itmDebtAdjustment={effectiveSharesResult?.inTheMoneyDebtValue}
              sharesSourceUrl={sharesSourceUrlResolved}
              sharesSource={displayCompany.sharesSource}
              sharesAsOf={displayCompany.sharesAsOf}
              debtSourceUrl={debtSourceUrlResolved}
              debtSource={displayCompany.debtSource}
              debtAsOf={displayCompany.debtAsOf}
              cashSourceUrl={cashSourceUrlResolved}
              cashSource={displayCompany.cashSource}
              cashAsOf={displayCompany.cashAsOf}
              preferredSourceUrl={preferredSourceUrlResolved}
              preferredSource={displayCompany.preferredSource}
              preferredAsOf={displayCompany.preferredAsOf}
              holdingsSourceUrl={holdingsSourceUrlResolved}
              holdingsSource={displayCompany.holdingsSource}
              holdingsAsOf={displayCompany.holdingsLastUpdated}
              holdingsBasis={holdingsBasis}
            />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* DATA SECTION */}
        <div className="mb-4 mt-8 flex items-center gap-2">
          <span className="text-lg">📁</span>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</h2>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Provenance Cards - only show if company has provenance data */}
        {(displayCompany.provenanceFile || displayCompany.holdingsNative || displayCompany.costBasisAvg) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* Data Freshness Indicator */}
            {displayCompany.provenanceFile && (
              <DataFreshnessIndicator company={displayCompany} />
            )}
            
            {/* Holdings Breakdown (for multi-form treasuries like ETH+LsETH) */}
            {(displayCompany.holdingsNative || displayCompany.holdingsLsETH || displayCompany.holdingsStaked) && cryptoPrice > 0 && (
              <HoldingsBreakdownCard company={displayCompany} assetPrice={cryptoPrice} />
            )}
            
            {/* Cost Basis & Unrealized P/L */}
            {displayCompany.costBasisAvg && cryptoPrice > 0 && (
              <CostBasisCard company={displayCompany} assetPrice={cryptoPrice} />
            )}
          </div>
        )}

        {/* D1 metric history (balance sheet + shares) */}
        {metricHistory?.success && metricHistory.series && (
          <div className="mb-4">
            <CompanyMetricHistorySection
              title="Balance sheet & shares history"
              metrics={[...HISTORY_D1_METRICS]}
              series={metricHistory.series}
            />
          </div>
        )}

        {/* Liquidity & Debt Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">
              Liquidity &amp; Debt
            </h2>
            {hasUnmodeledDebt && (
              <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                ⚠️ {formatLargeNumber(debtDiscrepancy)} Unmodeled Debt
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DebtMaturityChart stats={debtStats} />
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm uppercase tracking-tight mb-4">Solvency &amp; Interest</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase mb-1">Interest Coverage Ratio</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    annualRevenueUsd > (debtStats.annualInterestExpense || 0) ? "text-green-600" : "text-amber-600"
                  )}>
                    {debtStats.annualInterestExpense > 0 
                      ? (annualRevenueUsd / debtStats.annualInterestExpense).toFixed(1) + "x"
                      : "∞"}
                  </p>
                  <p className="text-xs text-gray-400">Yield Revenue / Annual Interest</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase mb-1">Maturity Risk</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    debtStats.maturityConcentration > 0.3 ? "text-red-600" : "text-gray-900 dark:text-gray-100"
                  )}>
                    {debtStats.maturityConcentration > 0.3 ? "HIGH" : "LOW"}
                  </p>
                  <p className="text-xs text-gray-400">{formatPercent(debtStats.maturityConcentration)} of principal due &lt; 24mo</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Company Journey (Adoption Milestones) */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight mb-4">
            Company Journey
          </h2>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <AdoptionTimeline ticker={displayCompany.ticker} />
          </div>
        </div>

        {/* Scheduled Events (debt maturities, pending verifications) */}
        <details className="mb-4 bg-gray-50 dark:bg-gray-900 rounded-lg group">
          <summary className="p-4 cursor-pointer flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Scheduled Events</h3>
            <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-4 pb-4">
            <ScheduledEvents
              ticker={displayCompany.ticker}
              stockPrice={stockPrice}
              className=""
            />
          </div>
        </details>

        {/* SEC Filing Timeline - SBET has full provenance data */}
        {displayCompany.ticker === "SBET" && displayCompany.secCik && (
          <div className="mb-4">
            <SECFilingTimeline
              ticker={displayCompany.ticker}
              cik={SBET_CIK}
              filings={getSBETFilingsList().map((f) => {
                return {
                  date: f.periodDate,
                  filedDate: f.filedDate,
                  accession: f.accession,
                  formType: f.formType,
                  items: f.items,
                  url: f.url,
                  hasHoldingsUpdate: f.hasHoldingsUpdate,
                };
              }).sort((a, b) => new Date(b.filedDate).getTime() - new Date(a.filedDate).getTime())}
              asset={displayCompany.asset}
            />
          </div>
        )}

        {/* Holdings History */}
        <details className="mb-4 bg-gray-50 dark:bg-gray-900 rounded-lg group">
          <summary className="p-4 cursor-pointer flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Holdings History</h3>
            <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-4 pb-4">
            <HoldingsHistoryTable
              ticker={displayCompany.ticker}
              asset={displayCompany.asset}
              className=""
            />
          </div>
        </details>

          </>
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
