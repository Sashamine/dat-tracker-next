// @ts-nocheck
"use client";

import { HSDT_PROVENANCE, HSDT_CIK } from "@/lib/data/provenance/hsdt";
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

export function HSDTCompanyView({ company, className = "" }: Props) {
  const config: CompanyViewBaseConfig = {
    ticker: "HSDT",
    asset: "SOL",
    cik: HSDT_CIK,
    provenance: HSDT_PROVENANCE,
    provenanceHelpers: {
      sourceUrl: su,
      sourceType: st,
      sourceDate: sd,
      searchTerm: ss,
    },

    buildMetrics: ({ company, prices, marketCap }) => {
      if (!HSDT_PROVENANCE.holdings || !HSDT_PROVENANCE.totalDebt || !HSDT_PROVENANCE.cashReserves) return null;

      const solPrice = prices?.crypto?.SOL?.price || 0;

      const holdings = HSDT_PROVENANCE.holdings.value;
      const totalDebt = HSDT_PROVENANCE.totalDebt.value;
      const cashReserves = HSDT_PROVENANCE.cashReserves.value;
      const preferredEquity = HSDT_PROVENANCE.preferredEquity?.value || 0;
      const sharesOutstanding = HSDT_PROVENANCE.sharesOutstanding?.value || company.sharesForMnav || 0;

      const cryptoNav = holdings * solPrice;
      const netDebt = Math.max(0, totalDebt - cashReserves);
      const ev = marketCap + totalDebt + preferredEquity - cashReserves;
      const mNav = cryptoNav > 0 && marketCap > 0 ? ev / cryptoNav : null;
      const leverage = cryptoNav > 0 ? netDebt / cryptoNav : 0;
      const equityNav = cryptoNav + cashReserves - totalDebt - preferredEquity;
      const equityNavPerShare = sharesOutstanding > 0 ? equityNav / sharesOutstanding : 0;
      const holdingsPerShare = sharesOutstanding > 0 ? holdings / sharesOutstanding : 0;

      const cryptoNavPv: ProvenanceValue<number> = pv(
        cryptoNav,
        derivedSource({ derivation: "SOL Holdings × SOL Price", formula: "holdings × solPrice", inputs: { holdings: HSDT_PROVENANCE.holdings } }),
        `Using live SOL price: $${solPrice.toLocaleString()}`
      );

      const mNavPv =
        mNav !== null
          ? pv(
              mNav,
              derivedSource({ derivation: "Enterprise Value ÷ Crypto NAV", formula: "(marketCap + debt - cash) / cryptoNav", inputs: { debt: HSDT_PROVENANCE.totalDebt, cash: HSDT_PROVENANCE.cashReserves, holdings: HSDT_PROVENANCE.holdings } }),
              `Debt-free` 
            )
          : null;

      const leveragePv: ProvenanceValue<number> = pv(
        leverage,
        derivedSource({ derivation: "Net Debt ÷ Crypto NAV", formula: "(debt - cash) / cryptoNav", inputs: { debt: HSDT_PROVENANCE.totalDebt, cash: HSDT_PROVENANCE.cashReserves, holdings: HSDT_PROVENANCE.holdings } }),
        `Zero debt — no leverage`
      );

      const equityNavPv: ProvenanceValue<number> = pv(
        equityNav,
        derivedSource({ derivation: "Crypto NAV + Cash − Debt", formula: "cryptoNav + cash - debt", inputs: { holdings: HSDT_PROVENANCE.holdings, cash: HSDT_PROVENANCE.cashReserves, debt: HSDT_PROVENANCE.totalDebt } }),
        `Debt-free company`
      );

      const equityNavPerSharePv: ProvenanceValue<number> = pv(
        equityNavPerShare,
        derivedSource({ derivation: "Equity NAV ÷ Shares Outstanding", formula: "equityNav / shares", inputs: { holdings: HSDT_PROVENANCE.holdings, shares: HSDT_PROVENANCE.sharesOutstanding!, debt: HSDT_PROVENANCE.totalDebt, cash: HSDT_PROVENANCE.cashReserves } }),
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

    scheduledEventsProps: ({ ticker, stockPrice }) => ({ ticker, stockPrice }),
  } as any;

  return <CompanyViewBase company={company} className={className} config={config} />;
}
