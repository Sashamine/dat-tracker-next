/**
 * SEC 8-K Auto-Update Adapter
 *
 * Finds new 8-K filings, extracts holdings via LLM, and updates companies.ts directly.
 * This follows the ROADMAP architecture: TypeScript files as source of truth, git-reviewable changes.
 *
 * Flow:
 * 1. Check SEC EDGAR for recent 8-K filings with crypto content
 * 2. Extract holdings from filing text using LLM
 * 3. Compare to current value in companies.ts
 * 4. If different and confident, update companies.ts
 * 5. Git commit with descriptive message
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Reuse existing SEC EDGAR code
import {
  searchFilingDocuments,
  TICKER_TO_CIK,
} from '../monitoring/sources/sec-edgar';

// Reuse existing LLM extractor
import {
  extractHoldingsFromText,
  validateExtraction,
  createLLMConfigFromEnv,
  type LLMProvider,
} from '../monitoring/parsers/llm-extractor';

// Path to companies.ts (relative to project root)
const COMPANIES_FILE = 'src/lib/data/companies.ts';

export interface SecUpdateResult {
  ticker: string;
  success: boolean;
  previousHoldings?: number;
  newHoldings?: number;
  filingDate?: string;
  filingUrl?: string;
  confidence?: number;
  reasoning?: string;
  error?: string;
  committed?: boolean;
}

export interface SecUpdateConfig {
  tickers?: string[];           // Specific tickers to check (default: all with CIKs)
  sinceDays?: number;           // How far back to look (default: 7)
  dryRun?: boolean;             // Don't actually update files or commit
  autoCommit?: boolean;         // Commit changes automatically (default: true)
  minConfidence?: number;       // Minimum confidence to accept (default: 0.7)
  maxChangePct?: number;        // Max % change to auto-accept (default: 50)
}

/**
 * Fetch SEC submissions to find recent filings
 */
async function fetchSECSubmissions(cik: string): Promise<any> {
  const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'DAT-Tracker/1.0 (https://dattracker.com; admin@dattracker.com)',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`SEC API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Find recent 8-K filings for a company
 */
async function findRecent8KFilings(
  ticker: string,
  cik: string,
  asset: string,
  sinceDays: number
): Promise<Array<{ accessionNumber: string; filingDate: string; documentUrl?: string; content?: string }>> {
  const data = await fetchSECSubmissions(cik);
  if (!data?.filings?.recent) return [];

  const recent = data.filings.recent;
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - sinceDays);
  const sinceDateStr = sinceDate.toISOString().split('T')[0];

  const filings: Array<{ accessionNumber: string; filingDate: string; documentUrl?: string; content?: string }> = [];

  const count = Math.min(recent.form.length, 50);
  for (let i = 0; i < count; i++) {
    const formType = recent.form[i];
    const filingDate = recent.filingDate[i];

    // Only 8-K filings within date range
    if (formType !== '8-K' || filingDate < sinceDateStr) continue;

    const accessionNumber = recent.accessionNumber[i];

    // Search for crypto content in the filing
    const result = await searchFilingDocuments(ticker, cik, accessionNumber, asset);

    if (result) {
      filings.push({
        accessionNumber,
        filingDate,
        documentUrl: result.documentUrl,
        content: result.content,
      });
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 300));
  }

  return filings;
}

/**
 * Update companies.ts with new holdings value
 */
function updateCompaniesFile(
  ticker: string,
  newHoldings: number,
  filingDate: string,
  filingUrl: string,
  dryRun: boolean
): { success: boolean; previousHoldings?: number } {
  const filePath = path.join(process.cwd(), COMPANIES_FILE);
  const content = fs.readFileSync(filePath, 'utf-8');

  // Find the company entry by ticker
  // Pattern: ticker: "XXXX", followed by holdings: NUMBER
  const tickerPattern = new RegExp(
    `(ticker:\\s*["']${ticker}["'][\\s\\S]*?)(holdings:\\s*)([\\d_,]+)(\\s*,)([\\s\\S]*?)(holdingsLastUpdated:\\s*["'])([^"']+)(["'])([\\s\\S]*?)(holdingsSource:\\s*["'])([^"']+)(["'])([\\s\\S]*?)(holdingsSourceUrl:\\s*["'])([^"']+)(["'])`,
    'i'
  );

  const match = content.match(tickerPattern);
  if (!match) {
    // Try simpler pattern for holdings only
    const simplePattern = new RegExp(
      `(ticker:\\s*["']${ticker}["'][\\s\\S]*?)(holdings:\\s*)([\\d_,]+)`,
      'i'
    );
    const simpleMatch = content.match(simplePattern);

    if (!simpleMatch) {
      return { success: false };
    }

    // Extract previous holdings
    const previousHoldings = parseInt(simpleMatch[3].replace(/[_,]/g, ''));

    if (dryRun) {
      console.log(`[DRY RUN] Would update ${ticker}: ${previousHoldings} → ${newHoldings}`);
      return { success: true, previousHoldings };
    }

    // Update just the holdings value
    const newContent = content.replace(
      simplePattern,
      `$1$2${newHoldings.toLocaleString().replace(/,/g, '_')}`
    );

    fs.writeFileSync(filePath, newContent);
    return { success: true, previousHoldings };
  }

  // Extract previous holdings
  const previousHoldings = parseInt(match[3].replace(/[_,]/g, ''));

  if (dryRun) {
    console.log(`[DRY RUN] Would update ${ticker}:`);
    console.log(`  holdings: ${previousHoldings} → ${newHoldings}`);
    console.log(`  holdingsLastUpdated: ${match[7]} → ${filingDate}`);
    console.log(`  holdingsSource: ${match[11]} → sec-filing`);
    console.log(`  holdingsSourceUrl: ${match[15]} → ${filingUrl}`);
    return { success: true, previousHoldings };
  }

  // Build replacement with updated values
  const formattedHoldings = newHoldings.toLocaleString().replace(/,/g, '_');
  const newContent = content.replace(
    tickerPattern,
    `$1$2${formattedHoldings}$4$5$6${filingDate}$8$9$10sec-filing$12$13$14${filingUrl}$16`
  );

  fs.writeFileSync(filePath, newContent);
  return { success: true, previousHoldings };
}

/**
 * Commit changes to git
 */
function gitCommit(ticker: string, previousHoldings: number, newHoldings: number, filingDate: string): boolean {
  try {
    const message = `Update ${ticker} holdings from SEC 8-K filing

Holdings: ${previousHoldings.toLocaleString()} → ${newHoldings.toLocaleString()}
Filing date: ${filingDate}
Source: SEC EDGAR 8-K

Auto-updated by SEC 8-K adapter.

Co-Authored-By: Claude <noreply@anthropic.com>`;

    execSync(`git add "${COMPANIES_FILE}"`, { stdio: 'pipe' });
    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { stdio: 'pipe' });

    return true;
  } catch (error) {
    console.error('[SEC Update] Git commit failed:', error);
    return false;
  }
}

/**
 * Process a single company
 */
async function processCompany(
  ticker: string,
  asset: string,
  currentHoldings: number,
  config: SecUpdateConfig
): Promise<SecUpdateResult> {
  const cik = TICKER_TO_CIK[ticker.toUpperCase()];
  if (!cik) {
    return { ticker, success: false, error: 'No CIK mapping found' };
  }

  const llmConfig = createLLMConfigFromEnv();
  if (!llmConfig) {
    return { ticker, success: false, error: 'No LLM API key configured' };
  }

  console.log(`[SEC Update] Checking ${ticker}...`);

  try {
    // Find recent 8-K filings
    const filings = await findRecent8KFilings(ticker, cik, asset, config.sinceDays || 7);

    if (filings.length === 0) {
      return { ticker, success: true, reasoning: 'No recent 8-K filings with crypto content' };
    }

    // Process the most recent filing
    const filing = filings[0];

    if (!filing.content) {
      return { ticker, success: false, error: 'Filing found but no content extracted' };
    }

    // Extract holdings using LLM
    const extraction = await extractHoldingsFromText(
      filing.content,
      {
        companyName: ticker, // Will be enriched by caller if needed
        ticker,
        asset,
        currentHoldings,
      },
      llmConfig
    );

    // Validate extraction
    if (extraction.holdings === null) {
      return {
        ticker,
        success: true,
        reasoning: extraction.reasoning || 'LLM could not extract holdings from filing',
        filingDate: filing.filingDate,
        filingUrl: filing.documentUrl,
      };
    }

    const validation = validateExtraction(extraction, {
      companyName: ticker,
      ticker,
      asset,
      currentHoldings,
    });

    // Check confidence threshold
    const minConfidence = config.minConfidence || 0.7;
    if (extraction.confidence < minConfidence) {
      return {
        ticker,
        success: true,
        newHoldings: extraction.holdings,
        confidence: extraction.confidence,
        reasoning: `Confidence ${(extraction.confidence * 100).toFixed(0)}% below threshold ${(minConfidence * 100).toFixed(0)}%`,
        filingDate: filing.filingDate,
        filingUrl: filing.documentUrl,
      };
    }

    // Check for dramatic changes
    const changePct = Math.abs((extraction.holdings - currentHoldings) / currentHoldings) * 100;
    const maxChangePct = config.maxChangePct || 50;
    if (changePct > maxChangePct) {
      return {
        ticker,
        success: true,
        previousHoldings: currentHoldings,
        newHoldings: extraction.holdings,
        confidence: extraction.confidence,
        reasoning: `Change of ${changePct.toFixed(1)}% exceeds threshold ${maxChangePct}% - requires manual review`,
        filingDate: filing.filingDate,
        filingUrl: filing.documentUrl,
      };
    }

    // No change needed
    if (extraction.holdings === currentHoldings) {
      return {
        ticker,
        success: true,
        previousHoldings: currentHoldings,
        newHoldings: extraction.holdings,
        reasoning: 'Holdings unchanged',
        filingDate: filing.filingDate,
        filingUrl: filing.documentUrl,
      };
    }

    // Update companies.ts
    const updateResult = updateCompaniesFile(
      ticker,
      extraction.holdings,
      filing.filingDate,
      filing.documentUrl || '',
      config.dryRun || false
    );

    if (!updateResult.success) {
      return {
        ticker,
        success: false,
        error: 'Failed to update companies.ts - ticker pattern not found',
        newHoldings: extraction.holdings,
        filingDate: filing.filingDate,
        filingUrl: filing.documentUrl,
      };
    }

    // Git commit
    let committed = false;
    if (!config.dryRun && config.autoCommit !== false) {
      committed = gitCommit(
        ticker,
        updateResult.previousHoldings || currentHoldings,
        extraction.holdings,
        filing.filingDate
      );
    }

    return {
      ticker,
      success: true,
      previousHoldings: updateResult.previousHoldings,
      newHoldings: extraction.holdings,
      confidence: extraction.confidence,
      reasoning: extraction.reasoning,
      filingDate: filing.filingDate,
      filingUrl: filing.documentUrl,
      committed,
    };

  } catch (error) {
    return {
      ticker,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get company info from companies.ts
 */
function getCompanyInfo(ticker: string): { asset: string; holdings: number } | null {
  // Import dynamically to get current values
  const filePath = path.join(process.cwd(), COMPANIES_FILE);
  const content = fs.readFileSync(filePath, 'utf-8');

  // Find ticker and extract asset and holdings
  const pattern = new RegExp(
    `ticker:\\s*["']${ticker}["'][\\s\\S]*?asset:\\s*["']([^"']+)["'][\\s\\S]*?holdings:\\s*([\\d_,]+)`,
    'i'
  );

  const match = content.match(pattern);
  if (!match) return null;

  return {
    asset: match[1],
    holdings: parseInt(match[2].replace(/[_,]/g, '')),
  };
}

/**
 * Main function: Check SEC for updates and apply them
 */
export async function runSecAutoUpdate(config: SecUpdateConfig = {}): Promise<SecUpdateResult[]> {
  const results: SecUpdateResult[] = [];

  // Determine which tickers to check
  let tickers = config.tickers;
  if (!tickers || tickers.length === 0) {
    tickers = Object.keys(TICKER_TO_CIK);
  }

  console.log(`[SEC Update] Checking ${tickers.length} companies for 8-K updates...`);
  if (config.dryRun) {
    console.log('[SEC Update] DRY RUN - no changes will be made');
  }

  for (const ticker of tickers) {
    const companyInfo = getCompanyInfo(ticker);
    if (!companyInfo) {
      results.push({ ticker, success: false, error: 'Company not found in companies.ts' });
      continue;
    }

    const result = await processCompany(ticker, companyInfo.asset, companyInfo.holdings, config);
    results.push(result);

    // Log result
    if (result.newHoldings !== undefined && result.newHoldings !== result.previousHoldings) {
      console.log(`[SEC Update] ${ticker}: ${result.previousHoldings?.toLocaleString()} → ${result.newHoldings.toLocaleString()} (${result.committed ? 'committed' : 'not committed'})`);
    } else if (result.error) {
      console.log(`[SEC Update] ${ticker}: Error - ${result.error}`);
    }

    // Rate limit between companies
    await new Promise(r => setTimeout(r, 1000));
  }

  // Summary
  const updated = results.filter(r => r.newHoldings !== undefined && r.newHoldings !== r.previousHoldings);
  const errors = results.filter(r => r.error);

  console.log(`\n[SEC Update] Complete: ${updated.length} updated, ${errors.length} errors, ${results.length - updated.length - errors.length} unchanged`);

  return results;
}

/**
 * Check a single ticker for SEC updates
 */
export async function checkTickerForSecUpdate(
  ticker: string,
  config: SecUpdateConfig = {}
): Promise<SecUpdateResult> {
  const companyInfo = getCompanyInfo(ticker);
  if (!companyInfo) {
    return { ticker, success: false, error: 'Company not found in companies.ts' };
  }

  return processCompany(ticker, companyInfo.asset, companyInfo.holdings, config);
}
