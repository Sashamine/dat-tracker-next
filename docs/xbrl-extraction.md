# XBRL‑First Extraction (Standard)

This doc defines the **standard** method for extracting verifiable balance‑sheet facts for DAT Tracker at a reasonable cost.

Principle: **prefer SEC APIs (XBRL JSON) + deterministic local artifacts** over ad‑hoc web browsing of filing HTML.

Why:
- More reliable than scraping SEC HTML (which can 403 automated tools).
- Cheaper than having models search/scroll filings.
- Reproducible: the same inputs produce the same outputs.

---

## Required SEC endpoints

### 1) Company submissions (filing index)
- Endpoint: `https://data.sec.gov/submissions/CIK##########.json`
- Purpose: latest filings + accession numbers + doc names.

### 2) Company facts (XBRL facts)
- Endpoint: `https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json`
- Purpose: machine‑readable facts (dei + us‑gaap + ifrs‑full) across periods.

### 3) Filing document (HTML) — fallback only
- Endpoint pattern (archive): `https://www.sec.gov/Archives/edgar/data/<cikNoLeadingZeros>/<accessionNoNoDashes>/<doc>.htm`
- Purpose: facts not in XBRL, narrative disclosures, exhibits.

---

## SEC request headers

SEC requires a real User‑Agent:

- `User-Agent: DAT Tracker (contact@datcap.com)`

Also recommended:
- `Accept-Encoding: gzip, deflate, br`
- Rate limiting: be polite (sleep between requests, cache responses).

---

## Standard extraction workflow (per company)

1) **Normalize CIK**
- Convert to 10‑digit zero‑padded CIK for API URLs.

2) **Fetch submissions.json**
- Identify the latest relevant 10‑Q/10‑K/8‑K.
- Record accession numbers.

3) **Fetch companyfacts.json**
- Extract required facts:
  - shares outstanding (DEI)
  - cash / cash equivalents (us‑gaap)
  - debt (us‑gaap) where available
  - preferred equity where available

4) **Pick an “as‑of” policy**
- Use the most recent period end for balance sheet items (10‑Q/10‑K).
- For shares outstanding, prefer DEI `EntityCommonStockSharesOutstanding` as‑of the filing’s “DocumentPeriodEndDate” (or the DEI’s own date).

5) **Write deterministic artifacts**
- Save the raw JSON and an extracted summary into `verification-runs/<ticker>/<date>/`.

6) **Model layer uses local artifacts**
- Reconstruction agents should read the extracted summary + raw JSON, not re-fetch the web.

---

## Fact mapping (starting point)

These are common, but not universal. Always confirm in `companyfacts`.

### Shares outstanding
- DEI: `EntityCommonStockSharesOutstanding`

### Cash and cash equivalents
- US GAAP (examples):
  - `CashAndCashEquivalentsAtCarryingValue`

### Debt
- US GAAP (examples):
  - `DebtCurrent`
  - `LongTermDebt`
  - `LongTermDebtCurrent`
  - `Debt`

### Preferred equity
- Varies; often a balance sheet line item.

---

## Output contract (what scripts must produce)

For a given ticker, write:
- `verification-runs/<ticker>/<date>/sec/submissions.json`
- `verification-runs/<ticker>/<date>/sec/companyfacts.json`
- `verification-runs/<ticker>/<date>/xbrl-summary.json`

`xbrl-summary.json` should contain:
- ticker, cik
- picked as-of period end date(s)
- values + units + the specific fact name used
- provenance: which endpoint + JSON path

---

## Notes
- XBRL doesn’t cover everything (especially bespoke “holdings” numbers). Use filing HTML only as a fallback.
- If a value is XBRL‑only (not visible in filing full text), treat companyfacts as the primary source.
