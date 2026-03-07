/**
 * MSTR ATM Equity Sales
 * ======================
 * 
 * Combines narrative format (late 2024) and table format (2025+).
 * 
 * Generated: 2026-02-08T15:37:32.207Z
 * Total events: 51
 * Total shares: 141,922,366
 * Total proceeds: $36.66B
 * Coverage: 89% of implied equity
 */

export interface ATMSaleEvent {
  filingDate: string;
  /** Total shares across ALL programs (common + preferred). Use commonShares() for Class A only. */
  shares: number;
  proceeds: number;
  format: "narrative" | "table";
  sharesByProgram?: Record<string, number>;
  accessionNumber: string;
  secUrl: string;
}

/**
 * Extract Class A common shares from an ATM event.
 * - Narrative format (pre-2025): all shares are common (no preferred ATM existed yet)
 * - Table format: sum "MSTR ATM" + "Common ATM" keys only
 * - Preferred programs (STRK, STRF, STRD, STRC) are excluded
 */
export function getCommonShares(event: ATMSaleEvent): number {
  if (!event.sharesByProgram) {
    // Narrative format — all shares are Class A common (pre-preferred era)
    return event.shares;
  }
  return (event.sharesByProgram["MSTR ATM"] || 0) 
       + (event.sharesByProgram["Common ATM"] || 0);
}

/**
 * Get cumulative Class A common shares issued via ATM after a given date
 */
export function getCommonATMSharesAfter(afterDate: string, throughDate?: string): number {
  return MSTR_ATM_SALES
    .filter(atm => atm.filingDate > afterDate && (!throughDate || atm.filingDate <= throughDate))
    .reduce((sum, atm) => sum + getCommonShares(atm), 0);
}

export const MSTR_ATM_SALES: ATMSaleEvent[] = [
  // Early ATM (August 2024 $2B program)
  {
    filingDate: "2024-09-13",
    shares: 8048449,
    proceeds: 1110000000,
    format: "narrative",
    accessionNumber: "0001193125-24-218462",
    secUrl: "/filings/mstr/0001193125-24-218462",
  },
  // October 2024 $21B ATM program begins
  {
    filingDate: "2024-11-12",
    shares: 7854647,
    proceeds: 2029999999.9999998,
    format: "narrative",
    accessionNumber: "0001193125-24-255184",
    secUrl: "/filings/mstr/0001193125-24-255184",
  },
  {
    filingDate: "2024-11-18",
    shares: 13593865,
    proceeds: 4600000000,
    format: "narrative",
    accessionNumber: "0001193125-24-260452",
    secUrl: "/filings/mstr/0001193125-24-260452",
  },
  {
    filingDate: "2024-11-25",
    shares: 5597849,
    proceeds: 2460000000,
    format: "narrative",
    accessionNumber: "0001193125-24-264733",
    secUrl: "/filings/mstr/0001193125-24-264733",
  },
  {
    filingDate: "2024-12-02",
    shares: 3728507,
    proceeds: 1480000000,
    format: "narrative",
    accessionNumber: "0001193125-24-268429",
    secUrl: "/filings/mstr/0001193125-24-268429",
  },
  {
    filingDate: "2024-12-09",
    shares: 5418449,
    proceeds: 2130000000,
    format: "narrative",
    accessionNumber: "0001193125-24-272923",
    secUrl: "/filings/mstr/0001193125-24-272923",
  },
  {
    filingDate: "2024-12-16",
    shares: 3884712,
    proceeds: 1540000000,
    format: "narrative",
    accessionNumber: "0001193125-24-279044",
    secUrl: "/filings/mstr/0001193125-24-279044",
  },
  {
    filingDate: "2024-12-23",
    shares: 1317841,
    proceeds: 561000000,
    format: "narrative",
    accessionNumber: "0001193125-24-283686",
    secUrl: "/filings/mstr/0001193125-24-283686",
  },
  {
    filingDate: "2024-12-30",
    shares: 592987,
    proceeds: 209000000,
    format: "narrative",
    accessionNumber: "0001193125-24-286217",
    secUrl: "/filings/mstr/0001193125-24-286217",
  },
  {
    filingDate: "2025-01-06",
    shares: 319586,
    proceeds: 101000000,
    format: "narrative",
    accessionNumber: "0001193125-25-001854",
    secUrl: "/filings/mstr/0001193125-25-001854",
  },
  {
    filingDate: "2025-01-13",
    shares: 710425,
    proceeds: 243000000,
    format: "narrative",
    accessionNumber: "0001193125-25-005000",
    secUrl: "/filings/mstr/0001193125-25-005000",
  },
  {
    filingDate: "2025-01-21",
    shares: 3012072,
    proceeds: 1100000000,
    format: "narrative",
    accessionNumber: "0001193125-25-009102",
    secUrl: "/filings/mstr/0001193125-25-009102",
  },
  {
    filingDate: "2025-01-27",
    shares: 2765157,
    proceeds: 1100000000,
    format: "narrative",
    accessionNumber: "0001193125-25-012671",
    secUrl: "/filings/mstr/0001193125-25-012671",
  },
  {
    filingDate: "2025-02-10",
    shares: 516413,
    proceeds: 179000000,
    format: "narrative",
    accessionNumber: "0001193125-25-023183",
    secUrl: "/filings/mstr/0001193125-25-023183",
  },
  {
    filingDate: "2025-03-31",
    shares: 3859335,
    proceeds: 1220000000,
    format: "table",
    sharesByProgram: {"Common ATM":3645528,"STRK ATM":213807},
    accessionNumber: "0000950170-25-047219",
    secUrl: "/filings/mstr/0000950170-25-047219",
  },
  {
    filingDate: "2025-04-14",
    shares: 959712,
    proceeds: 285700000,
    format: "table",
    sharesByProgram: {"Common ATM":959712},
    accessionNumber: "0000950170-25-053501",
    secUrl: "/filings/mstr/0000950170-25-053501",
  },
  {
    filingDate: "2025-04-21",
    shares: 1846213,
    proceeds: 555500000,
    format: "table",
    sharesByProgram: {"Common ATM":1755000,"STRK ATM":91213},
    accessionNumber: "0000950170-25-056007",
    secUrl: "/filings/mstr/0000950170-25-056007",
  },
  {
    filingDate: "2025-04-28",
    shares: 4455069,
    proceeds: 1440000000,
    format: "table",
    sharesByProgram: {"Common ATM":4020000,"STRK ATM":435069},
    accessionNumber: "0000950170-25-058962",
    secUrl: "/filings/mstr/0000950170-25-058962",
  },
  {
    filingDate: "2025-05-05",
    shares: 929217,
    proceeds: 180300000,
    format: "table",
    sharesByProgram: {"Common ATM":353825,"STRK ATM":575392},
    accessionNumber: "0000950170-25-063168",
    secUrl: "/filings/mstr/0000950170-25-063168",
  },
  {
    filingDate: "2025-05-12",
    shares: 3496862,
    proceeds: 1340000000,
    format: "table",
    sharesByProgram: {"Common ATM":3222875,"STRK ATM":273987},
    accessionNumber: "0000950170-25-068580",
    secUrl: "/filings/mstr/0000950170-25-068580",
  },
  {
    filingDate: "2025-05-19",
    shares: 2334263,
    proceeds: 765400000,
    format: "table",
    sharesByProgram: {"Common ATM":1712708,"STRK ATM":621555},
    accessionNumber: "0000950170-25-073962",
    secUrl: "/filings/mstr/0000950170-25-073962",
  },
  {
    filingDate: "2025-06-02",
    shares: 728479,
    proceeds: 74600000,
    format: "table",
    sharesByProgram: {"STRK ATM":353511,"STRF ATM":374968},
    accessionNumber: "0000950170-25-080022",
    secUrl: "/filings/mstr/0000950170-25-080022",
  },
  {
    filingDate: "2025-06-09",
    shares: 1059318,
    proceeds: 112200000,
    format: "table",
    sharesByProgram: {"STRK ATM":626639,"STRF ATM":432679},
    accessionNumber: "0000950170-25-083448",
    secUrl: "/filings/mstr/0000950170-25-083448",
  },
  {
    filingDate: "2025-06-16",
    shares: 738588,
    proceeds: 78400000,
    format: "table",
    sharesByProgram: {"STRK ATM":452487,"STRF ATM":286101},
    accessionNumber: "0000950170-25-086545",
    secUrl: "/filings/mstr/0000950170-25-086545",
  },
  {
    filingDate: "2025-06-23",
    shares: 250920,
    proceeds: 26100000,
    format: "table",
    sharesByProgram: {"STRK ATM":166566,"STRF ATM":84354},
    accessionNumber: "0000950170-25-088711",
    secUrl: "/filings/mstr/0000950170-25-088711",
  },
  {
    filingDate: "2025-06-30",
    shares: 1914796,
    proceeds: 578100000,
    format: "table",
    sharesByProgram: {"Common ATM":1354500,"STRK ATM":276071,"STRF ATM":284225},
    accessionNumber: "0000950170-25-091211",
    secUrl: "/filings/mstr/0000950170-25-091211",
  },
  {
    filingDate: "2025-07-14",
    shares: 1973267,
    proceeds: 472300000,
    format: "table",
    sharesByProgram: {"Common ATM":797008,"STRK ATM":573976,"STRF ATM":444005,"STRD ATM":158278},
    accessionNumber: "0000950170-25-095461",
    secUrl: "/filings/mstr/0000950170-25-095461",
  },
  {
    filingDate: "2025-07-21",
    shares: 1675096,
    proceeds: 740300000,
    format: "table",
    sharesByProgram: {"Common ATM":1636373,"STRK ATM":5441,"STRF ATM":2000,"STRD ATM":31282},
    accessionNumber: "0000950170-25-097081",
    secUrl: "/filings/mstr/0000950170-25-097081",
  },
  {
    filingDate: "2025-08-11",
    shares: 0,
    proceeds: 13600000,
    format: "table",
    sharesByProgram: {},
    accessionNumber: "0000950170-25-106241",
    secUrl: "/filings/mstr/0000950170-25-106241",
  },
  {
    filingDate: "2025-08-18",
    shares: 483146,
    proceeds: 50400000,
    format: "table",
    sharesByProgram: {"STRK ATM":179687,"STRF ATM":162670,"STRD ATM":140789},
    accessionNumber: "0000950170-25-109566",
    secUrl: "/filings/mstr/0000950170-25-109566",
  },
  {
    filingDate: "2025-08-25",
    shares: 1323681,
    proceeds: 357000000,
    format: "table",
    sharesByProgram: {"Common ATM":875301,"STRK ATM":210100,"STRF ATM":237336,"STRD ATM":944},
    accessionNumber: "0000950170-25-111093",
    secUrl: "/filings/mstr/0000950170-25-111093",
  },
  {
    filingDate: "2025-09-02",
    shares: 1687413,
    proceeds: 471800000,
    format: "table",
    sharesByProgram: {"MSTR ATM":1237000,"STRK ATM":199509,"STRF ATM":237931,"STRD ATM":12973},
    accessionNumber: "0001050446-25-000008",
    secUrl: "/filings/mstr/0001050446-25-000008",
  },
  {
    filingDate: "2025-09-08",
    shares: 750545,
    proceeds: 217300000,
    format: "table",
    sharesByProgram: {"MSTR ATM":591606,"STRK ATM":54558,"STRF ATM":104381},
    accessionNumber: "0000950170-25-113360",
    secUrl: "/filings/mstr/0000950170-25-113360",
  },
  {
    filingDate: "2025-09-15",
    shares: 691906,
    proceeds: 68200000,
    format: "table",
    sharesByProgram: {"STRK ATM":181228,"STRF ATM":302503,"STRD ATM":208175},
    accessionNumber: "0001193125-25-202827",
    secUrl: "/filings/mstr/0001193125-25-202827",
  },
  {
    filingDate: "2025-09-22",
    shares: 173834,
    proceeds: 100000000,
    format: "table",
    sharesByProgram: {"STRF ATM":173834},
    accessionNumber: "0001193125-25-210048",
    secUrl: "/filings/mstr/0001193125-25-210048",
  },
  {
    filingDate: "2025-09-29",
    shares: 454065,
    proceeds: 128100000,
    format: "table",
    sharesByProgram: {"MSTR ATM":347352,"STRF ATM":101713,"STRD ATM":5000},
    accessionNumber: "0001193125-25-221772",
    secUrl: "/filings/mstr/0001193125-25-221772",
  },
  {
    filingDate: "2025-10-20",
    shares: 187447,
    proceeds: 18800000,
    format: "table",
    sharesByProgram: {"STRK ATM":55001,"STRF ATM":100206,"STRD ATM":32240},
    accessionNumber: "0001193125-25-243049",
    secUrl: "/filings/mstr/0001193125-25-243049",
  },
  {
    filingDate: "2025-10-27",
    shares: 454500,
    proceeds: 43400000,
    format: "table",
    sharesByProgram: {"STRK ATM":191404,"STRF ATM":175634,"STRD ATM":87462},
    accessionNumber: "0001193125-25-250751",
    secUrl: "/filings/mstr/0001193125-25-250751",
  },
  {
    filingDate: "2025-11-03",
    shares: 337957,
    proceeds: 69500000,
    format: "table",
    sharesByProgram: {"MSTR ATM":183501,"STRK ATM":49374,"STRF ATM":76017,"STRD ATM":29065},
    accessionNumber: "0001193125-25-261714",
    secUrl: "/filings/mstr/0001193125-25-261714",
  },
  {
    filingDate: "2025-11-10",
    shares: 491606,
    proceeds: 50000000,
    format: "table",
    sharesByProgram: {"STRK ATM":50881,"STRF ATM":165614,"STRC ATM":262311,"STRD ATM":12800},
    accessionNumber: "0001193125-25-273310",
    secUrl: "/filings/mstr/0001193125-25-273310",
  },
  {
    filingDate: "2025-11-17",
    shares: 1359111,
    proceeds: 136100000,
    format: "table",
    sharesByProgram: {"STRK ATM":5513,"STRF ATM":39957,"STRC ATM":1313641},
    accessionNumber: "0001193125-25-283991",
    secUrl: "/filings/mstr/0001193125-25-283991",
  },
  {
    filingDate: "2025-12-01",
    shares: 8214000,
    proceeds: 1478100000,
    format: "table",
    sharesByProgram: {"MSTR ATM":8214000},
    accessionNumber: "0001193125-25-303157",
    secUrl: "/filings/mstr/0001193125-25-303157",
  },
  {
    filingDate: "2025-12-08",
    shares: 5570220,
    proceeds: 963000000,
    format: "table",
    sharesByProgram: {"MSTR ATM":5127684,"STRD ATM":442536},
    accessionNumber: "0001193125-25-310607",
    secUrl: "/filings/mstr/0001193125-25-310607",
  },
  {
    filingDate: "2025-12-15",
    shares: 5989208,
    proceeds: 989000000,
    format: "table",
    sharesByProgram: {"MSTR ATM":4789664,"STRK ATM":7036,"STRF ATM":163306,"STRD ATM":1029202},
    accessionNumber: "0001193125-25-318468",
    secUrl: "/filings/mstr/0001193125-25-318468",
  },
  {
    filingDate: "2025-12-22",
    shares: 4535000,
    proceeds: 747800000,
    format: "table",
    sharesByProgram: {"MSTR ATM":4535000},
    accessionNumber: "0001193125-25-327598",
    secUrl: "/filings/mstr/0001193125-25-327598",
  },
  {
    filingDate: "2025-12-29",
    shares: 663450,
    proceeds: 108800000,
    format: "table",
    sharesByProgram: {"MSTR ATM":663450},
    accessionNumber: "0001193125-25-332296",
    secUrl: "/filings/mstr/0001193125-25-332296",
  },
  {
    filingDate: "2026-01-05",
    shares: 1255911,
    proceeds: 195900000,
    format: "table",
    sharesByProgram: {"MSTR ATM":1255911},
    accessionNumber: "0001193125-26-001550",
    secUrl: "/filings/mstr/0001193125-26-001550",
  },
  {
    filingDate: "2026-01-12",
    shares: 8019957,
    proceeds: 1247600000,
    format: "table",
    sharesByProgram: {"MSTR ATM":6827695,"STRC ATM":1192262},
    accessionNumber: "0001193125-26-009811",
    secUrl: "/filings/mstr/0001193125-26-009811",
  },
  {
    filingDate: "2026-01-20",
    shares: 13383817,
    proceeds: 2125000000,
    format: "table",
    sharesByProgram: {"MSTR ATM":10399650,"STRK ATM":38796,"STRC ATM":2945371},
    accessionNumber: "0001193125-26-016002",
    secUrl: "/filings/mstr/0001193125-26-016002",
  },
  {
    filingDate: "2026-01-26",
    shares: 1639971,
    proceeds: 264000000,
    format: "table",
    sharesByProgram: {"MSTR ATM":1569770,"STRC ATM":70201},
    accessionNumber: "0001193125-26-021726",
    secUrl: "/filings/mstr/0001193125-26-021726",
  },
  {
    filingDate: "2026-02-02",
    shares: 673527,
    proceeds: 106100000,
    format: "table",
    sharesByProgram: {"MSTR ATM":673527},
    accessionNumber: "0001193125-26-032731",
    secUrl: "/filings/mstr/0001193125-26-032731",
  },
  {
    filingDate: "2026-02-09",
    shares: 616715,
    proceeds: 89500000,
    format: "table",
    sharesByProgram: {"MSTR ATM": 616715},
    accessionNumber: "0001193125-26-041944",
    secUrl: "/filings/mstr/0001193125-26-041944",
  },
  {
    filingDate: "2026-02-17",
    shares: 660000,
    proceeds: 90500000,
    format: "table",
    sharesByProgram: {"MSTR ATM": 660000},
    accessionNumber: "0001193125-26-053105",
    secUrl: "/filings/mstr/0001193125-26-053105",
  },
  {
    filingDate: "2026-03-02",
    shares: 1730563,
    proceeds: 229900000,
    format: "table",
    sharesByProgram: {"MSTR ATM": 1730563, "STRC ATM": 71590},
    accessionNumber: "0001193125-26-084264",
    secUrl: "/filings/mstr/0001193125-26-084264",
  },
];

export const ATM_TOTAL_SHARES = 143652929;  // 141,922,366 + 1,730,563
export const ATM_TOTAL_PROCEEDS = 36891300000;  // 36.66B + 229.9M + 7.1M

