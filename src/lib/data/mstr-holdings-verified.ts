/**
 * MSTR Verified Holdings History
 * 
 * Auto-extracted from anchored SEC filings (id="dat-btc-holdings")
 * Each entry verified against SEC source document
 * 
 * Generated: 2026-02-08
 * Source: /public/sec/mstr/{8k,10k,10q}/*.html
 */

export interface VerifiedHolding {
  date: string;           // YYYY-MM-DD
  holdings: number;       // Total BTC holdings as of date
  filingType: string;     // 8K, 10K, 10Q
  accession: string;      // SEC accession suffix (for linking)
  source: string;         // Filename
}

export const MSTR_HOLDINGS_VERIFIED: VerifiedHolding[] = [
  // 2020
  { date: "2020-08-11", holdings: 21454, filingType: "8K", accession: "215604", source: "8k-2020-08-11-215604.html" },
  { date: "2020-09-15", holdings: 38250, filingType: "8K", accession: "245835", source: "8k-2020-09-15-245835.html" },
  { date: "2020-12-04", holdings: 40824, filingType: "8K", accession: "310787", source: "8k-2020-12-04-310787.html" },
  
  // 2021
  { date: "2021-11-29", holdings: 121044, filingType: "8K", accession: "341815", source: "8k-2021-11-29-341815.html" },
  { date: "2021-12-09", holdings: 122478, filingType: "8K", accession: "352140", source: "8k-2021-12-09-352140.html" },
  { date: "2021-12-30", holdings: 124391, filingType: "8K", accession: "369767", source: "8k-2021-12-30-369767.html" },
  
  // 2022
  { date: "2022-02-01", holdings: 125051, filingType: "8K", accession: "024027", source: "8k-2022-02-01-024027.html" },
  { date: "2022-02-16", holdings: 125051, filingType: "10K", accession: "", source: "10-K-2022-02-16.html" },
  { date: "2022-04-05", holdings: 129218, filingType: "8K", accession: "095632", source: "8k-2022-04-05-095632.html" },
  { date: "2022-05-03", holdings: 129218, filingType: "10Q", accession: "", source: "10-Q-2022-05-03.html" },
  { date: "2022-06-29", holdings: 129699, filingType: "8K", accession: "184423", source: "8k-2022-06-29-184423.html" },
  { date: "2022-08-02", holdings: 129699, filingType: "10Q", accession: "", source: "10-Q-2022-08-02.html" },
  { date: "2022-09-20", holdings: 130000, filingType: "8K", accession: "247427", source: "8k-2022-09-20-247427.html" },
  { date: "2022-11-01", holdings: 130000, filingType: "10Q", accession: "", source: "10-Q-2022-11-01.html" },
  { date: "2022-12-28", holdings: 132500, filingType: "8K", accession: "313098", source: "8k-2022-12-28-313098.html" },
  
  // 2023
  { date: "2023-09-25", holdings: 158245, filingType: "8K", accession: "240932", source: "8k-2023-09-25-240932.html" },
  { date: "2023-11-01", holdings: 158400, filingType: "10Q", accession: "", source: "10-Q-2023-11-01.html" },
  { date: "2023-11-30", holdings: 174530, filingType: "8K", accession: "285756", source: "8k-2023-11-30-285756.html" },
  { date: "2023-12-27", holdings: 189150, filingType: "8K", accession: "303488", source: "8k-2023-12-27-303488.html" },
  
  // 2024
  { date: "2024-02-26", holdings: 193000, filingType: "8K", accession: "045396", source: "8k-2024-02-26-045396.html" },
  { date: "2024-03-11", holdings: 205000, filingType: "8K", accession: "064331", source: "8k-2024-03-11-064331.html" },
  { date: "2024-03-19", holdings: 214246, filingType: "8K", accession: "070801", source: "8k-2024-03-19-070801.html" },
  { date: "2024-05-01", holdings: 214400, filingType: "10Q", accession: "", source: "10-Q-2024-05-01.html" },
  { date: "2024-06-20", holdings: 226331, filingType: "8K", accession: "164014", source: "8k-2024-06-20-164014.html" },
  { date: "2024-09-13", holdings: 244800, filingType: "8K", accession: "218462", source: "8k-2024-09-13-218462.html" },
  { date: "2024-09-20", holdings: 252220, filingType: "8K", accession: "222498", source: "8k-2024-09-20-222498.html" },
  { date: "2024-11-12", holdings: 279420, filingType: "8K", accession: "255184", source: "8k-2024-11-12-255184.html" },
  { date: "2024-11-18", holdings: 331200, filingType: "8K", accession: "260452", source: "8k-2024-11-18-260452.html" },
  { date: "2024-11-25", holdings: 386700, filingType: "8K", accession: "264733", source: "8k-2024-11-25-264733.html" },
  { date: "2024-12-02", holdings: 402100, filingType: "8K", accession: "268429", source: "8k-2024-12-02-268429.html" },
  { date: "2024-12-09", holdings: 423650, filingType: "8K", accession: "272923", source: "8k-2024-12-09-272923.html" },
  { date: "2024-12-16", holdings: 439000, filingType: "8K", accession: "279044", source: "8k-2024-12-16-279044.html" },
  { date: "2024-12-23", holdings: 444262, filingType: "8K", accession: "283686", source: "8k-2024-12-23-283686.html" },
  { date: "2024-12-30", holdings: 446400, filingType: "8K", accession: "286217", source: "8k-2024-12-30-286217.html" },
  
  // 2025
  { date: "2025-01-06", holdings: 447470, filingType: "8K", accession: "001854", source: "8k-2025-01-06-001854.html" },
  { date: "2025-01-13", holdings: 450000, filingType: "8K", accession: "005000", source: "8k-2025-01-13-005000.html" },
  { date: "2025-01-21", holdings: 461000, filingType: "8K", accession: "009102", source: "8k-2025-01-21-009102.html" },
  { date: "2025-01-27", holdings: 471107, filingType: "8K", accession: "012671", source: "8k-2025-01-27-012671.html" },
  { date: "2025-02-03", holdings: 471107, filingType: "8K", accession: "018889", source: "8k-2025-02-03-018889.html" },
  { date: "2025-02-10", holdings: 478740, filingType: "8K", accession: "023183", source: "8k-2025-02-10-023183.html" },
  { date: "2025-02-18", holdings: 478740, filingType: "8K", accession: "028184", source: "8k-2025-02-18-028184.html" },
  { date: "2025-02-24", holdings: 499096, filingType: "8K", accession: "025233", source: "8k-2025-02-24-025233.html" },
  { date: "2025-03-10", holdings: 499096, filingType: "8K", accession: "050411", source: "8k-2025-03-10-050411.html" },
  { date: "2025-03-17", holdings: 499226, filingType: "8K", accession: "039835", source: "8k-2025-03-17-039835.html" },
  { date: "2025-03-24", holdings: 506137, filingType: "8K", accession: "043494", source: "8k-2025-03-24-043494.html" },
  { date: "2025-03-31", holdings: 528185, filingType: "8K", accession: "047219", source: "8k-2025-03-31-047219.html" },
  { date: "2025-04-07", holdings: 528185, filingType: "8K", accession: "073989", source: "8k-2025-04-07-073989.html" },
  { date: "2025-04-14", holdings: 531644, filingType: "8K", accession: "053501", source: "8k-2025-04-14-053501.html" },
  { date: "2025-04-21", holdings: 538200, filingType: "8K", accession: "056007", source: "8k-2025-04-21-056007.html" },
  { date: "2025-04-28", holdings: 553555, filingType: "8K", accession: "058962", source: "8k-2025-04-28-058962.html" },
  { date: "2025-05-12", holdings: 568840, filingType: "8K", accession: "068580", source: "8k-2025-05-12-068580.html" },
  { date: "2025-05-19", holdings: 576230, filingType: "8K", accession: "073962", source: "8k-2025-05-19-073962.html" },
  { date: "2025-06-02", holdings: 580955, filingType: "8K", accession: "080022", source: "8k-2025-06-02-080022.html" },
  { date: "2025-06-09", holdings: 582000, filingType: "8K", accession: "083448", source: "8k-2025-06-09-083448.html" },
  { date: "2025-06-16", holdings: 592100, filingType: "8K", accession: "086545", source: "8k-2025-06-16-086545.html" },
  { date: "2025-06-23", holdings: 592345, filingType: "8K", accession: "088711", source: "8k-2025-06-23-088711.html" },
  { date: "2025-06-30", holdings: 597325, filingType: "8K", accession: "091211", source: "8k-2025-06-30-091211.html" },
  { date: "2025-07-07", holdings: 597325, filingType: "8K", accession: "094137", source: "8k-2025-07-07-094137.html" },
  { date: "2025-07-14", holdings: 601550, filingType: "8K", accession: "095461", source: "8k-2025-07-14-095461.html" },
  { date: "2025-07-21", holdings: 607770, filingType: "8K", accession: "097081", source: "8k-2025-07-21-097081.html" },
  { date: "2025-07-28", holdings: 607770, filingType: "8K", accession: "098938", source: "8k-2025-07-28-098938.html" },
  { date: "2025-08-04", holdings: 628791, filingType: "8K", accession: "101634", source: "8k-2025-08-04-101634.html" },
  { date: "2025-08-11", holdings: 628946, filingType: "8K", accession: "106241", source: "8k-2025-08-11-106241.html" },
  { date: "2025-08-18", holdings: 629376, filingType: "8K", accession: "109566", source: "8k-2025-08-18-109566.html" },
  { date: "2025-08-25", holdings: 632457, filingType: "8K", accession: "111093", source: "8k-2025-08-25-111093.html" },
  { date: "2025-09-02", holdings: 636505, filingType: "8K", accession: "000008", source: "8k-2025-09-02-000008.html" },
  { date: "2025-09-08", holdings: 638460, filingType: "8K", accession: "113360", source: "8k-2025-09-08-113360.html" },
  { date: "2025-09-15", holdings: 638985, filingType: "8K", accession: "202827", source: "8k-2025-09-15-202827.html" },
  { date: "2025-09-22", holdings: 639835, filingType: "8K", accession: "210048", source: "8k-2025-09-22-210048.html" },
  { date: "2025-09-29", holdings: 640031, filingType: "8K", accession: "221772", source: "8k-2025-09-29-221772.html" },
  { date: "2025-10-06", holdings: 640031, filingType: "8K", accession: "230977", source: "8k-2025-10-06-230977.html" },
  { date: "2025-10-20", holdings: 640418, filingType: "8K", accession: "243049", source: "8k-2025-10-20-243049.html" },
  { date: "2025-10-27", holdings: 640808, filingType: "8K", accession: "250751", source: "8k-2025-10-27-250751.html" },
  { date: "2025-11-03", holdings: 641205, filingType: "8K", accession: "261714", source: "8k-2025-11-03-261714.html" },
  { date: "2025-11-10", holdings: 641692, filingType: "8K", accession: "273310", source: "8k-2025-11-10-273310.html" },
  { date: "2025-11-17", holdings: 649870, filingType: "8K", accession: "283991", source: "8k-2025-11-17-283991.html" },
  { date: "2025-12-01", holdings: 650000, filingType: "8K", accession: "303157", source: "8k-2025-12-01-303157.html" },
  { date: "2025-12-08", holdings: 660624, filingType: "8K", accession: "310607", source: "8k-2025-12-08-310607.html" },
  { date: "2025-12-15", holdings: 671269, filingType: "8K", accession: "318468", source: "8k-2025-12-15-318468.html" },
  { date: "2025-12-22", holdings: 671269, filingType: "8K", accession: "327598", source: "8k-2025-12-22-327598.html" },
  { date: "2025-12-29", holdings: 672498, filingType: "8K", accession: "332296", source: "8k-2025-12-29-332296.html" },
  
  // 2026
  { date: "2026-01-05", holdings: 673783, filingType: "8K", accession: "001550", source: "8k-2026-01-05-001550.html" },
  { date: "2026-01-12", holdings: 687410, filingType: "8K", accession: "009811", source: "8k-2026-01-12-009811.html" },
  { date: "2026-01-20", holdings: 709715, filingType: "8K", accession: "016002", source: "8k-2026-01-20-016002.html" },
  { date: "2026-01-26", holdings: 712647, filingType: "8K", accession: "021726", source: "8k-2026-01-26-021726.html" },
  { date: "2026-02-02", holdings: 713502, filingType: "8K", accession: "032731", source: "8k-2026-02-02-032731.html" },
  { date: "2026-02-08", holdings: 721135, filingType: "8K", accession: "041944", source: "8k-2026-02-09-041944.html" },
];

// Helper to get holdings at a specific date
export function getHoldingsAsOf(date: string): number | null {
  // Find the most recent entry on or before the given date
  const sorted = [...MSTR_HOLDINGS_VERIFIED].sort((a, b) => b.date.localeCompare(a.date));
  for (const entry of sorted) {
    if (entry.date <= date) {
      return entry.holdings;
    }
  }
  return null;
}

// Helper to get entry by accession number
export function getByAccession(accession: string): VerifiedHolding | null {
  return MSTR_HOLDINGS_VERIFIED.find(e => e.accession === accession) || null;
}

// Stats
export const VERIFIED_STATS = {
  totalEntries: MSTR_HOLDINGS_VERIFIED.length,
  dateRange: {
    start: MSTR_HOLDINGS_VERIFIED[0]?.date,
    end: MSTR_HOLDINGS_VERIFIED[MSTR_HOLDINGS_VERIFIED.length - 1]?.date,
  },
  latestHoldings: MSTR_HOLDINGS_VERIFIED[MSTR_HOLDINGS_VERIFIED.length - 1]?.holdings,
  generatedAt: "2026-02-10",
};
