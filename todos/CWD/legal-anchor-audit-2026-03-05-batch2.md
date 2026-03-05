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

## Sequential Verification Gate

### GATE 2.1: LUXFF
1. Codebase State (The Lock)
- Holdings: `20,226 LTC` as of `2025-12-09`
- Shares: `31,554,164` as of `2025-12-09`
- Source type in lock/history: `regulatory-filing` (SEDAR+ labels in `holdings-history.ts`)

2. Institutional Evidence (The Key)
- Filing channel anchor: SEDAR+ issuer profile `000044736`
- Source URL used in lock: `https://www.sedarplus.ca/csa-party/records/record.html?id=000044736`
- D1 latest confirms same values:
  - `holdings_native=20226` (`as_of=2025-12-09`)
  - `basic_shares=31554164` (`as_of=2025-12-09`)
- Full historical parity check completed (`7/7` points; zero missing dates; zero value mismatches).

3. Adversarial Shadow Audit
- No numeric divergence between lock and D1 on either latest or historical stack.
- Evidence quality caveat: SEDAR+ public HTML is portal-driven and not always directly quoteable; lock currently depends on filing labels and profile anchor rather than stable per-document deep links.
- Corrected lock citation bug: `companies.ts` had an unrelated SEC URL under `LUXFF.holdingsSourceUrl`; updated to the proper SEDAR+ profile record URL.

4. Verdict
- Institutional truth value: `20,226 LTC` / `31,554,164 shares` (2025-12-09 checkpoint)
- Status: `MATCH`
- Action taken: citation URL corrected in lock (`src/lib/data/companies.ts`).

### GATE 2.2: OBTC3
1. Codebase State (The Lock)
- Before fix: holdings `0` (company-website placeholder), shares `318,000,000` (estimate).
- After fix: holdings `3,723 BTC`, shares `155,300,500` as of `2026-03-01`.

2. Institutional Evidence (The Key)
- Primary legal-channel document: OranjeBTC "Comunicado ao Mercado - Negociação de Ações e Compra de BTC..." (published `2026-03-01`).
- Document URL: `https://api.mziq.com/mzfilemanager/v2/d/1c906e2c-8d06-4a32-a1a8-a240167c77f2/49272f57-866a-97f7-eb9e-22b3bcac1733?origin=2`
- Extracted text checkpoints:
  - `Total BTC em reservas: 3.723,0 BTC`
  - `totalizando 155.300.500 ações ON emitidas fora de tesouraria`
  - Adjusted line: `162.267.260` shares if debentures convert.

3. Adversarial Shadow Audit
- D1 has no OBTC3 rows yet (`holdings_native` and `basic_shares` history endpoints both empty), so this is currently lock-only and not canon-converged in D1.
- Historical stack gap remains: no local `HOLDINGS_HISTORY.OBTC3` timeline to run date-by-date parity.
- Jurisdictional evidence quality: Brazilian issuer disclosures are available through B3/CVM channels but not yet normalized into D1 ingestion.

4. Verdict
- Institutional truth value (current checkpoint): `3,723 BTC` / `155,300,500` shares (`2026-03-01`)
- Status: `UPDATE REQUIRED` (D1 ingest still pending execution)
- Action taken: lock updated in `companies.ts`; added `OBTC3` to `HOLDINGS_HISTORY` for deterministic backfill ingestion.
- Pending execution (local env required):
  - `npx tsx scripts/d1-backfill-holdings-history.ts --dry-run=false --tickers=OBTC3`

### GATE 2.3: ETHM
1. Codebase State (The Lock)
- Holdings: `590,000 ETH` as of `2025-09-30`
- Shares: `60,000,000` as of `2025-09-30`
- Source type: filing-anchored (`regulatory-filing` / SEC foreign issuer channel).

2. Institutional Evidence (The Key)
- Legal filing index anchor: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0002080334`
- D1 latest confirms same values at same as-of:
  - `holdings_native=590000`
  - `basic_shares=60000000`
- Historical parity check completed: `6/6` points matched, zero missing dates, zero value mismatches.

3. Adversarial Shadow Audit
- Citation defect found and corrected: lock previously pointed to a specific Form 425 social-media filing (`f425022626_ether.htm`) that does not itself carry the `590,000 ETH / 60,000,000 shares` checkpoint.
- Corrected lock source URLs to issuer filing index anchor to avoid false precision until per-document metric extraction is wired.
- No lock-vs-D1 numeric drift detected.

4. Verdict
- Institutional truth value: `590,000 ETH` / `60,000,000 shares` (`2025-09-30`)
- Status: `MATCH`
- Action taken: fixed `holdingsSourceUrl` and `sharesSourceUrl` in `companies.ts`.

### GATE 2.4: ZONE
1. Codebase State (The Lock)
- Holdings: `733,060,893 DOGE` as of `2025-12-31`
- Shares: `210,556,229` as of `2026-02-10` (latest cover-page outstanding)
- Cash / Debt: `5,443,655` / `800,000` (USD) as of `2025-12-31`

2. Institutional Evidence (The Key)
- Primary filing anchor: SEC 10-Q Q2 FY2026 (`ea0276195-10q_cleancore.htm`)
- Direct filing text/XBRL checkpoints extracted:
  - `Number of Dogecoin held ... 733,060,893`
  - `As of February 10, 2026, there were 210,556,229 shares ... issued and outstanding`
  - Subsequent-events text confirms no DOGE buys/sells between `2026-01-01` and `2026-02-10`.
- D1 latest matches lock values for holdings, shares, cash, and debt.

3. Adversarial Shadow Audit
- Historical lock-vs-D1 sweep for local timeline is clean (`3/3` points, zero missing, zero mismatches).
- Share-structure complexity exists (Class A/Class B + large warrant-driven dilution), but lock and D1 are both anchored to filing-reported current outstanding and treasury-period DOGE count.
- No regression or citation drift found in current lock entry.

4. Verdict
- Institutional truth value: `733,060,893 DOGE` (2025-12-31 holdings) and `210,556,229 shares` (2026-02-10 outstanding).
- Status: `MATCH`
- Action taken: none required beyond recording this gate.

### GATE 2.5: BTCT.V
1. Codebase State (The Lock)
- Holdings: `761.63 BTC` as of `2026-02-28`
- Shares: `9,893,980` basic as of `2026-02-28` (reported diluted: `11,977,313`)
- Source classification: `company-reported` via legal press-release channel.

2. Institutional Evidence (The Key)
- Primary disclosure URL: `https://btctcorp.com/bitcoin-treasury-corporation-provides-february-update-on-normal-course-issuer-bid/` (published `2026-03-04` for Feb period close).
- Extracted text checkpoints from the disclosure:
  - `As of February 28, 2026 ... 9,893,980 common shares outstanding and 11,977,313 diluted...`
  - `...total Bitcoin holdings have decreased to 761.63 BTC...`
- D1 latest now mirrors these values at `as_of=2026-02-28`.

3. Adversarial Shadow Audit
- Historical lock-vs-D1 parity check is clean (`4/4` points, zero missing, zero mismatches).
- Evidence-quality caveat remains: latest values are from company press release in legal channel, not yet from parsed SEDAR filing text in-repo.
- Metadata drift found and fixed: lock note still claimed a D1 lag mismatch (obsolete after backfill).

4. Verdict
- Institutional truth value: `761.63 BTC` / `9,893,980` basic shares (`2026-02-28`)
- Status: `MATCH` (company-reported legal-channel anchor)
- Action taken: updated lock note in `companies.ts` to reflect convergence.

### GATE 2.6: DCC.AX
1. Codebase State (The Lock)
- Holdings: `503.7 BTC` as of `2025-12-31` (`308.8` direct + `194.85` via BTXX ETF)
- Shares: `1,488,510,854` (basic) as of `2026-01-30`
- Source quality: latest holdings anchored to ASX/Listcorp treasury filing; earlier monthly points mostly dashboard-origin.

2. Institutional Evidence (The Key)
- Lock/D1 latest anchor URL: `https://www.listcorp.com/asx/dcc/digitalx-limited/news/treasury-information-december-2025-3305468.html`
- Local provenance file (`provenance/dcc.ts`) documents the filing quote and breakdown:
  - BTXX units equivalent to `194.85 BTC`
  - Total BTC exposure `503.7 BTC`
- D1 latest mirrors lock values at `2025-12-31`.

3. Adversarial Shadow Audit
- Full historical parity check is clean (`10/10` points, zero missing, zero mismatches for holdings and shares).
- Data-quality caveat remains for earlier history points (`company-dashboard` source_type), but latest checkpoint is filing-anchored.
- No lock-field drift detected in current `companies.ts` entry.

4. Verdict
- Institutional truth value (latest checkpoint): `503.7 BTC` / `1,488,510,854` shares.
- Status: `MATCH`
- Action taken: none required beyond recording this gate.

### GATE 2.7: BTOG
1. Codebase State (The Lock)
- Holdings: `70,543,745 DOGE` as of `2026-01-20`
- Shares: `1,500,000` as of `2026-01-20` (post 1:60 reverse split)
- Cash: `55,639` (USD, as-of `2025-06-30`)

2. Institutional Evidence (The Key)
- SEC filing channel used:
  - Issuer index: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001735556&type=6-K&count=40`
  - Reverse-split filing accession: `0001104659-26-005086` (Exhibit 99.1 confirms 1:60 split and ~1.5M post-split Class A shares).
- D1 latest matches lock for holdings and shares at `2026-01-20`.

3. Adversarial Shadow Audit
- Historical parity check is clean (`3/3` points, zero missing, zero mismatches).
- Citation precision gap identified:
  - The previously linked Exhibit 99.1 directly supports split/share context.
  - It does not contain a direct quote for the `70,543,745 DOGE` holdings figure.
- Mitigation applied: lock `holdingsSourceUrl` changed to the SEC 6-K issuer index (legal-channel anchor) to avoid false exhibit-level precision.

4. Verdict
- Institutional truth value in lock/D1: `70,543,745 DOGE` / `1,500,000` shares (`2026-01-20`)
- Status: `MATCH` with evidence-quality caveat on exhibit-level holdings citation mapping
- Action taken: updated `BTOG` holdings source URL + note in `companies.ts`.

### GATE 2.8: IHLDF
1. Codebase State (The Lock)
- Holdings: `48,000,000 HBAR` as of `2025-12-31`
- Shares: `65,000,000` as of `2025-12-31`
- Source classification: `regulatory-filing` (SEDAR+ channel)

2. Institutional Evidence (The Key)
- Lock anchor URLs are SEDAR+ channel links (`sedarplus.ca`) and profile metadata is present (`sedarProfile: 000044016`).
- D1 latest matches lock values:
  - `holdings_native=48,000,000`
  - `basic_shares=65,000,000`
  - both at `as_of=2025-12-31`

3. Adversarial Shadow Audit
- Historical lock-vs-D1 parity check is clean (`3/3` points, zero missing, zero mismatches).
- Evidence-quality caveat: lock uses SEDAR+ channel anchors (landing/profile-level URLs), not a pinned per-document URL in the codebase for this ticker’s latest checkpoint.
- No numeric drift detected between lock and D1.

4. Verdict
- Institutional truth value: `48,000,000 HBAR` / `65,000,000` shares (`2025-12-31`)
- Status: `MATCH`
- Action taken: none required beyond recording this gate.

### GATE 2.9: TBH
1. Codebase State (The Lock)
- Holdings: `0 DOGE` as of `2025-12-18`
- Shares: `10,800,000` as of `2025-12-18`
- Classification: SEC filing-anchored legal entity state (pre-merger TBH; HOD treasury remains external until close).

2. Institutional Evidence (The Key)
- Primary filing anchor: SEC 8-K index accession `0001213900-25-122463`  
  `https://www.sec.gov/Archives/edgar/data/1903595/000121390025122463/0001213900-25-122463-index.html`
- D1 latest mirrors lock checkpoint:
  - `holdings_native=0` (`as_of=2025-12-18`)
  - `basic_shares=10,800,000` (`as_of=2025-12-18`)

3. Adversarial Shadow Audit
- Historical lock-vs-D1 parity check is clean for local timeline (`3/3` points, zero missing, zero mismatches).
- Backfilled quarter-end share rows (`19,799,090`) also exist in D1 as derived continuity datapoints; they do not invalidate the legal-entity checkpoint used for lock state.
- Lock defect found and fixed: shares source text previously cited `19,799,090` while value was `10,800,000` (date mismatch). Source/as-of were normalized to the Dec 18, 2025 checkpoint.

4. Verdict
- Institutional truth value (legal-entity checkpoint): `0 DOGE` / `10,800,000` shares (`2025-12-18`)
- Status: `MATCH`
- Action taken: updated `sharesSource`, `sharesSourceUrl`, `sharesAsOf`, and note text in `companies.ts` for consistency.

### GATE 2.10: 3825.T
1. Codebase State (The Lock)
- Holdings: `1,411.29831101 BTC` as of `2026-02-02`
- Shares: `149,039,800` as of `2025-12-31`
- Asset model: `MULTI` (BTC + ETH + XRP + SOL + DOGE) with BTC lock metric as primary holdings field.

2. Institutional Evidence (The Key)
- Current holdings anchor (company treasury page):  
  `https://www.remixpoint.co.jp/digital-asset/`
- Shares anchor (TDnet quarterly filing PDF):  
  `https://contents.xj-storage.jp/xcontents/AS08938/cf774da9/7b44/484c/b92b/63cdf6356094/140120260210554449.pdf`
- D1 latest mirrors lock values:
  - `holdings_native=1411.29831101` (`as_of=2026-02-02`)
  - `basic_shares=149,039,800` (`as_of=2026-02-02` backfilled snapshot on same run context)

3. Adversarial Shadow Audit
- Historical lock-vs-D1 parity check is clean (`2/2` points, zero missing, zero mismatches).
- Evidence-quality caveat remains: latest BTC holdings are company-site anchored rather than a pinned filing document containing the same exact unit checkpoint.
- No numeric drift detected; lock and D1 are converged at current checkpoint.

4. Verdict
- Institutional truth value: `1,411.29831101 BTC` / `149,039,800` shares
- Status: `MATCH` with `REGULATORY_GAP` caveat for filing-grade holdings citation precision.
- Action taken: none required for lock values in this gate.
