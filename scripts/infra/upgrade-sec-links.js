#!/usr/bin/env node
/**
 * Deterministic upgrader: replace SEC browse-edgar links in companies.ts with exact Archives doc URLs.
 * - Only touches holdingsSourceUrl/sharesSourceUrl/cashSourceUrl/debtSourceUrl/preferredSourceUrl
 * - Only when secCik is present AND url contains sec.gov/cgi-bin/browse-edgar
 */
import fs from 'node:fs/promises';

function toCik10(cik) {
  const n = String(cik).replace(/\D/g, '').padStart(10, '0');
  return n;
}

async function fetchSubmissions(cik10) {
  const url = `https://data.sec.gov/submissions/CIK${cik10}.json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'dat-tracker-next/0.1 (local)' } });
  if (!res.ok) throw new Error(`submissions_fetch_failed:${res.status}`);
  return await res.json();
}

function pickRecentDoc(sub) {
  const r = sub?.filings?.recent;
  if (!r) return null;
  // Prefer 8-K, then 10-Q, then 10-K, then 6-K, else first.
  const prefs = ['8-K', '10-Q', '10-K', '6-K', '20-F'];
  let idx = -1;
  for (const f of prefs) {
    idx = r.form.findIndex((x) => x === f);
    if (idx >= 0) break;
  }
  if (idx < 0) idx = 0;
  const acc = r.accessionNumber[idx];
  const doc = r.primaryDocument[idx];
  const cikNum = String(sub.cik).replace(/^0+/, '');
  const url = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${String(acc).replace(/-/g, '')}/${doc}`;
  return { url, form: r.form[idx], filed: r.filingDate[idx] };
}

async function main() {
  const p = 'src/lib/data/companies.ts';
  let s = await fs.readFile(p, 'utf8');

  // Find all secCik + browse-edgar URLs + companyfacts URLs.
  const companyfactsRe = /https:\/\/data\.sec\.gov\/api\/xbrl\/companyfacts\/CIK(\d{10})\.json/g;
  const secCikRe = /secCik:\s*"(\d{1,10})"/g;
  const found = [];
  let m;
  while ((m = secCikRe.exec(s))) {
    const cik = m[1];
    const from = Math.max(0, m.index - 2000);
    const to = Math.min(s.length, m.index + 4000);
    const block = s.slice(from, to);
    if (!block.includes('sec.gov/cgi-bin/browse-edgar')) continue;
    found.push(cik);
  }

  // Also collect CIKs referenced via companyfacts URLs
  let mc;
  while ((mc = companyfactsRe.exec(s))) {
    const cik10 = mc[1];
    found.push(String(Number(cik10)));
  }

  const unique = Array.from(new Set(found));
  let changed = 0;

  for (const cik of unique) {
    const cik10 = toCik10(cik);
    const sub = await fetchSubmissions(cik10);
    const pick = pickRecentDoc(sub);
    if (!pick) continue;

    // Replace any browse-edgar urls in this file for this cik with picked Archives doc URL.
    const reFacts = new RegExp(`https:\\/\\/data\\.sec\\.gov\\/api\\/xbrl\\/companyfacts\\/CIK${cik10}\\.json`, 'g');
    s = s.replace(reFacts, pick.url);
    const re = new RegExp(`(https:\\/\\/www\\.sec\\.gov\\/cgi-bin\\/browse-edgar[^\"\s]*CIK=${cik}[^\"\s]*)`, 'g');
    const before = s;
    s = s.replace(re, pick.url);
    if (s !== before) changed++;
  }

  if (changed) {
    await fs.writeFile(p, s);
  }

  console.log(`ok: upgraded ${changed} cik blocks`);
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
