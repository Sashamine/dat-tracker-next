/**
 * Data Provenance System
 * 
 * Every displayed value traces back to an authoritative source.
 * This enables one-click verification at SEC.gov or other primary sources.
 */

// ============================================================================
// SOURCE TYPES
// ============================================================================

/** Where the data ultimately comes from */
export type SourceType = 
  | "xbrl"           // SEC XBRL structured data (most reliable)
  | "sec-document"   // SEC filing text (8-K, MD&A sections)
  | "press-release"  // Company press release
  | "company-website"// Company IR page / dashboard
  | "regulatory"     // Non-SEC regulatory filing (SEDAR+, HKEx, TDnet, etc.)
  | "derived"        // Calculated from other provenance-tracked values

/** SEC filing types */
export type SECFilingType = "10-K" | "10-Q" | "8-K" | "8-K/A" | "S-1" | "S-1/A" | "S-3" | "424B3" | "424B5" | "DEF14A" | "6-K" | "20-F" | "40-F";

// ============================================================================
// XBRL SOURCE
// ============================================================================

/** XBRL-sourced data - most verifiable */
export interface XBRLSource {
  type: "xbrl";
  
  /** 🔍 Exact text to Ctrl+F in the source document (e.g., "4,325,738") */
  searchTerm?: string;
  
  /** The XBRL fact name (e.g., "us-gaap:NetCashProvidedByUsedInOperatingActivities") */
  fact: string;
  
  /** The exact value from XBRL */
  rawValue: number;
  
  /** Unit of the raw value */
  unit: "USD" | "shares" | "pure";
  
  /** Period type */
  periodType: "instant" | "duration";
  
  /** For instant: the date. For duration: end date */
  periodEnd: string; // YYYY-MM-DD
  
  /** For duration: start date */
  periodStart?: string; // YYYY-MM-DD
  
  /** SEC CIK */
  cik: string;
  
  /** SEC accession number */
  accession: string;
  
  /** Filing type */
  filingType: SECFilingType;
  
  /** Filing date */
  filingDate: string; // YYYY-MM-DD
  
  /** Optional: Text anchor to find this value's section in the document (for deep-linking to document tab) */
  documentAnchor?: string;
}

// ============================================================================
// DOCUMENT SOURCE
// ============================================================================

/** Document-sourced data - text extraction from filings */
export interface DocumentSource {
  type: "sec-document" | "press-release" | "company-website" | "regulatory";
  
  /** 🔍 Exact text to Ctrl+F in the source document (e.g., "4,325,738") */
  searchTerm?: string;
  
  /** URL to the source document */
  url: string;
  
  /** The exact text/quote containing the value */
  quote: string;
  
  /** Search anchor to find the quote in the document */
  anchor?: string;
  
  /** For SEC filings */
  cik?: string;
  accession?: string;
  filingType?: SECFilingType;
  filingDate?: string;
  
  /** For non-SEC sources */
  sourceName?: string; // "TDnet", "SEDAR+", "HKEx", etc.
  documentDate: string; // YYYY-MM-DD
}

// ============================================================================
// DERIVED SOURCE
// ============================================================================

/** Derived data - calculated from other tracked values */
export interface DerivedSource {
  type: "derived";
  
  /** Human-readable derivation explanation */
  derivation: string; // e.g., "YTD operating cash flow ÷ 3 quarters"
  
  /** Formula using input keys */
  formula: string; // e.g., "operatingCashFlowYTD / 3"
  
  /** The input values used in derivation */
  inputs: {
    [key: string]: ProvenanceValue<number>;
  };
}

// ============================================================================
// PROVENANCE VALUE
// ============================================================================

/** A value with full provenance tracking */
export interface ProvenanceValue<T = number> {
  /** The displayed value (possibly derived/transformed) */
  value: T;
  
  /** The source of this value */
  source: XBRLSource | DocumentSource | DerivedSource;
  
  /** When this was last verified/updated */
  lastVerified: string; // ISO date
  
  /** Optional notes about data quality or caveats */
  notes?: string;
}

// ============================================================================
// COMPANY DATA WITH PROVENANCE
// ============================================================================

/** Financial metrics with provenance */
export interface ProvenanceFinancials {
  /** BTC/ETH/etc holdings count */
  holdings?: ProvenanceValue<number>;
  
  /** Holdings value in USD */
  holdingsValue?: ProvenanceValue<number>;
  
  /** Cost basis per unit */
  costBasisAvg?: ProvenanceValue<number>;
  
  /** Total cost basis */
  totalCostBasis?: ProvenanceValue<number>;
  
  /** Quarterly operating burn */
  quarterlyBurn?: ProvenanceValue<number>;
  
  /** Shares outstanding */
  sharesOutstanding?: ProvenanceValue<number>;
  
  /** Total debt */
  totalDebt?: ProvenanceValue<number>;
  
  /** Cash reserves */
  cashReserves?: ProvenanceValue<number>;
  
  /** Preferred equity */
  preferredEquity?: ProvenanceValue<number>;
  
  /** Restricted cash */
  restrictedCash?: ProvenanceValue<number>;
  
  /** Revenue (latest quarter) */
  revenueLatest?: ProvenanceValue<number>;
  
  /** Net loss (latest quarter, stored as positive) */
  netLossLatest?: ProvenanceValue<number>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Create an XBRL source */
export function xbrlSource(params: Omit<XBRLSource, "type">): XBRLSource {
  return { type: "xbrl", ...params };
}

/** Create a document source */
export function docSource(params: Omit<DocumentSource, "type"> & { type?: DocumentSource["type"] }): DocumentSource {
  return { type: params.type || "sec-document", ...params };
}

/** Create a derived source */
export function derivedSource(params: Omit<DerivedSource, "type">): DerivedSource {
  return { type: "derived", ...params };
}

/** Create a provenance value */
export function pv<T>(value: T, source: XBRLSource | DocumentSource | DerivedSource, notes?: string): ProvenanceValue<T> {
  return {
    value,
    source,
    lastVerified: new Date().toISOString().split("T")[0],
    notes,
  };
}

// ============================================================================
// URL BUILDERS
// ============================================================================

// CIK to ticker mapping (reverse lookup)
const CIK_TICKERS: Record<string, string> = {
  "1050446": "mstr", "1507605": "mara", "1167419": "riot", "1515671": "clsk",
  "1799290": "btbt", "1662684": "kulr", "1829311": "bmnr", "1878848": "corz",
  "1755953": "abtc", "1510079": "btcs", "1825079": "game", "1437925": "fgnx",
  "1652044": "dfdv", "1805526": "dfdv", "1775194": "upxi", "1580063": "hsdt", "1956744": "tron",
  "1627282": "cwd", "1846839": "stke", "1849635": "djt", "1977303": "naka",
  "1903595": "tbh", "38264": "fwdi", "1830131": "hypd", "1949556": "xxi",
  "1981535": "sbet",
  "1826397": "avx",
  "1425355": "suig",
};

/** Build URL to our internal XBRL viewer */
export function xbrlViewerUrl(cik: string, accession: string, fact?: string): string {
  const ticker = CIK_TICKERS[cik] || cik;
  const base = `/filings/${ticker}/${accession}?tab=xbrl`;
  return fact ? `${base}&fact=${encodeURIComponent(fact)}` : base;
}

/** Build URL to our internal filing viewer */
export function filingViewerUrl(cik: string, accession: string, anchor?: string): string {
  const ticker = CIK_TICKERS[cik] || cik;
  const base = `/filings/${ticker}/${accession}`;
  return anchor ? `${base}?anchor=${encodeURIComponent(anchor)}` : base;
}

/** Build URL to SEC EDGAR filing (for "View on SEC" backup link) */
export function secEdgarUrl(cik: string, accession: string): string {
  const accessionNoDashes = accession.replace(/-/g, "");
  // Link to the filing index page (lists all documents) rather than the raw directory
  // (which shows a confusing directory listing instead of the actual filing)
  const accessionDashed = accessionNoDashes.length === 18
    ? `${accessionNoDashes.slice(0, 10)}-${accessionNoDashes.slice(10, 12)}-${accessionNoDashes.slice(12)}`
    : accession; // already dashed
  return `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNoDashes}/${accessionDashed}-index.htm`;
}

/** Build URL to SEC XBRL API for company facts */
export function xbrlApiUrl(cik: string): string {
  return `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik.padStart(10, "0")}.json`;
}

/** Get URL from any source type (XBRL → internal viewer with document tab, Document → direct URL, Derived → follows first input) */
export function getSourceUrl(source: XBRLSource | DocumentSource | DerivedSource): string | undefined {
  if (source.type === "xbrl") {
    // Use internal filing viewer with document tab + anchor for easy verification
    return filingViewerUrl(source.cik, source.accession, source.documentAnchor);
  } else if (source.type === "derived") {
    // Resolve through to first input
    const firstInput = Object.values(source.inputs)[0];
    return firstInput ? getSourceUrl(firstInput.source) : undefined;
  } else {
    return source.url;
  }
}

/** Get filing date or document date from any source type */
export function getSourceDate(source: XBRLSource | DocumentSource | DerivedSource): string | undefined {
  if (source.type === "xbrl") {
    return source.filingDate;
  } else if (source.type === "derived") {
    // Resolve through to first input
    const firstInput = Object.values(source.inputs)[0];
    return firstInput ? getSourceDate(firstInput.source) : undefined;
  } else {
    return source.documentDate || source.filingDate;
  }
}

// ============================================================================
// EXAMPLE: MSTR Q3 2025 DATA
// ============================================================================

export const MSTR_Q3_2025_EXAMPLE: ProvenanceFinancials = {
  // BTC count from 8-K announcement
  holdings: pv(471107, docSource({
    type: "sec-document",
    url: "https://www.sec.gov/Archives/edgar/data/1050446/000119312525262568/",
    quote: "As of September 30, 2025, MicroStrategy held approximately 471,107 bitcoins",
    anchor: "bitcoins",
    cik: "1050446",
    accession: "0001193125-25-262568",
    filingType: "10-Q",
    filingDate: "2025-11-03",
    documentDate: "2025-11-03",
  })),
  
  // Holdings value from XBRL
  holdingsValue: pv(73_210_000_000, xbrlSource({
    fact: "us-gaap:IndefiniteLivedIntangibleAssetsExcludingGoodwill",
    rawValue: 73_210_000_000,
    unit: "USD",
    periodType: "instant",
    periodEnd: "2025-09-30",
    cik: "1050446",
    accession: "0001193125-25-262568",
    filingType: "10-Q",
    filingDate: "2025-11-03",
  })),
  
  // Quarterly burn - DERIVED from YTD
  quarterlyBurn: pv(15_200_000, derivedSource({
    derivation: "YTD operating cash flow ÷ 3 quarters",
    formula: "Math.abs(operatingCashFlowYTD.value) / 3",
    inputs: {
      operatingCashFlowYTD: pv(-45_612_000, xbrlSource({
        fact: "us-gaap:NetCashProvidedByUsedInOperatingActivities",
        rawValue: -45_612_000,
        unit: "USD",
        periodType: "duration",
        periodStart: "2025-01-01",
        periodEnd: "2025-09-30",
        cik: "1050446",
        accession: "0001193125-25-262568",
        filingType: "10-Q",
        filingDate: "2025-11-03",
      })),
    },
  })),
  
  // Shares from XBRL
  sharesOutstanding: pv(267_517_573, xbrlSource({
    fact: "dei:EntityCommonStockSharesOutstanding",
    rawValue: 267_517_573,
    unit: "shares",
    periodType: "instant",
    periodEnd: "2025-10-29",
    cik: "1050446",
    accession: "0001193125-25-262568",
    filingType: "10-Q",
    filingDate: "2025-11-03",
  })),
  
  // Debt from XBRL
  totalDebt: pv(8_173_903_000, xbrlSource({
    fact: "us-gaap:LongTermDebt",
    rawValue: 8_173_903_000,
    unit: "USD",
    periodType: "instant",
    periodEnd: "2025-09-30",
    cik: "1050446",
    accession: "0001193125-25-262568",
    filingType: "10-Q",
    filingDate: "2025-11-03",
  })),
};
