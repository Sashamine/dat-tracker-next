/**
 * DAT Metrics Calculations
 * NAV, mNAV, premium/discount, fair value, phase detection
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

// Calculate fair value premium
export function calculateFairValue(
  holdings: number,
  assetPrice: number,
  marketCap: number,
  stakingPct: number,
  companyStakingApy: number,
  quarterlyBurnUsd: number,
  networkStakingApy: number,
  riskFreeRate: number = 0.04,
): {
  mNAV: number;
  netYieldPct: number;
  excessYield: number;
  fairPremium: number;
  upside: number;
  verdict: "Cheap" | "Fair" | "Expensive" | "N/A";
} {
  const nav = calculateNAV(holdings, assetPrice);
  const mNAV = nav > 0 ? marketCap / nav : 0;

  // Calculate net yield
  const { netYieldPct } = calculateNetYield(
    holdings,
    stakingPct,
    companyStakingApy || networkStakingApy,
    quarterlyBurnUsd,
    assetPrice
  );

  // Excess yield over benchmark
  const hasNetworkStaking = networkStakingApy > 0;
  const excessYield = hasNetworkStaking ? netYieldPct - networkStakingApy : netYieldPct;

  // Discount rate
  const spread = hasNetworkStaking ? 0.06 : 0.10;
  const discountRate = riskFreeRate + spread;

  // Fair premium calculation
  const fairPremium = hasNetworkStaking
    ? Math.max(0.3, 1.0 + excessYield / discountRate)
    : Math.max(0.3, 1.0 + netYieldPct / discountRate);

  // Verdict
  let verdict: "Cheap" | "Fair" | "Expensive" | "N/A" = "N/A";
  let upside = 0;

  if (mNAV > 0) {
    if (mNAV < fairPremium * 0.85) {
      verdict = "Cheap";
    } else if (mNAV > fairPremium * 1.15) {
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
