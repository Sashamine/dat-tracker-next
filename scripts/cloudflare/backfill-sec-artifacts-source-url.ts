import { D1Client } from '@/lib/d1';

// Backfill `accession` + `source_url` for SEC filing artifacts that have
// friendly filenames like:
//   mstr/8k/8k-2020-08-11-215604.html
// where the trailing numeric segment is accession suffix (3rd segment).
//
// We map using SEC submissions JSON:
//   https://data.sec.gov/submissions/CIK##########.json
// and optionally overflow pages referenced in `filings.files`.
//
// Writes:
//   accession: dashed (e.g. 0001193125-20-215604)
//   source_url: https://www.sec.gov/Archives/edgar/data/{cikDigits}/{accNoDashes}/{primaryDoc}

type ArtifactRow = {
  artifact_id: string;
  ticker: string | null;
  cik: string;
  r2_key: string;
};

type SubmissionsRecent = {
  accessionNumber: string[];
  filingDate: string[];
  form: string[];
  primaryDocument: string[];
};

type SubmissionsFileRef = { name: string };

type SubmissionsJson = {
  cik: string;
  filings: {
    recent: SubmissionsRecent;
    files?: SubmissionsFileRef[];
  };
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeCik10(cik: string): string {
  const digits = (cik || '').replace(/[^0-9]/g, '');
  return digits.padStart(10, '0');
}

function cikForEdgarPath(cik10: string): string {
  return cik10.replace(/^0+/, '');
}

function formFromKey(key: string): string | null {
  const k = key.toLowerCase();
  if (k.includes('/8k/')) return '8-K';
  if (k.includes('/10q/')) return '10-Q';
  if (k.includes('/10k/')) return '10-K';
  if (k.includes('/6k/')) return '6-K';
  if (k.includes('/20f/')) return '20-F';
  if (k.includes('/424b')) return '424B'; // will be refined by exact match from filename if needed
  return null;
}

function parseFriendlyFilenameWithSuffix(key: string): { date: string; suffix: string } | null {
  // Match .../<form>/<something>-YYYY-MM-DD-<suffix>.<ext>
  // We only trust numeric suffix of length 3-8 (covers common patterns)
  const m = key.match(/-(\d{4}-\d{2}-\d{2})-(\d{3,8})\.[a-z0-9]+$/i);
  if (!m) return null;
  return { date: m[1], suffix: m[2] };
}

function parseFriendlyFilenameNoSuffix(key: string): { date: string } | null {
  // Match .../<form>/<something>-YYYY-MM-DD.<ext>
  const m = key.match(/-(\d{4}-\d{2}-\d{2})\.[a-z0-9]+$/i);
  if (!m) return null;
  // Exclude ones that also have suffix (handled by the other parser)
  if (parseFriendlyFilenameWithSuffix(key)) return null;
  return { date: m[1] };
}

async function fetchJson(url: string): Promise<any> {
  const resp = await fetch(url, {
    headers: {
      // Required by SEC. Keep it explicit.
      'User-Agent': 'DATCAP Research contact@reservelabs.com',
      Accept: 'application/json',
    },
  });
  if (!resp.ok) throw new Error(`SEC fetch failed ${resp.status} ${resp.statusText} url=${url}`);
  return resp.json();
}

async function loadAllSubmissions(cik10: string): Promise<SubmissionsRecent[]> {
  const primaryUrl = `https://data.sec.gov/submissions/CIK${cik10}.json`;
  const first = (await fetchJson(primaryUrl)) as SubmissionsJson;
  const sets: SubmissionsRecent[] = [first.filings.recent];

  const overflow = first.filings.files || [];
  for (const f of overflow) {
    const url = `https://data.sec.gov/submissions/${f.name}`;
    const j = (await fetchJson(url)) as SubmissionsRecent;
    sets.push(j);
    // Conservative rate limiting (10 req/sec limit)
    await sleep(120);
  }

  return sets;
}

function findAccessionBySuffix(
  submissionsSets: SubmissionsRecent[],
  form: string,
  filingDate: string,
  suffix: string
): { accession: string; primaryDoc: string } | null {
  for (const set of submissionsSets) {
    const n = set.accessionNumber?.length || 0;
    for (let i = 0; i < n; i++) {
      if (set.form?.[i] !== form) continue;
      if (set.filingDate?.[i] !== filingDate) continue;
      const acc = set.accessionNumber?.[i];
      if (!acc) continue;
      const parts = acc.split('-');
      const accSuffix = parts[2] || '';
      if (accSuffix !== suffix) continue;
      const primary = set.primaryDocument?.[i];
      if (!primary) continue;
      return { accession: acc, primaryDoc: primary };
    }
  }
  return null;
}

function findAccessionByDateOnly(
  submissionsSets: SubmissionsRecent[],
  form: string,
  filingDate: string
): { accession: string; primaryDoc: string } | null {
  const matches: Array<{ accession: string; primaryDoc: string }> = [];

  for (const set of submissionsSets) {
    const n = set.accessionNumber?.length || 0;
    for (let i = 0; i < n; i++) {
      if (set.form?.[i] !== form) continue;
      if (set.filingDate?.[i] !== filingDate) continue;
      const acc = set.accessionNumber?.[i];
      const primary = set.primaryDocument?.[i];
      if (!acc || !primary) continue;
      matches.push({ accession: acc, primaryDoc: primary });
    }
  }

  if (matches.length === 1) return matches[0];
  return null; // ambiguous or none
}

async function main() {
  const write = process.argv.includes('--write');
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1] || '0', 10) : 0;

  const onlyTickerArg = process.argv.find((a) => a.startsWith('--ticker='));
  const onlyTicker = onlyTickerArg ? onlyTickerArg.split('=')[1]?.toUpperCase() : null;

  const d1 = D1Client.fromEnv();

  const whereTicker = onlyTicker ? 'AND ticker = ?' : '';
  const params: any[] = [];
  if (onlyTicker) params.push(onlyTicker);

  const rows = await d1.query<ArtifactRow>(
    `
    SELECT artifact_id, ticker, cik, r2_key
    FROM artifacts
    WHERE source_type = 'sec_filing'
      AND (source_url IS NULL OR source_url = '')
      AND cik IS NOT NULL AND cik != ''
      ${whereTicker}
    ORDER BY ticker, r2_key
    ${limit ? 'LIMIT ' + String(limit) : ''};
    `.trim(),
    params
  );

  // Group by cik to minimize SEC fetches
  const byCik = new Map<string, ArtifactRow[]>();
  for (const r of rows.results) {
    const cik10 = normalizeCik10(r.cik);
    if (!byCik.has(cik10)) byCik.set(cik10, []);
    byCik.get(cik10)!.push(r);
  }

  let scanned = 0;
  let candidateSuffix = 0;
  let candidateNoSuffix = 0;
  let matched = 0;
  let updated = 0;
  let skippedNoPattern = 0;
  let skippedNoForm = 0;
  let skippedNoMatch = 0;
  let skippedAmbiguous = 0;

  const missingSample: Array<{ ticker: string | null; cik: string; r2_key: string; reason: string }> = [];

  for (const [cik10, items] of byCik) {
    // Filter to just those that look like friendly filenames first, to avoid unnecessary SEC fetch.
    const withSuffix = items.filter((it) => Boolean(parseFriendlyFilenameWithSuffix(it.r2_key)));
    const noSuffix = items.filter((it) => Boolean(parseFriendlyFilenameNoSuffix(it.r2_key)));

    scanned += items.length;
    candidateSuffix += withSuffix.length;
    candidateNoSuffix += noSuffix.length;

    const candidates = [...withSuffix, ...noSuffix];
    if (candidates.length === 0) continue;

    let submissionsSets: SubmissionsRecent[];
    try {
      submissionsSets = await loadAllSubmissions(cik10);
    } catch (e) {
      for (const it of candidates) {
        if (missingSample.length < 50)
          missingSample.push({ ticker: it.ticker, cik: cik10, r2_key: it.r2_key, reason: 'sec_fetch_failed' });
      }
      continue;
    }

    for (const it of candidates) {
      const fSuffix = parseFriendlyFilenameWithSuffix(it.r2_key);
      const fNoSuffix = parseFriendlyFilenameNoSuffix(it.r2_key);

      if (!fSuffix && !fNoSuffix) {
        skippedNoPattern++;
        continue;
      }

      const form = formFromKey(it.r2_key);
      if (!form) {
        skippedNoForm++;
        if (missingSample.length < 50)
          missingSample.push({ ticker: it.ticker, cik: cik10, r2_key: it.r2_key, reason: 'no_form_from_key' });
        continue;
      }

      let found: { accession: string; primaryDoc: string } | null = null;
      if (fSuffix) found = findAccessionBySuffix(submissionsSets, form, fSuffix.date, fSuffix.suffix);
      else if (fNoSuffix) found = findAccessionByDateOnly(submissionsSets, form, fNoSuffix.date);

      if (!found) {
        // if no suffix, this may be ambiguous (multiple filings same day)
        if (fNoSuffix) skippedAmbiguous++;
        else skippedNoMatch++;

        if (missingSample.length < 50)
          missingSample.push({
            ticker: it.ticker,
            cik: cik10,
            r2_key: it.r2_key,
            reason: fNoSuffix ? 'no_unique_match_in_submissions' : 'no_match_in_submissions',
          });
        continue;
      }

      matched++;

      const accessionNoDashes = found.accession.replace(/-/g, '');
      const cikDigits = cikForEdgarPath(cik10);
      const sourceUrl = `https://www.sec.gov/Archives/edgar/data/${cikDigits}/${accessionNoDashes}/${found.primaryDoc}`;

      if (write) {
        await d1.query(
          `
          UPDATE artifacts
          SET accession = ?, source_url = ?
          WHERE artifact_id = ?
            AND source_type = 'sec_filing'
            AND (source_url IS NULL OR source_url = '');
          `.trim(),
          [found.accession, sourceUrl, it.artifact_id]
        );
        updated++;
      }
    }

    // Rate limit across CIKs too
    await sleep(120);
  }

  console.log(
    JSON.stringify(
      {
        mode: write ? 'write' : 'dry-run',
        onlyTicker,
        limit: limit || null,
        scannedRows: scanned,
        candidateSuffixRows: candidateSuffix,
        candidateNoSuffixRows: candidateNoSuffix,
        matched,
        updated: write ? updated : 0,
        skippedNoPattern,
        skippedNoForm,
        skippedNoMatch,
        skippedAmbiguous,
        missingSample,
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
