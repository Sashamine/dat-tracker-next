"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { getCompanyByTicker } from "@/lib/data/companies";
import { usePrices } from "@/lib/hooks/use-prices";
import { useStockHistory } from "@/lib/hooks/use-stock-history";
import { StockChart } from "@/components/stock-chart";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Asset colors
const assetColors: Record<string, string> = {
  ETH: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  BTC: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  SOL: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

// Tier colors
const tierColors: Record<number, string> = {
  1: "bg-green-500/10 text-green-600 border-green-500/20",
  2: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  3: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

function formatNumber(num: number | undefined): string {
  if (num === undefined || num === null) return "—";
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatCurrency(num: number | undefined): string {
  if (num === undefined || num === null) return "—";
  return `$${formatNumber(num)}`;
}

function formatPercent(num: number | undefined, includeSign = false): string {
  if (num === undefined || num === null) return "—";
  const sign = includeSign && num > 0 ? "+" : "";
  return `${sign}${num.toFixed(2)}%`;
}

export default function CompanyPage() {
  const params = useParams();
  const ticker = params.ticker as string;
  const company = getCompanyByTicker(ticker);
  const { data: prices } = usePrices();
  const { data: history, isLoading: historyLoading } = useStockHistory(ticker);

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
          <Link
            href="/"
            className="mt-4 inline-block text-indigo-600 hover:underline"
          >
            ← Back to tracker
          </Link>
        </div>
      </div>
    );
  }

  const cryptoPrice = prices?.crypto[company.asset]?.price || 0;
  const cryptoChange = prices?.crypto[company.asset]?.change24h;
  const stockPrice = prices?.stocks[company.ticker]?.price;
  const stockChange = prices?.stocks[company.ticker]?.change24h;
  const holdingsValue = company.holdings * cryptoPrice;

  // Calculate NAV per share (simplified - would need shares outstanding)
  const navPerShare = stockPrice ? holdingsValue / (prices?.stocks[company.ticker]?.marketCap || 1) * stockPrice : undefined;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
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
              <Badge
                variant="outline"
                className={cn("font-medium", assetColors[company.asset])}
              >
                {company.asset}
              </Badge>
              <Badge
                variant="outline"
                className={cn("font-medium", tierColors[company.tier])}
              >
                T{company.tier}
              </Badge>
            </div>
            <p className="mt-1 text-lg text-gray-600 dark:text-gray-400">
              {company.name}
            </p>
            {company.leader && (
              <p className="mt-1 text-sm text-gray-500">
                Led by {company.leader}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {stockPrice ? `$${stockPrice.toFixed(2)}` : "—"}
            </p>
            {stockChange !== undefined && (
              <p
                className={cn(
                  "text-lg font-medium",
                  stockChange >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {formatPercent(stockChange, true)}
              </p>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="mb-8 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Stock Price
          </h2>
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

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Holdings
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatNumber(company.holdings)} {company.asset}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Holdings Value
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(holdingsValue)}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {company.asset} Price
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              ${cryptoPrice.toLocaleString()}
            </p>
            {cryptoChange !== undefined && (
              <p
                className={cn(
                  "text-sm",
                  cryptoChange >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {formatPercent(cryptoChange, true)}
              </p>
            )}
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              DAT Start
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {new Date(company.datStartDate).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {company.costBasisAvg && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Avg Cost Basis
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                ${company.costBasisAvg.toLocaleString()}
              </p>
            </div>
          )}
          {company.stakingPct && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Staking
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {formatPercent(company.stakingPct * 100)}
              </p>
              {company.stakingMethod && (
                <p className="text-xs text-gray-500">{company.stakingMethod}</p>
              )}
            </div>
          )}
          {company.quarterlyBurnUsd && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Quarterly Burn
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(company.quarterlyBurnUsd)}
              </p>
            </div>
          )}
          {company.avgDailyVolume && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Avg Daily Volume
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(company.avgDailyVolume)}
              </p>
            </div>
          )}
        </div>

        {/* Strategy & Notes */}
        {(company.strategy || company.notes) && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-8">
            {company.strategy && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                  Strategy
                </h3>
                <p className="text-gray-900 dark:text-gray-100">
                  {company.strategy}
                </p>
              </div>
            )}
            {company.notes && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                  Notes
                </h3>
                <p className="text-gray-900 dark:text-gray-100">
                  {company.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
