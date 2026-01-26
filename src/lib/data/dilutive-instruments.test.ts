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
      const result = getEffectiveShares("BTCS", 47_075_189, 3.0);

      expect(result.basic).toBe(47_075_189);
      // Options at $2.64 are in the money at $3.00
      // Convertibles at $5.85 and $13.00 are out of the money
      const inMoneyOptions = result.breakdown.find(
        (b) => b.type === "option" && b.inTheMoney
      );
      expect(inMoneyOptions).toBeDefined();
      expect(inMoneyOptions?.potentialShares).toBe(3_223_012);

      // Diluted should include the options
      expect(result.diluted).toBe(47_075_189 + 3_223_012);
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

      expect(formatted).toContain("50,298,201 shares");
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
        expect(inst.sourceUrl).toContain("sec.gov");
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

    it("should have valid instruments for ALTBG", () => {
      const altbgInstruments = dilutiveInstruments["ALTBG"];
      expect(altbgInstruments).toBeDefined();
      expect(altbgInstruments.length).toBe(7); // 7 OCA tranches

      for (const inst of altbgInstruments) {
        expect(inst.type).toBe("convertible");
        expect(inst.strikePrice).toBeGreaterThan(0);
        expect(inst.potentialShares).toBeGreaterThan(0);
        expect(inst.source).toContain("AMF");
        expect(inst.notes).toContain("OCA");
      }

      // Total potential dilution should be ~90M shares
      const totalPotential = altbgInstruments.reduce(
        (sum, inst) => sum + inst.potentialShares,
        0
      );
      expect(totalPotential).toBeGreaterThan(85_000_000);
      expect(totalPotential).toBeLessThan(95_000_000);
    });

    it("should calculate ALTBG dilution correctly at low stock price", () => {
      // At $1.30 USD (~€1.25 EUR), only OCA B-02 at $0.74 is in the money
      const result = getEffectiveShares("ALTBG", 226_884_068, 1.30);

      expect(result.basic).toBe(226_884_068);

      // Only OCA B-02 (82.4M shares at $0.74) should be in the money
      const inMoney = result.breakdown.filter((b) => b.inTheMoney);
      expect(inMoney.length).toBe(1);
      expect(inMoney[0].potentialShares).toBe(82_451_903);

      // Diluted = 227M + 82M = ~309M
      expect(result.diluted).toBe(226_884_068 + 82_451_903);
    });

    it("should include all ALTBG instruments at high stock price", () => {
      // At $10 USD, all instruments are in the money
      const result = getEffectiveShares("ALTBG", 226_884_068, 10.0);

      const inMoney = result.breakdown.filter((b) => b.inTheMoney);
      expect(inMoney.length).toBe(7); // All 7 tranches

      // Total dilution should add ~90M shares
      const totalDilution = inMoney.reduce((sum, b) => sum + b.potentialShares, 0);
      expect(totalDilution).toBeGreaterThan(85_000_000);
    });
  });
});
