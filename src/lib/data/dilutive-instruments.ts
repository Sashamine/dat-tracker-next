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
  source: string; // e.g., "8-K Jul 2025", "10-Q Q3 2025"
  sourceUrl: string; // Link to SEC filing or primary source
  expiration?: string; // ISO date when instrument expires (optional)
  notes?: string; // Additional context, e.g., "$150M convertible note"
}

export interface EffectiveSharesResult {
  basic: number;
  diluted: number;
  breakdown: InstrumentBreakdown[];
}

export interface InstrumentBreakdown {
  type: InstrumentType;
  strikePrice: number;
  potentialShares: number;
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
  // BTCS Inc - ETH treasury company
  // Verified 2026-01-25 during company verification process
  BTCS: [
    {
      type: "convertible",
      strikePrice: 5.85,
      potentialShares: 1_709_402,
      source: "8-K Jul 2024",
      sourceUrl:
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001436229&type=8-K",
      expiration: "2029-07-15",
      notes: "$10M convertible note",
    },
    {
      type: "convertible",
      strikePrice: 13.0,
      potentialShares: 769_231,
      source: "8-K Dec 2024",
      sourceUrl:
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001436229&type=8-K",
      expiration: "2029-12-15",
      notes: "$10M convertible note",
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
      source: "8-K Jan 2026",
      sourceUrl:
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001775194&type=8-K",
      expiration: "2031-01-15",
      notes: "$36M convertible note",
    },
  ],

  // Capital B (ALTBG) - France BTC treasury (The Blockchain Group)
  // Trades on Euronext Paris in EUR. Strike prices converted to USD at ~1.04 EUR/USD.
  // Source: AMF filings via Euronext press releases
  // Verified 2026-01-25
  ALTBG: [
    {
      type: "convertible",
      strikePrice: 0.74, // €0.707 × 1.04
      potentialShares: 82_451_903, // 78,166,612 (Fulgur) + 4,285,291 (UTXO)
      source: "AMF May 2025 (OCA B-02)",
      sourceUrl:
        "https://live.euronext.com/en/products/equities/company-news/2025-05-26-blockchain-group-announces-convertible-bond-issuance-eur",
      expiration: "2030-05-26",
      notes: "OCA B-02: Fulgur Ventures (€55.3M) + UTXO Management (€3M). Conversion at €0.707/share.",
    },
    {
      type: "convertible",
      strikePrice: 3.96, // €3.809 × 1.04
      potentialShares: 1_312_680,
      source: "AMF May 2025 (OCA B-03 T1)",
      sourceUrl:
        "https://live.euronext.com/en/products/equities/company-news/2025-05-26-blockchain-group-announces-convertible-bond-issuance-eur",
      expiration: "2030-05-25",
      notes: "OCA B-03 Tranche 1: Moonlight Capital (€5M). Conversion at €3.809/share.",
    },
    {
      type: "convertible",
      strikePrice: 5.15, // €4.9517 × 1.04
      potentialShares: 1_514_631,
      source: "AMF May 2025 (OCA B-03 T2)",
      sourceUrl:
        "https://live.euronext.com/en/products/equities/company-news/2025-05-26-blockchain-group-announces-convertible-bond-issuance-eur",
      expiration: "2030-05-25",
      notes: "OCA B-03 Tranche 2: Optional (€7.5M). Conversion at €4.9517/share.",
    },
    {
      type: "convertible",
      strikePrice: 6.49, // €6.24 × 1.04
      potentialShares: 961_538,
      source: "AMF Jun 2025 (OCA A-03)",
      sourceUrl:
        "https://live.euronext.com/en/products/equities/company-news/2025-06-12-blockchain-group-announces-equity-and-convertible-bond",
      expiration: "2030-06-10",
      notes: "OCA A-03: TOBAM (€6M). Conversion at €6.24/share.",
    },
    {
      type: "convertible",
      strikePrice: 5.38, // €5.174 × 1.04
      potentialShares: 966_370,
      source: "AMF Jul 2025 (OCA A-04)",
      sourceUrl:
        "https://www.finanzwire.com/press-release/capital-b-capital-increase-and-convertible-bonds-issuance-for-eur115-million-with-tobam-bitcoin-alpha-fund-to-pursue-its-bitcoin-treasury-company-strategy-0WAE500EF0o",
      expiration: "2030-07-01",
      notes: "OCA A-04: TOBAM (€5M). Conversion at €5.174/share.",
    },
    {
      type: "convertible",
      strikePrice: 5.38, // €5.174 × 1.04
      potentialShares: 975_071,
      source: "AMF Jul 2025 (OCA B-04)",
      sourceUrl:
        "https://www.finanzwire.com/press-release/capital-b-capital-increase-and-convertible-bonds-issuance-for-eur115-million-with-tobam-bitcoin-alpha-fund-to-pursue-its-bitcoin-treasury-company-strategy-0WAE500EF0o",
      expiration: "2030-07-01",
      notes: "OCA B-04: Adam Back (€5M). Conversion at €5.174/share.",
    },
    {
      type: "convertible",
      strikePrice: 3.80, // €3.6557 × 1.04
      potentialShares: 1_778_045,
      source: "AMF Aug 2025 (OCA A-05 T1)",
      sourceUrl:
        "https://www.finanzwire.com/press-release/capital-b-capital-increase-and-convertible-bonds-issuance-for-eur115-million-with-tobam-bitcoin-alpha-fund-to-pursue-its-bitcoin-treasury-company-strategy-0WAE500EF0o",
      expiration: "2030-08-01",
      notes: "OCA A-05 Tranche 1: TOBAM (€6.5M). Conversion at €3.6557/share.",
    },
  ],
};

/**
 * Calculate effective diluted shares based on current stock price.
 *
 * @param ticker - Company ticker symbol
 * @param basicShares - Basic shares outstanding
 * @param stockPrice - Current stock price in USD
 * @returns Effective shares result with breakdown
 */
export function getEffectiveShares(
  ticker: string,
  basicShares: number,
  stockPrice: number
): EffectiveSharesResult {
  const instruments = dilutiveInstruments[ticker] || [];

  const breakdown: InstrumentBreakdown[] = instruments.map((inst) => ({
    type: inst.type,
    strikePrice: inst.strikePrice,
    potentialShares: inst.potentialShares,
    inTheMoney: stockPrice > inst.strikePrice,
    source: inst.source,
    notes: inst.notes,
  }));

  const inTheMoneyShares = breakdown
    .filter((b) => b.inTheMoney)
    .reduce((sum, b) => sum + b.potentialShares, 0);

  return {
    basic: basicShares,
    diluted: basicShares + inTheMoneyShares,
    breakdown,
  };
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
