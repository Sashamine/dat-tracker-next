// @ts-nocheck
// TODO: Fix TypeScript errors in this file
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { ProvenanceMetric } from "./ProvenanceMetric";
import { AVX_PROVENANCE, AVX_CIK, AVX_PIPE, AVX_STAKING, AVX_CAPITAL_PROGRAMS } from "@/lib/data/provenance/avx";
import { pv, derivedSource, docSource, getSourceUrl, getSourceDate } from "@/lib/data/types/provenance";
import { StockChart } from "./stock-chart";
import { CompanyMNAVChart } from "./company-mnav-chart";
import { HoldingsPerShareChart } from "./holdings-per-share-chart";
import { HoldingsHistoryTable } from "./holdings-history-table";
import { ScheduledEvents } from "./scheduled-events";
import { StalenessNote } from "./staleness-note";
import { MnavCalculationCard } from "./mnav-calculation-card";
import { LeverageCalculationCard, EquityNavPerShareCalculationCard } from "./expandable-metric-card";
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
  VALID_INTERVALS,
  DEFAULT_INTERVAL,
  INTERVAL_LABELS,
} from "@/lib/hooks/use-stock-history";

interface AVXCompanyViewProps {
  company: Company;
  className?: string;
}

export function AVXCompanyView({ company, className = "" }: AVXCompanyViewProps) {
  const { data: prices } = usePricesStream();
  const [timeRange, setTimeRange] = useState<TimeRange>("1y");
  const [interval, setInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const [chartMode, setChartMode] = useState<"price" | "mnav" | "hps">("price");
  const { data: history, isLoading: historyLoading } = useStockHistory("AVX", timeRange, interval);
  const [mnavTimeRange, setMnavTimeRange] = useState<TimeRange>("1y");
  const [mnavInterval, setMnavInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const [expandedCard, setExpandedCard] = useState<"mnav" | "leverage" | "equityNav" | null>(null);
  const toggleCard = (card: "mnav" | "leverage" | "equityNav") => {
    setExpandedCard(expandedCard === card ? null : card);
  };

  const avaxPrice = prices?.crypto.AVAX?.price || 0;
  const stockData = prices?.stocks.AVX;
  const stockPrice = stockData?.price || 0;
  const stockChange = stockData?.change24h;
  const { marketCap } = getMarketCapForMnavSync(company, stockData, prices?.forex);

  const effectiveShares = useMemo(() => {
    if (!stockPrice) return null;
    return getEffectiveShares("AVX", company.sharesForMnav || 0, stockPrice);
  }, [stockPrice, company.sharesForMnav]);

  const metrics = useMemo(() => {
    if (!AVX_PROVENANCE.holdings || !AVX_PROVENANCE.totalDebt || !AVX_PROVENANCE.cashReserves) return null;
    const holdings = AVX_PROVENANCE.holdings.value;
    const totalDebt = AVX_PROVENANCE.totalDebt.value;
    const cashReserves = AVX_PROVENANCE.cashReserves.value;
    const preferredEquity = AVX_PROVENANCE.preferredEquity?.value || 0;
    const sharesOutstanding = AVX_PROVENANCE.sharesOutstanding?.value || company.sharesForMnav || 0;
    const inTheMoneyDebtValue = effectiveShares?.inTheMoneyDebtValue || 0;
    const adjustedDebt = Math.max(0, totalDebt - inTheMoneyDebtValue);
    const cryptoNav = holdings * avaxPrice;
    const netDebt = Math.max(0, adjustedDebt - cashReserves);
    const ev = marketCap + adjustedDebt + preferredEquity - cashReserves;
    const mNav = cryptoNav > 0 ? ev / cryptoNav : null;
    const leverage = cryptoNav > 0 ? netDebt / cryptoNav : 0;
    const equityNav = cryptoNav + cashReserves - adjustedDebt - preferredEquity;
    const equityNavPerShare = sharesOutstanding > 0 ? equityNav / sharesOutstanding : 0;
    const holdingsPerShare = sharesOutstanding > 0 ? holdings / sharesOutstanding : 0;

    const cryptoNavPv: ProvenanceValue<number> = pv(cryptoNav, derivedSource({
      derivation: "AVAX Holdings × AVAX Price",
      formula: "holdings × avaxPrice",
      inputs: { holdings: AVX_PROVENANCE.holdings },
    }), `Using live AVAX price: $${avaxPrice.toLocaleString()}`);

    const mNavPv: ProvenanceValue<number> | null = mNav !== null ? pv(mNav, derivedSource({
      derivation: "Enterprise Value ÷ Crypto NAV",
      formula: "(marketCap + adjustedDebt + preferred - cash) / cryptoNav",
      inputs: { debt: AVX_PROVENANCE.totalDebt, cash: AVX_PROVENANCE.cashReserves, holdings: AVX_PROVENANCE.holdings },
    }), `Adjusted Debt: ${formatLargeNumber(adjustedDebt)} (raw ${formatLargeNumber(totalDebt)} - ITM ${formatLargeNumber(inTheMoneyDebtValue)})`) : null;

    const leveragePv: ProvenanceValue<number> = pv(leverage, derivedSource({
      derivation: "Net Debt ÷ Crypto NAV",
      formula: "(adjustedDebt - cash) / cryptoNav",
      inputs: { debt: AVX_PROVENANCE.totalDebt, cash: AVX_PROVENANCE.cashReserves, holdings: AVX_PROVENANCE.holdings },
    }), `Net Debt: ${formatLargeNumber(netDebt)} (${formatLargeNumber(adjustedDebt)} debt - ${formatLargeNumber(cashReserves)} cash)`);

    const equityNavPv: ProvenanceValue<number> = pv(equityNav, derivedSource({
      derivation: "Crypto NAV + Cash − Adjusted Debt − Preferred",
      formula: "(holdings × avaxPrice) + cash - adjustedDebt - preferred",
      inputs: { holdings: AVX_PROVENANCE.holdings, cash: AVX_PROVENANCE.cashReserves, debt: AVX_PROVENANCE.totalDebt },
    }), `Debt adjusted for ITM instruments: ${formatLargeNumber(adjustedDebt)}`);

    const equityNavPerSharePv: ProvenanceValue<number> = pv(equityNavPerShare, derivedSource({
      derivation: "Equity NAV ÷ Shares Outstanding",
      formula: "equityNav / shares",
      inputs: { holdings: AVX_PROVENANCE.holdings, shares: AVX_PROVENANCE.sharesOutstanding!, debt: AVX_PROVENANCE.totalDebt, cash: AVX_PROVENANCE.cashReserves },
    }), `Uses adjusted debt (ITM instruments treated as equity)`);

    return {
      holdings, cryptoNav, cryptoNavPv, mNav, mNavPv, leverage, leveragePv,
      equityNav, equityNavPv, equityNavPerShare, equityNavPerSharePv,
      holdingsPerShare, netDebt, totalDebt, adjustedDebt, inTheMoneyDebtValue,
      cashReserves, preferredEquity, sharesOutstanding,
    };
  }, [avaxPrice, marketCap, company.sharesForMnav, effectiveShares]);

  const handleTimeRangeChange = (newRange: TimeRange) => { setTimeRange(newRange); setInterval(DEFAULT_INTERVAL[newRange]); };
  const handleMnavTimeRangeChange = (newRange: TimeRange) => { setMnavTimeRange(newRange); setMnavInterval(DEFAULT_INTERVAL[newRange]); };

  if (!metrics || !AVX_PROVENANCE.holdings) {
    return <div className="text-center py-8 text-gray-500">Loading provenance data...</div>;
  }

  return (
    <div className={className}>
      {/* KEY VALUATION METRICS */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">📊</span>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Key Metrics</h2>
        <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded ml-auto">Click any value for source</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
        {metrics.mNavPv && (
          <div className={cn("cursor-pointer transition-all rounded-lg", expandedCard === "mnav" && "ring-2 ring-indigo-500")} onClick={() => toggleCard("mnav")}>
            <ProvenanceMetric label="mNAV" data={metrics.mNavPv} format="mnav"
              subLabel={<span className="flex items-center gap-1">EV / Crypto NAV <span className="text-indigo-500">{expandedCard === "mnav" ? "▼" : "▶"}</span></span>}
              tooltip="How much you pay per dollar of AVAX exposure. Click to see formula." ticker="avx" />
          </div>
        )}

        <div className={cn("cursor-pointer transition-all rounded-lg", expandedCard === "leverage" && "ring-2 ring-amber-500")} onClick={() => toggleCard("leverage")}>
          <ProvenanceMetric label="Leverage" data={metrics.leveragePv} format="mnav"
            subLabel={<span className="flex items-center gap-1">Net Debt / Crypto NAV <span className="text-amber-500">{expandedCard === "leverage" ? "▼" : "▶"}</span></span>}
            tooltip="Debt exposure relative to AVAX holdings. Click to see formula." ticker="avx" />
        </div>

        <div className={cn("cursor-pointer transition-all rounded-lg", expandedCard === "equityNav" && "ring-2 ring-indigo-500")} onClick={() => toggleCard("equityNav")}>
          <ProvenanceMetric label="Equity NAV/Share" data={metrics.equityNavPerSharePv} format="currency"
            subLabel={<span className="flex items-center gap-1">What each share is worth <span className="text-indigo-500">{expandedCard === "equityNav" ? "▼" : "▶"}</span></span>}
            tooltip="Net assets per share after debt. Click to see formula." ticker="avx" />
        </div>

        <ProvenanceMetric label="AVAX Holdings" data={AVX_PROVENANCE.holdings} format="number"
          subLabel="From Dashboard + 8-K" tooltip="Total AVAX held (>90% staked)" ticker="avx" />

        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">AVAX / Share</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics.holdingsPerShare.toFixed(4)}</p>
          <p className="text-xs text-gray-400">{metrics.holdings.toLocaleString()} / {(metrics.sharesOutstanding / 1e6).toFixed(1)}M</p>
        </div>
      </div>

      {/* EXPANDABLE CALCULATION CARDS */}
      {expandedCard === "mnav" && (
        <div className="mb-8">
          <MnavCalculationCard ticker="AVX" asset="AVAX" marketCap={marketCap} totalDebt={metrics.adjustedDebt}
            preferredEquity={metrics.preferredEquity} cashReserves={metrics.cashReserves} holdings={metrics.holdings}
            cryptoPrice={avaxPrice} holdingsValue={metrics.cryptoNav} mNAV={metrics.mNav}
            sharesForMnav={metrics.sharesOutstanding} stockPrice={stockPrice}
            hasDilutiveInstruments={!!effectiveShares?.breakdown?.length}
            basicShares={effectiveShares?.basic}
            itmDilutionShares={effectiveShares ? effectiveShares.diluted - effectiveShares.basic : undefined}
            itmDebtAdjustment={metrics.inTheMoneyDebtValue}
            sharesSourceUrl={AVX_PROVENANCE.sharesOutstanding?.source ? getSourceUrl(AVX_PROVENANCE.sharesOutstanding.source) : undefined}
            sharesSource={AVX_PROVENANCE.sharesOutstanding?.source?.type}
            sharesAsOf={AVX_PROVENANCE.sharesOutstanding?.source ? getSourceDate(AVX_PROVENANCE.sharesOutstanding.source) : undefined}
            debtSourceUrl={AVX_PROVENANCE.totalDebt?.source ? getSourceUrl(AVX_PROVENANCE.totalDebt.source) : undefined}
            debtSource={AVX_PROVENANCE.totalDebt?.source?.type}
            debtAsOf={AVX_PROVENANCE.totalDebt?.source ? getSourceDate(AVX_PROVENANCE.totalDebt.source) : undefined}
            cashSourceUrl={AVX_PROVENANCE.cashReserves?.source ? getSourceUrl(AVX_PROVENANCE.cashReserves.source) : undefined}
            cashSource={AVX_PROVENANCE.cashReserves?.source?.type}
            cashAsOf={AVX_PROVENANCE.cashReserves?.source ? getSourceDate(AVX_PROVENANCE.cashReserves.source) : undefined}
            holdingsSourceUrl={AVX_PROVENANCE.holdings?.source ? getSourceUrl(AVX_PROVENANCE.holdings.source) : undefined}
            holdingsSource={AVX_PROVENANCE.holdings?.source?.type}
            holdingsAsOf={AVX_PROVENANCE.holdings?.source ? getSourceDate(AVX_PROVENANCE.holdings.source) : undefined}
            holdingsSearchTerm={(AVX_PROVENANCE.holdings?.source as any)?.searchTerm}
            debtSearchTerm={(AVX_PROVENANCE.totalDebt?.source as any)?.searchTerm}
            cashSearchTerm={(AVX_PROVENANCE.cashReserves?.source as any)?.searchTerm} />
        </div>
      )}

      {expandedCard === "leverage" && (
        <div className="mb-8">
          <LeverageCalculationCard rawDebt={metrics.totalDebt} adjustedDebt={metrics.adjustedDebt}
            itmDebtAdjustment={metrics.inTheMoneyDebtValue} cashReserves={metrics.cashReserves}
            cryptoNav={metrics.cryptoNav} leverage={metrics.leverage}
            debtSourceUrl={AVX_PROVENANCE.totalDebt?.source ? getSourceUrl(AVX_PROVENANCE.totalDebt.source) : undefined}
            cashSourceUrl={AVX_PROVENANCE.cashReserves?.source ? getSourceUrl(AVX_PROVENANCE.cashReserves.source) : undefined}
            holdingsSourceUrl={AVX_PROVENANCE.holdings?.source ? getSourceUrl(AVX_PROVENANCE.holdings.source) : undefined} />
        </div>
      )}

      {expandedCard === "equityNav" && (
        <div className="mb-8">
          <EquityNavPerShareCalculationCard cryptoNav={metrics.cryptoNav} cashReserves={metrics.cashReserves}
            totalDebt={metrics.adjustedDebt} preferredEquity={metrics.preferredEquity}
            sharesOutstanding={metrics.sharesOutstanding} equityNav={metrics.equityNav}
            equityNavPerShare={metrics.equityNavPerShare} stockPrice={stockPrice}
            holdingsSourceUrl={AVX_PROVENANCE.holdings?.source ? getSourceUrl(AVX_PROVENANCE.holdings.source) : undefined}
            cashSourceUrl={AVX_PROVENANCE.cashReserves?.source ? getSourceUrl(AVX_PROVENANCE.cashReserves.source) : undefined}
            debtSourceUrl={AVX_PROVENANCE.totalDebt?.source ? getSourceUrl(AVX_PROVENANCE.totalDebt.source) : undefined}
            preferredSourceUrl={AVX_PROVENANCE.preferredEquity?.source ? getSourceUrl(AVX_PROVENANCE.preferredEquity.source) : undefined}
            sharesSourceUrl={AVX_PROVENANCE.sharesOutstanding?.source ? getSourceUrl(AVX_PROVENANCE.sharesOutstanding.source) : undefined} />
        </div>
      )}

      {/* Strategy & Overview */}
      {(() => {
        const intel = getCompanyIntel("AVX");
        return (
          <details className="bg-gray-50 dark:bg-gray-900 rounded-lg mb-6 group">
            <summary className="p-6 cursor-pointer flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Strategy & Overview</h3>
              <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-6 pb-6">
              <div className="flex items-center gap-3 mb-6">
                <a href="https://www.avax-one.com" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                  Website
                </a>
                <a href="https://x.com/avax_one" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  Twitter
                </a>
                <a href="https://analytics-avaxone.theblueprint.xyz/" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  Dashboard
                </a>
              </div>

              {/* AVAX Treasury Info */}
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide mb-2">🏔️ AVAX Treasury Company</h4>
                <ul className="text-sm text-red-600 dark:text-red-300 space-y-1">
                  <li>• <strong>First publicly traded AVAX treasury company</strong> (Nasdaq: AVX)</li>
                  <li>• &gt;90% of AVAX holdings staked at ~8% APY via proprietary validators</li>
                  <li>• Pivoted from AgriFORCE Growing Systems (agriculture) in November 2025</li>
                  <li>• $219M PIPE funded initial AVAX accumulation + Hivemind Capital partnership</li>
                </ul>
              </div>

              {intel?.strategySummary && (
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">{intel.strategySummary}</p>
              )}

              {intel?.keyBackers && intel.keyBackers.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Key People</h4>
                  <div className="flex flex-wrap gap-2">
                    {intel.keyBackers.map((backer, idx) => (
                      <span key={idx} className="px-3 py-1.5 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full font-medium">{backer}</span>
                    ))}
                  </div>
                </div>
              )}

              {intel?.strategyDocs && intel.strategyDocs.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Key Strategy Documents</h4>
                  <div className="space-y-2">
                    {intel.strategyDocs.map((doc, idx) => (
                      <a key={idx} href={doc.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors group">
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
              <input type="radio" name="chartMode" checked={chartMode === mode} onChange={() => setChartMode(mode)}
                className="w-4 h-4 border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500" />
              <span className="text-base font-semibold text-gray-900 dark:text-white">
                {mode === "price" ? "Price" : mode === "mnav" ? "mNAV" : "HPS"}
              </span>
            </label>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex gap-1">
            {(["1d", "7d", "1mo", "1y", "all"] as const).map((value) => {
              const label = value === "1d" ? "24H" : value === "7d" ? "7D" : value === "1mo" ? "1M" : value === "1y" ? "1Y" : "ALL";
              return (
                <button key={value}
                  onClick={() => chartMode === "mnav" ? handleMnavTimeRangeChange(value) : handleTimeRangeChange(value)}
                  className={cn("px-3 py-1 text-sm rounded-md transition-colors",
                    (chartMode === "mnav" ? mnavTimeRange : timeRange) === value
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300"
                  )}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {chartMode === "price" && (
          historyLoading ? (
            <div className="h-[400px] flex items-center justify-center text-gray-500">Loading chart...</div>
          ) : history && history.length > 0 ? (
            <StockChart data={history} chartMode="price" />
          ) : (
            <div className="h-[400px] flex items-center justify-center text-gray-500">No historical data available</div>
          )
        )}

        {chartMode === "mnav" && metrics.mNav && stockPrice > 0 && avaxPrice > 0 && (
          <CompanyMNAVChart ticker="AVX" asset="AVAX" currentMNAV={metrics.mNav}
            currentStockPrice={stockPrice} currentCryptoPrice={avaxPrice}
            timeRange={mnavTimeRange} interval={mnavInterval}
            companyData={{
              holdings: metrics.holdings, sharesForMnav: metrics.sharesOutstanding,
              totalDebt: metrics.adjustedDebt, preferredEquity: metrics.preferredEquity,
              cashReserves: metrics.cashReserves, restrictedCash: 0, asset: "AVAX", currency: "USD",
            }} />
        )}

        {chartMode === "hps" && (
          <HoldingsPerShareChart ticker="AVX" asset="AVAX" currentHoldingsPerShare={metrics.holdingsPerShare} />
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
              <span className="text-gray-400"> AVAX</span>
              <span className="text-green-600"> + {formatLargeNumber(metrics.cashReserves)}</span>
              <span className="text-gray-400"> cash</span>
              <span className="text-red-600"> − {formatLargeNumber(metrics.adjustedDebt)}</span>
              <span className="text-gray-400"> debt</span>
              <span className="text-indigo-600 font-semibold"> = {formatLargeNumber(metrics.equityNav)}</span>
            </p>
            {metrics.inTheMoneyDebtValue > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Debt adjusted: {formatLargeNumber(metrics.totalDebt)} raw − {formatLargeNumber(metrics.inTheMoneyDebtValue)} ITM = {formatLargeNumber(metrics.adjustedDebt)}
              </p>
            )}
          </div>

          <StalenessNote dates={[company.holdingsLastUpdated, company.debtAsOf, company.cashAsOf, company.sharesAsOf]} secCik={company.secCik} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ProvenanceMetric label="Crypto NAV" data={metrics.cryptoNavPv} format="currency"
              subLabel={`${metrics.holdings.toLocaleString()} AVAX`} tooltip="AVAX holdings at current market price" ticker="avx" />

            {AVX_PROVENANCE.cashReserves && (
              <ProvenanceMetric label="Cash Reserves" data={AVX_PROVENANCE.cashReserves} format="currency"
                subLabel="⚠️ PRE-PIPE figure" tooltip="From 10-Q Sep 30, 2025 (before $145M+ PIPE cash)" ticker="avx" />
            )}

            {AVX_PROVENANCE.totalDebt && (
              <ProvenanceMetric label="Total Debt" data={AVX_PROVENANCE.totalDebt} format="currency"
                subLabel="Legacy pre-PIPE debt" tooltip="~$1.7M legacy debt (debentures + loans)" ticker="avx" />
            )}

            {AVX_PROVENANCE.sharesOutstanding && (
              <ProvenanceMetric label="Shares Outstanding" data={AVX_PROVENANCE.sharesOutstanding} format="shares"
                subLabel="Post-PIPE + buybacks" tooltip="92.7M shares (post-PIPE minus buybacks)" ticker="avx" />
            )}
          </div>

          {/* Additional Metrics */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Additional Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Staking Info */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-400 font-semibold">Staking</p>
                <p className="text-2xl font-bold text-green-600">&gt;90% staked</p>
                <p className="text-xs text-green-500">~8% APY via validators</p>
                <p className="text-xs text-green-500 mt-1">Expected Q1 2026: ~{AVX_STAKING.expectedQ1_2026Rewards.toLocaleString()} AVAX rewards</p>
                <a href={AVX_STAKING.source} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline mt-1 inline-block">Source: 8-K →</a>
              </div>

              {/* PIPE Details */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-400 font-semibold">PIPE Details</p>
                <p className="text-2xl font-bold text-blue-600">${(AVX_PIPE.totalProceeds / 1e6).toFixed(0)}M</p>
                <p className="text-xs text-blue-500">${(AVX_PIPE.cashProceeds / 1e6).toFixed(0)}M cash + ${(AVX_PIPE.avaxProceeds / 1e6).toFixed(1)}M AVAX</p>
                <p className="text-xs text-blue-500 mt-1">{(AVX_PIPE.sharesIssued / 1e6).toFixed(1)}M shares + {(AVX_PIPE.preFundedWarrants / 1e6).toFixed(1)}M warrants</p>
                <p className="text-xs text-blue-500">Closed {AVX_PIPE.closingDate}</p>
                <a href={AVX_PIPE.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">Source: 8-K →</a>
              </div>

              {/* $40M Buyback */}
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <p className="text-sm text-purple-700 dark:text-purple-400 font-semibold">$40M Buyback</p>
                <p className="text-2xl font-bold text-purple-600">${(AVX_CAPITAL_PROGRAMS.buyback.executedValue / 1e6).toFixed(1)}M</p>
                <p className="text-xs text-purple-500">executed of ${(AVX_CAPITAL_PROGRAMS.buyback.authorized / 1e6).toFixed(0)}M authorized</p>
                <p className="text-xs text-purple-500 mt-1">{AVX_CAPITAL_PROGRAMS.buyback.executedShares.toLocaleString()} shares @ ${AVX_CAPITAL_PROGRAMS.buyback.avgPrice.toFixed(2)} avg</p>
                <a href={AVX_CAPITAL_PROGRAMS.buyback.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 hover:underline mt-1 inline-block">Source: 8-K →</a>
              </div>

              {/* Quarterly Burn */}
              {AVX_PROVENANCE.quarterlyBurn && (
                <ProvenanceMetric label="Quarterly Burn" data={AVX_PROVENANCE.quarterlyBurn} format="currency"
                  subLabel="G&A expenses" tooltip="General & administrative expenses per quarter (pre-PIPE)" ticker="avx" />
              )}

              {/* ITM Dilution Info */}
              {effectiveShares && effectiveShares.diluted > effectiveShares.basic && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-700 dark:text-amber-400">ITM Dilution</p>
                  <p className="text-2xl font-bold text-amber-600">+{((effectiveShares.diluted - effectiveShares.basic) / 1e6).toFixed(1)}M</p>
                  <p className="text-xs text-amber-500">shares from ITM instruments at ${stockPrice.toFixed(0)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </details>

      {/* DATA */}
      <div className="mb-4 mt-8 flex items-center gap-2">
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
          <HoldingsHistoryTable ticker="AVX" asset="AVAX" />
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
          <ScheduledEvents ticker="AVX" stockPrice={stockPrice} />
        </div>
      </details>

      {/* RESEARCH */}
      <div className="mb-4 mt-8 flex items-center gap-2">
        <span className="text-lg">📰</span>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Research & Filings</h2>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-500 dark:text-gray-400">
        <strong>Data Provenance:</strong> All values are sourced from SEC EDGAR filings (XBRL data or document text) and the
        company analytics dashboard. Click any metric to see its exact source and verify it yourself. Cash reserves are from
        the pre-PIPE 10-Q (Sep 30, 2025) — post-PIPE figures will appear in the 10-K (due ~March 2026).
      </div>
    </div>
  );
}
