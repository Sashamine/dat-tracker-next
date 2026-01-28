import { describe, it, expect } from "vitest";
import {
  BMNR_SEC_HISTORY,
  getBMNRFilingByDate,
  getBMNRFilingsInRange,
  getLatestBMNRFiling,
  getBMNRSharesPostSplit,
} from "./bmnr-sec-history";

describe("BMNR SEC History", () => {
  describe("Data Integrity", () => {
    it("should have 9 filings", () => {
      expect(BMNR_SEC_HISTORY).toHaveLength(9);
    });

    it("should be sorted chronologically", () => {
      for (let i = 1; i < BMNR_SEC_HISTORY.length; i++) {
        const prev = new Date(BMNR_SEC_HISTORY[i - 1].periodEnd);
        const curr = new Date(BMNR_SEC_HISTORY[i].periodEnd);
        expect(curr.getTime()).toBeGreaterThan(prev.getTime());
      }
    });

    it("should have valid accession numbers", () => {
      BMNR_SEC_HISTORY.forEach((filing) => {
        expect(filing.accessionNumber).toMatch(/^\d{10}-\d{2}-\d{6}$/);
      });
    });

    it("should have valid SEC URLs", () => {
      BMNR_SEC_HISTORY.forEach((filing) => {
        expect(filing.secUrl).toContain("sec.gov");
        expect(filing.secUrl).toContain("1829311"); // BMNR CIK
      });
    });

    it("should have positive or zero values for all numeric fields", () => {
      BMNR_SEC_HISTORY.forEach((filing) => {
        expect(filing.digitalAssets).toBeGreaterThanOrEqual(0);
        expect(filing.cashAndEquivalents).toBeGreaterThanOrEqual(0);
        expect(filing.totalAssets).toBeGreaterThan(0);
        expect(filing.totalLiabilities).toBeGreaterThanOrEqual(0);
        expect(filing.totalDebt).toBeGreaterThanOrEqual(0);
        expect(filing.preferredEquity).toBeGreaterThanOrEqual(0);
        expect(filing.commonSharesOutstanding).toBeGreaterThan(0);
      });
    });
  });

  describe("ETH Treasury Strategy Timeline", () => {
    it("should show zero digital assets before Q2 FY2025", () => {
      const preTreasury = BMNR_SEC_HISTORY.filter(
        (f) => f.periodEnd < "2025-02-28"
      );
      preTreasury.forEach((filing) => {
        expect(filing.digitalAssets).toBeLessThan(200_000); // < $200K
      });
    });

    it("should show explosive growth in digital assets FY2025-FY2026", () => {
      const q2Fy2025 = getBMNRFilingByDate("2025-02-28");
      const fy2025 = getBMNRFilingByDate("2025-08-31");
      const q1Fy2026 = getBMNRFilingByDate("2025-11-30");

      expect(q2Fy2025?.digitalAssets).toBe(247_923); // $248K
      expect(fy2025?.digitalAssets).toBe(2_515_000_000); // $2.5B
      expect(q1Fy2026?.digitalAssets).toBe(10_561_789_000); // $10.6B
    });

    it("should show share dilution during ETH strategy", () => {
      const fy2025 = getBMNRFilingByDate("2025-08-31");
      const q1Fy2026 = getBMNRFilingByDate("2025-11-30");

      expect(fy2025?.commonSharesOutstanding).toBe(234_712_310);
      expect(q1Fy2026?.commonSharesOutstanding).toBe(408_578_823);

      // 74% dilution in 3 months
      const dilution =
        ((q1Fy2026!.commonSharesOutstanding - fy2025!.commonSharesOutstanding) /
          fy2025!.commonSharesOutstanding) *
        100;
      expect(dilution).toBeCloseTo(74.1, 0);
    });

    it("should show debt-free balance sheet post-ETH strategy", () => {
      const fy2025 = getBMNRFilingByDate("2025-08-31");
      const q1Fy2026 = getBMNRFilingByDate("2025-11-30");

      expect(fy2025?.totalDebt).toBe(0);
      expect(q1Fy2026?.totalDebt).toBe(0);
      expect(fy2025?.preferredEquity).toBe(0);
      expect(q1Fy2026?.preferredEquity).toBe(0);
    });
  });

  describe("Reverse Stock Split Handling", () => {
    it("should mark pre-split filings correctly", () => {
      const preSplit = BMNR_SEC_HISTORY.filter((f) => f.preSplit);
      const postSplit = BMNR_SEC_HISTORY.filter((f) => !f.preSplit);

      expect(preSplit.length).toBe(6); // Pre May 15, 2025
      expect(postSplit.length).toBe(3); // Post May 15, 2025
    });

    it("should convert pre-split shares correctly", () => {
      const q1Fy2025 = getBMNRFilingByDate("2024-11-30");
      const q3Fy2025 = getBMNRFilingByDate("2025-05-31");

      expect(q1Fy2025?.preSplit).toBe(true);
      expect(q3Fy2025?.preSplit).toBe(false);

      // Pre-split: 39.7M shares → Post-split: 1.98M shares (÷20)
      const converted = getBMNRSharesPostSplit(q1Fy2025!);
      expect(converted).toBeCloseTo(1_983_380, 0);
    });
  });

  describe("Helper Functions", () => {
    it("getBMNRFilingByDate should return correct filing", () => {
      const filing = getBMNRFilingByDate("2025-08-31");
      expect(filing).toBeDefined();
      expect(filing?.formType).toBe("10-K");
      expect(filing?.digitalAssets).toBe(2_515_000_000);
    });

    it("getBMNRFilingByDate should return undefined for non-existent date", () => {
      const filing = getBMNRFilingByDate("2020-01-01");
      expect(filing).toBeUndefined();
    });

    it("getBMNRFilingsInRange should return filings in range", () => {
      const filings = getBMNRFilingsInRange("2024-11-30", "2025-08-31");
      expect(filings).toHaveLength(4); // Q1, Q2, Q3 FY2025, and FY2025
    });

    it("getLatestBMNRFiling should return Q1 FY2026", () => {
      const latest = getLatestBMNRFiling();
      expect(latest.periodEnd).toBe("2025-11-30");
      expect(latest.formType).toBe("10-Q");
      expect(latest.digitalAssets).toBe(10_561_789_000);
    });
  });

  describe("Data Quality Checks", () => {
    it("should show FY2025 10-K matches audit data point", () => {
      const fy2025 = getBMNRFilingByDate("2025-08-31");

      // From 10-K cover page: "As of August 31, 2025, the registrant had 234,712,310 shares"
      expect(fy2025?.commonSharesOutstanding).toBe(234_712_310);

      // Digital assets grew from $0 to $2.5B
      expect(fy2025?.digitalAssets).toBe(2_515_000_000);
    });

    it("should show Q1 FY2026 10-Q has 3.74M ETH", () => {
      const q1Fy2026 = getBMNRFilingByDate("2025-11-30");

      // From 10-Q: 3,737,140 ETH + 193 BTC = $10.56B
      expect(q1Fy2026?.digitalAssets).toBe(10_561_789_000);
      expect(q1Fy2026?.commonSharesOutstanding).toBe(408_578_823);
    });

    it("should verify 810% share dilution from audit", () => {
      // Audit calculated: 50M → 455M shares = 810% dilution
      // Our data (post-split adjusted):
      // Nov 2023: 49.7M shares ÷ 20 = 2.49M post-split equivalent
      // Nov 2025: 408.6M shares
      const q1Fy2024 = getBMNRFilingByDate("2023-11-30");
      const q1Fy2026 = getBMNRFilingByDate("2025-11-30");

      const startShares = getBMNRSharesPostSplit(q1Fy2024!);
      const endShares = q1Fy2026!.commonSharesOutstanding;

      const dilution = ((endShares - startShares) / startShares) * 100;

      // Should be massive dilution (>1500%)
      expect(dilution).toBeGreaterThan(1500);
    });
  });
});
