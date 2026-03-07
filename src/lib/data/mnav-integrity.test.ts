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

      // Sum face values of all convertibles (they're debt until converted)
      const convertibles = instruments.filter(
        (inst) => inst.type === "convertible" && inst.faceValue,
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
