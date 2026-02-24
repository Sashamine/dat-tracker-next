#!/usr/bin/env node
/**
 * Pilot extractor: cashReserves from SEC companyfacts.
 * Deterministic:
 * - tries us-gaap:CashAndCashEquivalentsAtCarryingValue
 * - falls back to ifrs-full:CashAndCashEquivalents
 * - selects latest 'end' date with USD units
 * - prints JSON to stdout (dry-run)
 */

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

async function main() {
  const cik = process.argv[2];
  if (!cik) {
    console.error('usage: extract-cash-companyfacts.js <CIK>');
    process.exit(2);
  }
  const cik10 = toCik10(cik);
  const factsUrl = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik10}.json`;
  const facts = await fetchJson(factsUrl);

  const pickedNode = pickTagNode(facts);
  if (!pickedNode) throw new Error('no_supported_cash_tag');

  const picked = pickLatestUsdFact(pickedNode.node.units.USD);
  if (!picked) throw new Error('no_usd_facts');

  // Evidence URL: use the accession from the picked fact when available.
  let filingUrl = null;
  if (picked.accn) {
    const cikNum = cik10.replace(/^0+/, '');
    const accNoDash = String(picked.accn).replace(/-/g, '');
    filingUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNoDash}/`;
  }

  const out = {
    cik: cik10,
    cashReserves: picked.val,
    cashAsOf: picked.end,
    cashSourceUrl: filingUrl,
    tag: `${pickedNode.ns}:${pickedNode.tag}`,
    picked,
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
