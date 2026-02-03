# Company Page Verification Checklist

Use this checklist when verifying or updating company data to ensure consistency across all companies.

---

## 1. Citations on Stats

Each key stat should have a filing citation that links to the source document.

| Stat | Citation Format | Filing Type | Highlight Target |
|------|-----------------|-------------|------------------|
| Holdings | `[8-K ↗]` | 8-K | BTC amount (e.g., "713,502") |
| Cash Reserves | `[8-K ↗]` | 8-K | "USD Reserve" |
| Total Debt | `[10-Q ↗]` | 10-Q | "Long-term debt" |
| Preferred Equity | `[8-K ↗]` | 8-K | "preferred stock" |
| Annual Burn | `[10-Q ↗]` | 10-Q | "operating expenses" |

**Note:** Citations only appear when source fields are populated in `companies.ts`.

---

## 2. Calculated Metrics Show Inputs

Derived metrics should show their formula, not just the result:

| Metric | Display Format | Example |
|--------|----------------|---------|
| Leverage | `(Debt - Cash) / Crypto NAV` | `($8.17B - $2.25B) / $67.8B` |
| NAV/Share | `Equity NAV / Shares` | `$37.71B / 332M` |

---

## 3. ITM Converts Note

When convertible notes are in-the-money:
- Display under Total Debt: *"Incl. $X.XB ITM converts"*
- Hover tooltip shows: "X convertible notes in-the-money at $XXX"
- Data comes from `dilutive-instruments.ts`

---

## 4. Required Data Fields in `companies.ts`

### Holdings
```typescript
holdings: 713_502,
holdingsLastUpdated: "2026-02-01",
holdingsSource: "sec-filing",
holdingsSourceUrl: "https://www.sec.gov/...",
```

### Cash Reserves
```typescript
cashReserves: 2_250_000_000,
cashSource: "SEC 8-K Jan 5, 2026",
cashAsOf: "2026-01-04",
```

### Debt
```typescript
totalDebt: 8_173_903_000,
debtSource: "SEC 10-Q Q3 2025",
debtAsOf: "2025-09-30",
```

### Preferred Equity
```typescript
preferredEquity: 8_382_000_000,
preferredSource: "SEC 10-Q + 8-K aggregated",
preferredAsOf: "2026-01-26",
```

### Quarterly Burn
```typescript
quarterlyBurnUsd: 15_200_000,
burnAsOf: "2025-11-03",  // 10-Q filing date
```

---

## 5. Fields to Remove (Unsourced)

Remove these if they exist without proper sourcing:
- ❌ `optionsOi` - requires options chain data source
- ❌ `leverageRatio` - redundant (calculated dynamically from debt/crypto)

---

## 6. Holdings History (`holdings-history.ts`)

Ensure the latest entry:
- Matches current `holdings` in `companies.ts`
- Uses `sharesForMnav` (basic shares) for BTC/share calculation
- Has proper source attribution

Example:
```typescript
{ 
  date: "2026-02-01", 
  holdings: 713502, 
  sharesOutstandingDiluted: 332_431_000, 
  holdingsPerShare: 0.002147, 
  source: "SEC 8-K Feb 2, 2026",
  sourceType: "sec-filing"
}
```

---

## 7. Annual Burn Display

- **Show in USD**, not BTC equivalent
- Format: `-$61M USD/yr ($15.2M/qtr)`
- Reason: Avoids implying company is spending BTC holdings

---

## 8. Outlook Section

### Naming
- Use **"Outlook & Catalysts"** (not year-specific like "2026 Outlook")
- Content often spans multiple years (debt maturities, etc.)

### Format
- Render as **bullet list** (not paragraph)
- Each item on its own line with purple bullet indicator

### Content Guidelines
- ✅ Include: Debt schedule, catalysts, specific regulatory risks
- ❌ Remove: Generic risks like "BTC volatility impacts price" or "rising rates"

---

## 9. Dilutive Instruments (`dilutive-instruments.ts`)

For companies with convertibles/warrants/options:
- Add entries with `strikePrice`, `potentialShares`, `faceValue`
- Include `source` and `sourceUrl` for each instrument
- Used to calculate ITM converts display

---

## Verification Process

1. **Pull latest SEC filings** (8-K, 10-Q, 10-K)
2. **Update `companies.ts`** with current values + source fields
3. **Update `holdings-history.ts`** with new snapshot
4. **Update `dilutive-instruments.ts`** if capital structure changed
5. **Update `company-intel.ts`** outlook if needed
6. **Build and test** locally
7. **Commit with descriptive message** citing the filing

---

*Last updated: 2026-02-03*
