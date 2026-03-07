/**
 * mNAV Data Integrity Checks
 *
 * Detects misclassification errors that produce internally-consistent
 * but incorrect mNAV calculations. Each check targets a specific exploit
 * pattern discovered through adversarial review.
 *
 * Run with: npx vitest run mnav-integrity
 */

import { describe, it, expect } from "vitest";
import { allCompanies } from "./companies";
import { HOLDINGS_HISTORY } from "./holdings-history";
import { dilutiveInstruments } from "./dilutive-instruments";
import type { Company } from "../types";

// ─────────────────────────────────────────────────────────────
// Check 1: Diluted-as-basic swap
//
// Exploit: Use fully diluted shares for sharesForMnav + set totalDebt=0,
// hiding convertible debt inside the share count.
// Impact: EV understated (missing debt), mNAV looks better.
// Caught: OBTC3 (162.3M diluted + $0 debt → 155.3M basic + $24.9M debt)
// ─────────────────────────────────────────────────────────────
describe("Check 1: Diluted-as-basic swap", () => {
  it("sharesForMnav should equal basic shares when dilutive instruments are tracked", () => {
    const violations: string[] = [];

    for (const company of allCompanies) {
      const instruments = dilutiveInstruments[company.ticker];
      if (!instruments?.length) continue;
      if (!company.sharesForMnav) continue;

      const totalPotentialShares = instruments.reduce(
        (sum, inst) => sum + inst.potentialShares,
        0
      );

      // If sharesForMnav is suspiciously close to basic + dilutive shares,
      // it's probably using diluted instead of basic
      const history = HOLDINGS_HISTORY[company.ticker]?.history;
      if (!history?.length) continue;

      const latestHistory = history[history.length - 1];
      const historyShares = latestHistory.sharesOutstanding;
      if (!historyShares) continue;

      // sharesForMnav should be close to history's basic shares,
      // NOT close to history's basic + instrument shares
      const dilutedEstimate = historyShares + totalPotentialShares;
      const deviationFromBasic =
        Math.abs(company.sharesForMnav - historyShares) / historyShares;
      const deviationFromDiluted =
        Math.abs(company.sharesForMnav - dilutedEstimate) / dilutedEstimate;

      // If sharesForMnav is closer to diluted than basic, flag it
      if (
        deviationFromDiluted < deviationFromBasic &&
        deviationFromBasic > 0.02
      ) {
        violations.push(
          `${company.ticker}: sharesForMnav (${company.sharesForMnav.toLocaleString()}) ` +
            `looks diluted (closer to ${dilutedEstimate.toLocaleString()} diluted ` +
            `than ${historyShares.toLocaleString()} basic). ` +
            `Should use basic shares + let dilutive-instruments handle dilution.`,
        );
      }
    }

    if (violations.length > 0) {
      console.log("\n=== DILUTED-AS-BASIC SWAP DETECTED ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail — some companies use dynamic share estimators (BMNR)
    // or have legitimate reasons for deviation. Review manually.
    // expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 2: Hidden debt (OTM convertibles missing from totalDebt)
//
// Exploit: Track convertibles in dilutive-instruments but don't
// include their face value in totalDebt when they're OTM.
// Impact: EV understated by the face value of OTM converts.
// ─────────────────────────────────────────────────────────────
describe("Check 2: Hidden debt", () => {
  it("OTM convertible face values should be covered by totalDebt", () => {
    const violations: string[] = [];

    for (const company of allCompanies) {
      const instruments = dilutiveInstruments[company.ticker];
      if (!instruments?.length) continue;

      // Sum face values of active convertibles (they're debt until converted/expired)
      const now = new Date().toISOString().slice(0, 10);
      const convertibles = instruments.filter(
        (inst) => inst.type === "convertible" && inst.faceValue &&
          (!inst.expiration || inst.expiration > now),
      );
      if (!convertibles.length) continue;

      const totalConvertFaceValue = convertibles.reduce(
        (sum, inst) => sum + (inst.faceValue ?? 0),
        0,
      );

      const totalDebt = company.totalDebt ?? 0;

      // totalDebt should be >= sum of convertible face values
      // (company may have other debt too, so >= not ==)
      if (totalDebt < totalConvertFaceValue * 0.8) {
        // 20% tolerance for FX/rounding
        violations.push(
          `${company.ticker}: totalDebt ($${(totalDebt / 1e6).toFixed(1)}M) ` +
            `< convertible face values ($${(totalConvertFaceValue / 1e6).toFixed(1)}M). ` +
            `Debt: $${totalDebt.toLocaleString()}, ` +
            `Converts: $${totalConvertFaceValue.toLocaleString()}`,
        );
      }
    }

    if (violations.length > 0) {
      console.log("\n=== HIDDEN DEBT DETECTED ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
      console.log(
        "\n  Action: For each, verify if totalDebt should include convertible face values.",
      );
      console.log(
        "  If sharesForMnav already uses diluted count (includes converts as equity),",
      );
      console.log(
        "  switch to basic shares + add face value to totalDebt.\n",
      );
    }
    // Soft fail for now — each violation needs individual research
    // TODO: Fix these then uncomment: expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 4: Stale cross-fields
//
// Exploit: Update holdings (BTC goes up) but leave debt/shares stale.
// If company raised debt to buy BTC, the missing debt flatters mNAV.
// ─────────────────────────────────────────────────────────────
describe("Check 4: Stale cross-fields", () => {
  it("debt/cash/shares dates should be within 180 days of holdings date", () => {
    const violations: string[] = [];
    const MAX_STALENESS_DAYS = 180;

    for (const company of allCompanies) {
      if (!company.holdingsLastUpdated) continue;
      const holdingsDate = new Date(company.holdingsLastUpdated).getTime();

      const fields: Array<{ name: string; date?: string }> = [
        { name: "debtAsOf", date: company.debtAsOf },
        { name: "cashAsOf", date: company.cashAsOf },
        { name: "sharesAsOf", date: company.sharesAsOf },
      ];

      for (const field of fields) {
        if (!field.date) continue;
        const fieldDate = new Date(field.date).getTime();
        const daysDiff = Math.abs(holdingsDate - fieldDate) / 86_400_000;

        if (daysDiff > MAX_STALENESS_DAYS) {
          violations.push(
            `${company.ticker}: ${field.name} (${field.date}) is ${Math.round(daysDiff)}d ` +
              `from holdingsLastUpdated (${company.holdingsLastUpdated})`,
          );
        }
      }
    }

    if (violations.length > 0) {
      console.log(
        `\n=== STALE CROSS-FIELDS (>${MAX_STALENESS_DAYS}d gap) ===\n`,
      );
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail — log for now, too many companies may have gaps
    // expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 6: Share count cherry-picking (stale shares)
//
// Exploit: Use an old, lower share count even when newer filings
// show dilution. Lower shares → lower market cap → lower mNAV.
// ─────────────────────────────────────────────────────────────
describe("Check 6: Share count staleness", () => {
  it("sharesAsOf should not lag holdingsLastUpdated by >90 days", () => {
    const violations: string[] = [];
    const MAX_LAG_DAYS = 90;

    for (const company of allCompanies) {
      if (!company.holdingsLastUpdated || !company.sharesAsOf) continue;

      const holdingsDate = new Date(company.holdingsLastUpdated).getTime();
      const sharesDate = new Date(company.sharesAsOf).getTime();
      const lagDays = (holdingsDate - sharesDate) / 86_400_000;

      if (lagDays > MAX_LAG_DAYS) {
        violations.push(
          `${company.ticker}: shares (${company.sharesAsOf}) lag holdings ` +
            `(${company.holdingsLastUpdated}) by ${Math.round(lagDays)} days. ` +
            `Share count may be stale — check for dilution events.`,
        );
      }
    }

    if (violations.length > 0) {
      console.log(
        `\n=== STALE SHARE COUNTS (>${MAX_LAG_DAYS}d lag) ===\n`,
      );
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail
    // expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 10: Missing dilutive instruments
//
// Exploit: Company has warrants/converts mentioned in notes but
// no entry in dilutive-instruments.ts → AHPS and mNAV ignore
// potential dilution entirely.
// ─────────────────────────────────────────────────────────────
describe("Check 10: Missing dilutive instruments", () => {
  const DILUTION_KEYWORDS =
    /\bwarrant|convertible|debenture|convert\b|dilut(?:ive|ed|ion)/i;

  it("companies mentioning dilutive instruments in notes should have entries in dilutive-instruments.ts", () => {
    const violations: string[] = [];

    for (const company of allCompanies) {
      const text = [company.notes, company.debtSourceQuote, company.sharesSourceQuote]
        .filter(Boolean)
        .join(" ");

      if (!DILUTION_KEYWORDS.test(text)) continue;

      const hasInstruments =
        (dilutiveInstruments[company.ticker]?.length ?? 0) > 0;
      if (hasInstruments) continue;

      // Extract matching keywords for the message
      const matches = text.match(
        /\b(warrant|convertible|debenture|convert(?:ed|s|ible)?|dilut(?:ive|ed|ion))\b/gi,
      );
      const uniqueMatches = [...new Set(matches?.map((m) => m.toLowerCase()))];

      violations.push(
        `${company.ticker} (${company.name}): notes mention [${uniqueMatches.join(", ")}] ` +
          `but no dilutive instruments tracked`,
      );
    }

    if (violations.length > 0) {
      console.log("\n=== MISSING DILUTIVE INSTRUMENTS ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail — many companies may have unresearched dilutives
    // expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 3: Cash inflation
//
// Exploit: Include restricted cash in cashReserves (gets subtracted
// from EV), making mNAV look better.
// Also flags suspiciously high cash (>20% of market cap).
// ─────────────────────────────────────────────────────────────
describe("Check 3: Cash inflation", () => {
  it("cashReserves should not be suspiciously high relative to market cap", () => {
    const violations: string[] = [];
    const MAX_CASH_PCT = 0.20; // 20% of market cap

    for (const company of allCompanies) {
      const cash = company.cashReserves ?? 0;
      if (cash === 0) continue;

      // Estimate market cap from shares × typical price (if we had it)
      // For now, use static marketCap if available
      const marketCap = company.marketCap;
      if (!marketCap || marketCap === 0) continue;

      const cashPct = cash / marketCap;
      if (cashPct > MAX_CASH_PCT) {
        violations.push(
          `${company.ticker}: cashReserves ($${(cash / 1e6).toFixed(1)}M) = ` +
            `${(cashPct * 100).toFixed(0)}% of marketCap ($${(marketCap / 1e6).toFixed(0)}M). ` +
            `Verify cash isn't restricted or inflated.`,
        );
      }
    }

    if (violations.length > 0) {
      console.log("\n=== HIGH CASH / MARKET CAP RATIO ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail — some companies legitimately have high cash ratios
    // expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 9: Double-counting ITM converts
//
// Exploit (inverse): Convertibles counted in both diluted shares
// AND totalDebt simultaneously → EV overstated.
// The system should subtract ITM convert face values from debt.
// This check verifies the math is possible (faceValue exists).
// ─────────────────────────────────────────────────────────────
describe("Check 9: Double-counting prevention", () => {
  it("all convertible instruments should have faceValue for debt adjustment", () => {
    const violations: string[] = [];

    for (const [ticker, instruments] of Object.entries(dilutiveInstruments)) {
      const convertibles = instruments.filter(
        (inst) => inst.type === "convertible",
      );
      for (const conv of convertibles) {
        if (conv.strikePrice === 0) continue; // $0 strike = preferred/RSU, not debt
        // Skip if tracked in preferredEquity instead of debt (e.g., Metaplanet Mercury)
        if (conv.notes?.includes("preferredEquity")) continue;

        if (!conv.faceValue || conv.faceValue === 0) {
          violations.push(
            `${ticker}: convertible at $${conv.strikePrice} strike has no faceValue. ` +
              `Cannot subtract from debt when ITM → potential double-counting. ` +
              `Source: ${conv.source}`,
          );
        }
      }
    }

    if (violations.length > 0) {
      console.log("\n=== CONVERTIBLES MISSING FACE VALUE ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail — need to research face values for each
    // TODO: Fix these then uncomment: expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 7: Preferred equity omission
//
// Exploit: Preferred stock not added to EV calculation.
// Impact: EV understated → mNAV looks better.
// ─────────────────────────────────────────────────────────────
describe("Check 7: Preferred equity omission", () => {
  const PREFERRED_KEYWORDS = /\bpreferred\s+(?:stock|equity|shares?)\b/i;

  it("companies mentioning preferred stock should have preferredEquity set", () => {
    const violations: string[] = [];

    for (const company of allCompanies) {
      const text = [company.notes, company.debtSourceQuote]
        .filter(Boolean)
        .join(" ");

      if (!PREFERRED_KEYWORDS.test(text)) continue;

      const hasPref = (company.preferredEquity ?? 0) > 0;
      if (hasPref) continue;

      // Skip if the notes say "no preferred" or similar
      if (/no\s+preferred|non-convertible/i.test(text)) continue;

      violations.push(
        `${company.ticker} (${company.name}): notes mention preferred stock ` +
          `but preferredEquity is ${company.preferredEquity ?? "undefined"}`,
      );
    }

    if (violations.length > 0) {
      console.log("\n=== PREFERRED EQUITY OMISSION ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail
    // expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 11: Impossible restrictedCash
//
// restrictedCash > cashReserves is an impossible state — you can't
// restrict more cash than you have. Also catches restrictedCash ==
// cashReserves (100% restricted means freeCash = 0, may be wrong).
// ─────────────────────────────────────────────────────────────
describe("Check 11: Impossible restrictedCash", () => {
  it("restrictedCash should not exceed cashReserves", () => {
    const violations: string[] = [];

    for (const company of allCompanies) {
      const cash = company.cashReserves ?? 0;
      const restricted = company.restrictedCash ?? 0;
      if (restricted === 0) continue;

      if (restricted > cash) {
        violations.push(
          `${company.ticker}: restrictedCash ($${(restricted / 1e6).toFixed(1)}M) > ` +
            `cashReserves ($${(cash / 1e6).toFixed(1)}M). Impossible state.`,
        );
      } else if (restricted === cash && cash > 0) {
        violations.push(
          `${company.ticker}: restrictedCash ($${(restricted / 1e6).toFixed(1)}M) == ` +
            `cashReserves ($${(cash / 1e6).toFixed(1)}M). 100% restricted — ` +
            `verify this is intentional (freeCash = $0).`,
        );
      }
    }

    if (violations.length > 0) {
      console.log("\n=== IMPOSSIBLE RESTRICTED CASH ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    expect(violations.filter((v) => v.includes("Impossible"))).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 12: Currency mismatch on balance sheet items
//
// Exploit: Enter JPY/HKD/BRL balance sheet values as USD.
// Impact: A ¥1B debt (~$6.5M) entered as $1B inflates EV by 150x.
// Detection: If company.currency is non-USD and balance sheet items
// seem too large relative to market cap, flag for review.
// ─────────────────────────────────────────────────────────────
describe("Check 12: Currency mismatch on balance sheet", () => {
  // Rough USD conversion factors — used only for sanity bounds
  const FX_RATES: Record<string, number> = {
    JPY: 155, HKD: 7.8, BRL: 5.1, SEK: 10.5, CAD: 1.35,
    EUR: 0.92, GBP: 0.79, NOK: 10.7, KRW: 1350, AED: 3.67, AUD: 1.55,
  };

  it("non-USD companies should not have suspiciously large USD-denominated balance sheet items", () => {
    const violations: string[] = [];

    for (const company of allCompanies) {
      if (!company.currency || company.currency === "USD") continue;
      const rate = FX_RATES[company.currency];
      if (!rate) continue;

      const marketCap = company.marketCap ?? 0;
      if (marketCap === 0) continue;

      // Check each balance sheet item — if it's > 5x market cap, it might be in local currency
      const fields: Array<{ name: string; value: number }> = [
        { name: "totalDebt", value: company.totalDebt ?? 0 },
        { name: "cashReserves", value: company.cashReserves ?? 0 },
        { name: "preferredEquity", value: company.preferredEquity ?? 0 },
      ];

      for (const field of fields) {
        if (field.value === 0) continue;
        const ratio = field.value / marketCap;
        if (ratio > 5 && field.value > 1_000_000) {
          // Check if dividing by FX rate makes it more reasonable
          const convertedRatio = (field.value / rate) / marketCap;
          if (convertedRatio < 2) {
            violations.push(
              `${company.ticker} (${company.currency}): ${field.name} ($${(field.value / 1e6).toFixed(1)}M) ` +
                `is ${ratio.toFixed(0)}x marketCap ($${(marketCap / 1e6).toFixed(0)}M). ` +
                `Dividing by ${rate} (${company.currency}/USD) gives ${convertedRatio.toFixed(1)}x — ` +
                `value may be in ${company.currency}, not USD.`,
            );
          }
        }
      }
    }

    if (violations.length > 0) {
      console.log("\n=== POSSIBLE CURRENCY MISMATCH ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail — needs manual review
    // expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 13: Market cap override staleness
//
// MARKET_CAP_OVERRIDES and FALLBACK_STOCKS are static values that
// drift from reality over time. Flag overrides that are stale.
// ─────────────────────────────────────────────────────────────
import { MARKET_CAP_OVERRIDES, FALLBACK_STOCKS } from "./market-cap-overrides";

describe("Check 13: Market cap override staleness", () => {
  it("companies with sharesForMnav should not need market cap overrides", () => {
    const violations: string[] = [];

    for (const ticker of Object.keys(MARKET_CAP_OVERRIDES)) {
      const company = allCompanies.find((c) => c.ticker === ticker);
      if (!company) continue;
      if (!company.sharesForMnav) continue;

      // If company has sharesForMnav, calculated market cap is more accurate
      // than a static override — the override may be stale
      violations.push(
        `${ticker}: has both sharesForMnav (${company.sharesForMnav.toLocaleString()}) ` +
          `and MARKET_CAP_OVERRIDES ($${(MARKET_CAP_OVERRIDES[ticker] / 1e6).toFixed(0)}M). ` +
          `Override may be stale — calculated market cap is more accurate.`,
      );
    }

    if (violations.length > 0) {
      console.log("\n=== REDUNDANT MARKET CAP OVERRIDES ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail — some overrides may still be needed (e.g., non-USD price feeds)
    // expect(violations).toHaveLength(0);
  });

  it("FALLBACK_STOCKS should have matching entries in allCompanies", () => {
    const violations: string[] = [];

    for (const ticker of Object.keys(FALLBACK_STOCKS)) {
      const company = allCompanies.find((c) => c.ticker === ticker);
      if (!company) {
        violations.push(
          `${ticker}: in FALLBACK_STOCKS but not found in allCompanies. ` +
            `Orphaned fallback entry.`,
        );
      }
    }

    if (violations.length > 0) {
      console.log("\n=== ORPHANED FALLBACK STOCKS ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 14: Duplicate companies
//
// Same company appearing twice (e.g., ticker alias, copy-paste).
// Duplicates corrupt aggregates (total BTC held, etc.).
// ─────────────────────────────────────────────────────────────
describe("Check 14: Duplicate companies", () => {
  it("no duplicate tickers", () => {
    const seen = new Map<string, string>();
    const violations: string[] = [];

    for (const company of allCompanies) {
      const existing = seen.get(company.ticker);
      if (existing) {
        violations.push(
          `${company.ticker}: appears twice — "${existing}" and "${company.name}"`,
        );
      }
      seen.set(company.ticker, company.name);
    }

    expect(violations).toHaveLength(0);
  });

  it("no duplicate company IDs", () => {
    const seen = new Map<string, string>();
    const violations: string[] = [];

    for (const company of allCompanies) {
      const existing = seen.get(company.id);
      if (existing) {
        violations.push(
          `id "${company.id}": used by both "${existing}" and "${company.name}" (${company.ticker})`,
        );
      }
      seen.set(company.id, company.name);
    }

    expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 15: Pending merger consistency
//
// Pre-merger SPACs should have pendingMerger=true and holdings=0
// (or expectedHoldings set). If they have real holdings but no
// pendingMerger flag, the mNAV is misleading.
// ─────────────────────────────────────────────────────────────
describe("Check 15: Pending merger consistency", () => {
  it("pendingMerger companies should have holdings=0 or expectedHoldings", () => {
    const violations: string[] = [];

    for (const company of allCompanies) {
      if (!company.pendingMerger) continue;

      if (company.holdings > 0 && !company.expectedHoldings) {
        violations.push(
          `${company.ticker}: pendingMerger=true but holdings=${company.holdings.toLocaleString()} ` +
            `with no expectedHoldings. Pre-merger SPACs should have holdings=0.`,
        );
      }
    }

    if (violations.length > 0) {
      console.log("\n=== PENDING MERGER INCONSISTENCY ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 16: HPS sanity bounds
//
// Holdings per share (HPS) should be within reasonable bounds.
// Extremely high or low HPS may indicate a share count error.
// ─────────────────────────────────────────────────────────────
describe("Check 16: HPS sanity bounds", () => {
  it("holdingsPerShare in history should be within plausible range", () => {
    const violations: string[] = [];

    for (const [ticker, data] of Object.entries(HOLDINGS_HISTORY)) {
      if (!data?.history?.length) continue;

      for (const entry of data.history) {
        if (!entry.holdingsPerShare || !entry.sharesOutstanding) continue;

        // Verify HPS = holdings / shares (allow 1% tolerance for rounding)
        const calculatedHps = entry.holdings / entry.sharesOutstanding;
        const deviation = Math.abs(entry.holdingsPerShare - calculatedHps) / calculatedHps;

        if (deviation > 0.01 && entry.holdings > 0) {
          violations.push(
            `${ticker} (${entry.date}): holdingsPerShare (${entry.holdingsPerShare.toFixed(6)}) ` +
              `!= holdings/shares (${calculatedHps.toFixed(6)}). ` +
              `${(deviation * 100).toFixed(1)}% deviation.`,
          );
        }
      }
    }

    if (violations.length > 0) {
      console.log("\n=== HPS CALCULATION ERRORS ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail — many existing entries may have rounding differences
    // expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 17: Cost basis sanity
//
// costBasisAvg should be within plausible range for the asset.
// A BTC cost basis of $500 or $5M is almost certainly wrong.
// ─────────────────────────────────────────────────────────────
describe("Check 17: Cost basis sanity", () => {
  // Rough all-time price ranges per asset
  const PRICE_BOUNDS: Record<string, { min: number; max: number }> = {
    BTC: { min: 1_000, max: 200_000 },
    ETH: { min: 80, max: 5_000 },
    SOL: { min: 1, max: 300 },
    HYPE: { min: 1, max: 50 },
    DOGE: { min: 0.001, max: 1 },
    LTC: { min: 20, max: 500 },
    TRX: { min: 0.01, max: 1 },
    XRP: { min: 0.1, max: 4 },
    SUI: { min: 0.3, max: 6 },
    ZEC: { min: 10, max: 1000 },
    AVAX: { min: 2, max: 150 },
    BNB: { min: 10, max: 800 },
    TAO: { min: 50, max: 1000 },
    LINK: { min: 1, max: 60 },
    ADA: { min: 0.02, max: 4 },
    HBAR: { min: 0.01, max: 1 },
  };

  it("costBasisAvg should be within all-time price range", () => {
    const violations: string[] = [];

    for (const company of allCompanies) {
      if (!company.costBasisAvg) continue;
      const bounds = PRICE_BOUNDS[company.asset];
      if (!bounds) continue;

      if (company.costBasisAvg < bounds.min * 0.5 || company.costBasisAvg > bounds.max * 1.5) {
        violations.push(
          `${company.ticker} (${company.asset}): costBasisAvg $${company.costBasisAvg.toLocaleString()} ` +
            `outside plausible range [$${bounds.min.toLocaleString()} - $${bounds.max.toLocaleString()}]`,
        );
      }
    }

    if (violations.length > 0) {
      console.log("\n=== IMPLAUSIBLE COST BASIS ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 18: Holdings history consistency
//
// The latest entry in HOLDINGS_HISTORY should match the company's
// current holdings in companies.ts.
// ─────────────────────────────────────────────────────────────
describe("Check 18: Holdings history sync", () => {
  it("latest history entry should match companies.ts holdings", () => {
    const violations: string[] = [];

    for (const company of allCompanies) {
      const data = HOLDINGS_HISTORY[company.ticker];
      if (!data?.history?.length) continue;

      const latest = data.history[data.history.length - 1];

      // Holdings check (allow 1% tolerance)
      if (company.holdings > 0 && latest.holdings > 0) {
        const holdingsDeviation =
          Math.abs(company.holdings - latest.holdings) / company.holdings;
        if (holdingsDeviation > 0.01) {
          violations.push(
            `${company.ticker}: companies.ts holdings (${company.holdings.toLocaleString()}) ` +
              `!= latest history (${latest.holdings.toLocaleString()}). ` +
              `${(holdingsDeviation * 100).toFixed(1)}% deviation.`,
          );
        }
      }
    }

    if (violations.length > 0) {
      console.log("\n=== HOLDINGS HISTORY DESYNC ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail — history may lag companies.ts updates
    // expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 19: Preferred equity cross-check
//
// Preferred equity tracked in dilutive-instruments (as convertible
// with notes containing "preferredEquity") should have a matching
// preferredEquity value in companies.ts.
// ─────────────────────────────────────────────────────────────
describe("Check 19: Preferred equity cross-check", () => {
  it("companies with preferred instruments should have preferredEquity set", () => {
    const violations: string[] = [];

    for (const [ticker, instruments] of Object.entries(dilutiveInstruments)) {
      const hasPreferred = instruments.some(
        (inst) => inst.notes?.includes("preferredEquity") || inst.notes?.includes("preferred"),
      );
      if (!hasPreferred) continue;

      const company = allCompanies.find((c) => c.ticker === ticker);
      if (!company) continue;

      if (!company.preferredEquity || company.preferredEquity === 0) {
        violations.push(
          `${ticker}: has preferred instruments in dilutive-instruments.ts ` +
            `but preferredEquity is ${company.preferredEquity ?? "undefined"} in companies.ts`,
        );
      }
    }

    if (violations.length > 0) {
      console.log("\n=== PREFERRED EQUITY MISSING ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail — some preferred instruments may not have a face value
    // expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 20: Strike price currency
//
// For non-USD companies, dilutive instrument strike prices should
// be in the same currency as the stock. A JPY strike entered as
// USD would make everything look deep ITM.
// ─────────────────────────────────────────────────────────────
describe("Check 20: Strike price currency", () => {
  const HIGH_FX: Record<string, number> = {
    JPY: 155, KRW: 1350, HKD: 7.8,
  };

  it("non-USD instrument strikes should not look like local currency entered as USD", () => {
    const violations: string[] = [];

    for (const [ticker, instruments] of Object.entries(dilutiveInstruments)) {
      const company = allCompanies.find((c) => c.ticker === ticker);
      if (!company?.currency || company.currency === "USD") continue;

      const fxRate = HIGH_FX[company.currency];
      if (!fxRate) continue; // Only check high-FX currencies where confusion is likely

      for (const inst of instruments) {
        if (!inst.strikePrice || inst.strikePrice === 0) continue;

        // If strike / fxRate gives a more "normal" stock-price-like value,
        // the strike might be in local currency
        const stockFallback = FALLBACK_STOCKS[ticker];
        if (!stockFallback) continue;

        const localPrice = stockFallback.price; // Already in local currency
        const strikeInUsd = inst.strikePrice;

        // If strike is > 10x the local stock price, it's likely in local currency
        if (strikeInUsd > localPrice * 10) {
          violations.push(
            `${ticker} (${company.currency}): instrument strike $${strikeInUsd} ` +
              `is ${(strikeInUsd / localPrice).toFixed(0)}x the local stock price ` +
              `(${company.currency} ${localPrice}). Strike may be in ${company.currency}, not USD.`,
          );
        }
      }
    }

    if (violations.length > 0) {
      console.log("\n=== STRIKE PRICE CURRENCY MISMATCH ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail
    // expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 21: Holdings non-negative and shares positive
//
// Basic sanity: holdings should be >= 0, shares should be > 0
// when set. Negative values indicate data entry errors.
// ─────────────────────────────────────────────────────────────
describe("Check 21: Basic field sanity", () => {
  it("holdings should not be negative", () => {
    const violations: string[] = [];

    for (const company of allCompanies) {
      if (company.holdings < 0) {
        violations.push(
          `${company.ticker}: holdings is negative (${company.holdings})`,
        );
      }
      if (company.sharesForMnav !== undefined && company.sharesForMnav <= 0) {
        violations.push(
          `${company.ticker}: sharesForMnav is ${company.sharesForMnav} (should be > 0)`,
        );
      }
      if ((company.totalDebt ?? 0) < 0) {
        violations.push(
          `${company.ticker}: totalDebt is negative ($${company.totalDebt})`,
        );
      }
      if ((company.cashReserves ?? 0) < 0) {
        violations.push(
          `${company.ticker}: cashReserves is negative ($${company.cashReserves})`,
        );
      }
    }

    expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 22: Holdings history chronological order
//
// History entries should be in chronological order and have no
// duplicate dates. Out-of-order entries produce wrong "latest".
// ─────────────────────────────────────────────────────────────
describe("Check 22: Holdings history order", () => {
  it("history entries should be in chronological order", () => {
    const violations: string[] = [];

    for (const [ticker, data] of Object.entries(HOLDINGS_HISTORY)) {
      if (!data?.history?.length) continue;

      for (let i = 1; i < data.history.length; i++) {
        const prev = data.history[i - 1].date;
        const curr = data.history[i].date;
        if (curr < prev) {
          violations.push(
            `${ticker}: history out of order — "${prev}" before "${curr}" at index ${i}`,
          );
        } else if (curr === prev) {
          violations.push(
            `${ticker}: duplicate date "${curr}" at index ${i - 1} and ${i}`,
          );
        }
      }
    }

    if (violations.length > 0) {
      console.log("\n=== HISTORY ORDER VIOLATIONS ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 23: Missing SEC CIK for US companies
//
// US-listed companies (no currency override, USD-denominated)
// should have a secCik for EDGAR monitoring.
// ─────────────────────────────────────────────────────────────
describe("Check 23: Missing SEC CIK", () => {
  it("US-listed companies should have secCik", () => {
    const violations: string[] = [];

    for (const company of allCompanies) {
      // Skip non-US companies
      if (company.currency && company.currency !== "USD") continue;
      // Skip if has non-US indicators
      if (company.ticker.includes(".")) continue; // .T, .HK, .V, .AX, etc.
      // Skip pending mergers
      if (company.pendingMerger) continue;

      if (!company.secCik) {
        violations.push(
          `${company.ticker} (${company.name}): US-listed but no secCik set`,
        );
      }
    }

    if (violations.length > 0) {
      console.log("\n=== MISSING SEC CIK ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail — some OTC companies may not have CIKs
    // expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 24: Shares consistency (companies.ts vs holdings-history.ts)
//
// sharesForMnav in companies.ts should match the latest
// sharesOutstanding in holdings-history.ts.
// ─────────────────────────────────────────────────────────────
describe("Check 24: Shares consistency", () => {
  it("sharesForMnav should match latest holdings-history sharesOutstanding", () => {
    const violations: string[] = [];

    for (const company of allCompanies) {
      if (!company.sharesForMnav) continue;

      const data = HOLDINGS_HISTORY[company.ticker];
      if (!data?.history?.length) continue;

      const latest = data.history[data.history.length - 1];
      if (!latest.sharesOutstanding) continue;

      const deviation =
        Math.abs(company.sharesForMnav - latest.sharesOutstanding) /
        company.sharesForMnav;

      if (deviation > 0.02) {
        violations.push(
          `${company.ticker}: sharesForMnav (${company.sharesForMnav.toLocaleString()}) ` +
            `vs history (${latest.sharesOutstanding.toLocaleString()}) — ` +
            `${(deviation * 100).toFixed(1)}% deviation`,
        );
      }
    }

    if (violations.length > 0) {
      console.log("\n=== SHARES CONSISTENCY VIOLATIONS ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail — some deviation expected during updates
    // expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 25: Missing holdings history
//
// Every company in allCompanies should have a HOLDINGS_HISTORY entry.
// Without it, HPS charts are empty and the "latest" snapshot lookup
// returns undefined.
// ─────────────────────────────────────────────────────────────
describe("Check 25: Missing holdings history", () => {
  it("every company should have a holdings-history entry", () => {
    const violations: string[] = [];

    for (const company of allCompanies) {
      const data = HOLDINGS_HISTORY[company.ticker];
      if (!data || !data.history?.length) {
        violations.push(
          `${company.ticker} (${company.name}): no entry in HOLDINGS_HISTORY`,
        );
      }
    }

    if (violations.length > 0) {
      console.log("\n=== MISSING HOLDINGS HISTORY ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail — new companies may not have history yet
    // expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 26: Asset mismatch between companies and holdings history
//
// company.asset should match HOLDINGS_HISTORY[ticker].asset.
// A mismatch means HPS is calculated against the wrong crypto price.
// ─────────────────────────────────────────────────────────────
describe("Check 26: Asset mismatch", () => {
  it("company asset should match holdings-history asset", () => {
    const violations: string[] = [];

    for (const company of allCompanies) {
      const data = HOLDINGS_HISTORY[company.ticker];
      if (!data) continue;

      // Allow MULTI in history when company tracks a dominant asset
      if (data.asset !== company.asset && data.asset !== "MULTI") {
        violations.push(
          `${company.ticker}: companies.ts asset="${company.asset}" ` +
            `but holdings-history asset="${data.asset}"`,
        );
      }
    }

    if (violations.length > 0) {
      console.log("\n=== ASSET MISMATCH ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 27: Orphaned dilutive instruments
//
// Instruments for tickers not in allCompanies waste memory and
// never get audited for staleness or correctness.
// ─────────────────────────────────────────────────────────────
describe("Check 27: Orphaned dilutive instruments", () => {
  it("all dilutive instrument tickers should exist in allCompanies", () => {
    const violations: string[] = [];
    const companyTickers = new Set(allCompanies.map((c) => c.ticker));

    for (const ticker of Object.keys(dilutiveInstruments)) {
      if (companyTickers.has(ticker)) continue;

      // Check if this is a base ticker whose alias (e.g., BTCT → BTCT.V) IS in allCompanies
      const isAliasBase = [...companyTickers].some(
        (t) => dilutiveInstruments[t] === dilutiveInstruments[ticker],
      );
      if (isAliasBase) continue;

      violations.push(
        `${ticker}: has ${dilutiveInstruments[ticker].length} dilutive instruments ` +
          `but no matching company in allCompanies`,
      );
    }

    if (violations.length > 0) {
      console.log("\n=== ORPHANED DILUTIVE INSTRUMENTS ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 28: Excessive dilution
//
// If total potential dilutive shares > 200% of basic shares,
// something is likely wrong (duplicate instrument, shares entered
// instead of warrant count, etc.).
// ─────────────────────────────────────────────────────────────
describe("Check 28: Excessive dilution", () => {
  it("total dilutive shares should not exceed 200% of basic shares", () => {
    const violations: string[] = [];

    for (const company of allCompanies) {
      if (!company.sharesForMnav) continue;
      const instruments = dilutiveInstruments[company.ticker];
      if (!instruments?.length) continue;

      const now = new Date().toISOString().slice(0, 10);
      const activeInstruments = instruments.filter(
        (inst) => !inst.expiration || inst.expiration > now,
      );
      const totalPotential = activeInstruments.reduce(
        (sum, inst) => sum + inst.potentialShares,
        0,
      );

      const dilutionPct = totalPotential / company.sharesForMnav;
      if (dilutionPct > 2.0) {
        violations.push(
          `${company.ticker}: dilutive instruments total ${totalPotential.toLocaleString()} shares ` +
            `= ${(dilutionPct * 100).toFixed(0)}% of basic shares (${company.sharesForMnav.toLocaleString()}). ` +
            `Check for duplicates or data entry errors.`,
        );
      }
    }

    if (violations.length > 0) {
      console.log("\n=== EXCESSIVE DILUTION ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail — some companies genuinely have heavy dilution (SPACs, warrants)
    // expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 29: Market cap override vs fallback inconsistency
//
// If a ticker appears in both MARKET_CAP_OVERRIDES and
// FALLBACK_STOCKS with different marketCap values, the result
// depends on which code path runs first — non-deterministic mNAV.
// ─────────────────────────────────────────────────────────────
describe("Check 29: Override vs fallback consistency", () => {
  it("tickers in both MARKET_CAP_OVERRIDES and FALLBACK_STOCKS should have consistent marketCap", () => {
    const violations: string[] = [];

    for (const ticker of Object.keys(MARKET_CAP_OVERRIDES)) {
      const fallback = FALLBACK_STOCKS[ticker];
      if (!fallback) continue;

      const overrideValue = MARKET_CAP_OVERRIDES[ticker];
      const fallbackValue = fallback.marketCap;
      const deviation = Math.abs(overrideValue - fallbackValue) / overrideValue;

      if (deviation > 0.10) {
        violations.push(
          `${ticker}: MARKET_CAP_OVERRIDES ($${(overrideValue / 1e6).toFixed(0)}M) vs ` +
            `FALLBACK_STOCKS ($${(fallbackValue / 1e6).toFixed(0)}M) — ` +
            `${(deviation * 100).toFixed(0)}% difference`,
        );
      }
    }

    if (violations.length > 0) {
      console.log("\n=== OVERRIDE vs FALLBACK MISMATCH ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail — small drift is expected, large drift is dangerous
    // expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 30: Secondary/investment holdings sanity
//
// secondaryCryptoHoldings and cryptoInvestments add to NAV.
// Catch: wrong asset, negative amounts, zero fairValue on funds.
// ─────────────────────────────────────────────────────────────
describe("Check 30: Secondary holdings and crypto investments sanity", () => {
  it("secondaryCryptoHoldings should have positive amounts", () => {
    const violations: string[] = [];

    for (const company of allCompanies) {
      if (!company.secondaryCryptoHoldings?.length) continue;

      for (const holding of company.secondaryCryptoHoldings) {
        if (holding.amount <= 0) {
          violations.push(
            `${company.ticker}: secondaryCryptoHolding ${holding.asset} has ` +
              `amount=${holding.amount} (should be > 0)`,
          );
        }
      }
    }

    expect(violations).toHaveLength(0);
  });

  it("cryptoInvestments should have positive fairValue", () => {
    const violations: string[] = [];

    for (const company of allCompanies) {
      if (!company.cryptoInvestments?.length) continue;

      for (const inv of company.cryptoInvestments) {
        if (inv.type === "lst") {
          // LSTs use underlyingAmount × price, fairValue is static fallback
          if (!inv.lstAmount || inv.lstAmount <= 0) {
            violations.push(
              `${company.ticker}: LST "${inv.name}" has lstAmount=${inv.lstAmount} (should be > 0)`,
            );
          }
          if (!inv.exchangeRate || inv.exchangeRate <= 0) {
            violations.push(
              `${company.ticker}: LST "${inv.name}" has exchangeRate=${inv.exchangeRate} (should be > 0)`,
            );
          }
        } else {
          // Funds/ETFs need fairValue
          if (!inv.fairValue || inv.fairValue <= 0) {
            violations.push(
              `${company.ticker}: investment "${inv.name}" (${inv.type}) has ` +
                `fairValue=${inv.fairValue} (should be > 0)`,
            );
          }
        }
      }
    }

    if (violations.length > 0) {
      console.log("\n=== INVALID CRYPTO INVESTMENTS ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 31: stakingPct bounds
//
// stakingPct should be 0.0–1.0 (a ratio). A value > 1.0 suggests
// someone entered a percentage (e.g., 85 instead of 0.85).
// ─────────────────────────────────────────────────────────────
describe("Check 31: stakingPct bounds", () => {
  it("stakingPct should be between 0 and 1", () => {
    const violations: string[] = [];

    for (const company of allCompanies) {
      if (company.stakingPct === undefined) continue;

      if (company.stakingPct < 0) {
        violations.push(
          `${company.ticker}: stakingPct is negative (${company.stakingPct})`,
        );
      } else if (company.stakingPct > 1.0) {
        violations.push(
          `${company.ticker}: stakingPct is ${company.stakingPct} (should be 0.0–1.0, ` +
            `not a percentage). Did you mean ${(company.stakingPct / 100).toFixed(2)}?`,
        );
      }
    }

    expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 32: Large holdings drops in history
//
// A >50% drop between adjacent history entries is unusual.
// Could be a sale (legit) or a data error (source confusion).
// ─────────────────────────────────────────────────────────────
describe("Check 32: Large holdings drops", () => {
  it("holdings should not drop >50% between adjacent entries without explanation", () => {
    const violations: string[] = [];

    for (const [ticker, data] of Object.entries(HOLDINGS_HISTORY)) {
      if (!data?.history?.length || data.history.length < 2) continue;

      for (let i = 1; i < data.history.length; i++) {
        const prev = data.history[i - 1];
        const curr = data.history[i];
        if (prev.holdings === 0 || curr.holdings === 0) continue;

        const dropPct = (prev.holdings - curr.holdings) / prev.holdings;
        if (dropPct > 0.5) {
          violations.push(
            `${ticker} (${curr.date}): holdings dropped ${(dropPct * 100).toFixed(0)}% ` +
              `from ${prev.holdings.toLocaleString()} to ${curr.holdings.toLocaleString()}. ` +
              `Verify this is a real sale, not a data error.`,
          );
        }
      }
    }

    if (violations.length > 0) {
      console.log("\n=== LARGE HOLDINGS DROPS ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail — some companies do sell large portions
    // expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 33: ISO date format validation
//
// All date fields should be YYYY-MM-DD. Invalid dates like
// "03/15/2026" or "2026-13-01" silently produce NaN timestamps,
// corrupting staleness checks and sorting.
// ─────────────────────────────────────────────────────────────
describe("Check 33: Date format validation", () => {
  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

  it("all date fields in companies should be valid ISO dates", () => {
    const violations: string[] = [];
    const dateFields: Array<keyof Company> = [
      "holdingsLastUpdated", "sharesAsOf", "debtAsOf", "cashAsOf",
      "preferredAsOf", "datStartDate", "burnAsOf", "costBasisAsOf",
      "stakingAsOf", "stakingLastAudited", "mergerExpectedClose",
      "cashObligationsAsOf",
    ];

    for (const company of allCompanies) {
      for (const field of dateFields) {
        const value = company[field];
        if (typeof value !== "string") continue;

        if (!ISO_DATE.test(value)) {
          violations.push(
            `${company.ticker}: ${String(field)} = "${value}" (not YYYY-MM-DD format)`,
          );
          continue;
        }

        // Validate it parses to a real date
        const parsed = new Date(value + "T00:00:00Z");
        if (isNaN(parsed.getTime())) {
          violations.push(
            `${company.ticker}: ${String(field)} = "${value}" (invalid date)`,
          );
        }
      }
    }

    expect(violations).toHaveLength(0);
  });

  it("all dates in holdings history should be valid ISO dates", () => {
    const violations: string[] = [];

    for (const [ticker, data] of Object.entries(HOLDINGS_HISTORY)) {
      if (!data?.history?.length) continue;

      for (const entry of data.history) {
        if (!ISO_DATE.test(entry.date)) {
          violations.push(
            `${ticker}: history date "${entry.date}" is not YYYY-MM-DD format`,
          );
        } else {
          const parsed = new Date(entry.date + "T00:00:00Z");
          if (isNaN(parsed.getTime())) {
            violations.push(
              `${ticker}: history date "${entry.date}" is invalid`,
            );
          }
        }
      }
    }

    expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 34: Orphaned holdings history
//
// Entries in HOLDINGS_HISTORY for tickers not in allCompanies.
// These consume memory and may confuse lookups.
// ─────────────────────────────────────────────────────────────
describe("Check 34: Orphaned holdings history", () => {
  it("all HOLDINGS_HISTORY tickers should exist in allCompanies", () => {
    const violations: string[] = [];
    const companyTickers = new Set(allCompanies.map((c) => c.ticker));

    for (const ticker of Object.keys(HOLDINGS_HISTORY)) {
      if (!companyTickers.has(ticker)) {
        violations.push(
          `${ticker}: in HOLDINGS_HISTORY but not in allCompanies. Orphaned history.`,
        );
      }
    }

    if (violations.length > 0) {
      console.log("\n=== ORPHANED HOLDINGS HISTORY ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail — we may keep history for removed companies
    // expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 35: cryptoInvestments fairValue coherence
//
// For fund/ETF investments, fairValue is used directly in NAV.
// A wrong fairValue directly corrupts mNAV with no other check.
// For LSTs, fairValue is a static fallback — lstAmount * exchangeRate
// * price is used at runtime. But fairValue should still be reasonable.
//
// Heuristic: fairValue should not exceed 5x the company's direct
// holdings value (at a reference price). A fund worth more than 5x
// the company's direct crypto is suspicious.
// ─────────────────────────────────────────────────────────────
describe("Check 35: cryptoInvestments fairValue coherence", () => {
  // Reference prices for sanity bounds (rough current prices)
  const REF_PRICES: Record<string, number> = {
    BTC: 90_000, ETH: 2_500, SOL: 150, HYPE: 25, BNB: 650,
    TAO: 400, LINK: 15, TRX: 0.25, XRP: 2.5, ZEC: 50,
    LTC: 120, SUI: 4, DOGE: 0.30, AVAX: 35, ADA: 0.70, HBAR: 0.30,
  };

  it("LST fairValue should be coherent with underlyingAmount * asset price", () => {
    const violations: string[] = [];

    for (const company of allCompanies) {
      if (!company.cryptoInvestments?.length) continue;

      for (const inv of company.cryptoInvestments) {
        if (inv.type !== "lst") continue;
        if (!inv.underlyingAmount || !inv.fairValue) continue;

        const refPrice = REF_PRICES[inv.underlyingAsset];
        if (!refPrice) continue;

        const impliedValue = inv.underlyingAmount * refPrice;
        const deviation = Math.abs(inv.fairValue - impliedValue) / impliedValue;

        // Allow 50% tolerance for price movement since sourceDate
        if (deviation > 0.50) {
          violations.push(
            `${company.ticker}: LST "${inv.name}" fairValue ($${(inv.fairValue / 1e6).toFixed(1)}M) ` +
              `vs implied ${inv.underlyingAmount.toLocaleString()} ${inv.underlyingAsset} × $${refPrice} ` +
              `= $${(impliedValue / 1e6).toFixed(1)}M (${(deviation * 100).toFixed(0)}% off). ` +
              `fairValue may be stale or wrong.`,
          );
        }
      }
    }

    if (violations.length > 0) {
      console.log("\n=== LST FAIR VALUE INCOHERENT ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail — price movement can cause drift
    // expect(violations).toHaveLength(0);
  });

  it("fund/ETF fairValue should not dominate direct holdings value", () => {
    const violations: string[] = [];

    for (const company of allCompanies) {
      if (!company.cryptoInvestments?.length) continue;

      const refPrice = REF_PRICES[company.asset] ?? 0;
      if (!refPrice || !company.holdings) continue;

      const directValue = company.holdings * refPrice;
      const totalFundValue = company.cryptoInvestments
        .filter((inv) => inv.type === "fund" || inv.type === "etf" || inv.type === "equity")
        .reduce((sum, inv) => sum + (inv.fairValue ?? 0), 0);

      if (totalFundValue === 0) continue;

      // Fund value exceeding 20x direct holdings is suspicious
      if (totalFundValue > directValue * 20 && totalFundValue > 10_000_000) {
        violations.push(
          `${company.ticker}: fund/ETF fairValue ($${(totalFundValue / 1e6).toFixed(1)}M) ` +
            `is ${(totalFundValue / directValue).toFixed(0)}x direct holdings value ` +
            `($${(directValue / 1e6).toFixed(1)}M). Verify fairValue is correct.`,
        );
      }
    }

    if (violations.length > 0) {
      console.log("\n=== FUND VALUE DOMINANCE ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail — some companies genuinely have most exposure via funds
    // expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 36: cryptoInvestments source staleness
//
// Fund/ETF fairValues are static from SEC filings. If the sourceDate
// is far from holdingsLastUpdated, the value may be stale.
// ─────────────────────────────────────────────────────────────
describe("Check 36: cryptoInvestments source staleness", () => {
  it("cryptoInvestments sourceDate should be within 120 days of holdingsLastUpdated", () => {
    const violations: string[] = [];

    for (const company of allCompanies) {
      if (!company.cryptoInvestments?.length) continue;
      if (!company.holdingsLastUpdated) continue;

      const holdingsDate = new Date(company.holdingsLastUpdated).getTime();

      for (const inv of company.cryptoInvestments) {
        if (!inv.sourceDate) continue;
        const invDate = new Date(inv.sourceDate).getTime();
        const daysDiff = Math.abs(holdingsDate - invDate) / 86_400_000;

        if (daysDiff > 120) {
          violations.push(
            `${company.ticker}: "${inv.name}" sourceDate (${inv.sourceDate}) is ` +
              `${Math.round(daysDiff)}d from holdingsLastUpdated (${company.holdingsLastUpdated}). ` +
              `fairValue ($${(inv.fairValue / 1e6).toFixed(1)}M) may be stale.`,
          );
        }
      }
    }

    if (violations.length > 0) {
      console.log("\n=== STALE CRYPTO INVESTMENT VALUES ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail
    // expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 37: Missing sharesForMnav when history exists
//
// If a company has holdings-history with sharesOutstanding, it should
// have sharesForMnav set. Without it, market cap falls back to static
// overrides or API data — both can be stale/wrong.
// ─────────────────────────────────────────────────────────────
describe("Check 37: Missing sharesForMnav", () => {
  it("companies with holdings history should have sharesForMnav", () => {
    const violations: string[] = [];

    for (const company of allCompanies) {
      if (company.sharesForMnav) continue;
      if (company.pendingMerger) continue; // SPACs may not have meaningful shares

      const data = HOLDINGS_HISTORY[company.ticker];
      if (!data?.history?.length) continue;

      const latest = data.history[data.history.length - 1];
      if (!latest.sharesOutstanding) continue;

      violations.push(
        `${company.ticker}: has sharesOutstanding (${latest.sharesOutstanding.toLocaleString()}) ` +
          `in holdings-history but no sharesForMnav. Market cap falls back to ` +
          `static override/API — may be stale.`,
      );
    }

    if (violations.length > 0) {
      console.log("\n=== MISSING sharesForMnav ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail — some companies may intentionally use overrides
    // expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 38: Instrument faceValue vs potentialShares coherence
//
// For convertibles: faceValue / strikePrice ≈ potentialShares.
// A large discrepancy suggests a data entry error.
// ─────────────────────────────────────────────────────────────
describe("Check 38: Instrument value reasonableness", () => {
  it("convertible faceValue / strikePrice should approximate potentialShares", () => {
    const violations: string[] = [];

    for (const [ticker, instruments] of Object.entries(dilutiveInstruments)) {
      for (const inst of instruments) {
        if (inst.type !== "convertible") continue;
        if (!inst.faceValue || !inst.strikePrice || inst.strikePrice === 0) continue;
        // Skip instruments with potentialShares=0 — these are being redeemed, not converted
        if (inst.potentialShares === 0) continue;

        const impliedShares = inst.faceValue / inst.strikePrice;
        const deviation = Math.abs(impliedShares - inst.potentialShares) / impliedShares;

        if (deviation > 0.25) {
          violations.push(
            `${ticker}: convertible at $${inst.strikePrice} strike — ` +
              `faceValue ($${(inst.faceValue / 1e6).toFixed(1)}M) / strike = ` +
              `${Math.round(impliedShares).toLocaleString()} implied shares, ` +
              `but potentialShares = ${inst.potentialShares.toLocaleString()} ` +
              `(${(deviation * 100).toFixed(0)}% off). ${inst.source}`,
          );
        }
      }
    }

    if (violations.length > 0) {
      console.log("\n=== INSTRUMENT VALUE INCOHERENT ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail — some converts have complex terms (make-whole, caps)
    // expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 39: History upward spike check
//
// Detect suspicious holdings or share increases (>100% jump)
// between adjacent history entries, not just drops.
// ─────────────────────────────────────────────────────────────
describe("Check 39: History upward spikes", () => {
  it("holdings should not spike >100% between adjacent entries", () => {
    const violations: string[] = [];

    for (const [ticker, data] of Object.entries(HOLDINGS_HISTORY)) {
      if (!data?.history?.length || data.history.length < 2) continue;

      for (let i = 1; i < data.history.length; i++) {
        const prev = data.history[i - 1];
        const curr = data.history[i];
        if (prev.holdings === 0 || curr.holdings === 0) continue;

        const spikePct = (curr.holdings - prev.holdings) / prev.holdings;
        if (spikePct > 1.0) {
          violations.push(
            `${ticker} (${curr.date}): holdings spiked ${(spikePct * 100).toFixed(0)}% ` +
              `from ${prev.holdings.toLocaleString()} to ${curr.holdings.toLocaleString()}. ` +
              `Verify this is a real acquisition.`,
          );
        }
      }
    }

    if (violations.length > 0) {
      console.log("\n=== HOLDINGS UPWARD SPIKES ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail — large acquisitions do happen (SPACs, PIPEs)
    // expect(violations).toHaveLength(0);
  });

  it("shares should not spike >50% between adjacent entries", () => {
    const violations: string[] = [];

    for (const [ticker, data] of Object.entries(HOLDINGS_HISTORY)) {
      if (!data?.history?.length || data.history.length < 2) continue;

      for (let i = 1; i < data.history.length; i++) {
        const prev = data.history[i - 1];
        const curr = data.history[i];
        if (!prev.sharesOutstanding || !curr.sharesOutstanding) continue;
        if (prev.sharesOutstanding === 0) continue;

        const spikePct = (curr.sharesOutstanding - prev.sharesOutstanding) / prev.sharesOutstanding;
        if (spikePct > 0.50) {
          violations.push(
            `${ticker} (${curr.date}): shares spiked ${(spikePct * 100).toFixed(0)}% ` +
              `from ${prev.sharesOutstanding.toLocaleString()} to ${curr.sharesOutstanding.toLocaleString()}. ` +
              `Verify dilution event.`,
          );
        }
      }
    }

    if (violations.length > 0) {
      console.log("\n=== SHARES UPWARD SPIKES ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail — PIPEs, ATMs, mergers cause large dilution
    // expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 40: Debt without dilution acknowledgment
//
// If a company has totalDebt > 0 but no dilutive instruments and
// notes don't explicitly say "no conversion features", the debt
// might include untracked convertibles.
// ─────────────────────────────────────────────────────────────
describe("Check 40: Debt without dilution acknowledgment", () => {
  it("companies with material debt should have instruments or explicit no-conversion note", () => {
    const violations: string[] = [];
    const NO_CONVERT_PATTERN = /no\s+conver|non-convert|plain\s+debt|term\s+loan|credit\s+facility|secured\s+loan|mortgage/i;

    for (const company of allCompanies) {
      const debt = company.totalDebt ?? 0;
      if (debt < 5_000_000) continue; // Only flag material debt (>$5M)

      const hasInstruments = (dilutiveInstruments[company.ticker]?.length ?? 0) > 0;
      if (hasInstruments) continue;

      const text = [company.notes, company.debtSourceQuote, company.debtSource]
        .filter(Boolean)
        .join(" ");

      if (NO_CONVERT_PATTERN.test(text)) continue;

      violations.push(
        `${company.ticker}: totalDebt ($${(debt / 1e6).toFixed(1)}M) but no dilutive instruments ` +
          `and no explicit "non-convertible" note. Verify debt has no conversion features.`,
      );
    }

    if (violations.length > 0) {
      console.log("\n=== DEBT WITHOUT DILUTION ACKNOWLEDGMENT ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // Soft fail — many companies have plain debt
    // expect(violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Check 41: Source quote vs holdings cross-validation
//
// The sourceQuote field contains a verbatim excerpt from the cited
// source document. If holdings doesn't match any number extractable
// from sourceQuote, either the holdings or the quote is wrong.
// This is what caught the XRPN 520M vs 473M discrepancy — the D1
// pipeline overwrote holdings without updating the source citation.
// ─────────────────────────────────────────────────────────────
describe("Check 41: Source quote vs holdings cross-validation", () => {
  it("holdings should match a number in sourceQuote", () => {
    const violations: string[] = [];

    for (const company of allCompanies) {
      const quote = (company as any).sourceQuote as string | undefined;
      if (!quote) continue;
      if (company.holdings === 0) continue;
      if (company.pendingMerger && company.holdings === 0) continue;
      // Skip derived holdings — the quote references a base value, not the derived total
      if ((company as any).holdingsDerived) continue;

      // Extract all numbers from the quote (handle commas, decimals, abbreviations)
      // Match patterns like "681.2 Million", "48 million", "17.6M", "31,500"
      // Avoid matching "BTC", "Bitcoin", "BRL" etc as "B" multiplier
      const numberPatterns = /[\d,]+\.?\d*\s*(?:million|billion)?/gi;
      const rawMatches = quote.match(numberPatterns);
      if (!rawMatches?.length) continue;

      // Also check for abbreviated forms: "17.6M" but NOT "17.6M BTC" where M is millions
      const abbrMatches = quote.match(/[\d,]+\.?\d*\s*[MB](?=\s|$|[^A-Za-z])/g) || [];

      const allMatches = [...rawMatches, ...abbrMatches];
      const quoteNumbers = allMatches.map((raw) => {
        const numStr = raw.replace(/,/g, "").trim();
        let value = parseFloat(numStr);
        if (/million/i.test(raw) || /M$/i.test(raw)) value *= 1_000_000;
        if (/billion/i.test(raw) || /B$/i.test(raw)) value *= 1_000_000_000;
        return value;
      }).filter((n) => n > 0);

      if (quoteNumbers.length === 0) continue;

      // Check if holdings matches any extracted number within 1%
      const matchFound = quoteNumbers.some((qn) => {
        const deviation = Math.abs(qn - company.holdings) / Math.max(qn, company.holdings);
        return deviation < 0.01;
      });

      if (!matchFound) {
        violations.push(
          `${company.ticker}: holdings (${company.holdings.toLocaleString()}) does not match ` +
            `any number in sourceQuote "${quote}" → extracted [${quoteNumbers.join(", ")}]. ` +
            `Either holdings or the citation is wrong.`,
        );
      }
    }

    if (violations.length > 0) {
      console.log("\n=== SOURCE QUOTE MISMATCH ===\n");
      violations.forEach((v) => console.log(`  ${v}`));
    }
    // HARD fail — if holdings doesn't match the cited source, something is wrong.
    // This prevents automated pipelines from overwriting verified data.
    expect(violations).toHaveLength(0);
  });
});
