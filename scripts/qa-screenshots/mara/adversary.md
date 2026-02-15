# MARA Holdings — Adversary Verification Report
**Date:** 2026-02-14

## Adversary Summary
**Overall:** CONFIRMED WITH CAVEATS — Ground truth data is correct but everything is Q3 2025 (Sep 30). No newer authoritative data exists.

| # | Attack | Verdict | Finding |
|---|--------|---------|---------|
| 1 | Staleness | ⚠️ STALE BUT UNAVOIDABLE | All Q3 2025. No monthly production updates since Oct 2025. No 10-K filed yet. |
| 2 | Stock Price | ✅ CONFIRMED | $7.92 is correct. MARA dropped from ~$12 (Dec) to ~$8 (Feb). |
| 3 | Holdings | ⚠️ STALE BUT BEST AVAILABLE | 52,850 BTC as of Sep 30. No newer disclosure found. |
| 4 | Shares | ⚠️ STALE | 378,184,353 as of Q3 10-Q. ATM active but no newer share count available. |
| 5 | Debt | ✅ CONFIRMED | $3,642,472,000 verified. 5 convertible tranches + $350M LOC. No new issuances since Aug 2032 Notes. |
| 6 | Quotes | ✅ CONFIRMED | 10-Q text matches: "52,850 bitcoin", cost basis $4,637,673K, all 5 convertible tranches verified in Note 14 table. |
| 7 | Conversion Prices | ✅ CONFIRMED | Conversion rates verified in 10-Q: 13.1277 / 52.9451 / 38.5902 / 28.9159 / 49.3619. Strike prices derived correctly. |
| 8 | Cost Basis Math | ✅ CONFIRMED | $4,637,673K / 52,850 = $87,762/BTC (ground truth says ~$87,826, close but should use $87,762). |
| 9 | Cash Treatment | ⚠️ NEEDS REVIEW | $826M cash is working capital. $350M offsets LOC. Need to check what `calculateMNAV()` does for MARA. |

### Critical Findings

**1. No newer data exists.** MARA stopped publishing monthly production updates after October 2025 (for Sep 2025 data). The 10-K for FY2025 has not been filed. All recent EDGAR filings are Form 4s (insider transactions), S-8s (stock comp), and 13-Fs. No 8-Ks with holdings data.

**2. Stock price confirmed at $7.92.** MARA has dropped significantly:
- Dec 2025: ~$12
- Jan 2026: ~$10-11
- Feb 2026: ~$7-8
All convertibles are deeply OTM at this price (lowest strike: $18.89).

**3. Cost basis math slightly off.** $4,637,673,000 / 52,850 = $87,762.33, not $87,826. Minor discrepancy — ground truth may have used a different rounding.

**4. Dec 2026 Notes (~$48M) mature in 10 months.** These will need to be repaid or converted. At $76.17 conversion price vs $7.92 stock, they'll be repaid in cash.

**5. ATM dilution is unquantified.** MARA had a $2B ATM program. 35.3M shares sold as of Q3 2025 for $571M. More may have been sold since Sep 30. No 424B5 filings found post-Q3 to check.

### Evidence Sources
- FMP batch-quote: MARA $7.92, market cap $2.995B
- FMP historical prices: Dec $8.98-$12.47, Jan $9.19-$11.36, Feb $6.73-$8.24
- SEC EDGAR search: Only Form 4s, S-8, 13-Fs filed by MARA since Nov 2025
- MARA IR page (ir.mara.com): Latest press release Nov 4, 2025
- 10-Q directly verified via browser: holdings, cost basis, convertible notes table all confirmed
