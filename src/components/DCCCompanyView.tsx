// @ts-nocheck
"use client";

import { DCC_PROVENANCE } from "@/lib/data/provenance/dcc";
import { pv, derivedSource, getSourceUrl, getSourceDate } from "@/lib/data/types/provenance";
import type { Company } from "@/lib/types";
import type { ProvenanceValue } from "@/lib/data/types/provenance";

import { CompanyViewBase, type CompanyViewBaseConfig } from "./CompanyViewBase";

const WEBSITE_URL = "https://www.digitalx.com";
const TREASURY_DASHBOARD_URL = "https://treasury.digitalx.com";
const ASX_FILINGS_URL = "https://www.asx.com.au/markets/company/DCC";
const LISTCORP_URL = "https://www.listcorp.com/asx/dcc/digitalx-limited";

function su(p: any) {
  return p?.source ? getSourceUrl(p.source) : undefined;
}
function st(p: any) {
  return p?.source?.type;
}
function sd(p: any) {
  return p?.source ? getSourceDate(p.source) : undefined;
}
function ss(p: any) {
  return (p?.source as any)?.searchTerm;
}

interface Props {
  company: Company;
  className?: string;
}

export function DCCCompanyView({ company, className = "" }: Props) {
  const config: CompanyViewBaseConfig = {
    ticker: "DCC.AX",
    asset: "BTC",
    provenance: DCC_PROVENANCE,
    provenanceHelpers: {
      sourceUrl: su,
      sourceType: st,
      sourceDate: sd,
      searchTerm: ss,
    },

    buildMetrics: ({ company, prices, marketCap }) => {
      if (!DCC_PROVENANCE.holdings || !DCC_PROVENANCE.totalDebt || !DCC_PROVENANCE.cashReserves) return null;

      const btcPrice = prices?.crypto?.BTC?.price || 0;

      const holdings = DCC_PROVENANCE.holdings.value;
      const totalDebt = DCC_PROVENANCE.totalDebt.value;
      const cashReserves = DCC_PROVENANCE.cashReserves.value;
      const preferredEquity = DCC_PROVENANCE.preferredEquity?.value || 0;
      const sharesOutstanding = DCC_PROVENANCE.sharesOutstanding?.value || company.sharesForMnav || 0;

      const cryptoNav = holdings * btcPrice;
      const netDebt = Math.max(0, totalDebt - cashReserves);
      const ev = marketCap + totalDebt + preferredEquity - cashReserves;
      const mNav = cryptoNav > 0 ? ev / cryptoNav : null;
      const leverage = cryptoNav > 0 ? netDebt / cryptoNav : 0;
      const equityNav = cryptoNav + cashReserves - totalDebt - preferredEquity;
      const equityNavPerShare = sharesOutstanding > 0 ? equityNav / sharesOutstanding : 0;
      const holdingsPerShare = sharesOutstanding > 0 ? holdings / sharesOutstanding : 0;

      const cryptoNavPv: ProvenanceValue<number> = pv(
        cryptoNav,
        derivedSource({ derivation: "BTC Holdings × BTC Price", formula: "holdings × btcPrice", inputs: { holdings: DCC_PROVENANCE.holdings } }),
        `Using live BTC price: $${btcPrice.toLocaleString()}`
      );

      const mNavPv =
        mNav !== null
          ? pv(
              mNav,
              derivedSource({ derivation: "Enterprise Value ÷ Crypto NAV", formula: "(marketCap + debt - cash) / cryptoNav", inputs: { debt: DCC_PROVENANCE.totalDebt, cash: DCC_PROVENANCE.cashReserves, holdings: DCC_PROVENANCE.holdings } }),
              `No debt, clean balance sheet`
            )
          : null;

      const leveragePv: ProvenanceValue<number> = pv(
        leverage,
        derivedSource({ derivation: "Net Debt ÷ Crypto NAV", formula: "(debt - cash) / cryptoNav", inputs: { debt: DCC_PROVENANCE.totalDebt, cash: DCC_PROVENANCE.cashReserves, holdings: DCC_PROVENANCE.holdings } }),
        `NetDebt: ${netDebt}`
      );

      const equityNavPv: ProvenanceValue<number> = pv(
        equityNav,
        derivedSource({ derivation: "Crypto NAV + Cash − Debt", formula: "cryptoNav + cash - debt", inputs: { holdings: DCC_PROVENANCE.holdings, cash: DCC_PROVENANCE.cashReserves, debt: DCC_PROVENANCE.totalDebt } }),
        `After debt`
      );

      const equityNavPerSharePv: ProvenanceValue<number> = pv(
        equityNavPerShare,
        derivedSource({ derivation: "Equity NAV ÷ Shares Outstanding", formula: "equityNav / shares", inputs: { holdings: DCC_PROVENANCE.holdings, shares: DCC_PROVENANCE.sharesOutstanding!, debt: DCC_PROVENANCE.totalDebt, cash: DCC_PROVENANCE.cashReserves } }),
        `${(sharesOutstanding / 1e9).toFixed(2)}B shares`
      );

      return {
        holdings,
        cryptoNav,
        netDebt,
        totalDebt,
        cashReserves,
        preferredEquity,
        sharesOutstanding,
        holdingsPerShare,
        mNav,
        leverage,
        equityNav,
        equityNavPerShare,
        cryptoNavPv,
        mNavPv,
        leveragePv,
        equityNavPv,
        equityNavPerSharePv,
      } as any;
    },

    renderStrategyAndOverview: ({ company }) => (
      <details className="bg-gray-50 dark:bg-gray-900 rounded-lg mb-6 group">
        <summary className="p-6 cursor-pointer flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Strategy & Overview</h3>
          <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="px-6 pb-6">
          <div className="flex items-center gap-3 mb-6">
            <a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Website</a>
            <a href={TREASURY_DASHBOARD_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Treasury Dashboard</a>
            <a href={LISTCORP_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Listcorp</a>
            <a href={ASX_FILINGS_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">ASX</a>
          </div>
        </div>
      </details>
    ),

    renderAfterDataSections: ({ company }) =>
      company.dataWarnings && company.dataWarnings.length > 0 ? (
        <div className="mt-6 space-y-2">
          {company.dataWarnings.map((w: any, i: number) => (
            <div
              key={i}
              className={`rounded-lg px-4 py-3 text-sm flex items-start gap-2 ${
                w.severity === "warning"
                  ? "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800"
                  : "bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800"
              }`}
            >
              <span>{w.severity === "warning" ? "⚠️" : "ℹ️"}</span>
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      ) : null,

    scheduledEventsProps: ({ ticker, stockPrice }) => ({ ticker, stockPrice }),
  } as any;

  return <CompanyViewBase company={company} className={className} config={config} />;
}
