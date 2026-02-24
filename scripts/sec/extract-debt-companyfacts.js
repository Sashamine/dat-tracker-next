#!/usr/bin/env node
/**
 * Pilot extractor: totalDebt from SEC companyfacts.
 * Conservative Tier-1 tags only. Can sum current+noncurrent when aligned.
 * - US GAAP candidates: LongTermDebtNoncurrent, LongTermDebtCurrent, DebtCurrent, OtherLongTermDebtNoncurrent, OtherNotesPayable
 * - IFRS candidates: CurrentBorrowingsAndCurrentPortionOfNoncurrentBorrowings, NoncurrentPortionOfOtherNoncurrentBorrowings
 * Output is dry-run JSON.
 */

const US_TAGS = [
  'LongTermDebtNoncurrent',
  'LongTermDebtCurrent',
  'DebtCurrent',
  'OtherLongTermDebtNoncurrent',
  'OtherNotesPayable',
];

const IFRS_TAGS = [
  'CurrentBorrowingsAndCurrentPortionOfNoncurrentBorrowings',
  'NoncurrentPortionOfOtherNoncurrentBorrowings',
];

function toCik10(cik) {
  return String(cik).replace(/\D/g, '').padStart(10, '0');
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'dat-tracker-next/0.1 (local)' } });
  if (!res.ok) throw new Error(`fetch_failed:${res.status}:${url}`);
  return await res.json();
}

function latestUsd(node) {
  const usd = node?.units?.USD;
  if (!usd?.length) return null;
  const rows = usd.filter((r) => r && typeof r.val === 'number' && r.end);
  rows.sort((a, b) => String(b.end).localeCompare(String(a.end)));
  return rows[0] || null;
}

function pickDebt(facts) {
  const us = facts?.facts?.['us-gaap'] || null;
  const ifrs = facts?.facts?.['ifrs-full'] || null;

  if (us) {
    const picked = [];
    for (const tag of US_TAGS) {
      const node = us[tag];
      const row = latestUsd(node);
      if (row) picked.push({ ns: 'us-gaap', tag, row });
    }
    if (!picked.length) return null;

    // If we have aligned current+noncurrent for same end, sum those.
    const byEnd = new Map();
    for (const p of picked) {
      const k = p.row.end;
      (byEnd.get(k) || byEnd.set(k, []).get(k)).push(p);
    }
    const ends = Array.from(byEnd.keys()).sort().reverse();
    for (const end of ends) {
      const arr = byEnd.get(end);
      const hasNon = arr.find((x) => x.tag === 'LongTermDebtNoncurrent');
      const hasCur = arr.find((x) => x.tag === 'LongTermDebtCurrent' || x.tag === 'DebtCurrent');
      if (hasNon && hasCur) {
        const total = hasNon.row.val + hasCur.row.val;
        return { mode: 'sum', end, total, parts: [hasNon, hasCur] };
      }
    }

    // Else pick the single most recent tag among candidates.
    picked.sort((a, b) => String(b.row.end).localeCompare(String(a.row.end)));
    return { mode: 'single', end: picked[0].row.end, total: picked[0].row.val, parts: [picked[0]] };
  }

  if (ifrs) {
    const picked = [];
    for (const tag of IFRS_TAGS) {
      const node = ifrs[tag];
      const row = latestUsd(node);
      if (row) picked.push({ ns: 'ifrs-full', tag, row });
    }
    if (!picked.length) return null;

    // Sum when both present for same end.
    const byEnd = new Map();
    for (const p of picked) {
      const k = p.row.end;
      (byEnd.get(k) || byEnd.set(k, []).get(k)).push(p);
    }
    const ends = Array.from(byEnd.keys()).sort().reverse();
    for (const end of ends) {
      const arr = byEnd.get(end);
      const hasCur = arr.find((x) => x.tag === IFRS_TAGS[0]);
      const hasNon = arr.find((x) => x.tag === IFRS_TAGS[1]);
      if (hasCur && hasNon) {
        const total = hasCur.row.val + hasNon.row.val;
        return { mode: 'sum', end, total, parts: [hasCur, hasNon] };
      }
    }

    picked.sort((a, b) => String(b.row.end).localeCompare(String(a.row.end)));
    return { mode: 'single', end: picked[0].row.end, total: picked[0].row.val, parts: [picked[0]] };
  }

  return null;
}

async function main() {
  const cik = process.argv[2];
  if (!cik) {
    console.error('usage: extract-debt-companyfacts.js <CIK>');
    process.exit(2);
  }
  const cik10 = toCik10(cik);
  const facts = await fetchJson(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik10}.json`);
  const picked = pickDebt(facts);
  if (!picked) throw new Error('no_supported_debt_tag');

  let filingUrl = null;
  const accn = picked.parts[0]?.row?.accn;
  if (accn) {
    const cikNum = cik10.replace(/^0+/, '');
    filingUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${String(accn).replace(/-/g, '')}/`;
  }

  console.log(
    JSON.stringify(
      {
        cik: cik10,
        totalDebt: picked.total,
        debtAsOf: picked.end,
        debtSourceUrl: filingUrl,
        mode: picked.mode,
        parts: picked.parts.map((p) => ({ tag: `${p.ns}:${p.tag}`, end: p.row.end, val: p.row.val, form: p.row.form, accn: p.row.accn })),
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
