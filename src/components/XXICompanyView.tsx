"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { ProvenanceMetric } from "./ProvenanceMetric";
import { XXI_PROVENANCE, XXI_CIK, XXI_PROVENANCE_DEBUG } from "@/lib/data/provenance/xxi";
import { pv, derivedSource, docSource, getSourceUrl, getSourceDate } from "@/lib/data/types/provenance";
import { StockChart } from "./stock-chart";
import { CompanyMNAVChart } from "./company-mnav-chart";
import { HoldingsPerShareChart } from "./holdings-per-share-chart";
import { HoldingsHistoryTable } from "./holdings-history-table";
import { ScheduledEvents } from "./scheduled-events";
import { MnavCalculationCard } from "./mnav-calculation-card";
import { LeverageCalculationCard, EquityNavPerShareCalculationCard } from "./expandable-metric-card";
import { StockPriceCell } from "./price-cell";
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
  VALID_INTERVALS,
  DEFAULT_INTERVAL,
  INTERVAL_LABELS,
} from "@/lib/hooks/use-stock-history";

interface XXICompanyViewProps {
  company: Company;
  className?: string;
}

/**
 * XXI-specific company view with full provenance tracking
 * 
 * XXI is a pure BTC treasury launched Dec 2025:
 * - Tether/SoftBank/Cantor backed
 * - $486.5M in convertible notes (1%, secured, due 2030)
 * - Dual-class share structure (Class A + Class B)
 */
export function XXICompanyView({ company, className = "" }: XXICompanyViewProps) {
  const { data: prices } = usePricesStream();
  
  // Chart state
  const [timeRange, setTimeRange] = useState<TimeRange>("1mo");
  const [interval, setInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1mo"]);
  const { data: history, isLoading: historyLoading } = useStockHistory("XXI", timeRange, interval);
  
  const [mnavTimeRange, setMnavTimeRange] = useState<TimeRange>("1mo");
  const [mnavInterval, setMnavInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1mo"]);
  
  // Track which calculation card is expanded
  const [expandedCard, setExpandedCard] = useState<"mnav" | "leverage" | "equityNav" | null>(null);
  
  const toggleCard = (card: "mnav" | "leverage" | "equityNav") => {
    setExpandedCard(expandedCard === card ? null : card);
  };

  // Live prices
  const btcPrice = prices?.crypto.BTC?.price || 0;
  const stockData = prices?.stocks.XXI;
  const stockPrice = stockData?.price || 0;
  const stockChange = stockData?.change24h;
  
  // Get market cap
  const { marketCap } = getMarketCapForMnavSync(company, stockData, prices?.forex);

  // Get ITM convertible adjustment
  const effectiveShares = useMemo(() => {
    if (!stockPrice) return null;
    return getEffectiveShares("XXI", company.sharesForMnav || 0, stockPrice);
  }, [stockPrice, company.sharesForMnav]);

  // =========================================================================
  // PROVENANCE-TRACKED METRICS
  // =========================================================================
  
  const metrics = useMemo(() => {
    if (!XXI_PROVENANCE.holdings || !XXI_PROVENANCE.totalDebt || !XXI_PROVENANCE.cashReserves) {
      return null;
    }

    const holdings = XXI_PROVENANCE.holdings.value;
    const totalDebt = XXI_PROVENANCE.totalDebt.value;
    const cashReserves = XXI_PROVENANCE.cashReserves.value;
    const preferredEquity = XXI_PROVENANCE.preferredEquity?.value || 0;
    const sharesOutstanding = XXI_PROVENANCE.sharesOutstanding?.value || company.sharesForMnav || 0;
    
    // ITM convertible adjustment
    const inTheMoneyDebtValue = effectiveShares?.inTheMoneyDebtValue || 0;
    const adjustedDebt = Math.max(0, totalDebt - inTheMoneyDebtValue);

    // Crypto NAV = Holdings × BTC Price
    const cryptoNav = holdings * btcPrice;
    
    // Net debt = Adjusted Debt - Cash
    const netDebt = Math.max(0, adjustedDebt - cashReserves);
    
    // EV = Market Cap + Adjusted Debt + Preferred - Cash
    const ev = marketCap + adjustedDebt + preferredEquity - cashReserves;
    
    // mNAV = EV / Crypto NAV
    const mNav = cryptoNav > 0 ? ev / cryptoNav : null;
    
    // Leverage = Net Debt / Crypto NAV
    const leverage = cryptoNav > 0 ? netDebt / cryptoNav : 0;
    
    // Equity NAV = Crypto NAV + Cash - Adjusted Debt - Preferred
    const equityNav = cryptoNav + cashReserves - adjustedDebt - preferredEquity;
    
    // Equity NAV per Share
    const equityNavPerShare = sharesOutstanding > 0 ? equityNav / sharesOutstanding : 0;
    
    // Holdings per share
    const holdingsPerShare = sharesOutstanding > 0 ? holdings / sharesOutstanding : 0;

    // Create derived provenance values
    const cryptoNavPv: ProvenanceValue<number> = pv(cryptoNav, derivedSource({
      derivation: "BTC Holdings × BTC Price",
      formula: "holdings × btcPrice",
      inputs: {
        holdings: XXI_PROVENANCE.holdings,
      },
    }), `Using live BTC price: $${btcPrice.toLocaleString()}`);

    const mNavPv: ProvenanceValue<number> | null = mNav !== null ? pv(mNav, derivedSource({
      derivation: "Enterprise Value ÷ Crypto NAV (adjusted for ITM converts)",
      formula: "(marketCap + adjustedDebt + preferred - cash) / cryptoNav",
      inputs: {
        debt: XXI_PROVENANCE.totalDebt,
        cash: XXI_PROVENANCE.cashReserves,
        holdings: XXI_PROVENANCE.holdings,
      },
    }), `Adjusted Debt: ${formatLargeNumber(adjustedDebt)} (raw ${formatLargeNumber(totalDebt)} - ITM converts ${formatLargeNumber(inTheMoneyDebtValue)})`) : null;

    const leveragePv: ProvenanceValue<number> = pv(leverage, derivedSource({
      derivation: "Net Debt ÷ Crypto NAV (adjusted for ITM converts)",
      formula: "(adjustedDebt - cash) / cryptoNav",
      inputs: {
        debt: XXI_PROVENANCE.totalDebt,
        cash: XXI_PROVENANCE.cashReserves,
        holdings: XXI_PROVENANCE.holdings,
      },
    }), `Net Debt: ${formatLargeNumber(netDebt)} (${formatLargeNumber(adjustedDebt)} debt - ${formatLargeNumber(cashReserves)} cash)`);

    const equityNavPv: ProvenanceValue<number> = pv(equityNav, derivedSource({
      derivation: "Crypto NAV + Cash − Adjusted Debt − Preferred",
      formula: "(holdings × btcPrice) + cash - adjustedDebt - preferred",
      inputs: {
        holdings: XXI_PROVENANCE.holdings,
        cash: XXI_PROVENANCE.cashReserves,
        debt: XXI_PROVENANCE.totalDebt,
      },
    }), `Debt adjusted for ITM converts: ${formatLargeNumber(adjustedDebt)}`);

    const equityNavPerSharePv: ProvenanceValue<number> = pv(equityNavPerShare, derivedSource({
      derivation: "Equity NAV ÷ Shares Outstanding",
      formula: "equityNav / shares",
      inputs: {
        holdings: XXI_PROVENANCE.holdings,
        shares: XXI_PROVENANCE.sharesOutstanding!,
        debt: XXI_PROVENANCE.totalDebt,
        cash: XXI_PROVENANCE.cashReserves,
      },
    }), `Uses adjusted debt (ITM converts treated as equity)`);

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
      adjustedDebt,
      inTheMoneyDebtValue,
      cashReserves,
      preferredEquity,
      sharesOutstanding,
    };
  }, [btcPrice, marketCap, company.sharesForMnav, effectiveShares]);

  const handleTimeRangeChange = (newRange: TimeRange) => {
    setTimeRange(newRange);
    setInterval(DEFAULT_INTERVAL[newRange]);
  };

  const handleMnavTimeRangeChange = (newRange: TimeRange) => {
    setMnavTimeRange(newRange);
    setMnavInterval(DEFAULT_INTERVAL[newRange]);
  };

  if (!metrics || !XXI_PROVENANCE.holdings) {
    return <div className="text-center py-8 text-gray-500">Loading provenance data...</div>;
  }

  return (
    <div className={className}>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* KEY VALUATION METRICS */}
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
        {/* mNAV */}
        {metrics.mNavPv && (
          <div 
            className={cn(
              "cursor-pointer transition-all rounded-lg",
              expandedCard === "mnav" && "ring-2 ring-indigo-500"
            )}
            onClick={() => toggleCard("mnav")}
          >
            <ProvenanceMetric
              label="mNAV"
              data={metrics.mNavPv}
              format="mnav"
              subLabel={<span className="flex items-center gap-1">EV / Crypto NAV <span className="text-indigo-500">{expandedCard === "mnav" ? "▼" : "▶"}</span></span>}
              tooltip="How much you pay per dollar of BTC exposure. Click to see formula."
              ticker="xxi"
            />
          </div>
        )}

        {/* Leverage */}
        <div 
          className={cn(
            "cursor-pointer transition-all rounded-lg",
            expandedCard === "leverage" && "ring-2 ring-amber-500"
          )}
          onClick={() => toggleCard("leverage")}
        >
          <ProvenanceMetric
            label="Leverage"
            data={metrics.leveragePv}
            format="mnav"
            subLabel={<span className="flex items-center gap-1">Net Debt / Crypto NAV <span className="text-amber-500">{expandedCard === "leverage" ? "▼" : "▶"}</span></span>}
            tooltip="Debt exposure relative to BTC holdings. Click to see formula."
            ticker="xxi"
          />
        </div>

        {/* Equity NAV/Share */}
        <div 
          className={cn(
            "cursor-pointer transition-all rounded-lg",
            expandedCard === "equityNav" && "ring-2 ring-indigo-500"
          )}
          onClick={() => toggleCard("equityNav")}
        >
          <ProvenanceMetric
            label="Equity NAV/Share"
            data={metrics.equityNavPerSharePv}
            format="currency"
            subLabel={<span className="flex items-center gap-1">What each share is 'worth' <span className="text-indigo-500">{expandedCard === "equityNav" ? "▼" : "▶"}</span></span>}
            tooltip="Net assets per share after debt. Click to see formula."
            ticker="xxi"
          />
        </div>

        {/* BTC Holdings */}
        <ProvenanceMetric
          label="BTC Holdings"
          data={XXI_PROVENANCE.holdings}
          format="btc"
          subLabel="From SEC 8-K"
          tooltip="Total bitcoin from merger + PIPEs"
          ticker="xxi"
        />

        {/* Cost Basis */}
        {XXI_PROVENANCE.costBasisAvg && (
          <ProvenanceMetric
            label="Avg Cost Basis"
            data={XXI_PROVENANCE.costBasisAvg}
            format="currency"
            subLabel="Per BTC"
            tooltip="Average acquisition price per BTC"
            ticker="xxi"
          />
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* EXPANDABLE CALCULATION CARDS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      
      {/* mNAV Card */}
      {expandedCard === "mnav" && (
        <div className="mb-8">
          <MnavCalculationCard
            ticker="XXI"
            asset="BTC"
            marketCap={marketCap}
            totalDebt={metrics.adjustedDebt}
            preferredEquity={metrics.preferredEquity}
            cashReserves={metrics.cashReserves}
            holdings={metrics.holdings}
            cryptoPrice={btcPrice}
            holdingsValue={metrics.cryptoNav}
            mNAV={metrics.mNav}
            sharesForMnav={metrics.sharesOutstanding}
            stockPrice={stockPrice}
            hasDilutiveInstruments={!!effectiveShares?.breakdown?.length}
            basicShares={effectiveShares?.basic}
            itmDilutionShares={effectiveShares ? effectiveShares.diluted - effectiveShares.basic : undefined}
            itmDebtAdjustment={metrics.inTheMoneyDebtValue}
            sharesSourceUrl={XXI_PROVENANCE.sharesOutstanding?.source ? getSourceUrl(XXI_PROVENANCE.sharesOutstanding.source) : undefined}
            sharesSource={XXI_PROVENANCE.sharesOutstanding?.source?.type}
            sharesAsOf={XXI_PROVENANCE.sharesOutstanding?.source ? getSourceDate(XXI_PROVENANCE.sharesOutstanding.source) : undefined}
            debtSourceUrl={XXI_PROVENANCE.totalDebt?.source ? getSourceUrl(XXI_PROVENANCE.totalDebt.source) : undefined}
            debtSource={XXI_PROVENANCE.totalDebt?.source?.type}
            debtAsOf={XXI_PROVENANCE.totalDebt?.source ? getSourceDate(XXI_PROVENANCE.totalDebt.source) : undefined}
            cashSourceUrl={XXI_PROVENANCE.cashReserves?.source ? getSourceUrl(XXI_PROVENANCE.cashReserves.source) : undefined}
            cashSource={XXI_PROVENANCE.cashReserves?.source?.type}
            cashAsOf={XXI_PROVENANCE.cashReserves?.source ? getSourceDate(XXI_PROVENANCE.cashReserves.source) : undefined}
            holdingsSourceUrl={XXI_PROVENANCE.holdings?.source ? getSourceUrl(XXI_PROVENANCE.holdings.source) : undefined}
            holdingsSource={XXI_PROVENANCE.holdings?.source?.type}
            holdingsAsOf={XXI_PROVENANCE.holdings?.source ? getSourceDate(XXI_PROVENANCE.holdings.source) : undefined}
            holdingsSearchTerm={(XXI_PROVENANCE.holdings?.source as any)?.searchTerm}
            debtSearchTerm={(XXI_PROVENANCE.totalDebt?.source as any)?.searchTerm}
            cashSearchTerm={(XXI_PROVENANCE.cashReserves?.source as any)?.searchTerm}
          />
        </div>
      )}
      
      {/* Leverage Card */}
      {expandedCard === "leverage" && (
        <div className="mb-8">
          <LeverageCalculationCard
            rawDebt={metrics.totalDebt}
            adjustedDebt={metrics.adjustedDebt}
            itmDebtAdjustment={metrics.inTheMoneyDebtValue}
            cashReserves={metrics.cashReserves}
            cryptoNav={metrics.cryptoNav}
            leverage={metrics.leverage}
            debtSourceUrl={XXI_PROVENANCE.totalDebt?.source ? getSourceUrl(XXI_PROVENANCE.totalDebt.source) : undefined}
            cashSourceUrl={XXI_PROVENANCE.cashReserves?.source ? getSourceUrl(XXI_PROVENANCE.cashReserves.source) : undefined}
            holdingsSourceUrl={XXI_PROVENANCE.holdings?.source ? getSourceUrl(XXI_PROVENANCE.holdings.source) : undefined}
          />
        </div>
      )}
      
      {/* Equity NAV/Share Card */}
      {expandedCard === "equityNav" && (
        <div className="mb-8">
          <EquityNavPerShareCalculationCard
            cryptoNav={metrics.cryptoNav}
            cashReserves={metrics.cashReserves}
            totalDebt={metrics.adjustedDebt}
            preferredEquity={metrics.preferredEquity}
            sharesOutstanding={metrics.sharesOutstanding}
            equityNav={metrics.equityNav}
            equityNavPerShare={metrics.equityNavPerShare}
            stockPrice={stockPrice}
            holdingsSourceUrl={XXI_PROVENANCE.holdings?.source ? getSourceUrl(XXI_PROVENANCE.holdings.source) : undefined}
            cashSourceUrl={XXI_PROVENANCE.cashReserves?.source ? getSourceUrl(XXI_PROVENANCE.cashReserves.source) : undefined}
            debtSourceUrl={XXI_PROVENANCE.totalDebt?.source ? getSourceUrl(XXI_PROVENANCE.totalDebt.source) : undefined}
            preferredSourceUrl={XXI_PROVENANCE.preferredEquity?.source ? getSourceUrl(XXI_PROVENANCE.preferredEquity.source) : undefined}
            sharesSourceUrl={XXI_PROVENANCE.sharesOutstanding?.source ? getSourceUrl(XXI_PROVENANCE.sharesOutstanding.source) : undefined}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BALANCE SHEET */}
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
              <span className="text-gray-400"> BTC</span>
              <span className="text-green-600"> + {formatLargeNumber(metrics.cashReserves)}</span>
              <span className="text-gray-400"> cash</span>
              <span className="text-red-600"> − {formatLargeNumber(metrics.adjustedDebt)}</span>
              <span className="text-gray-400"> debt</span>
              <span className="text-indigo-600 font-semibold"> = {formatLargeNumber(metrics.equityNav)}</span>
            </p>
            {metrics.inTheMoneyDebtValue > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Debt adjusted: {formatLargeNumber(metrics.totalDebt)} raw − {formatLargeNumber(metrics.inTheMoneyDebtValue)} ITM converts = {formatLargeNumber(metrics.adjustedDebt)}
              </p>
            )}
          </div>

          {/* Balance sheet grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Crypto NAV */}
            <ProvenanceMetric
              label="Crypto NAV"
              data={metrics.cryptoNavPv}
              format="currency"
              subLabel={`${metrics.holdings.toLocaleString()} BTC`}
              tooltip="BTC holdings at current market price"
              ticker="xxi"
            />

            {/* Cash */}
            {XXI_PROVENANCE.cashReserves && (
              <ProvenanceMetric
                label="Cash Reserves"
                data={XXI_PROVENANCE.cashReserves}
                format="currency"
                subLabel="From SEC S-1"
                tooltip="Cash and equivalents"
                ticker="xxi"
              />
            )}

            {/* Debt */}
            {XXI_PROVENANCE.totalDebt && (
              <ProvenanceMetric
                label="Total Debt"
                data={XXI_PROVENANCE.totalDebt}
                format="currency"
                subLabel="1% converts due 2030"
                tooltip="$486.5M convertible notes, secured by 16,116 BTC"
                ticker="xxi"
              />
            )}

            {/* Shares Outstanding */}
            {XXI_PROVENANCE.sharesOutstanding && (
              <ProvenanceMetric
                label="Shares Outstanding"
                data={XXI_PROVENANCE.sharesOutstanding}
                format="shares"
                subLabel="Class A + Class B"
                tooltip={`Dual-class: ${XXI_PROVENANCE_DEBUG.classAShares.toLocaleString()} A + ${XXI_PROVENANCE_DEBUG.classBShares.toLocaleString()} B`}
                ticker="xxi"
              />
            )}
          </div>

          {/* Additional info row */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
              Additional Metrics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* P&L from cost basis */}
              {XXI_PROVENANCE.costBasisAvg && btcPrice > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Unrealized P&L</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    btcPrice > XXI_PROVENANCE.costBasisAvg.value ? "text-green-600" : "text-red-600"
                  )}>
                    {btcPrice > XXI_PROVENANCE.costBasisAvg.value ? "+" : ""}
                    {(((btcPrice - XXI_PROVENANCE.costBasisAvg.value) / XXI_PROVENANCE.costBasisAvg.value) * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-400">
                    vs ${XXI_PROVENANCE.costBasisAvg.value.toLocaleString()} avg cost
                  </p>
                </div>
              )}

              {/* ITM Dilution Info */}
              {effectiveShares && effectiveShares.diluted > effectiveShares.basic && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-700 dark:text-amber-400">ITM Dilution</p>
                  <p className="text-2xl font-bold text-amber-600">
                    +{((effectiveShares.diluted - effectiveShares.basic) / 1e6).toFixed(1)}M
                  </p>
                  <p className="text-xs text-amber-500">
                    shares from ITM converts at ${stockPrice.toFixed(0)}
                  </p>
                </div>
              )}

              {/* Collateral info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-400">BTC Collateral</p>
                <p className="text-2xl font-bold text-blue-600">16,116</p>
                <p className="text-xs text-blue-500">
                  BTC securing converts (~3:1 ratio)
                </p>
              </div>

              {/* Dual-class breakdown */}
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <p className="text-sm text-purple-700 dark:text-purple-400">Share Classes</p>
                <p className="text-lg font-bold text-purple-600">
                  {(XXI_PROVENANCE_DEBUG.classAShares / 1e6).toFixed(0)}M A / {(XXI_PROVENANCE_DEBUG.classBShares / 1e6).toFixed(0)}M B
                </p>
                <p className="text-xs text-purple-500">
                  Class A (public) / Class B (founders)
                </p>
              </div>
            </div>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2">
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
              Limited history — XXI launched Dec 2025
            </div>
          )}
        </div>
      </details>

      {/* mNAV History Chart */}
      {metrics.mNav && stockPrice > 0 && btcPrice > 0 && (
        <details open className="mb-4 bg-gray-50 dark:bg-gray-900 rounded-lg group">
          <summary className="p-4 cursor-pointer flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">mNAV History</h2>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{metrics.mNav.toFixed(2)}x</span>
              <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </summary>
          <div className="px-4 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-2">
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
              </div>
            </div>
            <CompanyMNAVChart
              ticker="XXI"
              asset="BTC"
              currentMNAV={metrics.mNav}
              currentStockPrice={stockPrice}
              currentCryptoPrice={btcPrice}
              timeRange={mnavTimeRange}
              interval={mnavInterval}
              className=""
              companyData={{
                holdings: metrics.holdings,
                sharesForMnav: metrics.sharesOutstanding,
                totalDebt: metrics.totalDebt,
                preferredEquity: metrics.preferredEquity,
                cashReserves: metrics.cashReserves,
                restrictedCash: 0,
                asset: "BTC",
              }}
            />
          </div>
        </details>
      )}

      {/* Holdings Per Share Growth Chart */}
      <details open className="mb-8 bg-gray-50 dark:bg-gray-900 rounded-lg group">
        <summary className="p-4 cursor-pointer flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">BTC/Share Growth</h2>
          <div className="flex items-center gap-3">
            <span className="text-lg font-mono text-gray-900 dark:text-gray-100">
              {metrics.holdingsPerShare ? metrics.holdingsPerShare.toFixed(7) : "—"}
            </span>
            <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </summary>
        <div className="px-4 pb-4">
          <HoldingsPerShareChart
            ticker="XXI"
            asset="BTC"
            currentHoldingsPerShare={metrics.holdingsPerShare}
            className=""
          />
        </div>
      </details>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DATA SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">📁</span>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</h2>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* Holdings History Table */}
      <details className="mb-4 bg-gray-50 dark:bg-gray-900 rounded-lg group">
        <summary className="p-4 cursor-pointer flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Holdings History</h3>
          <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="px-4 pb-4">
          <HoldingsHistoryTable
            ticker="XXI"
            asset="BTC"
            className=""
          />
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
          <ScheduledEvents
            ticker="XXI"
            stockPrice={stockPrice}
            className=""
          />
        </div>
      </details>
    </div>
  );
}
