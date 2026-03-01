import "dotenv/config";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

// Placeholder for Cloudflare D1Database type, as it's typically available in worker/runtime environments
type D1Database = {
  prepare: (query: string) => {
    bind: (...args: any[]) => {
      run: () => Promise<D1Result>;
      all: () => Promise<D1Result>;
      first: <T = unknown>(colName?: string) => Promise<T | null>;
    };
  };
};

type D1Result = {
  success: boolean;
  error?: string;
  results?: any[];
  meta?: {
    duration?: number;
    last_row_id?: number;
    rows_read?: number;
    rows_written?: number;
    changes?: number;
  };
};

const RX_ACCESSION_HYPHEN = /\b\d{10}-\d{2}-\d{6}\b/g;
const RX_ACCESSION_18 = /\b\d{18}\b/g;
const RX_SEC_ARCHIVES_SPECIFIC =
  /https?:\/\/(?:www\.)?sec\.gov\/Archives\/edgar\/data\/\d+\/\d{18}\/[^"'\\s<>\\]+/g;
const RX_SEC_ARCHIVES_GENERIC =
  /https?:\/\/(?:www\.)?sec\.gov\/Archives\/[^"'\\s<>\\]+/g;
const RX_CIK_FROM_URL = /\/data\/(\d+)\//;
const RX_CIK_XBRL_IDENTIFIER =
  /<xbrli:identifier[^>]*scheme="http:\/\/www\.sec\.gov\/CIK">(\d{10})<\/xbrli:identifier>/g;
const RX_CIK_IX_NONNUMERIC =
  /<ix:nonNumeric[^>]*name="dei:EntityCentralIndexKey"[^>]*>(\d{10})<\/ix:nonNumeric>/g;

export type ParsedSecMetadata = {
  accession?: string;
  accession18?: string;
  sourceUrl?: string;
  cik?: string;
  primaryDoc?: string;
};

export async function fetchR2ObjectText(
  s3: S3Client,
  bucket: string,
  key: string
): Promise<string> {
  let res;
  try {
    res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  } catch (err: any) {
    throw new Error(`Failed to fetch R2 object s3://${bucket}/${key}: ${err?.message ?? String(err)}`);
  }
  const body: any = (res as any).Body;
  if (!body) throw new Error(`R2 object body is undefined for s3://${bucket}/${key}`);
  if (typeof body.transformToString === "function") return await body.transformToString("utf-8");
  if (typeof body.getReader === "function") {
    const r = body.getReader(); const chunks: Uint8Array[] = [];
    for (;;) { const { done, value } = await r.read(); if (done) break; if (value) chunks.push(value); }
    const len = chunks.reduce((n, c) => n + c.byteLength, 0);
    const all = new Uint8Array(len); let off = 0;
    for (const c of chunks) { all.set(c, off); off += c.byteLength; }
    return new TextDecoder("utf-8").decode(all);
  }
  if (body instanceof Readable && typeof body.on === "function") {
    return await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      body.on("data", (c: Buffer) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      body.on("error", (e: any) => reject(new Error(`Failed reading body for s3://${bucket}/${key}: ${e?.message ?? String(e)}`)));
      body.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
  }
  throw new Error(`Unsupported R2 body type for s3://${bucket}/${key}`);
}

export function chooseBestMatch(matches: string[]): string | null {
  return matches.length ? matches[0] : null;
}

export function parseSecMetadata(text: string): ParsedSecMetadata {
  const out: ParsedSecMetadata = {};
  if (!text) return out;

  const accession = chooseBestMatch(Array.from(text.matchAll(RX_ACCESSION_HYPHEN), m => m[0]));
  if (accession) out.accession = accession;

  const accession18 = chooseBestMatch(Array.from(text.matchAll(RX_ACCESSION_18), m => m[0]));
  if (accession18) out.accession18 = accession18;
  
  const cikFromXbrl = chooseBestMatch(Array.from(text.matchAll(RX_CIK_XBRL_IDENTIFIER), m => m[1]));
  if (cikFromXbrl) out.cik = cikFromXbrl;

  if (!out.cik) {
    const cikFromIx = chooseBestMatch(Array.from(text.matchAll(RX_CIK_IX_NONNUMERIC), m => m[1]));
    if (cikFromIx) out.cik = cikFromIx;
  }

  const specificUrl = chooseBestMatch(Array.from(text.matchAll(RX_SEC_ARCHIVES_SPECIFIC), m => m[0]));
  const genericUrl = specificUrl
    ? null
    : chooseBestMatch(Array.from(text.matchAll(RX_SEC_ARCHIVES_GENERIC), m => m[0]));
  const sourceUrl = specificUrl ?? genericUrl;

  if (sourceUrl) {
    out.sourceUrl = sourceUrl;

    if (!out.cik) {
      const m = sourceUrl.match(RX_CIK_FROM_URL);
      if (m?.[1]) out.cik = m[1];
    }

    const parts = sourceUrl.split("/");
    const last = parts[parts.length - 1];
    if (last) out.primaryDoc = last;
  }

  return out;
}

export async function writeArtifactMetadataUpdate(
  db: D1Database,
  key: string,
  parsed: ParsedSecMetadata,
  isDryRun: boolean
): Promise<void> {
  if (isDryRun) {
    console.log(`[DRY RUN] Would update D1 for r2_key=${key} with: ${JSON.stringify(parsed)}`);
    return;
  }

  const sets: string[] = [];
  const binds: any[] = [];

  if (parsed.sourceUrl !== undefined) { sets.push(`source_url = ?`); binds.push(parsed.sourceUrl); }
  if (parsed.accession !== undefined) { sets.push(`sec_accession_number = ?`); binds.push(parsed.accession); }
  if (parsed.cik !== undefined) { sets.push(`sec_cik = ?`); binds.push(parsed.cik); }
  if (parsed.primaryDoc !== undefined) { sets.push(`sec_primary_doc_name = ?`); binds.push(parsed.primaryDoc); }

  if (!sets.length) return; // nothing to update
  const sql = `UPDATE artifacts SET ${sets.join(", ")} WHERE r2_key = ?`;
  binds.push(key);

  try {
    await (db as any).prepare(sql).bind(...binds).run();
  } catch (err: any) {
    throw new Error(`D1 update failed for r2_key=${key}: ${err?.message ?? String(err)}`);
  }
}

export function logParseResult(input: {
  bucket: string;
  key: string;
  parsed: ParsedSecMetadata;
  error?: string;
  isDryRun?: boolean; // Added isDryRun field
}): void {
  const { bucket, key, parsed, error, isDryRun } = input;
  const hasParsed = Object.values(parsed ?? {}).some(v => v !== undefined);
  const status = error ? "error" : hasParsed ? "success" : "no_match";
  const out: any = { status, bucket, key, ...(parsed ?? {}), isDryRun }; // Include isDryRun in output
  if (error) out.error = error;
  console.log(JSON.stringify(out));
}

export async function main(db: D1Database, s3: S3Client): Promise<void> {
  const bucket = process.env.R2_BUCKET;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const d1DatabaseId = process.env.D1_DATABASE_ID; // Placeholder for D1 setup

  if (!bucket) throw new Error("Missing env var: R2_BUCKET");
  if (!accessKeyId) throw new Error("Missing env var: CLOUDFLARE_R2_ACCESS_KEY_ID");
  if (!secretAccessKey) throw new Error("Missing env var: CLOUDFLARE_R2_SECRET_ACCESS_KEY");
  // if (!d1DatabaseId) throw new Error("Missing env var: D1_DATABASE_ID"); // Not strictly needed for placeholder D1

  // Note: D1 wiring is a placeholder for now; caller may pass a real db in worker/runtime.
  // In a Cloudflare Worker, `env.DB` would be the D1 binding.
  const _db: D1Database = db ?? ({} as D1Database);

  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT; // optional; may be configured elsewhere
  const _s3 =
    s3 ??
    new S3Client({
      region: process.env.CLOUDFLARE_R2_REGION || "auto", // Use region from env or default
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });

  // Placeholder target selection for "76 legacy 8-Ks" + "batch 419" (to be replaced with real loading)
  // In a real scenario, this would load from D1 or a specific R2 prefix list
    const targetKeys = [
    "mstr/8k/8k-2020-08-11-215604.html",
    "mstr/8k/8k-2020-09-14-244732.html",
    "mstr/8k/8k-2020-12-04-310787.html",
    "mara/8k/8k-2024-08-14.html",
    "mara/8k/8k-2024-12-10.html",
  ]; // Actual example target keys for dry run

  const isDryRun = process.env.DRY_RUN === 'true';
  console.log(`Starting R2 legacy content parsing for ${targetKeys.length} keys... (Dry run: ${isDryRun})`);

  for (const key of targetKeys) {
    try {
      const text = await fetchR2ObjectText(_s3, bucket, key);
      const parsed = parseSecMetadata(text);
      await writeArtifactMetadataUpdate(_db, key, parsed, isDryRun);
      logParseResult({ bucket, key, parsed, isDryRun });
    } catch (err: any) {
      logParseResult({
        bucket,
        key,
        parsed: {}, // Ensure parsed is an empty object on error to avoid undefined issues
        error: err?.message ?? String(err),
        isDryRun,
      });
    }
  }
  console.log("R2 legacy content parsing complete.");
}

// Direct execution when run as a script
const db = {} as D1Database;
const s3 = undefined as any as S3Client; // S3Client will be instantiated in main if not provided
main(db, s3).catch((e: any) => {
  console.error(`Script error: ${e?.stack ?? e?.message ?? String(e)}`);
  process.exit(1);
});
