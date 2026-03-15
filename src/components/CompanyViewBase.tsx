"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";

import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import type { PricesData } from "@/lib/hooks/use-prices-stream";
import { useYesterdayMnav } from "@/lib/hooks/use-yesterday-mnav";
import { getCompanyIntel } from "@/lib/data/company-intel";

import { getEffectiveShares } from "@/lib/data/dilutive-instruments";
import type { EffectiveSharesResult } from "@/lib/data/dilutive-instruments";
import { getMarketCapForMnavSync, getTickerCurrency } from "@/lib/utils/market-cap";
import { formatLargeNumber } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import { trackCitationSourceClick } from "@/lib/client-events";

import type { Company, Asset } from "@/lib/types";
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
import useSWR from "swr";
import { getCompanyAhpsMetrics, type AhpsHistoryEntry } from "@/lib/utils/ahps";

export type CompanyViewBaseExpandedCard = "mnav" | "leverage" | "equityNav" | null;

type PvParam = ProvenanceValue<number> | undefined;

/** Minimal provenance shape — only the fields CompanyViewBase reads directly */
type ProvenanceData = {
  holdings?: ProvenanceValue<number>;
  totalDebt?: ProvenanceValue<number>;
  cashReserves?: ProvenanceValue<number>;
  sharesOutstanding?: ProvenanceValue<number>;
  preferredEquity?: ProvenanceValue<number>;
};

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

  // Optional extended fields used by expandable cards / charts
  leverage?: number;
  adjustedDebt?: number;
  itmDebtAdjustment?: number;
  /** Warrant exercise proceeds (cash, not crypto) — for correct 24hr mNAV scaling */
  inTheMoneyWarrantProceeds?: number;
};

export type SourceHelpers = {
  sourceUrl?: (p: PvParam) => string | undefined;
  sourceType?: (p: PvParam) => string | undefined;
  sourceDate?: (p: PvParam) => string | undefined;
  searchTerm?: (p: PvParam) => string | undefined;
};

type ScheduledEventsProps = {
  ticker: string;
  stockPrice?: number;
};

export type CompanyViewBaseConfig = {
  ticker: string;
  asset: Asset;
  cik?: string;

  // provenance (passed through to calculation cards)
  provenance: ProvenanceData;

  // Optional provenance source helpers (sourceUrl, sourceType, etc.)
  provenanceHelpers?: SourceHelpers;

  // If company has dilutive instruments, provide basicShares for getEffectiveShares
  getEffectiveSharesBasic?: (company: Company) => number;

  // Build all derived metrics; MUST preserve company-specific logic
  buildMetrics: (ctx: {
    company: Company;
    prices: PricesData | null;
    marketCap: number;
    effectiveShares: EffectiveSharesResult | null;
  }) => CompanyViewBaseMetrics | null;

  // Optional extra sections
  renderStrategyAndOverview?: (ctx: { company: Company; prices: PricesData | null }) => ReactNode;
  renderBalanceSheetExtras?: (ctx: { company: Company; metrics: CompanyViewBaseMetrics; prices: PricesData | null }) => ReactNode;

  // Optional: customize ScheduledEvents props (some tickers pass stockPrice)
  scheduledEventsProps?: (ctx: { ticker: string; stockPrice: number }) => ScheduledEventsProps;

  // Optional: render extra accordion sections after Scheduled Events
  renderAfterDataSections?: (ctx: { company: Company; prices: PricesData | null; metrics: CompanyViewBaseMetrics; stockPrice: number }) => ReactNode;

  // Optional: override staleness dates
  stalenessDates?: (ctx: { company: Company }) => (string | undefined)[];

  // Optional: if marketCap should be overridden for cards/charts
  marketCapOverride?: (ctx: { company: Company; prices: PricesData | null; marketCap: number }) => number;
};

export function CompanyViewBase({ company, className = "", config }: { company: Company; className?: string; config: CompanyViewBaseConfig }) {
  const { data: prices } = usePricesStream();
  const { data: yesterdayMnavData } = useYesterdayMnav();

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
    const basic = config.getEffectiveSharesBasic ? config.getEffectiveSharesBasic(company) : company.sharesForMnav ?? 0;
    return getEffectiveShares(config.ticker, basic || 0, stockPrice);
  }, [stockPrice, company, config]);

  const metrics = useMemo(() => {
    return config.buildMetrics({ company, prices, marketCap, effectiveShares });
  }, [company, prices, marketCap, effectiveShares, config]);

  // 24hr mNAV change: compare today's mNAV against yesterday's D1 snapshot.
  // The snapshot was calculated by the same formula, so no methodology drift.
  const mnavChange = useMemo(() => {
    if (!metrics?.mNav || metrics.mNav <= 0) return null;
    const yday = yesterdayMnavData?.[config.ticker];
    if (!yday?.mnav || yday.mnav <= 0) return null;
    return ((metrics.mNav / yday.mnav) - 1) * 100;
  }, [metrics?.mNav, yesterdayMnavData, config.ticker]);

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

  // Strategy context: AHPS 90D growth
  const hpsGrowthFetcher = (url: string) => fetch(url).then(r => r.json());
  const { data: hpsData } = useSWR<{ success: boolean; results: Array<{ ticker: string; currentSnapshot: { date: string; holdings: number; sharesOutstanding: number; holdingsPerShare: number }; history: Array<{ date: string; holdings: number; sharesOutstanding: number; holdingsPerShare: number }> }> }>(
    `/api/d1/hps-growth?ticker=${config.ticker}`,
    hpsGrowthFetcher,
    { revalidateOnFocus: false }
  );
  const ahpsGrowth90d = useMemo(() => {
    const row = hpsData?.results?.find(r => r.ticker.toUpperCase() === config.ticker.toUpperCase());
    if (!row) return null;
    const history: AhpsHistoryEntry[] = row.history?.map(s => ({
      date: s.date,
      holdings: s.holdings,
      sharesOutstanding: s.sharesOutstanding,
      holdingsPerShare: s.holdingsPerShare,
    })) || [];
    const ahps = getCompanyAhpsMetrics({
      ticker: config.ticker,
      company: { ...company, holdings: row.currentSnapshot.holdings, holdingsLastUpdated: row.currentSnapshot.date },
      history,
      currentStockPrice: stockPrice || undefined,
    });
    return ahps.ahpsGrowth90d;
  }, [hpsData, config.ticker, company, stockPrice]);

  const helpers: SourceHelpers = config.provenanceHelpers || {};
  const sourceUrl = helpers.sourceUrl || (() => undefined);
  const sourceType = helpers.sourceType || ((p: PvParam) => p?.source?.type);
  const sourceDate = helpers.sourceDate || (() => undefined);
  const searchTerm = helpers.searchTerm || ((p: PvParam) => {
    const src = p?.source;
    return src && 'searchTerm' in src ? src.searchTerm : undefined;
  });

  return (
    <div className={className}>
      {/* KEY METRICS */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">📊</span>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Key Metrics</h2>
        <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded ml-auto">Click any value for source</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* Strategy Context — The Trinity */}
      {metrics.mNav !== null && (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          <span>mNAV: <span className="font-bold">{metrics.mNav.toFixed(2)}x</span></span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span>AHPS 90D: <span className={cn("font-bold", ahpsGrowth90d !== null && ahpsGrowth90d >= 0 ? "text-green-600" : ahpsGrowth90d !== null ? "text-red-600" : "")}>
            {ahpsGrowth90d !== null ? `${ahpsGrowth90d >= 0 ? "+" : ""}${ahpsGrowth90d.toFixed(1)}%` : "—"}
          </span></span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span>Sr. Claims: <span className={cn("font-bold", (metrics.leverage ?? 0) >= 1 ? "text-amber-600" : "")}>
            {metrics.leverage !== undefined && metrics.leverage > 0 ? `${metrics.leverage.toFixed(2)}x` : "—"}
          </span></span>
        </div>
      )}

      <StalenessNote
        dates={(config.stalenessDates ? config.stalenessDates({ company }) : [company.holdingsLastUpdated, company.debtAsOf, company.cashAsOf, company.sharesAsOf])}
        secCik={company.secCik}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
        {/* Market Cap */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Market Cap</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatLargeNumber(marketCap)}</p>
          <p className="text-xs text-gray-400">
            {effectiveShares
              ? `${(effectiveShares.diluted / 1e6).toFixed(1)}M shares × $${stockPrice.toFixed(2)}`
              : `${((company.sharesForMnav ?? 0) / 1e6).toFixed(1)}M shares`}
          </p>
        </div>

        {metrics.mNavPv && (
          <div className={cn("cursor-pointer transition-all rounded-lg", expandedCard === "mnav" && "ring-2 ring-indigo-500")} onClick={() => toggleCard("mnav")}>
            <ProvenanceMetric
              label="mNAV"
              data={metrics.mNavPv}
              format="mnav"
              subLabel={
                <span className="flex items-center gap-1">
                  EV / Crypto NAV
                  {mnavChange !== null && (
                    <span className={cn(
                      "text-xs font-medium px-1.5 py-0.5 rounded ml-1",
                      mnavChange > 0 ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
                      mnavChange < 0 ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" :
                      "bg-gray-100 dark:bg-gray-800 text-gray-500"
                    )}>
                      {mnavChange > 0 ? "+" : ""}{mnavChange.toFixed(1)}%
                    </span>
                  )}
                  <span className="text-indigo-500">{expandedCard === "mnav" ? "▼" : "▶"}</span>
                </span>
              }
              tooltip="How much you pay per dollar of crypto exposure. mNAV > 1 = premium, < 1 = discount"
              ticker={config.ticker.toLowerCase()}
            />
          </div>
        )}

        <div className={cn("cursor-pointer transition-all rounded-lg", expandedCard === "leverage" && "ring-2 ring-amber-500")} onClick={() => toggleCard("leverage")}>
          <ProvenanceMetric
            label="Senior Claims"
            data={metrics.leveragePv}
            format="mnav"
            subLabel={<span className="flex items-center gap-1">(Debt + Pref) / Crypto NAV <span className="text-amber-500">{expandedCard === "leverage" ? "▼" : "▶"}</span></span>}
            tooltip="Total claims senior to common equity relative to crypto NAV"
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
            totalDebt={metrics.adjustedDebt ?? metrics.totalDebt}
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
            itmDebtAdjustment={metrics.itmDebtAdjustment}
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
            adjustedDebt={metrics.adjustedDebt ?? metrics.totalDebt}
            itmDebtAdjustment={metrics.itmDebtAdjustment || 0}
            cashReserves={metrics.cashReserves}
            cryptoNav={metrics.cryptoNav}
            leverage={metrics.leverage ?? 0}
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
            totalDebt={metrics.adjustedDebt ?? metrics.totalDebt}
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
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackCitationSourceClick({ href: company.website || "", ticker: company.ticker })}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  Website
                </a>
              )}
              {(config.cik || company.secCik) && (
                <a
                  href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${config.cik || company.secCik}&type=&dateb=&owner=include&count=40`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackCitationSourceClick({
                      href: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${config.cik || company.secCik}&type=&dateb=&owner=include&count=40`,
                      ticker: company.ticker,
                      metric: "filings",
                    })
                  }
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
              totalDebt: metrics.adjustedDebt ?? metrics.totalDebt,
              preferredEquity: metrics.preferredEquity,
              cashReserves: metrics.cashReserves,
              restrictedCash: 0,
              asset: config.asset,
              currency: getTickerCurrency(config.ticker),
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
              <span className="text-red-600"> − {formatLargeNumber(metrics.adjustedDebt ?? metrics.totalDebt)}</span>
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
          {(() => {
            const props = config.scheduledEventsProps
              ? config.scheduledEventsProps({ ticker: config.ticker, stockPrice })
              : ({ ticker: config.ticker } as ScheduledEventsProps);
            return <ScheduledEvents {...props} />;
          })()}
        </div>
      </details>

      {config.renderAfterDataSections ? config.renderAfterDataSections({ company, prices, metrics, stockPrice }) : null}

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
