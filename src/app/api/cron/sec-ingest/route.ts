import { NextRequest, NextResponse } from 'next/server';
import { ingestArtifactToR2AndD1 } from '@/lib/artifacts/ingest';
import { getCompanyFilings } from '@/lib/data/sec-filings';
import { buildSecArchivesIndexUrl, buildSecArchivesDocUrl, SEC_USER_AGENT } from '@/lib/sec/sec-shared';

export const runtime = 'nodejs';
export const maxDuration = 300;

function requireAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization') || '';

  // Prefer CRON_SECRET (already used across cron/debug endpoints)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;

  // Optional secondary auth for manual/admin usage
  const monitorAuth = process.env.DAT_MONITOR_AUTH;
  if (monitorAuth && authHeader === `Bearer ${monitorAuth}`) return true;

  return false;
}

type SECSubmissions = {
  filings?: {
    recent?: {
      form: string[];
      filingDate: string[];
      accessionNumber: string[];
      primaryDocument: string[];
    };
  };
};

type FilingDocument = { name: string; type?: string; size?: number };

type FilingIndex = {
  directory: {
    item: FilingDocument[];
    name: string;
  };
};

async function fetchFilingIndex(cik: string, accession: string): Promise<FilingIndex | null> {
  const url = buildSecArchivesIndexUrl(cik, accession);
  const res = await fetch(url, {
    headers: { 'User-Agent': SEC_USER_AGENT, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as FilingIndex;
}

function isInterestingExhibit(name: string): boolean {
  // Prefer EX-99.* press releases / shareholder letters / announcements.
  // Works for common SEC naming styles: ex99.1.htm, ex-99.1.htm, d123dex991.htm, etc.
  const n = (name || '').toLowerCase();
  if (!n.endsWith('.htm') && !n.endsWith('.html') && !n.endsWith('.pdf')) return false;
  return (
    /ex-?99\./i.test(name) ||
    /ex\d{2}99\d?/i.test(name) ||
    /dex99\d/i.test(name) ||
    /press|release|shareholder|letter|announce|earnings/i.test(name)
  );
}

function exhibitBucket(name: string): 'exhibit' | 'exhibit_pdf' {
  const n = (name || '').toLowerCase();
  if (n.endsWith('.pdf')) return 'exhibit_pdf';
  return 'exhibit';
}

function cik10(cik: string): string {
  const digits = cik.replace(/\D/g, '');
  return digits.padStart(10, '0');
}

function accessionNoDashes(accession: string): string {
  return accession.replace(/-/g, '');
}

function formBucket(form: string): string {
  const f = (form || '').toLowerCase();
  if (f.startsWith('8-k')) return '8k';
  if (f.startsWith('10-q')) return '10q';
  if (f.startsWith('10-k')) return '10k';
  if (f.startsWith('6-k')) return '6k';
  if (f.startsWith('20-f')) return '20f';
  if (f.startsWith('40-f')) return '40f';
  return 'other';
}

export async function GET(request: NextRequest) {
  if (!requireAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const ticker = (sp.get('ticker') || '').trim().toUpperCase();
  const sinceDays = Math.max(1, Math.min(3650, parseInt(sp.get('sinceDays') || '365', 10) || 365));
  const limit = Math.max(1, Math.min(100, parseInt(sp.get('limit') || '25', 10) || 25));
  const includeExhibits = sp.get('includeExhibits') === '1' || sp.get('includeExhibits') === 'true';
  const exhibitsLimit = Math.max(0, Math.min(20, parseInt(sp.get('exhibitsLimit') || '6', 10) || 6));

  if (!ticker) {
    return NextResponse.json({ success: false, error: 'Missing ticker' }, { status: 400 });
  }

  // Option B: only allow tickers in our curated SEC_FILINGS list
  const company = getCompanyFilings(ticker);
  if (!company) {
    return NextResponse.json(
      { success: false, error: `Ticker ${ticker} is not in SEC_FILINGS allowlist` },
      { status: 400 }
    );
  }

  const cik = String(company.cik || '').trim();
  if (!cik) {
    return NextResponse.json({ success: false, error: `Ticker ${ticker} missing cik in sec-filings config` }, { status: 500 });
  }

  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const sinceStr = since.toISOString().slice(0, 10);

  const submissionsUrl = `https://data.sec.gov/submissions/CIK${cik10(cik)}.json`;

  const submissionsRes = await fetch(submissionsUrl, {
    headers: {
      'User-Agent': SEC_USER_AGENT,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!submissionsRes.ok) {
    return NextResponse.json(
      { success: false, error: `SEC submissions fetch failed: ${submissionsRes.status}` },
      { status: 502 }
    );
  }

  const submissions = (await submissionsRes.json()) as SECSubmissions;
  const recent = submissions.filings?.recent;
  if (!recent) {
    return NextResponse.json({ success: true, ticker, cik, attempted: 0, inserted: 0, skipped: 0, keys: [] });
  }

  const keys: string[] = [];
  let attempted = 0;
  let inserted = 0;
  let skipped = 0;

  const max = Math.min(recent.form.length, recent.filingDate.length, recent.accessionNumber.length, recent.primaryDocument.length);

  for (let i = 0; i < max; i++) {
    const form = recent.form[i];
    const filingDate = recent.filingDate[i];
    const accession = recent.accessionNumber[i];
    const primaryDoc = recent.primaryDocument[i];

    if (!form || !filingDate || !accession || !primaryDoc) continue;
    if (filingDate < sinceStr) continue;

    // Keep it simple: only ingest forms we might care about
    const formUpper = form.toUpperCase();
    const allowedForm =
      formUpper.startsWith('8-K') ||
      formUpper.startsWith('10-Q') ||
      formUpper.startsWith('10-K') ||
      formUpper.startsWith('6-K') ||
      formUpper.startsWith('20-F') ||
      formUpper.startsWith('40-F');
    if (!allowedForm) continue;

    attempted += 1;

    const docUrl = buildSecArchivesDocUrl(cik, accession, primaryDoc);

    const docRes = await fetch(docUrl, {
      headers: {
        'User-Agent': SEC_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,text/plain',
      },
      cache: 'no-store',
    });

    if (!docRes.ok) {
      // don't fail the whole run on one doc
      continue;
    }

    const html = await docRes.text();
    const bytes = new TextEncoder().encode(html);

    const bucket = formBucket(form);
    const r2Key = `${ticker.toLowerCase()}/${bucket}/${bucket}-${filingDate}-${accession}.html`;

    const res = await ingestArtifactToR2AndD1({
      sourceType: 'sec_filing',
      ticker,
      accession,
      sourceUrl: docUrl,
      r2Key,
      bytes,
      contentType: 'text/html; charset=utf-8',
      fetchedAt: new Date(`${filingDate}T00:00:00Z`).toISOString(),
    });

    keys.push(res.r2Key);
    if (res.inserted) inserted += 1;
    else skipped += 1;

    // Optionally ingest key exhibits (ex-99.1 press releases, etc.) for better recall.
    if (includeExhibits && formUpper.startsWith('8-K') && exhibitsLimit > 0) {
      const index = await fetchFilingIndex(cik, accession);
      const docs = (index?.directory?.item || []).filter(d => isInterestingExhibit(d.name));

      // Prefer larger exhibits first (usually press releases); stable tie-break by name.
      docs.sort((a, b) => (b.size || 0) - (a.size || 0) || a.name.localeCompare(b.name));

      const picked = docs.slice(0, exhibitsLimit);

      for (const d of picked) {
        try {
          const exhibitUrl = buildSecArchivesDocUrl(cik, accession, d.name);
          const exhibitRes = await fetch(exhibitUrl, {
            headers: {
              'User-Agent': SEC_USER_AGENT,
              Accept: 'text/html,application/xhtml+xml,text/plain,application/pdf',
            },
            cache: 'no-store',
          });
          if (!exhibitRes.ok) continue;

          const buf = new Uint8Array(await exhibitRes.arrayBuffer());
          const b = exhibitBucket(d.name);
          const ext = d.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'html';
          const safeName = d.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
          const exhibitKey = `${ticker.toLowerCase()}/${bucket}/${bucket}-${filingDate}-${accession}.${b}.${safeName}.${ext}`;

          const res2 = await ingestArtifactToR2AndD1({
            sourceType: 'sec_exhibit',
            ticker,
            accession,
            sourceUrl: exhibitUrl,
            r2Key: exhibitKey,
            bytes: buf,
            contentType: d.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'text/html; charset=utf-8',
            fetchedAt: new Date(`${filingDate}T00:00:00Z`).toISOString(),
          });

          keys.push(res2.r2Key);
          if (res2.inserted) inserted += 1;
          else skipped += 1;
        } catch {
          // best-effort
        }
      }
    }

    if (attempted >= limit) break;
  }

  return NextResponse.json({
    success: true,
    ticker,
    cik,
    since: sinceStr,
    limit,
    attempted,
    inserted,
    skipped,
    keys,
  });
}
