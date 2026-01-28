/**
 * MARA Capital Structure - Dilutive Instruments
 * ==============================================
 *
 * Tracks all dilutive instruments for accurate fully-diluted share count.
 * Source: SEC 8-K BTC Yield disclosures and 10-Q/10-K filings.
 *
 * MARA's fully diluted shares include:
 * - Common stock outstanding
 * - Convertible notes (if converted)
 * - Warrants (if exercised)
 * - RSUs/PSUs (unvested)
 *
 * Note: MARA uses "Assumed Fully Diluted Shares Outstanding" methodology
 * which does NOT use treasury method and assumes full conversion of all
 * instruments regardless of conversion price vs stock price.
 *
 * Generated: 2026-01-27
 */

export interface MaraConvertibleNote {
  id: string;
  name: string;
  issuanceDate: string;
  maturityDate: string;
  principalAmount: number;        // Face value in USD
  couponRate: number;             // Interest rate (0 = zero-coupon)
  conversionPrice: number;        // USD per share
  sharesIfConverted: number;      // Shares if fully converted
  status: "outstanding" | "converted" | "redeemed" | "matured";
  notes?: string;
  
  // SEC source
  issuance8kAccession?: string;
  issuance8kUrl?: string;
}

export interface MaraEquityInstrument {
  id: string;
  type: "warrant" | "rsu" | "psu" | "option";
  description: string;
  sharesAvailable: number;
  exercisePrice?: number;         // For warrants/options
  vestingSchedule?: string;       // For RSUs/PSUs
  expirationDate?: string;
}

/**
 * MARA Convertible Notes
 * 
 * As of December 2024, MARA has four convertible note tranches:
 * - 2026 Notes (Nov 2021) - largely converted
 * - 2030 Notes (Nov 2024) - new issuance
 * - 2031 Notes A (Aug 2024) - first 2031 tranche
 * - 2031 Notes B (Dec 2024) - second 2031 tranche
 */
export const MARA_CONVERTIBLE_NOTES: MaraConvertibleNote[] = [
  {
    id: "2026-notes",
    name: "2026 Convertible Senior Notes",
    issuanceDate: "2021-11-18",
    maturityDate: "2026-12-01",
    principalAmount: 650_000_000,    // $650M original
    couponRate: 1.0,                 // 1.0%
    conversionPrice: 109.82,         // Per SEC filing
    sharesIfConverted: 1_321_000,    // As of Dec 2024 (down from 5.969M - largely converted)
    status: "outstanding",
    notes: "Most shares already converted. ~$145M principal remaining as of Dec 2024.",
    issuance8kAccession: "0001193125-21-334851",
  },
  
  {
    id: "2030-notes",
    name: "2030 Convertible Senior Notes",
    issuanceDate: "2024-11-21",
    maturityDate: "2030-03-01",
    principalAmount: 1_000_000_000,  // $1B
    couponRate: 0,                   // 0% (zero-coupon)
    conversionPrice: 18.18,          // Per 8-K BTC Yield calculation: $1B / 55.006M shares
    sharesIfConverted: 55_006_000,   // 55.006M shares
    status: "outstanding",
    notes: "Zero-coupon convertible. Largest single tranche.",
    issuance8kAccession: "0001493152-24-047078",
    issuance8kUrl: "https://www.sec.gov/Archives/edgar/data/0001507605/000149315224047078/form8-k.htm",
  },
  
  {
    id: "2031-notes-a",
    name: "2031 Convertible Senior Notes (August)",
    issuanceDate: "2024-08-14",
    maturityDate: "2031-09-01",
    principalAmount: 300_000_000,    // $300M (expanded from $250M)
    couponRate: 2.125,               // 2.125%
    conversionPrice: 15.11,          // Per 8-K: $300M / 19.854M shares
    sharesIfConverted: 19_854_000,   // 19.854M shares
    status: "outstanding",
    issuance8kAccession: "0001493152-24-032433",
    issuance8kUrl: "https://www.sec.gov/Archives/edgar/data/0001507605/000149315224032433/form8-k.htm",
  },
  
  {
    id: "2031-notes-b",
    name: "2031 Convertible Senior Notes (December)",
    issuanceDate: "2024-12-04",
    maturityDate: "2031-03-01",
    principalAmount: 850_000_000,    // $850M
    couponRate: 0,                   // 0% (zero-coupon)
    conversionPrice: 22.70,          // Per 8-K: $850M / 37.449M shares
    sharesIfConverted: 37_449_000,   // 37.449M shares
    status: "outstanding",
    issuance8kAccession: "0001493152-24-048704",
    issuance8kUrl: "https://www.sec.gov/Archives/edgar/data/0001507605/000149315224048704/form8-k.htm",
  },
];

/**
 * MARA Other Dilutive Instruments
 * 
 * From Dec 2024 BTC Yield disclosure
 */
export const MARA_EQUITY_INSTRUMENTS: MaraEquityInstrument[] = [
  {
    id: "warrants",
    type: "warrant",
    description: "Outstanding warrants",
    sharesAvailable: 324_000,        // 324K shares
    exercisePrice: undefined,        // Various prices
  },
  {
    id: "rsus-psus",
    type: "rsu",
    description: "Restricted Stock Units and Performance Stock Units (unvested)",
    sharesAvailable: 10_064_000,     // ~10M shares as of Dec 2024
  },
];

/**
 * Calculate total dilutive shares from all instruments
 */
export function getMaraTotalDilutiveShares(): number {
  const convertibleShares = MARA_CONVERTIBLE_NOTES
    .filter(n => n.status === "outstanding")
    .reduce((sum, n) => sum + n.sharesIfConverted, 0);
  
  const equityShares = MARA_EQUITY_INSTRUMENTS
    .reduce((sum, e) => sum + e.sharesAvailable, 0);
  
  return convertibleShares + equityShares;
}

/**
 * Calculate total debt from convertible notes
 */
export function getMaraTotalConvertibleDebt(): number {
  return MARA_CONVERTIBLE_NOTES
    .filter(n => n.status === "outstanding")
    .reduce((sum, n) => sum + n.principalAmount, 0);
}

/**
 * Get capital structure snapshot for a given date
 */
export function getMaraCapitalStructureSnapshot(asOfDate: string): {
  totalConvertibleDebt: number;
  totalDilutiveShares: number;
  notes: MaraConvertibleNote[];
} {
  // Filter notes that were outstanding as of the given date
  const activeNotes = MARA_CONVERTIBLE_NOTES.filter(n => {
    return n.issuanceDate <= asOfDate && 
           (n.status === "outstanding" || n.maturityDate > asOfDate);
  });
  
  return {
    totalConvertibleDebt: activeNotes.reduce((sum, n) => sum + n.principalAmount, 0),
    totalDilutiveShares: activeNotes.reduce((sum, n) => sum + n.sharesIfConverted, 0),
    notes: activeNotes,
  };
}

// Summary as of Dec 2024:
// Total Convertible Debt: $2.8B ($650M + $1B + $300M + $850M)
// Total Dilutive Shares from Converts: ~113.6M
// Total Dilutive from Warrants/RSUs: ~10.4M
// Total Dilutive: ~124M shares on top of basic ~339M = ~463M fully diluted
