# Ops Status (live)

> Single source of truth for live ops runs + invariants.
> Keep this short and append-only for major ops.

## Invariants (must hold)
- `artifacts.unknown = 0`
- `artifacts.duplicates = []` for unique key `(r2_bucket, r2_key)`

---

## 2026-02-28 — Phase 10b: full R2 → D1 artifacts backfill (dat-tracker-filings)

### Prefix discovery (top-level)
Run: https://github.com/Sashamine/dat-tracker-next/actions/runs/22530779754

Prefixes:
- abtc/
- batch1/
- batch2/
- batch3/
- batch4/
- batch5/
- batch6/
- bmnr/
- btbt/
- btcs/
- clsk/
- dfdv/
- fgnx/
- fld/
- fufu/
- game/
- hkex/
- hsdt/
- kulr/
- lits/
- mara/
- mstr/
- naka/
- new-uploads/
- nxtt/
- riot/
- tron/
- upxi/
- xxi/

### Full bucket dry-run (cap 2000)
Run: https://github.com/Sashamine/dat-tracker-next/actions/runs/22530831208

Result summary:
- scanned: 1001
- skipped: 1001
- insertedNew: 0
- upgradedExisting: 0
- unknownSourceType: 0
- errors: 0

### Full bucket live run (unlimited)
Run: https://github.com/Sashamine/dat-tracker-next/actions/runs/22530938511

Result summary:
- scanned: 1001
- insertedNew: 1001
- upgradedExisting: 0
- noops: 0
- skipped: 0
- unknownSourceType: 0
- errors: 0
- resume: { bucket: "dat-tracker-filings", prefix: "", cursor: null, start_after: null }

### Post-run sanity check
Run: https://github.com/Sashamine/dat-tracker-next/actions/runs/22531146011

Artifacts summary:
- total: 1011
- unknown: 0
- duplicates: []
- byType:
  - sec_filing: 869
  - sec_filing_unmapped: 67
  - manual: 37
  - sec_companyfacts_xbrl: 35
  - hkex_pdf: 2
  - tdnet_pdf: 1

---

## 2026-02-28 — Phase 10B: R2 Legacy Content Parsing (Extraction)

### Latest Run: bmnr/ Prefix (Write Mode)
- **Workflow:** `r2-inventory-artifacts.yml`
- **GitHub Actions Run URL:** https://github.com/Sashamine/dat-tracker-next/actions/runs/22530918952
- **R2 Bucket:** `dat-tracker-filings`
- **R2 Prefix:** `bmnr/`
- **Dry Run:** `false`
- **Max Objects:** `2000`
- **Debug Pagination:** `true`

#### Summary Metrics:
- `scanned`: 40
- `inserted`: 40
- `insertedNew`: 40
- `upgradedExisting`: 0
- `noops`: 0
- `skipped`: 0
- `unknownSourceType`: 0
- `errors`: 0
- `sourceTypeCounts.sec_filing`: 40

#### Resume Information:
- `nextCursor`: null
- `nextStartAfter`: null
- **Status:** Completed for `bmnr/` prefix. No further pagination required for this prefix.