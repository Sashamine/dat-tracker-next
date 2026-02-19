// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { getCompanyIntel } from "@/lib/data/company-intel";
import { getEffectiveShares } from "@/lib/data/dilutive-instruments";
import { getMarketCapForMnavSync } from "@/lib/utils/market-cap";
import { formatLargeNumber } from "@/lib/calculations";
import { cn } from "@/lib/utils";

import type { Company } from "@/lib/types";
import type { ProvenanceValue } from "@/lib/data/types/provenance";

import { ProvenanceMetric } from "./ProvenanceMetric";
import { StockChart } from "./stock-chart";
import { CompanyMNAVChart } from "./company-mnav-chart";
import { HoldingsPerShareChart } from "./holdings-per-share-chart";
import { HoldingsHistoryTable } from "./holdings-history-table";
import { ScheduledEvents } from "./scheduled-events";
import { StalenessNote } from "./staleness-note";
import { MnavCalculationCard } from "./mnav-calculation-card";
import { LeverageCalculationCard, EquityNavPerShareCalculationCard } from "./expandable-metric-card";
import { StockPriceCell } from "./price-cell";

import {
  useStockHistory,
  TimeRange,
  ChartInterval,
  DEFAULT_INTERVAL,
} from "@/lib/hooks/use-stock-history";

export type CompanyViewBaseExpandedCard = "mnav" | "leverage" | "equityNav" | null;

export type CompanyViewBaseMetrics = {
  // numeric values
  holdings: number;
  cryptoNav: number;
  netDebt: number;
  totalDebt: number;
  cashReserves: number;
  preferredEquity: number;
  sharesOutstanding: number;
  holdingsPerShare: number;

  // optional mnav
  mNav: number | null;

  // equity nav
  equityNav: number;
  equityNavPerShare: number;

  // provenance-wrapped metrics used in UI
  cryptoNavPv: ProvenanceValue<number>;
  mNavPv: ProvenanceValue<number> | null;
  leveragePv: ProvenanceValue<number>;
  equityNavPv: ProvenanceValue<number>;
  equityNavPerSharePv: ProvenanceValue<number>;
};

type SourceHelpers = {
  sourceUrl?: (p: any) => string | undefined;
  sourceType?: (p: any) => string | undefined;
  sourceDate?: (p: any) => string | undefined;
  searchTerm?: (p: any) => string | undefined;
};

export type CompanyViewBaseConfig = {
  ticker: string;
  asset: "BTC" | "ETH";
  cik?: string;

  // provenance (passed through to calculation cards)
  provenance: any;

  // If company has dilutive instruments, provide basicShares for getEffectiveShares
  getEffectiveSharesBasic?: (company: Company) => number;

  // Build all derived metrics; MUST preserve company-specific logic
  buildMetrics: (ctx: {
    company: Company;
    prices: any;
    marketCap: number;
    effectiveShares: any;
  }) => CompanyViewBaseMetrics | null;

  // Optional extra sections
  renderStrategyAndOverview?: (ctx: { company: Company; prices: any }) => any;
  renderBalanceSheetExtras?: (ctx: { company: Company; metrics: CompanyViewBaseMetrics; prices: any }) => any;

  // Optional: override staleness dates
  stalenessDates?: (ctx: { company: Company }) => (string | undefined)[];

  // Optional: if marketCap should be overridden for cards/charts
  marketCapOverride?: (ctx: { company: Company; prices: any; marketCap: number }) => number;
};

export function CompanyViewBase({ company, className = "", config }: { company: Company; className?: string; config: CompanyViewBaseConfig }) {
  const { data: prices } = usePricesStream();

  const [timeRange, setTimeRange] = useState<TimeRange>("1y");
  const [interval, setInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const [chartMode, setChartMode] = useState<"price" | "mnav" | "hps">("price");
  const { data: history, isLoading: historyLoading } = useStockHistory(config.ticker, timeRange, interval);

  const [mnavTimeRange, setMnavTimeRange] = useState<TimeRange>("1y");
  const [mnavInterval, setMnavInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);

  const [expandedCard, setExpandedCard] = useState<CompanyViewBaseExpandedCard>(null);
  const toggleCard = (card: Exclude<CompanyViewBaseExpandedCard, null>) => setExpandedCard(expandedCard === card ? null : card);

  const stockData = prices?.stocks?.[config.ticker];
  const stockPrice = stockData?.price || 0;
  const stockChange = stockData?.change24h;
  const cryptoPrice = prices?.crypto?.[config.asset]?.price || 0;

  const { marketCap: rawMarketCap } = getMarketCapForMnavSync(company, stockData, prices?.forex);
  const marketCap = config.marketCapOverride ? config.marketCapOverride({ company, prices, marketCap: rawMarketCap }) : rawMarketCap;

  const effectiveShares = useMemo(() => {
    if (!stockPrice) return null;
    const basic = config.getEffectiveSharesBasic ? config.getEffectiveSharesBasic(company) : company.sharesForMnav || 0;
    return getEffectiveShares(config.ticker, basic || 0, stockPrice);
  }, [stockPrice, company.sharesForMnav]);

  const metrics = useMemo(() => {
    return config.buildMetrics({ company, prices, marketCap, effectiveShares });
  }, [company, prices, marketCap, effectiveShares]);

  const handleTimeRangeChange = (newRange: TimeRange) => {
    setTimeRange(newRange);
    setInterval(DEFAULT_INTERVAL[newRange]);
  };
  const handleMnavTimeRangeChange = (newRange: TimeRange) => {
    setMnavTimeRange(newRange);
    setMnavInterval(DEFAULT_INTERVAL[newRange]);
  };

  if (!metrics || !config.provenance?.holdings) {
    return <div className="text-center py-8 text-gray-500">Loading provenance data...</div>;
  }

  const intel = getCompanyIntel(config.ticker);

  const helpers: SourceHelpers = (config as any).provenanceHelpers || {};
  const sourceUrl = helpers.sourceUrl || ((p: any) => undefined);
  const sourceType = helpers.sourceType || ((p: any) => (p?.source as any)?.type);
  const sourceDate = helpers.sourceDate || ((p: any) => undefined);
  const searchTerm = helpers.searchTerm || ((p: any) => (p?.source as any)?.searchTerm);

  return (
    <div className={className}>
      {/* KEY METRICS */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">📊</span>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Key Metrics</h2>
        <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded ml-auto">Click any value for source</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <StalenessNote
        dates={(config.stalenessDates ? config.stalenessDates({ company }) : [company.holdingsLastUpdated, company.debtAsOf, company.cashAsOf, company.sharesAsOf])}
        secCik={company.secCik}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
        {metrics.mNavPv && (
          <div className={cn("cursor-pointer transition-all rounded-lg", expandedCard === "mnav" && "ring-2 ring-indigo-500")} onClick={() => toggleCard("mnav")}>
            <ProvenanceMetric
              label="mNAV"
              data={metrics.mNavPv}
              format="mnav"
              subLabel={<span className="flex items-center gap-1">EV / Crypto NAV <span className="text-indigo-500">{expandedCard === "mnav" ? "▼" : "▶"}</span></span>}
              tooltip="How much you pay per dollar of crypto exposure. mNAV > 1 = premium, < 1 = discount"
              ticker={config.ticker.toLowerCase()}
            />
          </div>
        )}

        <div className={cn("cursor-pointer transition-all rounded-lg", expandedCard === "leverage" && "ring-2 ring-amber-500")} onClick={() => toggleCard("leverage")}>
          <ProvenanceMetric
            label="Leverage"
            data={metrics.leveragePv}
            format="mnav"
            subLabel={<span className="flex items-center gap-1">Net Debt / Crypto NAV <span className="text-amber-500">{expandedCard === "leverage" ? "▼" : "▶"}</span></span>}
            tooltip="Debt relative to crypto NAV"
            ticker={config.ticker.toLowerCase()}
          />
        </div>

        <div className={cn("cursor-pointer transition-all rounded-lg", expandedCard === "equityNav" && "ring-2 ring-indigo-500")} onClick={() => toggleCard("equityNav")}>
          <ProvenanceMetric
            label="Equity NAV/Share"
            data={metrics.equityNavPerSharePv}
            format="currency"
            subLabel={<span className="flex items-center gap-1">What each share is worth <span className="text-indigo-500">{expandedCard === "equityNav" ? "▼" : "▶"}</span></span>}
            tooltip="Net assets per share after debt"
            ticker={config.ticker.toLowerCase()}
          />
        </div>

        <ProvenanceMetric
          label={`${config.asset} Holdings`}
          data={config.provenance.holdings}
          format="number"
          subLabel={config.asset === "BTC" ? "From filings" : "From filings"}
          tooltip="Crypto holdings"
          ticker={config.ticker.toLowerCase()}
        />

        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">{config.asset} / Share</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics.holdingsPerShare.toFixed(6)}</p>
          <p className="text-xs text-gray-400">{metrics.holdings.toLocaleString()} / {(metrics.sharesOutstanding / 1e6).toFixed(1)}M</p>
        </div>
      </div>

      {/* EXPANDABLE CARDS */}
      {expandedCard === "mnav" && (
        <div className="mb-8">
          <MnavCalculationCard
            ticker={config.ticker}
            asset={config.asset}
            marketCap={marketCap}
            totalDebt={(metrics as any).adjustedDebt ?? metrics.totalDebt}
            preferredEquity={metrics.preferredEquity}
            cashReserves={metrics.cashReserves}
            holdings={metrics.holdings}
            cryptoPrice={cryptoPrice}
            holdingsValue={metrics.cryptoNav}
            mNAV={metrics.mNav}
            sharesForMnav={metrics.sharesOutstanding}
            stockPrice={stockPrice}
            hasDilutiveInstruments={!!effectiveShares?.breakdown?.length}
            basicShares={effectiveShares?.basic}
            itmDilutionShares={effectiveShares ? effectiveShares.diluted - effectiveShares.basic : undefined}
            itmDebtAdjustment={(metrics as any).itmDebtAdjustment}
            sharesSourceUrl={sourceUrl(config.provenance.sharesOutstanding)}
            sharesSource={sourceType(config.provenance.sharesOutstanding)}
            sharesAsOf={sourceDate(config.provenance.sharesOutstanding)}
            debtSourceUrl={sourceUrl(config.provenance.totalDebt)}
            debtSource={sourceType(config.provenance.totalDebt)}
            debtAsOf={sourceDate(config.provenance.totalDebt)}
            cashSourceUrl={sourceUrl(config.provenance.cashReserves)}
            cashSource={sourceType(config.provenance.cashReserves)}
            cashAsOf={sourceDate(config.provenance.cashReserves)}
            holdingsSourceUrl={sourceUrl(config.provenance.holdings)}
            holdingsSource={sourceType(config.provenance.holdings)}
            holdingsAsOf={sourceDate(config.provenance.holdings)}
            holdingsSearchTerm={searchTerm(config.provenance.holdings)}
            debtSearchTerm={searchTerm(config.provenance.totalDebt)}
            cashSearchTerm={searchTerm(config.provenance.cashReserves)}
          />
        </div>
      )}

      {expandedCard === "leverage" && (
        <div className="mb-8">
          <LeverageCalculationCard
            rawDebt={metrics.totalDebt}
            adjustedDebt={(metrics as any).adjustedDebt ?? metrics.totalDebt}
            itmDebtAdjustment={(metrics as any).itmDebtAdjustment || 0}
            cashReserves={metrics.cashReserves}
            cryptoNav={metrics.cryptoNav}
            leverage={(metrics as any).leverage}
            debtSourceUrl={sourceUrl(config.provenance.totalDebt)}
            cashSourceUrl={sourceUrl(config.provenance.cashReserves)}
            holdingsSourceUrl={sourceUrl(config.provenance.holdings)}
          />
        </div>
      )}

      {expandedCard === "equityNav" && (
        <div className="mb-8">
          <EquityNavPerShareCalculationCard
            cryptoNav={metrics.cryptoNav}
            cashReserves={metrics.cashReserves}
            totalDebt={(metrics as any).adjustedDebt ?? metrics.totalDebt}
            preferredEquity={metrics.preferredEquity}
            sharesOutstanding={metrics.sharesOutstanding}
            equityNav={metrics.equityNav}
            equityNavPerShare={metrics.equityNavPerShare}
            stockPrice={stockPrice}
            holdingsSourceUrl={sourceUrl(config.provenance.holdings)}
            cashSourceUrl={sourceUrl(config.provenance.cashReserves)}
            debtSourceUrl={sourceUrl(config.provenance.totalDebt)}
            preferredSourceUrl={sourceUrl(config.provenance.preferredEquity)}
            sharesSourceUrl={sourceUrl(config.provenance.sharesOutstanding)}
          />
        </div>
      )}

      {/* STRATEGY & OVERVIEW */}
      {config.renderStrategyAndOverview ? (
        config.renderStrategyAndOverview({ company, prices })
      ) : (
        <details className="bg-gray-50 dark:bg-gray-900 rounded-lg mb-6 group">
          <summary className="p-6 cursor-pointer flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Strategy & Overview</h3>
            <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-6 pb-6">
            <div className="flex items-center gap-3 mb-6">
              {company.website && (
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                  Website
                </a>
              )}
              {(config.cik || company.secCik) && (
                <a
                  href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${config.cik || company.secCik}&type=&dateb=&owner=include&count=40`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  SEC Filings
                </a>
              )}
            </div>

            {intel?.strategySummary && <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">{intel.strategySummary}</p>}
          </div>
        </details>
      )}

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
              <input type="radio" name="chartMode" checked={chartMode === mode} onChange={() => setChartMode(mode)} className="w-4 h-4" />
              <span className="text-base font-semibold text-gray-900 dark:text-white">{mode === "price" ? "Price" : mode === "mnav" ? "mNAV" : "HPS"}</span>
            </label>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex gap-1">
            {(["1d", "7d", "1mo", "1y", "all"] as const).map((v) => (
              <button
                key={v}
                onClick={() => (chartMode === "mnav" ? handleMnavTimeRangeChange(v) : handleTimeRangeChange(v))}
                className={cn(
                  "px-3 py-1 text-sm rounded-md transition-colors",
                  (chartMode === "mnav" ? mnavTimeRange : timeRange) === v ? "bg-indigo-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                )}
              >
                {v === "1d" ? "24H" : v === "7d" ? "7D" : v === "1mo" ? "1M" : v === "1y" ? "1Y" : "ALL"}
              </button>
            ))}
          </div>
        </div>

        {chartMode === "price" && (historyLoading ? (
          <div className="h-[400px] flex items-center justify-center text-gray-500">Loading chart...</div>
        ) : history && history.length > 0 ? (
          <StockChart data={history} chartMode="price" />
        ) : (
          <div className="h-[400px] flex items-center justify-center text-gray-500">No historical data available</div>
        ))}

        {chartMode === "mnav" && metrics.mNav && stockPrice > 0 && cryptoPrice > 0 && (
          <CompanyMNAVChart
            ticker={config.ticker}
            asset={config.asset}
            currentMNAV={metrics.mNav}
            currentStockPrice={stockPrice}
            currentCryptoPrice={cryptoPrice}
            timeRange={mnavTimeRange}
            interval={mnavInterval}
            companyData={{
              holdings: metrics.holdings,
              sharesForMnav: metrics.sharesOutstanding,
              totalDebt: (metrics as any).adjustedDebt ?? metrics.totalDebt,
              preferredEquity: metrics.preferredEquity,
              cashReserves: metrics.cashReserves,
              restrictedCash: 0,
              asset: config.asset,
              currency: "USD",
            }}
          />
        )}

        {chartMode === "hps" && <HoldingsPerShareChart ticker={config.ticker} asset={config.asset} currentHoldingsPerShare={metrics.holdingsPerShare} />}
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
              <span className="text-gray-400"> crypto</span>
              <span className="text-green-600"> + {formatLargeNumber(metrics.cashReserves)}</span>
              <span className="text-gray-400"> cash</span>
              <span className="text-red-600"> − {formatLargeNumber((metrics as any).adjustedDebt ?? metrics.totalDebt)}</span>
              <span className="text-gray-400"> debt</span>
              {metrics.preferredEquity ? (
                <>
                  <span className="text-red-600"> − {formatLargeNumber(metrics.preferredEquity)}</span>
                  <span className="text-gray-400"> preferred</span>
                </>
              ) : null}
              <span className="text-indigo-600 font-semibold"> = {formatLargeNumber(metrics.equityNav)}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ProvenanceMetric label="Crypto NAV" data={metrics.cryptoNavPv} format="currency" subLabel={`${metrics.holdings.toLocaleString()} ${config.asset}`} tooltip="Holdings at current market price" ticker={config.ticker.toLowerCase()} />
            {config.provenance.cashReserves && <ProvenanceMetric label="Cash" data={config.provenance.cashReserves} format="currency" subLabel="" tooltip="Cash and equivalents" ticker={config.ticker.toLowerCase()} />}
            {config.provenance.totalDebt && <ProvenanceMetric label="Total Debt" data={config.provenance.totalDebt} format="currency" subLabel="" tooltip="Total debt" ticker={config.ticker.toLowerCase()} />}
            {config.provenance.sharesOutstanding && <ProvenanceMetric label="Shares Outstanding" data={config.provenance.sharesOutstanding} format="shares" subLabel="" tooltip="Basic shares" ticker={config.ticker.toLowerCase()} />}
          </div>

          {config.renderBalanceSheetExtras ? config.renderBalanceSheetExtras({ company, metrics, prices }) : null}
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
          <HoldingsHistoryTable ticker={config.ticker} asset={config.asset} />
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
          <ScheduledEvents ticker={config.ticker} />
        </div>
      </details>

      {/* Footer */}
      <div className="mt-6 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>Live Price:</span>
            <StockPriceCell price={stockPrice} change24h={stockChange} />
          </div>
          <Link href={`/company/${config.ticker}`} className="text-blue-600 hover:underline">View company</Link>
        </div>
      </div>
    </div>
  );
}
