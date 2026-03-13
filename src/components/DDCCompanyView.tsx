"use client";

import { buildCompanyProvenance, standardProvenanceHelpers } from "@/lib/utils/company-provenance";
import { pv, derivedSource } from "@/lib/data/types/provenance";
import type { Company, DataWarning } from "@/lib/types";
import type { ProvenanceValue } from "@/lib/data/types/provenance";
import { trackCitationSourceClick } from "@/lib/client-events";

import { CompanyViewBase, type CompanyViewBaseConfig, type CompanyViewBaseMetrics } from "./CompanyViewBase";

const DDC_WEBSITE = "https://ir.ddc.xyz";
const DDC_TWITTER = "https://x.com/ddcbtc_";
const DDC_TREASURY = "https://treasury.ddc.xyz";

interface DDCMetrics extends CompanyViewBaseMetrics {
  leverage: number;
}

interface Props {
  company: Company;
  className?: string;
}

export function DDCCompanyView({ company, className = "" }: Props) {
  const cp = buildCompanyProvenance(company);
  const secUrl = company.secCik
    ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${company.secCik}&type=&dateb=&owner=include&count=40`
    : undefined;

  const config: CompanyViewBaseConfig = {
    ticker: "DDC",
    asset: "BTC",
    cik: company.secCik,
    provenance: cp,
    provenanceHelpers: standardProvenanceHelpers,

    buildMetrics: ({ company, prices, marketCap }) => {
      if (!company.holdings) return null;

      const btcPrice = prices?.crypto?.BTC?.price || 0;

      const holdings = company.holdings ?? 0;
      const totalDebt = company.totalDebt ?? 0;
      const cashReserves = company.cashReserves ?? 0;
      const preferredEquity = company.preferredEquity ?? 0;
      const sharesOutstanding = company.sharesForMnav ?? 0;

      const cryptoNav = holdings * btcPrice;
      const netDebt = Math.max(0, totalDebt - cashReserves);
      const ev = marketCap + totalDebt + preferredEquity - cashReserves;
      const mNav = cryptoNav > 0 && marketCap > 0 ? ev / cryptoNav : null;
      const leverage = cryptoNav > 0 ? netDebt / cryptoNav : 0;
      const equityNav = cryptoNav + cashReserves - totalDebt - preferredEquity;
      const equityNavPerShare = sharesOutstanding > 0 ? equityNav / sharesOutstanding : 0;
      const holdingsPerShare = sharesOutstanding > 0 ? holdings / sharesOutstanding : 0;

      const cryptoNavPv: ProvenanceValue<number> = pv(
        cryptoNav,
        derivedSource({ derivation: "BTC Holdings × BTC Price", formula: "holdings × btcPrice", inputs: { holdings: cp.holdings } }),
        `Using live BTC price: $${btcPrice.toLocaleString()}`
      );

      const mNavPv =
        mNav !== null
          ? pv(
              mNav,
              derivedSource({ derivation: "Enterprise Value ÷ Crypto NAV", formula: "(marketCap + debt - cash) / cryptoNav", inputs: { debt: cp.totalDebt, cash: cp.cashReserves, holdings: cp.holdings } }),
              `Debt: ${totalDebt}`
            )
          : null;

      const leveragePv: ProvenanceValue<number> = pv(
        leverage,
        derivedSource({ derivation: "Net Debt ÷ Crypto NAV", formula: "(debt - cash) / cryptoNav", inputs: { debt: cp.totalDebt, cash: cp.cashReserves, holdings: cp.holdings } }),
        `NetDebt: ${netDebt}`
      );

      const equityNavPv: ProvenanceValue<number> = pv(
        equityNav,
        derivedSource({ derivation: "Crypto NAV + Cash − Debt − Preferred", formula: "cryptoNav + cash - debt - preferred", inputs: { holdings: cp.holdings, cash: cp.cashReserves, debt: cp.totalDebt } }),
        `After debt`
      );

      const equityNavPerSharePv: ProvenanceValue<number> = pv(
        equityNavPerShare,
        derivedSource({ derivation: "Equity NAV ÷ Shares Outstanding", formula: "equityNav / shares", inputs: { holdings: cp.holdings, shares: cp.sharesOutstanding, debt: cp.totalDebt, cash: cp.cashReserves } }),
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
      } satisfies DDCMetrics;
    },

    renderAfterDataSections: ({ company }) =>
      company.dataWarnings && company.dataWarnings.length > 0 ? (
        <div className="mt-6 space-y-2">
          {company.dataWarnings.map((w: DataWarning, i: number) => (
            <div
              key={i}
              className={`rounded-lg px-4 py-3 text-sm flex items-start gap-2 ${
                w.severity === "warning"
                  ? "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800"
                  : "bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800"
              }`}
            >
              <span>{w.severity === "warning" ? "\u26A0\uFE0F" : "\u2139\uFE0F"}</span>
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      ) : null,

    renderStrategyAndOverview: () => (
      <details className="bg-gray-50 dark:bg-gray-900 rounded-lg mb-6 group">
        <summary className="p-6 cursor-pointer flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Strategy & Overview</h3>
          <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="px-6 pb-6">
          <div className="flex items-center gap-3 mb-6">
            <a
              href={DDC_WEBSITE}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackCitationSourceClick({ href: DDC_WEBSITE, ticker: "DDC" })}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              IR Website
            </a>
            <a
              href={DDC_TWITTER}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackCitationSourceClick({ href: DDC_TWITTER, ticker: "DDC" })}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              @ddcbtc_
            </a>
            <a
              href={DDC_TREASURY}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackCitationSourceClick({ href: DDC_TREASURY, ticker: "DDC" })}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Treasury
            </a>
            {secUrl && (
              <a
                href={secUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackCitationSourceClick({ href: secUrl!, ticker: "DDC" })}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                SEC
              </a>
            )}
          </div>
        </div>
      </details>
    ),

    scheduledEventsProps: ({ ticker, stockPrice }) => ({ ticker, stockPrice }),
  };

  return <CompanyViewBase company={company} className={className} config={config} />;
}
