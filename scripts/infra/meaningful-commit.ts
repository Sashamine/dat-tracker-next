#!/usr/bin/env node
/**
 * Prints the last meaningful commit hash (per infra/GOAL.json), else exits 1.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

type Goal = {
  schemaVersion: string;
  goal: string;
  allowedPaths: string[];
  disallowCommitPrefixes: string[];
  ignoreOnlyPaths: string[];
};

function sh(cmd: string): string {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8').trim();
}

function loadGoal(repoRoot: string): Goal {
  const p = path.join(repoRoot, 'infra', 'GOAL.json');
  return JSON.parse(fs.readFileSync(p, 'utf8')) as Goal;
}

function subjectOf(hash: string): string {
  return sh(`git log -1 --pretty=format:%s ${hash}`);
}

function changedFiles(hash: string): string[] {
  const out = sh(`git show --name-only --pretty=format: ${hash}`);
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

function touchesAllowed(files: string[], allowed: string[]): boolean {
  return files.some((f) => allowed.some((p) => f.startsWith(p)));
}

function onlyTouchesIgnored(files: string[], ignoreOnly: string[]): boolean {
  return files.length > 0 && files.every((f) => ignoreOnly.includes(f));
}

function main() {
  const repoRoot = process.cwd();
  const goal = loadGoal(repoRoot);

  const hashes = sh('git log --pretty=format:%H -n 200').split('\n').filter(Boolean);

  for (const h of hashes) {
    const subj = subjectOf(h);
    if (goal.disallowCommitPrefixes.some((p) => subj.startsWith(p))) continue;

    const files = changedFiles(h);
    if (onlyTouchesIgnored(files, goal.ignoreOnlyPaths)) continue;

    if (!touchesAllowed(files, goal.allowedPaths)) continue;

    process.stdout.write(h + '\n');
    process.exit(0);
  }

  process.exit(1);
}

main();
