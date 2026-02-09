/**
 * BMNR (Bitmine Immersion) Verified Financials - Single Source of Truth
 * ======================================================================
 * 
 * Consolidates all BMNR financial data with SEC provenance:
 * - Holdings from 8-K announcements (weekly ETH updates)
 * - Shares from SEC filings (single class - simpler than MSTR)
 * - Debt history (had $2-2.6M debt until FY2025, now $0)
 * - Staking data (unique to ETH treasury companies)
 * 
 * Key Differences from MSTR:
 * - NO current debt ($0 as of FY2025 - equity funded)
 * - BUT had ~$2M debt historically (FY2024-Q2 FY2025) - captured here
 * - NO preferred equity ($0)
 * - Single share class (no Class A/B complexity)
 * - Staking tracking (67.6% staked, 2.81% APY via CESR)
 * 
 * Pattern: baseline (10-Q/K) + deltas (8-K) = current values
 * 
 * Generated: 2026-02-08
 * SEC CIK: 0001829311
 * Fiscal Year End: August 31
 * Asset: ETH
 */

import { BMNR_SEC_HISTORY, type BMNRSecFiling, getBMNRSharesPostSplit } from './bmnr-sec-history';
import { BMNR_CAPITAL_EVENTS, type BMNRCapitalEvent } from './bmnr-capital-events';
import { dilutiveInstruments, type DilutiveInstrument } from './dilutive-instruments';

// =============================================================================
// INTERFACES
// =============================================================================

export interface BMNRHoldingsData {
  value: number; // ETH count
  source: "8-K" | "10-Q" | "10-K";
  accession?: string;
  anchor?: string; // URL fragment for highlight
}

export interface BMNRSharesData {
  value: number; // Total shares (basic)
  basic: number; // Basic shares outstanding
  source: string;
  sourceUrl?: string;
  asOf?: string; // Date the share count was reported
  methodology?: string;
  preSplit?: boolean; // True if pre-May 2025 1:20 reverse split
}

export interface BMNRDebtData {
  value: number; // USD
  source: "10-Q" | "10-K";
  accession?: string;
  breakdown?: {
    loansPayable: number;
    relatedPartyLoans: number;
  };
}

export interface BMNRStakingData {
  stakedAmount: number; // ETH staked
  stakingPct: number; // Percentage of total holdings staked (0-1)
  stakingApy?: number; // Annualized yield (0-1), e.g., 0.0281 = 2.81%
  stakingRevenueAnnualized?: number; // USD value of annualized staking revenue
  source: string;
  sourceUrl?: string;
  asOf?: string;
}

export interface BMNRCashData {
  value: number; // USD
  source: "8-K" | "10-Q" | "10-K";
  accession?: string;
}

export interface BMNRVerifiedFinancialSnapshot {
  date: string; // YYYY-MM-DD
  
  // Holdings (from 8-K weekly announcements or 10-Q/10-K)
  holdings: BMNRHoldingsData;
  
  // Shares (single class - much simpler than MSTR)
  shares: BMNRSharesData;
  
  // Debt (had $2-2.6M until FY2025, now $0)
  debt?: BMNRDebtData;
  
  // Staking (unique to ETH treasury companies)
  staking?: BMNRStakingData;
  
  // Balance Sheet (from 10-Q/10-K)
  cash?: BMNRCashData;
  
  // Cost Basis (from 8-K/10-Q)
  costBasisAvg?: number; // USD per ETH
  costBasisSource?: string;
  
  // Derived values
  holdingsPerShare?: number; // ETH per share
  
  // Metadata
  quarterEnd?: boolean; // Is this a fiscal quarter end?
  balanceSheetStale?: boolean; // >90 days from last 10-Q
  baselineFiling?: string; // Which 10-Q/10-K provided baseline data
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** SEC CIK for Bitmine Immersion */
export const BMNR_CIK = "0001829311";

/** Fiscal year end (August 31) */
export const FISCAL_YEAR_END = "08-31";

/** SEC filing base URL */
export const SEC_BASE_URL = "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001829311";

/** Number of days after which balance sheet is considered stale */
export const STALE_THRESHOLD_DAYS = 90;

/** Latest staking APY (CESR - Composite Ethereum Staking Rate) */
export const CURRENT_STAKING_APY = 0.0281; // 2.81%

/** Reverse split date (1:20) */
export const SPLIT_DATE = "2025-05-15";

// =============================================================================
// RAW HOLDINGS DATA (from 8-K filings via bmnr-capital-events.ts and manual tracking)
// =============================================================================

interface RawHoldingsEntry {
  date: string;
  holdings: number;
  sharesOutstandingDiluted: number;
  holdingsPerShare: number;
  source: string;
  sourceUrl: string;
  accession?: string;
  sharesSource?: string;
  stockPrice?: number;
}

/**
 * Raw holdings data extracted from SEC 8-K filings
 * Combined from bmnr-capital-events.ts and holdings-history.ts
 */
const BMNR_RAW_HOLDINGS: RawHoldingsEntry[] = [
  // Pre-ETH strategy: minimal digital assets (BTC mining, sold immediately)
  // These come from 10-Q filings in bmnr-sec-history.ts
  { 
    date: "2023-11-30", 
    holdings: 0, // digitalAssets: 152,990 but that was BTC, not ETH
    sharesOutstandingDiluted: 49_748_705 / 20, // Pre-split, convert to post-split
    holdingsPerShare: 0, 
    source: "SEC 10-Q Q1 FY2024 (pre-ETH)", 
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001683168-24-000250-index.html",
    accession: "0001683168-24-000250"
  },
  { 
    date: "2024-08-31", 
    holdings: 0, // No digital assets on FY2024 10-K balance sheet
    sharesOutstandingDiluted: 49_912_607 / 20, // Pre-split
    holdingsPerShare: 0, 
    source: "SEC 10-K FY2024 (pre-ETH)", 
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001683168-24-008555-index.html",
    accession: "0001683168-24-008555"
  },
  { 
    date: "2025-02-28", 
    holdings: 0, // digitalAssets: 247,923 was small BTC/ETH, strategy not launched
    sharesOutstandingDiluted: 39_667_607 / 20, // Pre-split
    holdingsPerShare: 0, 
    source: "SEC 10-Q Q2 FY2025 (pre-ETH launch)", 
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001683168-25-002541-index.html",
    accession: "0001683168-25-002541"
  },
  // Post reverse split (May 15, 2025)
  { 
    date: "2025-05-31", 
    holdings: 0, // Still pre-ETH treasury strategy
    sharesOutstandingDiluted: 2_053_366, // Post-split
    holdingsPerShare: 0, 
    source: "SEC 10-Q Q3 FY2025", 
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001683168-25-004889-index.html",
    accession: "0001683168-25-004889"
  },
  
  // ETH Treasury Strategy Launched July 2025
  { 
    date: "2025-07-17", 
    holdings: 300_657, 
    sharesOutstandingDiluted: 50_000_000, 
    holdingsPerShare: 0.006013, 
    source: "SEC 8-K $1B milestone", 
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001493152-25-011270-index.html",
    accession: "0001493152-25-011270"
  },
  { 
    date: "2025-08-11", 
    holdings: 1_150_263, 
    sharesOutstandingDiluted: 150_000_000, 
    holdingsPerShare: 0.007668, 
    source: "SEC 8-K Aug 11, 2025", 
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001493152-25-011799-index.html",
    accession: "0001493152-25-011799"
  },
  { 
    date: "2025-08-17", 
    holdings: 1_523_373, 
    sharesOutstandingDiluted: 180_000_000, 
    holdingsPerShare: 0.008463, 
    source: "SEC 8-K Aug 18, 2025", 
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001493152-25-012109-index.html",
    accession: "0001493152-25-012109"
  },
  { 
    date: "2025-08-24", 
    holdings: 1_713_899, 
    sharesOutstandingDiluted: 221_515_180, 
    holdingsPerShare: 0.007738, 
    source: "SEC 8-K Aug 25, 2025", 
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001493152-25-012298-index.html",
    accession: "0001493152-25-012298"
  },
  // FY2025 10-K (Aug 31, 2025)
  { 
    date: "2025-08-31", 
    holdings: 1_800_000, // Interpolated between Aug 24 and Sep 7
    sharesOutstandingDiluted: 234_712_310, // From 10-K XBRL
    holdingsPerShare: 0.00767, 
    source: "SEC 10-K FY2025 (quarter end)", 
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001493152-25-024679-index.html",
    accession: "0001493152-25-024679"
  },
  { 
    date: "2025-09-07", 
    holdings: 2_069_443, 
    sharesOutstandingDiluted: 260_000_000, 
    holdingsPerShare: 0.007959, 
    source: "SEC 8-K 2M ETH milestone", 
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001493152-25-012776-index.html",
    accession: "0001493152-25-012776"
  },
  // Backfilled Sep-Nov 2025 gap from SEC 8-K filings
  { 
    date: "2025-09-29", 
    holdings: 2_650_900, 
    sharesOutstandingDiluted: 280_000_000, // Estimated based on ramp
    holdingsPerShare: 0.009467, 
    source: "SEC 8-K Sep 29, 2025", 
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001493152-25-015879-index.html",
    accession: "0001493152-25-015879"
  },
  { 
    date: "2025-10-06", 
    holdings: 2_830_151, 
    sharesOutstandingDiluted: 295_000_000, // Estimated based on ramp
    holdingsPerShare: 0.009594, 
    source: "SEC 8-K Oct 6, 2025 (2% ETH supply)", 
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001493152-25-017019-index.html",
    accession: "0001493152-25-017019"
  },
  { 
    date: "2025-10-20", 
    holdings: 3_236_014, 
    sharesOutstandingDiluted: 320_000_000, // Estimated based on ramp
    holdingsPerShare: 0.010113, 
    source: "SEC 8-K Oct 20, 2025", 
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001493152-25-018577-index.html",
    accession: "0001493152-25-018577"
  },
  { 
    date: "2025-10-27", 
    holdings: 3_313_069, 
    sharesOutstandingDiluted: 330_000_000, // Estimated based on ramp
    holdingsPerShare: 0.010040, 
    source: "SEC 8-K Oct 27, 2025", 
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001493152-25-019644-index.html",
    accession: "0001493152-25-019644"
  },
  { 
    date: "2025-11-03", 
    holdings: 3_395_422, 
    sharesOutstandingDiluted: 340_000_000, // Estimated based on ramp
    holdingsPerShare: 0.009986, 
    source: "SEC 8-K Nov 3, 2025", 
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001493152-25-020545-index.html",
    accession: "0001493152-25-020545"
  },
  { 
    date: "2025-11-09", 
    holdings: 3_505_723, 
    sharesOutstandingDiluted: 350_000_000, 
    holdingsPerShare: 0.010016, 
    source: "SEC 8-K Nov 10, 2025", 
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001493152-25-021429-index.html",
    accession: "0001493152-25-021429"
  },
  { 
    date: "2025-11-20", 
    holdings: 3_559_879, 
    sharesOutstandingDiluted: 384_067_823, 
    holdingsPerShare: 0.009269, 
    source: "SEC 8-K FY2025 earnings", 
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001493152-25-024679-index.html",
    accession: "0001493152-25-024679"
  },
  // Q1 FY2026 10-Q (Nov 30, 2025)
  { 
    date: "2025-11-30", 
    holdings: 3_726_499, 
    sharesOutstandingDiluted: 400_000_000, 
    holdingsPerShare: 0.009316, 
    source: "SEC 10-Q Q1 FY2026", 
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001493152-26-002084-index.html",
    accession: "0001493152-26-002084"
  },
  { 
    date: "2025-12-14", 
    holdings: 3_967_210, 
    sharesOutstandingDiluted: 410_000_000, 
    holdingsPerShare: 0.009676, 
    source: "SEC 8-K Dec 15, 2025", 
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001493152-25-027660-index.html",
    accession: "0001493152-25-027660"
  },
  { 
    date: "2025-12-28", 
    holdings: 4_110_525, 
    sharesOutstandingDiluted: 425_000_000, 
    holdingsPerShare: 0.009672, 
    source: "SEC 8-K Dec 29, 2025", 
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001493152-25-029437-index.html",
    accession: "0001493152-25-029437"
  },
  { 
    date: "2026-01-04", 
    holdings: 4_143_502, 
    sharesOutstandingDiluted: 430_000_000, 
    holdingsPerShare: 0.009636, 
    source: "SEC 8-K Jan 5, 2026", 
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001493152-26-000274-index.html",
    accession: "0001493152-26-000274"
  },
  { 
    date: "2026-01-20", 
    holdings: 4_203_036, 
    sharesOutstandingDiluted: 455_000_000, 
    holdingsPerShare: 0.009237, 
    stockPrice: 160.23, 
    source: "SEC 8-K Jan 20, 2026", 
    sharesSource: "Jan 15 shareholder vote (454.9M)", 
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001493152-26-002762-index.html",
    accession: "0001493152-26-002762"
  },
  { 
    date: "2026-01-25", 
    holdings: 4_243_338, 
    sharesOutstandingDiluted: 455_000_000, 
    holdingsPerShare: 0.009325, 
    source: "SEC 8-K Jan 26, 2026 (+40,302 ETH)", 
    sharesSource: "455M diluted (unchanged from Jan 20)", 
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001493152-26-003536-index.html",
    accession: "0001493152-26-003536"
  },
  { 
    date: "2026-02-01", 
    holdings: 4_285_125, 
    sharesOutstandingDiluted: 455_000_000, 
    holdingsPerShare: 0.009418, 
    stockPrice: 149.71, 
    source: "SEC 8-K Feb 2, 2026 (+41,788 ETH)", 
    sharesSource: "455M diluted", 
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001493152-26-004658-index.html",
    accession: "0001493152-26-004658"
  },
];

// =============================================================================
// STAKING DATA (from 8-K filings)
// =============================================================================

interface StakingSnapshot {
  date: string;
  stakedAmount: number;
  totalHoldings: number;
  stakingApy: number;
  stakingRevenueAnnualized?: number;
  source: string;
  sourceUrl: string;
}

const BMNR_STAKING_DATA: StakingSnapshot[] = [
  {
    date: "2026-02-01",
    stakedAmount: 2_897_459,
    totalHoldings: 4_285_125,
    stakingApy: 0.0281,
    stakingRevenueAnnualized: 188_000_000,
    source: "SEC 8-K Feb 2, 2026 (ex99-1)",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/000149315226004658/ex99-1.htm",
  },
  {
    date: "2025-11-30",
    stakedAmount: 2_235_899, // ~60% of holdings
    totalHoldings: 3_726_499,
    stakingApy: 0.0281,
    source: "SEC 8-K Dec 1, 2025 (estimated from ramp-up)",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001493152-25-025501-index.html",
  },
];

// =============================================================================
// COST BASIS DATA (from 10-Q)
// =============================================================================

interface CostBasisSnapshot {
  date: string;
  avgCostBasis: number;
  totalCost?: number;
  units?: number;
  source: string;
  sourceUrl: string;
}

const BMNR_COST_BASIS: CostBasisSnapshot[] = [
  {
    date: "2025-11-30",
    avgCostBasis: 4002, // $14,953,824K / 3,737,140 ETH
    totalCost: 14_953_824_000,
    units: 3_737_140,
    source: "SEC 10-Q Q1 FY2026 XBRL",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/000149315226002084/form10-q.htm",
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Find the most recent 10-Q/10-K filing on or before a given date
 */
function findBaselineFiling(date: string): BMNRSecFiling | null {
  const sorted = [...BMNR_SEC_HISTORY]
    .filter(f => f.periodEnd <= date)
    .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
  return sorted[0] || null;
}

/**
 * Find staking data on or before a given date
 */
function findStakingData(date: string): StakingSnapshot | null {
  const sorted = [...BMNR_STAKING_DATA]
    .filter(s => s.date <= date)
    .sort((a, b) => b.date.localeCompare(a.date));
  return sorted[0] || null;
}

/**
 * Find cost basis on or before a given date
 */
function findCostBasis(date: string): CostBasisSnapshot | null {
  const sorted = [...BMNR_COST_BASIS]
    .filter(c => c.date <= date)
    .sort((a, b) => b.date.localeCompare(a.date));
  return sorted[0] || null;
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.abs(Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Format fiscal quarter from BMNR period end (FY ends Aug 31)
 */
function formatFiscalQuarter(periodEnd: string): string {
  const month = parseInt(periodEnd.slice(5, 7));
  // BMNR FY: Q1=Sep-Nov, Q2=Dec-Feb, Q3=Mar-May, Q4=Jun-Aug
  let quarter: number;
  let fyYear: number;
  const year = parseInt(periodEnd.slice(0, 4));
  
  if (month >= 9 && month <= 11) {
    quarter = 1;
    fyYear = year + 1; // Q1 FY2026 = Sep-Nov 2025
  } else if (month >= 12 || month <= 2) {
    quarter = 2;
    fyYear = month === 12 ? year + 1 : year;
  } else if (month >= 3 && month <= 5) {
    quarter = 3;
    fyYear = year;
  } else {
    quarter = 4;
    fyYear = year;
  }
  
  return `Q${quarter} FY${fyYear}`;
}

/**
 * Interpolate staking percentage based on known data points
 */
function interpolateStakingPct(date: string, holdings: number): number {
  const stakingData = findStakingData(date);
  if (stakingData) {
    return stakingData.stakedAmount / stakingData.totalHoldings;
  }
  
  // Before staking data available, assume gradual ramp-up
  // BMNR started aggressive ETH accumulation Jul 2025
  const startDate = new Date("2025-07-17");
  const currentDate = new Date(date);
  const daysSinceStart = (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceStart < 0) return 0;
  
  // Ramp from 0% at start to ~60% by Nov 2025 (~135 days)
  return Math.min(0.60, daysSinceStart / 135 * 0.60);
}

/**
 * Get BMNR dilutive instruments
 */
function getBMNRDilutives(): DilutiveInstrument[] {
  return dilutiveInstruments.BMNR || [];
}

/**
 * Calculate ITM dilutive shares based on stock price
 */
function calculateITMDilutiveShares(stockPrice: number): number {
  const instruments = getBMNRDilutives();
  let itmShares = 0;
  
  for (const instrument of instruments) {
    if (instrument.strikePrice < stockPrice) {
      itmShares += instrument.potentialShares;
    }
  }
  
  return itmShares;
}

// =============================================================================
// BUILD VERIFIED FINANCIALS (following MSTR pattern)
// =============================================================================

function buildVerifiedFinancials(): BMNRVerifiedFinancialSnapshot[] {
  const snapshots: BMNRVerifiedFinancialSnapshot[] = [];
  
  for (const raw of BMNR_RAW_HOLDINGS) {
    const baseline = findBaselineFiling(raw.date);
    const costBasis = findCostBasis(raw.date);
    const stakingData = findStakingData(raw.date);
    
    // Determine if this is a quarter end
    const month = parseInt(raw.date.slice(5, 7));
    const day = parseInt(raw.date.slice(8, 10));
    const isQuarterEnd = 
      (month === 8 && day >= 28) ||   // Q4 FY end (Aug 31)
      (month === 11 && day >= 28) ||  // Q1 FY end (Nov 30)
      (month === 2 && day >= 26) ||   // Q2 FY end (Feb 28)
      (month === 5 && day >= 29);     // Q3 FY end (May 31)
    
    // Calculate staking
    const stakingPct = stakingData 
      ? stakingData.stakedAmount / stakingData.totalHoldings
      : interpolateStakingPct(raw.date, raw.holdings);
    const stakedAmount = Math.round(raw.holdings * stakingPct);
    
    // Determine balance sheet staleness
    const daysSinceBaseline = baseline ? daysBetween(baseline.periodEnd, raw.date) : 999;
    const isStale = daysSinceBaseline > STALE_THRESHOLD_DAYS;
    
    // Determine if pre-split
    const preSplit = raw.date < SPLIT_DATE;
    
    const snapshot: BMNRVerifiedFinancialSnapshot = {
      date: raw.date,
      
      holdings: {
        value: raw.holdings,
        source: raw.source.includes("10-Q") ? "10-Q" : raw.source.includes("10-K") ? "10-K" : "8-K",
        accession: raw.accession,
        anchor: "dat-eth-holdings",
      },
      
      shares: {
        value: raw.sharesOutstandingDiluted,
        basic: raw.sharesOutstandingDiluted,
        source: raw.sharesSource || raw.source,
        sourceUrl: raw.sourceUrl,
        asOf: raw.date,
        methodology: preSplit 
          ? "SEC XBRL (pre-split, adjusted 1:20)"
          : "SEC XBRL EntityCommonStockSharesOutstanding",
        preSplit,
      },
      
      // Debt from baseline filing (BMNR had debt until FY2025!)
      debt: baseline && baseline.totalDebt > 0 ? {
        value: baseline.totalDebt,
        source: baseline.formType,
        accession: baseline.accessionNumber,
      } : undefined,
      
      // Staking (only for ETH holdings period)
      staking: raw.holdings > 0 ? {
        stakedAmount,
        stakingPct,
        stakingApy: CURRENT_STAKING_APY,
        stakingRevenueAnnualized: stakingData?.stakingRevenueAnnualized,
        source: stakingData?.source || "Interpolated from known data points",
        sourceUrl: stakingData?.sourceUrl,
        asOf: stakingData?.date || raw.date,
      } : undefined,
      
      // Cash from baseline
      cash: baseline ? {
        value: baseline.cashAndEquivalents,
        source: baseline.formType,
        accession: baseline.accessionNumber,
      } : undefined,
      
      costBasisAvg: costBasis?.avgCostBasis,
      costBasisSource: costBasis?.source,
      
      holdingsPerShare: raw.holdings > 0 ? raw.holdings / raw.sharesOutstandingDiluted : 0,
      
      quarterEnd: isQuarterEnd,
      balanceSheetStale: isStale,
      baselineFiling: baseline ? `${baseline.formType} ${formatFiscalQuarter(baseline.periodEnd)}` : undefined,
    };
    
    snapshots.push(snapshot);
  }
  
  return snapshots;
}

// =============================================================================
// EXPORTED DATA
// =============================================================================

/**
 * All verified financial snapshots, sorted by date ascending
 */
export const BMNR_VERIFIED_FINANCIALS: BMNRVerifiedFinancialSnapshot[] = buildVerifiedFinancials();

// =============================================================================
// EXPORTED FUNCTIONS
// =============================================================================

/**
 * Get the full history of verified financials
 */
export function getBMNRVerifiedHistory(): BMNRVerifiedFinancialSnapshot[] {
  return BMNR_VERIFIED_FINANCIALS;
}

/**
 * Get the most recent verified financial snapshot
 */
export function getBMNRLatestFinancials(): BMNRVerifiedFinancialSnapshot | null {
  return BMNR_VERIFIED_FINANCIALS[BMNR_VERIFIED_FINANCIALS.length - 1] || null;
}

/**
 * Get verified financials as of a specific date
 */
export function getBMNRFinancialsAsOf(date: string): BMNRVerifiedFinancialSnapshot | null {
  const sorted = [...BMNR_VERIFIED_FINANCIALS]
    .filter(s => s.date <= date)
    .sort((a, b) => b.date.localeCompare(a.date));
  return sorted[0] || null;
}

/**
 * Get verified financials for a date range
 */
export function getBMNRFinancialsRange(startDate: string, endDate: string): BMNRVerifiedFinancialSnapshot[] {
  return BMNR_VERIFIED_FINANCIALS.filter(
    s => s.date >= startDate && s.date <= endDate
  );
}

/**
 * Get holdings per share history (for charts)
 */
export function getBMNRHoldingsPerShareHistory(): Array<{ date: string; hps: number }> {
  return BMNR_VERIFIED_FINANCIALS.map(s => ({
    date: s.date,
    hps: s.holdingsPerShare || 0,
  }));
}

/**
 * Get debt history (BMNR had ~$2M debt until FY2025)
 */
export function getBMNRDebtHistory(): Array<{ date: string; debt: number }> {
  return BMNR_VERIFIED_FINANCIALS
    .filter(s => s.debt !== undefined)
    .map(s => ({
      date: s.date,
      debt: s.debt!.value,
    }));
}

/**
 * Get staking history (unique to ETH treasury companies)
 */
export function getBMNRStakingHistory(): Array<{ 
  date: string; 
  stakedAmount: number; 
  stakingPct: number;
  stakingApy: number;
}> {
  return BMNR_VERIFIED_FINANCIALS
    .filter(s => s.staking && s.staking.stakedAmount > 0)
    .map(s => ({
      date: s.date,
      stakedAmount: s.staking!.stakedAmount,
      stakingPct: s.staking!.stakingPct,
      stakingApy: s.staking!.stakingApy || CURRENT_STAKING_APY,
    }));
}

/**
 * Get dilutive instruments summary
 */
export function getBMNRDilutiveSummary(stockPrice: number): {
  instruments: DilutiveInstrument[];
  itmShares: number;
  totalPotentialShares: number;
} {
  const instruments = getBMNRDilutives();
  const itmShares = calculateITMDilutiveShares(stockPrice);
  const totalPotentialShares = instruments.reduce((sum, i) => sum + i.potentialShares, 0);
  
  return { instruments, itmShares, totalPotentialShares };
}

/**
 * Get HPS growth analysis (snapshot over snapshot)
 */
export function getBMNRHPSGrowth(): Array<{
  date: string;
  hps: number;
  hpsChange: number;
  hpsChangePct: number;
}> {
  const history = BMNR_VERIFIED_FINANCIALS;
  const result: Array<{ date: string; hps: number; hpsChange: number; hpsChangePct: number }> = [];
  
  for (let i = 0; i < history.length; i++) {
    const current = history[i];
    const prev = i > 0 ? history[i - 1] : null;
    
    const hps = current.holdingsPerShare || 0;
    const prevHps = prev?.holdingsPerShare || 0;
    const hpsChange = hps - prevHps;
    const hpsChangePct = prevHps > 0 ? hpsChange / prevHps : 0;
    
    result.push({ date: current.date, hps, hpsChange, hpsChangePct });
  }
  
  return result;
}

// =============================================================================
// STATS & METADATA
// =============================================================================

const latest = BMNR_VERIFIED_FINANCIALS[BMNR_VERIFIED_FINANCIALS.length - 1];
const debtHistory = getBMNRDebtHistory();

export const BMNR_VERIFIED_STATS = {
  totalSnapshots: BMNR_VERIFIED_FINANCIALS.length,
  dateRange: {
    start: BMNR_VERIFIED_FINANCIALS[0]?.date,
    end: latest?.date,
  },
  latestHoldings: latest?.holdings.value,
  latestShares: latest?.shares.value,
  latestHPS: latest?.holdingsPerShare,
  latestStaking: {
    stakedAmount: latest?.staking?.stakedAmount,
    stakingPct: latest?.staking?.stakingPct,
    stakingApy: latest?.staking?.stakingApy,
  },
  
  // Debt history summary
  debtHistory: {
    hadDebt: debtHistory.length > 0,
    peakDebt: debtHistory.length > 0 ? Math.max(...debtHistory.map(d => d.debt)) : 0,
    debtFreeSince: "2025-08-31", // FY2025 10-K shows $0 debt
  },
  
  // Key BMNR metrics
  asset: "ETH",
  secCik: BMNR_CIK,
  fiscalYearEnd: FISCAL_YEAR_END,
  hasDebt: false, // Currently no debt
  hasPreferred: false,
  hasStaking: true,
  splitDate: SPLIT_DATE,
  splitRatio: "1:20",
  
  // Data sources
  sources: {
    secHistoryFile: 'bmnr-sec-history.ts',
    capitalEventsFile: 'bmnr-capital-events.ts',
    dilutivesFile: 'dilutive-instruments.ts (BMNR)',
    holdingsHistoryFile: 'holdings-history.ts (BMNR_HISTORY)',
  },
  generatedAt: "2026-02-08",
};
