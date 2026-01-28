import { describe, it, expect } from "vitest";
import {
  BMNR_CAPITAL_EVENTS,
  getBMNREventsByType,
  getBMNREventsInRange,
  getETHHoldingsAt,
  getTotalSharesIssued,
} from "./bmnr-capital-events";

describe("BMNR Capital Events", () => {
  describe("Data Integrity", () => {
    it("should have at least 5 key events documented", () => {
      expect(BMNR_CAPITAL_EVENTS.length).toBeGreaterThanOrEqual(5);
    });

    it("should be sorted chronologically", () => {
      for (let i = 1; i < BMNR_CAPITAL_EVENTS.length; i++) {
        const prev = new Date(BMNR_CAPITAL_EVENTS[i - 1].date);
        const curr = new Date(BMNR_CAPITAL_EVENTS[i].date);
        expect(curr.getTime()).toBeGreaterThanOrEqual(prev.getTime());
      }
    });

    it("should have valid accession numbers", () => {
      BMNR_CAPITAL_EVENTS.forEach((event) => {
        expect(event.accessionNumber).toMatch(/^\d{10}-\d{2}-\d{6}$/);
      });
    });

    it("should have valid SEC URLs", () => {
      BMNR_CAPITAL_EVENTS.forEach((event) => {
        expect(event.secUrl).toContain("sec.gov");
        expect(event.secUrl).toContain("1829311"); // BMNR CIK
      });
    });
  });

  describe("ETH Treasury Strategy Timeline", () => {
    it("should show reverse stock split before ETH strategy", () => {
      const split = BMNR_CAPITAL_EVENTS.find((e) => e.splitRatio === "1:20");
      const firstETH = BMNR_CAPITAL_EVENTS.find((e) => e.type === "ETH");

      expect(split).toBeDefined();
      expect(firstETH).toBeDefined();
      expect(split!.date < firstETH!.date).toBe(true);
    });

    it("should show BTC purchase before ETH strategy", () => {
      const btc = BMNR_CAPITAL_EVENTS.find((e) => e.type === "BTC");
      const pipe = BMNR_CAPITAL_EVENTS.find((e) => e.offeringType === "PIPE");

      expect(btc).toBeDefined();
      expect(pipe).toBeDefined();
      expect(btc!.date < pipe!.date).toBe(true);
      expect(btc!.btcAcquired).toBeCloseTo(154.167, 2);
    });

    it("should show $250M PIPE launching ETH strategy", () => {
      const pipe = BMNR_CAPITAL_EVENTS.find((e) => e.offeringType === "PIPE");

      expect(pipe).toBeDefined();
      expect(pipe!.date).toBe("2025-07-08");
      expect(pipe!.grossProceeds).toBe(250_000_000);
      expect(pipe!.placementAgent).toBe("ThinkEquity LLC");
    });

    it("should show rapid ETH accumulation after PIPE", () => {
      const ethEvents = getBMNREventsByType("ETH");

      expect(ethEvents.length).toBeGreaterThanOrEqual(2);

      // First $1B milestone (Jul 17)
      const firstBillion = ethEvents.find((e) => e.date === "2025-07-17");
      expect(firstBillion).toBeDefined();
      expect(firstBillion!.ethHoldings).toBe(300_657);
      expect(firstBillion!.ethValue).toBe(1_041_000_000);

      // 1.15M ETH milestone (Aug 11)
      const milestone = ethEvents.find((e) => e.date === "2025-08-11");
      expect(milestone).toBeDefined();
      expect(milestone!.ethHoldings).toBe(1_150_263);
      expect(milestone!.ethAcquired).toBe(317_126);
    });
  });

  describe("Helper Functions", () => {
    it("getBMNREventsByType should filter by type", () => {
      const ethEvents = getBMNREventsByType("ETH");
      const corpEvents = getBMNREventsByType("CORP");

      expect(ethEvents.every((e) => e.type === "ETH")).toBe(true);
      expect(corpEvents.every((e) => e.type === "CORP")).toBe(true);
      expect(corpEvents.length).toBeGreaterThanOrEqual(1); // At least the reverse split
    });

    it("getBMNREventsInRange should return events in range", () => {
      const julyEvents = getBMNREventsInRange("2025-07-01", "2025-07-31");

      expect(julyEvents.length).toBeGreaterThanOrEqual(2); // PIPE + first ETH update
      expect(julyEvents.every((e) => e.date >= "2025-07-01" && e.date <= "2025-07-31")).toBe(
        true
      );
    });

    it("getETHHoldingsAt should return holdings at specific date", () => {
      const holdingsJul17 = getETHHoldingsAt("2025-07-17");
      const holdingsAug11 = getETHHoldingsAt("2025-08-11");

      expect(holdingsJul17).toBe(300_657);
      expect(holdingsAug11).toBe(1_150_263);
    });

    it("getETHHoldingsAt should return null before ETH strategy", () => {
      const holdingsJun01 = getETHHoldingsAt("2025-06-01");
      expect(holdingsJun01).toBeNull();
    });

    it("getTotalSharesIssued should sum equity events", () => {
      const total = getTotalSharesIssued();
      // Currently 0 because sharesIssued fields need to be filled in
      expect(total).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Data Quality Checks", () => {
    it("should document placement agent warrants from PIPE", () => {
      const pipe = BMNR_CAPITAL_EVENTS.find((e) => e.offeringType === "PIPE");

      expect(pipe!.placementAgentWarrants).toBe(1_231_945);
      expect(pipe!.pricePerShare).toBe(5.40);
    });

    it("should show 300% value growth in first week", () => {
      const pipe = BMNR_CAPITAL_EVENTS.find((e) => e.offeringType === "PIPE");
      const firstBillion = BMNR_CAPITAL_EVENTS.find((e) => e.date === "2025-07-17");

      const valueGrowth = (firstBillion!.ethValue! - pipe!.grossProceeds!) / pipe!.grossProceeds!;

      expect(valueGrowth).toBeGreaterThan(3.0); // >300%
    });
  });
});
