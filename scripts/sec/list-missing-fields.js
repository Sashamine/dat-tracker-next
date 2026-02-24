#!/usr/bin/env node
/**
 * List tickers missing specific fields from src/lib/data/companies.ts
 * Robust: scans object literals with brace matching and string skipping.
 *
 * usage:
 *   node scripts/sec/list-missing-fields.js cash
 *   node scripts/sec/list-missing-fields.js debt
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const mode = (process.argv[2] || '').trim();
if (!mode || !['cash', 'debt'].includes(mode)) {
  console.error('usage: list-missing-fields.js <cash|debt>');
  process.exit(2);
}

const required =
  mode === 'cash'
    ? ['cashReserves', 'cashAsOf', 'cashSourceUrl']
    : ['totalDebt', 'debtAsOf', 'debtSourceUrl'];

const companiesPath = path.join(process.cwd(), 'src/lib/data/companies.ts');
const src = await fs.readFile(companiesPath, 'utf8');

function parseObjectBlocks(text) {
  const blocks = [];
  let i = 0;
  let inStr = false;
  let strCh = '';
  let esc = false;

  while (i < text.length) {
    const ch = text[i];

    if (inStr) {
      if (esc) {
        esc = false;
        i++;
        continue;
      }
      if (ch === '\\') {
        esc = true;
        i++;
        continue;
      }
      if (ch === strCh) {
        inStr = false;
        strCh = '';
      }
      i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inStr = true;
      strCh = ch;
      i++;
      continue;
    }

    if (ch !== '{') {
      i++;
      continue;
    }

    // Candidate object literal. Find matching close.
    const start = i;
    let depth = 0;
    let j = i;
    inStr = false;
    strCh = '';
    esc = false;

    for (; j < text.length; j++) {
      const c = text[j];
      if (inStr) {
        if (esc) {
          esc = false;
          continue;
        }
        if (c === '\\') {
          esc = true;
          continue;
        }
        if (c === strCh) {
          inStr = false;
          strCh = '';
        }
        continue;
      }
      if (c === '"' || c === "'") {
        inStr = true;
        strCh = c;
        continue;
      }
      if (c === '{') depth++;
      if (c === '}') {
        depth--;
        if (depth === 0) {
          const end = j + 1;
          blocks.push(text.slice(start, end));
          i = end;
          break;
        }
      }
    }

    if (j >= text.length) break;
  }

  return blocks;
}

const tickers = [];
for (const block of parseObjectBlocks(src)) {
  const t = /ticker:\s*"([A-Z0-9\-.]+)"/.exec(block)?.[1];
  if (!t) continue;
  const hasSec = /secCik:\s*"\d{1,10}"/.test(block);
  if (!hasSec) continue;

  const missingAny = required.some((k) => !new RegExp(`${k}:`).test(block));
  if (missingAny) tickers.push(t);
}

process.stdout.write(tickers.join('\n'));
