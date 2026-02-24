#!/usr/bin/env node
/**
 * Track repeated "no extractable" outcomes and auto-suppress hopeless tickers.
 *
 * Usage:
 *   node scripts/sec/no-extract-track.js <mode> <ticker>
 */

const fs = require('fs');
const path = require('path');

const mode = (process.argv[2] || '').trim();
const ticker = (process.argv[3] || '').trim().toUpperCase();

if (!['cash', 'debt', 'preferred'].includes(mode) || !ticker) {
  console.error('usage: no-extract-track.js <cash|debt|preferred> <TICKER>');
  process.exit(2);
}

const failuresPath = path.join(process.cwd(), 'infra', 'sec-companyfacts-failures.json');
const suppressPath = path.join(process.cwd(), 'infra', 'sec-companyfacts-suppress.json');

const now = new Date().toISOString();

let failures = { schemaVersion: '0.1', items: {} };
try { failures = JSON.parse(fs.readFileSync(failuresPath, 'utf8')); } catch {}

const key = `${mode}::${ticker}`;
const prev = failures.items?.[key] || { mode, ticker, count: 0, firstSeen: now, lastSeen: now };
const next = {
  mode,
  ticker,
  count: (prev.count || 0) + 1,
  firstSeen: prev.firstSeen || now,
  lastSeen: now,
};
failures.items = failures.items || {};
failures.items[key] = next;

let suppress = { schemaVersion: '0.1', cash: [], debt: [], preferred: [] };
try { suppress = JSON.parse(fs.readFileSync(suppressPath, 'utf8')); } catch {}

const threshold = 5;
const list = new Set((suppress[mode] || []).map((t) => String(t).toUpperCase()));
let didSuppress = false;
if (next.count >= threshold && !list.has(ticker)) {
  list.add(ticker);
  suppress[mode] = [...list].sort();
  didSuppress = true;
}

fs.mkdirSync(path.dirname(failuresPath), { recursive: true });
fs.writeFileSync(failuresPath, JSON.stringify(failures, null, 2) + '\n');

if (didSuppress) {
  fs.mkdirSync(path.dirname(suppressPath), { recursive: true });
  fs.writeFileSync(suppressPath, JSON.stringify(suppress, null, 2) + '\n');
  process.stdout.write(`suppressed: ${mode} ${ticker} (no-extract count=${next.count})\n`);
} else {
  process.stdout.write(`tracked: ${mode} ${ticker} (no-extract count=${next.count})\n`);
}
