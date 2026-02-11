// @ts-nocheck
// TODO: Fix TypeScript errors in this file
"use client";

import { useMemo, useState } from "react";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { ProvenanceMetric } from "./ProvenanceMetric";
import { SBET_PROVENANCE, SBET_CIK, getSBETFilingsList } from "@/lib/data/provenance/sbet";
import { pv, derivedSource } from "@/lib/data/types/provenance";
import { StockChart } from "./stock-chart";
import { CompanyMNAVChart } from "./company-mnav-chart";
import { HoldingsPerShareChart } from "./holdings-per-share-chart";
import { HoldingsHistoryTable } from "./holdings-history-table";
import { ScheduledEvents } from "./scheduled-events";
import { MnavCalculationCard } from "./mnav-calculation-card";
import { LeverageCalculationCard, EquityNavPerShareCalculationCard } from "./expandable-metric-card";
import { SECFilingTimeline } from "./sec-filing-timeline";
import { StockPriceCell } from "./price-cell";
import { getCompanyIntel } from "@/lib/data/company-intel";
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

interface SBETCompanyViewProps {
  company: Company;
  className?: string;
}

/**
 * SBET-specific company view with full provenance tracking
 * 
 * Key characteristics:
 * - ETH treasury (native ETH + LsETH staked via Lido)
 * - 100% staked for yield
 * - No debt, debt-free
 * - Weekly 8-K filings with holdings updates
 */
export function SBETCompanyView({ company, className = "" }: SBETCompanyViewProps) {
  const { data: prices } = usePricesStream();
  
  // Chart state
  const [timeRange, setTimeRange] = useState<TimeRange>("1y");
  const [interval, setInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const [chartMode, setChartMode] = useState<"price" | "volume" | "mnav" | "hps">("price");
  const { data: history, isLoading: historyLoading } = useStockHistory("SBET", timeRange, interval);
  
  const [mnavTimeRange, setMnavTimeRange] = useState<TimeRange>("1y");
  const [mnavInterval, setMnavInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  
  // Track which calculation card is expanded
  const [expandedCard, setExpandedCard] = useState<"mnav" | "leverage" | "equityNav" | null>(null);
  
  const toggleCard = (card: "mnav" | "leverage" | "equityNav") => {
    setExpandedCard(expandedCard === card ? null : card);
  };

  // Live prices
  const ethPrice = prices?.crypto.ETH?.price || 0;
  const stockData = prices?.stocks.SBET;
  const stockPrice = stockData?.price || 0;
  const stockChange = stockData?.change24h;
  
  // Get market cap
  const { marketCap } = getMarketCapForMnavSync(company, stockData, prices?.forex);

  // =========================================================================
  // PROVENANCE-TRACKED METRICS
  // =========================================================================
  
  const metrics = useMemo(() => {
    if (!SBET_PROVENANCE.holdings || !SBET_PROVENANCE.cashReserves) {
      return null;
    }

    const holdings = SBET_PROVENANCE.holdings.value;
    const holdingsNative = SBET_PROVENANCE.holdingsNative?.value || 0;
    const holdingsLsETH = SBET_PROVENANCE.holdingsLsETH?.value || 0;
    const stakingRewards = SBET_PROVENANCE.stakingRewards?.value || 0;
    const totalDebt = SBET_PROVENANCE.totalDebt?.value || 0;
    const cashReserves = SBET_PROVENANCE.cashReserves.value;
    const usdcHoldings = SBET_PROVENANCE.usdcHoldings?.value || 0;
    const preferredEquity = 0; // SBET has no preferred
    const sharesOutstanding = SBET_PROVENANCE.sharesOutstanding?.value || company.sharesForMnav || 0;
    const costBasisAvg = SBET_PROVENANCE.costBasisAvg?.value || 0;
    const costBasisTotal = SBET_PROVENANCE.costBasisTotal?.value || 0;
    
    // Crypto NAV = Holdings × ETH Price
    const cryptoNav = holdings * ethPrice;
    
    // Net debt = Debt - Cash (SBET has no debt, so this is negative = net cash)
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
    
    // Unrealized P&L
    const currentValue = holdings * ethPrice;
    const unrealizedPnL = currentValue - costBasisTotal;
    const unrealizedPnLPct = costBasisTotal > 0 ? (unrealizedPnL / costBasisTotal) * 100 : 0;

    // Create derived provenance values
    const cryptoNavPv: ProvenanceValue<number> = pv(cryptoNav, derivedSource({
      derivation: "ETH Holdings × ETH Price",
      formula: "holdings × ethPrice",
      inputs: {
        holdings: SBET_PROVENANCE.holdings,
      },
    }), `Using live ETH price: $${ethPrice.toLocaleString()}`);

    const mNavPv: ProvenanceValue<number> | null = mNav !== null ? pv(mNav, derivedSource({
      derivation: "Enterprise Value ÷ Crypto NAV",
      formula: "EV / CryptoNAV where EV = (price × shares) + debt - cash",
      inputs: {
        holdings: SBET_PROVENANCE.holdings,
        cash: SBET_PROVENANCE.cashReserves,
        shares: SBET_PROVENANCE.sharesOutstanding,
      },
    }), `Live: ETH $${ethPrice.toLocaleString()}, Stock $${stockPrice.toFixed(2)}`) : null;

    const leveragePv: ProvenanceValue<number> = pv(leverage, derivedSource({
      derivation: "Net Debt ÷ Crypto NAV",
      formula: "(debt - cash) / cryptoNav",
      inputs: {
        debt: SBET_PROVENANCE.totalDebt,
        cash: SBET_PROVENANCE.cashReserves,
        holdings: SBET_PROVENANCE.holdings,
      },
    }), `SBET is debt-free - leverage is 0x`);

    const equityNavPv: ProvenanceValue<number> = pv(equityNav, derivedSource({
      derivation: "Crypto NAV + Cash − Debt − Preferred",
      formula: "(holdings × ethPrice) + cash - debt - preferred",
      inputs: {
        holdings: SBET_PROVENANCE.holdings,
        cash: SBET_PROVENANCE.cashReserves,
      },
    }), `No debt or preferred - Equity NAV = Crypto NAV + Cash`);

    const equityNavPerSharePv: ProvenanceValue<number> = pv(equityNavPerShare, derivedSource({
      derivation: "Equity NAV ÷ Shares Outstanding",
      formula: "equityNav / shares",
      inputs: {
        holdings: SBET_PROVENANCE.holdings,
        cash: SBET_PROVENANCE.cashReserves,
        shares: SBET_PROVENANCE.sharesOutstanding,
      },
    }), `Using ${(sharesOutstanding / 1_000_000).toFixed(0)}M shares from SEC 10-Q`);

    return {
      holdings,
      holdingsNative,
      holdingsLsETH,
      stakingRewards,
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
      usdcHoldings,
      preferredEquity,
      sharesOutstanding,
      costBasisAvg,
      costBasisTotal,
      unrealizedPnL,
      unrealizedPnLPct,
    };
  }, [ethPrice, marketCap, company.sharesForMnav, stockPrice]);

  const handleTimeRangeChange = (newRange: TimeRange) => {
    setTimeRange(newRange);
    setInterval(DEFAULT_INTERVAL[newRange]);
  };

  const handleMnavTimeRangeChange = (newRange: TimeRange) => {
    setMnavTimeRange(newRange);
    setMnavInterval(DEFAULT_INTERVAL[newRange]);
  };

  if (!metrics || !SBET_PROVENANCE.holdings) {
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
        {/* mNAV - Clickable to expand formula */}
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
              tooltip="How much you pay per dollar of ETH exposure. Click to see formula."
              ticker="sbet"
            />
          </div>
        )}

        {/* Leverage - Clickable to expand formula */}
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
            tooltip="Debt exposure relative to ETH holdings. SBET is debt-free."
            ticker="sbet"
          />
        </div>

        {/* Equity NAV/Share - Clickable to expand formula */}
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
            ticker="sbet"
          />
        </div>

        {/* ETH Holdings */}
        <ProvenanceMetric
          label="ETH Holdings"
          data={SBET_PROVENANCE.holdings}
          format="eth"
          subLabel="Total (Native + LsETH)"
          tooltip="Total ETH including Lido staked ETH"
          ticker="sbet"
        />

        {/* Cost Basis */}
        {SBET_PROVENANCE.costBasisAvg && (
          <ProvenanceMetric
            label="Avg Cost Basis"
            data={SBET_PROVENANCE.costBasisAvg}
            format="currency"
            subLabel="Per ETH"
            tooltip="Weighted average cost basis from Q3 2025 10-Q"
            ticker="sbet"
          />
        )}
      </div>

      {/* Strategy & Overview - Collapsed under Key Metrics */}
      {(() => {
        const intel = getCompanyIntel("SBET");
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
                  <a href={company.twitter.startsWith("http") ? company.twitter : `https://twitter.com/${company.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    Twitter
                  </a>
                )}
                <a 
                  href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${SBET_CIK}&type=&dateb=&owner=include&count=40`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  SEC Filings
                </a>
              </div>

              {/* Company Description */}
              {company.description ? (
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">{company.description}</p>
              ) : (
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                  Sharplink, Inc. (formerly SharpLink Gaming, Inc.) pivoted to an Ethereum treasury strategy in June 2025. 
                  The company holds both native ETH and Lido staked ETH (LsETH), with approximately 100% of holdings generating staking yield.
                  SBET files weekly 8-K updates disclosing total ETH holdings, making it one of the most transparent DAT companies.
                </p>
              )}

              {/* Strategy Summary */}
              {intel?.strategySummary ? (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Strategy</h4>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{intel.strategySummary}</p>
                </div>
              ) : company.strategy ? (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Strategy</h4>
                  <p className="text-gray-700 dark:text-gray-300">{company.strategy}</p>
                </div>
              ) : null}

              {/* Key Highlights */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Key Highlights</h4>
                <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span><strong>100% Staked:</strong> All ETH holdings generate staking yield through native staking + Lido LsETH</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span><strong>Debt-Free:</strong> No convertible notes or other debt obligations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span><strong>Weekly Transparency:</strong> Files 8-K updates with detailed holdings breakdown (native vs LsETH)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span><strong>Stablecoin Reserves:</strong> ~$26.7M USDC for operations and future purchases</span>
                  </li>
                </ul>
              </div>

              {/* Key Backers */}
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
                    {intel.recentDevelopments.map((dev, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                        <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-indigo-500" />
                        <span>{dev}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Outlook */}
              {intel?.outlook2026 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Outlook & Catalysts</h4>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{intel.outlook2026}</p>
                </div>
              )}
            </div>
          </details>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HOLDINGS BREAKDOWN - Native vs LsETH */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">🏦</span>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Holdings Breakdown
        </h2>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Native ETH */}
        {SBET_PROVENANCE.holdingsNative && (
          <ProvenanceMetric
            label="Native ETH"
            data={SBET_PROVENANCE.holdingsNative}
            format="eth"
            subLabel={`${((metrics.holdingsNative / metrics.holdings) * 100).toFixed(0)}% of total`}
            tooltip="ETH held directly (not staked via Lido)"
            ticker="sbet"
          />
        )}

        {/* LsETH (Lido) */}
        {SBET_PROVENANCE.holdingsLsETH && (
          <ProvenanceMetric
            label="LsETH (Lido)"
            data={SBET_PROVENANCE.holdingsLsETH}
            format="eth"
            subLabel={`${((metrics.holdingsLsETH / metrics.holdings) * 100).toFixed(0)}% of total`}
            tooltip="Lido staked ETH, valued at redemption rate"
            ticker="sbet"
          />
        )}

        {/* Staking Rewards */}
        {SBET_PROVENANCE.stakingRewards && (
          <ProvenanceMetric
            label="Staking Rewards"
            data={SBET_PROVENANCE.stakingRewards}
            format="eth"
            subLabel="Cumulative earned"
            tooltip="Total staking rewards earned since June 2025"
            ticker="sbet"
            className="bg-green-50 dark:bg-green-900/20"
          />
        )}

        {/* USDC Reserves */}
        {SBET_PROVENANCE.usdcHoldings && (
          <ProvenanceMetric
            label="USDC Holdings"
            data={SBET_PROVENANCE.usdcHoldings}
            format="currency"
            subLabel="Stablecoin reserves"
            tooltip="USDC held for operations/future purchases"
            ticker="sbet"
          />
        )}
      </div>

      {/* Unrealized P&L Summary */}
      <div className={cn(
        "rounded-lg p-4 mb-8",
        metrics.unrealizedPnL >= 0 
          ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
          : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
      )}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Unrealized P&L</p>
            <p className="text-xs text-gray-500">Cost basis: {formatLargeNumber(metrics.costBasisTotal)} → Current: {formatLargeNumber(metrics.holdings * ethPrice)}</p>
          </div>
          <div className={cn(
            "text-right",
            metrics.unrealizedPnL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            <p className="text-2xl font-bold">
              {metrics.unrealizedPnL >= 0 ? "+" : ""}{formatLargeNumber(metrics.unrealizedPnL)}
            </p>
            <p className="text-sm">
              ({metrics.unrealizedPnL >= 0 ? "+" : ""}{metrics.unrealizedPnLPct.toFixed(1)}%)
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* EXPANDABLE CALCULATION CARDS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      
      {/* mNAV Card */}
      {expandedCard === "mnav" && (
        <div className="mb-8">
          <MnavCalculationCard
            ticker="SBET"
            asset="ETH"
            marketCap={marketCap}
            totalDebt={metrics.totalDebt}
            preferredEquity={metrics.preferredEquity}
            cashReserves={metrics.cashReserves}
            holdings={metrics.holdings}
            cryptoPrice={ethPrice}
            holdingsValue={metrics.cryptoNav}
            mNAV={metrics.mNav}
            sharesForMnav={metrics.sharesOutstanding}
            stockPrice={stockPrice}
            hasDilutiveInstruments={false}
          />
        </div>
      )}
      
      {/* Leverage Card */}
      {expandedCard === "leverage" && (
        <div className="mb-8">
          <LeverageCalculationCard
            rawDebt={metrics.totalDebt}
            adjustedDebt={metrics.totalDebt}
            itmDebtAdjustment={0}
            cashReserves={metrics.cashReserves}
            cryptoNav={metrics.cryptoNav}
            leverage={metrics.leverage}
          />
        </div>
      )}
      
      {/* Equity NAV/Share Card */}
      {expandedCard === "equityNav" && (
        <div className="mb-8">
          <EquityNavPerShareCalculationCard
            cryptoNav={metrics.cryptoNav}
            cashReserves={metrics.cashReserves}
            totalDebt={metrics.totalDebt}
            preferredEquity={metrics.preferredEquity}
            sharesOutstanding={metrics.sharesOutstanding}
            equityNav={metrics.equityNav}
            equityNavPerShare={metrics.equityNavPerShare}
            stockPrice={stockPrice}
          />
        </div>
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
          {(["price", "volume", "mnav", "hps"] as const).map((mode) => (
            <label key={mode} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="chartMode"
                checked={chartMode === mode}
                onChange={() => setChartMode(mode)}
                className="w-4 h-4 border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500"
              />
              <span className="text-base font-semibold text-gray-900 dark:text-white">
                {mode === "price" ? "Price" : mode === "volume" ? "Volume" : mode === "mnav" ? "mNAV" : "HPS"}
              </span>
            </label>
          ))}
        </div>
        
        {/* Time range selector */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex gap-1">
            {(["1d", "7d", "1mo", "1y", "all"] as const).map((value) => {
              const label = value === "1d" 
                ? (chartMode === "volume" ? "1D" : "24H")
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
        {(chartMode === "price" || chartMode === "volume") && (
          historyLoading ? (
            <div className="h-[400px] flex items-center justify-center text-gray-500">
              Loading chart...
            </div>
          ) : history && history.length > 0 ? (
            <StockChart data={history} chartMode={chartMode === "volume" ? "volume" : "price"} />
          ) : (
            <div className="h-[400px] flex items-center justify-center text-gray-500">
              No historical data available
            </div>
          )
        )}
        
        {chartMode === "mnav" && metrics.mNav && stockPrice > 0 && ethPrice > 0 && (
          <CompanyMNAVChart
            ticker="SBET"
            asset="ETH"
            currentMNAV={metrics.mNav}
            currentStockPrice={stockPrice}
            currentCryptoPrice={ethPrice}
            timeRange={mnavTimeRange}
            interval={mnavInterval}
            companyData={{
              holdings: metrics.holdings,
              sharesForMnav: metrics.sharesOutstanding,
              totalDebt: metrics.totalDebt,
              preferredEquity: metrics.preferredEquity,
              cashReserves: metrics.cashReserves,
              restrictedCash: 0,
              asset: "ETH",
            }}
          />
        )}
        
        {chartMode === "hps" && (
          <HoldingsPerShareChart
            ticker="SBET"
            asset="ETH"
            currentHoldingsPerShare={metrics.holdingsPerShare}
          />
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SEC FILING TIMELINE */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">📑</span>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">SEC Filings</h2>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="mb-8">
        <SECFilingTimeline
          ticker="SBET"
          cik={SBET_CIK}
          filings={getSBETFilingsList().map((f) => ({
            date: f.periodDate,
            filedDate: f.filedDate,
            accession: f.accession,
            formType: f.formType,
            items: f.items,
            url: f.url,
            hasHoldingsUpdate: f.hasHoldingsUpdate,
          })).sort((a, b) => new Date(b.filedDate).getTime() - new Date(a.filedDate).getTime())}
          asset="ETH"
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DATA TABLES */}
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
          <HoldingsHistoryTable ticker="SBET" asset="ETH" />
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
          <ScheduledEvents ticker="SBET" stockPrice={stockPrice} />
        </div>
      </details>

    </div>
  );
}
