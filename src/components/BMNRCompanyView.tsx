"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { ProvenanceMetric } from "./ProvenanceMetric";
import { BMNR_PROVENANCE, BMNR_CIK } from "@/lib/data/provenance/bmnr";
import { pv, derivedSource, docSource } from "@/lib/data/types/provenance";
import { StockChart } from "./stock-chart";
import { CompanyMNAVChart } from "./company-mnav-chart";
import { HoldingsPerShareChart } from "./holdings-per-share-chart";
import { HoldingsHistoryTable } from "./holdings-history-table";
import { ScheduledEvents } from "./scheduled-events";
import { StockPriceCell } from "./price-cell";
import { getCompanyIntel } from "@/lib/data/company-intel";
import { getEffectiveShares } from "@/lib/data/dilutive-instruments";
import { getMarketCapForMnavSync } from "@/lib/utils/market-cap";
import { formatLargeNumber } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import type { Company } from "@/lib/types";
import type { ProvenanceValue } from "@/lib/data/types/provenance";
import {
  useStockHistory,
  TimeRange,
  ChartInterval,
  DEFAULT_INTERVAL,
} from "@/lib/hooks/use-stock-history";

interface BMNRCompanyViewProps {
  company: Company;
  className?: string;
}

/**
 * BMNR-specific company view with full provenance tracking
 * 
 * Simpler than MSTR: no debt, no preferred equity.
 * Has staking (~67% of ETH staked).
 */
export function BMNRCompanyView({ company, className = "" }: BMNRCompanyViewProps) {
  const { data: prices } = usePricesStream();
  
  // Chart state
  const [timeRange, setTimeRange] = useState<TimeRange>("1y");
  const [interval, setInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const { data: history, isLoading: historyLoading } = useStockHistory("BMNR", timeRange, interval);
  
  const [mnavTimeRange, setMnavTimeRange] = useState<TimeRange>("1y");
  const [mnavInterval, setMnavInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);

  // Live prices
  const ethPrice = prices?.crypto.ETH?.price || 0;
  const stockData = prices?.stocks.BMNR;
  const stockPrice = stockData?.price || 0;
  const stockChange = stockData?.change24h;
  
  // Get market cap
  const { marketCap } = getMarketCapForMnavSync(company, stockData, prices?.forex);

  // =========================================================================
  // PROVENANCE-TRACKED METRICS
  // =========================================================================
  
  const metrics = useMemo(() => {
    if (!BMNR_PROVENANCE.holdings || !BMNR_PROVENANCE.cashReserves) {
      return null;
    }

    const holdings = BMNR_PROVENANCE.holdings.value;
    const totalDebt = BMNR_PROVENANCE.totalDebt?.value || 0;
    const cashReserves = BMNR_PROVENANCE.cashReserves.value;
    const preferredEquity = BMNR_PROVENANCE.preferredEquity?.value || 0;
    const sharesOutstanding = BMNR_PROVENANCE.sharesOutstanding?.value || company.sharesForMnav || 0;
    
    // Crypto NAV = Holdings × ETH Price
    const cryptoNav = holdings * ethPrice;
    
    // Net debt = Debt - Cash (BMNR has no debt, so this is negative = net cash)
    const netDebt = Math.max(0, totalDebt - cashReserves);
    
    // EV = Market Cap + Debt + Preferred - Cash
    const ev = marketCap + totalDebt + preferredEquity - cashReserves;
    
    // mNAV = EV / Crypto NAV
    const mNav = cryptoNav > 0 ? ev / cryptoNav : null;
    
    // Leverage = Net Debt / Crypto NAV
    const leverage = cryptoNav > 0 ? netDebt / cryptoNav : 0;
    
    // Equity NAV = Crypto NAV + Cash - Debt - Preferred
    const equityNav = cryptoNav + cashReserves - totalDebt - preferredEquity;
    
    // Equity NAV per Share
    const equityNavPerShare = sharesOutstanding > 0 ? equityNav / sharesOutstanding : 0;
    
    // Holdings per share
    const holdingsPerShare = sharesOutstanding > 0 ? holdings / sharesOutstanding : 0;

    // Create derived provenance values
    const cryptoNavPv: ProvenanceValue<number> = pv(cryptoNav, derivedSource({
      derivation: "ETH Holdings × ETH Price",
      formula: "holdings × ethPrice",
      inputs: {
        holdings: BMNR_PROVENANCE.holdings,
      },
    }), `Using live ETH price: $${ethPrice.toLocaleString()}`);

    const mNavPv: ProvenanceValue<number> | null = mNav !== null ? pv(mNav, derivedSource({
      derivation: "Enterprise Value ÷ Crypto NAV",
      formula: "(marketCap + debt + preferred - cash) / cryptoNav",
      inputs: {
        cash: BMNR_PROVENANCE.cashReserves,
        holdings: BMNR_PROVENANCE.holdings,
      },
    }), `BMNR has no debt - EV = Market Cap - Cash`) : null;

    const leveragePv: ProvenanceValue<number> = pv(leverage, derivedSource({
      derivation: "Net Debt ÷ Crypto NAV",
      formula: "(debt - cash) / cryptoNav",
      inputs: {
        cash: BMNR_PROVENANCE.cashReserves,
        holdings: BMNR_PROVENANCE.holdings,
      },
    }), `BMNR has no debt - leverage is 0x`);

    const equityNavPv: ProvenanceValue<number> = pv(equityNav, derivedSource({
      derivation: "Crypto NAV + Cash − Debt − Preferred",
      formula: "(holdings × ethPrice) + cash - debt - preferred",
      inputs: {
        holdings: BMNR_PROVENANCE.holdings,
        cash: BMNR_PROVENANCE.cashReserves,
      },
    }), `No debt or preferred - Equity NAV = Crypto NAV + Cash`);

    const equityNavPerSharePv: ProvenanceValue<number> = pv(equityNavPerShare, derivedSource({
      derivation: "Equity NAV ÷ Shares Outstanding",
      formula: "equityNav / shares",
      inputs: {
        holdings: BMNR_PROVENANCE.holdings,
        shares: BMNR_PROVENANCE.sharesOutstanding!,
        cash: BMNR_PROVENANCE.cashReserves,
      },
    }), `Basic shares from 10-Q cover page`);

    return {
      holdings,
      cryptoNav,
      cryptoNavPv,
      mNav,
      mNavPv,
      leverage,
      leveragePv,
      equityNav,
      equityNavPv,
      equityNavPerShare,
      equityNavPerSharePv,
      holdingsPerShare,
      netDebt,
      totalDebt,
      cashReserves,
      preferredEquity,
      sharesOutstanding,
    };
  }, [ethPrice, marketCap, company.sharesForMnav]);

  const handleTimeRangeChange = (newRange: TimeRange) => {
    setTimeRange(newRange);
    setInterval(DEFAULT_INTERVAL[newRange]);
  };

  const handleMnavTimeRangeChange = (newRange: TimeRange) => {
    setMnavTimeRange(newRange);
    setMnavInterval(DEFAULT_INTERVAL[newRange]);
  };

  if (!metrics || !BMNR_PROVENANCE.holdings) {
    return <div className="text-center py-8 text-gray-500">Loading provenance data...</div>;
  }

  return (
    <div className={className}>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* KEY VALUATION METRICS - All derived with click-to-verify */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">📊</span>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Key Metrics
        </h2>
        <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded ml-auto">
          Click any value for source
        </span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {/* mNAV */}
        {metrics.mNavPv && (
          <ProvenanceMetric
            label="mNAV"
            data={metrics.mNavPv}
            format="mnav"
            subLabel="EV / Crypto NAV"
            tooltip="How much you pay per dollar of ETH exposure"
            ticker="bmnr"
          />
        )}

        {/* Leverage */}
        <ProvenanceMetric
          label="Leverage"
          data={metrics.leveragePv}
          format="mnav"
          subLabel="Net Debt / Crypto NAV"
          tooltip="BMNR has no debt"
          ticker="bmnr"
        />

        {/* Equity NAV/Share */}
        <ProvenanceMetric
          label="Equity NAV/Share"
          data={metrics.equityNavPerSharePv}
          format="currency"
          subLabel="What each share is 'worth'"
          tooltip="Net assets per share"
          ticker="bmnr"
        />

        {/* ETH Holdings */}
        <ProvenanceMetric
          label="ETH Holdings"
          data={BMNR_PROVENANCE.holdings}
          format="eth"
          subLabel="From SEC 8-K"
          tooltip="Total ETH held"
          ticker="bmnr"
        />

        {/* Cost Basis */}
        {BMNR_PROVENANCE.costBasisAvg && (
          <ProvenanceMetric
            label="Avg Cost Basis"
            data={BMNR_PROVENANCE.costBasisAvg}
            format="currency"
            subLabel="Per ETH"
            tooltip="Average purchase price"
            ticker="bmnr"
          />
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BALANCE SHEET - All SEC-sourced with click-to-verify */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <details open className="mb-8 bg-gray-50 dark:bg-gray-900 rounded-lg group">
        <summary className="p-4 cursor-pointer flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Balance Sheet
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {formatLargeNumber(metrics.equityNav)} Equity NAV
            </span>
            <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </summary>
        
        <div className="px-4 pb-4">
          {/* Equation visualization */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 mb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Equity NAV Formula
            </p>
            <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
              <span className="text-gray-900 dark:text-gray-100">{formatLargeNumber(metrics.cryptoNav)}</span>
              <span className="text-gray-400"> ETH</span>
              <span className="text-green-600"> + {formatLargeNumber(metrics.cashReserves)}</span>
              <span className="text-gray-400"> cash</span>
              <span className="text-indigo-600 font-semibold"> = {formatLargeNumber(metrics.equityNav)}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">No debt, no preferred equity — clean balance sheet</p>
          </div>

          {/* Balance sheet grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Crypto NAV */}
            <ProvenanceMetric
              label="Crypto NAV"
              data={metrics.cryptoNavPv}
              format="currency"
              subLabel={`${metrics.holdings.toLocaleString()} ETH`}
              tooltip="ETH holdings × ETH price"
              ticker="bmnr"
            />

            {/* Cash */}
            {BMNR_PROVENANCE.cashReserves && (
              <ProvenanceMetric
                label="Cash Reserves"
                data={BMNR_PROVENANCE.cashReserves}
                format="currency"
                subLabel="Operating capital"
                tooltip="Cash position from 8-K"
                ticker="bmnr"
              />
            )}

            {/* Staking */}
            {company.stakingPct && company.stakingPct > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Staking</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {(company.stakingPct * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-gray-400">
                  {Math.round(metrics.holdings * company.stakingPct).toLocaleString()} ETH staked
                </p>
              </div>
            )}

            {/* Shares */}
            {BMNR_PROVENANCE.sharesOutstanding && (
              <ProvenanceMetric
                label="Shares Outstanding"
                data={BMNR_PROVENANCE.sharesOutstanding}
                format="shares"
                subLabel="Basic shares"
                tooltip="From 10-Q cover page"
                ticker="bmnr"
              />
            )}
          </div>
        </div>
      </details>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CHARTS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">📈</span>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Charts</h2>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* Stock Price Chart */}
      <details open className="mb-4 bg-gray-50 dark:bg-gray-900 rounded-lg group">
        <summary className="p-4 cursor-pointer flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Stock Price</h2>
          <div className="flex items-center gap-3">
            <StockPriceCell price={stockPrice} change24h={stockChange} />
            <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </summary>
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {(["1d", "7d", "1mo", "1y", "all"] as const).map((range) => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                className={cn(
                  "px-3 py-1 text-sm rounded-md transition-colors",
                  timeRange === range
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300"
                )}
              >
                {range === "1d" ? "24H" : range === "7d" ? "7D" : range === "1mo" ? "1M" : range === "1y" ? "1Y" : "ALL"}
              </button>
            ))}
          </div>
          {historyLoading ? (
            <div className="h-[400px] flex items-center justify-center text-gray-500">
              Loading chart data...
            </div>
          ) : history && history.length > 0 ? (
            <StockChart data={history} />
          ) : (
            <div className="h-[400px] flex items-center justify-center text-gray-500">
              No historical data available
            </div>
          )}
        </div>
      </details>

      {/* mNAV History */}
      {metrics.mNav !== null && (
        <details open className="mb-4 bg-gray-50 dark:bg-gray-900 rounded-lg group">
          <summary className="p-4 cursor-pointer flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">mNAV History</h2>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                {metrics.mNav.toFixed(2)}x
              </span>
              <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </summary>
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-2 mb-4">
              {([
                { value: "1d", label: "24H" },
                { value: "7d", label: "7D" },
                { value: "1mo", label: "1M" },
                { value: "1y", label: "1Y" },
                { value: "all", label: "ALL" },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleMnavTimeRangeChange(value)}
                  className={cn(
                    "px-3 py-1 text-sm rounded-md transition-colors",
                    mnavTimeRange === value
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <CompanyMNAVChart
              ticker="BMNR"
              asset="ETH"
              currentMNAV={metrics.mNav}
              currentStockPrice={stockPrice}
              currentCryptoPrice={ethPrice}
              timeRange={mnavTimeRange}
              interval={mnavInterval}
            />
          </div>
        </details>
      )}

      {/* ETH/Share Growth */}
      <details open className="mb-8 bg-gray-50 dark:bg-gray-900 rounded-lg group">
        <summary className="p-4 cursor-pointer flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">ETH/Share Growth</h2>
          <div className="flex items-center gap-3">
            <span className="text-lg font-mono text-gray-900 dark:text-gray-100">
              {metrics.holdingsPerShare.toFixed(6)}
            </span>
            <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </summary>
        <div className="px-4 pb-4">
          <HoldingsPerShareChart
            ticker="BMNR"
            asset="ETH"
            currentHoldingsPerShare={metrics.holdingsPerShare}
          />
        </div>
      </details>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DATA */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="mb-4 mt-8 flex items-center gap-2">
        <span className="text-lg">📁</span>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</h2>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* Holdings History */}
      <details className="mb-4 bg-gray-50 dark:bg-gray-900 rounded-lg group">
        <summary className="p-4 cursor-pointer flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Holdings History</h3>
          <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="px-4 pb-4">
          <HoldingsHistoryTable ticker="BMNR" asset="ETH" />
        </div>
      </details>

      {/* Scheduled Events */}
      <details className="mb-4 bg-gray-50 dark:bg-gray-900 rounded-lg group">
        <summary className="p-4 cursor-pointer flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Scheduled Events</h3>
          <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="px-4 pb-4">
          <ScheduledEvents ticker="BMNR" stockPrice={stockPrice} />
        </div>
      </details>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* RESEARCH SECTION */}
      <div className="mb-4 mt-8 flex items-center gap-2">
        <span className="text-lg">📰</span>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Research & Filings</h2>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* Strategy & Overview */}
      {(() => {
        const intel = getCompanyIntel("BMNR");
        return (
          <details className="bg-gray-50 dark:bg-gray-900 rounded-lg mb-4 group" open>
            <summary className="p-6 cursor-pointer flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Strategy & Overview
              </h3>
              <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-6 pb-6">
              {/* Links */}
              <div className="flex items-center gap-3 mb-6">
                {company.website && (
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                    Website
                  </a>
                )}
                {company.twitter && (
                  <a href={`https://twitter.com/${company.twitter.replace('https://twitter.com/', '').replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    Twitter
                  </a>
                )}
              </div>

              {/* Strategy Summary */}
              {intel?.strategySummary ? (
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">{intel.strategySummary}</p>
              ) : company.strategy ? (
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  <span className="font-medium">Strategy:</span> {company.strategy}
                </p>
              ) : null}

              {/* Key People */}
              {intel?.keyBackers && intel.keyBackers.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Key People</h4>
                  <div className="flex flex-wrap gap-2">
                    {intel.keyBackers.map((backer, idx) => (
                      <span key={idx} className="px-3 py-1.5 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full font-medium">
                        {backer}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Developments */}
              {intel?.recentDevelopments && intel.recentDevelopments.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Recent Developments</h4>
                  <ul className="space-y-2">
                    {intel.recentDevelopments.slice(0, 6).map((dev, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300 text-sm">
                        <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-indigo-500" />
                        <span>{dev}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Notes */}
              {company.notes && (
                <p className="text-gray-600 dark:text-gray-400 text-sm">{company.notes}</p>
              )}
            </div>
          </details>
        );
      })()}

      {/* Data freshness note */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-500 dark:text-gray-400">
        <strong>Data Provenance:</strong> All values are sourced from SEC EDGAR filings (XBRL data or document text). 
        Click any metric to see its exact source and verify it yourself. Derived values show the formula and 
        link to their SEC-filed inputs.
      </div>
    </div>
  );
}
