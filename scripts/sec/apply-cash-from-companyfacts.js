#!/usr/bin/env node
/**
 * Apply cash from SEC companyfacts to companies.ts (fill-missing only).
 * Robustly extracts the Company object block via brace matching (no brittle regex across nested arrays).
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const CANDIDATES = [
  { ns: 'us-gaap', tag: 'CashAndCashEquivalentsAtCarryingValue' },
  { ns: 'ifrs-full', tag: 'CashAndCashEquivalents' },
];

function toCik10(cik) {
  return String(cik).replace(/\D/g, '').padStart(10, '0');
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'dat-tracker-next/0.1 (local)' } });
  if (!res.ok) throw new Error(`fetch_failed:${res.status}:${url}`);
  return await res.json();
}

function pickLatestUsdFact(arr) {
  const rows = (arr || []).filter((r) => r && typeof r.val === 'number' && r.end);
  rows.sort((a, b) => String(b.end).localeCompare(String(a.end)));
  return rows[0] || null;
}

function pickTagNode(facts) {
  for (const c of CANDIDATES) {
    const node = facts?.facts?.[c.ns]?.[c.tag];
    if (node?.units?.USD?.length) return { ...c, node };
  }
  return null;
}

async function extractCash(secCik) {
  const cik10 = toCik10(secCik);
  const facts = await fetchJson(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik10}.json`);
  const pickedNode = pickTagNode(facts);
  if (!pickedNode) return null;
  const picked = pickLatestUsdFact(pickedNode.node.units.USD);
  if (!picked) return null;

  let filingUrl = null;
  if (picked.accn) {
    const cikNum = cik10.replace(/^0+/, '');
    const accNoDash = String(picked.accn).replace(/-/g, '');
    filingUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNoDash}/`;
  }

  return {
    cashReserves: picked.val,
    cashAsOf: picked.end,
    cashSourceUrl: filingUrl,
    tag: `${pickedNode.ns}:${pickedNode.tag}`,
    picked,
  };
}

function findCompanyObjectBlock(src, ticker) {
  const needle = `ticker: "${ticker}"`;
  const idx = src.indexOf(needle);
  if (idx === -1) return null;

  // Walk backwards to the opening '{' of this object.
  let start = idx;
  while (start >= 0 && src[start] !== '{') start--;
  if (start < 0) return null;

  // Walk forwards counting braces, skipping strings.
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
      if (depth === 0) {
        // include trailing comma/newline if present
        const end = i + 1;
        return { start, end };
      }
    }
  }

  return null;
}

const MAX_AGE_DAYS = 548; // ~18 months

async function main() {
  const ticker = (process.argv[2] || '').trim();
  if (!ticker) {
    console.error('usage: apply-cash-from-companyfacts.js <TICKER>');
    process.exit(2);
  }

  const companiesPath = path.join(process.cwd(), 'src/lib/data/companies.ts');
  const companiesSrc = await fs.readFile(companiesPath, 'utf8');

  const span = findCompanyObjectBlock(companiesSrc, ticker);
  if (!span) throw new Error('ticker_block_not_found');
  const block = companiesSrc.slice(span.start, span.end);

  const secCikM = block.match(/secCik:\s*"(\d{1,10})"/);
  if (!secCikM) {
    console.log('noop: no secCik');
    return;
  }

  const secCik = secCikM[1];
  const extracted = await extractCash(secCik);
  if (!extracted) {
    console.log('noop: no extractable cash');
    return;
  }

  // Freshness guard: avoid filling with stale cash facts
  if (extracted.cashAsOf) {
    const ageDays = (Date.now() - Date.parse(extracted.cashAsOf)) / 86400000;
    if (Number.isFinite(ageDays) && ageDays > MAX_AGE_DAYS) {
      const dlqPath = path.join(process.cwd(), 'infra', 'dlq-extract.json');
      let dlq = { schemaVersion: '0.1', items: [] };
      try { dlq = JSON.parse(await fs.readFile(dlqPath, 'utf8')); } catch {}
      dlq.items.push({
        kind: 'cash_extract_stale',
        ticker,
        at: new Date().toISOString(),
        secCik,
        extracted,
        ageDays,
        maxAgeDays: MAX_AGE_DAYS,
        note: 'extracted cash is older than freshness threshold; not applying',
      });
      await fs.mkdir(path.dirname(dlqPath), { recursive: true });
      await fs.writeFile(dlqPath, JSON.stringify(dlq, null, 2) + '\n', 'utf8');
      console.log('dlq: extracted cash is stale');
      return;
    }
  }

  const hasCashReserves = /cashReserves:\s*[^,\n]+/.test(block);
  const hasCashAsOf = /cashAsOf:\s*"?\d{4}-\d{2}-\d{2}"?/.test(block);
  const hasCashUrl = /cashSourceUrl:\s*"https?:\/\//.test(block);

  // Only apply when the core numeric field is missing (avoid touching curated entries just to backfill URL/date)
  const eligible = !hasCashReserves;

  if (!eligible) {
    const dlqPath = path.join(process.cwd(), 'infra', 'dlq-extract.json');
    let dlq = { schemaVersion: '0.1', items: [] };
    try {
      dlq = JSON.parse(await fs.readFile(dlqPath, 'utf8'));
    } catch {}
    dlq.items.push({
      kind: 'cash_extract_conflict',
      ticker,
      at: new Date().toISOString(),
      secCik,
      extracted,
      note: 'company already has cash fields; fill-missing-only policy prevented overwrite',
    });
    await fs.mkdir(path.dirname(dlqPath), { recursive: true });
    await fs.writeFile(dlqPath, JSON.stringify(dlq, null, 2) + '\n', 'utf8');
    console.log('dlq: cash already present (not backfilling)');
    return;
  }

  let newBlock = block;
  if (!hasCashReserves) {
    newBlock = newBlock.replace(/restrictedCash:[^\n]*\n/, (m0) => m0 + `    cashReserves: ${Math.round(extracted.cashReserves)},\n`);
  }
  if (!hasCashAsOf) {
    newBlock = newBlock.replace(/cashReserves:[^\n]*\n/, (m0) => m0 + `    cashAsOf: \"${extracted.cashAsOf}\",\n`);
  }
  if (!hasCashUrl && extracted.cashSourceUrl) {
    newBlock = newBlock.replace(/cashAsOf:[^\n]*\n/, (m0) => m0 + `    cashSourceUrl: \"${extracted.cashSourceUrl}\",\n`);
  }

  const outSrc = companiesSrc.slice(0, span.start) + newBlock + companiesSrc.slice(span.end);
  await fs.writeFile(companiesPath, outSrc, 'utf8');
  console.log(`ok: filled cash for ${ticker} via ${extracted.tag}`);
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
