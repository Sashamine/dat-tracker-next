#!/usr/bin/env node
// Prints the last meaningful commit hash (per infra/GOAL.json), else exits 1.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const sh = (cmd) => execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8').trim();

const repoRoot = process.cwd();
const goalPath = path.join(repoRoot, 'infra', 'GOAL.json');
const goal = JSON.parse(fs.readFileSync(goalPath, 'utf8'));

const subjectOf = (hash) => sh(`git log -1 --pretty=format:%s ${hash}`);
const changedFiles = (hash) => sh(`git show --name-only --pretty=format: ${hash}`).split('\n').map(s=>s.trim()).filter(Boolean);
const touchesAllowed = (files) => files.some(f => goal.allowedPaths.some(p => f.startsWith(p)));
const onlyTouchesIgnored = (files) => files.length > 0 && files.every(f => (goal.ignoreOnlyPaths||[]).includes(f));

const hashes = sh('git log --pretty=format:%H -n 200').split('\n').filter(Boolean);

for (const h of hashes) {
  const subj = subjectOf(h);
  if ((goal.disallowCommitPrefixes||[]).some(p => subj.startsWith(p))) continue;
  const files = changedFiles(h);
  if (onlyTouchesIgnored(files)) continue;
  if (!touchesAllowed(files)) continue;
  process.stdout.write(h + '\n');
  process.exit(0);
}
process.exit(1);
