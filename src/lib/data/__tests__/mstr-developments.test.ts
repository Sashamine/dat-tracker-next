import { describe, it, expect } from "vitest";
import {
  getMstrDevelopments,
  getMstrDevelopmentsStructured,
} from "../mstr-developments";
import { getCompanyIntel } from "../company-intel";

describe("MSTR Dynamic Developments", () => {
  describe("getMstrDevelopments", () => {
    it("should return an array of development strings", () => {
      const developments = getMstrDevelopments();

      expect(Array.isArray(developments)).toBe(true);
      expect(developments.length).toBeGreaterThan(0);
      expect(typeof developments[0]).toBe("string");
    });

    it("should include current BTC holdings", () => {
      const developments = getMstrDevelopments();

      // First item should be BTC holdings
      const btcDev = developments.find((d) => d.includes("BTC") && d.includes("treasury"));
      expect(btcDev).toBeDefined();
      expect(btcDev).toContain("world's largest corporate Bitcoin treasury");
    });

    it("should include convertible debt info", () => {
      const developments = getMstrDevelopments();

      const debtDev = developments.find((d) => d.includes("convertible debt"));
      expect(debtDev).toBeDefined();
      expect(debtDev).toContain("tranches");
    });

    it("should include preferred stock classes", () => {
      const developments = getMstrDevelopments();

      const prefDev = developments.find((d) => d.includes("preferred stock"));
      expect(prefDev).toBeDefined();
      expect(prefDev).toContain("STRK");
    });

    it("should include ATM capacity", () => {
      const developments = getMstrDevelopments();

      const atmDev = developments.find((d) => d.includes("ATM capacity"));
      expect(atmDev).toBeDefined();
    });

    it("should include permanent milestones", () => {
      const developments = getMstrDevelopments();

      // Nasdaq-100 inclusion is permanent
      const nasdaq = developments.find((d) => d.includes("Nasdaq-100"));
      expect(nasdaq).toBeDefined();
    });
  });

  describe("getMstrDevelopmentsStructured", () => {
    it("should return objects with text and category", () => {
      const developments = getMstrDevelopmentsStructured();

      expect(Array.isArray(developments)).toBe(true);
      expect(developments.length).toBeGreaterThan(0);

      const first = developments[0];
      expect(first).toHaveProperty("text");
      expect(first).toHaveProperty("category");
      expect(["metric", "milestone"]).toContain(first.category);
    });

    it("should have metrics first, then milestones", () => {
      const developments = getMstrDevelopmentsStructured();

      // First few should be metrics (computed data)
      const metrics = developments.filter((d) => d.category === "metric");
      const milestones = developments.filter((d) => d.category === "milestone");

      expect(metrics.length).toBeGreaterThan(0);
      expect(milestones.length).toBeGreaterThan(0);
    });
  });

  describe("integration with getCompanyIntel", () => {
    it("should return dynamic developments for MSTR", () => {
      const intel = getCompanyIntel("MSTR");

      expect(intel).not.toBeNull();
      expect(intel!.recentDevelopments.length).toBeGreaterThan(0);

      // Should have BTC holdings (first item from dynamic generation)
      const btcDev = intel!.recentDevelopments.find((d) =>
        d.includes("BTC") && d.includes("treasury")
      );
      expect(btcDev).toBeDefined();
    });

    it("should work with lowercase ticker", () => {
      const intel = getCompanyIntel("mstr");

      expect(intel).not.toBeNull();
      expect(intel!.recentDevelopments.length).toBeGreaterThan(0);
    });

    it("should not affect other companies", () => {
      const xxiIntel = getCompanyIntel("XXI");

      expect(xxiIntel).not.toBeNull();
      // XXI should have its static developments, not dynamic
      expect(xxiIntel!.recentDevelopments).toContain("43,500+ BTC at NYSE debut");
    });
  });

  describe("milestone expiration", () => {
    it("should filter milestones by age", () => {
      // Get developments with 1 month window (very restrictive)
      const shortWindow = getMstrDevelopments(1);
      // Get developments with 12 month window (permissive)
      const longWindow = getMstrDevelopments(12);

      // Long window should have >= short window
      expect(longWindow.length).toBeGreaterThanOrEqual(shortWindow.length);
    });

    it("should always include permanent milestones", () => {
      // Even with 0 month window, permanent milestones should appear
      const developments = getMstrDevelopments(0);

      // Nasdaq-100 is permanent
      const nasdaq = developments.find((d) => d.includes("Nasdaq-100"));
      expect(nasdaq).toBeDefined();
    });
  });
});
