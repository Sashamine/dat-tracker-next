/**
 * DDC Enterprise Bitcoin Holdings History - SEC VERIFIED
 * 
 * All data sourced ONLY from SEC EDGAR 6-K filings
 * Company: DDC Enterprise Limited (NYSE American: DDC)
 * SEC CIK: 0001808110
 * 
 * Generated: 2025-10-20
 */

export interface DDCSecHoldingEntry {
  filingDate: string;       // Date SEC filing was submitted
  reportDate?: string;      // Date of event/report (if different)
  filingType: '6-K' | '8-K' | '20-F';
  accessionNumber: string;
  filingUrl: string;
  localPath: string;
  btcHoldings?: number;     // Total BTC holdings at this date
  btcAcquired?: number;     // BTC acquired in this transaction
  avgCostBasis?: number;    // Average cost per BTC (USD)
  sharesOutstanding?: number;
  description: string;
  notes?: string;
}

export const ddcSecHoldingsHistory: DDCSecHoldingEntry[] = [
  {
    filingDate: '2025-03-21',
    reportDate: '2025-03-17',
    filingType: '6-K',
    accessionNumber: '0001013762-25-001000',
    filingUrl: 'https://www.sec.gov/Archives/edgar/data/1808110/000101376225001000/0001013762-25-001000-index.htm',
    localPath: 'filings/ddc/2025-03-21_6K_bitcoin-reserve-strategy.txt',
    description: 'Bitcoin Reserve Strategy Announced - Binding Term Sheet',
    notes: 'Term sheet with Asgardian Capitals for initial 100 BTC purchase in 4 placements of 25 BTC each at $0.50, $0.75, $1.00, $1.25 per share. BTC to be held in 6/4 multisig cold wallet.'
  },
  {
    filingDate: '2025-05-16',
    reportDate: '2025-05-15',
    filingType: '6-K',
    accessionNumber: '0001213900-25-044621',
    filingUrl: 'https://www.sec.gov/Archives/edgar/data/1808110/000121390025044621/0001213900-25-044621-index.htm',
    localPath: 'filings/ddc/2025-05-16_6K_btc-accumulation-strategy.txt',
    description: 'Bitcoin Accumulation Strategy Press Release',
    notes: 'CEO Norma Chu shareholder letter: "Immediate execution of a 100 BTC acquisition, with a target to accumulate 500 BTC within six months and 5,000 BTC within 36 months."'
  },
  {
    filingDate: '2025-06-17',
    reportDate: '2025-06-17',
    filingType: '6-K',
    accessionNumber: '0001213900-25-054959',
    filingUrl: 'https://www.sec.gov/Archives/edgar/data/1808110/000121390025054959/0001213900-25-054959-index.htm',
    localPath: 'filings/ddc/2025-06-17_6K_528m-fundraise.txt',
    description: '$528 Million Fundraise for Bitcoin Treasury',
    notes: '$26M equity PIPE, $300M convertible secured note (first tranche $25M), $200M equity line. Investors: Anson Funds, Animoca Brands, Kenetic Capital, QCP Capital, Jack Liu, Matthew Liu.'
  },
  {
    filingDate: '2025-10-14',
    reportDate: '2025-10-08',
    filingType: '6-K',
    accessionNumber: '0001213900-25-098777',
    filingUrl: 'https://www.sec.gov/Archives/edgar/data/1808110/000121390025098777/0001213900-25-098777-index.htm',
    localPath: 'filings/ddc/2025-10-14_6K_1058btc-124m-raise.txt',
    btcHoldings: 1058,
    description: '$124 Million Raise - 1,058 BTC Secured',
    notes: 'Press release states "With 1,058 BTC already secured and a goal of 10,000 BTC by year-end 2025". Investors: PAG Pegasus Fund, Mulana Investment, OKG Financial Services, CEO Norma Chu ($3M personal).'
  },
  {
    filingDate: '2025-10-20',
    reportDate: '2025-10-15',
    filingType: '6-K',
    accessionNumber: '0001213900-25-100181',
    filingUrl: 'https://www.sec.gov/Archives/edgar/data/1808110/000121390025100181/0001213900-25-100181-index.htm',
    localPath: 'filings/ddc/2025-10-20_6K_1083btc-holdings.txt',
    btcHoldings: 1083,
    btcAcquired: 25,
    avgCostBasis: 108726,
    sharesOutstanding: 23309005,
    description: 'Latest Holdings Update - 1,083 BTC Total',
    notes: 'Oct 15 acquired 25 BTC bringing total to 1,083 BTC. Avg cost $108,726/BTC. H2 Bitcoin yield 263%. 0.108309 BTC per 1,000 shares.'
  }
];

/**
 * Get the latest SEC-verified holdings
 */
export function getLatestSecVerifiedHoldings(): DDCSecHoldingEntry | undefined {
  const withHoldings = ddcSecHoldingsHistory.filter(e => e.btcHoldings !== undefined);
  return withHoldings[withHoldings.length - 1];
}

/**
 * Get all filings mentioning specific BTC holdings amounts
 */
export function getHoldingsDisclosures(): DDCSecHoldingEntry[] {
  return ddcSecHoldingsHistory.filter(e => e.btcHoldings !== undefined);
}

// Summary data for quick reference
export const ddcSecSummary = {
  ticker: 'DDC',
  exchange: 'NYSE American',
  cik: '0001808110',
  companyName: 'DDC Enterprise Limited',
  jurisdiction: 'Cayman Islands',
  edgarUrl: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001808110&type=6-K&dateb=&owner=include&count=100',
  
  // Latest verified data as of 2025-10-20
  latestHoldings: {
    btc: 1083,
    avgCostBasis: 108726,
    sharesOutstanding: 23309005,
    btcPerThousandShares: 0.108309,
    asOfDate: '2025-10-20',
    filingAccession: '0001213900-25-100181'
  },
  
  // Goals stated in SEC filings
  statedGoals: {
    byYearEnd2025: 10000,  // Per Oct 14, 2025 filing
    in36Months: 5000,      // Per May 16, 2025 filing (originally stated)
  },
  
  // Total filings downloaded
  filingsDownloaded: 5,
  lastUpdated: '2025-10-20'
};
