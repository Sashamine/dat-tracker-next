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

// Live API data structures
interface MnavCompanyData {
  ticker: string;
  holdings: number;
  debt: number;
  cash: number;
  fdShares: number;
  preferredEquity: number;
  lastUpdated: string;
}

interface MnavBatchResponse {
  data: Record<string, MnavCompanyData>;
  count: number;
  supported: string[];
  cached: boolean;
  timestamp: string;
}

// SharpLink API data (SBET)
interface SharpLinkData {
  ticker: 'SBET';
  holdings: number;
  ethNav: number;
  stakingRewards: number;
  ethConcentration: number;
  mNAV: string;
  lastUpdated: string;
  source: 'sharplink-dashboard';
}

// Unified live data structure
interface LiveCompanyData {
  ticker: string;
  holdings?: number;
  debt?: number;
  cash?: number;
  fdShares?: number;
  preferredEquity?: number;
  ethNav?: number;
  stakingRewards?: number;
  officialMnav?: number;  // Official FD mNAV from source (e.g., SharpLink 0.81x)
  lastUpdated: string;
  source: 'mnav.com' | 'sharplink-dashboard';
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

async function fetchSharpLinkData(): Promise<SharpLinkData | null> {
  try {
    const response = await fetch("/api/sharplink");
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

/**
 * Hook to fetch company data overrides from Google Sheets and live data from APIs.
 * - mNAV.com: BTC treasury companies (debt, cash, holdings)
 * - SharpLink: SBET ETH holdings and NAV
 */
export function useCompanyOverrides() {
  const overridesQuery = useQuery({
    queryKey: ["company-overrides"],
    queryFn: fetchOverrides,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Fetch live balance sheet data from mNAV.com API (BTC companies)
  const mnavQuery = useQuery({
    queryKey: ["mnav-live-data"],
    queryFn: fetchMnavData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Fetch live data from SharpLink API (SBET)
  const sharpLinkQuery = useQuery({
    queryKey: ["sharplink-live-data"],
    queryFn: fetchSharpLinkData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Combine mNAV.com and SharpLink data into unified structure
  const liveBalanceSheet: Record<string, LiveCompanyData> = {};

  // Non-USD tickers from mNAV.com - skip these as their data is in local currency
  // which would break our USD-based mNAV calculations
  const NON_USD_TICKERS = [
    '3350.T',   // Metaplanet (JPY)
    '0434.HK',  // Boyaa (HKD)
    'H100.ST',  // H100 Group (SEK)
    'NXTT',     // Next Technology (JPY)
  ];

  // Add mNAV.com data (BTC companies) - only USD-denominated companies
  if (mnavQuery.data?.data) {
    for (const [ticker, data] of Object.entries(mnavQuery.data.data)) {
      // Skip non-USD companies to avoid currency mismatch in calculations
      if (NON_USD_TICKERS.includes(ticker)) {
        continue;
      }
      liveBalanceSheet[ticker] = {
        ticker,
        holdings: data.holdings,
        debt: data.debt,
        cash: data.cash,
        fdShares: data.fdShares,
        preferredEquity: data.preferredEquity,
        lastUpdated: data.lastUpdated,
        source: 'mnav.com',
      };
    }
  }

  // Add SharpLink data (SBET)
  if (sharpLinkQuery.data) {
    // Parse official FD mNAV (e.g., "0.81x" -> 0.81)
    const officialMnavStr = sharpLinkQuery.data.mNAV;
    const officialMnav = officialMnavStr && officialMnavStr !== 'N/A'
      ? parseFloat(officialMnavStr.replace('x', ''))
      : undefined;

    liveBalanceSheet['SBET'] = {
      ticker: 'SBET',
      holdings: sharpLinkQuery.data.holdings,
      ethNav: sharpLinkQuery.data.ethNav,
      stakingRewards: sharpLinkQuery.data.stakingRewards,
      officialMnav,  // Use SharpLink's official FD mNAV instead of calculating our own
      lastUpdated: sharpLinkQuery.data.lastUpdated,
      source: 'sharplink-dashboard',
    };
  }

  return {
    overrides: overridesQuery.data?.overrides || {},
    liveBalanceSheet,
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
 * Merge base company data with overrides from Google Sheets and live API data.
 * Priority: Live API data > static data > database
 * Sources: mNAV.com (BTC companies), SharpLink (SBET)
 */
export function mergeCompanyWithOverrides(
  company: Company,
  overrides: Record<string, CompanyOverride>,
  liveBalanceSheet: Record<string, LiveCompanyData> = {}
): Company {
  const override = overrides[company.ticker];
  const liveData = liveBalanceSheet[company.ticker];
  // Get diluted shares from holdings history (for accurate market cap calculation)
  const sharesOutstandingFD = getLatestDilutedShares(company.ticker);
  // Get static company data for fields not in database (like holdingsSourceUrl)
  const staticCompany = getCompanyByTicker(company.ticker);

  // Merge financial data for mNAV calculation
  // Priority: Live API data (mNAV.com) > static data > database
  // mNAV.com provides: holdings, debt, cash, preferredEquity for BTC treasury companies
  // SharpLink provides: ETH holdings for SBET
  const mergedFinancials = {
    // Use mNAV.com holdings when available (they update quickly after SEC filings)
    holdings: liveData?.holdings ?? company.holdings,
    // Use live debt from mNAV.com if available, else static, else database
    totalDebt: liveData?.debt ?? staticCompany?.totalDebt ?? company.totalDebt,
    // Use live preferred equity from mNAV.com if available, else static, else database
    preferredEquity: liveData?.preferredEquity ?? staticCompany?.preferredEquity ?? company.preferredEquity,
    // Use live cash from mNAV.com if available, else static, else database
    cashReserves: liveData?.cash ?? staticCompany?.cashReserves ?? company.cashReserves,
    otherInvestments: staticCompany?.otherInvestments ?? company.otherInvestments,
    holdingsSourceUrl: company.holdingsSourceUrl ?? staticCompany?.holdingsSourceUrl,
    sharesForMnav: company.sharesForMnav ?? staticCompany?.sharesForMnav,
    // pendingMerger: static data takes precedence (undefined = not pending)
    pendingMerger: staticCompany?.pendingMerger ?? company.pendingMerger,
    // lowLiquidity: flag for thinly traded stocks
    lowLiquidity: staticCompany?.lowLiquidity ?? company.lowLiquidity,
    // Track if this company has live data from API
    hasLiveBalanceSheet: !!liveData,
    // Official mNAV from source (e.g., SharpLink's FD mNAV) - use instead of calculating
    officialMnav: liveData?.officialMnav,
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
 * Merge all companies with their overrides and live API data.
 */
export function mergeAllCompanies(
  companies: Company[],
  overrides: Record<string, CompanyOverride>,
  liveBalanceSheet: Record<string, LiveCompanyData> = {}
): Company[] {
  return companies.map((company) => mergeCompanyWithOverrides(company, overrides, liveBalanceSheet));
}
