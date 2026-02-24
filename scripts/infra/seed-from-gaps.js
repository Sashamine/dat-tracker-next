#!/usr/bin/env node
// Deterministic seeder: convert top verification gaps into TODO tasks.
import fs from 'node:fs/promises';
import path from 'node:path';

async function readJson(p) {
  const raw = await fs.readFile(p, 'utf8');
  return JSON.parse(raw);
}

async function findProvenancePath(repoRoot, ticker) {
  const provDir = path.join(repoRoot, 'src', 'lib', 'data', 'provenance');
  try {
    const entries = await fs.readdir(provDir);
    const t = String(ticker).toLowerCase();
    for (const e of entries) {
      if (!e.endsWith('.ts')) continue;
      const base = e.replace(/\.ts$/, '');
      if (base.toLowerCase() === t) return path.join('src/lib/data/provenance', e);
    }
  } catch {}
  return null;
}

async function main() {
  const repoRoot = process.cwd();
  const gapsPath = path.join(repoRoot, 'infra', 'verification-gaps.json');
  const queuePath = path.join(repoRoot, 'infra', 'work-queue.json');

  const gapsJ = await readJson(gapsPath);
  const gaps = gapsJ.gaps || {};

  let q;
  try {
    q = await readJson(queuePath);
  } catch {
    q = { schemaVersion: '0.1', queue: [] };
  }
  q.queue ||= [];

  const existing = new Set(q.queue.map((t) => t.id));

  // Map issues to known deterministic code tasks (handlers exist or can be added safely).
  const issueToTask = {
    missing_cash_asof: 'verifier_cash_asof',
    missing_debt_asof: 'verifier_debt_asof',
    missing_preferred_asof: 'verifier_preferred_asof',
    missing_staking_evidence: 'verifier_mark_missing_staking_source',
    missing_sec_holdings_evidence: 'verifier_holdings_sec_evidence',
    missing_sec_shares_evidence: 'verifier_shares_sec_evidence',
  };

  // Choose top issues by count.
  const top = Object.entries(gaps)
    .map(([k, v]) => ({ issue: k, count: (v || []).length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  let added = 0;
  for (const { issue } of top) {
    const taskId = issueToTask[issue];
    if (!taskId) continue;
    if (existing.has(taskId)) continue;
    q.queue.push({
      id: taskId,
      type: 'verifier-rule',
      status: 'todo',
      description: `Seeded from gaps: ${issue}`,
      allowedPaths: ['scripts/state/'],
      commitMessage: `feat(state): verifier rule seeded from gaps (${issue})`,
    });
    existing.add(taskId);
    added++;
  }

  await fs.writeFile(queuePath, JSON.stringify(q, null, 2) + '\n', 'utf8');

  // Also seed human data TODOs for top issues.
  // Also seed deterministic overrides stubs for certain issues.
  const overrideMap = {
  };

  async function mergeJsonFile(fp, patch) {
    let cur = {};
    try { cur = JSON.parse(await fs.readFile(fp, 'utf8')); } catch {}
    const merged = (function deepMerge(a, b) {
      if (!a || typeof a !== 'object' || Array.isArray(a)) return b ?? a;
      if (!b || typeof b !== 'object' || Array.isArray(b)) return b ?? a;
      const o = { ...a };
      for (const [k, v] of Object.entries(b)) {
        o[k] = deepMerge(a[k], v);
      }
      return o;
    })(cur, patch);
    await fs.writeFile(fp, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  }

  let overridesTouched = 0;
  for (const { issue } of top) {
    const patch = overrideMap[issue];
    if (!patch) continue;
    const tickers = (gaps[issue] || []).slice(0, 10);
    for (const t of tickers) {
      const dir = path.join(repoRoot, 'states', t);
      await fs.mkdir(dir, { recursive: true });
      const fp = path.join(dir, 'overrides.json');
      await mergeJsonFile(fp, patch);
      overridesTouched++;
    }
  }
  const todosRoot = path.join(repoRoot, 'todos');
  await fs.mkdir(todosRoot, { recursive: true });
  let todoCreated = 0;
  for (const { issue } of top) {
    const tickers = (gaps[issue] || []).slice(0, 10);
    for (const t of tickers) {
      const dir = path.join(todosRoot, t);
      await fs.mkdir(dir, { recursive: true });
      const fp = path.join(dir, `${issue}.md`);
      try {
        await fs.access(fp);
        continue;
      } catch {}
      let pathHint = null;
      if (issue === 'missing_debt_evidence') pathHint = 'balanceSheet.source.debtSourceUrl';
      if (issue === 'missing_cash_evidence') pathHint = 'balanceSheet.source.cashSourceUrl';
      if (issue === 'missing_preferred_evidence') pathHint = 'balanceSheet.source.preferredSourceUrl';
      if (issue === 'missing_cash_asof' || issue === 'missing_debt_asof' || issue === 'missing_preferred_asof') pathHint = 'balanceSheet.asOf';
      if (issue === 'missing_holdings_source') pathHint = 'holdings.source.holdingsSource';
      if (issue === 'missing_shares_source') pathHint = 'shares.source.sharesSourceUrl (or sharesSource)';

      const prov = await findProvenancePath(repoRoot, t);
      const preferred = prov ? prov : 'src/lib/data/companies.ts';
      const body = `# TODO: ${t} — ${issue}

Generated from infra/verification-gaps.json.

- Issue: \`${issue}\`
- Field: ${pathHint ? '`' + pathHint + '`' : '(see verifier)'}
- Preferred edit: \`${preferred}\`
- Stopgap: \`states/${t}/overrides.json\`

`;
      await fs.writeFile(fp, body, 'utf8');
      todoCreated++;
    }
  }
  console.log(`ok: seeded ${added} tasks, todos ${todoCreated}`);
}

main().catch((e) => {
  console.error('error:', e?.message || e);
  process.exit(1);
});
