/**
 * Filing Checker
 *
 * Checks SEC EDGAR for new filings and marks companies as needing review.
 * Integrates with the verification state system to track what we've processed.
 */

import { TICKER_TO_CIK } from '../sec/sec-edgar';
import { COMPANY_SOURCES } from '../data/company-sources';
import {
  isFilingProcessed,
  recordProcessedFiling,
  updateFilingCheckState,
  getFilingCheckState,
} from './repository';
import type { ProcessedFiling, VerifiableField, ExtractedData } from './types';

// Filing types we care about for verification
const RELEVANT_FILING_TYPES = ['8-K', '10-K', '10-Q', '10-K/A', '10-Q/A'];

// Fields that can be extracted from each filing type
const FILING_TYPE_FIELDS: Record<string, VerifiableField[]> = {
  '8-K': ['holdings', 'shares_outstanding'],  // Real-time updates
  '10-K': ['shares_outstanding', 'total_debt', 'cash', 'preferred_equity', 'holdings'],
  '10-Q': ['shares_outstanding', 'total_debt', 'cash', 'preferred_equity', 'holdings'],
  '10-K/A': ['shares_outstanding', 'total_debt', 'cash', 'preferred_equity'],
  '10-Q/A': ['shares_outstanding', 'total_debt', 'cash', 'preferred_equity'],
};

interface SECFiling {
  accessionNumber: string;
  formType: string;
  filedDate: string;
  periodDate?: string;
  primaryDocument: string;
  description?: string;
}

interface FilingCheckResult {
  ticker: string;
  cik: string;
  newFilings: SECFiling[];
  processedFilings: ProcessedFiling[];
  error?: string;
}

/**
 * Fetch recent filings from SEC EDGAR for a company
 */
async function fetchRecentFilings(cik: string, limit: number = 50): Promise<SECFiling[]> {
  try {
    const paddedCik = cik.padStart(10, '0');
    const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DAT-Tracker/1.0 (https://dattracker.com; admin@dattracker.com)',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`SEC EDGAR API error for CIK ${cik}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const recent = data.filings?.recent;
    if (!recent) return [];

    const filings: SECFiling[] = [];
    const count = Math.min(recent.form?.length || 0, limit);

    for (let i = 0; i < count; i++) {
      const formType = recent.form[i];

      // Only include relevant filing types
      if (!RELEVANT_FILING_TYPES.some(type => formType.startsWith(type))) {
        continue;
      }

      filings.push({
        accessionNumber: recent.accessionNumber[i],
        formType,
        filedDate: recent.filingDate[i],
        periodDate: recent.reportDate?.[i],
        primaryDocument: recent.primaryDocument[i],
        description: recent.primaryDocDescription?.[i],
      });
    }

    return filings;
  } catch (error) {
    console.error(`Error fetching SEC submissions for CIK ${cik}:`, error);
    return [];
  }
}

/**
 * Get SEC CIK for a ticker
 */
function getCikForTicker(ticker: string): string | null {
  // Try company-sources first
  const source = COMPANY_SOURCES[ticker];
  if (source?.secCik) {
    return source.secCik;
  }

  // Fall back to TICKER_TO_CIK
  return TICKER_TO_CIK[ticker.toUpperCase()] || null;
}

/**
 * Check a single company for new filings
 */
export async function checkCompanyFilings(ticker: string): Promise<FilingCheckResult> {
  const cik = getCikForTicker(ticker);
  if (!cik) {
    return {
      ticker,
      cik: '',
      newFilings: [],
      processedFilings: [],
      error: 'No CIK found for ticker',
    };
  }

  // Fetch recent filings from SEC
  const filings = await fetchRecentFilings(cik);

  const newFilings: SECFiling[] = [];
  const processedFilings: ProcessedFiling[] = [];

  for (const filing of filings) {
    // Check if we've already processed this filing
    const alreadyProcessed = await isFilingProcessed(filing.accessionNumber);

    if (!alreadyProcessed) {
      newFilings.push(filing);

      // Record that we've seen this filing (but not yet extracted data)
      const processed = await recordProcessedFiling({
        ticker,
        accessionNumber: filing.accessionNumber,
        formType: filing.formType as ProcessedFiling['formType'],
        filedDate: filing.filedDate,
        periodDate: filing.periodDate,
        processedAt: new Date().toISOString(),
        processedBy: 'auto',
        // No extracted data yet - needs processing
        skippedReason: undefined,
        skippedNotes: undefined,
      });
      processedFilings.push(processed);
    }
  }

  // Update company filing check state
  const latestFiling = filings[0];
  await updateFilingCheckState({
    ticker,
    lastCheckAt: new Date().toISOString(),
    latestFilingAccession: latestFiling?.accessionNumber,
    latestFilingDate: latestFiling?.filedDate,
    needsReview: newFilings.length > 0,
    reviewReason: newFilings.length > 0
      ? `${newFilings.length} new filing(s): ${newFilings.map(f => f.formType).join(', ')}`
      : undefined,
  });

  return {
    ticker,
    cik,
    newFilings,
    processedFilings,
  };
}

/**
 * Check all companies with SEC CIKs for new filings
 */
export async function checkAllCompanyFilings(options?: {
  tickers?: string[];  // Specific tickers to check (default: all with CIKs)
  rateLimit?: number;  // ms between requests (default: 200)
}): Promise<{
  checked: number;
  withNewFilings: number;
  totalNewFilings: number;
  results: FilingCheckResult[];
  errors: string[];
}> {
  const { tickers, rateLimit = 200 } = options || {};

  // Get all tickers with SEC CIKs
  let tickersToCheck: string[];
  if (tickers) {
    tickersToCheck = tickers.filter(t => getCikForTicker(t));
  } else {
    // Combine tickers from both sources
    const fromCompanySources = Object.keys(COMPANY_SOURCES).filter(
      t => COMPANY_SOURCES[t].secCik
    );
    const fromTickerToCik = Object.keys(TICKER_TO_CIK);
    tickersToCheck = [...new Set([...fromCompanySources, ...fromTickerToCik])];
  }

  console.log(`[Filing Check] Checking ${tickersToCheck.length} companies for new filings...`);

  const results: FilingCheckResult[] = [];
  const errors: string[] = [];
  let withNewFilings = 0;
  let totalNewFilings = 0;

  for (const ticker of tickersToCheck) {
    try {
      const result = await checkCompanyFilings(ticker);
      results.push(result);

      if (result.error) {
        errors.push(`${ticker}: ${result.error}`);
      } else if (result.newFilings.length > 0) {
        withNewFilings++;
        totalNewFilings += result.newFilings.length;
        console.log(`[Filing Check] ${ticker}: ${result.newFilings.length} new filing(s)`);
      }

      // Rate limit to be polite to SEC EDGAR
      await new Promise(resolve => setTimeout(resolve, rateLimit));
    } catch (error) {
      const errMsg = `${ticker}: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errMsg);
      console.error(`[Filing Check] Error checking ${ticker}:`, error);
    }
  }

  console.log(`[Filing Check] Complete: ${tickersToCheck.length} checked, ${withNewFilings} with new filings, ${totalNewFilings} total new`);

  return {
    checked: tickersToCheck.length,
    withNewFilings,
    totalNewFilings,
    results,
    errors,
  };
}

/**
 * Get summary of companies needing review
 */
export async function getFilingReviewSummary(): Promise<{
  needsReview: Array<{
    ticker: string;
    reason: string;
    latestFiling: string;
    latestDate: string;
  }>;
  upToDate: number;
  neverChecked: number;
}> {
  // This would query company_filing_checks table
  // For now, return a placeholder
  // TODO: Implement actual query
  return {
    needsReview: [],
    upToDate: 0,
    neverChecked: 0,
  };
}

/**
 * Determine what fields a filing might contain
 */
export function getExpectedFields(formType: string): VerifiableField[] {
  // Normalize form type (e.g., "8-K/A" -> "8-K")
  const baseType = formType.split('/')[0];
  return FILING_TYPE_FIELDS[baseType] || FILING_TYPE_FIELDS[formType] || [];
}

/**
 * Build SEC filing URL from accession number
 */
export function buildFilingUrl(cik: string, accessionNumber: string, document?: string): string {
  const cikNum = cik.replace(/^0+/, '');
  const accNum = accessionNumber.replace(/-/g, '');
  const baseUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNum}`;
  return document ? `${baseUrl}/${document}` : baseUrl;
}
