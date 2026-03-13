"use client";

import { H100_CAPITAL_PROGRAMS } from "@/lib/data/provenance/h100";
import { buildCompanyProvenance, standardProvenanceHelpers } from "@/lib/utils/company-provenance";
import { pv, derivedSource } from "@/lib/data/types/provenance";
import type { Company } from "@/lib/types";
import type { ProvenanceValue } from "@/lib/data/types/provenance";
import { formatLargeNumber } from "@/lib/calculations";

import { CompanyViewBase, type CompanyViewBaseConfig, type CompanyViewBaseMetrics } from "./CompanyViewBase";

const CONV = H100_CAPITAL_PROGRAMS.convertible;

interface H100Metrics extends CompanyViewBaseMetrics {
  leverage: number;
  adjustedDebt: number;
  itmDebtAdjustment: number;
}

interface Props {
  company: Company;
  className?: string;
}

export function H100CompanyView({ company, className = "" }: Props) {
  const cp = buildCompanyProvenance(company);

  const config: CompanyViewBaseConfig = {
    ticker: "H100.ST",
    asset: "BTC",
    provenance: cp,
    provenanceHelpers: standardProvenanceHelpers,

    buildMetrics: ({ company, prices, marketCap, effectiveShares }) => {
      if (!company.holdings) return null;

      const btcPrice = prices?.crypto?.BTC?.price || 0;
      const sekUsdRate = prices?.forex?.SEK || 10.6;

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
        derivedSource({ derivation: "BTC Holdings × BTC Price", formula: "holdings × btcPrice", inputs: { holdings: cp.holdings } }),
        `Using live BTC price: $${btcPrice.toLocaleString()}`
      );

      const mNavPv =
        mNav !== null
          ? pv(
              mNav,
              derivedSource({
                derivation: "Enterprise Value ÷ Crypto NAV",
                formula: "(marketCap + adjustedDebt + preferred - cash) / cryptoNav",
                inputs: { debt: cp.totalDebt, cash: cp.cashReserves, holdings: cp.holdings },
              }),
              `Market Cap: ${formatLargeNumber(marketCap)} (SEK at kr${sekUsdRate.toFixed(1)}/USD). Adjusted Debt: ${formatLargeNumber(adjustedDebt)}`
            )
          : null;

      const leveragePv = pv(
        leverage,
        derivedSource({
          derivation: "Net Debt ÷ Crypto NAV",
          formula: "(adjustedDebt - cash) / cryptoNav",
          inputs: { debt: cp.totalDebt, cash: cp.cashReserves, holdings: cp.holdings },
        }),
        `Net Debt: ${formatLargeNumber(netDebt)}`
      );

      const equityNavPv = pv(
        equityNav,
        derivedSource({
          derivation: "Crypto NAV + Cash − Adjusted Debt",
          formula: "(holdings × btcPrice) + cash - adjustedDebt",
          inputs: { holdings: cp.holdings, cash: cp.cashReserves, debt: cp.totalDebt },
        }),
        `Zero-coupon convertible — no interest payments. Debt adjusted for ITM instruments.`
      );

      const equityNavPerSharePv = pv(
        equityNavPerShare,
        derivedSource({
          derivation: "Equity NAV ÷ Shares Outstanding",
          formula: "equityNav / shares",
          inputs: { holdings: cp.holdings, shares: cp.sharesOutstanding, debt: cp.totalDebt, cash: cp.cashReserves },
        }),
        `Single share class (${(sharesOutstanding / 1e6).toFixed(1)}M shares)`
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
      } satisfies H100Metrics;
    },

    scheduledEventsProps: ({ ticker, stockPrice }) => ({ ticker, stockPrice }),

    renderBalanceSheetExtras: () => (
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-300 dark:border-red-700">
          <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide mb-2">⚠️ IR Page Discrepancy — Convertible Debt</h4>
          <p className="text-sm text-red-600 dark:text-red-300">
            H100&apos;s IR page claims "no convertibles outstanding", but MFN filings show zero-coupon convertible debentures remain.
          </p>
        </div>

        <details className="bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 group">
          <summary className="p-4 cursor-pointer flex items-center justify-between">
            <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200">Convertible Debentures — The H100 Story</h3>
            <svg className="w-5 h-5 text-amber-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-4 pb-4 text-sm text-amber-700 dark:text-amber-300 space-y-2">
            <div>Original issuance: SEK {(CONV.originalAmountSEK / 1e6).toFixed(1)}M</div>
            <div>Converted: SEK {(CONV.convertedAmountSEK / 1e6).toFixed(1)}M</div>
            <div>Remaining: SEK {(CONV.remainingAmountSEK / 1e6).toFixed(1)}M</div>
            <div>Conversion price: SEK {CONV.conversionPriceSEK}/share</div>
            <div>Potential shares: {(CONV.potentialShares / 1e6).toFixed(1)}M</div>
            <div>Maturity: {CONV.maturity}</div>
          </div>
        </details>
      </div>
    ),
  };

  return <CompanyViewBase company={company} className={className} config={config} />;
}
