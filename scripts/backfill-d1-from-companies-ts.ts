#!/usr/bin/env npx tsx
/**
 * backfill-d1-from-companies-ts.ts
 *
 * Reads citation metadata from companies.ts and backfills D1 datapoints
 * that are missing values or citation fields. For each metric, if D1 has
 * no data OR has data with null citation_quote/citation_search_term,
 * this script fills in the gaps from companies.ts.
 *
 * Also creates proper artifacts with accessions for companies that only
 * have external-sources UUID artifacts (no filing viewer link).
 *
 * Usage:
 *   npx tsx scripts/backfill-d1-from-companies-ts.ts              # dry run
 *   npx tsx scripts/backfill-d1-from-companies-ts.ts --apply       # write to D1
 */

import crypto from 'node:crypto';
import { D1Client } from '../src/lib/d1';
import { allCompanies } from '../src/lib/data/companies';
import type { Company } from '../src/lib/types';

const apply = process.argv.includes('--apply');

type MetricMapping = {
  metric: string;
  getValue: (c: Company) => number | undefined | null;
  getUnit: (c: Company) => string;
  getAsOf: (c: Company) => string | null;
  getSourceUrl: (c: Company) => string | null | undefined;
  getSource: (c: Company) => string | null | undefined;
  getQuote: (c: Company) => string | null | undefined;
  getSearchTerm: (c: Company) => string | null | undefined;
  getAccession: (c: Company) => string | null | undefined;
};

// Map companies.ts fields to D1 metric names
const METRIC_MAPPINGS: MetricMapping[] = [
  {
    metric: 'holdings_native',
    getValue: c => c.holdings,
    getUnit: c => c.asset || 'BTC',
    getAsOf: c => c.holdingsLastUpdated || null,
    getSourceUrl: c => c.holdingsSourceUrl,
    getSource: c => c.holdingsSource,
    getQuote: c => c.sourceQuote,
    getSearchTerm: c => c.sourceSearchTerm,
    getAccession: c => c.accessionNumber,
  },
  {
    metric: 'basic_shares',
    getValue: c => c.sharesForMnav,
    getUnit: () => 'shares',
    getAsOf: c => c.sharesAsOf || null,
    getSourceUrl: c => c.sharesSourceUrl,
    getSource: c => c.sharesSource,
    getQuote: c => c.sharesSourceQuote,
    getSearchTerm: c => c.sharesSearchTerm,
    getAccession: () => null,
  },
  {
    metric: 'cash_usd',
    getValue: c => c.cashReserves,
    getUnit: () => 'USD',
    getAsOf: c => c.cashAsOf || null,
    getSourceUrl: c => c.cashSourceUrl,
    getSource: c => c.cashSource,
    getQuote: c => c.cashSourceQuote,
    getSearchTerm: c => c.cashSearchTerm,
    getAccession: () => null,
  },
  {
    metric: 'debt_usd',
    getValue: c => c.totalDebt,
    getUnit: () => 'USD',
    getAsOf: c => c.debtAsOf || null,
    getSourceUrl: c => c.debtSourceUrl,
    getSource: c => c.debtSource,
    getQuote: c => c.debtSourceQuote,
    getSearchTerm: c => c.debtSearchTerm,
    getAccession: () => null,
  },
  {
    metric: 'preferred_equity_usd',
    getValue: c => c.preferredEquity,
    getUnit: () => 'USD',
    getAsOf: c => c.preferredAsOf || null,
    getSourceUrl: c => c.preferredSourceUrl,
    getSource: c => c.preferredSource,
    getQuote: c => c.preferredSourceQuote,
    getSearchTerm: c => c.preferredSearchTerm,
    getAccession: () => null,
  },
  {
    metric: 'restricted_cash_usd',
    getValue: c => c.restrictedCash,
    getUnit: () => 'USD',
    getAsOf: c => c.cashAsOf || null,
    getSourceUrl: c => c.cashSourceUrl,
    getSource: c => c.cashSource,
    getQuote: () => null,
    getSearchTerm: () => null,
    getAccession: () => null,
  },
];

function extractAccessionFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // Match SEC accession pattern in /filings/ URLs or source_url
  const m = url.match(/\b(\d{10}-\d{2}-\d{6})\b/);
  return m?.[1] || null;
}

async function main() {
  const d1 = D1Client.fromEnv();

  const runId = 'static-backfill-' + new Date().toISOString().slice(0, 10);

  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Companies: ${allCompanies.length}`);
  console.log('');

  if (apply) {
    // Create a run record for FK constraints
    await d1.query(
      `INSERT OR IGNORE INTO runs (run_id, started_at, ended_at, trigger, notes)
       VALUES (?, ?, NULL, 'manual', 'backfill from companies.ts')`,
      [runId, new Date().toISOString()]
    );
  }

  // Load current D1 state
  const { results: d1Datapoints } = await d1.query<any>(`
    SELECT dp.entity_id, dp.metric, dp.value, dp.citation_quote, dp.citation_search_term,
           dp.artifact_id, dp.as_of,
           a.accession, a.source_url, a.source_type, a.r2_key
    FROM latest_datapoints dp
    LEFT JOIN artifacts a ON a.artifact_id = dp.artifact_id
  `);

  // Build lookup: entity_id -> metric -> row
  const d1Map = new Map<string, Map<string, any>>();
  for (const row of d1Datapoints) {
    if (!d1Map.has(row.entity_id)) d1Map.set(row.entity_id, new Map());
    d1Map.get(row.entity_id)!.set(row.metric, row);
  }

  let created = 0;
  let updatedCitations = 0;
  let updatedAccessions = 0;
  let skipped = 0;

  for (const company of allCompanies) {
    const ticker = company.ticker;
    const entityMetrics = d1Map.get(ticker) || new Map();

    for (const mapping of METRIC_MAPPINGS) {
      const staticValue = mapping.getValue(company);
      if (staticValue === undefined || staticValue === null) continue;

      const d1Row = entityMetrics.get(mapping.metric);
      const staticUrl = mapping.getSourceUrl(company);
      const staticQuote = mapping.getQuote(company);
      const staticSearchTerm = mapping.getSearchTerm(company);
      const staticAccession = mapping.getAccession(company) || extractAccessionFromUrl(staticUrl as string);
      const staticAsOf = mapping.getAsOf(company);

      // Case 1: D1 has no data for this metric — create it
      if (!d1Row) {
        const sourceType = inferSourceType(mapping.getSource(company));
        console.log(`CREATE ${ticker}/${mapping.metric} = ${staticValue} (from companies.ts, source: ${sourceType})`);

        if (apply) {
          // Ensure artifact exists
          const artifactId = await ensureArtifact(d1, {
            ticker,
            sourceUrl: staticUrl as string | null,
            accession: staticAccession,
            sourceType,
          });

          // Create datapoint
          const dpId = crypto.randomUUID();
          const proposalKey = crypto.createHash('sha256')
            .update(`v1|${ticker}|${mapping.metric}|static_backfill|${staticAsOf || ''}|`)
            .digest('hex');

          await d1.query(`
            INSERT INTO datapoints (
              datapoint_id, entity_id, metric, value, unit, scale,
              as_of, reported_at, artifact_id, run_id,
              method, confidence, status, proposal_key, created_at,
              citation_quote, citation_search_term
            ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'static_backfill', 0.8, 'candidate', ?, ?, ?, ?)
            ON CONFLICT(proposal_key) DO UPDATE SET
              value = excluded.value,
              citation_quote = COALESCE(excluded.citation_quote, citation_quote),
              citation_search_term = COALESCE(excluded.citation_search_term, citation_search_term)
          `, [
            dpId, ticker, mapping.metric, staticValue, mapping.getUnit(company),
            staticAsOf, staticAsOf, artifactId, runId,
            proposalKey, new Date().toISOString(),
            staticQuote || null, staticSearchTerm || null,
          ]);
        }
        created++;
        continue;
      }

      // Case 2: D1 has data but citation is missing — update citation only
      const needsCitation = !d1Row.citation_quote && staticQuote;
      const needsSearchTerm = !d1Row.citation_search_term && staticSearchTerm;

      if (needsCitation || needsSearchTerm) {
        console.log(`UPDATE CITATION ${ticker}/${mapping.metric} (add ${needsCitation ? 'quote' : ''}${needsCitation && needsSearchTerm ? '+' : ''}${needsSearchTerm ? 'searchTerm' : ''})`);

        if (apply) {
          const setClauses: string[] = [];
          const params: any[] = [];

          if (needsCitation) {
            setClauses.push('citation_quote = ?');
            params.push(staticQuote);
          }
          if (needsSearchTerm) {
            setClauses.push('citation_search_term = ?');
            params.push(staticSearchTerm);
          }

          params.push(ticker, mapping.metric);
          await d1.query(`
            UPDATE datapoints SET ${setClauses.join(', ')}
            WHERE rowid IN (
              SELECT rowid FROM latest_datapoints WHERE entity_id = ? AND metric = ?
            )
          `, params);
        }
        updatedCitations++;
      }

      // Case 3: D1 artifact has no accession but we have one — update artifact
      if (!d1Row.accession && staticAccession && d1Row.artifact_id) {
        console.log(`UPDATE ACCESSION ${ticker}/${mapping.metric} artifact -> ${staticAccession}`);

        if (apply) {
          await d1.query(
            'UPDATE artifacts SET accession = ? WHERE artifact_id = ? AND (accession IS NULL OR accession = ?)',
            [staticAccession, d1Row.artifact_id, '']
          );
        }
        updatedAccessions++;
      }

      // Case 4: Everything is fine — skip
      if (!needsCitation && !needsSearchTerm && (d1Row.accession || !staticAccession)) {
        skipped++;
      }
    }
  }

  console.log('');
  console.log('Summary:');
  console.log(`  Created:             ${created} datapoints`);
  console.log(`  Updated citations:   ${updatedCitations}`);
  console.log(`  Updated accessions:  ${updatedAccessions}`);
  console.log(`  Skipped (OK):        ${skipped}`);
  console.log(`  Mode:                ${apply ? 'APPLIED' : 'DRY RUN'}`);
}

function inferSourceType(source: string | null | undefined): string {
  if (!source) return 'manual';
  const s = source.toLowerCase();
  if (s.includes('sec') || s.includes('10-q') || s.includes('10-k') || s.includes('8-k')) return 'sec_filing';
  if (s.includes('sedar') || s.includes('amf') || s.includes('tdnet') || s.includes('hkex') || s.includes('asx') || s.includes('mfn') || s.includes('regulatory')) return 'regulatory-filing';
  if (s.includes('press') || s.includes('newswire')) return 'press-release';
  if (s.includes('dashboard') || s.includes('website') || s.includes('company')) return 'company-website';
  return 'manual';
}

async function ensureArtifact(d1: D1Client, input: {
  ticker: string;
  sourceUrl: string | null;
  accession: string | null;
  sourceType: string;
}): Promise<string> {
  // Try to find existing artifact by accession
  if (input.accession) {
    const { results } = await d1.query<any>(
      'SELECT artifact_id FROM artifacts WHERE accession = ? LIMIT 1',
      [input.accession]
    );
    if (results[0]) return results[0].artifact_id;
  }

  // Try by source URL
  if (input.sourceUrl) {
    const { results } = await d1.query<any>(
      'SELECT artifact_id FROM artifacts WHERE source_url = ? LIMIT 1',
      [input.sourceUrl]
    );
    if (results[0]) return results[0].artifact_id;
  }

  // Try by ticker (use most recent)
  const { results: byTicker } = await d1.query<any>(
    'SELECT artifact_id FROM artifacts WHERE ticker = ? ORDER BY fetched_at DESC LIMIT 1',
    [input.ticker]
  );
  if (byTicker[0]) return byTicker[0].artifact_id;

  // Create new artifact
  const artifactId = crypto.randomUUID();
  const now = new Date().toISOString();
  const contentHash = crypto.createHash('md5')
    .update(`static_backfill|${input.ticker}|${input.accession || ''}|${input.sourceUrl || ''}`)
    .digest('hex');

  const r2Key = input.accession
    ? `new-uploads/${input.ticker.toLowerCase()}/${input.accession}.txt`
    : `static-backfill/${input.ticker.toLowerCase()}/${now.slice(0, 10)}.txt`;

  await d1.query(`
    INSERT OR IGNORE INTO artifacts (
      artifact_id, source_type, source_url, content_hash, fetched_at,
      r2_bucket, r2_key, ticker, accession
    ) VALUES (?, ?, ?, ?, ?, 'dat-tracker-filings', ?, ?, ?)
  `, [
    artifactId, input.sourceType, input.sourceUrl, contentHash, now,
    r2Key, input.ticker, input.accession,
  ]);

  // Re-query in case INSERT OR IGNORE hit a constraint
  const { results: actual } = await d1.query<any>(
    'SELECT artifact_id FROM artifacts WHERE content_hash = ? LIMIT 1',
    [contentHash]
  );
  return actual[0]?.artifact_id || artifactId;
}

main().catch(e => { console.error(e); process.exit(1); });
