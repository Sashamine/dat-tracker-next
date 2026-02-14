#!/usr/bin/env npx tsx
/**
 * Citation Verification Script
 * ============================
 *
 * Verifies that provenance source URLs are accessible and contain the cited data.
 *
 * Two verification layers:
 *   Layer 1 — Link health: Does the URL return 200?
 *   Layer 2 — Content match: Does the page contain the cited value/searchTerm?
 *
 * Usage:
 *   npx tsx scripts/verify-citations.ts                    # All companies
 *   npx tsx scripts/verify-citations.ts naka btbt          # Specific companies
 *   npx tsx scripts/verify-citations.ts --xbrl-only        # Only check XBRL API sources
 *   npx tsx scripts/verify-citations.ts --report           # Write markdown report to file
 */

import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES
// ============================================================================

interface VerificationResult {
  company: string;
  field: string;
  value: number | string;
  sourceType: "xbrl" | "sec-document" | "press-release" | "company-website" | "regulatory" | "derived";
  url: string;
  searchTerm?: string;
  quote?: string;
  // Results
  status: "pass" | "fail" | "warn" | "skip";
  httpStatus?: number;
  contentMatch?: boolean;
  searchTermFound?: boolean;
  error?: string;
  details?: string;
}

interface CompanyReport {
  company: string;
  results: VerificationResult[];
  passCount: number;
  failCount: number;
  warnCount: number;
  skipCount: number;
}

// ============================================================================
// URL EXTRACTION FROM PROVENANCE
// ============================================================================

/**
 * Build the verification URL for any source type.
 * For XBRL: uses SEC XBRL companyfacts API (machine-readable, no 403)
 * For documents: uses the direct URL from the source
 */
function getVerificationUrl(source: any): string | null {
  if (source.type === "xbrl") {
    // Use SEC XBRL API — always accessible, structured JSON
    const cik = source.cik?.replace(/^0+/, "") || "";
    if (!cik) return null;
    return `https://data.sec.gov/api/xbrl/companyfacts/CIK${source.cik}.json`;
  } else if (source.type === "derived") {
    return null; // Skip derived — they reference other provenance values
  } else {
    return source.url || null;
  }
}

/**
 * Build a direct SEC filing URL for document-level verification
 */
function getSecFilingUrl(source: any): string | null {
  if (!source.cik || !source.accession) return null;
  const cik = source.cik.replace(/^0+/, "");
  const accession = source.accession.replace(/-/g, "");
  return `https://www.sec.gov/Archives/edgar/data/${cik}/${accession}/`;
}

// ============================================================================
// PROVENANCE FILE PARSER
// ============================================================================

interface ExtractedCitation {
  field: string;
  value: number | string;
  source: any;
  notes?: string;
}

/**
 * Parse a provenance .ts file to extract citations.
 * Uses regex since we can't import TS directly without the full project context.
 */
function parseProvenanceFile(filePath: string): ExtractedCitation[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const citations: ExtractedCitation[] = [];

  // Find the main PROVENANCE export (e.g., NAKA_PROVENANCE, BTBT_PROVENANCE)
  // Match patterns like: fieldName: pv( ... )
  // We need to find each field and its pv() call

  // Strategy: find each field assignment that uses pv()
  // Pattern: fieldName: pv(\n    value, \n    source, \n    notes\n  )
  const pvPattern = /(\w+):\s*pv\(\s*\n?\s*([\w_,.\s]+?),\s*\n/g;
  let match;

  // Alternative approach: find XBRL sources with their searchTerms and facts
  const xbrlBlocks = content.matchAll(
    /(\w+):\s*pv\(\s*\n?\s*([^,]+),\s*\n?\s*xbrlSource\(\{([^}]+)\}\)/gs
  );

  for (const block of xbrlBlocks) {
    const field = block[1];
    const valueStr = block[2].trim();
    const xbrlContent = block[3];

    // Extract searchTerm
    const searchTermMatch = xbrlContent.match(/searchTerm:\s*["']([^"']+)["']/);
    const factMatch = xbrlContent.match(/fact:\s*["']([^"']+)["']/);
    const rawValueMatch = xbrlContent.match(/rawValue:\s*([\d_,]+)/);
    const cikMatch = xbrlContent.match(/cik:\s*(?:[\w_]+|["']([^"']+)["'])/);
    const accessionMatch = xbrlContent.match(/accession:\s*(?:[\w_]+|["']([^"']+)["'])/);

    // Resolve variable references for CIK
    let cik = cikMatch?.[1] || "";
    if (!cik) {
      // Try to resolve variable name to string value
      const cikVarMatch = xbrlContent.match(/cik:\s*(\w+)/);
      if (cikVarMatch) {
        const varName = cikVarMatch[1];
        const constMatch = content.match(new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*["']([^"']+)["']`));
        cik = constMatch?.[1] || "";
      }
      if (!cik) {
        // Fallback: look for any CIK constant in the file
        const cikConstMatch = content.match(/(?:const\s+\w+_CIK|CIK)\s*=\s*["']([^"']+)["']/);
        cik = cikConstMatch?.[1] || "";
      }
    }

    // Resolve accession variable references
    let accession = accessionMatch?.[1] || "";
    if (!accession) {
      // Try to find the variable name and resolve it
      const accVarMatch = xbrlContent.match(/accession:\s*(\w+)/);
      if (accVarMatch) {
        const varName = accVarMatch[1];
        const constMatch = content.match(new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*["']([^"']+)["']`));
        accession = constMatch?.[1] || "";
      }
    }

    // Resolve rawValue if it's a variable reference
    let resolvedValue: number;
    const rawStr = rawValueMatch?.[1]?.replace(/[_,]/g, "") || "";
    if (rawStr && !isNaN(Number(rawStr))) {
      resolvedValue = Number(rawStr);
    } else {
      // rawValue might be a const reference
      const rawVarMatch = xbrlContent.match(/rawValue:\s*(\w+)/);
      if (rawVarMatch) {
        const varName = rawVarMatch[1];
        const constMatch = content.match(new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*([\\d_,]+)`));
        resolvedValue = constMatch ? Number(constMatch[1].replace(/[_,]/g, "")) : Number(valueStr.replace(/[_,]/g, ""));
      } else {
        resolvedValue = Number(valueStr.replace(/[_,]/g, ""));
      }
    }

    // If value is still NaN, try searchTerm as last resort
    if (isNaN(resolvedValue) && searchTermMatch?.[1]) {
      resolvedValue = Number(searchTermMatch[1].replace(/[_,]/g, ""));
    }

    citations.push({
      field,
      value: isNaN(resolvedValue) ? valueStr : resolvedValue,
      source: {
        type: "xbrl",
        fact: factMatch?.[1] || "",
        searchTerm: searchTermMatch?.[1] || "",
        rawValue: resolvedValue,
        cik,
        accession,
      },
      notes: searchTermMatch?.[1],
    });
  }

  // Find docSource blocks
  const docBlocks = content.matchAll(
    /(\w+):\s*pv\(\s*\n?\s*([^,]+),\s*\n?\s*docSource\(\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\)/gs
  );

  for (const block of docBlocks) {
    const field = block[1];
    const valueStr = block[2].trim();
    const docContent = block[3];

    const urlMatch = docContent.match(/url:\s*(?:`([^`]+)`|["']([^"']+)["'])/);
    const searchTermMatch = docContent.match(/searchTerm:\s*["']([^"']+)["']/);
    const quoteMatch = docContent.match(/quote:\s*["']([^"']+)["']/);
    const typeMatch = docContent.match(/type:\s*["']([^"']+)["']/);

    // Resolve constant value references like LATEST_HOLDINGS
    let docValue = Number(valueStr.replace(/[_,]/g, ""));
    if (isNaN(docValue) && /^[A-Z_]+$/.test(valueStr.trim())) {
      const varName = valueStr.trim();
      const constMatch = content.match(new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*([\\d_,]+)`));
      if (constMatch) {
        docValue = Number(constMatch[1].replace(/[_,]/g, ""));
      }
    }

    let rawUrl = urlMatch?.[1] || urlMatch?.[2] || "";

    // Resolve template literals like `/filings/abtc/${Q3_2025_10Q_ACCESSION}`
    if (rawUrl.includes("${")) {
      const resolvedUrl = rawUrl.replace(/\$\{(\w+)\}/g, (_, varName) => {
        const constMatch = content.match(new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*["']([^"']+)["']`));
        return constMatch?.[1] || `\${${varName}}`;
      });
      rawUrl = resolvedUrl;
    }

    // Convert internal /filings/ URLs to SEC EDGAR URLs if possible
    if (rawUrl.startsWith("/filings/")) {
      // Internal URL — try to build SEC URL from CIK + accession
      const accessionInUrl = rawUrl.match(/\/filings\/\w+\/([\d-]+)/);
      if (accessionInUrl) {
        const accNum = accessionInUrl[1];
        // Look for CIK in the file
        const fileCikMatch = content.match(/(?:const\s+\w+_CIK|CIK)\s*=\s*["']([^"']+)["']/);
        if (fileCikMatch) {
          const cik = fileCikMatch[1].replace(/^0+/, "");
          rawUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accNum.replace(/-/g, "")}/`;
        }
      }
    }

    // If still NaN, try searchTerm
    if (isNaN(docValue) && searchTermMatch?.[1]) {
      docValue = Number(searchTermMatch[1].replace(/[_,]/g, ""));
    }

    citations.push({
      field,
      value: isNaN(docValue) ? valueStr : docValue,
      source: {
        type: typeMatch?.[1] || "sec-document",
        url: rawUrl,
        searchTerm: searchTermMatch?.[1] || "",
        quote: quoteMatch?.[1] || "",
      },
    });
  }

  return citations;
}

// ============================================================================
// VERIFICATION ENGINE
// ============================================================================

const SEC_USER_AGENT = "DATCAP-Verify/1.0 (datcap.co; contact@datcap.co)";
const FETCH_TIMEOUT = 15_000;

async function fetchWithRetry(
  url: string,
  retries = 2
): Promise<{ status: number; body: string; error?: string }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": SEC_USER_AGENT,
          Accept: "text/html,application/json,application/xhtml+xml,*/*",
        },
        redirect: "follow",
      });

      clearTimeout(timeout);

      const body = await res.text();
      return { status: res.status, body };
    } catch (err: any) {
      if (attempt === retries) {
        return { status: 0, body: "", error: err.message || String(err) };
      }
      // Wait before retry
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return { status: 0, body: "", error: "exhausted retries" };
}

/**
 * Verify an XBRL citation against the SEC XBRL API
 */
async function verifyXbrl(citation: ExtractedCitation): Promise<VerificationResult> {
  const { field, value, source } = citation;
  const cik = source.cik;

  if (!cik) {
    return {
      company: "", field, value, sourceType: "xbrl",
      url: "N/A", status: "skip", error: "No CIK found",
    };
  }

  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;

  const result: VerificationResult = {
    company: "", field, value, sourceType: "xbrl",
    url, searchTerm: source.searchTerm, status: "pass",
  };

  const { status, body, error } = await fetchWithRetry(url);

  if (error || status !== 200) {
    result.status = "fail";
    result.httpStatus = status;
    result.error = error || `HTTP ${status}`;
    return result;
  }

  result.httpStatus = 200;

  // Parse XBRL JSON and look for the fact
  try {
    const data = JSON.parse(body);
    const factName = source.fact;

    // XBRL facts are nested: facts -> us-gaap/dei/srt -> factName -> units -> ...
    let factData: any = null;
    const knownNamespaces = ["us-gaap", "dei", "srt", "ifrs-full"];

    // Parse namespace:localName from fact
    const [ns, localName] = factName.includes(":") ? factName.split(":", 2) : ["", factName];

    // Build search order: explicit namespace first, then all known
    const namespacesToCheck = ns ? [ns, ...knownNamespaces.filter(n => n !== ns)] : knownNamespaces;
    const nameToCheck = ns ? localName : factName;

    for (const namespace of namespacesToCheck) {
      if (data.facts?.[namespace]?.[nameToCheck]) {
        factData = data.facts[namespace][nameToCheck];
        break;
      }
    }

    // Also check all namespaces in the data for custom company-specific taxonomies
    if (!factData && data.facts) {
      for (const [namespace, facts] of Object.entries(data.facts)) {
        if ((facts as any)?.[nameToCheck]) {
          factData = (facts as any)[nameToCheck];
          break;
        }
      }
    }

    if (!factData) {
      result.status = "warn";
      result.contentMatch = false;
      result.details = `XBRL fact '${factName}' not found in companyfacts`;
      return result;
    }

    // Look for the specific value in the units
    let rawValue = typeof source.rawValue === "number" && !isNaN(source.rawValue)
      ? source.rawValue
      : Number(String(value).replace(/[_,]/g, ""));
    
    // If still NaN, try to extract from searchTerm
    if (isNaN(rawValue) && source.searchTerm) {
      rawValue = Number(source.searchTerm.replace(/[_,]/g, ""));
    }

    if (isNaN(rawValue)) {
      result.status = "warn";
      result.details = `Could not resolve numeric value for comparison (value=${value})`;
      return result;
    }

    let found = false;

    for (const [unitKey, entries] of Object.entries(factData.units || {})) {
      for (const entry of entries as any[]) {
        if (Math.abs(entry.val - rawValue) < 1) {
          found = true;
          result.details = `Found val=${entry.val} in ${unitKey} (filed ${entry.filed}, period ${entry.end || entry.start})`;
          break;
        }
      }
      if (found) break;
    }

    result.contentMatch = found;
    result.searchTermFound = found;

    if (!found) {
      result.status = "warn";
      result.details = `Value ${rawValue} not found in XBRL data for fact '${factName}'. Check if the value or fact name has changed.`;
    }
  } catch (parseErr: any) {
    result.status = "warn";
    result.error = `JSON parse error: ${parseErr.message}`;
  }

  return result;
}

/**
 * Verify a document citation by fetching the URL and searching for the value
 */
/**
 * Build search terms from a citation's value, searchTerm, and quote
 */
function buildSearchTerms(value: number | string, source: any): string[] {
  const terms: string[] = [];

  if (source.searchTerm) {
    terms.push(source.searchTerm);
  }

  if (typeof value === "number" && value > 0) {
    terms.push(String(value));
    terms.push(value.toLocaleString("en-US"));
    if (value >= 1_000_000) {
      terms.push((value / 1_000_000).toFixed(1));
    }
  }

  if (source.quote) {
    const quoteSnippet = source.quote.substring(0, 60).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    terms.push(quoteSnippet);
  }

  return terms;
}

/**
 * Search for terms in HTML body, return match details
 */
function searchInBody(body: string, searchTerms: string[]): { anyFound: boolean; matchDetails: string[] } {
  const textBody = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  let anyFound = false;
  const matchDetails: string[] = [];

  for (const term of searchTerms) {
    if (!term) continue;
    const found = textBody.includes(term) || body.includes(term);
    if (found) {
      anyFound = true;
      matchDetails.push(`✓ "${term.substring(0, 50)}"`);
    } else {
      matchDetails.push(`✗ "${term.substring(0, 50)}"`);
    }
  }

  return { anyFound, matchDetails };
}

/**
 * Check if a URL is an SEC filing index page
 */
function isSecIndexUrl(url: string): boolean {
  return /sec\.gov\/Archives\/edgar\/data\/\d+\/\d+\/?$/.test(url);
}

/**
 * Extract document links from an SEC filing index page.
 * Returns URLs to the actual filing documents (10-Q, 8-K, etc.)
 * Prioritizes: primary document > exhibits > all .htm files
 */
function extractDocLinksFromIndex(indexBody: string, baseUrl: string): string[] {
  const links: string[] = [];
  const base = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";

  // SEC index pages list documents in a table. Extract .htm links.
  const hrefPattern = /href="\.?\/?([^"]+\.htm[l]?)"/gi;
  let match;
  const seen = new Set<string>();

  while ((match = hrefPattern.exec(indexBody)) !== null) {
    const filename = match[1];
    // Skip XBRL viewer links, R files, and non-document files
    if (filename.startsWith("R") && /^R\d+\.htm/.test(filename)) continue;
    if (filename.includes("xbrl") || filename.includes("viewer")) continue;
    if (filename.includes("Financial_Report")) continue;

    const fullUrl = filename.startsWith("http") ? filename : base + filename;
    if (!seen.has(fullUrl)) {
      seen.add(fullUrl);
      links.push(fullUrl);
    }
  }

  // Sort: primary filing documents first (10-q, 10-k, 8-k, ex-*), then others
  links.sort((a, b) => {
    const aPrimary = /\d+-\d+\.htm|form\d|10[qk]|8-?k/i.test(a) ? 0 : 1;
    const bPrimary = /\d+-\d+\.htm|form\d|10[qk]|8-?k/i.test(b) ? 0 : 1;
    return aPrimary - bPrimary;
  });

  return links;
}

/**
 * Verify a citation using SEC EFTS full-text search.
 * Searches for the exact searchTerm or value within a company's filings.
 * This bypasses SEC bot-blocking since EFTS is designed for programmatic access.
 */
async function verifyViaEfts(
  searchTerm: string,
  cik?: string,
  filingType?: string
): Promise<{ found: boolean; filingId?: string; details?: string }> {
  // URL-encode the search term with quotes for exact match
  const encodedTerm = encodeURIComponent(`"${searchTerm}"`);
  let eftsUrl = `https://efts.sec.gov/LATEST/search-index?q=${encodedTerm}&dateRange=custom&startdt=2024-01-01&enddt=2027-01-01`;

  if (filingType) {
    eftsUrl += `&forms=${filingType}`;
  }

  const { status, body, error } = await fetchWithRetry(eftsUrl, 1);

  if (error || status !== 200) {
    return { found: false, details: `EFTS error: ${error || `HTTP ${status}`}` };
  }

  try {
    const data = JSON.parse(body);
    const totalHits = data.hits?.total?.value || 0;

    if (totalHits === 0) {
      return { found: false };
    }

    // Check if any hit matches the expected CIK
    const hits = data.hits?.hits || [];
    for (const hit of hits) {
      const hitCiks = hit._source?.ciks || [];
      const hitId = hit._id || "";
      const hitForm = hit._source?.form || "";

      // If we have a CIK, verify it matches
      if (cik) {
        const normalizedCik = cik.replace(/^0+/, "");
        const cikMatch = hitCiks.some((c: string) => c.replace(/^0+/, "") === normalizedCik);
        if (cikMatch) {
          return {
            found: true,
            filingId: hitId,
            details: `EFTS: "${searchTerm}" found in ${hitForm} (${hitId})`,
          };
        }
      } else {
        // No CIK filter — accept any hit
        return {
          found: true,
          filingId: hitId,
          details: `EFTS: "${searchTerm}" found in ${hitForm} (${hitId})`,
        };
      }
    }

    // Hits exist but none match our CIK
    return { found: false, details: `EFTS: ${totalHits} hits but none for CIK ${cik}` };
  } catch (parseErr: any) {
    return { found: false, details: `EFTS parse error: ${parseErr.message}` };
  }
}

/**
 * Verify a document citation by fetching the URL and searching for the value.
 * If the URL is an SEC index page, follows links to actual filing documents.
 * Falls back to EFTS full-text search if direct access fails.
 */
async function verifyDocument(citation: ExtractedCitation): Promise<VerificationResult> {
  const { field, value, source } = citation;
  const url = source.url;

  if (!url) {
    return {
      company: "", field, value, sourceType: source.type,
      url: "N/A", status: "skip", error: "No URL in source",
    };
  }

  const result: VerificationResult = {
    company: "", field, value, sourceType: source.type,
    url, searchTerm: source.searchTerm, quote: source.quote,
    status: "pass",
  };

  const { status, body, error } = await fetchWithRetry(url);

  if (error) {
    result.status = "fail";
    result.httpStatus = 0;
    result.error = error;
    return result;
  }

  result.httpStatus = status;

  if (status === 403) {
    // Don't return early — fall through to EFTS fallback below
    result.status = "warn";
    result.details = "SEC 403 — access blocked for automated requests.";
  }

  if (status !== 200 && status !== 403) {
    result.status = "fail";
    result.error = `HTTP ${status}`;
    return result;
  }

  const searchTerms = buildSearchTerms(value, source);
  let anyFound = false;
  let matchDetails: string[] = [];

  // First try: search the fetched page directly (skip if 403)
  if (status === 200) {
    const directSearch = searchInBody(body, searchTerms);
    anyFound = directSearch.anyFound;
    matchDetails = directSearch.matchDetails;
  }

  // If not found and this is an SEC index page, crawl into the actual documents
  if (!anyFound && status === 200 && isSecIndexUrl(url)) {
    const docLinks = extractDocLinksFromIndex(body, url);
    const maxDocsToCheck = 4; // Check primary docs + a couple exhibits

    for (let i = 0; i < Math.min(docLinks.length, maxDocsToCheck); i++) {
      const docUrl = docLinks[i];

      // Rate limit for SEC
      await new Promise((r) => setTimeout(r, 200));

      const docResult = await fetchWithRetry(docUrl, 1);

      if (docResult.status === 403 || docResult.status !== 200 || !docResult.body) continue;

      const docSearch = searchInBody(docResult.body, searchTerms);

      if (docSearch.anyFound) {
        anyFound = true;
        const filename = docUrl.split("/").pop() || docUrl;
        matchDetails = docSearch.matchDetails.map(
          (m) => m.startsWith("✓") ? `${m} (in ${filename})` : m
        );
        result.url = docUrl; // Update to the actual document URL
        break;
      }
    }

    if (!anyFound && docLinks.length > 0) {
      const checkedCount = Math.min(docLinks.length, maxDocsToCheck);
      matchDetails.push(`(crawled ${checkedCount}/${docLinks.length} filing docs)`);
    }
  }

  // EFTS fallback: if not found via direct fetch/crawl, try SEC full-text search
  if (!anyFound) {
    const cik = source.cik || url.match(/edgar\/data\/(\d+)\//)?.[1];
    const filingType = source.filingType;

    // Build candidate search terms for EFTS (short, specific, numeric preferred)
    const eftsTerms: string[] = [];

    // Prefer numeric searchTerms (most unique in filings)
    if (source.searchTerm && /[\d]/.test(source.searchTerm)) {
      // Extract just the numeric portion if it's embedded in text
      const numMatch = source.searchTerm.match(/[\d,]+(?:\.\d+)?/);
      if (numMatch && numMatch[0].length >= 4) {
        eftsTerms.push(numMatch[0]);
      }
      // Also try the full searchTerm if short enough
      if (source.searchTerm.length <= 40) {
        eftsTerms.push(source.searchTerm);
      }
    }

    // Try formatted value
    if (typeof value === "number" && value > 0) {
      eftsTerms.push(value.toLocaleString("en-US"));
    }

    for (const term of eftsTerms) {
      if (anyFound) break;
      await new Promise((r) => setTimeout(r, 150)); // Rate limit
      const eftsResult = await verifyViaEfts(term, cik, filingType);
      if (eftsResult.found) {
        anyFound = true;
        matchDetails = [`✓ ${eftsResult.details}`];
      }
    }
  }

  result.contentMatch = anyFound;
  result.searchTermFound = anyFound;

  if (!anyFound && searchTerms.length > 0) {
    result.status = "warn";
    result.details = `Value not found. Searched: ${matchDetails.join(", ")}`;
  } else if (anyFound) {
    result.status = "pass";
    result.details = matchDetails.filter((m) => m.startsWith("✓")).join(", ");
  }

  return result;
}

// ============================================================================
// MAIN RUNNER
// ============================================================================

async function verifyCompany(ticker: string): Promise<CompanyReport> {
  const provenancePath = path.join(
    __dirname,
    "..",
    "src",
    "lib",
    "data",
    "provenance",
    `${ticker.toLowerCase()}.ts`
  );

  if (!fs.existsSync(provenancePath)) {
    return {
      company: ticker.toUpperCase(),
      results: [{
        company: ticker.toUpperCase(), field: "provenance_file", value: "N/A",
        sourceType: "xbrl", url: provenancePath, status: "skip",
        error: "No provenance file found",
      }],
      passCount: 0, failCount: 0, warnCount: 1, skipCount: 0,
    };
  }

  console.log(`\n📋 Verifying ${ticker.toUpperCase()}...`);
  const citations = parseProvenanceFile(provenancePath);
  console.log(`   Found ${citations.length} citations`);

  const results: VerificationResult[] = [];

  // Rate limit: SEC asks for max 10 req/sec
  let lastRequestTime = 0;
  const rateLimitMs = 150; // ~6 req/sec to be safe

  // Deduplicate XBRL API calls (same CIK = same URL)
  const xbrlCache: Record<string, any> = {};

  for (const citation of citations) {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < rateLimitMs) {
      await new Promise((r) => setTimeout(r, rateLimitMs - elapsed));
    }
    lastRequestTime = Date.now();

    let result: VerificationResult;

    if (citation.source.type === "xbrl") {
      result = await verifyXbrl(citation);
    } else if (citation.source.type === "derived") {
      result = {
        company: ticker.toUpperCase(), field: citation.field, value: citation.value,
        sourceType: "derived", url: "derived", status: "skip",
        details: "Derived from other provenance values",
      };
    } else {
      result = await verifyDocument(citation);
    }

    result.company = ticker.toUpperCase();
    results.push(result);

    // Status indicator
    const icon = result.status === "pass" ? "✅" : result.status === "fail" ? "❌" : result.status === "warn" ? "⚠️" : "⏭️";
    console.log(`   ${icon} ${result.field}: ${result.details || result.error || "OK"}`);
  }

  return {
    company: ticker.toUpperCase(),
    results,
    passCount: results.filter((r) => r.status === "pass").length,
    failCount: results.filter((r) => r.status === "fail").length,
    warnCount: results.filter((r) => r.status === "warn").length,
    skipCount: results.filter((r) => r.status === "skip").length,
  };
}

function generateReport(reports: CompanyReport[]): string {
  const lines: string[] = [];
  const now = new Date().toISOString().split("T")[0];

  lines.push(`# Citation Verification Report`);
  lines.push(`Generated: ${now}\n`);

  // Summary table
  lines.push(`## Summary\n`);
  lines.push(`| Company | ✅ Pass | ❌ Fail | ⚠️ Warn | ⏭️ Skip | Status |`);
  lines.push(`|---------|--------|--------|---------|---------|--------|`);

  let totalPass = 0, totalFail = 0, totalWarn = 0, totalSkip = 0;

  for (const report of reports) {
    totalPass += report.passCount;
    totalFail += report.failCount;
    totalWarn += report.warnCount;
    totalSkip += report.skipCount;

    const status = report.failCount > 0 ? "❌" : report.warnCount > 0 ? "⚠️" : "✅";
    lines.push(
      `| ${report.company} | ${report.passCount} | ${report.failCount} | ${report.warnCount} | ${report.skipCount} | ${status} |`
    );
  }

  lines.push(
    `| **TOTAL** | **${totalPass}** | **${totalFail}** | **${totalWarn}** | **${totalSkip}** | ${totalFail > 0 ? "❌" : "⚠️"} |`
  );
  lines.push("");

  // Detail sections
  for (const report of reports) {
    lines.push(`## ${report.company}\n`);

    // Group by status
    const fails = report.results.filter((r) => r.status === "fail");
    const warns = report.results.filter((r) => r.status === "warn");
    const passes = report.results.filter((r) => r.status === "pass");
    const skips = report.results.filter((r) => r.status === "skip");

    if (fails.length > 0) {
      lines.push(`### ❌ Failed\n`);
      for (const r of fails) {
        lines.push(`- **${r.field}** (${r.value})`);
        lines.push(`  - URL: ${r.url}`);
        lines.push(`  - Error: ${r.error || "Unknown"}`);
        lines.push(`  - HTTP: ${r.httpStatus || "N/A"}`);
        lines.push("");
      }
    }

    if (warns.length > 0) {
      lines.push(`### ⚠️ Warnings\n`);
      for (const r of warns) {
        lines.push(`- **${r.field}** (${r.value})`);
        lines.push(`  - URL: \`${r.url}\``);
        if (r.searchTerm) lines.push(`  - Search term: "${r.searchTerm}"`);
        lines.push(`  - Details: ${r.details || r.error || "Needs manual check"}`);
        lines.push("");
      }
    }

    if (passes.length > 0) {
      lines.push(`### ✅ Passed\n`);
      for (const r of passes) {
        lines.push(`- **${r.field}** (${r.value}) — ${r.details || "verified"}`);
      }
      lines.push("");
    }

    if (skips.length > 0) {
      lines.push(`### ⏭️ Skipped\n`);
      for (const r of skips) {
        lines.push(`- **${r.field}** — ${r.details || r.error || "skipped"}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const writeReport = args.includes("--report");
  const xbrlOnly = args.includes("--xbrl-only");
  const tickers = args.filter((a) => !a.startsWith("--"));

  // Discover provenance files
  const provenanceDir = path.join(__dirname, "..", "src", "lib", "data", "provenance");
  let files: string[];

  if (tickers.length > 0) {
    files = tickers.map((t) => `${t.toLowerCase()}.ts`);
  } else {
    files = fs.readdirSync(provenanceDir).filter((f) => f.endsWith(".ts") && !f.startsWith("index"));
  }

  console.log(`\n🔍 Citation Verification — ${files.length} companies\n${"=".repeat(50)}`);

  const reports: CompanyReport[] = [];

  for (const file of files) {
    const ticker = file.replace(".ts", "");
    const report = await verifyCompany(ticker);
    reports.push(report);
  }

  // Console summary
  console.log(`\n${"=".repeat(50)}`);
  console.log(`📊 SUMMARY`);
  console.log(`${"=".repeat(50)}`);

  for (const report of reports) {
    const icon = report.failCount > 0 ? "❌" : report.warnCount > 0 ? "⚠️" : "✅";
    console.log(
      `${icon} ${report.company.padEnd(8)} — ✅${report.passCount} ❌${report.failCount} ⚠️${report.warnCount} ⏭️${report.skipCount}`
    );
  }

  // Write report
  if (writeReport) {
    const reportPath = path.join(__dirname, "..", "citation-report.md");
    const reportContent = generateReport(reports);
    fs.writeFileSync(reportPath, reportContent, "utf-8");
    console.log(`\n📝 Report written to: ${reportPath}`);
  } else {
    // Always write report to stdout-friendly format
    const reportContent = generateReport(reports);
    const reportPath = path.join(__dirname, "..", "citation-report.md");
    fs.writeFileSync(reportPath, reportContent, "utf-8");
    console.log(`\n📝 Report written to: ${reportPath}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
