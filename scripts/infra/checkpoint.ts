#!/usr/bin/env node
/**
 * checkpoint: force a durable commit, even from a clean tree.
 *
 * Usage:
 *   npx tsx scripts/infra/checkpoint.ts "message"
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

function sh(cmd: string): string {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8').trim();
}

async function main() {
  const msg = (process.argv.slice(2).join(' ') || 'checkpoint').trim();
  const repoRoot = process.cwd();

  // Stage everything (including new files) so work becomes durable.
  execSync('git add -A', { stdio: 'inherit' });

  const dirty = Number(sh('git status --porcelain | wc -l'));
  if (dirty === 0) {
    // Create/append a tiny durable artifact.
    const p = path.join(repoRoot, 'infra', 'CHECKPOINT.md');
    const now = new Date().toISOString();
    const line = `- ${now} ${msg}\n`;
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.appendFile(p, line, 'utf8');
    execSync('git add infra/CHECKPOINT.md', { stdio: 'inherit' });
  }

  // Commit; allow empty just in case.
  execSync(`git commit --allow-empty -m "checkpoint: ${msg.replace(/\"/g, '')}"`, { stdio: 'inherit' });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
