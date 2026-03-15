/**
 * Dilutive Instruments Tracking
 *
 * This file tracks convertible notes, options, and warrants for each company.
 * Used to calculate effective diluted shares based on current stock price.
 *
 * Methodology:
 * - If instrument's strikePrice < currentStockPrice → "in the money" → include in diluted count
 * - If instrument's strikePrice > currentStockPrice → "out of the money" → exclude
 *
 * Each instrument has full provenance (source, sourceUrl) for verification.
 */

export type InstrumentType = "convertible" | "option" | "warrant" | "preferred" | "rsu" | "free_shares";

// Settlement type for convertible instruments
// Determines how debt is adjusted when the instrument is in-the-money
export type SettlementType =
  | "full_share"      // Company must deliver shares for full value (faceValue removed from debt entirely)
  | "net_share"       // Principal settled in cash, only excess value delivered in shares (faceValue stays in debt)
  | "cash_only"       // Settled entirely in cash (no share dilution, faceValue stays in debt)
  | "issuer_election"; // Company chooses settlement method (conservative: treat as net_share)

export interface DilutiveInstrument {
  type: InstrumentType;
  strikePrice: number; // Conversion or exercise price in USD
  potentialShares: number; // Number of shares if fully converted/exercised
  faceValue?: number; // Face/principal value in USD (for convertibles - used to adjust debt)
  settlementType?: SettlementType; // How the convertible settles (default: full_share for backwards compat)
  source: string; // e.g., "8-K Jul 2025", "10-Q Q3 2025"
  sourceUrl: string; // Link to SEC filing or primary source
  expiration?: string; // ISO date when instrument expires/matures (optional)
  issuedDate?: string; // ISO date when instrument was issued (for historical tracking)
  notes?: string; // Additional context, e.g., "$150M convertible note"
  includedInBase?: boolean; // true if these shares are ALREADY counted in sharesForMnav (e.g., pre-funded warrants)
}

export interface EffectiveSharesResult {
  basic: number;
  diluted: number;
  inTheMoneyDebtValue: number; // Face value of ITM convertibles (subtract from debt to avoid double-counting)
  inTheMoneyWarrantProceeds: number; // Exercise proceeds from ITM warrants (add to CryptoNAV for symmetric treatment)
  breakdown: InstrumentBreakdown[];
}

export interface InstrumentBreakdown {
  type: InstrumentType;
  strikePrice: number;
  potentialShares: number;
  faceValue?: number; // For convertibles - principal amount
  inTheMoney: boolean;
  source: string;
  notes?: string;
}

/**
 * Dilutive instruments by ticker symbol.
 *
 * Companies without entries here will use basicShares directly.
 * Add instruments as they are discovered during company verification.
 */
export const dilutiveInstruments: Record<string, DilutiveInstrument[]> = {
  // BMNR (Bitmine Immersion) - ETH treasury company
  // Verified 2026-02-14 via 10-Q Q1 FY2026 (Note 10) + 8-K Sep 22 2025 (CVI)
  // Total potentially dilutive: 13,507,318 shares
  BMNR: [
    {
      type: "warrant",
      strikePrice: 10.0,
      potentialShares: 1_280,
      source: "10-Q Q1 FY2026 Note 10",
      sourceUrl:
        "/filings/bmnr/0001493152-26-002084",
      notes: "C-3 legacy warrants (pre-pivot). Strike unknown, using $10 estimate.",
    },
    {
      type: "warrant",
      strikePrice: 5.4,
      potentialShares: 3_043_654,
      source: "10-Q Q1 FY2026 Note 8",
      sourceUrl:
        "/filings/bmnr/0001493152-26-002084",
      issuedDate: "2025-07-10",
      notes: "Strategic Advisor + Placement Agent (ThinkEquity) warrants from $250M PIPE. 3,107,114 issued, 63,460 exercised, 3,043,654 remaining.",
    },
    {
      type: "warrant",
      strikePrice: 87.5,
      potentialShares: 10_435_430,
      source: "10-Q Q1 FY2026 Note 7 + 8-K Sep 22 2025",
      sourceUrl:
        "/filings/bmnr/0001493152-26-002084",
      issuedDate: "2025-09-22",
      expiration: "2027-03-22",
      notes: "CVI Warrants (liability-classified). Registered direct offering @ $70/share + warrants @ $87.50. Currently OTM. Fair value $98.6M at Nov 30.",
    },
    {
      type: "option",
      strikePrice: 0, // RSUs vest at $0
      potentialShares: 26_954,
      source: "10-Q Q1 FY2026 Note 10",
      sourceUrl:
        "/filings/bmnr/0001493152-26-002084",
      notes: "RSUs from 2025 Omnibus Incentive Plan (S-8 filed Feb 9, 2026)",
    },
  ],

  // SBET (Sharplink, Inc.) - ETH treasury company (renamed from SharpLink Gaming Feb 3, 2026)
  // Verified 2026-02-15 via SEC 10-Q Q3 2025 Note 8 (CIK 0001981535)
  // Note: 1:12 reverse split May 5, 2025 - all figures post-split adjusted
  //
  // XBRL NonOptionEquityInstrumentsOutstanding (18,116,449) = pre-funded + placement + strategic warrants + ~252 legacy/rounding
  // XBRL ClassOfWarrantOrRightOutstanding (3,455,019) = strategic advisor warrants only
  // Actual RSUs: 1,281,951 unvested (from RSU activity table in 10-Q)
  SBET: [
    // Strategic Advisor Warrants (Consensys) - 4 tranches with tiered strikes
    {
      type: "warrant",
      strikePrice: 6.15,
      potentialShares: 1_382_007,
      source: "10-Q Q3 2025 Note 8",
      sourceUrl:
        "/filings/sbet/0001493152-25-021970",
      notes: "Strategic Advisor Warrants tranche (i) - Consensys. Fully vested, nonforfeitable.",
    },
    {
      type: "warrant",
      strikePrice: 6.765,
      potentialShares: 691_004,
      source: "10-Q Q3 2025 Note 8",
      sourceUrl:
        "/filings/sbet/0001493152-25-021970",
      notes: "Strategic Advisor Warrants tranche (ii) - Consensys. Fully vested, nonforfeitable.",
    },
    {
      type: "warrant",
      strikePrice: 7.38,
      potentialShares: 691_004,
      source: "10-Q Q3 2025 Note 8",
      sourceUrl:
        "/filings/sbet/0001493152-25-021970",
      notes: "Strategic Advisor Warrants tranche (iii) - Consensys. Fully vested, nonforfeitable.",
    },
    {
      type: "warrant",
      strikePrice: 7.995,
      potentialShares: 691_004,
      source: "10-Q Q3 2025 Note 8",
      sourceUrl:
        "/filings/sbet/0001493152-25-021970",
      notes: "Strategic Advisor Warrants tranche (iv) - Consensys. Fully vested, nonforfeitable.",
    },
    // Placement Agent Warrants (ThinkEquity) from May 2025 PIPE
    {
      type: "warrant",
      strikePrice: 7.68,
      potentialShares: 2_764_013,
      source: "10-Q Q3 2025 Note 8",
      sourceUrl:
        "/filings/sbet/0001493152-25-021970",
      notes: "Placement agent warrants (ThinkEquity) from May 2025 PIPE. Fully vested.",
    },
    // Pre-Funded Warrants - exercise price $0.0001 (essentially free)
    {
      type: "warrant",
      strikePrice: 0.0001,
      potentialShares: 1_496_612,
      source: "10-Q Q3 2025 Note 8",
      sourceUrl:
        "/filings/sbet/0001493152-25-021970",
      notes: "Pre-funded warrants - Consensys ($4.5M registered offering). Always ITM.",
    },
    {
      type: "warrant",
      strikePrice: 0.0001,
      potentialShares: 3_966_340,
      source: "10-Q Q3 2025 Note 8",
      sourceUrl:
        "/filings/sbet/0001493152-25-021970",
      notes: "Pre-funded warrants - Consensys (PIPE offering). Always ITM.",
    },
    {
      type: "warrant",
      strikePrice: 0.0001,
      potentialShares: 6_434_213,
      source: "10-Q Q3 2025 Note 8",
      sourceUrl:
        "/filings/sbet/0001493152-25-021970",
      notes: "Pre-funded warrants - Joseph Lubin (PIPE offering). Always ITM.",
    },
    // Stock Options - deep OTM
    {
      type: "option",
      strikePrice: 91.06,
      potentialShares: 9_022,
      source: "10-Q Q3 2025 Note 8",
      sourceUrl:
        "/filings/sbet/0001493152-25-021970",
      notes: "Stock options - deep OTM at ~$10 stock price. Weighted avg exercise price $91.06.",
    },
    // RSUs - always ITM (vest at $0)
    {
      type: "option",
      strikePrice: 0, // RSUs vest at $0
      potentialShares: 1_281_951,
      source: "10-Q Q3 2025 Note 8 RSU activity table",
      sourceUrl:
        "/filings/sbet/0001493152-25-021970",
      notes: "Service-based RSUs (unvested). Weighted avg grant price $20.71. 2.84 years remaining.",
    },
    {
      type: "option",
      strikePrice: 0, // Performance RSUs vest at $0
      potentialShares: 115_069,
      source: "10-Q Q3 2025 Note 8",
      sourceUrl:
        "/filings/sbet/0001493152-25-021970",
      notes: "Performance-based RSUs (unvested). Granted to executive officers, 3-year vesting. Parameters not yet finalized.",
    },
  ],

  // SUIG (SUI Group Holdings) - SUI treasury company
  // Updated 2026-03-09 via SEC 10-K FY2025 (accession 0001654954-26-001672, filed Feb 27, 2026)
  // Treasury: 108,368,594 SUI (Feb 23, 2026) | Shares: 80,896,554 fully adjusted (Feb 23)
  // Common: 76,802,872 (Dec 31 XBRL, confirmed Feb 20) + PFW remaining: 4,093,682 = 80,896,554
  // PFW originally issued: 7,144,205 in PIPE. ~3,050,523 exercised as of Feb 23.
  // 10-K: "15,098,076 stock for issuance upon the exercise of various warrants" (includes PFWs)
  // Director warrants below vest over 24mo (starting 6mo from Jan 2026), 5-year exercise
  // 18 dilutive instruments:
  //   Director (Quintenz): 4 tranches, 207,565 shares
  //   Foundation investor: 4 tranches, 3,113,468 shares
  //   Pre-funded: 4,093,682 shares remaining (already in base count)
  //   Placement Agent (A.G.P.): 3,113,469 shares
  //   Karatage Lead Investor: 4 tranches, 3,113,468 shares
  //   Management: 3 tranches, 1,245,388 shares
  //   Advisor: 207,565 shares
  SUIG: [
    {
      type: "warrant",
      strikePrice: 5.42,
      potentialShares: 83_026,
      source: "8-K Jan 8, 2026",
      sourceUrl:
        "/filings/suig/0001654954-26-000203",
      expiration: "2031-01-05",
      issuedDate: "2026-01-05",
      notes: "Brian Quintenz director warrants (tranche 1) - vest 25% every 6mo starting Jul 2026",
    },
    {
      type: "warrant",
      strikePrice: 5.962,
      potentialShares: 41_513,
      source: "8-K Jan 8, 2026",
      sourceUrl:
        "/filings/suig/0001654954-26-000203",
      expiration: "2031-01-05",
      issuedDate: "2026-01-05",
      notes: "Brian Quintenz director warrants (tranche 2)",
    },
    {
      type: "warrant",
      strikePrice: 6.504,
      potentialShares: 41_513,
      source: "8-K Jan 8, 2026",
      sourceUrl:
        "/filings/suig/0001654954-26-000203",
      expiration: "2031-01-05",
      issuedDate: "2026-01-05",
      notes: "Brian Quintenz director warrants (tranche 3)",
    },
    {
      type: "warrant",
      strikePrice: 7.046,
      potentialShares: 41_513,
      source: "8-K Jan 8, 2026",
      sourceUrl:
        "/filings/suig/0001654954-26-000203",
      expiration: "2031-01-05",
      issuedDate: "2026-01-05",
      notes: "Brian Quintenz director warrants (tranche 4)",
    },
    // Sui Foundation Investor Warrants — 4 tranches totaling 3,113,468 shares
    // Source: Jul 31, 2025 8-K (accession 0001654954-25-008758) — PIPE closing
    // Vest over 24 months starting 6 months from issuance (25% every 6 months)
    {
      type: "warrant",
      strikePrice: 5.42,
      potentialShares: 1_245_387,
      source: "8-K Jul 31, 2025",
      sourceUrl:
        "/filings/suig/0001654954-25-008758",
      expiration: "2030-07-31",
      issuedDate: "2025-07-31",
      notes: "Sui Foundation investor warrants (tranche 1) - 1,245,387 shares @ $5.42",
    },
    {
      type: "warrant",
      strikePrice: 5.962,
      potentialShares: 1_245_387,
      source: "8-K Jul 31, 2025",
      sourceUrl:
        "/filings/suig/0001654954-25-008758",
      expiration: "2030-07-31",
      issuedDate: "2025-07-31",
      notes: "Sui Foundation investor warrants (tranche 2) - 1,245,387 shares @ $5.962",
    },
    {
      type: "warrant",
      strikePrice: 6.504,
      potentialShares: 415_129,
      source: "8-K Jul 31, 2025",
      sourceUrl:
        "/filings/suig/0001654954-25-008758",
      expiration: "2030-07-31",
      issuedDate: "2025-07-31",
      notes: "Sui Foundation investor warrants (tranche 3) - 415,129 shares @ $6.504",
    },
    {
      type: "warrant",
      strikePrice: 7.046,
      potentialShares: 207_565,
      source: "8-K Jul 31, 2025",
      sourceUrl:
        "/filings/suig/0001654954-25-008758",
      expiration: "2030-07-31",
      issuedDate: "2025-07-31",
      notes: "Sui Foundation investor warrants (tranche 4) - 207,565 shares @ $7.046",
    },
    // Pre-funded warrants: 4,093,682 remaining of 7,144,205 originally issued @ $0.0001
    // ~3,050,523 exercised (converted to common stock, offset by buybacks).
    // NOTE: These are ALREADY included in the 80,896,554 sharesForMnav base count.
    // Listed here for transparency/documentation only — do NOT double-count in diluted share calcs.
    {
      type: "warrant",
      strikePrice: 0.0001,
      potentialShares: 4_093_682,
      source: "SEC 10-K FY2025: 80,896,554 fully adjusted - 76,802,872 common = 4,093,682 PFW remaining",
      sourceUrl:
        "/filings/suig/0001654954-26-001672",
      expiration: "9999-12-31",  // No expiration (pre-funded)
      issuedDate: "2025-07-31",
      includedInBase: true,
      notes: "Pre-funded warrants (PFW) — 4,093,682 of 7,144,205 remain unexercised. Already included in 80,896,554 sharesForMnav base. Do NOT add to diluted count.",
    },
    // Placement Agent (A.G.P.) warrants — 3.75% of securities sold in PIPE
    {
      type: "warrant",
      strikePrice: 5.962,
      potentialShares: 3_113_469,
      source: "8-K Jul 31, 2025",
      sourceUrl:
        "/filings/suig/0001654954-25-008758",
      expiration: "2030-07-31",
      issuedDate: "2025-07-31",
      notes: "Placement Agent (A.G.P.) warrants — 3.75% of securities sold in PIPE",
    },
    // Karatage Lead Investor Warrants — 4 tranches totaling 3,113,468 shares
    // Source: Jul 31, 2025 8-K (accession 0001654954-25-008758) — PIPE closing
    {
      type: "warrant",
      strikePrice: 5.42,
      potentialShares: 1_245_387,
      source: "8-K Jul 31, 2025",
      sourceUrl:
        "/filings/suig/0001654954-25-008758",
      expiration: "2030-07-31",
      issuedDate: "2025-07-31",
      notes: "Lead Investor (Karatage Digital) warrants from PIPE closing (tranche 1) - 1,245,387 shares @ $5.42",
    },
    {
      type: "warrant",
      strikePrice: 5.962,
      potentialShares: 1_245_387,
      source: "8-K Jul 31, 2025",
      sourceUrl:
        "/filings/suig/0001654954-25-008758",
      expiration: "2030-07-31",
      issuedDate: "2025-07-31",
      notes: "Lead Investor (Karatage Digital) warrants from PIPE closing (tranche 2) - 1,245,387 shares @ $5.962",
    },
    {
      type: "warrant",
      strikePrice: 6.504,
      potentialShares: 415_129,
      source: "8-K Jul 31, 2025",
      sourceUrl:
        "/filings/suig/0001654954-25-008758",
      expiration: "2030-07-31",
      issuedDate: "2025-07-31",
      notes: "Lead Investor (Karatage Digital) warrants from PIPE closing (tranche 3) - 415,129 shares @ $6.504",
    },
    {
      type: "warrant",
      strikePrice: 7.046,
      potentialShares: 207_565,
      source: "8-K Jul 31, 2025",
      sourceUrl:
        "/filings/suig/0001654954-25-008758",
      expiration: "2030-07-31",
      issuedDate: "2025-07-31",
      notes: "Lead Investor (Karatage Digital) warrants from PIPE closing (tranche 4) - 207,565 shares @ $7.046",
    },
    // Management Warrants — 3 tranches totaling 1,245,388 shares
    // Source: Jul 31, 2025 8-K (accession 0001654954-25-008758) — PIPE closing
    {
      type: "warrant",
      strikePrice: 5.42,
      potentialShares: 622_694,
      source: "8-K Jul 31, 2025",
      sourceUrl:
        "/filings/suig/0001654954-25-008758",
      expiration: "2030-07-31",
      issuedDate: "2025-07-31",
      notes: "Management warrants from PIPE closing (tranche 1) - 622,694 shares @ $5.42",
    },
    {
      type: "warrant",
      strikePrice: 6.504,
      potentialShares: 415_129,
      source: "8-K Jul 31, 2025",
      sourceUrl:
        "/filings/suig/0001654954-25-008758",
      expiration: "2030-07-31",
      issuedDate: "2025-07-31",
      notes: "Management warrants from PIPE closing (tranche 2) - 415,129 shares @ $6.504",
    },
    {
      type: "warrant",
      strikePrice: 7.046,
      potentialShares: 207_565,
      source: "8-K Jul 31, 2025",
      sourceUrl:
        "/filings/suig/0001654954-25-008758",
      expiration: "2030-07-31",
      issuedDate: "2025-07-31",
      notes: "Management warrants from PIPE closing (tranche 3) - 207,565 shares @ $7.046",
    },
    // Advisor Warrants — 207,565 shares
    // Source: Jul 31, 2025 8-K (accession 0001654954-25-008758) — PIPE closing
    {
      type: "warrant",
      strikePrice: 5.962,
      potentialShares: 207_565,
      source: "8-K Jul 31, 2025",
      sourceUrl:
        "/filings/suig/0001654954-25-008758",
      expiration: "2030-07-31",
      issuedDate: "2025-07-31",
      notes: "Advisor warrants from PIPE closing",
    },
  ],

  // KULR Technology - Bitcoin First Company
  // Verified 2026-01-29 via SEC 10-Q Q3 2025 (CIK 0001662684)
  // Note: 1-for-8 reverse split June 23, 2025 - all figures are post-split
  // All instruments currently OTM (stock ~$2.50), but tracked for ITM scenarios
  KULR: [
    {
      type: "option",
      strikePrice: 5.08, // Midpoint of $2.24-$7.92 range
      potentialShares: 40_938,
      source: "10-Q Q3 2025",
      sourceUrl:
        "/filings/kulr/0001104659-25-113662",
      notes: "Stock options - exercise price range $2.24-$7.92 (post-split)",
    },
    {
      type: "warrant",
      strikePrice: 8.0,
      potentialShares: 66_667,
      source: "10-Q Q3 2025",
      sourceUrl:
        "/filings/kulr/0001104659-25-113662",
      notes: "Warrants @ $8 exercise price (post-split)",
    },
    {
      type: "warrant",
      strikePrice: 10.0,
      potentialShares: 111_143, // 88,905 + 22,238
      source: "10-Q Q3 2025",
      sourceUrl:
        "/filings/kulr/0001104659-25-113662",
      notes: "Warrants @ $10 exercise price (post-split)",
    },
  ],

  // SWC (The Smarter Web Company) - UK BTC treasury company
  // AQSE-listed (Aquis Stock Exchange), no SEC filings
  // No known warrants, convertibles, or options as of Feb 2026
  // Company analytics: https://www.smarterwebcompany.co.uk/bitcoin-treasury/analytics-/
  SWC: [],

  // Sequans Communications (SQNS) - IoT semiconductor with BTC treasury
  // Verified 2026-02-15 via 6-K Q4 2025 + Feb 13 debt restructuring 6-K (CIK 0001383395)
  // Jul 2025: $189M convertible debt raised for BTC purchases
  // Nov 2025: Sold 970 BTC, repaid ~$94.5M → $94.5M remaining
  // Feb 13, 2026: Full redemption announced — selling 1,617 pledged BTC by Jun 2026
  // Note: Foreign private issuer (France), 1:10 reverse split Sep 17, 2025
  // Convertible being redeemed at par (not converted to shares), so potentialShares → 0
  SQNS: [
    {
      type: "convertible",
      strikePrice: 58.40, // Estimated conversion basis — moot since being redeemed not converted
      potentialShares: 0, // Feb 13 6-K: full cash redemption via BTC sale, NOT conversion to shares
      faceValue: 94_500_000, // $94.5M remaining per Q4 6-K — being fully redeemed by Jun 2026
      settlementType: "cash_only",  // Being redeemed at par via BTC sale, not converted to shares
      source: "6-K Q4 2025 + Feb 13, 2026 debt restructuring 6-K",
      sourceUrl: "/filings/meta3350/0001383395-26-000018",
      issuedDate: "2025-07-08",
      expiration: "2026-06-01", // Target full redemption date
      notes: "Original $189M (Jul 2025). $94.5M remaining. Feb 13 6-K: full cash redemption by selling 1,617 pledged BTC by Jun 1, 2026. NOT being converted to shares. After redemption: $0 debt, ~522 BTC unencumbered.",
    },
  ],

  // H100 Group (H100.ST) - Swedish BTC treasury company
  // Verified 2026-02-17 via MFN Swedish regulatory filings (https://mfn.se/a/h100-group)
  // Jul 9, 2025: SEK 342.3M raised via zero-coupon convertible debentures (Adam Back et al)
  // Nov 21, 2025: SEK 122.5M converted to 14,450,468 shares
  // Remaining: SEK 219.8M / 25.9M potential shares at SEK 8.48 conversion price
  // Forced conversion: company can force if 20-day VWAP > SEK 11.27
  "H100.ST": [
    {
      type: "convertible",
      strikePrice: 0.80, // SEK 8.48 / 10.6 SEK/USD = ~$0.80
      potentialShares: 25_919_811, // SEK 219,800,000 / SEK 8.48 per share
      faceValue: 20_736_000, // SEK 219,800,000 / 10.6 = ~$20.7M USD
      settlementType: "full_share",  // Zero-coupon convertible debenture — converts to shares at holder option
      source: "MFN Jul 9, 2025 (issuance) + Nov 21, 2025 (partial conversion)",
      sourceUrl: "https://mfn.se/a/h100-group/h100-group-has-converted-sek-122-5-million-of-its-outstanding-convertible-loans",
      issuedDate: "2025-07-09",
      expiration: "2030-07-09",
      notes: "Tranche 7 zero-coupon convertible debentures. Originally SEK 342.3M / 40.37M shares. SEK 122.5M converted Nov 2025 (14,450,468 shares). Remaining: SEK 219.8M / 25.9M shares. Company can force conversion at SEK 8.48 if 20-day VWAP > SEK 11.27. Tranche 8 right exists (not yet issued): same investors may request additional ~SEK 342.3M convertible at SEK 11.27 conversion price (~30.4M potential shares) — requires board execution + possible EGM approval.",
    },
  ],

  // NXTT removed - company has history of false financial reports

  // MARA Holdings - BTC miner with HODL strategy
  // Verified 2026-02-14 via 10-Q Q3 2025 Note 14 (CIK 0001507605)
  // Source: /filings/mara/0001507605-25-000028
  // All 5 convertible tranches from the "key terms" table in Note 14
  MARA: [
    {
      type: "convertible",
      strikePrice: 76.17, // $1,000 / 13.1277 = $76.17
      potentialShares: 631_265, // $48,077K × 13.1277 / 1000
      faceValue: 48_077_000, // Remaining principal as of Q3 2025 (originally $747.5M)
      settlementType: "net_share",  // Combination settlement per indenture — cash for principal, shares for excess
      source: "10-Q Q3 2025 Note 14",
      sourceUrl:
        "/filings/mara/0001507605-25-000028",
      expiration: "2026-12-01",
      notes: "1.0% Convertible Senior Notes due Dec 2026 (13.1277 shares per $1,000). Most redeemed; $48M remaining.",
    },
    {
      type: "convertible",
      strikePrice: 18.89, // $1,000 / 52.9451 = $18.89
      potentialShares: 15_883_530, // $300,000K × 52.9451 / 1000
      faceValue: 300_000_000,
      settlementType: "net_share",  // Combination settlement per indenture — cash for principal, shares for excess
      source: "10-Q Q3 2025 Note 14",
      sourceUrl:
        "/filings/mara/0001507605-25-000028",
      expiration: "2031-09-01",
      notes: "2.125% Convertible Senior Notes due Sep 2031 (52.9451 shares per $1,000)",
    },
    {
      type: "convertible",
      strikePrice: 25.91, // $1,000 / 38.5902 = $25.91
      potentialShares: 38_590_200, // $1,000,000K × 38.5902 / 1000
      faceValue: 1_000_000_000,
      settlementType: "net_share",  // Combination settlement per indenture — cash for principal, shares for excess
      source: "10-Q Q3 2025 Note 14",
      sourceUrl:
        "/filings/mara/0001507605-25-000028",
      expiration: "2030-03-01",
      notes: "0% Convertible Senior Notes due Mar 2030 (38.5902 shares per $1,000)",
    },
    {
      type: "convertible",
      strikePrice: 34.58, // $1,000 / 28.9159 = $34.58
      potentialShares: 26_747_208, // $925,000K × 28.9159 / 1000
      faceValue: 925_000_000,
      settlementType: "net_share",  // Combination settlement per indenture — cash for principal, shares for excess
      source: "10-Q Q3 2025 Note 14",
      sourceUrl:
        "/filings/mara/0001507605-25-000028",
      expiration: "2031-06-01",
      notes: "0% Convertible Senior Notes due Jun 2031 (28.9159 shares per $1,000)",
    },
    {
      type: "convertible",
      strikePrice: 20.26, // $1,000 / 49.3619 = $20.26
      potentialShares: 50_596_048, // $1,025,000K × 49.3619 / 1000
      faceValue: 1_025_000_000,
      settlementType: "net_share",  // Combination settlement per indenture — cash for principal, shares for excess
      source: "10-Q Q3 2025 Note 14",
      sourceUrl:
        "/filings/mara/0001507605-25-000028",
      expiration: "2032-08-01",
      notes: "0% Convertible Senior Notes due Aug 2032 (49.3619 shares per $1,000). Capped call partially offsets dilution.",
    },
    {
      type: "warrant",
      strikePrice: 25.00, // $25.00 exercise price per 10-Q
      potentialShares: 324_375,
      source: "10-Q Q3 2025",
      sourceUrl:
        "/filings/mara/0001507605-25-000028",
      expiration: "2026-01-31", // ~0.3 years from Sep 30, 2025
      notes: "Warrants to purchase common stock at $25.00. Expiring ~Jan 2026 — may already be expired.",
    },
  ],

  // Twenty One Capital (XXI) - BTC treasury (Tether/SoftBank/Mallers)
  // Verified 2026-02-10 via SEC 8-K (Dec 12, 2025) + 10-Q (Dec 19, 2025)
  // BTC sources: Tether/Bitfinex (31,500) + PIPE (10,500) + additional = ~43,514 BTC
  // Shares: 651,390,912 (Class A: 346,548,153 + Class B: 304,842,759) per 10-Q XBRL
  // Twenty One Capital (XXI) - BTC treasury (Tether/SoftBank/Mallers)
  // Verified 2026-02-14 via 8-K Dec 12, 2025 (Indenture + Employment Agreements)
  // Source: /filings/xxi/0001213900-25-121293
  XXI: [
    {
      type: "convertible",
      strikePrice: 13.87, // $1,000 / 72.0841 conversion rate = $13.87
      potentialShares: 35_068_912, // $486.5M × 72.0841 / 1000 = 35.07M shares
      faceValue: 486_500_000,
      settlementType: "issuer_election",  // S-1: Cash, Physical, or Combination at XXI's election. Default = Combination ($1K cash per $1K principal)
      source: "8-K Dec 12, 2025 (Indenture)",
      sourceUrl:
        "/filings/xxi/0001213900-25-121293",
      issuedDate: "2025-12-09",
      expiration: "2030-12-01",
      notes: "1.00% Convertible Senior Secured Notes due 2030, conversion rate 72.0841 shares/$1,000, collateralized by 16,116.32 BTC",
    },
    {
      type: "option",
      strikePrice: 14.43, // Exercise price from Employment Agreement
      potentialShares: 12_179_268,
      source: "8-K Dec 12, 2025 (CEO Employment Agreement)",
      sourceUrl:
        "/filings/xxi/0001213900-25-121293",
      issuedDate: "2025-12-09",
      notes: "CEO (Jack Mallers) stock options. Vest over time per employment agreement.",
    },
    {
      type: "option",
      strikePrice: 0, // RSUs vest at $0
      potentialShares: 3_215_732,
      source: "8-K Dec 12, 2025 (CEO Employment Agreement)",
      sourceUrl:
        "/filings/xxi/0001213900-25-121293",
      issuedDate: "2025-12-09",
      notes: "CEO (Jack Mallers) RSUs. Vest over time per employment agreement.",
    },
    {
      type: "option",
      strikePrice: 14.43,
      potentialShares: 970_201, // Updated per 8-K Jan 6, 2026 (796,951 time + 173,250 performance)
      source: "8-K Jan 6, 2026 (CFO Option Amendment)",
      sourceUrl:
        "/filings/xxi/0001213900-26-001442",
      issuedDate: "2026-01-02",
      notes: "CFO (Steven Meehan) stock options. Amended from 941,620 to 970,201. Vest over time.",
    },
    {
      type: "option",
      strikePrice: 0, // RSUs vest at $0
      potentialShares: 248_619,
      source: "8-K Dec 12, 2025 (CFO Employment Agreement)",
      sourceUrl:
        "/filings/xxi/0001213900-25-121293",
      issuedDate: "2025-12-09",
      notes: "CFO (Steven Meehan) RSUs. Vest over time per employment agreement.",
    },
    {
      type: "option",
      strikePrice: 14.43, // Assumed same as officer grants
      potentialShares: 297_029, // S-1/A pro forma: 13,446,498 total - 12,179,268 CEO - 970,201 CFO
      source: "S-1/A Feb 9, 2026 (Pro Forma)",
      sourceUrl:
        "/filings/xxi/0001213900-26-013482",
      issuedDate: "2025-12-09",
      notes: "Other employee options under Incentive Plan. Derived from S-1/A pro forma total (13,446,498) less CEO and CFO grants.",
    },
  ],

  // Strive (ASST) - First asset manager BTC treasury
  // Verified 2026-02-15 via SEC 8-K Jan 5, 2026 + Feb 13, 2026 (CIK 0001920406)
  // Post-Semler merger (Jan 16, 2026) + 1-for-20 reverse split (Feb 6, 2026)
  // Basic shares: 63,048,519 (Feb 13 8-K: 53,168,237 Class A + 9,880,282 Class B)
  // Pre-funded warrants @ $0.002 are essentially shares - always ITM
  // NOTE: SATA 12.50% perpetual preferred is NOT convertible to common stock
  // Warrant counts from Jan 5 8-K (Dec 31, 2025 data) adjusted for 1:20 split
  ASST: [
    {
      type: "warrant",
      strikePrice: 0.002, // $0.04 pre-split / 20 = $0.002 - always ITM
      potentialShares: 53_614, // Jan 5 8-K: 1,072,289 pre-split / 20 = 53,614
      source: "8-K Jan 5, 2026 (Dec 31 data, adjusted for 1:20 split)",
      sourceUrl:
        "/filings/asst/0001628280-26-000225",
      notes: "Pre-funded warrants @ $0.002 - always ITM, essentially shares.",
    },
    {
      type: "warrant",
      strikePrice: 27.0, // Post-split: $540 pre-split / 20 = $27
      potentialShares: 26_594_435, // Jan 5 8-K: 531,888,702 pre-split / 20 = 26,594,435
      source: "8-K Jan 5, 2026 (Dec 31 data, adjusted for 1:20 split)",
      sourceUrl:
        "/filings/asst/0001628280-26-000225",
      notes: "Traditional warrants @ $27 post-split. OTM if stock below $27.",
    },
    {
      type: "convertible",
      strikePrice: 72.60, // Post-split: $3.63 pre-split × 20 = $72.60 ($1,000 / 13.7694 post-split conversion rate)
      potentialShares: 137_694, // Post-split: 2,753,887 pre-split / 20 = 137,694 shares
      faceValue: 10_000_000,
      settlementType: "full_share",  // Semler convertible — standard share delivery
      source: "8-K Jan 28, 2026 (Semler convertible notes)",
      sourceUrl:
        "/filings/asst/0001140361-26-002606",
      issuedDate: "2026-01-16",
      expiration: "2027-12-15",
      notes: "$10M remaining Semler convertible notes after $90M exchange. Pre-split conversion rate: 275.3887/1000. Post-split: 13.7694/1000.",
    },
  ],
  // Total ASST dilution: 53.6K pre-funded (ITM) + 26.6M traditional warrants + 137K converts
  // sharesForMnav uses basic (63M) since dilutives tracked here
  // At $27+: traditional warrants add 26.6M → FD ~89.7M shares

  // BTCS Inc - ETH treasury company
  // Verified 2026-02-16 via SEC 10-Q Q3 2025 + 8-Ks
  // Jan 5 8-K: +690,300 options granted @ $2.64 (2025 performance incentives)
  // Q3 10-Q Note 6: 1,369,725 warrants exercised cashless → only 1,411,566 convert warrants remain
  // Plus 712,500 pre-existing warrants @ $11.50 (Mar 2021 PP, expiring ~Mar 2026)
  BTCS: [
    {
      type: "convertible",
      strikePrice: 5.85,
      potentialShares: 1_335_133,
      faceValue: 7_810_526,
      settlementType: "full_share",  // ATW Partners private placement — standard share delivery
      source: "8-K May 2025 + Q3 10-Q Note 7",
      sourceUrl:
        "/filings/btcs/0001493152-25-022359",
      expiration: "2027-05-13",
      notes: "$7.81M face value convertible note (ATW Partners, 5% OID on $7.438M principal). " +
        "6% interest, secured by substantially all assets (excl. Aave collateral). " +
        "4.99% beneficial ownership cap. No conversions to date.",
    },
    {
      type: "convertible",
      strikePrice: 13.0,
      potentialShares: 773_077,
      faceValue: 10_050_000,
      settlementType: "full_share",  // ATW Partners private placement — standard share delivery
      source: "8-K Jul 2025 + Q3 10-Q Note 7",
      sourceUrl:
        "/filings/btcs/0001493152-25-022359",
      expiration: "2027-07-21",
      notes: "$10.05M face value convertible note (ATW Partners, 5% OID). " +
        "6% interest, secured by substantially all assets (excl. Aave collateral). " +
        "4.99% beneficial ownership cap. No conversions to date.",
    },
    // ── Convert warrants (post-exercise) ──────────────────────────────────
    // Original: 1,901,916 (May) + 879,375 (Jul) = 2,781,291
    // Exercised cashless Q3: 1,369,725 (surrendered 554,401, received 815,324 net shares)
    // Remaining: 1,411,566 total equity-classified convert warrants
    // Exact split unknown; using proportional estimate: May ~69%, Jul ~31%
    {
      type: "warrant",
      strikePrice: 2.75,
      potentialShares: 974_000,  // ~69% of 1,411,566 remaining (proportional to original May/total)
      source: "Q3 10-Q Note 6 (post-exercise balance)",
      sourceUrl:
        "/filings/btcs/0001493152-25-022359",
      issuedDate: "2025-05-13",
      expiration: "2030-05-13",
      notes: "May 2025 ATW convert warrants. Originally 1,901,916; ~928K exercised cashless in Q3. " +
        "Remaining ~974K (proportional estimate). Near/at-the-money.",
    },
    {
      type: "warrant",
      strikePrice: 8.00,
      potentialShares: 437_566,  // ~31% of 1,411,566 remaining
      source: "Q3 10-Q Note 6 (post-exercise balance)",
      sourceUrl:
        "/filings/btcs/0001493152-25-022359",
      issuedDate: "2025-07-21",
      expiration: "2030-07-21",
      notes: "Jul 2025 ATW convert warrants. Originally 879,375; ~442K exercised cashless in Q3. " +
        "Remaining ~438K (proportional estimate).",
    },
    // ── Pre-existing warrants (Mar 2021 private placement) ────────────────
    {
      type: "warrant",
      strikePrice: 11.50,
      potentialShares: 712_500,
      source: "8-K Mar 4, 2021 + Q3 10-Q Note 6",
      sourceUrl:
        "/filings/btcs/0001493152-25-022359",
      issuedDate: "2021-03-02",
      expiration: "2026-03-02",
      notes: "Pre-existing warrants from Mar 2021 private placement. Originally 7,125,000 pre-reverse-split " +
        "→ 712,500 post 1-for-10 split. Deeply OTM at current prices. Expiring ~Mar 2026. " +
        "Classified as derivative liability ($855,713 at Q3).",
    },
    {
      type: "option",
      strikePrice: 2.72,
      potentialShares: 2_582_695,  // 1,892,395 (XBRL Q3) + 690,300 (Jan 5 8-K grants)
      source: "10-Q Q3 2025 + 8-K Jan 5 2026",
      sourceUrl:
        "/filings/btcs/0001493152-26-000391",
      expiration: "2033-01-01",  // 7-year term from Jan 2026
      notes: "XBRL Q3: 1,892,395 @ $2.75 + Jan 5 8-K: 690,300 @ $2.64. Blended ~$2.72.",
    },
  ],

  // BTCT (Bitcoin Treasury Corp) - Canadian BTC treasury (TSX Venture)
  // Verified 2026-02-17 via btctcorp.com + TSX Venture Bulletin V2025-1838
  // CIK: N/A (Canadian, SEDAR+ #000053693)
  // Basic shares: 10,027,880 (btctcorp.com Feb 2026)
  // Debt: $25M CAD convertible debentures
  BTCT: [
    {
      type: "convertible",
      strikePrice: 12.00,  // CAD - implied from $25M / 2,083,333 shares
      potentialShares: 2_083_333,
      faceValue: 18_120_000,  // CAD $25M / 1.38 CAD/USD = ~$18.1M USD
      settlementType: "full_share",  // Canadian convertible debenture — standard share delivery
      issuedDate: "2025-06-23",
      expiration: "2030-06-23",  // 5-year maturity
      source: "TSX Venture Bulletin V2025-1838 + btctcorp.com",
      sourceUrl: "https://btctcorp.com",
      notes: "25,000 convertible debentures × $1,000 CAD face = $25M total. Conversion price $12.00 CAD. 1% annual interest, 5yr maturity (Jun 2030). Senior unsecured, non-redeemable first 3 years. Confidence: IR (terms from Q3 financials).",
    },
    {
      type: "warrant",
      strikePrice: 0.001,  // CAD - nominal/essentially free shares
      potentialShares: 2_431_667,
      source: "Annual Information Form (OTC Markets) Jun 23, 2025",
      sourceUrl: "https://btctcorp.com",
      notes: "Performance warrants @ $0.001 CAD (nominal). 10-year term. Vest when BTC price > benchmark price at formation. " +
        "⚠️ HIDDEN DILUTION: Company website explicitly excludes these from 'diluted shares' count. " +
        "Deeply ITM when vested (~$5 stock vs $0.001 strike). Confidence: REG (from Annual Information Form).",
    },
  ],
  // Total BTCT dilution: ~2.08M convertible + ~2.43M performance warrants = ~4.51M potential shares
  // Performance warrants are essentially free shares (ITM when vested) — website hides them
  // True fully diluted: 10,027,880 + 4,514,000 = ~14,542,880 (20% above website's "diluted" 12.1M)
  // Converts OTM ($12 strike vs ~$5 stock), perf warrants ITM ($0.001 strike)
  // SEDAR+ blocked by captcha — some terms verified via OTC Markets AIF
  // ⚠️ GOVERNANCE: Entire management team = Evolve ETFs executives (zero independence)

  // BTBT (Bit Digital) - ETH treasury company (formerly BTC miner)
  // Verified 2026-02-13 via Oct 8, 2025 PR: "$150 million convertible notes offering,
  // which included the underwriters' full exercise of their over-allotment option"
  // $135M upsized offering + $15M overallotment = $150M total (NOT $165M)
  // 4.00% Convertible Senior Notes due 2030 (underwritten by Barclays, Cantor, B. Riley)
  BTBT: [
    {
      type: "convertible",
      strikePrice: 4.16,
      potentialShares: 36_057_692,  // 240.3846 shares per $1,000 × 150,000 = 36,057,692
      faceValue: 150_000_000,  // $135M upsized + $15M overallotment fully exercised
      settlementType: "full_share",  // Underwritten convertible senior notes — share delivery
      source: "8-K Oct 2, 2025 + PR Oct 8, 2025",
      sourceUrl:
        "https://bit-digital.com/press-releases/bit-digital-inc-purchases-31057-eth-with-convertible-notes-proceeds-raising-capital-at-a-premium-to-mnav/",
      expiration: "2030-10-01",
      notes: "$150M 4% convertible notes. Conversion: 240.3846 shares/$1K = $4.16/share. Investors: Kraken, Jump, Jane Street. Company optional redemption ~Oct 1, 2028.",
    },
    {
      type: "preferred",
      strikePrice: 10.00,  // $10.00 liquidation preference per share (effective conversion price)
      potentialShares: 1_000_000,  // 1M preferred shares, 1:1 convertible to common
      source: "Q3 2025 10-Q: 1,000,000 preferred shares, $10 liquidation pref, 1:1 convertible",
      sourceUrl: "/filings/btbt/0001213900-25-110383",
      notes: "Series A preferred. $10 liq pref, 1:1 convert, 8% dividend, 50:1 voting. Held by insiders (CFO + Chairman). 4.99% blocker.",
    },
  ],

  // GAME (GameSquare Holdings) - ETH treasury company
  // Verified 2026-02-01 via SEC XBRL (CIK 0001714562)
  // Convertible debt fully converted to equity as of Q3 2025
  // Only remaining dilutive: 600K warrants @ $1.00 (deep ITM at ~$0.45 stock price)
  GAME: [
    {
      type: "warrant",
      strikePrice: 1.00,
      potentialShares: 600_000,
      source: "SEC 10-Q Q3 2025 XBRL",
      sourceUrl:
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1714562&type=10-Q",
      expiration: "2026-07-01",  // Estimated based on Jul 2025 issuance
      notes: "600K warrants at $1.00 - OTM at ~$0.45 stock price (Jan 2026)",
    },
  ],

  // UPXI (Upexi Inc) - SOL treasury company
  // Verified 2026-02-13 via SEC 10-Q Q2 FY2026 (CIK 0001775194, filed 2026-02-10)
  // Price ~$1.17 at Feb 2026 offering. Convertibles deep OTM except Hivemind ($2.39) somewhat close.
  UPXI: [
    // $150M Convertible Notes @$4.25 (Jul 16, 2025)
    // Cannot be repaid in cash; converts to ~35.3M shares OR returns ~963K SOL at maturity
    // Forced conversion at VWAP > $6.37 for 30 days
    {
      type: "convertible",
      strikePrice: 4.25,
      potentialShares: 35_293_206,  // 10-Q Note 10: "approximately 35,293,206 shares"
      faceValue: 149_996_123,
      settlementType: "full_share",  // Cannot repay in cash — converts to shares or returns SOL
      source: "10-Q Q2 FY2026 Note 10",
      sourceUrl:
        "/filings/upxi/0001477932-26-000736",
      expiration: "2027-07-16",
      notes: "$150M convertible @$4.25. 2% interest. Cannot repay in cash — converts or returns SOL. Forced conversion VWAP>$6.37 for 30 days.",
    },
    // $36M Hivemind Convertible @$2.39 (Jan 9, 2026)
    // In exchange for 265,500 locked SOL. Collateralized by those SOL.
    // Cannot be repaid in cash; converts to ~15.1M shares OR returns pro rata SOL
    {
      type: "convertible",
      strikePrice: 2.39,
      potentialShares: 15_062_761,  // $36M / $2.39
      faceValue: 36_000_000,
      settlementType: "full_share",  // Cannot repay in cash — converts or returns pro rata SOL
      source: "8-K Jan 14, 2026 (Hivemind)",
      sourceUrl:
        "/filings/upxi/0001477932-26-000207",
      expiration: "2028-01-09",  // 24 months from Jan 9, 2026
      notes: "$36M Hivemind convertible @$2.39. 1% interest. For 265.5K locked SOL. First-priority security interest in SOL.",
    },
    // $560K Promissory Notes @$3.00 (convertible, maturity Jun 1, 2026)
    {
      type: "convertible",
      strikePrice: 3.00,
      potentialShares: 186_667,  // $560K / $3.00
      faceValue: 560_000,
      settlementType: "full_share",  // Convertible promissory, no cash settlement option
      source: "10-Q Q2 FY2026 Note 10",
      sourceUrl:
        "/filings/upxi/0001477932-26-000736",
      expiration: "2026-06-01",
      notes: "$560K promissory @$3.00. 12% interest. Subordinate to convertible notes.",
    },
    // Dec 2025 PIPE Warrants — AMENDED in Feb 2026 from $4.00 to $2.83
    {
      type: "warrant",
      strikePrice: 2.83,  // Amended from $4.00 in Feb 2026 offering
      potentialShares: 3_289_474,
      source: "10-Q Q2 FY2026 Note 18 (amendment)",
      sourceUrl:
        "/filings/upxi/0001477932-26-000736",
      expiration: "2029-12-01",
      notes: "Dec 2025 PIPE warrants. Originally $4.00, amended to $2.83 in Feb 2026. Redemption trigger reduced from $8.50 to $7.00.",
    },
    // Feb 2026 Registered Direct Offering Warrants @$1.50
    {
      type: "warrant",
      strikePrice: 1.50,
      potentialShares: 6_337_000,
      source: "10-Q Q2 FY2026 Note 18 (subsequent event)",
      sourceUrl:
        "/filings/upxi/0001477932-26-000736",
      expiration: "2031-02-01",  // 5 years from issuance
      notes: "Feb 2026 registered direct warrants @$1.50. Forced conversion at $5.00. 5-year term.",
    },
    // Preferred Stock conversion
    {
      type: "convertible",
      strikePrice: 0,  // Convertible at holder option, no additional payment
      potentialShares: 138_889,  // 150,000 preferred → 138,889 common
      source: "10-Q Q2 FY2026 Note 12",
      sourceUrl:
        "/filings/upxi/0001477932-26-000736",
      expiration: "2099-12-31",  // No expiration
      notes: "150K Series A preferred (CEO Allan Marshall). Converts to 138,889 common. 10x voting.",
    },
    // Stock Options
    {
      type: "option",
      strikePrice: 3.40,  // Weighted average exercise price
      potentialShares: 744_478,
      source: "10-Q Q2 FY2026 Note 13",
      sourceUrl:
        "/filings/upxi/0001477932-26-000736",
      expiration: "2030-12-31",  // Weighted avg remaining life 5.09 years from Dec 2025
      notes: "Stock options. 619,164 vested, 125,314 unvested. Weighted avg strike $3.40.",
    },
    // RSUs (vested but unissued — these WILL become shares, treated as options with $0 strike)
    {
      type: "option",
      strikePrice: 0,
      potentialShares: 1_673_665,  // Vested but not yet issued as common stock
      source: "10-Q Q2 FY2026 Note 13",
      sourceUrl:
        "/filings/upxi/0001477932-26-000736",
      expiration: "2026-06-30",  // Will be issued
      notes: "Vested RSUs not yet issued. 1,673,665 shares. Essentially guaranteed dilution. (Modeled as $0 strike options.)",
    },
    // RSUs (unvested)
    {
      type: "option",
      strikePrice: 0,
      potentialShares: 3_044_085,  // 4,717,750 total - 1,673,665 vested = 3,044,085 unvested
      source: "10-Q Q2 FY2026 Note 13",
      sourceUrl:
        "/filings/upxi/0001477932-26-000736",
      expiration: "2027-06-30",  // ~0.54 years weighted avg remaining
      notes: "Unvested RSUs. $11.6M unrecognized comp expense. (Modeled as $0 strike options.)",
    },
    // TODO: GSR Asset Manager Warrants (2,192,982 shares at $2.28-$5.70) — DISPUTED IN ARBITRATION
    // GSR terminated Dec 26, 2025. Status of warrants unclear. Arbitration ongoing.
    // Not including until resolution. If included: 877,193@$2.28 + 438,596@$3.42 + 438,596@$4.56 + 438,597@$5.70
  ],

  // FWDI (Forward Industries) - SOL treasury company
  // Verified 2026-02-13 via 10-Q Q1 FY2026 (CIK 0000038264)
  // NOTE: 12.9M pre-funded warrants @ $0.00001 ALREADY INCLUDED in sharesForMnav (96M)
  // sharesForMnav = 83.1M common + 12.9M PFWs = 96.0M
  // Performance warrants below are NOT in sharesForMnav — modeled with vesting triggers as strikePrice
  // Also: 102.1M shares reserved for ATM (sold at market, not dilutive at a strike)
  // Also: $1B share buyback program (Nov 2025 – Sep 2027), ~$975.6M remaining
  //
  // WARRANT RECONCILIATION vs XBRL:
  // XBRL ClassOfWarrantOrRightOutstanding (Sep 30, 2025): 26,359,600 total warrants
  //   - Pre-funded warrants (PFWs): 12,864,602 @ $0.00001 → in sharesForMnav (essentially shares)
  //   - Performance warrants below: 13,378,377 (9 tranches × ~1,486,486 avg)
  //   - Legacy/rounding gap: ~116,621 (immaterial, likely legacy warrants from pre-PIPE era)
  //   - Total tracked: 12,864,602 + 13,378,377 = 26,242,979 (~99.6% of XBRL total) ✓
  //
  // IMPORTANT: Performance warrant tranches CANNOT vest until the Resale Registration Statement
  // is effective, regardless of stock price. Per EX-10.3 Section 2(b): vesting triggers require
  // "20 out of 30 trading days FOLLOWING the effectiveness of the Resale Registration Statement."
  // If the resale S-1 isn't effective yet, NO tranches can vest. This is a material prerequisite
  // that the strike-price-as-vesting-trigger model doesn't capture.
  FWDI: [
    {
      type: "warrant",
      strikePrice: 0.00001,
      potentialShares: 12_864_602,
      source: "SEC 10-Q Q1 FY2026 (CIK 0000038264)",
      sourceUrl: "/filings/fwdi/0000038264-25-000042",
      expiration: "9999-12-31",
      issuedDate: "2025-09-15",
      includedInBase: true,
      notes: "Pre-funded warrants (PFW) @ $0.00001. Already included in sharesForMnav (96,003,639 = 83.1M common + 12.9M PFW).",
    },
    // All 3 warrant tranches: $0.01 exercise price, BUT performance-based vesting.
    // Each tranche has 3 sub-tranches that vest at different stock price targets
    // (relative to $18.50 PIPE price). Perpetual (no expiration). Cashless exercise.
    // Source: 8-K Sep 8, 2025, EX-10.3 (Galaxy) and EX-10.4 (Jump/Multicoin)
    // /filings/fwdi/0001683168-25-006734
    // /filings/fwdi/0001683168-25-006734
    //
    // PREREQUISITE: Resale Registration Statement must be effective before ANY tranche can vest.
    // Clock for 20/30 trading day trigger doesn't start until registration is effective.

    // Galaxy Strategic Advisor Warrants — 5% of PIPE shares
    // 1/3 vests at $27.75 (150% of $18.50), 1/3 at $37.00 (200%), 1/3 at $46.25 (250%)
    // Actual exercise price is $0.01 (penny warrants w/ cashless exercise) — using vesting
    // trigger as strikePrice so mNAV calculator correctly includes only when vested/dilutive.
    { type: "warrant", potentialShares: 1_486_486, strikePrice: 27.75, source: "8-K Sep 8, 2025 EX-10.3", sourceUrl: "/filings/fwdi/0001683168-25-006734", notes: "Galaxy Advisor — exercise $0.01, vests at $27.75 (20/30 days). Perpetual, cashless." },
    { type: "warrant", potentialShares: 1_486_486, strikePrice: 37.00, source: "8-K Sep 8, 2025 EX-10.3", sourceUrl: "/filings/fwdi/0001683168-25-006734", notes: "Galaxy Advisor — exercise $0.01, vests at $37.00 (20/30 days). Perpetual, cashless." },
    { type: "warrant", potentialShares: 1_486_487, strikePrice: 46.25, source: "8-K Sep 8, 2025 EX-10.3", sourceUrl: "/filings/fwdi/0001683168-25-006734", notes: "Galaxy Advisor — exercise $0.01, vests at $46.25 (20/30 days). Perpetual, cashless." },

    // Jump Crypto Lead Investor Warrants — 5% of PIPE shares (split pro rata with Multicoin)
    { type: "warrant", potentialShares: 1_486_486, strikePrice: 27.75, source: "8-K Sep 8, 2025 EX-10.4", sourceUrl: "/filings/fwdi/0001683168-25-006734", notes: "Jump Crypto — exercise $0.01, vests at $27.75 (20/30 days). Perpetual, cashless." },
    { type: "warrant", potentialShares: 1_486_486, strikePrice: 37.00, source: "8-K Sep 8, 2025 EX-10.4", sourceUrl: "/filings/fwdi/0001683168-25-006734", notes: "Jump Crypto — exercise $0.01, vests at $37.00 (20/30 days). Perpetual, cashless." },
    { type: "warrant", potentialShares: 1_486_487, strikePrice: 46.25, source: "8-K Sep 8, 2025 EX-10.4", sourceUrl: "/filings/fwdi/0001683168-25-006734", notes: "Jump Crypto — exercise $0.01, vests at $46.25 (20/30 days). Perpetual, cashless." },

    // Multicoin Capital Lead Investor Warrants — 5% of PIPE shares (split pro rata with Jump)
    { type: "warrant", potentialShares: 1_486_486, strikePrice: 27.75, source: "8-K Sep 8, 2025 EX-10.4", sourceUrl: "/filings/fwdi/0001683168-25-006734", notes: "Multicoin — exercise $0.01, vests at $27.75 (20/30 days). Perpetual, cashless." },
    { type: "warrant", potentialShares: 1_486_486, strikePrice: 37.00, source: "8-K Sep 8, 2025 EX-10.4", sourceUrl: "/filings/fwdi/0001683168-25-006734", notes: "Multicoin — exercise $0.01, vests at $37.00 (20/30 days). Perpetual, cashless." },
    { type: "warrant", potentialShares: 1_486_487, strikePrice: 46.25, source: "8-K Sep 8, 2025 EX-10.4", sourceUrl: "/filings/fwdi/0001683168-25-006734", notes: "Multicoin — exercise $0.01, vests at $46.25 (20/30 days). Perpetual, cashless." },
  ],

  // HSDT (Solana Company, fka Helius Medical) - SOL treasury company
  // Updated 2026-03-05 via 8-K Feb 20, 2026 (accn 0001104659-26-018212)
  //
  // sharesForMnav = 52,802,604 basic + 23,930,181 PFWs @ $0.001 = 76,732,785 (Feb 20, 2026)
  // PFWs ALREADY INCLUDED in sharesForMnav — NOT listed here (would double-count)
  //
  // Warrant counts below from 10-Q Q3 2025 (Sep 30) — may have changed slightly since.
  // Breakdown:
  //   23,930,181 PFWs @ $0.001 (in sharesForMnav, NOT here) — was 35.6M at Sep 30, ~11.7M exercised
  //   73,941,196 Stapled Warrants @ $10.134 (here — ITM tracking)
  //    7,394,119 Advisor Warrants @ $0.001 (here — nearly certain exercise)
  //          617 HSDTW Public Warrants @ $6.756 (here — negligible)
  //            2 Common Warrants @ $47.55 (ignored — negligible)
  //        8,957 Other Equity Warrants @ $563-$611K (ignored — deep OTM)
  HSDT: [
    {
      type: "warrant",
      strikePrice: 0.001,
      potentialShares: 23_930_181,
      source: "8-K Feb 20, 2026 + 10-Q Q3 2025 Note 6",
      sourceUrl: "/filings/hsdt/0001104659-26-018212",
      expiration: "9999-12-31",
      issuedDate: "2025-09-15",
      includedInBase: true,
      notes: "Pre-funded warrants (PFW) @ $0.001. Was 35.6M at Sep 30, ~11.7M exercised. Already included in sharesForMnav (76,732,785 = 52.8M common + 23.9M PFW).",
    },
    // 2025 Stapled Warrants — issued with PIPE Sep 2025
    // One stapled warrant per PFW/share purchased in PIPE
    // Strike $10.134 = PIPE purchase price. Exercisable upon stockholder approval (received Oct 30, 2025)
    // 73,941,196 = 36,261,239 (crypto portion, exp Jul 2028) + 37,679,957 (common portion, exp Jun 2028)
    { type: "warrant", potentialShares: 73_941_196, strikePrice: 10.134, expiration: "2028-07-15", source: "10-Q Q3 2025 Note 6 warrant table", sourceUrl: "/filings/hsdt/0001104659-25-113714", notes: "2025 Stapled Warrants (crypto + common portions). Strike = PIPE price $10.134. Exercisable post-stockholder approval Oct 30, 2025. Classified as derivative liability." },
    // Base Advisor Warrants — issued to advisors in connection with PIPE
    // Strike $0.001 — economically equivalent to shares, virtually certain exercise
    // Stockholder approval received Oct 30, 2025. Expire Oct 2030.
    { type: "warrant", potentialShares: 7_394_119, strikePrice: 0.001, expiration: "2030-10-30", source: "10-Q Q3 2025 Note 6 warrant table", sourceUrl: "/filings/hsdt/0001104659-25-113714", notes: "Base Advisor Warrants @ $0.001. Stockholder approval received Oct 30, 2025. Classified as equity. Virtually certain to be exercised." },
    // HSDTW — 2022 Public Warrants (NASDAQ-listed)
    // Post 1:50 reverse split: 617 warrants remaining (negligible)
    { type: "warrant", potentialShares: 617, strikePrice: 6.756, expiration: "2027-08-15", source: "10-Q Q3 2025 Note 6 warrant table", sourceUrl: "/filings/hsdt/0001104659-25-113714", notes: "HSDTW public warrants. Post 1:50 reverse split — negligible count. Classified as derivative liability." },
  ],

  // STKE (Sol Strategies) - SOL treasury company (Canadian, NASDAQ cross-listed)
  // Verified 2026-03-07 via SEC 6-K Q1 FY2026 (Dec 31, 2025) + 40-F FY2025 (CIK 0001846839)
  // Balance sheet Dec 31, 2025: Convertible debentures CAD $34.9M (current $13.0M + LT $21.9M)
  // Three convertible tranches: First PP (CAD $27.5M @ $20), Second PP (CAD $2.5M @ $37.50), ATW (USD $20M floating)
  // As of Sep 30, 2025: 643,626 options (WAEP $13.71), 1,552,042 warrants (WAEP $22.14), 15,106 RSUs
  // At ~$1.57 stock price: Most options/warrants deep OTM, convertibles deep OTM (except ATW floating)
  // Credit facilities (Kamino DeFi ~CAD $4M) are non-convertible — not modeled here
  // CAD→USD rate: ~0.71 (March 2026)
  STKE: [
    // ── Convertible Debentures ──────────────────────────────────────────
    // First Private Placement (Jan 16, 2025): CAD $27.5M, 2.5% interest, convertible at CAD $20/share
    // Redeemable after 3 years at 112% of principal
    {
      type: "convertible",
      strikePrice: 14.20,  // CAD $20.00 × 0.71 USD/CAD
      potentialShares: 1_375_000,  // CAD $27.5M / CAD $20
      faceValue: 19_525_000,  // CAD $27.5M × 0.71
      source: "6-K Q1 FY2026 (Note 11) + 40-F FY2025",
      sourceUrl: "/filings/stke/0001104659-26-016788",
      expiration: "2028-01-16",  // Redeemable after 3 years
      issuedDate: "2025-01-16",
      notes:
        "First Private Placement convertible debenture. CAD $27.5M principal, 2.5% annual interest. " +
        "Convertible at any time at CAD $20/share. Redeemable by company after 3 years at 112% of principal. " +
        "Deep OTM at ~$1.57 stock price.",
    },
    // Second Private Placement (Jan 21, 2025): CAD $2.5M, 2.5% interest, convertible at CAD $37.50/share
    {
      type: "convertible",
      strikePrice: 26.63,  // CAD $37.50 × 0.71 USD/CAD
      potentialShares: 66_667,  // CAD $2.5M / CAD $37.50
      faceValue: 1_775_000,  // CAD $2.5M × 0.71
      source: "6-K Q1 FY2026 (Note 11) + 40-F FY2025",
      sourceUrl: "/filings/stke/0001104659-26-016788",
      expiration: "2028-01-21",  // Redeemable after 3 years
      issuedDate: "2025-01-21",
      notes:
        "Second Private Placement convertible debenture. CAD $2.5M principal, 2.5% annual interest. " +
        "Convertible at any time at CAD $37.50/share. Deep OTM.",
    },
    // ATW Convertible Note Facility (May 2025): USD $500M facility, $20M drawn (Initial Tranche)
    // Converts at prior trading day closing price (floating) — always at-the-money
    {
      type: "convertible",
      strikePrice: 0.01,  // Floating: converts at prior day close price — effectively always ITM
      potentialShares: 12_738_854,  // USD $20M / $1.57 current price (changes with stock price)
      faceValue: 20_000_000,  // USD $20M initial tranche drawn
      source: "6-K Q1 FY2026 (Note 11)",
      sourceUrl: "/filings/stke/0001104659-26-016788",
      issuedDate: "2025-05-01",
      notes:
        "ATW convertible note facility. USD $500M total capacity, $20M Initial Tranche drawn (May 2025). " +
        "Converts at prior trading day closing price (floating — always at-the-money). " +
        "$480M remaining available for future drawdowns. " +
        "Company must delegate Note-Purchased SOL to company-owned validator. " +
        "Revenue share: 85% staking rewards ($15-20M outstanding), 62.5% ($20M+).",
    },
    {
      type: "option",
      strikePrice: 0.80,
      potentialShares: 3_689,
      source: "40-F FY2025",
      sourceUrl: "/filings/stke/0001104659-25-125666",
      expiration: "2027-11-21",
      notes: "Low-strike options - ITM at $1.57",
    },
    {
      type: "option",
      strikePrice: 1.24,
      potentialShares: 125_000,
      source: "40-F FY2025",
      sourceUrl: "/filings/stke/0001104659-25-125666",
      expiration: "2029-08-07",
      notes: "ITM at $1.57 stock price",
    },
    {
      type: "option",
      strikePrice: 13.71, // WAEP for remaining 514,937 options
      potentialShares: 514_937,
      source: "40-F FY2025",
      sourceUrl: "/filings/stke/0001104659-25-125666",
      notes: "Remaining options at WAEP - deep OTM at $1.57",
    },
    {
      type: "option",
      strikePrice: 0, // RSUs vest at $0
      potentialShares: 15_106,
      source: "40-F FY2025",
      sourceUrl: "/filings/stke/0001104659-25-125666",
      notes: "RSUs (restricted share units) - always ITM",
    },
    {
      type: "warrant",
      strikePrice: 23.84,
      potentialShares: 562_500,
      source: "40-F FY2025",
      sourceUrl: "/filings/stke/0001104659-25-125666",
      expiration: "2028-03-17",
      notes: "Deep OTM at $1.57",
    },
    {
      type: "warrant",
      strikePrice: 20.00,
      potentialShares: 922_667,
      source: "40-F FY2025",
      sourceUrl: "/filings/stke/0001104659-25-125666",
      expiration: "2030-01-16",
      notes: "Deep OTM at $1.57",
    },
    {
      type: "warrant",
      strikePrice: 37.28,
      potentialShares: 66_875,
      source: "40-F FY2025",
      sourceUrl: "/filings/stke/0001104659-25-125666",
      expiration: "2030-01-21",
      notes: "Deep OTM at $1.57",
    },
  ],

  // Capital B (ALCPB, formerly ALTBG) - France BTC treasury (The Blockchain Group)
  // Trades on Euronext Paris in EUR. Strike prices and face values converted to USD at ~1.04 EUR/USD.
  // Source: Euronext press releases
  // Verified 2026-01-25
  // Fully diluted: ~390M shares (per Feb 9, 2026 press release: 389,888,020)
  //
  // ⚠️ DILUTIVE OVERCOUNT (~47M shares):
  // Our instruments total ~210M potential shares → 227.5M basic + 210M = 437.3M fully diluted.
  // Company reports 389.9M fully diluted → gap of ~47.4M shares.
  // Most likely: ~47M of OCA Tranche 1 shares have already converted and are in the 227.5M basic count,
  // but we still list the full 89.4M as potential dilution. Unconverted remainder is likely ~42M.
  // TODO: Verify from next AMF filing or conversion notices which tranches are partially converted.
  // Until verified, we keep the full amounts (conservative overcount).
  ALCPB: [
    // === OCA Tranche 1 (March 2025) - Largest dilution, lowest strike ===
    {
      type: "convertible",
      strikePrice: 0.57, // €0.544 × 1.04
      potentialShares: 89_367_393,
      faceValue: 50_544_000, // €48.6M × 1.04
      settlementType: "full_share",  // French OCA — mandatory conversion, no cash settlement
      source: "Euronext Mar 2025 (OCA A-01 + B-01)",
      sourceUrl:
        "https://live.euronext.com/en/products/equities/company-news/2025-05-12-blockchain-group-announces-convertible-bond-issuance-eur",
      expiration: "2030-03-04",
      notes: "OCA Tranche 1: Fulgur, Adam Back, UTXO, Chechin-Laurans, TOBAM (€48.6M total). Conversion at €0.544/share.",
    },
    // === BSA 2025-01 Warrants (April 2025) ===
    {
      type: "warrant",
      strikePrice: 0.57, // €0.544 × 1.04
      potentialShares: 13_340_636, // 93,384,449 warrants ÷ 7 = 1 share
      source: "Euronext Apr 2025 (BSA 2025-01)",
      sourceUrl:
        "https://live.euronext.com/en/products/equities/company-news/2025-04-07-blockchain-group-announces-free-allocation-share",
      expiration: "2026-04-10",
      notes: "BSA 2025-01: Free warrants to shareholders. 7 BSA = 1 share at €0.544. ~93.4M warrants issued.",
    },
    // === OCA B-02 (May 2025) ===
    {
      type: "convertible",
      strikePrice: 0.74, // €0.707 × 1.04
      potentialShares: 82_451_903, // Fulgur (78.2M) + UTXO (4.3M)
      faceValue: 60_632_000, // €58.3M × 1.04 (Fulgur €55.3M + UTXO €3M)
      settlementType: "full_share",  // French OCA — mandatory conversion
      source: "Euronext May 2025 (OCA B-02 Fulgur/UTXO)",
      sourceUrl:
        "https://live.euronext.com/en/products/equities/company-news/2025-05-26-blockchain-group-announces-convertible-bond-issuance-eur",
      expiration: "2030-05-26",
      notes: "OCA B-02: Fulgur Ventures (€55.3M) + UTXO Management (€3M). Conversion at €0.707/share.",
    },
    {
      type: "convertible",
      strikePrice: 0.74, // €0.707 × 1.04
      potentialShares: 17_176_106,
      faceValue: 12_584_000, // €12.1M × 1.04
      settlementType: "full_share",  // French OCA — mandatory conversion
      source: "Euronext May 2025 (OCA B-02 Adam Back)",
      sourceUrl:
        "https://live.euronext.com/en/products/equities/company-news/2025-05-12-blockchain-group-announces-convertible-bond-issuance-eur",
      expiration: "2030-05-12",
      notes: "OCA B-02: Adam Back (€12.1M). Conversion at €0.707/share.",
    },
    {
      type: "convertible",
      strikePrice: 3.96, // €3.809 × 1.04
      potentialShares: 1_312_680,
      faceValue: 5_200_000, // €5M × 1.04
      settlementType: "full_share",  // French OCA — mandatory conversion
      source: "Euronext May 2025 (OCA B-03 T1)",
      sourceUrl:
        "https://live.euronext.com/en/products/equities/company-news/2025-05-26-blockchain-group-announces-convertible-bond-issuance-eur",
      expiration: "2030-05-25",
      notes: "OCA B-03 Tranche 1: Moonlight Capital (€5M). Conversion at €3.809/share.",
    },
    {
      type: "convertible",
      strikePrice: 5.15, // €4.9517 × 1.04
      potentialShares: 1_514_631,
      faceValue: 7_800_000, // €7.5M × 1.04
      settlementType: "full_share",  // French OCA — mandatory conversion
      source: "Euronext May 2025 (OCA B-03 T2)",
      sourceUrl:
        "https://live.euronext.com/en/products/equities/company-news/2025-05-26-blockchain-group-announces-convertible-bond-issuance-eur",
      expiration: "2030-05-25",
      notes: "OCA B-03 Tranche 2: Optional (€7.5M). Conversion at €4.9517/share.",
    },
    {
      type: "convertible",
      strikePrice: 6.49, // €6.24 × 1.04
      potentialShares: 961_538,
      faceValue: 6_240_000, // €6M × 1.04
      settlementType: "full_share",  // French OCA — mandatory conversion
      source: "Euronext Jun 2025 (OCA A-03)",
      sourceUrl:
        "https://live.euronext.com/en/products/equities/company-news/2025-06-12-blockchain-group-announces-equity-and-convertible-bond",
      expiration: "2030-06-10",
      notes: "OCA A-03: TOBAM (€6M). Conversion at €6.24/share.",
    },
    {
      type: "convertible",
      strikePrice: 5.38, // €5.174 × 1.04
      potentialShares: 966_370,
      faceValue: 5_200_000, // €5M × 1.04
      settlementType: "full_share",  // French OCA — mandatory conversion
      source: "Euronext Jul 2025 (OCA A-04)",
      sourceUrl:
        "https://www.finanzwire.com/press-release/capital-b-capital-increase-and-convertible-bonds-issuance-for-eur115-million-with-tobam-bitcoin-alpha-fund-to-pursue-its-bitcoin-treasury-company-strategy-0WAE500EF0o",
      expiration: "2030-07-01",
      notes: "OCA A-04: TOBAM (€5M). Conversion at €5.174/share.",
    },
    {
      type: "convertible",
      strikePrice: 5.38, // €5.174 × 1.04
      potentialShares: 975_071,
      faceValue: 5_200_000, // €5M × 1.04
      settlementType: "full_share",  // French OCA — mandatory conversion
      source: "Euronext Jul 2025 (OCA B-04)",
      sourceUrl:
        "https://www.finanzwire.com/press-release/capital-b-capital-increase-and-convertible-bonds-issuance-for-eur115-million-with-tobam-bitcoin-alpha-fund-to-pursue-its-bitcoin-treasury-company-strategy-0WAE500EF0o",
      expiration: "2030-07-01",
      notes: "OCA B-04: Adam Back (€5M). Conversion at €5.174/share.",
    },
    {
      type: "convertible",
      strikePrice: 3.80, // €3.6557 × 1.04
      potentialShares: 1_778_045,
      faceValue: 6_760_000, // €6.5M × 1.04
      settlementType: "full_share",  // French OCA — mandatory conversion
      source: "Euronext Aug 2025 (OCA A-05 T1)",
      sourceUrl:
        "https://www.finanzwire.com/press-release/capital-b-capital-increase-and-convertible-bonds-issuance-for-eur115-million-with-tobam-bitcoin-alpha-fund-to-pursue-its-bitcoin-treasury-company-strategy-0WAE500EF0o",
      expiration: "2030-08-01",
      notes: "OCA A-05 Tranche 1: TOBAM (€6.5M). Conversion at €3.6557/share.",
    },
    // === Free Shares (Employee/Officer Grants) ===
    {
      type: "free_shares",
      strikePrice: 0,
      potentialShares: 2_333_750,
      source: "AMF filing Feb 16, 2026",
      sourceUrl: "https://fr.ftp.opendatasoft.com/datadila/INFOFI/ACT/2026/02/FCACT078298_20260216.pdf",
      notes: "Free shares granted to employees/officers, not yet vested. Included in company's fully diluted count (392,278,260).",
    },
  ],

  // ZOOZ (ZOOZ Strategy Ltd.) - Israeli BTC treasury company
  // Verified 2026-02-17 via SEC 424B5 Sep 30, 2025 (accession 0001493152-25-016384)
  // Foreign private issuer (Israel), Nasdaq + TASE dual-listed
  // Basic shares: ~163M as of Dec 31, 2025 (161.9M + ~1.14M ATM)
  ZOOZ: [
    {
      type: "warrant",
      strikePrice: 11.50,
      potentialShares: 6_022_500,
      source: "SEC 424B5 Sep 30, 2025: ZOOZW public warrants",
      sourceUrl: "/filings/zooz/0001493152-25-016384",
      expiration: "2029-09-30",  // Estimated 5yr from SPAC merger
      notes: "ZOOZW public warrants (trade on Nasdaq). From Keyarch SPAC merger.",
    },
    {
      type: "warrant",
      strikePrice: 3.06,
      potentialShares: 5_350_000,
      source: "SEC 424B5 Sep 30, 2025: Private Placement warrants",
      sourceUrl: "/filings/zooz/0001493152-25-016384",
      expiration: "2030-07-29",  // Estimated 5yr from Jul 2025 PP
      notes: "Private Placement warrants from Jul/Sep 2025 equity raise",
    },
    {
      type: "warrant",
      strikePrice: 2.17,  // Per filing
      potentialShares: 40_360_895,
      source: "SEC 424B5 Sep 30, 2025: Forest Hill / Sponsor Support Agreement warrants",
      sourceUrl: "/filings/zooz/0001493152-25-016384",
      expiration: "2029-09-30",  // Estimated
      notes: "Forest Hill 18, LP sponsor warrants at $2.17 strike. LARGEST dilutive block.",
    },
    {
      type: "option",
      strikePrice: 5.31,
      potentialShares: 920_010,
      source: "SEC 424B5 Sep 30, 2025: outstanding options",
      sourceUrl: "/filings/zooz/0001493152-25-016384",
      expiration: "2030-09-30",  // Estimated
      notes: "Employee stock options, weighted avg exercise price $5.31",
    },
    {
      type: "rsu",
      strikePrice: 0,
      potentialShares: 20_180_448,  // CEO 13,453,632 + Chairman 6,726,816
      source: "SEC 424B5 Sep 30, 2025: RSUs granted to CEO + Chairman",
      sourceUrl: "/filings/zooz/0001493152-25-016384",
      expiration: "2030-09-30",  // Estimated vesting
      notes: "CEO Jordan Fried: 13.45M RSUs + Chairman Avi Cohen: 6.73M RSUs. Vesting unknown.",
    },
    {
      type: "warrant",
      strikePrice: 0.001,
      potentialShares: 4_000_000,
      source: "SEC 424B5 Sep 30, 2025: Keyarch earnout shares at nominal strike",
      sourceUrl: "/filings/zooz/0001493152-25-016384",
      expiration: "2029-09-30",  // Estimated
      notes: "Keyarch SPAC earnout shares at ~$0.001 strike — effectively free. From pre-closing structure.",
    },
    {
      type: "warrant",
      strikePrice: 0.001,
      potentialShares: 29_525_926,
      source: "SEC 424B5 Sep 30, 2025: Private Placement pre-funded warrants",
      sourceUrl: "/filings/zooz/0001493152-25-016384",
      expiration: "2030-07-29",  // Estimated — no expiry typically for pre-funded
      notes: "Pre-funded warrants from Jul/Sep 2025 Private Placement at NIS 0.00286 (~$0.001). Permanently ITM. Cost ~$29K total to exercise.",
    },
  ],

  // ZONE (CleanCore Solutions) - DOGE treasury company
  // Verified 2026-01-29 via SEC 8-K Sep 5, 2025
  // Pre-funded warrants (175M @ $0.0001) already exercised and included in basic shares
  // Placement Agent and Strategic Advisor warrants remain outstanding
  ZONE: [
    {
      type: "warrant",
      strikePrice: 1.00,
      potentialShares: 8_750_021,
      source: "8-K Sep 5, 2025 (EX-4.4, EX-4.5)",
      sourceUrl:
        "/filings/zone/0001213900-25-085107",
      expiration: "2030-09-05",
      notes: "Strategic Advisor warrants (Gresham Worldwide LLC) at $1.00 strike",
    },
    {
      type: "warrant",
      strikePrice: 1.33,
      potentialShares: 5_250_013,
      source: "8-K Sep 5, 2025 (EX-4.2, EX-4.3)",
      sourceUrl:
        "/filings/zone/0001213900-25-085107",
      expiration: "2030-09-05",
      notes: "Placement Agent warrants (Maxim 3.15M + Curvature 2.1M) at $1.33 strike",
    },
  ],

  // CWD (Caliber / CaliberCos) - LINK treasury company
  // SEC CIK: 0001627282 | Nasdaq: CWD
  // First Nasdaq-listed LINK treasury - strategy launched Sep 2025
  // Verified 2026-02-01 via SEC XBRL Q3 2025
  // All warrants deep OTM at ~$1.22 stock price
  CWD: [
    {
      type: "warrant",
      strikePrice: 16.49,
      potentialShares: 129_040,
      source: "SEC 10-Q Q3 2025 XBRL",
      sourceUrl:
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1627282&type=10-Q",
      notes: "Warrants outstanding @ $16.49 - deep OTM at ~$1.22 stock",
    },
  ],

  // LUXFF (Luxxfolio Holdings) - Canadian LTC treasury company
  // CSE: LUXX | OTCQB: LUXFF | SEDAR+ Profile: 000044736
  // All prices in USD (converted from CAD at ~0.71 USD/CAD)
  // Verified 2026-01-26 via SEDAR+ FY2025 audited annual (Dec 29, 2025)
  // ALL instruments are OUT of the money at current ~CAD $0.07 (~USD $0.05) stock price
  LUXFF: [
    // === Warrants from Jul 14, 2025 Private Placement (Note 8c) ===
    {
      type: "warrant",
      strikePrice: 0.36, // CAD $0.50 × 0.71 = USD $0.355
      potentialShares: 5_000_000,
      source: "SEDAR+ FY2025 Note 8c",
      sourceUrl: "https://www.sedarplus.ca",
      expiration: "2027-07-14",
      notes: "Jul 2025 placement: 10M units (1 share + 0.5 warrant) @ CAD $0.25. Warrants at CAD $0.50.",
    },
    // === Finder's Warrants from Mar 2025 Placement (Note 8d) ===
    {
      type: "warrant",
      strikePrice: 0.11, // CAD $0.15 × 0.71 = USD $0.107 - LOWEST STRIKE
      potentialShares: 406_119,
      source: "SEDAR+ FY2025 Note 8d",
      sourceUrl: "https://www.sedarplus.ca",
      expiration: "2027-03-25",
      notes: "Mar 2025 placement finder's warrants at CAD $0.15 - lowest strike but still OTM",
    },
    // === Finder's Warrants from Jul 2025 Placement (Note 8d) ===
    {
      type: "warrant",
      strikePrice: 0.36, // CAD $0.50 × 0.71 = USD $0.355
      potentialShares: 570_276,
      source: "SEDAR+ FY2025 Note 8d",
      sourceUrl: "https://www.sedarplus.ca",
      expiration: "2027-07-14",
      notes: "Jul 2025 placement finder's warrants at CAD $0.50",
    },
    // === Stock Options (Note 8d) ===
    {
      type: "option",
      strikePrice: 0.21, // CAD $0.30 weighted avg × 0.71 = USD $0.213
      potentialShares: 1_727_000,
      source: "SEDAR+ FY2025 Note 8d",
      sourceUrl: "https://www.sedarplus.ca",
      notes: "Stock options outstanding Aug 31, 2025 (weighted avg CAD $0.30, range $0.25-$0.40)",
    },
    // === Subsequent Events - Oct 2025 Option Grants (Note 12) ===
    {
      type: "option",
      strikePrice: 0.28, // CAD $0.40 × 0.71 = USD $0.284
      potentialShares: 1_500_000,
      source: "SEDAR+ FY2025 Note 12",
      sourceUrl: "https://www.sedarplus.ca",
      expiration: "2030-10-14",
      notes: "Oct 2025: 500K to director (Oct 1) + 1M to consultants (Oct 14) at CAD $0.40",
    },
    // === Subsequent Events - Dec 9, 2025 Private Placement Warrants (Note 12) ===
    {
      type: "warrant",
      strikePrice: 0.25, // CAD $0.35 × 0.71 = USD $0.249
      potentialShares: 4_624_000,
      source: "SEDAR+ FY2025 Note 12",
      sourceUrl: "https://www.sedarplus.ca",
      expiration: "2027-12-09",
      notes: "Dec 9, 2025 placement: 4.624M units @ CAD $0.17 (1 share + 1 warrant). Warrants at CAD $0.35.",
    },
    // === Subsequent Events - Dec 9, 2025 Finder's Warrants (Note 12) ===
    {
      type: "warrant",
      strikePrice: 0.25, // CAD $0.35 × 0.71 = USD $0.249
      potentialShares: 313_796,
      source: "SEDAR+ FY2025 Note 12",
      sourceUrl: "https://www.sedarplus.ca",
      expiration: "2027-12-09",
      notes: "Dec 9, 2025 placement finder's warrants at CAD $0.35",
    },
  ],
  // Total LUXFF dilutive instruments: 14,141,191 potential shares
  // All OUT of the money at current ~USD $0.05 stock price
  // Lowest strike: CAD $0.15 (USD $0.11) - still 2x+ current price

  // MicroStrategy / Strategy Inc (MSTR) - BTC treasury company
  // Convertible notes tracked for historical dilution analysis.
  // All conversion prices are POST-SPLIT (10:1 split Aug 2024).
  // Source: SEC 8-K filings for each indenture.
  // Face values used to adjust debt when converts are in-the-money (avoid double-counting in EV).
  MSTR: [
    // === Dec 2020 Convertible - $650M @ 0.75% (MATURED Dec 2025) ===
    // Included for historical dilution tracking (was dilutive 2020-2025)
    {
      type: "convertible",
      strikePrice: 39.8, // $398 pre-split / 10
      potentialShares: 16_331_658, // $650M / $39.80
      faceValue: 650_000_000,
      settlementType: "net_share",  // MSTR converts are all net_share per indentures
      source: "8-K Dec 2020",
      sourceUrl:
        "/filings/mstr/0001193125-20-315971",
      issuedDate: "2020-12-11",
      expiration: "2025-12-15", // MATURED - converted to shares
      notes: "$650M @ 0.75% convertible notes due Dec 2025 (MATURED)",
    },
    // === Feb 2021 Convertible - $1.05B @ 0% (FULLY CONVERTED Q1 2025) ===
    {
      type: "convertible",
      strikePrice: 143.25, // $1,432.46 pre-split / 10
      potentialShares: 7_329_843, // $1.05B / $143.25
      faceValue: 1_050_000_000,
      settlementType: "net_share",  // MSTR converts are all net_share per indentures
      source: "10-Q Q3 2025 (Note 5: Long-term Debt)",
      sourceUrl:
        "/filings/mstr/0001193125-25-262568",
      issuedDate: "2021-02-17",
      expiration: "2025-03-31", // Fully redeemed/converted Q1 2025 per Q3 10-Q
      notes: "$1.05B @ 0% convertible notes due Feb 2027 (FULLY CONVERTED Q1 2025 — shares already in basic count)",
    },
    // === Mar 2024 Convertible #1 - $800M @ 0.625% ===
    {
      type: "convertible",
      strikePrice: 149.77, // Initial conversion price per 10-Q Q3 2025 Note 5
      potentialShares: 5_341_600, // 6.677 shares per $1,000 × 800,000 units
      faceValue: 800_000_000,
      source: "10-Q Q3 2025 (Note 5: Long-term Debt)",
      sourceUrl:
        "/filings/mstr/0001193125-25-262568",
      issuedDate: "2024-03-08",
      expiration: "2030-03-15",
      settlementType: "net_share", // Per indenture: principal in cash, excess in shares
      notes: "$800M @ 0.625% convertible notes due Mar 2030 (2030A). Conversion rate: 6.677 per $1,000.",
    },
    // === Mar 2024 Convertible #2 - $603.75M @ 0.875% ===
    {
      type: "convertible",
      strikePrice: 232.72, // Initial conversion price per 10-Q Q3 2025 Note 5
      potentialShares: 2_594_314, // 4.297 shares per $1,000 × 603,750 units
      faceValue: 603_750_000,
      settlementType: "net_share", // Per indenture: principal in cash, excess in shares
      source: "10-Q Q3 2025 (Note 5: Long-term Debt)",
      sourceUrl:
        "/filings/mstr/0001193125-25-262568",
      issuedDate: "2024-03-11",
      expiration: "2031-03-15",
      notes: "$603.75M @ 0.875% convertible notes due Mar 2031. Conversion rate: 4.297 per $1,000.",
    },
    // === Jun 2024 Convertible - $800M @ 2.25% ===
    {
      type: "convertible",
      strikePrice: 204.33, // Initial conversion price per 10-Q Q3 2025 Note 5
      potentialShares: 3_915_200, // 4.894 shares per $1,000 × 800,000 units
      faceValue: 800_000_000,
      settlementType: "net_share", // Per indenture: principal in cash, excess in shares
      source: "10-Q Q3 2025 (Note 5: Long-term Debt)",
      sourceUrl:
        "/filings/mstr/0001193125-25-262568",
      issuedDate: "2024-06-13",
      expiration: "2032-06-15",
      notes: "$800M @ 2.25% convertible notes due Jun 2032. Conversion rate: 4.894 per $1,000.",
    },
    // === Sep 2024 Convertible - $1.01B @ 0.625% (first post-split) ===
    {
      type: "convertible",
      strikePrice: 183.19, // Post-split price
      potentialShares: 5_513_403, // $1.01B / $183.19
      faceValue: 1_010_000_000,
      settlementType: "net_share", // Per indenture: principal in cash, excess in shares
      source: "8-K Sep 2024",
      sourceUrl:
        "/filings/mstr/0001193125-24-220296",
      issuedDate: "2024-09-16",
      expiration: "2028-09-15",
      notes: "$1.01B @ 0.625% convertible notes due Sep 2028 (first post-split)",
    },
    // === Nov 2024 Convertible - $3B @ 0% (largest single issuance) ===
    {
      type: "convertible",
      strikePrice: 672.4, // Post-split price
      potentialShares: 4_462_998, // $3B / $672.40
      faceValue: 3_000_000_000,
      settlementType: "net_share", // Per indenture: principal in cash, excess in shares
      source: "8-K Nov 2024",
      sourceUrl:
        "/filings/mstr/0001193125-24-263336",
      issuedDate: "2024-11-20",
      expiration: "2029-12-01",
      notes: "$3B @ 0% convertible notes due Dec 2029 (largest single issuance)",
    },
    // === Feb 2025 Convertible - $2B @ 0% ===
    {
      type: "convertible",
      strikePrice: 433.43, // 2.3072 shares per $1,000
      potentialShares: 4_614_400, // 2.3072 × 2,000,000
      faceValue: 2_000_000_000,
      settlementType: "net_share", // Per indenture: principal in cash, excess in shares
      source: "8-K Feb 2025",
      sourceUrl:
        "/filings/mstr/0001193125-25-030212",
      issuedDate: "2025-02-20",
      expiration: "2030-03-01",
      notes: "$2B @ 0% convertible notes due Mar 2030 (2030B Notes)",
    },
  ],
  // Total MSTR convertible dilution: ~26.4M potential shares (active notes only)
  // Conversion prices per 10-Q Q3 2025 Note 5 (initial conversion prices):
  // - $149.77 (2030A), $183.19 (2028), $204.33 (2032), $232.72 (2031), $433.43 (2030B), $672.40 (2029)
  // At current ~$350 stock price:
  // - IN money: $149.77, $183.19, $204.33, $232.72 → ~17.4M dilutive shares
  // - OUT of money: $433.43, $672.40 → ~9.1M non-dilutive
  // Note: Dec 2020 $650M notes matured Dec 15, 2025 and converted to ~16.3M shares
  // Note: Feb 2021 $1.05B notes fully redeemed/converted Q1 2025 (per Q3 10-Q) — shares in basic count

  // ==================== BNB COMPANIES ====================

  // CEA Industries / BNB Network Company (BNC) - World's largest BNB treasury
  // $500M PIPE closed Aug 5, 2025 with stapled warrants
  // Verified 2026-01-28 via SEC filings and investor dashboard
  // Basic shares: ~52M (PIPE shares + pre-existing)
  // Warrants: 49.5M @ $15.15 (currently OTM at ~$5.32 stock)
  BNC: [
    {
      type: "warrant",
      strikePrice: 15.15,
      potentialShares: 49_504_988,
      source: "8-K Aug 2025 (PIPE)",
      sourceUrl:
        "https://www.globenewswire.com/news-release/2025/08/05/3127489/0/en/CEA-Industries-Closes-500-Million-Private-Placement-to-Advance-Its-BNB-Treasury-Strategy-Common-Stock-Ticker-to-Become-BNC.html",
      issuedDate: "2025-08-05",
      notes:
        "Stapled warrants from $500M PIPE. Trade as BNCWW. Up to $750M if all exercised.",
    },
  ],
  // Total BNC dilution: 49.5M potential warrant shares
  // At $5.32 stock: All warrants OUT of money ($15.15 strike)
  // Fully diluted if ITM: ~52M basic + 49.5M = ~101.5M shares

  // Nano Labs (NA) - BNB treasury company (#2 behind BNC)
  // $500M convertible notes program announced Jul 2025
  // Conversion price: $20/share, 360-day term, 0% interest
  // Also has warrants from 2024 private placement
  // Verified 2026-01-29 via SEC 424B3 filings (CIK 0001872302)
  NA: [
    {
      type: "convertible",
      strikePrice: 20.00,
      potentialShares: 25_000_000,  // $500M / $20 = 25M shares max
      faceValue: 500_000_000,
      settlementType: "issuer_election",  // Notes say "if can't convert, repay in BTC" — company chooses method
      source: "SEC 424B3 Jul 2025",
      sourceUrl:
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1872302&type=424B3",
      expiration: "2026-07-01",  // ~360 days from Jul 2025
      issuedDate: "2025-07-01",
      notes: "$500M 0% converts @ $20. Deep OTM at ~$5 stock. If can't convert, repay in BTC.",
    },
    {
      type: "warrant",
      strikePrice: 10.00,
      potentialShares: 5_952_381,  // From 424B3 prospectus (Sep 2025)
      source: "SEC 424B3 Sep 2025",
      sourceUrl:
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1872302&type=424B3",
      expiration: "2030-04-11",  // 5 years from Apr 2024 issuance
      issuedDate: "2024-04-11",
      notes: "Warrants from Apr 2024 private placement. OTM at ~$5 stock.",
    },
    {
      type: "warrant",
      strikePrice: 7.30,  // From Apr 2024 6-K (652,174 shares @ $7.30)
      potentialShares: 652_174,
      source: "SEC 424B3 Sep 2025",
      sourceUrl:
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1872302&type=424B3",
      expiration: "2029-04-11",  // 5 years from Apr 2024
      issuedDate: "2024-04-11",
      notes: "Additional warrants from Apr 2024 placement.",
    },
  ],
  // Total NA dilution: ~31.6M potential shares (if all ITM)
  // At ~$5 stock: All instruments OUT of money
  // Converts especially deep OTM ($20 strike vs $5 stock)

  // AVX (AVAX One Technology) - AVAX treasury company
  // Verified 2026-02-13 via SEC 8-K (CIK 0001826397)
  // Basic shares: 92,672,000 (dashboard Feb 12, 2026 — post-PIPE 93.1M minus buybacks)
  // Pre-funded warrants at $0.0001 are functionally common stock
  AVX: [
    {
      type: "warrant",
      strikePrice: 0.0001, // Pre-funded warrants - essentially exercisable at any price
      potentialShares: 6_123_837,
      source: "8-K Nov 6, 2025 (PIPE closing)",
      sourceUrl:
        "/filings/avx/0001493152-25-021006",
      issuedDate: "2025-11-05",
      notes:
        "Pre-funded warrants from $219M PIPE. Strike essentially zero - always ITM.",
    },
  ],
  // Total AVX dilution: 6.1M pre-funded warrants (always ITM)
  // Fully diluted: ~92.7M basic + 6.1M = ~98.8M shares
  // Also: 2024 Equity Plan has 5.75M authorized (grants TBD in 10-K)

  // DJT (Trump Media & Technology Group) - BTC treasury company
  // Verified 2026-02-13 via SEC XBRL + 8-K filings (CIK 0001849635)
  // Basic shares: 279,997,636 (Q3 2025 10-Q, as of Nov 5, 2025)
  // Verified 2026-02-15 via SEC 8-K EX-4.1 indenture + Q3 10-Q footnotes (CIK 0001849635)
  DJT: [
    {
      type: "convertible",
      strikePrice: 34.72, // $1,000 / 28.8 shares per $1,000 = $34.72 per share
      potentialShares: 28_800_000, // $1B par × 28.8 / 1000 = 28,800,000 shares
      faceValue: 1_000_000_000, // $1B par value — subtracted from debt when ITM
      settlementType: "full_share",  // Physical settlement only — no cash or combination option per indenture
      source: "8-K May 30, 2025 EX-4.1 Indenture (conversion rate 28.8 shares per $1,000)",
      sourceUrl: "/filings/djt/0001140361-25-020967",
      expiration: "2028-05-29",
      issuedDate: "2025-05-29",
      notes:
        "$1B par zero-coupon convertible senior secured notes due 2028. Conversion rate: 28.8 shares per $1,000 principal ($34.72 strike). Carrying value ~$946M (XBRL: ConvertibleNotesPayable).",
    },
    {
      type: "warrant",
      strikePrice: 11.50,
      potentialShares: 11_019_766,
      source: "Q3 2025 10-Q Note 13 (DJTWW public warrants from DWAC merger)",
      sourceUrl: "/filings/djt/0001140361-25-040977",
      expiration: "2029-03-25",
      issuedDate: "2021-09-08",
      notes:
        "Legacy DWAC SPAC public warrants trading as DJTWW. 11,019,766 warrants at $11.50 exercise. Exercisable for Class A common stock.",
    },
    {
      type: "rsu",
      strikePrice: 0, // RSUs have no exercise price — always dilutive
      potentialShares: 2_672_526,
      source: "Q3 2025 10-Q dilutive securities table (anti-dilutive exclusions)",
      sourceUrl: "/filings/djt/0001140361-25-040977",
      notes:
        "2,672,526 RSUs outstanding as of Q3 2025. No strike price — always ITM and dilutive. Part of 42.5M total anti-dilutive shares excluded from diluted EPS.",
    },
  ],
  // Total DJT dilution: 28.8M convert shares ($34.72 strike) + 11M DJTWW warrants ($11.50) + 2.67M RSUs ($0 strike)
  // Earnout shares (40M): fully vested Apr 26, 2024 — already in basic share count (279.9M), NOT additional dilution
  // Make-whole: in fundamental change, convert rate can increase from 28.8 to max 38.88 shares/$1,000

  // NAKA (Nakamoto Inc.) - BTC treasury company
  // Verified 2026-02-15 via SEC 10-Q Q3 2025 XBRL (CIK 0001946573)
  // Basic shares for mNAV: 511,555,864 (439.85M common + 71.7M pre-funded warrants at $0.001)
  // Pre-funded warrants already included in basic count (near-zero exercise price)
  // NOTE: 85.1M warrants at Sep 30 → only 384,936 tradeable + 203,565 non-tradeable by Nov 14 (10-Q cover page)
  NAKA: [
    {
      type: "warrant",
      strikePrice: 6.33, // From KindlyMD 424B4 IPO prospectus (May 31, 2024)
      potentialShares: 384_936, // Nov 14, 2025 10-Q cover page. Down from 85.1M at Sep 30.
      source: "10-Q Q3 2025 cover page: 384,936 tradeable warrants as of Nov 14, 2025",
      sourceUrl:
        "/filings/naka/0001493152-25-024260",
      expiration: "2029-05-31", // 5 years from IPO (May 2024 424B4 prospectus)
      issuedDate: "2024-05-31",
      notes:
        "Tradeable warrants (NAKAW). Down from 85.1M at Sep 30 to 384.9K at Nov 14 — most exercised during PIPE/merger. Strike $6.33 per IPO prospectus.",
    },
    {
      type: "warrant",
      strikePrice: 6.33, // Same terms as tradeable warrants
      potentialShares: 101_783, // 203,565 non-tradeable warrants → 101,783 shares (2:1 exercise ratio per prospectus)
      source: "10-Q Q3 2025 cover page: 203,565 non-tradeable warrants as of Nov 14, 2025",
      sourceUrl:
        "/filings/naka/0001493152-25-024260",
      expiration: "2029-05-31",
      issuedDate: "2024-05-31",
      notes:
        "Non-tradeable warrants from IPO. 203,565 warrants exercisable for 101,783 shares.",
    },
    // Note: $200M Yorkville convertible debenture (conversion $2.80) was EXTINGUISHED Oct 2025
    // Replaced by Two Prime loan → Kraken $210M BTC-backed loan (Dec 2025)
    // No convertible debt outstanding as of Dec 2025
  ],

  // Boyaa Interactive (0434.HK) - Hong Kong BTC treasury
  // Verified 2026-02-15 via HKEX Q3 2025 Results + Jan 2026 Monthly Return
  // Basic shares: 767,804,730 (770,976,730 total - 3,172,000 treasury)
  // No warrants, no convertibles, no share options outstanding (all exercised/expired)
  // 2024 Share Option Scheme adopted but no options granted yet (capacity: 70,957,630)
  "0434.HK": [
    {
      type: "rsu",
      strikePrice: 0, // RSUs vest at no cost
      potentialShares: 4_350_003, // 2024 RSU Scheme outstanding as of Sep 30, 2025
      source: "HKEX Q3 2025 Results: RSU Scheme details",
      sourceUrl:
        "https://www1.hkexnews.hk/listedco/listconews/sehk/2025/1117/2025111700291.pdf",
      notes:
        "RSUs from 2024 scheme. 5.85M granted in 9M 2025, 2.84M vested. Always dilutive (no exercise price).",
    },
  ],

  // CYPH (Cypherpunk Technologies) - ZEC treasury company
  // Verified 2026-01-29 via SEC 8-K Oct 9, 2025 (CIK 0001509745)
  // Basic shares: 137,420,344 (56.6M common + 80.8M pre-funded warrants already in basic)
  CYPH: [
    {
      type: "warrant",
      strikePrice: 0.001,
      potentialShares: 80_820_163,
      source: "SEC 8-K Oct 9, 2025 (PIPE closing)",
      sourceUrl: "/filings/cyph/0001104659-25-098082",
      expiration: "9999-12-31",
      issuedDate: "2025-10-08",
      includedInBase: true,
      notes: "Pre-funded warrants (PFW) @ $0.001. Already included in sharesForMnav (137,420,344 = 56.6M common + 80.8M PFW).",
    },
    {
      type: "warrant",
      strikePrice: 0.5335,
      potentialShares: 71_985_605,
      source: "SEC 8-K Oct 9, 2025 (PIPE closing)",
      sourceUrl:
        "/filings/cyph/0001104659-25-098082",
      expiration: "2035-10-08",
      issuedDate: "2025-10-08",
      notes: "Common warrants from $58.88M PIPE. 10-year term.",
    },
    {
      type: "warrant",
      strikePrice: 0.5335,
      potentialShares: 4_000_000,
      source: "SEC 8-K Oct 9, 2025 (placement agent warrants)",
      sourceUrl:
        "/filings/cyph/0001104659-25-098082",
      expiration: "2035-10-08",
      issuedDate: "2025-10-08",
      notes: "Placement agent warrants (Parcrest). Same terms as common warrants.",
    },
  ],
  // Total CYPH dilution: ~76M warrants @ $0.5335 (expire Oct 2035)
  // At stock prices above $0.5335: all warrants ITM
  // Fully diluted: 137.4M basic + 76M warrants = ~213.4M shares

  // DDC (DDC Enterprise) - BTC treasury company
  // Updated 2026-02-16 via SEC 6-K Feb 6, 424B3 Jan 26, 20-F FY2024, treasury.ddc.xyz
  // CIK: 0001808110
  // Basic shares: 28,723,005 (Class A, per 6-K Feb 6, 2026)
  // Class B: 1,750,000 (CEO Norma Chu, 10x voting)
  // Total economic shares: 30,473,005
  // Dashboard diluted: 35,724,861
  DDC: [
    {
      type: "option",
      strikePrice: 3.85, // Weighted avg exercise price
      potentialShares: 1_655_928,
      source: "SEC 20-F FY2024",
      sourceUrl:
        "/filings/ddc/0001213900-25-043916",
      notes: "2023 ESOP stock options outstanding as of Dec 31, 2024. May be reduced post-Nov 2024 cancellation of underwater grants — verify with 20-F FY2025.",
    },
    {
      type: "warrant",
      strikePrice: 0, // Exercise price set by Board at issuance - TBD
      potentialShares: 2_199_999,
      source: "SEC F-1 Jan 15, 2026",
      sourceUrl:
        "/filings/ddc/0001213900-26-004713",
      issuedDate: "2025-06-01",
      expiration: "2035-06-01", // 10-year term
      notes: "2025 Warrant Program: CEO 1.7M + execs/directors 500K. Vest 3yr, expire 10yr. Strike TBD by Board.",
    },
    {
      type: "convertible",
      strikePrice: 13.65,  // SEC Exhibit 10.2 (6-K Jul 11, 2025): Conversion Price $13.65/share
      potentialShares: 1_978_022,  // $27,000,000 / $13.65 = 1,978,022
      faceValue: 27_000_000,
      settlementType: "full_share",  // Senior secured convertible — toxic conversion feature, share delivery
      source: "SEC 6-K Jul 11, 2025 Exhibit 10.2 (Form of Initial Note)",
      sourceUrl:
        "/filings/ddc/0001213900-25-063293",
      expiration: "2027-07-01",
      issuedDate: "2025-07-01",
      notes: "Anson Initial Notes. $27M senior secured, 0% interest (12% on default). " +
        "Conversion at $13.65/share (SEC Exhibit 10.2). Dashboard shows $8.97 — may reflect anti-dilution adjustments. " +
        "⚠️ TOXIC ALTERNATE CONVERSION RENEGOTIATED (Sep 2025 Waiver): Now 88% of lowest VWAP in 20 trading days (was 94% of 10-day). " +
        "At ~$2.60 stock → ~$2.29 alt conversion → ~11.8M shares. 4.99% beneficial ownership cap. " +
        "Secured by all BTC + cash collateral. LTV covenant ≤60%. $275M additional capacity undrawn. " +
        "DDC breached covenants Sep 2025 — Anson granted 56-day forbearance in exchange for worse terms.",
    },
    {
      type: "warrant",
      strikePrice: 0,  // Exercise price "set forth therein" — undisclosed in prospectus, TBD
      potentialShares: 3_583_306,  // Doubled from 1,791,653 due to 70% warrant coverage (was 35%) per Sep 2025 Waiver
      source: "SEC 424B3 Jan 26, 2026 (Anson SPA) + treasury.ddc.xyz Shares tab",
      sourceUrl:
        "/filings/ddc/0001213900-26-007463",
      issuedDate: "2025-07-01",
      expiration: "2030-07-01",  // 5-year term from issuance
      notes: "Anson Initial Warrants from $27M convertible deal. Exercisable immediately. Strike undisclosed in prospectus. " +
        "⚠️ Warrant coverage DOUBLED to 70% (was 35%) per Sep 2025 Waiver/Forbearance Agreement due to covenant breaches.",
    },
    {
      type: "preferred",
      strikePrice: 0,  // Conversion at 150% of 5-day VWAP at closing — TBD
      potentialShares: 16_000_000,
      faceValue: 32_800_000,
      source: "SEC 6-K Feb 6, 2026",
      sourceUrl:
        "/filings/ddc/0001213900-26-013341",
      issuedDate: "2025-12-30",
      notes: "Satoshi Strategic — 16M senior convertible preferred shares at $2.05 stated value. " +
        "4.5% annual dividend. Converts at 150% of 5-day VWAP preceding close — " +
        "16M preferred ≠ 16M Class A; actual dilution depends on VWAP (e.g., at $2.60 VWAP → $3.90 conversion → ~8.4M Class A). " +
        "Subject to NYSE approval. NOT YET CLOSED as of Feb 2026.",
    },
  ],
  // Total DDC dilution: ~25.4M potential shares (excl. Anson alternate conversion scenario)
  // ⚠️ Anson toxic alternate conversion RENEGOTIATED Sep 2025: 88% of 20-day low VWAP (was 94% of 10-day) → ~11.8M shares at ~$2.60
  // ⚠️ Anson warrants doubled to 3,583,306 (70% coverage, was 35%) per Sep 2025 Waiver
  // ⚠️ $124M subscription (12.4M shares at $10) pending NYSE approval — not yet in share count
  // ⚠️ Put Option: BTC subscription investors can put shares back at $18.50 if market cap < $500M
  //    PUT OPTION DETAILS (SEC 6-K Jul 3, 2025): Strike $18.50, currently exercisable (~$75M mcap).
  //    Collateral: BTC from 'Charged Wallet'. Could force DDC to sell BTC to honor put obligation.
  //    Not modeled as dilutive instrument (no share dilution), but material risk to BTC holdings.
  //    Source: /filings/ddc/0001213900-25-063293
  // At ~$2.60 stock: Options OTM ($3.85), Anson convert OTM ($8.97), Satoshi preferred TBD
  // 2023 ESOP allows up to 1.208M shares + 10% annual increase
  // 2025 Warrant Program: up to 5M for CEO in 2025, then 25% of outstanding annually

  // FLD (Fold Holdings) - BTC treasury company
  // Verified 2026-02-17 via SEC 10-Q Q3 2025 (CIK 0001889123)
  // Basic shares: 48,307,642 (Nov 2025)
  // Convertible debt: $66.3M ($20M June convert + $46.3M March convert)
  // Public warrants: 12.4M FLDDW @ $11.50 (SPAC legacy)
  FLD: [
    {
      type: "warrant",
      strikePrice: 15.00,
      potentialShares: 925_590,
      source: "SEC 10-Q Q3 2025",
      sourceUrl:
        "/filings/fld/0001193125-25-274317",
      notes: "March 2025 Warrants @ $15 - deep OTM at ~$2 stock",
    },
    {
      type: "convertible",
      strikePrice: 9.00,
      potentialShares: 2_222_222,  // $20M / $9
      faceValue: 20_000_000,
      settlementType: "full_share",  // Investor note — RETIRED Feb 2026
      source: "SEC 10-Q Q3 2025",
      sourceUrl:
        "/filings/fld/0001193125-25-274317",
      expiration: "2026-02-27",  // Retired Feb 27, 2026 (original maturity 2028-02-14)
      notes: "June 2025 Amended Investor Note @ $9/share. Secured by 300 BTC. RETIRED Feb 27, 2026.",
    },
    {
      type: "convertible",
      strikePrice: 12.50,
      potentialShares: 3_702_360,  // $46,279,500 / $12.50
      faceValue: 46_300_000,  // Principal (fair value is $60.8M)
      settlementType: "full_share",  // Investor note — RETIRED Feb 2026
      source: "SEC 10-Q Q3 2025",
      sourceUrl:
        "/filings/fld/0001193125-25-274317",
      expiration: "2026-02-27",  // Retired Feb 27, 2026
      notes: "March 2025 Investor Note (SATS Credit Fund - related party) @ $12.50/share. Funded with 475 BTC. RETIRED Feb 27, 2026.",
    },
    {
      type: "warrant",
      strikePrice: 11.50,
      potentialShares: 12_434_658,
      source: "SEC 10-Q Q3 2025 Note 11 (Warrants)",
      sourceUrl:
        "/filings/fld/0001193125-25-274317",
      notes: "FLDDW public warrants (legacy FTAC Emerald SPAC). Each warrant exercisable for one share @ $11.50. Trades on Nasdaq. Deep OTM at ~$2 stock.",
    },
    {
      type: "warrant",
      strikePrice: 12.50,
      potentialShares: 869_565,
      source: "SEC 10-Q Q3 2025 Note 10 (December 2024 SPA)",
      sourceUrl:
        "/filings/fld/0001193125-25-274317",
      issuedDate: "2024-12-01",
      notes: "Series A Warrants from December 2024 SPA. 8-year expiry. Deep OTM at ~$2 stock.",
    },
    {
      type: "warrant",
      strikePrice: 9.00,
      potentialShares: 869_565,
      source: "SEC 10-Q Q3 2025 Note 10 (June 2025 Amendment)",
      sourceUrl:
        "/filings/fld/0001193125-25-274317",
      issuedDate: "2025-06-16",
      expiration: "2026-08-14",
      notes: "Series C Warrants (amended from $11.50 to $9.00 in June 2025). Expires Aug 14, 2026 — near-term! Deep OTM at ~$2 stock.",
    },
  ],
  // Total FLD dilution: 15.1M warrants + 5.9M convert shares = 21.0M potential (all OTM)
  // FLDDW: 12,434,658 public warrants @ $11.50 (largest single instrument)
  // All instruments deep OTM at ~$2 stock vs $9-$15 strikes
  // 300 BTC collateral on June note, 500 BTC funded March note (800 total restricted)
  // Series C warrants (869K @ $9) expire Aug 14, 2026 — monitor
  // Two Prime revolving facility ($45M max) — additional BTC collateral TBD

  // FGNX (FG Nexus) - ETH treasury company
  // Verified 2026-02-17 via SEC 10-Q Q3 2025 + 8-K Feb 13, 2026 (CIK 0001591890)
  // Basic shares: 6,720,000 post-split (33,600,000 pre-split ÷ 5)
  // All figures POST 1:5 reverse split (effective Feb 13, 2026)
  FGNX: [
    {
      type: "warrant",
      strikePrice: 27.50,  // $5.50 pre-split × 5
      potentialShares: 600_000,  // 3,000,000 pre-split ÷ 5
      source: "SEC 10-Q Q3 2025 Note 11",
      sourceUrl:
        "/filings/fgnx/0001493152-25-023550",
      issuedDate: "2025-07-29",
      expiration: "2035-07-29",  // ~10 year term
      notes: "Placement Agent Warrants (ThinkEquity). Post-split: 600K shares @ $27.50.",
    },
    {
      type: "warrant",
      strikePrice: 25.00,  // $5.00 pre-split × 5
      potentialShares: 140_000,  // 700,000 pre-split ÷ 5
      source: "SEC 10-Q Q3 2025 Note 11",
      sourceUrl:
        "/filings/fgnx/0001493152-25-023550",
      notes: "OGroup LLC affiliate warrants. Post-split: 140K shares @ $25.00. CEO Cerminara is Managing Member of OGroup.",
    },
    {
      type: "warrant",
      strikePrice: 25.00,  // $5.00 pre-split × 5
      potentialShares: 140_000,  // 700,000 pre-split ÷ 5
      source: "SEC 10-Q Q3 2025 Note 11",
      sourceUrl:
        "/filings/fgnx/0001493152-25-023550",
      notes: "FG Merchant Partners affiliate warrants. Post-split: 140K shares @ $25.00. CEO-affiliated entity.",
    },
    {
      type: "option",
      strikePrice: 358.30,  // $71.66 pre-split × 5
      potentialShares: 5_298,  // 26,490 pre-split ÷ 5
      source: "SEC 10-Q Q3 2025 Note 10",
      sourceUrl:
        "/filings/fgnx/0001493152-25-023550",
      notes: "2021 Equity Incentive Plan options. Deep OTM (~$358 strike vs ~$15-25 stock). Immaterial.",
    },
  ],
  // Total FGNX dilution: 885K warrants + 5K options = ~890K potential shares (all OTM)
  // All instruments OTM: warrants at $25-$27.50, options at $358 vs ~$15-25 post-split stock
  // Pre-funded warrants (~165K post-split @ $0.005) already included in basic share count
  // Legacy warrants (~4.5K @ $359, expiring ~2027) omitted as immaterial
  // $5B ATM shelf suspended since Oct 2025 — monitor for reinstatement
  // 894,580 Series A preferred ($25 par, non-convertible) — tracked as preferredEquity, not dilutive
  // ⚠️ GOVERNANCE: CEO Cerminara controls OGroup + FG Merchant (280K combined warrants @ $25)
  //    These are related-party warrants at $2.50 better than placement agent's $27.50 strike
  //    CEO total control: ~992K shares + warrants through Cerminara Capital, FG Financial, OGroup, FG Merchant

  // FUFU (BitFuFu) - BTC miner (Foreign Private Issuer)
  // Verified 2026-02-16 via SEC 20-F FY2024, 6-K H1 2025 XBRL, and 6-K Jan 2026
  // CIK: 0001921158
  // Basic shares: 164,131,946 (Jun 2025 XBRL)
  // Debt: $141.3M ($101.3M equipment payable + $40M BTC-collateralized loans)
  FUFU: [
    {
      type: "warrant",
      strikePrice: 11.50,
      potentialShares: 5_382_292,  // 7,176,389 warrants × 0.75 shares each
      source: "SEC 20-F FY2024",
      sourceUrl:
        "/filings/fufu/0001213900-25-033733",
      notes: "Public warrants @ $11.50 - each warrant = 3/4 share. Deep OTM at ~$2.80 stock.",
    },
    {
      type: "rsu",
      strikePrice: 0,  // Restricted shares vest at $0 — always ITM
      potentialShares: 297_444,
      source: "SEC 6-K H1 2025 XBRL: SharebasedCompensationArrangementBySharebasedPaymentAwardOptionsNonvestedNumberOfShares",
      sourceUrl:
        "/filings/fufu/0001213900-25-084744",
      notes: "Unvested restricted shares under 2022 Share Incentive Plan. 6,512,781 granted, 6,176,756 vested, 297,444 unvested (Jun 2025). Grant date fair value $5.05/share. Always ITM.",
    },
    {
      type: "warrant",
      strikePrice: 11.50,
      potentialShares: 207_000,  // 115,000 shares + 86,250 warrant shares (0.75 each) + 5,750 rights (1/20 each)
      source: "SEC 20-F FY2024 (Chardan Unit Purchase Option)",
      sourceUrl:
        "/filings/fufu/0001213900-25-033733",
      notes: "Chardan Unit Purchase Option: 115,000 units @ $11.50. Each unit = 1 share + 1 warrant (3/4 share) + 1 right (1/20 share) = ~1.8 shares. Deep OTM. Immaterial (~0.1% dilution).",
    },
  ],
  // Total FUFU dilution: 5.4M public warrant shares + 297K RSUs (always ITM) + 207K Chardan UPO (OTM)
  // At ~$2.80 stock: only 297K RSUs are ITM. All warrants/UPO deep OTM at $11.50.
  // ATM program (Jun 2025, B. Riley/Cantor) allows ongoing issuance — ~1M shares issued in H1 2025.

  // HYPD (Hyperion DeFi) - HYPE treasury company
  // Verified 2026-01-30 via SEC 424B3 (Jan 9, 2026) and 10-Q Q3 2025
  // CIK: 0001682639
  // sharesForMnav already includes: 8.1M common + 16.3M from preferred conversion = 24.4M
  // Warrants NOT included in sharesForMnav - tracking here for ITM dilution
  // At ~$3.45 stock (Jan 8, 2026): $3.25 warrants are ITM, $4.00 warrants are OTM
  HYPD: [
    {
      type: "preferred",
      strikePrice: 0,
      potentialShares: 16_307_691,  // 5,435,897 preferred × 3:1 conversion ratio
      source: "SEC 10-Q Q3 2025 (Series A Preferred)",
      sourceUrl: "/filings/hypd/0001104659-25-120439",
      issuedDate: "2025-06-20",
      notes: "Series A Preferred shares at 3:1 conversion. Included in sharesForMnav (24.4M total).",
      includedInBase: true,
    },
    {
      type: "warrant",
      strikePrice: 3.25,
      potentialShares: 30_769_230,
      source: "424B3 Jan 9, 2026 (Purchaser Warrants)",
      sourceUrl:
        "/filings/hypd/0001104659-26-002496",
      issuedDate: "2025-06-20",
      notes: "Purchaser Warrants from Jun 2025 PIPE. ITM at $3.45 stock.",
    },
    {
      type: "warrant",
      strikePrice: 3.25,
      potentialShares: 1_846_153,
      source: "424B3 Jan 9, 2026 (Placement Agent Warrants)",
      sourceUrl:
        "/filings/hypd/0001104659-26-002496",
      issuedDate: "2025-06-20",
      notes: "Chardan placement agent warrants. ITM at $3.45 stock.",
    },
    {
      type: "warrant",
      strikePrice: 4.00,
      potentialShares: 350_000,
      source: "424B3 Jan 9, 2026 (Lender Warrants)",
      sourceUrl:
        "/filings/hypd/0001104659-26-002496",
      notes: "Avenue Capital lender warrants. OTM at $3.45 stock.",
    },
  ],

  // LITS (Lite Strategy) - LTC treasury company
  // Verified 2026-01-30 via SEC 10-Q Q1 FY2026 (CIK 0001262104)
  // Pre-funded warrants @ $0.0001 already included in sharesForMnav (36.8M)
  // Only tracking GSR advisory warrants here (OTM at current price ~$2.70)
  // All 4 tranches: 584,795 @ $3.42, 292,398 @ $3.93, 292,398 @ $4.62, 292,398 @ $5.13
  LITS: [
    {
      type: "warrant",
      strikePrice: 3.42,
      potentialShares: 584_795,
      source: "10-Q Q1 FY2026",
      sourceUrl: "/filings/lits/0001193125-25-283111",
      expiration: "2030-07-22",
      notes: "GSR 1 advisory warrants - OTM at ~$2.70",
    },
    {
      type: "warrant",
      strikePrice: 3.93,
      potentialShares: 292_398,
      source: "10-Q Q1 FY2026",
      sourceUrl: "/filings/lits/0001193125-25-283111",
      expiration: "2030-07-22",
      notes: "GSR 2 advisory warrants - OTM at ~$2.70",
    },
    {
      type: "warrant",
      strikePrice: 4.62,
      potentialShares: 292_398,
      source: "10-Q Q1 FY2026",
      sourceUrl: "/filings/lits/0001193125-25-283111",
      expiration: "2030-07-22",
      notes: "GSR 3 advisory warrants - OTM at ~$2.70",
    },
    {
      type: "warrant",
      strikePrice: 5.13,
      potentialShares: 292_398,
      source: "10-Q Q1 FY2026",
      sourceUrl: "/filings/lits/0001193125-25-283111",
      expiration: "2030-07-22",
      notes: "GSR 4 advisory warrants - OTM at ~$2.70",
    },
  ],

  // BTOG (Bit Origin) - DOGE treasury company
  // Verified 2026-02-01 via SEC 6-K Jan 20, 2026 (CIK 1735556)
  // 1:60 reverse split effective Jan 20, 2026 - all figures post-split
  // Basic shares: ~1.5M Class A + ~12.8K Class B
  // Convertible notes have floor prices that prevent extreme dilution
  BTOG: [
    // === Convertible Notes (all mature Jul 2029) ===
    {
      type: "convertible",
      strikePrice: 3.354,  // Floor price post-split (was $0.0559 pre-split)
      potentialShares: 2_981_514,  // $10M / $3.354
      faceValue: 10_000_000,
      settlementType: "full_share",  // Senior secured convertible — no cash settlement option
      source: "SEC 6-K Jan 20, 2026",
      sourceUrl: "/filings/btog/0001104659-26-005086",
      expiration: "2029-07-16",
      issuedDate: "2025-07-16",
      notes: "Series A-1 Senior Secured Convertible Note",
    },
    {
      type: "convertible",
      strikePrice: 3.354,  // Floor price post-split
      potentialShares: 1_490_757,  // $5M / $3.354
      faceValue: 5_000_000,
      settlementType: "full_share",  // Senior secured convertible — no cash settlement option
      source: "SEC 6-K Jan 20, 2026",
      sourceUrl: "/filings/btog/0001104659-26-005086",
      expiration: "2029-07-16",
      issuedDate: "2025-07-16",
      notes: "Series B-1 Senior Secured Convertible Note",
    },
    {
      type: "convertible",
      strikePrice: 4.74,  // Floor price post-split (was $0.079 pre-split)
      potentialShares: 282_386,  // $1,338,506 / $4.74
      faceValue: 1_338_506,
      settlementType: "full_share",  // Senior secured convertible — no cash settlement option
      source: "SEC 6-K Jan 20, 2026",
      sourceUrl: "/filings/btog/0001104659-26-005086",
      expiration: "2029-07-31",
      issuedDate: "2025-07-31",
      notes: "Series C-1 Senior Secured Convertible Note",
    },
    // === Warrants (post-split adjusted) ===
    {
      type: "warrant",
      strikePrice: 30.24,
      potentialShares: 572_514,
      source: "SEC 6-K Jan 20, 2026",
      sourceUrl: "/filings/btog/0001104659-26-005086",
      expiration: "2026-11-24",
      notes: "Deep OTM warrants",
    },
    {
      type: "warrant",
      strikePrice: 28.80,
      potentialShares: 28_626,
      source: "SEC 6-K Jan 20, 2026",
      sourceUrl: "/filings/btog/0001104659-26-005086",
      expiration: "2026-11-24",
      notes: "Deep OTM warrants",
    },
    {
      type: "warrant",
      strikePrice: 30.24,
      potentialShares: 604_147,
      source: "SEC 6-K Jan 20, 2026",
      sourceUrl: "/filings/btog/0001104659-26-005086",
      expiration: "2027-01-30",
      notes: "Deep OTM warrants",
    },
    {
      type: "warrant",
      strikePrice: 26.70,
      potentialShares: 30_207,
      source: "SEC 6-K Jan 20, 2026",
      sourceUrl: "/filings/btog/0001104659-26-005086",
      expiration: "2027-01-30",
      notes: "Deep OTM warrants",
    },
    {
      type: "warrant",
      strikePrice: 15.30,
      potentialShares: 18_791,
      source: "SEC 6-K Jan 20, 2026",
      sourceUrl: "/filings/btog/0001104659-26-005086",
      expiration: "2027-06-03",
      notes: "OTM warrants",
    },
    {
      type: "warrant",
      strikePrice: 1.3552,  // Subject to VWAP adjustment post-split
      potentialShares: 1_945_333,
      source: "SEC 6-K Jan 20, 2026",
      sourceUrl: "/filings/btog/0001104659-26-005086",
      expiration: "2030-04-22",
      notes: "Likely ITM - subject to price reset based on VWAP",
    },
    {
      type: "warrant",
      strikePrice: 5.4383,  // Subject to VWAP adjustment post-split
      potentialShares: 1_070_719,
      source: "SEC 6-K Jan 20, 2026",
      sourceUrl: "/filings/btog/0001104659-26-005086",
      expiration: "2034-06-29",
      notes: "OTM warrants - subject to price reset based on VWAP",
    },
  ],

  // XTAIF (xTAO Inc) - TAO treasury company (TSX-V: XTAO.U / OTC: XTAIF)
  // Verified 2026-02-01 via SEDAR+ Q2 FY26 MD&A (Sep 30, 2025)
  // Profile: 000108977 | Filing: Nov 25, 2025
  // Basic shares: 28,552,195
  // Pre-funded warrants: 9,479,090 @ $0.77 - ALREADY INCLUDED in sharesForMnav (38,031,285)
  // Now tracked with includedInBase: true so D1 overlay can add them back
  XTAIF: [
    {
      type: "warrant",
      strikePrice: 0.77,
      potentialShares: 9_479_090,
      source: "SEDAR+ Q2 FY26 MD&A (Sep 30, 2025)",
      sourceUrl: "https://drive.google.com/file/d/1XJiVIe9jsgwusVoE818yL0OiLWvHKbPd/view",
      expiration: "9999-12-31",
      issuedDate: "2025-01-01",
      includedInBase: true,
      notes: "Pre-funded warrants (PFW) @ C$0.77. Already included in sharesForMnav (38,031,285 = 28.6M common + 9.5M PFW).",
    },
    {
      type: "option",
      strikePrice: 1.00,
      potentialShares: 200_000,
      source: "SEDAR+ Q2 FY26 MD&A",
      sourceUrl: "https://drive.google.com/file/d/1XJiVIe9jsgwusVoE818yL0OiLWvHKbPd/view",
      expiration: "2030-07-01",
      issuedDate: "2025-07-10",
      notes: "Management/consultant options tranche 1 - OTM at ~$0.50 stock",
    },
    {
      type: "option",
      strikePrice: 1.00,
      potentialShares: 415_000,
      source: "SEDAR+ Q2 FY26 MD&A",
      sourceUrl: "https://drive.google.com/file/d/1XJiVIe9jsgwusVoE818yL0OiLWvHKbPd/view",
      expiration: "2030-07-21",
      issuedDate: "2025-07-10",
      notes: "Management/consultant options tranche 2 - OTM at ~$0.50 stock",
    },
    {
      type: "option",
      strikePrice: 1.00,
      potentialShares: 1_255_000,
      source: "SEDAR+ Q2 FY26 MD&A",
      sourceUrl: "https://drive.google.com/file/d/1XJiVIe9jsgwusVoE818yL0OiLWvHKbPd/view",
      expiration: "2035-07-21",
      issuedDate: "2025-07-10",
      notes: "Management/consultant options tranche 3 - OTM at ~$0.50 stock",
    },
  ],

  // TWAV (TaoWeave, fka Oblong) - TAO treasury company
  // Verified 2026-03-09 via SEC 10-Q Q3 2025 (CIK 746210)
  // Ticker changed from OBLG to TWAV Dec 2025
  // Pre-Funded Warrants (706,261 @ $0.0001) added to sharesForMnav — essentially shares
  // Complex warrant structure from 2023 Private Placement + 2025 Private Placement
  TWAV: [
    {
      type: "warrant",
      strikePrice: 0.0001,
      potentialShares: 706_261,
      source: "SEC 10-Q Q3 2025 Note 7",
      sourceUrl: "/filings/twav/0001437749-25-034612",
      expiration: "9999-12-31",
      issuedDate: "2025-06-04",
      includedInBase: true,
      notes: "Pre-funded warrants (PFW) @ $0.0001. Already included in sharesForMnav (3,913,471 = 3,207,210 common + 706,261 PFW).",
    },
    {
      type: "warrant",
      strikePrice: 3.41,  // Post-reverse-split adjusted price (Make Whole Provision)
      potentialShares: 1_902_997,  // Common Warrants + 2023 Placement Agent Warrants
      source: "SEC 10-Q Q3 2025 Note 7: Warrants",
      sourceUrl: "/filings/twav/0001437749-25-034612",
      expiration: "2028-03-31",  // 5-year term from Mar 2023 issuance
      issuedDate: "2023-03-31",
      notes: "Common Warrants ($3.41) from 2023 Private Placement. 521,725 exercised in 9mo ended Sep 30, 2025.",
    },
    {
      type: "warrant",
      strikePrice: 4.71,
      potentialShares: 99_470,
      source: "SEC 10-Q Q3 2025 Note 7: 2025 Placement Agent Warrants",
      sourceUrl: "/filings/twav/0001437749-25-034612",
      expiration: "2030-06-04",  // 5-year term from Jun 2025
      issuedDate: "2025-06-04",
      notes: "2025 Placement Agent Warrants @ $4.71.",
    },
    {
      type: "warrant",
      strikePrice: 3.77,
      potentialShares: 100_000,
      source: "SEC 10-Q Q3 2025 Note 7: Advisor Warrants",
      sourceUrl: "/filings/twav/0001437749-25-034612",
      expiration: "2030-06-05",  // 5-year term from Jun 2025
      issuedDate: "2025-06-05",
      notes: "Advisor Warrants @ $3.77 from 2025 Private Placement.",
    },
    {
      type: "warrant",
      strikePrice: 3.77,
      potentialShares: 8_097_347,  // Maximum if all Preferred Warrants exercised + converted
      source: "SEC 10-Q Q3 2025 Note 7: max dilution scenario",
      sourceUrl: "/filings/twav/0001437749-25-034612",
      expiration: "2028-03-31",  // 5-year from preferred warrant issuance
      issuedDate: "2023-03-31",
      notes: "CONDITIONAL: Common Warrants issued upon exercise of Preferred Warrants → Series F conversion. Requires $975/share preferred warrant exercise + conversion at $3.77. 150 Series F Preferred outstanding as of Sep 30, 2025.",
    },
  ],

  // Metaplanet (3350.T) - Japan TSE
  // Mercury Class B preferred - ¥1000 strike (~$6.55 at 152.7 JPY/USD)
  // Currently deeply OTM at ~¥325 stock price
  // NOTE: Mercury is tracked as preferredEquity ($155M at par) in companies.ts,
  // NOT as debt. faceValue is omitted so ITM logic doesn't subtract from totalDebt.
  // When ITM, this entry adds shares to diluted count only.
  "3350.T": [
    {
      type: "convertible",
      strikePrice: 6.55,  // ¥1000 conversion price / 152.7 JPY/USD
      potentialShares: 23_610_000,  // 23.61M Mercury Class B preferred shares
      // faceValue intentionally omitted — Mercury is in preferredEquity, not totalDebt.
      // If included, ITM logic would incorrectly reduce debt by ~$155M.
      source: "TDnet: Notice Regarding Issuance of Class B Preferred Shares (Nov 20, 2025)",
      sourceUrl: "https://metaplanet.jp/en/shareholders/disclosures",
      expiration: "2029-12-31",  // Mercury bonds mature 2029 (verify exact date)
      issuedDate: "2025-11-20",
      notes: "Mercury Class B preferred. ¥1,000 par/strike, deeply OTM at ¥325. Tracked as preferredEquity in EV, not debt. When ITM, adds 23.6M shares to diluted count.",
    },
    {
      type: "warrant",
      strikePrice: 3.53,  // ¥547 exercise price / 155 JPY/USD
      potentialShares: 15_944_000,  // 159,440 rights × 100 shares each
      source: "TDnet: 25th Series Stock Acquisition Rights (Feb 13, 2026 completion notice)",
      sourceUrl: "https://metaplanet.jp/en/shareholders/disclosures",
      expiration: "2027-02-15",  // 1-year exercise period: Feb 16, 2026 through Feb 15, 2027
      issuedDate: "2026-02-13",
      notes: "25th Series warrants. 159,440 rights × 100 shares = 15.9M potential shares at ¥547 strike (~$3.53).",
    },
    // 23rd & 24th Series SARs - Moving-strike warrants (EVO FUND)
    // Issued Dec 8, 2025 (replacing cancelled 20th-22nd Series)
    // Exercise price adjusts daily to prior day's closing price, floored at lower limit.
    // Using floor price as strikePrice (minimum at which they become exercisable).
    // When stock > floor, EVO FUND exercises at ~market price (minimal discount).
    // Source: TDnet Nov 20, 2025 + Dec 8 completion notice
    {
      type: "warrant",
      strikePrice: 4.15,  // ¥637 lower limit / 153.5 JPY/USD (floor price)
      potentialShares: 105_000_000,  // 1,050,000 rights × 100 shares each
      source: "TDnet: 23rd Series SAR issuance (Nov 20, 2025 board resolution, Dec 8 effective)",
      sourceUrl: "https://metaplanet.jp/en/shareholders/disclosures",
      issuedDate: "2025-12-08",
      notes: "23rd Series moving-strike SAR (EVO FUND). Exercise price = prior day's close, floored at ¥637 (~$4.15). Currently OTM at ¥325. Exercise from Jan 6, 2026. Suspension clause allows Metaplanet to pause exercises.",
    },
    {
      type: "warrant",
      strikePrice: 5.06,  // ¥777 lower limit / 153.5 JPY/USD (floor price)
      potentialShares: 105_000_000,  // 1,050,000 rights × 100 shares each
      source: "TDnet: 24th Series SAR issuance (Nov 20, 2025 board resolution, Dec 8 effective)",
      sourceUrl: "https://metaplanet.jp/en/shareholders/disclosures",
      issuedDate: "2025-12-08",
      notes: "24th Series moving-strike SAR (EVO FUND). Exercise price = prior day's close, floored at ¥777 (~$5.06). Currently OTM at ¥325. Exercise from Jan 6, 2026. Suspension clause allows Metaplanet to pause exercises.",
    },
  ],

  // ANAP Holdings (3189.T) - Japanese BTC treasury
  // 8th Series Stock Acquisition Rights (新株予約権) — issued Dec 1, 2025 via third-party allotment
  // Per TDnet Feb 3, 2026 monthly exercise report:
  //   - Total issued: 340,000 units (1 unit = 100 shares = 34M potential shares)
  //   - Exercised through Jan 2026: 35,700 units → 3,570,000 shares (655K already in basic count)
  //   - Remaining: 304,300 units → 30,430,000 potential shares
  //   - Exercise price: ~¥271 (adjustable, Jan 2026 range ¥270-273)
  // Also has 1st Series Convertible Bonds — terms need further investigation from TDnet filings
  "3189.T": [
    {
      type: "warrant",
      strikePrice: 1.77,  // ¥271 / 153.5 JPY/USD
      potentialShares: 30_430_000,  // 304,300 remaining units × 100 shares each
      source: "TDnet: 8th Series Stock Acquisition Rights monthly exercise report (Feb 3, 2026)",
      sourceUrl: "https://www.release.tdnet.info/inbs/140120260202545295.pdf",  // Feb 2026 monthly exercise report
      expiration: "2026-12-01",  // Estimated — typically 1 year from issuance
      issuedDate: "2025-12-01",
      notes: "8th Series warrants (MSO, Evo Fund). Actively being exercised — 35,700 of 340,000 units exercised through Jan 2026. Exercise price adjustable (~¥271). Massive dilution potential: 30.4M shares on 40.6M base = 75%.",
    },
    // 1st Series Convertible Bond (第1回無担保転換社債型新株予約権付社債)
    // Issued Oct 29, 2025 alongside 8th Series warrants and 8th Bond
    // Exact terms (face value, conversion price, expiration) need extraction from Japanese PDF
    // Filing: https://tdnet-pdf.kabutan.jp/20251029/140120251028580503.pdf
    // Correction: https://tdnet-pdf.kabutan.jp/20251110/140120251110593337.pdf
    // TODO: Extract conversion terms and add as proper convertible instrument
  ],

  // ABTC (American Bitcoin) - BTC miner/accumulator
  // Post-merger with Gryphon Sep 3, 2025. 80% owned by Hut 8.
  // Verified 2026-02-17 via 10-Q Q3 2025 (CIK 0001755953)
  // Basic shares: 927,604,994 (195.4M Class A + 732.2M Class B)
  // Total dilution: ~131K shares = 0.014% — immaterial but tracked per methodology
  ABTC: [
    {
      type: "warrant",
      strikePrice: 1.50,
      potentialShares: 108_587,
      source: "10-Q Q3 2025",
      sourceUrl:
        "/filings/abtc/0001193125-25-281390",
      expiration: "2035-01-31",
      notes: "Legacy Gryphon Digital Mining warrants (pre-merger). Liability-classified. Near the money at ~$1.14 stock price.",
    },
    {
      type: "warrant",
      strikePrice: 37.00,
      potentialShares: 22_826,
      source: "10-Q Q3 2025",
      sourceUrl:
        "/filings/abtc/0001193125-25-281390",
      expiration: "2027-06-30",
      notes: "Legacy Akerna Corp warrants (prior entity). Equity-classified. Deeply OTM.",
    },
  ],
  // Total ABTC dilution: 108,587 Gryphon warrants ($1.50) + 22,826 Akerna warrants ($37.00) = 131,413 shares
  // At ~$1.14 stock: Gryphon warrants OTM but near the money, Akerna deep OTM

  // DeFi Development Corp (DFDV) - SOL treasury company
  // Verified 2026-02-16 via SEC XBRL (CIK 0001805526) + 10-Q Q3 2025 + S-1 Dec 18, 2025
  // Adversarial audit corrections applied: warrant count, convertible tranches, missing instruments
  DFDV: [
    // ── Convertible Notes (TWO TRANCHES) ──────────────────────────────────
    // Tranche 1: April 2030 Notes — 2.5% rate
    // Originally $42M face, $24.1M already converted to stock → $17,847K remaining
    // Conversion price: $9.74/share
    // Potential shares: $17,847,000 / $9.74 = ~1,832,851
    {
      type: "convertible",
      strikePrice: 9.74,
      potentialShares: 1_832_851,
      faceValue: 17_847_000,
      settlementType: "full_share",  // Convertible senior notes — standard share delivery per indenture
      source: "10-Q Q3 2025 (Note 9) + S-1 Dec 18, 2025",
      sourceUrl:
        "/filings/dfdv/0001193125-25-286660",
      expiration: "2030-04-04",
      issuedDate: "2025-04-04",
      notes:
        "2.5% Convertible Senior Notes due April 2030. " +
        "Originally $42M face value, $24.1M already converted to common stock. " +
        "Remaining face: $17,847K. Conversion price $9.74/share. " +
        "Warrants issued alongside (tracked separately as PIPE warrants).",
    },
    // Tranche 2: July 2030 Notes — 5.5% rate
    // Face value: $122.5M ($112.5M + $10M greenshoe)
    // Conversion rate: 43.2694 shares/$1,000 = $23.11/share conversion price
    // Potential shares: 122,500 × 43.2694 = ~5,305,502
    {
      type: "convertible",
      strikePrice: 23.11,
      potentialShares: 5_305_502,
      faceValue: 122_500_000,
      settlementType: "full_share",  // Convertible senior notes — standard share delivery per indenture
      source: "10-Q Q3 2025 (Note 9) + S-1 Dec 18, 2025",
      sourceUrl:
        "/filings/dfdv/0001193125-25-286660",
      expiration: "2030-07-15",
      issuedDate: "2025-07-01",
      notes:
        "5.5% Convertible Senior Notes due July 2030. " +
        "$122.5M face ($112.5M + $10M greenshoe). " +
        "Conversion rate 43.2694 shares/$1,000 = $23.11/share. " +
        "Make-whole and fundamental change put provisions. " +
        "Company can redeem after Jul 5, 2026 if stock ≥150% of conversion price for 20/30 trading days.",
    },

    // ── DFDVW Warrant Dividend ────────────────────────────────────────────
    // Distributed Oct 27, 2025. 1 warrant per 10 shares (NOT 1:1).
    // S-1 confirms: "approximately 3.9 million warrants" / "3,898,856 shares potentially issuable"
    // Exercise price: $22.50, expires Jan 21, 2028
    {
      type: "warrant",
      strikePrice: 22.5,
      potentialShares: 3_898_856,
      source: "S-1 Dec 18, 2025 + 8-K Oct 8, 2025 + 10-Q Q3 2025 Note 19",
      sourceUrl:
        "/filings/dfdv/0001213900-25-097242",
      issuedDate: "2025-10-27",
      notes:
        "DFDVW warrant dividend — 1 warrant per 10 shares (1:10 ratio), NOT 1:1. " +
        "S-1 Dec 18, 2025 confirms 'approximately 3.9 million warrants' distributed. " +
        "Exercise price $22.50/share, expires Jan 21, 2028 (subject to early expiration trigger). " +
        "Trading publicly on Nasdaq as DFDVW. Noteholders also received warrants on as-converted pass-through basis.",
    },

    // ── April 2025 PIPE Warrants ──────────────────────────────────────────
    // Issued alongside April 2025 convertible notes to PIPE investors
    // Series 1: 2,400,000 @ $17.14
    {
      type: "warrant",
      strikePrice: 17.14,
      potentialShares: 2_400_000,
      source: "S-1 Dec 18, 2025 + 10-Q Q3 2025",
      sourceUrl:
        "/filings/dfdv/0001213900-25-123331",
      expiration: "2030-04-04",
      issuedDate: "2025-04-04",
      notes:
        "April 2025 PIPE warrant Series 1. Issued to convertible note investors. " +
        "2,400,000 warrants at $17.14 exercise price. ~5-year term.",
    },
    // Series 2: 2,000,000 @ $21.43
    {
      type: "warrant",
      strikePrice: 21.43,
      potentialShares: 2_000_000,
      source: "S-1 Dec 18, 2025 + 10-Q Q3 2025",
      sourceUrl:
        "/filings/dfdv/0001213900-25-123331",
      expiration: "2030-04-04",
      issuedDate: "2025-04-04",
      notes:
        "April 2025 PIPE warrant Series 2. Issued to convertible note investors. " +
        "2,000,000 warrants at $21.43 exercise price. ~5-year term.",
    },

    // ── Pre-funded Warrants (August 2025) ─────────────────────────────────
    // ~4,080,895 outstanding at Sep 30, 2025. $0.0001 exercise price = near-certain conversion.
    // 1.7M already exercised by Sep 30. Check if more exercised since.
    {
      type: "warrant",
      strikePrice: 0.0001,
      potentialShares: 4_080_895,
      source: "S-1 Dec 18, 2025 + 10-Q Q3 2025",
      sourceUrl:
        "/filings/dfdv/0001213900-25-123331",
      issuedDate: "2025-08-24",
      notes:
        "Pre-funded warrants from August 2025 PIPE. $0.0001 exercise price — near-certain conversion. " +
        "1.7M exercised by Sep 30, 2025; ~4.1M still outstanding. No expiration. " +
        "Check if more have been exercised since Sep 30.",
    },

    // ── Stock Options ─────────────────────────────────────────────────────
    // 1,483,992 outstanding at Sep 30, 2025. Weighted avg exercise price $5.24.
    {
      type: "option",
      strikePrice: 5.24,
      potentialShares: 1_483_992,
      source: "10-Q Q3 2025",
      sourceUrl:
        "/filings/dfdv/0001193125-25-286660",
      issuedDate: "2025-04-04",
      notes:
        "Stock options outstanding. Weighted average exercise price $5.24. " +
        "Per 10-Q Q3 2025 equity compensation disclosures.",
    },

    // ── RSUs ──────────────────────────────────────────────────────────────
    // 242,375 unvested RSUs (10-Q Q3 2025) + 16,500 granted Jan 29, 2026 (8-K)
    {
      type: "rsu",
      strikePrice: 0,
      potentialShares: 258_875,
      source: "10-Q Q3 2025 + 8-K Jan 29, 2026",
      sourceUrl:
        "/filings/dfdv/0001193125-25-286660",
      issuedDate: "2025-04-04",
      notes:
        "Restricted Stock Units: 242,375 unvested per 10-Q Q3 2025, " +
        "plus 16,500 granted to new director (Hadley Stern) per 8-K Jan 29, 2026. " +
        "Total: 258,875. Strike price $0 (vest to shares).",
    },
  ],

  // TRON Inc (f/k/a SRM Entertainment) - TRX treasury company
  // Verified 2026-03-06 via SEC filings (CIK 0001956744)
  // Basic shares: 274,382,064 (Dec 29, 2025 after Justin Sun investment)
  // Key dilutive instruments: Series A/B convertible preferred, May PIPE warrants, equity plan options
  // June PIPE warrants (220M shares) ALREADY EXERCISED Aug 2025 — baked into basic count
  // Series B has 19.99% blocker: max ~54.9M shares until stockholder vote
  TRON: [
    // Series A Convertible Preferred Stock (May 2025 PIPE)
    {
      type: "preferred",
      strikePrice: 0.56,
      potentialShares: 8_928_571,
      source: "8-K May 21, 2025 PIPE",
      sourceUrl:
        "/filings/tron/0001493152-25-019000",
      issuedDate: "2025-05-21",
      notes:
        "Series A Convertible Preferred (5,000 shares). " +
        "Conversion ratio: 1:1,785.7 → 8,928,571 common shares. " +
        "Conversion price $0.56/share. Holder has 4.99%-9.99% ownership cap.",
    },
    // Series B Convertible Preferred Stock (June 2025 PIPE) — PARTIAL conversion only
    // Full conversion = 200M shares, but 19.99% blocker limits to ~54.9M until shareholder vote
    {
      type: "preferred",
      strikePrice: 0.50,
      potentialShares: 54_878_000,
      source: "8-K Jun 16, 2025 PIPE + 19.99% blocker",
      sourceUrl:
        "/filings/tron/0001493152-25-022000",
      issuedDate: "2025-06-16",
      notes:
        "Series B Convertible Preferred (100,000 shares). " +
        "Full conversion = 200,000,000 shares at $0.50/share. " +
        "BLOCKER: Cannot convert >19.99% of outstanding without stockholder approval. " +
        "At 274.4M basic shares, max convertible = ~54.9M until vote. " +
        "Remaining ~145M shares tracked as contingent (not included here).",
    },
    // May 2025 PIPE Warrants
    {
      type: "warrant",
      strikePrice: 0.65,
      potentialShares: 8_928_571,
      source: "8-K May 21, 2025 PIPE",
      sourceUrl:
        "/filings/tron/0001493152-25-019000",
      issuedDate: "2025-05-21",
      expiration: "2027-05-21",
      notes:
        "Common stock purchase warrants from May 2025 PIPE. " +
        "Exercise price $0.65/share. 2-year term.",
    },
    // 2024 Equity Incentive Plan — estimated from Form 4 filings
    {
      type: "option",
      strikePrice: 0.56,
      potentialShares: 500_000,
      source: "Form 4 filings + 2024 Equity Incentive Plan (estimate)",
      sourceUrl:
        "/filings/tron/0001493152-25-019000",
      notes:
        "Estimated outstanding options under 2024 Equity Plan. " +
        "CFO McKinnon: 200K options @ $0.56. " +
        "Other grants not fully disclosed. Conservative estimate 500K total.",
    },
  ],

  // PURR (Hyperliquid Strategies Inc, f/k/a Sonnet BioTherapeutics) - HYPE treasury company
  // Verified 2026-03-06 via SEC 10-Q + merger documents (CIK 0002078856)
  // Basic shares: 123,967,508 (Feb 11, 2026 8-K). Fully diluted ~150.6M.
  // Holdings: 17.6M HYPE | Cash: $281.9M | Zero debt
  // Advisor shares (~7.75M) already in basic count. Advisor warrants all OTM at ~$3.64.
  PURR: [
    // Advisor Warrants — 3 tranches, 15% of fully diluted (~23M shares total)
    // All well OUT of the money at current ~$3.64 price
    {
      type: "warrant",
      strikePrice: 9.375,
      potentialShares: 7_666_667,
      source: "DEFM14A / Business Combination Agreement",
      sourceUrl:
        "/filings/purr/0001193125-25-311400",
      issuedDate: "2025-12-02",
      expiration: "2030-12-02",
      notes:
        "Advisor warrants tranche 1 (1/3 of ~23M total). " +
        "Rorschach Advisor LLC. 5-year term from merger close.",
    },
    {
      type: "warrant",
      strikePrice: 12.50,
      potentialShares: 7_666_667,
      source: "DEFM14A / Business Combination Agreement",
      sourceUrl:
        "/filings/purr/0001193125-25-311400",
      issuedDate: "2025-12-02",
      expiration: "2030-12-02",
      notes:
        "Advisor warrants tranche 2 (1/3 of ~23M total). " +
        "Rorschach Advisor LLC. 5-year term from merger close.",
    },
    {
      type: "warrant",
      strikePrice: 18.75,
      potentialShares: 7_666_667,
      source: "DEFM14A / Business Combination Agreement",
      sourceUrl:
        "/filings/purr/0001193125-25-311400",
      issuedDate: "2025-12-02",
      expiration: "2030-12-02",
      notes:
        "Advisor warrants tranche 3 (1/3 of ~23M total). " +
        "Rorschach Advisor LLC. 5-year term from merger close.",
    },
    // June 2025 Convertible Note Warrants (from pre-merger Sonnet $2M notes)
    {
      type: "warrant",
      strikePrice: 1.156,
      potentialShares: 865_052,
      source: "8-K Jun 2025 convertible notes",
      sourceUrl:
        "/filings/purr/0001193125-25-311400",
      issuedDate: "2025-06-01",
      expiration: "2030-06-01",
      notes:
        "Warrants attached to $2M convertible notes sold by Sonnet Jun 2025. " +
        "Exercise price $1.156/share. 5-year term.",
    },
    // Conditional extra warrants (triggered if $5M issuance didn't occur within 90 days)
    {
      type: "warrant",
      strikePrice: 0.25,
      potentialShares: 3_460_208,
      source: "8-K Jun 2025 convertible note terms",
      sourceUrl:
        "/filings/purr/0001193125-25-311400",
      issuedDate: "2025-10-01",
      expiration: "2030-10-01",
      notes:
        "Conditional warrants from Jun 2025 notes. Triggered if $5M+ issuance " +
        "didn't occur within 90 days. Exercise price $0.25/share. " +
        "Status uncertain — may have been obviated by Jul 14 $5.5M placement.",
    },
  ],

  // ETHM (The Ether Machine) - ETH treasury company
  // Verified 2026-03-06 via SEC Form 425 filings + press releases (CIK 0002080334)
  // Basic shares: 60,000,000 (via Dynamix SPAC merger, ticker changed Aug 27, 2025)
  // Holdings: 590,000 ETH as of Sep 30, 2025
  // Note: Still in SPAC merger process; no 10-Q/10-K filings yet
  ETHM: [
    // Senior Secured Convertible Notes (August 2025)
    {
      type: "convertible",
      strikePrice: 3.445,
      potentialShares: 45_355_588,
      faceValue: 156_250_000,
      settlementType: "full_share",  // Senior secured convertible — pendingMerger, no active mNAV impact
      source: "Note Purchase Agreement Aug 8, 2025",
      sourceUrl:
        "/filings/ethm/0001213900-25-073158",
      issuedDate: "2025-08-08",
      expiration: "2028-08-08",
      notes:
        "Senior Secured Convertible Notes. $156.25M face value. " +
        "Conversion price $3.445/share. 3-year maturity. " +
        "Collateral: $44.5M in ETH + $156.25M cash (restricted).",
    },
    // Pre-Funded Warrants (July 2025 equity offering)
    {
      type: "warrant",
      strikePrice: 0.0001,
      potentialShares: 17_495_849,
      source: "Securities Purchase Agreement Jul 29, 2025",
      sourceUrl:
        "/filings/ethm/0001213900-25-065907",
      issuedDate: "2025-07-29",
      notes:
        "Pre-funded warrants from July 2025 equity offering. " +
        "Exercise price $0.0001 (effectively free). Always ITM.",
    },
    // Strategic Advisor Warrants
    {
      type: "warrant",
      strikePrice: 3.445,
      potentialShares: 9_071_110,
      source: "Investor documents Aug 2025",
      sourceUrl:
        "/filings/ethm/0001213900-25-073158",
      issuedDate: "2025-08-08",
      notes:
        "Strategic advisor warrants. Exercise price $3.445/share " +
        "(matching convertible note conversion price).",
    },
  ],

  // CEPO (Cantor Equity Partners I / BSTR Holdings) - BTC treasury company
  // Verified 2026-03-06 via SEC 8-K filings (CIK 0002027708)
  // SPAC merger pending (expected early Q2 2026). Post-merger ticker: BSTR
  // Basic shares: 25,500,000 (20.5M Class A + 5M Class B founder shares)
  // Holdings: 30,021 BTC | All convertible instruments at $13.00 strike
  // Settlement: S-4 not public yet. Likely issuer_election (Cantor playbook matches XXI).
  // Using full_share (conservative) until indenture is available.
  CEPO: [
    // 1.00% Convertible Senior Secured Notes — Main tranche
    {
      type: "convertible",
      strikePrice: 13.00,
      potentialShares: 38_461_538,
      faceValue: 500_000_000,
      settlementType: "full_share",  // Conservative default — S-4 not public. Likely issuer_election per Cantor playbook.
      source: "8-K Jul 17, 2025",
      sourceUrl:
        "/filings/cepo/0001213900-25-064922",
      issuedDate: "2025-07-17",
      notes:
        "1.00% Convertible Senior Secured Notes. $500M face. " +
        "5-year maturity from closing. Conversion price $13.00 (30% premium over $10 IPO). " +
        "Non-callable for 3 years; callable thereafter if stock >130% of strike for 20/30 days.",
    },
    // 1.00% Convertible Senior Secured Notes — Additional tranche
    {
      type: "convertible",
      strikePrice: 13.00,
      potentialShares: 2_346_154,
      faceValue: 30_500_000,
      settlementType: "full_share",  // Conservative default — S-4 not public. Likely issuer_election per Cantor playbook.
      source: "8-K Aug 7, 2025",
      sourceUrl:
        "/filings/cepo/0001213900-25-073158",
      issuedDate: "2025-08-07",
      notes:
        "Additional 1.00% Convertible Senior Secured Notes. $30.5M face. " +
        "Same terms as main $500M tranche. Conversion price $13.00.",
    },
    // 7.00% Perpetual Convertible Preferred Stock — Large tranche
    {
      type: "preferred",
      strikePrice: 13.00,
      potentialShares: 23_076_923,
      source: "8-K Aug 25, 2025",
      sourceUrl:
        "/filings/cepo/0001213900-25-078000",
      issuedDate: "2025-08-25",
      notes:
        "7.00% Perpetual Convertible Preferred (300,000 shares @ $1,000 par). " +
        "~$300M notional. Conversion price $13.00. Perpetual (no maturity). " +
        "7% annual dividend obligation (~$21M/year).",
    },
    // 7.00% Perpetual Convertible Preferred Stock — Secondary placement
    {
      type: "preferred",
      strikePrice: 13.00,
      potentialShares: 3_715_385,
      source: "8-K Aug 25, 2025 (secondary placement)",
      sourceUrl:
        "/filings/cepo/0001213900-25-078000",
      issuedDate: "2025-08-25",
      notes:
        "7.00% Perpetual Convertible Preferred (secondary placement). " +
        "~$48.3M at $85/share (~480K preferred shares). " +
        "Conversion price $13.00. Perpetual. Same dividend terms.",
    },
  ],

  // IHLDF (Intelli Holdings) - Canadian BTC treasury company
  // Verified by GPT 5.4 via SEDAR+ Q3 2025 interim financial statements
  // All strike prices converted from CAD at ~1.43 CAD/USD
  IHLDF: [
    {
      type: "option",
      strikePrice: 0.52, // CAD 0.75 / 1.43
      potentialShares: 1_110_000,
      expiration: "2026-09-27",
      source: "SEDAR+ Q3 2025 interim financial statements",
      sourceUrl: "https://www.sedarplus.ca/csa-party/records/document.html?id=486bb93cacb6adaf46458544260c8c73770fe23f970c2c6a16571e11cc9c55aa",
      notes: "CAD 0.75 exercise price converted at ~1.43 CAD/USD.",
    },
    {
      type: "option",
      strikePrice: 1.71, // CAD 2.45 / 1.43
      potentialShares: 370_000,
      expiration: "2026-12-13",
      source: "SEDAR+ Q3 2025 interim financial statements",
      sourceUrl: "https://www.sedarplus.ca/csa-party/records/document.html?id=486bb93cacb6adaf46458544260c8c73770fe23f970c2c6a16571e11cc9c55aa",
      notes: "CAD 2.45 exercise price converted at ~1.43 CAD/USD.",
    },
    {
      type: "option",
      strikePrice: 1.82, // CAD 2.60 / 1.43
      potentialShares: 2_325_000,
      expiration: "2026-12-28",
      source: "SEDAR+ Q3 2025 interim financial statements",
      sourceUrl: "https://www.sedarplus.ca/csa-party/records/document.html?id=486bb93cacb6adaf46458544260c8c73770fe23f970c2c6a16571e11cc9c55aa",
      notes: "CAD 2.60 exercise price converted at ~1.43 CAD/USD.",
    },
    {
      type: "option",
      strikePrice: 0.52, // CAD 0.75 / 1.43
      potentialShares: 1_101_100,
      expiration: "2027-06-16",
      source: "SEDAR+ Q3 2025 interim financial statements",
      sourceUrl: "https://www.sedarplus.ca/csa-party/records/document.html?id=486bb93cacb6adaf46458544260c8c73770fe23f970c2c6a16571e11cc9c55aa",
      notes: "CAD 0.75 exercise price converted at ~1.43 CAD/USD.",
    },
    {
      type: "option",
      strikePrice: 0.21, // CAD 0.30 / 1.43
      potentialShares: 370_000,
      expiration: "2028-04-12",
      source: "SEDAR+ Q3 2025 interim financial statements",
      sourceUrl: "https://www.sedarplus.ca/csa-party/records/document.html?id=486bb93cacb6adaf46458544260c8c73770fe23f970c2c6a16571e11cc9c55aa",
      notes: "CAD 0.30 exercise price converted at ~1.43 CAD/USD.",
    },
  ],

  // TAOX (Tao Automations) - BTC treasury company
  // Verified by GPT 5.4 via SEC 8-K Oct 2025 + 10-Q Sep 30, 2025 (CIK 1571934)
  TAOX: [
    // Series E preferred + warrants (Oct 2025 financing)
    {
      type: "preferred",
      strikePrice: 8,
      potentialShares: 1_375_000,
      faceValue: 11_000_000,
      issuedDate: "2025-10-13",
      source: "SEC 8-K Oct. 13, 2025 Series E financing",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1571934/000110465925098909/tm2528153d1_8k.htm",
      notes: "11,000 Series E preferred shares with $1,000 stated value, initially convertible into up to 1,375,000 common shares at $8.00.",
    },
    {
      type: "warrant",
      strikePrice: 8,
      potentialShares: 1_375_000,
      issuedDate: "2025-10-13",
      expiration: "2030-10-15",
      source: "SEC 8-K Oct. 13, 2025 Series E financing",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1571934/000110465925098909/tm2528153d1_8k.htm",
      notes: "Investor warrants issued alongside Series E preferred; exercisable immediately at $8.00 and expire five years from issuance.",
    },
    {
      type: "warrant",
      strikePrice: 8,
      potentialShares: 55_000,
      issuedDate: "2025-10-13",
      expiration: "2030-10-15",
      source: "SEC 8-K Oct. 13, 2025 placement agent terms",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1571934/000110465925098909/tm2528153d1_8k.htm",
      notes: "Placement agent warrants equal to 4.0% of the initial conversion shares.",
    },
    // Series D preferred (partially converted)
    {
      type: "preferred",
      strikePrice: 3,
      potentialShares: 401_187,
      faceValue: 1_203_562,
      issuedDate: "2025-06-09",
      source: "SEC 10-Q Sep. 30, 2025 Series D reconciliation",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1571934/000110465925112570/taox-20250930x10q.htm",
      notes: "Remaining Series D preferred: originally 5,500 shares at $1,000 stated value. $4,296,438 converted into 1,432,146 shares by Sep 30, 2025; ~$1.204M face / 401,187 shares remaining.",
    },
    // Series D warrants
    {
      type: "warrant",
      strikePrice: 3,
      potentialShares: 1_888_334,
      issuedDate: "2025-06-09",
      expiration: "2030-06-09",
      source: "SEC 10-Q Sep. 30, 2025 warrant issuance table",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1571934/000110465925112570/taox-20250930x10q.htm",
      notes: "Series D investor warrants at $3.00.",
    },
    // Series C warrants (repriced)
    {
      type: "warrant",
      strikePrice: 3,
      potentialShares: 1_716_668,
      issuedDate: "2024-09-10",
      expiration: "2029-09-10",
      source: "SEC 10-Q Sep. 30, 2025 Series C warrant footnote",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1571934/000110465925112570/taox-20250930x10q.htm",
      notes: "Series C investor warrants repriced and increased to 1,666,668 at $3.00.",
    },
    {
      type: "warrant",
      strikePrice: 3,
      potentialShares: 50_000,
      issuedDate: "2024-09-10",
      expiration: "2029-09-10",
      source: "SEC 10-Q Sep. 30, 2025 Series C broker warrant footnote",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1571934/000110465925112570/taox-20250930x10q.htm",
      notes: "Series C broker warrants increased to 50,000 at $3.00.",
    },
    // Consulting warrants
    {
      type: "warrant",
      strikePrice: 4,
      potentialShares: 400_000,
      issuedDate: "2025-08-26",
      expiration: "2030-08-26",
      source: "SEC 10-Q Sep. 30, 2025 Altucher consulting warrants",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1571934/000110465925112570/taox-20250930x10q.htm",
      notes: "First tranche consultant warrant.",
    },
    {
      type: "warrant",
      strikePrice: 6,
      potentialShares: 200_000,
      issuedDate: "2025-08-26",
      expiration: "2030-08-26",
      source: "SEC 10-Q Sep. 30, 2025 Altucher consulting warrants",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1571934/000110465925112570/taox-20250930x10q.htm",
      notes: "Second tranche consultant warrant.",
    },
    {
      type: "warrant",
      strikePrice: 8,
      potentialShares: 200_000,
      issuedDate: "2025-08-26",
      expiration: "2030-08-26",
      source: "SEC 10-Q Sep. 30, 2025 Altucher consulting warrants",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1571934/000110465925112570/taox-20250930x10q.htm",
      notes: "Third tranche consultant warrant.",
    },
    {
      type: "warrant",
      strikePrice: 12,
      potentialShares: 400_000,
      issuedDate: "2025-08-26",
      expiration: "2030-08-26",
      source: "SEC 10-Q Sep. 30, 2025 Altucher consulting warrants",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1571934/000110465925112570/taox-20250930x10q.htm",
      notes: "Fourth tranche consultant warrant.",
    },
    {
      type: "warrant",
      strikePrice: 8.4,
      potentialShares: 100_000,
      issuedDate: "2025-08-26",
      expiration: "2030-08-26",
      source: "SEC 10-Q Sep. 30, 2025 Jacks consulting warrant",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1571934/000110465925112570/taox-20250930x10q.htm",
      notes: "Advisor warrant.",
    },
    // Stock options
    {
      type: "option",
      strikePrice: 48.98, // Weighted avg exercise price
      potentialShares: 109_274,
      source: "SEC 10-Q Sep. 30, 2025 stock option table",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1571934/000110465925112570/taox-20250930x10q.htm",
      notes: "Aggregate options outstanding as of Sep 30, 2025. Deeply OTM — weighted-average strike $48.98.",
    },
  ],

  // BTCT.V removed — duplicate of BTCT entry above (same company, same instruments)

  // OBTC3 (OranjeBTC S.A.) - Brazilian BTC treasury
  // Convertible debenture held by Parafi Capital (US)
  // R$ 128.16M face value, zero interest, 5-year term, no covenants
  // Conversion: 6,966,760 shares → R$ 18.40/share conversion price
  // USD values at R$ 5.15/USD (Mar 1, 2026 filing FX rate)
  "OBTC3": [
    {
      type: "convertible",
      strikePrice: 3.57, // R$ 18.40 / 5.15 = $3.57 USD conversion price
      potentialShares: 6_966_760,
      faceValue: 24_886_408, // R$ 128,160,000 / 5.15 = ~$24.89M USD
      settlementType: "full_share",  // Brazilian convertible — zero interest, share delivery at conversion
      issuedDate: "2025-10-01", // Pre-listing, Oct 2025 per press reports
      expiration: "2030-10-01", // 5-year term
      source: "NeoFeed Feb 2026 + B3 market announcements (R$128M zero-interest 5yr with Parafi Capital)",
      sourceUrl: "https://neofeed.com.br/negocios/o-preco-da-tese-cripto-na-b3-oranjebtc-perde-quase-metade-do-valor-em-um-mes/",
      notes: "R$ 128.16M face, zero interest, no covenants, no payments. Conversion price R$18.40/share (~$3.57 USD at R$5.15). Deep OTM at current ~R$7/share. Face value derived: R$128,160,000 / 6,966,760 shares = R$18.395/share.",
    },
  ],
};

// Ticker aliases — same company, different exchange tickers
dilutiveInstruments["BTCT.V"] = dilutiveInstruments["BTCT"];

/**
 * Calculate effective diluted shares based on current stock price.
 *
 * Filters out expired instruments - their shares are already in basicShares.
 * Also calculates the face value of in-the-money convertibles, which should
 * be subtracted from debt to avoid double-counting in EV calculation.
 *
 * @param ticker - Company ticker symbol
 * @param basicShares - Basic shares outstanding
 * @param stockPrice - Current stock price in USD
 * @returns Effective shares result with breakdown and ITM debt value
 */
/**
 * Returns the number of pre-funded warrant shares that are ALREADY
 * included in a company's sharesForMnav base count.
 *
 * D1 basic_shares only tracks SEC XBRL CommonStockSharesOutstanding
 * (common stock), so when D1 overrides static data, these PFW shares
 * get dropped. The overlay uses this to add them back.
 */
export function getBaseIncludedShares(ticker: string): number {
  const instruments = dilutiveInstruments[ticker] || [];
  return instruments
    .filter(i => i.includedInBase === true)
    .reduce((sum, i) => sum + i.potentialShares, 0);
}

export function getEffectiveShares(
  ticker: string,
  basicShares: number,
  stockPrice: number
): EffectiveSharesResult {
  const instruments = dilutiveInstruments[ticker] || [];
  const today = new Date().toISOString().split("T")[0];

  // Filter out expired instruments and instruments already in base count
  const activeInstruments = instruments.filter((inst) => {
    if (inst.expiration && inst.expiration <= today) {
      return false; // Expired - shares already in basic count
    }
    if (inst.includedInBase) {
      return false; // Already counted in sharesForMnav (e.g., pre-funded warrants)
    }
    return true;
  });

  const breakdown: InstrumentBreakdown[] = activeInstruments.map((inst) => ({
    type: inst.type,
    strikePrice: inst.strikePrice,
    potentialShares: inst.potentialShares,
    faceValue: inst.faceValue,
    inTheMoney: stockPrice > inst.strikePrice,
    source: inst.source,
    notes: inst.notes,
  }));

  const inTheMoneyShares = breakdown
    .filter((b) => b.inTheMoney)
    .reduce((sum, b) => sum + b.potentialShares, 0);

  // Calculate face value of in-the-money CONVERTIBLES to subtract from debt.
  // Settlement-aware: only subtract faceValue for full_share settlement.
  // For net_share: principal is owed in cash, so faceValue stays in debt.
  // For cash_only/issuer_election: conservatively keep debt.
  const inTheMoneyDebtValue = activeInstruments
    .filter((inst) => {
      if (!inst.faceValue || inst.type !== "convertible") return false;
      if (stockPrice <= inst.strikePrice) return false; // OTM
      const settlement = inst.settlementType || "full_share"; // backwards compat
      return settlement === "full_share";
    })
    .reduce((sum, inst) => sum + (inst.faceValue || 0), 0);

  // Calculate exercise proceeds from in-the-money WARRANTS
  // Symmetric treatment: if we count warrant dilution, we should also count the incoming cash
  // Exercise proceeds = potentialShares × strikePrice
  const inTheMoneyWarrantProceeds = breakdown
    .filter((b) => b.inTheMoney && b.type === "warrant")
    .reduce((sum, b) => sum + (b.potentialShares * b.strikePrice), 0);

  return {
    basic: basicShares,
    diluted: basicShares + inTheMoneyShares,
    inTheMoneyDebtValue,
    inTheMoneyWarrantProceeds,
    breakdown,
  };
}

/**
 * Calculate effective diluted shares at a specific historical date.
 *
 * Only includes instruments that:
 * 1. Were issued on or before the target date (issuedDate <= asOfDate)
 * 2. Haven't expired/matured yet (expiration > asOfDate OR no expiration)
 *
 * Use this for historical mNAV calculations where dilution depends on
 * which instruments existed at that point in time.
 *
 * @param ticker - Company ticker symbol
 * @param basicShares - Basic shares outstanding at that date
 * @param stockPrice - Stock price at that date in USD
 * @param asOfDate - The historical date (YYYY-MM-DD format)
 * @returns Effective shares result with breakdown and ITM debt value
 */
export function getEffectiveSharesAt(
  ticker: string,
  basicShares: number,
  stockPrice: number,
  asOfDate: string
): EffectiveSharesResult {
  const instruments = dilutiveInstruments[ticker] || [];

  // Filter to instruments that existed at asOfDate (excluding base-included PFWs)
  const activeInstruments: typeof instruments = [];
  // Shares from matured ITM converts that haven't yet appeared in D1's basic count.
  // When a convert matures ITM, its shares move to basic — but D1 may not update
  // until the next quarterly filing. Without this, shares vanish from the calculation.
  let maturedConvertShares = 0;

  for (const inst of instruments) {
    // Already counted in sharesForMnav (e.g., pre-funded warrants)
    if (inst.includedInBase) continue;
    // Must have been issued by asOfDate (if issuedDate is tracked)
    if (inst.issuedDate && inst.issuedDate > asOfDate) continue;

    // Expired/matured: if it was an ITM convert, its shares are now in basic count
    if (inst.expiration && inst.expiration <= asOfDate) {
      if (inst.type === "convertible" && stockPrice > inst.strikePrice) {
        maturedConvertShares += inst.potentialShares;
      }
      continue;
    }

    activeInstruments.push(inst);
  }

  const breakdown: InstrumentBreakdown[] = activeInstruments.map((inst) => ({
    type: inst.type,
    strikePrice: inst.strikePrice,
    potentialShares: inst.potentialShares,
    faceValue: inst.faceValue,
    inTheMoney: stockPrice > inst.strikePrice,
    source: inst.source,
    notes: inst.notes,
  }));

  const inTheMoneyShares = breakdown
    .filter((b) => b.inTheMoney)
    .reduce((sum, b) => sum + b.potentialShares, 0)
    + maturedConvertShares;

  // Settlement-aware debt subtraction (same logic as getEffectiveShares)
  const inTheMoneyDebtValue = activeInstruments
    .filter((inst) => {
      if (!inst.faceValue || inst.type !== "convertible") return false;
      if (stockPrice <= inst.strikePrice) return false;
      const settlement = inst.settlementType || "full_share";
      return settlement === "full_share";
    })
    .reduce((sum, inst) => sum + (inst.faceValue || 0), 0);

  // Calculate exercise proceeds from in-the-money WARRANTS
  const inTheMoneyWarrantProceeds = breakdown
    .filter((b) => b.inTheMoney && b.type === "warrant")
    .reduce((sum, b) => sum + (b.potentialShares * b.strikePrice), 0);

  return {
    basic: basicShares,
    diluted: basicShares + inTheMoneyShares,
    inTheMoneyDebtValue,
    inTheMoneyWarrantProceeds,
    breakdown,
  };
}

/**
 * Dilution detection result from SEC share count delta
 */
export interface DilutionDetectionResult {
  ticker: string;
  basicShares: number | null;
  dilutedShares: number | null;
  hasDilutiveInstruments: boolean;
  delta: number;           // diluted - basic (0 if either is null)
  deltaPct: number;        // (diluted - basic) / basic * 100
  asOfDate: string | null;
  source: string | null;   // Filing type (10-Q, 10-K)
  sourceUrl: string | null;
}

/**
 * Detect dilutive instruments from SEC XBRL share count delta.
 *
 * Phase 1 approach: Any non-zero difference between diluted and basic
 * share counts indicates the presence of dilutive instruments.
 *
 * Note: This catches most cases but may miss anti-dilutive instruments
 * (convertibles that are out-of-the-money and excluded from diluted EPS
 * calculation per GAAP). For complete coverage, combine with balance
 * sheet parsing for convertible notes (Phase 2).
 *
 * @param basicShares - Basic shares outstanding from SEC filing
 * @param dilutedShares - Diluted shares from SEC filing
 * @param ticker - Company ticker
 * @param asOfDate - Date of the share count data
 * @param source - Filing type (e.g., "10-Q Q3 2025")
 * @param sourceUrl - Link to SEC filing
 */
export function detectDilutiveInstruments(
  basicShares: number | null,
  dilutedShares: number | null,
  ticker: string,
  asOfDate: string | null = null,
  source: string | null = null,
  sourceUrl: string | null = null
): DilutionDetectionResult {
  // If we don't have both values, can't detect
  if (basicShares === null || dilutedShares === null) {
    return {
      ticker,
      basicShares,
      dilutedShares,
      hasDilutiveInstruments: false,
      delta: 0,
      deltaPct: 0,
      asOfDate,
      source,
      sourceUrl,
    };
  }

  const delta = dilutedShares - basicShares;
  const deltaPct = basicShares > 0 ? (delta / basicShares) * 100 : 0;

  // Flag ANY non-zero difference as having dilutive instruments
  // This is intentionally sensitive to catch small positions
  const hasDilutiveInstruments = delta > 0;

  return {
    ticker,
    basicShares,
    dilutedShares,
    hasDilutiveInstruments,
    delta,
    deltaPct,
    asOfDate,
    source,
    sourceUrl,
  };
}

/**
 * Format dilution detection result for display/logging.
 *
 * Example outputs:
 * - "BTCS: Has dilutive instruments (6.8M shares, 14.5% dilution)"
 * - "MSTR: Has dilutive instruments (45.2M shares, 12.3% dilution)"
 * - "XYZ: No dilutive instruments detected (basic = diluted)"
 */
export function formatDilutionDetection(result: DilutionDetectionResult): string {
  if (!result.hasDilutiveInstruments) {
    if (result.basicShares === null || result.dilutedShares === null) {
      return `${result.ticker}: Unable to detect (missing share data)`;
    }
    return `${result.ticker}: No dilutive instruments detected (basic = diluted)`;
  }

  const deltaStr = result.delta >= 1_000_000
    ? `${(result.delta / 1_000_000).toFixed(1)}M`
    : result.delta.toLocaleString();

  return `${result.ticker}: Has dilutive instruments (${deltaStr} shares, ${result.deltaPct.toFixed(1)}% dilution)`;
}

/**
 * Format effective shares result for display/logging.
 *
 * Example output:
 * "50,298,201 shares (47,075,189 basic + 3,223,012 in-money options)"
 */
export function formatEffectiveShares(result: EffectiveSharesResult): string {
  const inMoney = result.breakdown.filter((b) => b.inTheMoney);
  const outMoney = result.breakdown.filter((b) => !b.inTheMoney);

  let explanation = `${result.diluted.toLocaleString()} shares`;

  if (inMoney.length > 0) {
    const inMoneyDesc = inMoney
      .map(
        (b) =>
          `${b.potentialShares.toLocaleString()} ${b.type}s @ $${b.strikePrice}`
      )
      .join(", ");
    explanation += ` (${result.basic.toLocaleString()} basic + ${inMoneyDesc} in-money)`;
  } else {
    explanation += ` (${result.basic.toLocaleString()} basic, all dilutives out-of-money)`;
  }

  return explanation;
}

/**
 * Generate detailed provenance explanation for a company's share count.
 *
 * Example output:
 * "Basic shares: 47,075,189 (10-Q Q3 2025)
 * + Options at $2.64: 3,223,012 (IN money at $2.89 stock)
 * - Convertible at $5.85: 1,709,402 (OUT of money)
 * - Convertible at $13.00: 769,231 (OUT of money)
 * = Effective diluted: 50,298,201"
 */
export function getSharesProvenance(
  ticker: string,
  basicShares: number,
  basicSharesSource: string,
  stockPrice: number
): string {
  const result = getEffectiveShares(ticker, basicShares, stockPrice);
  const lines: string[] = [];

  lines.push(
    `Basic shares: ${basicShares.toLocaleString()} (${basicSharesSource})`
  );

  for (const inst of result.breakdown) {
    const status = inst.inTheMoney
      ? `IN money at $${stockPrice.toFixed(2)} stock`
      : "OUT of money";
    const sign = inst.inTheMoney ? "+" : "-";
    lines.push(
      `${sign} ${inst.type} at $${inst.strikePrice}: ${inst.potentialShares.toLocaleString()} (${status})`
    );
  }

  lines.push(`= Effective diluted: ${result.diluted.toLocaleString()}`);

  return lines.join("\n");
}
