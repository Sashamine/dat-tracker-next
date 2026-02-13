// Earnings data for DAT companies
// Sources: SEC EDGAR, company IR pages, investor presentations
//
// QUARTER NORMALIZATION:
// Prefer using XBRL period end dates directly via quarterFromPeriodEnd().
// This avoids fiscal-to-calendar mapping errors - the SEC filing tells us
// exactly what period the data covers.
//
// Legacy fiscal year mappings (kept for backwards compatibility):
// - (CLSK removed - not a HODL treasury, 83% BTC classified as current/for-sale)
// - All others use calendar year (fiscal = calendar)

import { EarningsRecord, EarningsCalendarEntry, TreasuryYieldMetrics, Asset, CalendarQuarter, YieldPeriod } from "../types";
import { allCompanies } from "./companies";
import { HOLDINGS_HISTORY, calculateHoldingsGrowth } from "./holdings-history";
import { getQuarterEndSnapshot } from "./mstr-capital-structure";
import { MSTR_VERIFIED_FINANCIALS } from "./mstr-verified-financials";
import { getBMNRQuarterEndData } from "./bmnr-holdings-history";
import { getMARAQuarterEndDataForEarnings } from "./mara-holdings-history";

/**
 * Derives calendar year/quarter directly from an XBRL period end date.
 * This is the PREFERRED approach - no fiscal year guessing needed.
 * 
 * @param periodEnd - Date string in YYYY-MM-DD format (e.g., "2025-09-30")
 * @returns { year, quarter } based on the month (Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec)
 * 
 * Examples:
 *   "2025-03-31" → { year: 2025, quarter: 1 }
 *   "2025-06-30" → { year: 2025, quarter: 2 }
 *   "2025-09-30" → { year: 2025, quarter: 3 }
 *   "2025-12-31" → { year: 2025, quarter: 4 }
 */
export function quarterFromPeriodEnd(periodEnd: string): { year: number; quarter: 1 | 2 | 3 | 4 } {
  const [yearStr, monthStr] = periodEnd.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const quarter = Math.ceil(month / 3) as 1 | 2 | 3 | 4;
  return { year, quarter };
}

/**
 * Converts period end date to standard quarter-end date string.
 * Handles month-end variations (28/29/30/31 days).
 * 
 * @param periodEnd - Any date in the quarter
 * @returns Normalized quarter-end date (Mar 31, Jun 30, Sep 30, Dec 31)
 */
export function normalizeQuarterEnd(periodEnd: string): string {
  const { year, quarter } = quarterFromPeriodEnd(periodEnd);
  const quarterEnds = ['03-31', '06-30', '09-30', '12-31'];
  return `${year}-${quarterEnds[quarter - 1]}`;
}

/**
 * LEGACY: Maps fiscal year/quarter to calendar year/quarter based on company's fiscal year end.
 * Prefer quarterFromPeriodEnd() when XBRL data is available.
 */
function fiscalToCalendar(
  ticker: string,
  fiscalYear: number,
  fiscalQuarter: 1 | 2 | 3 | 4
): { calendarYear: number; calendarQuarter: 1 | 2 | 3 | 4 } {
  // All other companies use calendar year (fiscal = calendar)
  return { calendarYear: fiscalYear, calendarQuarter: fiscalQuarter };
}

/**
 * Helper: Get MSTR data from verified financials for a specific quarter
 * Uses the same provenanced data source as the BTC/share chart
 */
function getMSTRQuarterData(fiscalYear: number, fiscalQuarter: number): {
  holdingsAtQuarterEnd?: number;
  sharesAtQuarterEnd?: number;
  holdingsPerShare?: number;
} {
  // Map fiscal year/quarter to period-end date (MSTR uses calendar year)
  const quarterEndMonth = fiscalQuarter * 3; // Q1=3, Q2=6, Q3=9, Q4=12
  const quarterEndDay = quarterEndMonth === 3 ? '31' : quarterEndMonth === 6 ? '30' : quarterEndMonth === 9 ? '30' : '31';
  const periodEnd = `${fiscalYear}-${String(quarterEndMonth).padStart(2, '0')}-${quarterEndDay}`;

  // Find the snapshot closest to quarter end (on or before)
  const snapshot = MSTR_VERIFIED_FINANCIALS
    .filter(s => s.date <= periodEnd)
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  if (!snapshot) {
    // No data available for this quarter
    return {};
  }

  return {
    holdingsAtQuarterEnd: snapshot.holdings.value,
    sharesAtQuarterEnd: snapshot.shares.total,
    holdingsPerShare: snapshot.holdingsPerShare,
  };
}

// Upcoming and recent earnings dates
// Status: "upcoming" = scheduled, "confirmed" = date confirmed by company, "reported" = results released
export const EARNINGS_DATA: EarningsRecord[] = [
  // ==================== BTC COMPANIES ====================

  // ========== Strategy (MSTR) ==========
  // Calendar year company (fiscal = calendar)
  // Q4 2025 - Upcoming earnings (uses verified financials for consistency with chart)
  {
    ticker: "MSTR",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-02-04",
    earningsTime: "AMC",
    ...getMSTRQuarterData(2025, 4),
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312526021726/0001193125-26-021726-index.htm",
    status: "upcoming",
  },
  // Q3 2025
  {
    ticker: "MSTR",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-10-30",
    earningsTime: "AMC",
    epsActual: -1.72,
    epsEstimate: -0.12,
    revenueActual: 116_100_000,
    revenueEstimate: 122_660_000,
    netIncome: -340_200_000,
    ...getMSTRQuarterData(2025, 3),
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q2 2025
  {
    ticker: "MSTR",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-08-01",
    earningsTime: "AMC",
    epsActual: -5.74,
    epsEstimate: -0.67,
    revenueActual: 111_400_000,
    revenueEstimate: 119_300_000,
    netIncome: -102_600_000,
    ...getMSTRQuarterData(2025, 2),
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q1 2025
  {
    ticker: "MSTR",
    fiscalYear: 2025,
    fiscalQuarter: 1,
    calendarYear: 2025,
    calendarQuarter: 1,
    earningsDate: "2025-05-01",
    earningsTime: "AMC",
    epsActual: -16.49,
    epsEstimate: -0.54,
    revenueActual: 111_100_000,
    revenueEstimate: 117_000_000,
    netIncome: -4_217_000_000,
    ...getMSTRQuarterData(2025, 1),
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-K",
    status: "reported",
  },
  // Q4 2024
  {
    ticker: "MSTR",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    calendarYear: 2024,
    calendarQuarter: 4,
    earningsDate: "2025-02-05",
    earningsTime: "AMC",
    epsActual: 0.89,
    epsEstimate: -0.12,
    revenueActual: 120_700_000,
    revenueEstimate: 123_000_000,
    netIncome: 36_200_000,
    ...getMSTRQuarterData(2024, 4),
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-K",
    status: "reported",
  },
  // Q3 2024
  {
    ticker: "MSTR",
    fiscalYear: 2024,
    fiscalQuarter: 3,
    calendarYear: 2024,
    calendarQuarter: 3,
    earningsDate: "2024-10-30",
    earningsTime: "AMC",
    epsActual: -1.72,
    epsEstimate: -0.11,
    revenueActual: 116_100_000,
    revenueEstimate: 122_660_000,
    netIncome: -340_200_000,
    ...getMSTRQuarterData(2024, 3),
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q2 2024
  {
    ticker: "MSTR",
    fiscalYear: 2024,
    fiscalQuarter: 2,
    calendarYear: 2024,
    calendarQuarter: 2,
    earningsDate: "2024-08-01",
    earningsTime: "AMC",
    epsActual: -5.74,
    epsEstimate: -0.78,
    revenueActual: 111_400_000,
    revenueEstimate: 119_300_000,
    netIncome: -102_600_000,
    ...getMSTRQuarterData(2024, 2),
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q1 2024
  {
    ticker: "MSTR",
    fiscalYear: 2024,
    fiscalQuarter: 1,
    calendarYear: 2024,
    calendarQuarter: 1,
    earningsDate: "2024-04-29",
    earningsTime: "AMC",
    epsActual: -8.26,
    epsEstimate: -0.78,
    revenueActual: 115_200_000,
    revenueEstimate: 121_700_000,
    netIncome: -53_100_000,
    ...getMSTRQuarterData(2024, 1),
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q4 2023
  {
    ticker: "MSTR",
    fiscalYear: 2023,
    fiscalQuarter: 4,
    calendarYear: 2023,
    calendarQuarter: 4,
    earningsDate: "2024-01-30",
    earningsTime: "AMC",
    ...getMSTRQuarterData(2023, 4),
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q3 2023
  {
    ticker: "MSTR",
    fiscalYear: 2023,
    fiscalQuarter: 3,
    calendarYear: 2023,
    calendarQuarter: 3,
    earningsDate: "2023-10-30",
    earningsTime: "AMC",
    ...getMSTRQuarterData(2023, 3),
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q2 2023
  {
    ticker: "MSTR",
    fiscalYear: 2023,
    fiscalQuarter: 2,
    calendarYear: 2023,
    calendarQuarter: 2,
    earningsDate: "2023-07-30",
    earningsTime: "AMC",
    ...getMSTRQuarterData(2023, 2),
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q1 2023
  {
    ticker: "MSTR",
    fiscalYear: 2023,
    fiscalQuarter: 1,
    calendarYear: 2023,
    calendarQuarter: 1,
    earningsDate: "2023-04-30",
    earningsTime: "AMC",
    ...getMSTRQuarterData(2023, 1),
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q4 2022
  {
    ticker: "MSTR",
    fiscalYear: 2022,
    fiscalQuarter: 4,
    calendarYear: 2022,
    calendarQuarter: 4,
    earningsDate: "2023-01-30",
    earningsTime: "AMC",
    ...getMSTRQuarterData(2022, 4),
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q3 2022
  {
    ticker: "MSTR",
    fiscalYear: 2022,
    fiscalQuarter: 3,
    calendarYear: 2022,
    calendarQuarter: 3,
    earningsDate: "2022-10-30",
    earningsTime: "AMC",
    ...getMSTRQuarterData(2022, 3),
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q2 2022
  {
    ticker: "MSTR",
    fiscalYear: 2022,
    fiscalQuarter: 2,
    calendarYear: 2022,
    calendarQuarter: 2,
    earningsDate: "2022-07-30",
    earningsTime: "AMC",
    ...getMSTRQuarterData(2022, 2),
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q1 2022
  {
    ticker: "MSTR",
    fiscalYear: 2022,
    fiscalQuarter: 1,
    calendarYear: 2022,
    calendarQuarter: 1,
    earningsDate: "2022-04-30",
    earningsTime: "AMC",
    ...getMSTRQuarterData(2022, 1),
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q4 2021
  {
    ticker: "MSTR",
    fiscalYear: 2021,
    fiscalQuarter: 4,
    calendarYear: 2021,
    calendarQuarter: 4,
    earningsDate: "2022-01-30",
    earningsTime: "AMC",
    ...getMSTRQuarterData(2021, 4),
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q3 2021
  {
    ticker: "MSTR",
    fiscalYear: 2021,
    fiscalQuarter: 3,
    calendarYear: 2021,
    calendarQuarter: 3,
    earningsDate: "2021-10-30",
    earningsTime: "AMC",
    ...getMSTRQuarterData(2021, 3),
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q2 2021
  {
    ticker: "MSTR",
    fiscalYear: 2021,
    fiscalQuarter: 2,
    calendarYear: 2021,
    calendarQuarter: 2,
    earningsDate: "2021-07-30",
    earningsTime: "AMC",
    ...getMSTRQuarterData(2021, 2),
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q1 2021
  {
    ticker: "MSTR",
    fiscalYear: 2021,
    fiscalQuarter: 1,
    calendarYear: 2021,
    calendarQuarter: 1,
    earningsDate: "2021-04-30",
    earningsTime: "AMC",
    ...getMSTRQuarterData(2021, 1),
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q4 2020
  {
    ticker: "MSTR",
    fiscalYear: 2020,
    fiscalQuarter: 4,
    calendarYear: 2020,
    calendarQuarter: 4,
    earningsDate: "2021-01-30",
    earningsTime: "AMC",
    ...getMSTRQuarterData(2020, 4),
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q3 2020
  {
    ticker: "MSTR",
    fiscalYear: 2020,
    fiscalQuarter: 3,
    calendarYear: 2020,
    calendarQuarter: 3,
    earningsDate: "2020-10-30",
    earningsTime: "AMC",
    ...getMSTRQuarterData(2020, 3),
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },

  // ========== Marathon Digital (MARA) ==========
  // Calendar year company (fiscal = calendar)
  // Q4 2025 - Upcoming
  {
    ticker: "MARA",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-02-26",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },
  // Q3 2025
  // DO NOT HARDCODE - use getMARAQuarterEndDataForEarnings() as single source of truth
  {
    ticker: "MARA",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-12",
    earningsTime: "AMC",
    epsActual: 0.32,
    epsEstimate: 0.05,
    revenueActual: 131_600_000,
    revenueEstimate: 145_000_000,
    ...getMARAQuarterEndDataForEarnings("2025-09-30")!,
    status: "reported",
  },
  // Q2 2025
  // DO NOT HARDCODE - use getMARAQuarterEndDataForEarnings() as single source of truth
  {
    ticker: "MARA",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-08-06",
    earningsTime: "AMC",
    epsActual: -0.42,
    epsEstimate: -0.15,
    revenueActual: 145_100_000,
    revenueEstimate: 157_000_000,
    netIncome: -199_700_000,
    ...getMARAQuarterEndDataForEarnings("2025-06-30")!,
    status: "reported",
  },
  // Q1 2025
  // DO NOT HARDCODE - use getMARAQuarterEndDataForEarnings() as single source of truth
  {
    ticker: "MARA",
    fiscalYear: 2025,
    fiscalQuarter: 1,
    calendarYear: 2025,
    calendarQuarter: 1,
    earningsDate: "2025-05-08",
    earningsTime: "AMC",
    epsActual: -0.47,
    epsEstimate: -0.25,
    revenueActual: 213_900_000,
    revenueEstimate: 224_000_000,
    netIncome: -183_400_000,
    ...getMARAQuarterEndDataForEarnings("2025-03-31")!,
    status: "reported",
  },
  // Q4 2024
  // DO NOT HARDCODE - use getMARAQuarterEndDataForEarnings() as single source of truth
  {
    ticker: "MARA",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    calendarYear: 2024,
    calendarQuarter: 4,
    earningsDate: "2025-02-26",
    earningsTime: "AMC",
    epsActual: 1.24,
    epsEstimate: 0.14,
    revenueActual: 214_400_000,
    revenueEstimate: 232_000_000,
    netIncome: 528_200_000,
    ...getMARAQuarterEndDataForEarnings("2024-12-31")!,
    status: "reported",
  },
  // Q3 2024
  // DO NOT HARDCODE - use getMARAQuarterEndDataForEarnings() as single source of truth
  {
    ticker: "MARA",
    fiscalYear: 2024,
    fiscalQuarter: 3,
    calendarYear: 2024,
    calendarQuarter: 3,
    earningsDate: "2024-11-13",
    earningsTime: "AMC",
    epsActual: -0.42,
    epsEstimate: -0.22,
    revenueActual: 131_600_000,
    revenueEstimate: 149_000_000,
    netIncome: -124_800_000,
    ...getMARAQuarterEndDataForEarnings("2024-09-30")!,
    status: "reported",
  },
  // Q2 2024
  // DO NOT HARDCODE - use getMARAQuarterEndDataForEarnings() as single source of truth
  {
    ticker: "MARA",
    fiscalYear: 2024,
    fiscalQuarter: 2,
    calendarYear: 2024,
    calendarQuarter: 2,
    earningsDate: "2024-08-08",
    earningsTime: "AMC",
    epsActual: -0.72,
    epsEstimate: 0.31,
    revenueActual: 145_100_000,
    revenueEstimate: 163_000_000,
    netIncome: -199_700_000,
    ...getMARAQuarterEndDataForEarnings("2024-06-30")!,
    status: "reported",
  },
  // Q1 2024
  // DO NOT HARDCODE - use getMARAQuarterEndDataForEarnings() as single source of truth
  {
    ticker: "MARA",
    fiscalYear: 2024,
    fiscalQuarter: 1,
    calendarYear: 2024,
    calendarQuarter: 1,
    earningsDate: "2024-05-09",
    earningsTime: "AMC",
    epsActual: 1.26,
    epsEstimate: 0.05,
    revenueActual: 165_200_000,
    revenueEstimate: 136_000_000,
    netIncome: 337_200_000,
    ...getMARAQuarterEndDataForEarnings("2024-03-31")!,
    status: "reported",
  },
  // Q4 2023 (FY 2023)
  // DO NOT HARDCODE - use getMARAQuarterEndDataForEarnings() as single source of truth
  {
    ticker: "MARA",
    fiscalYear: 2023,
    fiscalQuarter: 4,
    calendarYear: 2023,
    calendarQuarter: 4,
    earningsDate: "2024-02-28",
    earningsTime: "AMC",
    ...getMARAQuarterEndDataForEarnings("2023-12-31")!,
    status: "reported",
  },

  // ========== Hut 8 (HUT) ==========
  // Calendar year company (fiscal = calendar)
  // Q4 2025 - Upcoming
  {
    ticker: "HUT",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-13",
    earningsTime: "BMO",
    source: "sec-filing",
    status: "upcoming",
  },
  // Q3 2025
  {
    ticker: "HUT",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-14",
    earningsTime: "BMO",
    epsActual: 0.31,
    epsEstimate: 0.03,
    revenueActual: 51_700_000,
    revenueEstimate: 43_000_000,
    netIncome: 89_300_000,
    holdingsAtQuarterEnd: 9106,
    sharesAtQuarterEnd: 100_000_000,
    holdingsPerShare: 0.0000911,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2025
  {
    ticker: "HUT",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-08-13",
    earningsTime: "BMO",
    epsActual: -0.41,
    epsEstimate: -0.13,
    revenueActual: 35_200_000,
    revenueEstimate: 40_000_000,
    netIncome: -71_900_000,
    holdingsAtQuarterEnd: 9102,
    sharesAtQuarterEnd: 97_000_000,
    holdingsPerShare: 0.0000938,
    source: "sec-filing",
    status: "reported",
  },
  // Q1 2025
  {
    ticker: "HUT",
    fiscalYear: 2025,
    fiscalQuarter: 1,
    calendarYear: 2025,
    calendarQuarter: 1,
    earningsDate: "2025-05-15",
    earningsTime: "BMO",
    epsActual: -0.40,
    epsEstimate: -0.11,
    revenueActual: 36_100_000,
    revenueEstimate: 44_000_000,
    netIncome: -93_700_000,
    holdingsAtQuarterEnd: 10264,
    sharesAtQuarterEnd: 96_000_000,
    holdingsPerShare: 0.0001069,
    source: "sec-filing",
    status: "reported",
  },
  // Q4 2024
  {
    ticker: "HUT",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    calendarYear: 2024,
    calendarQuarter: 4,
    earningsDate: "2025-03-27",
    earningsTime: "BMO",
    epsActual: 0.55,
    epsEstimate: 0.10,
    revenueActual: 60_000_000,
    revenueEstimate: 54_000_000,
    netIncome: 95_800_000,
    holdingsAtQuarterEnd: 10096,
    sharesAtQuarterEnd: 95_000_000,
    holdingsPerShare: 0.0001063,
    source: "sec-filing",
    status: "reported",
  },
  // Q3 2024
  {
    ticker: "HUT",
    fiscalYear: 2024,
    fiscalQuarter: 3,
    calendarYear: 2024,
    calendarQuarter: 3,
    earningsDate: "2024-11-14",
    earningsTime: "BMO",
    epsActual: -0.12,
    epsEstimate: -0.06,
    revenueActual: 43_700_000,
    revenueEstimate: 37_000_000,
    netIncome: -17_700_000,
    holdingsAtQuarterEnd: 9106,
    sharesAtQuarterEnd: 92_000_000,
    holdingsPerShare: 0.0000990,
    source: "sec-filing",
    status: "reported",
  },

  // ========== Core Scientific (CORZ) ==========
  // Calendar year company (fiscal = calendar)
  // Q4 2025 - Upcoming
  {
    ticker: "CORZ",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-02-12",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },
  // Q3 2025
  {
    ticker: "CORZ",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-06",
    earningsTime: "AMC",
    epsActual: 0.19,
    epsEstimate: 0.02,
    revenueActual: 155_000_000,
    revenueEstimate: 150_000_000,
    netIncome: 52_000_000,
    holdingsAtQuarterEnd: 500,
    sharesAtQuarterEnd: 280_000_000,
    holdingsPerShare: 0.0000018,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2025
  {
    ticker: "CORZ",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-08-07",
    earningsTime: "AMC",
    epsActual: -0.07,
    epsEstimate: -0.08,
    revenueActual: 141_300_000,
    revenueEstimate: 147_000_000,
    netIncome: -17_900_000,
    holdingsAtQuarterEnd: 500,
    sharesAtQuarterEnd: 275_000_000,
    holdingsPerShare: 0.0000018,
    source: "sec-filing",
    status: "reported",
  },
  // Q1 2025
  {
    ticker: "CORZ",
    fiscalYear: 2025,
    fiscalQuarter: 1,
    calendarYear: 2025,
    calendarQuarter: 1,
    earningsDate: "2025-05-08",
    earningsTime: "AMC",
    epsActual: -0.06,
    epsEstimate: -0.05,
    revenueActual: 115_700_000,
    revenueEstimate: 124_000_000,
    netIncome: -15_500_000,
    holdingsAtQuarterEnd: 500,
    sharesAtQuarterEnd: 270_000_000,
    holdingsPerShare: 0.0000019,
    source: "sec-filing",
    status: "reported",
  },
  // Q4 2024
  {
    ticker: "CORZ",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    calendarYear: 2024,
    calendarQuarter: 4,
    earningsDate: "2025-02-27",
    earningsTime: "AMC",
    epsActual: 0.07,
    epsEstimate: -0.03,
    revenueActual: 95_100_000,
    revenueEstimate: 93_000_000,
    netIncome: 16_300_000,
    holdingsAtQuarterEnd: 500,
    sharesAtQuarterEnd: 264_000_000,
    holdingsPerShare: 0.0000019,
    source: "sec-filing",
    status: "reported",
  },

  // ========== Bitdeer (BTDR) ==========
  // Calendar year company (fiscal = calendar)
  // Q4 2025 - Upcoming
  {
    ticker: "BTDR",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-05",
    earningsTime: "BMO",
    source: "sec-filing",
    status: "upcoming",
  },
  // Q3 2025
  {
    ticker: "BTDR",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-18",
    earningsTime: "BMO",
    epsActual: -0.24,
    epsEstimate: -0.28,
    revenueActual: 99_200_000,
    revenueEstimate: 112_000_000,
    netIncome: -44_200_000,
    holdingsAtQuarterEnd: 724,
    sharesAtQuarterEnd: 178_000_000,
    holdingsPerShare: 0.0000041,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2025
  {
    ticker: "BTDR",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-08-13",
    earningsTime: "BMO",
    epsActual: -0.35,
    epsEstimate: -0.32,
    revenueActual: 82_900_000,
    revenueEstimate: 92_000_000,
    netIncome: -59_500_000,
    holdingsAtQuarterEnd: 700,
    sharesAtQuarterEnd: 170_000_000,
    holdingsPerShare: 0.0000041,
    source: "sec-filing",
    status: "reported",
  },
  // Q4 2024
  {
    ticker: "BTDR",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    calendarYear: 2024,
    calendarQuarter: 4,
    earningsDate: "2025-03-11",
    earningsTime: "BMO",
    epsActual: -0.16,
    epsEstimate: -0.19,
    revenueActual: 113_000_000,
    revenueEstimate: 105_000_000,
    netIncome: -23_700_000,
    holdingsAtQuarterEnd: 724,
    sharesAtQuarterEnd: 143_000_000,
    holdingsPerShare: 0.0000051,
    source: "sec-filing",
    status: "reported",
  },
  // Q3 2024
  {
    ticker: "BTDR",
    fiscalYear: 2024,
    fiscalQuarter: 3,
    calendarYear: 2024,
    calendarQuarter: 3,
    earningsDate: "2024-11-19",
    earningsTime: "BMO",
    epsActual: -0.46,
    epsEstimate: -0.38,
    revenueActual: 62_100_000,
    revenueEstimate: 65_000_000,
    netIncome: -50_300_000,
    holdingsAtQuarterEnd: 573,
    sharesAtQuarterEnd: 141_000_000,
    holdingsPerShare: 0.0000041,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2024
  {
    ticker: "BTDR",
    fiscalYear: 2024,
    fiscalQuarter: 2,
    calendarYear: 2024,
    calendarQuarter: 2,
    earningsDate: "2024-08-16",
    earningsTime: "BMO",
    epsActual: -0.12,
    epsEstimate: -0.17,
    revenueActual: 93_000_000,
    revenueEstimate: 88_000_000,
    netIncome: -13_700_000,
    holdingsAtQuarterEnd: 485,
    sharesAtQuarterEnd: 135_000_000,
    holdingsPerShare: 0.0000036,
    source: "sec-filing",
    status: "reported",
  },

  // ========== KULR Technology (KULR) ==========
  // Calendar year company (fiscal = calendar)
  // Q4 2025 - Upcoming
  {
    ticker: "KULR",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-27",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },
  // Q3 2025 - Verified 2026-01-29 from SEC 10-Q
  // Note: 1-for-8 reverse split was June 23, 2025
  {
    ticker: "KULR",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-13",
    earningsTime: "AMC",
    epsActual: -0.03,
    epsEstimate: -0.04,
    revenueActual: 3_800_000,
    revenueEstimate: 4_500_000,
    netIncome: -5_300_000,
    holdingsAtQuarterEnd: 1_057,  // Q3 10-Q: 1,056.7 BTC held + 70 BTC collateral
    sharesAtQuarterEnd: 45_650_000,  // Post-split shares (SEC 10-Q cover page)
    holdingsPerShare: 0.0000232,  // 1057 / 45.65M
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2025 - Verified 2026-01-29
  // Note: 1-for-8 reverse split was June 23, 2025 (before quarter end)
  {
    ticker: "KULR",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-08-11",
    earningsTime: "AMC",
    epsActual: -0.04,
    epsEstimate: -0.04,
    revenueActual: 3_600_000,
    revenueEstimate: 4_000_000,
    netIncome: -7_900_000,
    holdingsAtQuarterEnd: 920,  // June 23 press release (post-split announcement)
    sharesAtQuarterEnd: 41_108_543,  // Post-split shares
    holdingsPerShare: 0.0000224,  // 920 / 41.1M
    source: "sec-filing",
    status: "reported",
  },
  // Q1 2025 - Added 2026-01-29
  // Pre-reverse-split share count (split was June 23, 2025)
  {
    ticker: "KULR",
    fiscalYear: 2025,
    fiscalQuarter: 1,
    calendarYear: 2025,
    calendarQuarter: 1,
    earningsDate: "2025-05-12",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 668,  // Mar 25, 2025 press release (668.3 BTC)
    sharesAtQuarterEnd: 284_389_637,  // Pre-split shares
    holdingsPerShare: 0.00000235,  // 668 / 284.4M
    source: "press-release",
    status: "reported",
  },
  // Q4 2024 - Verified 2026-01-29
  // Note: First BTC purchase was Dec 26, 2024 (217.18 BTC per 8-K)
  // Pre-reverse-split share count (split was June 23, 2025)
  {
    ticker: "KULR",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    calendarYear: 2024,
    calendarQuarter: 4,
    earningsDate: "2025-03-31",
    earningsTime: "AMC",
    epsActual: -0.04,
    epsEstimate: -0.04,
    revenueActual: 4_200_000,
    revenueEstimate: 4_500_000,
    netIncome: -6_200_000,
    holdingsAtQuarterEnd: 217,  // Dec 26, 2024 initial purchase (217.18 BTC)
    sharesAtQuarterEnd: 214_227_808,  // Pre-split shares from Dec 26 8-K
    holdingsPerShare: 0.00000101,  // 217 / 214.2M
    source: "sec-filing",
    status: "reported",
  },

  // ========== Sequans Communications (SQNS) ==========
  // Calendar year company (fiscal = calendar)
  // Foreign private issuer (France) - files 6-K instead of 10-Q
  // SEC CIK: 0001383395
  // 1:10 reverse split Sep 17, 2025
  // Verified 2026-02-02
  //
  // Q4 2025 - Current holdings after Nov 4 sale
  {
    ticker: "SQNS",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-02-10",
    earningsTime: "BMO",
    holdingsAtQuarterEnd: 2_264,  // Nov 4, 2025 6-K: sold 970 BTC, now 2,264
    sharesAtQuarterEnd: 13_933_963,  // SEC 6-K Q3 2025 diluted ADS (using Q3 until Q4 filed)
    holdingsPerShare: 0.0001625,  // 2264 / 13.93M
    source: "sec-filing",
    sourceUrl: "https://sequans.com/bitcoin-treasury/",
    status: "upcoming",
  },
  // Q3 2025 - Peak holdings before Nov sale
  {
    ticker: "SQNS",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-04",
    earningsTime: "BMO",
    holdingsAtQuarterEnd: 3_234,  // Peak before Nov 4 sale of 970 BTC
    sharesAtQuarterEnd: 13_933_963,  // SEC 6-K Q3 2025 weighted avg diluted ADS
    holdingsPerShare: 0.0002321,  // 3234 / 13.93M
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001383395&type=6-K",
    status: "reported",
  },

  // ========== American Bitcoin (ABTC) ==========
  // Calendar year company (fiscal = calendar)
  // Merged with Gryphon Digital Mining Sep 3, 2025
  // SEC CIK: 0001755953
  // Verified 2026-01-28 via SEC XBRL
  //
  // Q4 2025 - Upcoming (use Nov 5 press release data)
  {
    ticker: "ABTC",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-15",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 4_004,  // Nov 5, 2025 PR (latest verified)
    sharesAtQuarterEnd: 899_489_426,  // Q3 2025 10-Q diluted
    holdingsPerShare: 0.0000045,
    source: "press-release",
    sourceUrl: "https://www.prnewswire.com/news-releases/american-bitcoin-adds-139-bitcoin-increasing-strategic-reserve-to-4-004-bitcoin-302608175.html",
    status: "upcoming",
  },
  // Q3 2025 (Jul-Sep) - First quarter post-merger
  {
    ticker: "ABTC",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-14",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 3_418,  // SEC 10-Q XBRL
    sharesAtQuarterEnd: 899_489_426,  // Diluted shares
    holdingsPerShare: 0.0000038,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001755953&type=10-Q",
    status: "reported",
  },

  // ========== Nakamoto Inc. (NAKA) ==========
  // Calendar year company (fiscal = calendar)
  // Merged with KindlyMD Aug 2025, rebranded Jan 21, 2026
  // CIK: 0001946573
  // Q4 2025 - Upcoming
  {
    ticker: "NAKA",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-15",  // Estimated - 10-K due ~90 days after fiscal year end
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },
  // Q3 2025 - SEC 8-K Nov 19, 2025
  {
    ticker: "NAKA",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-19",
    earningsTime: "AMC",
    epsActual: -0.42,
    revenueActual: 388_209,  // Healthcare business only
    netIncome: -86_035_808,  // Includes $59.8M non-cash Nakamoto acquisition loss, $22.1M unrealized loss on digital assets
    holdingsAtQuarterEnd: 5_398,  // As of Nov 12, 2025 (per 8-K)
    sharesAtQuarterEnd: 511_555_864,  // 439.85M shares + 71.7M pre-funded warrants
    holdingsPerShare: 0.0000106,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1946573/000149315225024314/ex99-1.htm",
    status: "reported",
  },

  // ========== Semler Scientific (SMLR) ==========
  // Calendar year company (fiscal = calendar)
  // Q4 2025 - Upcoming
  {
    ticker: "SMLR",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-02-27",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },
  // Q3 2025
  {
    ticker: "SMLR",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-07",
    earningsTime: "AMC",
    epsActual: -3.14,
    epsEstimate: 0.15,
    revenueActual: 17_000_000,
    revenueEstimate: 14_000_000,
    netIncome: -24_500_000,
    holdingsAtQuarterEnd: 2058,
    sharesAtQuarterEnd: 7_600_000,
    holdingsPerShare: 0.0002708,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2025
  {
    ticker: "SMLR",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-08-08",
    earningsTime: "AMC",
    epsActual: -1.23,
    epsEstimate: 0.20,
    revenueActual: 16_900_000,
    revenueEstimate: 14_000_000,
    netIncome: -8_700_000,
    holdingsAtQuarterEnd: 2084,
    sharesAtQuarterEnd: 7_400_000,
    holdingsPerShare: 0.0002816,
    source: "sec-filing",
    status: "reported",
  },
  // Q1 2025
  {
    ticker: "SMLR",
    fiscalYear: 2025,
    fiscalQuarter: 1,
    calendarYear: 2025,
    calendarQuarter: 1,
    earningsDate: "2025-05-08",
    earningsTime: "AMC",
    epsActual: -2.71,
    epsEstimate: 0.05,
    revenueActual: 12_300_000,
    revenueEstimate: 14_000_000,
    netIncome: -19_600_000,
    holdingsAtQuarterEnd: 3082,
    sharesAtQuarterEnd: 7_300_000,
    holdingsPerShare: 0.0004222,
    source: "sec-filing",
    status: "reported",
  },
  // Q4 2024
  {
    ticker: "SMLR",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    calendarYear: 2024,
    calendarQuarter: 4,
    earningsDate: "2025-03-06",
    earningsTime: "AMC",
    epsActual: 0.57,
    epsEstimate: 0.08,
    revenueActual: 17_500_000,
    revenueEstimate: 14_000_000,
    netIncome: 4_000_000,
    holdingsAtQuarterEnd: 2321,
    sharesAtQuarterEnd: 7_100_000,
    holdingsPerShare: 0.0003269,
    source: "sec-filing",
    status: "reported",
  },

  // ========== Strive (ASST) ==========
  // Calendar year company (fiscal = calendar)
  // Merged with Asset Entities Sep 2025, acquired Semler Scientific Jan 2026
  // 1-for-20 reverse split Feb 3, 2026
  // ALL share counts below are POST-SPLIT adjusted for consistent HPS tracking
  // SEC CIK: 0001920406
  //
  // Q1 2026 - First full post-merger quarter (upcoming)
  {
    ticker: "ASST",
    fiscalYear: 2026,
    fiscalQuarter: 1,
    calendarYear: 2026,
    calendarQuarter: 1,
    earningsDate: "2026-05-15",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },
  // Q4 2025 - Partial quarter (includes Semler acquisition Jan 16)
  // Note: Holdings from Jan 28, 2026 8-K; shares post-split adjusted
  {
    ticker: "ASST",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-15",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 13_132,  // Jan 28, 2026 8-K: 13,131.82 BTC
    sharesAtQuarterEnd: 40_774_181,  // Post-split: Class A 29,628,976 + Class B 11,145,205
    holdingsPerShare: 0.0003221,  // 13132 / 40,774,181
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1920406/000114036126002606/0001140361-26-002606-index.htm",
    status: "upcoming",
  },
  // Q3 2025 - SEC 10-Q (Sep 30, 2025)
  // Note: Share count adjusted for 1-for-20 split for consistent HPS tracking
  // Pre-split: 815,483,610 → Post-split: 40,774,181
  {
    ticker: "ASST",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-14",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 5_886,  // SEC 10-Q Q3 2025
    sharesAtQuarterEnd: 40_774_181,  // Post-split adjusted: 815,483,610 / 20
    holdingsPerShare: 0.0001444,  // 5886 / 40,774,181
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1920406/000162828025052343/0001628280-25-052343-index.htm",
    status: "reported",
  },

  // ========== Twenty One Capital (XXI) ==========
  // Calendar year company (fiscal = calendar)
  // Went public Dec 9, 2025 via SPAC merger.
  // Q1 2026 - Upcoming
  {
    ticker: "XXI",
    fiscalYear: 2026,
    fiscalQuarter: 1,
    calendarYear: 2026,
    calendarQuarter: 1,
    earningsDate: "2026-05-15",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },
  // Q4 2025 (partial - Dec 9-31 only)
  {
    ticker: "XXI",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-15",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 43_514,  // Post-merger combined holdings
    sharesAtQuarterEnd: 651_390_912,  // Class A + Class B
    holdingsPerShare: 0.0000668,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0002070457&type=8-K",
    status: "reported",
  },

  // ========== DJT / Trump Media ==========
  // Calendar year company (fiscal = calendar)
  // CIK: 0001849635
  // BTC treasury started May 2025 ($2.5B private placement)
  // XBRL shows CryptoAssetFairValueNoncurrent, not unit count - use holdings-history for BTC
  //
  // Q4 2025 - Upcoming (10-K expected ~March 2026)
  // Holdings: 11,542 BTC (confirmed Dec 2025 — includes ~300 BTC purchased in Dec)
  {
    ticker: "DJT",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-20",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 11_542, // 8-K Dec 30, 2025 treasury update
    sharesAtQuarterEnd: 279_997_636, // No change since Q3 (no ATM)
    holdingsPerShare: 0.00004122, // 11,542 / 279,997,636
    source: "sec-filing",
    sourceUrl: "/filings/djt/0001140361-25-046825",
    status: "upcoming",
  },
  // Q3 2025 - XBRL verified: 279,997,636 shares, ProfitLoss -$54.8M, Revenue $973K
  // ⚠️ BTC count: ~11,242 at Q3 end (11,542 includes ~300 BTC purchased Dec 2025)
  // No standard crypto XBRL tags — BTC from balance sheet analysis + 8-K updates
  {
    ticker: "DJT",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-07",
    earningsTime: "AMC",
    revenueActual: 972_900, // XBRL: RevenueFromContractWithCustomerExcludingAssessedTax
    netIncome: -54_848_500, // XBRL: ProfitLoss Q3 2025
    holdingsAtQuarterEnd: 11_242, // ~11,242 at Sep 30 (11,542 minus ~300 Dec purchase)
    sharesAtQuarterEnd: 279_997_636, // XBRL: EntityCommonStockSharesOutstanding as of Nov 5
    holdingsPerShare: 0.00004015, // 11,242 / 279,997,636
    source: "sec-filing",
    sourceUrl: "/filings/djt/0001140361-25-040977",
    status: "reported",
  },
  // Q2 2025 - $2.5B raise closed, first BTC purchases (~$2B deployed by Jul 21)
  // XBRL: ProfitLoss -$20M, Revenue $833K (derived: 9M $2,677K - Q3 $973K - Q1 $871K)
  // Holdings: ~11,242 BTC (bulk purchased in Q2-Q3 with $2B deployment by Jul 21)
  {
    ticker: "DJT",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-08-01",
    earningsTime: "AMC",
    revenueActual: 832_600, // Derived: 9M $2,677K - Q3 $973K - Q1 $872K
    netIncome: -20_001_900, // XBRL: ProfitLoss Q2 2025
    holdingsAtQuarterEnd: 11_242, // Bulk BTC purchased by Jul 21 (~$2B deployed)
    sharesAtQuarterEnd: 280_000_000, // Post-PIPE (~81M new shares)
    holdingsPerShare: 0.00004015, // 11,242 / 280,000,000
    source: "sec-filing",
    sourceUrl: "/filings/djt/0001140361-25-028418",
    status: "reported",
  },
  // Q1 2025 - Pre-treasury, no BTC yet
  // XBRL: ProfitLoss -$31.7M, OpCF -$9.7M
  {
    ticker: "DJT",
    fiscalYear: 2025,
    fiscalQuarter: 1,
    calendarYear: 2025,
    calendarQuarter: 1,
    earningsDate: "2025-05-09",
    earningsTime: "AMC",
    revenueActual: 871_900, // Derived: 9M $2,677K - H1 implied
    netIncome: -31_726_600, // XBRL: ProfitLoss Q1 2025
    holdingsAtQuarterEnd: 0,
    sharesAtQuarterEnd: 199_000_000, // Pre-PIPE
    holdingsPerShare: 0,
    source: "sec-filing",
    sourceUrl: "/filings/djt/0001140361-25-018209",
    status: "reported",
  },
  // Q4 2024 - Pre-treasury
  {
    ticker: "DJT",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    calendarYear: 2024,
    calendarQuarter: 4,
    earningsDate: "2025-02-14",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 0,
    sharesAtQuarterEnd: 199_000_000, // Pre-PIPE
    holdingsPerShare: 0,
    source: "sec-filing",
    sourceUrl: "/filings/djt/0001140361-25-004822",
    status: "reported",
  },

  // ========== Metaplanet (3350.T) ==========
  // Calendar year company - fiscal year ends December 31
  // Japanese company - reports ~45 days after quarter end via TDnet
  // BTC adoption started Apr 23, 2024
  // Source: metaplanet.jp/en/analytics, metaplanet.jp/en/shareholders/disclosures
  //
  // Q4 FY2025 (Oct-Dec 2025) - Upcoming (~Feb 13, 2026)
  {
    ticker: "3350.T",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-02-13",
    earningsTime: null,
    holdingsAtQuarterEnd: 35_102,  // Dec 30, 2025 purchase data
    sharesAtQuarterEnd: 1_140_000_000,  // ~1.14B shares
    holdingsPerShare: 0.0000308,  // 35102 / 1.14B
    source: "press-release",
    sourceUrl: "https://metaplanet.jp/en/shareholders/disclosures",
    status: "upcoming",
  },
  // Q3 FY2025 (Jul-Sep 2025) - Reported Nov 13, 2025
  {
    ticker: "3350.T",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-13",
    earningsTime: null,
    holdingsAtQuarterEnd: 30_823,  // Sep 30, 2025 (from analytics)
    sharesAtQuarterEnd: 1_100_000_000,  // ~1.1B shares at Q3
    holdingsPerShare: 0.0000280,  // 30823 / 1.1B
    source: "press-release",
    sourceUrl: "https://metaplanet.jp/en/shareholders/disclosures",
    status: "reported",
  },
  // Q2 FY2025 (Apr-Jun 2025) - Reported Aug 13, 2025
  {
    ticker: "3350.T",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-08-13",
    earningsTime: null,
    holdingsAtQuarterEnd: 13_350,  // Jun 30, 2025 (from analytics)
    sharesAtQuarterEnd: 800_000_000,  // ~800M shares at Q2
    holdingsPerShare: 0.0000167,  // 13350 / 800M
    source: "press-release",
    sourceUrl: "https://metaplanet.jp/en/shareholders/disclosures",
    status: "reported",
  },
  // Q1 FY2025 (Jan-Mar 2025) - Reported May 14, 2025
  {
    ticker: "3350.T",
    fiscalYear: 2025,
    fiscalQuarter: 1,
    calendarYear: 2025,
    calendarQuarter: 1,
    earningsDate: "2025-05-14",
    earningsTime: null,
    holdingsAtQuarterEnd: 4_046,  // Mar 31, 2025 (from analytics)
    sharesAtQuarterEnd: 500_000_000,  // ~500M shares at Q1
    holdingsPerShare: 0.0000081,  // 4046 / 500M
    source: "press-release",
    sourceUrl: "https://metaplanet.jp/en/shareholders/disclosures",
    status: "reported",
  },
  // Q4 FY2024 (Oct-Dec 2024) - Reported ~Feb 2025
  {
    ticker: "3350.T",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    calendarYear: 2024,
    calendarQuarter: 4,
    earningsDate: "2025-02-14",
    earningsTime: null,
    holdingsAtQuarterEnd: 1_762,  // Dec 23, 2024 purchase (from analytics)
    sharesAtQuarterEnd: 300_000_000,  // ~300M shares at Q4 2024
    holdingsPerShare: 0.0000059,  // 1762 / 300M
    source: "press-release",
    sourceUrl: "https://metaplanet.jp/en/shareholders/disclosures",
    status: "reported",
  },
  // Q3 FY2024 (Jul-Sep 2024) - Reported ~Nov 2024
  {
    ticker: "3350.T",
    fiscalYear: 2024,
    fiscalQuarter: 3,
    calendarYear: 2024,
    calendarQuarter: 3,
    earningsDate: "2024-11-14",
    earningsTime: null,
    holdingsAtQuarterEnd: 399,  // Sep 10, 2024 (from analytics: 398.83)
    sharesAtQuarterEnd: 200_000_000,  // ~200M shares at Q3 2024
    holdingsPerShare: 0.0000020,  // 399 / 200M
    source: "press-release",
    sourceUrl: "https://metaplanet.jp/en/shareholders/disclosures",
    status: "reported",
  },
  // Q2 FY2024 (Apr-Jun 2024) - Reported ~Aug 2024 (first quarter with BTC)
  {
    ticker: "3350.T",
    fiscalYear: 2024,
    fiscalQuarter: 2,
    calendarYear: 2024,
    calendarQuarter: 2,
    earningsDate: "2024-08-14",
    earningsTime: null,
    holdingsAtQuarterEnd: 141,  // Jun 10, 2024 (from analytics: 141.07)
    sharesAtQuarterEnd: 150_000_000,  // ~150M shares at Q2 2024
    holdingsPerShare: 0.0000009,  // 141 / 150M
    source: "press-release",
    sourceUrl: "https://metaplanet.jp/en/shareholders/disclosures",
    status: "reported",
  },

  // ========== DigitalX (DCC.AX) ==========
  // Australian BTC treasury company (ASX listed)
  // Fiscal year ends June 30 (Australian financial year)
  // BTC strategy started July 1, 2025
  // Source: ASX announcements (Treasury Information filings)
  //
  // FY2026 Q2 (Oct-Dec 2025 = Calendar Q4 2025) - Reported
  {
    ticker: "DCC.AX",
    fiscalYear: 2026,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-01-29",  // Quarterly Activities/Appendix 4C Cash Flow Report
    earningsTime: null,
    holdingsAtQuarterEnd: 504,  // Treasury Information - December 2025 (ASX filing Jan 22, 2026)
    sharesAtQuarterEnd: 1_488_510_854,  // Shares on issue per ASX
    holdingsPerShare: 0.00000033859,  // 504 / 1,488,510,854 = 3.3859e-7
    source: "regulatory-filing",
    sourceUrl: "https://www.asx.com.au/markets/company/DCC",
    status: "reported",
  },
  // FY2026 Q1 (Jul-Sep 2025 = Calendar Q3 2025) - Reported
  {
    ticker: "DCC.AX",
    fiscalYear: 2026,
    fiscalQuarter: 1,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-10-31",  // Quarterly report
    earningsTime: null,
    holdingsAtQuarterEnd: 499.8,  // End of Q3 holdings (Jul 22 purchase data)
    sharesAtQuarterEnd: 1_475_070_604,  // Basic shares at quarter end
    holdingsPerShare: 0.00000033883,  // 499.8 / 1,475,070,604 = 3.3883e-7
    source: "regulatory-filing",
    sourceUrl: "https://www.asx.com.au/markets/company/DCC",
    status: "reported",
  },
  // FY2025 Q4 (Apr-Jun 2025 = Calendar Q2 2025) - Pre-BTC baseline
  {
    ticker: "DCC.AX",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-07-31",  // FY2025 annual report
    earningsTime: null,
    holdingsAtQuarterEnd: 0,  // No BTC before Jul 1, 2025
    sharesAtQuarterEnd: 1_203_623_886,  // Shares before BTC strategy
    holdingsPerShare: 0,
    source: "regulatory-filing",
    sourceUrl: "https://www.asx.com.au/markets/company/DCC",
    status: "reported",
  },

  // ========== H100 Group (H100.ST) ==========
  // Swedish BTC treasury company - first Nordic Bitcoin treasury
  // Reports via MFN (Swedish regulator) - quarterly reports
  // BTC strategy started May 22, 2025
  // Source: mfn.se/a/h100-group
  //
  // Q4 2025 (Oct-Dec 2025) - Holdings stable, shares increased via convertible conversion
  {
    ticker: "H100.ST",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-02-28",  // Expected ~60 days after quarter end
    earningsTime: null,
    holdingsAtQuarterEnd: 1_047,  // Stable since Sep 17, 2025
    sharesAtQuarterEnd: 335_250_237,  // After SEK 122.5M convertible conversion (Nov 2025)
    holdingsPerShare: 0.00000312,  // 1047 / 335.25M
    source: "press-release",
    sourceUrl: "https://mfn.se/a/h100-group",
    status: "upcoming",
  },
  // Q3 2025 (Jul-Sep 2025) - Crossed 1,000 BTC milestone
  {
    ticker: "H100.ST",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-19",  // MFN Interim Report
    earningsTime: null,
    holdingsAtQuarterEnd: 1_047,  // Sep 17, 2025 - 1,046.66 BTC
    sharesAtQuarterEnd: 311_500_000,  // Before convertible conversion
    holdingsPerShare: 0.00000336,  // 1047 / 311.5M
    source: "press-release",
    sourceUrl: "https://mfn.se/a/h100-group",
    status: "reported",
  },
  // Q2 2025 (Apr-Jun 2025) - First quarter with BTC (started May 22)
  {
    ticker: "H100.ST",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-08-15",  // Estimated
    earningsTime: null,
    holdingsAtQuarterEnd: 169,  // Jun 16, 2025 - 169 BTC per MFN
    sharesAtQuarterEnd: 117_090_000,  // Pre-capital raises
    holdingsPerShare: 0.00000144,  // 169 / 117M
    source: "press-release",
    sourceUrl: "https://mfn.se/a/h100-group",
    status: "reported",
  },

  // ==================== ETH COMPANIES ====================

  // ========== Bitmine Immersion (BMNR) ==========
  // Calendar year company - data already normalized to calendar quarters
  // Note: Fiscal year ends Aug 31 but we store as calendar quarters for consistency
  // ETH treasury strategy launched Jul 2025.
  //
  // IMPORTANT: Holdings/shares data is derived from bmnr-holdings-history.ts
  // which is the SINGLE SOURCE OF TRUTH for BMNR quarterly data.
  // Do NOT hardcode holdings/shares here - use getBMNRQuarterEndData().
  //
  // CY2026 Q1 (Jan-Mar) - Upcoming
  {
    ticker: "BMNR",
    fiscalYear: 2026,
    fiscalQuarter: 1,
    calendarYear: 2026,
    calendarQuarter: 1,
    earningsDate: "2026-05-15",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },
  // CY2025 Q4 (Oct-Dec 2025)
  // Data from bmnr-holdings-history.ts (closest snapshot to Dec 31)
  {
    ticker: "BMNR",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-02-15",  // Expected ~45 days after Dec 31
    earningsTime: "AMC",
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ...getBMNRQuarterEndData('2025-12-31')!,
    status: "reported",
  },
  // CY2025 Q3 (Jul-Sep 2025) - ETH strategy launched Jul 17
  // Data from bmnr-holdings-history.ts (closest snapshot to Sep 30)
  {
    ticker: "BMNR",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-09",  // ~40 days after Sep 30
    earningsTime: "AMC",
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ...getBMNRQuarterEndData('2025-09-30')!,
    status: "reported",
  },
  // CY2025 Q2 (Apr-Jun 2025) - Pre-ETH strategy
  {
    ticker: "BMNR",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-08-10",  // ~40 days after Jun 30
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 0,
    sharesAtQuarterEnd: 25_000_000,
    holdingsPerShare: 0,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/000168316825004889",
    status: "reported",
  },

  // ========== BTCS Inc (BTCS) ==========
  // Calendar year company (fiscal = calendar)
  // SEC CIK: 0001436229
  // ETH treasury company - scaled dramatically in 2025 (380% growth Q2→Q3)
  //
  // Holdings History:
  //   Q4 2024: ~9,000 ETH (estimated)
  //   Q2 2025: ~14,700 ETH (implied from Q3 "380% growth")
  //   Q3 2025: 70,322 ETH (SEC 8-K)
  //   Q4 2025: 70,500 ETH (Jan 7 shareholder letter)
  //
  // Q4 2025 - 10-K upcoming, holdings from 8-K Jan 7, 2026
  {
    ticker: "BTCS",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-20",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 70_500,  // Jan 7, 2026 shareholder letter
    sharesAtQuarterEnd: 50_298_201,  // Q3 diluted + estimated small increase
    holdingsPerShare: 0.001402,  // 70500 / 50298201
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001436229&type=8-K",
    status: "upcoming",
  },
  // Q3 2025 - Major ETH accumulation quarter (380% growth)
  {
    ticker: "BTCS",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-13",
    earningsTime: "AMC",
    epsActual: -0.03,
    epsEstimate: -0.02,
    revenueActual: 1_600_000,
    revenueEstimate: 1_800_000,
    netIncome: -500_000,
    holdingsAtQuarterEnd: 70_322,  // SEC 8-K Q3 2025
    sharesAtQuarterEnd: 50_298_201,  // SEC XBRL WeightedAverageNumberOfDilutedSharesOutstanding
    holdingsPerShare: 0.001398,  // 70322 / 50298201
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001436229&type=10-Q",
    status: "reported",
  },
  // Q2 2025
  {
    ticker: "BTCS",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-08-12",
    earningsTime: "AMC",
    epsActual: -0.04,
    epsEstimate: -0.03,
    revenueActual: 1_400_000,
    revenueEstimate: 1_600_000,
    netIncome: -700_000,
    holdingsAtQuarterEnd: 14_700,  // Estimated from Q3 "380% growth" claim
    sharesAtQuarterEnd: 27_938_660,  // SEC XBRL Q2 2025 diluted
    holdingsPerShare: 0.000526,  // 14700 / 27938660
    source: "sec-filing",
    status: "reported",
  },
  // Q4 2024
  {
    ticker: "BTCS",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    calendarYear: 2024,
    calendarQuarter: 4,
    earningsDate: "2025-03-27",
    earningsTime: "AMC",
    epsActual: 0.05,
    epsEstimate: -0.02,
    revenueActual: 2_500_000,
    revenueEstimate: 1_900_000,
    netIncome: 900_000,
    holdingsAtQuarterEnd: 9_000,  // Estimated from YTD growth trajectory
    sharesAtQuarterEnd: 20_087_981,  // SEC 10-K basic shares
    holdingsPerShare: 0.000448,  // 9000 / 20087981
    source: "sec-filing",
    status: "reported",
  },

  // ========== SharpLink Gaming (SBET) ==========
  // Calendar year company (fiscal = calendar)
  // ETH treasury pivot: June 2025. Pre-pivot data not meaningful for DAT analysis.
  // Note: 1:12 reverse split May 5, 2025. Share counts post-split unless noted.
  // SEC XBRL CIK: 0001981535
  //
  // ETH Holdings Breakdown (as of Dec 14, 2025 per 8-K filed Dec 17):
  //   - Native ETH: 639,241
  //   - LsETH (liquid staking, as-if redeemed): 224,183
  //   - Total: 863,424 ETH
  //   - Staking rewards earned since Jun 2: 9,241 ETH (3,350 native + 5,891 from LsETH)
  //   - ~100% of ETH is staked for yield
  //
  // Q4 2025 - 10-K upcoming, but holdings available from 8-K
  {
    ticker: "SBET",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-14",
    earningsTime: "AMC",
    // Holdings from 8-K filed Dec 17, 2025 (as of Dec 14)
    holdingsAtQuarterEnd: 863_424,  // 639,241 native ETH + 224,183 LsETH (as-if redeemed)
    sharesAtQuarterEnd: 196_693_191,  // SEC XBRL EntityCommonStockSharesOutstanding at Nov 12 filing
    holdingsPerShare: 0.004390,  // 863424 / 196693191
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225028063/form8-k.htm",
    status: "upcoming",  // Full financials (EPS, revenue) pending 10-K in March
  },
  // Q3 2025 - First full quarter post-ETH pivot (filed 2025-11-12)
  {
    ticker: "SBET",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-11",
    earningsTime: "AMC",
    epsActual: 0.62,  // SEC XBRL EarningsPerShareDiluted (quarterly)
    revenueActual: 10_843_567,  // SEC XBRL Revenues (quarterly Jul-Sep)
    netIncome: 104_270_205,  // SEC XBRL NetIncomeLoss (quarterly Jul-Sep) - includes crypto gains
    holdingsAtQuarterEnd: 817_747,  // SEC 10-Q: 580,841 native + 236,906 LsETH (as-if redeemed)
    sharesAtQuarterEnd: 180_000_000,  // Interpolated from Aug 31 (170M) to Oct 19 (184.5M)
    holdingsPerShare: 0.004543,  // 817747 / 180000000
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225021970/",
    status: "reported",
  },
  // Q2 2025 - ETH pivot initiated June 2025 (filed 2025-08-14)
  // Note: Strategy launched Jun 2, 2025 - only ~4 weeks of accumulation in Q2
  {
    ticker: "SBET",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-08-13",
    earningsTime: "AMC",
    epsActual: -4.27,  // SEC XBRL EarningsPerShareBasic (quarterly Apr-Jun)
    revenueActual: 697_291,  // SEC XBRL RevenueFromContractWithCustomerExcludingAssessedTax (quarterly)
    netIncome: -103_422_727,  // SEC XBRL NetIncomeLoss (quarterly Apr-Jun) - crypto mark-to-market losses
    holdingsAtQuarterEnd: 200_000,  // Jun 30, 2025 - interpolated from Jun 27 (198K) and Jul 4 (205K) 8-Ks
    sharesAtQuarterEnd: 145_000_000,  // Interpolated from weekly ATM dilution
    holdingsPerShare: 0.001379,  // 200000 / 145000000
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001981535&type=10-Q",
    status: "reported",
  },
  // Q1 2025 - Pre-ETH pivot (filed 2025-05-15)
  {
    ticker: "SBET",
    fiscalYear: 2025,
    fiscalQuarter: 1,
    calendarYear: 2025,
    calendarQuarter: 1,
    earningsDate: "2025-05-14",
    earningsTime: "AMC",
    epsActual: -1.84,  // SEC XBRL EarningsPerShareBasic (quarterly Jan-Mar)
    revenueActual: 741_731,  // SEC XBRL RevenueFromContractWithCustomerExcludingAssessedTax (quarterly)
    netIncome: -974_901,  // SEC XBRL NetIncomeLoss (quarterly Jan-Mar)
    holdingsAtQuarterEnd: 0,  // Pre-ETH pivot
    sharesAtQuarterEnd: 575_255,  // SEC XBRL CommonStockSharesOutstanding at Mar 31
    holdingsPerShare: 0,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001981535&type=10-Q",
    status: "reported",
  },

  // ========== Bit Digital (BTBT) ==========
  // Calendar year company (fiscal = calendar)
  // Q4 2025 - Upcoming (holdings from Jan 7, 2026 press release)
  {
    ticker: "BTBT",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-12",
    earningsTime: "BMO",
    holdingsAtQuarterEnd: 155_227,
    sharesAtQuarterEnd: 323_792_059,
    holdingsPerShare: 0.000479,
    source: "press-release",
    status: "upcoming",
  },
  // Q3 2025
  {
    ticker: "BTBT",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-13",
    earningsTime: "BMO",
    epsActual: 0.03,
    epsEstimate: -0.01,
    revenueActual: 28_800_000,
    revenueEstimate: 25_000_000,
    netIncome: 4_100_000,
    holdingsAtQuarterEnd: 140_000,
    sharesAtQuarterEnd: 324_000_000,
    holdingsPerShare: 0.000432,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2025
  {
    ticker: "BTBT",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-08-13",
    earningsTime: "BMO",
    epsActual: -0.05,
    epsEstimate: -0.03,
    revenueActual: 22_500_000,
    revenueEstimate: 24_000_000,
    netIncome: -8_500_000,
    holdingsAtQuarterEnd: 120_000,
    sharesAtQuarterEnd: 315_000_000,
    holdingsPerShare: 0.000381,
    source: "sec-filing",
    status: "reported",
  },
  // Q1 2025
  {
    ticker: "BTBT",
    fiscalYear: 2025,
    fiscalQuarter: 1,
    calendarYear: 2025,
    calendarQuarter: 1,
    earningsDate: "2025-05-13",
    earningsTime: "BMO",
    holdingsAtQuarterEnd: 85_000,
    sharesAtQuarterEnd: 207_780_871,
    holdingsPerShare: 0.000409,
    source: "sec-filing",
    status: "reported",
  },

  // ========== GameSquare (GAME) ==========
  // Calendar year company (fiscal = calendar)
  // SEC CIK: 0001714562
  // ETH treasury strategy: Most holdings via Dialectic Medici ETH Fund ($64.5M as of Q3 2025)
  // Direct ETH holdings: 1,608 ETH ($4M at $2,500)
  // Note: Only direct holdings tracked here; fund exposure in cryptoInvestments field
  //
  // Q4 2025 - Upcoming
  {
    ticker: "GAME",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-15",  // Estimated ~75 days after Dec 31
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 1_608,  // Direct ETH only (fund holdings separate)
    sharesAtQuarterEnd: 94_845_193,  // 98.4M - 3.54M buybacks through Jan 6, 2026
    holdingsPerShare: 0.0000170,  // 1608 / 94845193
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1714562&type=10-Q",
    status: "upcoming",
  },
  // Q3 2025 - First full quarter with ETH holdings (10-Q filed Nov 14, 2025)
  {
    ticker: "GAME",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-14",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 1_608,  // $4,020,415 / $2,500 = 1,608 ETH (SEC 10-Q Sep 30, 2025)
    sharesAtQuarterEnd: 87_949_202,  // SEC XBRL WeightedAverageNumberOfDilutedSharesOutstanding Q3 2025
    holdingsPerShare: 0.0000183,  // 1608 / 87949202
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1714562&type=10-Q",
    status: "reported",
  },
  // Q2 2025 - Pre-ETH strategy
  {
    ticker: "GAME",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-08-14",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 0,  // Pre-ETH treasury
    sharesAtQuarterEnd: 38_968_089,  // SEC XBRL WeightedAverageNumberOfDilutedSharesOutstanding Q2 2025
    holdingsPerShare: 0,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1714562&type=10-Q",
    status: "reported",
  },

  // ==================== SOL COMPANIES ====================

  // ========== Sol Strategies (STKE) ==========
  // Calendar year normalized
  // Q4 2025 - Upcoming
  {
    ticker: "STKE",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-28",
    earningsTime: null,
    source: "estimated",
    status: "upcoming",
  },
  // Q3 2025 (Jul-Sep) - from 40-F
  {
    ticker: "STKE",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-12-31",
    earningsTime: null,
    holdingsAtQuarterEnd: 435_000,
    sharesAtQuarterEnd: 22_999_841,
    holdingsPerShare: 0.0189,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1846839/000110465925125666",
    status: "reported",
  },
  // Q2 2025 (Apr-Jun)
  {
    ticker: "STKE",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-08-29",
    earningsTime: null,
    holdingsAtQuarterEnd: 310_000,
    sharesAtQuarterEnd: 10_600_000,
    holdingsPerShare: 0.0292,
    source: "press-release",
    status: "reported",
  },
  // Q1 2025 (Jan-Mar)
  {
    ticker: "STKE",
    fiscalYear: 2025,
    fiscalQuarter: 1,
    calendarYear: 2025,
    calendarQuarter: 1,
    earningsDate: "2025-05-30",
    earningsTime: null,
    holdingsAtQuarterEnd: 245_000,
    sharesAtQuarterEnd: 9_400_000,
    holdingsPerShare: 0.0261,
    source: "press-release",
    status: "reported",
  },
  // Q4 2024 (Oct-Dec)
  {
    ticker: "STKE",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    calendarYear: 2024,
    calendarQuarter: 4,
    earningsDate: "2025-02-28",
    earningsTime: null,
    holdingsAtQuarterEnd: 189_000,
    sharesAtQuarterEnd: 8_100_000,
    holdingsPerShare: 0.0233,
    source: "press-release",
    status: "reported",
  },

  // ========== DeFi Development Corp (DFDV) ==========
  // Calendar year company (fiscal = calendar)
  // Q4 2025 - Upcoming
  {
    ticker: "DFDV",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-15",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },
  // Q3 2025
  {
    ticker: "DFDV",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-14",
    earningsTime: "AMC",
    epsActual: -0.15,
    epsEstimate: -0.12,
    revenueActual: 200_000,
    revenueEstimate: 400_000,
    netIncome: -2_800_000,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2025
  {
    ticker: "DFDV",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-08-14",
    earningsTime: "AMC",
    epsActual: -0.18,
    epsEstimate: -0.14,
    revenueActual: 150_000,
    revenueEstimate: 350_000,
    netIncome: -3_200_000,
    source: "sec-filing",
    status: "reported",
  },

  // ========== Solana Company (HSDT, fka Helius Medical) ==========
  // Calendar year company (fiscal = calendar), FY end Dec 31
  // SOL treasury began ~May 2025, partnered with Pantera Capital + Summer Capital
  // Verified 2026-01-29 via SEC XBRL Q3 2025 (CIK 0001610853)
  //
  // Q4 2025 - Upcoming (10-K due ~Mar 2026)
  {
    ticker: "HSDT",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-15",  // Estimated 10-K filing
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 2_300_000,  // Oct 29, 2025 8-K (~2.3M SOL, best available)
    sharesAtQuarterEnd: 75_900_000,  // Q3 press release: "75.9M common shares and pre-funded warrants"
    holdingsPerShare: 0.0303,  // 2.3M / 75.9M
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1610853/000110465925103714/hsdt-20251029xex99d1.htm",
    status: "upcoming",
  },
  // Q3 2025 - Reported (10-Q Nov 18, 2025)
  {
    ticker: "HSDT",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-18",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 1_739_355,  // SEC XBRL: 1,393,804 unrestricted + 345,551 restricted
    sharesAtQuarterEnd: 75_900_000,  // Q3 press release: "75.9M common shares and pre-funded warrants"
    holdingsPerShare: 0.0229,  // 1.74M / 75.9M
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001610853&type=10-Q",
    status: "reported",
  },

  // ========== Forward Industries (FWDI) ==========
  // Fiscal year end: September 30
  // $1.65B PIPE closed Sep 11, 2025 - SOL treasury began
  // FY 2025 Q4 (Jul-Sep 2025) = First quarter with SOL holdings
  // Verified 2026-01-28 via SEC XBRL
  //
  // FY 2026 Q1 (Oct-Dec 2025) - Upcoming, Dec shareholder update available
  {
    ticker: "FWDI",
    fiscalYear: 2026,
    fiscalQuarter: 1,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-02-14",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 6_921_342,  // Dec 1, 2025 shareholder update
    sharesAtQuarterEnd: 112_505_114,  // 86.1M basic + 26.4M pre-funded warrants
    holdingsPerShare: 0.0615,
    source: "press-release",
    sourceUrl: "https://www.forwardindustries.com/",
    status: "upcoming",
  },
  // FY 2025 Q4 (Jul-Sep 2025) - First SOL quarter
  {
    ticker: "FWDI",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-12-11",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 6_854_000,  // SEC XBRL CryptoAssetNumberOfUnits
    sharesAtQuarterEnd: 112_505_114,  // 86.1M basic + 26.4M pre-funded warrants
    holdingsPerShare: 0.0609,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000038264&type=10-K",
    status: "reported",
  },

  // ========== Upexi (UPXI) ==========
  // Fiscal year ends June 30
  // FY Q1 = Jul-Sep (CY Q3), FY Q2 = Oct-Dec (CY Q4), FY Q3 = Jan-Mar (CY Q1), FY Q4 = Apr-Jun (CY Q2)
  // SOL treasury began April 2025 with Arthur Hayes advisory
  // Verified 2026-01-29 via SEC EDGAR (CIK 0001775194)
  //
  // FY 2026 Q2 (Oct-Dec 2025) = CY Q4 2025 - Upcoming
  {
    ticker: "UPXI",
    fiscalYear: 2026,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-02-14",  // Estimated 10-Q filing
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 2_174_583,  // Jan 5, 2026 8-K (most recent before Q-end)
    sharesAtQuarterEnd: 62_178_230,  // 58.9M + 3.29M PIPE shares
    holdingsPerShare: 0.0350,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1775194/000147793226000137/upxi_ex991.htm",
    status: "upcoming",
  },
  // FY 2026 Q1 (Jul-Sep 2025) = CY Q3 2025 - Reported (10-Q Nov 12, 2025)
  {
    ticker: "UPXI",
    fiscalYear: 2026,
    fiscalQuarter: 1,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-12",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 2_018_419,  // SEC 10-Q Sep 30, 2025
    sharesAtQuarterEnd: 58_888_756,  // SEC 10-Q basic shares
    holdingsPerShare: 0.0343,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001775194&type=10-Q",
    status: "reported",
  },
  // FY 2025 Q4 (Apr-Jun 2025) = CY Q2 2025 - First full SOL quarter
  {
    ticker: "UPXI",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-09-26",  // 8-K results announcement
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 735_692,  // Holdings history
    sharesAtQuarterEnd: 28_000_000,  // Approximate from holdings history
    holdingsPerShare: 0.0263,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001775194&type=8-K",
    status: "reported",
  },

  // ==================== SUI COMPANIES ====================

  // ========== SUI Group Holdings (SUIG) ==========
  // Calendar year company (fiscal year ends December 31)
  // Formerly Mill City Ventures (MCVT), renamed Aug 26, 2025
  // DAT strategy launched late July 2025
  // Verified 2026-01-29 via SEC EDGAR (CIK 0001425355)
  // Only public company with Sui Foundation relationship
  // Note: "Fully adjusted shares" = basic + pre-funded warrants
  //
  // Q4 2025 - Upcoming
  {
    ticker: "SUIG",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-31",  // Estimated - 10-K due ~90 days after FY end
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 108_098_436,  // Jan 8, 2026 8-K (as of Jan 7)
    sharesAtQuarterEnd: 80_900_000,  // Jan 8, 2026 8-K "fully adjusted shares"
    holdingsPerShare: 1.336,  // 108,098,436 / 80,900,000
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1425355/000165495426000201/suig_8k.htm",
    status: "upcoming",
  },
  // Q3 2025 - SEC 10-Q filed Nov 13, 2025
  {
    ticker: "SUIG",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-13",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 106_000_000,  // SEC 10-Q: "106 million SUI tokens" (valued at $344.5M @ $3.26)
    sharesAtQuarterEnd: 89_075_630,  // 10-Q: ~1.19 SUI per share → 106M / 1.19 ≈ 89M
    holdingsPerShare: 1.190,  // Per 10-Q: "approximately 1.19 SUI per-share of common stock and Pre-Funded Warrants"
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001425355&type=10-Q",
    status: "reported",
  },

  // ==================== TRX COMPANIES ====================

  // ========== Tron Inc (TRON) ==========
  // Calendar year company (fiscal = calendar)
  // Formerly SRM Entertainment, rebranded to Tron Inc in 2025
  // DAT strategy began June 2025 with TRX treasury
  // Justin Sun backing, JustLend staking
  //
  // Q4 2025 - Upcoming
  {
    ticker: "TRON",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-31",  // Estimated - 10-K due ~90 days after FY end
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 677_000_000,  // Jan 23, 2026 8-K
    sharesAtQuarterEnd: 274_382_064,  // Dec 29, 2025 8-K
    holdingsPerShare: 2.468,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1956744&type=8-K",
    status: "upcoming",
  },
  // Q3 2025 - SEC 10-Q filed Nov 10, 2025
  {
    ticker: "TRON",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-10",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 677_596_945,  // After Sep warrant exercise
    sharesAtQuarterEnd: 257_115_400,  // SEC XBRL
    holdingsPerShare: 2.636,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1956744&type=10-Q",
    status: "reported",
  },

  // ==================== BNB COMPANIES ====================

  // ========== CEA Industries (BNC) ==========
  // Fiscal year ends April 30
  // FY Q1 = May-Jul (CY Q3), FY Q2 = Aug-Oct (CY Q4), FY Q3 = Nov-Jan (CY Q1), FY Q4 = Feb-Apr (CY Q2)
  // DAT strategy began June 2025 with $500M PIPE
  // World's largest BNB treasury - target 1% of BNB supply
  //
  // FY Q3 2026 (Nov-Jan 2026) - Current quarter
  {
    ticker: "BNC",
    fiscalYear: 2026,
    fiscalQuarter: 3,
    calendarYear: 2026,
    calendarQuarter: 1,
    earningsDate: "2026-03-15",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },
  // FY Q2 2026 (Aug-Oct 2025) - Major accumulation quarter
  {
    ticker: "BNC",
    fiscalYear: 2026,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2025-12-15",
    earningsTime: "AMC",
    epsActual: 5.36,
    netIncome: 283_600_000,
    holdingsAtQuarterEnd: 512_000,
    sharesAtQuarterEnd: 44_062_938,
    holdingsPerShare: 11.62,
    source: "press-release",
    sourceUrl: "https://www.globenewswire.com/news-release/2025/12/15/3205902/0/en/CEA-Industries-BNC-Reports-FY-Q2-2026-Earnings-Results.html",
    status: "reported",
  },
  // FY Q1 2026 (May-Jul 2025) - Initial treasury setup
  {
    ticker: "BNC",
    fiscalYear: 2026,
    fiscalQuarter: 1,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-09-15",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 150_000,
    sharesAtQuarterEnd: 45_000_000,
    holdingsPerShare: 3.333,
    source: "sec-filing",
    status: "reported",
  },

  // ========== Nano Labs (NA) ==========
  // Calendar year company (FY ends December 31)
  // Foreign Private Issuer (Cayman Islands) - files 20-F (annual) + 6-K (current)
  // BNB treasury strategy began July 2025
  // Verified 2026-01-29 via SEC EDGAR (CIK 0001872302)
  //
  // FY 2025 - Full year (includes BNB treasury period Jul-Dec)
  {
    ticker: "NA",
    fiscalYear: 2025,
    fiscalQuarter: 4,  // Annual report covers full year
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-04-30",  // 20-F due ~120 days after FY end
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 130_000,  // Dec 31, 2025 6-K: "over 130,000 BNB"
    sharesAtQuarterEnd: 20_700_000,  // Estimated from holdings-history
    holdingsPerShare: 6.280,  // 130,000 / 20,700,000
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1872302&type=6-K",
    status: "upcoming",
  },
  // H1 2025 (Jan-Jun 2025) - Pre-treasury baseline
  {
    ticker: "NA",
    fiscalYear: 2025,
    fiscalQuarter: 2,  // Semi-annual
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-09-30",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 0,  // No BNB yet - DAT started Jul 2025
    sharesAtQuarterEnd: 15_674_052,  // FY2024 20-F share count
    holdingsPerShare: 0,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1872302&type=6-K",
    status: "reported",
  },

  // ==================== HYPE COMPANIES ====================

  // ========== Hyperliquid Strategies (PURR) ==========
  // Calendar year company (fiscal = calendar), FY end Dec 31
  // Formed via Sonnet BioTherapeutics + Rorschach I merger on Dec 2, 2025
  // Q1 2026 - Upcoming
  {
    ticker: "PURR",
    fiscalYear: 2026,
    fiscalQuarter: 1,
    calendarYear: 2026,
    calendarQuarter: 1,
    earningsDate: "2026-05-15",  // Estimated ~45 days after Q1 end
    earningsTime: null,
    source: "manual",
    status: "upcoming",
  },
  // Q4 2025 - First quarter (partial: Dec 2-31, 2025)
  {
    ticker: "PURR",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-15",  // Estimated ~75 days after Q4 end (10-K timing)
    earningsTime: null,
    holdingsAtQuarterEnd: 12_000_000,  // 12M HYPE staked via Anchorage
    sharesAtQuarterEnd: 127_025_563,  // SEC 10-Q Dec 8, 2025
    holdingsPerShare: 0.0944,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/2078856/000149315225025886/form8-k.htm",
    status: "upcoming",
  },

  // ========== Hyperion DeFi (HYPD) - fka Eyenovia ==========
  // Calendar year company (fiscal year ends Dec 31)
  // Rebranded from Eyenovia to Hyperion DeFi on Jul 1, 2025
  // 1-for-80 reverse split Jan 31, 2025
  // First US public HYPE treasury company
  // SEC CIK: 0001682639
  // Verified 2026-01-30
  //
  // Holdings note: Direct HYPE tracked in holdings field, iHYPE (liquid staked) tracked in cryptoInvestments
  // Combined HYPE exposure: ~1.46M direct + ~1.35M via iHYPE = ~2.81M HYPE
  //
  // Q4 2025 (Oct-Dec) - 10-K upcoming, using Q3 holdings as placeholder
  // Note: HYPD doesn't publish regular holdings updates; Q4 data pending 10-K (~Mar 2026)
  {
    ticker: "HYPD",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-31",  // 10-K expected ~90 days after Dec 31
    earningsTime: "AMC",
    // Using Q3 holdings as placeholder - no 8-K updates with Q4 holdings
    holdingsAtQuarterEnd: 1_459_615,  // Q3 holdings (placeholder)
    sharesAtQuarterEnd: 24_400_000,  // 8.1M common + 16.3M from preferred
    holdingsPerShare: 0.0598,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1682639&type=10-Q",
    status: "upcoming",
  },
  // Q3 2025 (Jul-Sep) - First full quarter as HYPE treasury
  // Source: SEC 10-Q filed Nov 14, 2025 (CIK 1682639)
  {
    ticker: "HYPD",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-14",
    earningsTime: "AMC",
    netIncome: -5_800_000,  // Q3 net loss from operations + crypto mark-to-market
    // Direct HYPE only (iHYPE tracked separately in cryptoInvestments)
    // SEC 10-Q: "Digital assets" $37.95M at Sep 30, 2025
    // At ~$26/HYPE (Sep 30 price): $37.95M / $26 = ~1,459,615 HYPE
    holdingsAtQuarterEnd: 1_459_615,
    // Shares: 8,097,659 common + 5,435,897 preferred × 3 = 24.4M FD
    sharesAtQuarterEnd: 24_400_000,
    holdingsPerShare: 0.0598,  // 1,459,615 / 24,400,000
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1682639&type=10-Q",
    status: "reported",
  },
  // Q2 2025 (Apr-Jun) - Partial quarter (DAT pivot announced Jun 17, 2025)
  // Pre-HYPE: company was still focused on ophthalmic devices
  {
    ticker: "HYPD",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-08-14",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 0,  // DAT pivot announced Jun 17, first purchases in Q3
    sharesAtQuarterEnd: 8_097_659,  // Pre-PIPE shares only
    holdingsPerShare: 0,
    source: "sec-filing",
    status: "reported",
  },

  // ==================== HK/INTL COMPANIES ====================

  // ========== Boyaa Interactive (0434.HK) ==========
  // Calendar year FY (Dec 31). Source: HKEX Interim/Annual Results
  // Note: All financials in HKD (not USD)
  // Q2 2025 (H1 2025 Interim Results)
  {
    ticker: "0434.HK",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-08-28", // H1 2025 results announcement (estimated)
    earningsTime: null,
    revenueActual: 110_713_000, // HK$110.7M (Q2 standalone)
    netIncome: 449_581_000, // HK$449.6M profit (includes BTC FV gains)
    holdingsAtQuarterEnd: 3_353, // BTC Yield table
    sharesAtQuarterEnd: 710_698_730,
    holdingsPerShare: 0.00000472,
    source: "press-release",
    sourceUrl: "https://www1.hkexnews.hk/listedco/listconews/sehk/2025/0828/",
    status: "reported",
  },
  // Q1 2025 (derived from H1 2025 - Q2 2025)
  {
    ticker: "0434.HK",
    fiscalYear: 2025,
    fiscalQuarter: 1,
    calendarYear: 2025,
    calendarQuarter: 1,
    earningsDate: "2025-05-15", // Q1 results (estimated)
    earningsTime: null,
    revenueActual: 111_892_000, // HK$111.9M (H1 222.6M - Q2 110.7M)
    netIncome: -223_561_000, // HK$(223.6)M loss (H1 226M - Q2 449.6M; BTC FV loss in Q1)
    holdingsAtQuarterEnd: 3_351, // BTC Yield table
    sharesAtQuarterEnd: 710_183_730,
    holdingsPerShare: 0.00000472,
    source: "press-release",
    status: "reported",
  },
  // Q3 2025 (Q3 2025 Results - Nov 17, 2025)
  {
    ticker: "0434.HK",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-17",
    earningsTime: null,
    holdingsAtQuarterEnd: 4_091, // Q3 2025 results
    sharesAtQuarterEnd: 768_004_730, // Post Sep 2025 placement
    holdingsPerShare: 0.00000533,
    source: "press-release",
    sourceUrl: "https://www1.hkexnews.hk/listedco/listconews/sehk/2025/1117/2025111700291.pdf",
    status: "reported",
  },
  // Q4 2024 (FY 2024 Annual Results)
  {
    ticker: "0434.HK",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    calendarYear: 2024,
    calendarQuarter: 4,
    earningsDate: "2025-03-28", // FY 2024 results (estimated)
    earningsTime: null,
    holdingsAtQuarterEnd: 3_274, // BTC Yield table
    sharesAtQuarterEnd: 710_183_730,
    holdingsPerShare: 0.00000461,
    source: "press-release",
    status: "reported",
  },
  // Q3 2024 (Q3 2024 Results)
  {
    ticker: "0434.HK",
    fiscalYear: 2024,
    fiscalQuarter: 3,
    calendarYear: 2024,
    calendarQuarter: 3,
    earningsDate: "2024-11-17", // Estimated
    earningsTime: null,
    holdingsAtQuarterEnd: 2_635, // BTC Yield table
    sharesAtQuarterEnd: 709_576_301,
    holdingsPerShare: 0.00000371,
    source: "press-release",
    status: "reported",
  },
  // Q2 2024 (H1 2024 from H1 2025 filing comparative)
  {
    ticker: "0434.HK",
    fiscalYear: 2024,
    fiscalQuarter: 2,
    calendarYear: 2024,
    calendarQuarter: 2,
    earningsDate: "2024-08-28",
    earningsTime: null,
    revenueActual: 115_205_000, // HK$115.2M (Q2 2024)
    netIncome: -74_670_000, // HK$(74.7)M loss
    holdingsAtQuarterEnd: 2_079, // BTC Yield table
    sharesAtQuarterEnd: 709_576_301,
    holdingsPerShare: 0.00000293,
    source: "press-release",
    status: "reported",
  },
  // Q1 2024 (derived)
  {
    ticker: "0434.HK",
    fiscalYear: 2024,
    fiscalQuarter: 1,
    calendarYear: 2024,
    calendarQuarter: 1,
    earningsDate: "2024-05-15", // Estimated
    earningsTime: null,
    holdingsAtQuarterEnd: 1_194, // BTC Yield table
    sharesAtQuarterEnd: 709_576_301,
    holdingsPerShare: 0.00000168,
    source: "press-release",
    status: "reported",
  },

  // ========== Capital B (ALTBG) - The Blockchain Group ==========
  // French company, Euronext Growth Paris (ISIN: FR0011053636)
  // Fiscal year: Calendar year (Jan-Dec). Reports H1 (Jun 30) and FY (Dec 31).
  // Data from AMF filings + company website (cptlb.com/analytics)
  // BTC treasury strategy launched Nov 5, 2024 ("Europe's first Bitcoin Treasury Company")
  // Verified 2026-01-29 via Euronext + cptlb.com
  //
  // H2 2025 / FY 2025 (Dec 31) - Upcoming
  {
    ticker: "ALTBG",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-04-30", // Estimated annual report (French companies have 4 months post FY-end)
    earningsTime: null,
    holdingsAtQuarterEnd: 2_823, // Nov 25, 2025 AMF filing (most recent)
    sharesAtQuarterEnd: 226_884_068, // Basic shares per mNAV.com Jan 2026
    holdingsPerShare: 0.0000124,
    source: "manual",
    sourceUrl: "https://fr.ftp.opendatasoft.com/datadila/INFOFI/ACT/2025/11/FCACT077244_20251125.pdf",
    status: "upcoming",
  },
  // H1 2025 (Jun 30) - Reported
  {
    ticker: "ALTBG",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-09-30", // H1 2025 report release
    earningsTime: null,
    holdingsAtQuarterEnd: 2_201, // Holdings history
    sharesAtQuarterEnd: 48_000_000, // Pre-Sep 2025 dilution
    holdingsPerShare: 0.0000459,
    source: "manual",
    status: "reported",
  },
  // H2 2024 / FY 2024 (Dec 31) - Reported
  {
    ticker: "ALTBG",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    calendarYear: 2024,
    calendarQuarter: 4,
    earningsDate: "2025-04-30", // Annual report
    earningsTime: null,
    holdingsAtQuarterEnd: 1_800, // Holdings history
    sharesAtQuarterEnd: 45_000_000,
    holdingsPerShare: 0.0000400,
    source: "manual",
    status: "reported",
  },
  // H1 2024 (Jun 30) - Reported
  {
    ticker: "ALTBG",
    fiscalYear: 2024,
    fiscalQuarter: 2,
    calendarYear: 2024,
    calendarQuarter: 2,
    earningsDate: "2024-09-30", // H1 2024 report
    earningsTime: null,
    holdingsAtQuarterEnd: 1_200, // Holdings history
    sharesAtQuarterEnd: 42_000_000,
    holdingsPerShare: 0.0000286,
    source: "manual",
    status: "reported",
  },

  // ==================== ZEC COMPANIES ====================

  // ========== Cypherpunk Technologies (CYPH) ==========
  // Calendar year company (fiscal year end 12/31)
  // DAT start: Oct 8, 2025 (PIPE closed) - pivoted from Leap Therapeutics (pharma)
  // First ZEC treasury quarter: Q4 2025

  // Q1 2026 (Jan-Mar) - Upcoming
  {
    ticker: "CYPH",
    fiscalYear: 2026,
    fiscalQuarter: 1,
    calendarYear: 2026,
    calendarQuarter: 1,
    earningsDate: "2026-05-15", // Expected ~45 days after Mar 31
    earningsTime: "AMC",
    source: "estimated",
    status: "upcoming",
  },
  // Q4 2025 (Oct-Dec) - First quarter with ZEC holdings, 10-K expected ~Mar 2026
  {
    ticker: "CYPH",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-17", // 10-K expected ~75 days after Dec 31 (accelerated filer)
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 290_062, // Dec 30, 2025 8-K: 290,062.67 ZEC
    sharesAtQuarterEnd: 137_420_344, // Basic (56.6M) + Pre-funded warrants (80.8M)
    holdingsPerShare: 2.111, // 290,062 / 137,420,344
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1509745/000110465925125039/tm2534480d2_8k.htm",
    status: "upcoming", // Awaiting 10-K
  },
  // Q3 2025 (Jul-Sep) - Pre-DAT (was Leap Therapeutics pharma company, no ZEC)
  {
    ticker: "CYPH",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-14", // 10-Q filed
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 0, // Pre-DAT - company was Leap Therapeutics
    sharesAtQuarterEnd: 56_600_000, // Pre-PIPE basic shares
    holdingsPerShare: 0,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1509745&type=10-Q",
    status: "reported",
  },

  // ==================== AVAX COMPANIES ====================

  // ========== AVAX One Technology (AVX) ==========
  // DAT start: Nov 5, 2025 (PIPE closed)
  // Prior: AgriFORCE Growing Systems (agriculture tech, no crypto holdings)
  // NOTE: AVAX token count not SEC-disclosed until Q4 2025 10-K

  // Q1 2026 (Jan-Mar) - Upcoming
  {
    ticker: "AVX",
    fiscalYear: 2026,
    fiscalQuarter: 1,
    calendarYear: 2026,
    calendarQuarter: 1,
    earningsDate: "2026-05-15", // Expected ~45 days after Mar 31
    earningsTime: "AMC",
    source: "estimated",
    status: "upcoming",
  },
  // Q4 2025 (Oct-Dec) - First full quarter post-PIPE, 10-K expected Feb/Mar 2026
  {
    ticker: "AVX",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-01", // 10-K expected ~60 days after Dec 31
    earningsTime: "AMC",
    // Dashboard shows 13.889M AVAX as of Feb 12, 2026 (includes staking rewards)
    // Shares: 92.672M (post-PIPE 93.1M minus buybacks)
    holdingsAtQuarterEnd: 13_889_000, // Dashboard Feb 12, 2026 (pending SEC 10-K verification)
    sharesAtQuarterEnd: 92_672_000, // Dashboard Feb 12 (93.1M - buybacks)
    holdingsPerShare: 0.1499, // 13.889M / 92.672M
    source: "company-dashboard",
    sourceUrl: "https://analytics-avaxone.theblueprint.xyz/",
    status: "upcoming", // Awaiting 10-K SEC filing (due ~March 2026)
  },
  // Q3 2025 (Jul-Sep) - Pre-PIPE (no AVAX holdings)
  {
    ticker: "AVX",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-14", // 10-Q filed
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 0, // Pre-PIPE - company was AgriFORCE with no AVAX
    sharesAtQuarterEnd: 4_128_089, // Pre-PIPE share count (10-Q XBRL, post 1:9 reverse split Jul 2025)
    holdingsPerShare: 0,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1826397/000149315225023464/form10-q.htm",
    status: "reported",
  },

  // ==================== LTC COMPANIES ====================

  // ========== Lite Strategy (LITS) ==========
  // Fiscal year ends June 30 (formerly MEI Pharma)
  // First US-listed LTC treasury - launched Jul 2025
  // CIK: 0001262104
  //
  // Q2 FY2026 (Oct-Dec 2025) - Upcoming
  {
    ticker: "LITS",
    fiscalYear: 2026,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-02-14",
    earningsTime: null,
    source: "estimated",
    status: "upcoming",
  },
  // Q1 FY2026 (Jul-Sep 2025)
  {
    ticker: "LITS",
    fiscalYear: 2026,
    fiscalQuarter: 1,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-14",
    earningsTime: null,
    holdingsAtQuarterEnd: 929_548,
    sharesAtQuarterEnd: 36_769_677,
    holdingsPerShare: 0.0253,  // 929,548 / 36,769,677
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1262104/000119312525283111",
    status: "reported",
  },

  // ========== Luxxfolio Holdings (LUXFF) - CSE: LUXX ==========
  // Fiscal year ends August 31. Canadian company filing on SEDAR+ (Profile: 000044736)
  // LTC treasury strategy - Charlie Lee + David Schwartz on advisory
  // 1:10 reverse split Mar 21, 2025. All share counts post-split.
  //
  // FY2026 Q1 (Sep-Nov 2025) - Upcoming
  {
    ticker: "LUXFF",
    fiscalYear: 2026,
    fiscalQuarter: 1,
    calendarYear: 2025,
    calendarQuarter: 4,  // Sep-Nov 2025 falls mostly in CY Q4
    earningsDate: "2026-01-30",  // Estimated ~60 days after Nov 30
    earningsTime: null,
    source: "estimated",
    status: "upcoming",
  },
  // FY2025 (Sep 2024 - Aug 2025) - Annual audited report filed Dec 29, 2025
  {
    ticker: "LUXFF",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 3,  // Fiscal year end Aug 31 = CY Q3
    earningsDate: "2025-12-29",  // Audited annual filing date
    earningsTime: null,
    holdingsAtQuarterEnd: 20_226,  // LTC holdings Aug 31, 2025 (SEDAR+ audited)
    sharesAtQuarterEnd: 31_554_164,  // 26.9M basic + 4.6M Dec 9 placement
    holdingsPerShare: 0.000641,  // 20226 / 31554164
    source: "manual",  // SEDAR+ (Canadian regulatory filing)
    sourceUrl: "https://www.sedarplus.ca/csa-party/service/create.html?targetAppCode=csa-party&service=searchDocuments",
    status: "reported",
  },
  // FY2025 Q3 (Mar-May 2025) - Post 1:10 reverse split (Mar 21, 2025)
  {
    ticker: "LUXFF",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-07-30",
    earningsTime: null,
    holdingsAtQuarterEnd: 15_000,  // Estimated - ramping LTC accumulation
    sharesAtQuarterEnd: 16_930_164,  // Post-split, pre-Jul placement
    holdingsPerShare: 0.000886,  // 15000 / 16930164
    source: "manual",  // SEDAR+ (Canadian regulatory filing)
    status: "reported",
  },
  // FY2025 Q2 (Dec 2024 - Feb 2025) - Pre-split (adjusted)
  {
    ticker: "LUXFF",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2024,
    calendarQuarter: 4,
    earningsDate: "2025-04-30",
    earningsTime: null,
    holdingsAtQuarterEnd: 8_000,  // Estimated
    sharesAtQuarterEnd: 14_500_000,  // Post-split adjusted (~145M ÷ 10)
    holdingsPerShare: 0.000552,  // 8000 / 14500000
    source: "manual",
    status: "reported",
  },
  // FY2025 Q1 (Sep-Nov 2024) - Pre-split (adjusted)
  {
    ticker: "LUXFF",
    fiscalYear: 2025,
    fiscalQuarter: 1,
    calendarYear: 2024,
    calendarQuarter: 3,
    earningsDate: "2025-01-30",
    earningsTime: null,
    holdingsAtQuarterEnd: 5_000,  // Estimated
    sharesAtQuarterEnd: 13_900_000,  // Post-split adjusted (~139M ÷ 10)
    holdingsPerShare: 0.000360,  // 5000 / 13900000
    source: "manual",
    status: "reported",
  },
  // FY2024 Q4 (Jun-Aug 2024) - LTC treasury strategy launch
  {
    ticker: "LUXFF",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    calendarYear: 2024,
    calendarQuarter: 3,
    earningsDate: "2024-12-15",
    earningsTime: null,
    holdingsAtQuarterEnd: 2_000,  // Estimated - early accumulation
    sharesAtQuarterEnd: 13_900_000,  // Post-split adjusted
    holdingsPerShare: 0.000144,  // 2000 / 13900000
    source: "manual",
    status: "reported",
  },

  // ==================== DOGE COMPANIES ====================

  // ========== CleanCore Solutions (ZONE) ==========
  // Fiscal year ends June 30
  // Official Dogecoin Treasury - launched Sep 5, 2025
  // CIK: 0001956741
  // Source: SEC EDGAR filings
  //
  // Q2 FY2026 (Oct-Dec 2025) - Upcoming
  {
    ticker: "ZONE",
    fiscalYear: 2026,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-02-14",  // Expected ~45 days after Dec 31
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },
  // Q1 FY2026 (Jul-Sep 2025) - Reported Nov 13, 2025
  {
    ticker: "ZONE",
    fiscalYear: 2026,
    fiscalQuarter: 1,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-13",
    earningsTime: "BMO",
    holdingsAtQuarterEnd: 703_617_752,  // Sep 30, 2025 - $163.8M fair value
    sharesAtQuarterEnd: 201_309_022,  // Nov 10, 2025 cover page (post warrant exercises)
    holdingsPerShare: 3.495,  // 703.6M / 201.3M
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1956741/000121390025109642/0001213900-25-109642-index.htm",
    status: "reported",
  },
  // Q4 FY2025 (Apr-Jun 2025) - Pre-treasury (no DOGE holdings)
  {
    ticker: "ZONE",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-09-15",  // 10-K filing
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 0,  // Pre-treasury - DOGE strategy launched Sep 5, 2025
    sharesAtQuarterEnd: 11_837_022,  // Basic shares before PIPE
    holdingsPerShare: 0,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1956741&type=10-K",
    status: "reported",
  },

  // ==================== TAO COMPANIES ====================

  // ========== xTAO Inc (XTAIF) - TSX-V: XTAO.U ==========
  // Fiscal year ends March 31. Canadian company filing on SEDAR+ (Profile: 000108977)
  // IPO: July 22, 2025. World's largest public TAO holder.
  // Verified 2026-02-01 via SEDAR+ Q2 FY26 MD&A
  //
  // Q1 FY26 (Apr-Jun 2025) = Calendar Q2 2025 - Pre-IPO (no TAO holdings)
  // IPO was July 22, 2025 - this quarter had no treasury operations
  {
    ticker: "XTAIF",
    fiscalYear: 2026,
    fiscalQuarter: 1,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-11-25",  // Filed with Q2 in combined interim report
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 0,  // Pre-IPO - no TAO holdings yet
    sharesAtQuarterEnd: 0,  // Pre-IPO - company not yet public
    holdingsPerShare: 0,
    source: "sec-filing",  // SEDAR+ = Canadian equivalent of SEC
    sourceUrl: "https://drive.google.com/file/d/1XJiVIe9jsgwusVoE818yL0OiLWvHKbPd/view",
    status: "reported",
  },
  // Q2 FY26 (Jul-Sep 2025) = Calendar Q3 2025
  {
    ticker: "XTAIF",
    fiscalYear: 2026,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-25",  // SEDAR+ filing date
    earningsTime: "AMC",
    netIncome: -3_879_803,  // Net loss for six months ended Sep 30, 2025
    holdingsAtQuarterEnd: 42_051,  // TAO holdings from SEDAR+ MD&A
    sharesAtQuarterEnd: 38_031_285,  // 28,552,195 basic + 9,479,090 pre-funded warrants
    holdingsPerShare: 0.001106,  // 42,051 / 38,031,285
    source: "sec-filing",  // SEDAR+ = Canadian equivalent of SEC
    sourceUrl: "https://drive.google.com/file/d/1XJiVIe9jsgwusVoE818yL0OiLWvHKbPd/view",
    status: "reported",
  },
  // Q3 FY26 (Oct-Dec 2025) = Calendar Q4 2025 - Upcoming
  // Expected filing: ~mid-Feb 2026 (45 days after Dec 31)
  // Note: Nov 25 press release reported 59,962 TAO - will be confirmed in Q3 filing
  {
    ticker: "XTAIF",
    fiscalYear: 2026,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-02-14",  // Estimated ~45 days after Dec 31
    earningsTime: "AMC",
    // Placeholder: Using Nov 25 press release holdings (59,962 TAO)
    // Will update when Q3 FY26 filing drops on SEDAR+
    holdingsAtQuarterEnd: 59_962,  // Nov 25, 2025 press release (pending Q3 confirmation)
    sharesAtQuarterEnd: 38_031_285,  // Shares unchanged (no new issuance announced)
    holdingsPerShare: 0.001577,  // 59,962 / 38,031,285
    source: "press-release",  // News release filed on SEDAR+ Nov 26, 2025
    sourceUrl: "https://www.newswire.ca/news-releases/xtao-provides-update-on-tao-holdings-816100068.html",
    status: "upcoming",
  },

  // ========== TaoWeave (TWAV) - fka Oblong ==========
  // Fiscal year ends December 31 (calendar year).
  // CIK: 746210 | Ticker changed from OBLG to TWAV Dec 2025
  // TAO strategy announced Jun 2025. 100% staked with BitGo (10% APY).
  // Verified 2026-02-01 via SEC XBRL + 8-K filings
  //
  // Q2 2025 (Apr-Jun) - TAO strategy launch quarter
  {
    ticker: "TWAV",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-08-14",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 20_800,  // Per 10-Q: ~$8M purchase at ~$385/TAO
    sharesAtQuarterEnd: 2_350_307,  // EntityCommonStockSharesOutstanding
    holdingsPerShare: 8.85,  // 20,800 / 2,350,307
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=746210&type=10-Q",
    status: "reported",
  },
  // Q3 2025 (Jul-Sep)
  {
    ticker: "TWAV",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-13",
    earningsTime: "AMC",
    netIncome: -2_290_000,  // XBRL NetIncomeLoss Q3 2025
    holdingsAtQuarterEnd: 21_943,  // 10-Q shows $6.6M digital assets / ~$300 TAO price
    sharesAtQuarterEnd: 3_207_210,  // EntityCommonStockSharesOutstanding
    holdingsPerShare: 6.84,  // 21,943 / 3,207,210
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/746210/0001437749-25-034612-index.html",
    status: "reported",
  },
  // Q4 2025 (Oct-Dec) - Latest 8-K update
  {
    ticker: "TWAV",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-15",  // Estimated 10-K filing
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 24_382,  // Dec 10, 2025 8-K: "increased its TAO holdings to 24,382 tokens"
    sharesAtQuarterEnd: 3_207_210,  // No new issuance announced
    holdingsPerShare: 7.60,  // 24,382 / 3,207,210
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/746210/0001437749-25-037490-index.html",
    status: "upcoming",
  },

  // ==================== DOGE COMPANIES ====================

  // ========== Bit Origin (BTOG) ==========
  // Fiscal year ends June 30. Foreign private issuer (Cayman Islands).
  // CIK: 1735556 | 1:60 reverse split Jan 20, 2026
  // DOGE strategy announced Jul 17, 2025. First purchase Jul 21, 2025.
  // Verified 2026-02-01 via SEC 6-K filings
  //
  // Note: Share counts below are PRE-SPLIT for historical accuracy.
  // Post-split (Jan 20, 2026): divide by 60 for current share count.
  //
  // Q4 FY2025 (Apr-Jun 2025) = Calendar Q2 2025 - Pre-DOGE baseline
  {
    ticker: "BTOG",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-10-31",  // 20-F annual report filed
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 0,  // Pre-DOGE strategy (announced Jul 17, 2025)
    sharesAtQuarterEnd: 88_600_000,  // Pre-split shares
    holdingsPerShare: 0,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1735556/000110465925105009",
    status: "reported",
  },
  // Q1 FY2026 (Jul-Sep 2025) = Calendar Q3 2025 - First DOGE quarter
  // Jul 21: 40.5M DOGE acquired | Aug 12: Reached 70M+ DOGE
  {
    ticker: "BTOG",
    fiscalYear: 2026,
    fiscalQuarter: 1,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-30",  // Estimated 6-K filing
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 70_543_745,  // Aug 12, 2025 press release (end of quarter)
    sharesAtQuarterEnd: 88_600_000,  // Pre-split shares
    holdingsPerShare: 0.796,  // 70.5M / 88.6M
    source: "press-release",
    sourceUrl: "https://www.globenewswire.com/news-release/2025/08/12/3131772/0/en/Bit-Origin-Surpasses-70-Million-Dogecoin-DOGE-Holdings-Following-Private-Placement.html",
    status: "reported",
  },
  // Q2 FY2026 (Oct-Dec 2025) = Calendar Q4 2025 - Upcoming
  // Note: No holdings update since Aug 2025
  // Quarter ends Dec 31, 2025 - BEFORE the Jan 20, 2026 split, so use pre-split shares
  {
    ticker: "BTOG",
    fiscalYear: 2026,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-02-28",  // Estimated 6-K filing (~60 days after quarter end)
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 70_543_745,  // No update since Aug - using last known
    sharesAtQuarterEnd: 88_600_000,  // Pre-split shares (split was Jan 20, 2026)
    holdingsPerShare: 0.796,  // 70.5M / 88.6M
    source: "estimated",
    status: "upcoming",
  },

  // ==================== LINK COMPANIES ====================

  // ========== Caliber (CWD) ==========
  // Calendar year company (fiscal = calendar)
  // SEC CIK: 0001627282
  // First Nasdaq-listed LINK treasury company - strategy launched Sep 2025
  // Real estate asset manager pivoting to LINK
  //
  // IMPORTANT: ~1:19 reverse split in early 2025
  // All 2025 share counts are POST-SPLIT
  // Pre-2025 share counts would need to be divided by ~19 for comparison
  //
  // Q4 2025 - Upcoming
  {
    ticker: "CWD",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-31",  // 10-K expected ~90 days after Dec 31
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 562_535,  // Last known from IR site
    sharesAtQuarterEnd: 6_905_000,  // 6.53M Class A + 0.37M Class B per DEF 14A Jan 7, 2026
    holdingsPerShare: 0.0815,  // 562535 / 6905000
    source: "company-dashboard",
    sourceUrl: "https://ir.caliberco.com/",
    status: "upcoming",
  },
  // Q3 2025 - First full quarter with LINK (10-Q filed Nov 13, 2025)
  // Capital raise increased shares from 1.28M to 2.62M for LINK accumulation
  {
    ticker: "CWD",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-13",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 562_535,  // Sep 30, 2025 - LINK treasury launched
    sharesAtQuarterEnd: 2_615_000,  // SEC XBRL diluted (post-split + capital raise)
    holdingsPerShare: 0.2151,  // 562535 / 2615000
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1627282&type=10-Q",
    status: "reported",
  },
  // Q2 2025 - Pre-LINK strategy (post-split)
  {
    ticker: "CWD",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-08-14",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 0,  // Pre-LINK strategy (launched Sep 2025)
    sharesAtQuarterEnd: 1_278_000,  // SEC XBRL diluted Q2 2025 (post-split)
    holdingsPerShare: 0,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1627282&type=10-Q",
    status: "reported",
  },
  // Q1 2025 - Pre-LINK strategy (post-split)
  {
    ticker: "CWD",
    fiscalYear: 2025,
    fiscalQuarter: 1,
    calendarYear: 2025,
    calendarQuarter: 1,
    earningsDate: "2025-05-15",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 0,  // Pre-LINK
    sharesAtQuarterEnd: 1_146_000,  // SEC XBRL diluted Q1 2025 (post-split)
    holdingsPerShare: 0,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1627282&type=10-Q",
    status: "reported",
  },
  // Q4 2024 - Pre-LINK, pre-split (adjusted to post-split equivalent)
  {
    ticker: "CWD",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    calendarYear: 2024,
    calendarQuarter: 4,
    earningsDate: "2025-03-31",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 0,  // Pre-LINK
    sharesAtQuarterEnd: 1_157_000,  // 21.99M pre-split ÷ 19 = ~1.16M post-split adjusted
    holdingsPerShare: 0,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1627282&type=10-K",
    status: "reported",
  },

  // ========== ANAP Holdings (3189.T) - Japan ==========
  // Calendar year quarters, holdings derived from TDnet purchase announcements
  // First BTC purchase: April 16, 2025
  // Q1 2026 - In progress
  {
    ticker: "3189.T",
    fiscalYear: 2026,
    fiscalQuarter: 1,
    calendarYear: 2026,
    calendarQuarter: 1,
    earningsDate: "2026-04-15", // Estimated - Japanese companies typically report ~45 days after quarter end
    earningsTime: "BMO",
    holdingsAtQuarterEnd: 1417, // Jan 21, 2026 - 1,417.0341 BTC (ongoing quarter)
    sharesAtQuarterEnd: 39_954_400,
    holdingsPerShare: 0.0000355,
    source: "regulatory-filing",
    sourceUrl: "https://www.release.tdnet.info/inbs/140120260121536720.pdf",
    status: "upcoming",
  },
  // Q4 2025
  {
    ticker: "3189.T",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-01-14", // Actual TDnet filing date
    earningsTime: "BMO",
    holdingsAtQuarterEnd: 1347, // Dec 25, 2025 - 1,346.5856 BTC
    sharesAtQuarterEnd: 39_954_400,
    holdingsPerShare: 0.0000337,
    source: "regulatory-filing",
    sourceUrl: "https://www.release.tdnet.info/inbs/140120260114533179.pdf",
    status: "reported",
  },
  // Q3 2025
  {
    ticker: "3189.T",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-10-15", // Estimated
    earningsTime: "BMO",
    holdingsAtQuarterEnd: 962, // Sep 30, 2025 - 961.6579 BTC
    sharesAtQuarterEnd: 39_954_400,
    holdingsPerShare: 0.0000241,
    source: "regulatory-filing",
    status: "reported",
  },
  // Q2 2025
  {
    ticker: "3189.T",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-07-15", // Estimated
    earningsTime: "BMO",
    holdingsAtQuarterEnd: 332, // Jun 18, 2025 - 331.6579 BTC
    sharesAtQuarterEnd: 39_954_400,
    holdingsPerShare: 0.0000083,
    source: "regulatory-filing",
    status: "reported",
  },

  // ========== Remixpoint (3825.T) - Japan ==========
  // Calendar year quarters, holdings derived from TDnet/company website
  // First BTC purchase: September 26, 2024
  // Q1 2026 - In progress
  {
    ticker: "3825.T",
    fiscalYear: 2026,
    fiscalQuarter: 1,
    calendarYear: 2026,
    calendarQuarter: 1,
    earningsDate: "2026-04-15", // Estimated
    earningsTime: "BMO",
    holdingsAtQuarterEnd: 1411, // Nov 4, 2025 - 1,411.30 BTC (no new purchases since)
    sharesAtQuarterEnd: 149_039_800,
    holdingsPerShare: 0.0000095,
    source: "regulatory-filing",
    sourceUrl: "https://www.remixpoint.co.jp/digital-asset/",
    status: "upcoming",
  },
  // Q4 2025
  {
    ticker: "3825.T",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-01-15", // Estimated
    earningsTime: "BMO",
    holdingsAtQuarterEnd: 1411, // ~1,411 BTC at Dec 31
    sharesAtQuarterEnd: 149_039_800,
    holdingsPerShare: 0.0000095,
    source: "regulatory-filing",
    status: "reported",
  },
  // Q3 2025
  {
    ticker: "3825.T",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-10-15", // Estimated
    earningsTime: "BMO",
    holdingsAtQuarterEnd: 1375, // Sep 18, 2025 - 1,375 BTC
    sharesAtQuarterEnd: 149_039_800,
    holdingsPerShare: 0.0000092,
    source: "regulatory-filing",
    status: "reported",
  },
  // Q2 2025
  {
    ticker: "3825.T",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-07-15", // Estimated
    earningsTime: "BMO",
    holdingsAtQuarterEnd: 1285, // Jun 16, 2025 - 1,285 BTC
    sharesAtQuarterEnd: 149_039_800,
    holdingsPerShare: 0.0000086,
    source: "regulatory-filing",
    status: "reported",
  },
  // Q1 2025
  {
    ticker: "3825.T",
    fiscalYear: 2025,
    fiscalQuarter: 1,
    calendarYear: 2025,
    calendarQuarter: 1,
    earningsDate: "2025-04-15", // Estimated
    earningsTime: "BMO",
    holdingsAtQuarterEnd: 960, // Mar 3, 2025 - 960 BTC
    sharesAtQuarterEnd: 149_039_800,
    holdingsPerShare: 0.0000064,
    source: "regulatory-filing",
    status: "reported",
  },
  // Q4 2024
  {
    ticker: "3825.T",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    calendarYear: 2024,
    calendarQuarter: 4,
    earningsDate: "2025-01-15", // Estimated
    earningsTime: "BMO",
    holdingsAtQuarterEnd: 420, // Dec 17, 2024 - 420 BTC
    sharesAtQuarterEnd: 149_039_800,
    holdingsPerShare: 0.0000028,
    source: "regulatory-filing",
    status: "reported",
  },
  // Q3 2024 - First quarter with BTC
  {
    ticker: "3825.T",
    fiscalYear: 2024,
    fiscalQuarter: 3,
    calendarYear: 2024,
    calendarQuarter: 3,
    earningsDate: "2024-10-15", // Estimated
    earningsTime: "BMO",
    holdingsAtQuarterEnd: 75, // Sep 27, 2024 - 75 BTC (first purchases Sep 26-27)
    sharesAtQuarterEnd: 149_039_800,
    holdingsPerShare: 0.0000005,
    source: "regulatory-filing",
    status: "reported",
  },

  // ========== DDC Enterprise (DDC) - NYSE American ==========
  // Foreign Private Issuer (Cayman Islands) - files 20-F annually, 6-K interim
  // First BTC purchase: May 23, 2025
  // Source: treasury.ddc.xyz, SEC 6-K filings
  // Q1 2026 - In progress
  {
    ticker: "DDC",
    fiscalYear: 2026,
    fiscalQuarter: 1,
    calendarYear: 2026,
    calendarQuarter: 1,
    earningsDate: "2026-05-15", // 20-F due within 4 months of fiscal year end
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 1783, // Jan 29, 2026 - 1,783 BTC (ongoing)
    sharesAtQuarterEnd: 23_310_000,
    holdingsPerShare: 0.0000765,
    source: "company-dashboard",
    sourceUrl: "https://treasury.ddc.xyz",
    status: "upcoming",
  },
  // Q4 2025
  {
    ticker: "DDC",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-01", // Estimated interim 6-K
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 1183, // Nov 26, 2025 - 1,183 BTC
    sharesAtQuarterEnd: 23_310_000,
    holdingsPerShare: 0.0000508,
    source: "company-dashboard",
    sourceUrl: "https://treasury.ddc.xyz",
    status: "reported",
  },
  // Q3 2025
  {
    ticker: "DDC",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-15", // Estimated
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 1058, // Sep 24, 2025 - 1,058 BTC
    sharesAtQuarterEnd: 8_310_000,
    holdingsPerShare: 0.0001273,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001808110&type=6-K",
    status: "reported",
  },
  // Q2 2025 - First quarter with BTC
  {
    ticker: "DDC",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-08-15", // Estimated
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 138, // Jun 12, 2025 - 137.69 BTC (~138)
    sharesAtQuarterEnd: 6_500_000,
    holdingsPerShare: 0.0000212,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001808110&type=6-K",
    status: "reported",
  },

  // ========== ZOOZ Power (ZOOZ) - Nasdaq + TASE ==========
  // Israel-based EV charging company
  // First BTC purchase: Sep 28, 2025
  // Source: treasury.zoozpower.com
  // Q1 2026 - In progress
  {
    ticker: "ZOOZ",
    fiscalYear: 2026,
    fiscalQuarter: 1,
    calendarYear: 2026,
    calendarQuarter: 1,
    earningsDate: "2026-05-15", // Estimated
    earningsTime: "BMO",
    holdingsAtQuarterEnd: 1047, // Feb 2, 2026 - 1,046.96 BTC (ongoing)
    sharesAtQuarterEnd: 162_000_000,
    holdingsPerShare: 0.00000646,
    source: "company-dashboard",
    sourceUrl: "https://treasury.zoozpower.com",
    status: "upcoming",
  },
  // Q4 2025
  {
    ticker: "ZOOZ",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-15", // Estimated
    earningsTime: "BMO",
    holdingsAtQuarterEnd: 1047, // Nov 5, 2025 - 1,046.96 BTC (no Q4 purchases)
    sharesAtQuarterEnd: 162_000_000,
    holdingsPerShare: 0.00000646,
    source: "company-dashboard",
    sourceUrl: "https://treasury.zoozpower.com",
    status: "reported",
  },
  // Q3 2025 - First quarter with BTC
  {
    ticker: "ZOOZ",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-15", // Estimated
    earningsTime: "BMO",
    holdingsAtQuarterEnd: 525, // Sep 30, 2025 - 524.92 BTC
    sharesAtQuarterEnd: 161_900_000,
    holdingsPerShare: 0.00000324,
    source: "company-dashboard",
    sourceUrl: "https://treasury.zoozpower.com",
    status: "reported",
  },
];

// Helper: Get days until a date
function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateStr);
  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Get earnings calendar entries
export function getEarningsCalendar(options?: {
  days?: number;
  asset?: Asset;
  upcoming?: boolean;
}): EarningsCalendarEntry[] {
  const { days = 90, asset, upcoming = true } = options || {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const entries: EarningsCalendarEntry[] = [];

  for (const earnings of EARNINGS_DATA) {
    const daysUntil = getDaysUntil(earnings.earningsDate);

    // Filter by upcoming/past
    if (upcoming && daysUntil < 0) continue;
    if (!upcoming && daysUntil >= 0) continue;

    // Filter by days range
    if (Math.abs(daysUntil) > days) continue;

    // Find company
    const company = allCompanies.find((c) => c.ticker === earnings.ticker);
    if (!company) continue;

    // Filter by asset
    if (asset && company.asset !== asset) continue;

    // Calculate EPS surprise if reported
    let epsSurprisePct: number | undefined;
    if (earnings.status === "reported" && earnings.epsActual !== undefined && earnings.epsEstimate !== undefined && earnings.epsEstimate !== 0) {
      epsSurprisePct = ((earnings.epsActual - earnings.epsEstimate) / Math.abs(earnings.epsEstimate)) * 100;
    }

    // Calculate holdings per share growth from holdings history
    let holdingsPerShareGrowth: number | undefined;
    const history = HOLDINGS_HISTORY[earnings.ticker];
    if (history) {
      const growth = calculateHoldingsGrowth(history.history);
      if (growth) {
        // Use annualized growth for comparable metric
        holdingsPerShareGrowth = growth.annualizedGrowth;
      }
    }

    entries.push({
      ticker: earnings.ticker,
      companyName: company.name,
      asset: company.asset,
      earningsDate: earnings.earningsDate,
      earningsTime: earnings.earningsTime,
      status: earnings.status,
      daysUntil,
      epsSurprisePct,
      holdingsPerShareGrowth,
      earningsCallUrl: earnings.earningsCallUrl,
    });
  }

  // Sort by date (upcoming: soonest first, past: most recent first)
  entries.sort((a, b) => {
    if (upcoming) {
      return a.daysUntil - b.daysUntil;
    }
    return b.daysUntil - a.daysUntil;
  });

  return entries;
}

// Target days for each period, with max allowed span (2x target)
const PERIOD_CONFIG: Record<string, { target: number; max: number }> = {
  "1W": { target: 7, max: 14 },
  "1M": { target: 30, max: 60 },
  "3M": { target: 90, max: 180 },
  "1Y": { target: 365, max: 730 },
};

// Get treasury yield leaderboard
// Find data points that best approximate each period and calculate growth
export function getTreasuryYieldLeaderboard(options?: {
  period?: "1W" | "1M" | "3M" | "1Y";
  asset?: Asset;
}): TreasuryYieldMetrics[] {
  const { period = "1Y", asset } = options || {};
  const metrics: TreasuryYieldMetrics[] = [];
  const config = PERIOD_CONFIG[period];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Target start date (e.g., 7 days ago for weekly)
  const targetStart = new Date(today);
  targetStart.setDate(targetStart.getDate() - config.target);

  for (const [ticker, data] of Object.entries(HOLDINGS_HISTORY)) {
    if (data.history.length < 2) continue;

    const company = allCompanies.find((c) => c.ticker === ticker);
    if (!company) continue;

    if (asset && company.asset !== asset) continue;

    const history = data.history;

    // Find the most recent data point
    const latest = history[history.length - 1];
    const latestDate = new Date(latest.date);

    // Latest data must be somewhat recent (within 30 days)
    const daysSinceLatest = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLatest > 30) continue;

    // Find the data point closest to our target start date
    let startSnapshot = null;
    let bestStartDiff = Infinity;

    for (const snapshot of history) {
      if (snapshot.date === latest.date) continue;
      const snapshotDate = new Date(snapshot.date);

      // Must be before the latest snapshot
      if (snapshotDate >= latestDate) continue;

      const diffFromTarget = Math.abs(snapshotDate.getTime() - targetStart.getTime());
      if (diffFromTarget < bestStartDiff) {
        bestStartDiff = diffFromTarget;
        startSnapshot = snapshot;
      }
    }

    if (!startSnapshot) continue;
    if (startSnapshot.holdingsPerShare <= 0) continue;

    const startDate = new Date(startSnapshot.date);
    const endDate = latestDate;
    const daysCovered = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Data span must be reasonable for this period (not more than 2x target)
    if (daysCovered <= 0 || daysCovered > config.max) continue;

    // Calculate actual growth over the data span
    const growthPct = ((latest.holdingsPerShare / startSnapshot.holdingsPerShare) - 1) * 100;

    // Annualized growth for comparison
    const dailyRate = growthPct / 100 / daysCovered;
    const annualizedGrowthPct = dailyRate * 365 * 100;

    metrics.push({
      ticker,
      companyName: company.name,
      asset: company.asset,
      period,
      holdingsPerShareStart: startSnapshot.holdingsPerShare,
      holdingsPerShareEnd: latest.holdingsPerShare,
      growthPct,
      annualizedGrowthPct,
      startDate: startSnapshot.date,
      endDate: latest.date,
      daysCovered,
    });
  }

  // Sort by growth (descending) and add rank
  metrics.sort((a, b) => b.growthPct - a.growthPct);
  metrics.forEach((m, i) => {
    m.rank = i + 1;
  });

  return metrics;
}

// Helper: Get quarter date boundaries
function getQuarterBounds(quarter: CalendarQuarter): { start: Date; end: Date } {
  const match = quarter.match(/Q([1-4])-(\d{4})/);
  if (!match) throw new Error(`Invalid quarter format: ${quarter}`);

  const q = parseInt(match[1]);
  const year = parseInt(match[2]);

  // Quarter start/end dates
  const quarters: Record<number, { startMonth: number; endMonth: number }> = {
    1: { startMonth: 0, endMonth: 2 },   // Jan-Mar
    2: { startMonth: 3, endMonth: 5 },   // Apr-Jun
    3: { startMonth: 6, endMonth: 8 },   // Jul-Sep
    4: { startMonth: 9, endMonth: 11 },  // Oct-Dec
  };

  const { startMonth, endMonth } = quarters[q];
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, endMonth + 1, 0); // Last day of end month

  return { start, end };
}

// Get available quarters based on holdings data
export function getAvailableQuarters(): CalendarQuarter[] {
  const quarters = new Set<CalendarQuarter>();
  const today = new Date();

  // Go back 2 years
  for (let year = today.getFullYear(); year >= today.getFullYear() - 2; year--) {
    for (let q = 4; q >= 1; q--) {
      const quarter = `Q${q}-${year}` as CalendarQuarter;
      const { end } = getQuarterBounds(quarter);

      // Only include quarters that have ended
      if (end <= today) {
        quarters.add(quarter);
      }
    }
  }

  // Sort by most recent first
  return Array.from(quarters).sort((a, b) => {
    const [qA, yA] = a.split('-').map((x, i) => i === 0 ? parseInt(x.slice(1)) : parseInt(x));
    const [qB, yB] = b.split('-').map((x, i) => i === 0 ? parseInt(x.slice(1)) : parseInt(x));
    if (yA !== yB) return yB - yA;
    return qB - qA;
  });
}

// Helper: Linear interpolation of holdingsPerShare at a target date
function interpolateHoldingsPerShare(
  before: { date: string; holdingsPerShare: number },
  after: { date: string; holdingsPerShare: number },
  targetDate: Date
): number {
  const beforeDate = new Date(before.date);
  const afterDate = new Date(after.date);

  // If target equals one of the dates, return that value
  if (targetDate.getTime() === beforeDate.getTime()) return before.holdingsPerShare;
  if (targetDate.getTime() === afterDate.getTime()) return after.holdingsPerShare;

  // Linear interpolation
  const totalDays = (afterDate.getTime() - beforeDate.getTime()) / (1000 * 60 * 60 * 24);
  const daysFromStart = (targetDate.getTime() - beforeDate.getTime()) / (1000 * 60 * 60 * 24);
  const ratio = daysFromStart / totalDays;

  return before.holdingsPerShare + (after.holdingsPerShare - before.holdingsPerShare) * ratio;
}

// Get treasury yield for a specific calendar quarter
// Uses interpolation to normalize all companies to exact quarter boundaries
export function getQuarterlyYieldLeaderboard(options?: {
  quarter?: CalendarQuarter;
  asset?: Asset;
}): TreasuryYieldMetrics[] {
  const { quarter = getAvailableQuarters()[0], asset } = options || {};
  const metrics: TreasuryYieldMetrics[] = [];

  for (const [ticker, data] of Object.entries(HOLDINGS_HISTORY)) {
    if (data.history.length < 2) continue;

    const company = allCompanies.find((c) => c.ticker === ticker);
    if (!company) continue;

    if (asset && company.asset !== asset) continue;

    const history = data.history;

    // SIMPLIFIED: Use the two most recent data points for yield calculation
    // This ensures we get yield data for all companies with 2+ snapshots
    const latest = history[history.length - 1];
    const previous = history[history.length - 2];

    const startValue = previous.holdingsPerShare;
    const endValue = latest.holdingsPerShare;

    // Skip if invalid data
    if (!startValue || startValue <= 0) continue;
    if (!endValue || endValue <= 0) continue;

    // Calculate period covered by the two data points
    const startDate = new Date(previous.date);
    const endDate = new Date(latest.date);
    const daysCovered = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Skip if data points are too close together (less than 7 days)
    if (daysCovered < 7) continue;
    
    const growthPct = ((endValue / startValue) - 1) * 100;

    // Annualized growth if period is significant (30+ days)
    let annualizedGrowthPct: number | undefined;
    if (daysCovered >= 30) {
      const yearsFraction = daysCovered / 365.25;
      annualizedGrowthPct = (Math.pow(endValue / startValue, 1 / yearsFraction) - 1) * 100;
    }

    metrics.push({
      ticker,
      companyName: company.name,
      asset: company.asset,
      period: quarter,
      holdingsPerShareStart: startValue,
      holdingsPerShareEnd: endValue,
      growthPct,
      annualizedGrowthPct,
      startDate: previous.date,
      endDate: latest.date,
      daysCovered,
    });
  }

  // Sort by growth (descending) and add rank
  metrics.sort((a, b) => b.growthPct - a.growthPct);
  metrics.forEach((m, i) => {
    m.rank = i + 1;
  });

  return metrics;
}

/**
 * Calculate holdings growth over a specific time period.
 * @param options.days - Number of days to look back (30, 90, 365, or undefined for all time)
 * @param options.asset - Filter by asset type (BTC, ETH, etc.)
 * @returns Array of metrics sorted by growth descending
 */
export function getHoldingsGrowthByPeriod(options?: {
  days?: number;
  asset?: Asset;
}): TreasuryYieldMetrics[] {
  const { days, asset } = options || {};
  const metrics: TreasuryYieldMetrics[] = [];
  const now = new Date();
  const cutoffDate = days ? new Date(now.getTime() - days * 24 * 60 * 60 * 1000) : null;

  for (const [ticker, data] of Object.entries(HOLDINGS_HISTORY)) {
    if (data.history.length < 2) continue;

    const company = allCompanies.find((c) => c.ticker === ticker);
    if (!company) continue;

    if (asset && company.asset !== asset) continue;

    const history = data.history;
    const latest = history[history.length - 1];

    // Find the snapshot closest to (but not after) the cutoff date
    let startSnapshot: typeof history[0] | null = null;
    
    if (cutoffDate) {
      // Find snapshot closest to cutoff date
      for (let i = history.length - 2; i >= 0; i--) {
        const snapshotDate = new Date(history[i].date);
        if (snapshotDate <= cutoffDate) {
          startSnapshot = history[i];
          break;
        }
      }
      // If no snapshot before cutoff, use earliest available
      if (!startSnapshot && history.length >= 2) {
        startSnapshot = history[0];
      }
    } else {
      // "All time" - use first snapshot
      startSnapshot = history[0];
    }

    if (!startSnapshot) continue;

    const startValue = startSnapshot.holdingsPerShare;
    const endValue = latest.holdingsPerShare;

    // Skip if invalid data
    if (!startValue || startValue <= 0) continue;
    if (!endValue || endValue <= 0) continue;

    // Calculate period covered
    const startDate = new Date(startSnapshot.date);
    const endDate = new Date(latest.date);
    const daysCovered = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Skip if data points are too close together (less than 7 days)
    if (daysCovered < 7) continue;

    const growthPct = ((endValue / startValue) - 1) * 100;

    // Annualized growth if period is significant (30+ days)
    let annualizedGrowthPct: number | undefined;
    if (daysCovered >= 30) {
      const yearsFraction = daysCovered / 365.25;
      annualizedGrowthPct = (Math.pow(endValue / startValue, 1 / yearsFraction) - 1) * 100;
    }

    // Map days to YieldPeriod format
    const periodLabel: YieldPeriod = days === 30 ? "1M" : days === 90 ? "3M" : days === 365 ? "1Y" : "1Y";
    
    metrics.push({
      ticker,
      companyName: company.name,
      asset: company.asset,
      period: periodLabel,
      holdingsPerShareStart: startValue,
      holdingsPerShareEnd: endValue,
      growthPct,
      annualizedGrowthPct,
      startDate: startSnapshot.date,
      endDate: latest.date,
      daysCovered,
    });
  }

  // Sort by growth (descending) and add rank
  metrics.sort((a, b) => b.growthPct - a.growthPct);
  metrics.forEach((m, i) => {
    m.rank = i + 1;
  });

  return metrics;
}

// Get earnings for a specific company
export function getCompanyEarnings(ticker: string): EarningsRecord[] {
  return EARNINGS_DATA
    .filter((e) => e.ticker === ticker)
    .sort((a, b) => {
      // Sort by date descending (most recent first)
      return new Date(b.earningsDate).getTime() - new Date(a.earningsDate).getTime();
    });
}

// Get next upcoming earnings for a company
export function getNextEarnings(ticker: string): EarningsRecord | null {
  const upcoming = EARNINGS_DATA
    .filter((e) => e.ticker === ticker && e.status !== "reported")
    .sort((a, b) => new Date(a.earningsDate).getTime() - new Date(b.earningsDate).getTime());

  return upcoming[0] || null;
}
