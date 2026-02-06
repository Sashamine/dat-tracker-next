"use client";

import { Suspense, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useCompany, useCompanies } from "@/lib/hooks/use-companies";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { enrichCompany, enrichAllCompanies } from "@/lib/hooks/use-company-data";
import { AppSidebar } from "@/components/app-sidebar";
import { OverviewSidebar } from "@/components/overview-sidebar";
import { Company } from "@/lib/types";
import {
  useStockHistory,
  TimeRange,
  ChartInterval,
  VALID_INTERVALS,
  DEFAULT_INTERVAL,
  INTERVAL_LABELS,
} from "@/lib/hooks/use-stock-history";
import { StockChart } from "@/components/stock-chart";
import { CompanyMNAVChart } from "@/components/company-mnav-chart";
import { HoldingsPerShareChart } from "@/components/holdings-per-share-chart";
import { HoldingsHistoryTable } from "@/components/holdings-history-table";
import { CompanyFilings } from "@/components/company-filings";
import { ScheduledEvents } from "@/components/scheduled-events";
import { Badge } from "@/components/ui/badge";
import { DataFlagBadge, FPIBadge } from "@/components/ui/data-flag-badge";
import { cn } from "@/lib/utils";
import {
  calculateNAV,
  calculateNAVPerShare,
  calculateNAVDiscount,
  calculateHoldingsPerShare,
  calculateNetYield,
  determineDATPhase,
  formatLargeNumber,
  formatTokenAmount,
  formatPercent,
  formatMNAV,
  NETWORK_STAKING_APY,
} from "@/lib/calculations";
import { getMarketCapForMnavSync } from "@/lib/utils/market-cap";
import { getCompanyMNAV } from "@/lib/hooks/use-mnav-stats";
import { CryptoPriceCell, StockPriceCell } from "@/components/price-cell";
import { StalenessBadge } from "@/components/staleness-indicator";
import { Citation } from "@/components/citation";
import { FilingCite } from "@/components/wiki-citation";
import { getCompanyIntel } from "@/lib/data/company-intel";
import { COMPANY_SOURCES } from "@/lib/data/company-sources";
import { MobileHeader } from "@/components/mobile-header";
import { getEffectiveShares } from "@/lib/data/dilutive-instruments";

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

// Tier colors
const tierColors: Record<number, string> = {
  1: "bg-green-500/10 text-green-600 border-green-500/20",
  2: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  3: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

// Source link component for provenance
function SourceLink({ url, label }: { url?: string; label?: string }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
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
  const { data: prices } = usePricesStream();

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
  const { data: history, isLoading: historyLoading } = useStockHistory(ticker, timeRange, interval);

  // mNAV chart timeframe (separate from stock price)
  const [mnavTimeRange, setMnavTimeRange] = useState<TimeRange>("1y");
  const [mnavInterval, setMnavInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);

  // Company intel - must be called before any early returns (React hooks rule)
  const intel = useMemo(() => getCompanyIntel(ticker), [ticker]);

  // Fetch all companies for sidebar stats (shared cache with main page)
  // This is the SAME data source as the main page, ensuring mNAV consistency
  const { data: companiesData, isLoading: isLoadingCompanies } = useCompanies();
  const allCompanies = useMemo(() => {
    const baseCompanies = companiesData?.companies || [];
    return enrichAllCompanies(baseCompanies);
  }, [companiesData]);

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

  // Wait for BOTH data sources to load to ensure consistency with main page
  if (isLoadingCompany || isLoadingCompanies) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading company data...</p>
        </div>
      </div>
    );
  }

  // Prefer company from allCompanies (same source as main page) for consistency
  // Fall back to separately fetched company if not found
  const companyFromAllCompanies = allCompanies.find(c => c.ticker === ticker);
  const displayCompany = companyFromAllCompanies || company;

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
  const cryptoPrice = prices?.crypto[displayCompany.asset]?.price || 0;
  const cryptoChange = prices?.crypto[displayCompany.asset]?.change24h;
  const stockData = prices?.stocks[displayCompany.ticker];
  const stockPrice = stockData?.price || 0;
  const stockChange = stockData?.change24h;
  const { marketCap } = getMarketCapForMnavSync(displayCompany, stockData, prices?.forex);

  // Other assets (cash + investments)
  const cashReserves = displayCompany.cashReserves || 0;
  const otherInvestments = displayCompany.otherInvestments || 0;
  const otherAssets = cashReserves + otherInvestments;
  const cryptoHoldingsValue = displayCompany.holdings * cryptoPrice;

  // Calculate total crypto NAV including secondary holdings and crypto investments
  let totalCryptoNav = cryptoHoldingsValue;
  if (displayCompany.secondaryCryptoHoldings && prices) {
    for (const holding of displayCompany.secondaryCryptoHoldings) {
      const holdingPrice = prices.crypto[holding.asset]?.price || 0;
      totalCryptoNav += holding.amount * holdingPrice;
    }
  }

  // Crypto investments (fund/ETF/LST positions)
  // - For LSTs: use dynamic exchange rate × lstAmount × cryptoPrice
  // - For funds/ETFs: use fairValue (static USD value from SEC filing)
  let cryptoInvestmentsValue = 0;
  if (displayCompany.cryptoInvestments && prices) {
    for (const investment of displayCompany.cryptoInvestments) {
      if (investment.type === "lst" && investment.lstAmount) {
        // LST: calculate using dynamic exchange rate if available
        const lstPrice = prices.crypto[investment.underlyingAsset]?.price || 0;

        // Get dynamic exchange rate from prices.lst or fall back to static
        let exchangeRate = investment.exchangeRate || 1;
        if (investment.lstConfigId && (prices as any).lst?.[investment.lstConfigId]) {
          exchangeRate = (prices as any).lst[investment.lstConfigId].exchangeRate;
        }

        const underlyingAmount = investment.lstAmount * exchangeRate;
        cryptoInvestmentsValue += underlyingAmount * lstPrice;
      } else if (investment.type === "lst" && investment.underlyingAmount) {
        // LST with static underlyingAmount (legacy/fallback)
        const lstPrice = prices.crypto[investment.underlyingAsset]?.price || 0;
        cryptoInvestmentsValue += investment.underlyingAmount * lstPrice;
      } else {
        // Fund/ETF/equity: use fair value from balance sheet
        cryptoInvestmentsValue += investment.fairValue;
      }
    }
    totalCryptoNav += cryptoInvestmentsValue;
  }

  // Leverage ratio = Net Debt / Crypto NAV (net debt = total debt - cash)
  const netDebt = Math.max(0, (displayCompany.totalDebt || 0) - cashReserves);
  const debtToCryptoRatio = totalCryptoNav > 0 ? netDebt / totalCryptoNav : 0;

  // Calculate metrics (including other assets in NAV)
  const nav = calculateNAV(displayCompany.holdings, cryptoPrice, cashReserves, otherInvestments);

  // mNAV uses shared function with displayCompany (same source as main page)
  const mNAV = getCompanyMNAV(displayCompany, prices);

  // Use sharesForMnav from company data (same as mNAV calc), fall back to marketCap/price
  const sharesOutstanding = displayCompany.sharesForMnav || (marketCap && stockPrice ? marketCap / stockPrice : 0);
  const totalDebt = displayCompany.totalDebt || 0;
  const preferredEquity = displayCompany.preferredEquity || 0;
  const navPerShare = calculateNAVPerShare(displayCompany.holdings, cryptoPrice, sharesOutstanding, cashReserves, otherInvestments, totalDebt, preferredEquity);
  const navDiscount = calculateNAVDiscount(stockPrice, navPerShare);
  const holdingsPerShare = calculateHoldingsPerShare(displayCompany.holdings, sharesOutstanding);

  // Network staking APY
  const networkStakingApy = NETWORK_STAKING_APY[displayCompany.asset] || 0;
  const companyStakingApy = displayCompany.stakingApy || networkStakingApy;

  // Net yield calculation
  const { netYieldPct } = calculateNetYield(
    displayCompany.holdings,
    displayCompany.stakingPct || 0,
    companyStakingApy,
    displayCompany.quarterlyBurnUsd || 0,
    cryptoPrice
  );

  // Phase determination
  const phase = determineDATPhase(navDiscount, false, null);


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
              <Badge variant="outline" className={cn("font-medium", tierColors[displayCompany.tier])}>
                T{displayCompany.tier}
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
            </div>
            <p className="mt-1 text-lg text-gray-600 dark:text-gray-400">{displayCompany.name}</p>
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
              {displayCompany.website && (
                <a
                  href={displayCompany.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <span>Website</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              )}
              {displayCompany.twitter && (
                <a
                  href={displayCompany.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
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

        {/* Key Valuation Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              mNAV
              <span 
                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] text-gray-500 dark:text-gray-400 cursor-help"
                title="EV ÷ Crypto NAV"
              >?</span>
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {displayCompany.pendingMerger ? "—" : formatMNAV(mNAV)}
            </p>
            <p className="text-xs text-gray-400">
              {displayCompany.pendingMerger ? "N/A for pre-merger" : "EV / Crypto NAV"}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              Leverage
              <span 
                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] text-gray-500 dark:text-gray-400 cursor-help"
                title="Net Debt ÷ Crypto NAV. Shows how much debt the company has relative to its crypto holdings. Higher leverage = more risk, can inflate mNAV."
              >?</span>
            </p>
            <p className={cn(
              "text-2xl font-bold",
              debtToCryptoRatio >= 1 ? "text-amber-600" : "text-gray-900 dark:text-gray-100"
            )}>
              {debtToCryptoRatio > 0 ? `${debtToCryptoRatio.toFixed(2)}x` : "—"}
            </p>
            <p className="text-xs text-gray-400 font-mono">
              {debtToCryptoRatio >= 1 ? (
                <span className="text-amber-600">High - mNAV elevated by debt</span>
              ) : debtToCryptoRatio > 0 ? (
                <span title="(Debt - Cash) / Crypto NAV">
                  ({formatLargeNumber(totalDebt)} - {formatLargeNumber(cashReserves)}) / {formatLargeNumber(cryptoHoldingsValue)}
                </span>
              ) : (
                "No debt"
              )}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              Equity NAV/Share
              <span 
                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] text-gray-500 dark:text-gray-400 cursor-help"
                title="Net asset value per share. (Crypto NAV + Cash − Debt − Preferred) ÷ Shares"
              >?</span>
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {navPerShare ? `$${navPerShare.toFixed(2)}` : "—"}
            </p>
            <p className="text-xs text-gray-400">
              {navPerShare && displayCompany.sharesForMnav ? (
                <span className="font-mono" title="Equity NAV / Shares Outstanding">
                  {formatLargeNumber(nav + cryptoInvestmentsValue - totalDebt - preferredEquity)} / {(displayCompany.sharesForMnav / 1e6).toFixed(0)}M
                </span>
              ) : navDiscount !== null ? (
                <span className={navDiscount >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatPercent(navDiscount, true)} {navDiscount < 0 ? "discount" : "premium"}
                </span>
              ) : null}
            </p>
          </div>
          {displayCompany.stakingPct != null && displayCompany.stakingPct > 0 && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Staking Yield</p>
              <p className="text-2xl font-bold text-green-600">
                +{Math.round(displayCompany.holdings * displayCompany.stakingPct * companyStakingApy).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">
                {displayCompany.asset}/yr ({(displayCompany.stakingPct * 100).toFixed(0)}% @ {(companyStakingApy * 100).toFixed(1)}%)
              </p>
              {displayCompany.stakingSourceUrl && (
                <a
                  href={displayCompany.stakingSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  SEC Filing{displayCompany.stakingAsOf ? ` (${new Date(displayCompany.stakingAsOf).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})` : ""}
                </a>
              )}
            </div>
          )}
          {displayCompany.quarterlyBurnUsd != null && displayCompany.quarterlyBurnUsd > 0 && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Operating Burn</p>
              <p className="text-2xl font-bold text-red-600">
                -${(displayCompany.quarterlyBurnUsd * 4 / 1e6).toFixed(0)}M
                {displayCompany.burnAsOf && (
                  <FilingCite 
                    ticker={displayCompany.ticker} 
                    date={displayCompany.burnAsOf} 
                    anchor="operating-burn"
                    filingType="10-Q"
                  />
                )}
              </p>
              <p className="text-xs text-gray-400">
                USD/yr (${(displayCompany.quarterlyBurnUsd / 1e6).toFixed(1)}M/qtr)
              </p>
            </div>
          )}
          {/* Total Cash Obligations - Only show when there's more than just burn (debt interest or preferred divs) */}
          {(displayCompany.preferredDividendAnnual || displayCompany.debtInterestAnnual) && (
            (() => {
              const annualBurn = (displayCompany.quarterlyBurnUsd || 0) * 4;
              const prefDividends = displayCompany.preferredDividendAnnual || 0;
              const debtInterest = displayCompany.debtInterestAnnual || 0;
              const totalObligations = annualBurn + prefDividends + debtInterest;
              if (totalObligations <= 0) return null;
              return (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Cash Obligations
                    {displayCompany.burnEstimated && <span className="text-amber-500 ml-1">(est.)</span>}
                  </p>
                  <p className="text-2xl font-bold text-amber-600">
                    ${(totalObligations / 1e6).toFixed(0)}M
                    {displayCompany.ticker === "MSTR" ? (
                      <FilingCite 
                        ticker="MSTR" 
                        date="2025-12-01" 
                        anchor="cash-obligations"
                        filingType="8-K"
                      />
                    ) : (
                      <SourceLink url={displayCompany.cashObligationsSourceUrl} label={displayCompany.cashObligationsSource} />
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    {annualBurn > 0 && (prefDividends > 0 || debtInterest > 0) ? (
                      <>Burn ${(annualBurn / 1e6).toFixed(0)}M + Debt/Div ${((prefDividends + debtInterest) / 1e6).toFixed(0)}M</>
                    ) : (
                      <>Debt interest + preferred dividends/yr</>
                    )}
                  </p>
                </div>
              );
            })()
          )}
          {(displayCompany.btcMinedAnnual != null && displayCompany.btcMinedAnnual > 0) && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Annual Mining</p>
              <p className="text-2xl font-bold text-orange-600">
                +{displayCompany.btcMinedAnnual.toLocaleString()}
                <SourceLink url={displayCompany.btcMinedSourceUrl} label={displayCompany.btcMinedSource} />
              </p>
              <p className="text-xs text-gray-400">BTC/yr</p>
            </div>
          )}
        </div>

        {/* Definitions */}
        <details className="mb-8 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
            📖 Key Definitions
          </summary>
          <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300">Crypto NAV</p>
              <p className="text-gray-500 dark:text-gray-400">
                Value of crypto holdings at current market price.
                <br />
                <span className="font-mono text-xs">{displayCompany.asset} Holdings × {displayCompany.asset} Price</span>
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300">EV (Enterprise Value)</p>
              <p className="text-gray-500 dark:text-gray-400">
                Total value of the company including debt obligations.
                <br />
                <span className="font-mono text-xs">Market Cap + Debt + Preferred − Cash</span>
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300">mNAV (Market NAV Multiple)</p>
              <p className="text-gray-500 dark:text-gray-400">
                How much you&apos;re paying per dollar of crypto.
                <br />
                <span className="font-mono text-xs">EV ÷ Crypto NAV</span>
                <br />
                <span className="text-xs">1.0x = fair value, &gt;1.0x = premium, &lt;1.0x = discount</span>
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300">Equity NAV</p>
              <p className="text-gray-500 dark:text-gray-400">
                Net assets belonging to common shareholders.
                <br />
                <span className="font-mono text-xs">Crypto NAV + Cash − Debt − Preferred</span>
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300">Equity NAV/Share</p>
              <p className="text-gray-500 dark:text-gray-400">
                Net asset value per share — what each share is &quot;worth&quot; based on assets.
                <br />
                <span className="font-mono text-xs">Equity NAV ÷ Shares Outstanding</span>
                <br />
                <span className="text-xs">Compare to stock price to see premium/discount</span>
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300">Leverage</p>
              <p className="text-gray-500 dark:text-gray-400">
                Debt relative to crypto holdings. Higher leverage = more risk.
                <br />
                <span className="font-mono text-xs">(Total Debt − Cash) ÷ Crypto NAV</span>
                <br />
                <span className="text-xs">0x = no debt, &gt;1x = net debt exceeds crypto value</span>
              </p>
            </div>
          </div>
        </details>

        {/* Equity Value - Balance Sheet Summary */}
        {(otherAssets > 0 || cryptoHoldingsValue > 0) && (
          <details className="mb-8 bg-gray-50 dark:bg-gray-900 rounded-lg group">
            <summary className="p-4 cursor-pointer flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Equity Value (What Shareholders Own)
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  {formatLargeNumber(nav + cryptoInvestmentsValue - totalDebt - preferredEquity)}
                </span>
                <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </summary>
            <div className="px-4 pb-4">

            {/* Lead with Equity NAV */}
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
                    {formatLargeNumber(nav + cryptoInvestmentsValue - totalDebt - preferredEquity)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Market Cap</p>
                  <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                    {formatLargeNumber(marketCap)}
                  </p>
                </div>
              </div>
            </div>

            {/* Equation breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 mb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">How it's calculated</p>
              <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
                <span className="text-gray-900 dark:text-gray-100">{formatLargeNumber(cryptoHoldingsValue)}</span>
                <span className="text-gray-400"> {displayCompany.asset}</span>
                {displayCompany.cryptoInvestments && displayCompany.cryptoInvestments.map((investment, idx) => {
                  // Get dynamic exchange rate if available
                  const lstData = investment.lstConfigId && (prices as any)?.lst?.[investment.lstConfigId];
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
                    <span className="text-green-600"> + {formatLargeNumber(cashReserves)}</span>
                    <span className="text-gray-400"> cash</span>
                  </>
                )}
                {totalDebt > 0 && (
                  <>
                    <span className="text-red-600"> − {formatLargeNumber(totalDebt)}</span>
                    <span className="text-gray-400"> debt</span>
                  </>
                )}
                {preferredEquity > 0 && (
                  <>
                    <span className="text-red-600"> − {formatLargeNumber(preferredEquity)}</span>
                    <span className="text-gray-400"> preferred</span>
                  </>
                )}
                <span className="text-indigo-600 font-semibold"> = {formatLargeNumber(nav + cryptoInvestmentsValue - totalDebt - preferredEquity)}</span>
              </p>
            </div>

            {/* Detailed grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {displayCompany.asset} Holdings {cryptoInvestmentsValue > 0 && "(Direct)"}
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatLargeNumber(cryptoHoldingsValue)}
                  {displayCompany.ticker === "MSTR" && displayCompany.holdingsSource === "sec-filing" ? (
                    <FilingCite 
                      ticker="MSTR" 
                      date="2026-02-02" 
                      anchor="btc-holdings"
                      filingType="8-K"
                    />
                  ) : displayCompany.holdingsSourceUrl && displayCompany.holdingsSource === "sec-filing" && (
                    <FilingCite 
                      ticker={displayCompany.ticker} 
                      date={displayCompany.holdingsLastUpdated || ""} 
                      highlight={`${displayCompany.holdings.toLocaleString()}`}
                      filingType="8-K"
                    />
                  )}
                </p>
                <p className="text-xs text-gray-400">
                  {formatTokenAmount(displayCompany.holdings, displayCompany.asset)}
                </p>
              </div>
              {/* Crypto fund/ETF/LST investments */}
              {displayCompany.cryptoInvestments && displayCompany.cryptoInvestments.map((investment, idx) => {
                // Get dynamic exchange rate if available, otherwise use static
                const lstData = investment.lstConfigId && (prices as any)?.lst?.[investment.lstConfigId];
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
                    +{formatLargeNumber(cashReserves)}
                    {displayCompany.ticker === "MSTR" && displayCompany.cashAsOf ? (
                      <FilingCite 
                        ticker="MSTR" 
                        date="2026-01-05" 
                        anchor="cash-reserves"
                        filingType="8-K"
                      />
                    ) : (
                      <SourceLink url={displayCompany.cashSourceUrl} label={displayCompany.cashSource} />
                    )}
                  </p>
                  <p className="text-xs text-gray-400">USD</p>
                </div>
              )}
              {totalDebt > 0 && (() => {
                // Calculate ITM converts for display
                const effectiveShares = stockPrice ? getEffectiveShares(displayCompany.ticker, displayCompany.sharesForMnav || 0, stockPrice) : null;
                const itmConvertValue = effectiveShares?.inTheMoneyDebtValue || 0;
                const itmConverts = effectiveShares?.breakdown.filter(b => b.type === "convertible" && b.inTheMoney) || [];
                
                return (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-red-200 dark:border-red-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Total Debt <DataFlagBadge flags={displayCompany.dataFlags} field="debt" />
                    </p>
                    <p className="text-lg font-bold text-red-600">
                      −{formatLargeNumber(totalDebt)}
                      {displayCompany.ticker === "MSTR" && displayCompany.debtAsOf ? (
                        <FilingCite 
                          ticker="MSTR" 
                          date="2025-11-03" 
                          anchor="long-term-debt"
                          filingType="10-Q"
                        />
                      ) : (
                        <SourceLink url={displayCompany.debtSourceUrl} label={displayCompany.debtSource} />
                      )}
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
                    −{formatLargeNumber(preferredEquity)}
                    {displayCompany.ticker === "MSTR" && displayCompany.preferredAsOf ? (
                      <FilingCite 
                        ticker="MSTR" 
                        date="2026-01-26" 
                        anchor="preferred-equity"
                        filingType="8-K"
                      />
                    ) : (
                      <SourceLink url={displayCompany.preferredSourceUrl} label={displayCompany.preferredSource} />
                    )}
                  </p>
                  <p className="text-xs text-gray-400">Senior to common</p>
                </div>
              )}
            </div>
          </div>
          </details>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* CHARTS SECTION */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Charts</h2>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Chart with Time Range Selector */}
        <details open className="mb-4 bg-gray-50 dark:bg-gray-900 rounded-lg group">
          <summary className="p-4 cursor-pointer flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Stock Price</h2>
            <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-4 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              {/* Time Range Buttons */}
              <div className="flex gap-1">
                {([
                  { value: "1d", label: "24H" },
                  { value: "7d", label: "7D" },
                  { value: "1mo", label: "1M" },
                  { value: "1y", label: "1Y" },
                  { value: "all", label: "ALL" },
                ] as const).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => handleTimeRangeChange(value)}
                    className={cn(
                      "px-3 py-1 text-sm rounded-md transition-colors",
                      timeRange === value
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {/* Interval Buttons (only show if multiple options) */}
              {VALID_INTERVALS[timeRange].length > 1 && (
                <>
                  <span className="text-gray-400 text-sm hidden sm:inline">|</span>
                  <div className="flex gap-1">
                    {VALID_INTERVALS[timeRange].map((int) => (
                      <button
                        key={int}
                        onClick={() => setInterval(int)}
                        className={cn(
                          "px-2 py-1 text-xs rounded transition-colors",
                          interval === int
                            ? "bg-gray-600 text-white"
                            : "bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-300"
                        )}
                      >
                        {INTERVAL_LABELS[int]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          {historyLoading ? (
            <div className="h-[400px] flex items-center justify-center text-gray-500">
              Loading chart...
            </div>
          ) : history && history.length > 0 ? (
            <StockChart data={history} />
          ) : (
            <div className="h-[400px] flex items-center justify-center text-gray-500">
              No historical data available
            </div>
          )}
          </div>
        </details>


        {/* mNAV History Chart */}
        {mNAV && stockPrice > 0 && cryptoPrice > 0 && !displayCompany.pendingMerger && (
          <details open className="mb-4 bg-gray-50 dark:bg-gray-900 rounded-lg group">
            <summary className="p-4 cursor-pointer flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">mNAV History</h2>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatMNAV(mNAV)}</span>
                <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </summary>
            <div className="px-4 pb-4">
              {/* mNAV Time Range Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex gap-1">
                    {([
                      { value: "1d", label: "24H" },
                      { value: "7d", label: "7D" },
                      { value: "1mo", label: "1M" },
                      { value: "1y", label: "1Y" },
                      { value: "all", label: "ALL" },
                    ] as const).map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => handleMnavTimeRangeChange(value)}
                        className={cn(
                          "px-3 py-1 text-sm rounded-md transition-colors",
                          mnavTimeRange === value
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {/* Interval Buttons (only show if multiple options) */}
                  {VALID_INTERVALS[mnavTimeRange].length > 1 && (
                    <>
                      <span className="text-gray-400 text-sm hidden sm:inline">|</span>
                      <div className="flex gap-1">
                        {VALID_INTERVALS[mnavTimeRange].map((int) => (
                          <button
                            key={int}
                            onClick={() => setMnavInterval(int)}
                            className={cn(
                              "px-2 py-1 text-xs rounded transition-colors",
                              mnavInterval === int
                                ? "bg-gray-600 text-white"
                                : "bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-300"
                            )}
                          >
                            {INTERVAL_LABELS[int]}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
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
                  sharesForMnav: displayCompany.sharesForMnav || 0,
                  totalDebt: displayCompany.totalDebt || 0,
                  preferredEquity: displayCompany.preferredEquity || 0,
                  cashReserves: displayCompany.cashReserves || 0,
                  restrictedCash: displayCompany.restrictedCash || 0,
                  asset: displayCompany.asset,
                  currency: displayCompany.currency,
                }}
              />
            </div>
          </details>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* FINANCIALS SECTION - Hidden for MSTR (redundant with mNAV breakdown) */}
        {displayCompany.ticker !== "MSTR" && (
        <>
        <div className="mb-4 mt-8 flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Financials</h2>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Treasury & Holdings */}
        <details className="mb-4 bg-gray-50 dark:bg-gray-900 rounded-lg group">
          <summary className="p-4 cursor-pointer flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Treasury & Holdings</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-gray-600 dark:text-gray-400">{formatTokenAmount(displayCompany.holdings, displayCompany.asset)}</span>
              <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </summary>
          <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">{displayCompany.asset} Holdings</p>
              <StalenessBadge
                lastUpdated={displayCompany.holdingsLastUpdated}
                source={displayCompany.holdingsSource}
                sourceUrl={displayCompany.holdingsSourceUrl}
              />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatLargeNumber(cryptoHoldingsValue)}
            </p>
            <Citation
              sourceType={displayCompany.holdingsSource}
              sourceUrl={displayCompany.holdingsSourceUrl}
              sourceDate={displayCompany.holdingsLastUpdated}
              methodology={COMPANY_SOURCES[displayCompany.ticker]?.sharesNotes}
              notes={COMPANY_SOURCES[displayCompany.ticker]?.notes}
            >
              <span className="text-sm text-gray-500 font-mono">
                {formatTokenAmount(displayCompany.holdings, displayCompany.asset)}
                <SourceLink url={displayCompany.holdingsSourceUrl} label={displayCompany.holdingsSource} />
              </span>
            </Citation>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Market Cap</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatLargeNumber(marketCap)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">{displayCompany.asset}/Share</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {holdingsPerShare ? holdingsPerShare.toFixed(6) : "—"}
            </p>
          </div>
          </div>
        </details>

        {/* Yield & Operations */}
        <details className="mb-4 bg-gray-50 dark:bg-gray-900 rounded-lg group">
          <summary className="p-4 cursor-pointer flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Yield & Operations</h3>
            <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {displayCompany.stakingPct !== undefined && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Staking</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {formatPercent(displayCompany.stakingPct)}
              </p>
              {displayCompany.stakingMethod && (
                <p className="text-xs text-gray-500">{displayCompany.stakingMethod}</p>
              )}
              {displayCompany.stakingSourceUrl && (
                <a
                  href={displayCompany.stakingSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  Source
                </a>
              )}
            </div>
          )}
          {displayCompany.costBasisAvg && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Cost Basis</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                ${displayCompany.costBasisAvg.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                {cryptoPrice > displayCompany.costBasisAvg ? (
                  <span className="text-green-600">
                    +{formatPercent((cryptoPrice - displayCompany.costBasisAvg) / displayCompany.costBasisAvg)} gain
                  </span>
                ) : (
                  <span className="text-red-600">
                    {formatPercent((cryptoPrice - displayCompany.costBasisAvg) / displayCompany.costBasisAvg)} loss
                  </span>
                )}
              </p>
              {displayCompany.costBasisSourceUrl && (
                <a
                  href={displayCompany.costBasisSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  Source
                </a>
              )}
            </div>
          )}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">{displayCompany.asset} Price</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              ${cryptoPrice.toLocaleString()}
            </p>
            {cryptoChange !== undefined && (
              <p className={cn("text-xs", cryptoChange >= 0 ? "text-green-600" : "text-red-600")}>
                {cryptoChange >= 0 ? "+" : ""}{cryptoChange.toFixed(2)}% 24h
              </p>
            )}
          </div>
          </div>
        </details>
        </>
        )}

        {/* Holdings Per Share Growth Chart */}
        <details open className="mb-8 bg-gray-50 dark:bg-gray-900 rounded-lg group">
          <summary className="p-4 cursor-pointer flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{displayCompany.asset}/Share Growth</h2>
            <div className="flex items-center gap-3">
              <span className="text-lg font-mono text-gray-900 dark:text-gray-100">
                {holdingsPerShare ? holdingsPerShare.toFixed(6) : "—"}
              </span>
              <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </summary>
          <div className="px-4 pb-4">
            <HoldingsPerShareChart
              ticker={displayCompany.ticker}
              asset={displayCompany.asset}
              currentHoldingsPerShare={holdingsPerShare}
              className=""
            />
          </div>
        </details>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* DATA SECTION */}
        <div className="mb-4 mt-8 flex items-center gap-2">
          <span className="text-lg">📁</span>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</h2>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Holdings History Table - shows each acquisition with SEC links */}
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

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* RESEARCH SECTION */}
        <div className="mb-4 mt-8 flex items-center gap-2">
          <span className="text-lg">📰</span>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Research & Filings</h2>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Comprehensive Strategy & Overview Section */}
        <details className="bg-gray-50 dark:bg-gray-900 rounded-lg mb-4 group">
          <summary className="p-6 cursor-pointer flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Strategy & Overview
            </h3>
            <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-6 pb-6">
            <div className="flex items-center gap-3 mb-6">
              {displayCompany.website && (
                <a
                  href={displayCompany.website}
                  target="_blank"
                  rel="noopener noreferrer"
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
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  {displayCompany.twitter}
                </a>
              )}
            </div>

          {/* Company Overview */}
          {displayCompany.description && (
            <div className="mb-6">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{displayCompany.description}</p>
            </div>
          )}

          {/* Company Info Pills */}
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

          {/* Strategy Summary */}
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

          {/* Key Financial Metrics Grid */}
          {(displayCompany.costBasisAvg || displayCompany.capitalRaisedAtm || displayCompany.capitalRaisedPipe ||
            displayCompany.capitalRaisedConverts || displayCompany.stakingPct || displayCompany.leverageRatio ||
            displayCompany.btcMinedAnnual || displayCompany.quarterlyBurnUsd || displayCompany.atmRemaining || displayCompany.leader) && (
            <div className="mb-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
                Key Metrics
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {displayCompany.leader && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Leadership</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">{displayCompany.leader}</p>
                  </div>
                )}
                {displayCompany.costBasisAvg && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Cost Basis</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                      ${displayCompany.costBasisAvg.toLocaleString()}
                      <SourceLink url={displayCompany.costBasisSourceUrl} label={displayCompany.costBasisSource} />
                    </p>
                  </div>
                )}
                {displayCompany.capitalRaisedAtm && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">ATM Raised</p>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
                      ${(displayCompany.capitalRaisedAtm / 1e9).toFixed(2)}B
                      <SourceLink url={displayCompany.capitalRaisedAtmSourceUrl} label={displayCompany.capitalRaisedAtmSource} />
                    </p>
                  </div>
                )}
                {displayCompany.capitalRaisedPipe && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">PIPE Raised</p>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
                      ${(displayCompany.capitalRaisedPipe / 1e9).toFixed(2)}B
                      <SourceLink url={displayCompany.capitalRaisedPipeSourceUrl} label={displayCompany.capitalRaisedPipeSource} />
                    </p>
                  </div>
                )}
                {displayCompany.capitalRaisedConverts && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Converts Raised</p>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
                      ${(displayCompany.capitalRaisedConverts / 1e9).toFixed(2)}B
                      <SourceLink url={displayCompany.capitalRaisedConvertsSourceUrl} label={displayCompany.capitalRaisedConvertsSource} />
                    </p>
                  </div>
                )}
                {displayCompany.atmRemaining != null && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">ATM Remaining</p>
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">
                      ${(displayCompany.atmRemaining / 1e9).toFixed(2)}B
                    </p>
                  </div>
                )}
                {displayCompany.stakingPct != null && displayCompany.stakingPct > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Staking Yield</p>
                    <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 mt-1">
                      +{Math.round(displayCompany.holdings * displayCompany.stakingPct * companyStakingApy).toLocaleString()} {displayCompany.asset}/yr
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {(displayCompany.stakingPct * 100).toFixed(0)}% staked @ {(companyStakingApy * 100).toFixed(1)}% APY
                    </p>
                    {displayCompany.stakingSourceUrl && (
                      <a
                        href={displayCompany.stakingSourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        SEC Filing
                      </a>
                    )}
                  </div>
                )}
                {displayCompany.leverageRatio && displayCompany.leverageRatio > 1 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Leverage Ratio</p>
                    <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mt-1">
                      {displayCompany.leverageRatio.toFixed(2)}x
                    </p>
                  </div>
                )}
                {displayCompany.btcMinedAnnual && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Annual Mining</p>
                    <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mt-1">
                      {displayCompany.btcMinedAnnual.toLocaleString()} BTC
                    </p>
                  </div>
                )}
                {/* Options display removed - will add back when options data is on-site */}
              </div>
            </div>
          )}

          {/* Key Backers */}
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

          {/* Recent Developments */}
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

          {/* Outlook & Catalysts */}
          {intel?.outlook2026 && (() => {
            // Parse outlook into bullet points (split by "- " or ". " or newlines)
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
        </details>

        {/* Press Releases */}
        {intel?.pressReleases && intel.pressReleases.length > 0 && (
          <details className="bg-gray-50 dark:bg-gray-900 rounded-lg mb-4 group">
            <summary className="p-6 cursor-pointer flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Recent Press Releases
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  {intel.pressReleases.length} releases
                </span>
                <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </summary>
            <div className="px-6 pb-6 space-y-3">
              {intel.pressReleases.slice(0, 8).map((pr, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-4 p-3 bg-white dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex-shrink-0 text-sm text-gray-500 font-mono w-24">
                    {pr.date}
                  </div>
                  <div className="flex-1">
                    {pr.url ? (
                      <a
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                      >
                        {pr.title}
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ) : (
                      <p className="font-medium text-gray-900 dark:text-gray-100">{pr.title}</p>
                    )}
                    {pr.summary && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{pr.summary}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
        {/* SEC / Regulatory Filings */}
        <details className="mb-4 bg-gray-50 dark:bg-gray-900 rounded-lg group">
          <summary className="p-4 cursor-pointer flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">SEC / Regulatory Filings</h3>
            <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-4 pb-4">
            <CompanyFilings
              ticker={displayCompany.ticker}
              companyName={displayCompany.name}
              className=""
            />
          </div>
        </details>

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
