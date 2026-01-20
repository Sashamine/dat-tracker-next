/**
 * Approval Workflow Engine
 * Determines whether updates should be auto-approved or require manual review
 *
 * Source Hierarchy (highest to lowest trust):
 * 1. on-chain         - Verified via blockchain (auto-approve)
 * 2. sec-filing       - SEC 8-K, 10-Q, 10-K (auto-approve)
 * 3. regulatory       - Non-US regulatory filings (auto-approve with higher threshold)
 * 4. press-release    - Official company announcement (auto-approve with high confidence)
 * 5. holdings_page    - Direct holdings tracker (auto-approve with high confidence)
 * 6. ir_press_release - IR page press releases (auto-approve with high confidence)
 * 7. aggregator       - Bitbo, BitcoinTreasuries.net (flag for review only)
 * 8. twitter          - Social media (never auto-approve)
 */

import { ApprovalDecision, SourceTrustLevel, PendingUpdate } from '../types';

interface DataSource {
  trustLevel: SourceTrustLevel;
  autoApproveThreshold: number; // Confidence threshold for auto-approval (1.0 = never auto-approve)
  maxAutoApproveChangePct: number; // Max % change to allow auto-approval
}

interface Company {
  id: number;
  ticker: string;
  holdings: number;
}

/**
 * Source configurations with thresholds
 * Ordered by trust level (highest to lowest)
 */
const SOURCE_CONFIGS: Record<string, DataSource> = {
  // Tier 1: Highest trust - auto-approve
  'on-chain': {
    trustLevel: 'official',
    autoApproveThreshold: 0.80,  // Lower threshold - blockchain is verifiable
    maxAutoApproveChangePct: 50, // Allow larger changes since it's provable
  },
  'sec-filing': {
    trustLevel: 'official',
    autoApproveThreshold: 0.85,
    maxAutoApproveChangePct: 30, // SEC filings are legally binding
  },
  sec_8k: { trustLevel: 'official', autoApproveThreshold: 0.85, maxAutoApproveChangePct: 30 },
  sec_10q: { trustLevel: 'official', autoApproveThreshold: 0.85, maxAutoApproveChangePct: 30 },
  sec_10k: { trustLevel: 'official', autoApproveThreshold: 0.85, maxAutoApproveChangePct: 30 },

  // Tier 2: Official company sources - auto-approve with higher threshold
  'regulatory-filing': {
    trustLevel: 'official',
    autoApproveThreshold: 0.88,
    maxAutoApproveChangePct: 25,
  },
  'press-release': {
    trustLevel: 'verified',
    autoApproveThreshold: 0.90,
    maxAutoApproveChangePct: 20,
  },
  'company-website': {
    trustLevel: 'verified',
    autoApproveThreshold: 0.92,
    maxAutoApproveChangePct: 15,
  },
  ir_page: { trustLevel: 'verified', autoApproveThreshold: 0.92, maxAutoApproveChangePct: 15 },

  // Tier 2.5: Direct holdings pages and IR press releases
  holdings_page: {
    trustLevel: 'official',
    autoApproveThreshold: 0.90,
    maxAutoApproveChangePct: 20, // Direct from company, high trust
  },
  ir_press_release: {
    trustLevel: 'official',
    autoApproveThreshold: 0.90,
    maxAutoApproveChangePct: 20,
  },

  // Tier 3: Aggregators - flag for review, never auto-approve
  'aggregator': {
    trustLevel: 'community',
    autoApproveThreshold: 1.0,  // Never auto-approve
    maxAutoApproveChangePct: 0,
  },
  aggregator_bitbo: { trustLevel: 'community', autoApproveThreshold: 1.0, maxAutoApproveChangePct: 0 },
  aggregator_btctreasuries: { trustLevel: 'community', autoApproveThreshold: 1.0, maxAutoApproveChangePct: 0 },

  // Tier 4: Social media - never auto-approve
  twitter: {
    trustLevel: 'unverified',
    autoApproveThreshold: 1.0,  // Never auto-approve
    maxAutoApproveChangePct: 0,
  },
};

/**
 * Evaluate whether a pending update should be auto-approved
 */
export function evaluateAutoApproval(
  update: {
    detectedHoldings: number;
    confidenceScore: number;
    sourceType: string;
    trustLevel: SourceTrustLevel;
  },
  company: Company
): ApprovalDecision {
  const sourceConfig = SOURCE_CONFIGS[update.sourceType] || {
    trustLevel: update.trustLevel,
    autoApproveThreshold: 1.0,
    maxAutoApproveChangePct: 0,
  };

  const changePct = calculateChangePct(company.holdings, update.detectedHoldings);
  const confidencePct = (update.confidenceScore * 100).toFixed(0);

  // Rule 1: On-chain verified data - highest trust
  if (update.sourceType === 'on-chain') {
    if (update.confidenceScore >= sourceConfig.autoApproveThreshold) {
      return {
        shouldAutoApprove: true,
        reason: `On-chain verified with ${confidencePct}% confidence`,
      };
    }
  }

  // Rule 2: SEC filings - auto-approve within change limits
  if (update.trustLevel === 'official' && update.confidenceScore >= sourceConfig.autoApproveThreshold) {
    if (changePct <= sourceConfig.maxAutoApproveChangePct) {
      return {
        shouldAutoApprove: true,
        reason: `SEC filing with ${confidencePct}% confidence (${changePct.toFixed(1)}% change)`,
      };
    } else {
      return {
        shouldAutoApprove: false,
        reason: `Large change (${changePct.toFixed(1)}%) exceeds auto-approve limit for SEC filings`,
        requiredReviewLevel: 'senior',
      };
    }
  }

  // Rule 3: Verified sources (press releases, company website)
  if (update.trustLevel === 'verified' && update.confidenceScore >= sourceConfig.autoApproveThreshold) {
    if (changePct <= sourceConfig.maxAutoApproveChangePct) {
      return {
        shouldAutoApprove: true,
        reason: `Verified source (${update.sourceType}) with ${confidencePct}% confidence`,
      };
    } else {
      return {
        shouldAutoApprove: false,
        reason: `Change of ${changePct.toFixed(1)}% exceeds limit for ${update.sourceType}`,
        requiredReviewLevel: changePct > 25 ? 'senior' : 'standard',
      };
    }
  }

  // Rule 4: Aggregators (Bitbo, BitcoinTreasuries.net) - NEVER auto-approve, flag for review
  if (update.sourceType === 'aggregator' ||
      update.sourceType === 'aggregator_bitbo' || update.sourceType === 'aggregator_btctreasuries') {
    return {
      shouldAutoApprove: false,
      reason: `Aggregator data flagged for verification (${changePct.toFixed(1)}% discrepancy)`,
      requiredReviewLevel: 'standard',
    };
  }

  // Rule 5: Community/unverified sources - never auto-approve
  if (update.trustLevel === 'community' || update.trustLevel === 'unverified') {
    return {
      shouldAutoApprove: false,
      reason: `${update.trustLevel.charAt(0).toUpperCase() + update.trustLevel.slice(1)} source requires verification`,
      requiredReviewLevel: 'standard',
    };
  }

  // Rule 6: Low confidence always requires review
  if (update.confidenceScore < 0.75) {
    return {
      shouldAutoApprove: false,
      reason: `Low confidence (${confidencePct}%) requires review`,
      requiredReviewLevel: 'standard',
    };
  }

  // Default: require standard review
  return {
    shouldAutoApprove: false,
    reason: 'Default policy requires review',
    requiredReviewLevel: 'standard',
  };
}

/**
 * Calculate percentage change
 */
function calculateChangePct(current: number, detected: number): number {
  if (current === 0) return detected > 0 ? 100 : 0;
  return Math.abs((detected - current) / current) * 100;
}

/**
 * Prioritize pending updates for review
 */
export function prioritizePendingUpdates(
  updates: Array<PendingUpdate & { companyTicker: string; companyAsset: string }>
): typeof updates {
  return [...updates].sort((a, b) => {
    // Priority 1: High confidence updates first
    const confDiff = b.confidenceScore - a.confidenceScore;
    if (Math.abs(confDiff) > 0.1) return confDiff > 0 ? 1 : -1;

    // Priority 2: Official sources first
    const trustOrder: Record<SourceTrustLevel, number> = {
      official: 0,
      verified: 1,
      community: 2,
      unverified: 3,
    };
    const trustDiff = trustOrder[a.trustLevel] - trustOrder[b.trustLevel];
    if (trustDiff !== 0) return trustDiff;

    // Priority 3: Newer updates first
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Check if update is a duplicate or superseded
 */
export function checkForDuplicates(
  newUpdate: {
    companyId: number;
    detectedHoldings: number;
    sourceType: string;
  },
  existingUpdates: Array<{
    companyId: number;
    detectedHoldings: number;
    sourceType: string;
    status: string;
    createdAt: Date;
  }>
): { isDuplicate: boolean; reason?: string } {
  // Check for exact duplicate
  const exactDuplicate = existingUpdates.find(
    (u) =>
      u.companyId === newUpdate.companyId &&
      u.detectedHoldings === newUpdate.detectedHoldings &&
      u.sourceType === newUpdate.sourceType &&
      u.status === 'pending'
  );

  if (exactDuplicate) {
    return {
      isDuplicate: true,
      reason: 'Exact duplicate already pending',
    };
  }

  // Check for similar update within last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentSimilar = existingUpdates.find(
    (u) =>
      u.companyId === newUpdate.companyId &&
      Math.abs(u.detectedHoldings - newUpdate.detectedHoldings) < 1 &&
      new Date(u.createdAt) > oneHourAgo
  );

  if (recentSimilar) {
    return {
      isDuplicate: true,
      reason: 'Similar update already created in last hour',
    };
  }

  return { isDuplicate: false };
}

/**
 * Get auto-approval summary text
 */
export function getApprovalSummary(decision: ApprovalDecision): string {
  if (decision.shouldAutoApprove) {
    return `✅ Auto-approved: ${decision.reason}`;
  }
  const level = decision.requiredReviewLevel === 'senior' ? '⚠️ Senior' : '👀 Standard';
  return `${level} review required: ${decision.reason}`;
}

/**
 * Share mismatch detection result
 */
export interface ShareMismatchResult {
  hasMismatch: boolean;
  currentShares: number;
  extractedShares: number;
  classAShares?: number | null;
  classBShares?: number | null;
  confidence: number;
}

/**
 * Detect if extracted shares don't match current shares
 * Returns mismatch details if shares differ, regardless of magnitude
 */
export function detectShareMismatch(
  extractedShares: number | null,
  currentShares: number | null | undefined,
  classAShares?: number | null,
  classBShares?: number | null,
  confidence: number = 0
): ShareMismatchResult | null {
  // Skip if no extracted shares or low confidence
  if (extractedShares === null || confidence < 0.7) {
    return null;
  }

  // Skip if no current shares to compare against
  if (currentShares === null || currentShares === undefined || currentShares === 0) {
    return null;
  }

  // Any mismatch should be flagged (no threshold - just not equal)
  if (extractedShares !== currentShares) {
    return {
      hasMismatch: true,
      currentShares,
      extractedShares,
      classAShares,
      classBShares,
      confidence,
    };
  }

  return null;
}
