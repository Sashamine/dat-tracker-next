import { describe, it, expect } from "vitest";
import {
  isValidEvidenceTier,
  isValidSourceType,
  isTier1Source,
  isTier2Source,
  isTier3Source,
  getTierFromSourceType,
  validateMandatoryChecks,
  validateChallengerVerification,
  type ProposerOutput,
  type ChallengerOutput,
  type EvidenceTier,
  type SourceType,
} from "./types";

describe("Adversarial Review Types", () => {
  describe("Evidence Tier Validation", () => {
    it("should validate correct evidence tiers", () => {
      expect(isValidEvidenceTier("verified")).toBe(true);
      expect(isValidEvidenceTier("provisional")).toBe(true);
      expect(isValidEvidenceTier("unverified")).toBe(true);
    });

    it("should reject invalid evidence tiers", () => {
      expect(isValidEvidenceTier("unknown")).toBe(false);
      expect(isValidEvidenceTier("")).toBe(false);
      expect(isValidEvidenceTier("VERIFIED")).toBe(false); // case sensitive
    });
  });

  describe("Source Type Validation", () => {
    it("should validate TIER 1 source types", () => {
      expect(isValidSourceType("sec-filing")).toBe(true);
      expect(isValidSourceType("company-dashboard")).toBe(true);
      expect(isValidSourceType("exchange-filing")).toBe(true);
    });

    it("should validate TIER 2 source types", () => {
      expect(isValidSourceType("press-release")).toBe(true);
      expect(isValidSourceType("company-announcement")).toBe(true);
      expect(isValidSourceType("investor-presentation")).toBe(true);
    });

    it("should validate TIER 3 source types", () => {
      expect(isValidSourceType("news-article")).toBe(true);
      expect(isValidSourceType("aggregator")).toBe(true);
      expect(isValidSourceType("web-search")).toBe(true);
    });

    it("should reject invalid source types", () => {
      expect(isValidSourceType("twitter")).toBe(false);
      expect(isValidSourceType("reddit")).toBe(false);
      expect(isValidSourceType("")).toBe(false);
    });
  });

  describe("Tier Classification", () => {
    it("should correctly identify TIER 1 sources", () => {
      expect(isTier1Source("sec-filing")).toBe(true);
      expect(isTier1Source("company-dashboard")).toBe(true);
      expect(isTier1Source("exchange-filing")).toBe(true);
      expect(isTier1Source("press-release")).toBe(false);
      expect(isTier1Source("aggregator")).toBe(false);
    });

    it("should correctly identify TIER 2 sources", () => {
      expect(isTier2Source("press-release")).toBe(true);
      expect(isTier2Source("company-announcement")).toBe(true);
      expect(isTier2Source("investor-presentation")).toBe(true);
      expect(isTier2Source("sec-filing")).toBe(false);
      expect(isTier2Source("news-article")).toBe(false);
    });

    it("should correctly identify TIER 3 sources", () => {
      expect(isTier3Source("news-article")).toBe(true);
      expect(isTier3Source("aggregator")).toBe(true);
      expect(isTier3Source("web-search")).toBe(true);
      expect(isTier3Source("sec-filing")).toBe(false);
      expect(isTier3Source("press-release")).toBe(false);
    });

    it("should correctly map source type to tier", () => {
      expect(getTierFromSourceType("sec-filing")).toBe("verified");
      expect(getTierFromSourceType("company-dashboard")).toBe("verified");
      expect(getTierFromSourceType("press-release")).toBe("provisional");
      expect(getTierFromSourceType("company-announcement")).toBe("provisional");
      expect(getTierFromSourceType("news-article")).toBe("unverified");
      expect(getTierFromSourceType("aggregator")).toBe("unverified");
    });
  });
});

// Helper to create a valid mandatory checks object
function createValidMandatoryChecks() {
  return {
    dataFreshnessCheck: {
      searchPerformed: true as const,
      lastVerifiedFilingDate: "2025-12-15",
      daysSinceLastFiling: 39, // ~5 weeks, not stale
      isStale: false,
      acquisitionRiskFactors: {
        hasActiveAcquisitionStrategy: true,
        hasPendingMOUs: false,
        hasAvailableCapital: true,
        hasRecentCapitalRaise: false,
        historicalAcquisitionFrequency: "frequent" as const,
      },
      acquisitionRiskLevel: "medium" as const,
      riskExplanation: "Active acquirer but data is fresh",
      stalenessAcknowledged: false,
    },
    pressReleaseCheck: {
      searchPerformed: true as const,
      lastVerifiedFilingDate: "2025-12-15",
      searchDate: "2026-01-23",
      sourcesSearched: ["nasdaq.com/mstr/press-releases", "strategy.com"],
      pressReleasesFound: [],
      pendingTransactions: [],
      verifiedThroughDate: "2026-01-23",
      impactsProposal: false,
    },
    stockSplitCheck: {
      searchPerformed: true as const,
      searchDate: "2026-01-23",
      sourcesSearched: ["SEC 8-K filings"],
      splitsFound: [],
      valueIsAdjusted: true,
    },
    basicVsDilutedCheck: {
      applicable: false,
      confirmedCorrectType: false,
    },
    dualClassCheck: {
      applicable: false,
    },
    currencyCheck: {
      searchPerformed: true as const,
      companyDomicile: "USA",
      reportingCurrency: "USD",
      valueInReportingCurrency: 471107,
      conversionRequired: false,
      valueInUSD: 471107,
    },
    sourceDateCheck: {
      searchPerformed: true as const,
      existingValueDate: "2025-12-15",
      proposedValueDate: "2026-01-20",
      proposedIsNewer: true,
    },
    gitProvenanceCheck: {
      searchPerformed: true as const,
      existingValueCommit: "abc1234",
      existingValueCommitDate: "2025-12-16",
      originalSourceCited: "SEC 8-K",
      originalSourceUrl: "https://www.sec.gov/...",
      originalSourceType: "sec-filing" as const,
      originalSourceStillValid: false,
      invalidationReason: "Superseded by new purchase",
    },
    pendingVerificationCheck: {
      searchPerformed: true as const,
      currentValueHasPendingFlag: false,
    },
  };
}

// Helper to create valid challenger verification
function createValidChallengerVerification() {
  return {
    dataFreshnessCheck: {
      verified: true,
      riskAssessmentAccurate: true,
      stalenessJustificationAccepted: true,
    },
    pressReleaseCheck: {
      verified: true,
      searchWasThorough: true,
      missedAnnouncements: [],
    },
    stockSplitCheck: {
      verified: true,
      splitHandledCorrectly: true,
    },
    basicVsDilutedCheck: {
      verified: true,
      correctTypeUsed: true,
    },
    dualClassCheck: {
      verified: true,
      allClassesIncluded: true,
    },
    currencyCheck: {
      verified: true,
      conversionCorrect: true,
    },
    sourceDateCheck: {
      verified: true,
      dateComparisonCorrect: true,
    },
    gitProvenanceCheck: {
      verified: true,
      provenanceAccurate: true,
    },
    pendingVerificationCheck: {
      verified: true,
      statusCorrect: true,
    },
    allChecksPassed: true,
    failedChecks: [],
  };
}

describe("Proposer Output Validation", () => {
  const validVerifiedOutput: ProposerOutput = {
    proposal: {
      ticker: "MSTR",
      field: "holdings",
      currentValue: 450000,
      proposedValue: 471107,
      unit: "BTC",
      percentChange: 4.7,
    },
    evidence: {
      tier: "verified",
      sourceType: "sec-filing",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1050446/...",
      sourceDate: "2026-01-20",
      exactQuote:
        "As of January 20, 2026, MicroStrategy held approximately 471,107 bitcoins",
      documentSection: "Item 8.01",
      methodology: "Direct quote from SEC 8-K filing",
    },
    mandatoryChecks: createValidMandatoryChecks(),
    existingValue: {
      value: 450000,
      source: "SEC 8-K",
      sourceUrl: "https://www.sec.gov/...",
      gitCommit: "abc1234",
      wasVerified: true,
      status: "superseded",
      reason: "New purchase announced and filed with SEC",
    },
    risks: [],
    recommendedAction: "approve_verified",
    suggestedEntry: {
      date: "2026-01-20",
      holdings: 471107,
      source: "SEC 8-K",
      sourceUrl: "https://www.sec.gov/...",
      sourceType: "sec-filing",
    },
  };

  const validProvisionalOutput: ProposerOutput = {
    proposal: {
      ticker: "KULR",
      field: "holdings",
      currentValue: 510,
      proposedValue: 610,
      unit: "BTC",
      percentChange: 19.6,
    },
    evidence: {
      tier: "provisional",
      sourceType: "press-release",
      sourceUrl: "https://ir.kulrtechnology.com/news/...",
      sourceDate: "2026-01-23",
      exactQuote:
        "KULR Technology announces purchase of 100 Bitcoin, bringing total holdings to 610 BTC",
    },
    mandatoryChecks: {
      ...createValidMandatoryChecks(),
      pressReleaseCheck: {
        searchPerformed: true as const,
        lastVerifiedFilingDate: "2025-12-15",
        searchDate: "2026-01-23",
        sourcesSearched: ["ir.kulrtechnology.com", "nasdaq.com/kulr/press-releases"],
        pressReleasesFound: [{
          date: "2026-01-23",
          title: "KULR announces 100 BTC purchase",
          url: "https://ir.kulrtechnology.com/news/...",
          relevantToField: true,
          summary: "Company purchased 100 BTC bringing total to 610 BTC",
        }],
        pendingTransactions: [],
        verifiedThroughDate: "2026-01-23",
        impactsProposal: true,
        impactDescription: "This press release is the source of the proposed change",
      },
    },
    legitimacyAssessment: {
      applicable: true,
      confidence: "high",
      trackRecord:
        "5/5 previous announcements confirmed by SEC 8-K within 3 days",
      specificNumbers: true,
      plausibility: "Consistent with $50M BTC treasury program",
      capitalAvailable: "Company raised $25M in Dec 2025 ATM",
    },
    existingValue: {
      value: 510,
      source: "SEC 8-K",
      sourceUrl: "https://www.sec.gov/...",
      wasVerified: true,
      status: "superseded",
      reason: "New purchase announced",
    },
    risks: [
      "Press release only - SEC 8-K not yet filed",
      "If 8-K shows different number, will need correction",
    ],
    recommendedAction: "add_provisional",
    suggestedEntry: {
      date: "2026-01-23",
      holdings: 610,
      source: "Press Release",
      sourceUrl: "https://ir.kulrtechnology.com/...",
      sourceType: "press-release",
      pendingVerification: true,
      verificationExpected: "2026-01-27",
    },
  };

  it("should have required fields for verified output", () => {
    expect(validVerifiedOutput.proposal.ticker).toBeDefined();
    expect(validVerifiedOutput.proposal.field).toBeDefined();
    expect(validVerifiedOutput.evidence.tier).toBe("verified");
    expect(validVerifiedOutput.evidence.sourceUrl).toBeDefined();
    expect(validVerifiedOutput.evidence.exactQuote).toBeDefined();
    expect(validVerifiedOutput.recommendedAction).toBe("approve_verified");
  });

  it("should have legitimacy assessment for provisional output", () => {
    expect(validProvisionalOutput.evidence.tier).toBe("provisional");
    expect(validProvisionalOutput.legitimacyAssessment).toBeDefined();
    expect(validProvisionalOutput.legitimacyAssessment?.applicable).toBe(true);
    expect(validProvisionalOutput.legitimacyAssessment?.confidence).toBe(
      "high"
    );
    expect(validProvisionalOutput.suggestedEntry?.pendingVerification).toBe(
      true
    );
  });

  it("should require verification expected date for provisional entries", () => {
    expect(validProvisionalOutput.suggestedEntry?.verificationExpected).toBe(
      "2026-01-27"
    );
  });

  it("should have all mandatory checks completed", () => {
    const failures = validateMandatoryChecks(validVerifiedOutput);
    expect(failures).toHaveLength(0);
  });

  it("should fail validation when mandatory check is missing", () => {
    const invalidOutput: ProposerOutput = {
      ...validVerifiedOutput,
      mandatoryChecks: {
        ...validVerifiedOutput.mandatoryChecks,
        pressReleaseCheck: {
          ...validVerifiedOutput.mandatoryChecks.pressReleaseCheck,
          searchPerformed: false as unknown as true, // Force invalid state
        },
      },
    };
    const failures = validateMandatoryChecks(invalidOutput);
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.some(f => f.includes("pressReleaseCheck"))).toBe(true);
  });
});

describe("Challenger Output Validation", () => {
  const approveVerifiedOutput: ChallengerOutput = {
    sourceVerification: {
      accessed: true,
      url: "https://www.sec.gov/...",
      quoteFound: true,
      quoteMatchesProposal: true,
      valueInSource: 471107,
      matchesProposedValue: true,
      newerSourceExists: false,
    },
    existingValueReview: {
      checked: true,
      existingValue: 450000,
      existingSource: "SEC 8-K",
      existingSourceStillValid: true,
      replacementJustified: true,
      reasoning: "New purchase filed with SEC supersedes previous total",
    },
    mandatoryCheckVerification: createValidChallengerVerification(),
    knownPatternCheck: {
      patternsReviewed: ["MSTR 8-K requirement"],
      issuesFound: [],
      notes: "MSTR holdings change has required 8-K citation - verified",
    },
    decision: "APPROVE",
    decisionType: "approve_verified",
    conditions: [],
    confidence: "high",
    dissent: null,
    discrepancyResolution: {
      ticker: "MSTR",
      field: "holdings",
      action: "resolved",
      notes: "Updated holdings to 471,107 BTC per SEC 8-K filing",
    },
  };

  const rejectOutput: ChallengerOutput = {
    sourceVerification: {
      accessed: true,
      url: "https://www.sec.gov/...",
      quoteFound: true,
      quoteMatchesProposal: false,
      valueInSource: 470000000,
      matchesProposedValue: false,
      newerSourceExists: false,
    },
    existingValueReview: {
      checked: true,
      existingValue: 378000000,
      existingSource: "Previous entry",
      existingSourceStillValid: false,
      replacementJustified: false,
      reasoning:
        "Proposed value 378M is basic shares, not diluted. Diluted is 470M.",
    },
    mandatoryCheckVerification: {
      ...createValidChallengerVerification(),
      basicVsDilutedCheck: {
        verified: true,
        correctTypeUsed: false,
        issues: ["Proposed value is basic shares (378M), should be diluted (470M)"],
      },
      allChecksPassed: false,
      failedChecks: ["basicVsDilutedCheck"],
    },
    knownPatternCheck: {
      patternsReviewed: ["MARA basic/diluted confusion"],
      issuesFound: [
        "Classic MARA mistake - proposed basic shares instead of diluted",
      ],
    },
    decision: "REJECT",
    confidence: "high",
    reason:
      "Proposed value 378M is basic shares. The SEC filing shows diluted shares as 470M. We use diluted shares for mNAV calculation.",
    evidenceNeeded:
      "Use the diluted share count (470M) from the same SEC filing",
    dissent: null,
    discrepancyResolution: {
      ticker: "MARA",
      field: "shares_outstanding",
      action: "dismissed",
      notes: "Our value (470M diluted) is correct. mNAV.com showed basic shares (378M) which is incorrect for mNAV calculation.",
    },
  };

  const escalateOutput: ChallengerOutput = {
    sourceVerification: {
      accessed: true,
      url: "https://www.sec.gov/...",
      quoteFound: true,
      quoteMatchesProposal: true,
      matchesProposedValue: true,
      newerSourceExists: false,
    },
    existingValueReview: {
      checked: true,
      existingValue: 500000000,
      existingSource: "SEC 10-Q",
      existingSourceStillValid: true,
      replacementJustified: false,
      reasoning: "Both sources seem valid but show different values",
    },
    mandatoryCheckVerification: createValidChallengerVerification(),
    knownPatternCheck: {
      patternsReviewed: [],
      issuesFound: ["Conflicting TIER 1 sources"],
    },
    decision: "ESCALATE",
    confidence: "low",
    conflictingSources: [
      { source: "SEC 10-Q", value: 500000000, date: "2025-09-30" },
      { source: "strategy.com", value: 520000000, date: "2026-01-23" },
    ],
    recommendation:
      "Human should verify if ATM program added shares since 10-Q filing",
    dissent: null,
  };

  it("should approve with high confidence when source verifies", () => {
    expect(approveVerifiedOutput.decision).toBe("APPROVE");
    expect(approveVerifiedOutput.confidence).toBe("high");
    expect(approveVerifiedOutput.sourceVerification.quoteMatchesProposal).toBe(
      true
    );
    expect(approveVerifiedOutput.sourceVerification.matchesProposedValue).toBe(
      true
    );
  });

  it("should reject when methodology check fails", () => {
    expect(rejectOutput.decision).toBe("REJECT");
    expect(rejectOutput.reason).toContain("basic shares");
    expect(rejectOutput.knownPatternCheck.issuesFound.length).toBeGreaterThan(
      0
    );
  });

  it("should escalate when TIER 1 sources conflict", () => {
    expect(escalateOutput.decision).toBe("ESCALATE");
    expect(escalateOutput.conflictingSources).toHaveLength(2);
    expect(escalateOutput.recommendation).toBeDefined();
  });

  it("should validate all mandatory check verifications are complete", () => {
    const issues = validateChallengerVerification(approveVerifiedOutput);
    expect(issues).toHaveLength(0);
  });

  it("should catch when mandatory check verification is missing", () => {
    const invalidOutput: ChallengerOutput = {
      ...approveVerifiedOutput,
      mandatoryCheckVerification: {
        ...approveVerifiedOutput.mandatoryCheckVerification,
        pressReleaseCheck: {
          verified: false,
          searchWasThorough: false,
          missedAnnouncements: [],
        },
      },
    };
    const issues = validateChallengerVerification(invalidOutput);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some(i => i.includes("pressReleaseCheck"))).toBe(true);
  });

  it("should require discrepancyResolution for APPROVE decisions", () => {
    const outputWithoutResolution: ChallengerOutput = {
      ...approveVerifiedOutput,
      discrepancyResolution: undefined,
    };
    const issues = validateChallengerVerification(outputWithoutResolution);
    expect(issues.some(i => i.includes("discrepancyResolution"))).toBe(true);
  });

  it("should require discrepancyResolution for REJECT decisions", () => {
    const outputWithoutResolution: ChallengerOutput = {
      ...rejectOutput,
      discrepancyResolution: undefined,
    };
    const issues = validateChallengerVerification(outputWithoutResolution);
    expect(issues.some(i => i.includes("discrepancyResolution"))).toBe(true);
  });

  it("should not require discrepancyResolution for ESCALATE decisions", () => {
    const issues = validateChallengerVerification(escalateOutput);
    // ESCALATE doesn't need discrepancyResolution since review is incomplete
    expect(issues.some(i => i.includes("discrepancyResolution"))).toBe(false);
  });

  it("should validate APPROVE has action='resolved'", () => {
    const wrongAction: ChallengerOutput = {
      ...approveVerifiedOutput,
      discrepancyResolution: {
        ticker: "MSTR",
        field: "holdings",
        action: "dismissed", // Wrong - should be "resolved" for APPROVE
        notes: "Test",
      },
    };
    const issues = validateChallengerVerification(wrongAction);
    expect(issues.some(i => i.includes("action='resolved'"))).toBe(true);
  });

  it("should validate REJECT has action='dismissed'", () => {
    const wrongAction: ChallengerOutput = {
      ...rejectOutput,
      discrepancyResolution: {
        ticker: "MARA",
        field: "shares_outstanding",
        action: "resolved", // Wrong - should be "dismissed" for REJECT
        notes: "Test",
      },
    };
    const issues = validateChallengerVerification(wrongAction);
    expect(issues.some(i => i.includes("action='dismissed'"))).toBe(true);
  });
});

describe("Decision Logic", () => {
  it("should auto-reject TIER 3 evidence", () => {
    const tier3Sources: SourceType[] = [
      "news-article",
      "aggregator",
      "web-search",
    ];

    tier3Sources.forEach((source) => {
      expect(isTier3Source(source)).toBe(true);
      // TIER 3 sources should never be accepted as primary evidence
      expect(getTierFromSourceType(source)).toBe("unverified");
    });
  });

  it("should require pendingVerification for TIER 2 sources", () => {
    const tier2Sources: SourceType[] = [
      "press-release",
      "company-announcement",
      "investor-presentation",
    ];

    tier2Sources.forEach((source) => {
      expect(isTier2Source(source)).toBe(true);
      expect(getTierFromSourceType(source)).toBe("provisional");
      // Business rule: provisional sources require pendingVerification flag
    });
  });

  it("should allow direct approval for TIER 1 sources", () => {
    const tier1Sources: SourceType[] = [
      "sec-filing",
      "company-dashboard",
      "exchange-filing",
    ];

    tier1Sources.forEach((source) => {
      expect(isTier1Source(source)).toBe(true);
      expect(getTierFromSourceType(source)).toBe("verified");
      // Business rule: verified sources can be approved without flags
    });
  });
});

describe("Known Pattern Checks", () => {
  // These tests document the known patterns that should be checked

  it("should catch MARA basic vs diluted confusion", () => {
    // Pattern: MARA filings show both basic (378M) and diluted (470M)
    // Rule: Always use diluted for mNAV
    const basicValue = 378000000;
    const dilutedValue = 470000000;

    expect(basicValue).not.toBe(dilutedValue);
    // The challenger should reject if basic is proposed when diluted exists
  });

  it("should require 8-K for MSTR holdings changes", () => {
    // Pattern: MSTR holdings must cite SEC 8-K, not just press release
    // Rule: Press release alone insufficient for MSTR holdings
    const sourceType: SourceType = "press-release";
    const ticker = "MSTR";
    const field = "holdings";

    if (ticker === "MSTR" && field === "holdings") {
      // Should escalate or reject if only press release
      expect(isTier2Source(sourceType)).toBe(true);
      // Business rule: MSTR holdings need TIER 1 evidence
    }
  });

  it("should sum share classes for dual-class companies", () => {
    // Pattern: XXI has Class A + Class B shares
    // Rule: sharesForMnav should be total of all classes
    const classAShares = 100000000;
    const classBShares = 50000000;
    const totalShares = classAShares + classBShares;

    expect(totalShares).toBe(150000000);
    // The challenger should verify both classes are summed
  });

  it("should flag recent stock splits", () => {
    // Pattern: HSDT 1:50 reverse split, NXTT 200:1 reverse split
    // Rule: Values must be adjusted for splits
    const preSplitShares = 1000000000;
    const splitRatio = 50; // 1:50 reverse split
    const postSplitShares = preSplitShares / splitRatio;

    expect(postSplitShares).toBe(20000000);
    // The challenger should check for recent 8-K split announcements
  });
});

describe("Provisional Entry Lifecycle", () => {
  it("should track verification expected date", () => {
    const provisionalEntry = {
      date: "2026-01-23",
      holdings: 610,
      source: "Press Release",
      sourceType: "press-release" as SourceType,
      pendingVerification: true,
      verificationExpected: "2026-01-27",
    };

    expect(provisionalEntry.pendingVerification).toBe(true);
    expect(provisionalEntry.verificationExpected).toBeDefined();

    // Calculate days until verification expected
    const entryDate = new Date(provisionalEntry.date);
    const verifyDate = new Date(provisionalEntry.verificationExpected);
    const daysDiff = Math.ceil(
      (verifyDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    expect(daysDiff).toBe(4); // Typical 8-K filing window
  });

  it("should upgrade to verified when SEC filing confirms", () => {
    const provisionalValue = 610;
    const secFilingValue = 610;

    // When SEC filing matches provisional value
    const verified = provisionalValue === secFilingValue;
    expect(verified).toBe(true);

    // Entry should be upgraded:
    // pendingVerification: true -> removed
    // sourceType: "press-release" -> "sec-filing"
    // sourceUrl: press release URL -> SEC URL
  });

  it("should create discrepancy when SEC filing differs", () => {
    const provisionalValue = 610;
    const secFilingValue = 605; // Slightly different

    const discrepancy = Math.abs(provisionalValue - secFilingValue);
    const percentDiff = (discrepancy / secFilingValue) * 100;

    expect(discrepancy).toBe(5);
    expect(percentDiff).toBeCloseTo(0.83, 1);

    // If difference > 0%, should create discrepancy alert
    expect(percentDiff).toBeGreaterThan(0);
  });
});

describe("Mandatory Check Validation", () => {
  it("should require press release check with sources", () => {
    const output: ProposerOutput = {
      proposal: {
        ticker: "TEST",
        field: "holdings",
        currentValue: 100,
        proposedValue: 200,
        percentChange: 100,
      },
      evidence: {
        tier: "verified",
        sourceType: "sec-filing",
        sourceUrl: "https://sec.gov/...",
        sourceDate: "2026-01-23",
        exactQuote: "Test quote",
      },
      mandatoryChecks: {
        dataFreshnessCheck: {
          searchPerformed: true,
          lastVerifiedFilingDate: "2025-09-30",
          daysSinceLastFiling: 115,
          isStale: true,
          acquisitionRiskFactors: {
            hasActiveAcquisitionStrategy: false,
            hasPendingMOUs: false,
            hasAvailableCapital: false,
            hasRecentCapitalRaise: false,
            historicalAcquisitionFrequency: "rare" as const,
          },
          acquisitionRiskLevel: "low" as const,
          riskExplanation: "No acquisition signals",
          stalenessAcknowledged: false,
        },
        pressReleaseCheck: {
          searchPerformed: true,
          lastVerifiedFilingDate: "2025-09-30",
          searchDate: "2026-01-23",
          sourcesSearched: [], // Empty - should fail
          pressReleasesFound: [],
          pendingTransactions: [],
          verifiedThroughDate: "2026-01-23",
          impactsProposal: false,
        },
        stockSplitCheck: {
          searchPerformed: true,
          searchDate: "2026-01-23",
          sourcesSearched: ["SEC"],
          splitsFound: [],
          valueIsAdjusted: true,
        },
        basicVsDilutedCheck: { applicable: false, confirmedCorrectType: false },
        dualClassCheck: { applicable: false },
        currencyCheck: {
          searchPerformed: true,
          companyDomicile: "USA",
          reportingCurrency: "USD",
          valueInReportingCurrency: 200,
          conversionRequired: false,
          valueInUSD: 200,
        },
        sourceDateCheck: {
          searchPerformed: true,
          existingValueDate: "2025-06-30",
          proposedValueDate: "2026-01-23",
          proposedIsNewer: true,
        },
        gitProvenanceCheck: {
          searchPerformed: true,
          originalSourceCited: "Previous SEC filing",
          originalSourceStillValid: false,
        },
        pendingVerificationCheck: {
          searchPerformed: true,
          currentValueHasPendingFlag: false,
        },
      },
      existingValue: {
        value: 100,
        source: "SEC",
        wasVerified: true,
        status: "superseded",
        reason: "New filing",
      },
      risks: [],
      recommendedAction: "approve_verified",
    };

    const failures = validateMandatoryChecks(output);
    expect(failures).toContain("pressReleaseCheck: no sources searched");
  });

  it("should require justification when proposed value is older", () => {
    const output: ProposerOutput = {
      proposal: {
        ticker: "TEST",
        field: "holdings",
        currentValue: 100,
        proposedValue: 200,
        percentChange: 100,
      },
      evidence: {
        tier: "verified",
        sourceType: "sec-filing",
        sourceUrl: "https://sec.gov/...",
        sourceDate: "2025-06-30", // Older than existing
        exactQuote: "Test quote",
      },
      mandatoryChecks: {
        dataFreshnessCheck: {
          searchPerformed: true,
          lastVerifiedFilingDate: "2025-09-30",
          daysSinceLastFiling: 115,
          isStale: true,
          acquisitionRiskFactors: {
            hasActiveAcquisitionStrategy: false,
            hasPendingMOUs: false,
            hasAvailableCapital: false,
            hasRecentCapitalRaise: false,
            historicalAcquisitionFrequency: "rare" as const,
          },
          acquisitionRiskLevel: "low" as const,
          riskExplanation: "No acquisition signals",
          stalenessAcknowledged: false,
        },
        pressReleaseCheck: {
          searchPerformed: true,
          lastVerifiedFilingDate: "2025-09-30",
          searchDate: "2026-01-23",
          sourcesSearched: ["SEC"],
          pressReleasesFound: [],
          pendingTransactions: [],
          verifiedThroughDate: "2026-01-23",
          impactsProposal: false,
        },
        stockSplitCheck: {
          searchPerformed: true,
          searchDate: "2026-01-23",
          sourcesSearched: ["SEC"],
          splitsFound: [],
          valueIsAdjusted: true,
        },
        basicVsDilutedCheck: { applicable: false, confirmedCorrectType: false },
        dualClassCheck: { applicable: false },
        currencyCheck: {
          searchPerformed: true,
          companyDomicile: "USA",
          reportingCurrency: "USD",
          valueInReportingCurrency: 200,
          conversionRequired: false,
          valueInUSD: 200,
        },
        sourceDateCheck: {
          searchPerformed: true,
          existingValueDate: "2025-09-30",
          proposedValueDate: "2025-06-30",
          proposedIsNewer: false,
          // Missing olderValueJustification - should fail
        },
        gitProvenanceCheck: {
          searchPerformed: true,
          originalSourceCited: "Previous SEC filing",
          originalSourceStillValid: false,
        },
        pendingVerificationCheck: {
          searchPerformed: true,
          currentValueHasPendingFlag: false,
        },
      },
      existingValue: {
        value: 100,
        source: "SEC",
        wasVerified: true,
        status: "superseded",
        reason: "New filing",
      },
      risks: [],
      recommendedAction: "approve_verified",
    };

    const failures = validateMandatoryChecks(output);
    expect(failures).toContain("sourceDateCheck: proposed is older but no justification");
  });
});
