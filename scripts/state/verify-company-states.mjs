#!/usr/bin/env node
/**
 * JS runner (no tsx) for verifying company state JSONs.
 * Writes verification-runs/... and infra/latest-verified.json
 */
import fs from 'node:fs/promises';
import path from 'node:path';

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

async function readJson(p) {
  const raw = await fs.readFile(p, 'utf8');
  return JSON.parse(raw);
}

function isHardIssue(iss) {
  const hardPrefixes = ['schemaVersion_', 'read_failed', 'ticker_mismatch', 'invalid_'];
  for (const p of hardPrefixes) if (iss.startsWith(p)) return true;
  return false;
}

function summarize(report) {
  const failing = report.results.filter((r) => !r.ok);
  const topIssues = new Map();
  for (const r of failing) {
    for (const iss of [...r.hardIssues, ...r.warnIssues]) topIssues.set(iss, (topIssues.get(iss) ?? 0) + 1);
  }
  const top = Array.from(topIssues.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const lines = [];
  lines.push(`# CompanyState verification summary`);
  lines.push('');
  lines.push(`- total: ${report.total}`);
  lines.push(`- ok: ${report.okCount}`);
  lines.push(`- fail: ${report.failCount}`);
  lines.push('');
  if (failing.length) {
    lines.push('## Failing tickers');
    for (const r of failing.slice(0, 30)) {
      lines.push(`- ${r.ticker}: hard=[${r.hardIssues.join(', ')}] warn=[${r.warnIssues.join(', ')}]`);
    }
    if (failing.length > 30) lines.push(`- ...and ${failing.length - 30} more`);
    lines.push('');
    lines.push('## Top issues');
    for (const [k, n] of top) lines.push(`- ${k}: ${n}`);
  }
  lines.push('');
  return lines.join('\n') + '\n';
}

async function main() {
  const repoRoot = process.cwd();
  const statesRoot = path.join(repoRoot, 'states');

  const runId = (arg('runId') || new Date().toISOString()).replace(/[:.]/g, '-');
  const outDir = path.join(repoRoot, 'verification-runs', 'company-state', runId);
  await fs.mkdir(outDir, { recursive: true });

  const tickers = (await fs.readdir(statesRoot)).filter((t) => !t.startsWith('.'));
  const results = [];

  for (const ticker of tickers) {
    const issues = [];
    const p = path.join(statesRoot, ticker, 'latest.json');
    let j;
    try {
      j = await readJson(p);
    } catch (e) {
      results.push({ ticker, ok: false, hardIssues: [`read_failed:${String(e?.message ?? e)}`], warnIssues: [] });
      continue;
    }

    if (j.schemaVersion !== '0.1') issues.push('schemaVersion_not_0.1');

    // (keep using existing checks in TS file via JSON issues already embedded in latest.json shape)
    // NOTE: This runner is intentionally minimal; the authoritative rule-set remains in TS for now.

    if (j.ticker !== ticker) issues.push('ticker_mismatch');
    if (!j.asOf) issues.push('missing_asOf');
    if (!j.generatedAt) issues.push('missing_generatedAt');
    if (!j.listing?.country) issues.push('missing_listing.country');
    if (!j.listing?.exchangeMic) issues.push('missing_listing.exchangeMic');
    if (!j.listing?.currency) issues.push('missing_listing.currency');
    if (!j.holdings?.asset) issues.push('missing_holdings.asset');
    if (typeof j.holdings?.amount !== 'number' || Number.isNaN(j.holdings?.amount)) issues.push('invalid_holdings.amount');

    const hardIssues = issues.filter(isHardIssue);
    const warnIssues = issues.filter((x) => !isHardIssue(x));
    results.push({ ticker, ok: hardIssues.length === 0, hardIssues, warnIssues });
  }

  const okCount = results.filter((r) => r.ok).length;
  const report = {
    schemaVersion: '0.1',
    runId,
    total: results.length,
    okCount,
    failCount: results.length - okCount,
    results,
  };

  const reportPath = path.join(outDir, 'report.json');
  const summaryPath = path.join(outDir, 'SUMMARY.md');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  await fs.writeFile(summaryPath, summarize(report), 'utf8');

  const latestVerifiedPath = path.join(repoRoot, 'infra', 'latest-verified.json');
  const latestVerified = {
    schemaVersion: '0.1',
    generatedAt: new Date().toISOString(),
    runId,
    total: results.length,
    okCount,
    failCount: results.length - okCount,
    okTickers: results.filter((r) => r.ok).map((r) => r.ticker).sort(),
  };
  await fs.writeFile(latestVerifiedPath, JSON.stringify(latestVerified, null, 2) + '\n', 'utf8');

  console.log(`ok: wrote ${path.relative(repoRoot, reportPath)} and SUMMARY.md (ok=${okCount}/${results.length})`);
  process.exit(report.failCount ? 2 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
