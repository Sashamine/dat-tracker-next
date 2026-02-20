// @ts-nocheck
"use client";

import { ALCPB_PROVENANCE } from "@/lib/data/provenance/alcpb";
import { pv, derivedSource, getSourceUrl, getSourceDate } from "@/lib/data/types/provenance";
import type { Company } from "@/lib/types";
import type { ProvenanceValue } from "@/lib/data/types/provenance";

import { CompanyViewBase, type CompanyViewBaseConfig } from "./CompanyViewBase";

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

export function ALCPBCompanyView({ company, className = "" }: Props) {
  const config: CompanyViewBaseConfig = {
    ticker: "ALCPB",
    asset: "BTC",
    provenance: ALCPB_PROVENANCE,
    provenanceHelpers: {
      sourceUrl: su,
      sourceType: st,
      sourceDate: sd,
      searchTerm: ss,
    },

    buildMetrics: ({ company, prices, marketCap }) => {
      if (!ALCPB_PROVENANCE.holdings || !ALCPB_PROVENANCE.totalDebt || !ALCPB_PROVENANCE.cashReserves) return null;

      const btcPrice = prices?.crypto?.BTC?.price || 0;

      const holdings = ALCPB_PROVENANCE.holdings.value;
      const totalDebt = ALCPB_PROVENANCE.totalDebt.value;
      const cashReserves = ALCPB_PROVENANCE.cashReserves.value;
      const preferredEquity = ALCPB_PROVENANCE.preferredEquity?.value || 0;
      const sharesOutstanding = ALCPB_PROVENANCE.sharesOutstanding?.value || company.sharesForMnav || 0;

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
        derivedSource({ derivation: "BTC Holdings × BTC Price", formula: "holdings × btcPrice", inputs: { holdings: ALCPB_PROVENANCE.holdings } }),
        `Using live BTC price: $${btcPrice.toLocaleString()}`
      );

      const mNavPv =
        mNav !== null
          ? pv(
              mNav,
              derivedSource({ derivation: "Enterprise Value ÷ Crypto NAV", formula: "(marketCap + debt + preferred - cash) / cryptoNav", inputs: { debt: ALCPB_PROVENANCE.totalDebt, cash: ALCPB_PROVENANCE.cashReserves, holdings: ALCPB_PROVENANCE.holdings } }),
              `Debt: ${totalDebt}`
            )
          : null;

      const leveragePv: ProvenanceValue<number> = pv(
        leverage,
        derivedSource({ derivation: "Net Debt ÷ Crypto NAV", formula: "(debt - cash) / cryptoNav", inputs: { debt: ALCPB_PROVENANCE.totalDebt, cash: ALCPB_PROVENANCE.cashReserves, holdings: ALCPB_PROVENANCE.holdings } }),
        `NetDebt: ${netDebt}`
      );

      const equityNavPv: ProvenanceValue<number> = pv(
        equityNav,
        derivedSource({ derivation: "Crypto NAV + Cash − Debt − Preferred", formula: "cryptoNav + cash - debt - preferred", inputs: { holdings: ALCPB_PROVENANCE.holdings, cash: ALCPB_PROVENANCE.cashReserves, debt: ALCPB_PROVENANCE.totalDebt } }),
        `After debt`
      );

      const equityNavPerSharePv: ProvenanceValue<number> = pv(
        equityNavPerShare,
        derivedSource({ derivation: "Equity NAV ÷ Shares Outstanding", formula: "equityNav / shares", inputs: { holdings: ALCPB_PROVENANCE.holdings, shares: ALCPB_PROVENANCE.sharesOutstanding!, debt: ALCPB_PROVENANCE.totalDebt, cash: ALCPB_PROVENANCE.cashReserves } }),
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
              className={`px-4 py-3 rounded-lg text-sm flex items-start gap-2 ${
                w.severity === "warning"
                  ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                  : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300"
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
