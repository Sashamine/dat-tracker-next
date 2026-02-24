#!/usr/bin/env node
/**
 * Apply preferredEquity from SEC companyfacts to companies.ts (fill-missing only).
 * Tier-1: us-gaap:PreferredStockValue.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const MAX_AGE_DAYS = 1095; // 3 years

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
    return;
  }

  if (extracted.preferredAsOf) {
    const ageDays = (Date.now() - Date.parse(extracted.preferredAsOf)) / 86400000;
    if (Number.isFinite(ageDays) && ageDays > MAX_AGE_DAYS) {
      await dlqPush({
        kind: 'preferred_extract_stale',
        ticker,
        at: new Date().toISOString(),
        secCik,
        extracted,
        ageDays,
        maxAgeDays: MAX_AGE_DAYS,
        note: 'extracted preferred is older than freshness threshold; not applying',
      });
      console.log('dlq: extracted preferred is stale');
      return;
    }
  }

  let newBlock = block;
  // Insert after totalDebt (or restrictedCash as fallback)
  if (/totalDebt:[^\n]*\n/.test(newBlock)) {
    newBlock = newBlock.replace(/totalDebt:[^\n]*\n/, (m0) => m0 + `    preferredEquity: ${Math.round(extracted.preferredEquity)},\n`);
  } else {
    newBlock = newBlock.replace(/restrictedCash:[^\n]*\n/, (m0) => m0 + `    preferredEquity: ${Math.round(extracted.preferredEquity)},\n`);
  }

  newBlock = newBlock.replace(/preferredEquity:[^\n]*\n/, (m0) =>
    m0 + `    preferredAsOf: \"${extracted.preferredAsOf}\",\n`
  );
  if (extracted.preferredSourceUrl) {
    newBlock = newBlock.replace(/preferredAsOf:[^\n]*\n/, (m0) =>
      m0 + `    preferredSourceUrl: \"${extracted.preferredSourceUrl}\",\n`
    );
  }

  const out = src.slice(0, span.start) + newBlock + src.slice(span.end);
  await fs.writeFile(companiesPath, out, 'utf8');
  console.log(`ok: filled preferred for ${ticker} via ${extracted.tag}`);
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
