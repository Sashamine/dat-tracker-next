#!/usr/bin/env npx tsx
/**
 * verify-d1-citations.ts
 *
 * Verifies D1 datapoints are correct by:
 *
 * 1. XBRL datapoints — re-extracts from SEC companyfacts API and compares
 *    value + concept against what's stored in D1. Flags divergences.
 *
 * 2. LLM/text datapoints with citation_quote — verifies the quoted passage
 *    actually appears in the cited R2 document (same logic as
 *    verify-quote-in-document.ts).
 *
 * 3. All datapoints — flags any that have no provenance trail
 *    (no xbrl_concept AND no citation_quote AND no artifact).
 *
 * Usage:
 *   npx tsx scripts/verify-d1-citations.ts              # all tickers
 *   npx tsx scripts/verify-d1-citations.ts --ticker=MSTR # single ticker
 *   npx tsx scripts/verify-d1-citations.ts --verbose     # show all checks
 */

import { D1Client } from '../src/lib/d1';
import { extractXBRLData } from '../src/lib/sec/xbrl-extractor';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
function argVal(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}
const verbose = process.argv.includes('--verbose');
const filterTicker = argVal('ticker')?.toUpperCase() ?? null;

// ---------------------------------------------------------------------------
// R2 document fetching (mirrors verify-quote-in-document.ts)
// ---------------------------------------------------------------------------
const R2_BASE_URL = 'https://pub-1e4356c7aea34102aad6e3493b0c62f1.r2.dev';
const TICKER_BATCHES: Record<string, number> = {
  abtc: 1, asst: 1, avx: 1, bmnr: 1, bnc: 1, btbt: 1, btcs: 1, btdr: 1, btog: 1, cepo: 1, clsk: 1,
  corz: 2, cwd: 2, cyph: 2, dfdv: 2, djt: 2, ethm: 2, fgnx: 2, fwdi: 2,
  game: 3, hsdt: 3, hypd: 3, kulr: 3, lits: 3, mara: 3, mstr: 3, na: 3,
  naka: 4, nxtt: 4, purr: 4, riot: 4, sbet: 4, stke: 4, suig: 4,
  taox: 5, tbh: 5, tron: 5, twav: 5, upxi: 5, xrpn: 5, xxi: 5,
  zone: 6, zooz: 1,
};
const R2_PREFIXES = ['new-uploads', 'batch1', 'batch2', 'batch3', 'batch4', 'batch5', 'batch6', 'foreign-filings', 'external-sources'];

async function fetchR2Document(ticker: string, accession: string): Promise<string | null> {
  const tickerLower = ticker.toLowerCase();
  const batch = TICKER_BATCHES[tickerLower] || 1;

  const orderedPrefixes = [
    `batch${batch}`,
    ...R2_PREFIXES.filter((p) => p !== `batch${batch}`),
  ];

  for (const prefix of orderedPrefixes) {
    // Try .txt first, then without extension (some foreign docs)
    for (const suffix of ['.txt', '']) {
      const url = `${R2_BASE_URL}/${prefix}/${tickerLower}/${accession}${suffix}`;
      try {
        const res = await fetch(url);
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          // Skip PDFs — can't search text in them
          if (contentType.includes('pdf')) continue;
          return await res.text();
        }
      } catch {
        continue;
      }
    }
  }
  return null;
}

function findSnippetInDocument(document: string, snippet: string): boolean {
  const escaped = snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = escaped.replace(/\s+/g, '\\s+');
  const regex = new RegExp(pattern, 'gi');
  return regex.test(document);
}

// ---------------------------------------------------------------------------
// Value extraction: find numbers near a search term in a document
// ---------------------------------------------------------------------------

/**
 * Extract numbers appearing near (within ~500 chars of) the search term in doc text.
 * Returns all candidate numbers, sorted by proximity to the search term.
 */
function extractNumbersNearSnippet(document: string, snippet: string): number[] {
  const escaped = snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = escaped.replace(/\s+/g, '\\s+');
  const regex = new RegExp(pattern, 'gi');
  const match = regex.exec(document);
  if (!match) return [];

  const matchPos = match.index;
  const windowStart = Math.max(0, matchPos - 500);
  const windowEnd = Math.min(document.length, matchPos + snippet.length + 500);
  const window = document.slice(windowStart, windowEnd);

  // Match numbers: 1,234,567 or 1234567 or 1,234.56 or $1.2B etc.
  // Also match numbers with spaces as thousand separators (common in foreign filings)
  const numberRegex = /(?:\$\s*)?(\d[\d,\s]*(?:\.\d+)?)\s*(?:billion|million|thousand|B\b|M\b|K\b)?/gi;
  const candidates: { value: number; pos: number }[] = [];

  let m: RegExpExecArray | null;
  while ((m = numberRegex.exec(window)) !== null) {
    const raw = m[1].replace(/[,\s]/g, '');
    let value = parseFloat(raw);
    if (isNaN(value)) continue;

    // Apply scale from suffix
    const suffix = m[0].toLowerCase();
    if (suffix.includes('billion') || /\d\s*B\b/i.test(m[0])) value *= 1e9;
    else if (suffix.includes('million') || /\d\s*M\b/i.test(m[0])) value *= 1e6;
    else if (suffix.includes('thousand') || /\d\s*K\b/i.test(m[0])) value *= 1e3;

    // Distance from snippet match
    const absPos = windowStart + m.index;
    const dist = Math.abs(absPos - matchPos);
    candidates.push({ value, pos: dist });
  }

  // Sort by proximity to the search term
  candidates.sort((a, b) => a.pos - b.pos);
  return candidates.map((c) => c.value);
}

/**
 * Check if any extracted number is close to the expected D1 value.
 * Accounts for scale differences (e.g., D1 stores 1000000, doc says "1 million").
 */
function valueMatchesExtracted(d1Value: number, candidates: number[], tolerancePct: number = 1): boolean {
  if (d1Value === 0) return true; // Zero values are often derived/special
  for (const candidate of candidates) {
    if (candidate === 0) continue;
    const pctDiff = Math.abs(d1Value - candidate) / Math.max(Math.abs(d1Value), Math.abs(candidate)) * 100;
    if (pctDiff <= tolerancePct) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type D1Row = {
  entity_id: string;
  metric: string;
  value: number;
  unit: string;
  as_of: string | null;
  method: string | null;
  xbrl_concept: string | null;
  citation_quote: string | null;
  citation_search_term: string | null;
  artifact_id: string | null;
  source_url: string | null;
  accession: string | null;
  source_type: string | null;
};

type XBRLCheck = {
  ticker: string;
  metric: string;
  d1Value: number;
  d1Concept: string | null;
  d1AsOf: string | null;
  freshValue: number | null;
  freshConcept: string | null;
  freshAsOf: string | null;
  status: 'pass' | 'value_mismatch' | 'concept_mismatch' | 'date_mismatch' | 'extraction_failed' | 'no_fresh_data';
  divergencePct: number | null;
};

type QuoteCheck = {
  ticker: string;
  metric: string;
  quote: string;
  accession: string;
  status: 'pass' | 'doc_missing' | 'quote_not_found' | 'no_accession';
};

type ProvenanceCheck = {
  ticker: string;
  metric: string;
  method: string | null;
  hasXbrlConcept: boolean;
  hasCitationQuote: boolean;
  hasArtifact: boolean;
  status: 'full' | 'partial' | 'none';
};

type ValueCheck = {
  ticker: string;
  metric: string;
  d1Value: number;
  searchTerm: string;
  accession: string;
  closestCandidate: number | null;
  divergencePct: number | null;
  status: 'pass' | 'no_match' | 'doc_missing' | 'no_candidates' | 'derived_skip';
};

// ---------------------------------------------------------------------------
// XBRL metric mapping: D1 metric name -> extraction result field
// ---------------------------------------------------------------------------
function mapXBRLResult(
  x: Record<string, unknown>,
  metric: string
): { value: number | null; concept: string | null; asOf: string | null } {
  switch (metric) {
    case 'cash_usd':
      return { value: x.cashAndEquivalents as number | null, concept: x.cashConcept as string | null, asOf: x.cashDate as string | null };
    case 'debt_usd':
      return { value: x.totalDebt as number | null, concept: x.debtConcept as string | null, asOf: x.debtDate as string | null };
    case 'basic_shares':
      return { value: x.sharesOutstanding as number | null, concept: x.sharesConcept as string | null, asOf: x.sharesOutstandingDate as string | null };
    case 'preferred_equity_usd':
      return { value: x.preferredEquity as number | null, concept: x.preferredEquityConcept as string | null, asOf: x.preferredEquityDate as string | null };
    case 'restricted_cash_usd':
      return { value: x.restrictedCash as number | null, concept: x.restrictedCashConcept as string | null, asOf: x.restrictedCashDate as string | null };
    case 'holdings_native':
      return { value: x.bitcoinHoldingsNative as number | null, concept: x.bitcoinHoldingsNativeConcept as string | null, asOf: x.bitcoinHoldingsDate as string | null };
    case 'bitcoin_holdings_usd':
      return { value: x.bitcoinHoldings as number | null, concept: x.bitcoinHoldingsUsdConcept as string | null, asOf: x.bitcoinHoldingsDate as string | null };
    case 'other_investments_usd':
      return { value: x.otherInvestments as number | null, concept: x.otherInvestmentsConcept as string | null, asOf: x.otherInvestmentsDate as string | null };
    default:
      return { value: null, concept: null, asOf: null };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const d1 = D1Client.fromEnv();

  // Fetch all latest_datapoints with artifact info
  const query = filterTicker
    ? `SELECT d.entity_id, d.metric, d.value, d.unit, d.as_of, d.method, d.xbrl_concept,
              d.citation_quote, d.citation_search_term, d.artifact_id,
              a.source_url, a.accession, a.source_type
       FROM latest_datapoints d
       LEFT JOIN artifacts a ON a.artifact_id = d.artifact_id
       WHERE d.entity_id = ?
       ORDER BY d.entity_id, d.metric`
    : `SELECT d.entity_id, d.metric, d.value, d.unit, d.as_of, d.method, d.xbrl_concept,
              d.citation_quote, d.citation_search_term, d.artifact_id,
              a.source_url, a.accession, a.source_type
       FROM latest_datapoints d
       LEFT JOIN artifacts a ON a.artifact_id = d.artifact_id
       ORDER BY d.entity_id, d.metric`;

  const params = filterTicker ? [filterTicker] : [];
  const { results: rows } = await d1.query<D1Row>(query, params);

  console.log(`\nLoaded ${rows.length} latest datapoints${filterTicker ? ` for ${filterTicker}` : ''}`);

  // -------------------------------------------------------------------------
  // 1. XBRL verification: re-extract from SEC and compare
  // -------------------------------------------------------------------------
  const xbrlRows = rows.filter((r) => r.method === 'sec_companyfacts_xbrl');
  const xbrlTickers = [...new Set(xbrlRows.map((r) => r.entity_id))];

  console.log(`\n${'='.repeat(60)}`);
  console.log('1. XBRL VERIFICATION (re-extract from SEC API)');
  console.log(`${'='.repeat(60)}`);
  console.log(`  ${xbrlRows.length} datapoints across ${xbrlTickers.length} tickers\n`);

  const xbrlChecks: XBRLCheck[] = [];
  const extractionCache: Record<string, Record<string, unknown> | null> = {};

  for (const ticker of xbrlTickers) {
    // Re-extract (with caching per ticker)
    if (!(ticker in extractionCache)) {
      try {
        const result = await extractXBRLData(ticker);
        extractionCache[ticker] = result.success ? (result as Record<string, unknown>) : null;
      } catch {
        extractionCache[ticker] = null;
      }
    }

    const fresh = extractionCache[ticker];
    const tickerRows = xbrlRows.filter((r) => r.entity_id === ticker);

    for (const row of tickerRows) {
      if (!fresh) {
        xbrlChecks.push({
          ticker,
          metric: row.metric,
          d1Value: row.value,
          d1Concept: row.xbrl_concept,
          d1AsOf: row.as_of,
          freshValue: null,
          freshConcept: null,
          freshAsOf: null,
          status: 'extraction_failed',
          divergencePct: null,
        });
        continue;
      }

      const mapped = mapXBRLResult(fresh, row.metric);

      if (mapped.value == null) {
        xbrlChecks.push({
          ticker,
          metric: row.metric,
          d1Value: row.value,
          d1Concept: row.xbrl_concept,
          d1AsOf: row.as_of,
          freshValue: null,
          freshConcept: mapped.concept,
          freshAsOf: mapped.asOf,
          status: 'no_fresh_data',
          divergencePct: null,
        });
        continue;
      }

      const divergence = row.value !== 0
        ? Math.abs((mapped.value - row.value) / row.value) * 100
        : mapped.value !== 0 ? 100 : 0;

      let status: XBRLCheck['status'] = 'pass';
      if (divergence > 0.01) status = 'value_mismatch';
      else if (row.xbrl_concept && mapped.concept && row.xbrl_concept !== mapped.concept) status = 'concept_mismatch';
      else if (row.as_of && mapped.asOf && row.as_of !== mapped.asOf) status = 'date_mismatch';

      xbrlChecks.push({
        ticker,
        metric: row.metric,
        d1Value: row.value,
        d1Concept: row.xbrl_concept,
        d1AsOf: row.as_of,
        freshValue: mapped.value,
        freshConcept: mapped.concept,
        freshAsOf: mapped.asOf,
        status,
        divergencePct: divergence,
      });
    }

    // Respect SEC rate limits
    await new Promise((r) => setTimeout(r, 200));
  }

  // Report XBRL results
  const xbrlPass = xbrlChecks.filter((c) => c.status === 'pass');
  const xbrlValueMismatch = xbrlChecks.filter((c) => c.status === 'value_mismatch');
  const xbrlConceptMismatch = xbrlChecks.filter((c) => c.status === 'concept_mismatch');
  const xbrlDateMismatch = xbrlChecks.filter((c) => c.status === 'date_mismatch');
  const xbrlFailed = xbrlChecks.filter((c) => c.status === 'extraction_failed');
  const xbrlNoData = xbrlChecks.filter((c) => c.status === 'no_fresh_data');

  console.log(`  PASS:              ${xbrlPass.length}`);
  console.log(`  VALUE MISMATCH:    ${xbrlValueMismatch.length}`);
  console.log(`  CONCEPT MISMATCH:  ${xbrlConceptMismatch.length}`);
  console.log(`  DATE MISMATCH:     ${xbrlDateMismatch.length}`);
  console.log(`  EXTRACTION FAILED: ${xbrlFailed.length}`);
  console.log(`  NO FRESH DATA:     ${xbrlNoData.length}`);

  if (xbrlValueMismatch.length > 0) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`VALUE MISMATCHES (${xbrlValueMismatch.length}):`);
    console.log(`${'─'.repeat(60)}`);
    for (const c of xbrlValueMismatch) {
      console.log(`\n  ${c.ticker} / ${c.metric}`);
      console.log(`    D1:    ${c.d1Value.toLocaleString()} (as_of: ${c.d1AsOf})`);
      console.log(`    Fresh: ${c.freshValue?.toLocaleString()} (as_of: ${c.freshAsOf})`);
      console.log(`    Divergence: ${c.divergencePct?.toFixed(2)}%`);
      if (c.d1Concept || c.freshConcept) {
        console.log(`    Concept: D1=${c.d1Concept || 'null'} / Fresh=${c.freshConcept || 'null'}`);
      }
    }
  }

  if (xbrlFailed.length > 0) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`EXTRACTION FAILURES (${xbrlFailed.length}):`);
    console.log(`${'─'.repeat(60)}`);
    const failedTickers = [...new Set(xbrlFailed.map((c) => c.ticker))];
    for (const t of failedTickers) {
      const metrics = xbrlFailed.filter((c) => c.ticker === t).map((c) => c.metric);
      console.log(`  ${t}: ${metrics.join(', ')}`);
    }
  }

  if (verbose && xbrlPass.length > 0) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`XBRL PASS (${xbrlPass.length}):`);
    console.log(`${'─'.repeat(60)}`);
    for (const c of xbrlPass) {
      console.log(`  ${c.ticker} / ${c.metric} = ${c.d1Value.toLocaleString()} ✓ (${c.d1Concept || 'no concept'})`);
    }
  }

  // -------------------------------------------------------------------------
  // 2. Citation quote verification: check quotes exist in R2 documents
  // -------------------------------------------------------------------------
  const quoteRows = rows.filter((r) => r.citation_quote && r.accession);
  console.log(`\n${'='.repeat(60)}`);
  console.log('2. CITATION QUOTE VERIFICATION (check in R2 documents)');
  console.log(`${'='.repeat(60)}`);
  console.log(`  ${quoteRows.length} datapoints with citation_quote + accession`);

  const quoteChecks: QuoteCheck[] = [];
  const docCache: Record<string, string | null> = {};

  for (const row of quoteRows) {
    if (!row.accession) {
      quoteChecks.push({
        ticker: row.entity_id,
        metric: row.metric,
        quote: row.citation_quote!,
        accession: '',
        status: 'no_accession',
      });
      continue;
    }

    // Cache R2 fetches per accession
    const cacheKey = `${row.entity_id}|${row.accession}`;
    if (!(cacheKey in docCache)) {
      docCache[cacheKey] = await fetchR2Document(row.entity_id, row.accession);
    }

    const doc = docCache[cacheKey];
    if (!doc) {
      quoteChecks.push({
        ticker: row.entity_id,
        metric: row.metric,
        quote: row.citation_quote!,
        accession: row.accession,
        status: 'doc_missing',
      });
      continue;
    }

    const searchTerm = row.citation_search_term || row.citation_quote!.slice(0, 60);
    const found = findSnippetInDocument(doc, searchTerm);

    quoteChecks.push({
      ticker: row.entity_id,
      metric: row.metric,
      quote: row.citation_quote!,
      accession: row.accession,
      status: found ? 'pass' : 'quote_not_found',
    });
  }

  if (quoteRows.length === 0) {
    console.log('  (no citation quotes to verify yet)\n');
  } else {
    const qPass = quoteChecks.filter((c) => c.status === 'pass');
    const qMissing = quoteChecks.filter((c) => c.status === 'doc_missing');
    const qNotFound = quoteChecks.filter((c) => c.status === 'quote_not_found');

    console.log(`  PASS:            ${qPass.length}`);
    console.log(`  DOC MISSING:     ${qMissing.length}`);
    console.log(`  QUOTE NOT FOUND: ${qNotFound.length}`);

    if (qNotFound.length > 0) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`QUOTE NOT FOUND IN DOCUMENT (${qNotFound.length}):`);
      console.log(`${'─'.repeat(60)}`);
      for (const c of qNotFound) {
        console.log(`\n  ${c.ticker} / ${c.metric}`);
        console.log(`    Accession: ${c.accession}`);
        console.log(`    Quote:     "${c.quote.slice(0, 100)}${c.quote.length > 100 ? '...' : ''}"`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // 3. Provenance coverage: which datapoints have NO citation trail?
  // -------------------------------------------------------------------------
  console.log(`\n${'='.repeat(60)}`);
  console.log('3. PROVENANCE COVERAGE');
  console.log(`${'='.repeat(60)}`);

  const provenanceChecks: ProvenanceCheck[] = rows.map((r) => {
    const hasXbrlConcept = !!r.xbrl_concept;
    const hasCitationQuote = !!r.citation_quote;
    const hasArtifact = !!r.artifact_id;

    let status: ProvenanceCheck['status'] = 'none';
    if (hasXbrlConcept || hasCitationQuote) status = 'full';
    else if (hasArtifact) status = 'partial';

    return {
      ticker: r.entity_id,
      metric: r.metric,
      method: r.method,
      hasXbrlConcept,
      hasCitationQuote,
      hasArtifact,
      status,
    };
  });

  const full = provenanceChecks.filter((c) => c.status === 'full');
  const partial = provenanceChecks.filter((c) => c.status === 'partial');
  const none = provenanceChecks.filter((c) => c.status === 'none');

  console.log(`  FULL (concept or quote): ${full.length}`);
  console.log(`  PARTIAL (artifact only): ${partial.length}`);
  console.log(`  NONE (no trail):         ${none.length}`);
  console.log(`  Total:                   ${provenanceChecks.length}`);
  console.log(`  Coverage:                ${((full.length / provenanceChecks.length) * 100).toFixed(1)}% full, ${(((full.length + partial.length) / provenanceChecks.length) * 100).toFixed(1)}% partial+`);

  if (none.length > 0) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`NO PROVENANCE TRAIL (${none.length}):`);
    console.log(`${'─'.repeat(60)}`);
    for (const c of none) {
      console.log(`  ${c.ticker} / ${c.metric} (method: ${c.method || 'null'})`);
    }
  }

  if (partial.length > 0 && verbose) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`PARTIAL PROVENANCE (artifact only, no concept/quote) (${partial.length}):`);
    console.log(`${'─'.repeat(60)}`);
    for (const c of partial) {
      console.log(`  ${c.ticker} / ${c.metric} (method: ${c.method || 'null'})`);
    }
  }

  // -------------------------------------------------------------------------
  // 4. Value extraction: extract numbers near search term, compare to D1
  // -------------------------------------------------------------------------
  // Only check datapoints that have a search term and an accession (document link).
  // Skip derived/carried-forward values (prefixed with [Derived], [Carried forward], etc.)
  const DERIVED_PREFIXES = ['[Zero', '[Derived', '[Carried', '[Pre-filing', '[SPAC', '[Historical'];
  const valueCheckRows = rows.filter((r) => {
    if (!r.citation_search_term || !r.accession) return false;
    if (r.value === 0) return false; // Zero values are often special
    // Skip derived citations — no number to extract from document
    const quote = r.citation_quote || '';
    if (DERIVED_PREFIXES.some((p) => quote.startsWith(p))) return false;
    return true;
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log('4. VALUE EXTRACTION VERIFICATION (number near search term)');
  console.log(`${'='.repeat(60)}`);
  console.log(`  ${valueCheckRows.length} datapoints to verify\n`);

  const valueChecks: ValueCheck[] = [];

  for (const row of valueCheckRows) {
    const cacheKey = `${row.entity_id}|${row.accession}`;
    if (!(cacheKey in docCache)) {
      docCache[cacheKey] = await fetchR2Document(row.entity_id, row.accession!);
    }

    const doc = docCache[cacheKey];
    if (!doc) {
      valueChecks.push({
        ticker: row.entity_id,
        metric: row.metric,
        d1Value: row.value,
        searchTerm: row.citation_search_term!,
        accession: row.accession!,
        closestCandidate: null,
        divergencePct: null,
        status: 'doc_missing',
      });
      continue;
    }

    const candidates = extractNumbersNearSnippet(doc, row.citation_search_term!);

    if (candidates.length === 0) {
      valueChecks.push({
        ticker: row.entity_id,
        metric: row.metric,
        d1Value: row.value,
        searchTerm: row.citation_search_term!,
        accession: row.accession!,
        closestCandidate: null,
        divergencePct: null,
        status: 'no_candidates',
      });
      continue;
    }

    const matched = valueMatchesExtracted(row.value, candidates, 5); // 5% tolerance

    // Find closest candidate for reporting
    let closest = candidates[0];
    let closestDivergence = row.value !== 0
      ? Math.abs(row.value - closest) / Math.abs(row.value) * 100
      : 0;
    for (const c of candidates) {
      const d = row.value !== 0 ? Math.abs(row.value - c) / Math.abs(row.value) * 100 : 0;
      if (d < closestDivergence) {
        closest = c;
        closestDivergence = d;
      }
    }

    valueChecks.push({
      ticker: row.entity_id,
      metric: row.metric,
      d1Value: row.value,
      searchTerm: row.citation_search_term!,
      accession: row.accession!,
      closestCandidate: closest,
      divergencePct: closestDivergence,
      status: matched ? 'pass' : 'no_match',
    });
  }

  const vPass = valueChecks.filter((c) => c.status === 'pass');
  const vNoMatch = valueChecks.filter((c) => c.status === 'no_match');
  const vDocMissing = valueChecks.filter((c) => c.status === 'doc_missing');
  const vNoCandidates = valueChecks.filter((c) => c.status === 'no_candidates');

  console.log(`  PASS:            ${vPass.length}`);
  console.log(`  NO MATCH (>5%):  ${vNoMatch.length}`);
  console.log(`  DOC MISSING:     ${vDocMissing.length}`);
  console.log(`  NO CANDIDATES:   ${vNoCandidates.length}`);

  if (vNoMatch.length > 0) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`VALUE MISMATCHES (${vNoMatch.length}):`);
    console.log(`${'─'.repeat(60)}`);
    for (const c of vNoMatch) {
      console.log(`\n  ${c.ticker} / ${c.metric}`);
      console.log(`    D1 value:  ${c.d1Value.toLocaleString()}`);
      console.log(`    Closest:   ${c.closestCandidate?.toLocaleString()} (${c.divergencePct?.toFixed(1)}% off)`);
      console.log(`    Search:    "${c.searchTerm.slice(0, 80)}"`);
      console.log(`    Accession: ${c.accession}`);
    }
  }

  if (vNoCandidates.length > 0 && verbose) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`NO NUMBERS FOUND NEAR SEARCH TERM (${vNoCandidates.length}):`);
    console.log(`${'─'.repeat(60)}`);
    for (const c of vNoCandidates) {
      console.log(`  ${c.ticker} / ${c.metric}: "${c.searchTerm.slice(0, 60)}" (D1: ${c.d1Value.toLocaleString()})`);
    }
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(60)}`);

  const xbrlIssues = xbrlValueMismatch.length + xbrlConceptMismatch.length;
  const quoteIssues = quoteChecks.filter((c) => c.status === 'quote_not_found').length;
  const valueIssues = vNoMatch.length;
  const totalIssues = xbrlIssues + quoteIssues + valueIssues;

  console.log(`  XBRL checks:       ${xbrlChecks.length} (${xbrlPass.length} pass, ${xbrlIssues} issues, ${xbrlFailed.length} can't verify)`);
  console.log(`  Quote checks:      ${quoteChecks.length} (${quoteChecks.filter((c) => c.status === 'pass').length} pass, ${quoteIssues} issues)`);
  console.log(`  Value checks:      ${valueChecks.length} (${vPass.length} pass, ${valueIssues} mismatches, ${vNoCandidates.length} no candidates)`);
  console.log(`  Provenance:        ${full.length}/${provenanceChecks.length} full coverage (${((full.length / provenanceChecks.length) * 100).toFixed(1)}%)`);
  console.log(`  Total issues:      ${totalIssues}`);

  if (totalIssues > 0) {
    console.log('\n  ⚠ Issues found — review mismatches above');
    process.exit(1);
  } else if (xbrlFailed.length > 0) {
    console.log(`\n  Some tickers couldn't be verified (no SEC XBRL data)`);
  } else {
    console.log('\n  All verifiable datapoints passed ✓');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
