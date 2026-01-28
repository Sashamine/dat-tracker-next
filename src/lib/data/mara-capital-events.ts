/**
 * MARA Capital Events - 8-K Filings with SEC Provenance
 * ======================================================
 *
 * This file tracks capital events from 8-K filings:
 * - BTC holdings updates (via BTC Yield disclosures)
 * - Debt issuances (convertible notes)
 * - ATM program activity
 *
 * Unlike MSTR which files dedicated "BTC Update" 8-Ks, MARA discloses
 * BTC holdings via:
 * - Item 7.01 (Reg FD) "BTC Yield" press releases
 * - Item 2.02 quarterly earnings releases
 * - Monthly production reports
 *
 * Data quality note:
 * - 8-Ks do NOT have XBRL (machine-readable data)
 * - Values extracted from text require careful verification
 * - Cross-check against quarterly totals in mara-sec-history.ts
 *
 * Generated: 2026-01-27
 */

export type MaraEventType =
  | "BTC_UPDATE"    // BTC holdings update (from BTC Yield disclosure)
  | "DEBT"          // Debt issuance (convertible notes)
  | "ATM"           // At-the-market program activity
  | "PRODUCTION"    // Monthly production report
  | "EARNINGS"      // Quarterly earnings release
  | "CORP";         // Corporate event

export interface MaraCapitalEvent {
  // Filing metadata
  date: string;           // YYYY-MM-DD (date of event/data point)
  filedDate: string;      // YYYY-MM-DD (SEC filing date)
  accessionNumber: string;
  secUrl: string;
  type: MaraEventType;
  item?: string;          // SEC Item number (e.g., "7.01", "2.02")
  
  // Event details
  description: string;
  
  // BTC data (from BTC Yield disclosures)
  btcHoldings?: number;
  btcYieldQtd?: number;   // Quarter-to-date BTC Yield %
  btcYieldYtd?: number;   // Year-to-date BTC Yield %
  
  // Share data (from BTC Yield tables)
  basicShares?: number;
  fullyDilutedShares?: number;
  
  // Debt events
  debtPrincipal?: number;
  debtCoupon?: number;
  debtMaturity?: string;
  convertibleShares?: number;  // Shares if fully converted
  
  // Mining production (monthly reports)
  btcMined?: number;
  btcPurchased?: number;
  hashRate?: number;      // EH/s
}

/**
 * MARA Capital Events
 * 
 * Extracted from SEC 8-K filings, ordered by event date descending.
 */
export const MARA_CAPITAL_EVENTS: MaraCapitalEvent[] = [
  // =========================================================================
  // 2024 Q4 Events
  // =========================================================================
  
  {
    date: "2024-12-18",
    filedDate: "2024-12-19",
    accessionNumber: "0001493152-24-050693",
    secUrl: "https://www.sec.gov/Archives/edgar/data/0001507605/000149315224050693/form8-k.htm",
    type: "BTC_UPDATE",
    item: "7.01",
    description: "BTC Yield disclosure - Q4 2024 update through Dec 18",
    btcHoldings: 44_394,
    btcYieldQtd: 22.5,
    btcYieldYtd: 60.9,
    basicShares: 339_382_000,
    fullyDilutedShares: 463_400_000,
  },
  
  {
    date: "2024-12-04",
    filedDate: "2024-12-04",
    accessionNumber: "0001493152-24-048704",
    secUrl: "https://www.sec.gov/Archives/edgar/data/0001507605/000149315224048704/form8-k.htm",
    type: "DEBT",
    item: "1.01",
    description: "2031 Convertible Notes offering - December tranche",
    debtPrincipal: 850_000_000,  // $850M
    debtCoupon: 0,               // 0% coupon
    debtMaturity: "2031-03-01",
    convertibleShares: 37_449_000,  // 37.449M shares if converted
  },
  
  {
    date: "2024-11-21",
    filedDate: "2024-11-21",
    accessionNumber: "0001493152-24-047078",
    secUrl: "https://www.sec.gov/Archives/edgar/data/0001507605/000149315224047078/form8-k.htm",
    type: "DEBT",
    item: "1.01",
    description: "2030 Convertible Notes offering - $1B at 0%",
    debtPrincipal: 1_000_000_000,  // $1B
    debtCoupon: 0,
    debtMaturity: "2030-03-01",
    convertibleShares: 55_006_000,  // 55.006M shares if converted
  },
  
  // Q3 2024 quarter-end snapshot (from BTC Yield table in Dec 8-K)
  {
    date: "2024-09-30",
    filedDate: "2024-12-19",
    accessionNumber: "0001493152-24-050693",
    secUrl: "https://www.sec.gov/Archives/edgar/data/0001507605/000149315224050693/form8-k.htm",
    type: "BTC_UPDATE",
    item: "7.01",
    description: "Q3 2024 quarter-end BTC holdings (from Dec BTC Yield disclosure)",
    btcHoldings: 26_747,
    basicShares: 304_913_000,
    fullyDilutedShares: 341_932_000,
  },
  
  {
    date: "2024-08-14",
    filedDate: "2024-08-14",
    accessionNumber: "0001493152-24-032433",
    secUrl: "https://www.sec.gov/Archives/edgar/data/0001507605/000149315224032433/form8-k.htm",
    type: "DEBT",
    item: "1.01",
    description: "2031 Convertible Notes offering - August tranche",
    debtPrincipal: 300_000_000,  // $300M (expanded from initial $250M)
    debtCoupon: 2.125,           // 2.125% coupon
    debtMaturity: "2031-09-01",
    convertibleShares: 19_854_000,  // 19.854M shares if converted
  },
  
  // =========================================================================
  // 2023 Year-end snapshot (from BTC Yield table)
  // =========================================================================
  
  {
    date: "2023-12-31",
    filedDate: "2024-12-19",
    accessionNumber: "0001493152-24-050693",
    secUrl: "https://www.sec.gov/Archives/edgar/data/0001507605/000149315224050693/form8-k.htm",
    type: "BTC_UPDATE",
    item: "7.01",
    description: "2023 year-end BTC holdings (from Dec 2024 BTC Yield disclosure)",
    btcHoldings: 15_174,
    basicShares: 242_829_000,
    fullyDilutedShares: 254_888_000,
  },
];

/**
 * Get events by type
 */
export function getMaraEventsByType(type: MaraEventType): MaraCapitalEvent[] {
  return MARA_CAPITAL_EVENTS.filter(e => e.type === type);
}

/**
 * Get events in a date range
 */
export function getMaraEventsInRange(startDate: string, endDate: string): MaraCapitalEvent[] {
  return MARA_CAPITAL_EVENTS.filter(e => e.date >= startDate && e.date <= endDate);
}

/**
 * Get the most recent BTC holdings update
 */
export function getLatestMaraBtcUpdate(): MaraCapitalEvent | undefined {
  return MARA_CAPITAL_EVENTS.find(e => e.type === "BTC_UPDATE" && e.btcHoldings);
}
