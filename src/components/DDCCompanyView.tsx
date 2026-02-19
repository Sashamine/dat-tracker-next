// @ts-nocheck
"use client";

import { DDC_PROVENANCE, DDC_CIK } from "@/lib/data/provenance/ddc";
import { pv, derivedSource, getSourceUrl, getSourceDate } from "@/lib/data/types/provenance";
import type { Company } from "@/lib/types";
import type { ProvenanceValue } from "@/lib/data/types/provenance";

import { CompanyViewBase, type CompanyViewBaseConfig } from "./CompanyViewBase";

const DDC_WEBSITE = "https://ir.ddc.xyz";
const DDC_TWITTER = "https://x.com/ddcbtc_";
const DDC_TREASURY = "https://treasury.ddc.xyz";
const DDC_SEC_URL = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${DDC_CIK}&type=&dateb=&owner=include&count=40`;

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

export function DDCCompanyView({ company, className = "" }: Props) {
  const config: CompanyViewBaseConfig = {
    ticker: "DDC",
    asset: "BTC",
    cik: DDC_CIK,
    provenance: DDC_PROVENANCE,
    provenanceHelpers: {
      sourceUrl: su,
      sourceType: st,
      sourceDate: sd,
      searchTerm: ss,
    },

    buildMetrics: ({ company, prices, marketCap }) => {
      if (!DDC_PROVENANCE.holdings || !DDC_PROVENANCE.totalDebt || !DDC_PROVENANCE.cashReserves) return null;

      const btcPrice = prices?.crypto?.BTC?.price || 0;

      const holdings = DDC_PROVENANCE.holdings.value;
      const totalDebt = DDC_PROVENANCE.totalDebt.value;
      const cashReserves = DDC_PROVENANCE.cashReserves.value;
      const preferredEquity = DDC_PROVENANCE.preferredEquity?.value || 0;
      const sharesOutstanding = DDC_PROVENANCE.sharesOutstanding?.value || company.sharesForMnav || 0;

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
        derivedSource({ derivation: "BTC Holdings × BTC Price", formula: "holdings × btcPrice", inputs: { holdings: DDC_PROVENANCE.holdings } }),
        `Using live BTC price: $${btcPrice.toLocaleString()}`
      );

      const mNavPv =
        mNav !== null
          ? pv(
              mNav,
              derivedSource({ derivation: "Enterprise Value ÷ Crypto NAV", formula: "(marketCap + debt - cash) / cryptoNav", inputs: { debt: DDC_PROVENANCE.totalDebt, cash: DDC_PROVENANCE.cashReserves, holdings: DDC_PROVENANCE.holdings } }),
              `Debt: ${totalDebt}`
            )
          : null;

      const leveragePv: ProvenanceValue<number> = pv(
        leverage,
        derivedSource({ derivation: "Net Debt ÷ Crypto NAV", formula: "(debt - cash) / cryptoNav", inputs: { debt: DDC_PROVENANCE.totalDebt, cash: DDC_PROVENANCE.cashReserves, holdings: DDC_PROVENANCE.holdings } }),
        `NetDebt: ${netDebt}`
      );

      const equityNavPv: ProvenanceValue<number> = pv(
        equityNav,
        derivedSource({ derivation: "Crypto NAV + Cash − Debt − Preferred", formula: "cryptoNav + cash - debt - preferred", inputs: { holdings: DDC_PROVENANCE.holdings, cash: DDC_PROVENANCE.cashReserves, debt: DDC_PROVENANCE.totalDebt } }),
        `After debt`
      );

      const equityNavPerSharePv: ProvenanceValue<number> = pv(
        equityNavPerShare,
        derivedSource({ derivation: "Equity NAV ÷ Shares Outstanding", formula: "equityNav / shares", inputs: { holdings: DDC_PROVENANCE.holdings, shares: DDC_PROVENANCE.sharesOutstanding!, debt: DDC_PROVENANCE.totalDebt, cash: DDC_PROVENANCE.cashReserves } }),
        `${(sharesOutstanding / 1e6).toFixed(1)}M shares`
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
            <a href={DDC_WEBSITE} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">IR Website</a>
            <a href={DDC_TWITTER} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">@ddcbtc_</a>
            <a href={DDC_TREASURY} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Treasury</a>
            <a href={DDC_SEC_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">SEC</a>
          </div>
        </div>
      </details>
    ),

    scheduledEventsProps: ({ ticker, stockPrice }) => ({ ticker, stockPrice }),
  } as any;

  return <CompanyViewBase company={company} className={className} config={config} />;
}
