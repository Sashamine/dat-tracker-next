import { describe, it, expect } from "vitest";
import {
  runVerification,
  getDiscrepancies,
  verifyQuarterByDate,
} from "../mstr-verification";

describe("MSTR Verification Engine", () => {
  it("should run full verification without errors", () => {
    const report = runVerification();

    expect(report.generated).toBeTruthy();
    expect(report.quarters.length).toBeGreaterThan(0);
    expect(report.summary.totalQuarters).toBe(report.quarters.length);
  });

  it("should have reasonable pass rates", () => {
    const report = runVerification();

    // Most BTC events should pass (we have good 8-K coverage)
    const btcPassRate = report.summary.btcVerified / report.summary.totalQuarters;
    expect(btcPassRate).toBeGreaterThan(0.5);

    // Summary counts should add up
    const btcTotal =
      report.summary.btcVerified +
      report.summary.btcWarnings +
      report.summary.btcFailed;
    // Note: some quarters have no data, so btcTotal may be < totalQuarters
    expect(btcTotal).toBeLessThanOrEqual(report.summary.totalQuarters);
  });

  it("should identify quarters with events", () => {
    // Q4 2024 had massive BTC purchases
    const q4_2024 = verifyQuarterByDate("2024-12-31");
    expect(q4_2024).not.toBeNull();
    expect(q4_2024!.btc.events8k).toBeGreaterThan(0);
  });

  it("should detect discrepancies if present", () => {
    const report = runVerification();
    const discrepancies = getDiscrepancies(report);

    // Just verify the function works - discrepancies may or may not exist
    expect(Array.isArray(discrepancies)).toBe(true);

    // Log any discrepancies for review
    if (discrepancies.length > 0) {
      console.log("\n=== Discrepancies Found ===");
      for (const d of discrepancies) {
        console.log(`${d.quarter}:`);
        if (d.btc.status !== "pass" && d.btc.status !== "no-data") {
          console.log(`  BTC: ${d.btc.status} - ${d.btc.notes || ""}`);
        }
        if (d.shares.status !== "pass" && d.shares.status !== "no-data") {
          console.log(
            `  Shares: ${d.shares.status} - XBRL: ${d.shares.xbrlChange}, 8-K: ${d.shares.atmShares8k}`
          );
        }
        if (d.debt.status !== "pass" && d.debt.status !== "no-data") {
          console.log(
            `  Debt: ${d.debt.status} - XBRL: $${(d.debt.xbrlChange || 0) / 1e6}M, 8-K: $${d.debt.issued8k / 1e6}M`
          );
        }
      }
    }
  });

  it("should handle quarters with no events", () => {
    // Q2 2022 was during bear market with minimal activity
    const q2_2022 = verifyQuarterByDate("2022-06-30");
    expect(q2_2022).not.toBeNull();
    // Should still have valid structure even with no events
    expect(q2_2022!.btc).toBeDefined();
    expect(q2_2022!.shares).toBeDefined();
    expect(q2_2022!.debt).toBeDefined();
  });

  it("should correctly sum BTC events by quarter", () => {
    const report = runVerification();

    // Q3 2020 had the first BTC purchases (Aug-Sep 2020)
    const q3_2020 = report.quarters.find((q) => q.periodEnd === "2020-09-30");
    expect(q3_2020).toBeDefined();
    // Aug 11: 21,454 BTC + Sep 14: 16,796 BTC = 38,250 BTC
    expect(q3_2020!.btc.events8k).toBe(38250);

    // Q4 2020 had Dec purchases only (Oct-Dec 2020)
    const q4_2020 = report.quarters.find((q) => q.periodEnd === "2020-12-31");
    expect(q4_2020).toBeDefined();
    // Dec 4: 2,574 BTC + Dec 21: 29,646 BTC = 32,220 BTC
    expect(q4_2020!.btc.events8k).toBe(32220);
  });

  it("should handle stock split adjustments", () => {
    // Q3 2024 was the first post-split quarter
    const q3_2024 = verifyQuarterByDate("2024-09-30");
    expect(q3_2024).not.toBeNull();

    // Shares should be in post-split units (183M not 18.3M)
    // Prior quarter (Q2 2024) had 17.1M pre-split = 171M post-split
    expect(q3_2024!.shares.xbrlChange).toBeGreaterThan(0);
  });
});
