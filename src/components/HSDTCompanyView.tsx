"use client";

import { buildCompanyProvenance, standardProvenanceHelpers } from "@/lib/utils/company-provenance";
import { pv, derivedSource } from "@/lib/data/types/provenance";
import type { Company } from "@/lib/types";
import type { ProvenanceValue } from "@/lib/data/types/provenance";

import { CompanyViewBase, type CompanyViewBaseConfig, type CompanyViewBaseMetrics } from "./CompanyViewBase";

interface HSDTMetrics extends CompanyViewBaseMetrics {
  leverage: number;
}

interface Props {
  company: Company;
  className?: string;
}

export function HSDTCompanyView({ company, className = "" }: Props) {
  const cp = buildCompanyProvenance(company);

  const config: CompanyViewBaseConfig = {
    ticker: "HSDT",
    asset: "SOL",
    cik: company.secCik,
    provenance: cp,
    provenanceHelpers: standardProvenanceHelpers,

    buildMetrics: ({ company, prices, marketCap }) => {
      if (!company.holdings) return null;

      const solPrice = prices?.crypto?.SOL?.price || 0;

      const holdings = company.holdings ?? 0;
      const totalDebt = company.totalDebt ?? 0;
      const cashReserves = company.cashReserves ?? 0;
      const preferredEquity = company.preferredEquity ?? 0;
      const sharesOutstanding = company.sharesForMnav ?? 0;

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
        derivedSource({ derivation: "SOL Holdings × SOL Price", formula: "holdings × solPrice", inputs: { holdings: cp.holdings } }),
        `Using live SOL price: $${solPrice.toLocaleString()}`
      );

      const mNavPv =
        mNav !== null
          ? pv(
              mNav,
              derivedSource({ derivation: "Enterprise Value ÷ Crypto NAV", formula: "(marketCap + debt - cash) / cryptoNav", inputs: { debt: cp.totalDebt, cash: cp.cashReserves, holdings: cp.holdings } }),
              `Debt-free`
            )
          : null;

      const leveragePv: ProvenanceValue<number> = pv(
        leverage,
        derivedSource({ derivation: "Net Debt ÷ Crypto NAV", formula: "(debt - cash) / cryptoNav", inputs: { debt: cp.totalDebt, cash: cp.cashReserves, holdings: cp.holdings } }),
        `Zero debt — no leverage`
      );

      const equityNavPv: ProvenanceValue<number> = pv(
        equityNav,
        derivedSource({ derivation: "Crypto NAV + Cash − Debt", formula: "cryptoNav + cash - debt", inputs: { holdings: cp.holdings, cash: cp.cashReserves, debt: cp.totalDebt } }),
        `Debt-free company`
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
      } satisfies HSDTMetrics;
    },

    scheduledEventsProps: ({ ticker, stockPrice }) => ({ ticker, stockPrice }),
  };

  return <CompanyViewBase company={company} className={className} config={config} />;
}
