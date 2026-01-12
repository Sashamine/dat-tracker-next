"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getCompanyByTicker } from "@/lib/data/companies";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { useCompanyOverrides, mergeCompanyWithOverrides } from "@/lib/hooks/use-company-overrides";
import {
  useStockHistory,
  TimeRange,
  ChartInterval,
  VALID_INTERVALS,
  DEFAULT_INTERVAL,
  INTERVAL_LABELS,
} from "@/lib/hooks/use-stock-history";
import { StockChart } from "@/components/stock-chart";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  calculateNAV,
  calculateMNAV,
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
import { CryptoPriceCell, StockPriceCell } from "@/components/price-cell";
import { StalenessBadge } from "@/components/staleness-indicator";

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
  const baseCompany = getCompanyByTicker(ticker);
  const { data: prices } = usePricesStream();
  const { overrides } = useCompanyOverrides();

  // Merge with overrides from Google Sheets
  const company = useMemo(
    () => baseCompany ? mergeCompanyWithOverrides(baseCompany, overrides) : null,
    [baseCompany, overrides]
  );
  const [timeRange, setTimeRange] = useState<TimeRange>("1y");
  const [interval, setInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const { data: history, isLoading: historyLoading } = useStockHistory(ticker, timeRange, interval);

  // Update interval when time range changes
  const handleTimeRangeChange = (newRange: TimeRange) => {
    setTimeRange(newRange);
    // Reset to default interval for the new range
    setInterval(DEFAULT_INTERVAL[newRange]);
  };

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
  const marketCap = stockData?.marketCap || company.marketCap || 0;

  // Calculate metrics
  const nav = calculateNAV(company.holdings, cryptoPrice);
  const mNAV = calculateMNAV(marketCap, company.holdings, cryptoPrice);
  const sharesOutstanding = marketCap && stockPrice ? marketCap / stockPrice : 0;
  const navPerShare = calculateNAVPerShare(company.holdings, cryptoPrice, sharesOutstanding);
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
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
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

        {/* Key Valuation Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">mNAV</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatMNAV(mNAV)}
            </p>
            <p className="text-xs text-gray-400">Market Cap / NAV</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">NAV/Share</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {navPerShare ? `$${navPerShare.toFixed(2)}` : "—"}
            </p>
            <p className="text-xs text-gray-400">
              {navDiscount !== null && (
                <span className={navDiscount < 0 ? "text-green-600" : "text-red-600"}>
                  {formatPercent(navDiscount, true)} {navDiscount < 0 ? "discount" : "premium"}
                </span>
              )}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Net Yield</p>
            <p className={cn("text-2xl font-bold", netYieldPct > 0 ? "text-green-600" : "text-red-600")}>
              {formatPercent(netYieldPct, true)}
            </p>
            <p className="text-xs text-gray-400">
              vs {formatPercent(networkStakingApy)} benchmark
            </p>
          </div>
        </div>

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

        {/* Treasury & Holdings */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">Holdings</p>
              <StalenessBadge
                lastUpdated={company.holdingsLastUpdated}
                source={company.holdingsSource}
              />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatLargeNumber(nav)}
            </p>
            <p className="text-sm text-gray-500 font-mono">
              {formatTokenAmount(company.holdings, company.asset)}
            </p>
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

        {/* Phase Status */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Phase Status</h3>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{phase.description}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${phase.progress * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Accumulation</span>
            <span>Transition</span>
            <span>Terminal</span>
          </div>
        </div>

        {/* Strategy & Notes */}
        {(company.strategy || company.notes) && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-8">
            {company.strategy && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                  Strategy
                </h3>
                <p className="text-gray-900 dark:text-gray-100">{company.strategy}</p>
              </div>
            )}
            {company.notes && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                  Notes
                </h3>
                <p className="text-gray-900 dark:text-gray-100">{company.notes}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
