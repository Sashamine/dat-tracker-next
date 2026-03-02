import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { D1Client } from '@/lib/d1';

// Fix sec_filing artifacts missing accession by parsing accession from content and writing
// accession + source_url. This is a targeted remediation to satisfy the SEC receipt invariant.

type Row = {
  artifact_id: string;
  ticker: string | null;
  cik: string | null;
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

function extractAccessionFromText(text: string): string | null {
  const m = text.match(/\b(\d{10}-\d{2}-\d{6})\b/);
  if (m?.[1]) return m[1];

  const m2 = text.match(/\b(\d{18})\b/);
  if (m2?.[1]) {
    const a = m2[1];
    return `${a.slice(0, 10)}-${a.slice(10, 12)}-${a.slice(12)}`;
  }

  return null;
}

async function main() {
  const write = process.argv.includes('--write');
  const limitArg = process.argv.find(a => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : 200;

  const d1 = D1Client.fromEnv();
  const r2 = makeR2Client();

  const rows = await d1.query<Row>(
    `
    SELECT artifact_id, ticker, cik, r2_bucket, r2_key
    FROM artifacts
    WHERE source_type='sec_filing'
      AND (accession IS NULL OR accession='')
    ORDER BY fetched_at DESC
    LIMIT ?;
    `.trim(),
    [limit]
  );

  let scanned = 0;
  let fetched = 0;
  let extracted = 0;
  let updated = 0;
  const sample: any[] = [];

  for (const r of rows.results) {
    scanned++;

    let buf: Buffer;
    try {
      const obj = await r2.send(new GetObjectCommand({ Bucket: r.r2_bucket, Key: r.r2_key }));
      buf = await streamToBuffer(obj.Body);
      fetched++;
    } catch {
      if (sample.length < 25) sample.push({ artifact_id: r.artifact_id, r2_key: r.r2_key, reason: 'r2_get_failed' });
      continue;
    }

    const text = buf.toString('utf8');
    const acc = extractAccessionFromText(text);
    if (!acc) {
      if (sample.length < 25) sample.push({ artifact_id: r.artifact_id, r2_key: r.r2_key, reason: 'no_accession_in_body' });
      continue;
    }

    extracted++;

    const cikDigits = r.cik ? cikForEdgarPath(normalizeCik10(r.cik)) : null;
    const accNoDashes = acc.replace(/-/g, '');
    const sourceUrl = cikDigits
      ? `https://www.sec.gov/Archives/edgar/data/${cikDigits}/${accNoDashes}/${acc}-index.html`
      : null;

    if (write) {
      await d1.query(
        `
        UPDATE artifacts
        SET accession = ?,
            source_url = COALESCE(NULLIF(source_url,''), ?)
        WHERE artifact_id = ?
          AND source_type='sec_filing'
          AND (accession IS NULL OR accession='');
        `.trim(),
        [acc, sourceUrl, r.artifact_id]
      );
      updated++;
    }
  }

  console.log(JSON.stringify({
    mode: write ? 'write' : 'dry-run',
    limit,
    scanned,
    fetched,
    extracted,
    updated: write ? updated : 0,
    sample,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
