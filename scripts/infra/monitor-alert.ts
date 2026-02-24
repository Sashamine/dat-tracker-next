#!/usr/bin/env node
/**
 * monitor-alert: runs monitor, maintains monitor-state.json, and auto-blocks on 2 consecutive alerts.
 * Prints ONLY when there is an ALERT.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

type MonitorState = {
  schemaVersion: string;
  lastAlertSignature: string | null;
  consecutiveAlerts: number;
  updatedAt: string | null;
};

function sh(cmd: string): string {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8').trim();
}

async function main() {
  const repoRoot = process.cwd();
  const statePath = path.join(repoRoot, 'infra', 'monitor-state.json');

  const out = sh('npx -y tsx scripts/infra/monitor.ts');
  if (!out.startsWith('ALERT')) return; // stay silent on OK

  // Signature: use the reason chunk after "ALERT " up to " | mode="
  const sig = (out.split('|')[0] || out).trim();

  let st: MonitorState;
  try {
    st = JSON.parse(await fs.readFile(statePath, 'utf8')) as MonitorState;
  } catch {
    st = { schemaVersion: '0.1', lastAlertSignature: null, consecutiveAlerts: 0, updatedAt: null };
  }

  if (st.lastAlertSignature === sig) st.consecutiveAlerts += 1;
  else st.consecutiveAlerts = 1;

  st.lastAlertSignature = sig;
  st.updatedAt = new Date().toISOString();

  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, JSON.stringify(st, null, 2) + '\n', 'utf8');

  // Auto-block on second consecutive alert.
  if (st.consecutiveAlerts >= 2) {
    execSync(
      'npx -y tsx scripts/infra/status.ts set blocked --reason "Auto-block: consecutive staleness alerts" --need "Run checkpoint commit" --default "npm run checkpoint -- auto-checkpoint"',
      { stdio: 'ignore' }
    );
  }

  // Print the alert + action.
  console.log(out);
  console.log('ACTION: run `npm run checkpoint -- "wip"` (or set real NEED/DEFAULT if truly blocked).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
