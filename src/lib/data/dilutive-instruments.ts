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

export type InstrumentType = "convertible" | "option" | "warrant";

export interface DilutiveInstrument {
  type: InstrumentType;
  strikePrice: number; // Conversion or exercise price in USD
  potentialShares: number; // Number of shares if fully converted/exercised
  faceValue?: number; // Face/principal value in USD (for convertibles - used to adjust debt)
  source: string; // e.g., "8-K Jul 2025", "10-Q Q3 2025"
  sourceUrl: string; // Link to SEC filing or primary source
  expiration?: string; // ISO date when instrument expires/matures (optional)
  issuedDate?: string; // ISO date when instrument was issued (for historical tracking)
  notes?: string; // Additional context, e.g., "$150M convertible note"
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
  // Verified 2026-01-28 via SEC XBRL (CIK 0001829311)
  BMNR: [
    {
      type: "warrant",
      strikePrice: 10.0,
      potentialShares: 129_375,
      source: "10-K FY2025",
      sourceUrl:
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001829311&type=10-K",
      notes: "ClassOfWarrantOrRightOutstanding @ $10 exercise price",
    },
    {
      type: "warrant",
      strikePrice: 5.4,
      potentialShares: 1_231_945,
      source: "8-K Jul 2025 PIPE",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1829311/000168316825004494",
      issuedDate: "2025-07-10",
      notes: "Placement agent warrants (ThinkEquity) from $250M PIPE",
    },
    {
      type: "option",
      strikePrice: 0, // RSUs vest at $0
      potentialShares: 3_043_654,
      source: "10-Q Q1 FY2026",
      sourceUrl:
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001829311&type=10-Q",
      notes: "RSUs/restricted stock (NonOptionEquityInstrumentsOutstanding)",
    },
  ],

  // SBET (SharpLink Gaming) - ETH treasury company
  // Verified 2026-01-28 via SEC XBRL (CIK 0001981535)
  // Note: 1:12 reverse split May 5, 2025 - all figures post-split adjusted
  SBET: [
    {
      type: "warrant",
      strikePrice: 1.08, // Post-split adjusted (pre-split ~$0.09 * 12)
      potentialShares: 3_455_019,
      source: "10-Q Q3 2025",
      sourceUrl:
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001981535&type=10-Q",
      notes: "ClassOfWarrantOrRightOutstanding - likely ITM at ~$10 stock",
    },
    {
      type: "option",
      strikePrice: 91.06,
      potentialShares: 9_022,
      source: "10-Q Q3 2025",
      sourceUrl:
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001981535&type=10-Q",
      notes: "Stock options - deep OTM at ~$10 stock price",
    },
    {
      type: "option",
      strikePrice: 0, // RSUs vest at $0
      potentialShares: 18_116_449,
      source: "10-Q Q3 2025",
      sourceUrl:
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001981535&type=10-Q",
      notes: "RSUs (NonOptionEquityInstrumentsOutstanding) - large grant with new mgmt",
    },
  ],

  // SUIG (SUI Group Holdings) - SUI treasury company
  // Verified 2026-01-29 via SEC 8-K Jan 8, 2026 (accession 0001654954-26-000201)
  // Treasury: 108,098,436 SUI (Jan 7, 2026) | Shares: 80.9M fully adjusted
  // Note: 80.9M already includes pre-funded warrants - sharesForMnav uses this
  // Director warrants below vest over 24mo (starting 6mo from Jan 2026), 5-year exercise
  SUIG: [
    {
      type: "warrant",
      strikePrice: 5.42,
      potentialShares: 83_026,
      source: "8-K Jan 8, 2026",
      sourceUrl:
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001425355&type=8-K",
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
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001425355&type=8-K",
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
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001425355&type=8-K",
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
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001425355&type=8-K",
      expiration: "2031-01-05",
      issuedDate: "2026-01-05",
      notes: "Brian Quintenz director warrants (tranche 4)",
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
        "https://www.sec.gov/Archives/edgar/data/1662684/000110465925113662/tmb-20250930x10q.htm",
      notes: "Stock options - exercise price range $2.24-$7.92 (post-split)",
    },
    {
      type: "warrant",
      strikePrice: 8.0,
      potentialShares: 66_667,
      source: "10-Q Q3 2025",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1662684/000110465925113662/tmb-20250930x10q.htm",
      notes: "Warrants @ $8 exercise price (post-split)",
    },
    {
      type: "warrant",
      strikePrice: 10.0,
      potentialShares: 111_143, // 88,905 + 22,238
      source: "10-Q Q3 2025",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1662684/000110465925113662/tmb-20250930x10q.htm",
      notes: "Warrants @ $10 exercise price (post-split)",
    },
  ],

  // Sequans Communications (SQNS) - IoT semiconductor with BTC treasury
  // Verified 2026-02-02 via SEC 6-K filings (CIK 0001383395)
  // Jul 2025: $189M convertible debt raised for BTC purchases
  // Nov 4, 2025: Sold 970 BTC to repay portion of debt
  // Note: Foreign private issuer (France), 1:10 reverse split Sep 17, 2025
  SQNS: [
    {
      type: "convertible",
      strikePrice: 58.40, // Estimated: $189M / ~3.24M potential shares (pre-split 32.4M / 10)
      potentialShares: 3_240_000, // Estimated post-split shares
      faceValue: 189_000_000, // $189M convertible debt
      source: "SEC 6-K Jul 2025",
      sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001383395&type=6-K",
      issuedDate: "2025-07-08",
      notes: "$189M convertible debt for BTC treasury (3-year term, matures ~Jul 2028). BTC pledged as collateral initially, later amended. Strike estimated - needs verification.",
    },
  ],

  // H100 Group (H100.ST) - Swedish BTC treasury company
  // Verified 2026-01-29 via MFN Swedish regulatory filings (https://mfn.se/a/h100-group)
  // Jul 9, 2025: SEK 516M raised via convertible debentures (Adam Back et al)
  // Nov 21, 2025: SEK 122.5M converted to shares
  // Remaining: ~SEK 393.5M in outstanding convertibles
  // Note: IR page incorrectly states "no warrants/convertibles" - MFN filings prove otherwise
  "H100.ST": [
    {
      type: "convertible",
      strikePrice: 0.77, // Estimated: SEK 8 / 10.4 USD/SEK. Shares issued at SEK 6-8.48 in Jul-Sep 2025.
      potentialShares: 43_000_000, // 354.43M diluted - 311.50M basic = ~43M from convertibles
      faceValue: 38_000_000, // ~SEK 393.5M remaining / 10.4 = $37.8M USD
      source: "MFN Jul 9, 2025 + Nov 21, 2025",
      sourceUrl: "https://mfn.se/a/h100-group",
      issuedDate: "2025-07-09",
      notes: "SEK 516M convertible (Adam Back investment), SEK 122.5M converted Nov 2025. Strike price estimated - needs verification from offering docs.",
    },
  ],

  // NXTT removed - company has history of false financial reports

  // MARA Holdings - BTC miner with HODL strategy
  // Verified 2026-01-28 via SEC 8-Ks + XBRL (CIK 0001507605)
  MARA: [
    {
      type: "convertible",
      strikePrice: 76.17,
      potentialShares: 9_812_000, // $747.5M / $76.17 = 9.812M shares
      faceValue: 747_500_000,
      source: "8-K Nov 2021",
      sourceUrl:
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001507605&type=8-K",
      expiration: "2026-11-15",
      notes: "0% Convertible Senior Notes due 2026",
    },
    {
      type: "convertible",
      strikePrice: 20.26, // Verified from 8-K Jul 28, 2025
      potentialShares: 46_890_000, // $950M / $20.2585 = 46.89M shares
      faceValue: 950_000_000,
      source: "8-K Jul 2025",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1507605/000095014225002027/eh250659491_8k.htm",
      expiration: "2032-05-01",
      notes: "0% Convertible Senior Notes due 2032 (49.3619 shares per $1,000)",
    },
    {
      type: "convertible",
      strikePrice: 34.58, // Verified from 8-K Dec 4, 2024
      potentialShares: 24_580_000, // $850M / $34.583 = 24.58M shares
      faceValue: 850_000_000,
      source: "8-K Dec 2024",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1507605/000149315224048704/form8-k.htm",
      expiration: "2030-12-01",
      notes: "0% Convertible Senior Notes due 2030 (28.9159 shares per $1,000)",
    },
    {
      type: "option",
      strikePrice: 0, // RSUs vest at $0
      potentialShares: 324_375,
      source: "10-Q Q3 2025",
      sourceUrl:
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001507605&type=10-Q",
      notes: "RSUs/restricted stock (NonOptionEquityInstrumentsOutstanding)",
    },
  ],

  // Twenty One Capital (XXI) - BTC treasury (Tether/SoftBank/Mallers)
  // Verified 2026-02-10 via SEC 8-K (Dec 12, 2025) + 10-Q (Dec 19, 2025)
  // BTC sources: Tether/Bitfinex (31,500) + PIPE (10,500) + additional = ~43,514 BTC
  // Shares: 651,390,912 (Class A: 346,548,153 + Class B: 304,842,759) per 10-Q XBRL
  XXI: [
    {
      type: "convertible",
      strikePrice: 13.87, // $1,000 / 72.0841 conversion rate = $13.87
      potentialShares: 35_068_912, // $486.5M × 72.0841 / 1000 = 35.07M shares
      faceValue: 486_500_000,
      source: "8-K Dec 12, 2025 (Indenture)",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/2070457/000121390025121293/ea0228850-8k_twentyone.htm",
      issuedDate: "2025-12-09",
      expiration: "2030-12-01",
      notes: "1.00% Convertible Senior Secured Notes due 2030, conversion rate 72.0841 shares/$1,000, collateralized by 16,116.32 BTC",
    },
  ],

  // Strive (ASST) - First asset manager BTC treasury
  // Verified 2026-02-12 via SEC filings (CIK 0001920406)
  // Post-Semler merger (Jan 16, 2026) + 1-for-20 reverse split (Feb 3, 2026)
  // Basic shares: 62,370,000 (post-merger, post-split)
  // Diluted: ~90.12M → Difference: ~27.75M in dilutive instruments
  // Pre-funded warrants @ $0.002 are essentially shares - always ITM
  // NOTE: SATA 12.25% perpetual preferred is NOT convertible to common stock
  ASST: [
    {
      type: "warrant",
      strikePrice: 0.002, // $0.002 - essentially $0, always ITM
      potentialShares: 3_208_713,
      source: "8-K Feb 3, 2026 (post-split)",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1920406/000095010326001560/",
      issuedDate: "2026-01-21",
      notes: "Pre-funded warrants @ $0.002 - always ITM, essentially shares. From PIPE financing.",
    },
    {
      type: "warrant",
      strikePrice: 27.0, // Post-split: $540 pre-split / 20 = $27
      potentialShares: 21_787_205, // Adjusted post-merger
      source: "8-K Feb 3, 2026 (post-split)",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1920406/000095010326001560/",
      issuedDate: "2026-01-21",
      notes: "Traditional warrants from PIPE @ $27 post-split. Significantly OTM if stock below $27.",
    },
    {
      type: "convertible",
      strikePrice: 3.63, // $1,000 / 275.3887 conversion rate = $3.63 per share
      potentialShares: 2_753_887, // $10M × 275.3887 / 1000 = 2,753,887 shares
      faceValue: 10_000_000,
      source: "8-K Jan 28, 2026 (Semler convertible notes)",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1920406/000114036126002606/",
      issuedDate: "2026-01-16", // Assumed from Semler merger
      expiration: "2027-12-15", // Verify from original Semler note terms
      notes: "$10M remaining Semler convertible notes after $90M exchange. Conversion rate: 275.3887 shares per $1,000.",
    },
  ],
  // Total ASST dilution: 3.2M pre-funded (ITM) + 21.8M traditional warrants + 2.75M converts
  // sharesForMnav uses basic (62.37M) since dilutives tracked here
  // At typical prices (~$30): Pre-funded adds 3.2M + converts add 2.75M → FD ~68.3M shares
  // If stock > $27: Traditional warrants add 21.8M → FD ~90.1M shares

  // BTCS Inc - ETH treasury company
  // Verified 2026-01-29 via SEC filings and btcs.com
  // Jan 5 8-K: +690,300 options granted @ $2.64 (2025 performance incentives)
  BTCS: [
    {
      type: "convertible",
      strikePrice: 5.85,
      potentialShares: 1_709_402,
      faceValue: 10_000_000,
      source: "8-K May 2025",
      sourceUrl:
        "https://www.btcs.com/news-media/convertible-note/",
      expiration: "2027-05-13",
      notes: "$10M convertible note (ATW Partners facility, 194% premium)",
    },
    {
      type: "convertible",
      strikePrice: 13.0,
      potentialShares: 769_231,
      faceValue: 10_000_000,
      source: "8-K Jul 2025",
      sourceUrl:
        "https://www.btcs.com/news-media/eth-holdings-update-july-21-2025/",
      expiration: "2027-07-21",
      notes: "$10M convertible note (ATW Partners, 198% premium)",
    },
    {
      type: "option",
      strikePrice: 2.64,
      potentialShares: 3_913_312,  // 3,223,012 (Q3) + 690,300 (Jan 5 8-K grants)
      source: "10-Q Q3 2025 + 8-K Jan 5 2026",
      sourceUrl:
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001436229&type=8-K",
      expiration: "2033-01-01",  // 7-year term from Jan 2026
      notes: "Employee stock options - 3.2M (Q3) + 690K (Jan 2026 performance grants)",
    },
  ],

  // BTBT (Bit Digital) - ETH treasury company (formerly BTC miner)
  // Verified 2026-02-13 via Oct 8, 2025 PR: "$150 million convertible notes offering,
  // which included the underwriters' full exercise of their over-allotment option"
  // $135M upsized offering + $15M overallotment = $150M total (NOT $165M)
  // 4.00% Convertible Senior Notes due 2030 (underwritten by Barclays, Cantor, B. Riley)
  BTBT: [
    {
      type: "convertible",
      strikePrice: 4.16,
      potentialShares: 36_057_692,  // 240.3846 shares per $1,000 × 150,000 = 36,057,690
      faceValue: 150_000_000,  // $135M upsized + $15M overallotment fully exercised
      source: "8-K Oct 2, 2025 + PR Oct 8, 2025",
      sourceUrl:
        "https://bit-digital.com/press-releases/bit-digital-inc-purchases-31057-eth-with-convertible-notes-proceeds-raising-capital-at-a-premium-to-mnav/",
      expiration: "2030-10-01",
      notes: "$150M 4% convertible notes. Conversion: 240.3846 shares/$1K = $4.16/share. Investors: Kraken, Jump, Jane Street. Put date ~Oct 1, 2028.",
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
      source: "10-Q Q2 FY2026 Note 10",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1775194/000147793226000736/upxi_10q.htm",
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
      source: "8-K Jan 14, 2026 (Hivemind)",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1775194/000147793226000207/upxi_ex41.htm",
      expiration: "2028-01-09",  // 24 months from Jan 9, 2026
      notes: "$36M Hivemind convertible @$2.39. 1% interest. For 265.5K locked SOL. First-priority security interest in SOL.",
    },
    // $560K Promissory Notes @$3.00 (convertible, maturity Jun 1, 2026)
    {
      type: "convertible",
      strikePrice: 3.00,
      potentialShares: 186_667,  // $560K / $3.00
      faceValue: 560_000,
      source: "10-Q Q2 FY2026 Note 10",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1775194/000147793226000736/upxi_10q.htm",
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
        "https://www.sec.gov/Archives/edgar/data/1775194/000147793226000736/upxi_10q.htm",
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
        "https://www.sec.gov/Archives/edgar/data/1775194/000147793226000736/upxi_10q.htm",
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
        "https://www.sec.gov/Archives/edgar/data/1775194/000147793226000736/upxi_10q.htm",
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
        "https://www.sec.gov/Archives/edgar/data/1775194/000147793226000736/upxi_10q.htm",
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
        "https://www.sec.gov/Archives/edgar/data/1775194/000147793226000736/upxi_10q.htm",
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
        "https://www.sec.gov/Archives/edgar/data/1775194/000147793226000736/upxi_10q.htm",
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
  // Other warrants below are NOT in sharesForMnav — exercise prices TBD (need 8-K exhibit review)
  // Also: 102.1M shares reserved for ATM (sold at market, not dilutive at a strike)
  // Also: $1B share buyback program (Nov 2025 – Sep 2027), ~$975.6M remaining
  FWDI: [
    // All 3 warrant tranches: $0.01 exercise price, BUT performance-based vesting.
    // Each tranche has 3 sub-tranches that vest at different stock price targets
    // (relative to $18.50 PIPE price). Perpetual (no expiration). Cashless exercise.
    // Source: 8-K Sep 8, 2025, EX-10.3 (Galaxy) and EX-10.4 (Jump/Multicoin)
    // https://www.sec.gov/Archives/edgar/data/38264/000168316825006734/forward_ex1003.htm
    // https://www.sec.gov/Archives/edgar/data/38264/000168316825006734/forward_ex1004.htm

    // Galaxy Strategic Advisor Warrants — 5% of PIPE shares
    // 1/3 vests at $27.75 (150% of $18.50), 1/3 at $37.00 (200%), 1/3 at $46.25 (250%)
    // Actual exercise price is $0.01 (penny warrants w/ cashless exercise) — using vesting
    // trigger as strikePrice so mNAV calculator correctly includes only when vested/dilutive.
    { type: "warrant", potentialShares: 1_486_486, strikePrice: 27.75, source: "8-K Sep 8, 2025 EX-10.3", sourceUrl: "https://www.sec.gov/Archives/edgar/data/38264/000168316825006734/forward_ex1003.htm", notes: "Galaxy Advisor — exercise $0.01, vests at $27.75 (20/30 days). Perpetual, cashless." },
    { type: "warrant", potentialShares: 1_486_486, strikePrice: 37.00, source: "8-K Sep 8, 2025 EX-10.3", sourceUrl: "https://www.sec.gov/Archives/edgar/data/38264/000168316825006734/forward_ex1003.htm", notes: "Galaxy Advisor — exercise $0.01, vests at $37.00 (20/30 days). Perpetual, cashless." },
    { type: "warrant", potentialShares: 1_486_487, strikePrice: 46.25, source: "8-K Sep 8, 2025 EX-10.3", sourceUrl: "https://www.sec.gov/Archives/edgar/data/38264/000168316825006734/forward_ex1003.htm", notes: "Galaxy Advisor — exercise $0.01, vests at $46.25 (20/30 days). Perpetual, cashless." },

    // Jump Crypto Lead Investor Warrants — 5% of PIPE shares (split pro rata with Multicoin)
    { type: "warrant", potentialShares: 1_486_486, strikePrice: 27.75, source: "8-K Sep 8, 2025 EX-10.4", sourceUrl: "https://www.sec.gov/Archives/edgar/data/38264/000168316825006734/forward_ex1004.htm", notes: "Jump Crypto — exercise $0.01, vests at $27.75 (20/30 days). Perpetual, cashless." },
    { type: "warrant", potentialShares: 1_486_486, strikePrice: 37.00, source: "8-K Sep 8, 2025 EX-10.4", sourceUrl: "https://www.sec.gov/Archives/edgar/data/38264/000168316825006734/forward_ex1004.htm", notes: "Jump Crypto — exercise $0.01, vests at $37.00 (20/30 days). Perpetual, cashless." },
    { type: "warrant", potentialShares: 1_486_487, strikePrice: 46.25, source: "8-K Sep 8, 2025 EX-10.4", sourceUrl: "https://www.sec.gov/Archives/edgar/data/38264/000168316825006734/forward_ex1004.htm", notes: "Jump Crypto — exercise $0.01, vests at $46.25 (20/30 days). Perpetual, cashless." },

    // Multicoin Capital Lead Investor Warrants — 5% of PIPE shares (split pro rata with Jump)
    { type: "warrant", potentialShares: 1_486_486, strikePrice: 27.75, source: "8-K Sep 8, 2025 EX-10.4", sourceUrl: "https://www.sec.gov/Archives/edgar/data/38264/000168316825006734/forward_ex1004.htm", notes: "Multicoin — exercise $0.01, vests at $27.75 (20/30 days). Perpetual, cashless." },
    { type: "warrant", potentialShares: 1_486_486, strikePrice: 37.00, source: "8-K Sep 8, 2025 EX-10.4", sourceUrl: "https://www.sec.gov/Archives/edgar/data/38264/000168316825006734/forward_ex1004.htm", notes: "Multicoin — exercise $0.01, vests at $37.00 (20/30 days). Perpetual, cashless." },
    { type: "warrant", potentialShares: 1_486_487, strikePrice: 46.25, source: "8-K Sep 8, 2025 EX-10.4", sourceUrl: "https://www.sec.gov/Archives/edgar/data/38264/000168316825006734/forward_ex1004.htm", notes: "Multicoin — exercise $0.01, vests at $46.25 (20/30 days). Perpetual, cashless." },
  ],

  // HSDT (Solana Company, fka Helius Medical) - SOL treasury company
  // Verified 2026-02-13 via SEC XBRL Q3 2025 (CIK 0001610853)
  // Q3 earnings press release: "75.9 million common shares and pre-funded warrants outstanding"
  // Basic shares (Nov 17): 41,301,400 → Pre-funded warrants: ~34,598,600 @ $0.00001
  // NOTE: Pre-funded warrants ALREADY INCLUDED in sharesForMnav (75.9M)
  // DO NOT add them here - would cause double-counting in mNAV calculation
  // sharesForMnav = 41.3M basic + 34.6M pre-funded = 75.9M FD
  //
  // HSDTW (public warrants): Listed on NASDAQ. Strike price and expiration TBD.
  // TODO: Research HSDTW warrant terms from 10-Q/10-K text and add here.
  HSDT: [],

  // STKE (Sol Strategies) - SOL treasury company (Canadian, NASDAQ cross-listed)
  // Verified 2026-01-29 via SEC 40-F FY2025 (CIK 0001846839)
  // As of Sep 30, 2025: 643,626 options (WAEP $13.71), 1,552,042 warrants (WAEP $22.14), 15,106 RSUs
  // At ~$1.57 stock price: Most options/warrants deep OTM, only low-strike options + RSUs ITM
  STKE: [
    {
      type: "option",
      strikePrice: 0.80,
      potentialShares: 3_689,
      source: "40-F FY2025",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1846839/000110465925125666/stke-20250930xex99d2.htm",
      expiration: "2027-11-21",
      notes: "Low-strike options - ITM at $1.57",
    },
    {
      type: "option",
      strikePrice: 1.24,
      potentialShares: 125_000,
      source: "40-F FY2025",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1846839/000110465925125666/stke-20250930xex99d2.htm",
      expiration: "2029-08-07",
      notes: "ITM at $1.57 stock price",
    },
    {
      type: "option",
      strikePrice: 13.71, // WAEP for remaining 514,937 options
      potentialShares: 514_937,
      source: "40-F FY2025",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1846839/000110465925125666/stke-20250930xex99d2.htm",
      notes: "Remaining options at WAEP - deep OTM at $1.57",
    },
    {
      type: "option",
      strikePrice: 0, // RSUs vest at $0
      potentialShares: 15_106,
      source: "40-F FY2025",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1846839/000110465925125666/stke-20250930xex99d2.htm",
      notes: "RSUs (restricted share units) - always ITM",
    },
    {
      type: "warrant",
      strikePrice: 23.84,
      potentialShares: 562_500,
      source: "40-F FY2025",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1846839/000110465925125666/stke-20250930xex99d2.htm",
      expiration: "2028-03-17",
      notes: "Deep OTM at $1.57",
    },
    {
      type: "warrant",
      strikePrice: 20.00,
      potentialShares: 922_667,
      source: "40-F FY2025",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1846839/000110465925125666/stke-20250930xex99d2.htm",
      expiration: "2030-01-16",
      notes: "Deep OTM at $1.57",
    },
    {
      type: "warrant",
      strikePrice: 37.28,
      potentialShares: 66_875,
      source: "40-F FY2025",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1846839/000110465925125666/stke-20250930xex99d2.htm",
      expiration: "2030-01-21",
      notes: "Deep OTM at $1.57",
    },
  ],

  // Capital B (ALTBG) - France BTC treasury (The Blockchain Group)
  // Trades on Euronext Paris in EUR. Strike prices and face values converted to USD at ~1.04 EUR/USD.
  // Source: Euronext press releases
  // Verified 2026-01-25
  // Fully diluted: ~391.5M shares (per cptlb.com/analytics)
  ALTBG: [
    // === OCA Tranche 1 (March 2025) - Largest dilution, lowest strike ===
    {
      type: "convertible",
      strikePrice: 0.57, // €0.544 × 1.04
      potentialShares: 89_367_393,
      faceValue: 50_544_000, // €48.6M × 1.04
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
      source: "Euronext Aug 2025 (OCA A-05 T1)",
      sourceUrl:
        "https://www.finanzwire.com/press-release/capital-b-capital-increase-and-convertible-bonds-issuance-for-eur115-million-with-tobam-bitcoin-alpha-fund-to-pursue-its-bitcoin-treasury-company-strategy-0WAE500EF0o",
      expiration: "2030-08-01",
      notes: "OCA A-05 Tranche 1: TOBAM (€6.5M). Conversion at €3.6557/share.",
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
        "https://www.sec.gov/Archives/edgar/data/1956741/000121390025085107/0001213900-25-085107-index.htm",
      expiration: "2030-09-05",
      notes: "Strategic Advisor warrants (Gresham Worldwide LLC) at $1.00 strike",
    },
    {
      type: "warrant",
      strikePrice: 1.33,
      potentialShares: 5_250_013,
      source: "8-K Sep 5, 2025 (EX-4.2, EX-4.3)",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1956741/000121390025085107/0001213900-25-085107-index.htm",
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
      source: "8-K Dec 2020",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1050446/000119312520315971/d225117dex41.htm",
      issuedDate: "2020-12-11",
      expiration: "2025-12-15", // MATURED - converted to shares
      notes: "$650M @ 0.75% convertible notes due Dec 2025 (MATURED)",
    },
    // === Feb 2021 Convertible - $1.05B @ 0% ===
    {
      type: "convertible",
      strikePrice: 143.25, // $1,432.46 pre-split / 10
      potentialShares: 7_329_843, // $1.05B / $143.25
      faceValue: 1_050_000_000,
      source: "8-K Feb 2021",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1050446/000119312521049984/0001193125-21-049984-index.htm",
      issuedDate: "2021-02-17",
      expiration: "2027-02-15",
      notes: "$1.05B @ 0% convertible notes due Feb 2027",
    },
    // === Mar 2024 Convertible #1 - $800M @ 0.625% ===
    {
      type: "convertible",
      strikePrice: 118.0, // $1,180 pre-split / 10
      potentialShares: 6_779_661, // $800M / $118
      faceValue: 800_000_000,
      source: "8-K Mar 2024",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1050446/000119312524061544/0001193125-24-061544-index.htm",
      issuedDate: "2024-03-08",
      expiration: "2030-03-15",
      notes: "$800M @ 0.625% convertible notes due Mar 2030 (2030A)",
    },
    // === Mar 2024 Convertible #2 - $603.75M @ 0.875% ===
    {
      type: "convertible",
      strikePrice: 125.0, // $1,250 pre-split / 10
      potentialShares: 4_830_000, // $603.75M / $125
      faceValue: 603_750_000,
      source: "8-K Mar 2024",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1050446/000119312524064331/0001193125-24-064331-index.htm",
      issuedDate: "2024-03-11",
      expiration: "2031-03-15",
      notes: "$603.75M @ 0.875% convertible notes due Mar 2031",
    },
    // === Jun 2024 Convertible - $800M @ 2.25% ===
    {
      type: "convertible",
      strikePrice: 135.0, // $1,350 pre-split / 10
      potentialShares: 5_925_926, // $800M / $135
      faceValue: 800_000_000,
      source: "8-K Jun 2024",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1050446/000119312524160936/0001193125-24-160936-index.htm",
      issuedDate: "2024-06-13",
      expiration: "2032-06-15",
      notes: "$800M @ 2.25% convertible notes due Jun 2032",
    },
    // === Sep 2024 Convertible - $1.01B @ 0.625% (first post-split) ===
    {
      type: "convertible",
      strikePrice: 183.19, // Post-split price
      potentialShares: 5_513_403, // $1.01B / $183.19
      faceValue: 1_010_000_000,
      source: "8-K Sep 2024",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1050446/000119312524220296/0001193125-24-220296-index.htm",
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
      source: "8-K Nov 2024",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1050446/000119312524263336/0001193125-24-263336-index.htm",
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
      source: "8-K Feb 2025",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1050446/000119312525030212/0001193125-25-030212-index.htm",
      issuedDate: "2025-02-20",
      expiration: "2030-03-01",
      notes: "$2B @ 0% convertible notes due Mar 2030 (2030B Notes)",
    },
  ],
  // Total MSTR convertible dilution: ~39.5M potential shares
  // At current ~$320 stock price:
  // - IN money: $118, $125, $135, $143.25, $183.19 → ~30.4M dilutive shares
  // - OUT of money: $433.43, $672.40 → ~9.1M non-dilutive
  // Note: Dec 2020 $650M notes matured Dec 15, 2025 and converted to ~16.3M shares

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
        "https://www.sec.gov/Archives/edgar/data/1826397/000149315225021006/form8-k.htm",
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
  // ⚠️ INCOMPLETE: DJTWW warrant count/strike and convertible conversion price need verification
  DJT: [
    {
      type: "convertible",
      strikePrice: 0, // TODO: Conversion price not yet verified — check 8-K EX-2.1 from Dec 18, 2025
      potentialShares: 0, // TODO: Cannot calculate without conversion price
      source: "8-K May 2025 ($2.5B private placement)",
      sourceUrl: "/filings/djt/0001140361-25-040977",
      expiration: "2030-12-31",
      issuedDate: "2025-05-29",
      notes:
        "$1B par zero-coupon convertible senior secured notes due 2030. Carrying value ~$946M (XBRL: ConvertibleNotesPayable). Conversion price/ratio TBD from 8-K exhibit.",
    },
    // DJTWW warrants — legacy from DWAC SPAC merger
    // TODO: Verify count and strike from 10-K/10-Q footnotes
    // {
    //   type: "warrant",
    //   strikePrice: TBD,
    //   potentialShares: TBD,
    //   source: "DWAC merger (2024)",
    //   notes: "Public warrants trading as DJTWW. Count and strike need verification.",
    // },
  ],
  // Total DJT dilution: INCOMPLETE — convertible terms + DJTWW warrants + earnout shares TBD
  // Known dilutive risks: $1B converts (price unknown), DJTWW warrants, DWAC earnout shares

  // NAKA (Nakamoto Inc.) - BTC treasury company
  // Verified 2026-02-13 via SEC 10-Q Q3 2025 XBRL (CIK 0001946573)
  // Basic shares for mNAV: 511,555,864 (439.85M common + 71.7M pre-funded warrants at $0.001)
  // Pre-funded warrants already included in basic count (near-zero exercise price)
  NAKA: [
    {
      type: "warrant",
      strikePrice: 11.50, // Standard SPAC-style warrants from KindlyMD era
      potentialShares: 85_091_274,
      source: "10-Q Q3 2025 XBRL: ClassOfWarrantOrRightNumberOfSecuritiesCalledByEachWarrantOrRight",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1946573/000149315225024260/",
      expiration: "2026-03-31", // ~0.28 years remaining as of Sep 30, 2025
      issuedDate: "2023-01-01", // Approximate — from original KindlyMD IPO
      notes:
        "Tradeable warrants (NAKAW) on OTC Pink Market. 85.1M warrants at ~$11.50 exercise. Intrinsic value $90.3M per XBRL. ~0.28 years remaining as of Q3 2025.",
    },
    // Note: $200M Yorkville convertible debenture (conversion $2.80) was EXTINGUISHED Oct 2025
    // Replaced by Two Prime loan → Kraken $210M BTC-backed loan (Dec 2025)
    // No convertible debt outstanding as of Dec 2025
  ],

  // CYPH (Cypherpunk Technologies) - ZEC treasury company
  // Verified 2026-01-29 via SEC 8-K Oct 9, 2025 (CIK 0001509745)
  // Basic shares: 137,420,344 (56.6M common + 80.8M pre-funded warrants already in basic)
  CYPH: [
    {
      type: "warrant",
      strikePrice: 0.5335,
      potentialShares: 71_985_605,
      source: "SEC 8-K Oct 9, 2025 (PIPE closing)",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1509745/000110465925098082/tm2528058d2_8k.htm",
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
        "https://www.sec.gov/Archives/edgar/data/1509745/000110465925098082/tm2528058d2_8k.htm",
      expiration: "2035-10-08",
      issuedDate: "2025-10-08",
      notes: "Placement agent warrants (Parcrest). Same terms as common warrants.",
    },
  ],
  // Total CYPH dilution: ~76M warrants @ $0.5335 (expire Oct 2035)
  // At stock prices above $0.5335: all warrants ITM
  // Fully diluted: 137.4M basic + 76M warrants = ~213.4M shares

  // DDC (DDC Enterprise) - BTC treasury company
  // Verified 2026-02-02 via SEC F-1/424B3 (Jan 2026) and 20-F (May 2025)
  // CIK: 0001808110
  // Basic shares: 24,532,958 (22.78M Class A + 1.75M Class B)
  // No preferred outstanding (all converted at IPO)
  DDC: [
    {
      type: "option",
      strikePrice: 3.85, // Weighted avg exercise price
      potentialShares: 1_655_928,
      source: "SEC 20-F FY2024",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1808110/000121390025043916/ea0241193-20f_ddcenter.htm",
      notes: "2023 ESOP stock options outstanding as of Dec 31, 2024",
    },
    {
      type: "warrant",
      strikePrice: 0, // Exercise price set by Board at issuance - TBD
      potentialShares: 2_199_999,
      source: "SEC F-1 Jan 15, 2026",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1808110/000121390026004713/ea0262408-f1_ddcenter.htm",
      issuedDate: "2025-06-01",
      expiration: "2035-06-01", // 10-year term
      notes: "2025 Warrant Program: CEO 1.7M + execs/directors 500K. Vest 3yr, expire 10yr. Strike TBD by Board.",
    },
  ],
  // Total DDC dilution: 1.66M options + 2.2M warrants = ~3.86M potential shares
  // At ~$2.60 stock: Options OTM ($3.85 strike), Warrants TBD
  // 2023 ESOP allows up to 1.208M shares + 10% annual increase
  // 2025 Warrant Program: up to 5M for CEO in 2025, then 25% of outstanding annually

  // FLD (Fold Holdings) - BTC treasury company
  // Verified 2026-02-02 via SEC 10-Q Q3 2025 (CIK 0001889123)
  // Basic shares: 48,307,642 (Nov 2025)
  // Convertible debt: $82.4M ($21.6M June convert + $60.8M March convert related party)
  FLD: [
    {
      type: "warrant",
      strikePrice: 15.00,
      potentialShares: 925_590,
      source: "SEC 10-Q Q3 2025",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1889123/000119312525274317/fld-20250930.htm",
      notes: "March 2025 Warrants @ $15 - deep OTM at ~$2 stock",
    },
    {
      type: "convertible",
      strikePrice: 9.00,
      potentialShares: 2_222_222,  // $20M / $9
      faceValue: 20_000_000,
      source: "SEC 10-Q Q3 2025",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1889123/000119312525274317/fld-20250930.htm",
      expiration: "2028-02-14",
      notes: "June 2025 Amended Investor Note @ $9/share. Secured by 300 BTC. Deep OTM at ~$2 stock.",
    },
    {
      type: "convertible",
      strikePrice: 12.50,
      potentialShares: 3_704_000,  // $46.3M / $12.50
      faceValue: 46_300_000,  // Principal (fair value is $60.8M)
      source: "SEC 10-Q Q3 2025",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1889123/000119312525274317/fld-20250930.htm",
      notes: "March 2025 Investor Note (SATS Credit Fund - related party) @ $12.50/share. Funded with 475 BTC. Triggering events at $15-$40 stock. Deep OTM at ~$2 stock.",
    },
  ],
  // Total FLD dilution: 925K warrants + 5.9M convert shares = 6.8M potential (all OTM)
  // All instruments deep OTM at ~$2 stock vs $9-$15 strikes
  // 300 BTC collateral on June note, 475 BTC funded March note

  // FUFU (BitFuFu) - BTC miner
  // Verified 2026-02-02 via SEC 20-F (Apr 2025) and 6-K (Jan 2026)
  // CIK: 0001921158
  // Basic shares: 164,131,946 (Jun 2025 XBRL)
  // Debt: $101.3M long-term
  FUFU: [
    {
      type: "warrant",
      strikePrice: 11.50,
      potentialShares: 5_382_292,  // 7,176,389 warrants × 0.75 shares each
      source: "SEC 20-F FY2024",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1921158/000121390025033733/ea0238119-20f_bitfu.htm",
      notes: "Public warrants @ $11.50 - each warrant = 3/4 share. Deep OTM at ~$2.80 stock.",
    },
  ],
  // Total FUFU dilution: 5.4M potential shares from warrants (all OTM at $11.50 vs ~$2.80)
  // Also Unit Purchase Option for 115,000 units @ $11.50

  // HYPD (Hyperion DeFi) - HYPE treasury company
  // Verified 2026-01-30 via SEC 424B3 (Jan 9, 2026) and 10-Q Q3 2025
  // CIK: 0001682639
  // sharesForMnav already includes: 8.1M common + 16.3M from preferred conversion = 24.4M
  // Warrants NOT included in sharesForMnav - tracking here for ITM dilution
  // At ~$3.45 stock (Jan 8, 2026): $3.25 warrants are ITM, $4.00 warrants are OTM
  HYPD: [
    {
      type: "warrant",
      strikePrice: 3.25,
      potentialShares: 30_769_230,
      source: "424B3 Jan 9, 2026 (Purchaser Warrants)",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1682639/000110465926002496/tm2521045d6_424b3.htm",
      issuedDate: "2025-06-20",
      notes: "Purchaser Warrants from Jun 2025 PIPE. ITM at $3.45 stock.",
    },
    {
      type: "warrant",
      strikePrice: 3.25,
      potentialShares: 1_846_153,
      source: "424B3 Jan 9, 2026 (Placement Agent Warrants)",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1682639/000110465926002496/tm2521045d6_424b3.htm",
      issuedDate: "2025-06-20",
      notes: "Chardan placement agent warrants. ITM at $3.45 stock.",
    },
    {
      type: "warrant",
      strikePrice: 4.00,
      potentialShares: 350_000,
      source: "424B3 Jan 9, 2026 (Lender Warrants)",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1682639/000110465926002496/tm2521045d6_424b3.htm",
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
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1262104/000119312525283111",
      expiration: "2030-07-22",
      notes: "GSR 1 advisory warrants - OTM at ~$2.70",
    },
    {
      type: "warrant",
      strikePrice: 3.93,
      potentialShares: 292_398,
      source: "10-Q Q1 FY2026",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1262104/000119312525283111",
      expiration: "2030-07-22",
      notes: "GSR 2 advisory warrants - OTM at ~$2.70",
    },
    {
      type: "warrant",
      strikePrice: 4.62,
      potentialShares: 292_398,
      source: "10-Q Q1 FY2026",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1262104/000119312525283111",
      expiration: "2030-07-22",
      notes: "GSR 3 advisory warrants - OTM at ~$2.70",
    },
    {
      type: "warrant",
      strikePrice: 5.13,
      potentialShares: 292_398,
      source: "10-Q Q1 FY2026",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1262104/000119312525283111",
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
      source: "SEC 6-K Jan 20, 2026",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1735556/000110465926005086/tm263427d1_6k.htm",
      expiration: "2029-07-16",
      issuedDate: "2025-07-16",
      notes: "Series A-1 Senior Secured Convertible Note",
    },
    {
      type: "convertible",
      strikePrice: 3.354,  // Floor price post-split
      potentialShares: 1_490_757,  // $5M / $3.354
      faceValue: 5_000_000,
      source: "SEC 6-K Jan 20, 2026",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1735556/000110465926005086/tm263427d1_6k.htm",
      expiration: "2029-07-16",
      issuedDate: "2025-07-16",
      notes: "Series B-1 Senior Secured Convertible Note",
    },
    {
      type: "convertible",
      strikePrice: 4.74,  // Floor price post-split (was $0.079 pre-split)
      potentialShares: 282_386,  // $1,338,506 / $4.74
      faceValue: 1_338_506,
      source: "SEC 6-K Jan 20, 2026",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1735556/000110465926005086/tm263427d1_6k.htm",
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
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1735556/000110465926005086/tm263427d1_6k.htm",
      expiration: "2026-11-24",
      notes: "Deep OTM warrants",
    },
    {
      type: "warrant",
      strikePrice: 28.80,
      potentialShares: 28_626,
      source: "SEC 6-K Jan 20, 2026",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1735556/000110465926005086/tm263427d1_6k.htm",
      expiration: "2026-11-24",
      notes: "Deep OTM warrants",
    },
    {
      type: "warrant",
      strikePrice: 30.24,
      potentialShares: 604_147,
      source: "SEC 6-K Jan 20, 2026",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1735556/000110465926005086/tm263427d1_6k.htm",
      expiration: "2027-01-30",
      notes: "Deep OTM warrants",
    },
    {
      type: "warrant",
      strikePrice: 26.70,
      potentialShares: 30_207,
      source: "SEC 6-K Jan 20, 2026",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1735556/000110465926005086/tm263427d1_6k.htm",
      expiration: "2027-01-30",
      notes: "Deep OTM warrants",
    },
    {
      type: "warrant",
      strikePrice: 15.30,
      potentialShares: 18_791,
      source: "SEC 6-K Jan 20, 2026",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1735556/000110465926005086/tm263427d1_6k.htm",
      expiration: "2027-06-03",
      notes: "OTM warrants",
    },
    {
      type: "warrant",
      strikePrice: 1.3552,  // Subject to VWAP adjustment post-split
      potentialShares: 1_945_333,
      source: "SEC 6-K Jan 20, 2026",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1735556/000110465926005086/tm263427d1_6k.htm",
      expiration: "2030-04-22",
      notes: "Likely ITM - subject to price reset based on VWAP",
    },
    {
      type: "warrant",
      strikePrice: 5.4383,  // Subject to VWAP adjustment post-split
      potentialShares: 1_070_719,
      source: "SEC 6-K Jan 20, 2026",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1735556/000110465926005086/tm263427d1_6k.htm",
      expiration: "2034-06-29",
      notes: "OTM warrants - subject to price reset based on VWAP",
    },
  ],

  // XTAIF (xTAO Inc) - TAO treasury company (TSX-V: XTAO.U / OTC: XTAIF)
  // Verified 2026-02-01 via SEDAR+ Q2 FY26 MD&A (Sep 30, 2025)
  // Profile: 000108977 | Filing: Nov 25, 2025
  // Basic shares: 28,552,195
  // Pre-funded warrants: 9,479,090 @ $0.77 - ALREADY INCLUDED in sharesForMnav (38,031,285)
  // DO NOT add pre-funded warrants here - would cause double-counting
  // Only tracking stock options that are NOT in sharesForMnav
  XTAIF: [
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
  // Verified 2026-02-01 via SEC XBRL (CIK 746210)
  // Ticker changed from OBLG to TWAV Dec 2025
  // Warrants from Q1 2025 10-Q filing
  TWAV: [
    {
      type: "warrant",
      strikePrice: 1.72,  // ClassOfWarrantOrRightExercisePriceOfWarrantsOrRights1 @ 2024-03-31
      potentialShares: 2_262_203,  // ClassOfWarrantOrRightOutstanding @ 2025-03-31
      source: "SEC 10-Q Q1 2025",
      sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=746210&type=10-Q",
      expiration: "2026-06-28",  // Estimated - verify from 10-Q
      issuedDate: "2021-06-28",
      notes: "Legacy warrants from pre-TAO era. Slightly OTM at ~$1.65 stock price.",
    },
  ],

  // Metaplanet (3350.T) - Japan TSE
  // Mercury convertible bonds - ¥1000 strike (~$6.41 at 156 JPY/USD)
  // Currently OTM at ~¥540 (~$3.46) stock price
  "3350.T": [
    {
      type: "convertible",
      strikePrice: 6.41,  // ¥1000 conversion price / 156 JPY/USD
      potentialShares: 23_600_000,  // 23.6M shares if fully converted
      faceValue: 151_000_000,  // ~¥23.6B face value (~$151M at 156 JPY/USD)
      source: "TDnet Q3 FY2025 Financial Results",
      sourceUrl: "https://metaplanet.jp/en/shareholders/disclosures",
      expiration: "2029-12-31",  // Mercury bonds mature 2029 (verify exact date)
      issuedDate: "2024-10-01",  // Approximate issue date
      notes: "Mercury zero-coupon convertible bonds. ¥1000 strike, OTM at ¥540. Excluded from sharesForMnav.",
    },
    {
      type: "warrant",
      strikePrice: 3.53,  // ¥547 exercise price / 155 JPY/USD
      potentialShares: 15_944_000,  // 159,440 rights × 100 shares each
      source: "TDnet: 25th Series Stock Acquisition Rights (Feb 13, 2026 completion notice)",
      sourceUrl: "https://metaplanet.jp/en/shareholders/disclosures",
      expiration: "2027-02-13",  // 1-year exercise period from Feb 13, 2026
      issuedDate: "2026-02-13",
      notes: "25th Series warrants. 159,440 rights × 100 shares = 15.9M potential shares at ¥547 strike (~$3.53).",
    },
  ],

  // ABTC (American Bitcoin) - BTC miner/accumulator
  // Post-merger with Gryphon Sep 3, 2025. 80% owned by Hut 8.
  // TODO: Access Q3 2025 10-Q to extract dilutive instruments.
  // The 899M shares figure from the 10-Q appears to be total shares (all classes).
  // Pre-merger XBRL basic was 82.8M. Gap likely due to shares issued to Hut 8.
  // Dilutive instruments (warrants, options) beyond those are unknown pending Q3 10-Q access.
  // Leaving empty for now — dilutives will show as "None tracked" in UI.
  ABTC: [
    // TODO: Extract from Q3 2025 10-Q equity footnotes
    // Merger 8-K (0001213900-25-083726) Item 3.02 indicates equity issuances
    // Need to identify: warrants, stock options, RSUs, convertibles
  ],

  // DeFi Development Corp (DFDV) - SOL treasury company
  // Verified 2026-02-13 via SEC XBRL (CIK 0001805526) + 10-Q filings
  DFDV: [
    // 5.50% Convertible Senior Notes due 2030
    // $134M face value (XBRL ConvertibleDebtNoncurrent $131.4M net of $8.9M discount)
    // Conversion price: $9.74 per share (from 10-Q Q2 2025)
    // Potential shares: $134,000,000 / $9.74 = 13,757,700
    // XBRL IncrementalCommonSharesAttributableToConversionOfDebtSecurities: 6,804,000 (Q3 quarterly)
    {
      type: "convertible",
      strikePrice: 9.74,
      potentialShares: 13_757_700,
      faceValue: 134_000_000,
      source: "10-Q Q2 2025 + Q3 2025 XBRL",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1805526/000095017025108479/",
      expiration: "2030-07-15",
      issuedDate: "2025-04-04",
      notes:
        "5.50% Convertible Senior Notes due 2030. " +
        "Conversion price $9.74/share. Issued in multiple tranches: " +
        "~$42M initial (Apr 2025), ~$112.5M (Jul 2025). " +
        "XBRL ProceedsFromConvertibleDebt: $148.9M (9mo to Sep 30, 2025).",
    },
    // DFDVW Warrant Dividend - distributed to shareholders Oct/Nov 2025
    // Exact strike price needs verification from warrant agreement
    // XBRL IncrementalCommonSharesAttributableToCallOptionsAndWarrants: 290,000 (Q3 quarterly)
    // XBRL ProceedsFromIssuanceOfWarrants: $124.8M (as of Aug 24, 2025 - likely notional)
    // TODO: Extract exact strike price and share count from warrant FAQ (8-K Oct 8, 2025)
    {
      type: "warrant",
      strikePrice: 25.0, // TODO: Verify - estimated from warrant FAQ
      potentialShares: 290_000, // Q3 diluted EPS impact
      source: "8-K Oct 8, 2025 + Q3 2025 XBRL",
      sourceUrl:
        "https://www.sec.gov/Archives/edgar/data/1805526/000121390025097242/",
      issuedDate: "2025-10-08",
      notes:
        "DFDVW warrant dividend. Trading publicly on Nasdaq. " +
        "Exact terms need verification from warrant agreement. " +
        "XBRL shows 290K incremental shares in Q3 diluted EPS.",
    },
    // Stock Option / RSU Pool
    // XBRL: ShareBasedCompensationArrangementByShareBasedPaymentAwardNumberOfSharesAvailableForGrant = 3,500,000
    // These are available for future grant, not yet issued
    // Not adding as dilutive since not yet granted/outstanding
  ],
};

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
export function getEffectiveShares(
  ticker: string,
  basicShares: number,
  stockPrice: number
): EffectiveSharesResult {
  const instruments = dilutiveInstruments[ticker] || [];
  const today = new Date().toISOString().split("T")[0];

  // Filter out expired instruments - their shares already converted to basic
  const activeInstruments = instruments.filter((inst) => {
    if (inst.expiration && inst.expiration <= today) {
      return false; // Expired - shares already in basic count
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

  // Calculate face value of in-the-money CONVERTIBLES only
  // This should be subtracted from debt to avoid double-counting
  const inTheMoneyDebtValue = breakdown
    .filter((b) => b.inTheMoney && b.type === "convertible" && b.faceValue)
    .reduce((sum, b) => sum + (b.faceValue || 0), 0);

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

  // Filter to instruments that existed at asOfDate
  const activeInstruments = instruments.filter((inst) => {
    // Must have been issued by asOfDate (if issuedDate is tracked)
    if (inst.issuedDate && inst.issuedDate > asOfDate) {
      return false;
    }
    // Must not have expired/matured yet
    if (inst.expiration && inst.expiration <= asOfDate) {
      return false;
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

  // Calculate face value of in-the-money CONVERTIBLES only
  const inTheMoneyDebtValue = breakdown
    .filter((b) => b.inTheMoney && b.type === "convertible" && b.faceValue)
    .reduce((sum, b) => sum + (b.faceValue || 0), 0);

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
 * - "BTCS: Has dilutive instruments (3.2M shares, 6.8% dilution)"
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
