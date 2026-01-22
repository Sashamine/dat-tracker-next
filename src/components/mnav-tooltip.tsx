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
  restrictedCash?: number; // Cash that can't be freely used
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
  officialDashboardName?: string;  // e.g., "strategy.com"
  officialMnavNote?: string;  // Methodology difference note
  // Source links
  holdingsSourceUrl?: string;
  officialDashboard?: string;
  secFilingsUrl?: string;
  // Data source indicator
  hasLiveData?: boolean;
  // Source tracking for each component
  sharesSource?: string;
  sharesAsOf?: string;
  sharesSourceUrl?: string;
  debtSource?: string;
  debtAsOf?: string;
  debtSourceUrl?: string;
  cashSource?: string;
  cashAsOf?: string;
  cashSourceUrl?: string;
  preferredSource?: string;
  preferredAsOf?: string;
  preferredSourceUrl?: string;
}

function formatCompact(num: number): string {
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

// Format source citation as compact inline text
function SourceCite({ source, asOf, sourceUrl }: { source?: string; asOf?: string; sourceUrl?: string }) {
  if (!source) return null;

  const text = asOf ? `${source} (${asOf})` : source;

  if (sourceUrl) {
    return (
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-[9px] text-blue-400/70 hover:text-blue-300 ml-1"
      >
        [{text}]
      </a>
    );
  }

  return <span className="text-[9px] text-gray-500 ml-1">[{text}]</span>;
}

/**
 * mNAV tooltip showing calculation breakdown
 *
 * Formula:
 * freeCash = cashReserves - restrictedCash
 * EV = Market Cap + Debt + Preferred - freeCash
 * NAV = Holdings Value (crypto only)
 * mNAV = EV / NAV
 */
export function MNAVTooltip({
  mNAV,
  marketCap,
  holdingsValue,
  totalDebt = 0,
  preferredEquity = 0,
  cashReserves = 0,
  restrictedCash = 0,
  otherInvestments = 0,
  ticker,
  asset,
  holdings,
  sharesForMnav,
  stockPrice,
  cryptoPrice,
  officialDashboardName,
  officialMnavNote,
  holdingsSourceUrl,
  officialDashboard,
  secFilingsUrl,
  hasLiveData,
  sharesSource,
  sharesAsOf,
  sharesSourceUrl,
  debtSource,
  debtAsOf,
  debtSourceUrl,
  cashSource,
  cashAsOf,
  cashSourceUrl,
  preferredSource,
  preferredAsOf,
  preferredSourceUrl,
}: MNAVTooltipProps) {
  // Calculate EV and NAV for display (matches Strategy's methodology)
  // freeCash = cashReserves - restrictedCash (only subtract unencumbered cash)
  // EV = Market Cap + Debt + Preferred - freeCash
  // NAV = Crypto value only (NOT including cash)
  const freeCash = cashReserves - restrictedCash;
  const ev = marketCap + totalDebt + preferredEquity - freeCash;
  const nav = holdingsValue;  // Crypto-only NAV
  const hasRestrictedCash = restrictedCash > 0;

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
                  <div className="flex justify-between items-start text-[10px] text-gray-400">
                    <span className="flex items-center flex-wrap">
                      {(sharesForMnav / 1_000_000).toFixed(1)}M × ${stockPrice.toFixed(2)}
                      <SourceCite source={sharesSource} asOf={sharesAsOf} sourceUrl={sharesSourceUrl} />
                    </span>
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
                  <div className="flex justify-between items-start">
                    <span className="flex items-center flex-wrap">
                      + Debt
                      <SourceCite source={debtSource} asOf={debtAsOf} sourceUrl={debtSourceUrl} />
                    </span>
                    <span className="font-mono text-red-400">{formatCompact(totalDebt)}</span>
                  </div>
                )}
                {preferredEquity > 0 && (
                  <div className="flex justify-between items-start">
                    <span className="flex items-center flex-wrap">
                      + Preferred
                      <SourceCite source={preferredSource} asOf={preferredAsOf} sourceUrl={preferredSourceUrl} />
                    </span>
                    <span className="font-mono text-red-400">{formatCompact(preferredEquity)}</span>
                  </div>
                )}
                {freeCash > 0 && (
                  <div className="flex justify-between items-start">
                    <span className="flex items-center flex-wrap">
                      - {hasRestrictedCash ? 'Free Cash' : 'Cash'}
                      <SourceCite source={cashSource} asOf={cashAsOf} sourceUrl={cashSourceUrl} />
                    </span>
                    <span className="font-mono text-green-400">({formatCompact(freeCash)})</span>
                  </div>
                )}
                {hasRestrictedCash && (
                  <div className="flex justify-between items-start text-[10px] text-gray-500">
                    <span className="italic">({formatCompact(restrictedCash)} restricted)</span>
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

            {/* Official dashboard methodology note */}
            {officialDashboardName && officialMnavNote && (
              <div className="text-[10px] text-amber-400/80 border-t border-gray-700 pt-1">
                Note: {officialDashboardName} uses {officialMnavNote}
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
