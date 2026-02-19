#!/usr/bin/env npx tsx
/**
 * Generate a full verification prompt for any DAT company.
 * Usage: npx tsx scripts/gen-verify-prompt.ts KULR
 * Output: ready-to-paste prompt that runs the FULL verification pipeline.
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
const isUS = company.filingType !== "FPI";
const hasSEC = !!company.secCik;
const cikPadded = company.secCik ? company.secCik.replace(/^0+/, "").padStart(10, "0") : null;

// Build dilutives section
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

// Build secondary holdings section
let secondarySection = "";
if (company.secondaryCryptoHoldings?.length) {
  secondarySection = "\n### Secondary Crypto Holdings\n";
  for (const h of company.secondaryCryptoHoldings) {
    secondarySection += `- ${fmtNum(h.amount)} ${h.symbol} (${h.source ?? "unknown source"})\n`;
  }
}

// The prompt
const prompt = `You are running the DATCAP verification pipeline for **${company.name} (${ticker})**.

## Process

Read and follow the verification specs in \`/Users/dwinny/clawd/specs/\`:
- **\`verification-principles.md\`** — core philosophy, trust hierarchy, anti-patterns
- **\`phases/phase-1-reconstruct.md\`** — Phase 1: reconstruction from primary sources (R1-R4 agents)
- **\`phases/phase-1-adv-*.md\`** — Phase 1-ADV: adversarial review (A1-A4 agents)
- **\`phases/phase-2-diff.md\`** — Phase 2: diff reconstruction vs codebase
- **\`phases/phase-3-patch.md\`** — Phase 3: generate patches
- **\`phases/phase-3-verify.md\`** — Phase 3-V: verify patches
- **\`phases/phase-4-crossfile.md\`** — Phase 4: cross-file consistency
- **\`phases/phase-5-merge.md\`** — Phase 5: merge (branch, commit, PR)
- **\`phases/phase-6-ui-citations.md\`** — Phase 6: UI + citation verification
- **\`phases/phase-7-mnav-sanity.md\`** — Phase 7: mNAV sanity check

**Read \`verification-principles.md\` first.** Then execute each phase in order.

## Company Details

- **Company:** ${company.name}
- **Ticker:** ${ticker}
${hasSEC ? `- **CIK:** ${cikPadded}` : "- **No SEC CIK** (non-US company)"}
- **Asset:** ${company.asset}
- **Filing type:** ${isUS ? "US (10-Q/10-K)" : "FPI (20-F/6-K)"}
${hasSEC ? `
### SEC Access
- XBRL: \`https://data.sec.gov/api/xbrl/companyfacts/CIK${cikPadded}.json\`
- Filings: \`https://data.sec.gov/submissions/CIK${cikPadded}.json\`
- User-Agent: \`DATCAP Research contact@datcap.com\`
` : ""}
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

## Codebase Location

All data files are in: \`/Users/dwinny/dat-tracker-next/src/lib/data/\`
- \`companies.ts\` — main company data
- \`dilutive-instruments.ts\` — warrants, converts, options
- \`holdings-history.ts\` — historical holdings + share counts
- \`earnings-data.ts\` — quarterly HPS data
- \`provenance/${ticker.toLowerCase()}.ts\` — source citations (if exists)

## Output Directory

Write all phase outputs to: \`/Users/dwinny/clawd/verification-runs/${ticker.toLowerCase()}/${new Date().toISOString().slice(0, 10)}/\`

## Key Rules
- **Reconstruct first, then compare.** Don't trust existing values.
- **Every number needs a source URL and confidence tag** (REG/IR/3P/EST/UNV).
- **No proceeding until each phase is clean.** Loop adversarial/verification until pass.
- **Cross-file consistency is mandatory.** companies.ts ↔ holdings-history ↔ earnings-data ↔ dilutives must all agree.
- Run \`npm run build\` after patches to verify no TypeScript errors.
- Run \`npx tsx scripts/verify-citations.ts\` to verify all searchTerms hit EDGAR.
`;

process.stdout.write(prompt);
