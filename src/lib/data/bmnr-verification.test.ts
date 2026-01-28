import { describe, it, expect } from "vitest";
import {
  runBMNRVerification,
  getBMNRDiscrepancies,
  verifyBMNRQuarterByDate,
  getUnverifiedDataPoints,
  type BMNRVerificationReport,
  type BMNRQuarterVerification,
} from "./bmnr-verification";
import { BMNR_SEC_HISTORY } from "./bmnr-sec-history";

describe("BMNR Verification Engine", () => {
  describe("Full Verification Report", () => {
    it("should generate report for all quarters", () => {
      const report = runBMNRVerification();

      expect(report.generated).toBeTruthy();
      expect(report.quarters.length).toBe(BMNR_SEC_HISTORY.length);
      expect(report.summary).toBeDefined();
      expect(report.auditFindings).toBeDefined();
    });

    it("should track total quarters count", () => {
      const report = runBMNRVerification();

      expect(report.summary.totalQuarters).toBe(9); // 9 quarters in SEC history
    });

    it("should calculate verification rate", () => {
      const report = runBMNRVerification();

      expect(report.summary.verificationRate).toBeGreaterThanOrEqual(0);
      expect(report.summary.verificationRate).toBeLessThanOrEqual(1);
    });
  });

  describe("Fiscal Quarter Labels", () => {
    it("should correctly label Q1 FY2026 (Nov 2025)", () => {
      const verification = verifyBMNRQuarterByDate("2025-11-30");

      expect(verification).toBeDefined();
      expect(verification!.quarter).toBe("Q1 FY2026");
      expect(verification!.fiscalYear).toBe("FY2026");
    });

    it("should correctly label FY2025 (Aug 2025)", () => {
      const verification = verifyBMNRQuarterByDate("2025-08-31");

      expect(verification).toBeDefined();
      expect(verification!.quarter).toBe("Q4 FY2025");
      expect(verification!.fiscalYear).toBe("FY2025");
    });

    it("should correctly label Q3 FY2025 (May 2025)", () => {
      const verification = verifyBMNRQuarterByDate("2025-05-31");

      expect(verification).toBeDefined();
      expect(verification!.quarter).toBe("Q3 FY2025");
      expect(verification!.fiscalYear).toBe("FY2025");
    });

    it("should correctly label Q2 FY2025 (Feb 2025)", () => {
      const verification = verifyBMNRQuarterByDate("2025-02-28");

      expect(verification).toBeDefined();
      expect(verification!.quarter).toBe("Q2 FY2025");
      expect(verification!.fiscalYear).toBe("FY2025");
    });
  });

  describe("ETH Holdings Verification", () => {
    it("should verify Q1 FY2026 ETH holdings", () => {
      const verification = verifyBMNRQuarterByDate("2025-11-30");

      expect(verification).toBeDefined();
      expect(verification!.eth.xbrlHoldings).toBe(3_737_140);
      expect(verification!.eth.pressReleaseHoldings).toBeDefined();
      expect(verification!.eth.verified).toBe(true);
    });

    it("should flag pre-ETH strategy periods with zero holdings", () => {
      const report = runBMNRVerification();
      const preETHQuarters = report.quarters.filter(
        (q) => new Date(q.periodEnd) < new Date("2025-07-01")
      );

      expect(preETHQuarters.length).toBeGreaterThan(0);
      // Pre-ETH periods should have 0 or null ETH
      preETHQuarters.forEach((q) => {
        expect(q.eth.xbrlHoldings === 0 || q.eth.xbrlHoldings === null).toBe(true);
      });
    });

    it("should calculate ETH discrepancy correctly", () => {
      const verification = verifyBMNRQuarterByDate("2025-11-30");

      if (verification!.eth.discrepancy !== null) {
        expect(verification!.eth.discrepancy).toBe(
          verification!.eth.xbrlHoldings! - verification!.eth.pressReleaseHoldings!
        );
        expect(verification!.eth.discrepancyPct).toBe(
          verification!.eth.discrepancy / verification!.eth.xbrlHoldings!
        );
      }
    });

    it("should identify ETH data source correctly", () => {
      const verification = verifyBMNRQuarterByDate("2025-11-30");

      expect(verification!.verification.ethSource).toBe("SEC XBRL");
    });
  });

  describe("Shares Verification", () => {
    it("should verify shares against XBRL", () => {
      const verification = verifyBMNRQuarterByDate("2025-11-30");

      expect(verification!.shares.xbrlShares).toBe(408_578_823); // From SEC 10-Q Q1 FY2026
      expect(verification!.shares.pressReleaseShares).toBeDefined();
    });

    it("should detect round number estimates", () => {
      const report = runBMNRVerification();

      // Check quarters where press releases used round numbers (400M, 455M)
      const roundNumberQuarters = report.quarters.filter(
        (q) =>
          q.shares.notes?.includes("round number") ||
          q.shares.notes?.includes("estimated")
      );

      expect(roundNumberQuarters.length).toBeGreaterThan(0);
    });

    it("should calculate share discrepancy correctly", () => {
      const verification = verifyBMNRQuarterByDate("2025-11-30");

      if (verification!.shares.discrepancy !== null) {
        expect(verification!.shares.discrepancy).toBe(
          verification!.shares.xbrlShares! - verification!.shares.pressReleaseShares!
        );
        expect(verification!.shares.discrepancyPct).toBe(
          verification!.shares.discrepancy / verification!.shares.xbrlShares!
        );
      }
    });

    it("should always have XBRL shares source", () => {
      const report = runBMNRVerification();

      report.quarters.forEach((q) => {
        expect(q.verification.sharesSource).toBe("SEC XBRL");
      });
    });
  });

  describe("Verification Status Thresholds", () => {
    it("should mark <5% discrepancy as pass", () => {
      const report = runBMNRVerification();
      const passQuarters = report.quarters.filter(
        (q) =>
          (q.eth.status === "pass" || q.shares.status === "pass") &&
          (q.eth.discrepancyPct !== null || q.shares.discrepancyPct !== null)
      );

      passQuarters.forEach((q) => {
        if (q.eth.status === "pass" && q.eth.discrepancyPct !== null) {
          expect(Math.abs(q.eth.discrepancyPct)).toBeLessThanOrEqual(0.05);
        }
        if (q.shares.status === "pass" && q.shares.discrepancyPct !== null) {
          expect(Math.abs(q.shares.discrepancyPct)).toBeLessThanOrEqual(0.05);
        }
      });
    });

    it("should mark 5-20% discrepancy as warn", () => {
      const report = runBMNRVerification();
      const warnQuarters = report.quarters.filter(
        (q) => q.eth.status === "warn" || q.shares.status === "warn"
      );

      warnQuarters.forEach((q) => {
        if (q.eth.status === "warn") {
          expect(Math.abs(q.eth.discrepancyPct!)).toBeGreaterThan(0.05);
          expect(Math.abs(q.eth.discrepancyPct!)).toBeLessThanOrEqual(0.20);
        }
        if (q.shares.status === "warn") {
          expect(Math.abs(q.shares.discrepancyPct!)).toBeGreaterThan(0.05);
          expect(Math.abs(q.shares.discrepancyPct!)).toBeLessThanOrEqual(0.15); // Shares use 15% threshold
        }
      });
    });

    it("should mark >20% discrepancy as fail", () => {
      const report = runBMNRVerification();
      const failQuarters = report.quarters.filter(
        (q) => q.eth.status === "fail" || q.shares.status === "fail"
      );

      failQuarters.forEach((q) => {
        if (q.eth.status === "fail") {
          expect(Math.abs(q.eth.discrepancyPct!)).toBeGreaterThan(0.20);
        }
        if (q.shares.status === "fail") {
          expect(Math.abs(q.shares.discrepancyPct!)).toBeGreaterThan(0.15);
        }
      });
    });
  });

  describe("Summary Statistics", () => {
    it("should count verified vs unverified data", () => {
      const report = runBMNRVerification();

      expect(report.summary.ethVerified + report.summary.ethUnverified).toBeLessThanOrEqual(
        report.summary.totalQuarters
      );
      expect(report.summary.sharesVerified).toBe(report.summary.totalQuarters); // Always have XBRL shares
    });

    it("should count warnings and failures", () => {
      const report = runBMNRVerification();

      expect(report.summary.ethWarnings).toBeGreaterThanOrEqual(0);
      expect(report.summary.ethFailed).toBeGreaterThanOrEqual(0);
      expect(report.summary.sharesWarnings).toBeGreaterThanOrEqual(0);
      expect(report.summary.sharesFailed).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Audit Findings", () => {
    it("should calculate press release reliance", () => {
      const report = runBMNRVerification();

      expect(report.auditFindings.pressReleaseReliance).toBeGreaterThan(0);
      expect(report.auditFindings.secVerified).toBeGreaterThan(0);
      expect(
        report.auditFindings.pressReleaseReliance + report.auditFindings.secVerified
      ).toBeCloseTo(100, 0);
    });

    it("should document critical issues", () => {
      const report = runBMNRVerification();

      expect(report.auditFindings.criticalIssues.length).toBeGreaterThan(0);
      expect(
        report.auditFindings.criticalIssues.some((issue) => issue.includes("press releases"))
      ).toBe(true);
      expect(
        report.auditFindings.criticalIssues.some((issue) => issue.includes("810%"))
      ).toBe(true);
      expect(
        report.auditFindings.criticalIssues.some((issue) => issue.includes("$10B"))
      ).toBe(true);
    });

    it("should show >90% press release reliance", () => {
      const report = runBMNRVerification();

      // From audit: 11 of 12 data points from press releases (91.7%)
      expect(report.auditFindings.pressReleaseReliance).toBeGreaterThan(90);
    });
  });

  describe("Helper Functions", () => {
    it("getBMNRDiscrepancies should return only warn/fail quarters", () => {
      const report = runBMNRVerification();
      const discrepancies = getBMNRDiscrepancies(report);

      discrepancies.forEach((q) => {
        const hasIssue =
          q.eth.status === "warn" ||
          q.eth.status === "fail" ||
          q.shares.status === "warn" ||
          q.shares.status === "fail";
        expect(hasIssue).toBe(true);
      });
    });

    it("verifyBMNRQuarterByDate should return null for unknown date", () => {
      const result = verifyBMNRQuarterByDate("2020-01-01");
      expect(result).toBeNull();
    });

    it("verifyBMNRQuarterByDate should return verification for valid date", () => {
      const result = verifyBMNRQuarterByDate("2025-11-30");
      expect(result).toBeDefined();
      expect(result!.periodEnd).toBe("2025-11-30");
    });

    it("getUnverifiedDataPoints should exclude SEC filings", () => {
      const report = runBMNRVerification();
      const unverified = getUnverifiedDataPoints(report);

      unverified.forEach((point) => {
        expect(point.source).not.toBe("10-K filing");
        expect(point.source).toBe("Press release");
      });
    });

    it("getUnverifiedDataPoints should return 11 of 12 holdings entries", () => {
      const report = runBMNRVerification();
      const unverified = getUnverifiedDataPoints(report);

      // From audit: 11 of 12 from press releases, 1 from SEC
      expect(unverified.length).toBe(11);
    });
  });

  describe("Data Quality Checks", () => {
    it("should detect 810% share dilution", () => {
      const report = runBMNRVerification();

      // Check share growth from earliest to latest
      const earliestQuarter = report.quarters[0];
      const latestQuarter = report.quarters[report.quarters.length - 1];

      const shareGrowth =
        (latestQuarter.shares.xbrlShares! - earliestQuarter.shares.xbrlShares!) /
        earliestQuarter.shares.xbrlShares!;

      // Share count grew from ~50M to ~408M (>700% growth)
      expect(shareGrowth).toBeGreaterThan(7);
    });

    it("should verify Q1 FY2026 as only SEC-verified holdings", () => {
      const report = runBMNRVerification();
      const q1FY2026 = report.quarters.find((q) => q.periodEnd === "2025-11-30");

      expect(q1FY2026).toBeDefined();
      expect(q1FY2026!.eth.verified).toBe(true);
      expect(q1FY2026!.verification.ethSource).toBe("SEC XBRL");
    });

    it("should identify timing lags between press releases and quarter-ends", () => {
      const report = runBMNRVerification();

      const quartersWithTimingInfo = report.quarters.filter((q) => q.eth.notes?.includes("days"));

      // Should have quarters with timing lag notes
      expect(quartersWithTimingInfo.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle quarters with no press release data", () => {
      const report = runBMNRVerification();
      const noDataQuarters = report.quarters.filter(
        (q) => q.eth.status === "no-data" || q.shares.status === "no-data"
      );

      // Pre-ETH strategy periods may have no press releases
      expect(noDataQuarters).toBeDefined();
    });

    it("should handle quarters where XBRL has USD but not ETH count", () => {
      const verification = verifyBMNRQuarterByDate("2025-08-31");

      // FY2025 has digitalAssets USD value but ETH count not directly extractable
      if (verification!.eth.xbrlHoldings === null) {
        expect(verification!.eth.notes).toContain("XBRL ETH count");
      }
    });

    it("should preserve notes for SEC-verified entries", () => {
      const verification = verifyBMNRQuarterByDate("2025-11-30");

      // Q1 FY2026 has matching 10-K filing in holdings-history
      if (verification!.eth.pressReleaseDate === "2025-11-20") {
        expect(verification!.eth.notes).toContain("SEC-verified");
      }
    });
  });
});
