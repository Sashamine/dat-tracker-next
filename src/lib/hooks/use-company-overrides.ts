"use client";

import { useQuery } from "@tanstack/react-query";
import { Company } from "@/lib/types";
import { CompanyOverride } from "@/app/api/company-overrides/route";
import { HOLDINGS_HISTORY } from "@/lib/data/holdings-history";

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
 * Returns the overrides and a function to merge them with base company data.
 */
export function useCompanyOverrides() {
  const query = useQuery({
    queryKey: ["company-overrides"],
    queryFn: fetchOverrides,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  return {
    overrides: query.data?.overrides || {},
    isLoading: query.isLoading,
    error: query.error,
    dataUpdatedAt: query.dataUpdatedAt,
  };
}

/**
 * Get the latest diluted shares outstanding from holdings history.
 * Uses WeightedAverageNumberOfDilutedSharesOutstanding from SEC filings.
 */
function getLatestDilutedShares(ticker: string): number | undefined {
  const history = HOLDINGS_HISTORY[ticker.toUpperCase()];
  if (!history || history.history.length === 0) return undefined;
  // Get the most recent entry (last in array)
  const latest = history.history[history.history.length - 1];
  return latest.sharesOutstanding;
}

/**
 * Merge base company data with overrides from Google Sheets.
 * Override values take precedence over base values.
 * Also populates sharesOutstandingFD from holdings history for accurate market cap.
 */
export function mergeCompanyWithOverrides(
  company: Company,
  overrides: Record<string, CompanyOverride>
): Company {
  const override = overrides[company.ticker];
  // Get diluted shares from holdings history (for accurate market cap calculation)
  const sharesOutstandingFD = getLatestDilutedShares(company.ticker);

  if (!override) {
    return {
      ...company,
      sharesOutstandingFD: sharesOutstandingFD ?? company.sharesOutstandingFD,
    };
  }

  return {
    ...company,
    // Diluted shares from holdings history (SEC filings)
    sharesOutstandingFD: sharesOutstandingFD ?? company.sharesOutstandingFD,
    // Holdings: ALWAYS use companies.ts (single source of truth)
    // Google Sheet holdings data was stale and causing incorrect mNAV calculations
    // holdings: override.holdings ?? company.holdings,
    // Override other numeric fields if present
    quarterlyBurnUsd: override.quarterlyBurnUsd ?? company.quarterlyBurnUsd,
    stakingPct: override.stakingPct ?? company.stakingPct,
    stakingApy: override.stakingApy ?? company.stakingApy,
    leverageRatio: override.leverageRatio ?? company.leverageRatio,
    costBasisAvg: override.costBasisAvg ?? company.costBasisAvg,
    marketCap: override.marketCap ?? company.marketCap,
    // Override notes if present
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
