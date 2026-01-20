"use client";

import { useQuery } from "@tanstack/react-query";
import { Company } from "@/lib/types";
import { CompanyOverride } from "@/app/api/company-overrides/route";
import { HOLDINGS_HISTORY } from "@/lib/data/holdings-history";
import { getCompanyByTicker } from "@/lib/data/companies";

interface OverridesResponse {
  overrides: Record<string, CompanyOverride>;
  cached?: boolean;
  stale?: boolean;
  error?: string;
  timestamp: string;
}

// mNAV.com live balance sheet data
interface MnavCompanyData {
  ticker: string;
  holdings: number;
  debt: number;
  cash: number;
  fdShares: number;
  mnav: number;
  marketCap: number;
  enterpriseValue: number;
  lastUpdated: string;
}

interface MnavBatchResponse {
  data: Record<string, MnavCompanyData>;
  count: number;
  supported: string[];
  cached: boolean;
  timestamp: string;
}

async function fetchOverrides(): Promise<OverridesResponse> {
  const response = await fetch("/api/company-overrides");
  if (!response.ok) {
    throw new Error("Failed to fetch company overrides");
  }
  return response.json();
}

async function fetchMnavData(): Promise<MnavBatchResponse | null> {
  try {
    const response = await fetch("/api/mnav");
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

/**
 * Hook to fetch company data overrides from Google Sheets and live balance sheet data from mNAV.com.
 * Returns the overrides, live balance sheet data, and functions to merge them with base company data.
 */
export function useCompanyOverrides() {
  const overridesQuery = useQuery({
    queryKey: ["company-overrides"],
    queryFn: fetchOverrides,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Fetch live balance sheet data from mNAV.com API
  const mnavQuery = useQuery({
    queryKey: ["mnav-live-data"],
    queryFn: fetchMnavData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  return {
    overrides: overridesQuery.data?.overrides || {},
    liveBalanceSheet: mnavQuery.data?.data || {},
    isLoading: overridesQuery.isLoading,
    error: overridesQuery.error,
    dataUpdatedAt: overridesQuery.dataUpdatedAt,
    mnavLastUpdated: mnavQuery.data?.timestamp,
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
 * Merge base company data with overrides from Google Sheets and live mNAV.com balance sheet data.
 * Priority: mNAV.com live data > static data > database
 * Also populates sharesOutstandingFD from holdings history for accurate market cap.
 */
export function mergeCompanyWithOverrides(
  company: Company,
  overrides: Record<string, CompanyOverride>,
  liveBalanceSheet: Record<string, MnavCompanyData> = {}
): Company {
  const override = overrides[company.ticker];
  const liveData = liveBalanceSheet[company.ticker];
  // Get diluted shares from holdings history (for accurate market cap calculation)
  const sharesOutstandingFD = getLatestDilutedShares(company.ticker);
  // Get static company data for fields not in database (like holdingsSourceUrl)
  const staticCompany = getCompanyByTicker(company.ticker);

  // Merge financial data for mNAV calculation
  // Priority: mNAV.com live data (most current) > static data > database
  // mNAV.com provides debt and cash for 13 BTC treasury companies
  const mergedFinancials = {
    // Use live debt from mNAV.com if available, else static, else database
    totalDebt: liveData?.debt ?? staticCompany?.totalDebt ?? company.totalDebt,
    // Preferred equity not in mNAV.com API, use static/database
    preferredEquity: staticCompany?.preferredEquity ?? company.preferredEquity,
    // Use live cash from mNAV.com if available, else static, else database
    cashReserves: liveData?.cash ?? staticCompany?.cashReserves ?? company.cashReserves,
    otherInvestments: staticCompany?.otherInvestments ?? company.otherInvestments,
    holdingsSourceUrl: company.holdingsSourceUrl ?? staticCompany?.holdingsSourceUrl,
    sharesForMnav: company.sharesForMnav ?? staticCompany?.sharesForMnav,
    // pendingMerger: static data takes precedence (undefined = not pending)
    pendingMerger: staticCompany?.pendingMerger ?? company.pendingMerger,
    // lowLiquidity: flag for thinly traded stocks
    lowLiquidity: staticCompany?.lowLiquidity ?? company.lowLiquidity,
    // Track if this company has live balance sheet data from mNAV.com
    hasLiveBalanceSheet: !!liveData,
  };

  if (!override) {
    return {
      ...company,
      ...mergedFinancials,
      sharesOutstandingFD: sharesOutstandingFD ?? company.sharesOutstandingFD,
    };
  }

  return {
    ...company,
    ...mergedFinancials,
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
 * Merge all companies with their overrides and live balance sheet data.
 */
export function mergeAllCompanies(
  companies: Company[],
  overrides: Record<string, CompanyOverride>,
  liveBalanceSheet: Record<string, MnavCompanyData> = {}
): Company[] {
  return companies.map((company) => mergeCompanyWithOverrides(company, overrides, liveBalanceSheet));
}
