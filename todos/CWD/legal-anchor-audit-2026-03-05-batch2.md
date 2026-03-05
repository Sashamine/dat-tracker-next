# Legal Anchor Audit (Batch: 3350.T, DDC, 3825.T, SRAG.DU, FWDI, STKE, BTOG, TBH, BTCT.V)

Date: 2026-03-05

Policy used:
- `LEGAL` = regulator filing or regulator-disseminated disclosure (including filing-hosted press-release exhibits).
- `COMPANY_ONLY` = website/dashboard/IR pages not clearly tied to filing record.

## Summary

1. `MATCH + LEGAL`: `BTOG`, `TBH`
2. `MATCH + COMPANY_ONLY`: `SRAG.DU`, `STKE`
3. `PARTIAL / MISMATCH`: `3350.T`, `DDC`, `FWDI`, `3825.T`, `BTCT.V`

## Per-Ticker Classification

1. `3350.T` (Metaplanet)
- Lock holdings: `35,102` (`regulatory-filing`, TDnet disclosures)
- D1 latest holdings: `35,102` (`flags_json.source_type=regulatory-filing`)
- Lock shares: `1,166,803,340` (TDnet Jan29 + Feb13 allotment)
- D1 latest basic_shares: `1,142,274,340`
- Classification: `LEGAL (holdings) + PARTIAL_MISMATCH (shares lag)`
- Note: holdings match and are filing-anchored in both lock and D1; shares differ because lock includes later Feb 13 allotment not yet reflected in D1 latest.

2. `DDC`
- Lock holdings: `2,183` (`sec-filing`, 6-K Ex99.1 on 2026-03-04)
- D1 latest holdings: `1,988` (`company-website`)
- Lock shares: `30,473,005` (SEC 6-K + class B inclusion)
- D1 latest basic_shares: `28,723,005`
- Classification: `LEGAL for holdings + MISMATCH (D1 lag + shares basis)`
- Note: holdings anchor upgraded to SEC 6-K Ex99.1 (2,118 BTC as of 2026-02-28; 2,183 BTC after additional purchase). D1 remains on pre-filing website-derived snapshot. Shares mismatch remains class A (`basic_shares`) vs lock's economic total including class B.

3. `3825.T` (Remixpoint)
- Lock holdings: `1,411.29831101` (`company-website`)
- D1 latest holdings: no `holdings_native` row in latest snapshot response
- Lock shares: `149,039,800` (TDnet FY2026 Q3 legal filing)
- D1 latest basic_shares: `149,039,800` (`company-website`)
- Classification: `REGULATORY GAP (holdings); LEGAL anchor for shares`
- Note: holdings currently anchored to company digital-asset page (BTC保有数 `1,411.29831101`); latest D1 response lacks holdings row. FY2026 Q3 filing confirms shares and aggregate crypto acquisition amounts but not a clean latest native BTC units figure.

4. `SRAG.DU`
- Lock holdings: `2,051` (company presentation-derived)
- D1 latest holdings: `2,051` (`company-website`)
- Lock shares: `91,686,961` (issued minus treasury-share adjustment)
- D1 latest basic_shares: `92,190,761`
- Classification: `COMPANY_ONLY + METHOD MISMATCH`
- Note: holdings are estimate-tier; latest filing-grade native BTC checkpoint remains FY2024 Note 10 (`540 BTC` as of 2024-12-31). Shares differ due lock net-of-treasury adjustment vs D1 basic issued count.

5. `FWDI`
- Lock holdings: `6,979,967` (`company-website`)
- D1 latest holdings: `6,979,967` (`company-website`)
- Lock shares: `96,003,639` (common + PFWs)
- D1 latest basic_shares: `83,139,037`
- Classification: `PARTIAL (company-only holdings) + METHOD MISMATCH (shares basis)`
- Note: SEC 10-Q (0001683168-26-000960, period 2025-12-31) provides legal raw SOL checkpoint at `4,973,000` (`CryptoAssetNumberOfUnits` for Solana member). Latest lock/D1 value (`6,979,967`) is a newer company-reported SOL-equivalent point (raw + LSTs) from 2026-01-15; keep as `COMPANY_ONLY` until the equivalent figure is filing-anchored. Shares mismatch is expected because lock uses common+PFWs while D1 `basic_shares` is common-only.

6. `STKE`
- Lock holdings: `518,139` (`company-website`)
- D1 latest holdings: `530,251` (`company-website`, as_of `2026-02-03`)
- Lock shares: `25,300,567`
- D1 latest basic_shares: `25,300,567`
- Classification: `COMPANY_ONLY with D1 lag`
- Note: lock moved to Feb 2026 monthly update (published 2026-03-04). Filing-linked checkpoint remains ~529,000 SOL-equivalent at 2025-12-31 (Q1 results release). Latest point is still company-update tier, so legal-anchor quality remains below `sec-filing`/`regulatory-filing`.

7. `BTOG`
- Lock holdings: `70,543,745` (`sec-filing`)
- D1 latest holdings: `70,543,745` (`sec-filing`)
- Lock shares: `1,500,000`
- D1 latest basic_shares: `1,500,000` (`sec-filing`)
- Classification: `MATCH + LEGAL`
- Note: no mismatch observed.

8. `TBH`
- Lock holdings: `0` (`sec-filing`)
- D1 latest holdings: `0` (`sec-filing`)
- Lock shares: `10,800,000`
- D1 latest basic_shares: `10,800,000` (`sec-filing`)
- Classification: `MATCH + LEGAL`
- Note: no mismatch observed.

9. `BTCT.V`
- Lock holdings: `761.63` (company legal-release channel, non-XBRL)
- D1 latest holdings: `769` (`company-website`, as_of `2026-02-17`)
- Lock shares: `9,893,980`
- D1 latest basic_shares: `10,027,880`
- Classification: `MISMATCH (D1 lag) + COMPANY-REPORTED LEGAL CHANNEL`
- Note: lock updated to Feb 28 release; D1 remains on Feb 17 backfill snapshot. Requires D1 ingest/backfill update for convergence. Metadata caveat: current D1 row has `flags_json.source_type=company-website` while artifact source_type resolves as `regulatory-filing`; keep lock classification on company-reported legal-release channel until SEDAR-text parsing is wired.

## Required Follow-Ups

1. Backfill D1 for `BTCT.V` to Feb 28, 2026 snapshot so lock and D1 converge.
2. Decide canonical shares basis in lock vs D1 (`basic_shares` vs economic-diluted) for `DDC`, `SRAG.DU`, `FWDI`, `3350.T`.
3. Add explicit data-quality note tags in `companies.ts` for all `COMPANY_ONLY` holdings anchors (`DDC`, `3825.T`, `SRAG.DU`, `FWDI`, `STKE`).
4. For `3825.T`, ingest a filing-grade holdings anchor or keep as `regulatory-gap` until available.

## Historical Sweep Backfill (2026-03-05, post-gate)

Method:
- Compared every date in `HOLDINGS_HISTORY[ticker]` against D1 `/api/d1/history` for both `holdings_native` and `basic_shares`.
- Checked for date-missing gaps and value mismatches.

Results (after D1 backfill run `cfb0eef5-20ff-446f-82a1-2545299c2d39`):
- `3350.T`: points=53, missing holdings dates=0, missing shares dates=0, value mismatches=0
- `DDC`: points=8, missing holdings dates=0, missing shares dates=0, value mismatches=0
- `BTCT.V`: points=4, missing holdings dates=0, missing shares dates=0, value mismatches=0
- `DCC.AX`: points=10, missing holdings dates=0, missing shares dates=0, value mismatches=0
- `BTOG`: points=3, missing holdings dates=0, missing shares dates=0, value mismatches=0
- `IHLDF`: points=3, missing holdings dates=0, missing shares dates=0, value mismatches=0
- `FWDI`: points=4, missing holdings dates=0, missing shares dates=0, value mismatches=0
- `STKE`: points=9, missing holdings dates=0, missing shares dates=0, value mismatches=0
- `TBH`: points=3, missing holdings dates=0, missing shares dates=0, value mismatches=0
- `ZONE`: points=3, missing holdings dates=0, missing shares dates=0, value mismatches=0
- `ETHM`: points=6, missing holdings dates=0, missing shares dates=0, value mismatches=0
- `3825.T`: points=2, missing holdings dates=0, missing shares dates=0, value mismatches=0
- `OBTC3`: no local `HOLDINGS_HISTORY` stack to compare in this sweep.

Conclusion:
- No lock-vs-D1 numeric drift on overlapping dates.
- Ingestion coverage gaps closed for `3350.T`, `DDC`, `BTCT.V`, and `STKE`.
- Current sweep status across audited set: zero missing dates and zero value mismatches.
