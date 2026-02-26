import { NextRequest, NextResponse } from 'next/server';
import { ingestArtifactToR2AndD1 } from '@/lib/artifacts/ingest';
import { getCompanyFilings } from '@/lib/data/sec-filings';

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
      'User-Agent': 'DAT-Tracker/1.0 (https://dattracker.com; admin@dattracker.com)',
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

    const docUrl = `https://www.sec.gov/Archives/edgar/data/${parseInt(cik, 10)}/${accessionNoDashes(accession)}/${primaryDoc}`;

    const docRes = await fetch(docUrl, {
      headers: {
        'User-Agent': 'DAT-Tracker/1.0 (https://dattracker.com; admin@dattracker.com)',
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
