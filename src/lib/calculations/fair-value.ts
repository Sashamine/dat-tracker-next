import {
  BASE_OPTIONALITY_PREMIUM,
  BMNR_BENCHMARK_VOLUME,
  BURN_DRAG_DIVISOR,
  DEFAULT_EXPECTED_RETURN,
  DEFAULT_EXPECTED_RETURN_NON_YIELDING,
  EQUITY_RISK_SPREAD,
  FINANCING_COST,
  LEVERAGE_SPREAD,
  LEVERAGE_SPREAD_NON_YIELDING,
  MAX_LEVERAGE_MULTIPLIER,
  NETWORK_STAKING_APY,
  NON_YIELDING_ASSETS,
  RISK_FREE_RATE,
  STAKING_SPREAD,
  VERDICT_THRESHOLD,
  VOL_HARVEST_BASE_RATE,
  VOL_HARVEST_BASE_RATE_NON_YIELDING,
  VOL_HARVEST_LIQUIDITY_FLOOR,
  VOL_HARVEST_LIQUIDITY_FLOOR_NON_YIELDING,
  VOL_HARVEST_OPTIONALITY_RATE,
  VOL_HARVEST_OPTIONALITY_RATE_NON_YIELDING,
  VOL_HARVEST_PREMIUM_CAP,
  VOL_HARVEST_PREMIUM_CAP_NON_YIELDING,
  YIELDING_OPTIONALITY_FACTOR,
} from "./constants";

import { calculateNAV } from "./mnav";

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
// LIQUIDITY SCORE CALCULATION
// ============================================================================

export interface LiquidityScoreParams {
  avgDailyVolume?: number;
  hasOptions?: boolean;
  optionsOi?: number;
  indexInclusion?: string[];
}

export function calculateLiquidityScore(params: LiquidityScoreParams): number {
  const { avgDailyVolume = 0, hasOptions = false, optionsOi = 0, indexInclusion = [] } = params;

  const volumeScore = Math.min(avgDailyVolume / BMNR_BENCHMARK_VOLUME, 1.0);

  let optionsScore = 0;
  if (hasOptions && optionsOi > 50_000) {
    optionsScore = 0.3;
  } else if (hasOptions) {
    optionsScore = 0.15;
  }

  const indexScore = indexInclusion.length > 0 ? 0.2 : 0;

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

export function calculateVolHarvesting(params: VolHarvestParams): VolHarvestResult {
  const {
    mNAV,
    liquidityScore,
    baseVolRate = VOL_HARVEST_BASE_RATE,
    premiumCap = VOL_HARVEST_PREMIUM_CAP,
    optionalityRate = VOL_HARVEST_OPTIONALITY_RATE,
    liquidityFloorRate = VOL_HARVEST_LIQUIDITY_FLOOR,
  } = params;

  const premiumFactor = Math.min(Math.max(mNAV - 1, 0), premiumCap);
  const premiumComponent = baseVolRate * liquidityScore * premiumFactor;

  const optionalityComponent = optionalityRate * liquidityScore ** 2;

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
  debtOutstanding: number;
  holdings: number;
  assetPrice: number;
  expectedReturn?: number;
  financingCost?: number;
  riskFreeRate?: number;
  leverageSpread?: number;
}

export interface LeverageResult {
  leverageReturnPct: number;
  leverageContribution: number;
}

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

  const leverageReturnPct = expectedReturn - financingCost;

  const leverageReturnUsd = leverageReturnPct * debtOutstanding;
  const leverageReturnTokens = leverageReturnUsd / assetPrice;
  const leverageYieldRate = leverageReturnTokens / holdings;

  const leverageDiscount = riskFreeRate + leverageSpread;

  const leverageContribution =
    leverageYieldRate > 0
      ? leverageYieldRate / leverageDiscount
      : leverageYieldRate / (riskFreeRate + STAKING_SPREAD);

  return { leverageReturnPct, leverageContribution };
}

// ============================================================================
// EXTENDED FAIR VALUE MODEL
// ============================================================================

export interface FairValueParams {
  holdings: number;
  assetPrice: number;
  marketCap: number;
  asset: string;

  stakingPct?: number;
  companyStakingApy?: number;
  quarterlyBurnUsd?: number;
  networkStakingApy?: number;

  capitalRaisedConverts?: number;

  avgDailyVolume?: number;
  hasOptions?: boolean;
  optionsOi?: number;
  indexInclusion?: string[];

  includeExcessYield?: boolean;
  includeLeverage?: boolean;
  includeVolHarvest?: boolean;

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
  mNAV: number;
  netYieldPct: number;
  fairPremium: number;
  upside: number;
  verdict: "Cheap" | "Fair" | "Expensive" | "N/A";

  excessYieldContribution: number;
  leverageContribution: number;
  volHarvestContribution: number;

  volHarvestPremium: number;
  volHarvestOptionality: number;
  volHarvestFloor: number;

  liquidityScore: number;
  isNonYielding: boolean;
  excessYield: number;

  optionalityPremium: number;
}

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

  const isNonYielding = NON_YIELDING_ASSETS.includes(asset);

  const effectiveLeverageSpread = params.leverageSpread ?? (isNonYielding ? LEVERAGE_SPREAD_NON_YIELDING : LEVERAGE_SPREAD);
  const effectiveExpectedReturn = params.expectedReturn ?? (isNonYielding
    ? DEFAULT_EXPECTED_RETURN_NON_YIELDING
    : DEFAULT_EXPECTED_RETURN);

  const baseVolRate = params.baseVolRate ?? (isNonYielding ? VOL_HARVEST_BASE_RATE_NON_YIELDING : VOL_HARVEST_BASE_RATE);
  const premiumCap = params.premiumCap ?? (isNonYielding
    ? VOL_HARVEST_PREMIUM_CAP_NON_YIELDING
    : VOL_HARVEST_PREMIUM_CAP);
  const optionalityRate = params.optionalityRate ?? (isNonYielding
    ? VOL_HARVEST_OPTIONALITY_RATE_NON_YIELDING
    : VOL_HARVEST_OPTIONALITY_RATE);
  const liquidityFloorRate = params.liquidityFloorRate ?? (isNonYielding
    ? VOL_HARVEST_LIQUIDITY_FLOOR_NON_YIELDING
    : VOL_HARVEST_LIQUIDITY_FLOOR);

  const networkStakingApy = providedNetworkApy ?? NETWORK_STAKING_APY[asset] ?? 0;

  const nav = calculateNAV(holdings, assetPrice);
  const mNAV = nav > 0 ? marketCap / nav : 0;

  const { netYieldPct } = calculateNetYield(
    holdings,
    stakingPct,
    companyStakingApy ?? networkStakingApy,
    quarterlyBurnUsd,
    assetPrice
  );

  const liquidityScore = calculateLiquidityScore({
    avgDailyVolume,
    hasOptions,
    optionsOi,
    indexInclusion,
  });

  let excessYield = 0;
  let excessYieldContribution = 0;

  if (includeExcessYield) {
    if (isNonYielding) {
      excessYield = netYieldPct;
      excessYieldContribution = netYieldPct / (riskFreeRate + stakingSpread);
    } else {
      excessYield = netYieldPct - networkStakingApy;
      excessYieldContribution = excessYield / (riskFreeRate + stakingSpread);
    }
  }

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

  const fairPremium = Math.max(
    0.3,
    1.0 + excessYieldContribution + leverageContribution + volHarvestContribution
  );

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
    optionalityPremium: volHarvestContribution,
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
  leverageRatio: number = 1.0
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
    includeVolHarvest: false,
  });

  const baseOptionality = BASE_OPTIONALITY_PREMIUM[asset] || 0.15;
  const leverageMultiplier = Math.min(MAX_LEVERAGE_MULTIPLIER, Math.max(1.0, leverageRatio));
  const isNonYielding = NON_YIELDING_ASSETS.includes(asset);

  let optionalityPremium = baseOptionality * leverageMultiplier;
  if (!isNonYielding) {
    optionalityPremium *= YIELDING_OPTIONALITY_FACTOR;
  }

  let fairPremium: number;
  if (isNonYielding) {
    const burnDrag = result.netYieldPct < 0 ? Math.abs(result.netYieldPct) / BURN_DRAG_DIVISOR : 0;
    fairPremium = Math.max(0.5, 1.0 + optionalityPremium - burnDrag);
  } else {
    fairPremium = Math.max(0.3, 1.0 + result.excessYieldContribution + optionalityPremium);
  }

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
  if (hasDividend && peRatio && peRatio > 20) {
    return {
      phase: "terminal",
      description: "Phase 6c: Terminal - Earnings-driven valuation",
      progress: 1.0,
    };
  }

  if (hasDividend || (navDiscount !== null && Math.abs(navDiscount) < 0.1)) {
    return {
      phase: "transition",
      description: "Phase 6b: Transition - Moving toward earnings focus",
      progress: 0.66,
    };
  }

  return {
    phase: "accumulation",
    description: "Phase 6a: Accumulation - NAV discount/premium driven",
    progress: 0.33,
  };
}

// Legacy exports that existed previously (keep them importable)
export { EQUITY_RISK_SPREAD };
