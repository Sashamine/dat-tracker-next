/**
 * MSTR Employee Equity Issuances
 * 
 * Tracks shares issued via employee compensation programs:
 * - Stock options exercised
 * - RSUs vested (net of tax withholding)
 * - ESPP (Employee Stock Purchase Plan)
 * 
 * Source: 10-Q/10-K filings, equity statement section
 * Updated quarterly when new filings are available.
 */

export interface EmployeeEquityQuarter {
  quarter: string;           // e.g., "Q3 2025"
  periodEnd: string;         // e.g., "2025-09-30"
  optionsExercised: number;  // Shares issued from option exercises
  rsusVested: number;        // Shares issued from RSU vesting (net of withholding)
  espp: number;              // Shares issued via ESPP
  filingType: "10-Q" | "10-K";
  accession: string;
  filingDate: string;
  notes?: string;
}

/**
 * Employee equity issuances by quarter
 * Source: Equity statement in each 10-Q/10-K
 */
export const MSTR_EMPLOYEE_EQUITY: EmployeeEquityQuarter[] = [
  // =========================================================================
  // 2025 - From Q3 2025 10-Q (filed 2025-11-03)
  // =========================================================================
  {
    quarter: "Q1 2025",
    periodEnd: "2025-03-31",
    optionsExercised: 271_000,
    rsusVested: 104_000,
    espp: 26_000,
    filingType: "10-Q",
    accession: "0001193125-25-262568",  // Q3 10-Q has YTD + quarterly breakdown
    filingDate: "2025-11-03",
    notes: "Extracted from Q3 2025 10-Q equity statement",
  },
  {
    quarter: "Q2 2025",
    periodEnd: "2025-06-30",
    optionsExercised: 325_000,
    rsusVested: 230_000,
    espp: 0,
    filingType: "10-Q",
    accession: "0001193125-25-262568",
    filingDate: "2025-11-03",
    notes: "Extracted from Q3 2025 10-Q equity statement",
  },
  {
    quarter: "Q3 2025",
    periodEnd: "2025-09-30",
    optionsExercised: 389_000,
    rsusVested: 36_000,
    espp: 13_000,
    filingType: "10-Q",
    accession: "0001193125-25-262568",
    filingDate: "2025-11-03",
    notes: "From Q3 2025 10-Q equity statement",
  },
];

/**
 * Calculate total employee equity shares issued after a given date
 * Used to add to baseline share count from 10-Q cover page
 */
export function getEmployeeEquityAfter(afterDate: string): number {
  return MSTR_EMPLOYEE_EQUITY
    .filter(q => q.periodEnd > afterDate)
    .reduce((sum, q) => sum + q.optionsExercised + q.rsusVested + q.espp, 0);
}

/**
 * Calculate total employee equity shares for a specific period
 */
export function getEmployeeEquityForPeriod(startDate: string, endDate: string): number {
  return MSTR_EMPLOYEE_EQUITY
    .filter(q => q.periodEnd >= startDate && q.periodEnd <= endDate)
    .reduce((sum, q) => sum + q.optionsExercised + q.rsusVested + q.espp, 0);
}

/**
 * Get cumulative employee equity issued YTD for a given year
 */
export function getEmployeeEquityYTD(year: number, throughQuarter: 1 | 2 | 3 | 4): number {
  const quarters = ["Q1", "Q2", "Q3", "Q4"].slice(0, throughQuarter);
  return MSTR_EMPLOYEE_EQUITY
    .filter(q => q.quarter.endsWith(String(year)) && quarters.some(qtr => q.quarter.startsWith(qtr)))
    .reduce((sum, q) => sum + q.optionsExercised + q.rsusVested + q.espp, 0);
}

/**
 * Summary stats
 */
export const EMPLOYEE_EQUITY_STATS = {
  totalQuarters: MSTR_EMPLOYEE_EQUITY.length,
  latestQuarter: MSTR_EMPLOYEE_EQUITY[MSTR_EMPLOYEE_EQUITY.length - 1]?.quarter,
  latestFilingDate: MSTR_EMPLOYEE_EQUITY[MSTR_EMPLOYEE_EQUITY.length - 1]?.filingDate,
  totalSharesIssued: MSTR_EMPLOYEE_EQUITY.reduce(
    (sum, q) => sum + q.optionsExercised + q.rsusVested + q.espp, 
    0
  ),
};
