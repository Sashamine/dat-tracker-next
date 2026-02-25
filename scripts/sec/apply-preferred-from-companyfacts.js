#!/usr/bin/env node
/**
 * Apply preferredEquity from SEC companyfacts to companies.ts (fill-missing only).
 * Tier-1: us-gaap:PreferredStockValue.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const MAX_AGE_DAYS = 1095; // 3 years

function isFiniteNonNegativeNumber(n) {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

function daysOld(isoDate) {
  const t = Date.parse(isoDate);
  if (!Number.isFinite(t)) return null;
  return (Date.now() - t) / 86400000;
}

async function execExtract(secCik) {
  const { spawnSync } = await import('node:child_process');
  const res = spawnSync('node', ['scripts/sec/extract-preferred-companyfacts.js', String(secCik)], { encoding: 'utf8' });
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

async function main() {
  const ticker = (process.argv[2] || '').trim();
  if (!ticker) {
    console.error('usage: apply-preferred-from-companyfacts.js <TICKER>');
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

  const hasPreferred = /preferredEquity:\s*[^,\n]+/.test(block);
  if (hasPreferred) {
    console.log('noop: preferred already present');
    return;
  }

  const secCik = secCikM[1];
  const extracted = await execExtract(secCik);
  if (!extracted) {
    console.log('noop: no extractable preferred');
    try {
      (await import('node:child_process')).execSync(
        `node ${path.join(process.cwd(), 'scripts/sec/no-extract-track.cjs')} preferred ${ticker}`,
        { stdio: 'inherit' },
      );
    } catch (e) {
      console.log(`warn: no-extract-track failed for preferred ${ticker}: ${e?.message || e}`);
    }
    return;
  }

  // Staleness flag (does not block fill-missing)
  const STALE_DAYS = 60;
  const isStale = Boolean(
    extracted.preferredAsOf &&
      Number.isFinite((Date.now() - Date.parse(extracted.preferredAsOf)) / 86400000) &&
      (Date.now() - Date.parse(extracted.preferredAsOf)) / 86400000 > STALE_DAYS,
  );

  // Guardrails
  if (!isFiniteNonNegativeNumber(extracted.preferredEquity)) {
    console.log(`noop: guardrail (invalid preferredEquity=${extracted.preferredEquity})`);
    return;
  }
  // Sanity cap: avoid poisoning data with unit mistakes (preferred in USD)
  if (extracted.preferredEquity > 2_000_000_000_000) {
    console.log(`noop: guardrail (preferredEquity too large=${extracted.preferredEquity})`);
    return;
  }
  const ageDays = extracted.preferredAsOf ? daysOld(extracted.preferredAsOf) : null;
  if (ageDays != null && ageDays > MAX_AGE_DAYS) {
    console.log(`noop: guardrail (preferred too old ageDays=${Math.round(ageDays)})`);
    return;
  }

  let newBlock = block;
  // Insert preferredEquity after totalDebt, else restrictedCash, else cashReserves, else burnAsOf, else secCik
  if (/totalDebt:[^\n]*\n/.test(newBlock)) {
    newBlock = newBlock.replace(/totalDebt:[^\n]*\n/, (m0) => m0 + `    preferredEquity: ${Math.round(extracted.preferredEquity)},\n`);
  } else if (/restrictedCash:[^\n]*\n/.test(newBlock)) {
    newBlock = newBlock.replace(/restrictedCash:[^\n]*\n/, (m0) => m0 + `    preferredEquity: ${Math.round(extracted.preferredEquity)},\n`);
  } else {
    const anchor = /cashReserves:[^\n]*\n|burnAsOf:[^\n]*\n|secCik:[^\n]*\n/;
    if (anchor.test(newBlock)) {
      newBlock = newBlock.replace(anchor, (m0) => m0 + `    preferredEquity: ${Math.round(extracted.preferredEquity)},\n`);
    }
  }

  newBlock = newBlock.replace(/preferredEquity:[^\n]*\n/, (m0) =>
    m0 + `    preferredAsOf: \"${extracted.preferredAsOf}\",\n`
  );
  if (extracted.preferredSourceUrl) {
    newBlock = newBlock.replace(/preferredAsOf:[^\n]*\n/, (m0) =>
      m0 + `    preferredSourceUrl: \"${extracted.preferredSourceUrl}\",\n`
    );
  }
  // Stale warning (insert-only): add dataWarnings if none exists
  if (isStale && !/\bdataWarnings\s*:/.test(newBlock)) {
    const msg = `Balance sheet data may be stale (preferred as-of ${extracted.preferredAsOf}).`;
    newBlock = newBlock.replace(/preferredSourceUrl:[^\n]*\n/, (m0) =>
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
    console.log('noop: preferred insert failed (no anchor found)');
    return;
  }

  const out = src.slice(0, span.start) + newBlock + src.slice(span.end);
  await fs.writeFile(companiesPath, out, 'utf8');
  console.log(`ok: filled preferred for ${ticker} via ${extracted.tag}`);
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
