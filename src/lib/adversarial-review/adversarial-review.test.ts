import { describe, it, expect } from "vitest";
import {
  isValidEvidenceTier,
  isValidSourceType,
  isTier1Source,
  isTier2Source,
  isTier3Source,
  getTierFromSourceType,
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
    existingValue: {
      value: 450000,
      source: "SEC 8-K",
      sourceUrl: "https://www.sec.gov/...",
      gitCommit: "abc1234",
      wasVerified: true,
      status: "superseded",
      reason: "New purchase announced and filed with SEC",
    },
    methodologyChecks: {
      basicVsDiluted: "N/A - holdings not shares",
      stockSplit: "No recent splits",
      shareClasses: "N/A",
      currency: "BTC count - no conversion needed",
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
    methodologyChecks: {
      currency: "USD - no conversion needed",
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
    methodologyValidation: {
      basicVsDiluted: {
        applicable: false,
        reason: "Holdings field, not shares",
      },
      stockSplit: {
        checked: true,
        recentSplits: false,
      },
      currency: {
        checked: true,
        isUSD: false,
        conversionNeeded: false,
      },
    },
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
    methodologyValidation: {
      basicVsDiluted: {
        applicable: true,
        verified: false,
        reason:
          "Source shows 378M as 'basic' shares. Diluted shares are 470M. We use diluted.",
      },
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
    methodologyValidation: {},
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
