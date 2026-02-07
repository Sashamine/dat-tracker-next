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
export type SECFilingType = "10-K" | "10-Q" | "8-K" | "S-3" | "424B3" | "DEF14A" | "6-K" | "20-F" | "40-F";

// ============================================================================
// XBRL SOURCE
// ============================================================================

/** XBRL-sourced data - most verifiable */
export interface XBRLSource {
  type: "xbrl";
  
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
}

// ============================================================================
// DOCUMENT SOURCE
// ============================================================================

/** Document-sourced data - text extraction from filings */
export interface DocumentSource {
  type: "sec-document" | "press-release" | "company-website" | "regulatory";
  
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
// SEC XBRL URL BUILDERS
// ============================================================================

/** Build URL to SEC XBRL viewer for a specific fact */
export function xbrlViewerUrl(cik: string, accession: string): string {
  const cleanAccession = accession.replace(/-/g, "");
  return `https://www.sec.gov/cgi-bin/viewer?action=view&cik=${cik}&accession_number=${cleanAccession}`;
}

/** Build URL to SEC EDGAR filing */
export function edgarFilingUrl(cik: string, accession: string): string {
  return `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, "")}/`;
}

/** Build URL to SEC XBRL API for company facts */
export function xbrlApiUrl(cik: string): string {
  return `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik.padStart(10, "0")}.json`;
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
