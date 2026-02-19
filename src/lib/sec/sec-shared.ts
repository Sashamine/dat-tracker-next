/**
 * Shared SEC utilities used across EDGAR/XBRL modules.
 *
 * Be conservative: keep these helpers small and behavior-preserving.
 */

export const SEC_USER_AGENT = 'DAT-Tracker/1.0 (https://dattracker.com; admin@dattracker.com)';

export const SEC_DATA_BASE_URL = 'https://data.sec.gov';

export const SEC_ARCHIVES_BASE_URL = 'https://www.sec.gov/Archives/edgar/data';

/**
 * Pad CIK to 10 digits (SEC XBRL companyfacts endpoint requires this).
 */
export function padCik10(cik: string): string {
  return cik.replace(/^0+/, '').padStart(10, '0');
}

/**
 * Strip leading zeros from CIK for archive/EDGAR browse URLs.
 */
export function cikNoLeadingZeros(cik: string): string {
  return cik.replace(/^0+/, '');
}

/**
 * Accession number without dashes (used in Archives URLs).
 */
export function accessionNoDashes(accessionNumber: string): string {
  return accessionNumber.replace(/-/g, '');
}

/**
 * Build a SEC company browse URL filtered by filing type.
 */
export function buildSecCompanyBrowseUrl(cik: string, type: string): string {
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cikNoLeadingZeros(cik)}&type=${type}`;
}

/**
 * Build a SEC Archives URL for a specific document within a filing.
 */
export function buildSecArchivesDocUrl(cik: string, accessionNumber: string, documentName: string): string {
  return `${SEC_ARCHIVES_BASE_URL}/${cikNoLeadingZeros(cik)}/${accessionNoDashes(accessionNumber)}/${documentName}`;
}

/**
 * Build the SEC filing index.json URL for a given accession.
 */
export function buildSecArchivesIndexUrl(cik: string, accessionNumber: string): string {
  return `${SEC_ARCHIVES_BASE_URL}/${cikNoLeadingZeros(cik)}/${accessionNoDashes(accessionNumber)}/index.json`;
}
