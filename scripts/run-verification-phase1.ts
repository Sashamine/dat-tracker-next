#!/usr/bin/env node
/**
 * Minimal runner for Phase 1 (R1–R4 + R-Synth) and Phase 1-ADV (A1–A4 + A-Synth)
 * using Clawdbot sessions_spawn.
 *
 * Why this exists:
 * - The prompt generator writes prompts.json, but a runner must execute it with gating.
 * - Sub-agents must run in the SAME workspace as the runDir artifacts.
 *
 * Usage (run inside /Users/dwinny/clawd workspace; i.e., Clawdbot agent workspace):
 *   node scripts/run-verification-phase1.ts verification-runs/fwdi/2026-02-22/prompts.json
 *
 * Notes:
 * - This script is intentionally narrow: it runs only Phase 1 and Phase 1-ADV.
 * - It assumes prompts.json tasks already include required IDENTITY/Verdict formats.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

type PromptSpec = { role: "worker" | "synth"; model: string; label: string; task: string };

type PromptsJson = {
  ticker: string;
  date: string;
  runDir: string;
  prompts: Record<string, PromptSpec>;
};

function die(msg: string): never {
  // eslint-disable-next-line no-console
  console.error(msg);
  process.exit(1);
}

const promptsPath = process.argv[2];
if (!promptsPath) die("Usage: run-verification-phase1.ts <path/to/prompts.json>");

const promptsAbs = path.resolve(process.cwd(), promptsPath);
if (!fs.existsSync(promptsAbs)) die(`prompts.json not found: ${promptsAbs}`);

const promptsJson = JSON.parse(fs.readFileSync(promptsAbs, "utf8")) as PromptsJson;

const runDirAbs = path.resolve(process.cwd(), promptsJson.runDir);
if (!fs.existsSync(runDirAbs)) die(`runDir not found (relative to cwd): ${promptsJson.runDir}`);

const statePath = path.join(runDirAbs, "STATE.md");
if (!fs.existsSync(statePath)) die(`STATE.md missing: ${statePath}`);
const state = fs.readFileSync(statePath, "utf8");
if (!state.includes("PIPELINE-AUTHORIZED=✅")) die(`STATE.md not authorized (missing PIPELINE-AUTHORIZED=✅): ${statePath}`);

const phase1 = ["r1", "r2", "r3", "r4"];
const phase1Synth = ["rSynth"];
const phase1Adv = ["a1", "a2", "a3", "a4"];
const phase1AdvSynth = ["aSynth"];

function spawnAgent(key: string) {
  const spec = promptsJson.prompts[key];
  if (!spec) die(`Missing prompt key: ${key}`);

  // NOTE: There is no stable CLI for sessions_spawn, so we run a one-turn agent
  // command that *spawns* the subagent via tool use.
  const spawnInstruction = `SPAWN_SUBAGENT\nlabel=${spec.label}\nmodel=${spec.model}\ncleanup=keep\n\nTASK:\n${spec.task}`;

  const cmd = [
    "clawdbot",
    "agent",
    "--agent",
    "flash-orchestrator",
    "--message",
    spawnInstruction,
  ];

  const res = spawnSync(cmd[0], cmd.slice(1), { stdio: "inherit" });
  if (res.status !== 0) die(`Failed to spawn ${key} (${spec.label})`);
}

function exists(rel: string) {
  return fs.existsSync(path.resolve(process.cwd(), rel));
}

function waitForFiles(filesRel: string[], timeoutMs: number) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const missing = filesRel.filter(f => !exists(f));
    if (missing.length === 0) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500);
  }
  die(`Timeout waiting for files: ${filesRel.join(", ")}`);
}

// eslint-disable-next-line no-console
console.log(`Running Phase 1 for ${promptsJson.ticker} in ${promptsJson.runDir}`);
for (const k of phase1) spawnAgent(k);

waitForFiles(
  [
    `${promptsJson.runDir}/r1-holdings.md`,
    `${promptsJson.runDir}/r2-shares.md`,
    `${promptsJson.runDir}/r3-financials.md`,
    `${promptsJson.runDir}/r4-dilutives.md`,
  ],
  1000 * 60 * 60
);

for (const k of phase1Synth) spawnAgent(k);
waitForFiles([`${promptsJson.runDir}/r-synth.md`, `${promptsJson.runDir}/r-synth-verdict.txt`], 1000 * 60 * 30);

// eslint-disable-next-line no-console
console.log("Running Phase 1-ADV (adversarial)");
for (const k of phase1Adv) spawnAgent(k);
waitForFiles(
  [
    `${promptsJson.runDir}/a1-numerical.md`,
    `${promptsJson.runDir}/a2-provenance.md`,
    `${promptsJson.runDir}/a3-temporal.md`,
    `${promptsJson.runDir}/a4-completeness.md`,
  ],
  1000 * 60 * 30
);

for (const k of phase1AdvSynth) spawnAgent(k);
waitForFiles([`${promptsJson.runDir}/a-synth.md`, `${promptsJson.runDir}/a-synth-verdict.txt`], 1000 * 60 * 30);

// eslint-disable-next-line no-console
console.log("Phase 1 complete.");
