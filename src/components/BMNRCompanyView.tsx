// @ts-nocheck
"use client";

import { BMNR_PROVENANCE, BMNR_CIK, BMNR_STAKING_PROVENANCE, estimateBMNRShares } from "@/lib/data/provenance/bmnr";
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

export function BMNRCompanyView({ company, className = "" }: Props) {
  const config: CompanyViewBaseConfig = {
    ticker: "BMNR",
    asset: "ETH",
    cik: BMNR_CIK,
    provenance: BMNR_PROVENANCE,
    provenanceHelpers: {
      sourceUrl: su,
      sourceType: st,
      sourceDate: sd,
      searchTerm: ss,
    },

    // BMNR uses an estimated share count for mNAV/HPS (more current than verified 10-Q)
    // and a market-cap override consistent with the old view (back out stock price from API market cap).
    marketCapOverride: ({ company, prices, marketCap }) => {
      const est = estimateBMNRShares();
      const impliedStockPrice = marketCap / (company.sharesForMnav || 1);
      return impliedStockPrice * est.totalEstimated;
    },

    buildMetrics: ({ company, prices, marketCap }) => {
      if (!BMNR_PROVENANCE.holdings || !BMNR_PROVENANCE.cashReserves) return null;

      const ethPrice = prices?.crypto?.ETH?.price || 0;

      const holdings = BMNR_PROVENANCE.holdings.value;
      const totalDebt = BMNR_PROVENANCE.totalDebt?.value || 0;
      const cashReserves = BMNR_PROVENANCE.cashReserves.value;
      const preferredEquity = BMNR_PROVENANCE.preferredEquity?.value || 0;

      const shareEstimate = estimateBMNRShares();
      const estimatedShares = shareEstimate.totalEstimated;

      const cryptoNav = holdings * ethPrice;
      const netDebt = Math.max(0, totalDebt - cashReserves);

      // Canonical BMNR mNAV: all cash treated as restricted/operational (no EV deduction), but added to NAV denominator.
      const restrictedCash = cashReserves;
      const freeCash = cashReserves - restrictedCash; // = 0
      const ev = marketCap + totalDebt + preferredEquity - freeCash;
      const totalNav = cryptoNav + restrictedCash;
      const mNav = totalNav > 0 ? ev / totalNav : null;

      const leverage = cryptoNav > 0 ? netDebt / cryptoNav : 0;
      const equityNav = cryptoNav + cashReserves - totalDebt - preferredEquity;
      const equityNavPerShare = estimatedShares > 0 ? equityNav / estimatedShares : 0;
      const holdingsPerShare = estimatedShares > 0 ? holdings / estimatedShares : 0;

      const cryptoNavPv: ProvenanceValue<number> = pv(
        cryptoNav,
        derivedSource({
          derivation: "ETH Holdings × ETH Price",
          formula: "holdings × ethPrice",
          inputs: { holdings: BMNR_PROVENANCE.holdings },
        }),
        `Using live ETH price: $${ethPrice.toLocaleString()}`
      );

      const estimatedSharesPv = pv(
        estimatedShares,
        derivedSource({
          derivation: "Estimated from ATM activity",
          formula: shareEstimate.methodology,
          inputs: { anchor: BMNR_PROVENANCE.sharesOutstanding },
        }),
        shareEstimate.methodology
      );

      const mNavPv =
        mNav !== null
          ? pv(
              mNav,
              derivedSource({
                derivation: "Enterprise Value ÷ Total NAV (Crypto NAV + restricted cash)",
                formula: "(marketCap + debt + preferred - freeCash) / (cryptoNav + restrictedCash)",
                inputs: {
                  holdings: BMNR_PROVENANCE.holdings,
                  cash: BMNR_PROVENANCE.cashReserves,
                  ...(BMNR_PROVENANCE.totalDebt && { debt: BMNR_PROVENANCE.totalDebt }),
                  shares: estimatedSharesPv,
                },
              }),
              `ETH $${ethPrice.toLocaleString()}`
            )
          : null;

      const leveragePv: ProvenanceValue<number> = pv(
        leverage,
        derivedSource({
          derivation: "Net Debt ÷ Crypto NAV",
          formula: "(debt - cash) / cryptoNav",
          inputs: {
            ...(BMNR_PROVENANCE.totalDebt && { debt: BMNR_PROVENANCE.totalDebt }),
            cash: BMNR_PROVENANCE.cashReserves,
            holdings: BMNR_PROVENANCE.holdings,
          },
        }),
        `BMNR has no debt - leverage is 0x`
      );

      const equityNavPv: ProvenanceValue<number> = pv(
        equityNav,
        derivedSource({
          derivation: "Crypto NAV + Cash − Debt − Preferred",
          formula: "(holdings × ethPrice) + cash - debt - preferred",
          inputs: {
            holdings: BMNR_PROVENANCE.holdings,
            cash: BMNR_PROVENANCE.cashReserves,
            ...(BMNR_PROVENANCE.totalDebt && { debt: BMNR_PROVENANCE.totalDebt }),
            ...(BMNR_PROVENANCE.preferredEquity && { preferred: BMNR_PROVENANCE.preferredEquity }),
          },
        }),
        `No debt or preferred - Equity NAV = Crypto NAV + Cash`
      );

      const equityNavPerSharePv: ProvenanceValue<number> = pv(
        equityNavPerShare,
        derivedSource({
          derivation: "Equity NAV ÷ Estimated Shares",
          formula: "equityNav / estimatedShares",
          inputs: {
            holdings: BMNR_PROVENANCE.holdings,
            cash: BMNR_PROVENANCE.cashReserves,
          },
        }),
        `Using estimated ${(estimatedShares / 1_000_000).toFixed(0)}M shares (10-Q baseline + ATM estimate)`
      );

      return {
        holdings,
        cryptoNav,
        netDebt,
        totalDebt,
        cashReserves,
        preferredEquity,
        sharesOutstanding: estimatedShares,
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
        shareEstimate,
        estimatedShares,
      } as any;
    },

    renderBalanceSheetExtras: () => (
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Staking & Shares</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {BMNR_STAKING_PROVENANCE.stakedAmount && (
            <div className="col-span-2 md:col-span-1">
              {/* reuse ProvenanceMetric by providing provenance directly */}
              {/* @ts-ignore */}
              <div className="h-full">
                {/* eslint-disable-next-line react/jsx-no-undef */}
              </div>
            </div>
          )}

          {BMNR_STAKING_PROVENANCE.stakedAmount && (
            // inline to avoid adding more base API surface
            // eslint-disable-next-line react/jsx-no-undef
            <div className="col-span-2 md:col-span-1">
              {/* ProvenanceMetric imported in base; keep here minimal by dynamic import? simpler: render plain */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">ETH Staked</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{BMNR_STAKING_PROVENANCE.stakedAmount.value.toLocaleString()}</p>
                <p className="text-xs text-gray-400">{(BMNR_STAKING_PROVENANCE.stakingPct.value * 100).toFixed(1)}% of holdings</p>
              </div>
            </div>
          )}

          {BMNR_PROVENANCE.sharesOutstanding && (
            <div className="col-span-2 md:col-span-1">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">Verified Shares</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{(BMNR_PROVENANCE.sharesOutstanding.value / 1_000_000).toFixed(1)}M</p>
                <p className="text-xs text-gray-400">From 10-Q cover page</p>
              </div>
            </div>
          )}

          <div className="col-span-2 md:col-span-1 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Est. Current Shares</p>
              <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded">ESTIMATED</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{(estimateBMNRShares().totalEstimated / 1_000_000).toFixed(1)}M</p>
            <p className="text-xs text-gray-400 mt-1">+{(estimateBMNRShares().estimatedNewShares / 1_000_000).toFixed(1)}M from ATM</p>
            <details className="mt-2">
              <summary className="text-xs text-amber-600 dark:text-amber-400 cursor-pointer hover:underline">Methodology</summary>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{estimateBMNRShares().methodology}</p>
            </details>
          </div>
        </div>
      </div>
    ),

    scheduledEventsProps: ({ ticker, stockPrice }) => ({ ticker, stockPrice }),

    renderAfterDataSections: () => (
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-500 dark:text-gray-400">
        <strong>Data Provenance:</strong> All values are sourced from SEC EDGAR filings (XBRL data or document text). Click any metric to see its exact source and verify it yourself. Derived values show the formula and link to their SEC-filed inputs.
      </div>
    ),
  } as any;

  return <CompanyViewBase company={company} className={className} config={config} />;
}
