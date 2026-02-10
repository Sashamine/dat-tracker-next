"use client";

import { formatLargeNumber } from "@/lib/calculations";
import { FilingCite } from "@/components/wiki-citation";

interface MnavCalculationCardProps {
  ticker: string;
  asset: string;
  // EV components
  marketCap: number;
  totalDebt: number;
  preferredEquity: number;
  cashReserves: number;
  // CV components
  holdings: number;
  cryptoPrice: number;
  holdingsValue: number;
  // Result
  mNAV: number | null;
  // Share breakdown (for market cap)
  sharesForMnav?: number;
  stockPrice?: number;
  // Dilution info
  hasDilutiveInstruments?: boolean;
  basicShares?: number;
  itmDilutionShares?: number;
  itmDebtAdjustment?: number;
  // Source URLs
  sharesSourceUrl?: string;
  sharesSource?: string;
  sharesAsOf?: string;
  debtSourceUrl?: string;
  debtSource?: string;
  debtAsOf?: string;
  cashSourceUrl?: string;
  cashSource?: string;
  cashAsOf?: string;
  preferredSourceUrl?: string;
  preferredSource?: string;
  preferredAsOf?: string;
  holdingsSourceUrl?: string;
  holdingsSource?: string;
  holdingsAsOf?: string;
}

function SourceLink({ 
  url, 
  ticker,
  date,
  filingType = "8-K",
  label 
}: { 
  url?: string; 
  ticker?: string;
  date?: string;
  filingType?: "8-K" | "10-Q" | "10-K";
  label?: string;
}) {
  // Use FilingCite for SEC filings
  if (ticker && date && url?.includes("sec.gov")) {
    return (
      <FilingCite 
        ticker={ticker} 
        date={date} 
        filingType={filingType}
      />
    );
  }
  
  if (!url) return <span className="text-gray-500 text-[10px] ml-1">[—]</span>;
  
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-500 hover:text-blue-400 text-[10px] ml-1"
      title={label || "View source"}
    >
      [src↗]
    </a>
  );
}

function FormulaRow({ 
  label, 
  value, 
  color = "text-gray-300",
  sourceUrl,
  sourceTicker,
  sourceDate,
  sourceLabel,
  prefix = "",
  showZero = true,
}: {
  label: string;
  value: number;
  color?: string;
  sourceUrl?: string;
  sourceTicker?: string;
  sourceDate?: string;
  sourceLabel?: string;
  prefix?: string;
  showZero?: boolean;
}) {
  if (!showZero && value === 0) return null;
  
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-gray-400 text-sm">{prefix}{label}</span>
      <span className={`font-mono text-sm ${color} flex items-center`}>
        {formatLargeNumber(value)}
        <SourceLink 
          url={sourceUrl} 
          ticker={sourceTicker}
          date={sourceDate}
          label={sourceLabel}
        />
      </span>
    </div>
  );
}

export function MnavCalculationCard({
  ticker,
  asset,
  marketCap,
  totalDebt,
  preferredEquity,
  cashReserves,
  holdings,
  cryptoPrice,
  holdingsValue,
  mNAV: mNAVProp,
  sharesForMnav,
  stockPrice,
  hasDilutiveInstruments,
  basicShares,
  itmDilutionShares,
  itmDebtAdjustment,
  sharesSourceUrl,
  sharesSource,
  sharesAsOf,
  debtSourceUrl,
  debtSource,
  debtAsOf,
  cashSourceUrl,
  cashSource,
  cashAsOf,
  preferredSourceUrl,
  preferredSource,
  preferredAsOf,
  holdingsSourceUrl,
  holdingsSource,
  holdingsAsOf,
}: MnavCalculationCardProps) {
  // Calculate EV
  const adjustedDebt = totalDebt - (itmDebtAdjustment || 0);
  const ev = marketCap + adjustedDebt + preferredEquity - cashReserves;
  
  // Use calculated mNAV if not provided or null
  const mNAV = mNAVProp ?? (holdingsValue > 0 ? ev / holdingsValue : null);
  
  // Format mNAV
  const formatMNAV = (m: number | null | undefined) => {
    if (m == null) return "—";
    if (m >= 10) return m.toFixed(1) + "x";
    return m.toFixed(2) + "x";
  };
  
  // Don't render if we can't calculate mNAV
  if (mNAV == null || holdingsValue <= 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          mNAV Calculation
        </h3>
        <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
          {formatMNAV(mNAV)}
        </span>
      </div>

      {/* EV Section */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
          Enterprise Value (EV)
          <span 
            className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-gray-200 dark:bg-gray-700 text-[9px] cursor-help"
            title="Market Cap + Debt + Preferred − Cash"
          >?</span>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700 space-y-0.5">
          {/* Market Cap with share breakdown */}
          <div className="flex justify-between items-center py-0.5">
            <span className="text-gray-400 text-sm">Market Cap</span>
            <span className="font-mono text-sm text-gray-300 flex items-center">
              {formatLargeNumber(marketCap)}
              <SourceLink 
                url={sharesSourceUrl} 
                ticker={ticker}
                date={sharesAsOf}
                label={sharesSource}
              />
            </span>
          </div>
          {sharesForMnav && stockPrice && (
            <div className="text-[10px] text-gray-500 pl-2 -mt-0.5 mb-1">
              {hasDilutiveInstruments && basicShares ? (
                <>
                  {(basicShares / 1e6).toFixed(1)}M basic
                  {itmDilutionShares && itmDilutionShares > 0 && (
                    <span className="text-amber-500"> + {(itmDilutionShares / 1e6).toFixed(1)}M ITM</span>
                  )}
                  {" "}× ${stockPrice.toFixed(2)}
                </>
              ) : (
                <>{(sharesForMnav / 1e6).toFixed(1)}M shares × ${stockPrice.toFixed(2)}</>
              )}
            </div>
          )}
          
          <FormulaRow 
            label="Debt" 
            value={adjustedDebt}
            color={adjustedDebt > 0 ? "text-red-400" : "text-gray-500"}
            prefix="+ "
            sourceUrl={debtSourceUrl}
            sourceTicker={ticker}
            sourceDate={debtAsOf}
            sourceLabel={debtSource}
          />
          
          <FormulaRow 
            label="Preferred" 
            value={preferredEquity}
            color={preferredEquity > 0 ? "text-red-400" : "text-gray-500"}
            prefix="+ "
            sourceUrl={preferredSourceUrl}
            sourceTicker={ticker}
            sourceDate={preferredAsOf}
            sourceLabel={preferredSource}
            showZero={true}
          />
          
          <FormulaRow 
            label="Cash" 
            value={cashReserves}
            color={cashReserves > 0 ? "text-green-400" : "text-gray-500"}
            prefix="− "
            sourceUrl={cashSourceUrl}
            sourceTicker={ticker}
            sourceDate={cashAsOf}
            sourceLabel={cashSource}
            showZero={true}
          />
          
          <div className="flex justify-between items-center pt-1 border-t border-gray-200 dark:border-gray-700 mt-1">
            <span className="text-gray-300 text-sm font-medium">= EV</span>
            <span className="font-mono text-sm text-white font-semibold">
              {formatLargeNumber(ev)}
            </span>
          </div>
        </div>
      </div>

      {/* CV Section */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
          Crypto Value (CV)
          <span 
            className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-gray-200 dark:bg-gray-700 text-[9px] cursor-help"
            title="Holdings × Current Price"
          >?</span>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">
              {holdings.toLocaleString()} {asset} × ${cryptoPrice.toLocaleString()}
            </span>
            <span className="font-mono text-sm text-gray-300 flex items-center">
              {formatLargeNumber(holdingsValue)}
              <SourceLink 
                url={holdingsSourceUrl} 
                ticker={ticker}
                date={holdingsAsOf}
                label={holdingsSource}
              />
            </span>
          </div>
        </div>
      </div>

      {/* Result */}
      <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded p-3 border border-indigo-200 dark:border-indigo-700">
        <div className="flex justify-between items-center">
          <span className="text-indigo-700 dark:text-indigo-300 text-sm">
            mNAV = EV / CV
          </span>
          <span className="font-mono text-lg text-indigo-600 dark:text-indigo-400 font-bold">
            {formatLargeNumber(ev)} / {formatLargeNumber(holdingsValue)} = {formatMNAV(mNAV)}
          </span>
        </div>
        <div className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1">
          {mNAV > 1 ? (
            <>Trading at {((mNAV - 1) * 100).toFixed(0)}% premium to crypto NAV</>
          ) : mNAV < 1 ? (
            <>Trading at {((1 - mNAV) * 100).toFixed(0)}% discount to crypto NAV</>
          ) : (
            <>Trading at parity with crypto NAV</>
          )}
        </div>
      </div>
    </div>
  );
}
