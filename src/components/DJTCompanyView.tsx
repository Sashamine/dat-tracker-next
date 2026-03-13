"use client";

import { DJT_CAPITAL_RAISE, DJT_BALANCE_SHEET } from "@/lib/data/provenance/djt";
import { buildCompanyProvenance, standardProvenanceHelpers } from "@/lib/utils/company-provenance";
import { pv, derivedSource } from "@/lib/data/types/provenance";
import type { Company } from "@/lib/types";
import type { ProvenanceValue } from "@/lib/data/types/provenance";

import { CompanyViewBase, type CompanyViewBaseConfig, type CompanyViewBaseMetrics } from "./CompanyViewBase";

interface DJTMetrics extends CompanyViewBaseMetrics {
  leverage: number;
  adjustedDebt: number;
  itmDebtAdjustment: number;
}

interface Props { company: Company; className?: string; }

export function DJTCompanyView({ company, className = "" }: Props) {
  const cp = buildCompanyProvenance(company);

  const config: CompanyViewBaseConfig = {
    ticker: "DJT",
    asset: "BTC",
    cik: company.secCik,
    provenance: cp,
    provenanceHelpers: standardProvenanceHelpers,
    buildMetrics: ({ company, prices, marketCap, effectiveShares }) => {
      if (!company.holdings) return null;
      const btcP = prices?.crypto.BTC?.price || 0;

      const h = company.holdings ?? 0;
      const d = company.totalDebt ?? 0;
      const c = company.cashReserves ?? 0;
      const pf = company.preferredEquity ?? 0;
      const sh = company.sharesForMnav ?? 0;

      const itm = effectiveShares?.inTheMoneyDebtValue || 0;
      const adjustedDebt = Math.max(0, d - itm);

      const cryptoNav = h * btcP;
      const netDebt = Math.max(0, adjustedDebt - c);
      const ev = marketCap + adjustedDebt + pf - c;
      const mNav = cryptoNav > 0 && marketCap > 0 ? ev / cryptoNav : null;
      const leverage = cryptoNav > 0 ? netDebt / cryptoNav : 0;
      const equityNav = cryptoNav + c - adjustedDebt - pf;
      const equityNavPerShare = sh > 0 ? equityNav / sh : 0;
      const holdingsPerShare = sh > 0 ? h / sh : 0;

      const cryptoNavPv: ProvenanceValue<number> = pv(
        cryptoNav,
        derivedSource({ derivation: "BTC*Price", formula: "holdings * btcPrice", inputs: { holdings: cp.holdings } }),
        `Live BTC: $${btcP.toLocaleString()}`
      );

      const mNavPv = mNav !== null
        ? pv(
            mNav,
            derivedSource({
              derivation: "EV/CryptoNAV",
              formula: "(marketCap + adjustedDebt + preferred - cash) / cryptoNav",
              inputs: { debt: cp.totalDebt, cash: cp.cashReserves, holdings: cp.holdings },
            }),
            `AdjDebt: ${adjustedDebt}`
          )
        : null;

      const leveragePv = pv(
        leverage,
        derivedSource({
          derivation: "NetDebt/CryptoNAV",
          formula: "(adjustedDebt - cash) / cryptoNav",
          inputs: { debt: cp.totalDebt, cash: cp.cashReserves, holdings: cp.holdings },
        }),
        `NetDebt: ${netDebt}`
      );

      const equityNavPv = pv(
        equityNav,
        derivedSource({
          derivation: "CryptoNAV + Cash - Debt - Preferred",
          formula: "cryptoNav + cash - adjustedDebt - preferred",
          inputs: { holdings: cp.holdings, cash: cp.cashReserves, debt: cp.totalDebt },
        }),
        `AdjDebt: ${adjustedDebt}`
      );

      const equityNavPerSharePv = pv(
        equityNavPerShare,
        derivedSource({
          derivation: "EquityNAV/Shares",
          formula: "equityNav / shares",
          inputs: { holdings: cp.holdings, shares: cp.sharesOutstanding, debt: cp.totalDebt, cash: cp.cashReserves },
        }),
        `Adj debt for ITM`
      );

      return {
        holdings: h,
        cryptoNav,
        netDebt,
        totalDebt: d,
        cashReserves: c,
        preferredEquity: pf,
        sharesOutstanding: sh,
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
        itmDebtAdjustment: itm,
      } satisfies DJTMetrics;
    },

    renderBalanceSheetExtras: () => (
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Additional Notes</h3>
        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
          <div>
            Cash: ${(DJT_BALANCE_SHEET.cashTotalInclRestricted / 1e6).toFixed(0)}M total incl restricted.
          </div>
          <div>
            Capital raise: ${(DJT_CAPITAL_RAISE.equityComponent / 1e9).toFixed(1)}B equity + ${(DJT_CAPITAL_RAISE.debtComponent / 1e9).toFixed(1)}B converts.
          </div>
        </div>
      </div>
    ),
  };

  return <CompanyViewBase company={company} className={className} config={config} />;
}
