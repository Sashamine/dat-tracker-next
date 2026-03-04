#!/usr/bin/env npx tsx

import fs from 'node:fs/promises';
import path from 'node:path';
import { D1Client } from '../../src/lib/d1';

type Baseline = {
  schemaVersion: '1';
  updatedAt: string;
  missingSourceUrl: number;
  missingAccession: number;
};

type CountRow = { cnt?: number | string };

function argValue(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  if (i === -1) return undefined;
  return args[i + 1];
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function queryCount(d1: D1Client, sql: string): Promise<number> {
  const r = await d1.query<CountRow>(sql);
  return toNum(r.results?.[0]?.cnt, 0);
}

async function readBaseline(filePath: string): Promise<{ baseline: Baseline; exists: boolean }> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<Baseline>;
    return {
      exists: true,
      baseline: {
        schemaVersion: '1',
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
        missingSourceUrl: toNum(parsed.missingSourceUrl, 9),
        missingAccession: toNum(parsed.missingAccession, 9),
      },
    };
  } catch {
    return {
      exists: false,
      baseline: {
        schemaVersion: '1',
        updatedAt: new Date().toISOString(),
        missingSourceUrl: toNum(process.env.SEC_MISSING_SOURCE_URL_BASELINE, 9),
        missingAccession: toNum(process.env.SEC_MISSING_ACCESSION_BASELINE, 9),
      },
    };
  }
}

async function writeBaseline(filePath: string, b: Baseline): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(b, null, 2)}\n`, 'utf8');
}

async function main() {
  const args = process.argv.slice(2);
  const checkMode = hasFlag(args, '--check');
  const ratchetMode = hasFlag(args, '--ratchet');
  const baselineFile = argValue(args, '--baseline-file') || 'infra/sec-receipt-baseline.json';

  if (!checkMode && !ratchetMode) {
    console.error('Usage: sec-receipt-invariant.ts --check|--ratchet [--baseline-file path]');
    process.exit(1);
  }

  const d1 = D1Client.fromEnv();
  const { baseline, exists } = await readBaseline(baselineFile);

  const missingSourceUrl = await queryCount(
    d1,
    `SELECT COUNT(*) AS cnt
     FROM artifacts
     WHERE source_type='sec_filing'
       AND (source_url IS NULL OR source_url='');`
  );
  const missingAccession = await queryCount(
    d1,
    `SELECT COUNT(*) AS cnt
     FROM artifacts
     WHERE source_type='sec_filing'
       AND (accession IS NULL OR accession='');`
  );

  const sourceUrlRegression = missingSourceUrl > baseline.missingSourceUrl;
  const accessionRegression = missingAccession > baseline.missingAccession;

  const payload = {
    baselineFile,
    baselineExists: exists,
    baseline: {
      missingSourceUrl: baseline.missingSourceUrl,
      missingAccession: baseline.missingAccession,
      updatedAt: baseline.updatedAt,
    },
    current: { missingSourceUrl, missingAccession },
    regression: { sourceUrl: sourceUrlRegression, accession: accessionRegression },
  };

  if (checkMode) {
    console.log('SEC_RECEIPT_INVARIANT', JSON.stringify(payload));
    if (sourceUrlRegression || accessionRegression) {
      console.error('INVARIANT FAILED: sec_filing receipt counts regressed above baseline');
      process.exit(2);
    }
    return;
  }

  // Ratchet mode: only tighten baseline downward (never increase).
  let changed = false;
  const next: Baseline = { ...baseline };

  if (!exists) {
    next.missingSourceUrl = missingSourceUrl;
    next.missingAccession = missingAccession;
    changed = true;
  } else {
    if (missingSourceUrl < next.missingSourceUrl) {
      next.missingSourceUrl = missingSourceUrl;
      changed = true;
    }
    if (missingAccession < next.missingAccession) {
      next.missingAccession = missingAccession;
      changed = true;
    }
  }

  if (changed) {
    next.updatedAt = new Date().toISOString();
    await writeBaseline(baselineFile, next);
  }

  console.log(
    'SEC_RECEIPT_BASELINE_RATCHET',
    JSON.stringify({
      ...payload,
      changed,
      nextBaseline: {
        missingSourceUrl: next.missingSourceUrl,
        missingAccession: next.missingAccession,
        updatedAt: next.updatedAt,
      },
    })
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

