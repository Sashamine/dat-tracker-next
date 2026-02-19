// @ts-nocheck
"use client";

import { AVX_PROVENANCE, AVX_CIK, AVX_PIPE, AVX_STAKING, AVX_CAPITAL_PROGRAMS } from "@/lib/data/provenance/avx";
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

export function AVXCompanyView({ company, className = "" }: Props) {
  const config: CompanyViewBaseConfig = {
    ticker: "AVX",
    asset: "AVAX",
    cik: AVX_CIK,
    provenance: AVX_PROVENANCE,
    provenanceHelpers: {
      sourceUrl: su,
      sourceType: st,
      sourceDate: sd,
      searchTerm: ss,
    },

    buildMetrics: ({ company, prices, marketCap, effectiveShares }) => {
      if (!AVX_PROVENANCE.holdings || !AVX_PROVENANCE.totalDebt || !AVX_PROVENANCE.cashReserves) return null;

      const avaxPrice = prices?.crypto?.AVAX?.price || 0;

      const holdings = AVX_PROVENANCE.holdings.value;
      const totalDebt = AVX_PROVENANCE.totalDebt.value;
      const cashReserves = AVX_PROVENANCE.cashReserves.value;
      const preferredEquity = AVX_PROVENANCE.preferredEquity?.value || 0;
      const sharesOutstanding = AVX_PROVENANCE.sharesOutstanding?.value || company.sharesForMnav || 0;

      const inTheMoneyDebtValue = effectiveShares?.inTheMoneyDebtValue || 0;
      const adjustedDebt = Math.max(0, totalDebt - inTheMoneyDebtValue);

      const cryptoNav = holdings * avaxPrice;
      const netDebt = Math.max(0, adjustedDebt - cashReserves);
      const ev = marketCap + adjustedDebt + preferredEquity - cashReserves;
      const mNav = cryptoNav > 0 ? ev / cryptoNav : null;
      const leverage = cryptoNav > 0 ? netDebt / cryptoNav : 0;
      const equityNav = cryptoNav + cashReserves - adjustedDebt - preferredEquity;
      const equityNavPerShare = sharesOutstanding > 0 ? equityNav / sharesOutstanding : 0;
      const holdingsPerShare = sharesOutstanding > 0 ? holdings / sharesOutstanding : 0;

      const cryptoNavPv: ProvenanceValue<number> = pv(
        cryptoNav,
        derivedSource({ derivation: "AVAX Holdings × AVAX Price", formula: "holdings × avaxPrice", inputs: { holdings: AVX_PROVENANCE.holdings } }),
        `Using live AVAX price: $${avaxPrice.toLocaleString()}`
      );

      const mNavPv =
        mNav !== null
          ? pv(
              mNav,
              derivedSource({
                derivation: "Enterprise Value ÷ Crypto NAV",
                formula: "(marketCap + adjustedDebt + preferred - cash) / cryptoNav",
                inputs: { debt: AVX_PROVENANCE.totalDebt, cash: AVX_PROVENANCE.cashReserves, holdings: AVX_PROVENANCE.holdings },
              }),
              `Adjusted Debt: ${adjustedDebt} (raw ${totalDebt} - ITM ${inTheMoneyDebtValue})`
            )
          : null;

      const leveragePv = pv(
        leverage,
        derivedSource({
          derivation: "Net Debt ÷ Crypto NAV",
          formula: "(adjustedDebt - cash) / cryptoNav",
          inputs: { debt: AVX_PROVENANCE.totalDebt, cash: AVX_PROVENANCE.cashReserves, holdings: AVX_PROVENANCE.holdings },
        }),
        `Net Debt: ${netDebt} (${adjustedDebt} debt - ${cashReserves} cash)`
      );

      const equityNavPv = pv(
        equityNav,
        derivedSource({
          derivation: "Crypto NAV + Cash − Adjusted Debt − Preferred",
          formula: "(holdings × avaxPrice) + cash - adjustedDebt - preferred",
          inputs: { holdings: AVX_PROVENANCE.holdings, cash: AVX_PROVENANCE.cashReserves, debt: AVX_PROVENANCE.totalDebt },
        }),
        `Debt adjusted for ITM instruments: ${adjustedDebt}`
      );

      const equityNavPerSharePv = pv(
        equityNavPerShare,
        derivedSource({
          derivation: "Equity NAV ÷ Shares Outstanding",
          formula: "equityNav / shares",
          inputs: { holdings: AVX_PROVENANCE.holdings, shares: AVX_PROVENANCE.sharesOutstanding!, debt: AVX_PROVENANCE.totalDebt, cash: AVX_PROVENANCE.cashReserves },
        }),
        `Uses adjusted debt (ITM instruments treated as equity)`
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
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Additional Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-700 dark:text-green-400 font-semibold">Staking</p>
            <p className="text-2xl font-bold text-green-600">&gt;90% staked</p>
            <p className="text-xs text-green-500">~8% target APY via validators</p>
            <p className="text-xs text-green-500 mt-1">Expected Q1 2026: ~{AVX_STAKING.expectedQ1_2026Rewards.toLocaleString()} AVAX</p>
            <a href={AVX_STAKING.source} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline mt-1 inline-block">Source: 8-K →</a>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-400 font-semibold">PIPE Details</p>
            <p className="text-2xl font-bold text-blue-600">${(AVX_PIPE.totalProceeds / 1e6).toFixed(0)}M</p>
            <p className="text-xs text-blue-500">Closed {AVX_PIPE.closingDate}</p>
            <a href={AVX_PIPE.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">Source: 8-K →</a>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <p className="text-sm text-purple-700 dark:text-purple-400 font-semibold">$40M Buyback</p>
            <p className="text-2xl font-bold text-purple-600">${(AVX_CAPITAL_PROGRAMS.buyback.executedValue / 1e6).toFixed(1)}M</p>
            <p className="text-xs text-purple-500">executed of ${(AVX_CAPITAL_PROGRAMS.buyback.authorized / 1e6).toFixed(0)}M authorized</p>
            <a href={AVX_CAPITAL_PROGRAMS.buyback.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 hover:underline mt-1 inline-block">Source: 8-K →</a>
          </div>

          {AVX_PROVENANCE.quarterlyBurn && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Quarterly Burn</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{(AVX_PROVENANCE.quarterlyBurn.value / 1e6).toFixed(1)}M</p>
              <p className="text-xs text-gray-400">G&A expenses (pre-PIPE)</p>
            </div>
          )}
        </div>
      </div>
    ),
  } as any;

  return <CompanyViewBase company={company} className={className} config={config} />;
}
