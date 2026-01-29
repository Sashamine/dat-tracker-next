/**
 * SEC XBRL Fetcher
 *
 * Fetches financial data from SEC EDGAR XBRL API including:
 * - Balance sheet items (debt, cash, preferred equity)
 * - Shares outstanding
 * - Bitcoin/crypto holdings (via company-specific XBRL concepts)
 *
 * API endpoint: https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json
 *
 * Note: Data is from most recent 10-Q/10-K filing, which may be 1-3 months old.
 * For more current data, use official dashboards (strategy.com) or aggregators (mNAV).
 */

import { FetchResult, Fetcher, FetchField } from './types';
import { TICKER_TO_CIK } from '../sec/sec-edgar';

// Company-specific XBRL concepts for Bitcoin/crypto holdings
// Companies use different extension namespaces for their crypto assets
const BITCOIN_XBRL_CONCEPTS: Record<string, string[]> = {
  // Standard US-GAAP concepts (if any company uses them)
  '_default': [
    'CryptoAssetHeld',
    'DigitalAssets',
    'CryptocurrencyHeldAtFairValue',
    'BitcoinHeld',
  ],
  // Company-specific extensions
  'CLSK': ['clsk:Bitcoin', 'clsk:BitcoinHoldings', 'clsk:DigitalAssets'],
  'MARA': ['mara:DigitalAssets', 'mara:BitcoinHoldings', 'mara:Bitcoin'],
  'RIOT': ['riot:DigitalAssets', 'riot:Bitcoin'],
  'MSTR': ['mstr:DigitalAssets', 'mstr:Bitcoin'],
  'CORZ': ['corz:DigitalAssets', 'corz:Bitcoin'],
  'BTDR': ['btdr:DigitalAssets', 'btdr:Bitcoin'],
};

interface XBRLEntry {
  val: number;
  end: string;  // Period end date
  form: string; // 10-K, 10-Q, etc.
  filed: string;
  fy?: number;
  fp?: string;
}

interface XBRLUnits {
  USD?: XBRLEntry[];
  shares?: XBRLEntry[];
}

interface XBRLFact {
  units: XBRLUnits;
}

interface XBRLCompanyFacts {
  entityName: string;
  cik: string;
  facts: {
    'us-gaap'?: Record<string, XBRLFact>;
    'dei'?: Record<string, XBRLFact>;
    // Allow company-specific namespaces (e.g., 'clsk', 'mara', 'riot')
    [namespace: string]: Record<string, XBRLFact> | undefined;
  };
}

// XBRL field mappings to our comparison fields
const XBRL_FIELD_MAPPINGS: Record<FetchField, { gaapFields: string[]; deiFields?: string[] }> = {
  holdings: {
    // Holdings use company-specific extension namespaces
    // We'll handle this separately with BITCOIN_XBRL_CONCEPTS
    gaapFields: [
      'CryptoAssetHeld',
      'DigitalAssets',
      'CryptocurrencyHeldAtFairValue',
      'BitcoinHeld',
      'DigitalAssetsFairValue',
    ],
  },
  shares_outstanding: {
    gaapFields: ['CommonStockSharesOutstanding'],
    deiFields: ['EntityCommonStockSharesOutstanding'],
  },
  debt: {
    gaapFields: [
      'LongTermDebt',
      'LongTermDebtNoncurrent',
      'DebtCurrent',
      'ConvertibleLongTermNotesPayable',
    ],
  },
  cash: {
    gaapFields: [
      'CashAndCashEquivalentsAtCarryingValue',
      'Cash',
      'CashCashEquivalentsAndShortTermInvestments',
    ],
  },
  preferred_equity: {
    gaapFields: [
      'TemporaryEquityCarryingAmountAttributableToParent', // MSTR's STRK/STRF
      'PreferredStockValue',
      'RedeemablePreferredStockCarryingAmount',
    ],
  },
  mnav: {
    // mNAV is calculated, not in SEC filings
    gaapFields: [],
  },
};

async function fetchCompanyFacts(cik: string): Promise<XBRLCompanyFacts | null> {
  try {
    const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DAT-Tracker research@dattracker.com',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`[SEC XBRL] ${cik}: HTTP ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`[SEC XBRL] Error fetching ${cik}:`, error);
    return null;
  }
}

// Valid SEC filing forms for data extraction
// US domestic: 10-K (annual), 10-Q (quarterly)
// FPI (Foreign Private Issuer): 20-F (annual), 6-K (current/semi-annual)
const US_FILING_FORMS = ['10-K', '10-Q', '10-K/A', '10-Q/A'];
const FPI_FILING_FORMS = ['20-F', '20-F/A', '6-K'];
const ALL_VALID_FORMS = [...US_FILING_FORMS, ...FPI_FILING_FORMS];

/**
 * Detect if a company is an FPI based on their filing forms
 */
function detectFilingType(facts: XBRLCompanyFacts['facts']): 'US' | 'FPI' | 'unknown' {
  // Check a common field to see what forms are used
  const cashFact = facts['us-gaap']?.CashAndCashEquivalentsAtCarryingValue;
  if (!cashFact?.units?.USD) return 'unknown';
  
  const forms = new Set(cashFact.units.USD.map(e => e.form));
  
  const hasFPI = FPI_FILING_FORMS.some(f => forms.has(f));
  const hasUS = US_FILING_FORMS.some(f => forms.has(f));
  
  if (hasFPI && !hasUS) return 'FPI';
  if (hasUS && !hasFPI) return 'US';
  return 'unknown';
}

/**
 * Get the most recent value for a field from XBRL data
 * Supports both US domestic (10-Q/10-K) and FPI (20-F/6-K) filings
 */
function getMostRecentValue(
  facts: XBRLCompanyFacts['facts'],
  fieldName: string,
  namespace: 'us-gaap' | 'dei',
  unitType: 'USD' | 'shares'
): { value: number; date: string; form: string; filed: string } | null {
  const nsFacts = namespace === 'us-gaap' ? facts['us-gaap'] : facts['dei'];
  if (!nsFacts?.[fieldName]) return null;

  const entries = nsFacts[fieldName].units[unitType];
  if (!entries || entries.length === 0) return null;

  // Accept both US and FPI filing forms
  const validEntries = entries.filter(e => ALL_VALID_FORMS.includes(e.form));

  if (validEntries.length === 0) return null;

  // Sort by period end date descending, then by filed date descending
  const sorted = validEntries.sort((a, b) => {
    const dateCompare = b.end.localeCompare(a.end);
    if (dateCompare !== 0) return dateCompare;
    return b.filed.localeCompare(a.filed);
  });

  const latest = sorted[0];
  return {
    value: latest.val,
    date: latest.end,
    form: latest.form,
    filed: latest.filed,
  };
}

/**
 * Extract Bitcoin/crypto holdings from company-specific XBRL namespaces
 * Companies often use their own extension taxonomy for crypto assets
 * 
 * FPIs (like NA) tend to use standard us-gaap fields:
 * - CryptoAssetFairValueCurrent (fair value in USD)
 * - CryptoAssetCost (cost basis)
 * 
 * US companies often use custom extensions:
 * - mstr:Bitcoin, clsk:DigitalAssets, etc.
 */
function extractBitcoinHoldings(
  facts: XBRLCompanyFacts['facts'],
  ticker: string
): { value: number; date: string; form: string; filed: string } | null {
  // Get company-specific concepts to check
  const tickerUpper = ticker.toUpperCase();
  const tickerLower = ticker.toLowerCase();
  const companySpecificConcepts = BITCOIN_XBRL_CONCEPTS[tickerUpper] || [];
  const defaultConcepts = BITCOIN_XBRL_CONCEPTS['_default'];

  // Build list of namespace:concept pairs to check
  const conceptsToCheck: Array<{ namespace: string; concept: string }> = [];

  // FPI-friendly: Check standard us-gaap crypto fields FIRST
  // These are used by FPIs like NA that use standard taxonomy
  conceptsToCheck.push({ namespace: 'us-gaap', concept: 'CryptoAssetFairValueCurrent' });
  conceptsToCheck.push({ namespace: 'us-gaap', concept: 'CryptoAssetCost' });

  // Add company-specific concepts
  for (const conceptStr of companySpecificConcepts) {
    if (conceptStr.includes(':')) {
      const [ns, concept] = conceptStr.split(':');
      conceptsToCheck.push({ namespace: ns, concept });
    }
  }

  // Add dynamic company namespace guesses
  const dynamicNamespaces = [tickerLower, tickerUpper, `${tickerLower}-20`, ticker];
  for (const ns of dynamicNamespaces) {
    conceptsToCheck.push({ namespace: ns, concept: 'Bitcoin' });
    conceptsToCheck.push({ namespace: ns, concept: 'BitcoinHoldings' });
    conceptsToCheck.push({ namespace: ns, concept: 'DigitalAssets' });
    conceptsToCheck.push({ namespace: ns, concept: 'CryptoAssets' });
  }

  // Add us-gaap defaults
  for (const concept of defaultConcepts) {
    conceptsToCheck.push({ namespace: 'us-gaap', concept });
  }

  // Search all namespaces in the facts
  let bestMatch: { value: number; date: string; form: string; filed: string } | null = null;
  let bestDate = '';

  for (const { namespace, concept } of conceptsToCheck) {
    const nsFacts = facts[namespace];
    if (!nsFacts) continue;

    const factData = nsFacts[concept];
    if (!factData?.units?.USD) continue;

    const entries: XBRLEntry[] = factData.units.USD;
    // Accept both US and FPI forms
    const validEntries = entries.filter((e: XBRLEntry) => ALL_VALID_FORMS.includes(e.form));

    if (validEntries.length === 0) continue;

    // Sort by period end date descending
    const sorted = validEntries.sort((a: XBRLEntry, b: XBRLEntry) => b.end.localeCompare(a.end));
    const latest = sorted[0];

    // Keep the most recent value
    if (!bestMatch || latest.end > bestDate) {
      bestMatch = {
        value: latest.val as number,
        date: latest.end,
        form: latest.form,
        filed: latest.filed,
      };
      bestDate = latest.end;
    }
  }

  return bestMatch;
}

/**
 * Extract a comparison field value from XBRL data
 */
function extractFieldValue(
  facts: XBRLCompanyFacts['facts'],
  field: FetchField,
  ticker?: string
): { value: number; date: string; form: string; filed: string } | null {
  // Special handling for holdings - check company-specific namespaces
  if (field === 'holdings' && ticker) {
    const holdingsResult = extractBitcoinHoldings(facts, ticker);
    if (holdingsResult) {
      return holdingsResult;
    }
  }

  const mapping = XBRL_FIELD_MAPPINGS[field];

  // Try us-gaap fields first
  for (const gaapField of mapping.gaapFields) {
    const unitType = field === 'shares_outstanding' ? 'shares' : 'USD';
    const result = getMostRecentValue(facts, gaapField, 'us-gaap', unitType);
    if (result && result.value > 0) {
      return result;
    }
  }

  // Try dei fields if available
  if (mapping.deiFields) {
    for (const deiField of mapping.deiFields) {
      const unitType = field === 'shares_outstanding' ? 'shares' : 'USD';
      const result = getMostRecentValue(facts, deiField, 'dei', unitType);
      if (result && result.value > 0) {
        return result;
      }
    }
  }

  return null;
}

export const secXbrlFetcher: Fetcher = {
  name: 'SEC XBRL',

  async fetch(tickers: string[]): Promise<FetchResult[]> {
    const results: FetchResult[] = [];
    // Now includes 'holdings' - extracted from company-specific XBRL namespaces
    const fieldsToFetch: FetchField[] = ['holdings', 'shares_outstanding', 'debt', 'cash', 'preferred_equity'];

    for (const ticker of tickers) {
      const cik = TICKER_TO_CIK[ticker.toUpperCase()];
      if (!cik) {
        console.log(`[SEC XBRL] No CIK for ${ticker}, skipping`);
        continue;
      }

      console.log(`[SEC XBRL] Fetching ${ticker} (CIK ${cik})...`);
      const data = await fetchCompanyFacts(cik);

      if (!data?.facts) {
        console.log(`[SEC XBRL] No facts for ${ticker}`);
        continue;
      }

      const fetchedAt = new Date();

      for (const field of fieldsToFetch) {
        const extracted = extractFieldValue(data.facts, field, ticker);

        if (extracted) {
          results.push({
            ticker,
            field,
            value: extracted.value,
            source: {
              name: `SEC ${extracted.form}`,
              url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=${extracted.form}`,
              date: extracted.date,  // Period end date
            },
            fetchedAt,
            raw: {
              filedDate: extracted.filed,
              form: extracted.form,
              periodEnd: extracted.date,
            },
          });
        }
      }

      // Rate limit - SEC requires polite access (max 10 req/sec)
      await new Promise(r => setTimeout(r, 200));
    }

    console.log(`[SEC XBRL] Got ${results.length} data points`);
    return results;
  }
};

/**
 * Get list of tickers this fetcher supports (from sec-edgar.ts)
 */
export function getSupportedTickers(): string[] {
  return Object.keys(TICKER_TO_CIK);
}

/**
 * Detect if a company is a Foreign Private Issuer based on XBRL filing types
 * Returns 'FPI' for 20-F/6-K filers, 'US' for 10-Q/10-K filers
 */
export async function detectCompanyFilingType(ticker: string): Promise<'US' | 'FPI' | 'unknown'> {
  const cik = TICKER_TO_CIK[ticker.toUpperCase()];
  if (!cik) return 'unknown';

  const data = await fetchCompanyFacts(cik);
  if (!data?.facts) return 'unknown';

  return detectFilingType(data.facts);
}

/**
 * Fetch Bitcoin holdings for a single ticker (convenience function)
 * Returns holdings in USD or null if not found
 */
export async function fetchBitcoinHoldings(ticker: string): Promise<{
  holdings: number;
  date: string;
  form: string;
  sourceUrl: string;
} | null> {
  const cik = TICKER_TO_CIK[ticker.toUpperCase()];
  if (!cik) return null;

  const data = await fetchCompanyFacts(cik);
  if (!data?.facts) return null;

  const result = extractBitcoinHoldings(data.facts, ticker);
  if (!result) return null;

  return {
    holdings: result.value,
    date: result.date,
    form: result.form,
    sourceUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=${result.form}`,
  };
}
