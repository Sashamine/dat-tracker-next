#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const sh = (cmd) => execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8').trim();

async function main() {
  const repoRoot = process.cwd();
  const statePath = path.join(repoRoot, 'infra', 'monitor-auditor.json');

  const out = sh('node scripts/infra/monitor.js');
  if (!out.startsWith('ALERT')) return;

  const sig = (out.split('|')[0] || out).trim();

  let st;
  try {
    st = JSON.parse(await fs.readFile(statePath, 'utf8'));
  } catch {
    st = { schemaVersion: '0.1', lastAlertSignature: null, consecutiveAlerts: 0, updatedAt: null };
  }

  if (st.lastAlertSignature === sig) st.consecutiveAlerts += 1;
  else st.consecutiveAlerts = 1;

  st.lastAlertSignature = sig;
  st.updatedAt = new Date().toISOString();

  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, JSON.stringify(st, null, 2) + '\n', 'utf8');

  if (st.consecutiveAlerts >= 2) {
    try {
      sh('node scripts/infra/auto-product-commit.js');
    } catch {}

    execSync(
      'npx -y tsx scripts/infra/status.ts set blocked --reason "Auditor auto-block: consecutive staleness" --need "Ship meaningful product micro-commit (allowedPaths)" --default "Create stub in allowedPaths and commit"',
      { stdio: 'ignore' }
    );
  }

  let suggestion = '';
  try {
    suggestion = sh('node scripts/infra/next-action.ts');
  } catch {
    suggestion = 'ship a meaningful micro-commit touching allowedPaths';
  }

  console.log(out);
  console.log(`COMMIT_NOW: ${suggestion}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
