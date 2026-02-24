#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const sh = (cmd) => execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8').trim();

const repoRoot = process.cwd();
const goal = JSON.parse(fs.readFileSync(path.join(repoRoot, 'infra', 'GOAL.json'), 'utf8'));
const statePath = path.join(repoRoot, 'infra', 'auto-commit-state.json');

let st;
try { st = JSON.parse(await fsp.readFile(statePath, 'utf8')); } catch { st = { schemaVersion: '0.1', lastAutoCommitAt: null }; }

const minutesSince = (iso) => {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.floor((Date.now() - t) / 60000);
};

const mins = minutesSince(st.lastAutoCommitAt);
const rateLimit = goal.autoCommit?.rateLimitMinutes ?? 60;
if (mins !== null && mins < rateLimit) {
  console.log(`skip: rate-limited (${mins}m since last auto commit)`);
  process.exit(0);
}

const changed = sh('git status --porcelain').split('\n').filter(Boolean);
if (changed.length === 0) {
  console.log('skip: clean');
  process.exit(0);
}

const files = changed.map((l) => l.trim().replace(/^[?MADRCU! ]+\s+/, ''));
const allowed = goal.allowedPaths;
const outside = files.filter((f) => !allowed.some((p) => f.startsWith(p)));
if (outside.length) {
  console.log(`refuse: changes outside allowlist (${outside.slice(0, 5).join(', ')})`);
  process.exit(0);
}

for (const p of allowed) execSync(`git add ${p}`, { stdio: 'ignore' });
const staged = Number(sh('git diff --cached --name-only | wc -l'));
if (!staged) {
  console.log('skip: nothing staged after allowlist');
  process.exit(0);
}

const msg = goal.autoCommit?.commitMessage ?? 'wip(auto): stale recovery';
execSync(`git commit -m "${msg.replace(/\"/g,'')}"`, { stdio: 'ignore' });

st.lastAutoCommitAt = new Date().toISOString();
await fsp.writeFile(statePath, JSON.stringify(st, null, 2) + '\n', 'utf8');
execSync('git add infra/auto-commit-state.json', { stdio: 'ignore' });
execSync('git commit -m "chore(infra): record auto-commit timestamp"', { stdio: 'ignore' });

console.log('ok: auto product commit created');
