/**
 * DAT Fair Value Model (v2)
 * =========================
 *
 * This module calculates fair value premiums for Digital Asset Treasury (DAT) companies.
 *
 *
 * MODEL VARIABLES
 * ---------------
 *
 * 1. RISK-FREE RATE (riskFreeRate): 4%
 *    - Baseline return available with zero risk
 *    - Based on US 10-year Treasury yield
 *    - Used as foundation for discount rate
 *
 * 2. EQUITY RISK SPREAD (spread): 6%
 *    - Additional return required for holding DAT equity vs. direct asset exposure
 *    - Compensates for: management risk, dilution risk, regulatory risk, counterparty risk
 *    - Range: 4-8% typical for equity; 6% is moderate assumption
 *
 * 3. DISCOUNT RATE: 10% (riskFreeRate + spread)
 *    - Used to capitalize excess yield streams into premium
 *    - 2% excess yield / 10% discount = 0.20x premium contribution
 *    - Higher discount rate = more conservative valuations
 *
 * 4. BURN DRAG DIVISOR: 10%
 *    - Penalizes companies that dilute treasury through cash burn
 *    - 10% annual burn rate = 1.0x penalty to fair value
 *    - Symmetric with discount rate (same "cost of capital" logic)
 *
 * 5. OPTIONALITY PREMIUM (by asset)
 *    - Value of: institutional access, leverage potential, volatility harvesting
 *    - Non-yielding assets: applied at 100%
 *    - Yielding assets: applied at 50% (yield already provides value)
 *    - See BASE_OPTIONALITY_PREMIUM for per-asset values
 *
 * 6. LEVERAGE MULTIPLIER
 *    - Amplifies optionality for companies using debt/converts
 *    - Range: 1.0x (no leverage) to 2.0x cap
 *    - Example: MSTR at 1.5x leverage gets 1.5x optionality premium
 *
 *
 * FAIR VALUE FORMULAS
 * -------------------
 *
 * NON-YIELDING ASSETS (BTC, DOGE, LTC, etc.):
 *   Fair Value = 1.0 + (optionalityPremium × leverageMultiplier) - burnDrag
 *
 *   Where:
 *   - optionalityPremium = BASE_OPTIONALITY_PREMIUM[asset]
 *   - burnDrag = |negative netYield| / 0.10
 *
 * YIELDING ASSETS (ETH, SOL, etc.):
 *   Fair Value = 1.0 + (excessYield / discountRate) + (optionalityPremium × 0.5)
 *
 *   Where:
 *   - excessYield = netYield - networkStakingAPY
 *   - netYield = stakingYield - burnRate
 *   - optionalityPremium applied at 50% since yield already provides value
 *
 *
 * VERDICT THRESHOLDS
 * ------------------
 * - Cheap:     mNAV < fairValue × 0.85 (>15% discount)
 * - Fair:      mNAV within ±15% of fairValue
 * - Expensive: mNAV > fairValue × 1.15 (>15% premium)
 */

// Calculate Net Asset Value (treasury value)
// Includes crypto holdings + cash reserves + other investments
export function calculateNAV(
  holdings: number,
  assetPrice: number,
  cashReserves: number = 0,
  otherInvestments: number = 0
): number {
  return (holdings * assetPrice) + cashReserves + otherInvestments;
}

// Calculate NAV per share (equity value per share, net of liabilities)
// This should be consistent with mNAV: if mNAV > 1, stock trades above NAV per share
export function calculateNAVPerShare(
  holdings: number,
  assetPrice: number,
  sharesOutstanding: number,
  cashReserves: number = 0,
  otherInvestments: number = 0,
  totalDebt: number = 0,
  preferredEquity: number = 0
): number | null {
  if (!sharesOutstanding || sharesOutstanding <= 0) return null;
  const grossNav = calculateNAV(holdings, assetPrice, cashReserves, otherInvestments);
  const equityNav = grossNav - totalDebt - preferredEquity;
  return equityNav / sharesOutstanding;
}

/** Threshold for including otherInvestments in NAV (5% of crypto NAV) */
export const OTHER_INVESTMENTS_MATERIALITY_THRESHOLD = 0.05;

// Calculate mNAV (Enterprise Value / NAV) - key valuation metric
// Industry standard: EV = Market Cap + Debt + Preferred - Free Cash
// Free Cash = Cash Reserves - Restricted Cash (only subtract unencumbered cash)
// NAV = Crypto + Restricted Cash + Other Investments (if material)
// Restricted cash is "pre-crypto" - earmarked for purchases, so included in NAV
//
// MATERIALITY RULE: otherInvestments (non-crypto assets like equity stakes, USDC)
// are included in NAV only when material (>5% of crypto NAV). This prevents
// misleading mNAV for hybrid treasuries while keeping pure-play DATs clean.
export function calculateMNAV(
  marketCap: number,
  holdings: number,
  assetPrice: number,
  cashReserves: number = 0,
  otherInvestments: number = 0,
  totalDebt: number = 0,
  preferredEquity: number = 0,
  restrictedCash: number = 0,
  secondaryCryptoValue: number = 0  // USD value of secondary crypto holdings
): number | null {
  // Base Crypto NAV = primary holdings + secondary crypto holdings
  const baseCryptoNav = (holdings * assetPrice) + secondaryCryptoValue;
  if (!baseCryptoNav || baseCryptoNav <= 0) return null;

  // Include otherInvestments only if material (>5% of crypto NAV)
  // This prevents misleading mNAV for hybrid treasuries while keeping pure-play DATs clean
  const otherInvestmentsMaterial = otherInvestments / baseCryptoNav > OTHER_INVESTMENTS_MATERIALITY_THRESHOLD;
  
  // Total NAV = Crypto + Restricted Cash (pre-crypto) + Other Investments (if material)
  // Restricted cash is earmarked for crypto purchases, so it's effectively "pre-crypto" value
  const totalNav = baseCryptoNav + restrictedCash + (otherInvestmentsMaterial ? otherInvestments : 0);

  // Free Cash = Cash Reserves - Restricted Cash (only subtract unencumbered cash)
  const freeCash = cashReserves - restrictedCash;

  // Enterprise Value = Market Cap + Debt + Preferred Stock - Free Cash
  const enterpriseValue = marketCap + totalDebt + preferredEquity - freeCash;

  return enterpriseValue / totalNav;
}

/** Extended mNAV result with materiality info */
export interface MNAVResult {
  mNAV: number;
  cryptoNav: number;
  totalNav: number;
  enterpriseValue: number;
  otherInvestmentsMaterial: boolean;
  otherInvestmentsRatio: number;  // otherInvestments / cryptoNav
}

// Calculate mNAV with full breakdown (for UI display and debugging)
export function calculateMNAVExtended(
  marketCap: number,
  holdings: number,
  assetPrice: number,
  cashReserves: number = 0,
  otherInvestments: number = 0,
  totalDebt: number = 0,
  preferredEquity: number = 0,
  restrictedCash: number = 0,
  secondaryCryptoValue: number = 0
): MNAVResult | null {
  const baseCryptoNav = (holdings * assetPrice) + secondaryCryptoValue;
  if (!baseCryptoNav || baseCryptoNav <= 0) return null;

  const otherInvestmentsRatio = otherInvestments / baseCryptoNav;
  const otherInvestmentsMaterial = otherInvestmentsRatio > OTHER_INVESTMENTS_MATERIALITY_THRESHOLD;
  
  // Total NAV = Crypto + Restricted Cash (pre-crypto) + Other Investments (if material)
  const totalNav = baseCryptoNav + restrictedCash + (otherInvestmentsMaterial ? otherInvestments : 0);

  const freeCash = cashReserves - restrictedCash;
  const enterpriseValue = marketCap + totalDebt + preferredEquity - freeCash;

  return {
    mNAV: enterpriseValue / totalNav,
    cryptoNav: baseCryptoNav,
    totalNav,
    enterpriseValue,
    otherInvestmentsMaterial,
    otherInvestmentsRatio,
  };
}

// Calculate mNAV 24h change percentage
// Since mNAV = EV / Crypto NAV, and EV = Market Cap + Debt + Preferred - Cash,
// only Market Cap changes with stock price (debt/preferred/cash are constant).
// Formula: mNAV_change = (1 + α × stock_change) / (1 + crypto_change) - 1
// Where α = Market Cap / EV (the fraction of EV that moves with stock price)
export function calculateMNAVChange(
  stockChange24h: number | undefined,
  cryptoChange24h: number | undefined,
  marketCap: number = 0,
  totalDebt: number = 0,
  preferredEquity: number = 0,
  cashReserves: number = 0
): number | null {
  if (stockChange24h === undefined || cryptoChange24h === undefined) return null;

  // Convert percentages to decimals
  const stockChangeDec = stockChange24h / 100;
  const cryptoChangeDec = cryptoChange24h / 100;

  // Calculate EV and the market cap fraction (α)
  const ev = marketCap + totalDebt + preferredEquity - cashReserves;
  const alpha = ev > 0 ? marketCap / ev : 1; // Default to 1 if no EV data (legacy behavior)

  // Avoid division by zero
  if (1 + cryptoChangeDec <= 0) return null;

  // mNAV change: only α portion of EV moves with stock price
  // mNAV_new / mNAV_old = (1 + α × stock_change) / (1 + crypto_change)
  return ((1 + alpha * stockChangeDec) / (1 + cryptoChangeDec) - 1) * 100;
}

// Calculate NAV discount/premium
// Negative = discount (stock below NAV), Positive = premium (stock above NAV)
export function calculateNAVDiscount(
  stockPrice: number,
  navPerShare: number | null
): number | null {
  if (!navPerShare || navPerShare <= 0) return null;
  return (stockPrice - navPerShare) / navPerShare;
}

// Calculate holdings per share
export function calculateHoldingsPerShare(
  holdings: number,
  sharesOutstanding: number
): number | null {
  if (!sharesOutstanding || sharesOutstanding <= 0) return null;
  return holdings / sharesOutstanding;
}

// Calculate annual staking yield
export function calculateStakingYield(
  holdings: number,
  stakingPct: number,
  stakingApy: number,
  assetPrice: number
): { yieldTokens: number; yieldUsd: number } {
  const stakedTokens = holdings * stakingPct;
  const yieldTokens = stakedTokens * stakingApy;
  const yieldUsd = yieldTokens * assetPrice;
  return { yieldTokens, yieldUsd };
}

// Calculate burn rate
export function calculateBurnRate(
  quarterlyBurnUsd: number,
  holdings: number,
  assetPrice: number
): { annualBurnTokens: number; burnRatePct: number } {
  const annualBurnUsd = quarterlyBurnUsd * 4;
  const annualBurnTokens = assetPrice > 0 ? annualBurnUsd / assetPrice : 0;
  const burnRatePct = holdings > 0 ? annualBurnTokens / holdings : 0;
  return { annualBurnTokens, burnRatePct };
}

// Calculate net yield (staking - burn)
export function calculateNetYield(
  holdings: number,
  stakingPct: number,
  stakingApy: number,
  quarterlyBurnUsd: number,
  assetPrice: number
): { netYieldTokens: number; netYieldPct: number } {
  const { yieldTokens } = calculateStakingYield(holdings, stakingPct, stakingApy, assetPrice);
  const { annualBurnTokens } = calculateBurnRate(quarterlyBurnUsd, holdings, assetPrice);
  const netYieldTokens = yieldTokens - annualBurnTokens;
  const netYieldPct = holdings > 0 ? netYieldTokens / holdings : 0;
  return { netYieldTokens, netYieldPct };
}

// ============================================================================
// MODEL PARAMETERS (exported for transparency and UI display)
// ============================================================================

/** Baseline risk-free return (US 10-year Treasury proxy) */
export const RISK_FREE_RATE = 0.04; // 4%

/** Equity risk premium over risk-free rate (for excess yield component) */
export const STAKING_SPREAD = 0.06; // 6%

/** Legacy alias for backwards compatibility */
export const EQUITY_RISK_SPREAD = STAKING_SPREAD;

/** Discount rate for capitalizing yield streams */
export const DISCOUNT_RATE = RISK_FREE_RATE + STAKING_SPREAD; // 10%

/** Divisor for calculating burn drag penalty (symmetric with discount rate) */
export const BURN_DRAG_DIVISOR = 0.10; // 10%

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
export const DEFAULT_EXPECTED_RETURN_NON_YIELDING = 0.20; // 20%

// Vol Harvesting Parameters - YIELDING ASSETS (ETH, SOL, etc.)
// These assets have native yield, so vol harvesting is supplementary value
/** Base rate for vol harvesting from ATM issuance at premium */
export const VOL_HARVEST_BASE_RATE = 0.15; // 15%

/** Cap on premium factor for vol harvesting */
export const VOL_HARVEST_PREMIUM_CAP = 1.0; // 1.0x max mNAV factor

/** Optionality rate (scales with liquidity squared) */
export const VOL_HARVEST_OPTIONALITY_RATE = 0.05; // 5%

/** Floor rate for deep liquidity premium */
export const VOL_HARVEST_LIQUIDITY_FLOOR = 0.10; // 10%

// Vol Harvesting Parameters - NON-YIELDING ASSETS (BTC, DOGE, etc.)
// These assets have no native yield, so vol harvesting is PRIMARY value driver
// Higher rates to reflect that optionality/liquidity is the main thesis
/** Base rate for non-yielding - higher since it's the core value proposition */
export const VOL_HARVEST_BASE_RATE_NON_YIELDING = 0.20; // 20%

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
  TAO: 0.10,
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
// Represents value of: leverage access, volatility harvesting, institutional wrapper
// For yielding assets, this is applied at 50% (since yield already provides value)
export const BASE_OPTIONALITY_PREMIUM: Record<string, number> = {
  // Non-yielding (full optionality premium)
  BTC: 0.25,   // High liquidity, proven model (MSTR), strong vol harvesting
  HYPE: 0.15,  // Newer, less proven
  XRP: 0.10,   // Regulatory uncertainty, lower vol
  ZEC: 0.10,   // Privacy focus, niche
  LTC: 0.10,   // Lower vol, less institutional interest
  DOGE: 0.15,  // High vol, meme premium
  // Yielding (50% of this applied on top of yield premium)
  ETH: 0.20,   // High liquidity, institutional demand, vol harvesting
  SOL: 0.20,   // High vol, strong ecosystem
  BNB: 0.12,   // Exchange token, moderate vol
  TAO: 0.18,   // AI narrative, high vol
  LINK: 0.12,  // Oracle leader, moderate vol
  TRX: 0.08,   // Lower vol, less institutional
  SUI: 0.15,   // Newer L1, higher vol
  AVAX: 0.15,  // DeFi ecosystem
  ADA: 0.10,   // Lower vol, established
  HBAR: 0.10,  // Enterprise focus, lower vol
};

// ============================================================================
// LIQUIDITY SCORE CALCULATION
// ============================================================================

export interface LiquidityScoreParams {
  avgDailyVolume?: number;
  hasOptions?: boolean;
  optionsOi?: number;
  indexInclusion?: string[];
}

/**
 * Calculate liquidity score (0-1) based on trading metrics
 * Used to scale vol harvesting value - deeper liquidity = more ability to monetize premium
 *
 * Components:
 * - Volume: 50% weight, normalized to BMNR benchmark ($800M/day)
 * - Options: 30% if deep OI (>50K), 15% if shallow
 * - Index: 20% if included in major indices
 */
export function calculateLiquidityScore(params: LiquidityScoreParams): number {
  const { avgDailyVolume = 0, hasOptions = false, optionsOi = 0, indexInclusion = [] } = params;

  // Volume score: normalized to BMNR benchmark
  const volumeScore = Math.min(avgDailyVolume / BMNR_BENCHMARK_VOLUME, 1.0);

  // Options score: 30% if deep OI, 15% if shallow
  let optionsScore = 0;
  if (hasOptions && optionsOi > 50_000) {
    optionsScore = 0.3;
  } else if (hasOptions) {
    optionsScore = 0.15;
  }

  // Index score: 20% if included in any major index
  const indexScore = indexInclusion.length > 0 ? 0.2 : 0;

  // Combined score (capped at 1.0)
  return Math.min(volumeScore * 0.5 + optionsScore + indexScore, 1.0);
}

// ============================================================================
// VOL HARVESTING CALCULATION
// ============================================================================

export interface VolHarvestParams {
  mNAV: number;
  liquidityScore: number;
  baseVolRate?: number;
  premiumCap?: number;
  optionalityRate?: number;
  liquidityFloorRate?: number;
}

export interface VolHarvestResult {
  premiumComponent: number;
  optionalityComponent: number;
  floorComponent: number;
  total: number;
}

/**
 * Calculate vol harvesting contribution (3 components)
 *
 * 1. Premium Component: Value from current ability to issue at premium
 *    = baseVolRate × liquidityScore × min(mNAV - 1, premiumCap)
 *
 * 2. Optionality Component: Value of deep liquidity even at NAV
 *    = optionalityRate × liquidityScore²
 *
 * 3. Floor Component: Baseline premium for deep liquidity
 *    = liquidityFloorRate × liquidityScore
 */
export function calculateVolHarvesting(params: VolHarvestParams): VolHarvestResult {
  const {
    mNAV,
    liquidityScore,
    baseVolRate = VOL_HARVEST_BASE_RATE,
    premiumCap = VOL_HARVEST_PREMIUM_CAP,
    optionalityRate = VOL_HARVEST_OPTIONALITY_RATE,
    liquidityFloorRate = VOL_HARVEST_LIQUIDITY_FLOOR,
  } = params;

  // Premium component: value from current ability to issue at premium
  const premiumFactor = Math.min(Math.max(mNAV - 1, 0), premiumCap);
  const premiumComponent = baseVolRate * liquidityScore * premiumFactor;

  // Optionality component: value of deep liquidity even at NAV
  // Uses liquidity² to reward depth disproportionately
  const optionalityComponent = optionalityRate * (liquidityScore ** 2);

  // Floor component: baseline premium for deep liquidity (ability to execute)
  const floorComponent = liquidityFloorRate * liquidityScore;

  return {
    premiumComponent,
    optionalityComponent,
    floorComponent,
    total: premiumComponent + optionalityComponent + floorComponent,
  };
}

// ============================================================================
// LEVERAGE RETURNS CALCULATION
// ============================================================================

export interface LeverageParams {
  debtOutstanding: number;  // Total converts/debt in USD
  holdings: number;         // Total holdings in tokens
  assetPrice: number;       // Current asset price
  expectedReturn?: number;  // Expected annual asset return
  financingCost?: number;   // Cost of debt
  riskFreeRate?: number;
  leverageSpread?: number;
}

export interface LeverageResult {
  leverageReturnPct: number;  // % return from leverage
  leverageContribution: number;  // Contribution to fair premium
}

/**
 * Calculate leverage returns contribution
 *
 * Formula: ((E[Asset] - FinancingCost) × Debt) ÷ Holdings ÷ (rf + leverageSpread)
 *
 * When expected asset return exceeds financing cost, leverage adds value.
 * Discounted at higher rate (21% spread) due to volatility and risk.
 */
export function calculateLeverageReturns(params: LeverageParams): LeverageResult {
  const {
    debtOutstanding,
    holdings,
    assetPrice,
    expectedReturn = DEFAULT_EXPECTED_RETURN,
    financingCost = FINANCING_COST,
    riskFreeRate = RISK_FREE_RATE,
    leverageSpread = LEVERAGE_SPREAD,
  } = params;

  if (debtOutstanding <= 0 || holdings <= 0 || assetPrice <= 0) {
    return { leverageReturnPct: 0, leverageContribution: 0 };
  }

  // Net return from leverage (expected return - financing cost)
  const leverageReturnPct = expectedReturn - financingCost;

  // Convert to token terms
  const leverageReturnUsd = leverageReturnPct * debtOutstanding;
  const leverageReturnTokens = leverageReturnUsd / assetPrice;
  const leverageYieldRate = leverageReturnTokens / holdings;

  // Discount at appropriate rate
  const leverageDiscount = riskFreeRate + leverageSpread;

  // Positive returns discounted at higher rate, negative at standard rate
  const leverageContribution = leverageYieldRate > 0
    ? leverageYieldRate / leverageDiscount
    : leverageYieldRate / (riskFreeRate + STAKING_SPREAD);

  return { leverageReturnPct, leverageContribution };
}

// ============================================================================
// EXTENDED FAIR VALUE MODEL
// ============================================================================

export interface FairValueParams {
  // Required
  holdings: number;
  assetPrice: number;
  marketCap: number;
  asset: string;

  // Staking/Yield
  stakingPct?: number;
  companyStakingApy?: number;
  quarterlyBurnUsd?: number;
  networkStakingApy?: number;

  // Leverage
  capitalRaisedConverts?: number;  // Debt/converts outstanding

  // Liquidity (for vol harvesting)
  avgDailyVolume?: number;
  hasOptions?: boolean;
  optionsOi?: number;
  indexInclusion?: string[];

  // Model toggles
  includeExcessYield?: boolean;
  includeLeverage?: boolean;
  includeVolHarvest?: boolean;

  // Model parameters (overrides)
  riskFreeRate?: number;
  stakingSpread?: number;
  leverageSpread?: number;
  expectedReturn?: number;
  financingCost?: number;
  baseVolRate?: number;
  premiumCap?: number;
  optionalityRate?: number;
  liquidityFloorRate?: number;
  cheapThreshold?: number;
  expensiveThreshold?: number;
}

export interface FairValueResult {
  // Core metrics
  mNAV: number;
  netYieldPct: number;
  fairPremium: number;
  upside: number;
  verdict: "Cheap" | "Fair" | "Expensive" | "N/A";

  // Component breakdown
  excessYieldContribution: number;
  leverageContribution: number;
  volHarvestContribution: number;

  // Vol Harvest sub-components
  volHarvestPremium: number;
  volHarvestOptionality: number;
  volHarvestFloor: number;

  // Supporting metrics
  liquidityScore: number;
  isNonYielding: boolean;
  excessYield: number;  // Raw excess yield (before discounting)

  // Legacy compatibility
  optionalityPremium: number;
}

/**
 * Calculate fair value premium with full model
 *
 * Formula: Fair Premium = 1 + Excess Yield + Leverage + Vol Harvesting
 *
 * Each component is toggleable and has configurable parameters.
 */
export function calculateFairValueExtended(params: FairValueParams): FairValueResult {
  const {
    holdings,
    assetPrice,
    marketCap,
    asset,
    stakingPct = 0,
    companyStakingApy,
    quarterlyBurnUsd = 0,
    networkStakingApy: providedNetworkApy,
    capitalRaisedConverts = 0,
    avgDailyVolume = 0,
    hasOptions = false,
    optionsOi = 0,
    indexInclusion = [],
    includeExcessYield = true,
    includeLeverage = true,
    includeVolHarvest = true,
    riskFreeRate = RISK_FREE_RATE,
    stakingSpread = STAKING_SPREAD,
    leverageSpread = LEVERAGE_SPREAD,
    expectedReturn = DEFAULT_EXPECTED_RETURN,
    financingCost = FINANCING_COST,
    cheapThreshold = VERDICT_THRESHOLD,
    expensiveThreshold = VERDICT_THRESHOLD,
  } = params;

  // Check if this is a non-yielding asset FIRST (needed for defaults)
  const isNonYielding = NON_YIELDING_ASSETS.includes(asset);

  // Apply asset-type-specific LEVERAGE defaults
  // Non-yielding assets (BTC) - leverage IS the thesis (credit company model)
  // Lower discount rate, higher expected return
  const effectiveLeverageSpread = params.leverageSpread ?? (isNonYielding
    ? LEVERAGE_SPREAD_NON_YIELDING
    : LEVERAGE_SPREAD);
  const effectiveExpectedReturn = params.expectedReturn ?? (isNonYielding
    ? DEFAULT_EXPECTED_RETURN_NON_YIELDING
    : DEFAULT_EXPECTED_RETURN);

  // Apply asset-type-specific VOL HARVESTING defaults
  // Non-yielding assets (BTC, DOGE, etc.) have higher rates since vol harvesting is their PRIMARY value
  // Yielding assets (ETH, SOL, etc.) have lower rates since staking yield is the primary value
  const baseVolRate = params.baseVolRate ?? (isNonYielding
    ? VOL_HARVEST_BASE_RATE_NON_YIELDING
    : VOL_HARVEST_BASE_RATE);
  const premiumCap = params.premiumCap ?? (isNonYielding
    ? VOL_HARVEST_PREMIUM_CAP_NON_YIELDING
    : VOL_HARVEST_PREMIUM_CAP);
  const optionalityRate = params.optionalityRate ?? (isNonYielding
    ? VOL_HARVEST_OPTIONALITY_RATE_NON_YIELDING
    : VOL_HARVEST_OPTIONALITY_RATE);
  const liquidityFloorRate = params.liquidityFloorRate ?? (isNonYielding
    ? VOL_HARVEST_LIQUIDITY_FLOOR_NON_YIELDING
    : VOL_HARVEST_LIQUIDITY_FLOOR);

  // Get network APY for this asset
  const networkStakingApy = providedNetworkApy ?? NETWORK_STAKING_APY[asset] ?? 0;

  const nav = calculateNAV(holdings, assetPrice);
  const mNAV = nav > 0 ? marketCap / nav : 0;

  // Calculate net yield (staking - burn)
  const { netYieldPct } = calculateNetYield(
    holdings,
    stakingPct,
    companyStakingApy ?? networkStakingApy,
    quarterlyBurnUsd,
    assetPrice
  );

  // Calculate liquidity score
  const liquidityScore = calculateLiquidityScore({
    avgDailyVolume,
    hasOptions,
    optionsOi,
    indexInclusion,
  });

  // =========================================================================
  // COMPONENT 1: EXCESS YIELD
  // =========================================================================
  let excessYield = 0;
  let excessYieldContribution = 0;

  if (includeExcessYield) {
    if (isNonYielding) {
      // Non-yielding: use burn drag as negative yield
      excessYield = netYieldPct;
      excessYieldContribution = netYieldPct / (riskFreeRate + stakingSpread);
    } else {
      // Yielding: excess over benchmark
      excessYield = netYieldPct - networkStakingApy;
      excessYieldContribution = excessYield / (riskFreeRate + stakingSpread);
    }
  }

  // =========================================================================
  // COMPONENT 2: LEVERAGE RETURNS (BTC credit company thesis)
  // =========================================================================
  let leverageContribution = 0;

  if (includeLeverage && capitalRaisedConverts > 0) {
    const leverageResult = calculateLeverageReturns({
      debtOutstanding: capitalRaisedConverts,
      holdings,
      assetPrice,
      expectedReturn: effectiveExpectedReturn,
      financingCost,
      riskFreeRate,
      leverageSpread: effectiveLeverageSpread,
    });
    leverageContribution = leverageResult.leverageContribution;
  }

  // =========================================================================
  // COMPONENT 3: VOL HARVESTING
  // =========================================================================
  let volHarvestContribution = 0;
  let volHarvestPremium = 0;
  let volHarvestOptionality = 0;
  let volHarvestFloor = 0;

  if (includeVolHarvest) {
    const volResult = calculateVolHarvesting({
      mNAV,
      liquidityScore,
      baseVolRate,
      premiumCap,
      optionalityRate,
      liquidityFloorRate,
    });
    volHarvestPremium = volResult.premiumComponent;
    volHarvestOptionality = volResult.optionalityComponent;
    volHarvestFloor = volResult.floorComponent;
    volHarvestContribution = volResult.total;
  }

  // =========================================================================
  // FAIR PREMIUM CALCULATION
  // =========================================================================
  const fairPremium = Math.max(
    0.3,  // Floor at 0.3x
    1.0 + excessYieldContribution + leverageContribution + volHarvestContribution
  );

  // Verdict based on threshold band around fair value
  let verdict: "Cheap" | "Fair" | "Expensive" | "N/A" = "N/A";
  let upside = 0;

  if (mNAV > 0) {
    if (mNAV < fairPremium * (1 - cheapThreshold)) {
      verdict = "Cheap";
    } else if (mNAV > fairPremium * (1 + expensiveThreshold)) {
      verdict = "Expensive";
    } else {
      verdict = "Fair";
    }
    upside = fairPremium / mNAV - 1;
  }

  return {
    mNAV,
    netYieldPct,
    fairPremium,
    upside,
    verdict,
    excessYieldContribution,
    leverageContribution,
    volHarvestContribution,
    volHarvestPremium,
    volHarvestOptionality,
    volHarvestFloor,
    liquidityScore,
    isNonYielding,
    excessYield,
    optionalityPremium: volHarvestContribution,  // Legacy compatibility
  };
}

// Legacy function for backwards compatibility
export function calculateFairValue(
  holdings: number,
  assetPrice: number,
  marketCap: number,
  stakingPct: number,
  companyStakingApy: number,
  quarterlyBurnUsd: number,
  networkStakingApy: number,
  riskFreeRate: number = RISK_FREE_RATE,
  asset: string = "ETH",
  leverageRatio: number = 1.0,
): {
  mNAV: number;
  netYieldPct: number;
  excessYield: number;
  fairPremium: number;
  upside: number;
  verdict: "Cheap" | "Fair" | "Expensive" | "N/A";
  isNonYielding: boolean;
  optionalityPremium: number;
} {
  const result = calculateFairValueExtended({
    holdings,
    assetPrice,
    marketCap,
    asset,
    stakingPct,
    companyStakingApy,
    quarterlyBurnUsd,
    networkStakingApy,
    riskFreeRate,
    // Use legacy behavior: vol harvest based on base optionality premium
    includeVolHarvest: false,
  });

  // Compute legacy optionality premium
  const baseOptionality = BASE_OPTIONALITY_PREMIUM[asset] || 0.15;
  const leverageMultiplier = Math.min(MAX_LEVERAGE_MULTIPLIER, Math.max(1.0, leverageRatio));
  const isNonYielding = NON_YIELDING_ASSETS.includes(asset);

  let optionalityPremium = baseOptionality * leverageMultiplier;
  if (!isNonYielding) {
    optionalityPremium *= YIELDING_OPTIONALITY_FACTOR;
  }

  // Recalculate fair premium with legacy optionality
  let fairPremium: number;
  if (isNonYielding) {
    const burnDrag = result.netYieldPct < 0 ? Math.abs(result.netYieldPct) / BURN_DRAG_DIVISOR : 0;
    fairPremium = Math.max(0.5, 1.0 + optionalityPremium - burnDrag);
  } else {
    fairPremium = Math.max(0.3, 1.0 + result.excessYieldContribution + optionalityPremium);
  }

  // Recalculate verdict with new fair premium
  let verdict: "Cheap" | "Fair" | "Expensive" | "N/A" = "N/A";
  let upside = 0;

  if (result.mNAV > 0) {
    if (result.mNAV < fairPremium * (1 - VERDICT_THRESHOLD)) {
      verdict = "Cheap";
    } else if (result.mNAV > fairPremium * (1 + VERDICT_THRESHOLD)) {
      verdict = "Expensive";
    } else {
      verdict = "Fair";
    }
    upside = fairPremium / result.mNAV - 1;
  }

  return {
    mNAV: result.mNAV,
    netYieldPct: result.netYieldPct,
    excessYield: result.excessYield,
    fairPremium,
    upside,
    verdict,
    isNonYielding,
    optionalityPremium,
  };
}

// Determine DAT phase
export function determineDATPhase(
  navDiscount: number | null,
  hasDividend: boolean,
  peRatio: number | null
): { phase: string; description: string; progress: number } {
  // Phase 6c: Terminal - Has established P/E, paying dividends
  if (hasDividend && peRatio && peRatio > 20) {
    return {
      phase: "terminal",
      description: "Phase 6c: Terminal - Earnings-driven valuation",
      progress: 1.0,
    };
  }

  // Phase 6b: Transition - Starting to show earnings characteristics
  if (hasDividend || (navDiscount !== null && Math.abs(navDiscount) < 0.10)) {
    return {
      phase: "transition",
      description: "Phase 6b: Transition - Moving toward earnings focus",
      progress: 0.66,
    };
  }

  // Phase 6a: Accumulation - NAV-driven
  return {
    phase: "accumulation",
    description: "Phase 6a: Accumulation - NAV discount/premium driven",
    progress: 0.33,
  };
}

// Format helpers
export function formatLargeNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "—";
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

export function formatTokenAmount(num: number | null | undefined, symbol: string): string {
  if (num === null || num === undefined) return "—";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M ${symbol}`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K ${symbol}`;
  return `${num.toLocaleString()} ${symbol}`;
}

// Precise token formatting - shows exact number with commas, no rounding
export function formatTokenAmountPrecise(num: number | null | undefined, symbol: string): string {
  if (num === null || num === undefined) return "—";
  return `${num.toLocaleString()} $${symbol}`;
}

export function formatPercent(num: number | null | undefined, includeSign = false): string {
  if (num === null || num === undefined) return "—";
  const sign = includeSign && num > 0 ? "+" : "";
  return `${sign}${(num * 100).toFixed(2)}%`;
}

export function formatMNAV(mnav: number | null | undefined): string {
  if (mnav === null || mnav === undefined || mnav === 0) return "—";
  return `${mnav.toFixed(2)}x`;
}
