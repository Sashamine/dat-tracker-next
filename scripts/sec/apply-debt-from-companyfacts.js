#!/usr/bin/env node
/**
 * Apply totalDebt from SEC companyfacts to companies.ts (fill-missing only).
 * - If company has secCik and totalDebt/debtAsOf/debtSourceUrl missing -> fill.
 * - If any already present -> DLQ (no overwrite).
 */
import fs from 'node:fs/promises';
import path from 'node:path';

async function execExtract(secCik) {
  // Reuse extractor by spawning node (keeps logic centralized).
  const { spawnSync } = await import('node:child_process');
  const res = spawnSync('node', ['scripts/sec/extract-debt-companyfacts.js', String(secCik)], { encoding: 'utf8' });
  if (res.status !== 0) return null;
  try {
    return JSON.parse(res.stdout);
  } catch {
    return null;
  }
}

function findCompanyObjectBlock(src, ticker) {
  const needle = `ticker: "${ticker}"`;
  const idx = src.indexOf(needle);
  if (idx === -1) return null;
  let start = idx;
  while (start >= 0 && src[start] !== '{') start--;
  if (start < 0) return null;

  let i = start;
  let depth = 0;
  let inStr = false;
  let strCh = '';
  let esc = false;

  for (; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (ch === '\\') {
        esc = true;
        continue;
      }
      if (ch === strCh) {
        inStr = false;
        strCh = '';
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = true;
      strCh = ch;
      continue;
    }
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return { start, end: i + 1 };
    }
  }
  return null;
}

async function dlqPush(item) {
  const dlqPath = path.join(process.cwd(), 'infra', 'dlq-extract.json');
  let dlq = { schemaVersion: '0.1', items: [] };
  try {
    dlq = JSON.parse(await fs.readFile(dlqPath, 'utf8'));
  } catch {}
  dlq.items.push(item);
  await fs.mkdir(path.dirname(dlqPath), { recursive: true });
  await fs.writeFile(dlqPath, JSON.stringify(dlq, null, 2) + '\n', 'utf8');
}

const MAX_AGE_DAYS = 1095; // 3 years

async function main() {
  const ticker = (process.argv[2] || '').trim();
  if (!ticker) {
    console.error('usage: apply-debt-from-companyfacts.js <TICKER>');
    process.exit(2);
  }

  const companiesPath = path.join(process.cwd(), 'src/lib/data/companies.ts');
  const src = await fs.readFile(companiesPath, 'utf8');
  const span = findCompanyObjectBlock(src, ticker);
  if (!span) throw new Error('ticker_block_not_found');
  const block = src.slice(span.start, span.end);

  const secCikM = block.match(/secCik:\s*"(\d{1,10})"/);
  if (!secCikM) {
    console.log('noop: no secCik');
    return;
  }

  const secCik = secCikM[1];
  const extracted = await execExtract(secCik);
  if (!extracted) {
    console.log('noop: no extractable debt');
    try {
      (await import('node:child_process')).execSync(
        `node ${path.join(process.cwd(), 'scripts/sec/no-extract-track.cjs')} debt ${ticker}`,
        { stdio: 'inherit' },
      );
    } catch (e) {
      console.log(`warn: no-extract-track failed for debt ${ticker}: ${e?.message || e}`);
    }
    return;
  }

  // Staleness flag (does not block fill-missing)
  const STALE_DAYS = 60;
  const isStale = Boolean(
    extracted.debtAsOf &&
      Number.isFinite((Date.now() - Date.parse(extracted.debtAsOf)) / 86400000) &&
      (Date.now() - Date.parse(extracted.debtAsOf)) / 86400000 > STALE_DAYS,
  );

  const hasDebt = /totalDebt:\s*[^,\n]+/.test(block);
  const hasAsOf = /debtAsOf:\s*"?\d{4}-\d{2}-\d{2}"?/.test(block);
  const hasUrl = /debtSourceUrl:\s*"https?:\/\//.test(block);

  // Only apply when the core numeric field is missing (avoid touching curated entries just to backfill URL/date)
  const eligible = !hasDebt;
  if (!eligible) {
    console.log('noop: debt already present (not backfilling)');
    return;
  }

  let newBlock = block;
  if (!hasDebt) {
    // Primary anchor: insert after preferredEquity
    if (/preferredEquity:[^\n]*\n/.test(newBlock)) {
      newBlock = newBlock.replace(/preferredEquity:[^\n]*\n/, (m0) => m0 + `    totalDebt: ${Math.round(extracted.totalDebt)},\n`);
    } else {
      // Fallback: insert after restrictedCash if present, else after cashReserves, else after burnAsOf, else after secCik.
      const anchor = /restrictedCash:[^\n]*\n|cashReserves:[^\n]*\n|burnAsOf:[^\n]*\n|secCik:[^\n]*\n/;
      if (anchor.test(newBlock)) {
        newBlock = newBlock.replace(anchor, (m0) => m0 + `    totalDebt: ${Math.round(extracted.totalDebt)},\n`);
      }
    }
  }
  if (!hasAsOf) {
    newBlock = newBlock.replace(/totalDebt:[^\n]*\n/, (m0) => m0 + `    debtAsOf: \"${extracted.debtAsOf}\",\n`);
  }
  if (!hasUrl && extracted.debtSourceUrl) {
    newBlock = newBlock.replace(/debtAsOf:[^\n]*\n/, (m0) => m0 + `    debtSourceUrl: \"${extracted.debtSourceUrl}\",\n`);
  }
  // Stale warning (insert-only): add dataWarnings if none exists
  if (isStale && !/\bdataWarnings\s*:/.test(newBlock)) {
    const msg = `Balance sheet data may be stale (debt as-of ${extracted.debtAsOf}).`;
    newBlock = newBlock.replace(/debtSourceUrl:[^\n]*\n/, (m0) =>
      m0 +
      `    dataWarnings: [\n` +
      `      {\n` +
      `        type: \"stale-data\",\n` +
      `        message: \"${msg}\",\n` +
      `        severity: \"warning\",\n` +
      `      },\n` +
      `    ],\n`,
    );
  }

  if (newBlock === block) {
    console.log('noop: debt insert failed (no anchor found)');
    return;
  }

  const out = src.slice(0, span.start) + newBlock + src.slice(span.end);
  await fs.writeFile(companiesPath, out, 'utf8');
  console.log(`ok: filled debt for ${ticker} via ${extracted.parts?.[0]?.tag || 'companyfacts'}`);
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
