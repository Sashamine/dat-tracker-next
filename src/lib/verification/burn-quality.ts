/**
 * Burn Quality Score Module
 *
 * Analyzes the reliability of operating cash flow as a burn rate proxy.
 * Miners and companies with heavy non-cash charges need adjusted burn calculations.
 *
 * Key insights:
 * - Miners: D&A is massive (equipment depreciation), OCF is unreliable → use SG&A
 * - Heavy stock comp: Stock-based comp inflates OCF, subtract it if >30% of OCF
 * - Net income gap: Large gap between NI and OCF suggests non-cash adjustments
 */

import { BurnQualityMetrics } from '../fetchers/sec-xbrl';

// ===========================================================================
// TYPES
// ===========================================================================

/**
 * Adjusted burn rate result
 */
export interface AdjustedBurnRate {
  /** Raw operating cash flow from XBRL (negative = burn) */
  rawBurn: number;
  /** Adjusted burn rate based on company type */
  adjustedBurn: number;
  /** Quarterly burn rate (positive = burning cash, negative = generating) */
  quarterlyAdjustedBurn: number;
  /** How we calculated the adjusted burn */
  adjustmentMethod: 'ocf-raw' | 'ocf-minus-sbc' | 'sga-proxy';
  /** Explanation of adjustment */
  adjustmentReason: string;
}

/**
 * Burn quality score breakdown
 */
export interface BurnQualityScore {
  /** Overall quality score (0-100, higher = more reliable burn data) */
  score: number;
  /** Flag for manual review */
  needsReview: boolean;
  /** Score breakdown by component */
  components: {
    /** Gap between NI and OCF (smaller = better) */
    niOcfGapScore: number;
    /** Stock-based comp ratio (lower = better) */
    sbcRatioScore: number;
    /** D&A ratio (lower = better for non-miners) */
    daRatioScore: number;
  };
  /** Issues found during analysis */
  issues: string[];
}

/**
 * Full burn quality analysis result
 */
export interface BurnQualityResult {
  ticker: string;
  isMiner: boolean;
  metrics: BurnQualityMetrics;
  adjustedBurn: AdjustedBurnRate;
  qualityScore: BurnQualityScore;
}

// ===========================================================================
// ADJUSTED BURN RATE CALCULATION
// ===========================================================================

/**
 * Calculate adjusted burn rate based on company characteristics
 *
 * Logic:
 * 1. Miners: Use SG&A as burn proxy (D&A dominates OCF)
 * 2. Heavy stock comp (>30% of OCF): Subtract SBC from OCF
 * 3. Otherwise: Use raw operating cash flow
 */
export function calculateAdjustedBurnRate(
  metrics: BurnQualityMetrics,
  isMiner: boolean
): AdjustedBurnRate {
  const ocf = metrics.operatingCashFlow ?? 0;
  const sbc = metrics.stockBasedComp ?? 0;
  const sga = metrics.sgaExpenses ?? 0;
  const periodMonths = metrics.periodMonths || 3;

  // Default: use raw OCF
  let adjustedBurn = ocf;
  let method: AdjustedBurnRate['adjustmentMethod'] = 'ocf-raw';
  let reason = 'Using operating cash flow as-is';

  // Miners: Use SG&A as burn proxy
  if (isMiner && sga > 0) {
    // For miners, SG&A represents true operating expenses
    // D&A inflates OCF making it unreliable
    adjustedBurn = -sga; // Negate because SG&A is expense (positive number)
    method = 'sga-proxy';
    reason = `Miner: using SG&A ($${(sga / 1_000_000).toFixed(1)}M) as burn proxy instead of OCF`;
  }
  // Heavy stock comp: subtract it from OCF
  else if (sbc > 0 && ocf !== 0 && Math.abs(sbc / ocf) > 0.30) {
    // Stock-based comp is non-cash; remove it for cleaner burn picture
    adjustedBurn = ocf - sbc;
    method = 'ocf-minus-sbc';
    const sbcPct = ((sbc / Math.abs(ocf)) * 100).toFixed(1);
    reason = `Stock-based comp is ${sbcPct}% of OCF - subtracting $${(sbc / 1_000_000).toFixed(1)}M SBC`;
  }

  // Calculate quarterly burn rate
  // Burn is positive when burning cash (inverted from accounting convention)
  const quarterlyDivisor = periodMonths / 3;
  const quarterlyAdjustedBurn = -adjustedBurn / quarterlyDivisor;

  return {
    rawBurn: ocf,
    adjustedBurn,
    quarterlyAdjustedBurn: Math.round(quarterlyAdjustedBurn),
    adjustmentMethod: method,
    adjustmentReason: reason,
  };
}

// ===========================================================================
// BURN QUALITY SCORING
// ===========================================================================

/**
 * Calculate burn quality score (0-100)
 *
 * Components:
 * 1. NI-OCF Gap (40 points): Smaller gap = more reliable OCF
 * 2. SBC Ratio (30 points): Lower stock comp = cleaner burn
 * 3. D&A Ratio (30 points): Lower D&A = less adjustment noise (non-miners only)
 *
 * Score interpretation:
 * - 80-100: High quality - burn data is reliable
 * - 50-79: Medium quality - some adjustments needed
 * - 0-49: Low quality - needs manual review
 */
export function calculateBurnQualityScore(
  metrics: BurnQualityMetrics,
  isMiner: boolean
): BurnQualityScore {
  const ocf = metrics.operatingCashFlow ?? 0;
  const ni = metrics.netIncome ?? 0;
  const sbc = metrics.stockBasedComp ?? 0;
  const da = metrics.depreciation ?? 0;

  const issues: string[] = [];
  
  // 1. NI-OCF Gap Score (40 points max)
  // Smaller gap = better (cash flow matches earnings)
  let niOcfGapScore = 40;
  if (ocf !== 0 && ni !== 0) {
    const gap = Math.abs(ocf - ni);
    const gapRatio = gap / Math.max(Math.abs(ocf), Math.abs(ni));
    
    if (gapRatio > 1.0) {
      niOcfGapScore = 0;
      issues.push(`Large NI/OCF gap: ${(gapRatio * 100).toFixed(0)}% difference`);
    } else if (gapRatio > 0.5) {
      niOcfGapScore = 10;
      issues.push(`Significant NI/OCF gap: ${(gapRatio * 100).toFixed(0)}% difference`);
    } else if (gapRatio > 0.3) {
      niOcfGapScore = 25;
    } else {
      niOcfGapScore = 40;
    }
  } else if (ni === null || ocf === null) {
    niOcfGapScore = 20; // Partial data penalty
    issues.push('Missing net income or OCF data');
  }

  // 2. SBC Ratio Score (30 points max)
  // Lower stock comp = better
  let sbcRatioScore = 30;
  if (ocf !== 0 && sbc > 0) {
    const sbcRatio = Math.abs(sbc / ocf);
    
    if (sbcRatio > 0.5) {
      sbcRatioScore = 0;
      issues.push(`Very high stock comp: ${(sbcRatio * 100).toFixed(0)}% of OCF`);
    } else if (sbcRatio > 0.3) {
      sbcRatioScore = 10;
      issues.push(`High stock comp: ${(sbcRatio * 100).toFixed(0)}% of OCF`);
    } else if (sbcRatio > 0.15) {
      sbcRatioScore = 20;
    } else {
      sbcRatioScore = 30;
    }
  } else if (sbc === null) {
    sbcRatioScore = 20; // Partial data penalty
  }

  // 3. D&A Ratio Score (30 points max)
  // For non-miners: lower D&A = better (less noise)
  // For miners: D&A is expected, less penalized
  let daRatioScore = 30;
  if (ocf !== 0 && da > 0) {
    const daRatio = Math.abs(da / ocf);
    
    if (isMiner) {
      // Miners get more lenient scoring for D&A
      if (daRatio > 1.0) {
        daRatioScore = 15;
        issues.push(`Miner: D&A exceeds OCF (${(daRatio * 100).toFixed(0)}%)`);
      } else if (daRatio > 0.5) {
        daRatioScore = 22;
      } else {
        daRatioScore = 30;
      }
    } else {
      // Non-miners: D&A should be minimal
      if (daRatio > 0.8) {
        daRatioScore = 0;
        issues.push(`Very high D&A: ${(daRatio * 100).toFixed(0)}% of OCF`);
      } else if (daRatio > 0.5) {
        daRatioScore = 10;
        issues.push(`High D&A: ${(daRatio * 100).toFixed(0)}% of OCF`);
      } else if (daRatio > 0.3) {
        daRatioScore = 20;
      } else {
        daRatioScore = 30;
      }
    }
  } else if (da === null) {
    daRatioScore = 20; // Partial data penalty
  }

  const totalScore = niOcfGapScore + sbcRatioScore + daRatioScore;
  const needsReview = totalScore < 50;

  if (needsReview && issues.length === 0) {
    issues.push('Low overall burn quality score');
  }

  return {
    score: totalScore,
    needsReview,
    components: {
      niOcfGapScore,
      sbcRatioScore,
      daRatioScore,
    },
    issues,
  };
}

// ===========================================================================
// COMBINED ANALYSIS
// ===========================================================================

/**
 * Perform full burn quality analysis for a company
 */
export function analyzeBurnQuality(
  ticker: string,
  metrics: BurnQualityMetrics,
  isMiner: boolean
): BurnQualityResult {
  const adjustedBurn = calculateAdjustedBurnRate(metrics, isMiner);
  const qualityScore = calculateBurnQualityScore(metrics, isMiner);

  return {
    ticker,
    isMiner,
    metrics,
    adjustedBurn,
    qualityScore,
  };
}

/**
 * Format burn amount for display (in millions)
 */
export function formatBurn(amount: number): string {
  if (amount >= 0) {
    return `$${(amount / 1_000_000).toFixed(2)}M burn`;
  } else {
    return `$${(Math.abs(amount) / 1_000_000).toFixed(2)}M gen`;
  }
}

/**
 * Get score quality label
 */
export function getScoreLabel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}
