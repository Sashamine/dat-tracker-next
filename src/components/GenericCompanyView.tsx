"use client";

import type { Company } from "@/lib/types";
import type { ProvenanceValue } from "@/lib/data/types/provenance";
import { pv, derivedSource, docSource } from "@/lib/data/types/provenance";
import { formatLargeNumber } from "@/lib/calculations";
import { calculateTotalCryptoNAV } from "@/lib/math/mnav-engine";

import { CompanyViewBase, type CompanyViewBaseConfig, type CompanyViewBaseMetrics } from "./CompanyViewBase";

interface Props {
  company: Company;
  className?: string;
}

/**
 * Generic company view for companies without hand-crafted provenance files.
 * Synthesizes ProvenanceData from Company citation fields and wraps CompanyViewBase.
 */
export function GenericCompanyView({ company, className = "" }: Props) {
  // Synthesize ProvenanceValue wrappers from company.* citation fields
  const holdingsPv = pv(
    company.holdings ?? 0,
    docSource({
      url: company.holdingsSourceUrl || "",
      quote: company.sourceQuote || `${company.holdings?.toLocaleString()} ${company.asset}`,
      documentDate: company.holdingsLastUpdated || "",
      searchTerm: company.sourceSearchTerm,
      accession: company.accessionNumber,
      filingType: company.holdingsSource === "sec-filing" ? "8-K" : undefined,
      filingDate: company.holdingsLastUpdated,
    }),
    `As of ${company.holdingsLastUpdated}`
  );

  const debtPv = pv(
    company.totalDebt ?? 0,
    docSource({
      url: company.debtSourceUrl || "",
      quote: company.debtSourceQuote || `Total debt: $${(company.totalDebt ?? 0).toLocaleString()}`,
      documentDate: company.debtAsOf || "",
      searchTerm: company.debtSearchTerm,
    }),
    company.debtAsOf ? `As of ${company.debtAsOf}` : undefined
  );

  const cashPv = pv(
    company.cashReserves ?? 0,
    docSource({
      url: company.cashSourceUrl || "",
      quote: company.cashSourceQuote || `Cash: $${(company.cashReserves ?? 0).toLocaleString()}`,
      documentDate: company.cashAsOf || "",
      searchTerm: company.cashSearchTerm,
    }),
    company.cashAsOf ? `As of ${company.cashAsOf}` : undefined
  );

  const sharesPv = pv(
    company.sharesForMnav ?? 0,
    docSource({
      url: company.sharesSourceUrl || "",
      quote: company.sharesSourceQuote || `${(company.sharesForMnav ?? 0).toLocaleString()} shares`,
      documentDate: company.sharesAsOf || "",
      searchTerm: company.sharesSearchTerm,
    }),
    company.sharesAsOf ? `As of ${company.sharesAsOf}` : undefined
  );

  const preferredPv = company.preferredEquity
    ? pv(
        company.preferredEquity,
        docSource({
          url: company.preferredSourceUrl || "",
          quote: company.preferredSourceQuote || `Preferred: $${company.preferredEquity.toLocaleString()}`,
          documentDate: company.preferredAsOf || "",
          searchTerm: company.preferredSearchTerm,
        }),
        company.preferredAsOf ? `As of ${company.preferredAsOf}` : undefined
      )
    : undefined;

  const config: CompanyViewBaseConfig = {
    ticker: company.ticker,
    asset: company.asset === "MULTI" ? "BTC" : company.asset,
    cik: company.secCik,

    provenance: {
      holdings: holdingsPv,
      totalDebt: debtPv,
      cashReserves: cashPv,
      sharesOutstanding: sharesPv,
      preferredEquity: preferredPv,
    },

    scheduledEventsProps: ({ ticker, stockPrice }) => ({ ticker, stockPrice }),

    buildMetrics: ({ company: co, prices, marketCap }) => {
      const holdings = co.holdings ?? 0;
      const totalDebt = co.totalDebt ?? 0;
      const cashReserves = co.cashReserves ?? 0;
      const preferredEquity = co.preferredEquity ?? 0;
      const restrictedCash = co.restrictedCash ?? 0;
      const sharesOutstanding = co.sharesForMnav ?? 0;

      if (!holdings || !sharesOutstanding) return null;

      // Use mnav-engine's calculateTotalCryptoNAV for multi-asset + LST + investment support
      const { totalUsd: cryptoNav, primaryAssetAmount, primaryAssetPrice, secondaryCryptoValue } =
        calculateTotalCryptoNAV(co, prices ?? null);

      const freeCash = cashReserves - restrictedCash;
      const netDebt = Math.max(0, totalDebt - cashReserves);
      const ev = marketCap + totalDebt + preferredEquity - freeCash;
      const baseCryptoNav = primaryAssetAmount * primaryAssetPrice + secondaryCryptoValue;
      const totalNav = baseCryptoNav + restrictedCash;
      const mNav = totalNav > 0 && marketCap > 0 ? ev / totalNav : null;
      const leverage = cryptoNav > 0 ? netDebt / cryptoNav : 0;
      const equityNav = cryptoNav + cashReserves - totalDebt - preferredEquity;
      const equityNavPerShare = sharesOutstanding > 0 ? equityNav / sharesOutstanding : 0;
      const holdingsPerShare = sharesOutstanding > 0 ? holdings / sharesOutstanding : 0;

      const cryptoNavPv: ProvenanceValue<number> = pv(
        cryptoNav,
        derivedSource({
          derivation: `${co.asset} Holdings × ${co.asset} Price` + (secondaryCryptoValue > 0 ? " + secondary crypto" : ""),
          formula: "holdings × price",
          inputs: { holdings: holdingsPv },
        }),
        `Live ${co.asset} price`
      );

      const mNavPv =
        mNav !== null
          ? pv(
              mNav,
              derivedSource({
                derivation: "Enterprise Value / Crypto NAV",
                formula: "(marketCap + debt + preferred - freeCash) / cryptoNav",
                inputs: { holdings: holdingsPv, debt: debtPv, cash: cashPv },
              }),
              `EV: ${formatLargeNumber(ev)}`
            )
          : null;

      const leveragePv = pv(
        leverage,
        derivedSource({
          derivation: "Net Debt / Crypto NAV",
          formula: "max(0, debt - cash) / cryptoNav",
          inputs: { debt: debtPv, cash: cashPv, holdings: holdingsPv },
        }),
        `Net Debt: ${formatLargeNumber(netDebt)}`
      );

      const equityNavPv = pv(
        equityNav,
        derivedSource({
          derivation: "Crypto NAV + Cash - Debt - Preferred",
          formula: "cryptoNav + cash - debt - preferred",
          inputs: { holdings: holdingsPv, cash: cashPv, debt: debtPv },
        })
      );

      const equityNavPerSharePv = pv(
        equityNavPerShare,
        derivedSource({
          derivation: "Equity NAV / Shares Outstanding",
          formula: "equityNav / shares",
          inputs: { holdings: holdingsPv, shares: sharesPv, debt: debtPv, cash: cashPv },
        }),
        `${(sharesOutstanding / 1e6).toFixed(1)}M shares`
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
        equityNavPv: equityNavPv,
        equityNavPerSharePv,
      } satisfies CompanyViewBaseMetrics;
    },

    stalenessDates: ({ company: co }) => [
      co.holdingsLastUpdated,
      co.debtAsOf,
      co.cashAsOf,
      co.sharesAsOf,
    ],
  };

  return <CompanyViewBase company={company} className={className} config={config} />;
}
