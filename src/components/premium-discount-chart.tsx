"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  calculateMNAV,
  calculateFairValue,
  formatPercent,
  formatMNAV,
  NETWORK_STAKING_APY,
} from "@/lib/calculations";
import { Company } from "@/lib/types";

interface PriceData {
  crypto: Record<string, { price: number; change24h: number }>;
  stocks: Record<string, { price: number; change24h: number; volume: number; marketCap: number }>;
}

interface PremiumDiscountChartProps {
  companies: Company[];
  prices?: PriceData;
  maxBars?: number;
  sortBy?: "upside" | "mNAV" | "holdings";
  title?: string;
}

interface CompanyWithMetrics extends Company {
  mNAV: number;
  fairPremium: number;
  upside: number;
  verdict: string;
  holdingsValue: number;
}

export function PremiumDiscountChart({
  companies,
  prices,
  maxBars = 15,
  sortBy = "upside",
  title = "Premium/Discount to Fair Value",
}: PremiumDiscountChartProps) {
  // Calculate metrics for each company
  const companiesWithMetrics = useMemo(() => {
    return companies
      .map((company) => {
        const cryptoPrice = prices?.crypto[company.asset]?.price || 0;
        const stockData = prices?.stocks[company.ticker];
        const marketCap = company.marketCap || stockData?.marketCap || 0;
        const holdingsValue = company.holdings * cryptoPrice;

        const mNAV = calculateMNAV(marketCap, company.holdings, cryptoPrice, company.cashReserves || 0, company.otherInvestments || 0, company.totalDebt || 0, company.preferredEquity || 0) || 0;
        const networkStakingApy = NETWORK_STAKING_APY[company.asset] || 0;

        const fairValue = calculateFairValue(
          company.holdings,
          cryptoPrice,
          marketCap,
          company.stakingPct || 0,
          company.stakingApy || networkStakingApy,
          company.quarterlyBurnUsd || 0,
          networkStakingApy,
          0.04,
          company.asset,
          company.leverageRatio || 1.0
        );

        return {
          ...company,
          mNAV,
          fairPremium: fairValue.fairPremium,
          upside: fairValue.upside,
          verdict: fairValue.verdict,
          holdingsValue,
        } as CompanyWithMetrics;
      })
      .filter((c) => c.mNAV > 0 && c.holdingsValue > 0); // Only include companies with valid data
  }, [companies, prices]);

  // Sort companies
  const sortedCompanies = useMemo(() => {
    const sorted = [...companiesWithMetrics];
    switch (sortBy) {
      case "upside":
        sorted.sort((a, b) => b.upside - a.upside);
        break;
      case "mNAV":
        sorted.sort((a, b) => a.mNAV - b.mNAV);
        break;
      case "holdings":
        sorted.sort((a, b) => b.holdingsValue - a.holdingsValue);
        break;
    }
    return sorted.slice(0, maxBars);
  }, [companiesWithMetrics, sortBy, maxBars]);

  // Find max absolute upside for scaling
  const maxUpside = useMemo(() => {
    return Math.max(...sortedCompanies.map((c) => Math.abs(c.upside)));
  }, [sortedCompanies]);

  if (sortedCompanies.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No data available for visualization
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
        {title}
      </h3>

      <div className="space-y-3">
        {sortedCompanies.map((company) => {
          const barWidth = Math.abs(company.upside) / maxUpside * 100;
          const isPositive = company.upside > 0;

          return (
            <div key={company.id} className="flex items-center gap-4">
              {/* Ticker */}
              <div className="w-16 text-sm font-medium text-gray-700 dark:text-gray-300">
                {company.ticker}
              </div>

              {/* Bar Chart */}
              <div className="flex-1 flex items-center h-8">
                {/* Left side (negative) */}
                <div className="w-1/2 flex justify-end pr-1">
                  {!isPositive && (
                    <div
                      className="h-6 bg-red-500/80 rounded-l transition-all duration-300"
                      style={{ width: `${barWidth}%` }}
                    />
                  )}
                </div>

                {/* Center line */}
                <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />

                {/* Right side (positive) */}
                <div className="w-1/2 flex justify-start pl-1">
                  {isPositive && (
                    <div
                      className="h-6 bg-green-500/80 rounded-r transition-all duration-300"
                      style={{ width: `${barWidth}%` }}
                    />
                  )}
                </div>
              </div>

              {/* Values */}
              <div className="w-20 text-right">
                <span
                  className={cn(
                    "text-sm font-mono font-medium",
                    isPositive ? "text-green-600" : "text-red-600"
                  )}
                >
                  {formatPercent(company.upside, true)}
                </span>
              </div>

              {/* mNAV */}
              <div className="w-16 text-right">
                <span className="text-xs text-gray-500">
                  {formatMNAV(company.mNAV)}
                </span>
              </div>

              {/* Verdict Badge */}
              <div className="w-20">
                <span
                  className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium",
                    company.verdict === "Cheap"
                      ? "bg-green-100 text-green-700"
                      : company.verdict === "Fair"
                      ? "bg-blue-100 text-blue-700"
                      : company.verdict === "Expensive"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-700"
                  )}
                >
                  {company.verdict}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500/80 rounded" />
          <span className="text-sm text-gray-500">Undervalued (Upside)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500/80 rounded" />
          <span className="text-sm text-gray-500">Overvalued (Downside)</span>
        </div>
      </div>
    </div>
  );
}

// Scatter plot style visualization showing mNAV vs Fair Premium
export function MNAVScatterChart({
  companies,
  prices,
}: {
  companies: Company[];
  prices?: PriceData;
}) {
  // Calculate metrics
  const companiesWithMetrics = useMemo(() => {
    return companies
      .map((company) => {
        const cryptoPrice = prices?.crypto[company.asset]?.price || 0;
        const stockData = prices?.stocks[company.ticker];
        const marketCap = company.marketCap || stockData?.marketCap || 0;
        const holdingsValue = company.holdings * cryptoPrice;

        const mNAV = calculateMNAV(marketCap, company.holdings, cryptoPrice, company.cashReserves || 0, company.otherInvestments || 0, company.totalDebt || 0, company.preferredEquity || 0) || 0;
        const networkStakingApy = NETWORK_STAKING_APY[company.asset] || 0;

        const fairValue = calculateFairValue(
          company.holdings,
          cryptoPrice,
          marketCap,
          company.stakingPct || 0,
          company.stakingApy || networkStakingApy,
          company.quarterlyBurnUsd || 0,
          networkStakingApy,
          0.04,
          company.asset,
          company.leverageRatio || 1.0
        );

        return {
          ...company,
          mNAV,
          fairPremium: fairValue.fairPremium,
          upside: fairValue.upside,
          verdict: fairValue.verdict,
          holdingsValue,
        };
      })
      .filter((c) => c.mNAV > 0 && c.mNAV < 10); // Filter reasonable range
  }, [companies, prices]);

  // Calculate ranges for the grid
  const maxMNAV = Math.max(...companiesWithMetrics.map((c) => c.mNAV), 5);
  const maxFair = Math.max(...companiesWithMetrics.map((c) => c.fairPremium), 3);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        mNAV vs Fair Premium
      </h3>
      <p className="text-sm text-gray-500 mb-6">
        Companies below the diagonal line are undervalued relative to their fair premium
      </p>

      <div className="relative h-[400px] border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        {/* Grid lines */}
        <div className="absolute inset-0">
          {/* Diagonal line (fair value) */}
          <svg className="absolute inset-0 w-full h-full">
            <line
              x1="0"
              y1="100%"
              x2="100%"
              y2="0"
              stroke="currentColor"
              strokeDasharray="4 4"
              className="text-gray-300 dark:text-gray-600"
            />
          </svg>
        </div>

        {/* Plot points */}
        {companiesWithMetrics.map((company) => {
          const x = (company.fairPremium / maxFair) * 100;
          const y = 100 - (company.mNAV / maxMNAV) * 100;

          return (
            <div
              key={company.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <div
                className={cn(
                  "w-3 h-3 rounded-full border-2 cursor-pointer transition-transform hover:scale-150",
                  company.verdict === "Cheap"
                    ? "bg-green-500 border-green-600"
                    : company.verdict === "Fair"
                    ? "bg-blue-500 border-blue-600"
                    : "bg-red-500 border-red-600"
                )}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                  <div className="font-medium">{company.ticker}</div>
                  <div>mNAV: {formatMNAV(company.mNAV)}</div>
                  <div>Fair: {formatMNAV(company.fairPremium)}</div>
                  <div>{formatPercent(company.upside, true)}</div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Axis labels */}
        <div className="absolute bottom-0 left-0 right-0 text-center text-xs text-gray-500 transform translate-y-6">
          Fair Premium (x)
        </div>
        <div className="absolute top-0 bottom-0 left-0 text-xs text-gray-500 transform -translate-x-8 rotate-[-90deg] origin-center flex items-center">
          mNAV (y)
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm text-gray-500">Cheap</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-sm text-gray-500">Fair</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-sm text-gray-500">Expensive</span>
        </div>
      </div>
    </div>
  );
}
