// @ts-nocheck
"use client";

import { H100_PROVENANCE, H100_CAPITAL_PROGRAMS } from "@/lib/data/provenance/h100";
import { pv, derivedSource, getSourceUrl, getSourceDate } from "@/lib/data/types/provenance";
import type { Company } from "@/lib/types";
import type { ProvenanceValue } from "@/lib/data/types/provenance";
import { formatLargeNumber } from "@/lib/calculations";

import { CompanyViewBase, type CompanyViewBaseConfig } from "./CompanyViewBase";

const CONV = H100_CAPITAL_PROGRAMS.convertible;

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

export function H100CompanyView({ company, className = "" }: Props) {
  const config: CompanyViewBaseConfig = {
    ticker: "H100.ST",
    asset: "BTC",
    provenance: H100_PROVENANCE,
    provenanceHelpers: {
      sourceUrl: su,
      sourceType: st,
      sourceDate: sd,
      searchTerm: ss,
    },

    buildMetrics: ({ company, prices, marketCap, effectiveShares }) => {
      if (!H100_PROVENANCE.holdings || !H100_PROVENANCE.totalDebt || !H100_PROVENANCE.cashReserves) return null;

      const btcPrice = prices?.crypto?.BTC?.price || 0;
      const sekUsdRate = prices?.forex?.SEK || 10.6;

      const holdings = H100_PROVENANCE.holdings.value;
      const totalDebt = H100_PROVENANCE.totalDebt.value;
      const cashReserves = H100_PROVENANCE.cashReserves.value;
      const preferredEquity = H100_PROVENANCE.preferredEquity?.value || 0;
      const sharesOutstanding = H100_PROVENANCE.sharesOutstanding?.value || company.sharesForMnav || 0;

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
        derivedSource({ derivation: "BTC Holdings × BTC Price", formula: "holdings × btcPrice", inputs: { holdings: H100_PROVENANCE.holdings } }),
        `Using live BTC price: $${btcPrice.toLocaleString()}`
      );

      const mNavPv =
        mNav !== null
          ? pv(
              mNav,
              derivedSource({
                derivation: "Enterprise Value ÷ Crypto NAV",
                formula: "(marketCap + adjustedDebt + preferred - cash) / cryptoNav",
                inputs: { debt: H100_PROVENANCE.totalDebt, cash: H100_PROVENANCE.cashReserves, holdings: H100_PROVENANCE.holdings },
              }),
              `Market Cap: ${formatLargeNumber(marketCap)} (SEK at kr${sekUsdRate.toFixed(1)}/USD). Adjusted Debt: ${formatLargeNumber(adjustedDebt)}`
            )
          : null;

      const leveragePv = pv(
        leverage,
        derivedSource({
          derivation: "Net Debt ÷ Crypto NAV",
          formula: "(adjustedDebt - cash) / cryptoNav",
          inputs: { debt: H100_PROVENANCE.totalDebt, cash: H100_PROVENANCE.cashReserves, holdings: H100_PROVENANCE.holdings },
        }),
        `Net Debt: ${formatLargeNumber(netDebt)}`
      );

      const equityNavPv = pv(
        equityNav,
        derivedSource({
          derivation: "Crypto NAV + Cash − Adjusted Debt",
          formula: "(holdings × btcPrice) + cash - adjustedDebt",
          inputs: { holdings: H100_PROVENANCE.holdings, cash: H100_PROVENANCE.cashReserves, debt: H100_PROVENANCE.totalDebt },
        }),
        `Zero-coupon convertible — no interest payments. Debt adjusted for ITM instruments.`
      );

      const equityNavPerSharePv = pv(
        equityNavPerShare,
        derivedSource({
          derivation: "Equity NAV ÷ Shares Outstanding",
          formula: "equityNav / shares",
          inputs: { holdings: H100_PROVENANCE.holdings, shares: H100_PROVENANCE.sharesOutstanding!, debt: H100_PROVENANCE.totalDebt, cash: H100_PROVENANCE.cashReserves },
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
      } as any;
    },

    scheduledEventsProps: ({ ticker, stockPrice }) => ({ ticker, stockPrice }),

    renderBalanceSheetExtras: () => (
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-300 dark:border-red-700">
          <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide mb-2">⚠️ IR Page Discrepancy — Convertible Debt</h4>
          <p className="text-sm text-red-600 dark:text-red-300">
            H100&apos;s IR page claims “no convertibles outstanding”, but MFN filings show zero-coupon convertible debentures remain.
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
  } as any;

  return <CompanyViewBase company={company} className={className} config={config} />;
}
