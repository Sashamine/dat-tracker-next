#!/usr/bin/env node
/**
 * Preferred equity extractor (Tier-1): us-gaap:PreferredStockValue (USD).
 * Conservative, outputs dry-run JSON.
 */

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

async function main() {
  const cik = process.argv[2];
  if (!cik) {
    console.error('usage: extract-preferred-companyfacts.js <CIK>');
    process.exit(2);
  }

  const cik10 = toCik10(cik);
  const facts = await fetchJson(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik10}.json`);

  const node = facts?.facts?.['us-gaap']?.PreferredStockValue;
  const picked = latestUsd(node);
  if (!picked) throw new Error('no_supported_preferred_tag');

  let filingUrl = null;
  if (picked.accn) {
    const cikNum = cik10.replace(/^0+/, '');
    const accNoDash = String(picked.accn).replace(/-/g, '');
    filingUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNoDash}/`;
  }

  console.log(
    JSON.stringify(
      {
        cik: cik10,
        preferredEquity: picked.val,
        preferredAsOf: picked.end,
        preferredSourceUrl: filingUrl,
        tag: 'us-gaap:PreferredStockValue',
        picked,
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
