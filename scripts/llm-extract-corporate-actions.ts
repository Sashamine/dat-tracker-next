#!/usr/bin/env npx tsx
/**
 * LLM Extraction: Corporate Actions (splits / reverse splits)
 *
 * - Fetch artifacts from D1 (hkex_pdf, sedar_filing, sec_filing)
 * - Extract PDF text (for PDFs) or decode text/HTML
 * - Use OpenAI to extract corporate action events
 * - Validate quote exists + simple numeric sanity checks
 * - Insert into D1 corporate_actions
 */

import crypto from 'node:crypto';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import OpenAI from 'openai';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

import { D1Client } from '../src/lib/d1';

type ArtifactRow = {
  artifact_id: string;
  source_type: string;
  source_url: string | null;
  fetched_at: string;
  r2_bucket: string;
  r2_key: string;
  ticker: string | null;
};

type ExtractedAction = {
  action_type: 'split' | 'reverse_split' | 'consolidation' | 'subdivision';
  ratio: number;
  effective_date: string | null;
  quote: string;
  confidence: number;
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
  return t.includes(q);
}

function isYyyyMmDd(s: string | null): boolean {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function splitKeywordHits(text: string): { hit: string; index: number }[] {
  const t = text.toLowerCase();
  const needles = [
    // Explicit split language
    'reverse stock split',
    'reverse split',
    'forward stock split',
    'stock split',
    'split of our common stock',
    'was subdivided into',
    'was consolidated into',
    'shares were combined into',
    'each share was subdivided into',
    'share consolidation',
    'share subdivision',
    // Weak indicators (still useful for snippet logging, but not enough alone)
    'subdivision',
    'consolidation of',
    'split-adjusted',
    'split adjusted',
  ];
  const hits: { hit: string; index: number }[] = [];
  for (const n of needles) {
    const idx = t.indexOf(n);
    if (idx >= 0) hits.push({ hit: n, index: idx });
  }
  return hits.sort((a, b) => a.index - b.index);
}

function isBoilerplateSplitAdjustment(text: string): boolean {
  const t = text.toLowerCase();
  const boiler = [
    'subject to adjustment for stock splits',
    'adjusted for stock splits',
    'retroactively adjusted for stock splits',
    'adjustment for stock splits',
    'stock splits, stock dividends, recapitalizations',
  ];
  return boiler.some(b => t.includes(b));
}

function hasSplitRatioPattern(text: string): boolean {
  // Look for ratio/structure patterns commonly used in split disclosures.
  const t = text.toLowerCase();
  const patterns: RegExp[] = [
    /\b\d+\s*[- ]?for\s*[- ]?\d+\b/i, // 10-for-1
    /\b\d+\s*:\s*\d+\b/i, // 1:10
    /\b1\s*[- ]?for\s*[- ]?\d+\b/i, // 1-for-25
    /\bone\s*\(\s*1\s*\)\s*[- ]?for\s*[- ]?\w+/i,
    /\bevery\s+\w+\s*\(\s*\d+\s*\)\s+shares?.{0,60}one\s*\(\s*1\s*\)\s+share/i,
    /\bon the basis of\b.{0,80}\bpost-?reverse\b/i,
  ];
  return patterns.some(re => re.test(t));
}

function looksSplitRelated(text: string): boolean {
  if (isBoilerplateSplitAdjustment(text)) return false;

  // Require explicit split language AND a ratio pattern.
  const hits = splitKeywordHits(text);
  const strongNeedles = [
    'reverse stock split',
    'reverse split',
    'forward stock split',
    'stock split',
    'split of our common stock',
    'share consolidation',
    'share subdivision',
    'was subdivided into',
    'was consolidated into',
    'shares were combined into',
    'each share was subdivided into',
  ];

  const strongHit = hits.some(h => strongNeedles.includes(h.hit));
  if (!strongHit) return false;
  if (!hasSplitRatioPattern(text)) return false;
  return true;
}

async function extractWithOpenAI(params: {
  ticker: string;
  sourceType: string;
  text: string;
  sourceUrl?: string | null;
}): Promise<ExtractedAction[]> {
  const client = new OpenAI({ apiKey: env('OPENAI_API_KEY') });

  const system = `You extract stock share corporate actions from filing text.
Return ONLY valid JSON (no markdown).
Only include events that are explicitly stated in the text.
A corporate action must include an exact supporting QUOTE copied verbatim from the text.`;

  const user = {
    ticker: params.ticker,
    sourceType: params.sourceType,
    sourceUrl: params.sourceUrl || null,
    keywords: ['split', 'reverse split', 'share consolidation', 'consolidation', 'subdivision'],
    instructions: [
      'Extract corporate actions affecting share count / per-share prices, such as splits, reverse splits, consolidations, subdivisions.',
      'Represent each event with fields: action_type, ratio, effective_date (YYYY-MM-DD or null), quote, confidence (0..1).',
      'ratio is the multiplier applied to shares going forward in time from effective_date.',
      'Examples: 2-for-1 split => ratio=2; 1-for-10 reverse split/consolidation => ratio=0.1.',
      'If text says "consolidation of 10 old shares into 1 new share" => ratio=0.1.',
      'If text says "subdivision of 1 share into 5 shares" => ratio=5.',
      'effective_date should be the date the corporate action took effect if present; otherwise null.',
      'Quote must be short and contain the key numbers (e.g., "10 old shares into 1 new share") and ideally the effective date.',
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
        name: 'corporate_actions_extraction',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            actions: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  action_type: { type: 'string', enum: ['split', 'reverse_split', 'consolidation', 'subdivision'] },
                  ratio: { type: 'number' },
                  effective_date: { type: ['string', 'null'] },
                  quote: { type: 'string' },
                  confidence: { type: 'number' },
                },
                required: ['action_type', 'ratio', 'effective_date', 'quote', 'confidence'],
              },
            },
          },
          required: ['actions'],
        },
      },
    },
  });

  const content = resp.choices[0]?.message?.content || '{"actions":[]}';
  const json = JSON.parse(content);
  return (json.actions as ExtractedAction[]) || [];
}

async function main() {
  const d1 = D1Client.fromEnv();
  const r2 = makeR2Client();

  const limit = Math.max(1, Math.min(500, parseInt(process.env.LIMIT || '10', 10) || 10));
  const force = process.env.FORCE === 'true';
  const dryRun = process.env.DRY_RUN === 'true';

  const tickerFilter = (process.env.TICKER || '').trim().toUpperCase();

  // Debug counts
  const counts = await d1.query<{ source_type: string; cnt: number }>(
    `SELECT source_type, COUNT(1) as cnt
     FROM artifacts
     WHERE source_type IN ('hkex_pdf', 'sedar_filing', 'sec_filing')
       AND ticker IS NOT NULL
     GROUP BY source_type
     ORDER BY cnt DESC;`
  );
  console.log('Artifact counts:', counts.results);

  const artifacts = await d1.query<ArtifactRow>(
    `SELECT artifact_id, source_type, source_url, fetched_at, r2_bucket, r2_key, ticker
     FROM artifacts
     WHERE source_type IN ('hkex_pdf', 'sedar_filing', 'sec_filing')
       AND ticker IS NOT NULL
       AND (? = '' OR UPPER(ticker) = ?)
       AND (
         (source_type IN ('hkex_pdf','sedar_filing') AND r2_key LIKE '%.pdf')
         OR (source_type = 'sec_filing' AND (r2_key LIKE '%.html' OR r2_key LIKE '%.htm' OR r2_key LIKE '%.txt'))
       )
     ORDER BY fetched_at DESC
     LIMIT ?;`,
    [tickerFilter, tickerFilter, limit]
  );

  let inserted = 0;
  let skipped = 0;
  let candidates = 0;

  for (const a of artifacts.results) {
    const ticker = (a.ticker || '').toUpperCase();
    console.log(`\n[${a.source_type}] ${ticker} ${a.r2_key}`);

    // Skip if we already have corporate actions for this artifact
    const existing = await d1.query<{ cnt: number }>(
      `SELECT COUNT(1) as cnt FROM corporate_actions WHERE source_artifact_id = ?;`,
      [a.artifact_id]
    );
    if (!force && (existing.results[0]?.cnt || 0) > 0) {
      console.log('  skip: corporate_actions already exist for artifact');
      skipped += 1;
      continue;
    }

    const obj = await r2.send(new GetObjectCommand({ Bucket: a.r2_bucket, Key: a.r2_key }));
    const buf = await streamToBuffer(obj.Body);

    let text = '';

    if (a.r2_key.toLowerCase().endsWith('.pdf')) {
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buf),
        // Reduce pdf.js warnings / improve text extraction quality
        // Note: these are best-effort; if assets aren't present, pdf.js will still run.
        cMapUrl: new URL('pdfjs-dist/cmaps/', import.meta.url).toString(),
        cMapPacked: true,
        standardFontDataUrl: new URL('pdfjs-dist/standard_fonts/', import.meta.url).toString(),
      });
      const doc = await loadingTask.promise;

      for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        const page = await doc.getPage(pageNum);
        const content = await page.getTextContent();
        const pageText = (content.items || [])
          .map((it: any) => (it?.str ? String(it.str) : ''))
          .join(' ');
        text += `\n\n[page ${pageNum}]\n` + pageText;
      }
    } else {
      // SEC filings are typically stored as HTML or plain text.
      // Decode as UTF-8 (lossy) and let the LLM handle markup.
      text = new TextDecoder('utf-8', { fatal: false }).decode(buf);
    }

    text = text.replace(/\u0000/g, ' ').trim();
    if (!text) {
      console.log('  skip: empty pdf text');
      skipped += 1;
      continue;
    }

    if (!looksSplitRelated(text)) {
      console.log('  skip: no split-related keywords');
      skipped += 1;
      continue;
    }

    candidates += 1;
    const hits = splitKeywordHits(text).slice(0, 3);
    if (hits.length) {
      const start = Math.max(0, hits[0].index - 120);
      const end = Math.min(text.length, hits[0].index + 240);
      const snippet = text.slice(start, end).replace(/\s+/g, ' ').trim();
      console.log(
        `  candidate artifact_id=${a.artifact_id} ticker=${ticker} key=${a.r2_key} keywords=${hits
          .map(h => h.hit)
          .join(', ')} snippet="${snippet}"`
      );
    }

    const extracted = await extractWithOpenAI({ ticker, sourceType: a.source_type, text, sourceUrl: a.source_url });
    if (!extracted.length) {
      // Re-log snippet context to diagnose why the model returned no actions
      if (hits.length) {
        const start = Math.max(0, hits[0].index - 120);
        const end = Math.min(text.length, hits[0].index + 240);
        const snippet = text.slice(start, end).replace(/\s+/g, ' ').trim();
        console.log(`  note: LLM returned 0 actions artifact_id=${a.artifact_id} ticker=${ticker} key=${a.r2_key} snippet="${snippet}"`);
      } else {
        console.log(`  note: LLM returned 0 actions artifact_id=${a.artifact_id} ticker=${ticker} key=${a.r2_key}`);
      }
      continue;
    }

    for (const ca of extracted) {
      // Validate quote exists
      if (!quoteExists(text, ca.quote)) {
        console.log(`  reject: quote not found for action ratio=${ca.ratio}`);
        continue;
      }
      // Validate ratio sanity
      if (!Number.isFinite(ca.ratio) || ca.ratio <= 0 || ca.ratio > 1000) {
        console.log(`  reject: invalid ratio ${ca.ratio}`);
        continue;
      }
      // Validate effective_date if present
      if (ca.effective_date && !isYyyyMmDd(ca.effective_date)) {
        console.log(`  reject: invalid effective_date ${ca.effective_date}`);
        continue;
      }
      if (!Number.isFinite(ca.confidence) || ca.confidence < 0 || ca.confidence > 1) {
        console.log(`  reject: invalid confidence ${ca.confidence}`);
        continue;
      }

      if (dryRun) {
        console.log(`  [dry-run] would insert ${ca.action_type} ratio=${ca.ratio} effective_date=${ca.effective_date || ''}`);
        continue;
      }

      await d1.query(
        `INSERT OR IGNORE INTO corporate_actions (
           action_id, entity_id, action_type, ratio, effective_date,
           source_artifact_id, source_url, quote, confidence, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          crypto.randomUUID(),
          ticker,
          ca.action_type,
          ca.ratio,
          // If no effective date, anchor to fetched_at date (better than null; required column)
          (ca.effective_date || a.fetched_at.slice(0, 10)),
          a.artifact_id,
          a.source_url,
          ca.quote,
          ca.confidence,
          new Date().toISOString(),
        ]
      );
      inserted += 1;
      console.log(`  inserted ${ca.action_type} ratio=${ca.ratio}`);
    }
  }

  console.log(`\nDone. candidates=${candidates} inserted=${inserted} skipped=${skipped}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
