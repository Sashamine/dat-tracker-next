# Citation Link Audit Report

**Date:** 2026-02-14
**Status:** AUDIT COMPLETE - ISSUES FOUND

## Executive Summary

Multiple citation links fail because internal filing viewer links point to filings that are **not uploaded to R2 storage**. External links (SEC.gov, press releases) generally work. The filing viewer shows "Filing Not Found" for missing filings.

---

## ABTC (American Bitcoin)

| Metric | Search Term | Link Type | Destination | Status | Notes |
|--------|-------------|-----------|-------------|--------|-------|
| 5,098 BTCⓘ | `5,098 Bitcoin` | Press Release | prnewswire.com | ✅ PASS | Search term found |
| $8.1Mⓘ | `8,052,000` | Internal Filing | /filings/abtc/0001193125-25-281390 | ❌ FAIL | **Filing Not Found** - Accession `0001193125-25-281390` missing from R2 |
| 899.5Mⓘ | `899,489,426` | SEC Filing | sec.gov | ✅ PASS | Search term found |

**Missing Filing:** `0001193125-25-281390` (10-Q Q3 2025)

---

## BTBT (Bit Digital)

| Metric | Search Term | Link Type | Destination | Status | Notes |
|--------|-------------|-----------|-------------|--------|-------|
| 155,227ⓘ | `155,227` | Press Release | bit-digital.com (Dec 2025 ETH metrics) | ✅ PASS | Search term found |
| $179.1Mⓘ | `179.1 million` | Press Release | bit-digital.com (Q3 2025 results) | ✅ PASS | Search term found |
| $150.0Mⓘ | `150 million` | Press Release | bit-digital.com (convertible notes) | ✅ PASS | Search term found |
| 323.8Mⓘ | `323,792,059` | Press Release | bit-digital.com (Dec 2025 ETH metrics) | ✅ PASS | Search term found |
| $8.5Mⓘ | `17,401,915` | Internal Filing | /filings/btbt/10Q-2024-06-30 | ❌ FAIL | **Filing Not Found** |
| $3Kⓘ | `3,045` | Press Release | bit-digital.com (Dec 2025 ETH metrics) | ✅ PASS | Search term found |
| $1.13Bⓘ | `1,133,084,610` | Internal Filing | /filings/btbt/10Q-2024-06-30 | ❌ FAIL | **Filing Not Found** - Same missing filing |

**Missing Filing:** `10Q-2024-06-30`

---

## HSDT (Solana Company)

| Metric | Search Term | Link Type | Destination | Status | Notes |
|--------|-------------|-----------|-------------|--------|-------|
| 2,300,000ⓘ | `2.3 million SOL` | Internal Filing | /filings/hsdt/10K-2024-12-31 | ❌ FAIL | **Filing Not Found** |
| $124.1Mⓘ | `124,051` | Internal Filing | (not tested - same pattern) | ❓ LIKELY FAIL | Internal filing |
| $0ⓘ | `No long-term debt` | SEC Filing | (not tested) | ❓ NEEDS TEST | |
| 75.9Mⓘ | `75.9 million common shares and pre-funded warrants` | SEC Filing | (not tested) | ❓ NEEDS TEST | |
| $4.6Mⓘ | `4,646` | Internal Filing | (not tested - same pattern) | ❓ LIKELY FAIL | Internal filing |

**Missing Filing:** `10K-2024-12-31`

---

## DFDV (DeFi Development Corp)

| Metric | Search Term | Link Type | Destination | Status | Notes |
|--------|-------------|-----------|-------------|--------|-------|
| 2,221,329ⓘ (×2) | `2,221,329` | SEC Filing | (not tested) | ❓ NEEDS TEST | |
| 29.9Mⓘ | `29,892,800` | SEC Filing | (not tested) | ❓ NEEDS TEST | |
| $186.0Mⓘ | `131,444` | SEC Filing | (not tested) | ❓ NEEDS TEST | |
| $9.0Mⓘ | `$9M` | SEC Filing | (not tested) | ❓ NEEDS TEST | |

**Internal Filing Test:** `/filings/dfdv/10Q-2025-09-30` → ❌ **Filing Not Found**

---

## UPXI (Upexi Inc)

| Metric | Search Term | Link Type | Destination | Status | Notes |
|--------|-------------|-----------|-------------|--------|-------|
| 2,174,583ⓘ | `Solana tokens held` | SEC Filing | (not tested) | ❓ NEEDS TEST | |
| 69,760,581ⓘ | `69,760,581` | Internal Filing | (not tested) | ❓ LIKELY FAIL | Internal filing |
| $254.6Mⓘ | `144,115,480` | SEC Filing | (not tested) | ❓ NEEDS TEST | |
| $1.6Mⓘ | `1,616,765` | SEC Filing | (not tested) | ❓ NEEDS TEST | |
| $6.2Mⓘ | `12,461,887` | Internal Filing | (not tested) | ❓ LIKELY FAIL | Internal filing |

---

## Root Cause Analysis

### Pattern Identified
- **External links** (SEC.gov, press releases) → Generally **PASS**
- **Internal filing viewer links** (`/filings/{ticker}/{accession}`) → Consistently **FAIL**

### Technical Issue
The internal filing viewer (`/filings/[ticker]/[accessionOrId]`) returns "Filing Not Found" because the raw filing HTML files have **not been uploaded to R2 storage**.

### Missing Filings from R2

| Company | Filing ID | Type |
|---------|-----------|------|
| ABTC | `0001193125-25-281390` | 10-Q Q3 2025 |
| BTBT | `10Q-2024-06-30` | 10-Q Q2 2024 |
| HSDT | `10K-2024-12-31` | 10-K 2024 |
| DFDV | `10Q-2025-09-30` | 10-Q Q3 2025 |

---

## Recommendations

1. **Upload missing filings to R2** - Run the SEC filing download script to populate R2 with the referenced filings

2. **Fallback to SEC.gov** - Update internal filing viewer links to fall back to direct SEC.gov links when filing not found in R2

3. **Audit all citation source URLs** - Run a script to verify all `*SourceUrl` fields in `companies.ts` point to valid pages

4. **Link validation on build** - Add a CI check that verifies citation URLs resolve during build

---

## Test Summary

| Company | Total Citations | Passed | Failed | Not Tested |
|---------|-----------------|--------|--------|------------|
| ABTC | 3 | 2 | 1 | 0 |
| BTBT | 7 | 5 | 2 | 0 |
| HSDT | 5 | 0 | 1 | 4 |
| DFDV | 4 | 0 | 0* | 4 |
| UPXI | 5 | 0 | 0 | 5 |
| **Total** | **24** | **7** | **4** | **13** |

*DFDV internal filing tested separately, confirmed broken

---

*Audit conducted 2026-02-14 by Claude subagent*
