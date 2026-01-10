/**
 * DAT Fair Value Model
 * ====================
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
export function calculateNAV(holdings: number, assetPrice: number): number {
  return holdings * assetPrice;
}

// Calculate NAV per share
export function calculateNAVPerShare(
  holdings: number,
  assetPrice: number,
  sharesOutstanding: number
): number | null {
  if (!sharesOutstanding || sharesOutstanding <= 0) return null;
  return calculateNAV(holdings, assetPrice) / sharesOutstanding;
}

// Calculate mNAV (Market Cap / NAV) - key valuation metric
export function calculateMNAV(
  marketCap: number,
  holdings: number,
  assetPrice: number
): number | null {
  const nav = calculateNAV(holdings, assetPrice);
  if (!nav || nav <= 0) return null;
  return marketCap / nav;
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

/** Equity risk premium over risk-free rate */
export const EQUITY_RISK_SPREAD = 0.06; // 6%

/** Discount rate for capitalizing yield streams */
export const DISCOUNT_RATE = RISK_FREE_RATE + EQUITY_RISK_SPREAD; // 10%

/** Divisor for calculating burn drag penalty (symmetric with discount rate) */
export const BURN_DRAG_DIVISOR = 0.10; // 10%

/** Optionality multiplier for yielding assets (50% of non-yielding) */
export const YIELDING_OPTIONALITY_FACTOR = 0.5;

/** Maximum leverage multiplier cap */
export const MAX_LEVERAGE_MULTIPLIER = 2.0;

/** Verdict thresholds (±15% band around fair value) */
export const VERDICT_THRESHOLD = 0.15; // 15%

// ============================================================================
// ASSET-SPECIFIC PARAMETERS
// ============================================================================

// Network staking APYs by asset
export const NETWORK_STAKING_APY: Record<string, number> = {
  ETH: 0.03,
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

// Base optionality premium for all assets
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

// Calculate fair value premium
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
  leverageRatio: number = 1.0,  // > 1 means company uses leverage (debt/converts)
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
  const nav = calculateNAV(holdings, assetPrice);
  const mNAV = nav > 0 ? marketCap / nav : 0;

  // Check if this is a non-yielding asset
  const isNonYielding = NON_YIELDING_ASSETS.includes(asset);

  // Calculate net yield (staking - burn)
  const { netYieldPct } = calculateNetYield(
    holdings,
    stakingPct,
    companyStakingApy || networkStakingApy,
    quarterlyBurnUsd,
    assetPrice
  );

  let fairPremium: number;
  let excessYield: number;
  let optionalityPremium = 0;

  // Base optionality for this asset (or default)
  const baseOptionality = BASE_OPTIONALITY_PREMIUM[asset] || 0.15;

  // Leverage amplifies optionality (capped per MAX_LEVERAGE_MULTIPLIER)
  const leverageMultiplier = Math.min(MAX_LEVERAGE_MULTIPLIER, Math.max(1.0, leverageRatio));

  if (isNonYielding) {
    // NON-YIELDING ASSETS: Fair value = 1.0 + optionality premium - burn drag
    // Optionality value comes from: leverage, volatility harvesting, institutional access

    optionalityPremium = baseOptionality * leverageMultiplier;

    // Burn drag reduces fair value
    const burnDrag = netYieldPct < 0 ? Math.abs(netYieldPct) / BURN_DRAG_DIVISOR : 0;

    // Fair premium: baseline (1.0) + optionality - burn drag
    // Floor at 0.5x for even the worst situations
    fairPremium = Math.max(0.5, 1.0 + optionalityPremium - burnDrag);

    // Excess yield is the optionality value for non-yielding (no benchmark to compare)
    excessYield = optionalityPremium;
  } else {
    // YIELDING ASSETS: Fair value based on excess yield + partial optionality premium
    // These companies ALSO provide institutional access, leverage potential, volatility exposure

    // Excess yield over benchmark
    excessYield = netYieldPct - networkStakingApy;

    // Optionality premium at reduced rate (yield already provides value)
    optionalityPremium = baseOptionality * leverageMultiplier * YIELDING_OPTIONALITY_FACTOR;

    // Discount rate (allow override via riskFreeRate param, default uses constants)
    const discountRate = riskFreeRate + EQUITY_RISK_SPREAD;

    // Fair premium: 1.0 + PV of excess yield stream + partial optionality
    fairPremium = Math.max(0.3, 1.0 + excessYield / discountRate + optionalityPremium);
  }

  // Verdict based on threshold band around fair value
  let verdict: "Cheap" | "Fair" | "Expensive" | "N/A" = "N/A";
  let upside = 0;

  if (mNAV > 0) {
    if (mNAV < fairPremium * (1 - VERDICT_THRESHOLD)) {
      verdict = "Cheap";
    } else if (mNAV > fairPremium * (1 + VERDICT_THRESHOLD)) {
      verdict = "Expensive";
    } else {
      verdict = "Fair";
    }
    upside = fairPremium / mNAV - 1;
  }

  return {
    mNAV,
    netYieldPct,
    excessYield,
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

export function formatPercent(num: number | null | undefined, includeSign = false): string {
  if (num === null || num === undefined) return "—";
  const sign = includeSign && num > 0 ? "+" : "";
  return `${sign}${(num * 100).toFixed(2)}%`;
}

export function formatMNAV(mnav: number | null | undefined): string {
  if (mnav === null || mnav === undefined || mnav === 0) return "—";
  return `${mnav.toFixed(2)}x`;
}
