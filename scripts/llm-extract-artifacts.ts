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
const pdfParseImport = require('pdf-parse');

import { D1Client } from '../src/lib/d1';

const METRICS = [
  'bitcoin_holdings_btc',
  'bitcoin_holdings_usd',
  'cash_usd',
  'debt_usd',
  'basic_shares',
] as const;

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

async function extractWithOpenAI(params: { ticker: string; sourceType: string; text: string; sourceUrl?: string | null; }): Promise<ExtractedPoint[]> {
  const client = new OpenAI({ apiKey: env('OPENAI_API_KEY') });

  const system = `You extract numeric financial/treasury metrics from filing text.
Return ONLY valid JSON (no markdown).
For each datapoint, include an exact supporting QUOTE copied verbatim from the text.`;

  const user = {
    ticker: params.ticker,
    sourceType: params.sourceType,
    sourceUrl: params.sourceUrl || null,
    metricsAllowed: METRICS,
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
  return json.points as ExtractedPoint[];
}

async function main() {
  const d1 = D1Client.fromEnv();
  const r2 = makeR2Client();

  const limit = Math.max(1, Math.min(50, parseInt(process.env.LIMIT || '10', 10) || 10));

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
    if ((existing.results[0]?.cnt || 0) > 0) {
      console.log('  skip: datapoints already exist for artifact');
      skipped += 1;
      continue;
    }

    const obj = await r2.send(new GetObjectCommand({ Bucket: a.r2_bucket, Key: a.r2_key }));
    const buf = await streamToBuffer(obj.Body);

    const pdfParse = (pdfParseImport as any)?.default || (pdfParseImport as any);
    // pdf-parse v2+ exports a PDFParse class. Use it to load + getText.
    const parser = new pdfParseImport.PDFParse({ verbosity: 0 });
    await parser.load(buf);
    const parsedText = await parser.getText();
    const text = String(parsedText || '').replace(/\u0000/g, ' ').trim();
    if (!text) {
      console.log('  skip: empty pdf text');
      skipped += 1;
      continue;
    }

    const points = await extractWithOpenAI({ ticker, sourceType: a.source_type, text, sourceUrl: a.source_url });

    for (const p of points) {
      const ok = quoteExists(text, p.quote);
      if (!ok) {
        console.log(`  reject ${p.metric}: quote not found`);
        continue;
      }

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
    }
  }

  console.log(`\nDone. inserted=${inserted} skipped=${skipped}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
