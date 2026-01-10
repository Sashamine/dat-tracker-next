"use client";

import { useQuery } from "@tanstack/react-query";
import { Company } from "@/lib/types";
import { CompanyOverride } from "@/app/api/company-overrides/route";

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
 * Merge base company data with overrides from Google Sheets.
 * Override values take precedence over base values.
 */
export function mergeCompanyWithOverrides(
  company: Company,
  overrides: Record<string, CompanyOverride>
): Company {
  const override = overrides[company.ticker];
  if (!override) return company;

  return {
    ...company,
    // Override numeric fields if present
    holdings: override.holdings ?? company.holdings,
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
