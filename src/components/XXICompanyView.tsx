// @ts-nocheck
"use client";

import { XXI_PROVENANCE, XXI_CIK } from "@/lib/data/provenance/xxi";
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

export function XXICompanyView({ company, className = "" }: Props) {
  const config: CompanyViewBaseConfig = {
    ticker: "XXI",
    asset: "BTC",
    cik: XXI_CIK,
    provenance: XXI_PROVENANCE,
    provenanceHelpers: {
      sourceUrl: su,
      sourceType: st,
      sourceDate: sd,
      searchTerm: ss,
    },

    // XXI: dual-class share structure. Class B has zero economic rights.
    // Keep the economic share count override used by market cap + dilution.
    getEffectiveSharesBasic: (c) => (c as any).sharesForMnav || 0,
    marketCapOverride: ({ company, prices, marketCap }) => {
      const stock = prices?.stocks?.XXI;
      const stockPrice = stock?.price || 0;
      if (!stockPrice) return marketCap;
      const economicShares = company.sharesForMnav || 0;
      return economicShares * stockPrice;
    },

    buildMetrics: ({ company, prices, marketCap, effectiveShares }) => {
      if (!XXI_PROVENANCE.holdings || !XXI_PROVENANCE.totalDebt || !XXI_PROVENANCE.cashReserves) return null;

      const btcPrice = prices?.crypto?.BTC?.price || 0;

      const holdings = XXI_PROVENANCE.holdings.value;
      const totalDebt = XXI_PROVENANCE.totalDebt.value;
      const cashReserves = XXI_PROVENANCE.cashReserves.value;
      const preferredEquity = XXI_PROVENANCE.preferredEquity?.value || 0;
      const sharesOutstanding = XXI_PROVENANCE.sharesOutstanding?.value || company.sharesForMnav || 0;

      const inTheMoneyDebtValue = effectiveShares?.inTheMoneyDebtValue || 0;
      const adjustedDebt = Math.max(0, totalDebt - inTheMoneyDebtValue);

      const cryptoNav = holdings * btcPrice;
      const netDebt = Math.max(0, adjustedDebt - cashReserves);
      const ev = marketCap + adjustedDebt + preferredEquity - cashReserves;
      const mNav = cryptoNav > 0 ? ev / cryptoNav : null;
      const leverage = cryptoNav > 0 ? netDebt / cryptoNav : 0;
      const equityNav = cryptoNav + cashReserves - adjustedDebt - preferredEquity;
      const equityNavPerShare = sharesOutstanding > 0 ? equityNav / sharesOutstanding : 0;
      const holdingsPerShare = sharesOutstanding > 0 ? holdings / sharesOutstanding : 0;

      const cryptoNavPv: ProvenanceValue<number> = pv(
        cryptoNav,
        derivedSource({
          derivation: "BTC Holdings × BTC Price",
          formula: "holdings × btcPrice",
          inputs: { holdings: XXI_PROVENANCE.holdings },
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
                  debt: XXI_PROVENANCE.totalDebt,
                  cash: XXI_PROVENANCE.cashReserves,
                  holdings: XXI_PROVENANCE.holdings,
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
            debt: XXI_PROVENANCE.totalDebt,
            cash: XXI_PROVENANCE.cashReserves,
            holdings: XXI_PROVENANCE.holdings,
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
            holdings: XXI_PROVENANCE.holdings,
            cash: XXI_PROVENANCE.cashReserves,
            debt: XXI_PROVENANCE.totalDebt,
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
            holdings: XXI_PROVENANCE.holdings,
            shares: XXI_PROVENANCE.sharesOutstanding!,
            debt: XXI_PROVENANCE.totalDebt,
            cash: XXI_PROVENANCE.cashReserves,
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
      } as any;
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
  } as any;

  return <CompanyViewBase company={company} className={className} config={config} />;
}
