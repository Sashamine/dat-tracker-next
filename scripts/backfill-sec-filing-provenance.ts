#!/usr/bin/env npx tsx

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { D1Client } from '../src/lib/d1';

type ArtifactRow = {
  artifact_id: string;
  source_url: string | null;
  accession: string | null;
  cik: string | null;
  ticker: string | null;
  r2_bucket: string | null;
  r2_key: string | null;
};

type ProposedUpdate = {
  sourceUrl: string | null;
  accession: string | null;
  cik: string | null;
  via: string[];
};

type UnrecoverableReason =
  | 'pattern_missing'
  | 'r2_body_fetch_failed'
  | 'r2_body_regex_miss'
  | 'multiple_candidates';

type R2EnrichMeta = {
  fetched: boolean;
  parseHit: boolean;
  ambiguousAccession: boolean;
};

type EnrichResult = {
  proposal: ProposedUpdate;
  meta: R2EnrichMeta;
};

function argVal(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

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

function normalizeCik10(cik: string | null | undefined): string | null {
  if (!cik) return null;
  const digits = cik.replace(/[^0-9]/g, '');
  if (!digits) return null;
  return digits.padStart(10, '0');
}

function cikForEdgarPath(cik10: string): string {
  return cik10.replace(/^0+/, '');
}

function accessionToDashed(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{10}-\d{2}-\d{6}$/.test(trimmed)) return trimmed;

  const digits = trimmed.replace(/[^0-9]/g, '');
  if (/^\d{18}$/.test(digits)) {
    return `${digits.slice(0, 10)}-${digits.slice(10, 12)}-${digits.slice(12)}`;
  }
  return null;
}

function accessionTo18(dashed: string | null | undefined): string | null {
  if (!dashed) return null;
  const d = dashed.replace(/[^0-9]/g, '');
  return d.length === 18 ? d : null;
}

function buildSecIndexUrl(cik10: string, accessionDashed: string): string {
  return `https://www.sec.gov/Archives/edgar/data/${cikForEdgarPath(cik10)}/${accessionTo18(accessionDashed)}/${accessionDashed}-index.html`;
}

function parseSecUrl(url: string): { cik10: string | null; accessionDashed: string | null } {
  // Example: https://www.sec.gov/Archives/edgar/data/1050446/000095017025021814/...
  const m = url.match(/sec\.gov\/Archives\/edgar\/data\/(\d+)\/(\d{18})\//i);
  const cik10 = m?.[1] ? normalizeCik10(m[1]) : null;
  const accessionDashed = m?.[2] ? accessionToDashed(m[2]) : null;
  return { cik10, accessionDashed };
}

function parseFromKey(r2Key: string): { cik10: string | null; accessionDashed: string | null } {
  const cikMatch = r2Key.match(/(?:^|\/)(\d{6,10})(?:\/\d{18}\/|\/|$)/);
  const cik10 = cikMatch?.[1] ? normalizeCik10(cikMatch[1]) : null;

  const dashed = r2Key.match(/\b(\d{10}-\d{2}-\d{6})\b/)?.[1] || null;
  if (dashed) return { cik10, accessionDashed: dashed };

  const raw18 = r2Key.match(/\b(\d{18})\b/)?.[1] || null;
  return { cik10, accessionDashed: accessionToDashed(raw18) };
}

function parseFromBody(text: string): {
  sourceUrl: string | null;
  cik10: string | null;
  accessionDashed: string | null;
  ambiguousAccession: boolean;
} {
  const rawUrl =
    text.match(/https?:\/\/www\.sec\.gov\/Archives\/edgar\/data\/[^\s"'<>]+/i)?.[0] ||
    text.match(/https?:\/\/www\.sec\.gov\/ixviewer\/ix\.html\?doc=([^"'<> ]+)/i)?.[1] ||
    null;
  const url = rawUrl && rawUrl.startsWith('/Archives/') ? `https://www.sec.gov${rawUrl}` : rawUrl;
  const fromUrl = url ? parseSecUrl(url) : { cik10: null, accessionDashed: null };

  const accessionCandidates = new Set<string>();
  const dashedMatches = text.match(/\b\d{10}-\d{2}-\d{6}\b/g) || [];
  for (const m of dashedMatches) {
    const dashed = accessionToDashed(m);
    if (dashed) accessionCandidates.add(dashed);
  }
  const raw18Matches = text.match(/\b\d{18}\b/g) || [];
  for (const m of raw18Matches) {
    const dashed = accessionToDashed(m);
    if (dashed) accessionCandidates.add(dashed);
  }
  const labelMatch = text.match(
    /ACCESSION(?:\s+NUMBER|\s+NO\.?)?\s*[:#]?\s*(\d{10})[\s-]?(\d{2})[\s-]?(\d{6})/i
  );
  if (labelMatch) accessionCandidates.add(`${labelMatch[1]}-${labelMatch[2]}-${labelMatch[3]}`);

  const derivedCandidates = [...accessionCandidates];
  const accessionDashed = fromUrl.accessionDashed || (derivedCandidates.length === 1 ? derivedCandidates[0] : null);
  const ambiguousAccession = !fromUrl.accessionDashed && derivedCandidates.length > 1;

  const cikTag = text.match(/\bCIK(?:\s*[:=]\s*|\s+)(\d{1,10})\b/i)?.[1] || null;
  const cik10 = fromUrl.cik10 || normalizeCik10(cikTag);

  return { sourceUrl: url, cik10, accessionDashed, ambiguousAccession };
}

function proposeUpdate(row: ArtifactRow): ProposedUpdate {
  const via: string[] = [];
  let sourceUrl: string | null = null;
  let accession: string | null = null;
  let cik: string | null = null;

  if (row.source_url && row.source_url.trim()) {
    const parsed = parseSecUrl(row.source_url.trim());
    if (parsed.accessionDashed && (!row.accession || !row.accession.trim())) {
      accession = parsed.accessionDashed;
      via.push('source_url');
    }
    if (parsed.cik10 && (!row.cik || !row.cik.trim())) {
      cik = parsed.cik10;
      via.push('source_url');
    }
  }

  if (row.r2_key) {
    const fromKey = parseFromKey(row.r2_key);
    if (!accession && fromKey.accessionDashed && (!row.accession || !row.accession.trim())) {
      accession = fromKey.accessionDashed;
      via.push('r2_key');
    }
    if (!cik && fromKey.cik10 && (!row.cik || !row.cik.trim())) {
      cik = fromKey.cik10;
      via.push('r2_key');
    }
  }

  const cik10Final = normalizeCik10(cik || row.cik);
  const accessionFinal = accession || accessionToDashed(row.accession);
  if ((!row.source_url || !row.source_url.trim()) && cik10Final && accessionFinal) {
    sourceUrl = buildSecIndexUrl(cik10Final, accessionFinal);
    via.push('derived');
  }

  return { sourceUrl, accession, cik, via };
}

async function enrichFromR2(
  r2: S3Client,
  row: ArtifactRow,
  current: ProposedUpdate
): Promise<EnrichResult> {
  if (!row.r2_bucket || !row.r2_key) {
    return { proposal: current, meta: { fetched: false, parseHit: false, ambiguousAccession: false } };
  }
  if (row.r2_bucket.trim() === '' || row.r2_key.trim() === '') {
    return { proposal: current, meta: { fetched: false, parseHit: false, ambiguousAccession: false } };
  }

  const needsSource = !row.source_url || !row.source_url.trim();
  const needsAcc = !row.accession || !row.accession.trim();
  const needsCik = !row.cik || !row.cik.trim();
  if (!needsSource && !needsAcc && !needsCik) {
    return { proposal: current, meta: { fetched: false, parseHit: false, ambiguousAccession: false } };
  }

  const obj = await r2.send(new GetObjectCommand({ Bucket: row.r2_bucket, Key: row.r2_key }));
  const text = (await streamToBuffer(obj.Body)).toString('utf8');
  const parsed = parseFromBody(text);
  const nextVia = [...current.via];
  const hasAnyParseHit = Boolean(parsed.sourceUrl || parsed.cik10 || parsed.accessionDashed || parsed.ambiguousAccession);

  let accession = current.accession;
  if (!accession && parsed.accessionDashed && needsAcc) {
    accession = parsed.accessionDashed;
    nextVia.push('r2_body');
  }

  let cik = current.cik;
  if (!cik && parsed.cik10 && needsCik) {
    cik = parsed.cik10;
    nextVia.push('r2_body');
  }

  const cik10Final = normalizeCik10(cik || row.cik);
  const accessionFinal = accession || accessionToDashed(row.accession);

  let sourceUrl = current.sourceUrl;
  if (!sourceUrl && parsed.sourceUrl && needsSource) {
    sourceUrl = parsed.sourceUrl;
    nextVia.push('r2_body');
  } else if (!sourceUrl && needsSource && cik10Final && accessionFinal) {
    sourceUrl = buildSecIndexUrl(cik10Final, accessionFinal);
    nextVia.push('derived');
  }

  return {
    proposal: { sourceUrl, accession, cik, via: nextVia },
    meta: { fetched: true, parseHit: hasAnyParseHit, ambiguousAccession: parsed.ambiguousAccession },
  };
}

async function main() {
  const dryRun = (argVal('dry_run') || process.env.DRY_RUN || 'true').toLowerCase() === 'true';
  const reportUnrecoverable =
    (argVal('report_unrecoverable') || process.env.REPORT_UNRECOVERABLE || 'false').toLowerCase() === 'true';
  const limit = Math.max(1, Math.min(2000, Number(argVal('limit') || process.env.LIMIT || '200')));
  const ticker = (argVal('ticker') || process.env.TICKER || '').trim().toUpperCase() || null;
  const r2Prefix = (argVal('r2_prefix') || process.env.R2_PREFIX || '').trim() || null;
  const afterArtifactId = (argVal('after_artifact_id') || process.env.AFTER_ARTIFACT_ID || '').trim() || null;

  const d1 = D1Client.fromEnv();
  const r2 = makeR2Client();

  const whereParts = [
    `source_type = 'sec_filing'`,
    `((source_url IS NULL OR source_url='') OR (accession IS NULL OR accession=''))`,
  ];
  const params: any[] = [];

  if (ticker) {
    whereParts.push(`ticker = ?`);
    params.push(ticker);
  }
  if (r2Prefix) {
    whereParts.push(`r2_key LIKE ?`);
    params.push(`${r2Prefix}%`);
  }
  if (afterArtifactId) {
    whereParts.push(`artifact_id > ?`);
    params.push(afterArtifactId);
  }

  params.push(limit);

  const out = await d1.query<ArtifactRow>(
    `
    SELECT artifact_id, source_url, accession, cik, ticker, r2_bucket, r2_key
    FROM artifacts
    WHERE ${whereParts.join(' AND ')}
    ORDER BY artifact_id
    LIMIT ?;
    `.trim(),
    params
  );

  let scanned = 0;
  let proposed = 0;
  let fromR2Body = 0;
  let updated = 0;
  let skippedNoCandidate = 0;
  let errors = 0;
  let unrecoverablePatternMissing = 0;
  let unrecoverableR2FetchFailed = 0;
  let unrecoverableR2RegexMiss = 0;
  let unrecoverableMultipleCandidates = 0;
  let lastArtifactId: string | null = null;
  const sample: Array<Record<string, any>> = [];
  const unrecoverable: Array<Record<string, any>> = [];

  for (const row of out.results) {
    scanned++;
    lastArtifactId = row.artifact_id;

    let proposal = proposeUpdate(row);
    let r2Meta: R2EnrichMeta = { fetched: false, parseHit: false, ambiguousAccession: false };
    let r2FetchFailed = false;
    const keyParsed = row.r2_key ? parseFromKey(row.r2_key) : { cik10: null, accessionDashed: null };

    const needsSource = (!row.source_url || !row.source_url.trim()) && !proposal.sourceUrl;
    const needsAcc = (!row.accession || !row.accession.trim()) && !proposal.accession;
    const needsCik = (!row.cik || !row.cik.trim()) && !proposal.cik;

    if (needsSource || needsAcc || needsCik) {
      try {
        const beforeVia = proposal.via.length;
        const enriched = await enrichFromR2(r2, row, proposal);
        proposal = enriched.proposal;
        r2Meta = enriched.meta;
        if (proposal.via.length > beforeVia && proposal.via.includes('r2_body')) fromR2Body++;
      } catch {
        // Keep a per-row failure bucket for report mode.
        r2FetchFailed = true;
      }
    }

    const nextSource = (!row.source_url || !row.source_url.trim()) ? proposal.sourceUrl : null;
    const nextAcc = (!row.accession || !row.accession.trim()) ? proposal.accession : null;
    const nextCik = (!row.cik || !row.cik.trim()) ? normalizeCik10(proposal.cik) : null;

    if (!nextSource && !nextAcc && !nextCik) {
      skippedNoCandidate++;
      let reason: UnrecoverableReason;
      if (r2Meta.ambiguousAccession) {
        reason = 'multiple_candidates';
        unrecoverableMultipleCandidates++;
      } else if (r2FetchFailed) {
        reason = 'r2_body_fetch_failed';
        unrecoverableR2FetchFailed++;
      } else if ((needsSource || needsAcc || needsCik) && r2Meta.fetched && !r2Meta.parseHit) {
        reason = 'r2_body_regex_miss';
        unrecoverableR2RegexMiss++;
      } else if (!keyParsed.accessionDashed && !keyParsed.cik10) {
        reason = 'pattern_missing';
        unrecoverablePatternMissing++;
      } else {
        reason = 'r2_body_regex_miss';
        unrecoverableR2RegexMiss++;
      }
      if (reportUnrecoverable && unrecoverable.length < 200) {
        unrecoverable.push({
          artifact_id: row.artifact_id,
          ticker: row.ticker,
          r2_bucket: row.r2_bucket,
          r2_key: row.r2_key,
          reason,
        });
      }
      continue;
    }

    proposed++;
    if (sample.length < 25) {
      sample.push({
        artifact_id: row.artifact_id,
        ticker: row.ticker,
        r2_key: row.r2_key,
        set_source_url: nextSource,
        set_accession: nextAcc,
        set_cik: nextCik,
        via: proposal.via,
      });
    }

    if (dryRun) continue;

    try {
      const res = await d1.query(
        `
        UPDATE artifacts
        SET
          source_url = CASE WHEN (source_url IS NULL OR source_url='') AND ? IS NOT NULL THEN ? ELSE source_url END,
          accession  = CASE WHEN (accession IS NULL OR accession='') AND ? IS NOT NULL THEN ? ELSE accession END,
          cik        = CASE WHEN (cik IS NULL OR cik='') AND ? IS NOT NULL THEN ? ELSE cik END
        WHERE artifact_id = ?
          AND source_type = 'sec_filing'
          AND ((source_url IS NULL OR source_url='') OR (accession IS NULL OR accession='') OR (cik IS NULL OR cik=''));
        `.trim(),
        [nextSource, nextSource, nextAcc, nextAcc, nextCik, nextCik, row.artifact_id]
      );
      if (Number(res.meta?.changes || 0) > 0) updated++;
    } catch {
      errors++;
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? 'dry-run' : 'write',
        filters: { ticker, r2Prefix, afterArtifactId, limit },
        report_unrecoverable: reportUnrecoverable,
        scanned,
        proposed,
        fromR2Body,
        skippedNoCandidate,
        unrecoverable_counts: {
          pattern_missing: unrecoverablePatternMissing,
          r2_body_fetch_failed: unrecoverableR2FetchFailed,
          r2_body_regex_miss: unrecoverableR2RegexMiss,
          multiple_candidates: unrecoverableMultipleCandidates,
        },
        updated: dryRun ? 0 : updated,
        errors,
        next_after_artifact_id: lastArtifactId,
        sample,
        unrecoverable,
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
