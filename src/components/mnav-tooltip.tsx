"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatMNAV } from "@/lib/calculations";

interface MNAVTooltipProps {
  mNAV: number;
  // Inputs for the calculation
  marketCap: number;
  holdingsValue: number;
  totalDebt?: number;
  preferredEquity?: number;
  cashReserves?: number;
  otherInvestments?: number;
  // Metadata
  ticker: string;
  asset: string;
  holdings: number;
  // Whether market cap was calculated from sharesForMnav
  usesCustomShares?: boolean;
  sharesForMnav?: number;
}

function formatCompact(num: number): string {
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

/**
 * mNAV tooltip showing calculation breakdown
 *
 * Formula:
 * EV = Market Cap + Debt + Preferred - Cash
 * NAV = Holdings Value + Other Investments
 * mNAV = EV / NAV
 */
export function MNAVTooltip({
  mNAV,
  marketCap,
  holdingsValue,
  totalDebt = 0,
  preferredEquity = 0,
  cashReserves = 0,
  otherInvestments = 0,
  ticker,
  asset,
  holdings,
  usesCustomShares,
  sharesForMnav,
}: MNAVTooltipProps) {
  // Calculate EV and NAV for display
  const ev = marketCap + totalDebt + preferredEquity - cashReserves;
  const nav = holdingsValue + otherInvestments + cashReserves;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help border-b border-dotted border-gray-400 dark:border-gray-600">
            {formatMNAV(mNAV)}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-gray-900 dark:bg-gray-800 p-3 text-left max-w-xs"
        >
          <div className="space-y-2 text-xs">
            {/* Header */}
            <div className="font-medium text-gray-100 border-b border-gray-700 pb-1">
              {ticker} mNAV Calculation
            </div>

            {/* Enterprise Value breakdown */}
            <div>
              <div className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">
                Enterprise Value
              </div>
              <div className="space-y-0.5 text-gray-300">
                <div className="flex justify-between">
                  <span>Market Cap</span>
                  <span className="font-mono">{formatCompact(marketCap)}</span>
                </div>
                {totalDebt > 0 && (
                  <div className="flex justify-between">
                    <span>+ Debt</span>
                    <span className="font-mono text-red-400">{formatCompact(totalDebt)}</span>
                  </div>
                )}
                {preferredEquity > 0 && (
                  <div className="flex justify-between">
                    <span>+ Preferred</span>
                    <span className="font-mono text-red-400">{formatCompact(preferredEquity)}</span>
                  </div>
                )}
                {cashReserves > 0 && (
                  <div className="flex justify-between">
                    <span>- Cash</span>
                    <span className="font-mono text-green-400">({formatCompact(cashReserves)})</span>
                  </div>
                )}
                <div className="flex justify-between font-medium border-t border-gray-700 pt-0.5">
                  <span>= EV</span>
                  <span className="font-mono">{formatCompact(ev)}</span>
                </div>
              </div>
            </div>

            {/* NAV breakdown */}
            <div>
              <div className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">
                Net Asset Value
              </div>
              <div className="space-y-0.5 text-gray-300">
                <div className="flex justify-between">
                  <span>{asset} ({holdings.toLocaleString()})</span>
                  <span className="font-mono">{formatCompact(holdingsValue)}</span>
                </div>
                {cashReserves > 0 && (
                  <div className="flex justify-between">
                    <span>+ Cash</span>
                    <span className="font-mono">{formatCompact(cashReserves)}</span>
                  </div>
                )}
                {otherInvestments > 0 && (
                  <div className="flex justify-between">
                    <span>+ Other</span>
                    <span className="font-mono">{formatCompact(otherInvestments)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium border-t border-gray-700 pt-0.5">
                  <span>= NAV</span>
                  <span className="font-mono">{formatCompact(nav)}</span>
                </div>
              </div>
            </div>

            {/* Result */}
            <div className="border-t border-gray-700 pt-1">
              <div className="flex justify-between font-medium text-gray-100">
                <span>mNAV = EV / NAV</span>
                <span className="font-mono text-indigo-400">{formatMNAV(mNAV)}</span>
              </div>
            </div>

            {/* Methodology note */}
            {usesCustomShares && sharesForMnav && (
              <div className="text-[10px] text-gray-500 border-t border-gray-700 pt-1">
                Market cap uses {(sharesForMnav / 1_000_000).toFixed(1)}M shares (company methodology)
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
