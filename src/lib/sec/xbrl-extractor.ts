/**
 * XBRL Data Extractor
 *
 * Extracts structured financial data from SEC EDGAR XBRL API.
 * This provides deterministic extraction (vs probabilistic LLM extraction).
 *
 * Use for:
 * - Quarterly holdings from 10-K/10-Q filings
 * - Shares outstanding
 * - Balance sheet items (debt, cash)
 *
 * The LLM extractor remains the fallback for 8-K filings which often
 * don't have XBRL attachments.
 *
 * NOTE: This module shares XBRL extraction logic with src/lib/fetchers/sec-xbrl.ts
 * - sec-xbrl.ts is used by the comparison/verification engine (returns FetchResult[])
 * - This module is used by the SEC auto-update system (returns XBRLExtractionResult)
 * Both use CIK mappings from sec-edgar.ts
 */

import { TICKER_TO_CIK } from './sec-edgar';
import { getCompanySource } from './company-sources';
import { fetchWithRateLimit } from './rate-limiter';
import { detectDilutiveInstruments, DilutionDetectionResult } from '../data/dilutive-instruments';

import { SEC_DATA_BASE_URL, SEC_USER_AGENT, padCik10 } from './sec-shared';

// SEC EDGAR API base URL
const SEC_API_BASE = SEC_DATA_BASE_URL;

// User agent required by SEC
const USER_AGENT = SEC_USER_AGENT;

// Default XBRL concepts for crypto holdings
// Used when company doesn't have custom concepts configured
const DEFAULT_BITCOIN_CONCEPTS = [
  // Standard / modern US-GAAP crypto concepts
  // (Observed in SEC companyfacts for MSTR)
  'us-gaap:CryptoAssetFairValue',
  'us-gaap:CryptoAssetFairValueNoncurrent',
  'us-gaap:CryptoAssetFairValueCurrent',
  'us-gaap:CryptoAssetNumberOfUnits',

  // Older / alternate concepts seen across filers
  'us-gaap:CryptoAssetHeld',
  'us-gaap:DigitalAssets',
  'us-gaap:CryptocurrencyHeldAtFairValue',
  'us-gaap:BitcoinHeld',
  'us-gaap:DigitalAssetsFairValue',

  // Generic fallbacks (check any namespace)
  'CryptoAsset',
  'DigitalAsset',
  'Bitcoin',
  'BitcoinHoldings',
];

/**
 * Get XBRL concepts for a company's crypto holdings
 * Uses company-specific concepts if configured, otherwise defaults
 */
function getBitcoinConcepts(ticker: string): string[] {
  const source = getCompanySource(ticker);
  if (source?.xbrlConcepts?.holdings && source.xbrlConcepts.holdings.length > 0) {
    // Combine company-specific with defaults (company-specific first for priority)
    return [...source.xbrlConcepts.holdings, ...DEFAULT_BITCOIN_CONCEPTS];
  }
  return DEFAULT_BITCOIN_CONCEPTS;
}

// Keep legacy constant for backwards compatibility
const BITCOIN_CONCEPTS = DEFAULT_BITCOIN_CONCEPTS;

const SHARES_CONCEPTS = [
  'dei:EntityCommonStockSharesOutstanding',
  'us-gaap:CommonStockSharesOutstanding',
  'us-gaap:WeightedAverageNumberOfSharesOutstandingBasic',
  'us-gaap:WeightedAverageNumberOfDilutedSharesOutstanding',
];

// Specific concepts for basic vs diluted share detection (weighted average for EPS)
const BASIC_SHARES_CONCEPTS = [
  'us-gaap:WeightedAverageNumberOfSharesOutstandingBasic',
  'dei:EntityCommonStockSharesOutstanding',
  'us-gaap:CommonStockSharesOutstanding',
];

const DILUTED_SHARES_CONCEPTS = [
  'us-gaap:WeightedAverageNumberOfDilutedSharesOutstanding',
];

// Point-in-time shares for mNAV calculation (balance sheet / cover page)
const POINT_IN_TIME_SHARES_CONCEPTS = [
  'us-gaap:CommonStockSharesOutstanding',      // Balance sheet
  'dei:EntityCommonStockSharesOutstanding',    // Cover page
];

const DEBT_CONCEPTS = [
  'us-gaap:LongTermDebt',
  'us-gaap:DebtCurrent',
  'us-gaap:TotalDebt',
  'us-gaap:NotesPayable',
  'us-gaap:ConvertibleNotesPayable',
];

const CASH_CONCEPTS = [
  'us-gaap:CashAndCashEquivalentsAtCarryingValue',
  'us-gaap:Cash',
  'us-gaap:CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents',
];

export interface XBRLExtractionResult {
  ticker: string;
  cik: string;
  success: boolean;

  // Holdings data
  bitcoinHoldings?: number;        // In USD (fair value)
  bitcoinHoldingsUnit?: string;    // 'USD' or 'BTC'
  bitcoinHoldingsDate?: string;    // YYYY-MM-DD
  bitcoinHoldingsSource?: string;  // Filing accession number

  // Shares data
  sharesOutstanding?: number;
  sharesOutstandingDate?: string;
  sharesSource?: string;

  // Balance sheet
  totalDebt?: number;
  debtDate?: string;
  cashAndEquivalents?: number;
  cashDate?: string;

  // Metadata
  filingType?: string;             // 10-K, 10-Q
  filingDate?: string;
  accessionNumber?: string;
  secUrl?: string;

  // Error info
  error?: string;

  // Raw data for debugging
  rawConcepts?: {
    cryptoCandidates?: Array<{ namespace: string; concept: string; units: string[] }>;
  };
}

interface SECCompanyFacts {
  cik: number;
  entityName: string;
  facts: {
    dei?: Record<string, FactData>;
    'us-gaap'?: Record<string, FactData>;
    [namespace: string]: Record<string, FactData> | undefined;
  };
}

interface FactData {
  label: string;
  description: string;
  units: {
    [unit: string]: FactValue[];
  };
}

interface FactValue {
  val: number | string;
  accn: string;
  fy: number;
  fp: string;
  form: string;
  filed: string;
  end: string;
  start?: string;
}

/**
 * Fetch company facts from SEC EDGAR XBRL API
 */
async function fetchCompanyFacts(cik: string): Promise<SECCompanyFacts | null> {
  try {
    // Pad CIK to 10 digits
    const paddedCik = padCik10(cik);
    const url = `${SEC_API_BASE}/api/xbrl/companyfacts/CIK${paddedCik}.json`;

    const response = await fetchWithRateLimit(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Company doesn't have XBRL data
      }
      throw new Error(`SEC API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`[XBRL] Error fetching company facts for CIK ${cik}:`, error);
    return null;
  }
}

/**
 * Find the most recent value for a concept
 */
function findMostRecentValue(
  facts: SECCompanyFacts['facts'],
  conceptNames: string[],
  preferredForms: string[] = ['10-K', '10-Q']
): { value: number; date: string; form: string; accn: string } | null {
  let bestMatch: { value: number; date: string; form: string; accn: string; filed: string } | null = null;

  for (const conceptName of conceptNames) {
    // Parse namespace and concept
    const [namespace, concept] = conceptName.includes(':')
      ? conceptName.split(':')
      : ['us-gaap', conceptName];

    const namespaceFacts = facts[namespace];
    if (!namespaceFacts) continue;

    const factData = namespaceFacts[concept];
    if (!factData?.units) continue;

    // Check common units
    // - USD: monetary values
    // - shares: share counts
    // - pure: ratios / generic
    // - BTC: crypto quantity (some filers)
    const units = factData.units['USD'] || factData.units['BTC'] || factData.units['shares'] || factData.units['pure'];
    if (!units || units.length === 0) continue;

    // Sort by period end date descending (primary), then filed date (secondary)
    // This ensures we get the current period, not comparative periods from the same filing
    const sorted = [...units].sort((a, b) => {
      const endCompare = new Date(b.end).getTime() - new Date(a.end).getTime();
      if (endCompare !== 0) return endCompare;
      return new Date(b.filed).getTime() - new Date(a.filed).getTime();
    });

    // Find the most recent value from a preferred form
    for (const entry of sorted) {
      const isPreferredForm = preferredForms.some(f => entry.form.startsWith(f));

      if (typeof entry.val !== 'number') continue;

      // If this is better than what we have, use it
      if (!bestMatch ||
          (isPreferredForm && new Date(entry.end) > new Date(bestMatch.date))) {
        bestMatch = {
          value: entry.val,
          date: entry.end,
          form: entry.form,
          accn: entry.accn,
          filed: entry.filed,
        };

        // If we found a preferred form, stop searching
        if (isPreferredForm) break;
      }
    }

    // If we found something in a preferred form, stop checking other concepts
    if (bestMatch && preferredForms.some(f => bestMatch!.form.startsWith(f))) {
      break;
    }
  }

  return bestMatch ? {
    value: bestMatch.value,
    date: bestMatch.date,
    form: bestMatch.form,
    accn: bestMatch.accn,
  } : null;
}

/**
 * Search for Bitcoin/crypto holdings in XBRL data
 *
 * This checks multiple possible concept names since companies
 * use different XBRL tags for their crypto holdings.
 */
function extractBitcoinHoldings(
  facts: SECCompanyFacts['facts'],
  ticker: string
): { value: number; date: string; form: string; accn: string } | null {
  // Get company-configured XBRL concepts (includes defaults)
  const configuredConcepts = getBitcoinConcepts(ticker);
  
  // Also try dynamic ticker-based concepts as fallback
  const tickerLower = ticker.toLowerCase();
  const dynamicConcepts = [
    `${tickerLower}:Bitcoin`,
    `${tickerLower}:BitcoinHoldings`,
    `${tickerLower}:DigitalAssets`,
    `${tickerLower}:CryptoAssets`,
  ];

  // Combine all (configured first for priority)
  const allConcepts = [...configuredConcepts, ...dynamicConcepts];
  
  // Deduplicate
  const uniqueConcepts = [...new Set(allConcepts)];

  return findMostRecentValue(facts, uniqueConcepts);
}

/**
 * Extract all available financial data from XBRL
 */
export async function extractXBRLData(ticker: string): Promise<XBRLExtractionResult> {
  const cik = TICKER_TO_CIK[ticker.toUpperCase()];

  if (!cik) {
    return {
      ticker,
      cik: '',
      success: false,
      error: `No CIK mapping found for ticker ${ticker}`,
    };
  }

  const facts = await fetchCompanyFacts(cik);

  if (!facts) {
    return {
      ticker,
      cik,
      success: false,
      error: 'No XBRL data available from SEC EDGAR',
    };
  }

  const result: XBRLExtractionResult = {
    ticker,
    cik,
    success: true,
  };

  // Debug: capture any concepts that look like crypto holdings so we can map them.
  // Keep this lightweight: store names + available unit keys only.
  try {
    const candidates: Array<{ namespace: string; concept: string; units: string[] }> = [];
    const namespaces = Object.keys(facts.facts || {});

    for (const ns of namespaces) {
      const nsFacts = facts.facts[ns];
      if (!nsFacts) continue;

      for (const concept of Object.keys(nsFacts)) {
        const hay = `${ns}:${concept}`.toLowerCase();
        if (!/(crypto|digitalasset|digitalassets|bitcoin|cryptocurrency)/.test(hay)) continue;

        const factData = (nsFacts as any)[concept];
        const units = factData?.units ? Object.keys(factData.units) : [];
        candidates.push({ namespace: ns, concept, units });
      }
    }

    result.rawConcepts = { cryptoCandidates: candidates.slice(0, 200) };
  } catch {
    // ignore
  }

  // Extract Bitcoin holdings
  const btcData = extractBitcoinHoldings(facts.facts, ticker);
  if (btcData) {
    result.bitcoinHoldings = btcData.value;
    // NOTE: findMostRecentValue prefers USD when present, but will fall back to BTC units if a filer uses that.
    result.bitcoinHoldingsUnit = 'USD';
    result.bitcoinHoldingsDate = btcData.date;
    result.bitcoinHoldingsSource = btcData.accn;
    result.filingType = btcData.form;
    result.accessionNumber = btcData.accn;
  }

  // Extract shares outstanding
  const sharesData = findMostRecentValue(facts.facts, SHARES_CONCEPTS);
  if (sharesData) {
    result.sharesOutstanding = sharesData.value;
    result.sharesOutstandingDate = sharesData.date;
    result.sharesSource = sharesData.accn;
  }

  // Extract debt
  const debtData = findMostRecentValue(facts.facts, DEBT_CONCEPTS);
  if (debtData) {
    result.totalDebt = debtData.value;
    result.debtDate = debtData.date;
  }

  // Extract cash
  const cashData = findMostRecentValue(facts.facts, CASH_CONCEPTS);
  if (cashData) {
    result.cashAndEquivalents = cashData.value;
    result.cashDate = cashData.date;
  }

  // Build SEC URL
  if (result.accessionNumber) {
    const accnFormatted = result.accessionNumber.replace(/-/g, '');
    const cikNum = cik.replace(/^0+/, '');
    result.secUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cikNum}&type=10&dateb=&owner=include&count=40`;
  }

  return result;
}

/**
 * Extract XBRL data for multiple tickers
 */
export async function extractXBRLDataBatch(
  tickers: string[],
  delayMs: number = 200
): Promise<Map<string, XBRLExtractionResult>> {
  const results = new Map<string, XBRLExtractionResult>();

  for (const ticker of tickers) {
    const result = await extractXBRLData(ticker);
    results.set(ticker, result);

    // Rate limit to respect SEC's 10 requests/second guideline
    await new Promise(r => setTimeout(r, delayMs));
  }

  return results;
}

/**
 * Compare XBRL extraction with LLM extraction
 * Returns discrepancies that need manual review
 */
export function compareExtractions(
  xbrlResult: XBRLExtractionResult,
  llmHoldings: number | null,
  tolerancePct: number = 5
): {
  match: boolean;
  xbrlValue: number | undefined;
  llmValue: number | null;
  discrepancyPct: number | null;
  recommendation: 'use_xbrl' | 'use_llm' | 'manual_review';
} {
  const xbrlValue = xbrlResult.bitcoinHoldings;

  // If XBRL has no value, use LLM
  if (xbrlValue === undefined) {
    return {
      match: false,
      xbrlValue: undefined,
      llmValue: llmHoldings,
      discrepancyPct: null,
      recommendation: llmHoldings !== null ? 'use_llm' : 'manual_review',
    };
  }

  // If LLM has no value, use XBRL
  if (llmHoldings === null) {
    return {
      match: false,
      xbrlValue,
      llmValue: null,
      discrepancyPct: null,
      recommendation: 'use_xbrl',
    };
  }

  // Compare values
  const discrepancyPct = Math.abs((llmHoldings - xbrlValue) / xbrlValue) * 100;
  const match = discrepancyPct <= tolerancePct;

  return {
    match,
    xbrlValue,
    llmValue: llmHoldings,
    discrepancyPct,
    // XBRL is deterministic, so prefer it when available
    // Only flag for review if discrepancy is large
    recommendation: match ? 'use_xbrl' : (discrepancyPct > 20 ? 'manual_review' : 'use_xbrl'),
  };
}

/**
 * Share count extraction result with both basic and diluted
 */
export interface ShareCountsResult {
  ticker: string;
  cik: string;
  success: boolean;
  basicShares: number | null;
  dilutedShares: number | null;
  asOfDate: string | null;
  filingType: string | null;
  accessionNumber: string | null;
  secUrl: string | null;
  error?: string;
}

/**
 * Extract both basic and diluted share counts from SEC XBRL data.
 *
 * This enables dilution detection by comparing the two values.
 * Any non-zero delta indicates dilutive instruments exist.
 *
 * @param ticker - Company ticker symbol
 * @returns Share counts result with both basic and diluted values
 */
export async function extractShareCounts(ticker: string): Promise<ShareCountsResult> {
  const cik = TICKER_TO_CIK[ticker.toUpperCase()];

  if (!cik) {
    return {
      ticker,
      cik: '',
      success: false,
      basicShares: null,
      dilutedShares: null,
      asOfDate: null,
      filingType: null,
      accessionNumber: null,
      secUrl: null,
      error: `No CIK mapping found for ticker ${ticker}`,
    };
  }

  const facts = await fetchCompanyFacts(cik);

  if (!facts) {
    return {
      ticker,
      cik,
      success: false,
      basicShares: null,
      dilutedShares: null,
      asOfDate: null,
      filingType: null,
      accessionNumber: null,
      secUrl: null,
      error: 'No XBRL data available from SEC EDGAR',
    };
  }

  // Extract basic shares
  const basicData = findMostRecentValue(facts.facts, BASIC_SHARES_CONCEPTS);

  // Extract diluted shares
  const dilutedData = findMostRecentValue(facts.facts, DILUTED_SHARES_CONCEPTS);

  // Use the most recent date from either source
  const asOfDate = basicData?.date || dilutedData?.date || null;
  const filingType = basicData?.form || dilutedData?.form || null;
  const accessionNumber = basicData?.accn || dilutedData?.accn || null;

  // Build SEC URL
  let secUrl: string | null = null;
  if (accessionNumber) {
    const cikNum = cik.replace(/^0+/, '');
    secUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cikNum}&type=10&dateb=&owner=include&count=40`;
  }

  return {
    ticker,
    cik,
    success: basicData !== null || dilutedData !== null,
    basicShares: basicData?.value ?? null,
    dilutedShares: dilutedData?.value ?? null,
    asOfDate,
    filingType,
    accessionNumber,
    secUrl,
  };
}

/**
 * Extract share counts for multiple tickers
 */
export async function extractShareCountsBatch(
  tickers: string[],
  delayMs: number = 200
): Promise<Map<string, ShareCountsResult>> {
  const results = new Map<string, ShareCountsResult>();

  for (const ticker of tickers) {
    const result = await extractShareCounts(ticker);
    results.set(ticker, result);

    // Rate limit to respect SEC's 10 requests/second guideline
    await new Promise(r => setTimeout(r, delayMs));
  }

  return results;
}

/**
 * Point-in-time shares result for mNAV calculation
 */
export interface PointInTimeSharesResult {
  ticker: string;
  cik: string;
  success: boolean;
  sharesOutstanding: number | null;
  asOfDate: string | null;
  filingType: string | null;
  accessionNumber: string | null;
  secUrl: string | null;
  concept: string | null;  // Which XBRL concept was used
  isWeightedAverageFallback: boolean;  // True if we fell back to weighted avg
  error?: string;
}

/**
 * Extract point-in-time shares outstanding for mNAV calculation.
 *
 * Uses balance sheet / cover page concepts (CommonStockSharesOutstanding)
 * rather than weighted average concepts used for EPS calculation.
 *
 * This gives the actual share count at period end, not averaged over the period.
 *
 * @param ticker - Company ticker symbol
 * @returns Point-in-time shares result
 */
export async function extractPointInTimeShares(ticker: string): Promise<PointInTimeSharesResult> {
  const cik = TICKER_TO_CIK[ticker.toUpperCase()];

  if (!cik) {
    return {
      ticker,
      cik: '',
      success: false,
      sharesOutstanding: null,
      asOfDate: null,
      filingType: null,
      accessionNumber: null,
      secUrl: null,
      concept: null,
      isWeightedAverageFallback: false,
      error: `No CIK mapping found for ticker ${ticker}`,
    };
  }

  const facts = await fetchCompanyFacts(cik);

  if (!facts) {
    return {
      ticker,
      cik,
      success: false,
      sharesOutstanding: null,
      asOfDate: null,
      filingType: null,
      accessionNumber: null,
      secUrl: null,
      concept: null,
      isWeightedAverageFallback: false,
      error: 'No XBRL data available from SEC EDGAR',
    };
  }

  const cikNum = cik.replace(/^0+/, '');
  const secUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cikNum}&type=10&dateb=&owner=include&count=40`;

  // Try each point-in-time concept in order of preference
  for (const conceptName of POINT_IN_TIME_SHARES_CONCEPTS) {
    const data = findMostRecentValue(facts.facts, [conceptName]);
    if (data && data.value > 0) {
      return {
        ticker,
        cik,
        success: true,
        sharesOutstanding: data.value,
        asOfDate: data.date,
        filingType: data.form,
        accessionNumber: data.accn,
        secUrl,
        concept: conceptName,
        isWeightedAverageFallback: false,
      };
    }
  }

  // Fallback to weighted average basic shares if no point-in-time available
  // This is less accurate for companies with significant share issuances during the period
  const weightedData = findMostRecentValue(facts.facts, BASIC_SHARES_CONCEPTS);
  if (weightedData && weightedData.value > 0) {
    return {
      ticker,
      cik,
      success: true,
      sharesOutstanding: weightedData.value,
      asOfDate: weightedData.date,
      filingType: weightedData.form,
      accessionNumber: weightedData.accn,
      secUrl,
      concept: 'us-gaap:WeightedAverageNumberOfSharesOutstandingBasic',
      isWeightedAverageFallback: true,  // Flag that this is a fallback
    };
  }

  return {
    ticker,
    cik,
    success: false,
    sharesOutstanding: null,
    asOfDate: null,
    filingType: null,
    accessionNumber: null,
    secUrl: null,
    concept: null,
    isWeightedAverageFallback: false,
    error: 'No share data found in XBRL',
  };
}

/**
 * Extract point-in-time shares for multiple tickers
 */
export async function extractPointInTimeSharesBatch(
  tickers: string[],
  delayMs: number = 200
): Promise<Map<string, PointInTimeSharesResult>> {
  const results = new Map<string, PointInTimeSharesResult>();

  for (const ticker of tickers) {
    const result = await extractPointInTimeShares(ticker);
    results.set(ticker, result);

    // Rate limit
    await new Promise(r => setTimeout(r, delayMs));
  }

  return results;
}

/**
 * Detect dilutive instruments for a company by extracting share counts from SEC XBRL.
 *
 * This is the Phase 1 approach: flag any non-zero difference between
 * diluted and basic share counts as having dilutive instruments.
 *
 * @param ticker - Company ticker symbol
 * @returns Dilution detection result
 */
export async function detectDilutionFromSEC(ticker: string): Promise<DilutionDetectionResult> {
  const shareCounts = await extractShareCounts(ticker);

  return detectDilutiveInstruments(
    shareCounts.basicShares,
    shareCounts.dilutedShares,
    ticker,
    shareCounts.asOfDate,
    shareCounts.filingType,
    shareCounts.secUrl
  );
}

/**
 * Detect dilution for multiple tickers
 */
export async function detectDilutionFromSECBatch(
  tickers: string[],
  delayMs: number = 200
): Promise<Map<string, DilutionDetectionResult>> {
  const results = new Map<string, DilutionDetectionResult>();

  for (const ticker of tickers) {
    const result = await detectDilutionFromSEC(ticker);
    results.set(ticker, result);

    // Rate limit
    await new Promise(r => setTimeout(r, delayMs));
  }

  return results;
}

/**
 * Get a formatted summary of XBRL extraction for logging
 */
export function formatXBRLSummary(result: XBRLExtractionResult): string {
  if (!result.success) {
    return `[XBRL] ${result.ticker}: Failed - ${result.error}`;
  }

  const parts = [`[XBRL] ${result.ticker}:`];

  if (result.bitcoinHoldings !== undefined) {
    parts.push(`BTC Holdings: $${(result.bitcoinHoldings / 1e6).toFixed(1)}M (${result.bitcoinHoldingsDate})`);
  }

  if (result.sharesOutstanding !== undefined) {
    parts.push(`Shares: ${(result.sharesOutstanding / 1e6).toFixed(1)}M`);
  }

  if (result.totalDebt !== undefined) {
    parts.push(`Debt: $${(result.totalDebt / 1e6).toFixed(1)}M`);
  }

  if (result.cashAndEquivalents !== undefined) {
    parts.push(`Cash: $${(result.cashAndEquivalents / 1e6).toFixed(1)}M`);
  }

  if (result.filingType) {
    parts.push(`Source: ${result.filingType}`);
  }

  return parts.join(' | ');
}
