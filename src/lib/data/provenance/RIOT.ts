import { CompanyProvenance } from "../types";

/**
 * RIOT Platforms - Provenance Data
 * 
 * Source: SEC 10-Q Q3 FY2025 (filed 2025-11-05)
 * CIK: 0001167419
 * 
 * Notes:
 * - RIOT shifted strategy in April 2025: now selling BTC production for AI data center expansion
 * - Holdings decreased from ~19,200 BTC (Q3 2025) to ~18,000 BTC (Dec 2025) due to sales
 * - Current holdings from press release (Jan 7, 2026), not SEC filing
 */
export const RIOT_PROVENANCE: CompanyProvenance = {
  ticker: "RIOT",
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HOLDINGS
  // Source: Press release Dec 2025 production update
  // Note: SEC 10-Q Q3 2025 shows 19,287 BTC as of Sep 30, 2025
  // ═══════════════════════════════════════════════════════════════════════════
  holdings: 18_005,
  holdingsSource: "Press Release - December 2025 Production Update",
  holdingsSourceUrl: "https://www.riotplatforms.com/riot-announces-december-2025-production-and-operations-updates/",
  holdingsAsOf: "2025-12-31",
  
  // Q3 2025 holdings for reference (from 10-Q)
  holdingsQ3_2025: 19_287,
  holdingsQ3Source: "SEC 10-Q Q3 FY2025",
  holdingsQ3SourceUrl: "https://www.sec.gov/Archives/edgar/data/1167419/000155837025006119/",
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SHARES OUTSTANDING
  // Source: SEC 10-Q Q3 FY2025 Statement of Stockholders' Equity
  // XBRL: us-gaap:SharesOutstanding = 371,116,270 as of Sep 30, 2025
  // ═══════════════════════════════════════════════════════════════════════════
  sharesForMnav: 371_116_270,
  sharesSource: "SEC 10-Q Q3 FY2025 Statement of Stockholders' Equity",
  sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1167419/000155837025006119/tmb-20250930x10q.htm",
  sharesAsOf: "2025-09-30",
  
  // ═══════════════════════════════════════════════════════════════════════════
  // BALANCE SHEET DATA
  // Source: SEC 10-Q Q3 FY2025, Balance Sheet (p.4)
  // As of September 30, 2025
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Cash & Cash Equivalents
  // Note: RIOT reports "unrestricted cash" separately from restricted cash
  cashAndEquivalents: 330_700_000, // $330.7M unrestricted
  cashSource: "SEC 10-Q Q3 FY2025 Balance Sheet",
  cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1167419/000155837025006119/",
  cashAsOf: "2025-09-30",
  
  // Total Debt
  // $594M 0.75% convertible notes due 2030 (issued Dec 2024)
  // + $200M Coinbase BTC-backed credit facility
  totalDebt: 794_000_000,
  debtSource: "SEC 10-Q Q3 FY2025 + Press Releases",
  debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1167419/000155837025006119/",
  debtAsOf: "2025-09-30",
  
  // Convertible Notes Detail
  convertibleNotes: 594_000_000, // $594M @ 0.75% due 2030
  convertibleSource: "SEC 10-Q Q3 FY2025",
  convertibleSourceUrl: "https://www.sec.gov/Archives/edgar/data/1167419/000155837025006119/",
  
  // BTC-backed credit facility
  btcBackedLoan: 200_000_000, // $200M Coinbase facility
  btcBackedSource: "Press Release",
  
  // Preferred Equity: None
  preferredEquity: 0,
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MINER-SPECIFIC DATA
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Quarterly operating expenses (SG&A excluding mining COGS)
  quarterlyBurnUsd: 69_832_000,
  burnSource: "SEC 10-Q Q3 2025 XBRL: SellingGeneralAndAdministrativeExpense",
  burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1167419/000155837025006119/",
  burnAsOf: "2025-09-30",
  
  // Hashrate (deployed)
  hashrateEHs: 38.5,
  hashrateSource: "Press Release - December 2025",
  hashrateSourceUrl: "https://www.riotplatforms.com/riot-announces-december-2025-production-and-operations-updates/",
  
  // ═══════════════════════════════════════════════════════════════════════════
  // VERIFICATION STATUS
  // ═══════════════════════════════════════════════════════════════════════════
  lastVerified: "2026-02-12",
  verifiedBy: "DATCAP automated verification",
  
  // Citation verification checklist
  citations: {
    holdingsVerified: false, // TODO: Verify against SEC filing
    sharesVerified: false,   // TODO: Verify cover page number
    debtVerified: false,     // TODO: Verify balance sheet
    cashVerified: false,     // TODO: Verify balance sheet
  },
};
