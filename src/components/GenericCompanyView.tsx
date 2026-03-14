"use client";

import type { Company } from "@/lib/types";
import type { ProvenanceValue } from "@/lib/data/types/provenance";
import { pv, derivedSource } from "@/lib/data/types/provenance";
import { formatLargeNumber } from "@/lib/calculations";
import { calculateTotalCryptoNAV } from "@/lib/math/mnav-engine";
import { buildCompanyProvenance } from "@/lib/utils/company-provenance";

import { CompanyViewBase, type CompanyViewBaseConfig, type CompanyViewBaseMetrics } from "./CompanyViewBase";

interface Props {
  company: Company;
  className?: string;
}

/**
 * Generic company view for companies without hand-crafted custom views.
 * Synthesizes ProvenanceData from Company citation fields and wraps CompanyViewBase.
 */
export function GenericCompanyView({ company, className = "" }: Props) {
  const cp = buildCompanyProvenance(company);

  const config: CompanyViewBaseConfig = {
    ticker: company.ticker,
    asset: company.asset === "MULTI" ? "BTC" : company.asset,
    cik: company.secCik,

    provenance: cp,

    scheduledEventsProps: ({ ticker, stockPrice }) => ({ ticker, stockPrice }),

    buildMetrics: ({ company: co, prices, marketCap, effectiveShares }) => {
      const holdings = co.holdings ?? 0;
      const rawDebt = co.totalDebt ?? 0;
      const cashReserves = co.cashReserves ?? 0;
      const preferredEquity = co.preferredEquity ?? 0;
      const restrictedCash = co.restrictedCash ?? 0;
      const sharesOutstanding = co.sharesForMnav ?? 0;

      if (!holdings || !sharesOutstanding) return null;

      // Adjust debt for ITM convertibles (shares already in diluted count via effectiveShares)
      const itmDebtValue = effectiveShares?.inTheMoneyDebtValue || 0;
      const totalDebt = Math.max(0, rawDebt - itmDebtValue);

      // Use mnav-engine's calculateTotalCryptoNAV for multi-asset + LST + investment support
      const { totalUsd: cryptoNav, primaryAssetAmount, primaryAssetPrice, secondaryCryptoValue } =
        calculateTotalCryptoNAV(co, prices ?? null);

      const freeCash = cashReserves - restrictedCash;
      const netDebt = Math.max(0, totalDebt - cashReserves);
      const ev = marketCap + totalDebt + preferredEquity - freeCash;
      const baseCryptoNav = primaryAssetAmount * primaryAssetPrice + secondaryCryptoValue;
      const totalNav = baseCryptoNav + restrictedCash;
      const mNav = totalNav > 0 && marketCap > 0 ? ev / totalNav : null;
      const leverage = cryptoNav > 0 ? netDebt / cryptoNav : 0;
      const equityNav = cryptoNav + cashReserves - totalDebt - preferredEquity;
      const equityNavPerShare = sharesOutstanding > 0 ? equityNav / sharesOutstanding : 0;
      const holdingsPerShare = sharesOutstanding > 0 ? holdings / sharesOutstanding : 0;

      const cryptoNavPv: ProvenanceValue<number> = pv(
        cryptoNav,
        derivedSource({
          derivation: `${co.asset} Holdings × ${co.asset} Price` + (secondaryCryptoValue > 0 ? " + secondary crypto" : ""),
          formula: "holdings × price",
          inputs: { holdings: cp.holdings },
        }),
        `Live ${co.asset} price`
      );

      const mNavPv =
        mNav !== null
          ? pv(
              mNav,
              derivedSource({
                derivation: "Enterprise Value / Crypto NAV",
                formula: "(marketCap + debt + preferred - freeCash) / cryptoNav",
                inputs: { holdings: cp.holdings, debt: cp.totalDebt, cash: cp.cashReserves },
              }),
              itmDebtValue > 0 ? `EV: ${formatLargeNumber(ev)} (debt adj -${formatLargeNumber(itmDebtValue)} ITM)` : `EV: ${formatLargeNumber(ev)}`
            )
          : null;

      const leveragePv = pv(
        leverage,
        derivedSource({
          derivation: "Net Debt / Crypto NAV",
          formula: "max(0, debt - cash) / cryptoNav",
          inputs: { debt: cp.totalDebt, cash: cp.cashReserves, holdings: cp.holdings },
        }),
        `Net Debt: ${formatLargeNumber(netDebt)}`
      );

      const equityNavPv = pv(
        equityNav,
        derivedSource({
          derivation: "Crypto NAV + Cash - Debt - Preferred",
          formula: "cryptoNav + cash - debt - preferred",
          inputs: { holdings: cp.holdings, cash: cp.cashReserves, debt: cp.totalDebt },
        })
      );

      const equityNavPerSharePv = pv(
        equityNavPerShare,
        derivedSource({
          derivation: "Equity NAV / Shares Outstanding",
          formula: "equityNav / shares",
          inputs: { holdings: cp.holdings, shares: cp.sharesOutstanding, debt: cp.totalDebt, cash: cp.cashReserves },
        }),
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
      } satisfies CompanyViewBaseMetrics;
    },

    stalenessDates: ({ company: co }) => [
      co.holdingsLastUpdated,
      co.debtAsOf,
      co.cashAsOf,
      co.sharesAsOf,
    ],
  };

  return <CompanyViewBase company={company} className={className} config={config} />;
}
