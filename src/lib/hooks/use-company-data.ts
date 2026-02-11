"use client";

import { Company } from "@/lib/types";
import { HOLDINGS_HISTORY } from "@/lib/data/holdings-history";
import { getCompanyByTicker } from "@/lib/data/companies";
import { dilutiveInstruments } from "@/lib/data/dilutive-instruments";

/**
 * Company Data Merging (2026-02-01)
 * 
 * All data comes from static files (SEC-sourced):
 * - companies.ts: Base company data, operational params, balance sheet
 * - holdings-history.ts: Historical holdings and shares data
 * - dilutive-instruments.ts: Warrants, converts, options
 * 
 * No external data sources (Google Sheets removed).
 * Validation happens via comparison engine (mNAV.com, SEC XBRL fetchers).
 */

/**
 * Get the latest diluted shares outstanding from holdings history with source info.
 * Uses WeightedAverageNumberOfDilutedSharesOutstanding from SEC filings.
 */
function getLatestSharesWithSource(ticker: string): {
  value: number;
  asOf: string;
  source: string;
  sourceUrl?: string;
} | undefined {
  const history = HOLDINGS_HISTORY[ticker.toUpperCase()];
  if (!history || history.history.length === 0) return undefined;
  const latest = history.history[history.history.length - 1];
  return {
    value: latest.sharesOutstandingDiluted,
    asOf: latest.date,
    source: latest.sharesSource || latest.source || 'holdings-history.ts',
    sourceUrl: latest.sourceUrl,
  };
}

/**
 * Enrich company with static data and holdings history.
 * 
 * Priority for balance sheet data:
 *   holdings-history.ts > companies.ts (static, SEC-sourced)
 * 
 * All operational parameters come from companies.ts.
 */
export function enrichCompany(company: Company): Company {
  // Get diluted shares from holdings history with source info
  const sharesFromHistory = getLatestSharesWithSource(company.ticker);
  const sharesOutstandingFD = sharesFromHistory?.value;
  
  // Get static company data for fields not in database (like holdingsSourceUrl)
  const staticCompany = getCompanyByTicker(company.ticker);

  // Shares source tracking
  let sharesSource: string | undefined;
  let sharesAsOf: string | undefined;
  let sharesSourceUrl: string | undefined;
  
  const hasDilutiveInstruments = !!dilutiveInstruments[company.ticker];
  if (hasDilutiveInstruments && staticCompany?.sharesForMnav) {
    // Use static shares for companies with dilutive instruments (dilution calculated dynamically)
    sharesSource = staticCompany.sharesSource || 'companies.ts (basic shares, dilution dynamic)';
    sharesAsOf = staticCompany.sharesAsOf;
    sharesSourceUrl = staticCompany.sharesSourceUrl;
  } else if (sharesFromHistory) {
    sharesSource = sharesFromHistory.source;
    sharesAsOf = sharesFromHistory.asOf;
    sharesSourceUrl = sharesFromHistory.sourceUrl;
  } else if (staticCompany?.sharesForMnav) {
    sharesSource = staticCompany.sharesSource || 'companies.ts';
    sharesAsOf = staticCompany.sharesAsOf;
    sharesSourceUrl = staticCompany.sharesSourceUrl;
  }

  // Debt source tracking (from static data)
  const debtSource = staticCompany?.debtSource || (staticCompany?.totalDebt ? 'companies.ts' : undefined);
  const debtAsOf = staticCompany?.debtAsOf;
  const debtSourceUrl = staticCompany?.debtSourceUrl;

  // Cash source tracking (from static data)
  const cashSource = staticCompany?.cashSource || (staticCompany?.cashReserves ? 'companies.ts' : undefined);
  const cashAsOf = staticCompany?.cashAsOf;
  const cashSourceUrl = staticCompany?.cashSourceUrl;

  // Preferred equity source tracking (from static data)
  const preferredSource = staticCompany?.preferredSource || (staticCompany?.preferredEquity ? 'companies.ts' : undefined);
  const preferredAsOf = staticCompany?.preferredAsOf;
  const preferredSourceUrl = staticCompany?.preferredSourceUrl;

  // Burn source tracking (from static data)
  const burnSource = staticCompany?.burnSource;
  const burnAsOf = staticCompany?.burnAsOf;
  const burnSourceUrl = staticCompany?.burnSourceUrl;

  // Cash obligations source tracking (from static data)
  const cashObligationsSource = staticCompany?.cashObligationsSource;
  const cashObligationsAsOf = staticCompany?.cashObligationsAsOf;
  const cashObligationsSourceUrl = staticCompany?.cashObligationsSourceUrl;
  const cashObligationsAnnual = staticCompany?.cashObligationsAnnual;
  const debtInterestAnnual = staticCompany?.debtInterestAnnual;
  const preferredDividendAnnual = staticCompany?.preferredDividendAnnual;

  // Mining source tracking (from static data)
  const btcMinedAnnual = staticCompany?.btcMinedAnnual;
  const btcMinedSource = staticCompany?.btcMinedSource;
  const btcMinedSourceUrl = staticCompany?.btcMinedSourceUrl;
  const btcMinedAsOf = staticCompany?.btcMinedAsOf;

  // Cost basis and capital raised source tracking (from static data)
  const costBasisAvg = staticCompany?.costBasisAvg;
  const costBasisSource = staticCompany?.costBasisSource;
  const costBasisSourceUrl = staticCompany?.costBasisSourceUrl;
  const capitalRaisedAtm = staticCompany?.capitalRaisedAtm;
  const capitalRaisedAtmSource = staticCompany?.capitalRaisedAtmSource;
  const capitalRaisedAtmSourceUrl = staticCompany?.capitalRaisedAtmSourceUrl;
  const capitalRaisedPipe = staticCompany?.capitalRaisedPipe;
  const capitalRaisedPipeSource = staticCompany?.capitalRaisedPipeSource;
  const capitalRaisedPipeSourceUrl = staticCompany?.capitalRaisedPipeSourceUrl;
  const capitalRaisedConverts = staticCompany?.capitalRaisedConverts;
  const capitalRaisedConvertsSource = staticCompany?.capitalRaisedConvertsSource;
  const capitalRaisedConvertsSourceUrl = staticCompany?.capitalRaisedConvertsSourceUrl;

  // Merge financial data for mNAV calculation
  // All balance sheet data comes from static files (SEC-sourced)
  const mergedFinancials = {
    // Holdings from static data
    holdings: company.holdings,
    // Debt from static data
    totalDebt: staticCompany?.totalDebt ?? company.totalDebt,
    // Preferred equity from static data
    preferredEquity: staticCompany?.preferredEquity ?? company.preferredEquity,
    // Cash from static data
    cashReserves: staticCompany?.cashReserves ?? company.cashReserves,
    // Restricted cash from static data
    restrictedCash: staticCompany?.restrictedCash ?? company.restrictedCash,
    // Other investments from static data
    otherInvestments: staticCompany?.otherInvestments ?? company.otherInvestments,
    // Holdings source URL
    holdingsSourceUrl: company.holdingsSourceUrl ?? staticCompany?.holdingsSourceUrl,
    // Shares for mNAV: dilutive instruments use basic shares, else holdings-history or static
    sharesForMnav: hasDilutiveInstruments
      ? (staticCompany?.sharesForMnav ?? company.sharesForMnav)
      : (sharesOutstandingFD ?? company.sharesForMnav ?? staticCompany?.sharesForMnav),
    // Source tracking for mNAV transparency
    sharesSource,
    sharesAsOf,
    sharesSourceUrl,
    debtSource,
    debtAsOf,
    debtSourceUrl,
    cashSource,
    cashAsOf,
    cashSourceUrl,
    preferredSource,
    preferredAsOf,
    preferredSourceUrl,
    // Burn source tracking
    burnSource,
    burnAsOf,
    burnSourceUrl,
    // Cash obligations source tracking
    cashObligationsSource,
    cashObligationsAsOf,
    cashObligationsSourceUrl,
    cashObligationsAnnual,
    debtInterestAnnual,
    preferredDividendAnnual,
    // Mining source tracking
    btcMinedAnnual,
    btcMinedSource,
    btcMinedSourceUrl,
    btcMinedAsOf,
    // Cost basis and capital raised source tracking
    costBasisAvg,
    costBasisSource,
    costBasisSourceUrl,
    capitalRaisedAtm,
    capitalRaisedAtmSource,
    capitalRaisedAtmSourceUrl,
    capitalRaisedPipe,
    capitalRaisedPipeSource,
    capitalRaisedPipeSourceUrl,
    capitalRaisedConverts,
    capitalRaisedConvertsSource,
    capitalRaisedConvertsSourceUrl,
    // Flags from static data
    pendingMerger: staticCompany?.pendingMerger ?? company.pendingMerger,
    lowLiquidity: staticCompany?.lowLiquidity ?? company.lowLiquidity,
    // No live balance sheet - static data is source of truth
    hasLiveBalanceSheet: false,
    // Official mNAV only if company has it in static data
    officialMnav: staticCompany?.officialMnav ?? company.officialMnav,
    // Provenance tracking fields
    provenanceFile: staticCompany?.provenanceFile ?? company.provenanceFile,
    lastVerified: staticCompany?.lastVerified ?? company.lastVerified,
    nextExpectedFiling: staticCompany?.nextExpectedFiling ?? company.nextExpectedFiling,
    holdingsAccession: staticCompany?.holdingsAccession ?? company.holdingsAccession,
    holdingsNative: staticCompany?.holdingsNative ?? company.holdingsNative,
    holdingsLsETH: staticCompany?.holdingsLsETH ?? company.holdingsLsETH,
    holdingsStaked: staticCompany?.holdingsStaked ?? company.holdingsStaked,
    stakingRewardsCumulative: staticCompany?.stakingRewardsCumulative ?? company.stakingRewardsCumulative,
    holdingsLastUpdated: staticCompany?.holdingsLastUpdated ?? company.holdingsLastUpdated,
  };

  return {
    ...company,
    ...mergedFinancials,
    sharesOutstandingFD: sharesOutstandingFD ?? company.sharesOutstandingFD,
    // Currency from static data (for non-USD stocks like JPY, HKD)
    currency: staticCompany?.currency ?? company.currency,
  };
}

/**
 * Enrich all companies with static data and holdings history.
 */
export function enrichAllCompanies(companies: Company[]): Company[] {
  return companies.map(enrichCompany);
}
