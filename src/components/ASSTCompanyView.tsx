// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { ProvenanceMetric } from "./ProvenanceMetric";
import { STRV_PROVENANCE, STRV_CIK } from "@/lib/data/provenance/strv";
import { pv, derivedSource } from "@/lib/data/types/provenance";
import { StockChart } from "./stock-chart";
import { CompanyMNAVChart } from "./company-mnav-chart";
import { HoldingsPerShareChart } from "./holdings-per-share-chart";
import { HoldingsHistoryTable } from "./holdings-history-table";
import { ScheduledEvents } from "./scheduled-events";
import { MnavCalculationCard } from "./mnav-calculation-card";
import { LeverageCalculationCard, EquityNavPerShareCalculationCard } from "./expandable-metric-card";
import { StockPriceCell } from "./price-cell";
import { getCompanyIntel } from "@/lib/data/company-intel";
import { getEffectiveShares } from "@/lib/data/dilutive-instruments";
import { getMarketCapForMnavSync } from "@/lib/utils/market-cap";
import { getCompanyMNAV } from "@/lib/hooks/use-mnav-stats";
import { formatLargeNumber } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import { StalenessNote } from "./staleness-note";
import type { Company } from "@/lib/types";
import {
  useStockHistory,
  TimeRange,
  ChartInterval,
  DEFAULT_INTERVAL,
} from "@/lib/hooks/use-stock-history";

interface ASSTCompanyViewProps {
  company: Company;
  className?: string;
}

// Pre-create static derived sources (not dependent on live prices)
const DERIVED_SOURCES = {
  mNav: derivedSource({
    derivation: "Enterprise Value ÷ Crypto NAV",
    formula: "EV / CryptoNAV where EV = (price × shares) + debt + preferred - cash",
    inputs: {
      holdings: STRV_PROVENANCE.holdings,
      cash: STRV_PROVENANCE.cashReserves,
      shares: STRV_PROVENANCE.sharesOutstanding,
      debt: STRV_PROVENANCE.totalDebt,
      preferred: STRV_PROVENANCE.preferredEquity,
    },
  }),
  leverage: derivedSource({
    derivation: "Net Debt ÷ Crypto NAV",
    formula: "(debt - cash) / cryptoNav",
    inputs: {
      debt: STRV_PROVENANCE.totalDebt,
      cash: STRV_PROVENANCE.cashReserves,
      holdings: STRV_PROVENANCE.holdings,
    },
  }),
  cryptoNav: derivedSource({
    derivation: "BTC Holdings × BTC Price",
    formula: "holdings × btcPrice",
    inputs: {
      holdings: STRV_PROVENANCE.holdings,
    },
  }),
  equityNav: derivedSource({
    derivation: "Crypto NAV + Cash − Debt − Preferred",
    formula: "(holdings × btcPrice) + cash - debt - preferred",
    inputs: {
      holdings: STRV_PROVENANCE.holdings,
      cash: STRV_PROVENANCE.cashReserves,
      debt: STRV_PROVENANCE.totalDebt,
      preferred: STRV_PROVENANCE.preferredEquity,
    },
  }),
  equityNavPerShare: derivedSource({
    derivation: "Equity NAV ÷ Shares Outstanding",
    formula: "equityNav / shares",
    inputs: {
      holdings: STRV_PROVENANCE.holdings,
      cash: STRV_PROVENANCE.cashReserves,
      shares: STRV_PROVENANCE.sharesOutstanding,
      debt: STRV_PROVENANCE.totalDebt,
      preferred: STRV_PROVENANCE.preferredEquity,
    },
  }),
};

/**
 * ASST (Strive) company view with MnavCalculationCard and full citations
 * 
 * Strive is a unique DAT:
 * - No debt (uses perpetual preferred SATA instead)
 * - Aggressive BTC accumulation post-Semler merger
 * - Pre-funded warrants always ITM
 */
export function ASSTCompanyView({ company, className = "" }: ASSTCompanyViewProps) {
  const { data: prices } = usePricesStream();
  
  // Chart state
  const [timeRange, setTimeRange] = useState<TimeRange>("1y");
  const [interval, setInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const [chartMode, setChartMode] = useState<"price" | "mnav" | "hps">("price");
  const { data: history, isLoading: historyLoading } = useStockHistory("ASST", timeRange, interval);
  
  const [mnavTimeRange, setMnavTimeRange] = useState<TimeRange>("1y");
  const [mnavInterval, setMnavInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  
  // Track which calculation card is expanded
  const [expandedCard, setExpandedCard] = useState<"mnav" | "leverage" | "equityNav" | null>(null);
  
  const toggleCard = (card: "mnav" | "leverage" | "equityNav") => {
    setExpandedCard(expandedCard === card ? null : card);
  };

  // Live prices
  const btcPrice = prices?.crypto.BTC?.price || 0;
  const stockData = prices?.stocks.ASST;
  const stockPrice = stockData?.price || 0;
  const stockChange = stockData?.change24h;
  
  // Get market cap
  const { marketCap } = getMarketCapForMnavSync(company, stockData, prices?.forex);

  // Static values from provenance
  const holdings = STRV_PROVENANCE.holdings?.value || company.holdings || 0;
  const sharesOutstanding = STRV_PROVENANCE.sharesOutstanding?.value || company.sharesForMnav || 0;
  const cashReserves = STRV_PROVENANCE.cashReserves?.value || company.cashReserves || 0;
  const restrictedCash = company.restrictedCash || 0;
  const totalDebt = STRV_PROVENANCE.totalDebt?.value || company.totalDebt || 0;
  const preferredEquity = STRV_PROVENANCE.preferredEquity?.value || company.preferredEquity || 0;

  // Get effective shares (for dilution tracking)
  const effectiveShares = useMemo(() => {
    if (!stockPrice) return null;
    return getEffectiveShares("ASST", sharesOutstanding, stockPrice);
  }, [stockPrice, sharesOutstanding]);

  // Calculated values (depend on live prices)
  const cryptoNav = holdings * btcPrice;
  const freeCash = cashReserves - restrictedCash;
  // totalNav includes restrictedCash because it's earmarked for crypto purchases (pre-crypto)
  const totalNav = cryptoNav + restrictedCash;
  const netDebt = Math.max(0, totalDebt - freeCash);
  const ev = marketCap + totalDebt + preferredEquity - freeCash;
  // Use shared getCompanyMNAV for consistency with overview page
  const mNAV = useMemo(() => {
    return getCompanyMNAV(company, prices);
  }, [company, prices]);
  const leverage = cryptoNav > 0 ? netDebt / cryptoNav : 0;
  const equityNav = cryptoNav + freeCash - totalDebt - preferredEquity;
  const equityNavPerShare = sharesOutstanding > 0 ? equityNav / sharesOutstanding : 0;
  const holdingsPerShare = sharesOutstanding > 0 ? holdings / sharesOutstanding : 0;

  // Create ProvenanceValue wrappers only when needed for display (memoized)
  const mNavPv = useMemo(() => {
    if (mNAV === null) return null;
    return pv(mNAV, DERIVED_SOURCES.mNav, `Live: BTC $${btcPrice.toLocaleString()}, Stock $${stockPrice.toFixed(2)}`);
  }, [mNAV, btcPrice, stockPrice]);

  const leveragePv = useMemo(() => {
    return pv(leverage, DERIVED_SOURCES.leverage, `ASST has no debt - uses preferred equity (SATA)`);
  }, [leverage]);

  const equityNavPerSharePv = useMemo(() => {
    return pv(equityNavPerShare, DERIVED_SOURCES.equityNavPerShare, `Using ${(sharesOutstanding / 1_000_000).toFixed(1)}M shares`);
  }, [equityNavPerShare, sharesOutstanding]);

  const handleTimeRangeChange = (newRange: TimeRange) => {
    setTimeRange(newRange);
    setInterval(DEFAULT_INTERVAL[newRange]);
  };

  const handleMnavTimeRangeChange = (newRange: TimeRange) => {
    setMnavTimeRange(newRange);
    setMnavInterval(DEFAULT_INTERVAL[newRange]);
  };

  // Company intel
  const intel = getCompanyIntel("ASST");

  if (!STRV_PROVENANCE.holdings) {
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
        {/* mNAV - Clickable with ProvenanceMetric + expand button */}
        {mNavPv && (
          <div className={cn("relative", expandedCard === "mnav" && "ring-2 ring-indigo-500 rounded-lg")}>
            <ProvenanceMetric
              label="mNAV"
              data={mNavPv}
              format="mnav"
              subLabel="EV / Crypto NAV"
              tooltip="Market premium/discount to BTC holdings. mNAV > 1 = premium, < 1 = discount"
              ticker="asst"
            />
            <button 
              onClick={() => toggleCard("mnav")}
              className="absolute top-2 right-2 text-indigo-500 hover:text-indigo-700 text-xs font-medium bg-white dark:bg-gray-800 px-2 py-0.5 rounded shadow-sm"
            >
              {expandedCard === "mnav" ? "▼" : "▶"}
            </button>
          </div>
        )}

        {/* Leverage - Clickable with ProvenanceMetric + expand button */}
        <div className={cn("relative", expandedCard === "leverage" && "ring-2 ring-amber-500 rounded-lg")}>
          <ProvenanceMetric
            label="Leverage"
            data={leveragePv}
            format="mnav"
            subLabel="Net Debt / Crypto NAV"
            tooltip="ASST has no debt - uses perpetual preferred (SATA) instead"
            ticker="asst"
          />
          <button 
            onClick={() => toggleCard("leverage")}
            className="absolute top-2 right-2 text-amber-500 hover:text-amber-700 text-xs font-medium bg-white dark:bg-gray-800 px-2 py-0.5 rounded shadow-sm"
          >
            {expandedCard === "leverage" ? "▼" : "▶"}
          </button>
        </div>

        {/* Equity NAV/Share - Clickable with ProvenanceMetric + expand button */}
        <div className={cn("relative", expandedCard === "equityNav" && "ring-2 ring-indigo-500 rounded-lg")}>
          <ProvenanceMetric
            label="Equity NAV/Share"
            data={equityNavPerSharePv}
            format="currency"
            subLabel={stockPrice > 0 && equityNavPerShare > 0 ? (
              <span className={equityNavPerShare > stockPrice ? "text-green-500" : "text-red-500"}>
                {((equityNavPerShare / stockPrice - 1) * 100).toFixed(0)}% {equityNavPerShare > stockPrice ? "above" : "below"} price
              </span>
            ) : "Equity NAV ÷ Shares"}
            ticker="asst"
          />
          <button 
            onClick={() => toggleCard("equityNav")}
            className="absolute top-2 right-2 text-indigo-500 hover:text-indigo-700 text-xs font-medium bg-white dark:bg-gray-800 px-2 py-0.5 rounded shadow-sm"
          >
            {expandedCard === "equityNav" ? "▼" : "▶"}
          </button>
        </div>

        {/* BTC Holdings - from provenance */}
        <ProvenanceMetric
          label="BTC Holdings"
          data={STRV_PROVENANCE.holdings}
          format="btc"
          subLabel="From Jan 28 8-K"
          ticker="asst"
        />

        {/* Shares Outstanding */}
        {STRV_PROVENANCE.sharesOutstanding && (
          <ProvenanceMetric
            label="Shares"
            data={STRV_PROVENANCE.sharesOutstanding}
            format="shares"
            subLabel="Post 1-for-20 split"
            ticker="asst"
          />
        )}
      </div>

      {/* Expanded mNAV Card */}
      {expandedCard === "mnav" && mNAV !== null && (
        <div className="mb-8">
          <MnavCalculationCard
            ticker="ASST"
            asset="BTC"
            marketCap={marketCap}
            totalDebt={totalDebt}
            preferredEquity={preferredEquity}
            cashReserves={cashReserves}
            restrictedCash={restrictedCash}
            holdings={holdings}
            cryptoPrice={btcPrice}
            holdingsValue={totalNav}
            mNAV={mNAV}
            sharesForMnav={sharesOutstanding}
            stockPrice={stockPrice}
            hasDilutiveInstruments={!!effectiveShares?.breakdown?.length}
            basicShares={effectiveShares?.basic}
            itmDilutionShares={effectiveShares ? effectiveShares.diluted - effectiveShares.basic : undefined}
            itmDebtAdjustment={effectiveShares?.inTheMoneyDebtValue}
            // Holdings source
            holdingsSourceUrl={company.holdingsSourceUrl}
            holdingsSource={company.holdingsSource}
            holdingsAsOf={company.holdingsLastUpdated}
            // Shares source
            sharesSourceUrl={company.sharesSourceUrl}
            sharesSource={company.sharesSource}
            sharesAsOf={company.sharesAsOf}
            // Debt source
            debtSourceUrl={company.debtSourceUrl}
            debtSource={company.debtSource}
            debtAsOf={company.debtAsOf}
            // Cash source
            cashSourceUrl={company.cashSourceUrl}
            cashSource={company.cashSource}
            cashAsOf={company.cashAsOf}
            // Preferred source
            preferredSourceUrl={company.preferredSourceUrl}
            preferredSource={company.preferredSource}
            preferredAsOf={company.preferredAsOf}
          />
        </div>
      )}

      {/* Expanded Leverage Card */}
      {expandedCard === "leverage" && (
        <div className="mb-8">
          <LeverageCalculationCard
            rawDebt={totalDebt}
            adjustedDebt={totalDebt}
            itmDebtAdjustment={0}
            cashReserves={freeCash}
            cryptoNav={cryptoNav}
            leverage={leverage}
          />
        </div>
      )}
      
      {/* Expanded Equity NAV Card */}
      {expandedCard === "equityNav" && (
        <div className="mb-8">
          <EquityNavPerShareCalculationCard
            cryptoNav={cryptoNav}
            cashReserves={freeCash}
            totalDebt={totalDebt}
            preferredEquity={preferredEquity}
            sharesOutstanding={sharesOutstanding}
            equityNav={equityNav}
            equityNavPerShare={equityNavPerShare}
            stockPrice={stockPrice}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HOLDINGS BREAKDOWN */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">🏦</span>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Holdings Breakdown</h2>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* BTC Holdings from provenance */}
        <ProvenanceMetric
          label="BTC Holdings"
          data={STRV_PROVENANCE.holdings}
          format="btc"
          subLabel="Total holdings"
          ticker="asst"
        />
        
        {/* Cash Reserves */}
        {STRV_PROVENANCE.cashReserves && (
          <ProvenanceMetric
            label="Cash Reserves"
            data={STRV_PROVENANCE.cashReserves}
            format="currency"
            subLabel="Q3 2025 (likely deployed)"
            ticker="asst"
          />
        )}
        
        {/* Total Debt */}
        {STRV_PROVENANCE.totalDebt && (
          <ProvenanceMetric
            label="Total Debt"
            data={STRV_PROVENANCE.totalDebt}
            format="currency"
            subLabel="No debt - uses preferred"
            ticker="asst"
          />
        )}
        
        {/* Preferred Equity */}
        {STRV_PROVENANCE.preferredEquity && (
          <ProvenanceMetric
            label="Preferred Equity"
            data={STRV_PROVENANCE.preferredEquity}
            format="currency"
            subLabel="SATA 12.25% Perpetual"
            ticker="asst"
          />
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Strategy & Overview */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {intel && (
        <details className="mb-8 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50 group">
          <summary className="p-4 cursor-pointer flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Strategy & Overview</h2>
            </div>
            <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-6 pb-6 space-y-6">
            {/* Links */}
            <div className="flex items-center gap-3">
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
              {company.investorRelationsUrl && (
                <a href={company.investorRelationsUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Investor Relations
                </a>
              )}
            </div>

            {/* Strategy Summary */}
            {intel?.strategySummary && (
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{intel.strategySummary}</p>
            )}
            
            <div className="grid md:grid-cols-3 gap-6">
              {/* Key Highlights */}
              <div>
                <h4 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Key Highlights</h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2"><span className="text-green-500">✓</span> No debt - uses perpetual preferred</li>
                  <li className="flex items-start gap-2"><span className="text-green-500">✓</span> Aggressive BTC accumulation</li>
                  <li className="flex items-start gap-2"><span className="text-green-500">✓</span> Semler Scientific merger Jan 2026</li>
                  <li className="flex items-start gap-2"><span className="text-green-500">✓</span> 1-for-20 reverse split Feb 2026</li>
                </ul>
              </div>
              
              {/* Recent Developments */}
              {intel?.recentDevelopments && intel.recentDevelopments.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Recent Developments</h4>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    {intel.recentDevelopments.slice(0, 4).map((item, i) => (
                      <li key={i} className="flex items-start gap-2"><span className="text-indigo-500">•</span> {item}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Key Backers & Outlook */}
              <div>
                {intel?.keyBackers && intel.keyBackers.length > 0 && (
                  <>
                    <h4 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Leadership</h4>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {intel.keyBackers.map((backer, i) => (
                        <li key={i} className="flex items-start gap-2"><span className="text-amber-500">★</span> {backer}</li>
                      ))}
                    </ul>
                  </>
                )}
                {intel?.outlook2026 && (
                  <>
                    <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">2026 Outlook</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{intel.outlook2026}</p>
                  </>
                )}
              </div>
            </div>

            {/* Key Strategy Documents */}
            {intel?.strategyDocs && intel.strategyDocs.length > 0 && (
              <div className="mt-6 pt-6 border-t border-indigo-200 dark:border-indigo-800">
                <h4 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Key Strategy Documents</h4>
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
          </div>
        </details>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CHARTS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">📈</span>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Charts</h2>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="mb-8 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
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
                ? "24H"
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
              No historical data available
            </div>
          )
        )}
        
        {chartMode === "mnav" && mNAV && stockPrice > 0 && btcPrice > 0 && (
          <CompanyMNAVChart
            ticker="ASST"
            asset="BTC"
            currentMNAV={mNAV}
            currentStockPrice={stockPrice}
            currentCryptoPrice={btcPrice}
            timeRange={mnavTimeRange}
            interval={mnavInterval}
            companyData={{
              holdings: holdings,
              sharesForMnav: sharesOutstanding,
              totalDebt: totalDebt,
              preferredEquity: preferredEquity,
              cashReserves: cashReserves,
              restrictedCash: restrictedCash,
              asset: "BTC",
              currency: "USD",
            }}
          />
        )}
        
        {chartMode === "hps" && (
          <HoldingsPerShareChart
            ticker="ASST"
            asset="BTC"
            currentHoldingsPerShare={holdingsPerShare}
          />
        )}
      </div>

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
          <HoldingsHistoryTable ticker="ASST" asset="BTC" />
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
          <ScheduledEvents ticker="ASST" stockPrice={stockPrice} />
        </div>
      </details>

      {/* Data freshness note */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-500 dark:text-gray-400">
        <strong>Data Sources:</strong> All values are sourced from SEC EDGAR filings.
        Holdings from 8-K (Jan 28, 2026), shares from post-split 8-K (Feb 3, 2026),
        preferred equity from 8-K (Jan 21, 2026). Click any blue ⓘ icon to verify sources.
      </div>
    </div>
  );
}
