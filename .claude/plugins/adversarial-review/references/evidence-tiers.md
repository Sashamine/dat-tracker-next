# Evidence Tiers Reference

This document defines the three tiers of evidence used in the adversarial review process.

## TIER 1: VERIFIED

**Confidence**: Highest - accept as truth

**Sources**:
| Source Type | Examples | How to Access |
|-------------|----------|---------------|
| SEC EDGAR filings | 8-K, 10-Q, 10-K, S-1 | https://www.sec.gov/cgi-bin/browse-edgar |
| Official company dashboards | strategy.com (MSTR), metaplanet.jp, kulrbitcointracker.com | Direct URL |
| Exchange filings (Japan) | EDINET | https://disclosure.edinet-fsa.go.jp |
| Exchange filings (Hong Kong) | HKEX | https://www.hkexnews.hk |
| Exchange filings (Canada) | SEDAR+ | https://www.sedarplus.ca |
| Exchange filings (EU) | Various national systems | Varies by country |

**Data entry requirements**:
```typescript
{
  source: "SEC 8-K",
  sourceUrl: "https://www.sec.gov/Archives/edgar/data/...",
  sourceType: "sec-filing",
  // No pendingVerification needed
}
```

**Verification process**:
1. Fetch the source document
2. Find the exact line/table with the value
3. Quote verbatim
4. Note document date

---

## TIER 2: PROVISIONAL

**Confidence**: Medium - accept with caveats

**Sources**:
| Source Type | Examples | Notes |
|-------------|----------|-------|
| Company press releases | IR website announcements | Must assess legitimacy |
| Company Twitter/X | Official accounts only | Must be verifiable announcement |
| Investor presentations | Before quarterly filing | Numbers may be preliminary |
| 8-K press release exhibits | Filed with SEC but not in XBRL | Better than unfiled press release |

**Data entry requirements**:
```typescript
{
  source: "Press Release",
  sourceUrl: "https://ir.company.com/news/...",
  sourceType: "press-release",
  pendingVerification: true,
  verificationExpected: "2026-01-27",  // Expected SEC filing date
}
```

**Legitimacy assessment criteria**:

### HIGH Confidence Press Releases
- [ ] Company has track record (check previous announcements vs SEC filings)
- [ ] Specific numbers provided ("purchased 100 BTC" not "significant investment")
- [ ] Filed as SEC exhibit or accompanying 8-K
- [ ] Consistent with announced strategy
- [ ] Company has demonstrated capital (recent financing, cash on balance sheet)

### LOW Confidence Press Releases
- [ ] New company or no track record
- [ ] Vague numbers or promotional language
- [ ] No SEC filing accompaniment
- [ ] Numbers inconsistent with company size
- [ ] History of corrections or restatements

**Verification lifecycle**:
```
Press Release Published
        ↓
Add with pendingVerification: true
        ↓
Monitor for SEC filing (typically 1-4 business days)
        ↓
┌───────┴────────┐
↓                ↓
SEC confirms    SEC differs
↓                ↓
Upgrade to      Create discrepancy
TIER 1          alert for review
```

---

## TIER 3: UNVERIFIED

**Confidence**: None - NOT acceptable as primary source

**Sources**:
| Source Type | Examples | Why Not Acceptable |
|-------------|----------|-------------------|
| News articles | Bloomberg, Reuters, CNBC | Reporting on primary source, may misquote |
| Aggregator sites | BitcoinTreasuries.net, mNAV.com | Can be stale or wrong (missed XXI Class B) |
| Web search results | Google, Bing snippets | Unverified, may be outdated |
| Analyst estimates | Research reports | Estimates, not actuals |
| Social media (non-official) | Random tweets, Reddit | Unverified claims |
| Wikipedia | Any wiki article | Anyone can edit |

**NEVER use TIER 3 as primary source.**

**Acceptable uses for TIER 3**:
- Discovery: "News says KULR bought BTC, let me find the primary source"
- Cross-reference: "Our value matches aggregator, probably correct"
- Context: "Analyst estimates suggest this range is reasonable"

**Example of WRONG approach**:
```
User: Web search says MSTR has 450,000 BTC
❌ WRONG: Update holdings to 450,000
✓ RIGHT: Find the SEC 8-K that confirms this number
```

---

## Quick Reference

| Tier | Source | pendingVerification | Action |
|------|--------|---------------------|--------|
| TIER 1 | SEC, dashboards, exchange filings | No | Accept |
| TIER 2 | Press releases, announcements | Yes | Accept with flag |
| TIER 3 | News, aggregators, search | N/A | Reject |

## Field-Specific Guidance

### Holdings (BTC/ETH/etc.)
- **TIER 1**: SEC 8-K, company dashboard with real-time data
- **TIER 2**: Press release announcing purchase
- **TIER 3**: Aggregator showing total

### Shares Outstanding
- **TIER 1**: SEC 10-Q/10-K (WeightedAverageNumberOfDilutedSharesOutstanding)
- **TIER 2**: Company announcement of offering completion
- **TIER 3**: Yahoo Finance, stock screeners

### Total Debt
- **TIER 1**: SEC 10-Q/10-K balance sheet
- **TIER 2**: Press release for new debt issuance
- **TIER 3**: Financial news, aggregators

### Cash Reserves
- **TIER 1**: SEC 10-Q/10-K balance sheet
- **TIER 2**: Offering completion announcement (proceeds)
- **TIER 3**: Analyst estimates
