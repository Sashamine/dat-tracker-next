"use client";

import { STRV_PROVENANCE, STRV_CIK } from "@/lib/data/provenance/strv";
import { pv, derivedSource, getSourceUrl, getSourceDate } from "@/lib/data/types/provenance";
import { getCompanyMNAV } from "@/lib/hooks/use-mnav-stats";
import type { Company } from "@/lib/types";
import type { ProvenanceValue, XBRLSource, DocumentSource, DerivedSource } from "@/lib/data/types/provenance";

import { CompanyViewBase, type CompanyViewBaseConfig, type CompanyViewBaseMetrics } from "./CompanyViewBase";

type PvParam = ProvenanceValue<number> | undefined;
type AnySource = XBRLSource | DocumentSource | DerivedSource;

/** provenanceHelpers is read by CompanyViewBase at runtime but not yet in the exported type */
type ConfigWithHelpers = CompanyViewBaseConfig & {
  provenanceHelpers: {
    sourceUrl: (p: PvParam) => string | undefined;
    sourceType: (p: PvParam) => string | undefined;
    sourceDate: (p: PvParam) => string | undefined;
    searchTerm: (p: PvParam) => string | undefined;
  };
};

function su(p: PvParam) {
  return p?.source ? getSourceUrl(p.source) : undefined;
}
function st(p: PvParam) {
  return p?.source?.type;
}
function sd(p: PvParam) {
  return p?.source ? getSourceDate(p.source) : undefined;
}
function ss(p: PvParam) {
  const src: AnySource | undefined = p?.source;
  if (src && 'searchTerm' in src) return src.searchTerm;
  return undefined;
}

interface ASSTMetrics extends CompanyViewBaseMetrics {
  leverage: number;
  restrictedCash: number;
}

interface Props {
  company: Company;
  className?: string;
}

export function ASSTCompanyView({ company, className = "" }: Props) {
  const config: ConfigWithHelpers = {
    ticker: "ASST",
    asset: "BTC",
    cik: STRV_CIK,
    provenance: STRV_PROVENANCE,
    provenanceHelpers: {
      sourceUrl: su,
      sourceType: st,
      sourceDate: sd,
      searchTerm: ss,
    },

    buildMetrics: ({ company, prices }) => {
      if (!STRV_PROVENANCE.holdings || !STRV_PROVENANCE.totalDebt || !STRV_PROVENANCE.cashReserves) return null;

      const btcPrice = prices?.crypto?.BTC?.price || 0;

      const holdings = STRV_PROVENANCE.holdings.value ?? company.holdings ?? 0;
      const sharesOutstanding = STRV_PROVENANCE.sharesOutstanding?.value ?? company.sharesForMnav ?? 0;
      const cashReserves = STRV_PROVENANCE.cashReserves.value ?? company.cashReserves ?? 0;
      const restrictedCash = company.restrictedCash ?? 0;
      const totalDebt = STRV_PROVENANCE.totalDebt.value ?? company.totalDebt ?? 0;
      const preferredEquity = STRV_PROVENANCE.preferredEquity?.value ?? company.preferredEquity ?? 0;

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
        derivedSource({ derivation: "BTC Holdings × BTC Price", formula: "holdings × btcPrice", inputs: { holdings: STRV_PROVENANCE.holdings } }),
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
                  holdings: STRV_PROVENANCE.holdings,
                  cash: STRV_PROVENANCE.cashReserves,
                  debt: STRV_PROVENANCE.totalDebt,
                  ...(STRV_PROVENANCE.preferredEquity ? { preferred: STRV_PROVENANCE.preferredEquity } : {}),
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
            debt: STRV_PROVENANCE.totalDebt,
            cash: STRV_PROVENANCE.cashReserves,
            holdings: STRV_PROVENANCE.holdings,
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
            holdings: STRV_PROVENANCE.holdings,
            cash: STRV_PROVENANCE.cashReserves,
            debt: STRV_PROVENANCE.totalDebt,
            ...(STRV_PROVENANCE.preferredEquity ? { preferred: STRV_PROVENANCE.preferredEquity } : {}),
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
            holdings: STRV_PROVENANCE.holdings,
            shares: STRV_PROVENANCE.sharesOutstanding!,
            cash: STRV_PROVENANCE.cashReserves,
            debt: STRV_PROVENANCE.totalDebt,
            ...(STRV_PROVENANCE.preferredEquity ? { preferred: STRV_PROVENANCE.preferredEquity } : {}),
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
