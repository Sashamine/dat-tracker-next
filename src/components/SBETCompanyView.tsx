// @ts-nocheck
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
import { SECFilingTimeline } from "./sec-filing-timeline";
import { MnavCalculationCard } from "./mnav-calculation-card";
import { LeverageCalculationCard, EquityNavPerShareCalculationCard } from "./expandable-metric-card";
import { getMarketCapForMnavSync } from "@/lib/utils/market-cap";
import { getCompanyIntel } from "@/lib/data/company-intel";
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

// Pre-create static derived sources (not dependent on live prices)
const DERIVED_SOURCES = {
  mNav: derivedSource({
    derivation: "Enterprise Value ÷ Crypto NAV",
    formula: "EV / CryptoNAV where EV = (price × shares) + debt - cash",
    inputs: {
      holdings: SBET_PROVENANCE.holdings,
      cash: SBET_PROVENANCE.cashReserves,
      shares: SBET_PROVENANCE.sharesOutstanding,
    },
  }),
  leverage: derivedSource({
    derivation: "Net Debt ÷ Crypto NAV",
    formula: "(debt - cash) / cryptoNav",
    inputs: {
      debt: SBET_PROVENANCE.totalDebt,
      cash: SBET_PROVENANCE.cashReserves,
      holdings: SBET_PROVENANCE.holdings,
    },
  }),
  cryptoNav: derivedSource({
    derivation: "ETH Holdings × ETH Price",
    formula: "holdings × ethPrice",
    inputs: {
      holdings: SBET_PROVENANCE.holdings,
    },
  }),
  equityNav: derivedSource({
    derivation: "Crypto NAV + Cash − Debt − Preferred",
    formula: "(holdings × ethPrice) + cash - debt - preferred",
    inputs: {
      holdings: SBET_PROVENANCE.holdings,
      cash: SBET_PROVENANCE.cashReserves,
    },
  }),
  equityNavPerShare: derivedSource({
    derivation: "Equity NAV ÷ Shares Outstanding",
    formula: "equityNav / shares",
    inputs: {
      holdings: SBET_PROVENANCE.holdings,
      cash: SBET_PROVENANCE.cashReserves,
      shares: SBET_PROVENANCE.sharesOutstanding,
    },
  }),
};

export function SBETCompanyView({ company, className = "" }: SBETCompanyViewProps) {
  const { data: prices } = usePricesStream();
  
  // Chart state
  const [timeRange, setTimeRange] = useState<TimeRange>("1y");
  const [interval, setInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const [chartMode, setChartMode] = useState<"price" | "mnav" | "hps">("price");
  const { data: history, isLoading: historyLoading } = useStockHistory("SBET", timeRange, interval);
  
  const [mnavTimeRange, setMnavTimeRange] = useState<TimeRange>("1y");
  const [mnavInterval, setMnavInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  
  // Track which calculation card is expanded
  const [expandedCard, setExpandedCard] = useState<"mnav" | "leverage" | "equityNav" | null>(null);
  
  const toggleCard = (card: "mnav" | "leverage" | "equityNav") => {
    setExpandedCard(expandedCard === card ? null : card);
  };

  // Memoize filings list (static - no deps)
  const filingsList = useMemo(() => {
    return getSBETFilingsList().map((f) => ({
      date: f.periodDate,
      filedDate: f.filedDate,
      accession: f.accession,
      formType: f.formType,
      items: f.items,
      url: f.url,
      hasHoldingsUpdate: f.hasHoldingsUpdate,
    })).sort((a, b) => new Date(b.filedDate).getTime() - new Date(a.filedDate).getTime());
  }, []);

  // Live prices
  const ethPrice = prices?.crypto.ETH?.price || 0;
  const stockData = prices?.stocks.SBET;
  const stockPrice = stockData?.price || 0;
  const stockChange = stockData?.change24h;
  
  // Get market cap
  const { marketCap } = getMarketCapForMnavSync(company, stockData, prices?.forex);

  // Static values from provenance
  const holdings = SBET_PROVENANCE.holdings?.value || 0;
  const holdingsNative = SBET_PROVENANCE.holdingsNative?.value || 0;
  const holdingsLsETH = SBET_PROVENANCE.holdingsLsETH?.value || 0;
  const stakingRewards = SBET_PROVENANCE.stakingRewards?.value || 0;
  const sharesOutstanding = SBET_PROVENANCE.sharesOutstanding?.value || company.sharesForMnav || 0;
  const cashReserves = SBET_PROVENANCE.cashReserves?.value || 0;
  const totalDebt = SBET_PROVENANCE.totalDebt?.value || 0;
  const preferredEquity = 0;
  const costBasisTotal = SBET_PROVENANCE.costBasisTotal?.value || 0;

  // Calculated values (depend on live prices) - just numbers, not ProvenanceValue
  const cryptoNav = holdings * ethPrice;
  const netDebt = Math.max(0, totalDebt - cashReserves);
  const ev = marketCap + totalDebt + preferredEquity - cashReserves;
  const mNav = cryptoNav > 0 ? ev / cryptoNav : null;
  const leverage = cryptoNav > 0 ? netDebt / cryptoNav : 0;
  const equityNav = cryptoNav + cashReserves - totalDebt - preferredEquity;
  const equityNavPerShare = sharesOutstanding > 0 ? equityNav / sharesOutstanding : 0;
  const holdingsPerShare = sharesOutstanding > 0 ? holdings / sharesOutstanding : 0;
  const unrealizedPnL = (holdings * ethPrice) - costBasisTotal;
  const unrealizedPnLPct = costBasisTotal > 0 ? (unrealizedPnL / costBasisTotal) * 100 : 0;

  // Create ProvenanceValue wrappers only when needed for display (memoized)
  const mNavPv = useMemo(() => {
    if (mNav === null) return null;
    return pv(mNav, DERIVED_SOURCES.mNav, `Live: ETH $${ethPrice.toLocaleString()}, Stock $${stockPrice.toFixed(2)}`);
  }, [mNav, ethPrice, stockPrice]);

  const leveragePv = useMemo(() => {
    return pv(leverage, DERIVED_SOURCES.leverage, `SBET is debt-free`);
  }, [leverage]);

  const equityNavPerSharePv = useMemo(() => {
    return pv(equityNavPerShare, DERIVED_SOURCES.equityNavPerShare, `Using ${(sharesOutstanding / 1_000_000).toFixed(0)}M shares`);
  }, [equityNavPerShare, sharesOutstanding]);

  const handleTimeRangeChange = (newRange: TimeRange) => {
    setTimeRange(newRange);
    setInterval(DEFAULT_INTERVAL[newRange]);
  };

  const handleMnavTimeRangeChange = (newRange: TimeRange) => {
    setMnavTimeRange(newRange);
    setMnavInterval(DEFAULT_INTERVAL[newRange]);
  };

  if (!SBET_PROVENANCE.holdings) {
    return <div className="text-center py-8 text-gray-500">Loading provenance data...</div>;
  }

  return (
    <div className={className}>
      {/* KEY METRICS */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">📊</span>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Key Metrics</h2>
        <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded ml-auto">
          Click any value for source
        </span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
        {/* mNAV - Clickable with ProvenanceMetric + expand button */}
        {mNavPv && (
          <div className={cn("relative", expandedCard === "mnav" && "ring-2 ring-indigo-500 rounded-lg")}>
            <ProvenanceMetric
              label="mNAV"
              data={mNavPv}
              format="mnav"
              subLabel="EV / Crypto NAV"
              tooltip="Market premium/discount to ETH holdings. mNAV > 1 = premium, < 1 = discount"
              ticker="sbet"
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
            tooltip="SBET is debt-free"
            ticker="sbet"
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
            ticker="sbet"
          />
          <button 
            onClick={() => toggleCard("equityNav")}
            className="absolute top-2 right-2 text-indigo-500 hover:text-indigo-700 text-xs font-medium bg-white dark:bg-gray-800 px-2 py-0.5 rounded shadow-sm"
          >
            {expandedCard === "equityNav" ? "▼" : "▶"}
          </button>
        </div>

        {/* Holdings - from provenance */}
        <ProvenanceMetric
          label="ETH Holdings"
          data={SBET_PROVENANCE.holdings}
          format="eth"
          subLabel="Total (Native + LsETH)"
          ticker="sbet"
        />

        {/* Shares Outstanding */}
        {SBET_PROVENANCE.sharesOutstanding && (
          <ProvenanceMetric
            label="Shares"
            data={SBET_PROVENANCE.sharesOutstanding}
            format="shares"
            subLabel="From Q3 10-Q"
            ticker="sbet"
          />
        )}
      </div>

      {/* Expanded mNAV Card */}
      {expandedCard === "mnav" && mNav !== null && (
        <div className="mb-8">
          <MnavCalculationCard
            marketCap={marketCap}
            totalDebt={totalDebt}
            preferredEquity={preferredEquity}
            cashReserves={cashReserves}
            holdings={holdings}
            cryptoPrice={ethPrice}
            holdingsValue={cryptoNav}
            mNAV={mNav}
            ticker="SBET"
            asset="ETH"
            stockPrice={stockPrice}
            sharesForMnav={sharesOutstanding}
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
            cashReserves={cashReserves}
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
            cashReserves={cashReserves}
            totalDebt={totalDebt}
            preferredEquity={preferredEquity}
            sharesOutstanding={sharesOutstanding}
            equityNav={equityNav}
            equityNavPerShare={equityNavPerShare}
            stockPrice={stockPrice}
          />
        </div>
      )}

      {/* STRATEGY & OVERVIEW */}
      {(() => {
        const intel = getCompanyIntel("SBET");
        return (
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
              {/* Strategy Summary */}
              {intel?.strategySummary && (
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{intel.strategySummary}</p>
              )}
              
              <div className="grid md:grid-cols-3 gap-6">
                {/* Key Highlights */}
                <div>
                  <h4 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Key Highlights</h4>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-start gap-2"><span className="text-green-500">✓</span> 100% staked for yield (native + Lido)</li>
                    <li className="flex items-start gap-2"><span className="text-green-500">✓</span> Debt-free - no convertibles</li>
                    <li className="flex items-start gap-2"><span className="text-green-500">✓</span> Weekly transparency via 8-K filings</li>
                    <li className="flex items-start gap-2"><span className="text-green-500">✓</span> ~$26.7M USDC reserves</li>
                  </ul>
                </div>
                
                {/* Recent Developments */}
                {intel?.recentDevelopments && intel.recentDevelopments.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Recent Developments</h4>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      {intel.recentDevelopments.map((item, i) => (
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
            </div>
          </details>
        );
      })()}

      {/* HOLDINGS BREAKDOWN */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">🏦</span>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Holdings Breakdown</h2>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {SBET_PROVENANCE.holdingsNative && (
          <ProvenanceMetric
            label="Native ETH"
            data={SBET_PROVENANCE.holdingsNative}
            format="eth"
            subLabel={`${((holdingsNative / holdings) * 100).toFixed(0)}% of total`}
            ticker="sbet"
          />
        )}
        {SBET_PROVENANCE.holdingsLsETH && (
          <ProvenanceMetric
            label="LsETH (Lido)"
            data={SBET_PROVENANCE.holdingsLsETH}
            format="eth"
            subLabel={`${((holdingsLsETH / holdings) * 100).toFixed(0)}% of total`}
            ticker="sbet"
          />
        )}
        {SBET_PROVENANCE.stakingRewards && (
          <ProvenanceMetric
            label="Staking Rewards"
            data={SBET_PROVENANCE.stakingRewards}
            format="eth"
            subLabel={
              <span className="flex items-center gap-1">
                Cumulative earned
                <span className="px-1.5 py-0.5 text-[10px] bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded">
                  Stale (Dec 14)
                </span>
              </span>
            }
            ticker="sbet"
          />
        )}
        {SBET_PROVENANCE.cashReserves && (
          <ProvenanceMetric
            label="Cash Reserves"
            data={SBET_PROVENANCE.cashReserves}
            format="currency"
            subLabel="Operating cash"
            ticker="sbet"
          />
        )}
      </div>

      {/* Unrealized P&L removed - cost basis data is stale (Q3 2025 only, doesn't cover current 863k ETH) */}

      {/* CHARTS */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">📈</span>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Charts</h2>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="mb-8 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <div className="flex justify-center gap-6 mb-4">
          {(["price", "mnav", "hps"] as const).map((mode) => (
            <label key={mode} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="chartMode"
                checked={chartMode === mode}
                onChange={() => setChartMode(mode)}
                className="w-4 h-4"
              />
              <span className="text-sm">
                {mode === "price" ? "Price" : mode === "mnav" ? "mNAV" : "HPS"}
              </span>
            </label>
          ))}
        </div>

        <div className="flex justify-center gap-2 mb-4">
          {(["1d", "7d", "1mo", "1y", "all"] as const).map((value) => (
            <button
              key={value}
              onClick={() => chartMode === "mnav" ? handleMnavTimeRangeChange(value) : handleTimeRangeChange(value)}
              className={cn(
                "px-3 py-1 text-sm rounded-md",
                (chartMode === "mnav" ? mnavTimeRange : timeRange) === value
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              )}
            >
              {value.toUpperCase()}
            </button>
          ))}
        </div>

        {chartMode === "price" && (
          historyLoading ? (
            <div className="h-[400px] flex items-center justify-center text-gray-500">Loading...</div>
          ) : history && history.length > 0 ? (
            <StockChart data={history} chartMode="price" />
          ) : (
            <div className="h-[400px] flex items-center justify-center text-gray-500">No data</div>
          )
        )}

        {chartMode === "mnav" && mNav !== null && stockPrice > 0 && ethPrice > 0 && (
          <CompanyMNAVChart
            ticker="SBET"
            asset="ETH"
            currentMNAV={mNav}
            currentStockPrice={stockPrice}
            currentCryptoPrice={ethPrice}
            timeRange={mnavTimeRange}
            interval={mnavInterval}
            companyData={{
              holdings,
              sharesForMnav: sharesOutstanding,
              totalDebt,
              preferredEquity,
              cashReserves,
              restrictedCash: 0,
              asset: "ETH",
            }}
          />
        )}

        {chartMode === "hps" && (
          <HoldingsPerShareChart
            ticker="SBET"
            asset="ETH"
            currentHoldingsPerShare={holdingsPerShare}
          />
        )}
      </div>

      {/* SEC FILINGS */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">📑</span>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">SEC Filings</h2>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="mb-8">
        <SECFilingTimeline
          ticker="SBET"
          cik={SBET_CIK}
          filings={filingsList}
          asset="ETH"
        />
      </div>

      {/* DATA SECTION */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">📁</span>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</h2>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <details className="mb-4 bg-gray-50 dark:bg-gray-900 rounded-lg group">
        <summary className="p-4 cursor-pointer flex items-center justify-between">
          <h3 className="text-lg font-semibold">Holdings History</h3>
          <svg className="w-5 h-5 text-gray-400 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="px-4 pb-4">
          <HoldingsHistoryTable ticker="SBET" asset="ETH" />
        </div>
      </details>

    </div>
  );
}
