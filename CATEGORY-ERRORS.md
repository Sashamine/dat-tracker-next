# Source URL Category Errors

**Audit Date:** 2026-02-07
**Total Issues:** 80

## Summary

| Error Type | Count | Description |
|------------|-------|-------------|
| Search page links | 31 | Points to `browse-edgar?action=getcompany` (company search, not a document) |
| Filename in URL | 49 | URL ends with filename like `form10-q.htm` instead of accession only |

## Type 1: Search Page Links (31)

These URLs point to SEC search pages, not actual filings:

| Ticker | Field |
|--------|-------|
| BMNR | capitalRaisedAtmSourceUrl |
| SBET | capitalRaisedAtmSourceUrl |
| ETHM | burnSourceUrl, sharesSourceUrl |
| BTBT | capitalRaisedAtmSourceUrl |
| BTCS | capitalRaisedAtmSourceUrl |
| GAME | holdingsSourceUrl, capitalRaisedAtmSourceUrl |
| MSTR | debtSourceUrl, capitalRaisedAtmSourceUrl |
| CEPO | holdingsSourceUrl |
| MARA | holdingsSourceUrl, burnSourceUrl, cashSourceUrl, debtSourceUrl |
| CLSK | holdingsSourceUrl, burnSourceUrl |
| SQNS | burnSourceUrl |
| DDC | burnSourceUrl, sharesSourceUrl |
| FUFU | burnSourceUrl |
| ZOOZ | burnSourceUrl |
| NAKA | cashSourceUrl |
| DJT | holdingsSourceUrl |
| ABTC | burnSourceUrl |
| DFDV | holdingsSourceUrl, capitalRaisedAtmSourceUrl |
| UPXI | capitalRaisedAtmSourceUrl |
| STKE | capitalRaisedAtmSourceUrl |
| HYPD | holdingsSourceUrl |
| TWAV | capitalRaisedAtmSourceUrl |
| TRON | holdingsSourceUrl |
| XRPN | burnSourceUrl |
| SUIG | capitalRaisedAtmSourceUrl |
| TBH | holdingsSourceUrl |
| BTOG | capitalRaisedAtmSourceUrl |
| AVX | capitalRaisedAtmSourceUrl |

## Type 2: Filename in URL (49)

These URLs include a specific filename, which won't resolve correctly when converted to local paths. Should be just the accession folder.

| Ticker | Field | Bad Suffix |
|--------|-------|------------|
| BMNR | holdingsSourceUrl | ex99-1.htm |
| BMNR | costBasisSourceUrl | form10-q.htm |
| BMNR | stakingSourceUrl | ex99-1.htm |
| SBET | holdingsSourceUrl | ex99-1.htm |
| SBET | stakingSourceUrl | form8-k.htm |
| BTBT | stakingSourceUrl | ea0263546-10q_bitdigital.htm |
| BTCS | stakingSourceUrl | form10-q.htm |
| FGNX | holdingsSourceUrl | ex99-1.htm |
| FGNX | burnSourceUrl | form10-q.htm |
| FGNX | sharesSourceUrl | ex99-1.htm |
| FGNX | cashSourceUrl | form10-q.htm |
| FGNX | debtSourceUrl | ex99-1.htm |
| MSTR | holdingsSourceUrl | mstr-20260131.htm |
| MSTR | costBasisSourceUrl | mstr-20260131.htm |
| XXI | holdingsSourceUrl | 0001213900-25-121293-index.htm |
| XXI | costBasisSourceUrl | ea0270549-s1_twenty.htm |
| XXI | sharesSourceUrl | 0001213900-25-121293-index.htm |
| XXI | debtSourceUrl | ea0270549-s1_twenty.htm |
| XXI | cashObligationsSourceUrl | ea0270549-s1_twenty.htm |
| KULR | holdingsSourceUrl | tmb-20250930x10q.htm |
| KULR | costBasisSourceUrl | tmb-20250930x10q.htm |
| NAKA | holdingsSourceUrl | ex99-1.htm |
| NAKA | costBasisSourceUrl | ex99-1.htm |
| FWDI | stakingSourceUrl | forward_i10k-093025.htm |
| HSDT | holdingsSourceUrl | hsdt-20251029xex99d1.htm |
| HSDT | stakingSourceUrl | hsdt-20250930x10q.htm |
| DFDV | stakingSourceUrl | dfdv-20250930.htm |
| UPXI | stakingSourceUrl | upxi_8k.htm |
| NA | holdingsSourceUrl | ea027141101ex99-1_nano.htm |
| NA | burnSourceUrl | ea025544701ex99-2_nano.htm |
| NA | debtSourceUrl | ea0235323-20f_nanolabs.htm |
| NA | sharesSourceUrl | ea0204760-11.htm |
| TAOX | stakingSourceUrl | taox-20250930x10q.htm |
| TWAV | stakingSourceUrl | oblg20250930_10q.htm |
| CWD | stakingSourceUrl | cwd-20251211.htm |
| TRON | stakingSourceUrl | form10-q.htm |
| TRON | sharesSourceUrl | 0001493152-25-029225-index.html |
| CYPH | costBasisSourceUrl | tm2534480d2_8k.htm |
| SUIG | holdingsSourceUrl | suig_8k.htm |
| SUIG | stakingSourceUrl | mcvt_10q.htm |
| SUIG | sharesSourceUrl | suig_8k.htm |
| AVX | sharesSourceUrl | form10-q.htm |

## Type 3: Generic Landing Pages

| Ticker | Field | URL |
|--------|-------|-----|
| ETHM | holdingsSourceUrl | https://www.sedarplus.ca/landingpage/ |

---

## Fix Plan

1. **Search page links:** Find the actual accession number for the specific filing cited
2. **Filename URLs:** Strip the filename, keep only accession folder path
3. **Landing pages:** Find specific filing URL on SEDAR+

Then convert all to local paths: `/sec/[ticker]/[accession].html`
