// Earnings data for DAT companies
// Sources: SEC EDGAR, company IR pages, investor presentations
//
// QUARTER NORMALIZATION:
// Prefer using XBRL period end dates directly via quarterFromPeriodEnd().
// This avoids fiscal-to-calendar mapping errors - the SEC filing tells us
// exactly what period the data covers.
//
// Legacy fiscal year mappings (kept for backwards compatibility):
// - CLSK (CleanSpark) - Fiscal year ends September 30
// - All others use calendar year (fiscal = calendar)

import { EarningsRecord, EarningsCalendarEntry, TreasuryYieldMetrics, Asset, CalendarQuarter } from "../types";
import { allCompanies } from "./companies";
import { HOLDINGS_HISTORY, calculateHoldingsGrowth } from "./holdings-history";
import { getQuarterEndSnapshot } from "./mstr-capital-structure";

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
  // CLSK: Fiscal year ends September 30
  // FY Q1 (Oct-Dec) → Calendar Q4 of prior year
  // FY Q2 (Jan-Mar) → Calendar Q1 of same year  
  // FY Q3 (Apr-Jun) → Calendar Q2 of same year
  // FY Q4 (Jul-Sep) → Calendar Q3 of same year
  if (ticker === "CLSK") {
    switch (fiscalQuarter) {
      case 1: // Oct-Dec → Calendar Q4 of prior year
        return { calendarYear: fiscalYear - 1, calendarQuarter: 4 };
      case 2: // Jan-Mar → Calendar Q1
        return { calendarYear: fiscalYear, calendarQuarter: 1 };
      case 3: // Apr-Jun → Calendar Q2
        return { calendarYear: fiscalYear, calendarQuarter: 2 };
      case 4: // Jul-Sep → Calendar Q3
        return { calendarYear: fiscalYear, calendarQuarter: 3 };
    }
  }

  // All other companies use calendar year (fiscal = calendar)
  return { calendarYear: fiscalYear, calendarQuarter: fiscalQuarter };
}

/**
 * Helper: Get MSTR data from capital structure timeline for a specific quarter
 * Uses verified XBRL data from mstr-capital-structure.ts
 */
function getMSTRQuarterData(fiscalYear: number, fiscalQuarter: number): {
  holdingsAtQuarterEnd?: number;
  sharesAtQuarterEnd?: number;
  holdingsPerShare?: number;
} {
  // Map fiscal year/quarter to period-end date (MSTR uses calendar year)
  const quarterEndMonth = fiscalQuarter * 3; // Q1=3, Q2=6, Q3=9, Q4=12
  const periodEnd = `${fiscalYear}-${String(quarterEndMonth).padStart(2, '0')}-${
    quarterEndMonth === 3 ? '31' : quarterEndMonth === 6 ? '30' : quarterEndMonth === 9 ? '30' : '31'
  }`;

  const snapshot = getQuarterEndSnapshot(periodEnd);
  if (!snapshot) {
    // No data available for this quarter
    return {};
  }

  const holdingsAtQuarterEnd = snapshot.btcHoldings;
  const sharesAtQuarterEnd = snapshot.commonSharesOutstanding;
  const holdingsPerShare = holdingsAtQuarterEnd / sharesAtQuarterEnd;

  return {
    holdingsAtQuarterEnd,
    sharesAtQuarterEnd,
    holdingsPerShare,
  };
}

// Upcoming and recent earnings dates
// Status: "upcoming" = scheduled, "confirmed" = date confirmed by company, "reported" = results released
export const EARNINGS_DATA: EarningsRecord[] = [
  // ==================== BTC COMPANIES ====================

  // ========== Strategy (MSTR) ==========
  // Calendar year company (fiscal = calendar)
  // Q4 2025 - Upcoming earnings (prelim data from 8-K)
  {
    ticker: "MSTR",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-02-04",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 712647, // Jan 25, 2026 8-K (latest in Q4)
    sharesAtQuarterEnd: 277_936_548, // Q3 267.5M + Q4 ATM 10.5M shares (estimated from ATM sales)
    holdingsPerShare: 0.002564, // Preliminary from 8-K filings; final 10-K due Feb 2026
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
    holdingsAtQuarterEnd: 52850,
    sharesAtQuarterEnd: 470_126_000,
    holdingsPerShare: 0.0001124,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2025
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
    holdingsAtQuarterEnd: 46376,
    sharesAtQuarterEnd: 350_000_000,
    holdingsPerShare: 0.0001325,
    source: "sec-filing",
    status: "reported",
  },
  // Q1 2025
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
    holdingsAtQuarterEnd: 48137,
    sharesAtQuarterEnd: 340_000_000,
    holdingsPerShare: 0.0001416,
    source: "sec-filing",
    status: "reported",
  },
  // Q4 2024
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
    holdingsAtQuarterEnd: 44893,
    sharesAtQuarterEnd: 302_000_000,
    holdingsPerShare: 0.0001487,
    source: "sec-filing",
    status: "reported",
  },
  // Q3 2024
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
    holdingsAtQuarterEnd: 26747,
    sharesAtQuarterEnd: 296_000_000,
    holdingsPerShare: 0.0000903,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2024
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
    holdingsAtQuarterEnd: 20818,
    sharesAtQuarterEnd: 277_000_000,
    holdingsPerShare: 0.0000752,
    source: "sec-filing",
    status: "reported",
  },
  // Q1 2024
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
    holdingsAtQuarterEnd: 17631,
    sharesAtQuarterEnd: 267_000_000,
    holdingsPerShare: 0.0000660,
    source: "sec-filing",
    status: "reported",
  },

  // ========== Riot Platforms (RIOT) ==========
  // Calendar year company (fiscal = calendar)
  // CIK: 0001167419
  // All data verified via SEC XBRL (2026-01-28)
  // BTC holdings = TOTAL (unrestricted + restricted)
  // Shares = CommonStockSharesOutstanding from XBRL
  //
  // Q4 2025 - Holdings from 8-K (Dec 2025 production update), earnings upcoming
  // Source: https://www.riotplatforms.com/riot-announces-december-2025-production-and-operations-updates/
  // Note: Sold 1,818 BTC in Dec 2025 → 18,005 BTC remaining
  {
    ticker: "RIOT",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-02-20",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 18005,
    sharesAtQuarterEnd: 371_100_000, // Using Q3 2025 shares until 10-K
    holdingsPerShare: 0.0000485,
    source: "press-release",
    status: "upcoming",
  },
  // Q3 2025 - XBRL verified: 19,287 BTC total (15,987 unrestricted + 3,300 restricted), 371.1M shares
  {
    ticker: "RIOT",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-05",
    earningsTime: "AMC",
    epsActual: 0.29,
    epsEstimate: -0.18,
    revenueActual: 180_200_000,
    revenueEstimate: 125_000_000,
    netIncome: 104_500_000,
    holdingsAtQuarterEnd: 19287,
    sharesAtQuarterEnd: 371_100_000,
    holdingsPerShare: 0.0000520,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2025 - XBRL verified: 19,273 BTC total (15,973 unrestricted + 3,300 restricted), 363.2M shares
  {
    ticker: "RIOT",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-07-30",
    earningsTime: "AMC",
    epsActual: -0.63,
    epsEstimate: -0.25,
    revenueActual: 70_000_000,
    revenueEstimate: 84_000_000,
    netIncome: -247_800_000,
    holdingsAtQuarterEnd: 19273,
    sharesAtQuarterEnd: 363_200_000,
    holdingsPerShare: 0.0000531,
    source: "sec-filing",
    status: "reported",
  },
  // Q1 2025 - XBRL verified: 19,223 BTC, 350.2M shares
  {
    ticker: "RIOT",
    fiscalYear: 2025,
    fiscalQuarter: 1,
    calendarYear: 2025,
    calendarQuarter: 1,
    earningsDate: "2025-04-30",
    earningsTime: "AMC",
    epsActual: -0.72,
    epsEstimate: -0.20,
    revenueActual: 68_200_000,
    revenueEstimate: 91_000_000,
    netIncome: -296_400_000,
    holdingsAtQuarterEnd: 19223,
    sharesAtQuarterEnd: 350_200_000,
    holdingsPerShare: 0.0000549,
    source: "sec-filing",
    status: "reported",
  },
  // Q4 2024 - XBRL verified: 17,722 BTC, 344.9M shares
  {
    ticker: "RIOT",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    calendarYear: 2024,
    calendarQuarter: 4,
    earningsDate: "2025-02-26",
    earningsTime: "AMC",
    epsActual: 0.50,
    epsEstimate: -0.18,
    revenueActual: 115_300_000,
    revenueEstimate: 113_000_000,
    netIncome: 166_100_000,
    holdingsAtQuarterEnd: 17722,
    sharesAtQuarterEnd: 344_900_000,
    holdingsPerShare: 0.0000514,
    source: "sec-filing",
    status: "reported",
  },
  // Q3 2024 - XBRL verified: 10,427 BTC, 324.3M shares
  {
    ticker: "RIOT",
    fiscalYear: 2024,
    fiscalQuarter: 3,
    calendarYear: 2024,
    calendarQuarter: 3,
    earningsDate: "2024-10-30",
    earningsTime: "AMC",
    epsActual: -0.54,
    epsEstimate: -0.18,
    revenueActual: 84_800_000,
    revenueEstimate: 95_000_000,
    netIncome: -154_400_000,
    holdingsAtQuarterEnd: 10427,
    sharesAtQuarterEnd: 324_300_000,
    holdingsPerShare: 0.0000322,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2024 - XBRL verified: 9,334 BTC, 283.7M shares
  {
    ticker: "RIOT",
    fiscalYear: 2024,
    fiscalQuarter: 2,
    calendarYear: 2024,
    calendarQuarter: 2,
    earningsDate: "2024-07-31",
    earningsTime: "AMC",
    epsActual: 0.32,
    epsEstimate: -0.19,
    revenueActual: 70_000_000,
    revenueEstimate: 77_000_000,
    netIncome: 127_300_000,
    holdingsAtQuarterEnd: 9334,
    sharesAtQuarterEnd: 283_700_000,
    holdingsPerShare: 0.0000329,
    source: "sec-filing",
    status: "reported",
  },
  // Q1 2024 - XBRL verified: 8,490 BTC, 268.0M shares
  {
    ticker: "RIOT",
    fiscalYear: 2024,
    fiscalQuarter: 1,
    calendarYear: 2024,
    calendarQuarter: 1,
    earningsDate: "2024-05-01",
    earningsTime: "AMC",
    epsActual: 0.25,
    epsEstimate: 0.02,
    revenueActual: 79_300_000,
    revenueEstimate: 72_000_000,
    netIncome: 211_800_000,
    holdingsAtQuarterEnd: 8490,
    sharesAtQuarterEnd: 268_000_000,
    holdingsPerShare: 0.0000317,
    source: "sec-filing",
    status: "reported",
  },
  // Q4 2023 - XBRL verified: 7,362 BTC, 230.8M shares
  {
    ticker: "RIOT",
    fiscalYear: 2023,
    fiscalQuarter: 4,
    calendarYear: 2023,
    calendarQuarter: 4,
    earningsDate: "2024-02-28",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 7362,
    sharesAtQuarterEnd: 230_800_000,
    holdingsPerShare: 0.0000319,
    source: "sec-filing",
    status: "reported",
  },
  // Q4 2022 - XBRL verified: 6,974 BTC, 167.8M shares
  {
    ticker: "RIOT",
    fiscalYear: 2022,
    fiscalQuarter: 4,
    calendarYear: 2022,
    calendarQuarter: 4,
    earningsDate: "2023-03-01",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 6974,
    sharesAtQuarterEnd: 167_800_000,
    holdingsPerShare: 0.0000416,
    source: "sec-filing",
    status: "reported",
  },

  // ========== CleanSpark (CLSK) - Fiscal Year ends September ==========
  // CLSK FY→Calendar mapping:
  //   FY Q1 (Oct-Dec) → Calendar Q4 of PRIOR year
  //   FY Q2 (Jan-Mar) → Calendar Q1
  //   FY Q3 (Apr-Jun) → Calendar Q2
  //   FY Q4 (Jul-Sep) → Calendar Q3
  //
  // Q1 FY2026 (Oct-Dec 2025) → Calendar Q4 2025 - Upcoming
  // Holdings from SEC DEF 14A Jan 22, 2026 (most recent available)
  // Shares from same DEF 14A (record date Jan 9, 2026)
  {
    ticker: "CLSK",
    fiscalYear: 2026,
    fiscalQuarter: 1,
    calendarYear: 2025,  // FY Q1 maps to Q4 of prior year
    calendarQuarter: 4,
    earningsDate: "2026-02-05",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 13099,  // SEC DEF 14A Jan 22, 2026
    sharesAtQuarterEnd: 255_750_361,  // SEC DEF 14A (record date Jan 9, 2026)
    holdingsPerShare: 0.0000512,
    source: "sec-filing",
    status: "upcoming",
  },
  // Q4 FY2025 (Jul-Sep 2025) → Calendar Q3 2025
  {
    ticker: "CLSK",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-12-09",
    earningsTime: "AMC",
    epsActual: 0.12,
    epsEstimate: -0.10,
    revenueActual: 162_300_000,
    revenueEstimate: 164_000_000,
    netIncome: 246_300_000,
    holdingsAtQuarterEnd: 10556,
    sharesAtQuarterEnd: 310_000_000,
    holdingsPerShare: 0.0000341,
    source: "sec-filing",
    status: "reported",
  },
  // Q3 FY2025 (Apr-Jun 2025) → Calendar Q2 2025
  {
    ticker: "CLSK",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-08-12",
    earningsTime: "AMC",
    epsActual: -0.21,
    epsEstimate: -0.24,
    revenueActual: 104_100_000,
    revenueEstimate: 113_000_000,
    netIncome: -55_200_000,
    holdingsAtQuarterEnd: 8049,
    sharesAtQuarterEnd: 276_000_000,
    holdingsPerShare: 0.0000292,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 FY2025 (Jan-Mar 2025) → Calendar Q1 2025
  {
    ticker: "CLSK",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 1,
    earningsDate: "2025-05-06",
    earningsTime: "AMC",
    epsActual: -0.30,
    epsEstimate: -0.15,
    revenueActual: 91_400_000,
    revenueEstimate: 114_000_000,
    netIncome: -77_200_000,
    holdingsAtQuarterEnd: 6100,
    sharesAtQuarterEnd: 263_000_000,
    holdingsPerShare: 0.0000232,
    source: "sec-filing",
    status: "reported",
  },
  // Q1 FY2025 (Oct-Dec 2024) → Calendar Q4 2024
  {
    ticker: "CLSK",
    fiscalYear: 2025,
    fiscalQuarter: 1,
    calendarYear: 2024,  // FY Q1 maps to Q4 of prior year
    calendarQuarter: 4,
    earningsDate: "2025-02-11",
    earningsTime: "AMC",
    epsActual: 0.22,
    epsEstimate: -0.06,
    revenueActual: 162_000_000,
    revenueEstimate: 136_000_000,
    netIncome: 51_100_000,
    holdingsAtQuarterEnd: 6061,
    sharesAtQuarterEnd: 243_000_000,
    holdingsPerShare: 0.0000249,
    source: "sec-filing",
    status: "reported",
  },
  // Q4 FY2024 (Jul-Sep 2024) → Calendar Q3 2024
  {
    ticker: "CLSK",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    calendarYear: 2024,
    calendarQuarter: 3,
    earningsDate: "2024-12-10",
    earningsTime: "AMC",
    epsActual: -0.13,
    epsEstimate: -0.16,
    revenueActual: 104_500_000,
    revenueEstimate: 116_000_000,
    netIncome: -26_400_000,
    holdingsAtQuarterEnd: 8049,
    sharesAtQuarterEnd: 199_000_000,
    holdingsPerShare: 0.0000404,
    source: "sec-filing",
    status: "reported",
  },
  // Q3 FY2024 (Apr-Jun 2024) → Calendar Q2 2024
  {
    ticker: "CLSK",
    fiscalYear: 2024,
    fiscalQuarter: 3,
    calendarYear: 2024,
    calendarQuarter: 2,
    earningsDate: "2024-08-05",
    earningsTime: "AMC",
    epsActual: -0.04,
    epsEstimate: -0.18,
    revenueActual: 104_100_000,
    revenueEstimate: 87_000_000,
    netIncome: -7_000_000,
    holdingsAtQuarterEnd: 6154,
    sharesAtQuarterEnd: 173_000_000,
    holdingsPerShare: 0.0000356,
    source: "sec-filing",
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
  // Q3 2025
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
    holdingsAtQuarterEnd: 610,
    sharesAtQuarterEnd: 260_000_000,
    holdingsPerShare: 0.0000023,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2025
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
    holdingsAtQuarterEnd: 430,
    sharesAtQuarterEnd: 248_000_000,
    holdingsPerShare: 0.0000017,
    source: "sec-filing",
    status: "reported",
  },
  // Q4 2024
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
    holdingsAtQuarterEnd: 510,
    sharesAtQuarterEnd: 234_000_000,
    holdingsPerShare: 0.0000022,
    source: "sec-filing",
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

  // ========== Strive Asset (ASST) ==========
  // Calendar year company (fiscal = calendar)
  // Merged with Semler Scientific on Jan 16, 2026
  // NOTE: Tracking Strive specifically from merger date (no Semler backfill)
  //
  // Q1 2026 - First post-merger quarter (upcoming)
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
  // Q4 2025 - Partial post-merger (Jan 16-31 only)
  {
    ticker: "ASST",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-15",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 12798,  // Combined: ~10.5K (Strive) + ~2.3K (Semler)
    sharesAtQuarterEnd: 1_247_436_814,  // 1.05B Class A + 198M Class B
    holdingsPerShare: 0.00001026,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001920406&type=DEF+14C",
    status: "upcoming",
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
  // Q4 2025 - Upcoming
  {
    ticker: "DJT",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-20",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },
  // Q3 2025 - XBRL: $1.467B crypto FV, 279.997M shares (SEC 10-Q)
  // BTC count: 11,542 (from 10-Q filing, per holdings-history)
  {
    ticker: "DJT",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-08",
    earningsTime: "AMC",
    epsActual: -0.10,
    epsEstimate: -0.08,
    revenueActual: 1_000_000,
    revenueEstimate: 2_500_000,
    netIncome: -19_200_000,
    holdingsAtQuarterEnd: 11542,
    sharesAtQuarterEnd: 279_997_636,
    holdingsPerShare: 0.0000412,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2025 - Deal closed May 29, first BTC purchases in Q2
  // No XBRL crypto data for Q2, using 0 as conservative estimate (bulk purchases likely Q3)
  {
    ticker: "DJT",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-08-08",
    earningsTime: "AMC",
    epsActual: -0.09,
    epsEstimate: -0.07,
    revenueActual: 900_000,
    revenueEstimate: 2_000_000,
    netIncome: -16_400_000,
    holdingsAtQuarterEnd: 0, // Deal closed late May, bulk purchases in Q3
    sharesAtQuarterEnd: 191_500_000, // XBRL verified
    holdingsPerShare: 0,
    source: "sec-filing",
    status: "reported",
  },
  // Q1 2025 - Pre-treasury, no BTC yet
  {
    ticker: "DJT",
    fiscalYear: 2025,
    fiscalQuarter: 1,
    calendarYear: 2025,
    calendarQuarter: 1,
    earningsDate: "2025-05-08",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 0,
    sharesAtQuarterEnd: 220_600_000, // XBRL verified
    holdingsPerShare: 0,
    source: "sec-filing",
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
    sharesAtQuarterEnd: 220_700_000, // XBRL verified
    holdingsPerShare: 0,
    source: "sec-filing",
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

  // ==================== ETH COMPANIES ====================

  // ========== Bitmine Immersion (BMNR) ==========
  // Calendar year company - data already normalized to calendar quarters
  // Note: Fiscal year ends Aug 31 but we store as calendar quarters for consistency
  // ETH treasury strategy launched Jul 2025.
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
  {
    ticker: "BMNR",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-02-15",  // Expected ~45 days after Dec 31
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 4_110_525,  // Dec 28, 2025 press release
    sharesAtQuarterEnd: 425_000_000,
    holdingsPerShare: 0.009672,
    source: "press-release",
    sourceUrl: "https://bitmine.com/press-releases",
    status: "reported",
  },
  // CY2025 Q3 (Jul-Sep 2025) - ETH strategy launched Jul 17
  {
    ticker: "BMNR",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-09",  // ~40 days after Sep 30
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 2_069_443,  // Sep 7, 2025 (2M milestone)
    sharesAtQuarterEnd: 260_000_000,
    holdingsPerShare: 0.007959,
    source: "press-release",
    sourceUrl: "https://bitmine.com/press-releases",
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
  // Q4 2025 - Upcoming
  {
    ticker: "BTCS",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-20",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },
  // Q3 2025
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
    source: "sec-filing",
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
    holdingsAtQuarterEnd: 861_251,  // Sep 30, 2025 (holdings-history.ts)
    sharesAtQuarterEnd: 192_193_183,  // SEC XBRL CommonStockSharesOutstanding at Sep 30
    holdingsPerShare: 0.004481,  // 861251 / 192193183
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001981535&type=10-Q",
    status: "reported",
  },
  // Q2 2025 - ETH pivot initiated June 2025 (filed 2025-08-14)
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
    holdingsAtQuarterEnd: 520_000,  // Jun 30, 2025 (holdings-history.ts)
    sharesAtQuarterEnd: 66_154_792,  // SEC XBRL CommonStockSharesOutstanding at Jun 30
    holdingsPerShare: 0.007860,  // 520000 / 66154792
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
  // Q4 2025 - Upcoming
  {
    ticker: "BTBT",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-12",
    earningsTime: "BMO",
    source: "sec-filing",
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
    source: "sec-filing",
    status: "reported",
  },

  // ==================== SOL COMPANIES ====================

  // ========== Sol Strategies (STKE) ==========
  // Calendar year company (fiscal = calendar)
  // Q4 2025 - Upcoming
  {
    ticker: "STKE",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    calendarYear: 2025,
    calendarQuarter: 4,
    earningsDate: "2026-03-28",
    earningsTime: null,
    source: "press-release",
    status: "upcoming",
  },
  // Q3 2025
  {
    ticker: "STKE",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    calendarYear: 2025,
    calendarQuarter: 3,
    earningsDate: "2025-11-28",
    earningsTime: null,
    epsActual: -0.02,
    revenueActual: 1_200_000,
    netIncome: -800_000,
    source: "press-release",
    status: "reported",
  },
  // Q2 2025
  {
    ticker: "STKE",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    calendarYear: 2025,
    calendarQuarter: 2,
    earningsDate: "2025-08-29",
    earningsTime: null,
    epsActual: -0.03,
    revenueActual: 900_000,
    netIncome: -1_100_000,
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

  const { start: quarterStart, end: quarterEnd } = getQuarterBounds(quarter);
  const quarterStartStr = quarterStart.toISOString().split('T')[0];
  const quarterEndStr = quarterEnd.toISOString().split('T')[0];

  for (const [ticker, data] of Object.entries(HOLDINGS_HISTORY)) {
    if (data.history.length < 2) continue;

    const company = allCompanies.find((c) => c.ticker === ticker);
    if (!company) continue;

    if (asset && company.asset !== asset) continue;

    const history = data.history;

    // Find snapshots that bracket quarter start (one before, one after)
    // Need data within 60 days before AND 60 days after quarter start
    let beforeStart = null;
    let afterStart = null;
    const tolerance = 60 * 24 * 60 * 60 * 1000; // 60 days

    for (let i = 0; i < history.length; i++) {
      const snapshotDate = new Date(history[i].date);

      if (snapshotDate <= quarterStart) {
        // Check if within tolerance
        if (quarterStart.getTime() - snapshotDate.getTime() <= tolerance) {
          beforeStart = history[i];
        }
      } else if (snapshotDate > quarterStart && !afterStart) {
        // First snapshot after quarter start
        if (snapshotDate.getTime() - quarterStart.getTime() <= tolerance) {
          afterStart = history[i];
        }
      }
    }

    // Find snapshots that bracket quarter end
    let beforeEnd = null;
    let afterEnd = null;

    for (let i = 0; i < history.length; i++) {
      const snapshotDate = new Date(history[i].date);

      if (snapshotDate <= quarterEnd) {
        if (quarterEnd.getTime() - snapshotDate.getTime() <= tolerance) {
          beforeEnd = history[i];
        }
      } else if (snapshotDate > quarterEnd && !afterEnd) {
        if (snapshotDate.getTime() - quarterEnd.getTime() <= tolerance) {
          afterEnd = history[i];
        }
      }
    }

    // Need at least one snapshot on each side of both boundaries to interpolate
    // Or exact matches at the boundaries
    let startValue: number | null = null;
    let endValue: number | null = null;

    // Calculate start value (at quarter start)
    // Prefer interpolation, fall back to nearby data if needed
    if (beforeStart && afterStart) {
      // Can interpolate
      startValue = interpolateHoldingsPerShare(beforeStart, afterStart, quarterStart);
    } else if (beforeStart && new Date(beforeStart.date).getTime() === quarterStart.getTime()) {
      // Exact match
      startValue = beforeStart.holdingsPerShare;
    } else if (afterStart && new Date(afterStart.date).getTime() === quarterStart.getTime()) {
      // Exact match
      startValue = afterStart.holdingsPerShare;
    } else if (beforeStart && !afterStart) {
      // Fallback: use nearby data before (within 30 days)
      const daysBefore = (quarterStart.getTime() - new Date(beforeStart.date).getTime()) / (1000 * 60 * 60 * 24);
      if (daysBefore <= 30) {
        startValue = beforeStart.holdingsPerShare;
      }
    } else if (afterStart && !beforeStart) {
      // Fallback: use nearby data after (within 30 days)
      const daysAfter = (new Date(afterStart.date).getTime() - quarterStart.getTime()) / (1000 * 60 * 60 * 24);
      if (daysAfter <= 30) {
        startValue = afterStart.holdingsPerShare;
      }
    }

    // Calculate end value (at quarter end)
    // Prefer interpolation, fall back to nearby data if needed
    if (beforeEnd && afterEnd) {
      // Can interpolate
      endValue = interpolateHoldingsPerShare(beforeEnd, afterEnd, quarterEnd);
    } else if (beforeEnd && new Date(beforeEnd.date).getTime() === quarterEnd.getTime()) {
      // Exact match
      endValue = beforeEnd.holdingsPerShare;
    } else if (afterEnd && new Date(afterEnd.date).getTime() === quarterEnd.getTime()) {
      // Exact match
      endValue = afterEnd.holdingsPerShare;
    } else if (beforeEnd && !afterEnd) {
      // Fallback: use nearby data before (within 30 days)
      const daysBefore = (quarterEnd.getTime() - new Date(beforeEnd.date).getTime()) / (1000 * 60 * 60 * 24);
      if (daysBefore <= 30) {
        endValue = beforeEnd.holdingsPerShare;
      }
    } else if (afterEnd && !beforeEnd) {
      // Fallback: use nearby data after (within 30 days)
      const daysAfter = (new Date(afterEnd.date).getTime() - quarterEnd.getTime()) / (1000 * 60 * 60 * 24);
      if (daysAfter <= 30) {
        endValue = afterEnd.holdingsPerShare;
      }
    }

    // Skip if we couldn't determine values at both boundaries
    if (startValue === null || endValue === null) continue;
    if (startValue <= 0) continue;

    // All quarters are now exactly the same period
    const daysCovered = Math.floor((quarterEnd.getTime() - quarterStart.getTime()) / (1000 * 60 * 60 * 24));
    const growthPct = ((endValue / startValue) - 1) * 100;

    // Annualized only with 12+ months (won't apply to single quarters)
    let annualizedGrowthPct: number | undefined;
    if (daysCovered >= 330) {
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
      startDate: quarterStartStr,
      endDate: quarterEndStr,
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
