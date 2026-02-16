/**
 * Tests for Dilutive Instruments Tracking
 *
 * Validates:
 * - getEffectiveShares() calculation based on stock price vs strike price
 * - Proper in-the-money / out-of-the-money determination
 * - Provenance formatting
 */

import { describe, it, expect } from "vitest";
import {
  getEffectiveShares,
  formatEffectiveShares,
  getSharesProvenance,
  dilutiveInstruments,
  detectDilutiveInstruments,
  formatDilutionDetection,
} from "./dilutive-instruments";

describe("Dilutive Instruments", () => {
  describe("getEffectiveShares", () => {
    it("should return basic shares when no instruments defined", () => {
      const result = getEffectiveShares("UNKNOWN_TICKER", 100_000_000, 50.0);
      expect(result.basic).toBe(100_000_000);
      expect(result.diluted).toBe(100_000_000);
      expect(result.breakdown).toHaveLength(0);
    });

    it("should include in-the-money instruments for BTCS", () => {
      // BTCS: Basic 47,075,189, options at $2.64
      // At $3.00 stock price: options are in the money
      // Updated Jan 2026: 3,223,012 (Q3) + 690,300 (Jan 5 8-K grants) = 3,913,312
      const result = getEffectiveShares("BTCS", 47_075_189, 3.0);

      expect(result.basic).toBe(47_075_189);
      // Options at $2.64 are in the money at $3.00
      // Convertibles at $5.85 and $13.00 are out of the money
      const inMoneyOptions = result.breakdown.find(
        (b) => b.type === "option" && b.inTheMoney
      );
      expect(inMoneyOptions).toBeDefined();
      expect(inMoneyOptions?.potentialShares).toBe(3_913_312);

      // Diluted should include the options
      expect(result.diluted).toBe(47_075_189 + 3_913_312);
    });

    it("should exclude out-of-money instruments for BTCS", () => {
      // At $1.50 stock price: all instruments are out of the money
      const result = getEffectiveShares("BTCS", 47_075_189, 1.5);

      expect(result.basic).toBe(47_075_189);
      expect(result.diluted).toBe(47_075_189); // No dilution
      const inMoney = result.breakdown.filter((b) => b.inTheMoney);
      expect(inMoney).toHaveLength(0);
    });

    it("should handle UPXI convertibles correctly", () => {
      // UPXI: Convertibles at $4.25 and $2.39
      // At $3.00: only the $2.39 convertible is in the money
      const result = getEffectiveShares("UPXI", 59_000_000, 3.0);

      expect(result.basic).toBe(59_000_000);

      const inMoney = result.breakdown.filter((b) => b.inTheMoney);
      expect(inMoney).toHaveLength(1);
      expect(inMoney[0].strikePrice).toBe(2.39);
      expect(inMoney[0].potentialShares).toBe(15_062_761);

      expect(result.diluted).toBe(59_000_000 + 15_062_761);
    });

    it("should include all instruments when stock price is very high", () => {
      // At $20.00: all BTCS instruments are in the money
      const result = getEffectiveShares("BTCS", 47_075_189, 20.0);

      const inMoney = result.breakdown.filter((b) => b.inTheMoney);
      expect(inMoney).toHaveLength(3); // 2 convertibles + 1 option

      // Total dilution should be sum of all instruments
      const totalDilution = inMoney.reduce(
        (sum, b) => sum + b.potentialShares,
        0
      );
      expect(result.diluted).toBe(47_075_189 + totalDilution);
    });
  });

  describe("formatEffectiveShares", () => {
    it("should format result with in-money instruments", () => {
      const result = getEffectiveShares("BTCS", 47_075_189, 3.0);
      const formatted = formatEffectiveShares(result);

      // Updated: 47,075,189 + 3,913,312 = 50,988,501
      expect(formatted).toContain("50,988,501 shares");
      expect(formatted).toContain("47,075,189 basic");
      expect(formatted).toContain("in-money");
    });

    it("should format result when all out-of-money", () => {
      const result = getEffectiveShares("BTCS", 47_075_189, 1.0);
      const formatted = formatEffectiveShares(result);

      expect(formatted).toContain("47,075,189 shares");
      expect(formatted).toContain("all dilutives out-of-money");
    });
  });

  describe("getSharesProvenance", () => {
    it("should generate detailed provenance explanation", () => {
      const provenance = getSharesProvenance(
        "BTCS",
        47_075_189,
        "10-Q Q3 2025",
        3.0
      );

      expect(provenance).toContain("Basic shares: 47,075,189");
      expect(provenance).toContain("10-Q Q3 2025");
      expect(provenance).toContain("option at $2.64");
      expect(provenance).toContain("IN money");
      expect(provenance).toContain("OUT of money");
      expect(provenance).toContain("Effective diluted:");
    });
  });

  describe("detectDilutiveInstruments", () => {
    it("should detect dilutive instruments when diluted > basic", () => {
      const result = detectDilutiveInstruments(
        100_000_000, // basic
        105_000_000, // diluted
        "TEST",
        "2025-09-30",
        "10-Q Q3 2025"
      );

      expect(result.hasDilutiveInstruments).toBe(true);
      expect(result.delta).toBe(5_000_000);
      expect(result.deltaPct).toBeCloseTo(5.0);
    });

    it("should NOT flag when diluted equals basic", () => {
      const result = detectDilutiveInstruments(
        100_000_000,
        100_000_000,
        "TEST"
      );

      expect(result.hasDilutiveInstruments).toBe(false);
      expect(result.delta).toBe(0);
      expect(result.deltaPct).toBe(0);
    });

    it("should flag even small deltas (no significance threshold)", () => {
      // 0.1% dilution - should still flag
      const result = detectDilutiveInstruments(
        100_000_000,
        100_100_000, // +100k shares
        "TEST"
      );

      expect(result.hasDilutiveInstruments).toBe(true);
      expect(result.delta).toBe(100_000);
      expect(result.deltaPct).toBeCloseTo(0.1);
    });

    it("should handle missing share data gracefully", () => {
      const result = detectDilutiveInstruments(null, null, "TEST");

      expect(result.hasDilutiveInstruments).toBe(false);
      expect(result.delta).toBe(0);
      expect(result.basicShares).toBeNull();
      expect(result.dilutedShares).toBeNull();
    });

    it("should handle partial missing data", () => {
      const result1 = detectDilutiveInstruments(100_000_000, null, "TEST");
      expect(result1.hasDilutiveInstruments).toBe(false);

      const result2 = detectDilutiveInstruments(null, 105_000_000, "TEST");
      expect(result2.hasDilutiveInstruments).toBe(false);
    });
  });

  describe("formatDilutionDetection", () => {
    it("should format detected dilution", () => {
      const result = detectDilutiveInstruments(
        100_000_000,
        103_200_000,
        "BTCS"
      );
      const formatted = formatDilutionDetection(result);

      expect(formatted).toContain("BTCS");
      expect(formatted).toContain("Has dilutive instruments");
      expect(formatted).toContain("3.2M shares");
      expect(formatted).toContain("3.2% dilution");
    });

    it("should format no dilution detected", () => {
      const result = detectDilutiveInstruments(100_000_000, 100_000_000, "MSTR");
      const formatted = formatDilutionDetection(result);

      expect(formatted).toContain("MSTR");
      expect(formatted).toContain("No dilutive instruments detected");
    });

    it("should format missing data case", () => {
      const result = detectDilutiveInstruments(null, null, "XYZ");
      const formatted = formatDilutionDetection(result);

      expect(formatted).toContain("XYZ");
      expect(formatted).toContain("Unable to detect");
    });
  });

  describe("data validation", () => {
    it("should have valid instruments for BTCS", () => {
      const btcsInstruments = dilutiveInstruments["BTCS"];
      expect(btcsInstruments).toBeDefined();
      expect(btcsInstruments.length).toBeGreaterThan(0);

      for (const inst of btcsInstruments) {
        expect(inst.type).toMatch(/^(convertible|option|warrant)$/);
        expect(inst.strikePrice).toBeGreaterThan(0);
        expect(inst.potentialShares).toBeGreaterThan(0);
        expect(inst.source).toBeDefined();
        // BTCS sources: sec.gov for options (10-Q), btcs.com for convertibles (official page)
        expect(inst.sourceUrl).toMatch(/sec\.gov|btcs\.com/);
      }
    });

    it("should have valid instruments for UPXI", () => {
      const upxiInstruments = dilutiveInstruments["UPXI"];
      expect(upxiInstruments).toBeDefined();
      expect(upxiInstruments.length).toBeGreaterThan(0);

      for (const inst of upxiInstruments) {
        expect(inst.type).toMatch(/^(convertible|option|warrant)$/);
        expect(inst.strikePrice).toBeGreaterThan(0);
        expect(inst.potentialShares).toBeGreaterThan(0);
        expect(inst.source).toBeDefined();
        expect(inst.sourceUrl).toContain("sec.gov");
      }
    });

    it("should have valid instruments for ALCPB", () => {
      const altbgInstruments = dilutiveInstruments["ALCPB"];
      expect(altbgInstruments).toBeDefined();
      expect(altbgInstruments.length).toBe(10); // 9 OCA tranches + 1 BSA warrant

      for (const inst of altbgInstruments) {
        expect(inst.type).toMatch(/^(convertible|warrant)$/);
        expect(inst.strikePrice).toBeGreaterThan(0);
        expect(inst.potentialShares).toBeGreaterThan(0);
        expect(inst.source).toContain("Euronext");
      }

      // Total potential dilution should be ~202M shares
      const totalPotential = altbgInstruments.reduce(
        (sum, inst) => sum + inst.potentialShares,
        0
      );
      expect(totalPotential).toBeGreaterThan(200_000_000);
      expect(totalPotential).toBeLessThan(210_000_000);
    });

    it("should calculate ALCPB dilution correctly at low stock price", () => {
      // At $0.80 USD (~€0.77 EUR), instruments at $0.57 and $0.74 are in the money
      const result = getEffectiveShares("ALCPB", 226_884_068, 0.80);

      expect(result.basic).toBe(226_884_068);

      // OCA Tranche 1 ($0.57), BSA ($0.57), OCA B-02 Fulgur/UTXO ($0.74), OCA B-02 Adam Back ($0.74)
      const inMoney = result.breakdown.filter((b) => b.inTheMoney);
      expect(inMoney.length).toBe(4);

      // Total in-money: 89.4M + 13.3M + 82.5M + 17.2M = ~202M
      const totalInMoney = inMoney.reduce((sum, b) => sum + b.potentialShares, 0);
      expect(totalInMoney).toBeGreaterThan(200_000_000);
    });

    it("should include all ALCPB instruments at high stock price", () => {
      // At $10 USD, all instruments are in the money
      const result = getEffectiveShares("ALCPB", 226_884_068, 10.0);

      const inMoney = result.breakdown.filter((b) => b.inTheMoney);
      expect(inMoney.length).toBe(10); // All 10 instruments

      // Total dilution should add ~202M shares
      const totalDilution = inMoney.reduce((sum, b) => sum + b.potentialShares, 0);
      expect(totalDilution).toBeGreaterThan(200_000_000);
    });
  });
});
