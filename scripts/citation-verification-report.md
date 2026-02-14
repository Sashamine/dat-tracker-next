# Citation Verification Report

**Generated:** 2026-02-14
**Verified by:** Claude (subagent)
**Dev Server:** localhost:3000

## Summary

| Company | Total Citations | PASS | FAIL | URL Issues |
|---------|----------------|------|------|------------|
| BTBT | 7 | 7 | 0 | 1 (dir listing) |
| HSDT | 5 | 3 | 2 | 3 (dir listings) |
| DFDV | 4 | 4 | 0 | 1 (dir listing) |
| UPXI | 5 | 5 | 0 | 4 (dir listings) |
| **TOTAL** | **21** | **19** | **2** | **9** |

**Overall Pass Rate:** 90.5% (19/21 citations pass)

---

## BTBT (Bit Digital)

| Metric | Search Term | Link Type | Loaded? | Found? | Notes |
|--------|-------------|-----------|---------|--------|-------|
| Holdings (155,227) | `155,227` | Press Release | ✅ | ✅ | PASS |
| Cash ($179.1M) | `179.1 million` | Press Release | ✅ | ✅ | PASS |
| Debt ($150.0M) | `150 million` | Press Release | ✅ | ✅ | PASS |
| Shares (323.8M) | `323,792,059` | Press Release | ✅ | ✅ | PASS |
| Quarterly Burn ($8.5M) | `17,401,915` | SEC Filing | ✅ | ✅ | **URL points to directory** - should link to `ea0241656-10q_bitdigital.htm` |
| Cost Basis ($3K) | `3,045` | Press Release | ✅ | ✅ | PASS |
| Total Assets ($1.13B) | `1,133,084,610` | SEC Filing | ✅ | ✅ | PASS (Q3 10-Q ea0263546-10q_bitdigital.htm) |

**Status: 7/7 PASS** ✅

### URL Fix Needed:
- Quarterly Burn: Change URL from directory listing to actual document:
  - Current: `https://www.sec.gov/Archives/edgar/data/1710350/000121390025044155/`
  - Should be: `https://www.sec.gov/Archives/edgar/data/1710350/000121390025044155/ea0241656-10q_bitdigital.htm`

---

## HSDT (Helius Medical / Solana Company)

| Metric | Search Term | Link Type | Loaded? | Found? | Notes |
|--------|-------------|-----------|---------|--------|-------|
| Holdings (2,300,000) | `2.3 million SOL` | SEC 8-K | ✅ | ✅ | PASS |
| Cash ($124.1M) | `124,051` | SEC 10-Q | ✅ | ✅ | **URL points to directory** - should link to `hsdt-20250930x10q.htm` |
| Debt ($0) | `No long-term debt` | SEC 10-Q | ✅ | ❌ | **FAIL** - Phrase not in document. Document shows no debt but doesn't use this exact text |
| Shares (75.9M) | `75.9 million common shares and pre-funded warrants` | SEC 10-Q | ✅ | ❌ | **FAIL** - Phrase not in 10-Q. May be from press release |
| Quarterly Burn ($4.6M) | `4,646` | SEC 10-Q | ✅ | ✅ | PASS |

**Status: 3/5 PASS** ⚠️

### Issues to Fix:
1. **Debt search term** - "No long-term debt" is not verbatim in the 10-Q. Either:
   - Find the exact quote in the filing, OR
   - Change to a verifiable search term like a balance sheet value

2. **Shares search term** - "75.9 million common shares and pre-funded warrants" is not in the 10-Q.
   - The 10-Q shows basic shares of 41,301,400 (XBRL)
   - The "75.9 million" figure may be from a press release - need to update sourceUrl

3. **Directory listing URLs** - Cash citation should link to actual document

---

## DFDV (DeFi Development Corp)

| Metric | Search Term | Link Type | Loaded? | Found? | Notes |
|--------|-------------|-----------|---------|--------|-------|
| Holdings (2,221,329) | `2,221,329` | GlobeNewswire | ✅ | ✅ | PASS |
| Shares (29.9M) | `29,892,800` | GlobeNewswire | ✅ | ✅ | PASS |
| Debt ($186.0M) | `131,444` | SEC 10-Q | ✅ | ✅ | **URL points to directory** - should link to `dfdv-20250930.htm` |
| Cash ($9.0M) | `$9M` | GlobeNewswire | ✅ | ✅ | PASS |

**Status: 4/4 PASS** ✅

### URL Fix Needed:
- Debt: Change URL from directory listing to actual document:
  - Current: `https://www.sec.gov/Archives/edgar/data/1805526/000119312525286660/`
  - Should be: `https://www.sec.gov/Archives/edgar/data/1805526/000119312525286660/dfdv-20250930.htm`

---

## UPXI (Upexi)

| Metric | Search Term | Link Type | Loaded? | Found? | Notes |
|--------|-------------|-----------|---------|--------|-------|
| Holdings (2,174,583) | `Solana tokens held` / `2,174,583` | GlobeNewswire | ✅ | ✅ | PASS |
| Shares (69,760,581) | `69,760,581` | SEC 10-Q | ✅ | ✅ | **URL points to directory** |
| Debt ($254.6M) | `144,115,480` | SEC 10-Q | ✅ | ✅ | **URL points to directory** |
| Cash ($1.6M) | `1,616,765` | SEC 10-Q | ✅ | ✅ | **URL points to directory** |
| Quarterly Burn ($6.2M) | `12,461,887` | SEC 10-Q | ✅ | ✅ | **URL points to directory** |

**Status: 5/5 PASS** ✅

### URL Fixes Needed:
All SEC citations use directory listing. Should point to actual document:
- Current: `https://www.sec.gov/Archives/edgar/data/1775194/000147793226000736/`
- Should be: `https://www.sec.gov/Archives/edgar/data/1775194/000147793226000736/upxi_10q.htm`

---

## Failures Requiring Fixes

### 1. HSDT - Debt Citation
**Problem:** Search term "No long-term debt" is not found in the 10-Q document.
**Impact:** Citation popup says "Search for 'No long-term debt'" but user won't find that text.
**Fix Options:**
- Change search term to something verifiable in the document (e.g., a zero balance)
- Link to a press release or 8-K that contains this exact language
- Change to "LongTermDebt: $0" or similar XBRL-based term

### 2. HSDT - Shares Citation
**Problem:** Search term "75.9 million common shares and pre-funded warrants" is not in the 10-Q.
**Impact:** User cannot verify the shares figure by searching the cited document.
**Likely Source:** This phrase is probably from an Oct 29, 2025 press release (8-K), not the 10-Q.
**Fix:** Update the sourceUrl to point to the press release that contains this exact text.

---

## Directory Listing URLs (Non-Critical)

These citations work but link to SEC directory listings instead of the actual document. Users have to click through to find the filing.

| Company | Metric | Current URL | Suggested Fix |
|---------|--------|-------------|---------------|
| BTBT | Quarterly Burn | `.../000121390025044155/` | Add `ea0241656-10q_bitdigital.htm` |
| HSDT | Cash | `.../000110465925113714/` | Add `hsdt-20250930x10q.htm` |
| DFDV | Debt | `.../000119312525286660/` | Add `dfdv-20250930.htm` |
| UPXI | Shares, Debt, Cash, Burn | `.../000147793226000736/` | Add `upxi_10q.htm` |

---

## Verification Methodology

For each citation:
1. Navigated to the source URL in browser
2. Waited for page load (3s for SEC pages)
3. Used JavaScript `document.body.innerText.includes(searchTerm)` to verify
4. Recorded results with context

**Tools:** Clawd browser automation (Playwright)
**Profile:** clawd

---

## Previously Verified (Skipped)

- **ABTC:** All 3 citations pass ✅
- **NAKA:** Edwin fixed manually ✅
