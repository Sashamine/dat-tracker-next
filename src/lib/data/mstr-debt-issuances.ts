/**
 * MSTR Debt Issuances
 * ====================
 * 
 * All debt raised to fund BTC purchases, extracted from SEC 8-K filings.
 * Click any accession number to view the source document.
 * 
 * Generated: 2026-02-08T15:09:05.329Z
 * Total issuances: 17
 */

export interface DebtIssuance {
  /** SEC filing date */
  filingDate: string;
  
  /** Type of debt instrument */
  type: string;
  
  /** Principal amount in USD */
  principalAmount: number;
  
  /** Interest rate (0 for zero-coupon) */
  interestRate: number | null;
  
  /** Maturity date */
  maturityDate: string | null;
  
  /** Conversion price for convertibles */
  conversionPrice: number | null;
  
  /** Stated use of proceeds */
  useOfProceeds: string | null;
  
  // Provenance
  accessionNumber: string;
  secUrl: string;
}

/**
 * All debt issuances from SEC 8-K filings (2020-2024)
 * Sorted chronologically by filing date
 */
export const MSTR_DEBT_ISSUANCES: DebtIssuance[] = [
  {
    filingDate: "2020-12-09",
    type: "Convertible Notes",
    principalAmount: 400000000,
    interestRate: null,
    maturityDate: "2025",
    conversionPrice: null,
    useOfProceeds: "Bitcoin acquisition",
    accessionNumber: "0001193125-20-313349",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312520313349/d55072d8k.htm",
  },
  {
    filingDate: "2020-12-11",
    type: "Convertible Notes",
    principalAmount: 100000000,
    interestRate: 0.75,
    maturityDate: "December 15, 2025",
    conversionPrice: 397.99,
    useOfProceeds: "Bitcoin acquisition",
    accessionNumber: "0001193125-20-315971",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312520315971/d225117d8k.htm",
  },
  {
    filingDate: "2021-02-17",
    type: "Convertible Notes",
    principalAmount: 600000000,
    interestRate: null,
    maturityDate: "2027",
    conversionPrice: null,
    useOfProceeds: "Bitcoin acquisition",
    accessionNumber: "0001193125-21-045792",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312521045792/d119477d8k.htm",
  },
  {
    filingDate: "2021-02-19",
    type: "Convertible Notes",
    principalAmount: 150000000,
    interestRate: 0,
    maturityDate: "February 15, 2027",
    conversionPrice: 1432.46,
    useOfProceeds: "Bitcoin acquisition",
    accessionNumber: "0001193125-21-048555",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312521048555/d130600d8k.htm",
  },
  {
    filingDate: "2021-06-08",
    type: "Senior Secured Notes",
    principalAmount: 400000000,
    interestRate: null,
    maturityDate: "2028",
    conversionPrice: null,
    useOfProceeds: "Bitcoin acquisition",
    accessionNumber: "0001193125-21-185538",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312521185538/d183783d8k.htm",
  },
  {
    filingDate: "2022-03-29",
    type: "Secured Loan (Silvergate)",
    principalAmount: 205000000,
    interestRate: 3.75,
    maturityDate: "March 23, 2025",
    conversionPrice: null,
    useOfProceeds: "Bitcoin acquisition",
    accessionNumber: "0001193125-22-087494",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312522087494/d296323d8k.htm",
  },
  {
    filingDate: "2024-03-06",
    type: "Convertible Notes",
    principalAmount: 600000000,
    interestRate: null,
    maturityDate: "2030",
    conversionPrice: null,
    useOfProceeds: "Bitcoin acquisition",
    accessionNumber: "0001193125-24-060026",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312524060026/d781150d8k.htm",
  },
  {
    filingDate: "2024-03-11",
    type: "Convertible Notes",
    principalAmount: 100000000,
    interestRate: 0.625,
    maturityDate: "March 15, 2030",
    conversionPrice: 1497.68,
    useOfProceeds: "Bitcoin acquisition",
    accessionNumber: "0001193125-24-064321",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312524064321/d749312d8k.htm",
  },
  {
    filingDate: "2024-03-15",
    type: "Convertible Notes",
    principalAmount: 500000000,
    interestRate: null,
    maturityDate: "2031",
    conversionPrice: null,
    useOfProceeds: "Bitcoin acquisition",
    accessionNumber: "0001193125-24-068621",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312524068621/d792611d8k.htm",
  },
  {
    filingDate: "2024-03-19",
    type: "Convertible Notes",
    principalAmount: 78750000,
    interestRate: 0.875,
    maturityDate: "March 15, 2031",
    conversionPrice: 2327.21,
    useOfProceeds: "Bitcoin acquisition",
    accessionNumber: "0001193125-24-070793",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312524070793/d792323d8k.htm",
  },
  {
    filingDate: "2024-06-14",
    type: "Convertible Notes",
    principalAmount: 500000000,
    interestRate: 0.75,
    maturityDate: "2032",
    conversionPrice: 397.99,
    useOfProceeds: "Bitcoin acquisition",
    accessionNumber: "0001193125-24-161184",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312524161184/d792626d8k.htm",
  },
  {
    filingDate: "2024-06-20",
    type: "Convertible Notes",
    principalAmount: 100000000,
    interestRate: 2.25,
    maturityDate: "June 15, 2032",
    conversionPrice: 2043.32,
    useOfProceeds: "Bitcoin acquisition",
    accessionNumber: "0001193125-24-164009",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312524164009/d857957d8k.htm",
  },
  {
    filingDate: "2024-09-18",
    type: "Senior Secured Notes",
    principalAmount: 600000000,
    interestRate: null,
    maturityDate: "2028",
    conversionPrice: null,
    useOfProceeds: "Bitcoin acquisition",
    accessionNumber: "0001193125-24-221085",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312524221085/d889953d8k.htm",
  },
  {
    filingDate: "2024-09-20",
    type: "Senior Secured Notes",
    principalAmount: 145600000,
    interestRate: null,
    maturityDate: "2028",
    conversionPrice: null,
    useOfProceeds: "Bitcoin acquisition",
    accessionNumber: "0001193125-24-222498",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312524222498/d822569d8k.htm",
  },
  {
    filingDate: "2024-09-20",
    type: "Senior Secured Notes",
    principalAmount: 135000000,
    interestRate: 0.625,
    maturityDate: "September 15, 2028",
    conversionPrice: 183.19,
    useOfProceeds: "Bitcoin acquisition",
    accessionNumber: "0001193125-24-222462",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312524222462/d887785d8k.htm",
  },
  {
    filingDate: "2024-11-20",
    type: "Convertible Notes",
    principalAmount: 1750000000,
    interestRate: 0,
    maturityDate: "2029",
    conversionPrice: null,
    useOfProceeds: "Bitcoin acquisition",
    accessionNumber: "0001193125-24-262151",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312524262151/d850321d8k.htm",
  },
  {
    filingDate: "2024-11-21",
    type: "Convertible Notes",
    principalAmount: 400000000,
    interestRate: 0,
    maturityDate: "December 1, 2029",
    conversionPrice: 672.4,
    useOfProceeds: "Bitcoin acquisition",
    accessionNumber: "0001193125-24-263404",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312524263404/d905221d8k.htm",
  },
];

/**
 * Get total debt raised
 */
export function getTotalDebtRaised(): number {
  return MSTR_DEBT_ISSUANCES.reduce((sum, i) => sum + i.principalAmount, 0);
}

/**
 * Get debt by type
 */
export function getDebtByType(type: string): DebtIssuance[] {
  return MSTR_DEBT_ISSUANCES.filter(i => i.type === type);
}
