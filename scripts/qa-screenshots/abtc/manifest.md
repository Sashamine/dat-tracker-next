# ABTC Citation Screenshots - Documenter Report

**Date:** 2025-02-14
**Status:** Partial (dev server went down during capture)

## Screenshots Captured

| # | Metric | Search Term | Destination URL | Screenshot File |
|---|--------|-------------|-----------------|-----------------|
| 1 | mNAV (2.83x) | 5,098 Bitcoin | https://www.prnewswire.com/news-releases/american-bitcoin-enters-top-20-publicly-traded-bitcoin-treasury-companies-by-holdings-302643079.html | 01-mnav-2.83x.png |
| 2 | Holdings Source | 5,098 Bitcoin | (same as above - PR Newswire) | 02-holdings-5098btc-source.png |
| 3 | Equity NAV/Share | (calculated - has 2 inputs: holdings + shares) | N/A | 03-equity-nav-share.png |
| 4 | Shares (SEC 10-Q Full Page) | 899,489,426 | https://www.sec.gov/Archives/edgar/data/1755953/000119312525281390/abtc-20250930.htm | 04-shares-10q-fullpage.png |
| 5 | Shares (SEC 10-Q Scrolled) | 899,489,426 | (same SEC filing) | 05-shares-899m-diluted.png |

## Observations

### mNAV (01-mnav-2.83x.png)
- Data Source: **Calculated**
- Calculation: Enterprise Value ÷ Crypto NAV
- Input: holdings = 5,098 from Press Release
- Link: PR Newswire article dated Dec 16, 2025

### Holdings Source (02-holdings-5098btc-source.png)
- Full page screenshot of PR Newswire article
- Text found: "held approximately 5,098 Bitcoin in its strategic reserve as of December 14, 2025"
- Includes graphic showing 5,098 BTC

### Equity NAV/Share (03-equity-nav-share.png)
- Data Source: **Calculated**
- Calculation: Equity NAV ÷ Shares Outstanding
- Two inputs shown:
  - holdings: 5,098 (Press Release) - same source as mNAV
  - shares: 899,489,426 (SEC 10-Q)
- Shares link: SEC 10-Q filing

### SEC 10-Q Shares (04, 05)
- Filing: ABTC Q3 2025 10-Q
- Number 899,489,426 found in document
- Context: "Diluted" weighted average shares (EPS calculation row)
- Note: Cover page shows different numbers (195,380,091 Class A + 732,224,903 Class B = 927M as of Nov 13, 2025)

## Not Captured (dev server down)

- BTC Holdings ⓘ button popover
- Operating Burn ($8.1M) ⓘ button popover  
- Crypto NAV ⓘ button popover
- Shares Outstanding ⓘ button popover

## File Locations

All screenshots saved to: `C:\Users\edwin\dat-tracker-next\scripts\qa-screenshots\abtc\`
