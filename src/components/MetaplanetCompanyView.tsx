// @ts-nocheck
"use client";

import { METAPLANET_PROVENANCE } from "@/lib/data/provenance/metaplanet";
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

export function MetaplanetCompanyView({ company, className = "" }: Props) {
  const config: CompanyViewBaseConfig = {
    ticker: "3350.T",
    asset: "BTC",
    provenance: METAPLANET_PROVENANCE,
    provenanceHelpers: {
      sourceUrl: su,
      sourceType: st,
      sourceDate: sd,
      searchTerm: ss,
    },

    buildMetrics: ({ company, prices, marketCap }) => {
      if (!METAPLANET_PROVENANCE.holdings || !METAPLANET_PROVENANCE.totalDebt || !METAPLANET_PROVENANCE.cashReserves) return null;

      const btcPrice = prices?.crypto?.BTC?.price || 0;

      const holdings = METAPLANET_PROVENANCE.holdings.value;
      const totalDebt = METAPLANET_PROVENANCE.totalDebt.value;
      const cashReserves = METAPLANET_PROVENANCE.cashReserves.value;
      const preferredEquity = company.preferredEquity || 0;
      const sharesOutstanding = METAPLANET_PROVENANCE.sharesOutstanding?.value || company.sharesForMnav || 0;

      const adjustedDebt = totalDebt;

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
          inputs: { holdings: METAPLANET_PROVENANCE.holdings },
        }),
        `Using live BTC price: $${btcPrice.toLocaleString()}`
      );

      const mNavPv =
        mNav !== null
          ? pv(
              mNav,
              derivedSource({
                derivation: "Enterprise Value ÷ Crypto NAV",
                formula: "(marketCap + debt + preferred - cash) / cryptoNav",
                inputs: {
                  debt: METAPLANET_PROVENANCE.totalDebt,
                  cash: METAPLANET_PROVENANCE.cashReserves,
                  holdings: METAPLANET_PROVENANCE.holdings,
                },
              }),
              `Market cap includes JPY→USD conversion via forex feed`
            )
          : null;

      const leveragePv = pv(
        leverage,
        derivedSource({
          derivation: "Net Debt ÷ Crypto NAV",
          formula: "(debt - cash) / cryptoNav",
          inputs: {
            debt: METAPLANET_PROVENANCE.totalDebt,
            cash: METAPLANET_PROVENANCE.cashReserves,
            holdings: METAPLANET_PROVENANCE.holdings,
          },
        }),
        `Net Debt: ${netDebt}`
      );

      const equityNavPv = pv(
        equityNav,
        derivedSource({
          derivation: "Crypto NAV + Cash − Debt − Preferred",
          formula: "(holdings × btcPrice) + cash - debt - preferred",
          inputs: {
            holdings: METAPLANET_PROVENANCE.holdings,
            cash: METAPLANET_PROVENANCE.cashReserves,
            debt: METAPLANET_PROVENANCE.totalDebt,
          },
        }),
        `Includes preferred equity from company data`
      );

      const equityNavPerSharePv = pv(
        equityNavPerShare,
        derivedSource({
          derivation: "Equity NAV ÷ Shares Outstanding",
          formula: "equityNav / shares",
          inputs: {
            holdings: METAPLANET_PROVENANCE.holdings,
            shares: METAPLANET_PROVENANCE.sharesOutstanding!,
            debt: METAPLANET_PROVENANCE.totalDebt,
            cash: METAPLANET_PROVENANCE.cashReserves,
          },
        }),
        `Single-class common shares` 
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
      } as any;
    },

    scheduledEventsProps: ({ ticker, stockPrice }) => ({ ticker, stockPrice }),

    renderStrategyAndOverview: ({ company }) => (
      <details className="bg-gray-50 dark:bg-gray-900 rounded-lg mb-6 group">
        <summary className="p-6 cursor-pointer flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Strategy & Overview</h3>
          <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="px-6 pb-6">
          <div className="flex items-center gap-3 mb-6">
            {company.website && (
              <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                Website
              </a>
            )}
            <a href="https://metaplanet.jp/en/shareholders/disclosures" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              TDnet Filings
            </a>
          </div>
        </div>
      </details>
    ),
  } as any;

  return <CompanyViewBase company={company} className={className} config={config} />;
}
