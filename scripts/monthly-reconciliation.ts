#!/usr/bin/env npx tsx

/**
 * Monthly Reconciliation — Full-System Sweep
 *
 * Wrapper that runs existing verification tools in one place and
 * produces a consolidated report. Not a new framework — just
 * orchestrates existing scripts.
 *
 * Usage:
 *   npx tsx scripts/monthly-reconciliation.ts
 */

import { execSync } from 'child_process';
import { allCompanies } from '../src/lib/data/companies';
import {
  getAllCompanyReviews,
  getReviewQueue,
  STALE_HOLDINGS_DAYS,
} from '../src/lib/data/integrity-review';
import { ASSUMPTIONS, ASSUMPTION_REVIEW_MAX_AGE_DAYS } from '../src/lib/data/assumptions';
import { MARKET_CAP_OVERRIDES } from '../src/lib/data/market-cap-overrides';

const today = new Date().toISOString().split('T')[0];

function run(label: string, cmd: string): { success: boolean; output: string } {
  console.log(`\n  Running: ${label}...`);
  try {
    const output = execSync(cmd, { encoding: 'utf-8', timeout: 120_000, stdio: ['pipe', 'pipe', 'pipe'] });
    console.log(`  ✅ ${label}: passed`);
    return { success: true, output };
  } catch (err: any) {
    const output = (err.stdout || '') + (err.stderr || '');
    console.log(`  ❌ ${label}: failed`);
    // Print a summary, not the full output
    const lines = output.split('\n');
    const failLines = lines.filter((l: string) => /FAIL|Error|error/i.test(l)).slice(0, 10);
    if (failLines.length > 0) {
      for (const line of failLines) console.log(`     ${line.trim()}`);
    }
    return { success: false, output };
  }
}

console.log(`\n${'═'.repeat(60)}`);
console.log(`  MONTHLY RECONCILIATION — ${today}`);
console.log(`  ${allCompanies.length} companies`);
console.log(`${'═'.repeat(60)}`);

// ── 1. TypeScript Compilation ───────────────────────────────────────

const tsc = run('TypeScript compilation', 'npx tsc --noEmit');

// ── 2. Cross-Check Data Integrity ───────────────────────────────────

const crossCheck = run('Cross-check data integrity', 'npx tsx scripts/cross-check-data.ts');

// ── 3. Shares Consistency ───────────────────────────────────────────

const sharesConsistency = run('Shares consistency', 'npx vitest run shares-consistency --reporter=verbose 2>&1');

// ── 4. Assumption Tests ─────────────────────────────────────────────

const assumptionTests = run('Assumption register tests', 'npx vitest run assumptions --reporter=verbose 2>&1');

// ── 5. D1 vs Static Drift ──────────────────────────────────────────

let d1Drift: { success: boolean; output: string };
if (process.env.CLOUDFLARE_ACCOUNT_ID) {
  d1Drift = run('D1 vs static drift', 'npx tsx scripts/sync-d1-to-companies.ts');
} else {
  console.log('\n  ⏭️  D1 drift check: skipped (no CLOUDFLARE_ACCOUNT_ID)');
  d1Drift = { success: true, output: 'skipped' };
}

// ── 6. Review Classification Summary ────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log('  REVIEW CLASSIFICATION SUMMARY');
console.log(`${'─'.repeat(60)}`);

const reviews = getAllCompanyReviews(allCompanies);
const queue = getReviewQueue(allCompanies);

const byConf = { high: 0, medium: 0, low: 0 };
for (const r of reviews) byConf[r.confidence]++;

console.log(`\n  Confidence: 🟢 ${byConf.high}  🟡 ${byConf.medium}  🔴 ${byConf.low}`);
console.log(`  SEC Pipeline: ${reviews.filter(r => r.isInSecPipeline).length} covered, ${reviews.filter(r => !r.isInSecPipeline).length} manual`);

if (queue.lowConfidence.length > 0) {
  console.log(`\n  Low confidence companies:`);
  for (const r of queue.lowConfidence) {
    console.log(`    ${r.ticker}: ${r.confidenceReasons.join('; ')}`);
  }
}

// ── 7. Assumption Register Age ──────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log('  ASSUMPTION REGISTER');
console.log(`${'─'.repeat(60)}`);

const open = ASSUMPTIONS.filter(a => a.status === 'open');
const monitoring = ASSUMPTIONS.filter(a => a.status === 'monitoring');
const resolved = ASSUMPTIONS.filter(a => a.status === 'resolved');

console.log(`\n  Open: ${open.length}  Monitoring: ${monitoring.length}  Resolved: ${resolved.length}`);

for (const a of [...open, ...monitoring]) {
  const age = Math.floor((Date.now() - new Date(a.lastReviewed).getTime()) / (1000 * 60 * 60 * 24));
  const stale = age > ASSUMPTION_REVIEW_MAX_AGE_DAYS ? ' ⚠️ OVERDUE' : '';
  console.log(`  [${a.status}] ${a.ticker}.${a.field}: ${age}d since review${stale}`);
  console.log(`         ${a.assumption}`);
}

// ── 8. Override Inventory ───────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log('  OVERRIDE INVENTORY');
console.log(`${'─'.repeat(60)}`);

const overrides = Object.entries(MARKET_CAP_OVERRIDES);
console.log(`\n  ${overrides.length} MARKET_CAP_OVERRIDES:`);
for (const [ticker, value] of overrides) {
  const company = allCompanies.find(c => c.ticker === ticker);
  const name = company?.name || 'unknown';
  console.log(`    ${ticker} (${name}): $${(value / 1e6).toFixed(0)}M`);
}

// ── 9. Foreign Company Freshness ────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log('  FOREIGN COMPANY FRESHNESS');
console.log(`${'─'.repeat(60)}`);

const foreignReviews = reviews.filter(r => !r.isInSecPipeline);
if (foreignReviews.length === 0) {
  console.log('\n  (none)');
} else {
  for (const r of foreignReviews.sort((a, b) => (b.holdingsAgeDays ?? 0) - (a.holdingsAgeDays ?? 0))) {
    const age = r.holdingsAgeDays !== null ? `${r.holdingsAgeDays}d` : 'unknown';
    const flag = (r.holdingsAgeDays ?? 0) > STALE_HOLDINGS_DAYS ? ' ⚠️' : '';
    console.log(`    ${r.ticker}: holdings ${age} old${flag}`);
  }
}

// ── Final Summary ───────────────────────────────────────────────────

console.log(`\n${'═'.repeat(60)}`);
console.log('  RESULTS');
console.log(`${'═'.repeat(60)}`);

const checks = [
  { name: 'TypeScript', ...tsc },
  { name: 'Cross-check', ...crossCheck },
  { name: 'Shares consistency', ...sharesConsistency },
  { name: 'Assumption tests', ...assumptionTests },
  { name: 'D1 drift', ...d1Drift },
];

let allPassed = true;
for (const c of checks) {
  const icon = c.success ? '✅' : '❌';
  console.log(`  ${icon} ${c.name}`);
  if (!c.success) allPassed = false;
}

console.log(`\n  Low confidence: ${queue.lowConfidence.length}`);
console.log(`  Open assumptions: ${open.length}`);
console.log(`  Overrides: ${overrides.length}`);
console.log(`  Foreign companies: ${foreignReviews.length}`);

console.log(`\n${'═'.repeat(60)}\n`);

if (!allPassed) process.exit(1);
