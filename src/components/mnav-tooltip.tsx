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
  // Share count and price for market cap breakdown
  sharesForMnav?: number;
  stockPrice?: number;
  cryptoPrice?: number;
  // Official dashboard comparison
  officialDashboardMnav?: number;  // e.g., 1.07 from strategy.com
  officialDashboardName?: string;  // e.g., "strategy.com"
  // Source links
  holdingsSourceUrl?: string;
  officialDashboard?: string;
  secFilingsUrl?: string;
  // Data source indicator
  hasLiveData?: boolean;
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
  sharesForMnav,
  stockPrice,
  cryptoPrice,
  officialDashboardMnav,
  officialDashboardName,
  holdingsSourceUrl,
  officialDashboard,
  secFilingsUrl,
  hasLiveData,
}: MNAVTooltipProps) {
  // Calculate EV and NAV for display (matches Strategy's methodology)
  // EV = Market Cap + Debt + Preferred - Cash
  // NAV = Crypto value only (NOT including cash)
  const ev = marketCap + totalDebt + preferredEquity - cashReserves;
  const nav = holdingsValue;  // Crypto-only NAV

  // Determine which links to show and their labels
  const sourceUrl = secFilingsUrl || holdingsSourceUrl;
  const hasDashboard = officialDashboard;
  const hasSource = !!sourceUrl;
  const hasAnySource = hasSource || hasDashboard;

  // Determine smart label for source URL
  const getSourceLabel = (url: string | undefined): { label: string; desc: string } => {
    if (!url) return { label: "Source", desc: "data" };
    if (url.includes("sec.gov")) return { label: "SEC Filings", desc: "verification" };
    if (url.includes("hkex")) return { label: "HKEX Filings", desc: "verification" };
    if (url.includes("globenewswire") || url.includes("prnewswire")) return { label: "Press Release", desc: "announcement" };
    if (url.includes("ir.") || url.includes("/investor")) return { label: "Investor Relations", desc: "official" };
    return { label: "Data Source", desc: "verification" };
  };

  const sourceInfo = getSourceLabel(sourceUrl);

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

            {/* Market Cap breakdown */}
            <div>
              <div className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">
                Market Cap {sharesForMnav ? "(FD shares)" : ""}
              </div>
              <div className="space-y-0.5 text-gray-300">
                {sharesForMnav && stockPrice ? (
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>{(sharesForMnav / 1_000_000).toFixed(1)}M × ${stockPrice.toFixed(2)}</span>
                    <span className="font-mono">{formatCompact(marketCap)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span>Market Cap</span>
                    <span className="font-mono">{formatCompact(marketCap)}</span>
                  </div>
                )}
              </div>
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

            {/* NAV breakdown - crypto only */}
            <div>
              <div className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">
                {asset} NAV
              </div>
              <div className="space-y-0.5 text-gray-300">
                {cryptoPrice ? (
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>{holdings.toLocaleString()} × ${cryptoPrice.toLocaleString()}</span>
                    <span className="font-mono">{formatCompact(holdingsValue)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span>{holdings.toLocaleString()} {asset}</span>
                    <span className="font-mono">{formatCompact(holdingsValue)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Result */}
            <div className="border-t border-gray-700 pt-1">
              <div className="flex justify-between font-medium text-gray-100">
                <span>mNAV = EV / NAV</span>
                <span className="font-mono text-indigo-400">{formatMNAV(mNAV)}</span>
              </div>
            </div>

            {/* Official dashboard comparison */}
            {officialDashboardMnav && officialDashboardName && Math.abs(mNAV - officialDashboardMnav) > 0.02 && (
              <div className="text-[10px] text-amber-400/80 border-t border-gray-700 pt-1">
                Note: {officialDashboardName} shows {officialDashboardMnav.toFixed(2)}x (using issued shares)
              </div>
            )}

            {/* Data source indicator */}
            {hasLiveData && (
              <div className="text-[10px] text-green-400/70 pt-1">
                ● Live data from mNAV.com
              </div>
            )}

            {/* Source links */}
            {hasAnySource && (
              <div className="border-t border-gray-700 pt-2 mt-2 space-y-1">
                {hasSource && (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex justify-between items-center text-[11px] text-blue-400 hover:text-blue-300"
                  >
                    <span>{sourceInfo.label}</span>
                    <span className="text-gray-500">{sourceInfo.desc} →</span>
                  </a>
                )}
                {hasDashboard && (
                  <a
                    href={officialDashboard}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex justify-between items-center text-[11px] text-blue-400 hover:text-blue-300"
                  >
                    <span>Live Dashboard</span>
                    <span className="text-gray-500">real-time →</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
