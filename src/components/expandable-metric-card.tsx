"use client";

import { useState } from "react";
import { formatLargeNumber } from "@/lib/calculations";
import { cn } from "@/lib/utils";

interface SourceLinkProps {
  url?: string;
  label?: string;
}

function SourceLink({ url, label }: SourceLinkProps) {
  if (!url) return <span className="text-gray-500 text-[10px] ml-1">[—]</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-500 hover:text-blue-400 text-[10px] ml-1"
      title={label || "View source"}
      onClick={(e) => e.stopPropagation()}
    >
      [src↗]
    </a>
  );
}

// ============================================================================
// LEVERAGE CALCULATION CARD
// ============================================================================

interface LeverageCardProps {
  rawDebt: number;
  adjustedDebt: number;
  itmDebtAdjustment?: number;
  cashReserves: number;
  cryptoNav: number;
  leverage: number;
  debtSourceUrl?: string;
  cashSourceUrl?: string;
  holdingsSourceUrl?: string;
}

export function LeverageCalculationCard({
  rawDebt,
  adjustedDebt,
  itmDebtAdjustment = 0,
  cashReserves,
  cryptoNav,
  leverage,
  debtSourceUrl,
  cashSourceUrl,
  holdingsSourceUrl,
}: LeverageCardProps) {
  const netDebt = Math.max(0, adjustedDebt - cashReserves);
  const hasItmAdjustment = itmDebtAdjustment > 0;

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Leverage Calculation
        </h3>
        <span className="text-xl font-bold text-amber-600">
          {leverage.toFixed(2)}x
        </span>
      </div>

      {/* Net Debt Section */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
          Net Debt {hasItmAdjustment && <span className="text-amber-500">(adjusted for ITM converts)</span>}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Total Debt</span>
            <span className="font-mono text-sm text-red-400 flex items-center">
              {formatLargeNumber(rawDebt)}
              <SourceLink url={debtSourceUrl} />
            </span>
          </div>
          {hasItmAdjustment && (
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">− ITM Converts</span>
              <span className="font-mono text-sm text-amber-400 flex items-center">
                ({formatLargeNumber(itmDebtAdjustment)})
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">− Cash</span>
            <span className="font-mono text-sm text-green-400 flex items-center">
              ({formatLargeNumber(cashReserves)})
              <SourceLink url={cashSourceUrl} />
            </span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-gray-200 dark:border-gray-700">
            <span className="text-gray-300 text-sm font-medium">= Net Debt</span>
            <span className="font-mono text-sm text-white font-semibold">
              {formatLargeNumber(netDebt)}
            </span>
          </div>
        </div>
      </div>

      {/* Crypto NAV */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
          Crypto NAV
        </div>
        <div className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Holdings Value</span>
            <span className="font-mono text-sm text-gray-300 flex items-center">
              {formatLargeNumber(cryptoNav)}
              <SourceLink url={holdingsSourceUrl} />
            </span>
          </div>
        </div>
      </div>

      {/* Result */}
      <div className="bg-amber-50 dark:bg-amber-900/30 rounded p-3 border border-amber-200 dark:border-amber-700">
        <div className="flex justify-between items-center">
          <span className="text-amber-700 dark:text-amber-300 text-sm">
            Leverage = Net Debt / Crypto NAV
          </span>
          <span className="font-mono text-lg text-amber-600 font-bold">
            {formatLargeNumber(netDebt)} / {formatLargeNumber(cryptoNav)} = {leverage.toFixed(2)}x
          </span>
        </div>
        <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
          {leverage >= 1 ? (
            <>High leverage — net debt exceeds crypto value</>
          ) : leverage > 0.5 ? (
            <>Moderate leverage — significant debt relative to holdings</>
          ) : leverage > 0 ? (
            <>Low leverage — debt well-covered by holdings</>
          ) : (
            <>No leverage — net cash position</>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EQUITY NAV PER SHARE CALCULATION CARD
// ============================================================================

interface EquityNavPerShareCardProps {
  cryptoNav: number;
  cashReserves: number;
  totalDebt: number;
  preferredEquity: number;
  sharesOutstanding: number;
  equityNav: number;
  equityNavPerShare: number;
  stockPrice: number;
  holdingsSourceUrl?: string;
  cashSourceUrl?: string;
  debtSourceUrl?: string;
  preferredSourceUrl?: string;
  sharesSourceUrl?: string;
}

export function EquityNavPerShareCalculationCard({
  cryptoNav,
  cashReserves,
  totalDebt,
  preferredEquity,
  sharesOutstanding,
  equityNav,
  equityNavPerShare,
  stockPrice,
  holdingsSourceUrl,
  cashSourceUrl,
  debtSourceUrl,
  preferredSourceUrl,
  sharesSourceUrl,
}: EquityNavPerShareCardProps) {
  const premiumDiscount = stockPrice > 0 ? ((stockPrice - equityNavPerShare) / equityNavPerShare) * 100 : 0;

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Equity NAV/Share Calculation
        </h3>
        <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
          ${equityNavPerShare.toFixed(2)}
        </span>
      </div>

      {/* Equity NAV Section */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
          Equity NAV (Numerator)
        </div>
        <div className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Crypto NAV</span>
            <span className="font-mono text-sm text-gray-300 flex items-center">
              {formatLargeNumber(cryptoNav)}
              <SourceLink url={holdingsSourceUrl} />
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">+ Cash</span>
            <span className="font-mono text-sm text-green-400 flex items-center">
              {formatLargeNumber(cashReserves)}
              <SourceLink url={cashSourceUrl} />
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">− Debt</span>
            <span className="font-mono text-sm text-red-400 flex items-center">
              ({formatLargeNumber(totalDebt)})
              <SourceLink url={debtSourceUrl} />
            </span>
          </div>
          {preferredEquity > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">− Preferred</span>
              <span className="font-mono text-sm text-red-400 flex items-center">
                ({formatLargeNumber(preferredEquity)})
                <SourceLink url={preferredSourceUrl} />
              </span>
            </div>
          )}
          <div className="flex justify-between items-center pt-1 border-t border-gray-200 dark:border-gray-700">
            <span className="text-gray-300 text-sm font-medium">= Equity NAV</span>
            <span className="font-mono text-sm text-white font-semibold">
              {formatLargeNumber(equityNav)}
            </span>
          </div>
        </div>
      </div>

      {/* Shares */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
          Shares Outstanding (Denominator)
        </div>
        <div className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Shares</span>
            <span className="font-mono text-sm text-gray-300 flex items-center">
              {(sharesOutstanding / 1e6).toFixed(1)}M
              <SourceLink url={sharesSourceUrl} />
            </span>
          </div>
        </div>
      </div>

      {/* Result */}
      <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded p-3 border border-indigo-200 dark:border-indigo-700">
        <div className="flex justify-between items-center">
          <span className="text-indigo-700 dark:text-indigo-300 text-sm">
            NAV/Share = Equity NAV / Shares
          </span>
          <span className="font-mono text-lg text-indigo-600 dark:text-indigo-400 font-bold">
            {formatLargeNumber(equityNav)} / {(sharesOutstanding / 1e6).toFixed(1)}M = ${equityNavPerShare.toFixed(2)}
          </span>
        </div>
        {stockPrice > 0 && (
          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1">
            Stock: ${stockPrice.toFixed(2)} → {premiumDiscount >= 0 ? (
              <>{premiumDiscount.toFixed(0)}% premium to NAV</>
            ) : (
              <>{Math.abs(premiumDiscount).toFixed(0)}% discount to NAV</>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// EXPANDABLE METRIC WRAPPER
// ============================================================================

type MetricType = "mnav" | "leverage" | "equityNavPerShare" | null;

interface ExpandableMetricProps {
  type: MetricType;
  label: string;
  value: string;
  subLabel?: string;
  tooltip?: string;
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
}

export function ExpandableMetric({
  type,
  label,
  value,
  subLabel,
  tooltip,
  isExpanded,
  onToggle,
  className,
}: ExpandableMetricProps) {
  return (
    <div
      className={cn(
        "bg-gray-50 dark:bg-gray-900 rounded-lg p-4 cursor-pointer transition-all",
        isExpanded && "ring-2 ring-indigo-500 dark:ring-indigo-400",
        className
      )}
      onClick={onToggle}
    >
      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
        {label}
        {tooltip && (
          <span
            className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] text-gray-500 dark:text-gray-400 cursor-help"
            title={tooltip}
          >
            ?
          </span>
        )}
        <span className="ml-auto text-[10px] text-indigo-500">
          {isExpanded ? "▼" : "▶"}
        </span>
      </p>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {value}
      </p>
      {subLabel && (
        <p className="text-xs text-gray-400">{subLabel}</p>
      )}
    </div>
  );
}
