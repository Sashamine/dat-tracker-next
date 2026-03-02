#!/usr/bin/env npx tsx

import crypto from 'node:crypto';
import { D1Client } from '../src/lib/d1';
import { getHoldingsHistory } from '../src/lib/data/holdings-history';
import {
  writeSecFilingHoldingsNativeDatapoint,
  type SecFilingHoldingsNativeWriteResult,
} from '../src/lib/d1/sec-filing-holdings-native';

function argVal(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

function isEightKLike(source: string | undefined, sourceUrl: string | undefined): boolean {
  const s = (source || '').toLowerCase();
  const u = (sourceUrl || '').toLowerCase();
  return (
    s.includes('8-k') ||
    u.includes('/8-k') ||
    u.includes('form8-k') ||
    u.includes('_8k') ||
    u.includes('-8k') ||
    u.includes('/8k/')
  );
}

function inferFilingType(source: string | undefined, sourceUrl: string | undefined): string | null {
  if (isEightKLike(source, sourceUrl)) return '8-K';
  return null;
}

function mapConfidence(raw: 'high' | 'medium' | 'low' | undefined): number {
  if (raw === 'high') return 1.0;
  if (raw === 'medium') return 0.9;
  if (raw === 'low') return 0.75;
  return 0.85;
}

async function main() {
  const tickersRaw = (argVal('tickers') || 'MSTR,BMNR,SBET').trim();
  const dryRun = (argVal('dry-run') || process.env.DRY_RUN || 'true') === 'true';
  const limit = Number(argVal('limit') || process.env.LIMIT || '200');

  const tickers = tickersRaw
    .split(',')
    .map(t => t.trim().toUpperCase())
    .filter(Boolean);

  const d1 = D1Client.fromEnv();
  const runId = crypto.randomUUID();

  let scanned = 0;
  let eligible = 0;
  let inserted = 0;
  let updated = 0;
  let seededProposalKey = 0;
  let noop = 0;
  let skipped = 0;
  let failed = 0;
  let nonBtcSkipped = 0;

  const samples: Array<{ ticker: string; as_of: string; sourceUrl?: string; status: string }> = [];

  for (const ticker of tickers) {
    const company = getHoldingsHistory(ticker);
    if (!company) {
      console.log(JSON.stringify({ ticker, ok: false, reason: 'no holdings history found' }));
      continue;
    }

    if (company.asset.toUpperCase() !== 'BTC') {
      nonBtcSkipped++;
      console.log(JSON.stringify({ ticker, ok: true, skipped: true, reason: `asset=${company.asset}, BTC only` }));
      continue;
    }

    for (const snapshot of company.history) {
      if (scanned >= limit) break;
      scanned++;

      if (snapshot.sourceType !== 'sec-filing') {
        skipped++;
        continue;
      }
      if (!isEightKLike(snapshot.source, snapshot.sourceUrl)) {
        skipped++;
        continue;
      }

      eligible++;
      const filingType = inferFilingType(snapshot.source, snapshot.sourceUrl);
      const accession = snapshot.sourceUrl?.match(/\b(\d{10}-\d{2}-\d{6})\b/)?.[1] || null;

      const flags: Record<string, unknown> = {
        source: {
          source_type: snapshot.sourceType,
          filing_type: filingType,
          accession,
          source_url: snapshot.sourceUrl || null,
          source_label: snapshot.source || null,
        },
        backfill: {
          from: 'holdings_history',
          note: 'historical 8-K sec-filing holdings_native backfill',
        },
      };

      const result: SecFilingHoldingsNativeWriteResult = await writeSecFilingHoldingsNativeDatapoint(d1, {
        ticker,
        holdingsNative: snapshot.holdings,
        asOf: snapshot.date || null,
        reportedAt: snapshot.date || null,
        filingUrl: snapshot.sourceUrl || null,
        accession,
        filingType,
        confidence: mapConfidence(snapshot.confidence),
        runId,
        flags,
        dryRun,
      });

      if (samples.length < 10) {
        samples.push({
          ticker,
          as_of: snapshot.date,
          sourceUrl: snapshot.sourceUrl,
          status: result.status,
        });
      }

      if (result.status === 'inserted') inserted++;
      else if (result.status === 'updated') updated++;
      else if (result.status === 'seededProposalKey') seededProposalKey++;
      else if (result.status === 'noop' || result.status === 'dry_run') noop++;
      else if (result.status === 'error') failed++;
      else skipped++;
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        tickers,
        limit,
        runId,
        scanned,
        eligible,
        inserted,
        updated,
        seededProposalKey,
        noop,
        skipped,
        nonBtcSkipped,
        failed,
        samples,
      },
      null,
      2
    )
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
