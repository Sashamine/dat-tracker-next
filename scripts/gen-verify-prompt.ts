#!/usr/bin/env npx tsx
/**
 * Generate a verification prompt for any DAT company.
 * Usage: npx tsx scripts/gen-verify-prompt.ts KULR
 * Output: ready-to-paste prompt for ChatGPT / Claude / etc.
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

// Try exact ticker match first, then fuzzy name match
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

// Format helpers
const fmtNum = (n: number | undefined | null) => n != null ? n.toLocaleString("en-US") : "N/A";
const fmtUsd = (n: number | undefined | null) => n != null ? `$${n.toLocaleString("en-US")}` : "N/A";

// Determine filing type
const filingType = company.filingType === "FPI" ? "FPI (20-F/6-K)" : "US (10-Q/10-K)";
const isUS = company.filingType !== "FPI";

// Build dilutives section
let dilutivesSection = "";
if (instruments.length > 0) {
  dilutivesSection = "\n### dilutive-instruments.ts\n";
  for (const inst of instruments) {
    const type = inst.type;
    const strike = inst.strikePrice != null ? `$${inst.strikePrice}` : "N/A";
    const shares = fmtNum(inst.potentialShares);
    const face = inst.faceValue ? fmtUsd(inst.faceValue) : "";
    const exp = inst.expiration ?? "";
    const notes = inst.notes ? ` — ${inst.notes}` : "";
    const source = inst.source ? ` (source: ${inst.source})` : "";
    dilutivesSection += `- ${type}: ${shares} shares @ strike ${strike}${face ? `, face ${face}` : ""}${exp ? `, exp ${exp}` : ""}${source}${notes}\n`;
  }
} else {
  dilutivesSection = "\n### dilutive-instruments.ts\nNo dilutive instruments on file.\n";
}

// Build secondary holdings section
let secondarySection = "";
if (company.secondaryCryptoHoldings?.length) {
  secondarySection = "\n### Secondary Crypto Holdings\n";
  for (const h of company.secondaryCryptoHoldings) {
    secondarySection += `- ${fmtNum(h.amount)} ${h.symbol} (${h.source ?? "unknown source"})\n`;
  }
}

// Build the prompt
const prompt = `You are a financial data verification agent. Your job: independently reconstruct ${company.name} (${company.ticker})'s financial data from ${company.secCik ? "SEC filings" : "regulatory filings"}, then compare against the codebase values below. Flag any discrepancies.

## Company: ${company.ticker} — ${company.name}
${company.secCik ? `- CIK: ${company.secCik}` : "- No SEC CIK (non-US company)"}
- Asset: ${company.asset}
- Filing type: ${filingType}
${company.secCik ? `- SEC filings: https://data.sec.gov/submissions/CIK${company.secCik.replace(/^0+/, "").padStart(10, "0")}.json` : ""}

## Instructions

${company.secCik ? `Go to SEC EDGAR and find the latest ${isUS ? "10-Q" : "20-F/6-K"} and recent 8-Ks.` : "Find the latest regulatory filings."} For EACH data point below, independently extract the value from the filing and cite the specific source. **Reconstruct FIRST, then compare.**

${company.secCik ? `### XBRL API (no bot blocking):
\`\`\`
https://data.sec.gov/api/xbrl/companyfacts/CIK${company.secCik.replace(/^0+/, "").padStart(10, "0")}.json
\`\`\`

### Filing index:
\`\`\`
https://data.sec.gov/submissions/CIK${company.secCik.replace(/^0+/, "").padStart(10, "0")}.json
\`\`\`
` : ""}
### What to Reconstruct

**1. Holdings:** Total ${company.asset} held, as-of date, breakdown (custody/staked/collateral), cost basis
**2. Shares:** Basic shares from ${isUS ? "10-Q cover page (dei:EntityCommonStockSharesOutstanding)" : "latest filing"}, as-of date, any ATM/offering activity
**3. Financials:** Cash, total debt, preferred equity, quarterly burn (operating expenses)
**4. Dilutives:** All warrants, options, and convertible notes with strike prices and quantities

### Trust Tags
- **REG** = regulatory filing, **IR** = company IR, **3P** = third party, **EST** = estimated, **UNV** = unverifiable

## Current Codebase Values to Compare Against

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
### Also check for:
- Any 8-Ks filed after the dates above with new ${company.asset} purchases or sales
- ATM program details or new shelf registrations
- Any new warrant, option, or convertible issuances
- Share count changes from offerings or buybacks

## Output Format

For each category produce a table:

| Field | Reconstructed Value | Source (URL) | Codebase Value | Match | Tag |
|-------|-------------------|-------------|----------------|-------|-----|

At the end, produce a **DIFF SUMMARY** listing only the fields that need updating, with old → new values.

If everything matches, say "ALL CLEAR ✅ — no updates needed."
`;

process.stdout.write(prompt);
