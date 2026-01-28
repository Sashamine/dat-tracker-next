/**
 * Filing Checker
 *
 * Checks SEC EDGAR for new filings and marks companies as needing review.
 * Integrates with the verification state system to track what we've processed.
 * 
 * Uses 8-K Item Code filtering to prioritize crypto-relevant filings.
 * See: src/lib/sec/item-filter.ts and specs/8k-item-codes.md
 */

import { TICKER_TO_CIK } from '../sec/sec-edgar';
import { COMPANY_SOURCES } from '../data/company-sources';
import {
  isFilingProcessed,
  recordProcessedFiling,
  updateFilingCheckState,
  getFilingCheckState,
} from './repository';
import {
  parseItemsString,
  filterByItemCodes,
  containsCryptoKeywords,
  formatItemsForDisplay,
  type ItemFilterResult,
} from '../sec/item-filter';
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
  items?: string[];  // 8-K item codes (e.g., ['7.01', '8.01'])
  itemFilter?: ItemFilterResult;  // Result of item code filtering
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
 * Includes 8-K item code parsing and filtering
 */
async function fetchRecentFilings(cik: string, limit: number = 50): Promise<{
  filings: SECFiling[];
  stats: {
    total: number;
    tier1: number;
    tier2: number;
    skipped: number;
  };
}> {
  const stats = { total: 0, tier1: 0, tier2: 0, skipped: 0 };
  
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
      return { filings: [], stats };
    }

    const data = await response.json();
    const recent = data.filings?.recent;
    if (!recent) return { filings: [], stats };

    const filings: SECFiling[] = [];
    const count = Math.min(recent.form?.length || 0, limit);

    for (let i = 0; i < count; i++) {
      const formType = recent.form[i];

      // Only include relevant filing types
      if (!RELEVANT_FILING_TYPES.some(type => formType.startsWith(type))) {
        continue;
      }

      stats.total++;

      // Parse 8-K item codes
      const items = formType.startsWith('8-K') 
        ? parseItemsString(recent.items?.[i])
        : undefined;

      // Apply item code filtering for 8-K filings
      let itemFilter: ItemFilterResult | undefined;
      if (formType.startsWith('8-K') && items) {
        itemFilter = filterByItemCodes(items);
        
        if (!itemFilter.shouldProcess) {
          stats.skipped++;
          console.log(`[Filing Check] Skipping 8-K (${recent.accessionNumber[i]}): ${itemFilter.reason}`);
          continue;
        }
        
        if (itemFilter.tier === 1) {
          stats.tier1++;
        } else {
          stats.tier2++;
        }
      }

      filings.push({
        accessionNumber: recent.accessionNumber[i],
        formType,
        filedDate: recent.filingDate[i],
        periodDate: recent.reportDate?.[i],
        primaryDocument: recent.primaryDocument[i],
        description: recent.primaryDocDescription?.[i],
        items,
        itemFilter,
      });
    }

    return { filings, stats };
  } catch (error) {
    console.error(`Error fetching SEC submissions for CIK ${cik}:`, error);
    return { filings: [], stats };
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

  // Fetch recent filings from SEC (with item code filtering)
  const { filings, stats } = await fetchRecentFilings(cik);
  
  if (stats.skipped > 0) {
    console.log(`[Filing Check] ${ticker}: Skipped ${stats.skipped} irrelevant 8-K(s), processing ${stats.tier1} Tier 1 + ${stats.tier2} Tier 2`);
  }

  const newFilings: SECFiling[] = [];
  const processedFilings: ProcessedFiling[] = [];

  for (const filing of filings) {
    // Check if we've already processed this filing
    const alreadyProcessed = await isFilingProcessed(filing.accessionNumber);

    if (!alreadyProcessed) {
      newFilings.push(filing);

      // Build notes with item context for 8-Ks
      let skipNotes: string | undefined;
      
      if (filing.itemFilter?.requiresKeywordScan) {
        // Tier 2 filings need keyword verification before full processing
        skipNotes = `Tier 2 filing - items: ${filing.items?.join(', ')}. Needs keyword verification.`;
      }

      // Record that we've seen this filing (but not yet extracted data)
      const processed = await recordProcessedFiling({
        ticker,
        accessionNumber: filing.accessionNumber,
        formType: filing.formType as ProcessedFiling['formType'],
        filedDate: filing.filedDate,
        periodDate: filing.periodDate,
        processedAt: new Date().toISOString(),
        processedBy: 'auto',
        skippedReason: undefined,  // Not skipped - just not yet extracted
        skippedNotes: skipNotes,
      });
      processedFilings.push(processed);
    }
  }

  // Build detailed review reason
  let reviewReason: string | undefined;
  if (newFilings.length > 0) {
    const tier1Count = newFilings.filter(f => f.itemFilter?.tier === 1).length;
    const tier2Count = newFilings.filter(f => f.itemFilter?.tier === 2).length;
    const otherCount = newFilings.filter(f => !f.itemFilter).length;
    
    const parts: string[] = [];
    if (tier1Count > 0) parts.push(`${tier1Count} high-priority 8-K(s)`);
    if (tier2Count > 0) parts.push(`${tier2Count} 8-K(s) need keyword check`);
    if (otherCount > 0) parts.push(`${otherCount} 10-K/10-Q`);
    
    reviewReason = parts.join(', ') || `${newFilings.length} new filing(s)`;
  }

  // Update company filing check state
  const latestFiling = filings[0];
  await updateFilingCheckState({
    ticker,
    lastCheckAt: new Date().toISOString(),
    latestFilingAccession: latestFiling?.accessionNumber,
    latestFilingDate: latestFiling?.filedDate,
    needsReview: newFilings.length > 0,
    reviewReason,
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
  itemFilterStats: {
    tier1Processed: number;
    tier2Processed: number;
    skippedByFilter: number;
  };
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
  
  // Track item filter stats across all companies
  const itemFilterStats = {
    tier1Processed: 0,
    tier2Processed: 0,
    skippedByFilter: 0,
  };

  for (const ticker of tickersToCheck) {
    try {
      const result = await checkCompanyFilings(ticker);
      results.push(result);

      if (result.error) {
        errors.push(`${ticker}: ${result.error}`);
      } else if (result.newFilings.length > 0) {
        withNewFilings++;
        totalNewFilings += result.newFilings.length;
        
        // Aggregate item filter stats from new filings
        for (const filing of result.newFilings) {
          if (filing.itemFilter?.tier === 1) {
            itemFilterStats.tier1Processed++;
          } else if (filing.itemFilter?.tier === 2) {
            itemFilterStats.tier2Processed++;
          }
        }
        
        // Log with item context for 8-Ks
        const tier1 = result.newFilings.filter(f => f.itemFilter?.tier === 1);
        const tier2 = result.newFilings.filter(f => f.itemFilter?.tier === 2);
        
        if (tier1.length > 0 || tier2.length > 0) {
          const itemSummary = tier1.length > 0 
            ? `${tier1.length} Tier 1 (${tier1.map(f => f.items?.join(',') || '?').join('; ')})`
            : '';
          const tier2Summary = tier2.length > 0
            ? `${tier2.length} Tier 2`
            : '';
          console.log(`[Filing Check] ${ticker}: ${[itemSummary, tier2Summary].filter(Boolean).join(', ')}`);
        } else {
          console.log(`[Filing Check] ${ticker}: ${result.newFilings.length} new filing(s)`);
        }
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
  console.log(`[Filing Check] Item filter stats: ${itemFilterStats.tier1Processed} Tier 1, ${itemFilterStats.tier2Processed} Tier 2 processed`);

  return {
    checked: tickersToCheck.length,
    withNewFilings,
    totalNewFilings,
    results,
    errors,
    itemFilterStats,
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
