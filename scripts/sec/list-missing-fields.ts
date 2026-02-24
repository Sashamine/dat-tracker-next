#!/usr/bin/env node
/**
 * Schema-aware lister: import actual allCompanies array.
 * usage:
 *   node scripts/sec/list-missing-fields.ts cash
 *   node scripts/sec/list-missing-fields.ts debt
 * (run via `npm exec --yes tsx ...`)
 */

import { allCompanies } from '../../src/lib/data/companies';
import fs from 'node:fs';
import path from 'node:path';

const mode = (process.argv[2] || '').trim();
if (!mode || !['cash', 'debt', 'preferred'].includes(mode)) {
  console.error('usage: list-missing-fields.ts <cash|debt|preferred>');
  process.exit(2);
}

const required =
  mode === 'cash'
    ? (['cashReserves', 'cashAsOf', 'cashSourceUrl'] as const)
    : mode === 'debt'
      ? (['totalDebt', 'debtAsOf', 'debtSourceUrl'] as const)
      : (['preferredEquity', 'preferredAsOf', 'preferredSourceUrl'] as const);

let exceptions: Record<string, string[]> = {};
try {
  const exPath = path.join(process.cwd(), 'scripts/sec/manual-exceptions.json');
  exceptions = JSON.parse(fs.readFileSync(exPath, 'utf8'));
} catch {}
const deny = new Set((exceptions[mode] || []).map((t) => String(t).toUpperCase()));

let suppress: any = { cash: [], debt: [], preferred: [] };
try {
  const sPath = path.join(process.cwd(), 'infra/sec-companyfacts-suppress.json');
  suppress = JSON.parse(fs.readFileSync(sPath, 'utf8'));
} catch {}
const suppressed = new Set(((suppress?.[mode] || []) as any[]).map((t) => String(t).toUpperCase()));

const out: string[] = [];
for (const c of allCompanies as any[]) {
  const ticker = c?.ticker;
  if (!ticker) continue;
  const T = String(ticker).toUpperCase();
  if (deny.has(T)) continue;
  if (suppressed.has(T)) continue;
  if (!c?.secCik) continue;

  const missingAny = required.some((k) => c[k] == null);
  if (missingAny) out.push(String(ticker));
}

process.stdout.write(out.join('\n'));
