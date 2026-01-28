/**
 * SEC Auto-Update Adapter (Hybrid XBRL + LLM)
 *
 * Combines two extraction methods for maximum reliability:
 * 1. XBRL extraction (deterministic) - for 10-K/10-Q quarterly data
 * 2. LLM extraction (probabilistic) - for 8-K event-driven updates
 *
 * Flow:
 * 1. Try XBRL extraction first (structured data, 100% confidence)
 * 2. Check for recent 8-K filings with crypto content
 * 3. Extract holdings from 8-K text using LLM
 * 4. Cross-validate XBRL vs LLM when both available
 * 5. If different and confident, update companies.ts
 * 6. Git commit with descriptive message
 *
 * Priority: XBRL > LLM (XBRL is deterministic, LLM can hallucinate)
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// SEC EDGAR utilities
import {
  searchFilingDocuments,
  TICKER_TO_CIK,
} from '../sec/sec-edgar';

// LLM extractor for parsing SEC filings (8-K text)
import {
  extractHoldingsFromText,
  validateExtraction,
  createLLMConfigFromEnv,
  type LLMProvider,
} from '../sec/llm-extractor';

// XBRL extractor for structured data (10-K/10-Q)
import {
  extractXBRLData,
  compareExtractions,
  formatXBRLSummary,
  type XBRLExtractionResult,
} from '../sec/xbrl-extractor';

// Monitoring & alerting
import {
  startExtractionRun,
  getCurrentRunStats,
  recordXbrlAttempt,
  recordLlmAttempt,
  recordLlmSkipped,
  recordResult,
  alertLlmConfigMissing,
  alertRunSummary,
  type ExtractionRunStats,
} from '../monitoring/alerts';

// Extraction accuracy tracking
import { recordExtractionComparison } from '../verification/extraction-accuracy';

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
  // New: extraction method used
  extractionMethod?: 'xbrl' | 'llm' | 'hybrid';
  xbrlResult?: XBRLExtractionResult;
}

export interface SecUpdateConfig {
  tickers?: string[];           // Specific tickers to check (default: all with CIKs)
  sinceDays?: number;           // How far back to look (default: 7)
  dryRun?: boolean;             // Don't actually update files or commit
  autoCommit?: boolean;         // Commit changes automatically (default: true)
  minConfidence?: number;       // Minimum confidence to accept (default: 0.7)
  maxChangePct?: number;        // Max % change to auto-accept (default: 50)
  // New: extraction mode
  extractionMode?: 'xbrl_only' | 'llm_only' | 'hybrid';  // default: hybrid
  skipXbrl?: boolean;           // Skip XBRL extraction (use LLM only)
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

// Filing types that should be processed by LLM extraction
// 8-K: Material events (US companies)
// 40-F: Annual reports (Canadian companies - no XBRL)
// 6-K: Interim reports (Foreign private issuers - no XBRL)
// 20-F: Annual reports (Foreign private issuers - no XBRL)
const LLM_ELIGIBLE_FILING_TYPES = ['8-K', '40-F', '6-K', '20-F'];

interface FilingForLLM {
  accessionNumber: string;
  filingDate: string;
  formType: string;
  items?: string[];
  documentUrl?: string;
  content?: string;
}

/**
 * Find recent 8-K filings for a company (legacy - use findRecentFilingsForLLM)
 */
async function findRecent8KFilings(
  ticker: string,
  cik: string,
  asset: string,
  sinceDays: number
): Promise<Array<FilingForLLM>> {
  return findRecentFilingsForLLM(ticker, cik, asset, sinceDays, ['8-K']);
}

/**
 * Find recent filings eligible for LLM extraction
 * Handles 8-K (US), 40-F (Canadian annual), 6-K (foreign interim), 20-F (foreign annual)
 */
async function findRecentFilingsForLLM(
  ticker: string,
  cik: string,
  asset: string,
  sinceDays: number,
  formTypes: string[] = LLM_ELIGIBLE_FILING_TYPES
): Promise<Array<FilingForLLM>> {
  const data = await fetchSECSubmissions(cik);
  if (!data?.filings?.recent) return [];

  const recent = data.filings.recent;
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - sinceDays);
  const sinceDateStr = sinceDate.toISOString().split('T')[0];

  const filings: Array<FilingForLLM> = [];

  const count = Math.min(recent.form.length, 50);
  for (let i = 0; i < count; i++) {
    const formType = recent.form[i];
    const filingDate = recent.filingDate[i];

    // Check if this is a filing type we want and within date range
    if (!formTypes.includes(formType) || filingDate < sinceDateStr) continue;

    const accessionNumber = recent.accessionNumber[i];
    
    // Parse 8-K item codes (e.g., "7.01,8.01" -> ["7.01", "8.01"])
    // Other form types don't have items
    const itemsStr = recent.items?.[i] || '';
    const items = itemsStr ? itemsStr.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

    // Search for crypto content in the filing (with caching)
    const result = await searchFilingDocuments(ticker, cik, accessionNumber, asset, {
      formType,
      filedDate: filingDate,
    });

    if (result) {
      filings.push({
        accessionNumber,
        filingDate,
        formType,
        items,
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
  dryRun: boolean,
  source: string = 'sec-filing'
): { success: boolean; previousHoldings?: number } {
  const filePath = path.join(process.cwd(), COMPANIES_FILE);
  const content = fs.readFileSync(filePath, 'utf-8');

  // Find the company entry by ticker
  const tickerPattern = new RegExp(
    `(ticker:\\s*["']${ticker}["'][\\s\\S]*?)(holdings:\\s*)([\\d_,]+)(\\s*,)([\\s\\S]*?)(holdingsLastUpdated:\\s*["'])([^"']+)(["'])([\\s\\S]*?)(holdingsSource:\\s*["'])([^"']+)(["'])([\\s\\S]*?)(holdingsSourceUrl:\\s*["'])([^"']+)(["'])`,
    'i'
  );

  const match = content.match(tickerPattern);
  if (!match) {
    const simplePattern = new RegExp(
      `(ticker:\\s*["']${ticker}["'][\\s\\S]*?)(holdings:\\s*)([\\d_,]+)`,
      'i'
    );
    const simpleMatch = content.match(simplePattern);

    if (!simpleMatch) {
      return { success: false };
    }

    const previousHoldings = parseInt(simpleMatch[3].replace(/[_,]/g, ''));

    if (dryRun) {
      console.log(`[DRY RUN] Would update ${ticker}: ${previousHoldings} → ${newHoldings}`);
      return { success: true, previousHoldings };
    }

    const newContent = content.replace(
      simplePattern,
      `$1$2${newHoldings.toLocaleString().replace(/,/g, '_')}`
    );

    fs.writeFileSync(filePath, newContent);
    return { success: true, previousHoldings };
  }

  const previousHoldings = parseInt(match[3].replace(/[_,]/g, ''));

  if (dryRun) {
    console.log(`[DRY RUN] Would update ${ticker}:`);
    console.log(`  holdings: ${previousHoldings} → ${newHoldings}`);
    console.log(`  holdingsLastUpdated: ${match[7]} → ${filingDate}`);
    console.log(`  holdingsSource: ${match[11]} → ${source}`);
    console.log(`  holdingsSourceUrl: ${match[15]} → ${filingUrl}`);
    return { success: true, previousHoldings };
  }

  const formattedHoldings = newHoldings.toLocaleString().replace(/,/g, '_');
  const newContent = content.replace(
    tickerPattern,
    `$1$2${formattedHoldings}$4$5$6${filingDate}$8$9$10${source}$12$13$14${filingUrl}$16`
  );

  fs.writeFileSync(filePath, newContent);
  return { success: true, previousHoldings };
}

/**
 * Commit changes to git
 */
function gitCommit(
  ticker: string,
  previousHoldings: number,
  newHoldings: number,
  filingDate: string,
  extractionMethod: 'xbrl' | 'llm' | 'hybrid' = 'llm'
): boolean {
  try {
    const methodLabel = extractionMethod === 'xbrl' ? 'XBRL' : extractionMethod === 'hybrid' ? 'XBRL+LLM' : 'LLM';
    const message = `Update ${ticker} holdings from SEC filing (${methodLabel})

Holdings: ${previousHoldings.toLocaleString()} → ${newHoldings.toLocaleString()}
Filing date: ${filingDate}
Extraction method: ${methodLabel}
Source: SEC EDGAR

Auto-updated by SEC adapter.

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
 * Process a single company using hybrid XBRL + LLM approach
 */
async function processCompanyHybrid(
  ticker: string,
  asset: string,
  currentHoldings: number,
  config: SecUpdateConfig
): Promise<SecUpdateResult> {
  const cik = TICKER_TO_CIK[ticker.toUpperCase()];
  if (!cik) {
    return { ticker, success: false, error: 'No CIK mapping found' };
  }

  console.log(`[SEC Update] Checking ${ticker}...`);

  let xbrlResult: XBRLExtractionResult | undefined;
  let llmHoldings: number | null = null;
  let llmConfidence: number = 0;
  let llmReasoning: string | undefined;
  let llmFiling: FilingForLLM | undefined;

  try {
    // STEP 1: Try XBRL extraction (deterministic)
    if (config.extractionMode !== 'llm_only' && !config.skipXbrl) {
      console.log(`[SEC Update] ${ticker}: Trying XBRL extraction...`);
      xbrlResult = await extractXBRLData(ticker);

      if (xbrlResult.success && xbrlResult.bitcoinHoldings !== undefined) {
        console.log(formatXBRLSummary(xbrlResult));
        recordXbrlAttempt(true);
      } else if (!xbrlResult.success) {
        console.log(`[SEC Update] ${ticker}: XBRL extraction failed - ${xbrlResult.error}`);
        recordXbrlAttempt(false, `${ticker}: ${xbrlResult.error}`);
      } else {
        console.log(`[SEC Update] ${ticker}: No crypto holdings found in XBRL data`);
        recordXbrlAttempt(true);  // Successful extraction, just no holdings data
      }
    }

    // STEP 2: Try LLM extraction from filings (8-K, 40-F, 6-K, 20-F)
    // For US companies: 8-K material events
    // For foreign filers: 40-F (annual), 6-K (interim), 20-F (annual)
    if (config.extractionMode !== 'xbrl_only') {
      const llmConfig = createLLMConfigFromEnv();

      if (llmConfig) {
        console.log(`[SEC Update] ${ticker}: Checking for recent filings (8-K/40-F/6-K/20-F)...`);
        const filings = await findRecentFilingsForLLM(ticker, cik, asset, config.sinceDays || 7);

        if (filings.length > 0) {
          llmFiling = filings[0];

          if (llmFiling.content) {
            try {
              const extraction = await extractHoldingsFromText(
                llmFiling.content,
                {
                  companyName: ticker,
                  ticker,
                  asset,
                  currentHoldings,
                  formType: llmFiling.formType,
                  itemCodes: llmFiling.items,
                },
                llmConfig
              );

              if (extraction.holdings !== null) {
                llmHoldings = extraction.holdings;
                llmConfidence = extraction.confidence;
                llmReasoning = extraction.reasoning;
                console.log(`[SEC Update] ${ticker}: LLM extracted ${llmHoldings} (${(llmConfidence * 100).toFixed(0)}% confidence)`);
                recordLlmAttempt(true);
              } else {
                recordLlmAttempt(false, `${ticker}: No holdings found in text`);
              }
            } catch (llmError) {
              const errMsg = llmError instanceof Error ? llmError.message : String(llmError);
              console.error(`[SEC Update] ${ticker}: LLM extraction failed - ${errMsg}`);
              recordLlmAttempt(false, `${ticker}: ${errMsg}`);
            }
          }
        } else {
          console.log(`[SEC Update] ${ticker}: No recent filings (8-K/40-F/6-K/20-F) with crypto content`);
        }
      } else {
        // LLM config missing - alert (once per process)
        const provider = process.env.MONITORING_LLM_PROVIDER || 'anthropic';
        recordLlmSkipped(`Missing ${provider} API key`);
        await alertLlmConfigMissing(provider);
      }
    }

    // STEP 3: Decide which value to use
    let finalHoldings: number | null = null;
    let extractionMethod: 'xbrl' | 'llm' | 'hybrid' = 'llm';
    let finalConfidence: number = 0;
    let finalReasoning: string = '';
    let finalFilingDate: string | undefined;
    let finalFilingUrl: string | undefined;
    let source: string = 'sec-filing';

    // Case 1: XBRL has Bitcoin holdings
    if (xbrlResult?.success && xbrlResult.bitcoinHoldings !== undefined) {
      if (llmHoldings !== null) {
        const comparison = compareExtractions(xbrlResult, llmHoldings);

        // Record the comparison for accuracy tracking (when values differ)
        if (!comparison.match && llmFiling) {
          try {
            await recordExtractionComparison({
              ticker,
              accessionNumber: llmFiling.accessionNumber || xbrlResult.accessionNumber || '',
              filedDate: llmFiling.filingDate || xbrlResult.filingDate || new Date().toISOString().split('T')[0],
              xbrlValue: xbrlResult.bitcoinHoldings,
              llmValue: llmHoldings,
            });
            console.log(`[SEC Update] ${ticker}: Recorded XBRL/LLM discrepancy for accuracy tracking`);
          } catch (err) {
            // Don't fail the extraction if accuracy tracking fails
            console.error(`[SEC Update] ${ticker}: Failed to record comparison:`, err);
          }
        }

        if (comparison.match) {
          finalHoldings = xbrlResult.bitcoinHoldings;
          extractionMethod = 'hybrid';
          finalConfidence = 1.0;
          finalReasoning = `XBRL and LLM agree (within ${comparison.discrepancyPct?.toFixed(1)}%)`;
        } else if (comparison.recommendation === 'use_xbrl') {
          finalHoldings = xbrlResult.bitcoinHoldings;
          extractionMethod = 'xbrl';
          finalConfidence = 1.0;
          finalReasoning = `Using XBRL (LLM discrepancy: ${comparison.discrepancyPct?.toFixed(1)}%)`;
        } else {
          return {
            ticker,
            success: true,
            previousHoldings: currentHoldings,
            newHoldings: xbrlResult.bitcoinHoldings,
            confidence: 0.5,
            reasoning: `XBRL/LLM discrepancy ${comparison.discrepancyPct?.toFixed(1)}% - needs manual review`,
            extractionMethod: 'hybrid',
            xbrlResult,
          };
        }
      } else {
        finalHoldings = xbrlResult.bitcoinHoldings;
        extractionMethod = 'xbrl';
        finalConfidence = 1.0;
        finalReasoning = 'Extracted from XBRL (structured data)';
      }

      finalFilingDate = xbrlResult.bitcoinHoldingsDate;
      finalFilingUrl = xbrlResult.secUrl;
      source = 'sec-xbrl';
    }
    // Case 2: Only LLM available
    else if (llmHoldings !== null) {
      finalHoldings = llmHoldings;
      extractionMethod = 'llm';
      finalConfidence = llmConfidence;
      finalReasoning = llmReasoning || 'Extracted from 8-K text via LLM';
      finalFilingDate = llmFiling?.filingDate;
      finalFilingUrl = llmFiling?.documentUrl;
      source = 'sec-filing';
    }
    // Case 3: Neither available
    else {
      return {
        ticker,
        success: true,
        reasoning: 'No holdings data found in XBRL or recent 8-K filings',
        extractionMethod: 'hybrid',
        xbrlResult,
      };
    }

    // STEP 4: Validate and apply update
    if (extractionMethod === 'llm') {
      const minConfidence = config.minConfidence || 0.7;
      if (finalConfidence < minConfidence) {
        return {
          ticker,
          success: true,
          newHoldings: finalHoldings,
          confidence: finalConfidence,
          reasoning: `Confidence ${(finalConfidence * 100).toFixed(0)}% below threshold`,
          filingDate: finalFilingDate,
          filingUrl: finalFilingUrl,
          extractionMethod,
          xbrlResult,
        };
      }
    }

    const changePct = Math.abs((finalHoldings - currentHoldings) / currentHoldings) * 100;
    const maxChangePct = config.maxChangePct || 50;
    if (changePct > maxChangePct) {
      return {
        ticker,
        success: true,
        previousHoldings: currentHoldings,
        newHoldings: finalHoldings,
        confidence: finalConfidence,
        reasoning: `Change of ${changePct.toFixed(1)}% exceeds threshold - requires manual review`,
        filingDate: finalFilingDate,
        filingUrl: finalFilingUrl,
        extractionMethod,
        xbrlResult,
      };
    }

    if (finalHoldings === currentHoldings) {
      return {
        ticker,
        success: true,
        previousHoldings: currentHoldings,
        newHoldings: finalHoldings,
        reasoning: 'Holdings unchanged',
        filingDate: finalFilingDate,
        filingUrl: finalFilingUrl,
        extractionMethod,
        xbrlResult,
      };
    }

    const updateResult = updateCompaniesFile(
      ticker,
      finalHoldings,
      finalFilingDate || new Date().toISOString().split('T')[0],
      finalFilingUrl || '',
      config.dryRun || false,
      source
    );

    if (!updateResult.success) {
      return {
        ticker,
        success: false,
        error: 'Failed to update companies.ts - ticker pattern not found',
        newHoldings: finalHoldings,
        extractionMethod,
        xbrlResult,
      };
    }

    let committed = false;
    if (!config.dryRun && config.autoCommit !== false) {
      committed = gitCommit(
        ticker,
        updateResult.previousHoldings || currentHoldings,
        finalHoldings,
        finalFilingDate || new Date().toISOString().split('T')[0],
        extractionMethod
      );
    }

    return {
      ticker,
      success: true,
      previousHoldings: updateResult.previousHoldings,
      newHoldings: finalHoldings,
      confidence: finalConfidence,
      reasoning: finalReasoning,
      filingDate: finalFilingDate,
      filingUrl: finalFilingUrl,
      committed,
      extractionMethod,
      xbrlResult,
    };

  } catch (error) {
    return {
      ticker,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      xbrlResult,
    };
  }
}

/**
 * Get company info from companies.ts
 */
function getCompanyInfo(ticker: string): { asset: string; holdings: number } | null {
  const filePath = path.join(process.cwd(), COMPANIES_FILE);
  const content = fs.readFileSync(filePath, 'utf-8');

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
export async function runSecAutoUpdate(config: SecUpdateConfig = {}): Promise<{
  results: SecUpdateResult[];
  stats: ExtractionRunStats;
}> {
  // Start monitoring
  const stats = startExtractionRun();
  const results: SecUpdateResult[] = [];

  let tickers = config.tickers;
  if (!tickers || tickers.length === 0) {
    tickers = Object.keys(TICKER_TO_CIK);
  }

  const modeLabel = config.extractionMode || 'hybrid';
  console.log(`[SEC Update] Checking ${tickers.length} companies (mode: ${modeLabel})...`);
  if (config.dryRun) {
    console.log('[SEC Update] DRY RUN - no changes will be made');
  }

  for (const ticker of tickers) {
    const companyInfo = getCompanyInfo(ticker);
    if (!companyInfo) {
      results.push({ ticker, success: false, error: 'Company not found in companies.ts' });
      recordResult('error', `${ticker}: Company not found in companies.ts`);
      continue;
    }

    const result = await processCompanyHybrid(ticker, companyInfo.asset, companyInfo.holdings, config);
    results.push(result);

    // Track result for monitoring
    if (result.error) {
      recordResult('error', `${ticker}: ${result.error}`);
      console.log(`[SEC Update] ${ticker}: Error - ${result.error}`);
    } else if (result.newHoldings !== undefined && result.newHoldings !== result.previousHoldings) {
      if (result.committed) {
        recordResult('updated');
      } else {
        recordResult('needsReview');
      }
      const method = result.extractionMethod || 'unknown';
      console.log(`[SEC Update] ${ticker}: ${result.previousHoldings?.toLocaleString()} → ${result.newHoldings.toLocaleString()} (${method})`);
    } else {
      recordResult('unchanged');
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  const updated = results.filter(r => r.newHoldings !== undefined && r.newHoldings !== r.previousHoldings);
  const xbrlUpdates = updated.filter(r => r.extractionMethod === 'xbrl' || r.extractionMethod === 'hybrid');
  const llmUpdates = updated.filter(r => r.extractionMethod === 'llm');
  const errors = results.filter(r => r.error);

  console.log(`\n[SEC Update] Complete:`);
  console.log(`  - Updated: ${updated.length} (${xbrlUpdates.length} XBRL, ${llmUpdates.length} LLM)`);
  console.log(`  - Errors: ${errors.length}`);
  console.log(`  - Unchanged: ${results.length - updated.length - errors.length}`);

  // Send monitoring summary (alerts if issues)
  await alertRunSummary(stats, {
    alertOnLlmSkip: true,
    alertOnErrors: true,
    alertOnSuccess: false,  // Only alert when there are issues
  });

  return { results, stats };
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

  return processCompanyHybrid(ticker, companyInfo.asset, companyInfo.holdings, config);
}

/**
 * Extract XBRL data only (no LLM, no file updates)
 */
export async function extractXBRLOnly(ticker: string): Promise<XBRLExtractionResult> {
  return extractXBRLData(ticker);
}

/**
 * Run XBRL extraction for multiple tickers
 */
export async function runXBRLScan(tickers?: string[]): Promise<{
  results: Map<string, XBRLExtractionResult>;
  summary: { total: number; withBitcoin: number; withShares: number; withDebt: number; failed: number };
}> {
  const tickerList = tickers || Object.keys(TICKER_TO_CIK);
  const results = new Map<string, XBRLExtractionResult>();

  console.log(`[XBRL Scan] Scanning ${tickerList.length} companies...`);

  let withBitcoin = 0, withShares = 0, withDebt = 0, failed = 0;

  for (const ticker of tickerList) {
    const result = await extractXBRLData(ticker);
    results.set(ticker, result);

    if (!result.success) failed++;
    else {
      if (result.bitcoinHoldings !== undefined) withBitcoin++;
      if (result.sharesOutstanding !== undefined) withShares++;
      if (result.totalDebt !== undefined) withDebt++;
    }

    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n[XBRL Scan] Complete: ${withBitcoin} with Bitcoin, ${withShares} with shares, ${failed} failed`);

  return { results, summary: { total: tickerList.length, withBitcoin, withShares, withDebt, failed } };
}
