#!/usr/bin/env npx tsx

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { D1Client } from '../src/lib/d1';

function splitSqlStatements(sql: string): string[] {
  // Extremely conservative splitter: respects -- line comments and /* */ blocks.
  // Good enough for our migration files (no semicolons inside strings).
  const out: string[] = [];
  let buf = '';
  let i = 0;
  let inLineComment = false;
  let inBlockComment = false;
  let inSingle = false;
  let inDouble = false;

  while (i < sql.length) {
    const ch = sql[i];
    const next = i + 1 < sql.length ? sql[i + 1] : '';

    if (inLineComment) {
      buf += ch;
      if (ch === '\n') inLineComment = false;
      i += 1;
      continue;
    }

    if (inBlockComment) {
      buf += ch;
      if (ch === '*' && next === '/') {
        buf += next;
        i += 2;
        inBlockComment = false;
        continue;
      }
      i += 1;
      continue;
    }

    if (!inSingle && !inDouble) {
      if (ch === '-' && next === '-') {
        inLineComment = true;
        buf += ch + next;
        i += 2;
        continue;
      }
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        buf += ch + next;
        i += 2;
        continue;
      }
    }

    if (!inDouble && ch === "'") {
      inSingle = !inSingle;
      buf += ch;
      i += 1;
      continue;
    }
    if (!inSingle && ch === '"') {
      inDouble = !inDouble;
      buf += ch;
      i += 1;
      continue;
    }

    if (!inSingle && !inDouble && ch === ';') {
      const stmt = buf.trim();
      if (stmt) out.push(stmt);
      buf = '';
      i += 1;
      continue;
    }

    buf += ch;
    i += 1;
  }

  const tail = buf.trim();
  if (tail) out.push(tail);
  return out;
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: scripts/d1-apply-migration.ts <sql-file>');

  const dryRun = String(process.env.DRY_RUN || 'true').toLowerCase() !== 'false';
  const sql = readFileSync(file, 'utf8');
  const statements = splitSqlStatements(sql);

  console.log(
    JSON.stringify(
      {
        action: 'd1-apply-migration',
        file: basename(file),
        dryRun,
        statementCount: statements.length,
      },
      null,
      2
    )
  );

  if (dryRun) {
    for (const [idx, stmt] of statements.entries()) {
      console.log(`\n--- statement ${idx + 1}/${statements.length} ---\n${stmt}\n`);
    }
    return;
  }

  const d1 = D1Client.fromEnv();
  for (const [idx, stmt] of statements.entries()) {
    console.log(`Running statement ${idx + 1}/${statements.length}...`);
    await d1.query(stmt);
  }

  console.log('Done.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
