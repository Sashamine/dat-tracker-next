// Asset types
export type Asset =
  | "ETH" | "BTC" | "SOL" | "HYPE" | "BNB" | "TAO" | "LINK"
  | "TRX" | "XRP" | "ZEC" | "LTC" | "SUI" | "DOGE" | "AVAX" | "ADA" | "HBAR";

// Company tier (1 = highest conviction, 3 = speculative)
export type Tier = 1 | 2 | 3;

// Holdings data source - ordered by trust level
export type HoldingsSource =
  | "on-chain"           // Verified via blockchain (highest trust)
  | "sec-filing"         // SEC 8-K, 10-Q, 10-K (legal documents)
  | "regulatory-filing"  // Non-US regulatory filings
  | "press-release"      // Official company announcement
  | "company-website"    // IR page or official site
  | "aggregator"         // CoinGecko, bitbo.io, etc.
  | "manual";            // Manual entry (needs verification)

// Company type
export type CompanyType = "Treasury" | "Miner";

// Base company interface
export interface Company {
  id: string;
  name: string;
  ticker: string;
  asset: Asset;
  tier: Tier;
  holdings: number;
  datStartDate: string;

  // Company info (CMC-style) - all optional for backwards compatibility
  website?: string;
  twitter?: string;
  tokenizedAddress?: string; // On-chain tokenized stock (e.g., Solana)
  tokenizedChain?: string; // Which chain the token is on
  logoUrl?: string;

  // Financials
  costBasisAvg?: number;
  stakingPct?: number;
  stakingApy?: number;
  stakingMethod?: string;
  quarterlyBurnUsd?: number;
  burnSource?: string;
  capitalRaisedAtm?: number;
  capitalRaisedPipe?: number;
  capitalRaisedConverts?: number;
  avgIssuancePremium?: number;
  avgDailyVolume?: number;
  hasOptions?: boolean;
  optionsOi?: number;
  atmRemaining?: number;
  marketCap?: number;
  leader?: string;
  strategy?: string;
  notes?: string;

  // BTC-specific
  isMiner?: boolean;
  btcMinedAnnual?: number;
  btcAcquired2025?: number;

  // Non-crypto assets (for full NAV calculation)
  cashReserves?: number;        // USD cash on balance sheet
  otherInvestments?: number;    // Equity stakes, other non-crypto assets (USD value)

  // Leverage/optionality (for non-yielding assets)
  leverageRatio?: number; // > 1 means company uses debt/converts to amplify exposure

  // Holdings tracking
  holdingsLastUpdated?: string; // ISO date when holdings were last verified
  holdingsSource?: HoldingsSource; // Where the holdings data came from
  holdingsSourceUrl?: string; // Direct link to the source (SEC filing, press release, etc.)

  // Verification sources
  secCik?: string;              // SEC CIK number for EDGAR lookups (US companies)
  walletAddresses?: string[];   // Known wallet addresses for on-chain verification

  // Pending merger status (for SPACs that haven't closed yet)
  pendingMerger?: boolean;        // True if this is a pre-merger SPAC
  expectedHoldings?: number;      // Expected holdings after merger closes
  mergerExpectedClose?: string;   // Expected merger close date (ISO date)
}

// Live price data
export interface PriceData {
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  lastUpdated: string;
}

// Stock data
export interface StockData {
  price: number;
  change24h: number;
  volume: number;
  marketCap: number;
  sharesOutstanding: number;
  peRatio?: number;
}

// Computed metrics for display
export interface CompanyMetrics {
  company: Company;
  stockPrice?: number;
  stockChange24h?: number;
  cryptoPrice?: number;
  cryptoChange24h?: number;
  nav?: number;
  navPerShare?: number;
  navDiscount?: number;
  mNav?: number;
  holdingsValue?: number;
}

// Earnings data types
export type EarningsTime = "BMO" | "AMC" | "TNS" | null; // Before Market Open, After Market Close, Time Not Specified
export type EarningsStatus = "upcoming" | "confirmed" | "reported";
export type EarningsSource = "sec-filing" | "press-release" | "investor-presentation" | "manual";

export interface EarningsRecord {
  ticker: string;
  fiscalYear: number;
  fiscalQuarter: 1 | 2 | 3 | 4;
  earningsDate: string;                    // ISO date
  earningsTime: EarningsTime;

  // Financials (USD)
  epsActual?: number;
  epsEstimate?: number;
  revenueActual?: number;
  revenueEstimate?: number;
  netIncome?: number;

  // Treasury snapshot at quarter end
  holdingsAtQuarterEnd?: number;
  sharesAtQuarterEnd?: number;
  holdingsPerShare?: number;

  // Metadata
  source: EarningsSource;
  sourceUrl?: string;
  status: EarningsStatus;
}

export interface EarningsCalendarEntry {
  ticker: string;
  companyName: string;
  asset: Asset;
  earningsDate: string;
  earningsTime: EarningsTime;
  status: EarningsStatus;
  daysUntil: number;                  // Negative if past
  epsSurprisePct?: number;            // (actual - estimate) / |estimate| * 100
  holdingsPerShareGrowth?: number;    // QoQ treasury yield %
}

export interface TreasuryYieldMetrics {
  ticker: string;
  companyName: string;
  asset: Asset;
  period: "QoQ" | "YTD" | "1Y";
  holdingsPerShareStart: number;
  holdingsPerShareEnd: number;
  growthPct: number;
  annualizedGrowthPct: number;
  rank?: number;
}
