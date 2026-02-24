#!/usr/bin/env node
/**
 * v0 generator: emits minimal CompanyState JSON for all tickers in allCompanies.
 *
 * Usage:
 *   npx tsx scripts/state/generate-all-company-states.ts
 */
import fs from 'node:fs/promises';
import path from 'node:path';

// Avoid crashing when output is piped and the reader closes early (EPIPE)
process.stdout.on('error', (err: any) => {
  if (err && err.code === 'EPIPE') process.exit(0);
});
process.stderr.on('error', (err: any) => {
  if (err && err.code === 'EPIPE') process.exit(0);
});

async function loadCompanies() {
  const mod = await import('../../src/lib/data/companies.ts');
  return mod.allCompanies as any[];
}

function isoDate(s: any): string {
  if (!s) return new Date().toISOString().slice(0, 10);
  return String(s).slice(0, 10);
}

function buildState(c: any) {
  return {
    schemaVersion: '0.1',
    ticker: c.ticker,
    secCik: c.secCik ?? null,
    asOf: isoDate(c.holdingsLastUpdated || c.holdingsAsOf || c.datStartDate),
    generatedAt: new Date().toISOString(),
    listing: {
      country: c.country ?? 'UNKNOWN',
      exchangeMic: c.exchangeMic ?? 'UNKNOWN',
      currency: c.currency ?? 'USD',
    },
    holdings: {
      asset: c.asset,
      amount: Number(c.holdings),
      source: {
        holdingsSource: c.holdingsSource ?? null,
        holdingsSourceUrl: c.holdingsSourceUrl ?? null,
        holdingsAccession: c.holdingsAccession ?? null,
      },
    },
    shares: {
      sharesForMnav: c.sharesForMnav ?? null,
      sharesOutstandingFD: c.sharesOutstandingFD ?? null,
      asOf: c.sharesAsOf ?? null,
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
        debtSourceUrl: c.debtSourceUrl ?? null,
        preferredSourceUrl: c.preferredSourceUrl ?? null,
      },
    },
    verification: {
      status: 'pending',
    },
  };
}

async function main() {
  const companies = await loadCompanies();
  const outRoot = path.join(process.cwd(), 'states');
  await fs.mkdir(outRoot, { recursive: true });

  let n = 0;
  for (const c of companies) {
    const outDir = path.join(outRoot, c.ticker);
    await fs.mkdir(outDir, { recursive: true });
    const state = buildState(c);
    await fs.writeFile(path.join(outDir, 'latest.json'), JSON.stringify(state, null, 2) + '\n', 'utf8');
    n += 1;
  }
  console.log(`ok: wrote latest.json for ${n} tickers`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
