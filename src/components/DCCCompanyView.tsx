"use client";

import { useMemo, useState } from "react";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { StockChart } from "./stock-chart";
import { CompanyMNAVChart } from "./company-mnav-chart";
import { HoldingsPerShareChart } from "./holdings-per-share-chart";
import { HoldingsHistoryTable } from "./holdings-history-table";
import { ScheduledEvents } from "./scheduled-events";
import { StalenessNote } from "./staleness-note";
import { MnavCalculationCard } from "./mnav-calculation-card";
import { EquityNavPerShareCalculationCard } from "./expandable-metric-card";
import { getEffectiveShares } from "@/lib/data/dilutive-instruments";
import { getMarketCapForMnavSync } from "@/lib/utils/market-cap";
import { formatLargeNumber } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import type { Company } from "@/lib/types";
import {
  useStockHistory,
  TimeRange,
  ChartInterval,
  DEFAULT_INTERVAL,
} from "@/lib/hooks/use-stock-history";

interface Props {
  company: Company;
  className?: string;
}

/**
 * DCC.AX (DigitalX) custom company view with mNAV citations.
 *
 * Australian BTC treasury company (ASX-listed).
 * - 503.7 BTC total: 308.8 direct + 194.85 via BTXX ETF (own fund units)
 * - BTC strategy launched July 1, 2025
 * - Also holds: 20,521 SOL, Lime Street Capital fund, Bricklet property
 * - GM: William Hamilton (appointed Sep 26, 2025)
 * - FY ends June 30
 */
export function DCCCompanyView({ company, className = "" }: Props) {
  const { data: prices } = usePricesStream();

  // Chart state
  const [timeRange, setTimeRange] = useState<TimeRange>("1y");
  const [interval, setInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const [chartMode, setChartMode] = useState<"price" | "mnav" | "hps">("price");
  const { data: history, isLoading: historyLoading } = useStockHistory(
    "DCC.AX",
    timeRange,
    interval
  );

  const [mnavTimeRange, setMnavTimeRange] = useState<TimeRange>("1y");
  const [mnavInterval, setMnavInterval] = useState<ChartInterval>(
    DEFAULT_INTERVAL["1y"]
  );

  // Expandable cards
  const [expandedCard, setExpandedCard] = useState<
    "mnav" | "equityNav" | null
  >(null);
  const toggleCard = (card: "mnav" | "equityNav") =>
    setExpandedCard(expandedCard === card ? null : card);

  // Live prices
  const btcPrice = prices?.crypto.BTC?.price || 0;
  const stockData = prices?.stocks["DCC.AX"];
  const stockPrice = stockData?.price || 0;
  const stockChange = stockData?.change24h;

  // Market cap (AUD → USD handled by getMarketCapForMnavSync)
  const { marketCap } = getMarketCapForMnavSync(company, stockData, prices?.forex);

  // Dilutive instruments (if any tracked)
  const effectiveShares = useMemo(() => {
    if (!stockPrice) return null;
    return getEffectiveShares("DCC.AX", company.sharesForMnav || 0, stockPrice);
  }, [stockPrice, company.sharesForMnav]);

  // =========================================================================
  // mNAV CALCULATION
  // =========================================================================
  const metrics = useMemo(() => {
    const holdings = company.holdings || 504;
    const totalDebt = company.totalDebt || 0;
    const cashReserves = company.cashReserves || 1_782_000;
    const shares = company.sharesForMnav || 1_488_510_854;

    const cryptoNav = holdings * btcPrice;
    const excessCash = 0; // Cash is for ops, not excess
    const ev = marketCap + totalDebt - excessCash;
    const mNAV = cryptoNav > 0 ? ev / cryptoNav : null;

    // Equity NAV
    const equityNav = cryptoNav + cashReserves - totalDebt;
    const equityNavPerShare = shares > 0 ? equityNav / shares : 0;
    const hps = shares > 0 ? holdings / shares : 0;

    return {
      holdings,
      totalDebt,
      cashReserves,
      shares,
      cryptoNav,
      ev,
      mNAV,
      equityNav,
      equityNavPerShare,
      hps,
    };
  }, [btcPrice, marketCap, company]);

  // Time range handlers
  const handleTimeRange = (r: TimeRange) => {
    setTimeRange(r);
    setInterval(DEFAULT_INTERVAL[r]);
  };
  const handleMnavTimeRange = (r: TimeRange) => {
    setMnavTimeRange(r);
    setMnavInterval(DEFAULT_INTERVAL[r]);
  };

  return (
    <div className={className}>
      {/* KEY METRICS */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">📊</span>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Key Metrics
        </h2>
        <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded ml-auto">
          ASX-verified data
        </span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
        {/* mNAV */}
        <div
          className={cn(
            "bg-gray-50 dark:bg-gray-900 rounded-lg p-4 cursor-pointer transition-all",
            expandedCard === "mnav" && "ring-2 ring-orange-500"
          )}
          onClick={() => toggleCard("mnav")}
        >
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
            mNAV{" "}
            <span className="text-orange-500">
              {expandedCard === "mnav" ? "▼" : "▶"}
            </span>
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {metrics.mNAV ? metrics.mNAV.toFixed(2) + "x" : "—"}
          </p>
          <p className="text-xs text-gray-400">EV / Crypto NAV</p>
        </div>

        {/* BTC Holdings */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            BTC Holdings
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {metrics.holdings.toLocaleString(undefined, {
              maximumFractionDigits: 1,
            })}
          </p>
          <p className="text-xs text-gray-400">
            308.8 direct + 194.85 BTXX ETF
          </p>
        </div>

        {/* Equity NAV/Share */}
        <div
          className={cn(
            "bg-gray-50 dark:bg-gray-900 rounded-lg p-4 cursor-pointer transition-all",
            expandedCard === "equityNav" && "ring-2 ring-indigo-500"
          )}
          onClick={() => toggleCard("equityNav")}
        >
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
            Equity NAV/Share{" "}
            <span className="text-indigo-500">
              {expandedCard === "equityNav" ? "▼" : "▶"}
            </span>
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            ${metrics.equityNavPerShare.toFixed(4)}
          </p>
          <p className="text-xs text-gray-400">Net assets per share</p>
        </div>

        {/* Sats Per Share */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sats / Share
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {(metrics.hps * 100_000_000).toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">
            {metrics.holdings.toLocaleString()} /{" "}
            {(metrics.shares / 1e9).toFixed(2)}B
          </p>
        </div>

        {/* Cash */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Cash</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            ${formatLargeNumber(metrics.cashReserves)}
          </p>
          <p className="text-xs text-gray-400">
            A$2.83M (Q2 FY2026 4C)
          </p>
        </div>
      </div>

      {/* EXPANDABLE CARDS */}
      {expandedCard === "mnav" && (
        <div className="mb-8">
          <MnavCalculationCard
            ticker="DCC.AX"
            asset="BTC"
            marketCap={marketCap}
            totalDebt={metrics.totalDebt}
            preferredEquity={0}
            cashReserves={metrics.cashReserves}
            holdings={metrics.holdings}
            cryptoPrice={btcPrice}
            holdingsValue={metrics.cryptoNav}
            mNAV={metrics.mNAV}
            sharesForMnav={metrics.shares}
            stockPrice={stockPrice}
            hasDilutiveInstruments={false}
            basicShares={metrics.shares}
            // Source citations
            holdingsSourceUrl={company.holdingsSourceUrl}
            holdingsSource="regulatory-filing"
            holdingsAsOf={company.holdingsLastUpdated}
            sharesSourceUrl={company.sharesSourceUrl}
            sharesSource="asx-registry"
            sharesAsOf={company.sharesAsOf}
            debtSourceUrl={undefined}
            debtSource={undefined}
            debtAsOf={undefined}
            cashSourceUrl={company.cashSourceUrl}
            cashSource="regulatory-filing"
            cashAsOf={company.cashAsOf}
          />
        </div>
      )}

      {expandedCard === "equityNav" && (
        <div className="mb-8">
          <EquityNavPerShareCalculationCard
            cryptoNav={metrics.cryptoNav}
            cashReserves={metrics.cashReserves}
            totalDebt={metrics.totalDebt}
            preferredEquity={0}
            sharesOutstanding={metrics.shares}
            equityNav={metrics.equityNav}
            equityNavPerShare={metrics.equityNavPerShare}
            stockPrice={stockPrice}
            holdingsSourceUrl={company.holdingsSourceUrl}
            cashSourceUrl={company.cashSourceUrl}
            debtSourceUrl={undefined}
            sharesSourceUrl={company.sharesSourceUrl}
          />
        </div>
      )}

      {/* STRATEGY & OVERVIEW */}
      <details className="bg-gray-50 dark:bg-gray-900 rounded-lg mb-6 group">
        <summary className="p-6 cursor-pointer flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Strategy & Overview
          </h3>
          <svg
            className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </summary>
        <div className="px-6 pb-6">
          <div className="flex items-center gap-3 mb-6">
            <a
              href="https://www.digitalx.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
              Website
            </a>
            <a
              href="https://treasury.digitalx.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Treasury Dashboard
            </a>
            <a
              href="https://www.asx.com.au/markets/company/DCC"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              ASX Filings
            </a>
          </div>

          <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide mb-2">
              ₿ Australia&apos;s First ASX-Listed BTC Treasury
            </h4>
            <ul className="text-sm text-orange-600 dark:text-orange-300 space-y-1">
              <li>
                • <strong>503.7 BTC</strong>: 308.8 direct + 194.85 via{" "}
                <a
                  href="https://www.listcorp.com/asx/dcc/digitalx-limited/news/treasury-information-december-2025-3305468.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-orange-800"
                >
                  BTXX ETF units (own fund)
                </a>
              </li>
              <li>
                • BTC treasury strategy launched{" "}
                <strong>July 1, 2025</strong> — A$20.7M raise from UTXO
                Group, ParaFi Capital & Animoca Brands
              </li>
              <li>
                • Goal: <strong>2,100 BTC by 2027</strong> — using
                capital raises & market-neutral trading strategies
              </li>
              <li>
                • Also holds: <strong>20,521 SOL</strong> (staked, ~A$3.8M)
                + Lime Street Capital fund (~A$4.9M)
              </li>
              <li>
                • Revenue from{" "}
                <strong>Sell My Shares</strong> (brokerage, A$722K/qtr) &{" "}
                <strong>Drawbridge</strong> (governance SaaS)
              </li>
              <li>
                • Quarterly burn: A$705K ({" "}
                <a
                  href="https://www.listcorp.com/asx/dcc/digitalx-limited/news/quarterly-activities-appendix-4c-cash-flow-report-3308597.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-orange-800"
                >
                  Q2 FY2026 4C
                </a>
                ) — down 38% from Q1
              </li>
            </ul>
          </div>
        </div>
      </details>

      {/* STALENESS NOTE */}
      <StalenessNote className="mb-6" />

      {/* CHART */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📈</span>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Price Chart
          </h2>
        </div>
        <StockChart
          data={history || []}
          timeRange={timeRange}
          interval={interval}
          onTimeRangeChange={handleTimeRange}
          currency={company.currency}
        />
      </div>

      {/* mNAV CHART */}
      <div className="mb-8">
        <CompanyMNAVChart
          ticker="DCC.AX"
          timeRange={mnavTimeRange}
          interval={mnavInterval}
        />
      </div>

      {/* HPS CHART */}
      <div className="mb-8">
        <HoldingsPerShareChart ticker="DCC.AX" asset="BTC" currentHoldingsPerShare={metrics.hps} />
      </div>

      {/* HOLDINGS HISTORY TABLE */}
      <div className="mb-8">
        <HoldingsHistoryTable ticker="DCC.AX" asset="BTC" />
      </div>

      {/* EVENTS */}
      <div className="mb-8">
        <ScheduledEvents ticker="DCC.AX" />
      </div>
    </div>
  );
}
