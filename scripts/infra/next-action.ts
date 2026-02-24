#!/usr/bin/env node
/**
 * Deterministic next-action suggestion (derived from repo state).
 */
import fs from 'node:fs';
import path from 'node:path';

function exists(p: string): boolean {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function fileContains(p: string, needle: string): boolean {
  try {
    const s = fs.readFileSync(p, 'utf8');
    return s.includes(needle);
  } catch {
    return false;
  }
}

function main() {
  const root = process.cwd();

  // 1) Add health endpoint if missing.
  const healthRoute = path.join(root, 'src/app/api/state/health/route.ts');
  if (!exists(healthRoute)) {
    console.log('api_health: Add /api/state/health endpoint (returns ok + counts)');
    return;
  }

  // 2) Ensure cache headers on state endpoints.
  const latestRoute = path.join(root, 'src/app/api/state/latest/route.ts');
  const tickersRoute = path.join(root, 'src/app/api/state/tickers/route.ts');
  const cacheNeedle = "res.headers.set('Cache-Control'";
  if (!fileContains(latestRoute, cacheNeedle) || !fileContains(tickersRoute, cacheNeedle)) {
    console.log('api_cache_headers: Add short cache headers to /api/state/latest and /api/state/tickers');
    return;
  }

  // 3) Verifier tightening: require SEC sources to have evidence.
  const verifier = path.join(root, 'scripts/state/verify-company-states.ts');
  if (!fileContains(verifier, 'require_sec_source_evidence')) {
    console.log('verifier_require_sources: Verifier: require SEC holdings evidence (url/accession)');
    return;
  }

  console.log('pick_next: Ship any meaningful micro-commit in allowedPaths');
}

main();
