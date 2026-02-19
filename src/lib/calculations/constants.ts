// Model parameters for DAT calculations

/** Baseline risk-free return (US 10-year Treasury proxy) */
export const RISK_FREE_RATE = 0.04; // 4%

/** Equity risk premium over risk-free rate (for excess yield component) */
export const STAKING_SPREAD = 0.06; // 6%

/** Legacy alias for backwards compatibility */
export const EQUITY_RISK_SPREAD = STAKING_SPREAD;

/** Discount rate for capitalizing yield streams */
export const DISCOUNT_RATE = RISK_FREE_RATE + STAKING_SPREAD; // 10%

/** Divisor for calculating burn drag penalty (symmetric with discount rate) */
export const BURN_DRAG_DIVISOR = 0.1; // 10%

/** Optionality multiplier for yielding assets (50% of non-yielding) */
export const YIELDING_OPTIONALITY_FACTOR = 0.5;

/** Maximum leverage multiplier cap */
export const MAX_LEVERAGE_MULTIPLIER = 2.0;

/** Verdict thresholds (±15% band around fair value) */
export const VERDICT_THRESHOLD = 0.15; // 15%

// ============================================================================
// ADVANCED MODEL PARAMETERS
// ============================================================================

/** Risk spread for leverage returns - YIELDING ASSETS */
export const LEVERAGE_SPREAD = 0.21; // 21% - higher discount, leverage is supplementary

/** Risk spread for leverage returns - NON-YIELDING ASSETS (BTC credit company thesis) */
export const LEVERAGE_SPREAD_NON_YIELDING = 0.15; // 15% - lower discount, leverage IS the thesis

/** Assumed financing cost for converts/debt */
export const FINANCING_COST = 0.05; // 5%

/** Default expected asset return - YIELDING ASSETS */
export const DEFAULT_EXPECTED_RETURN = 0.15; // 15%

/** Default expected asset return - NON-YIELDING ASSETS (BTC bulls are more aggressive) */
export const DEFAULT_EXPECTED_RETURN_NON_YIELDING = 0.2; // 20%

// Vol Harvesting Parameters - YIELDING ASSETS (ETH, SOL, etc.)
/** Base rate for vol harvesting from ATM issuance at premium */
export const VOL_HARVEST_BASE_RATE = 0.15; // 15%

/** Cap on premium factor for vol harvesting */
export const VOL_HARVEST_PREMIUM_CAP = 1.0; // 1.0x max mNAV factor

/** Optionality rate (scales with liquidity squared) */
export const VOL_HARVEST_OPTIONALITY_RATE = 0.05; // 5%

/** Floor rate for deep liquidity premium */
export const VOL_HARVEST_LIQUIDITY_FLOOR = 0.1; // 10%

// Vol Harvesting Parameters - NON-YIELDING ASSETS (BTC, DOGE, etc.)
/** Base rate for non-yielding - higher since it's the core value proposition */
export const VOL_HARVEST_BASE_RATE_NON_YIELDING = 0.2; // 20%

/** Premium cap for non-yielding - higher to capture MSTR-style premium monetization */
export const VOL_HARVEST_PREMIUM_CAP_NON_YIELDING = 1.5; // 1.5x max mNAV factor

/** Optionality rate for non-yielding - higher since this IS the value */
export const VOL_HARVEST_OPTIONALITY_RATE_NON_YIELDING = 0.08; // 8%

/** Floor rate for non-yielding - higher baseline for liquidity value */
export const VOL_HARVEST_LIQUIDITY_FLOOR_NON_YIELDING = 0.15; // 15%

// Liquidity Score Reference
/** BMNR daily volume as benchmark for 100% volume score */
export const BMNR_BENCHMARK_VOLUME = 800_000_000; // $800M/day

// ============================================================================
// ASSET-SPECIFIC PARAMETERS
// ============================================================================

// Network staking APYs by asset
export const NETWORK_STAKING_APY: Record<string, number> = {
  ETH: 0.028,
  BTC: 0,
  SOL: 0.07,
  HYPE: 0,
  BNB: 0.02,
  TAO: 0.1,
  LINK: 0.05,
  TRX: 0.045,
  XRP: 0,
  ZEC: 0,
  LTC: 0,
  SUI: 0.022,
  DOGE: 0,
  AVAX: 0.08,
  ADA: 0.045,
  HBAR: 0.065,
};

// Non-yielding assets - fair value driven by optionality/leverage, not yield
export const NON_YIELDING_ASSETS = ["BTC", "HYPE", "XRP", "ZEC", "LTC", "DOGE"];

// Base optionality premium for all assets (legacy - now calculated via vol harvesting)
export const BASE_OPTIONALITY_PREMIUM: Record<string, number> = {
  BTC: 0.25,
  HYPE: 0.15,
  XRP: 0.1,
  ZEC: 0.1,
  LTC: 0.1,
  DOGE: 0.15,
  ETH: 0.2,
  SOL: 0.2,
  BNB: 0.12,
  TAO: 0.18,
  LINK: 0.12,
  TRX: 0.08,
  SUI: 0.15,
  AVAX: 0.15,
  ADA: 0.1,
  HBAR: 0.1,
};
