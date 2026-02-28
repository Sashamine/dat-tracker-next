/**
 * src/lib/fetchers/tdnet/metaplanet.ts
 *
 * Resilient TDnet PDF fetcher and share-count extractor for Metaplanet (3350.T).
 *
 * Architecture:
 *  1. Discover filings: scrape TDnet daily listing HTML pages for code 33500
 *  2. Filter: keep "決算短信" (earnings report) filings
 *  3. Download PDF bytes (with retry + backoff + disk cache)
 *  4. Extract text (pdf-parse, deterministic)
 *  5. Parse with strict regex for 発行済株式数 and period-end date
 *  6. Sanity-check value (>1M, <50B)
 *  7. Return structured ShareDataPoint ready for D1 insertion
 *
 * Resilience:
 *  - AbortController request timeouts
 *  - Polite rate limiting between requests
 *  - Exponential back-off + full jitter on retry
 *  - On-disk PDF cache
 *
 * Provenance:
 *  - sourceUrl = exact PDF URL
 *  - contentHash = md5 of raw PDF bytes
 *  - asOf = period-end date extracted from PDF text or inferred from title
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import * as os from 'node:os';

import { createRequire } from 'node:module';
const _require = createRequire(import.meta.url);

function loadPdfParse(): (buf: Buffer) => Promise<{ text: string }> {
  try {
    const mod = _require('pdf-parse');
    // pdf-parse has changed exports across versions; support both shapes.
    if (typeof mod === 'function') return mod;
    if (mod && typeof mod.default === 'function') return mod.default;
    if (mod && typeof mod.PDFParse === 'function') {
      return async (buf: Buffer) => {
        const p = new mod.PDFParse(new Uint8Array(buf));
        await p.load();
        const out = await p.getText();
        const text = typeof out === 'string' ? out : (out?.text ?? '');
        return { text };
      };
    }
    throw new Error('pdf-parse export shape not recognized');
  } catch {
    throw new Error('Missing dependency: run `npm install pdf-parse @types/pdf-parse`');
  }
}

export const TDNET_BASE = 'https://www.release.tdnet.info';
const DAILY_LIST_URL = (yyyymmdd: string) => `${TDNET_BASE}/inbs/I_list_001_${yyyymmdd}.html`;

export const METAPLANET_TDNET_CODE = '33500';
export const ENTITY_ID = '3350.T';
export const METRIC = 'basic_shares' as const;
export const METHOD = 'jp_tdnet_pdf' as const;

const PREFERRED_TITLE_KEYWORDS: readonly string[] = [
  '決算短信',
  '発行済株式',
  '株式の状況',
  '有価証券報告書',
  '四半期報告書',
];

const EXCLUDED_TITLE_PATTERNS: readonly RegExp[] = [
  /新株予約権/,
  /自己株式の取得/,
  /社債/,
  /説明資料/,
  /訂正/,
];

const REQUEST_INTERVAL_MS = 2000;
const FETCH_TIMEOUT_MS = 45000;
const MAX_RETRY_ATTEMPTS = 4;
const BASE_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 30000;

const DEFAULT_CACHE_DIR = path.join(os.tmpdir(), '.tdnet-cache');
const PDF_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const HTML_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const MIN_SHARES = 1_000_000;
const MAX_SHARES = 50_000_000_000;

let lastRequestAt = 0;

export interface TdnetFilingEntry {
  pdfUrl: string;
  title: string;
  publishedAt: string;
  code: string;
}

export interface ArtifactMeta {
  artifactId: string;
  pdfUrl: string;
  publishedAt: string;
  contentHash: string;
}

export interface ShareDataPoint {
  entityId: typeof ENTITY_ID;
  metric: typeof METRIC;
  asOf: string;
  value: number;
  method: typeof METHOD;
  sourceUrl: string;
  artifact: ArtifactMeta;
  asOfNote: string;
}

export interface ExtractionResult {
  dataPoints: ShareDataPoint[];
  skipped: Array<{ pdfUrl: string; reason: string }>;
}

function cacheDir(): string {
  return process.env.TDNET_CACHE_DIR ?? DEFAULT_CACHE_DIR;
}

function cacheKey(url: string): string {
  return crypto.createHash('md5').update(url).digest('hex');
}

function cacheRead(url: string, ttlMs: number): Buffer | null {
  const fp = path.join(cacheDir(), cacheKey(url));
  if (!fs.existsSync(fp)) return null;
  const { mtimeMs } = fs.statSync(fp);
  if (Date.now() - mtimeMs > ttlMs) return null;
  return fs.readFileSync(fp);
}

function cacheWrite(url: string, data: Buffer): void {
  const dir = cacheDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, cacheKey(url)), data);
}

async function fetchBytes(url: string): Promise<Buffer> {
  let attempt = 0;

  while (true) {
    const gap = Date.now() - lastRequestAt;
    if (gap < REQUEST_INTERVAL_MS) await sleep(REQUEST_INTERVAL_MS - gap);
    lastRequestAt = Date.now();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'dat-tracker-next/1.0 (+https://github.com/Sashamine/dat-tracker-next)',
          Accept: 'text/html,application/pdf,*/*',
          'Accept-Language': 'ja,en;q=0.9',
        },
      });
      clearTimeout(timer);

      if (!res.ok) throw new FetchError(res.status, url);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      clearTimeout(timer);
      attempt++;
      if (attempt >= MAX_RETRY_ATTEMPTS) throw err;

      const isAbort = (err as Error).name === 'AbortError';
      const ceiling = Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
      const delay = isAbort ? ceiling : Math.floor(Math.random() * ceiling);

      console.warn(
        `[tdnet] Attempt ${attempt}/${MAX_RETRY_ATTEMPTS} failed for ${url}: ${(err as Error).message} — retrying in ${delay}ms`
      );
      await sleep(delay);
    }
  }
}

export async function fetchDailyListings(yyyymmdd: string): Promise<TdnetFilingEntry[]> {
  const url = DAILY_LIST_URL(yyyymmdd);

  let htmlBytes = cacheRead(url, HTML_CACHE_TTL_MS);
  if (!htmlBytes) {
    try {
      htmlBytes = await fetchBytes(url);
      cacheWrite(url, htmlBytes);
    } catch (err) {
      if (err instanceof FetchError && err.status === 404) return [];
      throw err;
    }
  }

  return parseListingHtml(htmlBytes.toString('utf8'));
}

function parseListingHtml(html: string): TdnetFilingEntry[] {
  const entries: TdnetFilingEntry[] = [];

  const ROW_RE = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const TD_RE = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  const HREF_RE = /href="([^"]+\.pdf)"/i;

  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = ROW_RE.exec(html)) !== null) {
    const rowHtml = rowMatch[1];

    const cells: string[] = [];
    let tdMatch: RegExpExecArray | null;
    const tdRe = new RegExp(TD_RE.source, 'gi');
    while ((tdMatch = tdRe.exec(rowHtml)) !== null) cells.push(tdMatch[1]);

    if (cells.length < 4) continue;

    const rawCode = stripTags(cells[1]).trim();
    const rawTime = stripTags(cells[0]).trim();
    const titleCell = cells[3] ?? '';

    if (rawCode !== METAPLANET_TDNET_CODE) continue;

    const hrefMatch = HREF_RE.exec(titleCell);
    if (!hrefMatch) continue;

    const pdfPath = hrefMatch[1];
    const pdfUrl = pdfPath.startsWith('http')
      ? pdfPath
      : `${TDNET_BASE}${pdfPath.startsWith('/') ? '' : '/inbs/'}${pdfPath.replace(/^.*\//, '')}`;

    const title = stripTags(titleCell).trim().replace(/\s+/g, ' ');

    entries.push({
      pdfUrl,
      title,
      publishedAt: rawTime,
      code: rawCode,
    });
  }

  return entries;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

export async function findMetaplanetFilings(startDate: Date, endDate: Date): Promise<TdnetFilingEntry[]> {
  const results: TdnetFilingEntry[] = [];
  const seen = new Set<string>();
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const yyyymmdd = toYYYYMMDD(cursor);
    try {
      const day = await fetchDailyListings(yyyymmdd);
      for (const entry of day) {
        if (!seen.has(entry.pdfUrl)) {
          seen.add(entry.pdfUrl);
          results.push(entry);
        }
      }
    } catch (err) {
      console.warn(`[tdnet] Skipping ${yyyymmdd}: ${(err as Error).message}`);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return results;
}

export function scoreFilingForShares(entry: TdnetFilingEntry): number {
  for (const pat of EXCLUDED_TITLE_PATTERNS) {
    if (pat.test(entry.title)) return -1;
  }

  for (let i = 0; i < PREFERRED_TITLE_KEYWORDS.length; i++) {
    if (entry.title.includes(PREFERRED_TITLE_KEYWORDS[i])) {
      return PREFERRED_TITLE_KEYWORDS.length - i;
    }
  }

  return 0;
}

export async function downloadPdf(pdfUrl: string): Promise<Buffer> {
  const cached = cacheRead(pdfUrl, PDF_CACHE_TTL_MS);
  if (cached) return cached;
  const bytes = await fetchBytes(pdfUrl);
  cacheWrite(pdfUrl, bytes);
  return bytes;
}

export interface PdfExtraction {
  candidates: Array<{ value: number; label: string; context: string; confidence: 'high' | 'medium' }>;
  periodEnd: string | null;
  periodEndNote: string;
}

async function extractPdfText(pdfBytes: Buffer): Promise<string> {
  const pdfParse = loadPdfParse();
  const result = await pdfParse(pdfBytes);
  return result.text;
}

export function parsePdfText(text: string, titleHint = ''): PdfExtraction {
  const candidates: PdfExtraction['candidates'] = [];

  const sectionHeaderIdx = text.indexOf('発行済株式数');
  if (sectionHeaderIdx !== -1) {
    const window = text.slice(sectionHeaderIdx, sectionHeaderIdx + 4000);
    const SHARE_NUM_RE =
      /(?:\b20\d{2}年[\s\S]{0,20}?(?:12月期|3月期|6月期|9月期)[\s\S]{0,80}?)?(\d[\d,]{3,})\s*株/g;

    let m: RegExpExecArray | null;
    while ((m = SHARE_NUM_RE.exec(window)) !== null) {
      const raw = m[1].replace(/,/g, '');
      let n = parseInt(raw, 10);

      const contextStart = Math.max(0, m.index - 30);
      const ctx = window.slice(contextStart, m.index + m[0].length + 10);

      if (!isFinite(n) || n < MIN_SHARES || n > MAX_SHARES) continue;

      const isWithTreasury = ctx.includes('自己株式を含む');
      const label = isWithTreasury ? '期末発行済株式数（自己株式を含む）' : '発行済株式数';

      candidates.push({
        value: n,
        label,
        context: ctx.replace(/\s+/g, ' ').trim(),
        confidence: isWithTreasury ? 'high' : 'medium',
      });
    }
  }

  if (candidates.length === 0) {
    const COMMON_STOCK_RE = /普通株式\s+(\d[\d,]{5,})\s*株/g;
    let m: RegExpExecArray | null;
    while ((m = COMMON_STOCK_RE.exec(text)) !== null) {
      const raw = m[1].replace(/,/g, '');
      const n = parseInt(raw, 10);
      if (!isFinite(n) || n < MIN_SHARES || n > MAX_SHARES) continue;
      const ctx = text.slice(Math.max(0, m.index - 30), m.index + m[0].length + 10);
      candidates.push({
        value: n,
        label: '普通株式',
        context: ctx.replace(/\s+/g, ' ').trim(),
        confidence: 'medium',
      });
    }
  }

  let periodEnd: string | null = null;
  let periodEndNote = '';

  const RANGE_END_RE = /至\s*(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/;
  const rangeMatch = RANGE_END_RE.exec(text);
  if (rangeMatch) {
    periodEnd = toISODate(parseInt(rangeMatch[1]), parseInt(rangeMatch[2]), parseInt(rangeMatch[3]));
    periodEndNote = `Extracted from "至 ${rangeMatch[1]}年${rangeMatch[2]}月${rangeMatch[3]}日" in PDF text`;
  }

  if (!periodEnd) {
    const FULL_DATE_RE = /(?:期末|決算日|期間末)[\s\S]{0,20}(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/;
    const m = FULL_DATE_RE.exec(text);
    if (m) {
      periodEnd = toISODate(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]));
      periodEndNote = `Extracted from "${m[0].replace(/\s+/g, ' ').trim()}" near 期末 keyword`;
    }
  }

  if (!periodEnd) {
    const FISCAL_PERIOD_RE = /(\d{4})年\s*(\d{1,2})月\s*期/;
    const m = FISCAL_PERIOD_RE.exec(text);
    if (m) {
      const year = parseInt(m[1]);
      const month = parseInt(m[2]);
      const lastDay = new Date(year, month, 0).getDate();
      periodEnd = toISODate(year, month, lastDay);
      periodEndNote = `Inferred from "${m[0].trim()}" — mapped to last day of month ${month}/${year}`;
    }
  }

  if (!periodEnd && titleHint) {
    const TITLE_PERIOD_RE = /(\d{4})年\s*(\d{1,2})月\s*期/;
    const m = TITLE_PERIOD_RE.exec(titleHint);
    if (m) {
      const year = parseInt(m[1]);
      const month = parseInt(m[2]);
      const lastDay = new Date(year, month, 0).getDate();
      periodEnd = toISODate(year, month, lastDay);
      periodEndNote = `Inferred from title "${titleHint}" — mapped to last day of month ${month}/${year}`;
    }
  }

  return { candidates, periodEnd, periodEndNote };
}

export async function ingestFromUrls(entries: TdnetFilingEntry[]): Promise<ExtractionResult> {
  const dataPoints: ShareDataPoint[] = [];
  const skipped: Array<{ pdfUrl: string; reason: string }> = [];

  const sorted = [...entries].sort((a, b) => scoreFilingForShares(b) - scoreFilingForShares(a));
  const byAsOf = new Map<string, ShareDataPoint>();

  for (const entry of sorted) {
    const score = scoreFilingForShares(entry);
    if (score < 0) {
      skipped.push({ pdfUrl: entry.pdfUrl, reason: `Excluded filing type: "${entry.title}"` });
      continue;
    }

    let pdfBytes: Buffer;
    try {
      pdfBytes = await downloadPdf(entry.pdfUrl);
    } catch (err) {
      skipped.push({ pdfUrl: entry.pdfUrl, reason: `PDF download failed: ${(err as Error).message}` });
      continue;
    }

    let text: string;
    try {
      text = await extractPdfText(pdfBytes);
    } catch (err) {
      skipped.push({ pdfUrl: entry.pdfUrl, reason: `pdf-parse failed: ${(err as Error).message}` });
      continue;
    }

    const extraction = parsePdfText(text, entry.title);

    if (extraction.candidates.length === 0) {
      skipped.push({ pdfUrl: entry.pdfUrl, reason: 'No share count found in PDF text' });
      continue;
    }

    if (!extraction.periodEnd) {
      skipped.push({
        pdfUrl: entry.pdfUrl,
        reason: 'Could not determine period-end date. Hint: try providing an explicit date via --override-date',
      });
      continue;
    }

    const best = extraction.candidates.sort((a, b) => {
      if (a.confidence !== b.confidence) return a.confidence === 'high' ? -1 : 1;
      return b.value - a.value;
    })[0];

    const contentHash = crypto.createHash('md5').update(pdfBytes).digest('hex');
    const artifactId = crypto.createHash('sha256').update(`tdnet:${entry.pdfUrl}`).digest('hex').slice(0, 32);

    const dp: ShareDataPoint = {
      entityId: ENTITY_ID,
      metric: METRIC,
      asOf: extraction.periodEnd,
      value: best.value,
      method: METHOD,
      sourceUrl: entry.pdfUrl,
      artifact: {
        artifactId,
        pdfUrl: entry.pdfUrl,
        publishedAt: entry.publishedAt,
        contentHash,
      },
      asOfNote: extraction.periodEndNote,
    };

    const existing = byAsOf.get(extraction.periodEnd);
    if (!existing || best.confidence === 'high') {
      byAsOf.set(extraction.periodEnd, dp);
    }
  }

  dataPoints.push(...byAsOf.values());
  return { dataPoints, skipped };
}

export async function ingestByDateRange(opts: { startDate: Date; endDate: Date }): Promise<ExtractionResult> {
  const filings = await findMetaplanetFilings(opts.startDate, opts.endDate);
  return ingestFromUrls(filings);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${dd}`;
}

function toISODate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

class FetchError extends Error {
  readonly name = 'FetchError';
  constructor(public readonly status: number, public readonly url: string) {
    super(`HTTP ${status}: ${url}`);
  }
}
