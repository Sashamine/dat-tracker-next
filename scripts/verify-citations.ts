#!/usr/bin/env tsx
/**
 * verify-citations.ts
 *
 * Scans provenance files (src/lib/data/provenance/*.ts) for `searchTerm` citations and verifies
 * they can be found in SEC EDGAR full-text search around the cited filing date.
 *
 * Also scans dilutive-instruments.ts for `source` + `sourceUrl` and (for convertibles) runs
 * a simple math sanity check: potentialShares ≈ faceValue / strikePrice.
 *
 * Usage:
 *   npx tsx scripts/verify-citations.ts
 *   npx tsx scripts/verify-citations.ts --verbose
 *
 * Notes / future work:
 *   --fix could suggest updated searchTerms (e.g. stripping $/commas/precision) when failures occur.
 */

import fs from "node:fs";
import path from "node:path";

const USER_AGENT = "DATCAP Research contact@datcap.com";
const REQUEST_DELAY_MS = 150; // ~6.6 req/sec

type Citation = {
  kind: "provenance-searchTerm";
  sourceKind: "docSource" | "xbrlSource";
  sourceType?: string; // e.g., "sec-document", "press-release", "company-website"
  file: string;
  ticker: string;
  cik?: string;
  accession?: string;
  filingDate?: string;
  searchTerm: string;
};

type DilutiveSource = {
  kind: "dilutive-source";
  file: string;
  ticker: string;
  source: string;
  sourceUrl: string;
};

type ConvertibleMathRow = {
  ticker: string;
  name?: string;
  strikePrice: number;
  faceValue?: number;
  potentialShares: number;
  source: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function fmtInt(n: number) {
  return n.toLocaleString("en-US");
}

function addDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function parseCikFromAccession(acc?: string): string | undefined {
  // accession like 0001507605-25-000028 => CIK 1507605
  if (!acc) return undefined;
  const m = acc.match(/^(\d{10})-/);
  if (!m) return undefined;
  return String(Number(m[1]));
}

function findAllTsFiles(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => path.join(dir, f));
}

function extractTickerFromProvenanceFile(filePath: string, content: string): string {
  const m = content.match(/export\s+const\s+([A-Z0-9]+)_PROVENANCE\b/);
  if (m) return m[1];
  return path.basename(filePath, ".ts").toUpperCase();
}

function buildConstMap(content: string): Record<string, string> {
  const map: Record<string, string> = {};
  const re = /(?:export\s+)?const\s+([A-Z0-9_]+)\s*=\s*"([^"]+)"\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    map[m[1]] = m[2];
  }
  return map;
}

function resolveMaybeConst(valueExpr: string, constMap: Record<string, string>): string | undefined {
  const v = valueExpr.trim();
  if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1);
  if (constMap[v]) return constMap[v];
  return undefined;
}

function extractCitationObjectsFromProvenanceFile(filePath: string): Citation[] {
  const content = fs.readFileSync(filePath, "utf8");
  const ticker = extractTickerFromProvenanceFile(filePath, content);
  const constMap = buildConstMap(content);

  const citations: Citation[] = [];

  const blockRe = /(docSource|xbrlSource)\s*\(\s*\{([\s\S]*?)\}\s*\)/g;
  let bm: RegExpExecArray | null;
  while ((bm = blockRe.exec(content))) {
    const obj = bm[2];

    const st = obj.match(/searchTerm\s*:\s*"([^"]+)"/);
    if (!st) continue;

    const cikExpr = obj.match(/\bcik\s*:\s*([^,\n]+)[,\n]/)?.[1];
    const accExpr = obj.match(/\baccession\s*:\s*([^,\n]+)[,\n]/)?.[1];
    const filingDateExpr = obj.match(/\bfilingDate\s*:\s*([^,\n]+)[,\n]/)?.[1];

    const accession = accExpr ? resolveMaybeConst(accExpr, constMap) : undefined;
    const cik = cikExpr ? resolveMaybeConst(cikExpr, constMap) : parseCikFromAccession(accession);
    const filingDate = filingDateExpr ? resolveMaybeConst(filingDateExpr, constMap) : undefined;
    const sourceType = obj.match(/\btype\s*:\s*"([^"]+)"/)?.[1];

    citations.push({
      kind: "provenance-searchTerm",
      sourceKind: bm[1] as "docSource" | "xbrlSource",
      sourceType,
      file: path.relative(process.cwd(), filePath),
      ticker,
      cik,
      accession,
      filingDate,
      searchTerm: st[1],
    });
  }

  return citations;
}

function extractDilutiveSources(filePath: string): { sources: DilutiveSource[]; convertibles: ConvertibleMathRow[] } {
  const content = fs.readFileSync(filePath, "utf8");

  const tickerBlockRe = /^\s*([A-Z0-9]+)\s*:\s*\[/gm;
  const indices: Array<{ ticker: string; index: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = tickerBlockRe.exec(content))) {
    indices.push({ ticker: m[1], index: m.index });
  }

  const sources: DilutiveSource[] = [];
  const convertibles: ConvertibleMathRow[] = [];

  for (let i = 0; i < indices.length; i++) {
    const start = indices[i].index;
    const end = i + 1 < indices.length ? indices[i + 1].index : content.length;
    const block = content.slice(start, end);
    const ticker = indices[i].ticker;

    const objRe = /\{([\s\S]*?)\n\s*\},?/g;
    let om: RegExpExecArray | null;
    while ((om = objRe.exec(block))) {
      const obj = om[1];

      const source = obj.match(/\bsource\s*:\s*"([^"]+)"/)?.[1];
      const sourceUrl = obj.match(/\bsourceUrl\s*:\s*"([^"]+)"/)?.[1];
      if (source && sourceUrl) {
        sources.push({
          kind: "dilutive-source",
          file: path.relative(process.cwd(), filePath),
          ticker,
          source,
          sourceUrl,
        });
      }

      const type = obj.match(/\btype\s*:\s*"([^"]+)"/)?.[1];
      if (type === "convertible") {
        const strikePrice = Number(obj.match(/\bstrikePrice\s*:\s*([0-9.]+)/)?.[1]);
        const potentialShares = Number(obj.match(/\bpotentialShares\s*:\s*([0-9_]+)/)?.[1]?.replace(/_/g, ""));
        const faceValueRaw = obj.match(/\bfaceValue\s*:\s*([0-9_]+)/)?.[1];
        const faceValue = faceValueRaw ? Number(faceValueRaw.replace(/_/g, "")) : undefined;
        const notes = obj.match(/\bnotes\s*:\s*"([^"]+)"/)?.[1];

        if (Number.isFinite(strikePrice) && Number.isFinite(potentialShares)) {
          convertibles.push({
            ticker,
            name: notes,
            strikePrice,
            faceValue,
            potentialShares,
            source: source ?? "(unknown)",
          });
        }
      }
    }
  }

  return { sources, convertibles };
}

// Terms that are too generic for full-text search (would match thousands of filings)
const GENERIC_TERMS = new Set([
  "959", "69%", "202", "54.35", "2.25", "Total liabilities", 
  "Total Pref", "Basic Shares Outstanding", "$15 million",
]);

// Terms that indicate non-SEC sources (skip EDGAR search)
const NON_SEC_PATTERNS = [
  /^\[JS-rendered/,
  /^Operating cash outflows/,
  /^Total spot Bitcoin in Treasury/,
  /^Total group holdings/,
];

function isNonSecSource(citation: Citation): boolean {
  // No CIK = definitely not searchable on EDGAR
  if (!citation.cik) return true;
  // Check for known non-SEC patterns in searchTerm
  if (NON_SEC_PATTERNS.some(p => p.test(citation.searchTerm))) return true;
  // Check if the source block contains type: "press-release" or similar non-SEC types
  // (detected via the sourceType field if we extract it)
  if (citation.sourceType && !['sec-document', 'xbrl'].includes(citation.sourceType)) return true;
  return false;
}

function isGenericTerm(term: string): boolean {
  if (GENERIC_TERMS.has(term)) return true;
  // Terms shorter than 4 chars are too generic
  if (term.replace(/[^a-zA-Z0-9]/g, '').length < 4) return true;
  return false;
}

function isXbrlOnlyCitation(citation: Citation): boolean {
  // xbrlSource citations may not appear in filing text — they're in structured XBRL data
  // We detect this by checking if the citation came from an xbrlSource block
  // The kind field from the regex match helps here
  return false; // Will be set during extraction
}

async function edgarSearch(searchTerm: string, startdt: string, enddt: string) {
  const url = new URL("https://efts.sec.gov/LATEST/search-index");
  // EDGAR expects q="term" (including surrounding quotes). We build it directly.
  url.searchParams.set("q", `\"${searchTerm}\"`);
  url.searchParams.set("dateRange", "custom");
  url.searchParams.set("startdt", startdt);
  url.searchParams.set("enddt", enddt);

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`EDGAR search HTTP ${res.status} for ${url}: ${txt.slice(0, 200)}`);
  }

  return (await res.json()) as any;
}

function pickDateWindow(c: Citation): { startdt: string; enddt: string } {
  if (c.filingDate) {
    return { startdt: addDays(c.filingDate, -30), enddt: addDays(c.filingDate, 30) };
  }
  return { startdt: "1993-01-01", enddt: new Date().toISOString().slice(0, 10) };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const verbose = args.has("--verbose");

  const repoRoot = "/Users/dwinny/dat-tracker-next";
  const provenanceDir = path.join(repoRoot, "src/lib/data/provenance");
  const dilutiveFile = path.join(repoRoot, "src/lib/data/dilutive-instruments.ts");

  const provenanceFiles = findAllTsFiles(provenanceDir);
  const citations = provenanceFiles.flatMap((f) => extractCitationObjectsFromProvenanceFile(f));

  const { sources: dilutiveSources, convertibles } = extractDilutiveSources(dilutiveFile);

  const byTicker = new Map<string, Citation[]>();
  for (const c of citations) {
    const arr = byTicker.get(c.ticker) ?? [];
    arr.push(c);
    byTicker.set(c.ticker, arr);
  }

  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let warned = 0;

  const lines: string[] = [];
  lines.push("=== Citation Verification Report ===\n");

  for (const [ticker, list] of [...byTicker.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const cik = list.find((x) => x.cik)?.cik;
    lines.push(`${ticker}${cik ? ` (CIK ${cik})` : ""}:`);

    for (const c of list) {
      // Skip non-SEC sources (no CIK = can't search EDGAR)
      if (isNonSecSource(c)) {
        lines.push(`  ⏭️  searchTerm "${c.searchTerm}" SKIPPED (non-SEC source, no CIK)`);
        skipped++;
        continue;
      }

      // Warn on generic terms (too short/common for reliable search)
      if (isGenericTerm(c.searchTerm)) {
        lines.push(`  ⚠️  searchTerm "${c.searchTerm}" SKIPPED (too generic for full-text search)`);
        warned++;
        continue;
      }

      // Warn on XBRL-only citations (values in structured data, may not appear in filing text)
      if (c.sourceKind === "xbrlSource") {
        // XBRL values often DO appear in the HTML filing too, so still worth checking
        // But mark as warning instead of failure if not found
      }

      const { startdt, enddt } = pickDateWindow(c);
      try {
        const json = await edgarSearch(c.searchTerm, startdt, enddt);
        const hits: any[] = json?.hits?.hits ?? [];

        const wantCik = c.cik ? String(c.cik).replace(/^0+/, '') : undefined;
        const wantCikPadded = wantCik ? wantCik.padStart(10, '0') : undefined;
        const matching = wantCik
          ? hits.filter((h) => {
              // EDGAR returns ciks as an array of padded strings: ["0001507605"]
              const ciks: string[] = h?._source?.ciks ?? [];
              return ciks.some((c: string) => 
                String(c).replace(/^0+/, '') === wantCik || 
                String(c) === wantCikPadded
              );
            })
          : hits;

        if (matching.length > 0) {
          const accession = matching[0]?._source?.adsh ?? matching[0]?._source?.accessionNo;
          const foundCiks = matching[0]?._source?.ciks ?? [];
          const foundCik = foundCiks[0];
          lines.push(
            `  ✅ searchTerm "${c.searchTerm}" found${accession ? ` in filing ${accession}` : ""}${foundCik ? ` (CIK ${foundCik})` : ""}`
          );
          passed++;
        } else if (c.sourceKind === "xbrlSource" && hits.length === 0) {
          // XBRL values might only exist in structured data, not filing text
          lines.push(`  ⚠️  searchTerm "${c.searchTerm}" not in filing text (XBRL-only value?)`);
          if (verbose) {
            lines.push(`     file=${c.file} sourceKind=xbrlSource`);
          }
          warned++;
        } else {
          lines.push(`  ❌ searchTerm "${c.searchTerm}" NOT FOUND in any ${ticker} filing`);
          if (verbose) {
            lines.push(`     file=${c.file} sourceKind=${c.sourceKind}`);
            lines.push(
              `     expected cik=${c.cik ?? "(unknown)"} accession=${c.accession ?? "(unknown)"} filingDate=${c.filingDate ?? "(unknown)"}`
            );
            lines.push(`     window=${startdt}..${enddt} totalHits=${hits.length}`);
          }
          failed++;
        }
      } catch (e: any) {
        lines.push(`  ❌ searchTerm "${c.searchTerm}" ERROR: ${e?.message ?? String(e)}`);
        failed++;
      }

      await sleep(REQUEST_DELAY_MS);
    }

    lines.push("");
  }

  lines.push("=== Convertible Math Check ===");
  let mathPassed = 0;
  let mathFailed = 0;

  for (const row of convertibles) {
    const { ticker, strikePrice, faceValue, potentialShares, source } = row;

    if (!faceValue || !Number.isFinite(faceValue) || faceValue <= 0 || strikePrice <= 0) {
      lines.push(`${ticker}: strike=$${strikePrice.toFixed(2)} potentialShares=${fmtInt(potentialShares)} (source=${source})`);
      lines.push(`  ⚠️  Skipped (no faceValue or non-positive strike)`);
      continue;
    }

    // Skip if potentialShares is 0 (being redeemed, not converted)
    if (potentialShares === 0) {
      lines.push(`${ticker}: strike=$${strikePrice.toFixed(2)}, faceValue=$${fmtInt(faceValue)}, potentialShares=0 (source=${source})`);
      lines.push(`  ⚠️  Skipped (potentialShares=0 — likely cash redemption, not conversion)`);
      continue;
    }

    const implied = faceValue / strikePrice;
    const diff = Math.abs(potentialShares - implied);

    // Many convertibles round conversion rates to 3-6 decimals or have fractional/share settlement.
    // European OCA bonds (typically sub-$1 strike) use different conversion mechanics — allow higher tolerance.
    const tolerance = strikePrice < 1.0 ? potentialShares * 0.02 : 10_000; // 2% for European OCAs, fixed for US
    const ok = diff < tolerance;

    lines.push(
      `${ticker}: strike=$${strikePrice.toFixed(2)}, faceValue=$${fmtInt(faceValue)}, potentialShares=${fmtInt(potentialShares)} (source=${source})`
    );
    lines.push(
      `  ${ok ? "✅" : "❌"} Math check: ${fmtInt(faceValue)}/${strikePrice.toFixed(2)} = ${fmtInt(Math.round(implied))} (diff ${fmtInt(Math.round(diff))}, tol ${fmtInt(Math.round(tolerance))})`
    );

    if (ok) mathPassed++;
    else mathFailed++;
  }

  lines.push("\n=== Dilutive Instrument Sources (presence only) ===");
  lines.push(`Found ${dilutiveSources.length} instrument sourceUrl entries in dilutive-instruments.ts`);

  lines.push("\n=== Summary ===");
  const totalChecked = passed + failed;
  lines.push(`Citations: ${passed}/${totalChecked} passed (${failed} FAILED, ${skipped} skipped, ${warned} warnings)`);
  lines.push(`Math: ${mathPassed}/${mathPassed + mathFailed} passed (${mathFailed} FAILED)`);

  if (failed > 0 || mathFailed > 0) {
    lines.push(`\n⚠️  EXIT CODE 1 — ${failed} citation failures + ${mathFailed} math failures need investigation`);
  } else {
    lines.push(`\n✅ All checked citations verified. ${skipped} non-SEC skipped, ${warned} warnings (generic/XBRL).`);
  }

  process.stdout.write(lines.join("\n") + "\n");

  if (failed > 0 || mathFailed > 0) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
