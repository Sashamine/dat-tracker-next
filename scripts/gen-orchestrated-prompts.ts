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

// Verdict block is no longer a standalone constant — each prompt embeds
// the IDENTITY line directly via identityGuard() and the prompt text.
// Workers include IDENTITY in their output; synths include IDENTITY + CHAIN.

/**
 * Identity guard preamble — prepended to every worker/synth prompt.
 * The agent must self-report its model identity before doing any work.
 * If it can't confirm it matches the expected provider, it aborts.
 */
function identityGuard(expectedProvider: string, role: "worker" | "synth" = "worker"): string {
  const verdictFormat = role === "synth"
    ? `Your verdict file MUST end with exactly these lines (no other format accepted):
CHAIN: <worker_label>=<provider/model>, <worker_label>=<provider/model>, ...
IDENTITY: <your_provider>/<your_model>
VERDICT: PASS | FAIL | WARN
CHANGES: <comma-separated fields>
BLOCKED: <issues requiring resolution>
DETAILS: <1-2 sentence summary>

The CHAIN line must list each upstream worker file you read and the IDENTITY line from that file.
If any upstream worker is missing an IDENTITY line, report that as a FAIL.`
    : `Your output file MUST end with exactly these lines (no other format accepted):
IDENTITY: <your_provider>/<your_model>
VERDICT: PASS | FAIL | WARN
CHANGES: <comma-separated fields>
BLOCKED: <issues requiring resolution>
DETAILS: <1-2 sentence summary>`;

  return `## IDENTITY CHECK (MANDATORY — DO THIS FIRST)
Before doing ANY work, you must confirm your model identity.
Expected provider: ${expectedProvider}

Step 1: State what model/provider you are (e.g., "I am Claude Sonnet 4.6 on Anthropic").
Step 2: If you are NOT running on the expected provider above, reply with ONLY:
  ABORT: Identity mismatch. Expected ${expectedProvider}, got [your actual provider].
  Do NOT proceed with any work.
Step 3: If you confirm you match, state "IDENTITY CONFIRMED: [your model name]" and proceed.

## VERDICT FORMAT (MANDATORY)
${verdictFormat}

---

`;
}

/**
 * Model assignments per phase (from SKILL.md §2a):
 * - Phase 0, 1, 4, 5, 6 (Build): Sonnet 4.6 (Anthropic)
 * - Phase 1-ADV, 3-V, 7 (Audit): Grok 4 (xAI)
 * - Phase 2-3 (Diff/Patch): GPT-5.2 (OpenAI)
 *
 * Synthesizers use the same provider as their phase workers.
 */
const MODELS = {
  sonnet: "anthropic/claude-sonnet-4-6",
  grok: "xai/grok-4-fast-reasoning",
  gpt: "openai/gpt-5.2",
} as const;

function w(label: string, task: string, provider?: string, model: string = MODELS.sonnet): PromptSpec {
  const preamble = provider ? identityGuard(provider, "worker") : "";
  return { role: "worker", model, label, task: preamble + task };
}
function s(label: string, task: string, provider?: string, model: string = MODELS.sonnet): PromptSpec {
  const preamble = provider ? identityGuard(provider, "synth") : "";
  return { role: "synth", model, label, task: preamble + task };
}
const prompts: Record<string, PromptSpec> = {
  // --- Phase 1: Reconstruct (Sonnet / Anthropic) ---
  r1: w(
    `${tickerLower}-r1-holdings`,
    `You are R1 (Holdings) for {{TICKER}}.\n\nTicker: ${ticker}\nCIK: ${cikPadded ?? "N/A"}\nRun dir: ${runDir}\n\nObjective: Reconstruct crypto holdings, cost basis, and custody/staking breakdown from primary sources (SEC XBRL + filings + recent 8-Ks).\n\nRules:\n- Use SEC endpoints if applicable:\n  - XBRL facts: https://data.sec.gov/api/xbrl/companyfacts/CIK${cikPadded ?? ""}.json\n  - Submissions: https://data.sec.gov/submissions/CIK${cikPadded ?? ""}.json\n- All SEC access must use: ${SEC_UA}\n- Provide direct filing document URLs (not accession directory).\n- Every number: include as-of date + sourceUrl + a short quote/snippet.\n\nWrite output to: ${runDir}/r1-holdings.md\nEnd with the required verdict block.`,
    "Anthropic (Sonnet)", MODELS.sonnet
  ),

  r2: w(
    `${tickerLower}-r2-shares`,
    `You are R2 (Shares) for {{TICKER}}.\n\nTicker: ${ticker}\nCIK: ${cikPadded ?? "N/A"}\nRun dir: ${runDir}\n\nObjective: Reconstruct basic shares outstanding (cover page), any class structure, and recent share count changes (ATM, PIPE, buybacks).\n\nRules:\n- Prefer cover page shares outstanding / DEI tag when available.\n- Include recent 8-K / 424B5 / S-3 updates affecting shares.\n- All SEC access must use: ${SEC_UA}\n\nWrite output to: ${runDir}/r2-shares.md\nEnd with the required verdict block.`,
    "Anthropic (Sonnet)", MODELS.sonnet
  ),

  r3: w(
    `${tickerLower}-r3-financials`,
    `You are R3 (Financials) for {{TICKER}}.\n\nTicker: ${ticker}\nCIK: ${cikPadded ?? "N/A"}\nRun dir: ${runDir}\n\nObjective: Reconstruct cash, total debt (with breakdown), preferred equity, and quarterly burn from latest filings.\n\nRules:\n- Prefer latest 10-Q/10-K balance sheet (or most recent 8-K with updated balances).\n- All SEC access must use: ${SEC_UA}\n\nWrite output to: ${runDir}/r3-financials.md\nEnd with the required verdict block.`,
    "Anthropic (Sonnet)", MODELS.sonnet
  ),

  r4: w(
    `${tickerLower}-r4-dilutives`,
    `You are R4 (Dilutives) for {{TICKER}}.\n\nTicker: ${ticker}\nCIK: ${cikPadded ?? "N/A"}\nRun dir: ${runDir}\n\nObjective: Enumerate all dilutive instruments (warrants/convertibles/options/RSUs) with strike, potential shares, expiration, and face value where relevant.\n\nRules:\n- Check 8-K Item 3.02 and exhibits for PIPE warrants/convertibles.\n- All SEC access must use: ${SEC_UA}\n\nWrite output to: ${runDir}/r4-dilutives.md\nEnd with the required verdict block.`,
    "Anthropic (Sonnet)", MODELS.sonnet
  ),

  rSynth: s(
    `${tickerLower}-r-synth`,
    `You are R-Synth for ${ticker}.\n\nRun dir: ${runDir}\n\nRead these worker outputs:\n- ${runDir}/r1-holdings.md\n- ${runDir}/r2-shares.md\n- ${runDir}/r3-financials.md\n- ${runDir}/r4-dilutives.md\n\nFor EACH worker file, find the IDENTITY line near the end. You MUST extract and echo these in your CHAIN line. If any worker file is missing or has no IDENTITY line, that is a FAIL.\n\nAlso read CODEBASE_VALUES below and use it ONLY for comparison/diff (not as a source of truth).\n\nCODEBASE_VALUES (JSON):\n${JSON.stringify(codebaseValues, null, 2)}\n\nTask:\n- Reconcile R1–R4 into a single reconstruction with citations.\n- Identify discrepancies vs codebase values and list fields to change.\n\nWrite full report: ${runDir}/r-synth.md\nWrite verdict-only: ${runDir}/r-synth-verdict.txt`,
    "Anthropic (Sonnet)", MODELS.sonnet
  ),

  // --- Phase 1-ADV: Adversarial (Grok / xAI) ---
  a1: w(
    `${tickerLower}-a1-numerical`,
    `You are A1 (Numerical) for ${ticker}.\n\nRun dir: ${runDir}\nR-Synth path: ${runDir}/r-synth.md\n\nTask:\n- Verify all math and derived values in r-synth.md.\n- Recompute every calculation; FAIL if any cannot be verified.\n\nRules:\n- Do NOT use codebase values.\n\nWrite output to: ${runDir}/a1-numerical.md\nEnd with required verdict block.`,
    "xAI (Grok)", MODELS.grok
  ),

  a2: w(
    `${tickerLower}-a2-provenance`,
    `You are A2 (Provenance) for ${ticker}.\n\nRun dir: ${runDir}\nR-Synth path: ${runDir}/r-synth.md\n\nTask:\n- Verify every sourceUrl in r-synth.md loads and supports the claim (searchTerm/quote present).\n\nRules:\n- URLs must be specific filing documents, not directories.\n- All SEC access must use: ${SEC_UA}\n- If any URL fails or claim not supported: FAIL.\n\nWrite output to: ${runDir}/a2-provenance.md\nEnd with required verdict block.`,
    "xAI (Grok)", MODELS.grok
  ),

  a3: w(
    `${tickerLower}-a3-temporal`,
    `You are A3 (Temporal) for ${ticker}.\n\nRun dir: ${runDir}\nR-Synth path: ${runDir}/r-synth.md\n\nTask:\n- Check timeline consistency: dates, quarter-ends, as-of logic, no future data.\n\nRules:\n- Do NOT use codebase values.\n\nWrite output to: ${runDir}/a3-temporal.md\nEnd with required verdict block.`,
    "xAI (Grok)", MODELS.grok
  ),

  a4: w(
    `${tickerLower}-a4-completeness`,
    `You are A4 (Completeness) for ${ticker}.\n\nRun dir: ${runDir}\nR-Synth path: ${runDir}/r-synth.md\n\nTask:\n- Identify missing instruments, missing classes, missing filings/events, coverage gaps.\n\nRules:\n- Do NOT use codebase values.\n\nWrite output to: ${runDir}/a4-completeness.md\nEnd with required verdict block.`,
    "xAI (Grok)", MODELS.grok
  ),

  aSynth: s(
    `${tickerLower}-a-synth`,
    `You are A-Synth for ${ticker}.\n\nRun dir: ${runDir}\n\nRead:\n- ${runDir}/a1-numerical.md\n- ${runDir}/a2-provenance.md\n- ${runDir}/a3-temporal.md\n- ${runDir}/a4-completeness.md\n- ${runDir}/r-synth.md\n\nFor EACH worker file (a1-a4), find the IDENTITY line near the end. You MUST extract and echo these in your CHAIN line. If any worker file is missing or has no IDENTITY line, that is a FAIL.\n\nTask:\n- Decide if adversarial findings are real.\n- FAIL if any material error exists.\n\nWrite full report: ${runDir}/a-synth.md\nWrite verdict-only: ${runDir}/a-synth-verdict.txt`,
    "xAI (Grok)", MODELS.grok
  ),

  // --- Phase 3-V: Verify (Grok / xAI) ---
  vSynth: s(
    `${tickerLower}-v-synth`,
    `You are V-Synth for ${ticker}.\n\nRun dir: ${runDir}\n\nInputs (read whatever exists):\n- ${runDir}/patch.diff (or patches.md)\n- ${runDir}/build.log\n- ${runDir}/citations-check.json (if present)\n\nTask:\n- FAIL if build fails or citation checks fail.\n- PASS only if patch applies cleanly and verification artifacts are valid.\n\nWrite full report: ${runDir}/v-synth.md\nWrite verdict-only: ${runDir}/v-synth-verdict.txt (exact 4 lines).`,
    "xAI (Grok)", MODELS.grok
  ),

  // --- Phase 4: Cross-file (Sonnet / Anthropic) ---
  cSynth: s(
    `${tickerLower}-c-synth`,
    `You are C-Synth for ${ticker}.\n\nRun dir: ${runDir}\n\nRead these code files for ${ticker} cross-file consistency:\n- src/lib/data/companies.ts\n- src/lib/data/dilutive-instruments.ts\n- src/lib/data/holdings-history.ts\n- src/lib/data/earnings-data.ts\n\nTask:\n- Verify all values agree across files (latest + quarter-ends).\n- FAIL on any mismatch.\n\nWrite full report: ${runDir}/c-synth.md\nWrite verdict-only: ${runDir}/c-synth-verdict.txt (exact 4 lines).`,
    "Anthropic (Sonnet)", MODELS.sonnet
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

// ─────────────────────────────────────────────────────────────────────────────
// Phase 6 Gate File
// Pre-fills expected values so the orchestrator can't shortcut.
// The orchestrator MUST fill in the "Popup showed" and "Found?" columns by
// actually clicking each ⓘ button in the browser. These can't be faked
// because the expected values are already printed — any copy-paste would be
// immediately obvious, and the "Found?" column requires fetching the filing.
//
// Phase 7 cannot start until this file exists with all BLANK fields filled.
// ─────────────────────────────────────────────────────────────────────────────

const cv = codebaseValues.companiesTs as any;

function fmtNum(n: number | undefined | null): string {
  if (n == null) return "N/A";
  return n.toLocaleString();
}
function fmtUsd(n: number | undefined | null): string {
  if (n == null) return "N/A";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

const holdingsExpected = fmtNum(cv.holdings);
const cashExpected = fmtUsd(cv.cashReserves);
const sharesExpected = fmtNum(cv.sharesForMnav);
const debtExpected = fmtUsd(cv.totalDebt);
const preferredExpected = cv.preferredEquity != null ? fmtUsd(cv.preferredEquity) : null;

const phase6Gate = `# Phase 6 Citation Gate — ${ticker} ${date}

## Instructions
Fill in the "Popup showed" and "Found in filing?" columns by clicking the ⓘ button
for each field in the browser at http://localhost:3001/company/${ticker}

**Rules:**
- Open the dev server FIRST. Navigate to /company/${ticker}.
- Click the ⓘ button next to each field listed below.
- Copy the search term FROM THE POPUP (not from this file or source code).
- Copy the filing accession FROM THE POPUP.
- Then fetch the filing and confirm the search term appears in the document.
- Mark Found? as Y or N.

**This file must be fully filled before Phase 7 can start.**
Any row with a blank in "Popup showed" or "Found?" = Phase 6 incomplete = BLOCKED.

## Mandatory Citation Checks

| # | Field | Expected value | Popup showed | Filing (from popup) | Search term (from popup) | Found? |
|---|-------|---------------|--------------|---------------------|--------------------------|--------|
| 1 | Holdings | ${holdingsExpected} | _____ | _____ | _____ | _____ |
| 2 | Cash | ${cashExpected} | _____ | _____ | _____ | _____ |
| 3 | Shares | ${sharesExpected} | _____ | _____ | _____ | _____ |
| 4 | Debt | ${debtExpected} | _____ | _____ | _____ | _____ |${preferredExpected ? `\n| 5 | Preferred | ${preferredExpected} | _____ | _____ | _____ | _____ |` : ""}

## /mnav Cross-Check
- Navigated to /mnav: Y/N _____
- ${ticker} appears in table: Y/N _____
- mNAV on /mnav matches /company/${ticker}: Y/N _____ (values: _____ vs _____)

## Verdict
- All 4 mandatory rows filled: Y/N _____
- All search terms found in filings: Y/N _____
- /mnav cross-check passed: Y/N _____

**PHASE 6 VERDICT: _____** (PASS = all Y above; FAIL = any N or blank)

---
*Generated by gen-orchestrated-prompts.ts. Do not edit the Expected value column.*
`;

const phase6GatePath = path.join(outDirAbs, "phase-6-gate.md");
fs.writeFileSync(phase6GatePath, phase6Gate, "utf8");

// eslint-disable-next-line no-console
console.log(`Wrote ${phase6GatePath}`);
