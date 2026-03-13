"use client";

import { XXI_CIK } from "@/lib/data/provenance/xxi";
import { pv, derivedSource } from "@/lib/data/types/provenance";
import type { Company } from "@/lib/types";
import type { ProvenanceValue } from "@/lib/data/types/provenance";
import { buildCompanyProvenance, standardProvenanceHelpers } from "@/lib/utils/company-provenance";

import { CompanyViewBase, type CompanyViewBaseConfig, type CompanyViewBaseMetrics } from "./CompanyViewBase";

interface XXIMetrics extends CompanyViewBaseMetrics {
  leverage: number;
  adjustedDebt: number;
  itmDebtAdjustment: number;
}

interface Props {
  company: Company;
  className?: string;
}

export function XXICompanyView({ company, className = "" }: Props) {
  const cp = buildCompanyProvenance(company);

  const config: CompanyViewBaseConfig = {
    ticker: "XXI",
    asset: "BTC",
    cik: XXI_CIK,
    provenance: cp,
    provenanceHelpers: standardProvenanceHelpers,

    // XXI: dual-class share structure. Class B has zero economic rights.
    // Keep the economic share count override used by market cap + dilution.
    getEffectiveSharesBasic: (c) => c.sharesForMnav ?? 0,
    marketCapOverride: ({ company, prices, marketCap }) => {
      const stock = prices?.stocks?.XXI;
      const stockPrice = stock?.price || 0;
      if (!stockPrice) return marketCap;
      const economicShares = company.sharesForMnav ?? 0;
      return economicShares * stockPrice;
    },

    buildMetrics: ({ company, prices, marketCap, effectiveShares }) => {
      if (!company.holdings) return null;

      const btcPrice = prices?.crypto?.BTC?.price || 0;

      const holdings = company.holdings ?? 0;
      const totalDebt = company.totalDebt ?? 0;
      const cashReserves = company.cashReserves ?? 0;
      const preferredEquity = company.preferredEquity ?? 0;
      const sharesOutstanding = company.sharesForMnav ?? 0;

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
        derivedSource({
          derivation: "BTC Holdings × BTC Price",
          formula: "holdings × btcPrice",
          inputs: { holdings: cp.holdings },
        }),
        `Using live BTC price: $${btcPrice.toLocaleString()}`
      );

      const mNavPv =
        mNav !== null
          ? pv(
              mNav,
              derivedSource({
                derivation: "Enterprise Value ÷ Crypto NAV (adjusted for ITM converts)",
                formula: "(marketCap + adjustedDebt + preferred - cash) / cryptoNav",
                inputs: {
                  debt: cp.totalDebt,
                  cash: cp.cashReserves,
                  holdings: cp.holdings,
                },
              }),
              `Adjusted Debt: ${adjustedDebt} (raw ${totalDebt} - ITM converts ${inTheMoneyDebtValue})`
            )
          : null;

      const leveragePv = pv(
        leverage,
        derivedSource({
          derivation: "Net Debt ÷ Crypto NAV (adjusted for ITM converts)",
          formula: "(adjustedDebt - cash) / cryptoNav",
          inputs: {
            debt: cp.totalDebt,
            cash: cp.cashReserves,
            holdings: cp.holdings,
          },
        }),
        `Net Debt: ${netDebt}`
      );

      const equityNavPv = pv(
        equityNav,
        derivedSource({
          derivation: "Crypto NAV + Cash − Adjusted Debt − Preferred",
          formula: "(holdings × btcPrice) + cash - adjustedDebt - preferred",
          inputs: {
            holdings: cp.holdings,
            cash: cp.cashReserves,
            debt: cp.totalDebt,
          },
        }),
        `Debt adjusted for ITM converts: ${adjustedDebt}`
      );

      const equityNavPerSharePv = pv(
        equityNavPerShare,
        derivedSource({
          derivation: "Equity NAV ÷ Shares Outstanding",
          formula: "equityNav / shares",
          inputs: {
            holdings: cp.holdings,
            shares: cp.sharesOutstanding,
            debt: cp.totalDebt,
            cash: cp.cashReserves,
          },
        }),
        `Uses adjusted debt (ITM converts treated as equity)`
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
      } satisfies XXIMetrics;
    },

    scheduledEventsProps: ({ ticker, stockPrice }) => ({ ticker, stockPrice }),

    renderBalanceSheetExtras: () => (
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
          <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-1">Dual-Class Share Methodology</p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 leading-relaxed">
            XXI&apos;s mNAV uses <strong>Class A shares only</strong> for market cap. Class B shares carry voting rights but have{' '}
            <strong>zero economic rights</strong> per the amended certificate of formation.
          </p>
        </div>
      </div>
    ),
  };

  return <CompanyViewBase company={company} className={className} config={config} />;
}
