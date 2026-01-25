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

// SEC EDGAR API base URL
const SEC_API_BASE = 'https://data.sec.gov';

// User agent required by SEC
const USER_AGENT = 'DAT-Tracker/1.0 (https://dattracker.com; admin@dattracker.com)';

// Common XBRL concepts for crypto holdings
// Companies use different concepts - we check all of them
const BITCOIN_CONCEPTS = [
  'us-gaap:CryptoAssetHeld',
  'us-gaap:DigitalAssets',
  'us-gaap:CryptocurrencyHeldAtFairValue',
  'us-gaap:BitcoinHeld',
  // Company-specific extensions (CLSK uses these)
  'clsk:Bitcoin',
  'clsk:BitcoinHoldings',
  // MARA uses these
  'mara:DigitalAssets',
  'mara:BitcoinHoldings',
  // RIOT uses these
  'riot:DigitalAssets',
  // Generic fallbacks
  'CryptoAsset',
  'DigitalAsset',
  'Bitcoin',
];

const SHARES_CONCEPTS = [
  'dei:EntityCommonStockSharesOutstanding',
  'us-gaap:CommonStockSharesOutstanding',
  'us-gaap:WeightedAverageNumberOfSharesOutstandingBasic',
  'us-gaap:WeightedAverageNumberOfDilutedSharesOutstanding',
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
  rawConcepts?: Record<string, any>;
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
    const paddedCik = cik.replace(/^0+/, '').padStart(10, '0');
    const url = `${SEC_API_BASE}/api/xbrl/companyfacts/CIK${paddedCik}.json`;

    const response = await fetch(url, {
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

    // Check USD units first, then pure (for share counts)
    const units = factData.units['USD'] || factData.units['shares'] || factData.units['pure'];
    if (!units || units.length === 0) continue;

    // Sort by filed date descending to get most recent
    const sorted = [...units].sort((a, b) =>
      new Date(b.filed).getTime() - new Date(a.filed).getTime()
    );

    // Find the most recent value from a preferred form
    for (const entry of sorted) {
      const isPreferredForm = preferredForms.some(f => entry.form.startsWith(f));

      if (typeof entry.val !== 'number') continue;

      // If this is better than what we have, use it
      if (!bestMatch ||
          (isPreferredForm && new Date(entry.filed) > new Date(bestMatch.filed))) {
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
  // Add company-specific concepts to the search
  const tickerLower = ticker.toLowerCase();
  const companySpecificConcepts = [
    `${tickerLower}:Bitcoin`,
    `${tickerLower}:BitcoinHoldings`,
    `${tickerLower}:DigitalAssets`,
    `${tickerLower}:CryptoAssets`,
  ];

  const allConcepts = [...companySpecificConcepts, ...BITCOIN_CONCEPTS];

  return findMostRecentValue(facts, allConcepts);
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

  // Extract Bitcoin holdings
  const btcData = extractBitcoinHoldings(facts.facts, ticker);
  if (btcData) {
    result.bitcoinHoldings = btcData.value;
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
