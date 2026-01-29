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

// ===========================================================================
// OPERATING CASH FLOW (BURN RATE) EXTRACTION
// ===========================================================================

/**
 * XBRL concepts for operating cash flow (burn rate calculation)
 * 
 * NetCashProvidedByUsedInOperatingActivities is the primary concept.
 * Negative values indicate cash burn; positive values indicate cash generation.
 */
const OPERATING_CASH_FLOW_CONCEPTS = [
  'NetCashProvidedByUsedInOperatingActivities',
  'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations',
  'CashFlowsFromUsedInOperatingActivities',  // IFRS variant
];

// ===========================================================================
// BURN QUALITY METRICS EXTRACTION
// ===========================================================================

/**
 * XBRL concepts for burn quality analysis
 * These metrics help determine if operating cash flow is a reliable burn proxy
 */

const SGA_CONCEPTS = [
  'SellingGeneralAndAdministrativeExpense',
  'GeneralAndAdministrativeExpense',
  'SellingAndMarketingExpense',
  'OperatingExpenses',  // Fallback if SG&A not available
];

const STOCK_BASED_COMP_CONCEPTS = [
  'ShareBasedCompensation',
  'StockIssuedDuringPeriodValueShareBasedCompensation',
  'SharebasedCompensationArrangementBySharebasedPaymentAwardCompensationCost1',
  'AllocatedShareBasedCompensationExpense',
];

const DEPRECIATION_CONCEPTS = [
  'DepreciationDepletionAndAmortization',
  'Depreciation',
  'DepreciationAndAmortization',
  'DepreciationAmortizationAndAccretionNet',
];

const NET_INCOME_CONCEPTS = [
  'NetIncomeLoss',
  'ProfitLoss',  // IFRS variant
  'NetIncomeLossAttributableToParent',
  'NetIncomeLossAvailableToCommonStockholdersBasic',
];

/**
 * Result from fetching burn quality metrics
 */
export interface BurnQualityMetrics {
  // Primary burn metrics
  operatingCashFlow: number | null;    // From cash flow statement
  netIncome: number | null;            // From income statement
  
  // Non-cash adjustments
  stockBasedComp: number | null;       // Non-cash comp expense
  depreciation: number | null;         // D&A (big for miners)
  
  // Alternative burn proxy
  sgaExpenses: number | null;          // G&A expenses (good for miners)
  
  // Period metadata
  periodEnd: string;
  periodMonths: number;
  form: string;
  filed: string;
}

/**
 * Extract a single financial metric from XBRL data
 * Returns the most recent value from valid forms
 */
function extractFinancialMetric(
  facts: XBRLCompanyFacts['facts'],
  concepts: string[],
  unitType: 'USD' | 'shares' = 'USD'
): { value: number; periodEnd: string; form: string; filed: string } | null {
  for (const concept of concepts) {
    const factData = facts['us-gaap']?.[concept];
    if (!factData?.units?.[unitType]) continue;

    const entries = factData.units[unitType];
    const validEntries = entries.filter(e => ALL_VALID_FORMS.includes(e.form));
    if (validEntries.length === 0) continue;

    // Sort by period end date descending, then by filed date descending
    const sorted = validEntries.sort((a, b) => {
      const dateCompare = b.end.localeCompare(a.end);
      if (dateCompare !== 0) return dateCompare;
      return b.filed.localeCompare(a.filed);
    });

    const latest = sorted[0];
    return {
      value: latest.val,
      periodEnd: latest.end,
      form: latest.form,
      filed: latest.filed,
    };
  }
  return null;
}

/**
 * Extract all burn quality metrics from XBRL data
 */
export function extractBurnQualityMetrics(
  facts: XBRLCompanyFacts['facts']
): BurnQualityMetrics | null {
  // Get operating cash flow first (our primary reference)
  const ocfResult = extractOperatingCashFlow(facts);
  if (!ocfResult) return null;

  // Extract other metrics
  const sgaResult = extractFinancialMetric(facts, SGA_CONCEPTS);
  const sbcResult = extractFinancialMetric(facts, STOCK_BASED_COMP_CONCEPTS);
  const depResult = extractFinancialMetric(facts, DEPRECIATION_CONCEPTS);
  const niResult = extractFinancialMetric(facts, NET_INCOME_CONCEPTS);

  return {
    operatingCashFlow: ocfResult.value,
    netIncome: niResult?.value ?? null,
    stockBasedComp: sbcResult?.value ?? null,
    depreciation: depResult?.value ?? null,
    sgaExpenses: sgaResult?.value ?? null,
    periodEnd: ocfResult.periodEnd,
    periodMonths: ocfResult.periodMonths,
    form: ocfResult.form,
    filed: ocfResult.filed,
  };
}

/**
 * Fetch burn quality metrics for a single company
 */
export async function fetchBurnQualityMetrics(ticker: string): Promise<BurnQualityMetrics | null> {
  const cik = TICKER_TO_CIK[ticker.toUpperCase()];
  if (!cik) return null;

  const data = await fetchCompanyFacts(cik);
  if (!data?.facts) return null;

  return extractBurnQualityMetrics(data.facts);
}

/**
 * Fetch burn quality metrics for multiple companies
 */
export async function fetchAllBurnQualityMetrics(tickers: string[]): Promise<Array<{
  ticker: string;
  metrics: BurnQualityMetrics | null;
  error?: string;
}>> {
  const results: Array<{
    ticker: string;
    metrics: BurnQualityMetrics | null;
    error?: string;
  }> = [];

  for (const ticker of tickers) {
    try {
      const metrics = await fetchBurnQualityMetrics(ticker);
      results.push({ ticker, metrics });
      
      // Rate limit - SEC requires polite access
      await new Promise(r => setTimeout(r, 200));
    } catch (error) {
      results.push({
        ticker,
        metrics: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Filing period types for burn rate calculation
 */
export type FilingPeriodType = 
  | 'quarterly'      // 10-Q: ~3 months (US domestic)
  | 'semi-annual'    // 6-K: ~6 months (FPI interim)
  | 'annual'         // 10-K/20-F: 12 months
  | 'unknown';

/**
 * Operating cash flow result with period metadata
 */
export interface OperatingCashFlowResult {
  value: number;              // Total operating cash flow for the period (negative = burn)
  periodStart: string;        // YYYY-MM-DD
  periodEnd: string;          // YYYY-MM-DD
  periodMonths: number;       // Approximate months in period
  periodType: FilingPeriodType;
  quarterlyBurn: number;      // Normalized to quarterly rate (positive = burn, negative = generation)
  form: string;               // 10-Q, 10-K, 6-K, 20-F
  filed: string;              // Filing date
}

/**
 * Calculate the number of months between two dates
 */
function monthsBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  // Add 1 because periods are inclusive
  return Math.max(1, months + 1);
}

/**
 * Determine period type from form type and duration
 */
function determinePeriodType(form: string, months: number): FilingPeriodType {
  const formUpper = form.toUpperCase().replace('/A', '');
  
  if (formUpper === '10-Q') return 'quarterly';
  if (formUpper === '10-K') return 'annual';
  if (formUpper === '20-F') return 'annual';
  if (formUpper === '6-K') {
    // 6-K can be quarterly or semi-annual depending on the FPI
    return months <= 4 ? 'quarterly' : 'semi-annual';
  }
  
  // Fallback based on duration
  if (months <= 4) return 'quarterly';
  if (months <= 7) return 'semi-annual';
  if (months <= 13) return 'annual';
  return 'unknown';
}

/**
 * Extract operating cash flow from XBRL data
 * 
 * Returns the most recent operating cash flow with quarterly burn rate calculation.
 * Handles different periodicities:
 * - 10-Q: Quarterly (divide by 1 to get quarterly)
 * - 6-K: Semi-annual (divide by 2 to get quarterly)
 * - 10-K/20-F: Annual (divide by 4 to get quarterly)
 */
export function extractOperatingCashFlow(
  facts: XBRLCompanyFacts['facts']
): OperatingCashFlowResult | null {
  // Try each concept in order
  for (const concept of OPERATING_CASH_FLOW_CONCEPTS) {
    const factData = facts['us-gaap']?.[concept];
    if (!factData?.units?.USD) continue;

    const entries = factData.units.USD;
    
    // Filter to valid filing forms
    const validEntries = entries.filter(e => ALL_VALID_FORMS.includes(e.form));
    if (validEntries.length === 0) continue;

    // Sort by period end date descending, then by filed date descending
    const sorted = validEntries.sort((a, b) => {
      const dateCompare = b.end.localeCompare(a.end);
      if (dateCompare !== 0) return dateCompare;
      return b.filed.localeCompare(a.filed);
    });

    // Get the most recent entry
    const latest = sorted[0];
    
    // Calculate period start (XBRL uses 'start' field for duration concepts)
    // If not available, estimate based on form type
    let periodStart: string;
    const periodEnd = latest.end;
    
    // Look for entries with explicit start date in the raw data
    // XBRL duration concepts have start dates
    const entryWithStart = sorted.find((e: XBRLEntry & { start?: string }) => 
      e.end === periodEnd && e.form === latest.form && e.start
    ) as (XBRLEntry & { start?: string }) | undefined;
    
    if (entryWithStart?.start) {
      periodStart = entryWithStart.start;
    } else {
      // Estimate based on form type
      const form = latest.form.toUpperCase().replace('/A', '');
      const endDate = new Date(periodEnd);
      if (form === '10-Q') {
        // Quarterly: ~3 months before
        endDate.setMonth(endDate.getMonth() - 3);
        endDate.setDate(endDate.getDate() + 1);
      } else if (form === '6-K') {
        // Could be 3 or 6 months - default to 6
        endDate.setMonth(endDate.getMonth() - 6);
        endDate.setDate(endDate.getDate() + 1);
      } else {
        // Annual: 12 months before
        endDate.setFullYear(endDate.getFullYear() - 1);
        endDate.setDate(endDate.getDate() + 1);
      }
      periodStart = endDate.toISOString().split('T')[0];
    }
    
    const periodMonths = monthsBetween(periodStart, periodEnd);
    const periodType = determinePeriodType(latest.form, periodMonths);
    
    // Calculate quarterly burn rate
    // Operating cash flow is negative when burning cash, positive when generating
    // quarterlyBurn is positive when burning (inverted for intuitive reading)
    const cashFlow = latest.val;
    const quarterlyDivisor = periodMonths / 3;
    const quarterlyBurn = -cashFlow / quarterlyDivisor;  // Negate so burn is positive
    
    return {
      value: cashFlow,
      periodStart,
      periodEnd,
      periodMonths,
      periodType,
      quarterlyBurn: Math.round(quarterlyBurn),
      form: latest.form,
      filed: latest.filed,
    };
  }
  
  return null;
}

/**
 * Fetch operating cash flow (burn rate) for a single company
 * 
 * Returns the quarterly burn rate normalized from the filing period.
 * Use this to update company.quarterlyBurnUsd, burnSource, burnSourceUrl, burnAsOf
 */
export async function fetchOperatingCashFlow(ticker: string): Promise<{
  quarterlyBurn: number;
  periodType: FilingPeriodType;
  periodEnd: string;
  form: string;
  sourceUrl: string;
} | null> {
  const cik = TICKER_TO_CIK[ticker.toUpperCase()];
  if (!cik) return null;

  const data = await fetchCompanyFacts(cik);
  if (!data?.facts) return null;

  const result = extractOperatingCashFlow(data.facts);
  if (!result) return null;

  return {
    quarterlyBurn: result.quarterlyBurn,
    periodType: result.periodType,
    periodEnd: result.periodEnd,
    form: result.form,
    sourceUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=${result.form}`,
  };
}

/**
 * Fetch burn rates for multiple companies
 * Returns array of results with company ticker and burn data
 */
export async function fetchBurnRates(tickers: string[]): Promise<Array<{
  ticker: string;
  quarterlyBurn: number | null;
  periodType: FilingPeriodType | null;
  periodEnd: string | null;
  form: string | null;
  sourceUrl: string | null;
  error?: string;
}>> {
  const results: Array<{
    ticker: string;
    quarterlyBurn: number | null;
    periodType: FilingPeriodType | null;
    periodEnd: string | null;
    form: string | null;
    sourceUrl: string | null;
    error?: string;
  }> = [];

  for (const ticker of tickers) {
    try {
      const burnData = await fetchOperatingCashFlow(ticker);
      
      if (burnData) {
        results.push({
          ticker,
          quarterlyBurn: burnData.quarterlyBurn,
          periodType: burnData.periodType,
          periodEnd: burnData.periodEnd,
          form: burnData.form,
          sourceUrl: burnData.sourceUrl,
        });
      } else {
        results.push({
          ticker,
          quarterlyBurn: null,
          periodType: null,
          periodEnd: null,
          form: null,
          sourceUrl: null,
          error: 'No operating cash flow data found',
        });
      }

      // Rate limit - SEC requires polite access
      await new Promise(r => setTimeout(r, 200));
    } catch (error) {
      results.push({
        ticker,
        quarterlyBurn: null,
        periodType: null,
        periodEnd: null,
        form: null,
        sourceUrl: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

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
