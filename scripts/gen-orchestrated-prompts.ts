#!/usr/bin/env npx tsx
/**
 * Generate orchestrated prompts.json for a DATCAP verification run.
 *
 * Usage (run inside dat-tracker-next repo):
 *   npx tsx scripts/gen-orchestrated-prompts.ts <TICKER|NAME>
 *
 * Output:
 *   ../clawd/verification-runs/<ticker>/<YYYY-MM-DD>/prompts.json
 *
 * Notes:
 * - This is intended to be called from the dat-tracker-next repo so it can import its data.
 * - Prompts are pre-filled and ready to pass to sessions_spawn.
 */

import fs from "node:fs";
import path from "node:path";

import {
  btcCompanies, ethCompanies, solCompanies,
  hypeCompanies, bnbCompanies, taoCompanies,
  linkCompanies, trxCompanies, xrpCompanies, zecCompanies,
} from "../src/lib/data/companies";
import { dilutiveInstruments } from "../src/lib/data/dilutive-instruments";
import { EARNINGS_DATA } from "../src/lib/data/earnings-data";
import { HOLDINGS_HISTORY } from "../src/lib/data/holdings-history";
import { Company } from "../src/lib/types";

type PromptSpec = {
  role: "worker" | "synth";
  model: string;
  label: string;
  task: string;
};

type PromptsJson = {
  ticker: string;
  date: string;
  cik: string | null;
  runDir: string;
  codebaseValues: Record<string, unknown>;
  prompts: Record<string, PromptSpec>;
};

const allCompanies: Company[] = [
  ...btcCompanies,
  ...ethCompanies,
  ...solCompanies,
  ...hypeCompanies,
  ...bnbCompanies,
  ...taoCompanies,
  ...linkCompanies,
  ...trxCompanies,
  ...xrpCompanies,
  ...zecCompanies,
];

function usageAndExit(): never {
  // eslint-disable-next-line no-console
  console.error("Usage: npx tsx scripts/gen-orchestrated-prompts.ts <TICKER or NAME>");
  // eslint-disable-next-line no-console
  console.error(
    "Available:",
    allCompanies
      .map(c => `${c.ticker} (${c.name})`)
      .sort()
      .join(", ")
  );
  process.exit(1);
}

const input = process.argv[2];
if (!input) usageAndExit();

const inputUpper = input.toUpperCase();
let company = allCompanies.find(c => c.ticker.toUpperCase() === inputUpper);
if (!company) {
  const inputLower = input.toLowerCase();
  const nameMatches = allCompanies.filter(c => c.name.toLowerCase().includes(inputLower));
  if (nameMatches.length === 1) company = nameMatches[0];
  else usageAndExit();
}

const ticker = company.ticker;
const tickerLower = ticker.toLowerCase();

const date = new Date().toISOString().slice(0, 10);
const runDir = `verification-runs/${tickerLower}/${date}`;

const cikPadded = company.secCik
  ? company.secCik.replace(/^0+/, "").padStart(10, "0")
  : null;

const instruments = dilutiveInstruments[ticker] ?? [];
const earnings = EARNINGS_DATA.filter((e: any) => e.ticker === ticker);
const history = HOLDINGS_HISTORY[ticker] ?? null;

const codebaseValues = {
  company: {
    ticker: company.ticker,
    name: company.name,
    asset: (company as any).asset,
    filingType: (company as any).filingType,
    secCik: cikPadded,
  },
  companiesTs: {
    holdings: (company as any).holdings,
    holdingsLastUpdated: (company as any).holdingsLastUpdated,
    costBasisAvg: (company as any).costBasisAvg,
    costBasisAsOf: (company as any).costBasisAsOf,
    sharesForMnav: (company as any).sharesForMnav,
    sharesAsOf: (company as any).sharesAsOf,
    totalDebt: (company as any).totalDebt,
    debtAsOf: (company as any).debtAsOf,
    cashReserves: (company as any).cashReserves,
    cashAsOf: (company as any).cashAsOf,
    preferredEquity: (company as any).preferredEquity,
    preferredAsOf: (company as any).preferredAsOf,
    quarterlyBurnUsd: (company as any).quarterlyBurnUsd,
    burnAsOf: (company as any).burnAsOf,
    secondaryCryptoHoldings: (company as any).secondaryCryptoHoldings ?? null,
    stakingPct: (company as any).stakingPct ?? null,
  },
  dilutiveInstrumentsTs: { instruments },
  earningsDataTs: earnings,
  holdingsHistoryTs: history,
};

const SEC_UA = 'curl -A "DATCAP Research contact@datcap.com"';

const verdictBlock = `\n\nVERDICT: PASS | FAIL | WARN\nCHANGES: ...\nBLOCKED: ...\nDETAILS: ...\n`;

function w(label: string, task: string): PromptSpec {
  return { role: "worker", model: "openai/gpt-5.2", label, task };
}
function s(label: string, task: string): PromptSpec {
  return { role: "synth", model: "openai/gpt-5.2", label, task };
}

const prompts: Record<string, PromptSpec> = {
  r1: w(
    `${tickerLower}-r1-holdings`,
    `You are R1 (Holdings) for {{TICKER}}.\n\nTicker: ${ticker}\nCIK: ${cikPadded ?? "N/A"}\nRun dir: ${runDir}\n\nObjective: Reconstruct crypto holdings, cost basis, and custody/staking breakdown from primary sources (SEC XBRL + filings + recent 8-Ks).\n\nRules:\n- Use SEC endpoints if applicable:\n  - XBRL facts: https://data.sec.gov/api/xbrl/companyfacts/CIK${cikPadded ?? ""}.json\n  - Submissions: https://data.sec.gov/submissions/CIK${cikPadded ?? ""}.json\n- All SEC access must use: ${SEC_UA}\n- Provide direct filing document URLs (not accession directory).\n- Every number: include as-of date + sourceUrl + a short quote/snippet.\n\nWrite output to: ${runDir}/r1-holdings.md\nEnd with the required verdict block.`
  ),

  r2: w(
    `${tickerLower}-r2-shares`,
    `You are R2 (Shares) for {{TICKER}}.\n\nTicker: ${ticker}\nCIK: ${cikPadded ?? "N/A"}\nRun dir: ${runDir}\n\nObjective: Reconstruct basic shares outstanding (cover page), any class structure, and recent share count changes (ATM, PIPE, buybacks).\n\nRules:\n- Prefer cover page shares outstanding / DEI tag when available.\n- Include recent 8-K / 424B5 / S-3 updates affecting shares.\n- All SEC access must use: ${SEC_UA}\n\nWrite output to: ${runDir}/r2-shares.md\nEnd with the required verdict block.`
  ),

  r3: w(
    `${tickerLower}-r3-financials`,
    `You are R3 (Financials) for {{TICKER}}.\n\nTicker: ${ticker}\nCIK: ${cikPadded ?? "N/A"}\nRun dir: ${runDir}\n\nObjective: Reconstruct cash, total debt (with breakdown), preferred equity, and quarterly burn from latest filings.\n\nRules:\n- Prefer latest 10-Q/10-K balance sheet (or most recent 8-K with updated balances).\n- All SEC access must use: ${SEC_UA}\n\nWrite output to: ${runDir}/r3-financials.md\nEnd with the required verdict block.`
  ),

  r4: w(
    `${tickerLower}-r4-dilutives`,
    `You are R4 (Dilutives) for {{TICKER}}.\n\nTicker: ${ticker}\nCIK: ${cikPadded ?? "N/A"}\nRun dir: ${runDir}\n\nObjective: Enumerate all dilutive instruments (warrants/convertibles/options/RSUs) with strike, potential shares, expiration, and face value where relevant.\n\nRules:\n- Check 8-K Item 3.02 and exhibits for PIPE warrants/convertibles.\n- All SEC access must use: ${SEC_UA}\n\nWrite output to: ${runDir}/r4-dilutives.md\nEnd with the required verdict block.`
  ),

  rSynth: s(
    `${tickerLower}-r-synth`,
    `You are R-Synth for ${ticker}.\n\nRun dir: ${runDir}\n\nRead these worker outputs:\n- ${runDir}/r1-holdings.md\n- ${runDir}/r2-shares.md\n- ${runDir}/r3-financials.md\n- ${runDir}/r4-dilutives.md\n\nAlso read CODEBASE_VALUES below and use it ONLY for comparison/diff (not as a source of truth).\n\nCODEBASE_VALUES (JSON):\n${JSON.stringify(codebaseValues, null, 2)}\n\nTask:\n- Reconcile R1–R4 into a single reconstruction with citations.\n- Identify discrepancies vs codebase values and list fields to change.\n\nWrite full report: ${runDir}/r-synth.md\nWrite verdict-only (exact 4 lines): ${runDir}/r-synth-verdict.txt\n\nVerdict-only lines must be exactly:\nVERDICT: PASS | FAIL | WARN\nCHANGES: <comma-separated fields>\nBLOCKED: <issues requiring resolution>\nDETAILS: <1-2 sentence summary>`
  ),

  a1: w(
    `${tickerLower}-a1-numerical`,
    `You are A1 (Numerical) for ${ticker}.\n\nRun dir: ${runDir}\nR-Synth path: ${runDir}/r-synth.md\n\nTask:\n- Verify all math and derived values in r-synth.md.\n- Recompute every calculation; FAIL if any cannot be verified.\n\nRules:\n- Do NOT use codebase values.\n\nWrite output to: ${runDir}/a1-numerical.md\nEnd with required verdict block.`
  ),

  a2: w(
    `${tickerLower}-a2-provenance`,
    `You are A2 (Provenance) for ${ticker}.\n\nRun dir: ${runDir}\nR-Synth path: ${runDir}/r-synth.md\n\nTask:\n- Verify every sourceUrl in r-synth.md loads and supports the claim (searchTerm/quote present).\n\nRules:\n- URLs must be specific filing documents, not directories.\n- All SEC access must use: ${SEC_UA}\n- If any URL fails or claim not supported: FAIL.\n\nWrite output to: ${runDir}/a2-provenance.md\nEnd with required verdict block.`
  ),

  a3: w(
    `${tickerLower}-a3-temporal`,
    `You are A3 (Temporal) for ${ticker}.\n\nRun dir: ${runDir}\nR-Synth path: ${runDir}/r-synth.md\n\nTask:\n- Check timeline consistency: dates, quarter-ends, as-of logic, no future data.\n\nRules:\n- Do NOT use codebase values.\n\nWrite output to: ${runDir}/a3-temporal.md\nEnd with required verdict block.`
  ),

  a4: w(
    `${tickerLower}-a4-completeness`,
    `You are A4 (Completeness) for ${ticker}.\n\nRun dir: ${runDir}\nR-Synth path: ${runDir}/r-synth.md\n\nTask:\n- Identify missing instruments, missing classes, missing filings/events, coverage gaps.\n\nRules:\n- Do NOT use codebase values.\n\nWrite output to: ${runDir}/a4-completeness.md\nEnd with required verdict block.`
  ),

  aSynth: s(
    `${tickerLower}-a-synth`,
    `You are A-Synth for ${ticker}.\n\nRun dir: ${runDir}\n\nRead:\n- ${runDir}/a1-numerical.md\n- ${runDir}/a2-provenance.md\n- ${runDir}/a3-temporal.md\n- ${runDir}/a4-completeness.md\n- ${runDir}/r-synth.md\n\nTask:\n- Decide if adversarial findings are real.\n- FAIL if any material error exists.\n\nWrite full report: ${runDir}/a-synth.md\nWrite verdict-only: ${runDir}/a-synth-verdict.txt (exact 4 lines).\n\nVerdict-only lines must be exactly:\nVERDICT: PASS | FAIL | WARN\nCHANGES: <comma-separated fields>\nBLOCKED: <issues requiring resolution>\nDETAILS: <1-2 sentence summary>`
  ),

  vSynth: s(
    `${tickerLower}-v-synth`,
    `You are V-Synth for ${ticker}.\n\nRun dir: ${runDir}\n\nInputs (read whatever exists):\n- ${runDir}/patch.diff (or patches.md)\n- ${runDir}/build.log\n- ${runDir}/citations-check.json (if present)\n\nTask:\n- FAIL if build fails or citation checks fail.\n- PASS only if patch applies cleanly and verification artifacts are valid.\n\nWrite full report: ${runDir}/v-synth.md\nWrite verdict-only: ${runDir}/v-synth-verdict.txt (exact 4 lines).`
  ),

  cSynth: s(
    `${tickerLower}-c-synth`,
    `You are C-Synth for ${ticker}.\n\nRun dir: ${runDir}\n\nRead these code files for ${ticker} cross-file consistency:\n- src/lib/data/companies.ts\n- src/lib/data/dilutive-instruments.ts\n- src/lib/data/holdings-history.ts\n- src/lib/data/earnings-data.ts\n\nTask:\n- Verify all values agree across files (latest + quarter-ends).\n- FAIL on any mismatch.\n\nWrite full report: ${runDir}/c-synth.md\nWrite verdict-only: ${runDir}/c-synth-verdict.txt (exact 4 lines).`
  ),
};

const out: PromptsJson = {
  ticker,
  date,
  cik: cikPadded,
  runDir,
  codebaseValues,
  prompts,
};

// Resolve clawd repo output path relative to dat-tracker-next.
// Expected layout: .../dat-tracker-next (this script) and .../clawd (sibling).
const datTrackerNextRoot = process.cwd();
const clawdRoot = path.resolve(datTrackerNextRoot, "..", "clawd");
const outDirAbs = path.join(clawdRoot, runDir);
const outPathAbs = path.join(outDirAbs, "prompts.json");

fs.mkdirSync(outDirAbs, { recursive: true });
fs.writeFileSync(outPathAbs, JSON.stringify(out, null, 2) + "\n", "utf8");

// eslint-disable-next-line no-console
console.log(`Wrote ${outPathAbs}`);
