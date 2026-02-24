#!/usr/bin/env node
/**
 * auto-product-commit: constrained auto-commit for allowedPaths only.
 * - stages only allowlisted paths (from infra/GOAL.json allowedPaths)
 * - refuses to commit if there are changes outside allowlist
 * - rate limits via infra/auto-commit-state.json (max 1/hour)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

type Goal = {
  schemaVersion: string;
  goal: string;
  workMode?: string;
  allowedPaths: string[];
};

type AutoState = {
  schemaVersion: string;
  lastAutoCommitAt: string | null;
};

function sh(cmd: string): string {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8').trim();
}

function loadGoal(repoRoot: string): Goal {
  const p = path.join(repoRoot, 'infra', 'GOAL.json');
  return JSON.parse(fs.readFileSync(p, 'utf8')) as Goal;
}

async function loadState(p: string): Promise<AutoState> {
  try {
    return JSON.parse(await fsp.readFile(p, 'utf8')) as AutoState;
  } catch {
    return { schemaVersion: '0.1', lastAutoCommitAt: null };
  }
}

function minutesSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.floor((Date.now() - t) / 60000);
}

async function main() {
  const repoRoot = process.cwd();
  const goal = loadGoal(repoRoot);
  const statePath = path.join(repoRoot, 'infra', 'auto-commit-state.json');
  const st = await loadState(statePath);

  const mins = minutesSince(st.lastAutoCommitAt);
  if (mins !== null && mins < 60) {
    console.log(`skip: rate-limited (${mins}m since last auto commit)`);
    return;
  }

  // Determine changed files.
  const changed = sh('git status --porcelain').split('\n').filter(Boolean);
  if (changed.length === 0) {
    console.log('skip: clean');
    return;
  }

  const files = changed.map((l) => l.trim().replace(/^[?MADRCU! ]+\s+/, ''));
  const allowed = goal.allowedPaths;
  const outside = files.filter((f) => !allowed.some((p) => f.startsWith(p)));
  if (outside.length) {
    console.log(`refuse: changes outside allowlist (${outside.slice(0, 5).join(', ')})`);
    return;
  }

  // Stage only allowedPaths.
  for (const p of allowed) {
    execSync(`git add ${p}`, { stdio: 'ignore' });
  }

  const staged = Number(sh('git diff --cached --name-only | wc -l'));
  if (!staged) {
    console.log('skip: nothing staged after allowlist');
    return;
  }

  execSync('git commit -m "wip(auto): stale recovery"', { stdio: 'ignore' });

  st.lastAutoCommitAt = new Date().toISOString();
  await fsp.writeFile(statePath, JSON.stringify(st, null, 2) + '\n', 'utf8');
  execSync('git add infra/auto-commit-state.json', { stdio: 'ignore' });
  execSync('git commit -m "chore(infra): record auto-commit timestamp"', { stdio: 'ignore' });

  console.log('ok: auto product commit created');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
