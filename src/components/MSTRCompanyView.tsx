// @ts-nocheck
"use client";

import { MSTR_PROVENANCE, MSTR_CIK } from "@/lib/data/provenance/mstr";
import { pv, derivedSource, docSource, getSourceUrl, getSourceDate } from "@/lib/data/types/provenance";
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

export function MSTRCompanyView({ company, className = "" }: Props) {
  const config: CompanyViewBaseConfig = {
    ticker: "MSTR",
    asset: "BTC",
    cik: MSTR_CIK,
    provenance: MSTR_PROVENANCE,
    provenanceHelpers: {
      sourceUrl: su,
      sourceType: st,
      sourceDate: sd,
      searchTerm: ss,
    },

    // MSTR has ITM converts and uses basic shares from company.sharesForMnav
    buildMetrics: ({ company, prices, marketCap, effectiveShares }) => {
      if (!MSTR_PROVENANCE.holdings || !MSTR_PROVENANCE.totalDebt || !MSTR_PROVENANCE.cashReserves) return null;

      const btcPrice = prices?.crypto?.BTC?.price || 0;

      const holdings = MSTR_PROVENANCE.holdings.value;
      const totalDebt = MSTR_PROVENANCE.totalDebt.value;
      const cashReserves = MSTR_PROVENANCE.cashReserves.value;
      const preferredEquity = MSTR_PROVENANCE.preferredEquity?.value || 0;
      const sharesOutstanding = MSTR_PROVENANCE.sharesOutstanding?.value || company.sharesForMnav || 0;

      // ITM convertible adjustment: subtract face value of ITM converts from debt
      const inTheMoneyDebtValue = effectiveShares?.inTheMoneyDebtValue || 0;
      const adjustedDebt = Math.max(0, totalDebt - inTheMoneyDebtValue);

      const cryptoNav = holdings * btcPrice;
      const netDebt = Math.max(0, adjustedDebt - cashReserves);
      const ev = marketCap + adjustedDebt + preferredEquity - cashReserves;
      // mNAV requires a valid market cap — without it, EV is just debt+pref-cash
      // which produces a misleadingly low number
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
          inputs: { holdings: MSTR_PROVENANCE.holdings },
        }),
        `Using live BTC price: $${btcPrice.toLocaleString()}`
      );

      // MSTR preferred uses explicit doc source if provenance missing (but keep existing provenance if present)
      const preferredPv =
        MSTR_PROVENANCE.preferredEquity ||
        pv(
          preferredEquity,
          docSource({
            type: "company-website",
            url: "https://www.strategy.com/credit",
            quote: `$${(preferredEquity / 1e9).toFixed(2)}B preferred (STRF + STRC + STRE + STRK + STRD)`,
            anchor: "strategy.com/credit (Reg FD)",
          }),
          "5 preferred series from strategy.com/credit"
        );

      const mNavPv =
        mNav !== null
          ? pv(
              mNav,
              derivedSource({
                derivation: "Enterprise Value ÷ Crypto NAV (adjusted for ITM converts)",
                formula: "(marketCap + adjustedDebt + preferred - cash) / cryptoNav",
                inputs: {
                  debt: MSTR_PROVENANCE.totalDebt,
                  preferred: preferredPv,
                  cash: MSTR_PROVENANCE.cashReserves,
                  holdings: MSTR_PROVENANCE.holdings,
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
            debt: MSTR_PROVENANCE.totalDebt,
            cash: MSTR_PROVENANCE.cashReserves,
            holdings: MSTR_PROVENANCE.holdings,
          },
        }),
        `Net Debt: ${formatLargeNumber(netDebt)} (adjusted)`
      );

      const equityNavPv = pv(
        equityNav,
        derivedSource({
          derivation: "Crypto NAV + Cash − Adjusted Debt − Preferred",
          formula: "(holdings × btcPrice) + cash - adjustedDebt - preferred",
          inputs: {
            holdings: MSTR_PROVENANCE.holdings,
            cash: MSTR_PROVENANCE.cashReserves,
            debt: MSTR_PROVENANCE.totalDebt,
            preferred: preferredPv,
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
            holdings: MSTR_PROVENANCE.holdings,
            shares: MSTR_PROVENANCE.sharesOutstanding!,
            debt: MSTR_PROVENANCE.totalDebt,
            cash: MSTR_PROVENANCE.cashReserves,
            preferred: preferredPv,
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

    stalenessDates: ({ company }) => [company.holdingsLastUpdated, company.debtAsOf, company.cashAsOf, company.sharesAsOf, (company as any).preferredAsOf, (company as any).burnAsOf],

    scheduledEventsProps: ({ ticker, stockPrice }) => ({ ticker, stockPrice }),

    renderAfterDataSections: () => (
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-500 dark:text-gray-400">
        <strong>Data Provenance:</strong> All values are sourced from SEC EDGAR filings (XBRL data or document text). Click any metric to see its exact source and verify it yourself. Derived values show the formula and link to their SEC-filed inputs.
      </div>
    ),
  } as any;

  return <CompanyViewBase company={company} className={className} config={config} />;
}
