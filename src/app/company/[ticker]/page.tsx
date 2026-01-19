"use client";

import { Suspense, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useCompany, useCompanies } from "@/lib/hooks/use-companies";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { useCompanyOverrides, mergeCompanyWithOverrides, mergeAllCompanies } from "@/lib/hooks/use-company-overrides";
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
import { CompanyFilings } from "@/components/company-filings";
import { Badge } from "@/components/ui/badge";
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
import { getMarketCap, getMarketCapForMnav } from "@/lib/utils/market-cap";
import { getCompanyMNAV } from "@/lib/hooks/use-mnav-stats";
import { CryptoPriceCell, StockPriceCell } from "@/components/price-cell";
import { StalenessBadge } from "@/components/staleness-indicator";
import { Citation } from "@/components/citation";
import { getCompanyIntel } from "@/lib/data/company-intel";
import { COMPANY_SOURCES } from "@/lib/data/company-sources";
import { MobileHeader } from "@/components/mobile-header";

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

export default function CompanyPage() {
  const params = useParams();
  const ticker = params.ticker as string;
  const { data: prices } = usePricesStream();
  const { overrides } = useCompanyOverrides();

  // Fetch company from database API
  const { data: companyData, isLoading: isLoadingCompany } = useCompany(ticker);

  // Merge with overrides from Google Sheets
  const company = useMemo(
    () => companyData?.company ? mergeCompanyWithOverrides(companyData.company, overrides) : null,
    [companyData, overrides]
  );
  const [timeRange, setTimeRange] = useState<TimeRange>("1y");
  const [interval, setInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const { data: history, isLoading: historyLoading } = useStockHistory(ticker, timeRange, interval);

  // Company intel - must be called before any early returns (React hooks rule)
  const intel = useMemo(() => getCompanyIntel(ticker), [ticker]);

  // Fetch all companies for sidebar stats (shared cache with main page)
  const { data: companiesData } = useCompanies();
  const allCompanies = useMemo(() => {
    const baseCompanies = companiesData?.companies || [];
    return mergeAllCompanies(baseCompanies, overrides);
  }, [companiesData, overrides]);

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

  // Update interval when time range changes
  const handleTimeRangeChange = (newRange: TimeRange) => {
    setTimeRange(newRange);
    // Reset to default interval for the new range
    setInterval(DEFAULT_INTERVAL[newRange]);
  };

  if (isLoadingCompany) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading company data...</p>
        </div>
      </div>
    );
  }

  if (!company) {
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

  // Get prices
  const cryptoPrice = prices?.crypto[company.asset]?.price || 0;
  const cryptoChange = prices?.crypto[company.asset]?.change24h;
  const stockData = prices?.stocks[company.ticker];
  const stockPrice = stockData?.price || 0;
  const stockChange = stockData?.change24h;
  const { marketCap } = getMarketCap(company, stockData);
  const { marketCap: marketCapForMnav } = getMarketCapForMnav(company, stockData);

  // Other assets (cash + investments)
  const cashReserves = company.cashReserves || 0;
  const otherInvestments = company.otherInvestments || 0;
  const otherAssets = cashReserves + otherInvestments;
  const cryptoHoldingsValue = company.holdings * cryptoPrice;

  // Calculate metrics (including other assets in NAV)
  const nav = calculateNAV(company.holdings, cryptoPrice, cashReserves, otherInvestments);

  // Get mNAV from allCompanies (same source as overview page) for consistency
  const companyFromAllCompanies = allCompanies.find(c => c.ticker === ticker);
  const mNAV = companyFromAllCompanies ? getCompanyMNAV(companyFromAllCompanies, prices) : null;
  const sharesOutstanding = marketCap && stockPrice ? marketCap / stockPrice : 0;
  const navPerShare = calculateNAVPerShare(company.holdings, cryptoPrice, sharesOutstanding, cashReserves, otherInvestments);
  const navDiscount = calculateNAVDiscount(stockPrice, navPerShare);
  const holdingsPerShare = calculateHoldingsPerShare(company.holdings, sharesOutstanding);

  // Network staking APY
  const networkStakingApy = NETWORK_STAKING_APY[company.asset] || 0;
  const companyStakingApy = company.stakingApy || networkStakingApy;

  // Net yield calculation
  const { netYieldPct } = calculateNetYield(
    company.holdings,
    company.stakingPct || 0,
    companyStakingApy,
    company.quarterlyBurnUsd || 0,
    cryptoPrice
  );

  // Phase determination
  const phase = determineDATPhase(navDiscount, false, null);


  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <MobileHeader title={company.ticker} showBack />

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
                {company.ticker}
              </h1>
              <Badge variant="outline" className={cn("font-medium", assetColors[company.asset] || assetColors.ETH)}>
                {company.asset}
              </Badge>
              <Badge variant="outline" className={cn("font-medium", tierColors[company.tier])}>
                T{company.tier}
              </Badge>
              {company.pendingMerger && (
                <Badge variant="outline" className="font-medium bg-amber-500/10 text-amber-600 border-amber-500/30">
                  Pending Merger
                </Badge>
              )}
            </div>
            <p className="mt-1 text-lg text-gray-600 dark:text-gray-400">{company.name}</p>
            {company.leader && (
              <p className="mt-1 text-sm text-gray-500">Led by {company.leader}</p>
            )}
            {/* Links - Website, Twitter, Tokenized Stock */}
            <div className="mt-3 flex flex-wrap gap-2">
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <span>Website</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              )}
              {company.twitter && (
                <a
                  href={company.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <span>Twitter</span>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
              )}
              {company.tokenizedAddress && (
                <a
                  href={`https://solscan.io/token/${company.tokenizedAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                >
                  <span>Tokenized ({company.tokenizedChain})</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              )}
              {company.isMiner && (
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
        {company.pendingMerger && (
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
                {company.expectedHoldings && (
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">
                    <strong>Expected Holdings:</strong> ~{company.expectedHoldings.toLocaleString()} {company.asset}
                    {company.mergerExpectedClose && (
                      <> (merger expected {new Date(company.mergerExpectedClose).toLocaleDateString()})</>
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
            <p className="text-sm text-gray-500 dark:text-gray-400">mNAV</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {company.pendingMerger ? "—" : formatMNAV(mNAV)}
            </p>
            <p className="text-xs text-gray-400">
              {company.pendingMerger ? "N/A for pre-merger" : "Market Cap / NAV"}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">NAV/Share</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {navPerShare ? `${navPerShare.toFixed(2)}` : "—"}
            </p>
            <p className="text-xs text-gray-400">
              {navDiscount !== null && (
                <span className={navDiscount < 0 ? "text-green-600" : "text-red-600"}>
                  {formatPercent(navDiscount, true)} {navDiscount < 0 ? "discount" : "premium"}
                </span>
              )}
            </p>
          </div>
          {company.stakingPct != null && company.stakingPct > 0 && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Staking Yield</p>
              <p className="text-2xl font-bold text-green-600">
                +{Math.round(company.holdings * company.stakingPct * companyStakingApy).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">
                {company.asset}/yr ({(company.stakingPct * 100).toFixed(0)}% @ {(companyStakingApy * 100).toFixed(1)}%)
              </p>
            </div>
          )}
          {company.quarterlyBurnUsd != null && company.quarterlyBurnUsd > 0 && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Annual Burn</p>
              <p className="text-2xl font-bold text-red-600">
                {cryptoPrice > 0 ? `-${Math.round((company.quarterlyBurnUsd * 4) / cryptoPrice).toLocaleString()}` : `${(company.quarterlyBurnUsd * 4 / 1e6).toFixed(0)}M`}
              </p>
              <p className="text-xs text-gray-400">
                {cryptoPrice > 0 ? `${company.asset}/yr` : '/yr'} (${(company.quarterlyBurnUsd / 1e6).toFixed(1)}M/qtr)
              </p>
            </div>
          )}
          {(company.btcMinedAnnual != null && company.btcMinedAnnual > 0) && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Annual Mining</p>
              <p className="text-2xl font-bold text-orange-600">
                +{company.btcMinedAnnual.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">BTC/yr</p>
            </div>
          )}
        </div>

        {/* Asset Breakdown - only show if there are other assets */}
        {(otherAssets > 0 || cryptoHoldingsValue > 0) && (
          <div className="mb-8 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Net Asset Value Breakdown
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {company.asset} Holdings
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {formatLargeNumber(cryptoHoldingsValue)}
                </p>
                <p className="text-xs text-gray-400">
                  {formatTokenAmount(company.holdings, company.asset)}
                </p>
              </div>
              {cashReserves > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Cash Reserves
                  </p>
                  <p className="text-xl font-bold text-green-600">
                    {formatLargeNumber(cashReserves)}
                  </p>
                  <p className="text-xs text-gray-400">USD</p>
                </div>
              )}
              {otherInvestments > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Other Investments
                  </p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatLargeNumber(otherInvestments)}
                  </p>
                  <p className="text-xs text-gray-400">Equity stakes, etc.</p>
                </div>
              )}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 border border-indigo-200 dark:border-indigo-700">
                <p className="text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wide font-medium">
                  Total NAV
                </p>
                <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  {formatLargeNumber(nav)}
                </p>
                <p className="text-xs text-indigo-500">All assets combined</p>
              </div>
            </div>
          </div>
        )}

        {/* Chart with Time Range Selector */}
        <div className="mb-8 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Stock Price</h2>
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


        {/* mNAV History Chart */}
        {mNAV && stockPrice > 0 && cryptoPrice > 0 && !company.pendingMerger && (
          <CompanyMNAVChart
            ticker={company.ticker}
            asset={company.asset}
            currentMNAV={mNAV}
            currentStockPrice={stockPrice}
            currentCryptoPrice={cryptoPrice}
            timeRange={timeRange}
            interval={interval}
            className="mb-8"
          />
        )}

        {/* Treasury & Holdings */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">Holdings</p>
              <StalenessBadge
                lastUpdated={company.holdingsLastUpdated}
                source={company.holdingsSource}
                sourceUrl={company.holdingsSourceUrl}
              />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatLargeNumber(nav)}
            </p>
            <Citation
              sourceType={company.holdingsSource}
              sourceUrl={company.holdingsSourceUrl}
              sourceDate={company.holdingsLastUpdated}
              methodology={COMPANY_SOURCES[company.ticker]?.sharesNotes}
              notes={COMPANY_SOURCES[company.ticker]?.notes}
            >
              <span className="text-sm text-gray-500 font-mono">
                {formatTokenAmount(company.holdings, company.asset)}
              </span>
            </Citation>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Market Cap</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatLargeNumber(marketCap)}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{company.asset}/Share</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {holdingsPerShare ? holdingsPerShare.toFixed(6) : "—"}
            </p>
          </div>
        </div>

        {/* Yield & Operations */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {company.stakingPct !== undefined && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Staking</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {formatPercent(company.stakingPct)}
              </p>
              {company.stakingMethod && (
                <p className="text-xs text-gray-500">{company.stakingMethod}</p>
              )}
            </div>
          )}
          {company.quarterlyBurnUsd !== undefined && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Quarterly Burn</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {formatLargeNumber(company.quarterlyBurnUsd)}
              </p>
            </div>
          )}
          {company.costBasisAvg && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Cost Basis</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                ${company.costBasisAvg.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                {cryptoPrice > company.costBasisAvg ? (
                  <span className="text-green-600">
                    +{formatPercent((cryptoPrice - company.costBasisAvg) / company.costBasisAvg)} gain
                  </span>
                ) : (
                  <span className="text-red-600">
                    {formatPercent((cryptoPrice - company.costBasisAvg) / company.costBasisAvg)} loss
                  </span>
                )}
              </p>
            </div>
          )}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{company.asset} Price</p>
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

        {/* Holdings Per Share Growth Chart */}
        <HoldingsPerShareChart
          ticker={company.ticker}
          asset={company.asset}
          currentHoldingsPerShare={holdingsPerShare}
          className="mb-8"
        />

        {/* Comprehensive Strategy & Overview Section */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Strategy & Overview
            </h3>
            <div className="flex items-center gap-3">
              {company.website && (
                <a
                  href={company.website}
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
              {company.twitter && (
                <a
                  href={`https://twitter.com/${company.twitter.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  {company.twitter}
                </a>
              )}
            </div>
          </div>

          {/* Strategy Summary */}
          {(intel?.strategySummary || company.strategy || company.notes) && (
            <div className="mb-6">
              {intel?.strategySummary ? (
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{intel.strategySummary}</p>
              ) : (
                <>
                  {company.strategy && (
                    <p className="text-gray-700 dark:text-gray-300 mb-2">{company.strategy}</p>
                  )}
                  {company.notes && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{company.notes}</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Key Financial Metrics Grid */}
          {(company.costBasisAvg || company.capitalRaisedAtm || company.capitalRaisedPipe ||
            company.capitalRaisedConverts || company.stakingPct || company.leverageRatio ||
            company.btcMinedAnnual || company.quarterlyBurnUsd || company.atmRemaining || company.leader) && (
            <div className="mb-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
                Key Metrics
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {company.leader && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Leadership</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">{company.leader}</p>
                  </div>
                )}
                {company.costBasisAvg && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Cost Basis</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                      ${company.costBasisAvg.toLocaleString()}
                    </p>
                  </div>
                )}
                {company.capitalRaisedAtm && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">ATM Raised</p>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
                      ${(company.capitalRaisedAtm / 1e9).toFixed(2)}B
                    </p>
                  </div>
                )}
                {company.capitalRaisedPipe && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">PIPE Raised</p>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
                      ${(company.capitalRaisedPipe / 1e9).toFixed(2)}B
                    </p>
                  </div>
                )}
                {company.capitalRaisedConverts && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Converts Raised</p>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
                      ${(company.capitalRaisedConverts / 1e9).toFixed(2)}B
                    </p>
                  </div>
                )}
                {company.atmRemaining != null && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">ATM Remaining</p>
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">
                      ${(company.atmRemaining / 1e9).toFixed(2)}B
                    </p>
                  </div>
                )}
                {company.stakingPct != null && company.stakingPct > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Staking Yield</p>
                    <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 mt-1">
                      +{Math.round(company.holdings * company.stakingPct * companyStakingApy).toLocaleString()} {company.asset}/yr
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {(company.stakingPct * 100).toFixed(0)}% staked @ {(companyStakingApy * 100).toFixed(1)}% APY
                    </p>
                  </div>
                )}
                {company.leverageRatio && company.leverageRatio > 1 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Leverage Ratio</p>
                    <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mt-1">
                      {company.leverageRatio.toFixed(2)}x
                    </p>
                  </div>
                )}
                {company.btcMinedAnnual && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Annual Mining</p>
                    <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mt-1">
                      {company.btcMinedAnnual.toLocaleString()} BTC
                    </p>
                  </div>
                )}
                {company.quarterlyBurnUsd && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Annual Burn</p>
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400 mt-1">
                      {cryptoPrice > 0 ? `-${Math.round((company.quarterlyBurnUsd * 4) / cryptoPrice).toLocaleString()} ${company.asset}/yr` : `${(company.quarterlyBurnUsd * 4 / 1e6).toFixed(1)}M/yr`}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      ${(company.quarterlyBurnUsd / 1e6).toFixed(1)}M/qtr
                    </p>
                  </div>
                )}
                {company.hasOptions && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Options</p>
                    <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
                      {company.optionsOi ? `${(company.optionsOi / 1e6).toFixed(1)}M OI` : 'Available'}
                    </p>
                  </div>
                )}
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

          {/* 2026 Outlook */}
          {intel?.outlook2026 && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
                2026 Outlook
              </h4>
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                <p className="text-gray-700 dark:text-gray-300 italic">{intel.outlook2026}</p>
              </div>
            </div>
          )}
        </div>

        {/* Press Releases */}
        {intel?.pressReleases && intel.pressReleases.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Recent Press Releases
              </h3>
              <span className="text-xs text-gray-500">
                Last researched: {intel.lastResearched}
              </span>
            </div>
            <div className="space-y-3">
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
          </div>
        )}
        {/* SEC / Regulatory Filings */}
        <CompanyFilings
          ticker={company.ticker}
          companyName={company.name}
          className="mb-8"
        />

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
