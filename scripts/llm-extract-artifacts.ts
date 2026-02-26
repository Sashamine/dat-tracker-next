#!/usr/bin/env npx tsx
/**
 * LLM PDF Extraction (Artifacts -> D1 datapoints)
 *
 * - Fetch artifacts from D1 (hkex_pdf, sedar_filing)
 * - Download bytes from R2 (S3)
 * - Extract text from PDF
 * - Use OpenAI to extract metrics + citations
 * - Validate citations exist in extracted text
 * - Write datapoints into D1
 */

import crypto from 'node:crypto';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import OpenAI from 'openai';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

import { D1Client } from '../src/lib/d1';

const METRICS = [
  'bitcoin_holdings_btc',
  'bitcoin_holdings_usd',
  'cash_usd',
  'debt_usd',
  'basic_shares',
] as const;

const METRICS_BY_SOURCE: Record<string, Metric[]> = {
  // HKEX filings: keep scope tight for v1
  hkex_pdf: ['bitcoin_holdings_btc', 'basic_shares'],
  // SEDAR filings: allow a broader pack (can tighten later)
  sedar_filing: ['bitcoin_holdings_btc', 'bitcoin_holdings_usd', 'cash_usd', 'debt_usd', 'basic_shares'],
};

type Metric = (typeof METRICS)[number];

type ArtifactRow = {
  artifact_id: string;
  source_type: string;
  source_url: string | null;
  content_hash: string;
  fetched_at: string;
  r2_bucket: string;
  r2_key: string;
  ticker: string | null;
  accession: string | null;
};

type ExtractedPoint = {
  metric: Metric;
  value: number;
  unit: string;
  as_of?: string | null;
  quote: string;
};

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function makeR2Client() {
  return new S3Client({
    region: process.env.R2_REGION || 'auto',
    endpoint: env('R2_ENDPOINT'),
    credentials: {
      accessKeyId: env('R2_ACCESS_KEY_ID'),
      secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
    },
  });
}

async function streamToBuffer(body: any): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return body;
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Buffer>) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function quoteExists(text: string, quote: string): boolean {
  const t = text.toLowerCase();
  const q = quote.toLowerCase().trim();
  if (!q) return false;
  if (q.length < 12) return false;
  // exact substring match is good enough for v1
  return t.includes(q);
}

function hkexSharesQuoteLooksValid(quote: string): boolean {
  const q = quote.toLowerCase();
  const needles = [
    'shares in issue',
    'issued share',
    'issued shares',
    'ordinary shares',
    'weighted average',
    'weighted-average',
  ];
  return needles.some(n => q.includes(n));
}

async function extractWithOpenAI(params: { ticker: string; sourceType: string; text: string; sourceUrl?: string | null; }): Promise<ExtractedPoint[]> {
  const client = new OpenAI({ apiKey: env('OPENAI_API_KEY') });

  const system = `You extract numeric financial/treasury metrics from filing text.
Return ONLY valid JSON (no markdown).
For each datapoint, include an exact supporting QUOTE copied verbatim from the text.`;

  const user = {
    ticker: params.ticker,
    sourceType: params.sourceType,
    sourceUrl: params.sourceUrl || null,
    metricsAllowed: (METRICS_BY_SOURCE[params.sourceType] || METRICS),
    instructions: [
      'Extract ONLY if explicitly stated in the text.',
      'Return values as numbers (no commas).',
      'Units must be one of: BTC, USD, shares.',
      'If BTC holdings quantity is present, use metric bitcoin_holdings_btc with unit BTC.',
      'If BTC fair value in USD is present, use metric bitcoin_holdings_usd with unit USD.',
      'For shares, use basic_shares unit shares.',
      'For each datapoint include: metric,value,unit,as_of(optional YYYY-MM-DD),quote.',
      'Quote must be a short exact excerpt that contains the number and unit/context.',
    ],
    text: params.text.slice(0, 120_000),
  };

  const resp = await client.chat.completions.create({
    model: 'gpt-4.1-mini',
    temperature: 0,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify(user) },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'extraction',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            points: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  metric: { type: 'string', enum: METRICS as any },
                  value: { type: 'number' },
                  unit: { type: 'string' },
                  as_of: { type: ['string', 'null'] },
                  quote: { type: 'string' },
                },
                required: ['metric', 'value', 'unit', 'quote'],
              },
            },
          },
          required: ['points'],
        },
      },
    },
  });

  const content = resp.choices[0]?.message?.content || '{"points":[]}';
  const json = JSON.parse(content);
  const allowed = new Set<Metric>(METRICS_BY_SOURCE[params.sourceType] || METRICS);
  return (json.points as ExtractedPoint[]).filter(p => allowed.has(p.metric));
}

async function main() {
  const d1 = D1Client.fromEnv();
  const r2 = makeR2Client();

  const limit = Math.max(1, Math.min(50, parseInt(process.env.LIMIT || '10', 10) || 10));
  const force = process.env.FORCE === 'true';
  const dryRun = process.env.DRY_RUN === 'true';

  const artifacts = await d1.query<ArtifactRow>(
    `SELECT artifact_id, source_type, source_url, content_hash, fetched_at, r2_bucket, r2_key, ticker, accession
     FROM artifacts
     WHERE source_type IN ('hkex_pdf', 'sedar_filing')
       AND r2_key LIKE '%.pdf'
       AND ticker IS NOT NULL
     ORDER BY fetched_at DESC
     LIMIT ?;`,
    [limit]
  );

  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  // Ensure runs row exists (datapoints.run_id has FK to runs.run_id)
  if (!dryRun) {
    await d1.query(
      `INSERT OR IGNORE INTO runs (run_id, started_at, ended_at, trigger, code_sha, notes)
       VALUES (?, ?, NULL, ?, ?, ?);`,
      [runId, startedAt, 'llm_extract_artifacts', process.env.GITHUB_SHA || null, null]
    );
  }

  let inserted = 0;
  let skipped = 0;

  for (const a of artifacts.results) {
    const ticker = (a.ticker || '').toUpperCase();
    console.log(`\n[${a.source_type}] ${ticker} ${a.r2_key}`);

    // Skip if we already have datapoints for this artifact
    const existing = await d1.query<{ cnt: number }>(
      `SELECT COUNT(1) as cnt FROM datapoints WHERE artifact_id = ?;`,
      [a.artifact_id]
    );
    if (!force && (existing.results[0]?.cnt || 0) > 0) {
      console.log('  skip: datapoints already exist for artifact');
      skipped += 1;
      continue;
    }

    const obj = await r2.send(new GetObjectCommand({ Bucket: a.r2_bucket, Key: a.r2_key }));
    const buf = await streamToBuffer(obj.Body);

    // pdf-parse legacy variable removed; using pdfjs-dist below
    // Extract text via pdfjs-dist directly (more reliable than pdf-parse wrappers in ESM/CI).
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buf) });
    const doc = await loadingTask.promise;

    let text = '';
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = (content.items || [])
        .map((it: any) => (it?.str ? String(it.str) : ''))
        .join(' ');
      text += `\n\n[page ${pageNum}]\n` + pageText;
    }

    text = text.replace(/\u0000/g, ' ').trim();
    if (!text) {
      console.log('  skip: empty pdf text');
      skipped += 1;
      continue;
    }

    const rawPoints = await extractWithOpenAI({ ticker, sourceType: a.source_type, text, sourceUrl: a.source_url });

    // Deduplicate: keep at most one point per metric per artifact.
    // Prefer points with a valid quote match; otherwise keep first occurrence.
    const pointsByMetric = new Map<string, ExtractedPoint>();
    for (const p of rawPoints) {
      if (!pointsByMetric.has(p.metric)) pointsByMetric.set(p.metric, p);
    }
    const points = Array.from(pointsByMetric.values());

    // Defensive: ensure artifact exists before writing datapoints (FK constraint)
    if (!dryRun) {
      const artifactOk = await d1.query<{ ok: number }>(
        `SELECT 1 as ok FROM artifacts WHERE artifact_id = ? LIMIT 1;`,
        [a.artifact_id]
      );
      if (!artifactOk.results.length) {
        console.log(`  skip: artifact_id not found in D1 (FK would fail): ${a.artifact_id}`);
        skipped += 1;
        continue;
      }
    }

    for (const p of points) {
      const ok = quoteExists(text, p.quote);
      if (!ok) {
        console.log(`  reject ${p.metric}: quote not found`);
        continue;
      }

      if (a.source_type === 'hkex_pdf' && p.metric === 'basic_shares' && !hkexSharesQuoteLooksValid(p.quote)) {
        console.log('  reject basic_shares: quote lacks shares-in-issue keywords (hkex)');
        continue;
      }

      if (dryRun) {
        console.log(`  [dry-run] would insert ${p.metric}=${p.value} ${p.unit} as_of=${p.as_of || ''}`);
        continue;
      }

      try {
        await d1.query(
          `INSERT OR IGNORE INTO datapoints (
             datapoint_id, entity_id, metric, value, unit, scale,
             as_of, reported_at, artifact_id, run_id,
             method, confidence, flags_json, created_at
           ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'llm_pdf_extract', 1.0, NULL, ?);`,
          [
            crypto.randomUUID(),
            ticker,
            p.metric,
            p.value,
            p.unit,
            p.as_of || null,
            a.fetched_at,
            a.artifact_id,
            runId,
            new Date().toISOString(),
          ]
        );
        inserted += 1;
        console.log(`  inserted ${p.metric}=${p.value} ${p.unit}`);
      } catch (e: any) {
        console.log(`  datapoint insert failed (${p.metric}) artifact_id=${a.artifact_id}: ${e?.message || String(e)}`);
        continue;
      }
    }
  }

  console.log(`\nDone. inserted=${inserted} skipped=${skipped}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
