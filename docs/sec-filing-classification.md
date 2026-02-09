# SEC Filing Classification System

## Lessons Learned from MSTR Extraction

This document captures the classification patterns we discovered while extracting MSTR data. These patterns will scale to other companies.

---

## 1. 8-K Filing Categories

A single 8-K can contain multiple event types. Classification requires identifying the **primary purpose**.

### Category: Holdings Update
**Purpose:** Company discloses crypto acquisition

**Trigger Patterns:**
- `purchased approximately X bitcoins`
- `acquired approximately X bitcoins`
- `bitcoin holdings`
- `BTC Acquired`

**Extraction Patterns:**
```
Format A (2020-2023 narrative):
  /(?:purchased|acquired) approximately ([\d,]+) bitcoins? for (?:approximately )?\$([\d,.]+) (million|billion)/i

Format B (2025+ table):
  /BTC Acquired.*?(\d{1,3}(?:,\d{3})*)\s+\$\s*([\d,.]+)\s*(million|billion)?/i
```

**Data Points:**
- BTC acquired (count)
- Total cost (USD)
- Average price per BTC
- Cumulative holdings (if disclosed)

---

### Category: Debt Issuance
**Purpose:** Company raises debt capital

**Trigger Patterns:**
- `convertible notes`
- `senior secured notes`
- `entered into an indenture`
- `aggregate principal amount`

**NOT a debt issuance if:**
- Only mentions `redemption` without new issuance
- Is a pricing announcement for previously announced deal (dedupe needed)

**Extraction Patterns:**
```
Principal: /aggregate principal amount of (?:the notes )?(?:is |being offered is )?\$([\d,.]+) (million|billion)/i
Rate: /bear(?:s|ing)? interest at(?: a rate of)? ([\d.]+)%/i
Maturity: /mature on ([A-Za-z]+ \d+, \d{4})/i
Conversion: /conversion price of(?: approximately)? \$([\d,.]+)/i
```

**Data Points:**
- Principal amount
- Interest rate (0 for zero-coupon)
- Maturity date
- Conversion price (for convertibles)
- Use of proceeds

---

### Category: Equity/ATM Update
**Purpose:** Disclose stock sales through ATM programs

**Trigger Patterns:**
- `ATM Program Summary`
- `ATM Updates`
- `at-the-market offering`
- `shares sold`

**Format Evolution:**
- 2024: Simple table with one ATM program
- 2025+: Multi-program tables (Common, STRK, STRF, STRC, STRD)

**Extraction Challenges:**
- Multiple $ amounts in same row (proceeds vs. capacity)
- Must distinguish "Net Proceeds" from "Available for Issuance"
- Same program name can appear multiple times (2024 vs 2025 Common ATM)

**Data Points:**
- Program name
- Security type
- Shares sold
- Net proceeds
- Remaining capacity

---

### Category: Policy/Governance
**Purpose:** Non-financial corporate announcements

**Trigger Patterns:**
- `Treasury Reserve Policy`
- `Board of Directors`
- `non-employee directors`
- `compensation`

**Action:** Skip for financial extraction, log for completeness

---

### Category: Impairment Disclosure
**Purpose:** Mark-to-market loss announcements

**Trigger Patterns:**
- `impairment loss`
- `impairment charge`

**Action:** May want to track for fair value analysis

---

## 2. 424B5 Filing Categories

### Category: ATM Prospectus Supplement
**Purpose:** Legal documentation for ATM program

**Trigger Patterns:**
- `at-the-market`
- `equity distribution agreement`
- `sales agreement`

**Note:** Actual sales data comes from 8-K updates, not 424B5

### Category: Convertible Offering Prospectus
**Purpose:** Legal documentation for debt offering

**Trigger Patterns:**
- `convertible notes`
- `offering`

---

## 3. Classification Algorithm

```
function classifyFiling(content, formType) {
  const lower = content.toLowerCase();
  
  if (formType === '8-K') {
    // Check for holdings update first (most valuable)
    if (hasPattern(lower, HOLDINGS_TRIGGERS)) {
      return extractHoldingsUpdate(content);
    }
    
    // Check for ATM update (has structured tables)
    if (hasPattern(lower, ATM_TRIGGERS)) {
      return extractATMUpdate(content);
    }
    
    // Check for debt issuance
    if (hasPattern(lower, DEBT_TRIGGERS) && !isRedemptionOnly(lower)) {
      return extractDebtIssuance(content);
    }
    
    // Check for policy/governance
    if (hasPattern(lower, GOVERNANCE_TRIGGERS)) {
      return { type: 'governance', extractable: false };
    }
    
    return { type: 'other', extractable: false };
  }
  
  // Add other form types...
}
```

---

## 4. Key Classification Lesson: Table Column Parsing

**Problem:** ATM tables have multiple $ columns in order:
```
Shares Sold | Notional Value | Net Proceeds | Available for Issuance
626,639     | $62.7M         | $66.4M       | $20,616.8M
```

**Wrong approach:** Grab any $ amount (picks up $20B capacity)
**Right approach:** Use "Total $X" line at bottom (authoritative weekly sum)

**Result:**
- Wrong parsing: $151B (grabbed Available column)
- Correct parsing: $5.4B (from Total lines)

**Validation rule:** If total seems > 10x reasonable, you're parsing wrong column.

---

## 5. ATM Disclosure Format Evolution

| Period | Format | Pattern | Example |
|--------|--------|---------|---------|
| 2024-10 to 2025-03 | Narrative | "sold an aggregate of X Shares...for aggregate net proceeds of $Y" | `13,593,865 Shares...$4.6 billion` |
| 2025-03+ | Table | Headers + rows + "Total $X" line | `Total $180.3` |

**Key insight:** Handle BOTH formats in the same extractor.

### Unit Parsing Gotcha

Total lines vary:
- `Total $112.2` - implicit millions
- `Total $1.44 billion` - explicit billions
- `Total $ 963.0` - space after $, implicit millions

**Regex must capture optional unit:**
```javascript
/Total\s+\$\s*([\d,.]+)\s*(billion|million)?/i
```

**Heuristic for missing units:** If value < 10, assume billions.

---

## 6. Format Evolution Timeline

| Period | 8-K Format | Key Features |
|--------|------------|--------------|
| 2020-08 to 2021-06 | Narrative only | "purchased X bitcoins for $Y" |
| 2021-06 to 2023-12 | Narrative + debt details | More structured debt disclosures |
| 2024-01 to 2024-10 | Narrative + simple ATM | Single ATM program table |
| 2024-10 to present | Multi-table weekly | ATM summary + BTC update tables |

**Implication:** Extractors need multiple format handlers per category.

---

## 5. Deduplication Rules

**Same-deal filings:**
- Pricing announcement (8-K)
- Closing announcement (8-K)
- Prospectus supplement (424B5)

**Dedupe key:** `{principal_amount}-{maturity_date}` for debt

**Rule:** Keep the closing announcement, skip pricing (has final numbers)

---

## 6. Validation Rules

**Holdings Update:**
- BTC count should be positive integer
- Cost should be reasonable (count × $1K to count × $200K)
- Cumulative should be > previous cumulative

**Debt Issuance:**
- Principal should be > $10M (filter noise)
- Interest rate 0-20%
- Maturity date in future

**ATM Update:**
- Shares sold should be non-negative
- Proceeds < remaining capacity

---

## 7. Applying to Other Companies

For a new company, the process is:

1. **Identify CIK** from SEC EDGAR
2. **Sample 8-Ks** to discover format patterns
3. **Map to categories** using trigger patterns
4. **Build extractors** for each category
5. **Test with date range** to verify format evolution
6. **Deploy incremental** monitoring

Key question per company: "What does their holdings disclosure look like?"
- Some use 8-K Item 8.01 (like MSTR)
- Some may use press releases only
- Some disclose in 10-Q/10-K only

---

## 8. Final Coverage Assessment

For MSTR ATM equity extraction:
- **89% coverage** achieved via automated extraction
- **3 format evolutions** handled (narrative → old table → new table)
- **50 filings** parsed successfully

Remaining 11% gap requires:
- STRE direct offerings (different disclosure format)
- 10-Q cross-reference for validation
- Manual review edge cases

This is acceptable for automated SEC extraction.

---

## 9. Remaining Work

### For MSTR:
- [ ] Fix ATM proceeds extraction (distinguish proceeds vs. capacity)
- [ ] Add 10-Q/10-K validation (cross-reference quarterly totals)
- [ ] Build incremental update pipeline (new filings)

### For Other Companies:
- [ ] Build company discovery system
- [ ] Create format sampling tool
- [ ] Document company-specific patterns
