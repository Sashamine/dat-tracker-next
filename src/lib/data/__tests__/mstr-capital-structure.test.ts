import { describe, it, expect } from "vitest";
import {
  getQuarterEndSnapshot,
  getCapitalStructureAt,
  getCapitalStructureTimeline,
  getCapitalStructureSummary,
} from "../mstr-capital-structure";

describe("MSTR Capital Structure Timeline", () => {
  describe("getQuarterEndSnapshot", () => {
    it("should return XBRL-verified snapshot for quarter-end dates", () => {
      const q3_2025 = getQuarterEndSnapshot("2025-09-30");

      expect(q3_2025).not.toBeNull();
      expect(q3_2025!.source).toBe("xbrl");
      expect(q3_2025!.date).toBe("2025-09-30");

      // Verify key metrics from XBRL
      expect(q3_2025!.cashAndEquivalents).toBe(54_285_000);
      expect(q3_2025!.commonSharesOutstanding).toBe(267_468_000);
      expect(q3_2025!.preferredEquity).toBe(1_091_342_000);
    });

    it("should return null for non-quarter-end dates", () => {
      const midQuarter = getQuarterEndSnapshot("2025-08-15");
      expect(midQuarter).toBeNull();
    });

    it("should track BTC holdings from cumulative events", () => {
      // Q4 2020 - after first major purchases
      const q4_2020 = getQuarterEndSnapshot("2020-12-31");
      expect(q4_2020).not.toBeNull();
      // Should have 70,470 BTC by end of 2020
      expect(q4_2020!.btcHoldings).toBe(70470);
    });

    it("should include XBRL filing reference", () => {
      const q3_2025 = getQuarterEndSnapshot("2025-09-30");
      expect(q3_2025!.xbrlFiling).toBeDefined();
      expect(q3_2025!.xbrlFiling!.formType).toBe("10-Q");
    });
  });

  describe("getCapitalStructureAt", () => {
    it("should return XBRL snapshot for quarter-end dates", () => {
      const snapshot = getCapitalStructureAt("2025-09-30");
      expect(snapshot).not.toBeNull();
      expect(snapshot!.source).toBe("xbrl");
    });

    it("should derive inter-quarter snapshot from prior XBRL + events", () => {
      // Mid-Q4 2025
      const snapshot = getCapitalStructureAt("2025-11-15");

      expect(snapshot).not.toBeNull();
      expect(snapshot!.source).toBe("derived");
      expect(snapshot!.notes).toContain("Derived from");
      expect(snapshot!.notes).toContain("2025-09-30");
    });

    it("should apply BTC purchases to derived snapshots", () => {
      // Get Q3 2025 end
      const q3End = getCapitalStructureAt("2025-09-30");

      // Get a date after some Q4 BTC purchases
      const midQ4 = getCapitalStructureAt("2025-11-15");

      expect(midQ4).not.toBeNull();
      // BTC holdings should increase from Q3 end
      expect(midQ4!.btcHoldings).toBeGreaterThanOrEqual(q3End!.btcHoldings);
    });

    it("should return null for dates before first XBRL filing", () => {
      const tooEarly = getCapitalStructureAt("2020-01-01");
      expect(tooEarly).toBeNull();
    });
  });

  describe("getCapitalStructureTimeline", () => {
    it("should return all quarter-end snapshots", () => {
      const timeline = getCapitalStructureTimeline();

      expect(timeline.length).toBeGreaterThan(0);
      // All should be XBRL-verified
      expect(timeline.every((s) => s.source === "xbrl")).toBe(true);
    });

    it("should be sorted chronologically", () => {
      const timeline = getCapitalStructureTimeline();

      for (let i = 1; i < timeline.length; i++) {
        expect(timeline[i].date > timeline[i - 1].date).toBe(true);
      }
    });

    it("should show BTC accumulation over time", () => {
      const timeline = getCapitalStructureTimeline();

      // BTC should generally increase over time (with some exceptions)
      const firstBtc = timeline[0].btcHoldings;
      const lastBtc = timeline[timeline.length - 1].btcHoldings;
      expect(lastBtc).toBeGreaterThan(firstBtc);
    });
  });

  describe("getCapitalStructureSummary", () => {
    it("should sum BTC accumulated in date range", () => {
      // Q4 2020 - major accumulation period
      const summary = getCapitalStructureSummary("2020-10-01", "2020-12-31");

      // Dec 4: 2,574 BTC + Dec 21: 29,646 BTC = 32,220 BTC
      expect(summary.btcAccumulated).toBe(32220);
    });

    it("should sum debt issued in date range", () => {
      // Dec 2020 - first convertible note
      const summary = getCapitalStructureSummary("2020-12-01", "2020-12-31");

      // $650M convertible note issued Dec 11, 2020
      expect(summary.debtIssued).toBe(650_000_000);
    });

    it("should sum ATM shares in date range", () => {
      // Q3 2025 - active ATM period
      const summary = getCapitalStructureSummary("2025-07-01", "2025-09-30");

      // Should have ATM shares from weekly filings
      expect(summary.sharesIssued).toBeGreaterThan(0);
    });
  });

  describe("capital structure evolution", () => {
    it("should show debt growth from 2020 to 2025", () => {
      const early = getCapitalStructureAt("2020-12-31");
      const recent = getCapitalStructureAt("2025-09-30");

      expect(early).not.toBeNull();
      expect(recent).not.toBeNull();

      // Debt should have grown significantly
      expect(recent!.totalDebt).toBeGreaterThan(early!.totalDebt);
    });

    it("should show preferred equity appearing in 2025", () => {
      const prePref = getCapitalStructureAt("2024-12-31");
      const postPref = getCapitalStructureAt("2025-09-30");

      expect(prePref).not.toBeNull();
      expect(postPref).not.toBeNull();

      // No preferred before 2025
      expect(prePref!.preferredEquity).toBe(0);
      // Preferred equity in 2025
      expect(postPref!.preferredEquity).toBeGreaterThan(0);
    });

    it("should show share dilution from ATM and conversions", () => {
      // Pre-ATM era
      const early2024 = getCapitalStructureAt("2024-03-31");
      // Post-ATM era
      const late2025 = getCapitalStructureAt("2025-09-30");

      expect(early2024).not.toBeNull();
      expect(late2025).not.toBeNull();

      // Shares should have increased significantly
      const shareGrowth = late2025!.commonSharesOutstanding / early2024!.commonSharesOutstanding;
      expect(shareGrowth).toBeGreaterThan(1.5); // At least 50% dilution
    });
  });
});
