/**
 * Extract a short search snippet from a quote for deep-linking into filing viewer.
 * Shared by: ingestion pipeline, citation popover, quote verification.
 *
 * Prefers formatted numbers with commas (most unique in SEC filings),
 * falls back to first ~50 chars trimmed to word boundary.
 */
export function extractSearchSnippet(quote: string): string {
  // Prefer formatted numbers with commas (most unique in SEC filings)
  const numberMatch = quote.match(/[\d,]+\.\d+|[\d]{1,3}(?:,\d{3})+/);
  if (numberMatch) return numberMatch[0];
  // Fall back to first ~50 chars, trimmed to word boundary
  const trimmed = quote.slice(0, 60);
  const lastSpace = trimmed.lastIndexOf(' ');
  return lastSpace > 30 ? trimmed.slice(0, lastSpace) : trimmed;
}

/**
 * Format a number with commas for citation_search_term.
 * e.g. 331200000 → "331,200,000"
 */
function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  // For decimals, preserve up to 2 decimal places
  if (!Number.isInteger(value)) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  return value.toLocaleString('en-US');
}

/**
 * Metric label for human-readable citations.
 */
const METRIC_LABELS: Record<string, string> = {
  cash_usd: 'Cash and cash equivalents',
  restricted_cash_usd: 'Restricted cash',
  debt_usd: 'Total long-term debt',
  preferred_equity_usd: 'Preferred stock / equity',
  other_investments_usd: 'Other investments',
  basic_shares: 'Shares outstanding',
  bitcoin_holdings_usd: 'Digital assets (USD)',
  holdings_native: 'Digital asset holdings (native units)',
};

/**
 * Generate a citation_quote for an XBRL-sourced datapoint.
 *
 * Format: "XBRL {form} ({as_of}): {concept} = {formatted_value}. Accession: {accn}."
 */
export function generateXbrlCitation(params: {
  metric: string;
  value: number;
  unit: string;
  xbrlConcept: string | null;
  asOf: string | null;
  form?: string | null;
  accession?: string | null;
}): { citation_quote: string; citation_search_term: string } {
  const label = METRIC_LABELS[params.metric] || params.metric;
  const formattedValue = formatNumber(params.value);
  const unitSuffix = params.unit === 'USD' ? ' USD' : params.unit === 'shares' ? ' shares' : ` ${params.unit}`;

  const parts: string[] = ['XBRL'];
  if (params.form) parts.push(params.form);
  if (params.asOf) parts.push(`(${params.asOf})`);

  const conceptStr = params.xbrlConcept ? ` [${params.xbrlConcept}]` : '';
  const accessionStr = params.accession ? ` Accession: ${params.accession}.` : '';

  const quote = `${parts.join(' ')}: ${label} = ${formattedValue}${unitSuffix}.${conceptStr}${accessionStr}`;

  return {
    citation_quote: quote,
    citation_search_term: formattedValue,
  };
}

/**
 * Generate a citation_quote for an SEC filing text extraction (LLM or regex).
 */
export function generateSecFilingCitation(params: {
  metric: string;
  value: number;
  unit: string;
  filingType?: string | null;
  asOf?: string | null;
  accession?: string | null;
  extractionMethod?: string | null;
}): { citation_quote: string; citation_search_term: string } {
  const label = METRIC_LABELS[params.metric] || params.metric;
  const formattedValue = formatNumber(params.value);
  const unitSuffix = params.unit === 'USD' ? ' USD' : params.unit === 'shares' ? ' shares' : ` ${params.unit}`;

  const parts: string[] = [];
  if (params.filingType) parts.push(params.filingType);
  if (params.asOf) parts.push(`(${params.asOf})`);
  const prefix = parts.length ? parts.join(' ') : 'SEC filing';

  const methodStr = params.extractionMethod ? ` [${params.extractionMethod}]` : '';
  const accessionStr = params.accession ? ` Accession: ${params.accession}.` : '';

  const quote = `${prefix}: ${label} = ${formattedValue}${unitSuffix}.${methodStr}${accessionStr}`;

  return {
    citation_quote: quote,
    citation_search_term: formattedValue,
  };
}
