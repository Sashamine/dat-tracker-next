"use client";

import { useQuery } from "@tanstack/react-query";
import { Company } from "@/lib/types";
import { CompanyOverride } from "@/app/api/company-overrides/route";
import { HOLDINGS_HISTORY } from "@/lib/data/holdings-history";
import { getCompanyByTicker } from "@/lib/data/companies";
import { dilutiveInstruments } from "@/lib/data/dilutive-instruments";

/**
 * Architecture Change (2026-01-27):
 * 
 * BEFORE: Live APIs (mNAV.com, SharpLink) overrode static data
 * AFTER:  Static data (from SEC filings) is the source of truth
 *         Live APIs only feed into comparison engine for validation
 * 
 * Rationale: SEC filings ARE the authoritative source. Third-party aggregators
 * can have errors. DATCAP's value is in curating authoritative data, not
 * passing through aggregator data.
 * 
 * Data sources:
 * - Balance sheet (holdings, debt, cash, shares): companies.ts, holdings-history.ts
 * - Operational parameters (burn rate, staking, etc.): Google Sheets overrides
 * - Validation: comparison engine uses fetchers (mNAV.com, SEC XBRL, etc.)
 */

interface OverridesResponse {
  overrides: Record<string, CompanyOverride>;
  cached?: boolean;
  stale?: boolean;
  error?: string;
  timestamp: string;
}

async function fetchOverrides(): Promise<OverridesResponse> {
  const response = await fetch("/api/company-overrides");
  if (!response.ok) {
    throw new Error("Failed to fetch company overrides");
  }
  return response.json();
}

/**
 * Hook to fetch company data overrides from Google Sheets.
 * 
 * Google Sheets overrides are for OPERATIONAL parameters that don't come from SEC filings:
 * - quarterlyBurnUsd, stakingPct, stakingApy, leverageRatio, costBasisAvg, notes
 * 
 * Balance sheet data (holdings, debt, cash, shares) comes from static data files
 * which are sourced from SEC filings and verified via the comparison engine.
 */
export function useCompanyOverrides() {
  const overridesQuery = useQuery({
    queryKey: ["company-overrides"],
    queryFn: fetchOverrides,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  return {
    overrides: overridesQuery.data?.overrides || {},
    isLoading: overridesQuery.isLoading,
    error: overridesQuery.error,
    dataUpdatedAt: overridesQuery.dataUpdatedAt,
  };
}

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
 * Merge base company data with overrides from Google Sheets.
 * 
 * Priority for balance sheet data:
 *   holdings-history.ts > companies.ts (static, SEC-sourced)
 * 
 * Priority for operational parameters:
 *   Google Sheets overrides > companies.ts
 * 
 * Note: Live APIs (mNAV.com, SharpLink) are NOT used here.
 * They only feed into the comparison engine for validation.
 */
export function mergeCompanyWithOverrides(
  company: Company,
  overrides: Record<string, CompanyOverride>
): Company {
  const override = overrides[company.ticker];
  
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
    // Flags from static data
    pendingMerger: staticCompany?.pendingMerger ?? company.pendingMerger,
    lowLiquidity: staticCompany?.lowLiquidity ?? company.lowLiquidity,
    // No live balance sheet - static data is source of truth
    hasLiveBalanceSheet: false,
    // Official mNAV only if company has it in static data
    officialMnav: staticCompany?.officialMnav ?? company.officialMnav,
  };

  if (!override) {
    return {
      ...company,
      ...mergedFinancials,
      sharesOutstandingFD: sharesOutstandingFD ?? company.sharesOutstandingFD,
    };
  }

  // Apply Google Sheets overrides for operational parameters only
  return {
    ...company,
    ...mergedFinancials,
    sharesOutstandingFD: sharesOutstandingFD ?? company.sharesOutstandingFD,
    // Operational parameters from Google Sheets
    quarterlyBurnUsd: override.quarterlyBurnUsd ?? company.quarterlyBurnUsd,
    stakingPct: override.stakingPct ?? company.stakingPct,
    stakingApy: override.stakingApy ?? company.stakingApy,
    leverageRatio: override.leverageRatio ?? company.leverageRatio,
    costBasisAvg: override.costBasisAvg ?? company.costBasisAvg,
    marketCap: override.marketCap ?? company.marketCap,
    notes: override.notes ?? company.notes,
  };
}

/**
 * Merge all companies with their overrides.
 */
export function mergeAllCompanies(
  companies: Company[],
  overrides: Record<string, CompanyOverride>
): Company[] {
  return companies.map((company) => mergeCompanyWithOverrides(company, overrides));
}
