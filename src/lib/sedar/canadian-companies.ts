/**
 * Canadian Companies for SEDAR+ Monitoring
 * 
 * These companies file on SEDAR+ and need manual data extraction.
 * Profile numbers are used to check for new filings.
 */

export interface CanadianCompany {
  ticker: string;           // OTC/US ticker (what we use internally)
  localTicker: string;      // Canadian exchange ticker
  name: string;
  sedarProfileNumber: string;
  exchange: string;         // CSE, TSX-V, CBOE Canada
  asset: string;            // Primary crypto asset held
  fiscalYearEnd: string;    // Month name (e.g., "December")
  lastCheckedFiling?: string; // Last filing date we've processed (YYYY-MM-DD)
}

export const CANADIAN_COMPANIES: CanadianCompany[] = [
  {
    ticker: "BTCT.V",
    localTicker: "BTCT",
    name: "Bitcoin Well Inc.",
    sedarProfileNumber: "000044786",
    exchange: "TSX-V",
    asset: "BTC",
    fiscalYearEnd: "December",
  },
  {
    ticker: "IHLDF",
    localTicker: "HOLD",
    name: "Immutable Holdings Inc.",
    sedarProfileNumber: "000044016",
    exchange: "CBOE Canada",
    asset: "HBAR",
    fiscalYearEnd: "December",
  },
  {
    ticker: "XTAIF",
    localTicker: "XTAO.U",
    name: "xTAO Inc.",
    sedarProfileNumber: "000048521",  // Need to verify this
    exchange: "TSX-V",
    asset: "TAO",
    fiscalYearEnd: "March",
  },
  {
    ticker: "LUXFF",
    localTicker: "LUXX",
    name: "Luxxfolio Holdings Inc.",
    sedarProfileNumber: "000044736",
    exchange: "CSE",
    asset: "LTC",
    fiscalYearEnd: "August",
  },
  // STKE is dual-listed and files 40-F with SEC, handled by sec-auto-update
];

/**
 * Filing types we care about for holdings data
 */
export const RELEVANT_FILING_CATEGORIES = [
  "Interim financial statements",
  "Annual financial statements", 
  "Audited annual financial statements",
  "Material change report",
  "News release",
  "Interim MD&A",
  "Annual MD&A",
];

/**
 * Get company by ticker
 */
export function getCanadianCompany(ticker: string): CanadianCompany | undefined {
  return CANADIAN_COMPANIES.find(c => 
    c.ticker.toUpperCase() === ticker.toUpperCase() ||
    c.localTicker.toUpperCase() === ticker.toUpperCase()
  );
}

/**
 * Get all companies that need SEDAR+ monitoring
 */
export function getMonitoredCompanies(): CanadianCompany[] {
  return CANADIAN_COMPANIES;
}
