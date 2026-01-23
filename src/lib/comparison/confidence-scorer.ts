/**
 * Confidence Scorer (Phase 7c)
 *
 * Determines confidence level for discrepancies based on:
 * - Our source verification status (from Phase 7b)
 * - Whether external sources agree with our value
 * - Whether external source is known to be unreliable
 *
 * Confidence levels determine action:
 * - HIGH: Auto-confirm our value is correct
 * - MEDIUM: Flag for review (conflicting but verified data)
 * - LOW: Flag for review (unverified or invalid source)
 */

import type { VerificationResult, VerificationStatus } from './source-verifier';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type RecommendedAction =
  | 'auto_confirm'      // Our value is correct, no action needed
  | 'review_conflict'   // Sources disagree, needs manual review
  | 'review_unverified' // Our source is invalid/missing
  | 'log_external_error'; // External source is wrong (known bad)

export interface ConfidenceResult {
  level: ConfidenceLevel;
  action: RecommendedAction;
  reason: string;
}

/**
 * Known unreliable external sources for specific fields
 * These sources have been manually verified to be wrong in the past
 */
const KNOWN_BAD_SOURCES: Record<string, { ticker: string; field: string; reason: string }[]> = {
  'mNAV.com': [
    { ticker: 'GAME', field: 'holdings', reason: 'mNAV reports 447M ETH, actual is ~98M' },
  ],
};

/**
 * Tolerance for "agreement" between our value and external sources
 * If deviation is within this %, consider them in agreement
 */
const AGREEMENT_TOLERANCE_PCT = 5;

/**
 * Check if an external source is known to be unreliable for a specific ticker/field
 */
function isKnownBadSource(sourceName: string, ticker: string, field: string): boolean {
  const badEntries = KNOWN_BAD_SOURCES[sourceName];
  if (!badEntries) return false;
  return badEntries.some(e => e.ticker === ticker && e.field === field);
}

/**
 * Check if external sources agree with our value (within tolerance)
 */
function externalSourcesAgree(
  ourValue: number,
  sourceValues: Record<string, { value: number }>,
  ticker: string,
  field: string
): { allAgree: boolean; someAgree: boolean; knownBadDisagrees: boolean } {
  const sources = Object.entries(sourceValues);
  if (sources.length === 0) {
    return { allAgree: true, someAgree: true, knownBadDisagrees: false };
  }

  let agreementCount = 0;
  let knownBadDisagrees = false;

  for (const [sourceName, { value }] of sources) {
    const deviationPct = ourValue === 0
      ? (value === 0 ? 0 : 100)
      : Math.abs((value - ourValue) / ourValue * 100);

    const agrees = deviationPct <= AGREEMENT_TOLERANCE_PCT;

    if (agrees) {
      agreementCount++;
    } else if (isKnownBadSource(sourceName, ticker, field)) {
      knownBadDisagrees = true;
    }
  }

  return {
    allAgree: agreementCount === sources.length,
    someAgree: agreementCount > 0,
    knownBadDisagrees,
  };
}

/**
 * Calculate confidence level and recommended action
 */
export function calculateConfidence(
  verification: VerificationResult | undefined,
  ourValue: number,
  sourceValues: Record<string, { value: number }>,
  ticker: string,
  field: string
): ConfidenceResult {
  const verificationStatus = verification?.status || 'unverified';
  const { allAgree, someAgree, knownBadDisagrees } = externalSourcesAgree(
    ourValue,
    sourceValues,
    ticker,
    field
  );

  // Case 1: Our source is verified
  if (verificationStatus === 'verified') {
    // External sources all agree with us
    if (allAgree) {
      return {
        level: 'high',
        action: 'auto_confirm',
        reason: 'Our source verified and external sources agree',
      };
    }

    // Only known bad sources disagree
    if (knownBadDisagrees && someAgree) {
      return {
        level: 'high',
        action: 'log_external_error',
        reason: 'Our source verified, only known unreliable sources disagree',
      };
    }

    // External sources disagree (but not known bad)
    return {
      level: 'medium',
      action: 'review_conflict',
      reason: 'Our source verified but external sources disagree',
    };
  }

  // Case 2: Source drift - our source shows different value
  if (verificationStatus === 'source_drift') {
    return {
      level: 'low',
      action: 'review_unverified',
      reason: 'Our source shows different value than we have recorded',
    };
  }

  // Case 3: Source invalid (404, unreachable)
  if (verificationStatus === 'source_invalid') {
    return {
      level: 'low',
      action: 'review_unverified',
      reason: 'Our source URL is invalid or unreachable',
    };
  }

  // Case 4: Source available but we can't verify the value
  if (verificationStatus === 'source_available') {
    // If external sources agree with us, medium confidence
    if (allAgree) {
      return {
        level: 'medium',
        action: 'review_conflict',
        reason: 'Source available but value not parseable, external agrees',
      };
    }
    return {
      level: 'low',
      action: 'review_unverified',
      reason: 'Source available but value not parseable, external disagrees',
    };
  }

  // Case 5: No source URL (unverified)
  if (verificationStatus === 'unverified') {
    return {
      level: 'low',
      action: 'review_unverified',
      reason: 'No source URL to verify our data',
    };
  }

  // Fallback
  return {
    level: 'low',
    action: 'review_unverified',
    reason: `Unknown verification status: ${verificationStatus}`,
  };
}

/**
 * Get human-readable description of confidence result
 */
export function formatConfidenceResult(result: ConfidenceResult): string {
  const levelEmoji = {
    high: '✓',
    medium: '⚠️',
    low: '❌',
  }[result.level];

  const actionText = {
    auto_confirm: 'auto-confirmed',
    review_conflict: 'needs review (conflict)',
    review_unverified: 'needs review (unverified)',
    log_external_error: 'auto-confirmed (external error logged)',
  }[result.action];

  return `${levelEmoji} ${result.level.toUpperCase()} - ${actionText}`;
}
