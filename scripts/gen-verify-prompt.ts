#!/usr/bin/env npx tsx
/**
 * Generate a self-contained verification prompt for any DAT company.
 * Usage: npx tsx scripts/gen-verify-prompt.ts KULR
 * Output: ready-to-paste prompt for ChatGPT — full process embedded, no local file refs.
 */

import { btcCompanies, ethCompanies, solCompanies, otherCompanies } from "../src/lib/data/companies";
import { dilutiveInstruments } from "../src/lib/data/dilutive-instruments";
import { Company } from "../src/lib/types";

const allCompanies: Company[] = [
  ...btcCompanies,
  ...ethCompanies,
  ...(solCompanies ?? []),
  ...(otherCompanies ?? []),
];

const input = process.argv[2];
if (!input) {
  console.error("Usage: npx tsx scripts/gen-verify-prompt.ts <TICKER or NAME>");
  console.error("Available:", allCompanies.map(c => `${c.ticker} (${c.name})`).sort().join(", "));
  process.exit(1);
}

const inputUpper = input.toUpperCase();
let company = allCompanies.find(c => c.ticker.toUpperCase() === inputUpper);
if (!company) {
  const inputLower = input.toLowerCase();
  const nameMatches = allCompanies.filter(c => c.name.toLowerCase().includes(inputLower));
  if (nameMatches.length === 1) {
    company = nameMatches[0];
  } else if (nameMatches.length > 1) {
    console.error(`Multiple matches for "${input}":`);
    nameMatches.forEach(c => console.error(`  ${c.ticker} — ${c.name}`));
    process.exit(1);
  } else {
    console.error(`Company not found: ${input}`);
    console.error("Available:", allCompanies.map(c => `${c.ticker} (${c.name})`).sort().join(", "));
    process.exit(1);
  }
}
const ticker = company.ticker;
const instruments = dilutiveInstruments[ticker] ?? [];

const fmtNum = (n: number | undefined | null) => n != null ? n.toLocaleString("en-US") : "N/A";
const fmtUsd = (n: number | undefined | null) => n != null ? `$${n.toLocaleString("en-US")}` : "N/A";

const isUS = company.filingType !== "FPI";
const hasSEC = !!company.secCik;
const cikPadded = company.secCik ? company.secCik.replace(/^0+/, "").padStart(10, "0") : null;

// Build dilutives
let dilutivesSection = "";
if (instruments.length > 0) {
  dilutivesSection = "\n### dilutive-instruments.ts\n";
  for (const inst of instruments) {
    const strike = inst.strikePrice != null ? `$${inst.strikePrice}` : "N/A";
    const shares = fmtNum(inst.potentialShares);
    const face = inst.faceValue ? fmtUsd(inst.faceValue) : "";
    const exp = inst.expiration ?? "";
    const source = inst.source ? ` (source: ${inst.source})` : "";
    dilutivesSection += `- ${inst.type}: ${shares} shares @ strike ${strike}${face ? `, face ${face}` : ""}${exp ? `, exp ${exp}` : ""}${source}\n`;
  }
} else {
  dilutivesSection = "\n### dilutive-instruments.ts\nNo dilutive instruments on file.\n";
}

let secondarySection = "";
if (company.secondaryCryptoHoldings?.length) {
  secondarySection = "\n### Secondary Crypto Holdings\n";
  for (const h of company.secondaryCryptoHoldings) {
    secondarySection += `- ${fmtNum(h.amount)} ${h.symbol} (${h.source ?? "unknown source"})\n`;
  }
}

const prompt = `# DATCAP Verification: ${company.name} (${ticker})

## Company
${hasSEC ? `- CIK: ${cikPadded}` : "- Non-US company (no SEC CIK)"}
- Asset: ${company.asset}
- Filing type: ${isUS ? "US (10-Q/10-K)" : "FPI"}
${hasSEC ? `- XBRL: https://data.sec.gov/api/xbrl/companyfacts/CIK${cikPadded}.json
- Filings: https://data.sec.gov/submissions/CIK${cikPadded}.json
- User-Agent for SEC requests: DATCAP Research contact@datcap.com` : ""}

## Current Codebase Values

### companies.ts
- holdings: ${fmtNum(company.holdings)} ${company.asset}${company.holdingsLastUpdated ? ` (as of ${company.holdingsLastUpdated})` : ""}
- costBasisAvg: ${company.costBasisAvg ? fmtUsd(company.costBasisAvg) : "N/A"}${company.costBasisAsOf ? ` (as of ${company.costBasisAsOf})` : ""}
- sharesForMnav: ${fmtNum(company.sharesForMnav)}${company.sharesAsOf ? ` (as of ${company.sharesAsOf})` : ""}
- totalDebt: ${fmtUsd(company.totalDebt ?? 0)}${company.debtAsOf ? ` (as of ${company.debtAsOf})` : ""}
- cashReserves: ${fmtUsd(company.cashReserves ?? 0)}${company.cashAsOf ? ` (as of ${company.cashAsOf})` : ""}
- preferredEquity: ${fmtUsd(company.preferredEquity ?? 0)}${company.preferredAsOf ? ` (as of ${company.preferredAsOf})` : ""}
- quarterlyBurnUsd: ${fmtUsd(company.quarterlyBurnUsd ?? 0)}${company.burnAsOf ? ` (as of ${company.burnAsOf})` : ""}
${company.stakingPct ? `- stakingPct: ${(company.stakingPct * 100).toFixed(1)}%` : ""}
${dilutivesSection}${secondarySection}

---

## Verification Process

**Core principle: Reconstruct from primary sources first, THEN compare. Verification without reconstruction is just checking that lies agree with each other.**

### Trust Tags
Every value gets a confidence tag:
- **REG** = regulatory filing (SEC EDGAR, TDnet, AMF, ASX)
- **IR** = official company investor relations
- **3P** = third-party tracker only
- **EST** = estimated/derived
- **UNV** = single source, unverifiable

### Phase 1: Reconstruct
Go to primary sources (${hasSEC ? "SEC EDGAR XBRL API + filing full-text" : "regulatory filings, company IR"}) and independently extract:

1. **Holdings** — total ${company.asset} held, as-of date, breakdown (custody/staked/collateral), cost basis
2. **Shares** — basic shares outstanding${hasSEC ? " from 10-Q cover page (dei:EntityCommonStockSharesOutstanding)" : ""}, as-of date, recent issuances
3. **Financials** — cash, total debt (breakdown by instrument), preferred equity, quarterly burn
4. **Dilutives** — ALL warrants, options, convertibles with: strike price, potential shares, face value, expiration, source

For each value: record the exact source URL, quote from the document, and confidence tag.

Also check for:
- Any filings after the codebase dates with new ${company.asset} purchases/sales
- ATM programs or new shelf registrations
- New warrant/option/convertible issuances
- Share count changes from offerings or buybacks

### Phase 2: Diff
Compare each reconstructed value against codebase. Categorize:
- **MATCH** — values equal
- **STALE** — codebase has older but previously-correct data
- **WRONG** — codebase has incorrect data
- **MISSING** — codebase lacks data you found

### Phase 3: Adversarial Self-Review
Before reporting, challenge your own reconstruction:
- Are any source URLs actually directory listings instead of documents?
- Do any holdings pre-date the company's crypto strategy launch?
- Are share counts from weighted-average (wrong for mNAV) vs actual outstanding?
- Is cost basis total ÷ holdings = average, or is there a math error?
- For convertibles: does faceValue ÷ strikePrice ≈ potentialShares?
- Any numbers that are suspiciously round (likely estimates)?

### Phase 4: Cross-File Consistency
Flag if any of these would break:
- holdings-history.ts latest entry must match companies.ts holdings
- earnings-data.ts quarter-end values must match holdings-history.ts
- dilutive-instruments.ts ticker key must match companies.ts ticker

## Output Format

### Reconstruction Table
For each category:

| Field | Reconstructed | Source URL | Codebase | Match | Tag |
|-------|--------------|-----------|----------|-------|-----|

### Diff Summary
List ONLY fields that need updating:
| Field | Current | Should Be | Source | Category |
|-------|---------|-----------|--------|----------|

### Adversarial Flags
List anything suspicious about your own findings.

### Verdict
- **ALL CLEAR ✅** — no updates needed
- **UPDATES NEEDED** — list specific changes with sources
- **NEEDS DEEPER INVESTIGATION** — for anything you couldn't resolve
`;

process.stdout.write(prompt);
