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

async function loadPdfParse(): Promise<(buf: Buffer) => Promise<{ text: string }>> {
  // Import inner module directly to skip index.js test file side effect.
  // pdf-parse is externalized via serverExternalPackages in next.config.ts.
  // @ts-expect-error - pdf-parse/lib/pdf-parse has no type declarations
  const mod = await import('pdf-parse/lib/pdf-parse');
  const fn = typeof mod === 'function' ? mod : mod.default;
  if (typeof fn !== 'function') {
    throw new Error(`pdf-parse export shape not recognized: ${typeof fn}`);
  }
  return fn;
}

export const TDNET_BASE = 'https://www.release.tdnet.info';
const DAILY_LIST_URL = (yyyymmdd: string) => `${TDNET_BASE}/inbs/I_list_001_${yyyymmdd}.html`;

export const METAPLANET_TDNET_CODE = '33500';
export const ENTITY_ID = '3350.T';
export const METRIC = 'basic_shares' as const;
export const METHOD = 'jp_tdnet_pdf' as const;
export const BTC_METRIC = 'holdings_native' as const;
export const BTC_METHOD = 'jp_tdnet_pdf_btc' as const;

/** TDnet company codes: stock code + trailing 0 */
export const TDNET_COMPANIES: Record<string, { code: string; name: string }> = {
  '3350.T': { code: '33500', name: 'Metaplanet' },
  '3189.T': { code: '31890', name: 'ANAP Holdings' },
  '3825.T': { code: '38250', name: 'Remixpoint' },
};

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
  entityId: string;
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
  btcDataPoints: BtcHoldingsDataPoint[];
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
      // 404 on daily listing pages = weekend/holiday, not transient — don't retry
      if (err instanceof FetchError && err.status === 404) throw err;
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

export async function fetchDailyListings(yyyymmdd: string, codes?: Set<string>): Promise<TdnetFilingEntry[]> {
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

  return parseListingHtml(htmlBytes.toString('utf8'), codes);
}

function parseListingHtml(html: string, codes?: Set<string>): TdnetFilingEntry[] {
  const filterCodes = codes ?? new Set([METAPLANET_TDNET_CODE]);
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

    if (!filterCodes.has(rawCode)) continue;

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

/**
 * Scan TDnet daily listing pages for filings matching any of the given codes.
 * When multiple companies share the same date range, this is efficient because
 * each daily page is fetched only once and filtered for all codes.
 */
export async function findFilings(codes: Set<string>, startDate: Date, endDate: Date): Promise<TdnetFilingEntry[]> {
  const results: TdnetFilingEntry[] = [];
  const seen = new Set<string>();
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const yyyymmdd = toYYYYMMDD(cursor);
    try {
      const day = await fetchDailyListings(yyyymmdd, codes);
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

export async function findMetaplanetFilings(startDate: Date, endDate: Date): Promise<TdnetFilingEntry[]> {
  return findFilings(new Set([METAPLANET_TDNET_CODE]), startDate, endDate);
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

export interface BtcExtraction {
  candidates: Array<{ value: number; label: string; context: string; confidence: 'high' | 'medium' }>;
}

export interface BtcHoldingsDataPoint {
  entityId: string;
  metric: typeof BTC_METRIC;
  asOf: string;
  value: number;
  method: typeof BTC_METHOD;
  sourceUrl: string;
  artifact: ArtifactMeta;
  asOfNote: string;
}

async function extractPdfText(pdfBytes: Buffer): Promise<string> {
  const pdfParse = await loadPdfParse();
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

/**
 * Parse BTC holdings from Japanese financial filing text.
 *
 * Metaplanet's earnings reports (決算短信) and TDnet disclosures mention
 * Bitcoin holdings in patterns like:
 * - "ビットコイン 35,102 BTC"
 * - "暗号資産 ビットコイン 35,102BTC"
 * - "BTC保有数 35,102"
 * - "35,102 BTC" (generic)
 * - "ビットコイン（BTC）保有数量：35,102"
 *
 * Also handles Metaplanet's operational update disclosures (適時開示)
 * which mention purchase amounts and total holdings.
 */
export function parseBtcHoldings(text: string): BtcExtraction {
  const candidates: BtcExtraction['candidates'] = [];

  // Pattern 1: "X,XXX BTC" or "X,XXX BTC" near ビットコイン/暗号資産 context
  // Look in a window around Bitcoin-related keywords
  const BTC_KEYWORDS = ['ビットコイン', '暗号資産', 'Bitcoin', 'BTC保有', 'BTC残高'];
  for (const keyword of BTC_KEYWORDS) {
    let searchFrom = 0;
    while (true) {
      const idx = text.indexOf(keyword, searchFrom);
      if (idx === -1) break;
      searchFrom = idx + keyword.length;

      // Search in a window after the keyword
      const window = text.slice(idx, idx + 500);

      // Match "X,XXX BTC" or "X,XXX.XX BTC"
      const BTC_NUM_RE = /(\d[\d,]+(?:\.\d+)?)\s*BTC/g;
      let m: RegExpExecArray | null;
      while ((m = BTC_NUM_RE.exec(window)) !== null) {
        const raw = m[1].replace(/,/g, '');
        const n = parseFloat(raw);
        // Sanity: Metaplanet holds thousands of BTC; filter out prices/small values
        if (!isFinite(n) || n < 100 || n > 10_000_000) continue;

        const contextStart = Math.max(0, m.index - 40);
        const ctx = window.slice(contextStart, m.index + m[0].length + 20);

        // Higher confidence if near 保有 (holdings), 合計 (total), or 総数 (total count)
        const isHoldings = /保有|合計|総数|total/i.test(ctx);
        candidates.push({
          value: n,
          label: isHoldings ? 'BTC保有数（合計）' : 'BTC',
          context: ctx.replace(/\s+/g, ' ').trim(),
          confidence: isHoldings ? 'high' : 'medium',
        });
      }
    }
  }

  // Pattern 2: Standalone "X,XXX BTC" not near keywords (fallback)
  if (candidates.length === 0) {
    const STANDALONE_RE = /(\d[\d,]+)\s*BTC/g;
    let m: RegExpExecArray | null;
    while ((m = STANDALONE_RE.exec(text)) !== null) {
      const raw = m[1].replace(/,/g, '');
      const n = parseInt(raw, 10);
      if (!isFinite(n) || n < 100 || n > 10_000_000) continue;
      const ctx = text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 20);
      candidates.push({
        value: n,
        label: 'BTC (standalone)',
        context: ctx.replace(/\s+/g, ' ').trim(),
        confidence: 'medium',
      });
    }
  }

  return { candidates };
}

export async function ingestFromUrls(entries: TdnetFilingEntry[], entityId?: string): Promise<ExtractionResult> {
  const entity = entityId ?? ENTITY_ID;
  const dataPoints: ShareDataPoint[] = [];
  const btcDataPoints: BtcHoldingsDataPoint[] = [];
  const skipped: Array<{ pdfUrl: string; reason: string }> = [];

  const sorted = [...entries].sort((a, b) => scoreFilingForShares(b) - scoreFilingForShares(a));
  const sharesByAsOf = new Map<string, ShareDataPoint>();
  const btcByAsOf = new Map<string, BtcHoldingsDataPoint>();

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
    const btcExtraction = parseBtcHoldings(text);

    const contentHash = crypto.createHash('md5').update(pdfBytes).digest('hex');
    const artifactId = crypto.createHash('sha256').update(`tdnet:${entry.pdfUrl}`).digest('hex').slice(0, 32);

    const artifactMeta: ArtifactMeta = {
      artifactId,
      pdfUrl: entry.pdfUrl,
      publishedAt: entry.publishedAt,
      contentHash,
    };

    // Extract period end (needed for both share and BTC data points)
    const periodEnd = extraction.periodEnd;

    // Share extraction (existing logic)
    if (extraction.candidates.length > 0 && periodEnd) {
      const best = [...extraction.candidates].sort((a, b) => {
        if (a.confidence !== b.confidence) return a.confidence === 'high' ? -1 : 1;
        return b.value - a.value;
      })[0];

      const dp: ShareDataPoint = {
        entityId: entity as typeof ENTITY_ID,
        metric: METRIC,
        asOf: periodEnd,
        value: best.value,
        method: METHOD,
        sourceUrl: entry.pdfUrl,
        artifact: artifactMeta,
        asOfNote: extraction.periodEndNote,
      };

      const existing = sharesByAsOf.get(periodEnd);
      if (!existing || best.confidence === 'high') {
        sharesByAsOf.set(periodEnd, dp);
      }
    } else if (extraction.candidates.length === 0) {
      skipped.push({ pdfUrl: entry.pdfUrl, reason: 'No share count found in PDF text' });
    }

    // BTC holdings extraction (new)
    if (btcExtraction.candidates.length > 0 && periodEnd) {
      const bestBtc = [...btcExtraction.candidates].sort((a, b) => {
        if (a.confidence !== b.confidence) return a.confidence === 'high' ? -1 : 1;
        return b.value - a.value; // Prefer largest value (total holdings)
      })[0];

      const btcDp: BtcHoldingsDataPoint = {
        entityId: entity as typeof ENTITY_ID,
        metric: BTC_METRIC,
        asOf: periodEnd,
        value: bestBtc.value,
        method: BTC_METHOD,
        sourceUrl: entry.pdfUrl,
        artifact: artifactMeta,
        asOfNote: `BTC: ${bestBtc.label} — ${btcExtraction.candidates.length} candidate(s) in PDF`,
      };

      const existingBtc = btcByAsOf.get(periodEnd);
      if (!existingBtc || bestBtc.confidence === 'high') {
        btcByAsOf.set(periodEnd, btcDp);
      }
    }
  }

  dataPoints.push(...sharesByAsOf.values());
  btcDataPoints.push(...btcByAsOf.values());
  return { dataPoints, btcDataPoints, skipped };
}

export async function ingestByDateRange(opts: { startDate: Date; endDate: Date }): Promise<ExtractionResult> {
  // TDnet daily list HTML pages appear to only be available for a limited recent window.
  // Older dates return 404 and can burn the GitHub Actions 20-minute timeout via retries.
  const LOOKBACK_DAYS = 45;
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() - LOOKBACK_DAYS);

  const startDate = new Date(Math.max(opts.startDate.getTime(), minDate.getTime()));
  const endDate = new Date(Math.min(opts.endDate.getTime(), today.getTime()));

  if (startDate > endDate) {
    return { dataPoints: [], btcDataPoints: [], skipped: [{ pdfUrl: '', reason: `TDnet date-range clamped to last ${LOOKBACK_DAYS} days; requested range too old` }] };
  }

  const filings = await findMetaplanetFilings(startDate, endDate);
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
