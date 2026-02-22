# Sources Manifest — Verification Run

- **Ticker:**
- **CIK:**
- **As-of policy:** Use the latest relevant filing(s); every number must carry an explicit as-of date.

## Allowed sources (preferred order)
1) SEC EDGAR filing document **HTML** (the specific filing page that contains the number)
2) SEC EDGAR **XBRL** (companyfacts / iXBRL) when the value is XBRL-only
3) Official company IR PDFs / press releases (only when SEC is not applicable)
4) Third-party sources **only** if explicitly marked (confidence ceiling)

## Citation rules (non-negotiable)
- No generic homepages.
- No EDGAR directory listings as the “source.” Link the exact filing document (`.htm`) containing the value.
- Each claimed number must include:
  - source URL
  - verbatim quote/snippet OR clear table row identification
  - as-of date

## Primary documents to use (fill in)
### SEC filings
- Latest 10-K:
- Latest 10-Q:
- Relevant 8-Ks (financing, holdings changes, major issuance):
- Registration statements / prospectuses (S-1/S-3/424B*), if relevant:

### Non-SEC (only if needed)
- IR / press release:
- Other:

## Retrieval notes
- Prefer filing cover page / financial statements / notes for debt + shares.
- For dilutives: scan exhibits/indentures and Item 3.02 events.
- Track staleness: if holdings are from a press release, record date and reason.
