// @ts-nocheck
"use client";

import { ABTC_PROVENANCE } from "@/lib/data/provenance/abtc";
import { pv, derivedSource, getSourceUrl, getSourceDate } from "@/lib/data/types/provenance";
import { getCompanyEarnings } from "@/lib/data/earnings-data";
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

export function ABTCCompanyView({ company, className = "" }: Props) {
  const config: CompanyViewBaseConfig = {
    ticker: "ABTC",
    asset: "BTC",
    provenance: ABTC_PROVENANCE,
    provenanceHelpers: {
      sourceUrl: su,
      sourceType: st,
      sourceDate: sd,
      searchTerm: ss,
    },

    buildMetrics: ({ company, prices, marketCap, effectiveShares }) => {
      if (!ABTC_PROVENANCE.holdings) return null;

      const btcPrice = prices?.crypto?.BTC?.price || 0;

      const holdings = ABTC_PROVENANCE.holdings.value;
      const totalDebt = ABTC_PROVENANCE.totalDebt?.value || 0;
      const cashReserves = ABTC_PROVENANCE.cashReserves?.value || 0;
      const preferredEquity = 0;
      const sharesOutstanding = ABTC_PROVENANCE.sharesOutstanding?.value || company.sharesForMnav || 0;

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
      const satsPerShare = holdingsPerShare * 100_000_000;

      const cryptoNavPv: ProvenanceValue<number> = pv(
        cryptoNav,
        derivedSource({ derivation: "BTC Holdings × BTC Price", formula: "holdings × btcPrice", inputs: { holdings: ABTC_PROVENANCE.holdings } }),
        `Using live BTC price: $${btcPrice.toLocaleString()}`
      );

      const mNavPv =
        mNav !== null
          ? pv(
              mNav,
              derivedSource({ derivation: "Enterprise Value ÷ Crypto NAV", formula: "(marketCap + debt - cash) / cryptoNav", inputs: { holdings: ABTC_PROVENANCE.holdings } }),
              `Market Cap: ${formatLargeNumber(marketCap)}`
            )
          : null;

      const leveragePv: ProvenanceValue<number> = pv(
        leverage,
        derivedSource({ derivation: "Net Debt ÷ Crypto NAV", formula: "(debt - cash) / cryptoNav", inputs: { holdings: ABTC_PROVENANCE.holdings } }),
        `Debt: ${formatLargeNumber(totalDebt)} (Bitmain miner purchase agreement)`
      );

      const equityNavPv: ProvenanceValue<number> = pv(
        equityNav,
        derivedSource({ derivation: "Crypto NAV + Cash − Debt", formula: "(holdings × btcPrice) + cash - debt", inputs: { holdings: ABTC_PROVENANCE.holdings } }),
        `Debt: ${formatLargeNumber(totalDebt)} (Bitmain)`
      );

      const equityNavPerSharePv: ProvenanceValue<number> = pv(
        equityNavPerShare,
        derivedSource({ derivation: "Equity NAV ÷ Shares Outstanding", formula: "equityNav / shares", inputs: { holdings: ABTC_PROVENANCE.holdings, shares: ABTC_PROVENANCE.sharesOutstanding! } }),
        "Uses 928M total shares (all classes, post-merger)."
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
        satsPerShare,
      } as any;
    },

    stalenessDates: ({ company }) => [company.holdingsLastUpdated, company.sharesAsOf, company.burnAsOf],

    renderBalanceSheetExtras: ({ metrics }) => {
      // Q3 2025 SPS baseline for growth calculation (from earnings data)
      const earnings = getCompanyEarnings("ABTC");
      const q3 = earnings.find((e) => e.calendarYear === 2025 && e.calendarQuarter === 3);
      const q3SpsBaseline = q3?.holdingsPerShare ? Math.round(q3.holdingsPerShare * 100_000_000) : 371;

      return (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-400">SPS Growth</p>
              <p className="text-2xl font-bold text-amber-600">
                +{(((metrics as any).satsPerShare - q3SpsBaseline) / q3SpsBaseline * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-amber-500">
                since Q3 2025 ({q3SpsBaseline} → {Math.round((metrics as any).satsPerShare)} sats)
              </p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
              <p className="text-sm text-purple-700 dark:text-purple-400">Hut 8 Ownership</p>
              <p className="text-2xl font-bold text-purple-600">~80%</p>
              <p className="text-xs text-purple-500">Majority-owned subsidiary</p>
            </div>
          </div>
        </div>
      );
    },

    scheduledEventsProps: ({ ticker, stockPrice }) => ({ ticker, stockPrice }),
  } as any;

  return <CompanyViewBase company={company} className={className} config={config} />;
}
