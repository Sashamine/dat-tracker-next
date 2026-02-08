/**
 * SEC Filings Configuration
 * 
 * Central config for SEC filing URLs. Change SEC_BASE_URL when
 * switching from r2.dev to custom domain (sec.datcap.io).
 */

// =============================================================================
// CHANGE THIS when custom domain is ready:
// export const SEC_BASE_URL = 'https://sec.datcap.io';
// =============================================================================
export const SEC_BASE_URL = 'https://pub-1e4356c7aea34102aad6e3493b0c62f1.r2.dev';

/**
 * Build a URL to an SEC filing
 * @param ticker - Company ticker (e.g., 'mstr')
 * @param type - Filing type (e.g., '8k', '10q', '10k')
 * @param filename - File name (e.g., '8k-2026-01-26.html')
 * @param anchor - Optional anchor (e.g., 'dat-btc-holdings')
 */
export function getSecFilingUrl(
  ticker: string,
  type: string,
  filename: string,
  anchor?: string
): string {
  const base = `${SEC_BASE_URL}/${ticker.toLowerCase()}/${type.toLowerCase()}/${filename}`;
  return anchor ? `${base}#${anchor}` : base;
}

/**
 * Build a citation URL with anchor
 * @param ticker - Company ticker
 * @param accessionNumber - SEC accession number (e.g., '0001193125-24-217227')
 * @param filingDate - Filing date (YYYY-MM-DD)
 * @param formType - Form type (e.g., '8-K', '10-Q')
 * @param anchor - Anchor ID (e.g., 'dat-btc-holdings')
 */
export function getCitationUrl(
  ticker: string,
  formType: string,
  filingDate: string,
  accessionNumber: string,
  anchor?: string
): string {
  // Convert form type to folder name
  const type = formType.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Build filename: form-date-accession.html
  const accessionSuffix = accessionNumber.replace(/-/g, '').slice(-6);
  const filename = `${formType.toLowerCase().replace(/\//g, '-')}-${filingDate}-${accessionSuffix}.html`;
  
  return getSecFilingUrl(ticker, type, filename, anchor);
}
