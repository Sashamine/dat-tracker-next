/**
 * SEDAR+ Filing Tracker
 * 
 * Tracks which filings have been processed for Canadian companies.
 * Since SEDAR+ doesn't have an API, we track processed filings
 * and alert when expected filings are due.
 */

import { CANADIAN_COMPANIES, type CanadianCompany } from './canadian-companies';

export interface TrackedFiling {
  ticker: string;
  filingType: string;
  filingDate: string;        // YYYY-MM-DD
  periodEnd: string;         // YYYY-MM-DD (fiscal period this covers)
  sedarUrl?: string;
  pdfPath?: string;          // Local path where PDF is stored
  processed: boolean;
  extractedHoldings?: number;
  extractedShares?: number;
  notes?: string;
  createdAt: string;
  processedAt?: string;
}

export interface ExpectedFiling {
  ticker: string;
  companyName: string;
  filingType: string;
  periodEnd: string;         // YYYY-MM-DD
  expectedBy: string;        // YYYY-MM-DD (filing deadline)
  status: 'pending' | 'overdue' | 'filed';
  sedarProfileNumber: string;
  sedarSearchUrl: string;
}

/**
 * Calculate expected filings based on fiscal year end
 * Canadian rules: Quarterly within 45-60 days, Annual within 90-120 days
 */
export function getExpectedFilings(): ExpectedFiling[] {
  const today = new Date();
  const expected: ExpectedFiling[] = [];

  for (const company of CANADIAN_COMPANIES) {
    // Determine fiscal quarters based on fiscal year end
    const fyEndMonth = getMonthNumber(company.fiscalYearEnd);
    const quarters = getFiscalQuarters(fyEndMonth);

    for (const quarter of quarters) {
      const periodEnd = new Date(quarter.year, quarter.month - 1, quarter.day);
      const deadline = new Date(periodEnd);
      deadline.setDate(deadline.getDate() + (quarter.isAnnual ? 120 : 60));

      // Only show filings expected in the last 180 days
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 180);

      if (periodEnd > cutoff && deadline <= new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)) {
        const status = deadline < today ? 'overdue' : 'pending';

        expected.push({
          ticker: company.ticker,
          companyName: company.name,
          filingType: quarter.isAnnual ? 'Annual Financial Statements' : 'Interim Financial Statements',
          periodEnd: formatDate(periodEnd),
          expectedBy: formatDate(deadline),
          status,
          sedarProfileNumber: company.sedarProfileNumber,
          sedarSearchUrl: `https://www.sedarplus.ca/csa-party/records/searchRecords.html?_=profile&profile=${company.sedarProfileNumber}`,
        });
      }
    }
  }

  return expected.sort((a, b) => a.expectedBy.localeCompare(b.expectedBy));
}

function getMonthNumber(monthName: string): number {
  const months: Record<string, number> = {
    january: 1, february: 2, march: 3, april: 4,
    may: 5, june: 6, july: 7, august: 8,
    september: 9, october: 10, november: 11, december: 12,
  };
  return months[monthName.toLowerCase()] || 12;
}

function getFiscalQuarters(fyEndMonth: number): Array<{ year: number; month: number; day: number; isAnnual: boolean }> {
  const today = new Date();
  const currentYear = today.getFullYear();
  const quarters: Array<{ year: number; month: number; day: number; isAnnual: boolean }> = [];

  // Generate last 4 quarter ends
  for (let i = 0; i < 4; i++) {
    const quarterMonth = ((fyEndMonth - 1 - (i * 3) % 12) + 12) % 12 + 1;
    let year = currentYear;
    
    // Adjust year if quarter month is ahead of FY end month
    if (i === 0) {
      // Most recent FY end
      if (quarterMonth > today.getMonth() + 1 || 
          (quarterMonth === today.getMonth() + 1 && today.getDate() < 28)) {
        year = currentYear - 1;
      }
    } else {
      // Previous quarters
      const baseDate = new Date(currentYear, fyEndMonth - 1, 28);
      baseDate.setMonth(baseDate.getMonth() - (i * 3));
      year = baseDate.getFullYear();
    }

    const lastDay = new Date(year, quarterMonth, 0).getDate();
    quarters.push({
      year,
      month: quarterMonth,
      day: lastDay,
      isAnnual: quarterMonth === fyEndMonth,
    });
  }

  return quarters;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Generate SEDAR+ search URL for a company's documents
 */
export function getSedarSearchUrl(profileNumber: string): string {
  return `https://www.sedarplus.ca/csa-party/records/searchRecords.html?_=profile&profile=${profileNumber}`;
}

/**
 * Generate the upload path for a filing document
 */
export function getFilingUploadPath(ticker: string, filingType: string, periodEnd: string): string {
  const typeSlug = filingType.toLowerCase().replace(/\s+/g, '-');
  const period = periodEnd.replace(/-/g, '');
  return `data/sedar-content/${ticker.toLowerCase()}/${typeSlug}-${period}.pdf`;
}
