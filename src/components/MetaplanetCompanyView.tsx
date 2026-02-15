"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { ProvenanceMetric } from "./ProvenanceMetric";
import { METAPLANET_PROVENANCE } from "@/lib/data/provenance/metaplanet";
import { pv, derivedSource, getSourceUrl, getSourceDate } from "@/lib/data/types/provenance";
import { StockChart } from "./stock-chart";
import { CompanyMNAVChart } from "./company-mnav-chart";
import { HoldingsPerShareChart } from "./holdings-per-share-chart";
import { HoldingsHistoryTable } from "./holdings-history-table";
import { ScheduledEvents } from "./scheduled-events";
import { MnavCalculationCard } from "./mnav-calculation-card";
import { LeverageCalculationCard, EquityNavPerShareCalculationCard } from "./expandable-metric-card";
import { StockPriceCell } from "./price-cell";
import { getMarketCapForMnavSync } from "@/lib/utils/market-cap";
import { formatLargeNumber } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import { getCompanyIntel } from "@/lib/data/company-intel";
import type { Company } from "@/lib/types";
import type { ProvenanceValue } from "@/lib/data/types/provenance";
import { StalenessNote } from "./staleness-note";
import {
  useStockHistory,
  TimeRange,
  ChartInterval,
  DEFAULT_INTERVAL,
} from "@/lib/hooks/use-stock-history";

interface MetaplanetCompanyViewProps {
  company: Company;
  className?: string;
}

/**
 * Metaplanet (3350.T) company view with full provenance tracking
 * 
 * Japan's leading Bitcoin Treasury Company on Tokyo Stock Exchange:
 * - Single-class common shares (no dual-class structure)
 * - Zero-coupon yen-denominated bonds (no interest payments)
 * - JPY-denominated stock, needs forex conversion for USD metrics
 * - TDnet regulatory filings (not SEC)
 */
export function MetaplanetCompanyView({ company, className = "" }: MetaplanetCompanyViewProps) {
  const { data: prices } = usePricesStream();
  
  // Chart state
  const [timeRange, setTimeRange] = useState<TimeRange>("1mo");
  const [interval, setInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1mo"]);
  const [chartMode, setChartMode] = useState<"price" | "mnav" | "hps">("price");
  const { data: history, isLoading: historyLoading } = useStockHistory("3350.T", timeRange, interval);
  
  const [mnavTimeRange, setMnavTimeRange] = useState<TimeRange>("1mo");
  const [mnavInterval, setMnavInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1mo"]);
  
  // Track which calculation card is expanded
  const [expandedCard, setExpandedCard] = useState<"mnav" | "leverage" | "equityNav" | null>(null);
  
  const toggleCard = (card: "mnav" | "leverage" | "equityNav") => {
    setExpandedCard(expandedCard === card ? null : card);
  };

  // Live prices
  const btcPrice = prices?.crypto.BTC?.price || 0;
  const stockData = prices?.stocks["3350.T"];
  const stockPrice = stockData?.price || 0;
  const stockChange = stockData?.change24h;
  const jpyUsdRate = prices?.forex?.JPY || 156; // JPY per USD
  
  // Get market cap (handles JPY conversion internally)
  const { marketCap } = getMarketCapForMnavSync(company, stockData, prices?.forex);

  // =========================================================================
  // PROVENANCE-TRACKED METRICS
  // =========================================================================
  
  const metrics = useMemo(() => {
    if (!METAPLANET_PROVENANCE.holdings || !METAPLANET_PROVENANCE.totalDebt || !METAPLANET_PROVENANCE.cashReserves) {
      return null;
    }

    const holdings = METAPLANET_PROVENANCE.holdings.value;
    const totalDebt = METAPLANET_PROVENANCE.totalDebt.value;
    const cashReserves = METAPLANET_PROVENANCE.cashReserves.value;
    const preferredEquity = company.preferredEquity || 0; // Mercury Class B preferred: ~$567M
    const sharesOutstanding = METAPLANET_PROVENANCE.sharesOutstanding?.value || company.sharesForMnav || 0;
    
    // No ITM convertible adjustment for Metaplanet (zero-coupon bonds don't convert)
    const adjustedDebt = totalDebt;

    // Crypto NAV = Holdings × BTC Price
    const cryptoNav = holdings * btcPrice;
    
    // Net debt = Debt - Cash
    const netDebt = Math.max(0, adjustedDebt - cashReserves);
    
    // EV = Market Cap + Debt + Preferred - Cash
    const ev = marketCap + adjustedDebt + preferredEquity - cashReserves;
    
    // mNAV = EV / Crypto NAV
    const mNav = cryptoNav > 0 ? ev / cryptoNav : null;
    
    // Leverage = Net Debt / Crypto NAV
    const leverage = cryptoNav > 0 ? netDebt / cryptoNav : 0;
    
    // Equity NAV = Crypto NAV + Cash - Debt - Preferred
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
        holdings: METAPLANET_PROVENANCE.holdings,
      },
    }), `Using live BTC price: $${btcPrice.toLocaleString()}`);

    const mNavPv: ProvenanceValue<number> | null = mNav !== null ? pv(mNav, derivedSource({
      derivation: "Enterprise Value ÷ Crypto NAV",
      formula: "(marketCap + debt - cash) / cryptoNav",
      inputs: {
        debt: METAPLANET_PROVENANCE.totalDebt,
        cash: METAPLANET_PROVENANCE.cashReserves,
        holdings: METAPLANET_PROVENANCE.holdings,
      },
    }), `Market Cap: ${formatLargeNumber(marketCap)} (JPY converted at ¥${jpyUsdRate.toFixed(0)}/USD)`) : null;

    const leveragePv: ProvenanceValue<number> = pv(leverage, derivedSource({
      derivation: "Net Debt ÷ Crypto NAV",
      formula: "(debt - cash) / cryptoNav",
      inputs: {
        debt: METAPLANET_PROVENANCE.totalDebt,
        cash: METAPLANET_PROVENANCE.cashReserves,
        holdings: METAPLANET_PROVENANCE.holdings,
      },
    }), `Net Debt: ${formatLargeNumber(netDebt)} (${formatLargeNumber(adjustedDebt)} debt - ${formatLargeNumber(cashReserves)} cash)`);

    const equityNavPv: ProvenanceValue<number> = pv(equityNav, derivedSource({
      derivation: "Crypto NAV + Cash − Debt",
      formula: "(holdings × btcPrice) + cash - debt",
      inputs: {
        holdings: METAPLANET_PROVENANCE.holdings,
        cash: METAPLANET_PROVENANCE.cashReserves,
        debt: METAPLANET_PROVENANCE.totalDebt,
      },
    }), `Zero-coupon bonds - no interest payments`);

    const equityNavPerSharePv: ProvenanceValue<number> = pv(equityNavPerShare, derivedSource({
      derivation: "Equity NAV ÷ Shares Outstanding",
      formula: "equityNav / shares",
      inputs: {
        holdings: METAPLANET_PROVENANCE.holdings,
        shares: METAPLANET_PROVENANCE.sharesOutstanding!,
        debt: METAPLANET_PROVENANCE.totalDebt,
        cash: METAPLANET_PROVENANCE.cashReserves,
      },
    }), `Single-class common shares (no dual-class structure)`);

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
      cashReserves,
      preferredEquity,
      sharesOutstanding,
    };
  }, [btcPrice, marketCap, company.sharesForMnav, jpyUsdRate]);

  const handleTimeRangeChange = (newRange: TimeRange) => {
    setTimeRange(newRange);
    setInterval(DEFAULT_INTERVAL[newRange]);
  };

  const handleMnavTimeRangeChange = (newRange: TimeRange) => {
    setMnavTimeRange(newRange);
    setMnavInterval(DEFAULT_INTERVAL[newRange]);
  };

  if (!metrics || !METAPLANET_PROVENANCE.holdings) {
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

            <StalenessNote
        dates={[
          company.holdingsLastUpdated,
          company.debtAsOf,
          company.cashAsOf,
          company.sharesAsOf,
        ]}
        secCik={company.secCik}
      />

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
              ticker="3350.T"
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
            ticker="3350.T"
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
            ticker="3350.T"
          />
        </div>

        {/* BTC Holdings */}
        <ProvenanceMetric
          label="BTC Holdings"
          data={METAPLANET_PROVENANCE.holdings}
          format="btc"
          subLabel="From TDnet"
          tooltip="Total bitcoin from accumulation strategy"
          ticker="3350.T"
        />

        {/* Cost Basis */}
        {METAPLANET_PROVENANCE.costBasisAvg && (
          <ProvenanceMetric
            label="Avg Cost Basis"
            data={METAPLANET_PROVENANCE.costBasisAvg}
            format="currency"
            subLabel="Per BTC"
            tooltip="Average acquisition price per BTC"
            ticker="3350.T"
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
            ticker="3350.T"
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
            hasDilutiveInstruments={false}
            sharesSourceUrl={METAPLANET_PROVENANCE.sharesOutstanding?.source ? getSourceUrl(METAPLANET_PROVENANCE.sharesOutstanding.source) : undefined}
            sharesSource={METAPLANET_PROVENANCE.sharesOutstanding?.source?.type}
            sharesAsOf={METAPLANET_PROVENANCE.sharesOutstanding?.source ? getSourceDate(METAPLANET_PROVENANCE.sharesOutstanding.source) : undefined}
            debtSourceUrl={METAPLANET_PROVENANCE.totalDebt?.source ? getSourceUrl(METAPLANET_PROVENANCE.totalDebt.source) : undefined}
            debtSource={METAPLANET_PROVENANCE.totalDebt?.source?.type}
            debtAsOf={METAPLANET_PROVENANCE.totalDebt?.source ? getSourceDate(METAPLANET_PROVENANCE.totalDebt.source) : undefined}
            cashSourceUrl={METAPLANET_PROVENANCE.cashReserves?.source ? getSourceUrl(METAPLANET_PROVENANCE.cashReserves.source) : undefined}
            cashSource={METAPLANET_PROVENANCE.cashReserves?.source?.type}
            cashAsOf={METAPLANET_PROVENANCE.cashReserves?.source ? getSourceDate(METAPLANET_PROVENANCE.cashReserves.source) : undefined}
            holdingsSourceUrl={METAPLANET_PROVENANCE.holdings?.source ? getSourceUrl(METAPLANET_PROVENANCE.holdings.source) : undefined}
            holdingsSource={METAPLANET_PROVENANCE.holdings?.source?.type}
            holdingsAsOf={METAPLANET_PROVENANCE.holdings?.source ? getSourceDate(METAPLANET_PROVENANCE.holdings.source) : undefined}
            holdingsSearchTerm={(METAPLANET_PROVENANCE.holdings?.source as any)?.searchTerm}
            debtSearchTerm={(METAPLANET_PROVENANCE.totalDebt?.source as any)?.searchTerm}
            cashSearchTerm={(METAPLANET_PROVENANCE.cashReserves?.source as any)?.searchTerm}
          />
        </div>
      )}
      
      {/* Leverage Card */}
      {expandedCard === "leverage" && (
        <div className="mb-8">
          <LeverageCalculationCard
            rawDebt={metrics.totalDebt}
            adjustedDebt={metrics.adjustedDebt}
            itmDebtAdjustment={0}
            cashReserves={metrics.cashReserves}
            cryptoNav={metrics.cryptoNav}
            leverage={metrics.leverage}
            debtSourceUrl={METAPLANET_PROVENANCE.totalDebt?.source ? getSourceUrl(METAPLANET_PROVENANCE.totalDebt.source) : undefined}
            cashSourceUrl={METAPLANET_PROVENANCE.cashReserves?.source ? getSourceUrl(METAPLANET_PROVENANCE.cashReserves.source) : undefined}
            holdingsSourceUrl={METAPLANET_PROVENANCE.holdings?.source ? getSourceUrl(METAPLANET_PROVENANCE.holdings.source) : undefined}
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
            holdingsSourceUrl={METAPLANET_PROVENANCE.holdings?.source ? getSourceUrl(METAPLANET_PROVENANCE.holdings.source) : undefined}
            cashSourceUrl={METAPLANET_PROVENANCE.cashReserves?.source ? getSourceUrl(METAPLANET_PROVENANCE.cashReserves.source) : undefined}
            debtSourceUrl={METAPLANET_PROVENANCE.totalDebt?.source ? getSourceUrl(METAPLANET_PROVENANCE.totalDebt.source) : undefined}
            sharesSourceUrl={METAPLANET_PROVENANCE.sharesOutstanding?.source ? getSourceUrl(METAPLANET_PROVENANCE.sharesOutstanding.source) : undefined}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STRATEGY & OVERVIEW */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {(() => {
        const intel = getCompanyIntel("3350.T");
        return (
          <details className="bg-gray-50 dark:bg-gray-900 rounded-lg mb-8 group">
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
                <a href="https://metaplanet.jp/en/shareholders/disclosures" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  TDnet Filings
                </a>
              </div>

              {/* Strategy Summary */}
              {intel?.strategySummary && (
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">{intel.strategySummary}</p>
              )}

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

              {/* Key Strategy Documents */}
              {intel?.strategyDocs && intel.strategyDocs.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Key Strategy Documents</h4>
                  <div className="space-y-2">
                    {intel.strategyDocs.map((doc, idx) => (
                      <a
                        key={idx}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors group"
                      >
                        <svg className="w-5 h-5 mt-0.5 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{doc.title}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{doc.date}</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{doc.description}</p>
                        </div>
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Outlook */}
              {intel?.outlook2026 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Outlook & Catalysts</h4>
                  <div className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-line">{intel.outlook2026}</div>
                </div>
              )}
            </div>
          </details>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CHARTS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">📈</span>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Charts</h2>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* Unified Chart Section */}
      <div className="mb-4 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        {/* Chart type toggles */}
        <div className="flex justify-center gap-6 mb-4">
          {(["price", "mnav", "hps"] as const).map((mode) => (
            <label key={mode} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="chartMode"
                checked={chartMode === mode}
                onChange={() => setChartMode(mode)}
                className="w-4 h-4 border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500"
              />
              <span className="text-base font-semibold text-gray-900 dark:text-white">
                {mode === "price" ? "Price" : mode === "mnav" ? "mNAV" : "HPS"}
              </span>
            </label>
          ))}
        </div>
        
        {/* Time range selector */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex gap-1">
            {(["1d", "7d", "1mo", "1y", "all"] as const).map((value) => {
              const label = value === "1d" 
                ? ("24H")
                : value === "7d" ? "7D"
                : value === "1mo" ? "1M"
                : value === "1y" ? "1Y"
                : "ALL";
              return (
                <button
                  key={value}
                  onClick={() => chartMode === "mnav" ? handleMnavTimeRangeChange(value) : handleTimeRangeChange(value)}
                  className={cn(
                    "px-3 py-1 text-sm rounded-md transition-colors",
                    (chartMode === "mnav" ? mnavTimeRange : timeRange) === value
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Chart content */}
        {chartMode === "price" && (
          historyLoading ? (
            <div className="h-[400px] flex items-center justify-center text-gray-500">
              Loading chart...
            </div>
          ) : history && history.length > 0 ? (
            <StockChart data={history} chartMode="price" />
          ) : (
            <div className="h-[400px] flex items-center justify-center text-gray-500">
              No chart data available for 3350.T
            </div>
          )
        )}
        
        {chartMode === "mnav" && metrics.mNav && stockPrice > 0 && btcPrice > 0 && (
          <CompanyMNAVChart
            ticker="3350.T"
            asset="BTC"
            currentMNAV={metrics.mNav}
            currentStockPrice={stockPrice}
            currentCryptoPrice={btcPrice}
            timeRange={mnavTimeRange}
            interval={mnavInterval}
            companyData={{
              holdings: metrics.holdings,
              sharesForMnav: metrics.sharesOutstanding,
              totalDebt: metrics.totalDebt,
              preferredEquity: metrics.preferredEquity,
              cashReserves: metrics.cashReserves,
              restrictedCash: 0,
              asset: "BTC",
              currency: "JPY",
            }}
          />
        )}
        
        {chartMode === "hps" && (
          <HoldingsPerShareChart
            ticker="3350.T"
            asset="BTC"
            currentHoldingsPerShare={metrics.holdingsPerShare}
          />
        )}
      </div>

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
            <p className="text-xs text-gray-500 mt-1">
              Zero-coupon bonds — no interest payments to service
            </p>
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
              ticker="3350.T"
            />

            {/* Cash */}
            {METAPLANET_PROVENANCE.cashReserves && (
              <ProvenanceMetric
                label="Cash Reserves"
                data={METAPLANET_PROVENANCE.cashReserves}
                format="currency"
                subLabel="From Q3 Filing"
                tooltip="Cash and equivalents (converted from JPY)"
                ticker="3350.T"
              />
            )}

            {/* Debt */}
            {METAPLANET_PROVENANCE.totalDebt && (
              <ProvenanceMetric
                label="Total Debt"
                data={METAPLANET_PROVENANCE.totalDebt}
                format="currency"
                subLabel="Zero-coupon bonds"
                tooltip="¥44B in zero-coupon yen-denominated bonds (~$280M USD)"
                ticker="3350.T"
              />
            )}

            {/* Shares Outstanding */}
            {METAPLANET_PROVENANCE.sharesOutstanding && (
              <ProvenanceMetric
                label="Shares Outstanding"
                data={METAPLANET_PROVENANCE.sharesOutstanding}
                format="shares"
                subLabel="Common shares"
                tooltip="Single-class common shares on Tokyo Stock Exchange"
                ticker="3350.T"
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
              {METAPLANET_PROVENANCE.costBasisAvg && btcPrice > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Unrealized P&L</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    btcPrice > METAPLANET_PROVENANCE.costBasisAvg.value ? "text-green-600" : "text-red-600"
                  )}>
                    {btcPrice > METAPLANET_PROVENANCE.costBasisAvg.value ? "+" : ""}
                    {(((btcPrice - METAPLANET_PROVENANCE.costBasisAvg.value) / METAPLANET_PROVENANCE.costBasisAvg.value) * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-400">
                    vs ${METAPLANET_PROVENANCE.costBasisAvg.value.toLocaleString()} avg cost
                  </p>
                </div>
              )}

              {/* Holdings per Share */}
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                <p className="text-sm text-orange-700 dark:text-orange-400">Holdings/Share</p>
                <p className="text-2xl font-bold text-orange-600">
                  {(metrics.holdingsPerShare * 1e6).toFixed(2)}
                </p>
                <p className="text-xs text-orange-500">
                  sats per share
                </p>
              </div>

              {/* Bond info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-400">Bond Type</p>
                <p className="text-lg font-bold text-blue-600">Zero-Coupon</p>
                <p className="text-xs text-blue-500">
                  No interest payments
                </p>
              </div>

              {/* Market info */}
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <p className="text-sm text-purple-700 dark:text-purple-400">Exchange</p>
                <p className="text-lg font-bold text-purple-600">TSE</p>
                <p className="text-xs text-purple-500">
                  Tokyo Stock Exchange (3350.T)
                </p>
              </div>
            </div>
          </div>
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
            ticker="3350.T"
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
            ticker="3350.T"
            stockPrice={stockPrice}
            className=""
          />
        </div>
      </details>

    </div>
  );
}
