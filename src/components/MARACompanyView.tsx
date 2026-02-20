// @ts-nocheck
"use client";

import { MARA_PROVENANCE, MARA_CIK } from "@/lib/data/provenance/mara";
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

export function MARACompanyView({ company, className = "" }: Props) {
  const config: CompanyViewBaseConfig = {
    ticker: "MARA",
    asset: "BTC",
    cik: MARA_CIK,
    provenance: MARA_PROVENANCE,
    provenanceHelpers: {
      sourceUrl: su,
      sourceType: st,
      sourceDate: sd,
      searchTerm: ss,
    },

    buildMetrics: ({ company, prices, marketCap, effectiveShares }) => {
      if (!MARA_PROVENANCE.holdings || !MARA_PROVENANCE.totalDebt || !MARA_PROVENANCE.cashReserves) return null;

      const btcPrice = prices?.crypto?.BTC?.price || 0;

      const holdings = MARA_PROVENANCE.holdings.value;
      const totalDebt = MARA_PROVENANCE.totalDebt.value;
      const cashReserves = MARA_PROVENANCE.cashReserves.value;
      const preferredEquity = MARA_PROVENANCE.preferredEquity?.value || 0;
      const sharesOutstanding = MARA_PROVENANCE.sharesOutstanding?.value || company.sharesForMnav || 0;

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
          inputs: { holdings: MARA_PROVENANCE.holdings },
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
                  debt: MARA_PROVENANCE.totalDebt,
                  cash: MARA_PROVENANCE.cashReserves,
                  holdings: MARA_PROVENANCE.holdings,
                },
              }),
              `Adjusted Debt: ${formatLargeNumber(adjustedDebt)} (raw ${formatLargeNumber(totalDebt)} - ITM converts ${formatLargeNumber(inTheMoneyDebtValue)})`
            )
          : null;

      const leveragePv = pv(
        leverage,
        derivedSource({
          derivation: "Net Debt ÷ Crypto NAV (adjusted for ITM converts)",
          formula: "(adjustedDebt - cash) / cryptoNav",
          inputs: {
            debt: MARA_PROVENANCE.totalDebt,
            cash: MARA_PROVENANCE.cashReserves,
            holdings: MARA_PROVENANCE.holdings,
          },
        }),
        `Net Debt: ${formatLargeNumber(netDebt)} (${formatLargeNumber(adjustedDebt)} debt - ${formatLargeNumber(cashReserves)} cash)`
      );

      const equityNavPv = pv(
        equityNav,
        derivedSource({
          derivation: "Crypto NAV + Cash − Adjusted Debt − Preferred",
          formula: "(holdings × btcPrice) + cash - adjustedDebt - preferred",
          inputs: {
            holdings: MARA_PROVENANCE.holdings,
            cash: MARA_PROVENANCE.cashReserves,
            debt: MARA_PROVENANCE.totalDebt,
          },
        }),
        `Debt adjusted for ITM converts: ${formatLargeNumber(adjustedDebt)}`
      );

      const equityNavPerSharePv = pv(
        equityNavPerShare,
        derivedSource({
          derivation: "Equity NAV ÷ Shares Outstanding",
          formula: "equityNav / shares",
          inputs: {
            holdings: MARA_PROVENANCE.holdings,
            shares: MARA_PROVENANCE.sharesOutstanding!,
            debt: MARA_PROVENANCE.totalDebt,
            cash: MARA_PROVENANCE.cashReserves,
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {MARA_PROVENANCE.quarterlyBurn && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Quarterly Burn</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatLargeNumber(MARA_PROVENANCE.quarterlyBurn.value)}
              </p>
              <p className="text-xs text-gray-400">G&A expenses</p>
            </div>
          )}
          {MARA_PROVENANCE.totalCostBasis && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Cost Basis</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatLargeNumber(MARA_PROVENANCE.totalCostBasis.value)}
              </p>
              <p className="text-xs text-gray-400">All BTC acquired</p>
            </div>
          )}
        </div>
      </div>
    ),
  } as any;

  return <CompanyViewBase company={company} className={className} config={config} />;
}
