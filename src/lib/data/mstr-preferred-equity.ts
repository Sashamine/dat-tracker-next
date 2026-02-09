/**
 * MSTR Preferred Stock Issuances
 * ===============================
 * 
 * Strategy (formerly MicroStrategy) has 5 preferred stock classes:
 * - STRK: Strike (8% Series A Perpetual Preferred)
 * - STRF: Strife (10% Series A Perpetual Preferred)
 * - STRC: Strive (Perpetual Strife Convertible Preferred)
 * - STRD: Stride (Perpetual Preferred)
 * - STRE: Stream (European offering, EUR-denominated)
 * 
 * Data Sources:
 * - ATM sales: Extracted from weekly 8-K ATM tables
 * - IPO proceeds: From prospectus supplements and 8-K announcements
 * 
 * Generated: 2026-02-08
 */

export interface PreferredProgram {
  ticker: string;
  name: string;
  dividend: string;
  launchDate: string;
  ipoProceeds: number;
  atmProceeds: number;
  totalProceeds: number;
  sharesOutstanding: number;
  secUrl: string;
}

/**
 * ATM Sales by Preferred Class (extracted from weekly 8-K tables)
 * This is CONFIRMED data with SEC provenance
 */
export const PREFERRED_ATM_SALES = {
  STRK: {
    shares: 3_324_267,
    proceeds: 349_600_000,
  },
  STRF: {
    shares: 3_574_466,
    proceeds: 397_800_000,
  },
  STRC: {
    shares: 5_783_786,
    proceeds: 577_800_000,
  },
  STRD: {
    shares: 2_190_746,
    proceeds: 178_500_000,
  },
};

/**
 * IPO Proceeds (estimated from 8-K/prospectus)
 * These are based on initial offering filings
 * TODO: Refine with exact prospectus data
 */
export const PREFERRED_IPO_ESTIMATES = {
  STRK: {
    launchDate: '2025-01-27',
    proceeds: 563_400_000,  // From 8-K filing
    source: '8-K 2025-01-31',
  },
  STRF: {
    launchDate: '2025-03-25',
    proceeds: 500_000_000,  // Estimated
    source: 'prospectus supplement',
  },
  STRC: {
    launchDate: '2025-07-01',
    proceeds: 700_000_000,  // Estimated
    source: 'prospectus supplement',
  },
  STRD: {
    launchDate: '2025-07-01',
    proceeds: 500_000_000,  // Estimated
    source: 'prospectus supplement',
  },
  STRE: {
    launchDate: '2025-11-01',
    proceeds: 670_000_000,  // €620M converted at ~1.08
    source: 'European prospectus',
  },
};

/**
 * Complete Preferred Stock Summary
 */
export const PREFERRED_PROGRAMS: PreferredProgram[] = [
  {
    ticker: 'STRK',
    name: 'Strike',
    dividend: '8%',
    launchDate: '2025-01-27',
    ipoProceeds: 563_400_000,
    atmProceeds: 349_600_000,
    totalProceeds: 913_000_000,
    sharesOutstanding: 0,  // TODO: Add from 10-Q
    secUrl: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=8-K',
  },
  {
    ticker: 'STRF',
    name: 'Strife',
    dividend: '10%',
    launchDate: '2025-03-25',
    ipoProceeds: 500_000_000,
    atmProceeds: 397_800_000,
    totalProceeds: 897_800_000,
    sharesOutstanding: 0,
    secUrl: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=8-K',
  },
  {
    ticker: 'STRC',
    name: 'Strive',
    dividend: 'Convertible',
    launchDate: '2025-07-01',
    ipoProceeds: 700_000_000,
    atmProceeds: 577_800_000,
    totalProceeds: 1_277_800_000,
    sharesOutstanding: 0,
    secUrl: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=8-K',
  },
  {
    ticker: 'STRD',
    name: 'Stride',
    dividend: 'TBD',
    launchDate: '2025-07-01',
    ipoProceeds: 500_000_000,
    atmProceeds: 178_500_000,
    totalProceeds: 678_500_000,
    sharesOutstanding: 0,
    secUrl: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=8-K',
  },
  {
    ticker: 'STRE',
    name: 'Stream',
    dividend: 'EUR',
    launchDate: '2025-11-01',
    ipoProceeds: 670_000_000,
    atmProceeds: 0,  // Not in ATM program
    totalProceeds: 670_000_000,
    sharesOutstanding: 0,
    secUrl: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=8-K',
  },
];

// Totals
export const PREFERRED_TOTAL_ATM_PROCEEDS = 
  PREFERRED_ATM_SALES.STRK.proceeds +
  PREFERRED_ATM_SALES.STRF.proceeds +
  PREFERRED_ATM_SALES.STRC.proceeds +
  PREFERRED_ATM_SALES.STRD.proceeds;
// = $1.504B (CONFIRMED)

export const PREFERRED_TOTAL_IPO_PROCEEDS =
  PREFERRED_IPO_ESTIMATES.STRK.proceeds +
  PREFERRED_IPO_ESTIMATES.STRF.proceeds +
  PREFERRED_IPO_ESTIMATES.STRC.proceeds +
  PREFERRED_IPO_ESTIMATES.STRD.proceeds +
  PREFERRED_IPO_ESTIMATES.STRE.proceeds;
// = $2.933B (ESTIMATED)

export const PREFERRED_TOTAL_PROCEEDS = 
  PREFERRED_TOTAL_ATM_PROCEEDS + PREFERRED_TOTAL_IPO_PROCEEDS;
// = $4.437B total preferred equity
