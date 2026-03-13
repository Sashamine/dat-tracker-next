"use client";

import { MSTR_CIK } from "@/lib/data/provenance/mstr";
import { pv, derivedSource, docSource } from "@/lib/data/types/provenance";
import type { Company } from "@/lib/types";
import type { ProvenanceValue } from "@/lib/data/types/provenance";
import { formatLargeNumber } from "@/lib/calculations";
import { buildCompanyProvenance, standardProvenanceHelpers } from "@/lib/utils/company-provenance";

import { CompanyViewBase, type CompanyViewBaseConfig, type CompanyViewBaseMetrics } from "./CompanyViewBase";

interface MSTRMetrics extends CompanyViewBaseMetrics {
  leverage: number;
  adjustedDebt: number;
  itmDebtAdjustment: number;
}

interface Props {
  company: Company;
  className?: string;
}

export function MSTRCompanyView({ company, className = "" }: Props) {
  const cp = buildCompanyProvenance(company);

  const config: CompanyViewBaseConfig = {
    ticker: "MSTR",
    asset: "BTC",
    cik: MSTR_CIK,
    provenance: cp,
    provenanceHelpers: standardProvenanceHelpers,

    // MSTR has ITM converts and uses basic shares from company.sharesForMnav
    buildMetrics: ({ company, prices, marketCap, effectiveShares }) => {
      if (!company.holdings) return null;

      const btcPrice = prices?.crypto?.BTC?.price || 0;

      const holdings = company.holdings ?? 0;
      const totalDebt = company.totalDebt ?? 0;
      const cashReserves = company.cashReserves ?? 0;
      const preferredEquity = company.preferredEquity ?? 0;
      const sharesOutstanding = company.sharesForMnav ?? 0;

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
          inputs: { holdings: cp.holdings },
        }),
        `Using live BTC price: $${btcPrice.toLocaleString()}`
      );

      // MSTR preferred uses explicit doc source if provenance missing (but keep existing provenance if present)
      const preferredPv =
        cp.preferredEquity ||
        pv(
          preferredEquity,
          docSource({
            type: "company-website",
            url: "https://www.strategy.com/credit",
            quote: `$${(preferredEquity / 1e9).toFixed(2)}B preferred (STRF + STRC + STRE + STRK + STRD)`,
            anchor: "strategy.com/credit (Reg FD)",
            documentDate: "2026-03-03",
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
                  debt: cp.totalDebt,
                  preferred: preferredPv,
                  cash: cp.cashReserves,
                  holdings: cp.holdings,
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
            debt: cp.totalDebt,
            cash: cp.cashReserves,
            holdings: cp.holdings,
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
            holdings: cp.holdings,
            cash: cp.cashReserves,
            debt: cp.totalDebt,
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
            holdings: cp.holdings,
            shares: cp.sharesOutstanding,
            debt: cp.totalDebt,
            cash: cp.cashReserves,
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
      } satisfies MSTRMetrics;
    },

    stalenessDates: ({ company }) => [company.holdingsLastUpdated, company.debtAsOf, company.cashAsOf, company.sharesAsOf, company.preferredAsOf, company.burnAsOf],

    scheduledEventsProps: ({ ticker, stockPrice }) => ({ ticker, stockPrice }),

    renderAfterDataSections: () => (
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-500 dark:text-gray-400">
        <strong>Data Provenance:</strong> All values are sourced from SEC EDGAR filings (XBRL data or document text). Click any metric to see its exact source and verify it yourself. Derived values show the formula and link to their SEC-filed inputs.
      </div>
    ),
  };

  return <CompanyViewBase company={company} className={className} config={config} />;
}
