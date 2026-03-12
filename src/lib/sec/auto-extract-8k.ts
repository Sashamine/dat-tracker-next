/**
 * Auto-Extract Holdings from 8-K Filings
 *
 * Bridges the filing-check cron with the regex extractor.
 * When new Tier 1 8-K filings are detected, automatically:
 * 1. Fetch the filing HTML from SEC EDGAR
 * 2. Run regex extraction for the company's expected asset
 * 3. Return extraction results for Discord notification + D1 storage
 *
 * High-confidence results (≥0.8) are surfaced as proposals for human review.
 * Lower-confidence results are logged but not proposed.
 */

import { extractHoldingsRegex, getBestResult, type RegexExtractionResult } from './holdings-regex-extractor';
import { getCompanyByTicker } from '../data/companies';

const SEC_USER_AGENT = 'DAT-Tracker/1.0 (https://dattracker.com; admin@dattracker.com)';

// ============================================
// TYPES
// ============================================

export interface AutoExtractionResult {
  ticker: string;
  accessionNumber: string;
  formType: string;
  filedDate: string;

  // Extraction outcome
  extracted: boolean;
  holdings: number | null;
  transactionAmount: number | null;
  type: 'total' | 'purchase' | 'sale' | null;
  asset: string | null;
  asOfDate: string | null;
  costUsd: number | null;
  confidence: number;
  patternName: string | null;
  sharesOutstanding: number | null;

  // Current value for comparison
  currentHoldings: number | null;
  holdingsDelta: number | null;

  // Status
  error?: string;
}

// ============================================
// CORE EXTRACTION
// ============================================

/**
 * Fetch a filing's HTML from SEC EDGAR
 */
async function fetchFilingHtml(
  cik: string,
  accessionNumber: string,
  primaryDocument: string
): Promise<string | null> {
  const cikNum = cik.replace(/^0+/, '');
  const accClean = accessionNumber.replace(/-/g, '');
  const url = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accClean}/${primaryDocument}`;

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': SEC_USER_AGENT },
    });

    if (!resp.ok) {
      console.error(`[AutoExtract] Failed to fetch ${url}: ${resp.status}`);
      return null;
    }

    return await resp.text();
  } catch (error) {
    console.error(`[AutoExtract] Error fetching ${url}:`, error);
    return null;
  }
}

/**
 * Auto-extract holdings from a single 8-K filing
 */
export async function autoExtractFromFiling(params: {
  ticker: string;
  cik: string;
  accessionNumber: string;
  formType: string;
  filedDate: string;
  primaryDocument: string;
}): Promise<AutoExtractionResult> {
  const { ticker, cik, accessionNumber, formType, filedDate, primaryDocument } = params;

  const company = getCompanyByTicker(ticker);
  const expectedAsset = company?.asset || 'BTC';
  const currentHoldings = company?.holdings ?? null;

  // Fetch the filing HTML
  const html = await fetchFilingHtml(cik, accessionNumber, primaryDocument);
  if (!html) {
    return {
      ticker,
      accessionNumber,
      formType,
      filedDate,
      extracted: false,
      holdings: null,
      transactionAmount: null,
      type: null,
      asset: null,
      asOfDate: null,
      costUsd: null,
      confidence: 0,
      patternName: null,
      sharesOutstanding: null,
      currentHoldings,
      holdingsDelta: null,
      error: 'Failed to fetch filing HTML',
    };
  }

  // Run regex extraction
  const results = extractHoldingsRegex(html, expectedAsset);
  const best = getBestResult(results, expectedAsset);

  if (!best || best.confidence < 0.5) {
    return {
      ticker,
      accessionNumber,
      formType,
      filedDate,
      extracted: false,
      holdings: null,
      transactionAmount: null,
      type: null,
      asset: null,
      asOfDate: null,
      costUsd: null,
      confidence: best?.confidence ?? 0,
      patternName: best?.patternName ?? null,
      sharesOutstanding: null,
      currentHoldings,
      holdingsDelta: null,
    };
  }

  const holdings = best.holdings;
  const holdingsDelta = holdings != null && currentHoldings != null
    ? holdings - currentHoldings
    : null;

  return {
    ticker,
    accessionNumber,
    formType,
    filedDate,
    extracted: true,
    holdings,
    transactionAmount: best.transactionAmount,
    type: best.type,
    asset: best.asset,
    asOfDate: best.asOfDate,
    costUsd: best.costUsd,
    confidence: best.confidence,
    patternName: best.patternName,
    sharesOutstanding: best.sharesOutstanding,
    currentHoldings,
    holdingsDelta,
  };
}

/**
 * Auto-extract from multiple filings in batch
 * Respects SEC rate limits (300ms between requests)
 */
export async function autoExtractBatch(
  filings: Array<{
    ticker: string;
    cik: string;
    accessionNumber: string;
    formType: string;
    filedDate: string;
    primaryDocument: string;
  }>
): Promise<AutoExtractionResult[]> {
  const results: AutoExtractionResult[] = [];

  for (const filing of filings) {
    const result = await autoExtractFromFiling(filing);
    results.push(result);

    // Rate limit
    if (filings.indexOf(filing) < filings.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  return results;
}

// ============================================
// FORMATTING
// ============================================

/**
 * Format extraction results for Discord notification
 */
export function formatExtractionForDiscord(results: AutoExtractionResult[]): string {
  const extracted = results.filter(r => r.extracted);
  const failed = results.filter(r => !r.extracted && !r.error);
  const errors = results.filter(r => r.error);

  if (extracted.length === 0) {
    return '';
  }

  const lines: string[] = ['**Auto-Extracted Holdings:**'];

  for (const r of extracted) {
    const value = r.holdings ?? r.transactionAmount;
    const label = r.type === 'total' ? 'TOTAL' : r.type === 'purchase' ? 'BUY' : r.type === 'sale' ? 'SELL' : '?';
    const confPct = Math.round(r.confidence * 100);
    const confEmoji = r.confidence >= 0.8 ? '🟢' : r.confidence >= 0.6 ? '🟡' : '🔴';

    let line = `${confEmoji} **${r.ticker}** [${label}] ${value?.toLocaleString()} ${r.asset} (${confPct}% conf, \`${r.patternName}\`)`;

    if (r.holdingsDelta != null && r.holdingsDelta !== 0 && r.type === 'total') {
      const sign = r.holdingsDelta > 0 ? '+' : '';
      line += ` | Δ ${sign}${r.holdingsDelta.toLocaleString()}`;
    }

    if (r.asOfDate) {
      line += ` | as-of ${r.asOfDate}`;
    }

    if (r.costUsd) {
      line += ` | $${(r.costUsd / 1e6).toFixed(1)}M`;
    }

    lines.push(line);
  }

  if (failed.length > 0) {
    lines.push(`\n_${failed.length} filing(s) had no extractable holdings data_`);
  }

  return lines.join('\n');
}

/**
 * Check if any extraction result suggests a data update is needed
 */
export function getProposedUpdates(results: AutoExtractionResult[]): AutoExtractionResult[] {
  return results.filter(r =>
    r.extracted &&
    r.confidence >= 0.8 &&
    r.type === 'total' &&
    r.holdings != null &&
    r.holdingsDelta != null &&
    r.holdingsDelta !== 0
  );
}
