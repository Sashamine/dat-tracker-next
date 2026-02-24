# XBRL / iXBRL Tag Map (Phase 1)

This doc is a practical reference for which tags we rely on during Phase 1 reconstruction.

Goal: make Phase 1 cheaper and more deterministic by standardizing what we extract from `companyfacts.json` (and when we must fall back to filing HTML).

## R2 — Shares

- **Shares outstanding (DEI)**
  - Tag: `dei:EntityCommonStockSharesOutstanding`
  - Source: `companyfacts.json` (preferred)
  - Notes:
    - Use the most recent filed value for the target as-of date; cite accession and `end` date.

## R3 — Financials

Common balance sheet tags (not exhaustive):

- **Cash and cash equivalents**
  - Tag: `us-gaap:CashAndCashEquivalentsAtCarryingValue`

- **Long-term debt current / noncurrent**
  - Tag: `us-gaap:LongTermDebtCurrent`
  - Tag: `us-gaap:LongTermDebtNoncurrent` (if present)

- **Convertible notes payable**
  - Tag: `us-gaap:ConvertibleNotesPayable`

## R4 — Dilutives

XBRL often provides *aggregates* but not full legal terms.

- **Warrants / options counts**
  - May appear as custom rollforward tags in iXBRL; series breakdown may require footnote tables.

- **Convertible debt legal terms**
  - Usually requires filing HTML (footnotes/exhibits): indenture date, maturity, conversion rate, OID, puts, call/forced conversion triggers.

## When to use filing HTML vs companyfacts

Use filing HTML when:
- you need instrument-level *terms* (conversion rate, forced conversion trigger, collateral mechanics)
- you need rollforward tables that are not reliably represented in companyfacts

Use companyfacts when:
- you need numeric facts (shares outstanding, cash, standard debt tags)

