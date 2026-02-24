#!/usr/bin/env node
import path from 'node:path';
import { secFetchText } from './sec-http.js';

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: cache-smoke <url>');
    process.exit(2);
  }
  const cacheDir = path.join(process.cwd(), '.cache', 'sec');
  const a = await secFetchText(url, { cacheDir, ttlMs: 365 * 24 * 60 * 60 * 1000 });
  console.log(`1) ${a.fromCache ? 'cache' : 'fetched'} status=${a.meta.status}`);
  const b = await secFetchText(url, { cacheDir, ttlMs: 365 * 24 * 60 * 60 * 1000 });
  console.log(`2) ${b.fromCache ? 'cache' : 'fetched'} status=${b.meta.status}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
