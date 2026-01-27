"use client";

import { useQuery } from "@tanstack/react-query";
import { Company } from "@/lib/types";
import { CompanyOverride } from "@/app/api/company-overrides/route";
import { HOLDINGS_HISTORY } from "@/lib/data/holdings-history";
import { getCompanyByTicker } from "@/lib/data/companies";
import { dilutiveInstruments } from "@/lib/data/dilutive-instruments";

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

  // mNAV.com only tracks BTC treasury companies - don't use their data for ETH/other assets
  // Using their data for non-BTC companies causes incorrect holdings (e.g., BTBT shows 0 BTC instead of 155K ETH)
  // NOTE: MSTR excluded - we have comprehensive SEC XBRL data that is the gold standard
  const BTC_TREASURY_TICKERS = new Set([
    'MARA', 'RIOT', 'CLSK', 'SMLR', 'KULR', 'DJT', 'NAKA', 'ABTC',
    'XXI', 'ASST', '3350.T', '0434.HK', 'ALTBG', 'H100.ST',
  ]);

  // Add mNAV.com data (BTC companies only) - skip non-USD and non-BTC companies
  if (mnavQuery.data?.data) {
    for (const [ticker, data] of Object.entries(mnavQuery.data.data)) {
      // Skip non-USD companies to avoid currency mismatch in calculations
      if (NON_USD_TICKERS.includes(ticker)) {
        continue;
      }
      // Skip non-BTC companies - mNAV.com returns wrong data for ETH/SOL/etc companies
      if (!BTC_TREASURY_TICKERS.has(ticker)) {
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
    sourceUrl: undefined, // TODO: Add sharesSourceUrl to holdings-history entries
  };
}

/**
 * Get the latest diluted shares outstanding from holdings history.
 * Uses WeightedAverageNumberOfDilutedSharesOutstanding from SEC filings.
 */
function getLatestDilutedShares(ticker: string): number | undefined {
  const sharesInfo = getLatestSharesWithSource(ticker);
  return sharesInfo?.value;
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
  // Get diluted shares from holdings history with source info
  const sharesFromHistory = getLatestSharesWithSource(company.ticker);
  const sharesOutstandingFD = sharesFromHistory?.value;
  // Get static company data for fields not in database (like holdingsSourceUrl)
  const staticCompany = getCompanyByTicker(company.ticker);

  // Determine source for each mNAV component
  const today = new Date().toISOString().split('T')[0];

  // Shares source tracking
  // When dilutive instruments are defined, we use static basic shares (dilution calculated dynamically)
  let sharesSource: string | undefined;
  let sharesAsOf: string | undefined;
  let sharesSourceUrl: string | undefined;
  const hasDilutiveInstruments = !!dilutiveInstruments[company.ticker];
  if (hasDilutiveInstruments && staticCompany?.sharesForMnav) {
    // Use static shares for companies with dilutive instruments
    sharesSource = staticCompany.sharesSource || 'companies.ts (basic shares, dilution dynamic)';
    sharesAsOf = staticCompany.sharesAsOf;
    sharesSourceUrl = staticCompany.sharesSourceUrl;
  } else if (liveData?.fdShares) {
    sharesSource = liveData.source === 'mnav.com' ? 'mNAV.com' : liveData.source;
    sharesAsOf = liveData.lastUpdated?.split('T')[0] || today;
    sharesSourceUrl = liveData.source === 'mnav.com' ? 'https://mnav.com' : undefined;
  } else if (sharesFromHistory) {
    sharesSource = sharesFromHistory.source;
    sharesAsOf = sharesFromHistory.asOf;
    sharesSourceUrl = sharesFromHistory.sourceUrl;
  } else if (staticCompany?.sharesForMnav) {
    sharesSource = staticCompany.sharesSource || 'companies.ts';
    sharesAsOf = staticCompany.sharesAsOf;
    sharesSourceUrl = staticCompany.sharesSourceUrl;
  }

  // Debt source tracking
  let debtSource: string | undefined;
  let debtAsOf: string | undefined;
  let debtSourceUrl: string | undefined;
  if (liveData?.debt !== undefined) {
    debtSource = liveData.source === 'mnav.com' ? 'mNAV.com' : liveData.source;
    debtAsOf = liveData.lastUpdated?.split('T')[0] || today;
    debtSourceUrl = liveData.source === 'mnav.com' ? 'https://mnav.com' : undefined;
  } else if (staticCompany?.totalDebt) {
    debtSource = staticCompany.debtSource || 'companies.ts';
    debtAsOf = staticCompany.debtAsOf;
    debtSourceUrl = staticCompany.debtSourceUrl;
  }

  // Cash source tracking
  let cashSource: string | undefined;
  let cashAsOf: string | undefined;
  let cashSourceUrl: string | undefined;
  if (liveData?.cash !== undefined) {
    cashSource = liveData.source === 'mnav.com' ? 'mNAV.com' : liveData.source;
    cashAsOf = liveData.lastUpdated?.split('T')[0] || today;
    cashSourceUrl = liveData.source === 'mnav.com' ? 'https://mnav.com' : undefined;
  } else if (staticCompany?.cashReserves) {
    cashSource = staticCompany.cashSource || 'companies.ts';
    cashAsOf = staticCompany.cashAsOf;
    cashSourceUrl = staticCompany.cashSourceUrl;
  }

  // Preferred equity source tracking
  let preferredSource: string | undefined;
  let preferredAsOf: string | undefined;
  let preferredSourceUrl: string | undefined;
  if (liveData?.preferredEquity !== undefined) {
    preferredSource = liveData.source === 'mnav.com' ? 'mNAV.com' : liveData.source;
    preferredAsOf = liveData.lastUpdated?.split('T')[0] || today;
    preferredSourceUrl = liveData.source === 'mnav.com' ? 'https://mnav.com' : undefined;
  } else if (staticCompany?.preferredEquity) {
    preferredSource = staticCompany.preferredSource || 'companies.ts';
    preferredAsOf = staticCompany.preferredAsOf;
    preferredSourceUrl = staticCompany.preferredSourceUrl;
  }

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
    // For DAT companies, cash is not "excess" - it's committed to debt service, operations, or future crypto
    // restrictedCash = cashReserves means freeCash = 0, so cash doesn't reduce EV
    restrictedCash: staticCompany?.restrictedCash ?? company.restrictedCash,
    otherInvestments: staticCompany?.otherInvestments ?? company.otherInvestments,
    holdingsSourceUrl: company.holdingsSourceUrl ?? staticCompany?.holdingsSourceUrl,
    // Priority: Static (if dilutive instruments defined) > Live API > holdings-history.ts > static companies.ts
    // When we have dilutive instruments, use static sharesForMnav (basic shares) and calculate dilution dynamically
    // This avoids double-counting: API's fdShares includes all potential shares, but we track ITM status ourselves
    sharesForMnav: dilutiveInstruments[company.ticker]
      ? (staticCompany?.sharesForMnav ?? company.sharesForMnav)  // Use basic shares, dilution calculated in market-cap.ts
      : (liveData?.fdShares ?? sharesOutstandingFD ?? company.sharesForMnav ?? staticCompany?.sharesForMnav),
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
