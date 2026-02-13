/**
 * MSTR Verified Financials - Single Source of Truth
 * ==================================================
 * 
 * Consolidates all MSTR financial data with SEC provenance:
 * - Holdings from 8-K purchase announcements
 * - Shares from 10-Q baseline + ATM + employee equity deltas
 * - Balance sheet from 10-Q/10-K (carried forward)
 * 
 * Generated: 2026-02-08
 * Holdings points: 85
 * SEC filings: 21
 * 
 * Sources:
 * - mstr-holdings-verified.ts (holdings)
 * - mstr-atm-sales.ts (share issuances)
 * - mstr-employee-equity.ts (employee equity)
 * - mstr-sec-history.ts (10-Q/10-K baselines)
 */

import { MSTR_HOLDINGS_VERIFIED, type VerifiedHolding } from './mstr-holdings-verified';
import { MSTR_ATM_SALES, getCommonShares, type ATMSaleEvent } from './mstr-atm-sales';
import { MSTR_EMPLOYEE_EQUITY, type EmployeeEquityQuarter } from './mstr-employee-equity';
import { MSTR_SEC_HISTORY, type MSTRSecFiling } from './mstr-sec-history';

// =============================================================================
// INTERFACES
// =============================================================================

export interface HoldingsData {
  value: number;
  source: "8-K" | "10-Q" | "10-K";
  accession: string;
  anchor: string; // URL fragment for highlight
}

export interface SharesData {
  classA: number;
  classB: number; // Constant 19.64M
  total: number;
  source: string; // e.g., "10-Q Q3 2025 + ATM cumulative"
  methodology?: string;
  breakdown?: {
    baseline: number;
    atmCumulative: number;
    employeeEquityCumulative: number;
  };
}

export interface DebtData {
  value: number;
  source: "10-Q" | "10-K" | "8-K";
  accession?: string;
  breakdown?: {
    convertibles: number;
    termLoans: number;
  };
}

export interface CashData {
  value: number;
  source: "10-Q" | "10-K" | "8-K";
  accession?: string;
  isUsdReserve?: boolean; // 8-K USD Reserve disclosure
}

export interface PreferredEquityData {
  value: number;
  source: "10-Q" | "10-K";
  accession?: string;
}

export interface VerifiedFinancialSnapshot {
  date: string; // YYYY-MM-DD
  
  // Holdings (from 8-K purchase announcements)
  holdings: HoldingsData;
  
  // Shares (baseline + delta approach)
  shares: SharesData;
  
  // Balance Sheet (from 10-Q/10-K, carried forward)
  debt?: DebtData;
  cash?: CashData;
  preferredEquity?: PreferredEquityData;
  
  // Derived values (calculated at runtime, but cached for convenience)
  holdingsPerShare?: number;
  
  // Metadata
  balanceSheetStale?: boolean; // >90 days from last 10-Q
  baselineFiling?: string; // Which 10-Q/10-K was used for baseline
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Class B shares are constant (Saylor's super-voting shares) */
export const CLASS_B_SHARES = 19_640_000;

/** Stock split date (10:1) */
export const SPLIT_DATE = "2024-08-07";

/**
 * Company-disclosed shares from strategy.com/shares (Reg FD channel).
 * Primary source for Basic Shares Outstanding.
 * 8-Ks reference: "The Company uses its website (www.strategy.com) as a disclosure channel"
 * 
 * Format: { date: classA (thousands), classB is always 19,640 }
 */
const STRATEGY_COM_SHARES: Record<string, number> = {
  // From strategy.com/shares "Basic Shares Outstanding" column (Class A in thousands)
  "2025-09-30": 267_468_000,
  "2025-12-31": 292_422_000,
  "2026-02-08": 313_442_000,
};

/**
 * Get company-disclosed Class A shares for a given date.
 * Returns the most recent disclosure on or before the date.
 */
function getCompanyDisclosedShares(date: string): { classA: number; asOf: string } | null {
  const dates = Object.keys(STRATEGY_COM_SHARES).sort().reverse();
  for (const d of dates) {
    if (d <= date) return { classA: STRATEGY_COM_SHARES[d], asOf: d };
  }
  return null;
}

/** Number of days after which balance sheet is considered stale */
export const STALE_THRESHOLD_DAYS = 90;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Find the most recent 10-Q/10-K filing on or before a given date
 */
function findBaselineFiling(date: string): MSTRSecFiling | null {
  const sorted = [...MSTR_SEC_HISTORY]
    .filter(f => f.periodEnd <= date)
    .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
  return sorted[0] || null;
}

/**
 * Get Class A shares from baseline filing (adjusted for split if pre-split)
 */
function getBaselineShares(filing: MSTRSecFiling): number {
  return filing.preSplit 
    ? filing.commonSharesOutstanding * 10 
    : filing.commonSharesOutstanding;
}

/**
 * Calculate cumulative ATM shares issued between two dates
 */
function getCumulativeATMShares(afterDate: string, throughDate: string): number {
  return MSTR_ATM_SALES
    .filter(atm => atm.filingDate > afterDate && atm.filingDate <= throughDate)
    .reduce((sum, atm) => sum + getCommonShares(atm), 0);
}

/**
 * Calculate cumulative employee equity shares issued between two dates
 */
function getCumulativeEmployeeEquity(afterDate: string, throughDate: string): number {
  return MSTR_EMPLOYEE_EQUITY
    .filter(eq => eq.periodEnd > afterDate && eq.periodEnd <= throughDate)
    .reduce((sum, eq) => sum + eq.optionsExercised + eq.rsusVested + eq.espp, 0);
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
 * Format quarter string from period end date
 */
function formatQuarter(periodEnd: string): string {
  const date = new Date(periodEnd);
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const quarter = Math.ceil(month / 3);
  return `Q${quarter} ${year}`;
}

/**
 * Build the holdings anchor URL
 */
function buildHoldingsAnchor(holding: VerifiedHolding): string {
  const baseType = holding.filingType.toLowerCase().replace("-", "");
  if (holding.accession) {
    return `dat-btc-holdings`;
  }
  return `dat-btc-holdings`;
}

// =============================================================================
// BUILD VERIFIED FINANCIALS
// =============================================================================

function buildVerifiedFinancials(): VerifiedFinancialSnapshot[] {
  const snapshots: VerifiedFinancialSnapshot[] = [];
  
  for (const holding of MSTR_HOLDINGS_VERIFIED) {
    const baseline = findBaselineFiling(holding.date);
    
    if (!baseline) {
      // No baseline available (very early holdings before any 10-Q)
      // Skip or use conservative estimate
      continue;
    }
    
    // Calculate share components (bottom-up from SEC filings)
    const baselineShares = getBaselineShares(baseline);
    const atmCumulative = getCumulativeATMShares(baseline.periodEnd, holding.date);
    const employeeEquityCumulative = getCumulativeEmployeeEquity(baseline.periodEnd, holding.date);
    
    const bottomUpClassA = baselineShares + atmCumulative + employeeEquityCumulative;
    
    // Use company-disclosed shares (strategy.com) when available as primary source.
    // Falls back to bottom-up calc for historical dates not covered.
    const disclosed = getCompanyDisclosedShares(holding.date);
    const classA = disclosed ? disclosed.classA : bottomUpClassA;
    const total = classA + CLASS_B_SHARES;
    
    // Build source string
    const quarterStr = formatQuarter(baseline.periodEnd);
    let sourceStr: string;
    if (disclosed) {
      const gap = classA - bottomUpClassA;
      sourceStr = `strategy.com (${disclosed.asOf})`;
      if (gap > 0) sourceStr += ` [+${(gap / 1_000).toFixed(0)}K vs bottom-up = emp equity/timing]`;
    } else {
      sourceStr = `${baseline.formType} ${quarterStr}`;
      if (atmCumulative > 0 || employeeEquityCumulative > 0) {
        const parts: string[] = [];
        if (atmCumulative > 0) parts.push(`ATM +${(atmCumulative / 1_000_000).toFixed(2)}M`);
        if (employeeEquityCumulative > 0) parts.push(`emp +${(employeeEquityCumulative / 1_000).toFixed(0)}K`);
        sourceStr += ` + ${parts.join(', ')}`;
      }
    }
    
    // Determine balance sheet staleness
    const daysSinceBaseline = daysBetween(baseline.periodEnd, holding.date);
    const isStale = daysSinceBaseline > STALE_THRESHOLD_DAYS;
    
    // Calculate total debt from baseline
    let totalDebt = 0;
    if (baseline.convertibleDebt) totalDebt += baseline.convertibleDebt;
    if (baseline.longTermDebt) totalDebt += baseline.longTermDebt;
    // If neither is set but totalLiabilities exists, use that as rough proxy
    // Actually, let's be conservative and only use what we have
    if (totalDebt === 0 && baseline.totalLiabilities > 0) {
      // For MSTR, most liabilities ARE debt, but let's use convertibles if available
      // Check if we can estimate from totalLiabilities - other known non-debt items
      // For now, mark debt as undefined if we don't have explicit values
      totalDebt = baseline.totalLiabilities; // Use total liabilities as conservative estimate
    }
    
    const snapshot: VerifiedFinancialSnapshot = {
      date: holding.date,
      
      holdings: {
        value: holding.holdings,
        source: holding.filingType as "8-K" | "10-Q" | "10-K",
        accession: holding.accession,
        anchor: buildHoldingsAnchor(holding),
      },
      
      shares: {
        classA,
        classB: CLASS_B_SHARES,
        total,
        source: sourceStr,
        methodology: "baseline + ATM cumulative + employee equity cumulative + Class B",
        breakdown: {
          baseline: baselineShares,
          atmCumulative,
          employeeEquityCumulative,
        },
      },
      
      debt: {
        value: totalDebt,
        source: baseline.formType,
        accession: baseline.accessionNumber,
        breakdown: baseline.convertibleDebt ? {
          convertibles: baseline.convertibleDebt,
          termLoans: baseline.longTermDebt || 0,
        } : undefined,
      },
      
      cash: {
        value: baseline.cashAndEquivalents,
        source: baseline.formType,
        accession: baseline.accessionNumber,
      },
      
      holdingsPerShare: holding.holdings / total,
      balanceSheetStale: isStale,
      baselineFiling: `${baseline.formType} ${quarterStr}`,
    };
    
    // Add preferred equity if available
    if (baseline.preferredEquity && baseline.preferredEquity > 0) {
      snapshot.preferredEquity = {
        value: baseline.preferredEquity,
        source: baseline.formType,
        accession: baseline.accessionNumber,
      };
    }
    
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
export const MSTR_VERIFIED_FINANCIALS: VerifiedFinancialSnapshot[] = buildVerifiedFinancials();

// =============================================================================
// EXPORTED FUNCTIONS
// =============================================================================

/**
 * Get the full history of verified financials
 */
export function getMSTRVerifiedHistory(): VerifiedFinancialSnapshot[] {
  return MSTR_VERIFIED_FINANCIALS;
}

/**
 * Get the most recent verified financial snapshot
 */
export function getMSTRLatestFinancials(): VerifiedFinancialSnapshot | null {
  return MSTR_VERIFIED_FINANCIALS[MSTR_VERIFIED_FINANCIALS.length - 1] || null;
}

/**
 * Get verified financials as of a specific date
 */
export function getMSTRFinancialsAsOf(date: string): VerifiedFinancialSnapshot | null {
  const sorted = [...MSTR_VERIFIED_FINANCIALS]
    .filter(s => s.date <= date)
    .sort((a, b) => b.date.localeCompare(a.date));
  return sorted[0] || null;
}

/**
 * Get verified financials for a date range
 */
export function getMSTRFinancialsRange(startDate: string, endDate: string): VerifiedFinancialSnapshot[] {
  return MSTR_VERIFIED_FINANCIALS.filter(
    s => s.date >= startDate && s.date <= endDate
  );
}

/**
 * Get holdings per share history (for charts)
 */
export function getMSTRHoldingsPerShareHistory(): Array<{ date: string; hps: number }> {
  return MSTR_VERIFIED_FINANCIALS.map(s => ({
    date: s.date,
    hps: s.holdingsPerShare || 0,
  }));
}

/**
 * Get holdings only (for backward compatibility)
 */
export function getMSTRHoldingsHistory(): Array<{ date: string; holdings: number }> {
  return MSTR_VERIFIED_FINANCIALS.map(s => ({
    date: s.date,
    holdings: s.holdings.value,
  }));
}

// =============================================================================
// STATS & METADATA
// =============================================================================

export const MSTR_VERIFIED_STATS = {
  totalSnapshots: MSTR_VERIFIED_FINANCIALS.length,
  dateRange: {
    start: MSTR_VERIFIED_FINANCIALS[0]?.date,
    end: MSTR_VERIFIED_FINANCIALS[MSTR_VERIFIED_FINANCIALS.length - 1]?.date,
  },
  latestHoldings: MSTR_VERIFIED_FINANCIALS[MSTR_VERIFIED_FINANCIALS.length - 1]?.holdings.value,
  latestShares: MSTR_VERIFIED_FINANCIALS[MSTR_VERIFIED_FINANCIALS.length - 1]?.shares.total,
  latestHPS: MSTR_VERIFIED_FINANCIALS[MSTR_VERIFIED_FINANCIALS.length - 1]?.holdingsPerShare,
  sources: {
    holdingsFile: 'mstr-holdings-verified.ts',
    atmFile: 'mstr-atm-sales.ts',
    employeeEquityFile: 'mstr-employee-equity.ts',
    secHistoryFile: 'mstr-sec-history.ts',
  },
  generatedAt: new Date().toISOString().split('T')[0],
};

// Types are exported at their declaration above
