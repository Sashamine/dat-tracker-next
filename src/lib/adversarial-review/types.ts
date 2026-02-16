/**
 * Adversarial Review System Types
 *
 * These types define the structured output format for the
 * Proposer and Challenger agents in the dual-agent review process.
 *
 * IMPORTANT: Fields marked as MANDATORY CHECKS must be completed
 * before the review can proceed. The system will reject incomplete outputs.
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

// Transaction/MOU status
export type TransactionStatus = "pending" | "executed" | "cancelled" | "unknown";

// Discrepancy resolution action
export type DiscrepancyAction = "resolved" | "dismissed";

/**
 * Discrepancy Resolution
 * Closes the loop by updating the discrepancy status after review.
 *
 * - APPROVE decision → "resolved" (we updated our data to match)
 * - REJECT decision (our data correct) → "dismissed" (aggregator was wrong)
 */
export interface DiscrepancyResolution {
  ticker: string;
  field: string; // Must match discrepancy_field enum: holdings, shares_outstanding, debt, cash, etc.
  action: DiscrepancyAction;
  notes: string;
}

// Fields that can be changed
export type DataField =
  | "holdings"
  | "sharesOutstanding"
  | "sharesOutstandingBasic"
  | "totalDebt"
  | "cashReserves"
  | "restrictedCash"
  | "preferredEquity";

/**
 * =============================================================================
 * MANDATORY CHECK TYPES
 * These checks MUST be completed before a review can proceed.
 * =============================================================================
 */

/**
 * MANDATORY: Data Freshness Check
 * Flags when verified data is stale and acquisition risk is high.
 *
 * Intuition: If the last verified filing is old (>90 days) AND the company
 * has active acquisition signals, we should be MORE suspicious that something
 * happened that isn't yet in our data - even if we found no press releases.
 */
export interface DataFreshnessCheck {
  searchPerformed: true;

  // How old is our data?
  lastVerifiedFilingDate: string;
  daysSinceLastFiling: number;
  isStale: boolean; // true if > 90 days for active acquirers, > 180 days otherwise

  // Acquisition risk factors - things that suggest purchases may have occurred
  acquisitionRiskFactors: {
    hasActiveAcquisitionStrategy: boolean; // Company states BTC/crypto acquisition as strategy
    hasPendingMOUs: boolean; // Announced deals not yet closed
    hasAvailableCapital: boolean; // Shelf registration, ATM, cash on hand
    hasRecentCapitalRaise: boolean; // Raised money in last 90 days
    historicalAcquisitionFrequency: "frequent" | "occasional" | "rare" | "unknown";
  };

  // Risk assessment
  acquisitionRiskLevel: "high" | "medium" | "low";
  riskExplanation: string;

  // If stale + high risk, require explicit acknowledgment
  stalenessAcknowledged: boolean;
  stalenessJustification?: string; // Why we believe no acquisition occurred despite risk factors
}

/**
 * MANDATORY: Press Release Check
 * Must search for announcements since the last verified filing.
 */
export interface PressReleaseCheck {
  searchPerformed: true; // Must be true - enforces the check was done
  lastVerifiedFilingDate: string; // e.g., "2025-09-30"
  searchDate: string; // When this search was performed
  sourcesSearched: string[]; // e.g., ["nasdaq.com/nxtt/press-releases", "company IR page"]

  pressReleasesFound: Array<{
    date: string;
    title: string;
    url?: string;
    relevantToField: boolean;
    summary: string;
  }>;

  // Any announced deals/MOUs that haven't closed yet
  pendingTransactions: Array<{
    description: string;
    dateAnnounced: string;
    expectedValue?: number;
    status: TransactionStatus;
    notes?: string;
  }>;

  // Conclusion: what date have we verified through?
  verifiedThroughDate: string;

  // Did we find anything that affects the proposed value?
  impactsProposal: boolean;
  impactDescription?: string;
}

/**
 * MANDATORY: Stock Split Check
 * Must verify no splits have occurred that would affect the value.
 */
export interface StockSplitCheck {
  searchPerformed: true; // Must be true
  searchDate: string;
  sourcesSearched: string[]; // e.g., ["SEC 8-K filings", "company announcements"]

  splitsFound: Array<{
    date: string;
    ratio: string; // e.g., "200:1 reverse", "4:1 forward"
    effectiveDate: string;
    source: string;
    sourceUrl?: string;
  }>;

  // Is the proposed value adjusted for all splits?
  valueIsAdjusted: boolean;
  adjustmentNotes?: string;
}

/**
 * MANDATORY: Basic vs Diluted Share Verification
 * Required when field involves shares outstanding.
 */
export interface BasicVsDilutedCheck {
  applicable: boolean; // false if field is not shares-related

  // If applicable, these are required:
  searchPerformed?: true;
  valueType?: "basic" | "diluted" | "unknown";

  // Evidence of which type
  evidenceQuote?: string; // Exact quote from source showing basic/diluted
  sourceLocation?: string; // Where in the document

  // For diluted: what's included?
  dilutedIncludes?: {
    stockOptions: boolean;
    convertibleNotes: boolean;
    warrants: boolean;
    other?: string;
  };

  // Verification
  confirmedCorrectType: boolean;
  notes?: string;
}

/**
 * MANDATORY: Dual-Class Share Check
 * Required when field involves shares outstanding.
 */
export interface DualClassCheck {
  applicable: boolean; // false if not shares-related or company is single-class

  // If applicable:
  searchPerformed?: true;
  isDualClass?: boolean;

  shareClasses?: Array<{
    className: string; // e.g., "Class A", "Class B"
    sharesOutstanding: number;
    votingRights?: string;
    source: string;
  }>;

  // Did we sum all classes?
  allClassesSummed?: boolean;
  totalShares?: number;
  notes?: string;
}

/**
 * MANDATORY: Currency Verification
 * Required for all companies, especially foreign ones.
 */
export interface CurrencyCheck {
  searchPerformed: true;
  companyDomicile: string; // e.g., "USA", "Japan", "Sweden"

  reportingCurrency: string; // e.g., "USD", "JPY", "SEK"
  valueInReportingCurrency: number;

  // If conversion needed:
  conversionRequired: boolean;
  conversionRate?: number;
  conversionDate?: string;
  conversionSource?: string;
  valueInUSD: number;

  notes?: string;
}

/**
 * MANDATORY: Source Date Comparison
 * Ensures we're not replacing newer data with older data.
 */
export interface SourceDateCheck {
  searchPerformed: true;

  existingValueDate: string; // Date of our current value's source
  proposedValueDate: string; // Date of the new source

  proposedIsNewer: boolean;

  // If proposed is older, must justify
  olderValueJustification?: string; // e.g., "Existing value was from aggregator, proposed is from SEC"

  notes?: string;
}

/**
 * MANDATORY: Git Provenance Check
 * Must trace where the existing value came from.
 */
export interface GitProvenanceCheck {
  searchPerformed: true;

  // Git history lookup
  existingValueCommit?: string; // Commit hash where current value was set
  existingValueCommitDate?: string;
  existingValueCommitAuthor?: string;
  existingValueCommitMessage?: string;

  // Original source cited
  originalSourceCited: string;
  originalSourceUrl?: string;
  originalSourceType?: SourceType;

  // Is the original source still valid?
  originalSourceStillValid: boolean;
  invalidationReason?: string; // e.g., "Superseded by Q3 filing"

  notes?: string;
}

/**
 * MANDATORY: Pending Verification Status Check
 * Check if current value has pendingVerification flag.
 */
export interface PendingVerificationCheck {
  searchPerformed: true;

  currentValueHasPendingFlag: boolean;

  // If pending, has it been verified?
  verificationStatus?: "verified" | "still_pending" | "contradicted";
  verificationSource?: string;
  verificationDate?: string;

  notes?: string;
}

/**
 * =============================================================================
 * PROPOSER OUTPUT SCHEMA
 * =============================================================================
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

  /**
   * ==========================================================================
   * MANDATORY CHECKS - All must be completed
   * ==========================================================================
   */
  mandatoryChecks: {
    dataFreshnessCheck: DataFreshnessCheck;
    pressReleaseCheck: PressReleaseCheck;
    stockSplitCheck: StockSplitCheck;
    basicVsDilutedCheck: BasicVsDilutedCheck;
    dualClassCheck: DualClassCheck;
    currencyCheck: CurrencyCheck;
    sourceDateCheck: SourceDateCheck;
    gitProvenanceCheck: GitProvenanceCheck;
    pendingVerificationCheck: PendingVerificationCheck;
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
 * =============================================================================
 * CHALLENGER OUTPUT SCHEMA
 * =============================================================================
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

  /**
   * ==========================================================================
   * MANDATORY CHECK VERIFICATIONS
   * Challenger must verify each of the Proposer's mandatory checks
   * ==========================================================================
   */
  mandatoryCheckVerification: {
    dataFreshnessCheck: {
      verified: boolean;
      riskAssessmentAccurate: boolean;
      additionalRiskFactors?: string[];
      stalenessJustificationAccepted: boolean;
      issues?: string[];
    };

    pressReleaseCheck: {
      verified: boolean;
      searchWasThorough: boolean;
      missedAnnouncements: string[];
      notes?: string;
    };

    stockSplitCheck: {
      verified: boolean;
      splitHandledCorrectly: boolean;
      issues?: string[];
    };

    basicVsDilutedCheck: {
      verified: boolean;
      correctTypeUsed: boolean;
      issues?: string[];
    };

    dualClassCheck: {
      verified: boolean;
      allClassesIncluded: boolean;
      issues?: string[];
    };

    currencyCheck: {
      verified: boolean;
      conversionCorrect: boolean;
      issues?: string[];
    };

    sourceDateCheck: {
      verified: boolean;
      dateComparisonCorrect: boolean;
      issues?: string[];
    };

    gitProvenanceCheck: {
      verified: boolean;
      provenanceAccurate: boolean;
      issues?: string[];
    };

    pendingVerificationCheck: {
      verified: boolean;
      statusCorrect: boolean;
      issues?: string[];
    };

    // Overall: did ALL mandatory checks pass?
    allChecksPassed: boolean;
    failedChecks: string[];
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

  /**
   * ==========================================================================
   * DISCREPANCY RESOLUTION
   * Closes the loop by updating the discrepancy that triggered this review.
   * ==========================================================================
   *
   * Required when decision is APPROVE or REJECT.
   * - APPROVE → action: "resolved" (we're updating our data)
   * - REJECT (our data correct) → action: "dismissed" (aggregator was wrong)
   *
   * Not required for REQUEST_MORE_INFO or ESCALATE (review is incomplete).
   */
  discrepancyResolution?: DiscrepancyResolution;
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
  mandatoryChecksPassed: boolean;
  failedChecks?: string[];
  notes?: string;
}

/**
 * =============================================================================
 * VALIDATION FUNCTIONS
 * =============================================================================
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

/**
 * Validates that all mandatory checks in ProposerOutput are complete.
 * Returns an array of failed check names, or empty array if all pass.
 */
export function validateMandatoryChecks(output: ProposerOutput): string[] {
  const failures: string[] = [];
  const checks = output.mandatoryChecks;

  // Data Freshness Check
  if (!checks.dataFreshnessCheck?.searchPerformed) {
    failures.push("dataFreshnessCheck: check not performed");
  }
  if (checks.dataFreshnessCheck?.isStale &&
      checks.dataFreshnessCheck?.acquisitionRiskLevel === "high" &&
      !checks.dataFreshnessCheck?.stalenessAcknowledged) {
    failures.push("dataFreshnessCheck: stale data with high acquisition risk requires acknowledgment");
  }
  if (checks.dataFreshnessCheck?.stalenessAcknowledged &&
      !checks.dataFreshnessCheck?.stalenessJustification) {
    failures.push("dataFreshnessCheck: staleness acknowledged but no justification provided");
  }

  // Press Release Check
  if (!checks.pressReleaseCheck?.searchPerformed) {
    failures.push("pressReleaseCheck: search not performed");
  }
  if (!checks.pressReleaseCheck?.sourcesSearched?.length) {
    failures.push("pressReleaseCheck: no sources searched");
  }
  if (!checks.pressReleaseCheck?.verifiedThroughDate) {
    failures.push("pressReleaseCheck: no verifiedThroughDate");
  }

  // Stock Split Check
  if (!checks.stockSplitCheck?.searchPerformed) {
    failures.push("stockSplitCheck: search not performed");
  }

  // Basic vs Diluted Check (only if shares field)
  const isSharesField = output.proposal.field.includes("shares") ||
                        output.proposal.field === "sharesOutstanding" ||
                        output.proposal.field === "sharesOutstandingBasic";
  if (isSharesField) {
    if (checks.basicVsDilutedCheck?.applicable && !checks.basicVsDilutedCheck?.searchPerformed) {
      failures.push("basicVsDilutedCheck: applicable but search not performed");
    }
    if (checks.basicVsDilutedCheck?.applicable && !checks.basicVsDilutedCheck?.confirmedCorrectType) {
      failures.push("basicVsDilutedCheck: type not confirmed");
    }
  }

  // Dual Class Check (only if shares field)
  if (isSharesField) {
    if (checks.dualClassCheck?.applicable && !checks.dualClassCheck?.searchPerformed) {
      failures.push("dualClassCheck: applicable but search not performed");
    }
  }

  // Currency Check
  if (!checks.currencyCheck?.searchPerformed) {
    failures.push("currencyCheck: search not performed");
  }

  // Source Date Check
  if (!checks.sourceDateCheck?.searchPerformed) {
    failures.push("sourceDateCheck: search not performed");
  }
  if (!checks.sourceDateCheck?.proposedIsNewer && !checks.sourceDateCheck?.olderValueJustification) {
    failures.push("sourceDateCheck: proposed is older but no justification");
  }

  // Git Provenance Check
  if (!checks.gitProvenanceCheck?.searchPerformed) {
    failures.push("gitProvenanceCheck: search not performed");
  }

  // Pending Verification Check
  if (!checks.pendingVerificationCheck?.searchPerformed) {
    failures.push("pendingVerificationCheck: search not performed");
  }

  return failures;
}

/**
 * Validates Challenger's verification of mandatory checks.
 * Returns array of issues found.
 */
export function validateChallengerVerification(output: ChallengerOutput): string[] {
  const issues: string[] = [];
  const verification = output.mandatoryCheckVerification;

  if (!verification.allChecksPassed && verification.failedChecks.length === 0) {
    issues.push("allChecksPassed is false but no failedChecks listed");
  }

  // Each check must be verified
  const checkNames = [
    "dataFreshnessCheck",
    "pressReleaseCheck",
    "stockSplitCheck",
    "basicVsDilutedCheck",
    "dualClassCheck",
    "currencyCheck",
    "sourceDateCheck",
    "gitProvenanceCheck",
    "pendingVerificationCheck",
  ] as const;

  for (const name of checkNames) {
    const check = verification[name];
    if (!check.verified) {
      issues.push(`${name}: not verified by Challenger`);
    }
  }

  // Validate discrepancy resolution for final decisions
  if (output.decision === "APPROVE" || output.decision === "REJECT") {
    if (!output.discrepancyResolution) {
      issues.push("discrepancyResolution: required for APPROVE/REJECT decisions to close the loop");
    } else {
      // Validate resolution matches decision
      if (output.decision === "APPROVE" && output.discrepancyResolution.action !== "resolved") {
        issues.push("discrepancyResolution: APPROVE decision should have action='resolved'");
      }
      if (output.decision === "REJECT" && output.discrepancyResolution.action !== "dismissed") {
        issues.push("discrepancyResolution: REJECT decision should have action='dismissed'");
      }
      if (!output.discrepancyResolution.notes) {
        issues.push("discrepancyResolution: notes are required");
      }
    }
  }

  return issues;
}
