import { describe, it, expect } from "vitest";
import { getCompanyAhpsMetrics, getAhpsTimeSeries } from "./ahps";
import type { Company } from "@/lib/types";
import type { HoldingsSnapshot } from "@/lib/data/holdings-history";

// Minimal company factory
function makeCompany(overrides: Partial<Company>): Company {
  return {
    id: "test",
    name: "Test Co",
    ticker: "TEST",
    asset: "BTC",
    tier: 1,
    holdings: 1000,
    datStartDate: "2025-01-01",
    sharesForMnav: 100_000_000,
    ...overrides,
  } as Company;
}

function makeSnapshot(
  date: string,
  holdings: number,
  shares: number,
  stockPrice?: number
): HoldingsSnapshot {
  return {
    date,
    holdings,
    sharesOutstanding: shares,
    holdingsPerShare: shares > 0 ? holdings / shares : 0,
    stockPrice,
  };
}

describe("getCompanyAhpsMetrics", () => {
  it("computes basic AHPS when no dilutive instruments exist", () => {
    const company = makeCompany({
      ticker: "UNKNOWN_TICKER",
      holdings: 5000,
      sharesForMnav: 50_000_000,
    });

    const result = getCompanyAhpsMetrics({
      ticker: "UNKNOWN_TICKER",
      company,
    });

    expect(result.currentAhps).toBeCloseTo(5000 / 50_000_000);
    expect(result.method).toBe("basic-shares-only");
    expect(result.usesAdjustedShares).toBe(false);
    expect(result.basicShares).toBe(50_000_000);
    expect(result.dilutedShares).toBe(50_000_000);
    expect(result.notes).toContain("No dilutive instruments");
  });

  it("uses dilution-adjusted shares for BTCS when stock price provided", () => {
    // BTCS has convertible notes in dilutive-instruments.ts
    const company = makeCompany({
      ticker: "BTCS",
      holdings: 70_500,
      sharesForMnav: 47_075_189,
      asset: "ETH",
    });

    const result = getCompanyAhpsMetrics({
      ticker: "BTCS",
      company,
      currentStockPrice: 3.0, // Above $2.15 strike → ITM
    });

    expect(result.method).toBe("dilution-adjusted");
    expect(result.usesAdjustedShares).toBe(true);
    expect(result.dilutedShares).toBeGreaterThan(result.basicShares);
    expect(result.currentAhps).toBeLessThan(70_500 / 47_075_189);
    expect(result.notes).toContain("Dilution-adjusted");
  });

  it("falls back to basic shares when no stock price", () => {
    const company = makeCompany({
      ticker: "BTCS",
      holdings: 70_500,
      sharesForMnav: 47_075_189,
      asset: "ETH",
    });

    const result = getCompanyAhpsMetrics({
      ticker: "BTCS",
      company,
      // no currentStockPrice
    });

    expect(result.method).toBe("basic-shares-only");
    expect(result.usesAdjustedShares).toBe(false);
    expect(result.notes).toContain("no stock price");
  });

  it("returns null growth when history is missing", () => {
    const company = makeCompany({});
    const result = getCompanyAhpsMetrics({ ticker: "TEST", company });

    expect(result.ahpsGrowth90d).toBeNull();
    expect(result.ahpsGrowth90dAnnualized).toBeNull();
  });

  it("computes 90d growth from history snapshots", () => {
    const now = new Date();
    const d100 = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000);
    const d10 = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    const company = makeCompany({
      ticker: "UNKNOWN_TICKER",
      holdings: 1200,
      sharesForMnav: 100_000_000,
      holdingsLastUpdated: d10.toISOString().split("T")[0],
    });

    const history: HoldingsSnapshot[] = [
      makeSnapshot(d100.toISOString().split("T")[0], 1000, 100_000_000),
      makeSnapshot(d10.toISOString().split("T")[0], 1200, 100_000_000),
    ];

    const result = getCompanyAhpsMetrics({
      ticker: "UNKNOWN_TICKER",
      company,
      history,
    });

    // 1200/100M vs 1000/100M = 20% growth
    expect(result.ahpsGrowth90d).toBeCloseTo(20, 0);
    expect(result.ahpsGrowth90dAnnualized).not.toBeNull();
  });

  it("detects dilution-driven AHPS decline", () => {
    const now = new Date();
    const d100 = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000);
    const d10 = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    // Holdings stayed at 1000, but shares doubled
    const company = makeCompany({
      ticker: "UNKNOWN_TICKER",
      holdings: 1000,
      sharesForMnav: 200_000_000,
      holdingsLastUpdated: d10.toISOString().split("T")[0],
    });

    const history: HoldingsSnapshot[] = [
      makeSnapshot(d100.toISOString().split("T")[0], 1000, 100_000_000),
      makeSnapshot(d10.toISOString().split("T")[0], 1000, 200_000_000),
    ];

    const result = getCompanyAhpsMetrics({
      ticker: "UNKNOWN_TICKER",
      company,
      history,
    });

    // 1000/200M vs 1000/100M = -50% growth (dilution)
    expect(result.ahpsGrowth90d).toBeCloseTo(-50, 0);
  });

  it("returns zero AHPS when holdings or shares are zero", () => {
    const company = makeCompany({ holdings: 0, sharesForMnav: 100_000_000 });
    const result = getCompanyAhpsMetrics({ ticker: "TEST", company });
    expect(result.currentAhps).toBe(0);
  });
});

describe("getAhpsTimeSeries", () => {
  it("produces time series from history", () => {
    const history: HoldingsSnapshot[] = [
      makeSnapshot("2025-01-01", 500, 50_000_000),
      makeSnapshot("2025-04-01", 600, 55_000_000),
      makeSnapshot("2025-07-01", 750, 60_000_000),
    ];

    const series = getAhpsTimeSeries("UNKNOWN_TICKER", history);

    expect(series).toHaveLength(3);
    expect(series[0].ahps).toBeCloseTo(500 / 50_000_000);
    expect(series[2].ahps).toBeCloseTo(750 / 60_000_000);
    expect(series[2].basicShares).toBe(60_000_000);
  });

  it("skips snapshots with zero holdings or shares", () => {
    const history: HoldingsSnapshot[] = [
      makeSnapshot("2025-01-01", 0, 50_000_000),
      makeSnapshot("2025-04-01", 600, 0),
      makeSnapshot("2025-07-01", 750, 60_000_000),
    ];

    const series = getAhpsTimeSeries("UNKNOWN_TICKER", history);
    expect(series).toHaveLength(1);
    expect(series[0].date).toBe("2025-07-01");
  });

  it("uses stock prices map for dilution when provided", () => {
    const history: HoldingsSnapshot[] = [
      makeSnapshot("2025-07-01", 70_500, 47_075_189),
    ];

    const prices = new Map([["2025-07-01", 3.0]]);

    // BTCS has dilutive instruments — with price $3, some are ITM
    const series = getAhpsTimeSeries("BTCS", history, prices);

    expect(series).toHaveLength(1);
    expect(series[0].dilutedShares).toBeGreaterThan(series[0].basicShares);
  });
});
