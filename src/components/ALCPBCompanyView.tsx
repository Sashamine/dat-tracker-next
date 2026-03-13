"use client";

import { buildCompanyProvenance, standardProvenanceHelpers } from "@/lib/utils/company-provenance";
import { pv, derivedSource } from "@/lib/data/types/provenance";
import type { Company, DataWarning } from "@/lib/types";
import type { ProvenanceValue } from "@/lib/data/types/provenance";

import { CompanyViewBase, type CompanyViewBaseConfig, type CompanyViewBaseMetrics } from "./CompanyViewBase";

interface ALCPBMetrics extends CompanyViewBaseMetrics {
  leverage: number;
}

interface Props {
  company: Company;
  className?: string;
}

export function ALCPBCompanyView({ company, className = "" }: Props) {
  const cp = buildCompanyProvenance(company);

  const config: CompanyViewBaseConfig = {
    ticker: "ALCPB",
    asset: "BTC",
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
              derivedSource({ derivation: "Enterprise Value ÷ Crypto NAV", formula: "(marketCap + debt + preferred - cash) / cryptoNav", inputs: { debt: cp.totalDebt, cash: cp.cashReserves, holdings: cp.holdings } }),
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
      } satisfies ALCPBMetrics;
    },

    renderAfterDataSections: ({ company }) =>
      company.dataWarnings && company.dataWarnings.length > 0 ? (
        <div className="mt-6 space-y-2">
          {company.dataWarnings.map((w: DataWarning, i: number) => (
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
  };

  return <CompanyViewBase company={company} className={className} config={config} />;
}
