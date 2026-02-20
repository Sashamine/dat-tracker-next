// @ts-nocheck
"use client";

import { NAKA_PROVENANCE, NAKA_CIK } from "@/lib/data/provenance/naka";
import { pv, derivedSource, getSourceUrl, getSourceDate } from "@/lib/data/types/provenance";
import type { Company } from "@/lib/types";
import type { ProvenanceValue } from "@/lib/data/types/provenance";
import { formatLargeNumber } from "@/lib/calculations";

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

export function NAKACompanyView({ company, className = "" }: Props) {
  const config: CompanyViewBaseConfig = {
    ticker: "NAKA",
    asset: "BTC",
    cik: NAKA_CIK,
    provenance: NAKA_PROVENANCE,
    provenanceHelpers: {
      sourceUrl: su,
      sourceType: st,
      sourceDate: sd,
      searchTerm: ss,
    },

    buildMetrics: ({ company, prices, marketCap, effectiveShares }) => {
      if (!NAKA_PROVENANCE.holdings || !NAKA_PROVENANCE.totalDebt || !NAKA_PROVENANCE.cashReserves) return null;

      const btcPrice = prices?.crypto?.BTC?.price || 0;

      const holdings = NAKA_PROVENANCE.holdings.value;
      const totalDebt = NAKA_PROVENANCE.totalDebt.value;
      const cashReserves = NAKA_PROVENANCE.cashReserves.value;
      const preferredEquity = NAKA_PROVENANCE.preferredEquity?.value || 0;
      const sharesOutstanding = NAKA_PROVENANCE.sharesOutstanding?.value || company.sharesForMnav || 0;

      const inTheMoneyDebtValue = effectiveShares?.inTheMoneyDebtValue || 0;
      const adjustedDebt = Math.max(0, totalDebt - inTheMoneyDebtValue);

      const cryptoNav = holdings * btcPrice;
      const netDebt = Math.max(0, adjustedDebt - cashReserves);
      const ev = marketCap + adjustedDebt + preferredEquity - cashReserves;
      const mNav = cryptoNav > 0 && marketCap > 0 ? ev / cryptoNav : null;
      const leverage = cryptoNav > 0 ? netDebt / cryptoNav : 0;
      const equityNav = cryptoNav + cashReserves - adjustedDebt - preferredEquity;
      const equityNavPerShare = sharesOutstanding > 0 ? equityNav / sharesOutstanding : 0;
      const holdingsPerShare = sharesOutstanding > 0 ? holdings / sharesOutstanding : 0;

      const cryptoNavPv: ProvenanceValue<number> = pv(
        cryptoNav,
        derivedSource({ derivation: "BTC Holdings × BTC Price", formula: "holdings × btcPrice", inputs: { holdings: NAKA_PROVENANCE.holdings } }),
        `Using live BTC price: $${btcPrice.toLocaleString()}`
      );

      const mNavPv =
        mNav !== null
          ? pv(
              mNav,
              derivedSource({
                derivation: "Enterprise Value ÷ Crypto NAV",
                formula: "(marketCap + adjustedDebt + preferred - cash) / cryptoNav",
                inputs: { debt: NAKA_PROVENANCE.totalDebt, cash: NAKA_PROVENANCE.cashReserves, holdings: NAKA_PROVENANCE.holdings },
              }),
              `AdjDebt: ${formatLargeNumber(adjustedDebt)}`
            )
          : null;

      const leveragePv: ProvenanceValue<number> = pv(
        leverage,
        derivedSource({
          derivation: "Net Debt ÷ Crypto NAV",
          formula: "(adjustedDebt - cash) / cryptoNav",
          inputs: { debt: NAKA_PROVENANCE.totalDebt, cash: NAKA_PROVENANCE.cashReserves, holdings: NAKA_PROVENANCE.holdings },
        }),
        `NetDebt: ${formatLargeNumber(netDebt)}`
      );

      const equityNavPv: ProvenanceValue<number> = pv(
        equityNav,
        derivedSource({
          derivation: "Crypto NAV + Cash − Adjusted Debt − Preferred",
          formula: "cryptoNav + cash - adjustedDebt - preferred",
          inputs: { holdings: NAKA_PROVENANCE.holdings, cash: NAKA_PROVENANCE.cashReserves, debt: NAKA_PROVENANCE.totalDebt },
        }),
        `AdjDebt: ${formatLargeNumber(adjustedDebt)}`
      );

      const equityNavPerSharePv: ProvenanceValue<number> = pv(
        equityNavPerShare,
        derivedSource({
          derivation: "Equity NAV ÷ Shares Outstanding",
          formula: "equityNav / shares",
          inputs: { holdings: NAKA_PROVENANCE.holdings, shares: NAKA_PROVENANCE.sharesOutstanding!, debt: NAKA_PROVENANCE.totalDebt, cash: NAKA_PROVENANCE.cashReserves },
        }),
        `Adj debt for ITM`
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
        adjustedDebt,
        itmDebtAdjustment: inTheMoneyDebtValue,
      } as any;
    },

    scheduledEventsProps: ({ ticker, stockPrice }) => ({ ticker, stockPrice }),
  } as any;

  return <CompanyViewBase company={company} className={className} config={config} />;
}
