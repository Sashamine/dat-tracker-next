#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const itemJson = process.argv[2];
if (!itemJson) process.exit(2);
const item = JSON.parse(itemJson);

const dlqPath = path.join(process.cwd(), 'infra', 'dlq-extract.json');
let dlq = { schemaVersion: '0.1', items: [] };
try {
  dlq = JSON.parse(await fs.readFile(dlqPath, 'utf8'));
} catch {}

// De-dupe policy: for certain kinds, avoid logging the same (kind,ticker,mode) repeatedly.
const dedupeKinds = new Set(['sec_companyfacts_404']);
if (dedupeKinds.has(item.kind) && item.ticker) {
  const exists = dlq.items.some(
    (x) => x && x.kind === item.kind && x.ticker === item.ticker && (x.mode || null) === (item.mode || null)
  );
  if (exists) process.exit(0);
}

dlq.items.push(item);
await fs.mkdir(path.dirname(dlqPath), { recursive: true });
await fs.writeFile(dlqPath, JSON.stringify(dlq, null, 2) + '\n', 'utf8');
