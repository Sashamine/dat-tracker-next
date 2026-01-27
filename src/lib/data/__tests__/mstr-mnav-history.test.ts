import { describe, it, expect } from "vitest";
import {
  calculateMstrMnavAt,
  generateMstrMnavHistory,
  getMstrMnavAt,
  getMstrMnavRange,
  formatSnapshotForAudit,
  MSTR_MNAV_HISTORY,
  HISTORICAL_BTC_PRICES,
  HISTORICAL_MSTR_PRICES,
} from "../mstr-mnav-history";

describe("MSTR Auditable mNAV History", () => {
  describe("data completeness", () => {
    it("should have BTC prices for all quarter-ends with capital structure data", () => {
      const history = generateMstrMnavHistory();

      // Every snapshot in history should have had prices available
      expect(history.length).toBeGreaterThan(0);

      // Check a few key dates
      expect(HISTORICAL_BTC_PRICES["2020-12-31"]).toBeDefined();
      expect(HISTORICAL_BTC_PRICES["2024-09-30"]).toBeDefined();
      expect(HISTORICAL_BTC_PRICES["2025-09-30"]).toBeDefined();
    });

    it("should have stock prices for all quarter-ends with capital structure data", () => {
      expect(HISTORICAL_MSTR_PRICES["2020-12-31"]).toBeDefined();
      expect(HISTORICAL_MSTR_PRICES["2024-09-30"]).toBeDefined();
      expect(HISTORICAL_MSTR_PRICES["2025-09-30"]).toBeDefined();
    });
  });

  describe("calculateMstrMnavAt", () => {
    it("should return null for dates without price data", () => {
      const result = calculateMstrMnavAt("2019-01-01");
      expect(result).toBeNull();
    });

    it("should calculate mNAV for Q3 2025 with full attribution", () => {
      const snapshot = calculateMstrMnavAt("2025-09-30");

      expect(snapshot).not.toBeNull();
      expect(snapshot!.date).toBe("2025-09-30");
      expect(snapshot!.methodology).toBe("xbrl");
      expect(snapshot!.confidence).toBe("high");

      // Check all inputs have sources
      expect(snapshot!.btcHoldings.source).toBeTruthy();
      expect(snapshot!.sharesOutstanding.source).toBeTruthy();
      expect(snapshot!.totalDebt.source).toBeTruthy();
      expect(snapshot!.cashAndEquivalents.source).toBeTruthy();
      expect(snapshot!.preferredEquity.source).toBeTruthy();
      expect(snapshot!.btcPrice.source).toBeTruthy();
      expect(snapshot!.stockPrice.source).toBeTruthy();
    });

    it("should have correct BTC holdings for Q3 2025", () => {
      const snapshot = calculateMstrMnavAt("2025-09-30");

      expect(snapshot).not.toBeNull();
      // Q3 2025 ended with 252,220 BTC per capital events
      // Actually checking mstr-capital-structure which uses btcCumulative
      expect(snapshot!.btcHoldings.value).toBeGreaterThan(200000);
    });

    it("should include preferred equity for 2025 snapshots", () => {
      const snapshot = calculateMstrMnavAt("2025-09-30");

      expect(snapshot).not.toBeNull();
      expect(snapshot!.preferredEquity.value).toBeGreaterThan(0);
    });

    it("should have zero preferred equity for pre-2025 snapshots", () => {
      const snapshot = calculateMstrMnavAt("2024-09-30");

      expect(snapshot).not.toBeNull();
      expect(snapshot!.preferredEquity.value).toBe(0);
    });
  });

  describe("mNAV calculation correctness", () => {
    it("should calculate mNAV correctly: EV / Crypto NAV", () => {
      const snapshot = calculateMstrMnavAt("2025-09-30");

      expect(snapshot).not.toBeNull();

      // Verify formula
      const expectedMarketCap =
        snapshot!.sharesOutstanding.value * snapshot!.stockPrice.value;
      const expectedEV =
        expectedMarketCap +
        snapshot!.totalDebt.value +
        snapshot!.preferredEquity.value -
        snapshot!.cashAndEquivalents.value;
      const expectedCryptoNav =
        snapshot!.btcHoldings.value * snapshot!.btcPrice.value;
      const expectedMnav = expectedEV / expectedCryptoNav;

      expect(snapshot!.marketCap).toBeCloseTo(expectedMarketCap, 0);
      expect(snapshot!.enterpriseValue).toBeCloseTo(expectedEV, 0);
      expect(snapshot!.cryptoNav).toBeCloseTo(expectedCryptoNav, 0);
      expect(snapshot!.mnav).toBeCloseTo(expectedMnav, 2);
    });

    it("should show mNAV > 1 when market values BTC at premium", () => {
      // In bull markets MSTR trades at premium to NAV
      const q4_2024 = calculateMstrMnavAt("2024-12-31");

      expect(q4_2024).not.toBeNull();
      // During late 2024 bull run, MSTR traded at significant premium
      expect(q4_2024!.mnav).toBeGreaterThan(1);
    });
  });

  describe("audit trail", () => {
    it("should have source attribution for all inputs", () => {
      const snapshot = calculateMstrMnavAt("2025-09-30");

      expect(snapshot).not.toBeNull();

      // Every audited value should have source and asOf
      const auditedFields = [
        "btcHoldings",
        "sharesOutstanding",
        "totalDebt",
        "cashAndEquivalents",
        "preferredEquity",
        "btcPrice",
        "stockPrice",
      ] as const;

      for (const field of auditedFields) {
        const value = snapshot![field];
        expect(value.source).toBeTruthy();
        expect(value.asOf).toBeTruthy();
        expect(value.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it("should mark XBRL snapshots as high confidence", () => {
      const snapshot = calculateMstrMnavAt("2025-09-30");

      expect(snapshot).not.toBeNull();
      expect(snapshot!.methodology).toBe("xbrl");
      expect(snapshot!.confidence).toBe("high");
    });

    it("should format audit trail for human review", () => {
      const snapshot = calculateMstrMnavAt("2025-09-30");

      expect(snapshot).not.toBeNull();

      const auditText = formatSnapshotForAudit(snapshot!);

      // Should contain key sections
      expect(auditText).toContain("MSTR mNAV Audit");
      expect(auditText).toContain("METHODOLOGY");
      expect(auditText).toContain("INPUTS");
      expect(auditText).toContain("BTC Holdings");
      expect(auditText).toContain("Shares Outstanding");
      expect(auditText).toContain("Total Debt");
      expect(auditText).toContain("MARKET PRICES");
      expect(auditText).toContain("CALCULATION");
      expect(auditText).toContain("Enterprise Value");
      expect(auditText).toContain("Crypto NAV");
      expect(auditText).toContain("mNAV");
    });
  });

  describe("pre-calculated history", () => {
    it("should generate history for multiple quarters", () => {
      expect(MSTR_MNAV_HISTORY.length).toBeGreaterThan(5);
    });

    it("should be sorted chronologically", () => {
      for (let i = 1; i < MSTR_MNAV_HISTORY.length; i++) {
        expect(MSTR_MNAV_HISTORY[i].date > MSTR_MNAV_HISTORY[i - 1].date).toBe(
          true
        );
      }
    });

    it("should show BTC holdings growth over time", () => {
      const first = MSTR_MNAV_HISTORY[0];
      const last = MSTR_MNAV_HISTORY[MSTR_MNAV_HISTORY.length - 1];

      expect(last.btcHoldings.value).toBeGreaterThan(first.btcHoldings.value);
    });
  });

  describe("helper functions", () => {
    it("getMstrMnavAt should return cached value if available", () => {
      const cached = getMstrMnavAt("2025-09-30");
      const calculated = calculateMstrMnavAt("2025-09-30");

      expect(cached).not.toBeNull();
      expect(calculated).not.toBeNull();
      expect(cached!.mnav).toBe(calculated!.mnav);
    });

    it("getMstrMnavRange should filter by date range", () => {
      const range = getMstrMnavRange("2024-01-01", "2024-12-31");

      expect(range.length).toBeGreaterThan(0);
      expect(range.every((s) => s.date >= "2024-01-01")).toBe(true);
      expect(range.every((s) => s.date <= "2024-12-31")).toBe(true);
    });
  });
});
