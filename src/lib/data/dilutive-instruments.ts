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
  // Verified 2026-01-28 via SEC filings
  // Debt: $486.5M 1% convertible senior secured notes due 2030, collateralized by 16,116 BTC
  XXI: [
    {
      type: "convertible",
      strikePrice: 10.0,  // Estimated - need to verify from S-1/8-K
      potentialShares: 48_650_000,  // $486.5M / $10 (estimated)
      faceValue: 486_500_000,
      source: "8-K Dec 2025 (merger)",
      sourceUrl:
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0002070457&type=8-K",
      expiration: "2030-12-09",
      notes: "1% Convertible Senior Secured Notes, collateralized by 16,116 BTC (~3:1 ratio). STRIKE PRICE NEEDS VERIFICATION.",
    },
  ],

  // BTCS Inc - ETH treasury company
  // Verified 2026-01-25 via adversarial process against SEC filings and btcs.com
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
      potentialShares: 3_223_012,
      source: "10-Q Q3 2025",
      sourceUrl:
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001436229&type=10-Q",
      notes: "Employee stock options (weighted avg exercise price)",
    },
  ],

  // UPXI (Upexi Inc) - SOL treasury company
  // Verified 2026-01-25 during company verification process
  UPXI: [
    {
      type: "convertible",
      strikePrice: 4.25,
      potentialShares: 35_294_118,
      faceValue: 150_000_000,
      source: "8-K Jul 2025",
      sourceUrl:
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001775194&type=8-K",
      expiration: "2030-07-01",
      notes: "$150M convertible note",
    },
    {
      type: "convertible",
      strikePrice: 2.39,
      potentialShares: 15_062_761,
      faceValue: 36_000_000,
      source: "8-K Jan 2026",
      sourceUrl:
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001775194&type=8-K",
      expiration: "2031-01-15",
      notes: "$36M convertible note",
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
  // Verified 2026-01-26 via SEC 8-K Sep 5, 2025
  // Most warrants already exercised in Q1 FY2026 (164M shares from warrant exercises)
  // Remaining warrants are OUT of the money at ~$0.41 stock price
  ZONE: [
    {
      type: "warrant",
      strikePrice: 1.00,
      potentialShares: 8_750_021,
      source: "8-K Sep 5, 2025",
      sourceUrl:
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001956741&type=8-K",
      expiration: "2030-09-03",
      notes: "Strategic Advisor warrants (Gresham Worldwide LLC) at $1.00 strike",
    },
    {
      type: "warrant",
      strikePrice: 1.33,
      potentialShares: 5_250_013,
      source: "8-K Sep 5, 2025",
      sourceUrl:
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001956741&type=8-K",
      expiration: "2027-09-03",
      notes: "Placement Agent warrants (Maxim Group) at $1.33 strike",
    },
    {
      type: "warrant",
      strikePrice: 1.33,
      potentialShares: 5_250_013,
      source: "8-K Sep 5, 2025",
      sourceUrl:
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001956741&type=8-K",
      expiration: "2030-09-03",
      notes: "Strategic Advisor warrants (Gresham Worldwide LLC) at $1.33 strike",
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
        "https://www.sec.gov/Archives/edgar/data/1050446/000119312520315453/0001193125-20-315453-index.htm",
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

  return {
    basic: basicShares,
    diluted: basicShares + inTheMoneyShares,
    inTheMoneyDebtValue,
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

  return {
    basic: basicShares,
    diluted: basicShares + inTheMoneyShares,
    inTheMoneyDebtValue,
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
