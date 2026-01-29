/**
 * SEC Filing Monitor for Burn Rate Updates
 * 
 * Monitors SEC EDGAR for new filings that contain financial data,
 * specifically targeting filings that would have operating cash flow:
 * - 10-Q: Quarterly reports (US domestic) - has cash flow statement
 * - 6-K: Current reports (FPI) - may have interim financials
 * - 10-K: Annual reports (US domestic) - has cash flow statement
 * - 20-F: Annual reports (FPI) - has cash flow statement
 * 
 * Usage:
 *   import { checkForNewFilings, getCompaniesWithNewFilings } from './filing-monitor';
 *   
 *   // Check specific companies for new filings
 *   const newFilings = await checkForNewFilings(['MSTR', 'MARA']);
 *   
 *   // Get companies that have new financial filings since their last burn update
 *   const needsUpdate = await getCompaniesWithNewFilings();
 */

import { TICKER_TO_CIK } from './sec-edgar';
import { getSECCompanies } from '../verification/burn-staleness';
import type { Company } from '../types';

// Filing types that contain financial statements (cash flow data)
const FINANCIAL_FILING_TYPES = ['10-Q', '10-K', '20-F', '6-K', '10-Q/A', '10-K/A', '20-F/A'];

// SEC API data structures
interface SECFilingRecent {
  form: string[];
  filingDate: string[];
  accessionNumber: string[];
  primaryDocument: string[];
  primaryDocDescription?: string[];
}

interface SECSubmissions {
  name: string;
  cik: string;
  filings: {
    recent: SECFilingRecent;
  };
}

export interface FilingInfo {
  form: string;
  filingDate: string;
  accessionNumber: string;
  documentUrl: string;
  description?: string;
}

export interface CompanyFilingResult {
  ticker: string;
  companyId: string;
  name: string;
  cik: string;
  
  // Most recent financial filing
  latestFiling: FilingInfo | null;
  
  // Company's current burn data
  currentBurnAsOf: string | undefined;
  
  // Does the filing post-date the burn data?
  hasNewerFiling: boolean;
  
  // All recent financial filings (last 10)
  recentFilings: FilingInfo[];
  
  error?: string;
}

/**
 * Fetch submissions data from SEC EDGAR
 */
async function fetchSECSubmissions(cik: string): Promise<SECSubmissions | null> {
  try {
    const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DAT-Tracker/1.0 (https://dattracker.com; admin@dattracker.com)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`[Filing Monitor] SEC API error for CIK ${cik}: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`[Filing Monitor] Error fetching CIK ${cik}:`, error);
    return null;
  }
}

/**
 * Build document URL from filing info
 */
function buildDocumentUrl(cik: string, accessionNumber: string, primaryDocument: string): string {
  const cikNum = cik.replace(/^0+/, '');
  const accNum = accessionNumber.replace(/-/g, '');
  return `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNum}/${primaryDocument}`;
}

/**
 * Extract financial filings from SEC submissions
 */
function extractFinancialFilings(
  submissions: SECSubmissions,
  maxCount: number = 10
): FilingInfo[] {
  const { recent } = submissions.filings;
  const filings: FilingInfo[] = [];
  
  const count = Math.min(recent.form.length, 50); // Check up to 50 recent filings
  
  for (let i = 0; i < count && filings.length < maxCount; i++) {
    const form = recent.form[i];
    
    // Only include financial filing types
    if (!FINANCIAL_FILING_TYPES.some(t => form.startsWith(t))) continue;
    
    filings.push({
      form,
      filingDate: recent.filingDate[i],
      accessionNumber: recent.accessionNumber[i],
      documentUrl: buildDocumentUrl(
        submissions.cik,
        recent.accessionNumber[i],
        recent.primaryDocument[i]
      ),
      description: recent.primaryDocDescription?.[i],
    });
  }
  
  return filings;
}

/**
 * Check if a filing is newer than the burn data date
 */
function isFilingNewer(filingDate: string, burnAsOf: string | undefined): boolean {
  if (!burnAsOf) return true; // No burn date = any filing is newer
  
  const filing = new Date(filingDate);
  const burn = new Date(burnAsOf);
  
  return filing > burn;
}

/**
 * Check a single company for new filings
 */
export async function checkCompanyFilings(
  company: Company
): Promise<CompanyFilingResult> {
  const cik = company.secCik;
  
  if (!cik) {
    return {
      ticker: company.ticker,
      companyId: company.id,
      name: company.name,
      cik: '',
      latestFiling: null,
      currentBurnAsOf: company.burnAsOf,
      hasNewerFiling: false,
      recentFilings: [],
      error: 'No SEC CIK',
    };
  }
  
  const submissions = await fetchSECSubmissions(cik);
  
  if (!submissions) {
    return {
      ticker: company.ticker,
      companyId: company.id,
      name: company.name,
      cik,
      latestFiling: null,
      currentBurnAsOf: company.burnAsOf,
      hasNewerFiling: false,
      recentFilings: [],
      error: 'Failed to fetch SEC data',
    };
  }
  
  const recentFilings = extractFinancialFilings(submissions);
  const latestFiling = recentFilings[0] || null;
  
  // Check if the latest filing is newer than the burn data
  const hasNewerFiling = latestFiling 
    ? isFilingNewer(latestFiling.filingDate, company.burnAsOf)
    : false;
  
  return {
    ticker: company.ticker,
    companyId: company.id,
    name: company.name,
    cik,
    latestFiling,
    currentBurnAsOf: company.burnAsOf,
    hasNewerFiling,
    recentFilings,
  };
}

/**
 * Check multiple companies for new filings
 */
export async function checkForNewFilings(
  tickers: string[]
): Promise<CompanyFilingResult[]> {
  const companies = getSECCompanies().filter(c => 
    tickers.map(t => t.toUpperCase()).includes(c.ticker.toUpperCase())
  );
  
  const results: CompanyFilingResult[] = [];
  
  for (const company of companies) {
    const result = await checkCompanyFilings(company);
    results.push(result);
    
    // Rate limit - SEC requires polite access
    await new Promise(r => setTimeout(r, 200));
  }
  
  return results;
}

/**
 * Get all companies that have new financial filings since their last burn update
 * 
 * This is the primary function for identifying companies needing burn rate refresh.
 */
export async function getCompaniesWithNewFilings(): Promise<CompanyFilingResult[]> {
  const companies = getSECCompanies();
  const results: CompanyFilingResult[] = [];
  
  console.log(`[Filing Monitor] Checking ${companies.length} companies for new filings...`);
  
  for (const company of companies) {
    const result = await checkCompanyFilings(company);
    
    if (result.hasNewerFiling) {
      results.push(result);
      console.log(
        `[Filing Monitor] ${company.ticker}: New ${result.latestFiling?.form} filed ${result.latestFiling?.filingDate}` +
        ` (burn data from ${company.burnAsOf || 'never'})`
      );
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`[Filing Monitor] Found ${results.length} companies with newer filings`);
  
  return results;
}

/**
 * Get tickers of companies with new filings that need burn rate refresh
 */
export async function getTickersWithNewFilings(): Promise<string[]> {
  const results = await getCompaniesWithNewFilings();
  return results.map(r => r.ticker);
}

/**
 * Summary of filing monitor results
 */
export interface FilingMonitorSummary {
  totalChecked: number;
  withNewerFilings: number;
  withoutCik: number;
  errors: number;
  
  // Breakdown by filing type
  byFilingType: Record<string, number>;
  
  // Companies needing update
  needsUpdate: Array<{
    ticker: string;
    latestForm: string;
    filingDate: string;
    burnAsOf: string | undefined;
  }>;
}

/**
 * Get a summary of all companies needing burn rate updates based on new filings
 */
export async function getFilingMonitorSummary(): Promise<FilingMonitorSummary> {
  const companies = getSECCompanies();
  const results: CompanyFilingResult[] = [];
  let withoutCik = 0;
  let errors = 0;
  
  for (const company of companies) {
    if (!company.secCik) {
      withoutCik++;
      continue;
    }
    
    const result = await checkCompanyFilings(company);
    
    if (result.error) {
      errors++;
    }
    
    results.push(result);
    
    // Rate limit
    await new Promise(r => setTimeout(r, 200));
  }
  
  const withNewerFilings = results.filter(r => r.hasNewerFiling);
  
  // Count by filing type
  const byFilingType: Record<string, number> = {};
  for (const result of withNewerFilings) {
    if (result.latestFiling) {
      const form = result.latestFiling.form.replace('/A', '');
      byFilingType[form] = (byFilingType[form] || 0) + 1;
    }
  }
  
  return {
    totalChecked: results.length,
    withNewerFilings: withNewerFilings.length,
    withoutCik,
    errors,
    byFilingType,
    needsUpdate: withNewerFilings.map(r => ({
      ticker: r.ticker,
      latestForm: r.latestFiling?.form || 'unknown',
      filingDate: r.latestFiling?.filingDate || 'unknown',
      burnAsOf: r.currentBurnAsOf,
    })),
  };
}

/**
 * Check for filings since a specific date
 * Useful for monitoring new filings in a time window
 */
export async function checkFilingsSinceDate(
  sinceDate: Date
): Promise<CompanyFilingResult[]> {
  const companies = getSECCompanies();
  const sinceDateStr = sinceDate.toISOString().split('T')[0];
  const results: CompanyFilingResult[] = [];
  
  console.log(`[Filing Monitor] Checking for filings since ${sinceDateStr}...`);
  
  for (const company of companies) {
    if (!company.secCik) continue;
    
    const result = await checkCompanyFilings(company);
    
    // Check if any filing is after the since date
    const hasRecentFiling = result.recentFilings.some(
      f => f.filingDate >= sinceDateStr
    );
    
    if (hasRecentFiling) {
      // Filter to only filings since the date
      const filteredFilings = result.recentFilings.filter(
        f => f.filingDate >= sinceDateStr
      );
      
      results.push({
        ...result,
        recentFilings: filteredFilings,
        latestFiling: filteredFilings[0] || null,
      });
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`[Filing Monitor] Found ${results.length} companies with filings since ${sinceDateStr}`);
  
  return results;
}
