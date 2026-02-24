#!/usr/bin/env node
/**
 * v0 generator: emits a minimal CompanyState JSON for a given ticker.
 *
 * Usage:
 *   npx tsx scripts/state/generate-company-state.ts BMNR
 */
import fs from 'node:fs/promises';
import path from 'node:path';

async function loadCompanies() {
  const mod = await import('../../src/lib/data/companies.ts');
  return mod.allCompanies as any[];
}


function isObject(x: any): x is Record<string, any> {
  return x != null && typeof x === 'object' && !Array.isArray(x);
}

function deepMerge(base: any, override: any): any {
  if (!isObject(base) || !isObject(override)) return override ?? base;
  const out: any = { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (isObject(v) && isObject((base as any)[k])) out[k] = deepMerge((base as any)[k], v);
    else out[k] = v;
  }
  return out;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const ticker = (process.argv[2] || '').trim();
  if (!ticker) {
    console.error('Usage: generate-company-state.ts <TICKER>');
    process.exit(2);
  }

  const companies = await loadCompanies();
  const c = companies.find((x) => String(x.ticker).toUpperCase() === ticker.toUpperCase());
  if (!c) {
    console.error(`ticker not found: ${ticker}`);
    process.exit(1);
  }

  let state = {
    schemaVersion: '0.1',
    ticker: c.ticker,
    secCik: c.secCik ?? null,
    asOf: (c.holdingsLastUpdated || c.holdingsAsOf || c.datStartDate || todayIsoDate()).slice(0, 10),
    generatedAt: new Date().toISOString(),
    listing: {
      country: c.country ?? 'UNKNOWN',
      exchangeMic: c.exchangeMic ?? 'UNKNOWN',
      currency: c.currency ?? 'USD',
    },
    holdings: {
      asset: c.asset,
      amount: Number(c.holdings),
      asOf: (c.holdingsLastUpdated || c.holdingsAsOf || state.asOf || null)?.slice(0, 10) ?? null,
      source: {
        holdingsSource: c.holdingsSource ?? null,
        holdingsSourceUrl: c.holdingsSourceUrl ?? null,
        holdingsAccession: c.holdingsAccession ?? null,
      },
    },
    shares: {
      sharesForMnav: c.sharesForMnav ?? null,
      sharesOutstandingFD: c.sharesOutstandingFD ?? null,
      asOf: (c.sharesAsOf ?? null),
      source: {
        sharesSource: c.sharesSource ?? null,
        sharesSourceUrl: c.sharesSourceUrl ?? null,
      },
    },
    balanceSheet: {
      cashReserves: c.cashReserves ?? null,
      restrictedCash: c.restrictedCash ?? null,
      totalDebt: c.totalDebt ?? null,
      preferredEquity: c.preferredEquity ?? null,
      asOf: (c.cashAsOf || c.debtAsOf || c.preferredAsOf || null),
      source: {
        cashSourceUrl: c.cashSourceUrl ?? null,
        debtSourceUrl: (c.debtSourceUrl ?? c.debtSourceUrl) ?? null,
        preferredSourceUrl: c.preferredSourceUrl ?? null,
      },
    },
    verification: {
      status: 'pending',
    },
  };

  const outDir = path.join(process.cwd(), 'states', c.ticker);
  // Optional local overrides (checked-in): states/<ticker>/overrides.json
  const overridesPath = path.join(outDir, 'overrides.json');
  try {
    const raw = await fs.readFile(overridesPath, 'utf8');
    const ov = JSON.parse(raw);
    const merged = deepMerge(state, ov);
    // eslint-disable-next-line no-var
    // @ts-ignore
    state = merged;
  } catch (e: any) {
    // ignore missing/invalid overrides
  }
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'latest.json'), JSON.stringify(state, null, 2) + '\n', 'utf8');
  console.log(`ok: wrote states/${c.ticker}/latest.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
