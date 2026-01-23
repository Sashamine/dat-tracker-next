/**
 * Adversarial Review System Types
 *
 * These types define the structured output format for the
 * Proposer and Challenger agents in the dual-agent review process.
 */

// Evidence tier classification
export type EvidenceTier = "verified" | "provisional" | "unverified";

// Source types within each tier
export type SourceType =
  // TIER 1: Verified
  | "sec-filing"
  | "company-dashboard"
  | "exchange-filing"
  // TIER 2: Provisional
  | "press-release"
  | "company-announcement"
  | "investor-presentation"
  // TIER 3: Unverified (should never be used as primary)
  | "news-article"
  | "aggregator"
  | "web-search";

// Proposer recommended actions
export type ProposerAction =
  | "approve_verified" // TIER 1 evidence, ready to commit
  | "add_provisional" // TIER 2 evidence, add with pendingVerification
  | "reject" // Evidence insufficient
  | "needs_research"; // Can't find primary source

// Challenger decisions
export type ChallengerDecision =
  | "APPROVE"
  | "REJECT"
  | "REQUEST_MORE_INFO"
  | "ESCALATE";

// Confidence levels
export type ConfidenceLevel = "high" | "medium" | "low";

// Fields that can be changed
export type DataField =
  | "holdings"
  | "sharesOutstandingDiluted"
  | "sharesOutstandingBasic"
  | "totalDebt"
  | "cashReserves"
  | "restrictedCash"
  | "preferredEquity";

/**
 * Proposer Output Schema
 */
export interface ProposerOutput {
  proposal: {
    ticker: string;
    field: DataField;
    currentValue: number;
    proposedValue: number;
    unit?: string;
    percentChange: number;
  };

  evidence: {
    tier: EvidenceTier;
    sourceType: SourceType;
    sourceUrl: string;
    sourceDate: string;
    exactQuote: string;
    documentSection?: string;
    methodology?: string;
  };

  // Only required for TIER 2 (press releases)
  legitimacyAssessment?: {
    applicable: boolean;
    confidence: ConfidenceLevel;
    trackRecord?: string;
    specificNumbers: boolean;
    plausibility?: string;
    capitalAvailable?: string;
  };

  existingValue: {
    value: number;
    source: string;
    sourceUrl?: string;
    gitCommit?: string;
    wasVerified: boolean;
    status: "superseded" | "incorrect" | "outdated" | "unknown";
    reason: string;
  };

  methodologyChecks: {
    basicVsDiluted?: string;
    stockSplit?: string;
    shareClasses?: string;
    currency?: string;
  };

  risks: string[];

  recommendedAction: ProposerAction;

  // Suggested entry for data file (if approved)
  suggestedEntry?: {
    date: string;
    [key: string]: unknown;
    source: string;
    sourceUrl: string;
    sourceType: SourceType;
    pendingVerification?: boolean;
    verificationExpected?: string;
  };
}

/**
 * Challenger Output Schema
 */
export interface ChallengerOutput {
  sourceVerification: {
    accessed: boolean;
    url: string;
    quoteFound: boolean;
    quoteMatchesProposal: boolean;
    valueInSource?: number;
    matchesProposedValue: boolean;
    newerSourceExists: boolean;
    error?: string;
  };

  existingValueReview: {
    checked: boolean;
    existingValue: number;
    existingSource: string;
    existingSourceStillValid: boolean;
    replacementJustified: boolean;
    reasoning: string;
  };

  methodologyValidation: {
    basicVsDiluted?: {
      applicable: boolean;
      verified?: boolean;
      reason?: string;
    };
    stockSplit?: {
      checked: boolean;
      recentSplits: boolean;
      details?: string;
    };
    shareClasses?: {
      applicable: boolean;
      allClassesSummed?: boolean;
    };
    currency?: {
      checked: boolean;
      isUSD: boolean;
      conversionNeeded: boolean;
      conversionCorrect?: boolean;
    };
  };

  // Only for TIER 2 evidence
  provisionalAssessment?: {
    applicable: boolean;
    pressReleaseVerified: boolean;
    companyTrackRecord?: {
      assessed: boolean;
      previousAnnouncements?: number;
      confirmedByFilings?: number;
      accuracy?: string;
    };
    numbersSpecific: boolean;
    purchasePlausible: boolean;
    capitalVerified?: string;
    flaggingCorrect: boolean;
  };

  knownPatternCheck: {
    patternsReviewed: string[];
    issuesFound: string[];
    notes?: string;
  };

  decision: ChallengerDecision;
  decisionType?: "approve_verified" | "approve_provisional";
  conditions?: string[];
  confidence: ConfidenceLevel;

  // For REJECT
  reason?: string;
  evidenceNeeded?: string;

  // For REQUEST_MORE_INFO
  questions?: string[];

  // For ESCALATE
  conflictingSources?: Array<{
    source: string;
    value: number;
    date: string;
  }>;
  recommendation?: string;

  dissent?: string | null;
  notes?: string;
}

/**
 * Review log entry
 */
export interface ReviewLogEntry {
  date: string;
  ticker: string;
  field: DataField;
  currentValue: number;
  proposedValue: number;
  evidenceTier: EvidenceTier;
  proposerAction: ProposerAction;
  challengerDecision: ChallengerDecision;
  outcome: "applied" | "rejected" | "escalated" | "pending";
  notes?: string;
}

/**
 * Validation helpers
 */
export function isValidEvidenceTier(tier: string): tier is EvidenceTier {
  return ["verified", "provisional", "unverified"].includes(tier);
}

export function isValidSourceType(type: string): type is SourceType {
  return [
    "sec-filing",
    "company-dashboard",
    "exchange-filing",
    "press-release",
    "company-announcement",
    "investor-presentation",
    "news-article",
    "aggregator",
    "web-search",
  ].includes(type);
}

export function isTier1Source(type: SourceType): boolean {
  return ["sec-filing", "company-dashboard", "exchange-filing"].includes(type);
}

export function isTier2Source(type: SourceType): boolean {
  return [
    "press-release",
    "company-announcement",
    "investor-presentation",
  ].includes(type);
}

export function isTier3Source(type: SourceType): boolean {
  return ["news-article", "aggregator", "web-search"].includes(type);
}

export function getTierFromSourceType(type: SourceType): EvidenceTier {
  if (isTier1Source(type)) return "verified";
  if (isTier2Source(type)) return "provisional";
  return "unverified";
}
