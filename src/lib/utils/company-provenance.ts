/**
 * company-provenance.ts
 *
 * Builds ProvenanceValue wrappers from Company citation fields.
 * Used by all company views (both generic and custom) to ensure
 * displayed values and source links come from the D1-overlaid
 * Company object — not stale hardcoded provenance files.
 *
 * Custom views can still use provenance files for:
 * - Calculation formulas and derivation chains
 * - Extended fields (SBET staking breakdown, etc.)
 * - Company-specific notes and context
 *
 * But primary metric VALUES must come from company.* fields,
 * which get D1 overlay via applyD1Overlay().
 */

import type { Company } from "@/lib/types";
import type { ProvenanceValue, XBRLSource, DocumentSource, DerivedSource } from "@/lib/data/types/provenance";
import { pv, docSource, getSourceUrl, getSourceDate } from "@/lib/data/types/provenance";

export type PvParam = ProvenanceValue<number> | undefined;
type AnySource = XBRLSource | DocumentSource | DerivedSource;

/**
 * Standard provenance helpers for CompanyViewBase.
 * Extracts source metadata from ProvenanceValue objects.
 */
export const standardProvenanceHelpers = {
  sourceUrl: (p: PvParam) => (p?.source ? getSourceUrl(p.source) : undefined),
  sourceType: (p: PvParam) => p?.source?.type,
  sourceDate: (p: PvParam) => (p?.source ? getSourceDate(p.source) : undefined),
  searchTerm: (p: PvParam) => {
    const src: AnySource | undefined = p?.source;
    if (src && "searchTerm" in src) return src.searchTerm;
    return undefined;
  },
};

/**
 * Primary provenance values built from a D1-overlaid Company object.
 * These reflect the freshest data available (D1 when newer, companies.ts otherwise).
 */
export interface CompanyProvenance {
  holdings: ProvenanceValue<number>;
  totalDebt: ProvenanceValue<number>;
  cashReserves: ProvenanceValue<number>;
  sharesOutstanding: ProvenanceValue<number>;
  preferredEquity: ProvenanceValue<number> | undefined;
}

/**
 * Build primary ProvenanceValues from a Company's citation fields.
 * The Company object should already have D1 overlay applied.
 */
export function buildCompanyProvenance(company: Company): CompanyProvenance {
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
    company.holdingsLastUpdated ? `As of ${company.holdingsLastUpdated}` : undefined
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

  return {
    holdings: holdingsPv,
    totalDebt: debtPv,
    cashReserves: cashPv,
    sharesOutstanding: sharesPv,
    preferredEquity: preferredPv,
  };
}
