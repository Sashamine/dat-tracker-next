// @ts-nocheck
"use client";

import {
  BTBT_PROVENANCE,
  BTBT_CIK,
  BTBT_STAKING,
  BTBT_BALANCE_SHEET,
  BTBT_INCOME_STATEMENT,
} from "@/lib/data/provenance/btbt";
import { pv, derivedSource, getSourceUrl, getSourceDate } from "@/lib/data/types/provenance";
import { getMarketCapForMnavSync } from "@/lib/utils/market-cap";
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

export function BTBTCompanyView({ company, className = "" }: Props) {
  const config: CompanyViewBaseConfig = {
    ticker: "BTBT",
    asset: "ETH",
    cik: BTBT_CIK,
    provenance: BTBT_PROVENANCE,
    provenanceHelpers: {
      sourceUrl: su,
      sourceType: st,
      sourceDate: sd,
      searchTerm: ss,
    },

    buildMetrics: ({ company, prices, marketCap }) => {
      if (!BTBT_PROVENANCE.holdings || !BTBT_PROVENANCE.totalDebt || !BTBT_PROVENANCE.cashReserves) return null;

      const ethPrice = prices?.crypto?.ETH?.price || 0;
      const stockData = prices?.stocks?.BTBT;

      // Match overview page logic: use getMarketCapForMnavSync for ITM debt + warrant proceeds
      const { inTheMoneyDebtValue, inTheMoneyWarrantProceeds } = getMarketCapForMnavSync(company, stockData, prices?.forex);

      const holdings = BTBT_PROVENANCE.holdings.value;
      const rawDebt = BTBT_PROVENANCE.totalDebt.value;
      const cashReserves = BTBT_PROVENANCE.cashReserves.value;
      const preferredEquity = BTBT_PROVENANCE.preferredEquity?.value || 0;
      const sharesOutstanding = BTBT_PROVENANCE.sharesOutstanding?.value || company.sharesForMnav || 0;

      const adjustedDebt = Math.max(0, rawDebt - (inTheMoneyDebtValue || 0));

      // Add ITM warrant proceeds to cash (as in calculator)
      const adjustedCash = cashReserves + (inTheMoneyWarrantProceeds || 0);
      const adjustedRestrictedCash = (company.restrictedCash || 0) + (inTheMoneyWarrantProceeds || 0);
      const freeCash = adjustedCash - adjustedRestrictedCash;

      const baseCryptoNav = holdings * ethPrice;
      const otherInvestments = company.otherInvestments || 0;
      const otherInvestmentsMaterial = baseCryptoNav > 0 && otherInvestments / baseCryptoNav > 0.05;

      const cryptoNav = baseCryptoNav + adjustedRestrictedCash + (otherInvestmentsMaterial ? otherInvestments : 0);

      const netDebt = Math.max(0, rawDebt - cashReserves);
      const ev = marketCap + adjustedDebt + preferredEquity - freeCash;
      const mNav = cryptoNav > 0 ? ev / cryptoNav : null;
      const leverage = cryptoNav > 0 ? netDebt / cryptoNav : 0;

      const equityNav = cryptoNav + cashReserves - adjustedDebt - preferredEquity;
      const equityNavPerShare = sharesOutstanding > 0 ? equityNav / sharesOutstanding : 0;
      const holdingsPerShare = sharesOutstanding > 0 ? holdings / sharesOutstanding : 0;

      const cryptoNavPv: ProvenanceValue<number> = pv(
        cryptoNav,
        derivedSource({ derivation: "ETH Holdings × ETH Price", formula: "holdings × ethPrice", inputs: { holdings: BTBT_PROVENANCE.holdings } }),
        `Using live ETH price: $${ethPrice.toLocaleString()}`
      );

      const mNavPv =
        mNav !== null
          ? pv(
              mNav,
              derivedSource({
                derivation: "EV ÷ Crypto NAV (warrants/cash adjustments)",
                formula: "(marketCap + adjustedDebt + preferred - freeCash) / cryptoNav",
                inputs: { debt: BTBT_PROVENANCE.totalDebt, cash: BTBT_PROVENANCE.cashReserves, holdings: BTBT_PROVENANCE.holdings },
              }),
              `Adjusted debt: ${formatLargeNumber(adjustedDebt)}`
            )
          : null;

      const leveragePv = pv(
        leverage,
        derivedSource({
          derivation: "Net Debt ÷ Crypto NAV",
          formula: "netDebt / cryptoNav",
          inputs: { debt: BTBT_PROVENANCE.totalDebt, cash: BTBT_PROVENANCE.cashReserves, holdings: BTBT_PROVENANCE.holdings },
        }),
        `NetDebt: ${formatLargeNumber(netDebt)}`
      );

      const equityNavPv = pv(
        equityNav,
        derivedSource({
          derivation: "Crypto NAV + Cash − Adjusted Debt − Preferred",
          formula: "cryptoNav + cash - adjustedDebt - preferred",
          inputs: { holdings: BTBT_PROVENANCE.holdings, cash: BTBT_PROVENANCE.cashReserves, debt: BTBT_PROVENANCE.totalDebt },
        }),
        `Other investments ${otherInvestmentsMaterial ? "included" : "excluded"}`
      );

      const equityNavPerSharePv = pv(
        equityNavPerShare,
        derivedSource({
          derivation: "Equity NAV ÷ Shares Outstanding",
          formula: "equityNav / shares",
          inputs: { holdings: BTBT_PROVENANCE.holdings, shares: BTBT_PROVENANCE.sharesOutstanding!, debt: BTBT_PROVENANCE.totalDebt, cash: BTBT_PROVENANCE.cashReserves },
        }),
        `${(sharesOutstanding / 1e6).toFixed(1)}M shares`
      );

      return {
        holdings,
        cryptoNav,
        netDebt,
        totalDebt: rawDebt,
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
        itmDebtAdjustment: inTheMoneyDebtValue || 0,
      } as any;
    },

    renderBalanceSheetExtras: ({ prices }) => {
      const ethPrice = prices?.crypto?.ETH?.price || 0;
      return (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide mb-2">◎ ETH Treasury + Staking Company</h4>
            <ul className="text-sm text-purple-600 dark:text-purple-300 space-y-1">
              <li>• Strategic Asset Company (SAC) — pivoted from BTC mining to ETH treasury mid-2025</li>
              <li>• ~89% staked via Figment + EigenLayer restaking</li>
              <li>• $150M 4% convertible notes due 2030 used to buy ETH</li>
              <li>• Majority stake in WhiteFiber (WYFI) (AI/HPC infrastructure)</li>
            </ul>
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-2">Staking</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-green-600 dark:text-green-300 font-medium">ETH Staked</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{BTBT_STAKING.stakedAmount.value.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-green-600 dark:text-green-300 font-medium">Staking APY</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">~{(BTBT_STAKING.annualizedYield.value * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-green-600 dark:text-green-300 font-medium">Q3 Staking Rev</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">${(BTBT_STAKING.stakingRevenue.value / 1e6).toFixed(1)}M</p>
              </div>
              <div>
                <p className="text-green-600 dark:text-green-300 font-medium">Staked Value</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">${((BTBT_STAKING.stakedAmount.value * ethPrice) / 1e6).toFixed(0)}M</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-2">WhiteFiber (WYFI)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-blue-600 dark:text-blue-300 font-medium">Stake Value</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">${(BTBT_BALANCE_SHEET.wyfiStake.value / 1e6).toFixed(0)}M</p>
              </div>
              <div>
                <p className="text-blue-600 dark:text-blue-300 font-medium">Cloud Rev (Q3)</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">${(BTBT_INCOME_STATEMENT.revenueBreakdown.cloudServices.value / 1e6).toFixed(0)}M</p>
              </div>
            </div>
          </div>
        </div>
      );
    },

    scheduledEventsProps: ({ ticker, stockPrice }) => ({ ticker, stockPrice }),
  } as any;

  return <CompanyViewBase company={company} className={className} config={config} />;
}
