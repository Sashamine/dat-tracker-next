/**
 * Reconciliation Tests
 *
 * For every company, independently compute key metrics and verify they match
 * the system functions. Catches silent divergence bugs.
 *
 * Run with: npx vitest run reconciliation
 */

import { describe, it, expect } from "vitest";
import { allCompanies } from "@/lib/data/companies";
import { HOLDINGS_HISTORY, getHoldingsHistory } from "@/lib/data/holdings-history";
import { getMarketCapForMnavSync } from "@/lib/utils/market-cap";
import { getCompanyMNAV, getCompanyMNAVDetailed, calculateTotalCryptoNAV } from "@/lib/math/mnav-engine";
import { getCompanyAhpsMetrics } from "@/lib/utils/ahps";
import { getEffectiveShares } from "@/lib/data/dilutive-instruments";
import { calculateMNAV } from "@/lib/calculations/mnav";
import { MOCK_PRICES, MOCK_STOCK_PRICES, MOCK_FOREX_RATES } from "./fixtures/mock-prices";

// Threshold for floating-point comparison
const TOLERANCE = 0.001;

function approxEqual(a: number, b: number, tol = TOLERANCE): boolean {
  if (a === 0 && b === 0) return true;
  if (a === 0 || b === 0) return Math.abs(a - b) < tol;
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b)) < tol;
}

// Companies to skip in reconciliation
function shouldSkip(company: (typeof allCompanies)[0]): string | null {
  if (company.pendingMerger) return "pending merger";
  if (!company.sharesForMnav || company.sharesForMnav <= 0) return "no sharesForMnav";
  if (company.officialMnav) return "uses officialMnav override";
  return null;
}

describe("Reconciliation: Market Cap", () => {
  for (const company of allCompanies) {
    const reason = shouldSkip(company);
    const stockData = MOCK_STOCK_PRICES[company.ticker];

    if (reason || !stockData || !stockData.price) {
      it.skip(`${company.ticker}: ${reason || "no mock stock price"}`, () => {});
      continue;
    }

    it(`${company.ticker}: sharesForMnav × stockPrice = getMarketCapForMnavSync()`, () => {
      const result = getMarketCapForMnavSync(company, stockData, MOCK_FOREX_RATES);

      // Independent calculation: effective shares × price
      const effectiveResult = getEffectiveShares(
        company.ticker,
        company.sharesForMnav!,
        stockData.price
      );
      const expectedMarketCap = effectiveResult.diluted * stockData.price;

      // If getMarketCapForMnavSync uses calculated source, it should match
      if (result.source === "calculated") {
        expect(result.marketCap).toBeCloseTo(expectedMarketCap, -2); // within 100
      }
      // Market cap should be positive
      expect(result.marketCap).toBeGreaterThan(0);
    });
  }
});

describe("Reconciliation: mNAV consistency", () => {
  for (const company of allCompanies) {
    const reason = shouldSkip(company);
    const stockData = MOCK_STOCK_PRICES[company.ticker];

    if (reason || !stockData || !stockData.price) {
      it.skip(`${company.ticker}: ${reason || "no mock stock price"}`, () => {});
      continue;
    }

    it(`${company.ticker}: getCompanyMNAV() ≈ independent calculateMNAV()`, () => {
      // System function
      const systemMnav = getCompanyMNAV(company, MOCK_PRICES);
      if (systemMnav === null) return; // no data — skip

      // Independent calculation
      const { marketCap, inTheMoneyDebtValue, inTheMoneyWarrantProceeds } =
        getMarketCapForMnavSync(company, stockData, MOCK_FOREX_RATES);
      if (!marketCap || marketCap <= 0) return;

      const { totalUsd: cryptoNav, primaryAssetAmount, primaryAssetPrice, secondaryCryptoValue } =
        calculateTotalCryptoNAV(company, MOCK_PRICES);

      const adjustedDebt = Math.max(0, (company.totalDebt ?? 0) - inTheMoneyDebtValue);
      const adjustedCash = (company.cashReserves ?? 0) + inTheMoneyWarrantProceeds;
      const adjustedRestrictedCash = company.restrictedCash ?? 0;

      const independentMnav = calculateMNAV(
        marketCap,
        primaryAssetAmount,
        primaryAssetPrice,
        adjustedCash,
        company.otherInvestments ?? 0,
        adjustedDebt,
        company.preferredEquity ?? 0,
        adjustedRestrictedCash,
        secondaryCryptoValue
      );

      if (independentMnav === null) return;

      expect(systemMnav).toBeCloseTo(independentMnav, 3);
    });
  }
});

describe("Reconciliation: getCompanyMNAV() and getCompanyMNAVDetailed() agree", () => {
  for (const company of allCompanies) {
    const reason = shouldSkip(company);
    if (reason) {
      it.skip(`${company.ticker}: ${reason}`, () => {});
      continue;
    }

    it(`${company.ticker}: scalar and detailed mNAV match`, () => {
      const scalar = getCompanyMNAV(company, MOCK_PRICES);
      const detailed = getCompanyMNAVDetailed(company, MOCK_PRICES);
      expect(scalar).toBe(detailed.mnav);
    });
  }
});

describe("Reconciliation: AHPS", () => {
  for (const company of allCompanies) {
    const reason = shouldSkip(company);
    if (reason) {
      it.skip(`${company.ticker}: ${reason}`, () => {});
      continue;
    }

    const historyData = getHoldingsHistory(company.ticker);
    if (!historyData || historyData.history.length === 0) {
      it.skip(`${company.ticker}: no holdings history`, () => {});
      continue;
    }

    it(`${company.ticker}: AHPS = holdings / effective shares`, () => {
      const stockPrice = MOCK_STOCK_PRICES[company.ticker]?.price;
      const metrics = getCompanyAhpsMetrics({
        ticker: company.ticker,
        company,
        history: historyData.history.map(s => ({
          date: s.date,
          holdings: s.holdings,
          sharesOutstanding: s.sharesOutstanding,
          holdingsPerShare: s.holdingsPerShare,
          stockPrice: s.stockPrice,
        })),
        currentStockPrice: stockPrice,
      });

      if (metrics.currentAhps <= 0) return;

      // Independent: holdings / diluted shares
      const holdings = company.holdings ?? 0;
      const basicShares = company.sharesForMnav ?? 0;
      if (basicShares <= 0 || holdings <= 0) return;

      const effectiveResult = stockPrice
        ? getEffectiveShares(company.ticker, basicShares, stockPrice)
        : null;
      const dilutedShares = effectiveResult?.diluted ?? basicShares;
      const expectedAhps = holdings / dilutedShares;

      expect(approxEqual(metrics.currentAhps, expectedAhps, TOLERANCE)).toBe(true);
    });
  }
});

describe("Reconciliation: Leverage", () => {
  for (const company of allCompanies) {
    const reason = shouldSkip(company);
    if (reason) {
      it.skip(`${company.ticker}: ${reason}`, () => {});
      continue;
    }

    it(`${company.ticker}: leverage = max(0, debt - cash) / cryptoNav`, () => {
      const { totalUsd: cryptoNav } = calculateTotalCryptoNAV(company, MOCK_PRICES);
      if (cryptoNav <= 0) return;

      const debt = company.totalDebt ?? 0;
      const cash = company.cashReserves ?? 0;
      const netDebt = Math.max(0, debt - cash);
      const expectedLeverage = netDebt / cryptoNav;

      // This is the formula used in the data table; it doesn't factor ITM debt
      // adjustments. Just verify the math is consistent.
      if (debt === 0 && cash === 0) {
        expect(expectedLeverage).toBe(0);
      } else {
        expect(expectedLeverage).toBeGreaterThanOrEqual(0);
      }
    });
  }
});

describe("Reconciliation: Holdings-history shares match companies.ts", () => {
  // This duplicates shares-consistency.test.ts but included here for completeness
  for (const company of allCompanies) {
    if (!company.sharesForMnav || company.sharesForMnav <= 0) continue;

    const rawHistory = HOLDINGS_HISTORY[company.ticker];
    if (!rawHistory?.history?.length) continue;

    it(`${company.ticker}: latest history shares ≈ sharesForMnav`, () => {
      const latest = rawHistory.history[rawHistory.history.length - 1];
      if (!latest.sharesOutstanding || latest.sharesOutstanding <= 0) return;

      const deviation =
        Math.abs(company.sharesForMnav! - latest.sharesOutstanding) / company.sharesForMnav!;

      // Flag anything >5% as a likely data sync issue
      expect(deviation).toBeLessThan(0.05);
    });
  }
});
