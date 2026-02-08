# 8-K Citation Anchor Template

## Final Convention (v2)

### Anchor Naming Rules

1. **Prefix:** All custom anchors use `dat-` prefix (DAT Tracker namespace)
2. **No dates in IDs:** URL path contains the date (`8k-2026-01-26.html`), IDs are generic
3. **Lowercase with hyphens:** `dat-atm-sales`, `dat-btc-holdings`
4. **Modify originals in place:** No separate annotated folder

### Decision: Modify Original Files

**Approach:** Add `id` attributes directly to local SEC filing copies.

**Rationale:**
- These are local copies, not canonical SEC documents
- Adding IDs doesn't change rendered content or meaning
- Avoids file duplication and path confusion
- Browser navigation works seamlessly with `#anchor` URLs

**Migration:** After this template is finalized, files move from `8k-annotated/` back to `8k/`.

---

## Complete Anchor Reference

### ATM/Equity Sales Anchors

| Anchor ID | Element | Content | Notes |
|-----------|---------|---------|-------|
| `dat-atm-sales` | `<p>` header | "ATM Update" section | Links to full ATM table |
| `dat-atm-mstr` | `<td>` row | MSTR Class A common stock row | Shares sold, proceeds, capacity |
| `dat-atm-strk` | `<td>` row | STRK preferred stock row | 8.00% Series A Strike |
| `dat-atm-strf` | `<td>` row | STRF preferred stock row | 10.00% Series A Strife |
| `dat-atm-strc` | `<td>` row | STRC preferred stock row | Variable Rate Stretch |
| `dat-atm-strd` | `<td>` row | STRD preferred stock row | 10.00% Series A Stride |

### Bitcoin Holdings Anchors

| Anchor ID | Element | Content | Notes |
|-----------|---------|---------|-------|
| `dat-btc-holdings` | `<p>` header | "BTC Update" section | Links to BTC table |

### Debt Anchors (Future)

| Anchor ID | Element | Content | Notes |
|-----------|---------|---------|-------|
| `dat-debt-terms` | TBD | Convertible note terms | Principal, rate, maturity |
| `dat-debt-proceeds` | TBD | Use of proceeds | What the capital is for |

---

## Format Variations

### Table Format (2024+)
Modern 8-Ks use HTML tables for ATM and BTC data.

**Pattern:**
```html
<!-- Section header -->
<p id="dat-atm-sales" style="..."><span style="font-style:italic">ATM Update</span></p>

<!-- Row-level anchors on first <td> of data rows -->
<tr>
  <td id="dat-atm-mstr" style="..."><p>MSTR Stock</p></td>
  ...
</tr>
```

**Search pattern:**
```regex
<span[^>]*font-style:italic[^>]*>(ATM Update|BTC Update)</span>
```

### Narrative Format (2020-2023)
Earlier 8-Ks embed data in paragraph text, not tables.

**Pattern:**
```html
<p id="dat-btc-holdings">
  As of [date], the Company held approximately [X] bitcoins...
</p>
```

**Search pattern:** Look for paragraphs containing "held approximately X bitcoins" or "acquired X bitcoins".

### Debt 8-Ks
Convertible note announcements have different structure.

**Pattern:**
```html
<p id="dat-debt-terms">
  $[amount] aggregate principal amount of [rate]% Convertible Senior Notes due [year]...
</p>
```

---

## Implementation Example

### Adding anchors to a new 8-K

```javascript
// 1. Section headers - add id to <p> containing italic header text
const atmHeader = doc.querySelector('span[style*="font-style:italic"]');
if (atmHeader?.textContent.includes('ATM Update')) {
  atmHeader.closest('p').id = 'dat-atm-sales';
}

// 2. Row-level anchors - find rows by stock ticker
const rows = doc.querySelectorAll('tr');
rows.forEach(row => {
  const firstTd = row.querySelector('td');
  const text = firstTd?.textContent?.trim();
  
  if (text === 'MSTR Stock') firstTd.id = 'dat-atm-mstr';
  if (text === 'STRK Stock') firstTd.id = 'dat-atm-strk';
  // ... etc
});
```

### URL Construction

```javascript
// Base URL pattern
const baseUrl = '/sec/mstr/8k';
const fileName = '8k-2026-01-26.html';

// Full citation URLs
const btcUrl = `${baseUrl}/${fileName}#dat-btc-holdings`;
const mstrAtmUrl = `${baseUrl}/${fileName}#dat-atm-mstr`;
const strkAtmUrl = `${baseUrl}/${fileName}#dat-atm-strk`;
```

---

## Current File Status

### `8k-2026-01-26.html` Anchors

| Anchor | Status | Line |
|--------|--------|------|
| `dat-atm-sales` | ✅ Added | ~131 |
| `dat-atm-strf` | ✅ Added | ATM table |
| `dat-atm-strc` | ✅ Added | ATM table |
| `dat-atm-strk` | ✅ Added | ATM table |
| `dat-atm-strd` | ✅ Added | ATM table |
| `dat-atm-mstr` | ✅ Added | ATM table |
| `dat-btc-holdings` | ✅ Added | ~329 |

---

## Notes

- **XBRL IDs exist** (`F_...`) but only for metadata, not financial data tables
- **Row anchors are optional** — `dat-atm-sales` links to whole table; row anchors allow citing specific securities
- **Future work:** Script to batch-annotate historical 8-Ks with appropriate format detection
