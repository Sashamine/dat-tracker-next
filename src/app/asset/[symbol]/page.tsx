"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAsset, useAssets } from "@/lib/hooks/use-companies";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { enrichAllCompanies } from "@/lib/hooks/use-company-data";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  calculateNAV,
  formatLargeNumber,
  formatTokenAmount,
  formatMNAV,
  NETWORK_STAKING_APY,
} from "@/lib/calculations";
import { getMarketCap } from "@/lib/utils/market-cap";
import { getCompanyMNAV } from "@/lib/hooks/use-mnav-stats";
import { MobileHeader } from "@/components/mobile-header";
import { MinersComparison } from "@/components/miners-comparison";
import { AssetFundamentalsAggregateCard } from "@/components/AssetFundamentalsAggregateCard";

// Asset metadata
const ASSET_INFO: Record<string, { name: string; color: string; hasStaking: boolean }> = {
  ETH: { name: "Ethereum", color: "indigo", hasStaking: true },
  BTC: { name: "Bitcoin", color: "orange", hasStaking: false },
  SOL: { name: "Solana", color: "purple", hasStaking: true },
  HYPE: { name: "Hyperliquid", color: "green", hasStaking: false },
  BNB: { name: "BNB Chain", color: "yellow", hasStaking: true },
  TAO: { name: "Bittensor", color: "cyan", hasStaking: true },
  LINK: { name: "Chainlink", color: "blue", hasStaking: true },
  TRX: { name: "TRON", color: "red", hasStaking: true },
  XRP: { name: "Ripple", color: "gray", hasStaking: false },
  ZEC: { name: "Zcash", color: "amber", hasStaking: false },
  LTC: { name: "Litecoin", color: "slate", hasStaking: false },
  SUI: { name: "Sui", color: "sky", hasStaking: true },
  DOGE: { name: "Dogecoin", color: "amber", hasStaking: false },
  AVAX: { name: "Avalanche", color: "rose", hasStaking: true },
  ADA: { name: "Cardano", color: "blue", hasStaking: true },
  HBAR: { name: "Hedera", color: "gray", hasStaking: true },
};

// Tier colors
const tierColors: Record<number, string> = {
  1: "bg-green-500/10 text-green-600 border-green-500/20",
  2: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  3: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};


export default function AssetPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = (params.symbol as string).toUpperCase();
  const { data: prices } = usePricesStream();
  const [sortField, setSortField] = useState<string>("holdingsValue");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Fetch asset data from database API
  const { data: assetData, isLoading: isLoadingAsset } = useAsset(symbol);
  const { data: assetsData } = useAssets();

  // Enrich company data with holdings history and source tracking
  const companies = useMemo(
    () => enrichAllCompanies(assetData?.companies || []),
    [assetData]
  );

  const assetInfo = ASSET_INFO[symbol];

  if (isLoadingAsset) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading asset data...</p>
        </div>
      </div>
    );
  }

  if (!assetInfo || companies.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Asset not found
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            No companies tracking {symbol}
          </p>
          <Link href="/" className="mt-4 inline-block text-indigo-600 hover:underline">
            ← Back to tracker
          </Link>
        </div>
      </div>
    );
  }

  const cryptoPrice = prices?.crypto[symbol]?.price || 0;
  const cryptoChange = prices?.crypto[symbol]?.change24h || 0;
  const networkStakingApy = NETWORK_STAKING_APY[symbol] || 0;

  // Calculate metrics for each company
  const companiesWithMetrics = companies.map((company) => {
    const stockData = prices?.stocks[company.ticker];
    const { marketCap } = getMarketCap(company, stockData);
    const stockPrice = stockData?.price || 0;
    const stockChange = stockData?.change24h;

    const holdingsValue = calculateNAV(company.holdings, cryptoPrice, company.cashReserves || 0, company.otherInvestments || 0);
    const mNAV = getCompanyMNAV(company, prices);

    return {
      ...company,
      holdingsValue,
      marketCap,
      stockPrice,
      stockChange,
      mNAV,
    };
  });

  // Sort companies
  const sortedCompanies = [...companiesWithMetrics].sort((a, b) => {
    let aVal: number, bVal: number;
    if (sortField === "holdingsValue") {
      aVal = a.holdingsValue || 0;
      bVal = b.holdingsValue || 0;
    } else if (sortField === "mNAV") {
      aVal = a.mNAV || 0;
      bVal = b.mNAV || 0;
    } else if (sortField === "holdings") {
      aVal = a.holdings || 0;
      bVal = b.holdings || 0;
    } else {
      aVal = (a as any)[sortField] ?? 0;
      bVal = (b as any)[sortField] ?? 0;
    }
    return sortDirection === "desc" ? bVal - aVal : aVal - bVal;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Calculate totals
  const totalHoldings = companies.reduce((sum, c) => sum + c.holdings, 0);
  const totalValue = totalHoldings * cryptoPrice;
  const totalMarketCap = companiesWithMetrics.reduce((sum, c) => sum + (c.marketCap || 0), 0);
  const avgMNAV = companiesWithMetrics.filter(c => c.mNAV).reduce((sum, c) => sum + (c.mNAV || 0), 0) / companiesWithMetrics.filter(c => c.mNAV).length || 0;

  // Get all unique assets for navigation
  const allAssets: string[] = assetsData?.assets?.map((a: { symbol: string }) => a.symbol) || [];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Mobile Header */}
      <MobileHeader title={`${symbol} Companies`} showBack />

      <main className="container mx-auto px-3 py-4 lg:px-4 lg:py-8">
        {/* Breadcrumb - Desktop only */}
        <div className="mb-6 hidden lg:block">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            ← Back to tracker
          </Link>
        </div>

        {/* Asset Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          {allAssets.map((asset) => (
            <Link
              key={asset}
              href={`/asset/${asset.toLowerCase()}`}
              className={cn(
                "px-3 py-1.5 text-sm rounded-full transition-colors",
                asset === symbol
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              )}
            >
              {asset}
            </Link>
          ))}
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {assetInfo.name} ({symbol}) DAT Companies
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {companies.length} companies holding {symbol}
              {assetInfo.hasStaking && ` · ${(networkStakingApy * 100).toFixed(1)}% staking benchmark`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              ${cryptoPrice.toLocaleString()}
            </p>
            <p className={cn("text-lg font-medium", cryptoChange >= 0 ? "text-green-600" : "text-red-600")}>
              {cryptoChange >= 0 ? "+" : ""}{cryptoChange.toFixed(2)}% 24h
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Holdings</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatTokenAmount(totalHoldings, symbol)}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatLargeNumber(totalValue)}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Market Cap</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatLargeNumber(totalMarketCap)}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Avg mNAV</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatMNAV(avgMNAV)}
            </p>
          </div>
        </div>

        {/* Fundamentals (last filed) - from D1 */}
        <div className="mb-8">
          <AssetFundamentalsAggregateCard tickers={companies.map(c => c.ticker)} />
        </div>

        {/* Miners Section - BTC only */}
        {symbol === "BTC" && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span>⛏️</span> Miners HPS Growth
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Holdings per share (HPS) growth shows whether miners are accumulating BTC faster than dilution.
              Higher growth = more BTC per share over time.
            </p>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <MinersComparison companies={companies} prices={prices} />
            </div>
          </div>
        )}

        {/* Companies Table */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-900/50">
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">24h</TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort("holdings")}
                >
                  Holdings {sortField === "holdings" && (sortDirection === "desc" ? "↓" : "↑")}
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort("holdingsValue")}
                >
                  Value {sortField === "holdingsValue" && (sortDirection === "desc" ? "↓" : "↑")}
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort("mNAV")}
                >
                  mNAV {sortField === "mNAV" && (sortDirection === "desc" ? "↓" : "↑")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCompanies.map((company, index) => (
                <TableRow
                  key={company.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900/30 cursor-pointer transition-colors"
                  onClick={() => router.push(`/company/${company.ticker}`)}
                >
                  <TableCell className="text-gray-500 font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {company.ticker}
                      </span>
                      <span className="text-sm text-gray-500 truncate max-w-[200px]">
                        {company.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {company.stockPrice ? `$${company.stockPrice.toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {company.stockChange !== undefined ? (
                      <span className={cn(company.stockChange >= 0 ? "text-green-600" : "text-red-600")}>
                        {company.stockChange >= 0 ? "+" : ""}{company.stockChange.toFixed(1)}%
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatTokenAmount(company.holdings, symbol)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatLargeNumber(company.holdingsValue)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatMNAV(company.mNAV)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
