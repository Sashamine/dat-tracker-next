"use client";

import { useMemo, useState } from "react";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { ProvenanceMetric } from "./ProvenanceMetric";
import { ABTC_PROVENANCE } from "@/lib/data/provenance/abtc";
import { pv, derivedSource, getSourceUrl, getSourceDate } from "@/lib/data/types/provenance";
import { StockChart } from "./stock-chart";
import { CompanyMNAVChart } from "./company-mnav-chart";
import { HoldingsPerShareChart } from "./holdings-per-share-chart";
import { HoldingsHistoryTable } from "./holdings-history-table";
import { ScheduledEvents } from "./scheduled-events";
import { MnavCalculationCard } from "./mnav-calculation-card";
import { EquityNavPerShareCalculationCard } from "./expandable-metric-card";
import { getEffectiveShares } from "@/lib/data/dilutive-instruments";
import { getMarketCapForMnavSync } from "@/lib/utils/market-cap";
import { formatLargeNumber } from "@/lib/calculations";
import { getCompanyEarnings } from "@/lib/data/earnings-data";
import { cn } from "@/lib/utils";
import type { Company } from "@/lib/types";
import type { ProvenanceValue } from "@/lib/data/types/provenance";
import { StalenessNote } from "./staleness-note";
import {
  useStockHistory,
  TimeRange,
  ChartInterval,
  DEFAULT_INTERVAL,
} from "@/lib/hooks/use-stock-history";

interface ABTCCompanyViewProps {
  company: Company;
  className?: string;
}

/**
 * ABTC-specific company view with full provenance tracking
 * 
 * American Bitcoin Corp: Pure-play BTC miner & accumulator.
 * - 80% owned by Hut 8 Corp.
 * - Co-Founded by Eric Trump & Donald Trump Jr.
 * - HODL strategy with SPS (Satoshis Per Share) metric
 * - Merged with Gryphon Digital Mining Sep 2025
 * - Bitmain miner purchase agreement: $286.2M liability (BTC-collateralized)
 * - Gryphon warrants: 108,587 @ $1.50; Akerna warrants: 22,826 @ $37
 */
export function ABTCCompanyView({ company, className = "" }: ABTCCompanyViewProps) {
  const { data: prices } = usePricesStream();
  
  // Chart state
  const [timeRange, setTimeRange] = useState<TimeRange>("1mo");
  const [interval, setInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1mo"]);
  const [chartMode, setChartMode] = useState<"price" | "mnav" | "hps">("price");
  const { data: history, isLoading: historyLoading } = useStockHistory("ABTC", timeRange, interval);
  
  const [mnavTimeRange, setMnavTimeRange] = useState<TimeRange>("1mo");
  const [mnavInterval, setMnavInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1mo"]);
  
  // Track which calculation card is expanded
  const [expandedCard, setExpandedCard] = useState<"mnav" | "leverage" | "equityNav" | null>(null);
  
  const toggleCard = (card: "mnav" | "leverage" | "equityNav") => {
    setExpandedCard(expandedCard === card ? null : card);
  };

  // Live prices
  const btcPrice = prices?.crypto.BTC?.price || 0;
  const stockData = prices?.stocks.ABTC;
  const stockPrice = stockData?.price || 0;
  const stockChange = stockData?.change24h;
  
  // Get market cap
  const { marketCap } = getMarketCapForMnavSync(company, stockData, prices?.forex);

  // Get ITM dilution (if any dilutives exist)
  const effectiveShares = useMemo(() => {
    if (!stockPrice) return null;
    return getEffectiveShares("ABTC", company.sharesForMnav || 0, stockPrice);
  }, [stockPrice, company.sharesForMnav]);

  // Q3 2025 SPS baseline for growth calculation (dynamically from earnings data)
  const q3SpsBaseline = useMemo(() => {
    const earnings = getCompanyEarnings("ABTC");
    const q3 = earnings.find(e => e.calendarYear === 2025 && e.calendarQuarter === 3);
    if (q3?.holdingsPerShare) {
      return Math.round(q3.holdingsPerShare * 100_000_000); // Convert to sats
    }
    return 371; // Fallback: Q3 2025 10-Q (3,418 BTC / 920,684,912 shares)
  }, []);

  // =========================================================================
  // PROVENANCE-TRACKED METRICS
  // =========================================================================
  
  const metrics = useMemo(() => {
    if (!ABTC_PROVENANCE.holdings) {
      return null;
    }

    const holdings = ABTC_PROVENANCE.holdings.value;
    const totalDebt = ABTC_PROVENANCE.totalDebt?.value || 0;
    const cashReserves = ABTC_PROVENANCE.cashReserves?.value || 0;
    const preferredEquity = 0;
    const sharesOutstanding = ABTC_PROVENANCE.sharesOutstanding?.value || company.sharesForMnav || 0;
    
    // ITM dilution adjustment
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
    
    // Holdings per share (SPS)
    const holdingsPerShare = sharesOutstanding > 0 ? holdings / sharesOutstanding : 0;
    
    // SPS (Satoshis Per Share) — ABTC's signature metric
    const satsPerShare = holdingsPerShare * 100_000_000;

    // Create derived provenance values
    const cryptoNavPv: ProvenanceValue<number> = pv(cryptoNav, derivedSource({
      derivation: "BTC Holdings × BTC Price",
      formula: "holdings × btcPrice",
      inputs: {
        holdings: ABTC_PROVENANCE.holdings,
      },
    }), `Using live BTC price: $${btcPrice.toLocaleString()}`);

    const mNavPv: ProvenanceValue<number> | null = mNav !== null ? pv(mNav, derivedSource({
      derivation: "Enterprise Value ÷ Crypto NAV",
      formula: "(marketCap + debt - cash) / cryptoNav",
      inputs: {
        holdings: ABTC_PROVENANCE.holdings,
      },
    }), `Market Cap: ${formatLargeNumber(marketCap)}. Debt: $286.2M (Bitmain). Cash: $7.98M (Q3 10-Q).`) : null;

    const leveragePv: ProvenanceValue<number> = pv(leverage, derivedSource({
      derivation: "Net Debt ÷ Crypto NAV",
      formula: "(debt - cash) / cryptoNav",
      inputs: {
        holdings: ABTC_PROVENANCE.holdings,
      },
    }), `Debt: $286.2M (Bitmain miner purchase agreement). Cash: $7.98M. Source: Q3 2025 10-Q.`);

    const equityNavPv: ProvenanceValue<number> = pv(equityNav, derivedSource({
      derivation: "Crypto NAV + Cash − Debt",
      formula: "(holdings × btcPrice) + cash - debt",
      inputs: {
        holdings: ABTC_PROVENANCE.holdings,
      },
    }), `Debt: ${formatLargeNumber(totalDebt)} (Bitmain). Cash: ${formatLargeNumber(cashReserves)}. Source: Q3 2025 10-Q.`);

    const equityNavPerSharePv: ProvenanceValue<number> = pv(equityNavPerShare, derivedSource({
      derivation: "Equity NAV ÷ Shares Outstanding",
      formula: "equityNav / shares",
      inputs: {
        holdings: ABTC_PROVENANCE.holdings,
        shares: ABTC_PROVENANCE.sharesOutstanding!,
      },
    }), "Uses 928M total shares (all classes, post-merger).");

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
      satsPerShare,
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

  if (!metrics || !ABTC_PROVENANCE.holdings) {
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
          company.sharesAsOf,
          company.burnAsOf,
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
              ticker="abtc"
            />
          </div>
        )}

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
            subLabel={<span className="flex items-center gap-1">What each share is &apos;worth&apos; <span className="text-indigo-500">{expandedCard === "equityNav" ? "▼" : "▶"}</span></span>}
            tooltip="Net assets per share. Click to see formula."
            ticker="abtc"
          />
        </div>

        {/* BTC Holdings */}
        <ProvenanceMetric
          label="BTC Holdings"
          data={ABTC_PROVENANCE.holdings}
          format="btc"
          subLabel="Dec 14, 2025 PR"
          tooltip="Total BTC in strategic reserve (mining + purchases + pledged)"
          ticker="abtc"
        />

        {/* SPS - Satoshis Per Share (ABTC's signature metric) */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">SPS (Sats/Share)</p>
          <p className="text-2xl font-bold text-amber-600">
            {Math.round(metrics.satsPerShare).toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">
            {metrics.holdings.toLocaleString()} BTC / {(metrics.sharesOutstanding / 1e6).toFixed(0)}M shares
          </p>
        </div>

        {/* Operating Burn */}
        {ABTC_PROVENANCE.quarterlyBurn && (
          <ProvenanceMetric
            label="Operating Burn"
            data={ABTC_PROVENANCE.quarterlyBurn}
            format="currency"
            subLabel="Q3 2025 G&A"
            tooltip="General & Administrative expense per quarter"
            ticker="abtc"
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
            ticker="ABTC"
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
            sharesSourceUrl={ABTC_PROVENANCE.sharesOutstanding?.source ? getSourceUrl(ABTC_PROVENANCE.sharesOutstanding.source) : undefined}
            sharesSource={ABTC_PROVENANCE.sharesOutstanding?.source?.type}
            sharesAsOf={ABTC_PROVENANCE.sharesOutstanding?.source ? getSourceDate(ABTC_PROVENANCE.sharesOutstanding.source) : undefined}
            debtSourceUrl={ABTC_PROVENANCE.totalDebt?.source ? getSourceUrl(ABTC_PROVENANCE.totalDebt.source) : undefined}
            debtSource={ABTC_PROVENANCE.totalDebt?.source?.type}
            debtAsOf={ABTC_PROVENANCE.totalDebt?.source ? getSourceDate(ABTC_PROVENANCE.totalDebt.source) : undefined}
            cashSourceUrl={ABTC_PROVENANCE.cashReserves?.source ? getSourceUrl(ABTC_PROVENANCE.cashReserves.source) : undefined}
            cashSource={ABTC_PROVENANCE.cashReserves?.source?.type}
            cashAsOf={ABTC_PROVENANCE.cashReserves?.source ? getSourceDate(ABTC_PROVENANCE.cashReserves.source) : undefined}
            holdingsSourceUrl={ABTC_PROVENANCE.holdings?.source ? getSourceUrl(ABTC_PROVENANCE.holdings.source) : undefined}
            holdingsSource={ABTC_PROVENANCE.holdings?.source?.type}
            holdingsAsOf={ABTC_PROVENANCE.holdings?.source ? getSourceDate(ABTC_PROVENANCE.holdings.source) : undefined}
            holdingsSearchTerm={(ABTC_PROVENANCE.holdings?.source as any)?.searchTerm}
            debtSearchTerm={(ABTC_PROVENANCE.totalDebt?.source as any)?.searchTerm}
            cashSearchTerm={(ABTC_PROVENANCE.cashReserves?.source as any)?.searchTerm}
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
            holdingsSourceUrl={ABTC_PROVENANCE.holdings?.source ? getSourceUrl(ABTC_PROVENANCE.holdings.source) : undefined}
            cashSourceUrl={ABTC_PROVENANCE.cashReserves?.source ? getSourceUrl(ABTC_PROVENANCE.cashReserves.source) : undefined}
            debtSourceUrl={ABTC_PROVENANCE.totalDebt?.source ? getSourceUrl(ABTC_PROVENANCE.totalDebt.source) : undefined}
            sharesSourceUrl={ABTC_PROVENANCE.sharesOutstanding?.source ? getSourceUrl(ABTC_PROVENANCE.sharesOutstanding.source) : undefined}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STRATEGY & OVERVIEW */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <details className="bg-gray-50 dark:bg-gray-900 rounded-lg mb-6 group">
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
              <a href={company.twitter} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                Twitter
              </a>
            )}
            <a href="https://abtc.com/investors" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Investor Relations
            </a>
          </div>

          {/* Strategy Summary */}
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            American Bitcoin Corp. is a Bitcoin accumulation platform focused on building America&apos;s Bitcoin infrastructure backbone. 
            As a majority-owned subsidiary of Hut 8 Corp. (~80%), ABTC integrates scaled self-mining operations with disciplined 
            accumulation strategies. The company tracks Satoshis Per Share (SPS) and Bitcoin Yield as key performance metrics, 
            providing investors transparent indirect BTC ownership through equity.
          </p>

          {/* Key People */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Key People</h4>
            <div className="flex flex-wrap gap-2">
              {["Eric Trump (Co-Founder, CSO)", "Donald Trump Jr. (Co-Founder)"].map((person, idx) => (
                <span key={idx} className="px-3 py-1.5 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full font-medium">
                  {person}
                </span>
              ))}
            </div>
          </div>

          {/* Key Facts */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Key Facts</h4>
            <ul className="space-y-2">
              {[
                "80% owned by Hut 8 Corp. (HUT) — majority-owned subsidiary",
                "Merged with Gryphon Digital Mining (GRYP) on September 3, 2025",
                "Listed on Nasdaq as ABTC on September 5, 2025",
                "Pure HODL strategy — mines BTC and does not sell",
                "Tracks SPS (Satoshis Per Share) as primary investor metric",
                "BTC reserve includes mined BTC, strategic purchases, and BTC pledged for miner purchases via BITMAIN",
                "Entered Top 20 publicly traded BTC treasury companies by Dec 2025",
              ].map((fact, idx) => (
                <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300 text-sm">
                  <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-indigo-500" />
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Key Filing References */}
          <div>
            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Key SEC Filings</h4>
            <div className="space-y-2">
              <a
                href="/filings/abtc/0001193125-25-281390"
                className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors group"
              >
                <svg className="w-5 h-5 mt-0.5 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">10-Q (Q3 2025)</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">2025-11-14</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">First quarterly report post-merger. Period ending Sep 30, 2025.</p>
                </div>
              </a>
              <a
                href="/filings/abtc/0001213900-25-083726"
                className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors group"
              >
                <svg className="w-5 h-5 mt-0.5 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">8-K (Merger Close)</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">2025-09-03</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Merger with Gryphon Digital Mining completed. Name change to American Bitcoin Corp.</p>
                </div>
              </a>
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
              const label = value === "1d" ? "24H" : value === "7d" ? "7D" : value === "1mo" ? "1M" : value === "1y" ? "1Y" : "ALL";
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
            <div className="h-[400px] flex items-center justify-center text-gray-500">Loading chart...</div>
          ) : history && history.length > 0 ? (
            <StockChart data={history} chartMode="price" />
          ) : (
            <div className="h-[400px] flex items-center justify-center text-gray-500">Limited history — ABTC launched Sep 2025</div>
          )
        )}
        
        {chartMode === "mnav" && metrics.mNav && stockPrice > 0 && btcPrice > 0 && (
          <CompanyMNAVChart
            ticker="ABTC"
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
            }}
          />
        )}
        
        {chartMode === "hps" && (
          <HoldingsPerShareChart ticker="ABTC" asset="BTC" currentHoldingsPerShare={metrics.holdingsPerShare} />
        )}
      </div>

      {/* BALANCE SHEET */}
      <details open className="mb-8 bg-gray-50 dark:bg-gray-900 rounded-lg group">
        <summary className="p-4 cursor-pointer flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Balance Sheet</h2>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{formatLargeNumber(metrics.equityNav)} Equity NAV</span>
            <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </summary>
        <div className="px-4 pb-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 mb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Equity NAV Formula</p>
            <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
              <span className="text-gray-900 dark:text-gray-100">{formatLargeNumber(metrics.cryptoNav)}</span>
              <span className="text-gray-400"> BTC</span>
              <span className="text-green-600"> + {formatLargeNumber(metrics.cashReserves)}</span>
              <span className="text-gray-400"> cash</span>
              <span className="text-red-600"> − {formatLargeNumber(metrics.adjustedDebt)}</span>
              <span className="text-gray-400"> debt</span>
              <span className="text-indigo-600 font-semibold"> = {formatLargeNumber(metrics.equityNav)}</span>
            </p>
            {metrics.totalDebt === 0 && metrics.cashReserves === 0 && (
              <p className="text-xs text-amber-500 mt-1">⚠️ Debt and cash not yet verified — shown as $0 pending filing access</p>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ProvenanceMetric label="Crypto NAV" data={metrics.cryptoNavPv} format="currency" subLabel={`${metrics.holdings.toLocaleString()} BTC`} tooltip="BTC holdings at current market price" ticker="abtc" />
            {ABTC_PROVENANCE.sharesOutstanding && (
              <ProvenanceMetric label="Shares Outstanding" data={ABTC_PROVENANCE.sharesOutstanding} format="shares" subLabel="All classes (post-merger)" tooltip="Total shares including all classes. Hut 8 owns ~80%." ticker="abtc" />
            )}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-400">SPS Growth</p>
              <p className="text-2xl font-bold text-amber-600">+{((metrics.satsPerShare - q3SpsBaseline) / q3SpsBaseline * 100).toFixed(0)}%</p>
              <p className="text-xs text-amber-500">since Q3 2025 ({q3SpsBaseline} → {Math.round(metrics.satsPerShare)} sats)</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
              <p className="text-sm text-purple-700 dark:text-purple-400">Hut 8 Ownership</p>
              <p className="text-2xl font-bold text-purple-600">~80%</p>
              <p className="text-xs text-purple-500">Majority-owned subsidiary</p>
            </div>
          </div>
        </div>
      </details>

      {/* DATA SECTION */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">📁</span>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</h2>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <details className="mb-4 bg-gray-50 dark:bg-gray-900 rounded-lg group">
        <summary className="p-4 cursor-pointer flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Holdings History</h3>
          <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="px-4 pb-4">
          <HoldingsHistoryTable ticker="ABTC" asset="BTC" className="" />
        </div>
      </details>

      <details className="mb-4 bg-gray-50 dark:bg-gray-900 rounded-lg group">
        <summary className="p-4 cursor-pointer flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Scheduled Events</h3>
          <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="px-4 pb-4">
          <ScheduledEvents ticker="ABTC" stockPrice={stockPrice} className="" />
        </div>
      </details>
    </div>
  );
}