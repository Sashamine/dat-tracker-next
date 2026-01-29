# SEC Companies - Local Data Status

Last updated: 2026-01-29

## Summary
- **Total SEC-filing companies:** 42
- **With local SEC history:** 3
- **Missing local SEC history:** 39

## Companies with SEC CIKs

| # | Ticker | CIK | Asset | Local History | Status |
|---|--------|-----|-------|---------------|--------|
| 1 | MSTR | 1050446 | BTC | ✅ mstr-sec-history.ts | Complete |
| 2 | MARA | 1507605 | BTC | ✅ mara-sec-history.ts | Complete |
| 3 | BMNR | 1829311 | ETH | ✅ bmnr-sec-history.ts | Complete |
| 4 | RIOT | 1167419 | BTC | ❌ | Needs setup |
| 5 | CLSK | 827876 | BTC | ❌ | Needs setup |
| 6 | CORZ | 1839341 | BTC | ❌ | Needs setup |
| 7 | BTDR | 1899123 | BTC | ❌ | Needs setup |
| 8 | KULR | 1662684 | BTC | ❌ | Needs setup |
| 9 | SBET | 1981535 | ETH | ❌ | Needs setup |
| 10 | DFDV | 1805526 | SOL | ❌ | Needs setup |
| 11 | UPXI | 1775194 | SOL | ❌ | Needs setup |
| 12 | LITS | 1262104 | LTC | ❌ | Needs setup |
| 13 | XXI | 2070457 | BTC | ❌ | Needs setup |
| 14 | DJT | 1849635 | BTC | ❌ | Needs setup |
| 15 | BTCS | 1436229 | ETH | ❌ | Needs setup |
| 16 | BTBT | 1710350 | ETH | ❌ | Needs setup |
| 17 | GAME | 1714562 | ETH | ❌ | Needs setup |
| 18 | ETHM | 2080334 | ETH | ❌ | Needs setup |
| 19 | HYPD | 1682639 | HYPE | ❌ | Needs setup |
| 20 | PURR | 2078856 | HYPE | ❌ | Needs setup |
| 21 | NA | 1872302 | BNB | ❌ | Needs setup |
| 22 | CEPO | 2027708 | BTC | ❌ | Needs setup |
| 23 | NXTT | 1784970 | BTC | ❌ | Needs setup |
| 24 | NAKA | 1946573 | BTC | ❌ | Needs setup |
| 25 | ABTC | 2068580 | BTC | ❌ | Needs setup |
| 26 | ASST | 1920406 | BTC | ❌ | Needs setup |
| 27 | FGNX | 1591890 | ETH | ❌ | Needs setup |
| 28 | FWDI | 38264 | SOL | ❌ | Needs setup |
| 29 | HSDT | 1610853 | SOL | ❌ | Needs setup |
| 30 | TAOX | 1571934 | TAO | ❌ | Needs setup |
| 31 | TWAV | 746210 | TAO | ❌ | Needs setup |
| 32 | CWD | 1627282 | LINK | ❌ | Needs setup |
| 33 | BNC | 1482541 | BNB | ❌ | Needs setup |
| 34 | TRON | 1956744 | TRX | ❌ | Needs setup |
| 35 | XRPN | 2044009 | XRP | ❌ | Needs setup |
| 36 | CYPH | 1509745 | ZEC | ❌ | Needs setup |
| 37 | SUIG | 1425355 | SUI | ❌ | Needs setup |
| 38 | ZONE | 1956741 | DOGE | ❌ | Needs setup |
| 39 | TBH | 1903595 | DOGE | ❌ | Needs setup |
| 40 | BTOG | 1735556 | DOGE | ❌ | Needs setup |
| 41 | AVX | 1826397 | AVAX | ❌ | Needs setup |
| 42 | STKE | 1846839 | SOL | ❌ | Needs setup |

## Non-SEC Companies (International)

| Ticker | Exchange | Jurisdiction | Filing Source |
|--------|----------|--------------|---------------|
| 3350.T | TSE | Japan | TDnet/EDINET |
| 0434.HK | HKEX | Hong Kong | HKEX |
| ALTBG | Euronext | France | AMF |
| H100.ST | Nasdaq Nordic | Sweden | FI |
| XTAIF | CSE | Canada | SEDAR+ |
| LUXFF | CSE | Canada | SEDAR+ |
| IHLDF | OTC | US (OTC) | Limited SEC |

## SEC EDGAR URLs

Base URL: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={CIK}&type=8-K`

API URL: `https://data.sec.gov/submissions/CIK{CIK_PADDED}.json`

## Priority for Local History Setup

### Tier 1 - High Volume/Complexity (Done)
- [x] MSTR - Largest BTC treasury, complex capital structure
- [x] MARA - Large miner, frequent purchases
- [x] BMNR - Largest ETH treasury

### Tier 2 - Significant Holdings
- [ ] RIOT - Large BTC miner
- [ ] CLSK - Large BTC miner
- [ ] SBET - Large ETH treasury
- [ ] XXI - Large BTC treasury
- [ ] DJT - High profile

### Tier 3 - Active Treasuries
- [ ] All others with regular 8-K filings

## Notes

- Local history files store parsed 8-K data (holdings, shares, debt)
- Extraction from 8-K text requires company-specific patterns
- 10-Q/10-K have XBRL for structured data
- Some companies only disclose in press releases, not 8-Ks
