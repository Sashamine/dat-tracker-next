#!/usr/bin/env npx tsx
/**
 * Validates agent-ownership.json:
 * - Exactly 56 tickers
 * - Zero overlaps (each ticker has exactly one owner)
 * - Valid agent names only (codex, gemini, claude)
 * - Counts match declared totals
 * - Allow/ignore files are consistent with manifest
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const INFRA = join(__dirname, "..", "infra");
const VALID_AGENTS = ["codex", "gemini", "claude"] as const;
const EXPECTED_TOTAL = 56;

interface OwnershipManifest {
  totalCompanies: number;
  agents: Record<string, number>;
  aliases: Record<string, string>;
  ownership: Record<string, string>;
}

let errors = 0;

function fail(msg: string) {
  console.error(`FAIL: ${msg}`);
  errors++;
}

function pass(msg: string) {
  console.log(`PASS: ${msg}`);
}

// Load manifest
const manifest: OwnershipManifest = JSON.parse(
  readFileSync(join(INFRA, "agent-ownership.json"), "utf-8")
);

const { ownership, agents, aliases } = manifest;
const tickers = Object.keys(ownership);

// 1. Total count
if (tickers.length === EXPECTED_TOTAL) {
  pass(`Total tickers = ${EXPECTED_TOTAL}`);
} else {
  fail(`Expected ${EXPECTED_TOTAL} tickers, got ${tickers.length}`);
}

// 2. No duplicates (JSON keys are unique by spec, but check anyway)
const seen = new Set<string>();
for (const t of tickers) {
  if (seen.has(t)) fail(`Duplicate ticker: ${t}`);
  seen.add(t);
}
if (errors === 0) pass("No duplicate tickers");

// 3. Valid agent names
for (const [ticker, agent] of Object.entries(ownership)) {
  if (!(VALID_AGENTS as readonly string[]).includes(agent)) {
    fail(`${ticker} has invalid agent: ${agent}`);
  }
}

// 4. Counts match
const counts: Record<string, number> = {};
for (const agent of Object.values(ownership)) {
  counts[agent] = (counts[agent] || 0) + 1;
}

for (const agent of VALID_AGENTS) {
  const expected = agents[agent];
  const actual = counts[agent] || 0;
  if (actual === expected) {
    pass(`${agent}: ${actual} tickers`);
  } else {
    fail(`${agent}: expected ${expected}, got ${actual}`);
  }
}

// 5. Every ticker has an owner
const unowned = tickers.filter((t) => !ownership[t]);
if (unowned.length === 0) {
  pass("All tickers have owners");
} else {
  fail(`Unowned tickers: ${unowned.join(", ")}`);
}

// 6. Alias targets exist in ownership
for (const [alias, canonical] of Object.entries(aliases)) {
  if (!(canonical in ownership)) {
    fail(`Alias ${alias} -> ${canonical} but ${canonical} not in ownership`);
  }
}
pass("All alias targets exist");

// 7. Validate allow/ignore files
for (const agent of VALID_AGENTS) {
  const allowPath = join(INFRA, `agent-${agent}-allow.txt`);
  const ignorePath = join(INFRA, `agent-${agent}-ignore.txt`);

  try {
    const allow = readFileSync(allowPath, "utf-8").trim().split("\n").filter(Boolean);
    const ignore = readFileSync(ignorePath, "utf-8").trim().split("\n").filter(Boolean);

    const expectedAllow = Object.entries(ownership)
      .filter(([, a]) => a === agent)
      .map(([t]) => t)
      .sort();
    const expectedIgnore = Object.entries(ownership)
      .filter(([, a]) => a !== agent)
      .map(([t]) => t)
      .sort();

    if (JSON.stringify(allow.sort()) === JSON.stringify(expectedAllow)) {
      pass(`${agent} allow.txt matches manifest`);
    } else {
      fail(`${agent} allow.txt doesn't match manifest`);
    }

    if (JSON.stringify(ignore.sort()) === JSON.stringify(expectedIgnore)) {
      pass(`${agent} ignore.txt matches manifest`);
    } else {
      fail(`${agent} ignore.txt doesn't match manifest`);
    }

    if (allow.length + ignore.length === EXPECTED_TOTAL) {
      pass(`${agent} allow + ignore = ${EXPECTED_TOTAL}`);
    } else {
      fail(`${agent} allow(${allow.length}) + ignore(${ignore.length}) != ${EXPECTED_TOTAL}`);
    }
  } catch {
    fail(`Missing file: ${allowPath} or ${ignorePath}`);
  }
}

// Summary
console.log("\n" + (errors === 0 ? "ALL CHECKS PASSED" : `${errors} FAILURE(S)`));
process.exit(errors === 0 ? 0 : 1);
