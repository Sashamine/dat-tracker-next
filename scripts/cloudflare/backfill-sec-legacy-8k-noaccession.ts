import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { D1Client } from '@/lib/d1';

// Goal: backfill accession+source_url for legacy SEC 8-K artifacts with keys like:
//   <ticker>/8k/8k-YYYY-MM-DD.html
// These are ambiguous in submissions JSON (multiple 8-Ks per day), so instead we
// parse the stored artifact content to recover an accession number.
//
// We only update rows where source_url is currently null/empty.

type Row = {
  artifact_id: string;
  ticker: string | null;
  cik: string;
  r2_bucket: string;
  r2_key: string;
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

function normalizeCik10(cik: string): string {
  const digits = (cik || '').replace(/[^0-9]/g, '');
  return digits.padStart(10, '0');
}

function cikForEdgarPath(cik10: string): string {
  return cik10.replace(/^0+/, '');
}

function isLegacy8kNoAccessionKey(key: string): boolean {
  const k = key.toLowerCase();
  return k.includes('/8k/') && /\/8k-\d{4}-\d{2}-\d{2}\.html$/i.test(k);
}

function extractAccessionFromText(text: string): string | null {
  // Prefer dashed accession.
  const m = text.match(/\b(\d{10}-\d{2}-\d{6})\b/);
  if (m?.[1]) return m[1];

  // Some docs embed accession without dashes.
  const m2 = text.match(/\b(\d{18})\b/);
  if (m2?.[1]) {
    const a = m2[1];
    return `${a.slice(0, 10)}-${a.slice(10, 12)}-${a.slice(12)}`;
  }

  return null;
}

async function main() {
  const write = process.argv.includes('--write');
  const onlyTickerArg = process.argv.find((a) => a.startsWith('--ticker='));
  const onlyTicker = onlyTickerArg ? onlyTickerArg.split('=')[1]?.toUpperCase() : null;

  const d1 = D1Client.fromEnv();
  const r2 = makeR2Client();

  const whereTicker = onlyTicker ? 'AND ticker = ?' : '';
  const params: any[] = [];
  if (onlyTicker) params.push(onlyTicker);

  const rows = await d1.query<Row>(
    `
    SELECT artifact_id, ticker, cik, r2_bucket, r2_key
    FROM artifacts
    WHERE source_type='sec_filing'
      AND (source_url IS NULL OR source_url='')
      AND r2_key LIKE '%/8k/%'
      AND r2_key LIKE '%8k-%'
      ${whereTicker}
    ORDER BY ticker, r2_key;
    `.trim(),
    params
  );

  const candidates = rows.results.filter((r) => isLegacy8kNoAccessionKey(r.r2_key));

  let scanned = 0;
  let fetched = 0;
  let extracted = 0;
  let updated = 0;
  let skippedNotLegacy = rows.results.length - candidates.length;
  const sample: any[] = [];

  for (const r of candidates) {
    scanned++;

    let buf: Buffer;
    try {
      const obj = await r2.send(new GetObjectCommand({ Bucket: r.r2_bucket, Key: r.r2_key }));
      buf = await streamToBuffer(obj.Body);
      fetched++;
    } catch (e: any) {
      if (sample.length < 25) sample.push({ r2_key: r.r2_key, ticker: r.ticker, reason: 'r2_get_failed' });
      continue;
    }

    const text = buf.toString('utf8');
    const acc = extractAccessionFromText(text);
    if (!acc) {
      if (sample.length < 25) sample.push({ r2_key: r.r2_key, ticker: r.ticker, reason: 'no_accession_in_body' });
      continue;
    }

    extracted++;

    const cik10 = normalizeCik10(r.cik);
    const cikDigits = cikForEdgarPath(cik10);
    const accNoDashes = acc.replace(/-/g, '');

    // Without primaryDocument, use filing index URL (always exists)
    const sourceUrl = `https://www.sec.gov/Archives/edgar/data/${cikDigits}/${accNoDashes}/${acc}-index.html`;

    if (write) {
      await d1.query(
        `
        UPDATE artifacts
        SET accession = ?, source_url = ?
        WHERE artifact_id = ?
          AND source_type='sec_filing'
          AND (source_url IS NULL OR source_url='');
        `.trim(),
        [acc, sourceUrl, r.artifact_id]
      );
      updated++;
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: write ? 'write' : 'dry-run',
        onlyTicker,
        totalQueried: rows.results.length,
        legacyCandidates: candidates.length,
        skippedNotLegacy,
        scanned,
        fetched,
        extracted,
        updated: write ? updated : 0,
        sample,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
