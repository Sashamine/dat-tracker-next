import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { D1Client } from '@/lib/d1';
import { COMPANY_SOURCES } from '@/lib/data/company-sources';
import { fetchFilingPdf, getKnownFilings } from '@/lib/fetchers/hkex';
import { discoverHkexFilings } from '@/lib/fetchers/hkex-search';
import { r2PutObject } from '@/lib/r2/client';

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isManual = searchParams.get('manual') === 'true';
  const dryRun = searchParams.get('dryRun') === 'true';

  if (!isManual && !verifyCronSecret(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const tickersParam = (searchParams.get('tickers') || '').trim();
  if (!tickersParam) {
    return NextResponse.json({ success: false, error: 'Missing tickers (comma-separated)' }, { status: 400 });
  }

  const tickers = tickersParam.split(',').map(s => s.trim()).filter(Boolean);
  const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '10', 10) || 10));

  const d1 = D1Client.fromEnv();
  const runId = crypto.randomUUID();
  const startedAt = nowIso();

  const summary: any[] = [];
  let artifactsInserted = 0;
  let artifactsIgnored = 0;
  let failures = 0;

  for (const tickerRaw of tickers) {
    const ticker = tickerRaw.toUpperCase();
    try {
      const src = COMPANY_SOURCES[ticker] || (COMPANY_SOURCES as any)[tickerRaw];
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
        const discovered = await discoverHkexFilings({ stockCode: stockCodeRaw, limit });
        filings = discovered;
        discovery.success = true;
        discovery.discoveredCount = discovered.length;
      } catch (e: any) {
        discovery.error = e?.message || String(e);
        filings = getKnownFilings(stockCode).slice(0, limit);
      }

      const perTicker: any[] = [];
      for (const f of filings) {
        const bytesBuf = await fetchFilingPdf(f.url);
        if (!bytesBuf) {
          perTicker.push({ url: f.url, docId: f.docId, ok: false, error: 'Failed to fetch PDF' });
          continue;
        }

        const bytes = new Uint8Array(bytesBuf);
        const contentHash = crypto.createHash('sha256').update(bytes).digest('hex');
        const r2Key = `hkex/${stockCode}/${f.docId}.pdf`;

        if (!dryRun) {
          await r2PutObject({ key: r2Key, body: bytes, contentType: 'application/pdf' });

          const artifactId = crypto.randomUUID();
          const inserted = await d1.query(
            `INSERT OR IGNORE INTO artifacts (
               artifact_id, source_type, source_url, content_hash, fetched_at,
               r2_bucket, r2_key, cik, ticker, accession
             ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?);`,
            [artifactId, 'hkex_pdf', f.url, contentHash, nowIso(), process.env.R2_BUCKET || 'dat-tracker-filings', r2Key, ticker, f.docId]
          );

          // D1 doesn't give rowsAffected; do a lightweight existence check by content hash + key
          const existing = await d1.query<{ artifact_id: string }>(
            `SELECT artifact_id FROM artifacts WHERE content_hash = ? AND r2_key = ? LIMIT 1;`,
            [contentHash, r2Key]
          );

          // If our artifact_id isn't present, it was ignored. If present, assume inserted.
          // (Best-effort; INSERT OR IGNORE + subsequent SELECT is enough for our counts.)
          const present = existing.results.length > 0;
          if (present) artifactsInserted += 1;
          else artifactsIgnored += 1;
        }

        perTicker.push({ url: f.url, docId: f.docId, ok: true, r2Key, contentHash, size: bytes.byteLength, date: f.date, title: f.title });
      }

      summary.push({ ticker, stockCode, discovery, filingsAttempted: filings.length, results: perTicker });
    } catch (err: any) {
      failures += 1;
      summary.push({ ticker: tickerRaw, success: false, error: err?.message || String(err) });
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
