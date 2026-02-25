import { NextRequest, NextResponse } from 'next/server';

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  if (!authHeader) return false;
  return authHeader === `Bearer ${cronSecret}`;
}
import { COMPANY_SOURCES } from '@/lib/data/company-sources';
import { edinetDownloadDocument, edinetListDocuments } from '@/lib/jp/edinet';

// NOTE: This endpoint is intentionally "artifacts-only" scaffolding.
// It will be extended to store to R2 + D1 artifacts after EDINET access is confirmed.

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

    // Download just the first doc per code as a connectivity test (no storage yet).
    const downloads: any[] = [];
    for (const r of resolved) {
      const items = byCode.get(String(r.edinetCode)) || [];
      const first = items[0];
      if (!first) {
        downloads.push({ ticker: r.ticker, edinetCode: r.edinetCode, found: 0, downloaded: false });
        continue;
      }
      const bytes = await edinetDownloadDocument({ docID: first.docID, type: 1 });
      downloads.push({
        ticker: r.ticker,
        edinetCode: r.edinetCode,
        found: items.length,
        downloaded: true,
        docID: first.docID,
        size: bytes.byteLength,
        filerName: first.filerName,
        docDescription: first.docDescription || null,
        submitDateTime: first.submitDateTime || null,
      });
    }

    return NextResponse.json({
      success: true,
      date,
      tickers,
      resolved,
      foundCounts: Object.fromEntries([...byCode.entries()].map(([k, v]) => [k, v.length])),
      downloads,
      note: 'Scaffolding: confirms EDINET connectivity. Next step is storing zip to R2 + recording artifact rows in D1.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
