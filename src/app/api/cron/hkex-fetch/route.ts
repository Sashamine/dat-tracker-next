import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { D1Client } from '@/lib/d1';
import { COMPANY_SOURCES } from '@/lib/data/company-sources';
import { fetchFilingPdf, getKnownFilings } from '@/lib/fetchers/hkex';
import { discoverHkexFilings } from '@/lib/fetchers/hkex-search';
import { ingestArtifactToR2AndD1 } from '@/lib/artifacts/ingest';

type CompanySourceLite = {
  hkexStockCode?: string;
};

type DiscoverySummary = {
  attempted: boolean;
  success: boolean;
  discoveredCount: number;
  error?: string;
};

type TickerFilingResult = {
  url: string;
  docId: string;
  ok: boolean;
  error?: string;
  artifactId?: string | null;
  r2Key?: string;
  contentHash?: string;
  size?: number;
  date?: string;
  title?: string;
};

type TickerSummary = {
  ticker: string;
  success?: boolean;
  error?: string;
  stockCode?: string;
  discovery?: DiscoverySummary;
  filingsAttempted?: number;
  results?: TickerFilingResult[];
};

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  if (!authHeader) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

function nowIso() {
  return new Date().toISOString();
}

function resolveCompanySource(ticker: string, tickerRaw: string): CompanySourceLite | null {
  const fromCanonical = COMPANY_SOURCES[ticker];
  if (fromCanonical) return fromCanonical;
  const fromRaw = (COMPANY_SOURCES as Record<string, unknown>)[tickerRaw];
  if (!fromRaw || typeof fromRaw !== 'object') return null;
  return fromRaw as CompanySourceLite;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isManual = searchParams.get('manual') === 'true';
  const dryRun = searchParams.get('dryRun') === 'true';

  if (!isManual && !verifyCronSecret(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const tickersParam = (searchParams.get('tickers') || '').trim();
  const hkexSearchUrl = (searchParams.get('hkexSearchUrl') || '').trim();
  const hkexSearchUrls = (searchParams.get('hkexSearchUrls') || '').trim();
  if (!tickersParam) {
    return NextResponse.json({ success: false, error: 'Missing tickers (comma-separated)' }, { status: 400 });
  }

  const tickers = tickersParam.split(',').map(s => s.trim()).filter(Boolean);
  const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '10', 10) || 10));

  const d1 = D1Client.fromEnv();
  const runId = crypto.randomUUID();
  const startedAt = nowIso();

  const summary: TickerSummary[] = [];
  let artifactsInserted = 0;
  let artifactsIgnored = 0;
  let failures = 0;

  for (const tickerRaw of tickers) {
    const ticker = tickerRaw.toUpperCase();
    try {
      const src = resolveCompanySource(ticker, tickerRaw);
      const stockCodeRaw = String(src?.hkexStockCode || '').trim();
      if (!stockCodeRaw) {
        summary.push({ ticker, success: false, error: 'Missing hkexStockCode in COMPANY_SOURCES' });
        failures += 1;
        continue;
      }

      // Normalize: 00434 -> 434
      const stockCode = stockCodeRaw.replace(/^0+/, '') || stockCodeRaw;

      // Discover filings via HKEX search first; fallback to hardcoded list.
      let filings = [] as ReturnType<typeof getKnownFilings>;
      const discovery: { attempted: boolean; success: boolean; discoveredCount: number; error?: string } = {
        attempted: true,
        success: false,
        discoveredCount: 0,
      };
      try {
        const override = hkexSearchUrl || hkexSearchUrls.split(',').map(s => s.trim()).filter(Boolean)[0] || undefined;
        const discovered = await discoverHkexFilings({ stockCode: stockCodeRaw, limit, searchUrlOverride: override });
        if (discovered.length === 0) {
          throw new Error('HKEX discovery returned 0 filings');
        }
        filings = discovered;
        discovery.success = true;
        discovery.discoveredCount = discovered.length;
      } catch (e: unknown) {
        discovery.error = e instanceof Error ? e.message : String(e);
        filings = getKnownFilings(stockCode).slice(0, limit);
      }

      const perTicker: TickerFilingResult[] = [];
      for (const f of filings) {
        const bytesBuf = await fetchFilingPdf(f.url);
        if (!bytesBuf) {
          perTicker.push({ url: f.url, docId: f.docId, ok: false, error: 'Failed to fetch PDF' });
          continue;
        }

        // Sanity check: HKEX 404 pages come back as tiny HTML; avoid uploading those.
        if ((bytesBuf as ArrayBuffer).byteLength < 50_000) {
          try {
            const head = new TextDecoder('utf-8').decode(new Uint8Array(bytesBuf).slice(0, 200));
            if (head.includes('<html') || head.includes('<!DOCTYPE html')) {
              perTicker.push({ url: f.url, docId: f.docId, ok: false, error: 'Got HTML (likely 404), not PDF' });
              continue;
            }
          } catch {
            // ignore
          }
        }

        const bytes = new Uint8Array(bytesBuf);
        const contentHash = crypto.createHash('sha256').update(bytes).digest('hex');
        const r2Key = `hkex/${stockCode}/${f.docId}.pdf`;

        let artifactId: string | null = null;
        if (!dryRun) {
          const ing = await ingestArtifactToR2AndD1({
            sourceType: 'hkex_pdf',
            ticker,
            accession: f.docId,
            sourceUrl: f.url,
            r2Key,
            bytes,
            contentType: 'application/pdf',
            fetchedAt: nowIso(),
          });
          artifactId = ing.artifactId;
          if (ing.inserted) artifactsInserted += 1;
          else artifactsIgnored += 1;
        } else {
          // best-effort lookup by r2_key
          const existing = await d1.query<{ artifact_id: string }>(
            `SELECT artifact_id FROM artifacts WHERE r2_key = ? LIMIT 1;`,
            [r2Key]
          );
          artifactId = existing.results[0]?.artifact_id || null;
        }

        perTicker.push({ url: f.url, docId: f.docId, artifactId, ok: true, r2Key, contentHash, size: bytes.byteLength, date: f.date, title: f.title });
      }

      summary.push({ ticker, stockCode, discovery, filingsAttempted: filings.length, results: perTicker });
    } catch (err: unknown) {
      failures += 1;
      summary.push({ ticker: tickerRaw, success: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({
    success: failures === 0,
    runId,
    startedAt,
    tickers,
    dryRun,
    artifactsInserted,
    artifactsIgnored,
    failures,
    summary,
  });
}

export const runtime = 'nodejs';
export const maxDuration = 60;
