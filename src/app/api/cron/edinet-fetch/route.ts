import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { COMPANY_SOURCES } from '@/lib/data/company-sources';
import { edinetDownloadDocument, edinetListDocuments } from '@/lib/jp/edinet';
import { ingestArtifactToR2AndD1 } from '@/lib/artifacts/ingest';

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
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const isManual = searchParams.get('manual') === 'true';
  if (!isManual) {
    return NextResponse.json({ success: false, error: 'manual=true required (safety)' }, { status: 400 });
  }

  const tickersParam = (searchParams.get('tickers') || '').trim();
  const date = (searchParams.get('date') || '').trim();

  if (!tickersParam) {
    return NextResponse.json({ success: false, error: 'Missing tickers (comma-separated)' }, { status: 400 });
  }
  if (!date) {
    return NextResponse.json({ success: false, error: 'Missing date=YYYY-MM-DD (EDINET list API is date-based)' }, { status: 400 });
  }

  const tickers = tickersParam.split(',').map(s => s.trim()).filter(Boolean);

  const resolved = tickers.map(t => {
    const src = COMPANY_SOURCES[t.toUpperCase()] || (COMPANY_SOURCES as any)[t];
    return {
      ticker: t,
      edinetCode: src?.edinetCode || null,
      edinetFilingsUrl: src?.edinetFilingsUrl || null,
    };
  });

  const missing = resolved.filter(r => !r.edinetCode).map(r => r.ticker);
  if (missing.length) {
    return NextResponse.json({ success: false, error: `Missing edinetCode for tickers: ${missing.join(', ')}` }, { status: 400 });
  }

  const runId = crypto.randomUUID();
  const startedAt = nowIso();
  const dryRun = searchParams.get('dryRun') === 'true';
  const maxDocsPerTicker = Math.max(1, Math.min(5, parseInt(searchParams.get('maxDocs') || '1', 10) || 1));

  // D1/R2 write handled by ingestArtifactToR2AndD1

  try {
    const list = await edinetListDocuments({ date, type: 2 });
    const results = list.results || [];

    const byCode = new Map<string, any[]>();
    for (const r of resolved) byCode.set(String(r.edinetCode), []);

    for (const item of results) {
      if (byCode.has(String(item.edinetCode))) {
        byCode.get(String(item.edinetCode))!.push(item);
      }
    }

    let artifactsInserted = 0;
    let artifactsIgnored = 0;
    const downloads: any[] = [];

    for (const r of resolved) {
      const items = (byCode.get(String(r.edinetCode)) || []).slice(0, maxDocsPerTicker);
      if (!items.length) {
        downloads.push({ ticker: r.ticker, edinetCode: r.edinetCode, found: 0, downloaded: 0 });
        continue;
      }

      for (const doc of items) {
        const bytes = await edinetDownloadDocument({ docID: doc.docID, type: 1 });
        const contentHash = crypto.createHash('sha256').update(bytes).digest('hex');
        const r2Key = `edinet/${r.edinetCode}/${doc.docID}.zip`;

        let existedBefore = false;
        if (!dryRun) {
          const ing = await ingestArtifactToR2AndD1({
            sourceType: 'edinet_xbrl_zip',
            ticker: r.ticker,
            accession: doc.docID,
            sourceUrl: `https://api.edinet-fsa.go.jp/api/v2/documents/${doc.docID}?type=1`,
            r2Key,
            bytes,
            contentType: 'application/zip',
            fetchedAt: nowIso(),
          });
          existedBefore = !ing.inserted;
          if (ing.inserted) artifactsInserted += 1;
          else artifactsIgnored += 1;
        }

        downloads.push({
          ticker: r.ticker,
          edinetCode: r.edinetCode,
          docID: doc.docID,
          size: bytes.byteLength,
          contentHash,
          r2Key,
          filerName: doc.filerName,
          docDescription: doc.docDescription || null,
          submitDateTime: doc.submitDateTime || null,
          existedBefore,
        });
      }
    }

    return NextResponse.json({
      success: true,
      runId,
      startedAt,
      date,
      tickers,
      resolved,
      foundCounts: Object.fromEntries([...byCode.entries()].map(([k, v]) => [k, v.length])),
      dryRun,
      maxDocsPerTicker,
      artifactsInserted,
      artifactsIgnored,
      downloads,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, runId, startedAt, error: err?.message || String(err) }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
