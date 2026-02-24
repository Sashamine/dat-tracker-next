#!/usr/bin/env node
/**
 * Infra status helper.
 *
 * Examples:
 *   npx tsx scripts/infra/status.ts set running --detail "Filling country/exchangeMic"
 *   npx tsx scripts/infra/status.ts set blocked --reason "Need geo for 9 tickers" --need "Provide mapping" --default "Set UNKNOWN" 
 */
import fs from 'node:fs/promises';
import path from 'node:path';

type Mode = 'running' | 'blocked' | 'idle' | 'done';

type Status = {
  schemaVersion: string;
  mode: Mode;
  task: string;
  detail: string;
  blockedReason: string | null;
  neededDecision: string | null;
  defaultAction: string | null;
  lastProgressAt: string | null;
  updatedAt: string | null;
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

async function main() {
  const cmd = process.argv[2];
  if (!cmd || (cmd !== 'set' && cmd !== 'touch')) {
    console.error('Usage: status.ts set <running|blocked|idle|done> [--detail ...] [--reason ...] [--need ...] [--default ...]');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const statusPath = path.join(repoRoot, 'infra', 'STATUS.json');
  const histDir = path.join(repoRoot, 'infra', 'status-history');

  const raw = await fs.readFile(statusPath, 'utf8');
  const st = JSON.parse(raw) as Status;

  const now = new Date().toISOString();

  if (cmd === 'touch') {
    st.lastProgressAt = now;
    st.updatedAt = now;
  } else {
    const mode = process.argv[3] as Mode;
    if (!mode || !['running', 'blocked', 'idle', 'done'].includes(mode)) {
      console.error('Mode must be one of: running|blocked|idle|done');
      process.exit(2);
    }
    st.mode = mode;
    st.detail = arg('detail') ?? st.detail ?? '';

    if (mode === 'blocked') {
      st.blockedReason = arg('reason') ?? st.blockedReason ?? 'unspecified';
      st.neededDecision = arg('need') ?? st.neededDecision ?? 'unspecified';
      st.defaultAction = arg('default') ?? st.defaultAction ?? null;
    } else {
      st.blockedReason = null;
      st.neededDecision = null;
      st.defaultAction = null;
    }

    st.lastProgressAt = now;
    st.updatedAt = now;
  }

  await fs.mkdir(histDir, { recursive: true });
  await fs.writeFile(statusPath, JSON.stringify(st, null, 2) + '\n', 'utf8');
  await fs.writeFile(path.join(histDir, `${now}.json`), JSON.stringify(st, null, 2) + '\n', 'utf8');
  console.log(`ok: ${st.mode} updatedAt=${st.updatedAt}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
