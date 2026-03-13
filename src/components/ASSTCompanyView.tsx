"use client";

import { buildCompanyProvenance, standardProvenanceHelpers } from "@/lib/utils/company-provenance";
import { pv, derivedSource } from "@/lib/data/types/provenance";
import { getCompanyMNAV } from "@/lib/hooks/use-mnav-stats";
import type { Company } from "@/lib/types";
import type { ProvenanceValue } from "@/lib/data/types/provenance";

import { CompanyViewBase, type CompanyViewBaseConfig, type CompanyViewBaseMetrics } from "./CompanyViewBase";

interface ASSTMetrics extends CompanyViewBaseMetrics {
  leverage: number;
  restrictedCash: number;
}

interface Props {
  company: Company;
  className?: string;
}

export function ASSTCompanyView({ company, className = "" }: Props) {
  const cp = buildCompanyProvenance(company);

  const config: CompanyViewBaseConfig = {
    ticker: "ASST",
    asset: "BTC",
    cik: company.secCik,
    provenance: cp,
    provenanceHelpers: standardProvenanceHelpers,

    buildMetrics: ({ company, prices }) => {
      if (!company.holdings || !company.totalDebt === undefined || !company.cashReserves === undefined) return null;

      const btcPrice = prices?.crypto?.BTC?.price || 0;

      const holdings = company.holdings ?? 0;
      const sharesOutstanding = company.sharesForMnav ?? 0;
      const cashReserves = company.cashReserves ?? 0;
      const restrictedCash = company.restrictedCash ?? 0;
      const totalDebt = company.totalDebt ?? 0;
      const preferredEquity = company.preferredEquity ?? 0;

      // ASST: uses shared getCompanyMNAV for consistency (includes restricted cash rules)
      const mNav = getCompanyMNAV(company, prices);

      const cryptoNav = holdings * btcPrice;
      const freeCash = cashReserves - restrictedCash;
      const netDebt = Math.max(0, totalDebt - freeCash);
      const leverage = cryptoNav > 0 ? netDebt / cryptoNav : 0;

      const equityNav = cryptoNav + freeCash - totalDebt - preferredEquity;
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
              derivedSource({
                derivation: "Enterprise Value ÷ Crypto NAV",
                formula: "(marketCap + debt + preferred - cash) / cryptoNav",
                inputs: {
                  holdings: cp.holdings,
                  cash: cp.cashReserves,
                  debt: cp.totalDebt,
                  ...(cp.preferredEquity ? { preferred: cp.preferredEquity } : {}),
                },
              }),
              `mNAV uses shared calculator (restricted cash treated as pre-crypto)`
            )
          : null;

      const leveragePv = pv(
        leverage,
        derivedSource({
          derivation: "Net Debt ÷ Crypto NAV",
          formula: "(debt - freeCash) / cryptoNav",
          inputs: {
            debt: cp.totalDebt,
            cash: cp.cashReserves,
            holdings: cp.holdings,
          },
        }),
        `ASST has no debt; leverage driven by preferred equity (SATA)`
      );

      const equityNavPv = pv(
        equityNav,
        derivedSource({
          derivation: "Crypto NAV + Free Cash − Debt − Preferred",
          formula: "(holdings × btcPrice) + freeCash - debt - preferred",
          inputs: {
            holdings: cp.holdings,
            cash: cp.cashReserves,
            debt: cp.totalDebt,
            ...(cp.preferredEquity ? { preferred: cp.preferredEquity } : {}),
          },
        }),
        `Free cash excludes restricted cash earmarked for crypto purchases`
      );

      const equityNavPerSharePv = pv(
        equityNavPerShare,
        derivedSource({
          derivation: "Equity NAV ÷ Shares Outstanding",
          formula: "equityNav / shares",
          inputs: {
            holdings: cp.holdings,
            shares: cp.sharesOutstanding,
            cash: cp.cashReserves,
            debt: cp.totalDebt,
            ...(cp.preferredEquity ? { preferred: cp.preferredEquity } : {}),
          },
        }),
        `Using ${(sharesOutstanding / 1_000_000).toFixed(1)}M shares`
      );

      return {
        holdings,
        cryptoNav,
        netDebt,
        totalDebt,
        cashReserves: freeCash,
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
        restrictedCash,
      } satisfies ASSTMetrics;
    },

    scheduledEventsProps: ({ ticker, stockPrice }) => ({ ticker, stockPrice }),
  };

  return <CompanyViewBase company={company} className={className} config={config} />;
}
