// Asset types
export type Asset =
  | "ETH" | "BTC" | "SOL" | "HYPE" | "BNB" | "TAO" | "LINK"
  | "TRX" | "XRP" | "ZEC" | "LTC" | "SUI" | "DOGE" | "AVAX" | "ADA" | "HBAR";

// Company tier (1 = highest conviction, 3 = speculative)
export type Tier = 1 | 2 | 3;

// Holdings data source
export type HoldingsSource =
  | "8-K filing"
  | "press release"
  | "company website"
  | "bitcointreasuries.net"
  | "manual"
  | "api";

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

  // Leverage/optionality (for non-yielding assets)
  leverageRatio?: number; // > 1 means company uses debt/converts to amplify exposure

  // Holdings tracking
  holdingsLastUpdated?: string; // ISO date when holdings were last verified
  holdingsSource?: HoldingsSource; // Where the holdings data came from
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
