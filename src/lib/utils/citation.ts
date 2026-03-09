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
