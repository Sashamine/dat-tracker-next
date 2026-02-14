# Citation Verification Report
Generated: 2026-02-14

## Summary

| Company | ✅ Pass | ❌ Fail | ⚠️ Warn | ⏭️ Skip | Status |
|---------|--------|--------|---------|---------|--------|
| ABTC | 1 | 0 | 4 | 0 | ⚠️ |
| BTBT | 19 | 1 | 2 | 0 | ❌ |
| NAKA | 4 | 0 | 2 | 0 | ⚠️ |
| HSDT | 2 | 0 | 4 | 0 | ⚠️ |
| DFDV | 3 | 1 | 1 | 0 | ❌ |
| UPXI | 1 | 0 | 5 | 0 | ⚠️ |
| **TOTAL** | **30** | **2** | **18** | **0** | ❌ |

## ABTC

### ⚠️ Warnings

- **sharesOutstanding** (899489426)
  - URL: `https://www.sec.gov/Archives/edgar/data/1755953/000119312525281390/`
  - Search term: "899,489,426 shares"
  - Details: URL accessible but value not found on page. Searched: ✗ "899,489,426 shares", ✗ "899489426", ✗ "899,489,426", ✗ "899.5", ✗ "899,489,426 shares outstanding"

- **totalDebt** (0)
  - URL: `https://www.sec.gov/Archives/edgar/data/1755953/000119312525281390/`
  - Search term: "debt"
  - Details: URL accessible but value not found on page. Searched: ✗ "debt", ✗ "TODO: Verify from Q3 2025 10-Q balance sheet"

- **cashReserves** (0)
  - URL: `https://www.sec.gov/Archives/edgar/data/1755953/000119312525281390/`
  - Search term: "cash"
  - Details: URL accessible but value not found on page. Searched: ✗ "cash", ✗ "TODO: Verify from Q3 2025 10-Q balance sheet"

- **quarterlyBurn** (8052000)
  - URL: `https://www.sec.gov/Archives/edgar/data/1755953/000119312525281390/`
  - Search term: "GeneralAndAdministrativeExpense"
  - Details: URL accessible but value not found on page. Searched: ✗ "GeneralAndAdministrativeExpense", ✗ "8052000", ✗ "8,052,000", ✗ "8.1", ✗ "\$8,052,000 G&A expense for Q3 2025"

### ✅ Passed

- **holdings** (5098) — ✓ "5,098 Bitcoin", ✓ "5,098", ✓ "held approximately 5,098 Bitcoin in its strategic "

## BTBT

### ❌ Failed

- **totalAssets** (1133084610)
  - URL: https://data.sec.gov/api/xbrl/companyfacts/CIK1710350.json
  - Error: HTTP 404
  - HTTP: 404

### ⚠️ Warnings

- **quarterlyBurn** (8500000)
  - URL: `https://www.sec.gov/Archives/edgar/data/1710350/000121390025044155/`
  - Search term: "17,401,915"
  - Details: URL accessible but value not found on page. Searched: ✗ "17,401,915", ✗ "8500000", ✗ "8,500,000", ✗ "8.5", ✗ "NetCashUsedInOperatingActivities \$17,401,915 \(20"

- **preferredEquity** (0)
  - URL: `https://www.sec.gov/Archives/edgar/data/1710350/${Q3_2025_10Q_ACCESSION.replace(/-/g, "")}/ea0263546-10q_bitdigital.htm`
  - Details: SEC 403 — access blocked for automated requests. Manual verification needed.

### ✅ Passed

- **holdings** (155227) — ✓ "155,227", ✓ "155227", ✓ "155,227", ✓ "As of December 31, 2025, the Company held approxim"
- **costBasisAvg** (3045) — ✓ "3,045", ✓ "3,045", ✓ "The Company"
- **sharesOutstanding** (323792059) — ✓ "323,792,059", ✓ "323,792,059", ✓ "Bit Digital shares outstanding were 323,792,059 as"
- **cashReserves** (179100000) — ✓ "179.1 million", ✓ "179.1"
- **totalDebt** (150000000) — ✓ "150 million", ✓ "150000000"
- **stakedAmount** (138263) — ✓ "138,263", ✓ "138,263", ✓ "The Company"
- **stakingPct** (0) — ✓ "89%", ✓ "~89% of its total ETH holdings"
- **annualizedYield** (0) — ✓ "3.5%"
- **stakingRevenue** (2900000) — ✓ "2.9 million", ✓ "2.9"
- **totalDigitalAssets** (423700000) — ✓ "423.7 million", ✓ "423.7"
- **wyfiStake** (427300000) — ✓ "427.3 million", ✓ "427.3"
- **totalRevenue** (30500000) — ✓ "30.5 million", ✓ "30.5"
- **netIncome** (146700000) — ✓ "146.7 million", ✓ "146.7"
- **mining** (7400000) — ✓ "7.4 million", ✓ "7.4"
- **cloudServices** (18000000) — ✓ "18.0 million", ✓ "18.0"
- **colocation** (1700000) — ✓ "1.7 million", ✓ "1.7"
- **staking** (2900000) — ✓ "2.9 million", ✓ "2.9"
- **faceValue** (150000000) — ✓ "150 million", ✓ "150000000"
- **ethPurchased** (31057) — ✓ "31,057", ✓ "31057", ✓ "31,057"

## NAKA

### ⚠️ Warnings

- **holdings** (5398)
  - URL: `https://data.sec.gov/api/xbrl/companyfacts/CIK0001946573.json`
  - Search term: "5,398"
  - Details: Value 5398 not found in XBRL data for fact 'srt:CryptoAssetNumberOfUnits'. Check if the value or fact name has changed.

- **preferredEquity** (0)
  - URL: `https://www.sec.gov/Archives/edgar/data/1946573/000149315225024260/form10-q.htm`
  - Details: URL accessible but value not found on page. Searched: ✗ "No preferred stock outstanding"

### ✅ Passed

- **sharesOutstanding** (439850889) — Found val=439850889 in shares (filed 2025-11-19, period 2025-11-14)
- **cashReserves** (24185083) — Found val=24185083 in USD (filed 2025-11-19, period 2025-09-30)
- **quarterlyBurn** (4982754) — Found val=4982754 in USD (filed 2025-11-19, period 2025-09-30)
- **totalDebt** (210000000) — ✓ "210,000,000 USDT", ✓ "210,000,000"

## HSDT

### ⚠️ Warnings

- **holdings** (LATEST_HOLDINGS)
  - URL: `https://www.sec.gov/Archives/edgar/data/1610853/000110465925103714/hsdt-20251029xex99d1.htm`
  - Search term: "2,300,000 SOL"
  - Details: URL accessible but value not found on page. Searched: ✗ "2,300,000 SOL", ✗ "Approximately 2,300,000 SOL tokens"

- **sharesOutstanding** (75900000)
  - URL: `https://www.sec.gov/Archives/edgar/data/1610853/000110465925113714/`
  - Search term: "75.9 million common shares and pre-funded warrants"
  - Details: URL accessible but value not found on page. Searched: ✗ "75.9 million common shares and pre-funded warrants", ✗ "75900000", ✗ "75,900,000", ✗ "75.9", ✗ "75\.9 million common shares and pre-funded warrant"

- **totalDebt** (0)
  - URL: `https://www.sec.gov/Archives/edgar/data/1610853/000110465925113714/`
  - Search term: "No long-term debt"
  - Details: URL accessible but value not found on page. Searched: ✗ "No long-term debt", ✗ "No LongTermDebt XBRL tag reported"

- **preferredEquity** (0)
  - URL: `https://www.sec.gov/Archives/edgar/data/1610853/000110465925113714/`
  - Details: URL accessible but value not found on page. Searched: ✗ "No preferred stock outstanding"

### ✅ Passed

- **cashReserves** (124051000) — Found val=124051000 in USD (filed 2025-11-18, period 2025-09-30)
- **quarterlyBurn** (4646000) — Found val=4646000 in USD (filed 2025-11-18, period 2025-09-30)

## DFDV

### ❌ Failed

- **quarterlyBurn** (3572000)
  - URL: https://data.sec.gov/api/xbrl/companyfacts/CIK1805526.json
  - Error: HTTP 404
  - HTTP: 404

### ⚠️ Warnings

- **totalDebt** (131444)
  - URL: `https://www.sec.gov/Archives/edgar/data/1805526/${Q3_2025_10Q_ACCESSION.replace(/-/g, "")}/`
  - Search term: "131,444"
  - Details: SEC 403 — access blocked for automated requests. Manual verification needed.

### ✅ Passed

- **holdings** (2221329) — ✓ "2,221,329", ✓ "2,221,329", ✓ "The Company currently holds 2,221,329 SOL and SOL "
- **sharesOutstanding** (29892800) — ✓ "29,892,800", ✓ "29,892,800", ✓ "The Company"
- **cashReserves** (9000000) — ✓ "$9M"

## UPXI

### ⚠️ Warnings

- **sharesOutstanding** (SHARES_FOR_MNAV)
  - URL: `https://www.sec.gov/Archives/edgar/data/1775194/000147793226000736/`
  - Search term: "shares of common stock issued"
  - Details: URL accessible but value not found on page. Searched: ✗ "shares of common stock issued", ✗ "69,760,581 shares of common stock, par value \$0\."

- **totalDebt** (TOTAL_DEBT)
  - URL: `https://www.sec.gov/Archives/edgar/data/1775194/000147793226000736/`
  - Search term: "Convertible Notes"
  - Details: URL accessible but value not found on page. Searched: ✗ "Convertible Notes", ✗ "Convertible notes payable \$144,115,480; Short-ter"

- **cashReserves** (1616765)
  - URL: `https://www.sec.gov/Archives/edgar/data/1775194/000147793226000736/`
  - Search term: "Cash"
  - Details: URL accessible but value not found on page. Searched: ✗ "Cash", ✗ "1616765", ✗ "1,616,765", ✗ "1.6", ✗ "Cash \$1,616,765"

- **quarterlyBurn** (6230944)
  - URL: `https://www.sec.gov/Archives/edgar/data/1775194/000147793226000736/`
  - Search term: "Net cash used in operating activities"
  - Details: URL accessible but value not found on page. Searched: ✗ "Net cash used in operating activities", ✗ "6230944", ✗ "6,230,944", ✗ "6.2", ✗ "Net cash used in operating activities \$\(12,461,8"

- **preferredEquity** (0)
  - URL: `https://www.sec.gov/Archives/edgar/data/1775194/000147793226000736/`
  - Details: URL accessible but value not found on page. Searched: ✗ "Preferred stock, \$0\.00001 par value, 150,000 sha"

### ✅ Passed

- **holdings** (LATEST_HOLDINGS) — ✓ "2,174,583 SOL as of January 5, 2026"
