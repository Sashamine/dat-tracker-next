import { describe, expect, it } from "vitest";
import type { Company } from "@/lib/types";
import { getAhpsTimeSeries, getCompanyAhpsMetrics, type AhpsHistoryEntry } from "./ahps";

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
): AhpsHistoryEntry {
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
  });

  it("uses dilution-adjusted shares for BTCS when stock price provided", () => {
    const company = makeCompany({
      ticker: "BTCS",
      holdings: 70_500,
      sharesForMnav: 47_075_189,
      asset: "ETH",
    });

    const result = getCompanyAhpsMetrics({
      ticker: "BTCS",
      company,
      currentStockPrice: 3.0,
    });

    expect(result.method).toBe("dilution-adjusted");
    expect(result.usesAdjustedShares).toBe(true);
    expect(result.dilutedShares).toBeGreaterThan(result.basicShares);
    expect(result.currentAhps).toBeLessThan(70_500 / 47_075_189);
  });

  it("falls back to basic shares when no stock price is available", () => {
    const company = makeCompany({
      ticker: "BTCS",
      holdings: 70_500,
      sharesForMnav: 47_075_189,
      asset: "ETH",
    });

    const result = getCompanyAhpsMetrics({
      ticker: "BTCS",
      company,
    });

    expect(result.method).toBe("basic-shares-only");
    expect(result.usesAdjustedShares).toBe(false);
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

    const history: AhpsHistoryEntry[] = [
      makeSnapshot(d100.toISOString().split("T")[0], 1000, 100_000_000),
      makeSnapshot(d10.toISOString().split("T")[0], 1200, 100_000_000),
    ];

    const result = getCompanyAhpsMetrics({
      ticker: "UNKNOWN_TICKER",
      company,
      history,
    });

    expect(result.ahpsGrowth90d).toBeCloseTo(20, 0);
    expect(result.ahpsGrowth90dAnnualized).not.toBeNull();
  });

  it("carries forward an old baseline for 90d growth (no maxLagDays)", () => {
    const now = new Date();
    const stale = new Date(now.getTime() - 250 * 24 * 60 * 60 * 1000);
    const recent = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

    const company = makeCompany({
      ticker: "UNKNOWN_TICKER",
      holdings: 1200,
      sharesForMnav: 100_000_000,
      holdingsLastUpdated: recent.toISOString().split("T")[0],
    });

    const history: AhpsHistoryEntry[] = [
      makeSnapshot(stale.toISOString().split("T")[0], 1000, 100_000_000),
      makeSnapshot(recent.toISOString().split("T")[0], 1200, 100_000_000),
    ];

    const result = getCompanyAhpsMetrics({
      ticker: "UNKNOWN_TICKER",
      company,
      history,
    });

    // 250-day-old snapshot is a valid carry-forward baseline
    expect(result.ahpsGrowth90d).toBeCloseTo(20, 0);
    expect(result.ahpsGrowth90dAnnualized).not.toBeNull();
  });

  it("detects dilution-driven AHPS decline", () => {
    const now = new Date();
    const d100 = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000);
    const d10 = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    const company = makeCompany({
      ticker: "UNKNOWN_TICKER",
      holdings: 1000,
      sharesForMnav: 200_000_000,
      holdingsLastUpdated: d10.toISOString().split("T")[0],
    });

    const history: AhpsHistoryEntry[] = [
      makeSnapshot(d100.toISOString().split("T")[0], 1000, 100_000_000),
      makeSnapshot(d10.toISOString().split("T")[0], 1000, 200_000_000),
    ];

    const result = getCompanyAhpsMetrics({
      ticker: "UNKNOWN_TICKER",
      company,
      history,
    });

    expect(result.ahpsGrowth90d).toBeCloseTo(-50, 0);
  });
});

describe("getAhpsTimeSeries", () => {
  it("produces a time series from history", () => {
    const history: AhpsHistoryEntry[] = [
      makeSnapshot("2025-01-01", 500, 50_000_000),
      makeSnapshot("2025-04-01", 600, 55_000_000),
      makeSnapshot("2025-07-01", 750, 60_000_000),
    ];

    const series = getAhpsTimeSeries("UNKNOWN_TICKER", history);

    expect(series).toHaveLength(3);
    expect(series[0].ahps).toBeCloseTo(500 / 50_000_000);
    expect(series[2].ahps).toBeCloseTo(750 / 60_000_000);
  });

  it("uses stock prices map for dilution when provided", () => {
    const history: AhpsHistoryEntry[] = [
      makeSnapshot("2025-07-01", 70_500, 47_075_189),
    ];

    const prices = new Map([["2025-07-01", 3.0]]);
    const series = getAhpsTimeSeries("BTCS", history, prices);

    expect(series).toHaveLength(1);
    expect(series[0].dilutedShares).toBeGreaterThan(series[0].basicShares);
  });
});
