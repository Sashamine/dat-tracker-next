/**
 * SEC Filing Downloader
 *
 * Downloads SEC filing documents from EDGAR, strips HTML to plain text,
 * and uploads to R2 for the filing viewer. Used by both cron jobs and
 * manual scripts to ensure every citation has a viewable document.
 */

const UA = 'DAT-Tracker research@dat-tracker.com';

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&mdash;/g, '—')
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

interface FilingInfo {
  cik: string;
  primaryDoc: string;
  form: string;
}

/** Look up filing details via the SEC submissions API */
async function getFilingInfo(cik: string, accession: string): Promise<FilingInfo | null> {
  const paddedCik = cik.padStart(10, '0');
  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(15000),
    });
    if (res.status !== 200) return null;

    const data = await res.json() as any;
    const recent = data.filings?.recent;
    if (!recent) return null;

    const idx = recent.accessionNumber?.indexOf(accession);
    if (idx !== undefined && idx >= 0) {
      return {
        cik,
        primaryDoc: recent.primaryDocument[idx],
        form: recent.form[idx],
      };
    }

    // Check older filings
    const files = data.filings?.files || [];
    for (const f of files) {
      try {
        const fileUrl = `https://data.sec.gov/submissions/${f.name}`;
        const fileRes = await fetch(fileUrl, {
          headers: { 'User-Agent': UA },
          signal: AbortSignal.timeout(15000),
        });
        if (fileRes.status !== 200) continue;
        const fileData = await fileRes.json() as any;
        const fIdx = fileData.accessionNumber?.indexOf(accession);
        if (fIdx !== undefined && fIdx >= 0) {
          return {
            cik,
            primaryDoc: fileData.primaryDocument[fIdx],
            form: fileData.form[fIdx],
          };
        }
      } catch {}
      await new Promise(r => setTimeout(r, 300));
    }
    return null;
  } catch {
    return null;
  }
}

/** Fetch a filing from SEC EDGAR and strip to plain text */
async function fetchFilingText(cik: string, accession: string, primaryDoc: string): Promise<string | null> {
  const accNoDash = accession.replace(/-/g, '');
  const url = `https://www.sec.gov/Archives/edgar/data/${cik}/${accNoDash}/${primaryDoc}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(60000),
    });
    if (res.status !== 200) return null;

    const html = await res.text();
    const text = stripHtml(html);

    if (text.length < 200) return null;
    return text;
  } catch {
    return null;
  }
}

export type DownloadResult = {
  status: 'downloaded' | 'skipped' | 'failed' | 'no_creds';
  r2Key?: string;
  reason?: string;
};

/**
 * Download a SEC filing to R2 by accession number.
 *
 * Returns the r2_key if successful. Gracefully skips if R2 credentials
 * are not available (e.g. running on Vercel without R2 env vars).
 */
export async function downloadSecFilingToR2(params: {
  ticker: string;
  accession: string;
  cik: string;
}): Promise<DownloadResult> {
  const { ticker, accession, cik } = params;
  const r2Key = `new-uploads/${ticker.toLowerCase()}/${accession}.txt`;

  // Check if R2 creds are available
  if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET) {
    return { status: 'no_creds', reason: 'R2 credentials not configured' };
  }

  // Check if document already exists in R2 (avoid re-downloading)
  const R2_BASE_URL = 'https://pub-1e4356c7aea34102aad6e3493b0c62f1.r2.dev';
  try {
    const checkRes = await fetch(`${R2_BASE_URL}/${r2Key}`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    if (checkRes.ok) {
      return { status: 'skipped', r2Key, reason: 'already exists in R2' };
    }
  } catch {
    // HEAD failed — continue with download
  }

  // Get filing info from SEC submissions API
  const info = await getFilingInfo(cik, accession);
  if (!info) {
    return { status: 'failed', reason: 'filing not found in SEC submissions API' };
  }

  // Fetch and strip the filing
  const text = await fetchFilingText(cik, accession, info.primaryDoc);
  if (!text) {
    return { status: 'failed', reason: `failed to fetch/strip filing (${info.form}: ${info.primaryDoc})` };
  }

  // Upload to R2
  try {
    const { r2PutObject } = await import('@/lib/r2/client');
    await r2PutObject({
      key: r2Key,
      body: Buffer.from(text),
      contentType: 'text/plain',
    });
    return { status: 'downloaded', r2Key };
  } catch (err) {
    return { status: 'failed', reason: `R2 upload failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Ensure a filing document exists in R2 for a given artifact.
 * If the artifact has an accession and CIK but no viewable document in R2,
 * downloads it. Updates the artifact's r2_key in D1 if successful.
 *
 * This is the main entry point for the intake pipeline.
 */
export async function ensureFilingInR2(params: {
  ticker: string;
  accession: string;
  cik: string;
  artifactId: string;
  d1: import('@/lib/d1').D1Client;
}): Promise<DownloadResult> {
  const result = await downloadSecFilingToR2({
    ticker: params.ticker,
    accession: params.accession,
    cik: params.cik,
  });

  if (result.status === 'downloaded' && result.r2Key) {
    // Update artifact r2_key to point to the downloaded text file
    try {
      await params.d1.query(
        `UPDATE artifacts SET r2_bucket = 'dat-tracker-filings', r2_key = ? WHERE artifact_id = ?`,
        [result.r2Key, params.artifactId]
      );
    } catch (err: any) {
      if (err.message?.includes('UNIQUE constraint')) {
        // Another artifact already has this r2_key — relink datapoints instead
        const { results } = await params.d1.query<{ artifact_id: string }>(
          `SELECT artifact_id FROM artifacts WHERE r2_bucket = 'dat-tracker-filings' AND r2_key = ?`,
          [result.r2Key]
        );
        if (results[0]) {
          await params.d1.query(
            'UPDATE datapoints SET artifact_id = ? WHERE artifact_id = ?',
            [results[0].artifact_id, params.artifactId]
          );
        }
      }
      // Don't fail the overall flow for D1 update errors
    }
  }

  return result;
}
