"use client";

import { DFDV_PROVENANCE, DFDV_CIK } from "@/lib/data/provenance/dfdv";
import { pv, derivedSource, getSourceUrl, getSourceDate } from "@/lib/data/types/provenance";
import type { Company } from "@/lib/types";
import type { ProvenanceValue, XBRLSource, DocumentSource, DerivedSource } from "@/lib/data/types/provenance";
import { formatLargeNumber } from "@/lib/calculations";

import { CompanyViewBase, type CompanyViewBaseConfig, type CompanyViewBaseMetrics } from "./CompanyViewBase";

type PvParam = ProvenanceValue<number> | undefined;
type AnySource = XBRLSource | DocumentSource | DerivedSource;

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

interface DFDVMetrics extends CompanyViewBaseMetrics {
  leverage: number;
  adjustedDebt: number;
  itmDebtAdjustment: number;
}

interface Props {
  company: Company;
  className?: string;
}

export function DFDVCompanyView({ company, className = "" }: Props) {
  const config: CompanyViewBaseConfig = {
    ticker: "DFDV",
    asset: "SOL",
    cik: DFDV_CIK,
    provenance: DFDV_PROVENANCE,
    provenanceHelpers: {
      sourceUrl: su,
      sourceType: st,
      sourceDate: sd,
      searchTerm: ss,
    },

    buildMetrics: ({ company, prices, marketCap, effectiveShares }) => {
      if (!DFDV_PROVENANCE.holdings || !DFDV_PROVENANCE.totalDebt || !DFDV_PROVENANCE.cashReserves) return null;

      const solPrice = prices?.crypto?.SOL?.price || 0;

      const holdings = DFDV_PROVENANCE.holdings.value;
      const totalDebt = DFDV_PROVENANCE.totalDebt.value;
      const cashReserves = DFDV_PROVENANCE.cashReserves.value;
      const preferredEquity = DFDV_PROVENANCE.preferredEquity?.value ?? 0;
      const sharesOutstanding = DFDV_PROVENANCE.sharesOutstanding?.value ?? company.sharesForMnav ?? 0;

      const inTheMoneyDebtValue = effectiveShares?.inTheMoneyDebtValue || 0;
      const adjustedDebt = Math.max(0, totalDebt - inTheMoneyDebtValue);

      const cryptoNav = holdings * solPrice;
      const netDebt = Math.max(0, adjustedDebt - cashReserves);
      const ev = marketCap + adjustedDebt + preferredEquity - cashReserves;
      const mNav = cryptoNav > 0 && marketCap > 0 ? ev / cryptoNav : null;
      const leverage = cryptoNav > 0 ? netDebt / cryptoNav : 0;
      const equityNav = cryptoNav + cashReserves - adjustedDebt - preferredEquity;
      const equityNavPerShare = sharesOutstanding > 0 ? equityNav / sharesOutstanding : 0;
      const holdingsPerShare = sharesOutstanding > 0 ? holdings / sharesOutstanding : 0;

      const cryptoNavPv: ProvenanceValue<number> = pv(
        cryptoNav,
        derivedSource({ derivation: "SOL Holdings × SOL Price", formula: "holdings × solPrice", inputs: { holdings: DFDV_PROVENANCE.holdings } }),
        `Using live SOL price: $${solPrice.toLocaleString()}`
      );

      const mNavPv =
        mNav !== null
          ? pv(
              mNav,
              derivedSource({ derivation: "Enterprise Value ÷ Crypto NAV", formula: "(marketCap + adjustedDebt + preferred - cash) / cryptoNav", inputs: { debt: DFDV_PROVENANCE.totalDebt, cash: DFDV_PROVENANCE.cashReserves, holdings: DFDV_PROVENANCE.holdings } }),
              `AdjDebt: ${formatLargeNumber(adjustedDebt)}`
            )
          : null;

      const leveragePv: ProvenanceValue<number> = pv(
        leverage,
        derivedSource({ derivation: "Net Debt ÷ Crypto NAV", formula: "(adjustedDebt - cash) / cryptoNav", inputs: { debt: DFDV_PROVENANCE.totalDebt, cash: DFDV_PROVENANCE.cashReserves, holdings: DFDV_PROVENANCE.holdings } }),
        `NetDebt: ${formatLargeNumber(netDebt)}`
      );

      const equityNavPv: ProvenanceValue<number> = pv(
        equityNav,
        derivedSource({ derivation: "Crypto NAV + Cash − Adjusted Debt − Preferred", formula: "cryptoNav + cash - adjustedDebt - preferred", inputs: { holdings: DFDV_PROVENANCE.holdings, cash: DFDV_PROVENANCE.cashReserves, debt: DFDV_PROVENANCE.totalDebt } }),
        `AdjDebt: ${formatLargeNumber(adjustedDebt)}`
      );

      const equityNavPerSharePv: ProvenanceValue<number> = pv(
        equityNavPerShare,
        derivedSource({ derivation: "Equity NAV ÷ Shares Outstanding", formula: "equityNav / shares", inputs: { holdings: DFDV_PROVENANCE.holdings, shares: DFDV_PROVENANCE.sharesOutstanding!, debt: DFDV_PROVENANCE.totalDebt, cash: DFDV_PROVENANCE.cashReserves } }),
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
      } satisfies DFDVMetrics;
    },

    scheduledEventsProps: ({ ticker, stockPrice }) => ({ ticker, stockPrice }),
  };

  return <CompanyViewBase company={company} className={className} config={config} />;
}
