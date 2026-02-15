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
 * Reconciled 2026-02-15 with 10-Q Q3 2025 Note 14
 * 
 * As of Q3 2025, MARA has five convertible note tranches:
 * - 2026 Notes (Nov 2021) - $48M remaining (most redeemed), 1.0% coupon
 * - 2031-A Notes (Aug 2024) - $300M, 2.125% coupon
 * - 2030 Notes (Nov 2024) - $1B, zero-coupon
 * - 2031-B Notes (Dec 2024) - $925M, zero-coupon
 * - 2032 Notes (Jul 2025) - $1.025B, zero-coupon
 */
export const MARA_CONVERTIBLE_NOTES: MaraConvertibleNote[] = [
  {
    id: "2026-notes",
    name: "1.0% Convertible Senior Notes due Dec 2026",
    issuanceDate: "2021-11-18",
    maturityDate: "2026-12-01",
    principalAmount: 48_077_000,     // $48M remaining (originally $747.5M, most redeemed)
    couponRate: 1.0,                 // 1.0%
    conversionPrice: 76.17,          // $1,000 / 13.1277 = $76.17
    sharesIfConverted: 631_265,      // $48,077K × 13.1277 / 1000
    status: "outstanding",
    notes: "Most redeemed; $48M remaining as of Q3 2025 10-Q Note 14. Conv rate: 13.1277 shares per $1,000.",
    issuance8kAccession: "0001193125-21-334851",
  },
  
  {
    id: "2031-notes-a",
    name: "2.125% Convertible Senior Notes due Sep 2031",
    issuanceDate: "2024-08-14",
    maturityDate: "2031-09-01",
    principalAmount: 300_000_000,    // $300M
    couponRate: 2.125,               // 2.125%
    conversionPrice: 18.89,          // $1,000 / 52.9451 = $18.89
    sharesIfConverted: 15_883_530,   // $300,000K × 52.9451 / 1000
    status: "outstanding",
    notes: "Conv rate: 52.9451 shares per $1,000. Per Q3 2025 10-Q Note 14.",
    issuance8kAccession: "0001493152-24-032433",
    issuance8kUrl: "https://www.sec.gov/Archives/edgar/data/0001507605/000149315224032433/form8-k.htm",
  },
  
  {
    id: "2030-notes",
    name: "0% Convertible Senior Notes due Mar 2030",
    issuanceDate: "2024-11-21",
    maturityDate: "2030-03-01",
    principalAmount: 1_000_000_000,  // $1B
    couponRate: 0,                   // 0% (zero-coupon)
    conversionPrice: 25.91,          // $1,000 / 38.5902 = $25.91
    sharesIfConverted: 38_590_200,   // $1,000,000K × 38.5902 / 1000
    status: "outstanding",
    notes: "Zero-coupon convertible. Conv rate: 38.5902 shares per $1,000. Per Q3 2025 10-Q Note 14.",
    issuance8kAccession: "0001493152-24-047078",
    issuance8kUrl: "https://www.sec.gov/Archives/edgar/data/0001507605/000149315224047078/form8-k.htm",
  },
  
  {
    id: "2031-notes-b",
    name: "0% Convertible Senior Notes due Jun 2031",
    issuanceDate: "2024-12-04",
    maturityDate: "2031-06-01",
    principalAmount: 925_000_000,    // $925M
    couponRate: 0,                   // 0% (zero-coupon)
    conversionPrice: 34.58,          // $1,000 / 28.9159 = $34.58
    sharesIfConverted: 26_747_208,   // $925,000K × 28.9159 / 1000
    status: "outstanding",
    notes: "Zero-coupon convertible. Conv rate: 28.9159 shares per $1,000. Per Q3 2025 10-Q Note 14.",
    issuance8kAccession: "0001493152-24-048704",
    issuance8kUrl: "https://www.sec.gov/Archives/edgar/data/0001507605/000149315224048704/form8-k.htm",
  },

  {
    id: "2032-notes",
    name: "0% Convertible Senior Notes due Aug 2032",
    issuanceDate: "2025-07-28",
    maturityDate: "2032-08-01",
    principalAmount: 1_025_000_000,  // $1.025B
    couponRate: 0,                   // 0% (zero-coupon)
    conversionPrice: 20.26,          // $1,000 / 49.3619 = $20.26
    sharesIfConverted: 50_596_048,   // $1,025,000K × 49.3619 / 1000
    status: "outstanding",
    notes: "Zero-coupon convertible. Conv rate: 49.3619 shares per $1,000. Capped call partially offsets dilution. Per Q3 2025 10-Q Note 14.",
    issuance8kAccession: "0000950142-25-002027",
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
    description: "Performance-based RSUs (anti-dilutive as of Q3 2025)",
    sharesAvailable: 324_375,        // Per 10-Q Q3 2025 (reconciled 2026-02-15)
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

// Summary as of Q3 2025 (reconciled 2026-02-15 with 10-Q Note 14):
// Total Convertible Debt: $3.298B ($48M + $300M + $1B + $925M + $1.025B) — 5 tranches
// Total Dilutive Shares from Converts: ~132.4M (631K + 15.9M + 38.6M + 26.7M + 50.6M)
// Total Dilutive from Warrants/RSUs: ~648K (324K warrants + 324K RSUs)
// Total Dilutive: ~133.1M shares on top of basic ~378M = ~511M fully diluted
