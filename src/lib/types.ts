// Asset types
export type Asset =
  | "ETH" | "BTC" | "SOL" | "HYPE" | "BNB" | "TAO" | "LINK"
  | "TRX" | "XRP" | "ZEC" | "LTC" | "SUI" | "DOGE" | "AVAX" | "ADA" | "HBAR"
  | "MULTI";  // Multi-asset treasury (holds multiple crypto assets)

// Company tier (1 = highest conviction, 3 = speculative)
export type Tier = 1 | 2 | 3;

// Holdings data source - ordered by trust level
export type HoldingsSource =
  | "on-chain"           // Verified via blockchain (highest trust)
  | "sec-filing"         // SEC 8-K, 10-Q, 10-K (legal documents)
  | "regulatory-filing"  // Non-US regulatory filings
  | "press-release"      // Official company announcement
  | "company-website"    // IR page or official site
  | "company-dashboard"  // Official company dashboard/tracker (real-time)
  | "company-reported"   // Company-reported data (not SEC-verified)
  | "aggregator"         // bitbo.io, bitcointreasuries.net, etc.
  | "interpolated"       // Interpolated between verified data points (chart smoothing)
  | "manual";            // Manual entry (needs verification)

// Data warning types for tracking pending filings/events
export type DataWarningType =
  | "equity-sale"        // 8-K Item 3.02 - unregistered equity sale
  | "share-change"       // Potential share count change (ATM, conversion, etc.)
  | "debt-change"        // Potential debt change
  | "stale-data"         // Data may be outdated
  | "unverified-shares"; // Share counts from non-primary source (e.g., dashboard vs regulatory filing)

// SEC filing type - US domestic vs Foreign Private Issuer
export type FilingType =
  | "US"    // Files 10-Q, 10-K, 8-K - quarterly XBRL data
  | "FPI";  // Foreign Private Issuer - files 20-F, 6-K - annual/semi-annual, limited XBRL

// Data verification flags for fields that need manual review
export type DataFlag =
  | "shares_unverified"     // Share count from non-XBRL source (Yahoo, manual)
  | "shares_xbrl_stale"     // XBRL share count outdated (FPIs often have this)
  | "debt_unverified"       // Debt from narrative disclosure, not XBRL
  | "cash_unverified"       // Cash figure needs verification
  | "holdings_estimated";   // Holdings calculated from fair value, not unit count

export interface DataWarning {
  type: DataWarningType;
  message: string;        // Short description shown in UI
  filingDate?: string;    // Date of SEC filing or event
  filingUrl?: string;     // Link to SEC filing
  severity: "info" | "warning";  // info = FYI, warning = may affect mNAV
}

// Company type
export type CompanyType = "Treasury" | "Miner";

// Stock currency (for non-USD exchanges)
export type StockCurrency = "USD" | "JPY" | "HKD" | "SEK" | "CAD" | "EUR" | "BRL" | "GBP" | "NOK" | "KRW" | "AED" | "AUD";

// Base company interface
export interface Company {
  id: string;
  name: string;
  ticker: string;
  currency?: StockCurrency;  // Stock trading currency (default: USD). Used for price display conversion.
  asset: Asset;
  tier: Tier;
  holdings: number;
  datStartDate: string;

  // Company info (CMC-style) - all optional for backwards compatibility
  website?: string;
  twitter?: string;
  investorRelationsUrl?: string;
  tokenizedAddress?: string; // On-chain tokenized stock (e.g., Solana)
  tokenizedChain?: string; // Which chain the token is on
  logoUrl?: string;
  
  // Regulatory identifiers (Canadian)
  sedarProfile?: string;    // SEDAR+ profile number (Canadian companies)
  cusip?: string;           // CUSIP identifier
  isin?: string;            // International Securities Identification Number

  // Financials
  costBasisAvg?: number;
  costBasisSource?: string;
  costBasisSourceUrl?: string;
  costBasisAsOf?: string;  // ISO date the cost basis is calculated from
  stakingPct?: number;
  stakingApy?: number;
  stakingMethod?: string;
  stakingSource?: string;      // Source for staking percentage (SEC filing, PR, etc.)
  stakingSourceUrl?: string;   // URL to source document for staking data
  stakingAsOf?: string;        // ISO date of staking data
  stakingVerified?: boolean;   // Whether staking data has been verified against a primary source
  stakingLastAudited?: string; // ISO date of last audit
  quarterlyBurnUsd?: number;
  burnSource?: string;
  burnSourceUrl?: string;
  burnAsOf?: string;  // ISO date of the period the burn is calculated from
  burnEstimated?: boolean;  // True if burn figure is estimated/unverified
  burnMethodology?: string;  // Explanation of how burn was calculated, with source links
  capitalRaisedAtm?: number;
  capitalRaisedAtmSource?: string;
  capitalRaisedAtmSourceUrl?: string;
  capitalRaisedPipe?: number;
  capitalRaisedPipeSource?: string;
  capitalRaisedPipeSourceUrl?: string;
  capitalRaisedConverts?: number;
  capitalRaisedConvertsSource?: string;
  capitalRaisedConvertsSourceUrl?: string;
  avgIssuancePremium?: number;
  avgDailyVolume?: number;
  hasOptions?: boolean;
  optionsOi?: number;
  atmRemaining?: number;
  marketCap?: number;  // Legacy static value - prefer sharesOutstandingFD × price
  sharesOutstandingFD?: number;  // Fully diluted shares (includes converts, warrants, options)
  sharesForMnav?: number;  // Share count for mNAV calculation (matches company's methodology)
  leader?: string;
  strategy?: string;
  strategyVideo?: string;  // YouTube or other video explaining strategy
  strategyDocs?: Array<{ title: string; date: string; url: string }>;  // Key strategy documents
  notes?: string;
  description?: string;  // Longer company overview/history
  founded?: number;      // Year founded
  headquarters?: string; // City, Country
  ceo?: string;          // Current CEO name

  // BTC-specific
  isMiner?: boolean;
  btcMinedAnnual?: number;
  btcMinedSource?: string;
  btcMinedSourceUrl?: string;
  btcMinedAsOf?: string;
  btcMinedEstimated?: boolean;
  btcAcquired2025?: number;

  // Non-crypto assets (for full NAV calculation)
  cashReserves?: number;        // USD cash on balance sheet
  restrictedCash?: number;      // Cash that can't be freely used (encumbered by debt, covenants, etc.)
  otherInvestments?: number;    // Equity stakes, other non-crypto assets (USD value)

  // Debt (for EV-based mNAV calculation)
  // EV = Market Cap + totalDebt + preferredEquity - freeCash
  // where freeCash = cashReserves - restrictedCash
  totalDebt?: number;           // Total debt outstanding (converts, bonds, credit facilities)
  debtInterestAnnual?: number;  // Annual interest payments on debt (USD)
  preferredEquity?: number;     // Preferred stock notional value (MSTR-style STRK/STRF)
  preferredDividendAnnual?: number; // Annual preferred dividend obligation (USD)
  
  // Cash obligations (combined annual obligation for preferred dividends + debt interest)
  cashObligationsAnnual?: number; // Total annual cash obligations (dividends + interest)
  cashObligationsSource?: string;
  cashObligationsSourceUrl?: string;
  cashObligationsAsOf?: string;

  // Leverage/optionality (for non-yielding assets)
  leverageRatio?: number; // > 1 means company uses debt/converts to amplify exposure

  // Holdings tracking
  holdingsLastUpdated?: string; // ISO date when holdings were last verified
  holdingsSource?: HoldingsSource; // Where the holdings data came from
  holdingsSourceUrl?: string; // Direct link to the source (SEC filing, press release, etc.)
  secReferenced?: boolean; // True if non-SEC source is referenced in SEC filings (legal accountability)
  
  // Provenance tracking (detailed audit trail)
  holdingsAccession?: string;     // SEC accession number for holdings source
  holdingsNative?: number;        // Native asset holdings (for multi-form treasuries like ETH+LsETH)
  holdingsLsETH?: number;         // Lido staked ETH as-if-redeemed (SBET specific)
  holdingsStaked?: number;        // Staked portion of holdings (generic)
  stakingRewardsCumulative?: number; // Total staking rewards earned since DAT start
  provenanceFile?: string;        // Path to detailed provenance file (e.g., "provenance/sbet.ts")
  lastVerified?: string;          // ISO date of last data verification audit
  nextExpectedFiling?: string;    // Description of next expected SEC filing

  // Shares tracking (for mNAV calculation transparency)
  sharesAsOf?: string; // ISO date of share count
  sharesSource?: string; // e.g., "Q3 2025 10-Q", "mNAV.com", "strategy.com"
  sharesSourceUrl?: string; // Link to SEC filing or dashboard

  // Debt tracking
  debtAsOf?: string; // ISO date of debt data
  debtSource?: string; // e.g., "Q3 2025 10-Q", "strategy.com"
  debtSourceUrl?: string;

  // Cash tracking
  cashAsOf?: string; // ISO date of cash data
  cashSource?: string;
  cashSourceUrl?: string;

  // Preferred equity tracking
  preferredAsOf?: string;
  preferredSource?: string;
  preferredSourceUrl?: string;

  // Verification sources
  secCik?: string;              // SEC CIK number for EDGAR lookups (US companies)
  walletAddresses?: string[];   // Known wallet addresses for on-chain verification

  // Pending merger status (for SPACs that haven't closed yet)
  pendingMerger?: boolean;        // True if this is a pre-merger SPAC
  expectedHoldings?: number;      // Expected holdings after merger closes
  mergerExpectedClose?: string;   // Expected merger close date (ISO date)

  // Trading status flags
  lowLiquidity?: boolean;         // True for thinly traded OTC/international stocks

  // Data source flags
  hasLiveBalanceSheet?: boolean;  // True if balance sheet data comes from live mNAV.com API

  // Official mNAV from source (e.g., SharpLink's FD mNAV)
  // When set, use this instead of calculating mNAV
  officialMnav?: number;

  // Data warnings for pending filings/events that may affect accuracy
  dataWarnings?: DataWarning[];

  // Filing type for SEC data handling
  filingType?: FilingType;  // "US" (10-Q/10-K) or "FPI" (20-F/6-K)

  // Data verification flags - fields that need manual review
  dataFlags?: DataFlag[];

  // Secondary crypto holdings (for multi-asset treasury companies)
  // These are added to Crypto NAV in mNAV calculation
  secondaryCryptoHoldings?: SecondaryCryptoHolding[];

  // Indirect crypto exposure (funds, ETFs, equity in crypto companies)
  // Fair value is added to Crypto NAV, but displayed separately in UI
  cryptoInvestments?: CryptoInvestment[];
}

// Secondary crypto holding for multi-asset treasury companies
export interface SecondaryCryptoHolding {
  asset: Asset;
  amount: number;
  note?: string; // e.g., "passive hold from convertible deal"
}

// Indirect crypto exposure via funds, ETFs, or liquid staking tokens
// Used when company owns crypto through a fund/ETF rather than direct custody,
// or holds liquid staking tokens (LSTs) that represent staked crypto
export interface CryptoInvestment {
  name: string;                  // e.g., "Dialectic ETH Fund", "Grayscale ETHE", "stHYPE"
  type: "fund" | "equity" | "etf" | "lst"; // lst = liquid staking token (stHYPE, stETH, jitoSOL, etc.)
  underlyingAsset: Asset;        // What crypto the investment tracks
  fairValue: number;             // USD fair value from balance sheet
  sourceDate: string;            // ISO date of the fair value (e.g., SEC filing date)
  source?: string;               // e.g., "SEC 10-Q Q3 2025"
  sourceUrl?: string;            // Link to filing
  note?: string;                 // Additional context

  // LST-specific fields (only for type: "lst")
  lstConfigId?: string;          // Reference to LST config ID (e.g., "khype", "ihype") for dynamic rate lookup
  lstAmount?: number;            // Actual LST tokens held (e.g., 753,000 stHYPE)
  exchangeRate?: number;         // Static fallback: LST to underlying ratio (used if dynamic rate unavailable)
  underlyingAmount?: number;     // Static fallback: Amount of underlying asset (used if dynamic rate unavailable)
}

// Source metadata for mNAV component transparency
export interface SourceMetadata {
  value: number;
  source: string; // e.g., "mNAV.com", "strategy.com", "Q3 2025 10-Q"
  sourceUrl?: string; // Link to verify
  asOf: string; // ISO date
}

// mNAV calculation with full source attribution
export interface MnavCalculation {
  mnav: number;
  components: {
    holdings: SourceMetadata;
    shares: SourceMetadata;
    marketCap: SourceMetadata & { calculated?: boolean }; // calculated = shares × price
    debt?: SourceMetadata;
    cash?: SourceMetadata;
    preferred?: SourceMetadata;
    cryptoPrice: SourceMetadata;
    stockPrice: SourceMetadata;
  };
  enterpriseValue: number;
  cryptoNav: number;
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
export type EarningsSource = "sec-filing" | "regulatory-filing" | "press-release" | "investor-presentation" | "company-dashboard" | "estimated" | "manual";

export interface EarningsRecord {
  ticker: string;
  fiscalYear: number;
  fiscalQuarter: 1 | 2 | 3 | 4;
  // Calendar quarter normalization - all companies mapped to calendar year basis
  // Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec
  calendarYear: number;
  calendarQuarter: 1 | 2 | 3 | 4;
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
  earningsCallUrl?: string;           // Link to earnings call webcast/registration
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
  earningsCallUrl?: string;           // Link to earnings call webcast/registration
}

export type YieldPeriod = "1W" | "1M" | "3M" | "1Y";

// Calendar quarter format: "Q1-2025", "Q2-2025", etc.
export type CalendarQuarter = `Q${1 | 2 | 3 | 4}-${number}`;

export interface TreasuryYieldMetrics {
  ticker: string;
  companyName: string;
  asset: Asset;
  period: YieldPeriod | CalendarQuarter;
  holdingsPerShareStart: number;
  holdingsPerShareEnd: number;
  growthPct: number;
  annualizedGrowthPct?: number;  // Only populated with 12+ months of data
  rank?: number;
  // Data freshness
  startDate: string;
  endDate: string;
  daysCovered: number;
}
