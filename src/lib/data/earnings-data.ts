// Earnings data for DAT companies
// Sources: SEC EDGAR, company IR pages, investor presentations

import { EarningsRecord, EarningsCalendarEntry, TreasuryYieldMetrics, Asset, CalendarQuarter } from "../types";
import { allCompanies } from "./companies";
import { HOLDINGS_HISTORY, calculateHoldingsGrowth } from "./holdings-history";

// Upcoming and recent earnings dates
// Status: "upcoming" = scheduled, "confirmed" = date confirmed by company, "reported" = results released
export const EARNINGS_DATA: EarningsRecord[] = [
  // ==================== BTC COMPANIES ====================

  // ========== Strategy (MSTR) ==========
  // Q4 2025 - Upcoming earnings (prelim data from 8-K)
  {
    ticker: "MSTR",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-02-04",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 712647, // Jan 25, 2026 8-K (latest in Q4)
    sharesAtQuarterEnd: 277_936_548, // Q3 267.5M + Q4 ATM 10.5M shares (estimated from ATM sales)
    holdingsPerShare: 0.002564, // Preliminary from 8-K filings; final 10-K due Feb 2026
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312526021726/0001193125-26-021726-index.htm",
    status: "upcoming",
  },
  // Q3 2025
  {
    ticker: "MSTR",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    earningsDate: "2025-10-30",
    earningsTime: "AMC",
    epsActual: -1.72,
    epsEstimate: -0.12,
    revenueActual: 116_100_000,
    revenueEstimate: 122_660_000,
    netIncome: -340_200_000,
    holdingsAtQuarterEnd: 640031,
    sharesAtQuarterEnd: 267_468_000,
    holdingsPerShare: 0.002393,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q2 2025
  {
    ticker: "MSTR",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    earningsDate: "2025-08-01",
    earningsTime: "AMC",
    epsActual: -5.74,
    epsEstimate: -0.67,
    revenueActual: 111_400_000,
    revenueEstimate: 119_300_000,
    netIncome: -102_600_000,
    holdingsAtQuarterEnd: 597325,
    sharesAtQuarterEnd: 261_318_000,
    holdingsPerShare: 0.002286,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q1 2025
  {
    ticker: "MSTR",
    fiscalYear: 2025,
    fiscalQuarter: 1,
    earningsDate: "2025-05-01",
    earningsTime: "AMC",
    epsActual: -16.49,
    epsEstimate: -0.54,
    revenueActual: 111_100_000,
    revenueEstimate: 117_000_000,
    netIncome: -4_217_000_000,
    holdingsAtQuarterEnd: 528185,
    sharesAtQuarterEnd: 246_537_000,
    holdingsPerShare: 0.002142,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-K",
    status: "reported",
  },
  // Q4 2024
  {
    ticker: "MSTR",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    earningsDate: "2025-02-05",
    earningsTime: "AMC",
    epsActual: 0.89,
    epsEstimate: -0.12,
    revenueActual: 120_700_000,
    revenueEstimate: 123_000_000,
    netIncome: 36_200_000,
    holdingsAtQuarterEnd: 446400,
    sharesAtQuarterEnd: 226_138_000,
    holdingsPerShare: 0.001974,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-K",
    status: "reported",
  },
  // Q3 2024
  {
    ticker: "MSTR",
    fiscalYear: 2024,
    fiscalQuarter: 3,
    earningsDate: "2024-10-30",
    earningsTime: "AMC",
    epsActual: -1.72,
    epsEstimate: -0.11,
    revenueActual: 116_100_000,
    revenueEstimate: 122_660_000,
    netIncome: -340_200_000,
    holdingsAtQuarterEnd: 252220,
    sharesAtQuarterEnd: 183_000_000,
    holdingsPerShare: 0.001378,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q2 2024
  {
    ticker: "MSTR",
    fiscalYear: 2024,
    fiscalQuarter: 2,
    earningsDate: "2024-08-01",
    earningsTime: "AMC",
    epsActual: -5.74,
    epsEstimate: -0.78,
    revenueActual: 111_400_000,
    revenueEstimate: 119_300_000,
    netIncome: -102_600_000,
    holdingsAtQuarterEnd: 226331,
    sharesAtQuarterEnd: 171_030_000,
    holdingsPerShare: 0.001323,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q1 2024
  {
    ticker: "MSTR",
    fiscalYear: 2024,
    fiscalQuarter: 1,
    earningsDate: "2024-04-29",
    earningsTime: "AMC",
    epsActual: -8.26,
    epsEstimate: -0.78,
    revenueActual: 115_200_000,
    revenueEstimate: 121_700_000,
    netIncome: -53_100_000,
    holdingsAtQuarterEnd: 214246,
    sharesAtQuarterEnd: 156_830_000,
    holdingsPerShare: 0.001366,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q4 2023
  {
    ticker: "MSTR",
    fiscalYear: 2023,
    fiscalQuarter: 4,
    earningsDate: "2024-01-30",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 189150,
    sharesAtQuarterEnd: 149_040_000,
    holdingsPerShare: 0.001269,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q3 2023
  {
    ticker: "MSTR",
    fiscalYear: 2023,
    fiscalQuarter: 3,
    earningsDate: "2023-10-30",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 158245,
    sharesAtQuarterEnd: 125_430_000,
    holdingsPerShare: 0.001262,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q2 2023
  {
    ticker: "MSTR",
    fiscalYear: 2023,
    fiscalQuarter: 2,
    earningsDate: "2023-07-30",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 152333,
    sharesAtQuarterEnd: 121_190_000,
    holdingsPerShare: 0.001257,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q1 2023
  {
    ticker: "MSTR",
    fiscalYear: 2023,
    fiscalQuarter: 1,
    earningsDate: "2023-04-30",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 138955,
    sharesAtQuarterEnd: 109_950_000,
    holdingsPerShare: 0.001264,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q4 2022
  {
    ticker: "MSTR",
    fiscalYear: 2022,
    fiscalQuarter: 4,
    earningsDate: "2023-01-30",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 132500,
    sharesAtQuarterEnd: 95_850_000,
    holdingsPerShare: 0.001382,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q3 2022
  {
    ticker: "MSTR",
    fiscalYear: 2022,
    fiscalQuarter: 3,
    earningsDate: "2022-10-30",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 130000,
    sharesAtQuarterEnd: 93_540_000,
    holdingsPerShare: 0.001390,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q2 2022
  {
    ticker: "MSTR",
    fiscalYear: 2022,
    fiscalQuarter: 2,
    earningsDate: "2022-07-30",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 129699,
    sharesAtQuarterEnd: 93_370_000,
    holdingsPerShare: 0.001389,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q1 2022
  {
    ticker: "MSTR",
    fiscalYear: 2022,
    fiscalQuarter: 1,
    earningsDate: "2022-04-30",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 125051,
    sharesAtQuarterEnd: 93_340_000,
    holdingsPerShare: 0.001340,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q4 2021
  {
    ticker: "MSTR",
    fiscalYear: 2021,
    fiscalQuarter: 4,
    earningsDate: "2022-01-30",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 124391,
    sharesAtQuarterEnd: 93_220_000,
    holdingsPerShare: 0.001334,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q3 2021
  {
    ticker: "MSTR",
    fiscalYear: 2021,
    fiscalQuarter: 3,
    earningsDate: "2021-10-30",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 114042,
    sharesAtQuarterEnd: 83_940_000,
    holdingsPerShare: 0.001359,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q2 2021
  {
    ticker: "MSTR",
    fiscalYear: 2021,
    fiscalQuarter: 2,
    earningsDate: "2021-07-30",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 105084,
    sharesAtQuarterEnd: 77_840_000,
    holdingsPerShare: 0.001350,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q1 2021
  {
    ticker: "MSTR",
    fiscalYear: 2021,
    fiscalQuarter: 1,
    earningsDate: "2021-04-30",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 91326,
    sharesAtQuarterEnd: 77_820_000,
    holdingsPerShare: 0.001174,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q4 2020
  {
    ticker: "MSTR",
    fiscalYear: 2020,
    fiscalQuarter: 4,
    earningsDate: "2021-01-30",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 70470,
    sharesAtQuarterEnd: 76_230_000,
    holdingsPerShare: 0.000924,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },
  // Q3 2020
  {
    ticker: "MSTR",
    fiscalYear: 2020,
    fiscalQuarter: 3,
    earningsDate: "2020-10-30",
    earningsTime: "AMC",
    holdingsAtQuarterEnd: 38250,
    sharesAtQuarterEnd: 72_530_000,
    holdingsPerShare: 0.000527,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },

  // ========== Marathon Digital (MARA) ==========
  // Q4 2025 - Upcoming
  {
    ticker: "MARA",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-02-26",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },
  // Q3 2025
  {
    ticker: "MARA",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    earningsDate: "2025-11-12",
    earningsTime: "AMC",
    epsActual: 0.32,
    epsEstimate: 0.05,
    revenueActual: 131_600_000,
    revenueEstimate: 145_000_000,
    holdingsAtQuarterEnd: 52850,
    sharesAtQuarterEnd: 470_126_000,
    holdingsPerShare: 0.0001124,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2025
  {
    ticker: "MARA",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    earningsDate: "2025-08-06",
    earningsTime: "AMC",
    epsActual: -0.42,
    epsEstimate: -0.15,
    revenueActual: 145_100_000,
    revenueEstimate: 157_000_000,
    netIncome: -199_700_000,
    holdingsAtQuarterEnd: 46376,
    sharesAtQuarterEnd: 350_000_000,
    holdingsPerShare: 0.0001325,
    source: "sec-filing",
    status: "reported",
  },
  // Q1 2025
  {
    ticker: "MARA",
    fiscalYear: 2025,
    fiscalQuarter: 1,
    earningsDate: "2025-05-08",
    earningsTime: "AMC",
    epsActual: -0.47,
    epsEstimate: -0.25,
    revenueActual: 213_900_000,
    revenueEstimate: 224_000_000,
    netIncome: -183_400_000,
    holdingsAtQuarterEnd: 48137,
    sharesAtQuarterEnd: 340_000_000,
    holdingsPerShare: 0.0001416,
    source: "sec-filing",
    status: "reported",
  },
  // Q4 2024
  {
    ticker: "MARA",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    earningsDate: "2025-02-26",
    earningsTime: "AMC",
    epsActual: 1.24,
    epsEstimate: 0.14,
    revenueActual: 214_400_000,
    revenueEstimate: 232_000_000,
    netIncome: 528_200_000,
    holdingsAtQuarterEnd: 44893,
    sharesAtQuarterEnd: 302_000_000,
    holdingsPerShare: 0.0001487,
    source: "sec-filing",
    status: "reported",
  },
  // Q3 2024
  {
    ticker: "MARA",
    fiscalYear: 2024,
    fiscalQuarter: 3,
    earningsDate: "2024-11-13",
    earningsTime: "AMC",
    epsActual: -0.42,
    epsEstimate: -0.22,
    revenueActual: 131_600_000,
    revenueEstimate: 149_000_000,
    netIncome: -124_800_000,
    holdingsAtQuarterEnd: 26747,
    sharesAtQuarterEnd: 296_000_000,
    holdingsPerShare: 0.0000903,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2024
  {
    ticker: "MARA",
    fiscalYear: 2024,
    fiscalQuarter: 2,
    earningsDate: "2024-08-08",
    earningsTime: "AMC",
    epsActual: -0.72,
    epsEstimate: 0.31,
    revenueActual: 145_100_000,
    revenueEstimate: 163_000_000,
    netIncome: -199_700_000,
    holdingsAtQuarterEnd: 20818,
    sharesAtQuarterEnd: 277_000_000,
    holdingsPerShare: 0.0000752,
    source: "sec-filing",
    status: "reported",
  },
  // Q1 2024
  {
    ticker: "MARA",
    fiscalYear: 2024,
    fiscalQuarter: 1,
    earningsDate: "2024-05-09",
    earningsTime: "AMC",
    epsActual: 1.26,
    epsEstimate: 0.05,
    revenueActual: 165_200_000,
    revenueEstimate: 136_000_000,
    netIncome: 337_200_000,
    holdingsAtQuarterEnd: 17631,
    sharesAtQuarterEnd: 267_000_000,
    holdingsPerShare: 0.0000660,
    source: "sec-filing",
    status: "reported",
  },

  // ========== Riot Platforms (RIOT) ==========
  // Q4 2025 - Upcoming
  {
    ticker: "RIOT",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-02-20",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },
  // Q3 2025
  {
    ticker: "RIOT",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    earningsDate: "2025-11-05",
    earningsTime: "AMC",
    epsActual: 0.29,
    epsEstimate: -0.18,
    revenueActual: 180_200_000,
    revenueEstimate: 125_000_000,
    netIncome: 104_500_000,
    holdingsAtQuarterEnd: 17429,
    sharesAtQuarterEnd: 378_000_000,
    holdingsPerShare: 0.0000461,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2025
  {
    ticker: "RIOT",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    earningsDate: "2025-07-30",
    earningsTime: "AMC",
    epsActual: -0.63,
    epsEstimate: -0.25,
    revenueActual: 70_000_000,
    revenueEstimate: 84_000_000,
    netIncome: -247_800_000,
    holdingsAtQuarterEnd: 15370,
    sharesAtQuarterEnd: 378_000_000,
    holdingsPerShare: 0.0000407,
    source: "sec-filing",
    status: "reported",
  },
  // Q1 2025
  {
    ticker: "RIOT",
    fiscalYear: 2025,
    fiscalQuarter: 1,
    earningsDate: "2025-04-30",
    earningsTime: "AMC",
    epsActual: -0.72,
    epsEstimate: -0.20,
    revenueActual: 68_200_000,
    revenueEstimate: 91_000_000,
    netIncome: -296_400_000,
    holdingsAtQuarterEnd: 19223,
    sharesAtQuarterEnd: 398_000_000,
    holdingsPerShare: 0.0000483,
    source: "sec-filing",
    status: "reported",
  },
  // Q4 2024
  {
    ticker: "RIOT",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    earningsDate: "2025-02-26",
    earningsTime: "AMC",
    epsActual: 0.50,
    epsEstimate: -0.18,
    revenueActual: 115_300_000,
    revenueEstimate: 113_000_000,
    netIncome: 166_100_000,
    holdingsAtQuarterEnd: 17722,
    sharesAtQuarterEnd: 340_000_000,
    holdingsPerShare: 0.0000521,
    source: "sec-filing",
    status: "reported",
  },
  // Q3 2024
  {
    ticker: "RIOT",
    fiscalYear: 2024,
    fiscalQuarter: 3,
    earningsDate: "2024-10-30",
    earningsTime: "AMC",
    epsActual: -0.54,
    epsEstimate: -0.18,
    revenueActual: 84_800_000,
    revenueEstimate: 95_000_000,
    netIncome: -154_400_000,
    holdingsAtQuarterEnd: 10427,
    sharesAtQuarterEnd: 328_000_000,
    holdingsPerShare: 0.0000318,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2024
  {
    ticker: "RIOT",
    fiscalYear: 2024,
    fiscalQuarter: 2,
    earningsDate: "2024-07-31",
    earningsTime: "AMC",
    epsActual: 0.32,
    epsEstimate: -0.19,
    revenueActual: 70_000_000,
    revenueEstimate: 77_000_000,
    netIncome: 127_300_000,
    holdingsAtQuarterEnd: 9334,
    sharesAtQuarterEnd: 283_000_000,
    holdingsPerShare: 0.0000330,
    source: "sec-filing",
    status: "reported",
  },
  // Q1 2024
  {
    ticker: "RIOT",
    fiscalYear: 2024,
    fiscalQuarter: 1,
    earningsDate: "2024-05-01",
    earningsTime: "AMC",
    epsActual: 0.25,
    epsEstimate: 0.02,
    revenueActual: 79_300_000,
    revenueEstimate: 72_000_000,
    netIncome: 211_800_000,
    holdingsAtQuarterEnd: 8872,
    sharesAtQuarterEnd: 280_000_000,
    holdingsPerShare: 0.0000317,
    source: "sec-filing",
    status: "reported",
  },

  // ========== CleanSpark (CLSK) - Fiscal Year ends September ==========
  // Q1 FY2026 - Upcoming
  {
    ticker: "CLSK",
    fiscalYear: 2026,
    fiscalQuarter: 1,
    earningsDate: "2026-02-05",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },
  // Q4 FY2025 (Oct-Dec 2024, reported Dec 2025)
  {
    ticker: "CLSK",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2025-12-09",
    earningsTime: "AMC",
    epsActual: 0.12,
    epsEstimate: -0.10,
    revenueActual: 162_300_000,
    revenueEstimate: 164_000_000,
    netIncome: 246_300_000,
    holdingsAtQuarterEnd: 10556,
    sharesAtQuarterEnd: 310_000_000,
    holdingsPerShare: 0.0000341,
    source: "sec-filing",
    status: "reported",
  },
  // Q3 FY2025 (Jul-Sep 2025)
  {
    ticker: "CLSK",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    earningsDate: "2025-08-12",
    earningsTime: "AMC",
    epsActual: -0.21,
    epsEstimate: -0.24,
    revenueActual: 104_100_000,
    revenueEstimate: 113_000_000,
    netIncome: -55_200_000,
    holdingsAtQuarterEnd: 8049,
    sharesAtQuarterEnd: 276_000_000,
    holdingsPerShare: 0.0000292,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 FY2025 (Apr-Jun 2025)
  {
    ticker: "CLSK",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    earningsDate: "2025-05-06",
    earningsTime: "AMC",
    epsActual: -0.30,
    epsEstimate: -0.15,
    revenueActual: 91_400_000,
    revenueEstimate: 114_000_000,
    netIncome: -77_200_000,
    holdingsAtQuarterEnd: 6100,
    sharesAtQuarterEnd: 263_000_000,
    holdingsPerShare: 0.0000232,
    source: "sec-filing",
    status: "reported",
  },
  // Q1 FY2025 (Jan-Mar 2025)
  {
    ticker: "CLSK",
    fiscalYear: 2025,
    fiscalQuarter: 1,
    earningsDate: "2025-02-11",
    earningsTime: "AMC",
    epsActual: 0.22,
    epsEstimate: -0.06,
    revenueActual: 162_000_000,
    revenueEstimate: 136_000_000,
    netIncome: 51_100_000,
    holdingsAtQuarterEnd: 6061,
    sharesAtQuarterEnd: 243_000_000,
    holdingsPerShare: 0.0000249,
    source: "sec-filing",
    status: "reported",
  },
  // Q4 FY2024 (Oct-Dec 2024)
  {
    ticker: "CLSK",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    earningsDate: "2024-12-10",
    earningsTime: "AMC",
    epsActual: -0.13,
    epsEstimate: -0.16,
    revenueActual: 104_500_000,
    revenueEstimate: 116_000_000,
    netIncome: -26_400_000,
    holdingsAtQuarterEnd: 8049,
    sharesAtQuarterEnd: 199_000_000,
    holdingsPerShare: 0.0000404,
    source: "sec-filing",
    status: "reported",
  },
  // Q3 FY2024 (Jul-Sep 2024)
  {
    ticker: "CLSK",
    fiscalYear: 2024,
    fiscalQuarter: 3,
    earningsDate: "2024-08-05",
    earningsTime: "AMC",
    epsActual: -0.04,
    epsEstimate: -0.18,
    revenueActual: 104_100_000,
    revenueEstimate: 87_000_000,
    netIncome: -7_000_000,
    holdingsAtQuarterEnd: 6154,
    sharesAtQuarterEnd: 173_000_000,
    holdingsPerShare: 0.0000356,
    source: "sec-filing",
    status: "reported",
  },

  // ========== Hut 8 (HUT) ==========
  // Q4 2025 - Upcoming
  {
    ticker: "HUT",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-03-13",
    earningsTime: "BMO",
    source: "sec-filing",
    status: "upcoming",
  },
  // Q3 2025
  {
    ticker: "HUT",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    earningsDate: "2025-11-14",
    earningsTime: "BMO",
    epsActual: 0.31,
    epsEstimate: 0.03,
    revenueActual: 51_700_000,
    revenueEstimate: 43_000_000,
    netIncome: 89_300_000,
    holdingsAtQuarterEnd: 9106,
    sharesAtQuarterEnd: 100_000_000,
    holdingsPerShare: 0.0000911,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2025
  {
    ticker: "HUT",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    earningsDate: "2025-08-13",
    earningsTime: "BMO",
    epsActual: -0.41,
    epsEstimate: -0.13,
    revenueActual: 35_200_000,
    revenueEstimate: 40_000_000,
    netIncome: -71_900_000,
    holdingsAtQuarterEnd: 9102,
    sharesAtQuarterEnd: 97_000_000,
    holdingsPerShare: 0.0000938,
    source: "sec-filing",
    status: "reported",
  },
  // Q1 2025
  {
    ticker: "HUT",
    fiscalYear: 2025,
    fiscalQuarter: 1,
    earningsDate: "2025-05-15",
    earningsTime: "BMO",
    epsActual: -0.40,
    epsEstimate: -0.11,
    revenueActual: 36_100_000,
    revenueEstimate: 44_000_000,
    netIncome: -93_700_000,
    holdingsAtQuarterEnd: 10264,
    sharesAtQuarterEnd: 96_000_000,
    holdingsPerShare: 0.0001069,
    source: "sec-filing",
    status: "reported",
  },
  // Q4 2024
  {
    ticker: "HUT",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    earningsDate: "2025-03-27",
    earningsTime: "BMO",
    epsActual: 0.55,
    epsEstimate: 0.10,
    revenueActual: 60_000_000,
    revenueEstimate: 54_000_000,
    netIncome: 95_800_000,
    holdingsAtQuarterEnd: 10096,
    sharesAtQuarterEnd: 95_000_000,
    holdingsPerShare: 0.0001063,
    source: "sec-filing",
    status: "reported",
  },
  // Q3 2024
  {
    ticker: "HUT",
    fiscalYear: 2024,
    fiscalQuarter: 3,
    earningsDate: "2024-11-14",
    earningsTime: "BMO",
    epsActual: -0.12,
    epsEstimate: -0.06,
    revenueActual: 43_700_000,
    revenueEstimate: 37_000_000,
    netIncome: -17_700_000,
    holdingsAtQuarterEnd: 9106,
    sharesAtQuarterEnd: 92_000_000,
    holdingsPerShare: 0.0000990,
    source: "sec-filing",
    status: "reported",
  },

  // ========== Core Scientific (CORZ) ==========
  // Q4 2025 - Upcoming
  {
    ticker: "CORZ",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-02-12",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },
  // Q3 2025
  {
    ticker: "CORZ",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    earningsDate: "2025-11-06",
    earningsTime: "AMC",
    epsActual: 0.19,
    epsEstimate: 0.02,
    revenueActual: 155_000_000,
    revenueEstimate: 150_000_000,
    netIncome: 52_000_000,
    holdingsAtQuarterEnd: 500,
    sharesAtQuarterEnd: 280_000_000,
    holdingsPerShare: 0.0000018,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2025
  {
    ticker: "CORZ",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    earningsDate: "2025-08-07",
    earningsTime: "AMC",
    epsActual: -0.07,
    epsEstimate: -0.08,
    revenueActual: 141_300_000,
    revenueEstimate: 147_000_000,
    netIncome: -17_900_000,
    holdingsAtQuarterEnd: 500,
    sharesAtQuarterEnd: 275_000_000,
    holdingsPerShare: 0.0000018,
    source: "sec-filing",
    status: "reported",
  },
  // Q1 2025
  {
    ticker: "CORZ",
    fiscalYear: 2025,
    fiscalQuarter: 1,
    earningsDate: "2025-05-08",
    earningsTime: "AMC",
    epsActual: -0.06,
    epsEstimate: -0.05,
    revenueActual: 115_700_000,
    revenueEstimate: 124_000_000,
    netIncome: -15_500_000,
    holdingsAtQuarterEnd: 500,
    sharesAtQuarterEnd: 270_000_000,
    holdingsPerShare: 0.0000019,
    source: "sec-filing",
    status: "reported",
  },
  // Q4 2024
  {
    ticker: "CORZ",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    earningsDate: "2025-02-27",
    earningsTime: "AMC",
    epsActual: 0.07,
    epsEstimate: -0.03,
    revenueActual: 95_100_000,
    revenueEstimate: 93_000_000,
    netIncome: 16_300_000,
    holdingsAtQuarterEnd: 500,
    sharesAtQuarterEnd: 264_000_000,
    holdingsPerShare: 0.0000019,
    source: "sec-filing",
    status: "reported",
  },

  // ========== Bitdeer (BTDR) ==========
  // Q4 2025 - Upcoming
  {
    ticker: "BTDR",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-03-05",
    earningsTime: "BMO",
    source: "sec-filing",
    status: "upcoming",
  },
  // Q3 2025
  {
    ticker: "BTDR",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    earningsDate: "2025-11-18",
    earningsTime: "BMO",
    epsActual: -0.24,
    epsEstimate: -0.28,
    revenueActual: 99_200_000,
    revenueEstimate: 112_000_000,
    netIncome: -44_200_000,
    holdingsAtQuarterEnd: 724,
    sharesAtQuarterEnd: 178_000_000,
    holdingsPerShare: 0.0000041,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2025
  {
    ticker: "BTDR",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    earningsDate: "2025-08-13",
    earningsTime: "BMO",
    epsActual: -0.35,
    epsEstimate: -0.32,
    revenueActual: 82_900_000,
    revenueEstimate: 92_000_000,
    netIncome: -59_500_000,
    holdingsAtQuarterEnd: 700,
    sharesAtQuarterEnd: 170_000_000,
    holdingsPerShare: 0.0000041,
    source: "sec-filing",
    status: "reported",
  },
  // Q4 2024
  {
    ticker: "BTDR",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    earningsDate: "2025-03-11",
    earningsTime: "BMO",
    epsActual: -0.16,
    epsEstimate: -0.19,
    revenueActual: 113_000_000,
    revenueEstimate: 105_000_000,
    netIncome: -23_700_000,
    holdingsAtQuarterEnd: 724,
    sharesAtQuarterEnd: 143_000_000,
    holdingsPerShare: 0.0000051,
    source: "sec-filing",
    status: "reported",
  },
  // Q3 2024
  {
    ticker: "BTDR",
    fiscalYear: 2024,
    fiscalQuarter: 3,
    earningsDate: "2024-11-19",
    earningsTime: "BMO",
    epsActual: -0.46,
    epsEstimate: -0.38,
    revenueActual: 62_100_000,
    revenueEstimate: 65_000_000,
    netIncome: -50_300_000,
    holdingsAtQuarterEnd: 573,
    sharesAtQuarterEnd: 141_000_000,
    holdingsPerShare: 0.0000041,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2024
  {
    ticker: "BTDR",
    fiscalYear: 2024,
    fiscalQuarter: 2,
    earningsDate: "2024-08-16",
    earningsTime: "BMO",
    epsActual: -0.12,
    epsEstimate: -0.17,
    revenueActual: 93_000_000,
    revenueEstimate: 88_000_000,
    netIncome: -13_700_000,
    holdingsAtQuarterEnd: 485,
    sharesAtQuarterEnd: 135_000_000,
    holdingsPerShare: 0.0000036,
    source: "sec-filing",
    status: "reported",
  },

  // ========== KULR Technology (KULR) ==========
  // Q4 2025 - Upcoming
  {
    ticker: "KULR",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-03-27",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },
  // Q3 2025
  {
    ticker: "KULR",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    earningsDate: "2025-11-13",
    earningsTime: "AMC",
    epsActual: -0.03,
    epsEstimate: -0.04,
    revenueActual: 3_800_000,
    revenueEstimate: 4_500_000,
    netIncome: -5_300_000,
    holdingsAtQuarterEnd: 610,
    sharesAtQuarterEnd: 260_000_000,
    holdingsPerShare: 0.0000023,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2025
  {
    ticker: "KULR",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    earningsDate: "2025-08-11",
    earningsTime: "AMC",
    epsActual: -0.04,
    epsEstimate: -0.04,
    revenueActual: 3_600_000,
    revenueEstimate: 4_000_000,
    netIncome: -7_900_000,
    holdingsAtQuarterEnd: 430,
    sharesAtQuarterEnd: 248_000_000,
    holdingsPerShare: 0.0000017,
    source: "sec-filing",
    status: "reported",
  },
  // Q4 2024
  {
    ticker: "KULR",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    earningsDate: "2025-03-31",
    earningsTime: "AMC",
    epsActual: -0.04,
    epsEstimate: -0.04,
    revenueActual: 4_200_000,
    revenueEstimate: 4_500_000,
    netIncome: -6_200_000,
    holdingsAtQuarterEnd: 510,
    sharesAtQuarterEnd: 234_000_000,
    holdingsPerShare: 0.0000022,
    source: "sec-filing",
    status: "reported",
  },

  // ========== Semler Scientific (SMLR) ==========
  // Q4 2025 - Upcoming
  {
    ticker: "SMLR",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-02-27",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },
  // Q3 2025
  {
    ticker: "SMLR",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    earningsDate: "2025-11-07",
    earningsTime: "AMC",
    epsActual: -3.14,
    epsEstimate: 0.15,
    revenueActual: 17_000_000,
    revenueEstimate: 14_000_000,
    netIncome: -24_500_000,
    holdingsAtQuarterEnd: 2058,
    sharesAtQuarterEnd: 7_600_000,
    holdingsPerShare: 0.0002708,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2025
  {
    ticker: "SMLR",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    earningsDate: "2025-08-08",
    earningsTime: "AMC",
    epsActual: -1.23,
    epsEstimate: 0.20,
    revenueActual: 16_900_000,
    revenueEstimate: 14_000_000,
    netIncome: -8_700_000,
    holdingsAtQuarterEnd: 2084,
    sharesAtQuarterEnd: 7_400_000,
    holdingsPerShare: 0.0002816,
    source: "sec-filing",
    status: "reported",
  },
  // Q1 2025
  {
    ticker: "SMLR",
    fiscalYear: 2025,
    fiscalQuarter: 1,
    earningsDate: "2025-05-08",
    earningsTime: "AMC",
    epsActual: -2.71,
    epsEstimate: 0.05,
    revenueActual: 12_300_000,
    revenueEstimate: 14_000_000,
    netIncome: -19_600_000,
    holdingsAtQuarterEnd: 3082,
    sharesAtQuarterEnd: 7_300_000,
    holdingsPerShare: 0.0004222,
    source: "sec-filing",
    status: "reported",
  },
  // Q4 2024
  {
    ticker: "SMLR",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    earningsDate: "2025-03-06",
    earningsTime: "AMC",
    epsActual: 0.57,
    epsEstimate: 0.08,
    revenueActual: 17_500_000,
    revenueEstimate: 14_000_000,
    netIncome: 4_000_000,
    holdingsAtQuarterEnd: 2321,
    sharesAtQuarterEnd: 7_100_000,
    holdingsPerShare: 0.0003269,
    source: "sec-filing",
    status: "reported",
  },

  // ========== Strive Asset (ASST) ==========
  // Q4 2025 - Upcoming
  {
    ticker: "ASST",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-03-15",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },
  // Q3 2025
  {
    ticker: "ASST",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    earningsDate: "2025-11-14",
    earningsTime: "AMC",
    epsActual: -0.08,
    epsEstimate: -0.10,
    revenueActual: 500_000,
    revenueEstimate: 800_000,
    netIncome: -2_100_000,
    holdingsAtQuarterEnd: 250,
    sharesAtQuarterEnd: 28_000_000,
    holdingsPerShare: 0.0000089,
    source: "sec-filing",
    status: "reported",
  },

  // ========== DJT / Trump Media ==========
  // Q4 2025 - Upcoming
  {
    ticker: "DJT",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-03-20",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },
  // Q3 2025
  {
    ticker: "DJT",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    earningsDate: "2025-11-08",
    earningsTime: "AMC",
    epsActual: -0.10,
    epsEstimate: -0.08,
    revenueActual: 1_000_000,
    revenueEstimate: 2_500_000,
    netIncome: -19_200_000,
    holdingsAtQuarterEnd: 0,
    sharesAtQuarterEnd: 195_000_000,
    holdingsPerShare: 0,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2025
  {
    ticker: "DJT",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    earningsDate: "2025-08-08",
    earningsTime: "AMC",
    epsActual: -0.09,
    epsEstimate: -0.07,
    revenueActual: 900_000,
    revenueEstimate: 2_000_000,
    netIncome: -16_400_000,
    holdingsAtQuarterEnd: 0,
    sharesAtQuarterEnd: 195_000_000,
    holdingsPerShare: 0,
    source: "sec-filing",
    status: "reported",
  },

  // ========== Metaplanet (3350.T) ==========
  // Q4 FY2024 - Upcoming
  {
    ticker: "3350.T",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    earningsDate: "2026-02-14",
    earningsTime: null,
    source: "press-release",
    status: "upcoming",
  },
  // Q3 FY2024
  {
    ticker: "3350.T",
    fiscalYear: 2024,
    fiscalQuarter: 3,
    earningsDate: "2025-11-14",
    earningsTime: null,
    epsActual: 12.5,
    revenueActual: 890_000_000,
    netIncome: 540_000_000,
    holdingsAtQuarterEnd: 1762,
    sharesAtQuarterEnd: 37_000_000,
    holdingsPerShare: 0.0000476,
    source: "press-release",
    status: "reported",
  },
  // Q2 FY2024
  {
    ticker: "3350.T",
    fiscalYear: 2024,
    fiscalQuarter: 2,
    earningsDate: "2025-08-14",
    earningsTime: null,
    epsActual: 8.2,
    revenueActual: 540_000_000,
    netIncome: 280_000_000,
    holdingsAtQuarterEnd: 530,
    sharesAtQuarterEnd: 25_000_000,
    holdingsPerShare: 0.0000212,
    source: "press-release",
    status: "reported",
  },

  // ==================== ETH COMPANIES ====================

  // ========== Bitmine Immersion (BMNR) ==========
  // Q4 2025 - Upcoming
  {
    ticker: "BMNR",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-02-28",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },

  // ========== BTCS Inc (BTCS) ==========
  // Q4 2025 - Upcoming
  {
    ticker: "BTCS",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-03-20",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },
  // Q3 2025
  {
    ticker: "BTCS",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    earningsDate: "2025-11-13",
    earningsTime: "AMC",
    epsActual: -0.03,
    epsEstimate: -0.02,
    revenueActual: 1_600_000,
    revenueEstimate: 1_800_000,
    netIncome: -500_000,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2025
  {
    ticker: "BTCS",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    earningsDate: "2025-08-12",
    earningsTime: "AMC",
    epsActual: -0.04,
    epsEstimate: -0.03,
    revenueActual: 1_400_000,
    revenueEstimate: 1_600_000,
    netIncome: -700_000,
    source: "sec-filing",
    status: "reported",
  },
  // Q4 2024
  {
    ticker: "BTCS",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    earningsDate: "2025-03-27",
    earningsTime: "AMC",
    epsActual: 0.05,
    epsEstimate: -0.02,
    revenueActual: 2_500_000,
    revenueEstimate: 1_900_000,
    netIncome: 900_000,
    source: "sec-filing",
    status: "reported",
  },

  // ========== Bit Digital (BTBT) ==========
  // Q4 2025 - Upcoming
  {
    ticker: "BTBT",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-03-12",
    earningsTime: "BMO",
    source: "sec-filing",
    status: "upcoming",
  },
  // Q3 2025
  {
    ticker: "BTBT",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    earningsDate: "2025-11-13",
    earningsTime: "BMO",
    epsActual: 0.03,
    epsEstimate: -0.01,
    revenueActual: 28_800_000,
    revenueEstimate: 25_000_000,
    netIncome: 4_100_000,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2025
  {
    ticker: "BTBT",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    earningsDate: "2025-08-13",
    earningsTime: "BMO",
    epsActual: -0.05,
    epsEstimate: -0.03,
    revenueActual: 22_500_000,
    revenueEstimate: 24_000_000,
    netIncome: -8_500_000,
    source: "sec-filing",
    status: "reported",
  },

  // ==================== SOL COMPANIES ====================

  // ========== Sol Strategies (STKE) ==========
  // Q4 2025 - Upcoming
  {
    ticker: "STKE",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-03-28",
    earningsTime: null,
    source: "press-release",
    status: "upcoming",
  },
  // Q3 2025
  {
    ticker: "STKE",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    earningsDate: "2025-11-28",
    earningsTime: null,
    epsActual: -0.02,
    revenueActual: 1_200_000,
    netIncome: -800_000,
    source: "press-release",
    status: "reported",
  },
  // Q2 2025
  {
    ticker: "STKE",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    earningsDate: "2025-08-29",
    earningsTime: null,
    epsActual: -0.03,
    revenueActual: 900_000,
    netIncome: -1_100_000,
    source: "press-release",
    status: "reported",
  },

  // ========== DeFi Development Corp (DFDV) ==========
  // Q4 2025 - Upcoming
  {
    ticker: "DFDV",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-03-15",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },
  // Q3 2025
  {
    ticker: "DFDV",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    earningsDate: "2025-11-14",
    earningsTime: "AMC",
    epsActual: -0.15,
    epsEstimate: -0.12,
    revenueActual: 200_000,
    revenueEstimate: 400_000,
    netIncome: -2_800_000,
    source: "sec-filing",
    status: "reported",
  },
  // Q2 2025
  {
    ticker: "DFDV",
    fiscalYear: 2025,
    fiscalQuarter: 2,
    earningsDate: "2025-08-14",
    earningsTime: "AMC",
    epsActual: -0.18,
    epsEstimate: -0.14,
    revenueActual: 150_000,
    revenueEstimate: 350_000,
    netIncome: -3_200_000,
    source: "sec-filing",
    status: "reported",
  },
];

// Helper: Get days until a date
function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateStr);
  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Get earnings calendar entries
export function getEarningsCalendar(options?: {
  days?: number;
  asset?: Asset;
  upcoming?: boolean;
}): EarningsCalendarEntry[] {
  const { days = 90, asset, upcoming = true } = options || {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const entries: EarningsCalendarEntry[] = [];

  for (const earnings of EARNINGS_DATA) {
    const daysUntil = getDaysUntil(earnings.earningsDate);

    // Filter by upcoming/past
    if (upcoming && daysUntil < 0) continue;
    if (!upcoming && daysUntil >= 0) continue;

    // Filter by days range
    if (Math.abs(daysUntil) > days) continue;

    // Find company
    const company = allCompanies.find((c) => c.ticker === earnings.ticker);
    if (!company) continue;

    // Filter by asset
    if (asset && company.asset !== asset) continue;

    // Calculate EPS surprise if reported
    let epsSurprisePct: number | undefined;
    if (earnings.status === "reported" && earnings.epsActual !== undefined && earnings.epsEstimate !== undefined && earnings.epsEstimate !== 0) {
      epsSurprisePct = ((earnings.epsActual - earnings.epsEstimate) / Math.abs(earnings.epsEstimate)) * 100;
    }

    // Calculate holdings per share growth from holdings history
    let holdingsPerShareGrowth: number | undefined;
    const history = HOLDINGS_HISTORY[earnings.ticker];
    if (history) {
      const growth = calculateHoldingsGrowth(history.history);
      if (growth) {
        // Use annualized growth for comparable metric
        holdingsPerShareGrowth = growth.annualizedGrowth;
      }
    }

    entries.push({
      ticker: earnings.ticker,
      companyName: company.name,
      asset: company.asset,
      earningsDate: earnings.earningsDate,
      earningsTime: earnings.earningsTime,
      status: earnings.status,
      daysUntil,
      epsSurprisePct,
      holdingsPerShareGrowth,
    });
  }

  // Sort by date (upcoming: soonest first, past: most recent first)
  entries.sort((a, b) => {
    if (upcoming) {
      return a.daysUntil - b.daysUntil;
    }
    return b.daysUntil - a.daysUntil;
  });

  return entries;
}

// Target days for each period, with max allowed span (2x target)
const PERIOD_CONFIG: Record<string, { target: number; max: number }> = {
  "1W": { target: 7, max: 14 },
  "1M": { target: 30, max: 60 },
  "3M": { target: 90, max: 180 },
  "1Y": { target: 365, max: 730 },
};

// Get treasury yield leaderboard
// Find data points that best approximate each period and calculate growth
export function getTreasuryYieldLeaderboard(options?: {
  period?: "1W" | "1M" | "3M" | "1Y";
  asset?: Asset;
}): TreasuryYieldMetrics[] {
  const { period = "1Y", asset } = options || {};
  const metrics: TreasuryYieldMetrics[] = [];
  const config = PERIOD_CONFIG[period];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Target start date (e.g., 7 days ago for weekly)
  const targetStart = new Date(today);
  targetStart.setDate(targetStart.getDate() - config.target);

  for (const [ticker, data] of Object.entries(HOLDINGS_HISTORY)) {
    if (data.history.length < 2) continue;

    const company = allCompanies.find((c) => c.ticker === ticker);
    if (!company) continue;

    if (asset && company.asset !== asset) continue;

    const history = data.history;

    // Find the most recent data point
    const latest = history[history.length - 1];
    const latestDate = new Date(latest.date);

    // Latest data must be somewhat recent (within 30 days)
    const daysSinceLatest = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLatest > 30) continue;

    // Find the data point closest to our target start date
    let startSnapshot = null;
    let bestStartDiff = Infinity;

    for (const snapshot of history) {
      if (snapshot.date === latest.date) continue;
      const snapshotDate = new Date(snapshot.date);

      // Must be before the latest snapshot
      if (snapshotDate >= latestDate) continue;

      const diffFromTarget = Math.abs(snapshotDate.getTime() - targetStart.getTime());
      if (diffFromTarget < bestStartDiff) {
        bestStartDiff = diffFromTarget;
        startSnapshot = snapshot;
      }
    }

    if (!startSnapshot) continue;
    if (startSnapshot.holdingsPerShare <= 0) continue;

    const startDate = new Date(startSnapshot.date);
    const endDate = latestDate;
    const daysCovered = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Data span must be reasonable for this period (not more than 2x target)
    if (daysCovered <= 0 || daysCovered > config.max) continue;

    // Calculate actual growth over the data span
    const growthPct = ((latest.holdingsPerShare / startSnapshot.holdingsPerShare) - 1) * 100;

    // Annualized growth for comparison
    const dailyRate = growthPct / 100 / daysCovered;
    const annualizedGrowthPct = dailyRate * 365 * 100;

    metrics.push({
      ticker,
      companyName: company.name,
      asset: company.asset,
      period,
      holdingsPerShareStart: startSnapshot.holdingsPerShare,
      holdingsPerShareEnd: latest.holdingsPerShare,
      growthPct,
      annualizedGrowthPct,
      startDate: startSnapshot.date,
      endDate: latest.date,
      daysCovered,
    });
  }

  // Sort by growth (descending) and add rank
  metrics.sort((a, b) => b.growthPct - a.growthPct);
  metrics.forEach((m, i) => {
    m.rank = i + 1;
  });

  return metrics;
}

// Helper: Get quarter date boundaries
function getQuarterBounds(quarter: CalendarQuarter): { start: Date; end: Date } {
  const match = quarter.match(/Q([1-4])-(\d{4})/);
  if (!match) throw new Error(`Invalid quarter format: ${quarter}`);

  const q = parseInt(match[1]);
  const year = parseInt(match[2]);

  // Quarter start/end dates
  const quarters: Record<number, { startMonth: number; endMonth: number }> = {
    1: { startMonth: 0, endMonth: 2 },   // Jan-Mar
    2: { startMonth: 3, endMonth: 5 },   // Apr-Jun
    3: { startMonth: 6, endMonth: 8 },   // Jul-Sep
    4: { startMonth: 9, endMonth: 11 },  // Oct-Dec
  };

  const { startMonth, endMonth } = quarters[q];
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, endMonth + 1, 0); // Last day of end month

  return { start, end };
}

// Get available quarters based on holdings data
export function getAvailableQuarters(): CalendarQuarter[] {
  const quarters = new Set<CalendarQuarter>();
  const today = new Date();

  // Go back 2 years
  for (let year = today.getFullYear(); year >= today.getFullYear() - 2; year--) {
    for (let q = 4; q >= 1; q--) {
      const quarter = `Q${q}-${year}` as CalendarQuarter;
      const { end } = getQuarterBounds(quarter);

      // Only include quarters that have ended
      if (end <= today) {
        quarters.add(quarter);
      }
    }
  }

  // Sort by most recent first
  return Array.from(quarters).sort((a, b) => {
    const [qA, yA] = a.split('-').map((x, i) => i === 0 ? parseInt(x.slice(1)) : parseInt(x));
    const [qB, yB] = b.split('-').map((x, i) => i === 0 ? parseInt(x.slice(1)) : parseInt(x));
    if (yA !== yB) return yB - yA;
    return qB - qA;
  });
}

// Helper: Linear interpolation of holdingsPerShare at a target date
function interpolateHoldingsPerShare(
  before: { date: string; holdingsPerShare: number },
  after: { date: string; holdingsPerShare: number },
  targetDate: Date
): number {
  const beforeDate = new Date(before.date);
  const afterDate = new Date(after.date);

  // If target equals one of the dates, return that value
  if (targetDate.getTime() === beforeDate.getTime()) return before.holdingsPerShare;
  if (targetDate.getTime() === afterDate.getTime()) return after.holdingsPerShare;

  // Linear interpolation
  const totalDays = (afterDate.getTime() - beforeDate.getTime()) / (1000 * 60 * 60 * 24);
  const daysFromStart = (targetDate.getTime() - beforeDate.getTime()) / (1000 * 60 * 60 * 24);
  const ratio = daysFromStart / totalDays;

  return before.holdingsPerShare + (after.holdingsPerShare - before.holdingsPerShare) * ratio;
}

// Get treasury yield for a specific calendar quarter
// Uses interpolation to normalize all companies to exact quarter boundaries
export function getQuarterlyYieldLeaderboard(options?: {
  quarter?: CalendarQuarter;
  asset?: Asset;
}): TreasuryYieldMetrics[] {
  const { quarter = getAvailableQuarters()[0], asset } = options || {};
  const metrics: TreasuryYieldMetrics[] = [];

  const { start: quarterStart, end: quarterEnd } = getQuarterBounds(quarter);
  const quarterStartStr = quarterStart.toISOString().split('T')[0];
  const quarterEndStr = quarterEnd.toISOString().split('T')[0];

  for (const [ticker, data] of Object.entries(HOLDINGS_HISTORY)) {
    if (data.history.length < 2) continue;

    const company = allCompanies.find((c) => c.ticker === ticker);
    if (!company) continue;

    if (asset && company.asset !== asset) continue;

    const history = data.history;

    // Find snapshots that bracket quarter start (one before, one after)
    // Need data within 60 days before AND 60 days after quarter start
    let beforeStart = null;
    let afterStart = null;
    const tolerance = 60 * 24 * 60 * 60 * 1000; // 60 days

    for (let i = 0; i < history.length; i++) {
      const snapshotDate = new Date(history[i].date);

      if (snapshotDate <= quarterStart) {
        // Check if within tolerance
        if (quarterStart.getTime() - snapshotDate.getTime() <= tolerance) {
          beforeStart = history[i];
        }
      } else if (snapshotDate > quarterStart && !afterStart) {
        // First snapshot after quarter start
        if (snapshotDate.getTime() - quarterStart.getTime() <= tolerance) {
          afterStart = history[i];
        }
      }
    }

    // Find snapshots that bracket quarter end
    let beforeEnd = null;
    let afterEnd = null;

    for (let i = 0; i < history.length; i++) {
      const snapshotDate = new Date(history[i].date);

      if (snapshotDate <= quarterEnd) {
        if (quarterEnd.getTime() - snapshotDate.getTime() <= tolerance) {
          beforeEnd = history[i];
        }
      } else if (snapshotDate > quarterEnd && !afterEnd) {
        if (snapshotDate.getTime() - quarterEnd.getTime() <= tolerance) {
          afterEnd = history[i];
        }
      }
    }

    // Need at least one snapshot on each side of both boundaries to interpolate
    // Or exact matches at the boundaries
    let startValue: number | null = null;
    let endValue: number | null = null;

    // Calculate start value (at quarter start)
    // Prefer interpolation, fall back to nearby data if needed
    if (beforeStart && afterStart) {
      // Can interpolate
      startValue = interpolateHoldingsPerShare(beforeStart, afterStart, quarterStart);
    } else if (beforeStart && new Date(beforeStart.date).getTime() === quarterStart.getTime()) {
      // Exact match
      startValue = beforeStart.holdingsPerShare;
    } else if (afterStart && new Date(afterStart.date).getTime() === quarterStart.getTime()) {
      // Exact match
      startValue = afterStart.holdingsPerShare;
    } else if (beforeStart && !afterStart) {
      // Fallback: use nearby data before (within 30 days)
      const daysBefore = (quarterStart.getTime() - new Date(beforeStart.date).getTime()) / (1000 * 60 * 60 * 24);
      if (daysBefore <= 30) {
        startValue = beforeStart.holdingsPerShare;
      }
    } else if (afterStart && !beforeStart) {
      // Fallback: use nearby data after (within 30 days)
      const daysAfter = (new Date(afterStart.date).getTime() - quarterStart.getTime()) / (1000 * 60 * 60 * 24);
      if (daysAfter <= 30) {
        startValue = afterStart.holdingsPerShare;
      }
    }

    // Calculate end value (at quarter end)
    // Prefer interpolation, fall back to nearby data if needed
    if (beforeEnd && afterEnd) {
      // Can interpolate
      endValue = interpolateHoldingsPerShare(beforeEnd, afterEnd, quarterEnd);
    } else if (beforeEnd && new Date(beforeEnd.date).getTime() === quarterEnd.getTime()) {
      // Exact match
      endValue = beforeEnd.holdingsPerShare;
    } else if (afterEnd && new Date(afterEnd.date).getTime() === quarterEnd.getTime()) {
      // Exact match
      endValue = afterEnd.holdingsPerShare;
    } else if (beforeEnd && !afterEnd) {
      // Fallback: use nearby data before (within 30 days)
      const daysBefore = (quarterEnd.getTime() - new Date(beforeEnd.date).getTime()) / (1000 * 60 * 60 * 24);
      if (daysBefore <= 30) {
        endValue = beforeEnd.holdingsPerShare;
      }
    } else if (afterEnd && !beforeEnd) {
      // Fallback: use nearby data after (within 30 days)
      const daysAfter = (new Date(afterEnd.date).getTime() - quarterEnd.getTime()) / (1000 * 60 * 60 * 24);
      if (daysAfter <= 30) {
        endValue = afterEnd.holdingsPerShare;
      }
    }

    // Skip if we couldn't determine values at both boundaries
    if (startValue === null || endValue === null) continue;
    if (startValue <= 0) continue;

    // All quarters are now exactly the same period
    const daysCovered = Math.floor((quarterEnd.getTime() - quarterStart.getTime()) / (1000 * 60 * 60 * 24));
    const growthPct = ((endValue / startValue) - 1) * 100;

    // Annualized only with 12+ months (won't apply to single quarters)
    let annualizedGrowthPct: number | undefined;
    if (daysCovered >= 330) {
      const yearsFraction = daysCovered / 365.25;
      annualizedGrowthPct = (Math.pow(endValue / startValue, 1 / yearsFraction) - 1) * 100;
    }

    metrics.push({
      ticker,
      companyName: company.name,
      asset: company.asset,
      period: quarter,
      holdingsPerShareStart: startValue,
      holdingsPerShareEnd: endValue,
      growthPct,
      annualizedGrowthPct,
      startDate: quarterStartStr,
      endDate: quarterEndStr,
      daysCovered,
    });
  }

  // Sort by growth (descending) and add rank
  metrics.sort((a, b) => b.growthPct - a.growthPct);
  metrics.forEach((m, i) => {
    m.rank = i + 1;
  });

  return metrics;
}

// Get earnings for a specific company
export function getCompanyEarnings(ticker: string): EarningsRecord[] {
  return EARNINGS_DATA
    .filter((e) => e.ticker === ticker)
    .sort((a, b) => {
      // Sort by date descending (most recent first)
      return new Date(b.earningsDate).getTime() - new Date(a.earningsDate).getTime();
    });
}

// Get next upcoming earnings for a company
export function getNextEarnings(ticker: string): EarningsRecord | null {
  const upcoming = EARNINGS_DATA
    .filter((e) => e.ticker === ticker && e.status !== "reported")
    .sort((a, b) => new Date(a.earningsDate).getTime() - new Date(b.earningsDate).getTime());

  return upcoming[0] || null;
}
