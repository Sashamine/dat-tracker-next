# SEC 8-K Data Extraction Workflow

## Overview

This document describes the reliable process for extracting historical data from SEC EDGAR filings. This workflow is **universal** - it works for any US company with SEC filings.

## Why SEC Data?

1. **Primary source** - SEC filings are legally required disclosures
2. **Universal** - All US public companies file with SEC
3. **Auditable** - Every data point has an accession number linking to the source
4. **Machine-readable** - 10-Q/10-K have XBRL; 8-K requires text parsing

## The Two-Tool Approach

### Problem
The `get_recent_filings` API has a **365-day limit**. For historical data, we need an alternative.

### Solution
Combine **Playwright** (for filing lists) with **SEC API** (for content extraction):

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Get Filing List (Playwright + SEC EDGAR Website)       │
│  - No date limit                                                │
│  - Filter by form type (8-K, 10-Q, 10-K)                       │
│  - Get accession numbers                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: Get Filing Content (get_filing_content API)            │
│  - Works with any accession number                              │
│  - Returns full filing text                                     │
│  - Identifies items (8.01, 1.01, etc.)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Parse Data from Text                                   │
│  - Extract BTC amounts, prices, cumulative totals               │
│  - Regex or LLM-based extraction                                │
│  - Cross-reference with 10-Q quarterly totals                   │
└─────────────────────────────────────────────────────────────────┘
```

## Step 1: Get Filing List

### URL Pattern
```
https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={CIK}&type={FORM_TYPE}&dateb={YYYYMMDD}&owner=include&count={LIMIT}
```

### Parameters
| Parameter | Description | Example |
|-----------|-------------|---------|
| CIK | Company identifier | 0001050446 (MSTR) |
| type | Form type filter | 8-K, 10-Q, 10-K |
| dateb | Filings BEFORE this date | 20210101 |
| count | Results per page | 40, 100 |

### Example: Get MSTR 8-Ks before Jan 1, 2021
```
https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=8-K&dateb=20210101&owner=include&count=40
```

### What to Extract
From each row in the results table:
- **Accession Number** (e.g., `0001193125-20-310787`)
- **Filing Date** (e.g., `2020-12-04`)
- **Items** (e.g., "items 8.01 and 9.01")

## Step 2: Get Filing Content

### API Call
```typescript
mcp__sec-edgar__get_filing_content({
  identifier: "MSTR",  // or CIK
  accession_number: "0001193125-20-310787"
})
```

### Response Structure
```typescript
{
  success: true,
  accession_number: "0001193125-20-310787",
  form_type: "8-K",
  filing_date: "2020-12-04",
  content: "...", // Full filing text
  filing_data: {
    items: ["Item 8.01"],
    has_press_release: false
  },
  url: "https://www.sec.gov/Archives/edgar/data/..."
}
```

## Step 3: Parse BTC Data

### Common Patterns in 8-K Item 8.01

**BTC Purchase Announcement:**
```
purchased approximately {BTC_AMOUNT} bitcoins for ${USD_AMOUNT} million
at an average price of approximately ${AVG_PRICE} per bitcoin
Company holds approximately {CUMULATIVE} bitcoins
```

### Regex Patterns
```javascript
// BTC amount
/purchased\s+(?:approximately\s+)?([0-9,]+)\s+bitcoins?/i

// USD amount
/for\s+\$([0-9,.]+)\s*(?:million|billion)/i

// Average price
/average\s+price\s+of\s+(?:approximately\s+)?\$([0-9,]+)/i

// Cumulative holdings
/holds?\s+(?:approximately\s+)?([0-9,]+)\s+bitcoins?/i
```

## Item Types Reference

### 8-K Items Relevant to DAT Tracking

| Item | Description | Use Case |
|------|-------------|----------|
| 1.01 | Entry into Material Agreement | Debt issuance, ATM programs |
| 2.03 | Creation of Direct Obligation | Debt details |
| 3.02 | Unregistered Sale of Equity | Private placements, warrant exercises |
| 3.03 | Material Modification to Rights | Preferred stock issuance |
| 5.03 | Amendments to Charter | Stock splits, name changes |
| 8.01 | Other Events | **BTC purchases**, voluntary disclosures |
| 9.01 | Financial Statements/Exhibits | Press releases attached |

### Identifying BTC Purchases
Look for 8-Ks with:
- Item 8.01 in description
- Keywords: "bitcoin", "BTC", "digital asset"
- Filed shortly after known purchase dates

## Cross-Validation

### Always Cross-Check Against Quarterly Filings
8-K data should reconcile with 10-Q/10-K totals:

```
Sum of 8-K BTC purchases in Q1 ≈ 10-Q Q1 BTC holdings - Prior quarter holdings
```

### Quarterly Filing XBRL Tags
```
us-gaap:DigitalAssetsCurrent
us-gaap:DigitalAssetsNoncurrent
us-gaap:CashAndCashEquivalentsAtCarryingValue
```

## Example: Complete Extraction

### 1. Navigate to SEC EDGAR
```
URL: https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=8-K&dateb=20210101&count=40
```

### 2. Identify BTC Filing
```
Filing Date: 2020-12-04
Accession: 0001193125-20-310787
Items: 8.01
```

### 3. Get Content
```typescript
const filing = await get_filing_content("MSTR", "0001193125-20-310787");
```

### 4. Parse Result
```
From text: "purchased approximately 2,574 bitcoins for $50.0 million...
           at an average price of approximately $19,427 per bitcoin...
           Company holds approximately 40,824 bitcoins"

Extracted:
- btcAcquired: 2574
- btcPurchasePrice: 50_000_000
- btcAvgPrice: 19427
- btcCumulative: 40824
```

### 5. Record with Provenance
```typescript
{
  date: "2020-12-04",
  filedDate: "2020-12-04",
  accessionNumber: "0001193125-20-310787",
  secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312520310787/",
  type: "BTC",
  item: "8.01",
  section: "Other Events",
  btcAcquired: 2574,
  btcPurchasePrice: 50_000_000,
  btcAvgPrice: 19427,
  btcCumulative: 40824,
}
```

## Limitations

1. **8-Ks have no XBRL** - Values must be parsed from text
2. **Not all purchases have 8-Ks** - Some disclosed only in quarterly filings
3. **Text variations** - Wording changes between filings
4. **Timing gaps** - Filing date may differ from purchase date

## Best Practices

1. **Start with quarterly filings** - Get XBRL-verified totals first
2. **Use 8-Ks to fill gaps** - Inter-quarter activity
3. **Verify cumulative totals** - Each 8-K should show running total
4. **Document accession numbers** - Every data point traceable to SEC
5. **Flag estimates** - When exact data unavailable

## Files Using This Workflow

- `mstr-sec-history.ts` - XBRL quarterly data (10-Q/10-K)
- `mstr-capital-events.ts` - 8-K inter-quarter events
