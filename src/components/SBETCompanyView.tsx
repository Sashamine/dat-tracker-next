// @ts-nocheck
"use client";

import { SBET_PROVENANCE, SBET_CIK } from "@/lib/data/provenance/sbet";
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

export function SBETCompanyView({ company, className = "" }: Props) {
  const config: CompanyViewBaseConfig = {
    ticker: "SBET",
    asset: "ETH",
    cik: SBET_CIK,
    provenance: SBET_PROVENANCE,
    provenanceHelpers: {
      sourceUrl: su,
      sourceType: st,
      sourceDate: sd,
      searchTerm: ss,
    },

    buildMetrics: ({ company, prices, marketCap }) => {
      if (!SBET_PROVENANCE.holdings || !SBET_PROVENANCE.totalDebt || !SBET_PROVENANCE.cashReserves) return null;

      const ethPrice = prices?.crypto?.ETH?.price || 0;

      const holdings = SBET_PROVENANCE.holdings.value;
      const totalDebt = SBET_PROVENANCE.totalDebt.value;
      const cashReserves = SBET_PROVENANCE.cashReserves.value;
      const preferredEquity = 0;
      const sharesOutstanding = SBET_PROVENANCE.sharesOutstanding?.value || company.sharesForMnav || 0;

      const cryptoNav = holdings * ethPrice;
      const netDebt = Math.max(0, totalDebt - cashReserves);
      const ev = marketCap + totalDebt + preferredEquity - cashReserves;
      const mNav = cryptoNav > 0 ? ev / cryptoNav : null;
      const leverage = cryptoNav > 0 ? netDebt / cryptoNav : 0;
      const equityNav = cryptoNav + cashReserves - totalDebt - preferredEquity;
      const equityNavPerShare = sharesOutstanding > 0 ? equityNav / sharesOutstanding : 0;
      const holdingsPerShare = sharesOutstanding > 0 ? holdings / sharesOutstanding : 0;

      const cryptoNavPv: ProvenanceValue<number> = pv(
        cryptoNav,
        derivedSource({
          derivation: "ETH Holdings × ETH Price",
          formula: "holdings × ethPrice",
          inputs: { holdings: SBET_PROVENANCE.holdings },
        }),
        `Using live ETH price: $${ethPrice.toLocaleString()}`
      );

      const mNavPv =
        mNav !== null
          ? pv(
              mNav,
              derivedSource({
                derivation: "Enterprise Value ÷ Crypto NAV",
                formula: "(marketCap + debt - cash) / cryptoNav",
                inputs: {
                  debt: SBET_PROVENANCE.totalDebt,
                  cash: SBET_PROVENANCE.cashReserves,
                  holdings: SBET_PROVENANCE.holdings,
                },
              }),
              `Debt-free` 
            )
          : null;

      const leveragePv = pv(
        leverage,
        derivedSource({
          derivation: "Net Debt ÷ Crypto NAV",
          formula: "(debt - cash) / cryptoNav",
          inputs: {
            debt: SBET_PROVENANCE.totalDebt,
            cash: SBET_PROVENANCE.cashReserves,
            holdings: SBET_PROVENANCE.holdings,
          },
        }),
        `SBET is debt-free`
      );

      const equityNavPv = pv(
        equityNav,
        derivedSource({
          derivation: "Crypto NAV + Cash − Debt",
          formula: "(holdings × ethPrice) + cash - debt",
          inputs: {
            holdings: SBET_PROVENANCE.holdings,
            cash: SBET_PROVENANCE.cashReserves,
            debt: SBET_PROVENANCE.totalDebt,
          },
        }),
        `No preferred equity`
      );

      const equityNavPerSharePv = pv(
        equityNavPerShare,
        derivedSource({
          derivation: "Equity NAV ÷ Shares Outstanding",
          formula: "equityNav / shares",
          inputs: {
            holdings: SBET_PROVENANCE.holdings,
            shares: SBET_PROVENANCE.sharesOutstanding!,
            debt: SBET_PROVENANCE.totalDebt,
            cash: SBET_PROVENANCE.cashReserves,
          },
        }),
        `Using ${(sharesOutstanding / 1_000_000).toFixed(0)}M shares`
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
      } as any;
    },

    renderBalanceSheetExtras: () => (
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SBET_PROVENANCE.holdingsNative && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Native ETH</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{SBET_PROVENANCE.holdingsNative.value.toLocaleString()}</p>
            </div>
          )}
          {SBET_PROVENANCE.holdingsLsETH && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">LsETH (Lido)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{SBET_PROVENANCE.holdingsLsETH.value.toLocaleString()}</p>
            </div>
          )}
          {SBET_PROVENANCE.stakingRewards && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Staking Rewards</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{SBET_PROVENANCE.stakingRewards.value.toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>
    ),
  } as any;

  return <CompanyViewBase company={company} className={className} config={config} />;
}
