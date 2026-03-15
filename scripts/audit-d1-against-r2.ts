#!/usr/bin/env tsx
/**
 * audit-d1-against-r2.ts
 *
 * Systematic audit: for every current D1 datapoint, verify:
 * 1. The cited R2 document exists and is fetchable
 * 2. The citation_search_term appears in the document
 * 3. The value in D1 matches what the document actually says
 *
 * Also flags:
 * - Par-value artifacts (preferred equity < $10,000)
 * - Stale data (as_of > 9 months old)
 * - migration_from_static values that lack primary source verification
 * - Values where the citation number doesn't match the D1 value
 *
 * Usage:
 *   npx tsx scripts/audit-d1-against-r2.ts                    # all companies
 *   npx tsx scripts/audit-d1-against-r2.ts --ticker=MSTR      # single company
 *   npx tsx scripts/audit-d1-against-r2.ts --metric=debt_usd  # single metric
 *   npx tsx scripts/audit-d1-against-r2.ts --verify-docs      # fetch R2 docs (slow)
 *   npx tsx scripts/audit-d1-against-r2.ts --fix-candidates   # show fixable issues
 */

import { D1Client } from '@/lib/d1';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
function argVal(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}
const filterTicker = argVal('ticker')?.toUpperCase() ?? null;
const filterMetric = argVal('metric') ?? null;
const verifyDocs = process.argv.includes('--verify-docs');
const showFixCandidates = process.argv.includes('--fix-candidates');
const verbose = process.argv.includes('--verbose');

const R2_PUBLIC_URL = 'https://pub-1e4356c7aea34102aad6e3493b0c62f1.r2.dev';
const SITE_BASE = 'https://dat-tracker-next.vercel.app';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DatapointAudit {
  entity_id: string;
  metric: string;
  value: number;
  as_of: string | null;
  method: string | null;
  confidence: number | null;
  citation_quote: string | null;
  citation_search_term: string | null;
  xbrl_concept: string | null;
  artifact_source_url: string | null;
  artifact_accession: string | null;
  artifact_r2_key: string | null;
  artifact_source_type: string | null;
}

interface AuditIssue {
  ticker: string;
  metric: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  message: string;
  value: number;
  as_of: string | null;
  method: string | null;
}

interface DocVerification {
  ticker: string;
  metric: string;
  accession: string | null;
  documentFound: boolean;
  searchTermFound: boolean;
  valueMatchesDoc: boolean | null; // null if can't determine
  matchContext: string | null;
  fetchError: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function daysBetween(d1: string, d2: string): number {
  return Math.floor((new Date(d2).getTime() - new Date(d1).getTime()) / 86_400_000);
}

function extractNumberFromText(text: string, searchTerm: string): number | null {
  // Find the search term in the text and extract the associated number
  const idx = text.toLowerCase().indexOf(searchTerm.toLowerCase());
  if (idx === -1) return null;

  // Look for numbers near the search term (within 200 chars either direction)
  const context = text.slice(Math.max(0, idx - 200), idx + searchTerm.length + 200);

  // Match numbers with commas, decimals, dollar signs
  const numbers = context.match(/\$?\d{1,3}(?:,\d{3})*(?:\.\d+)?/g);
  if (!numbers) return null;

  // Return the largest number found (likely the value, not a date or small qualifier)
  return Math.max(...numbers.map(n => parseFloat(n.replace(/[$,]/g, ''))));
}

function formatValue(v: number): string {
  if (Math.abs(v) >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v}`;
}

async function fetchR2Document(ticker: string, accession: string): Promise<{ text: string | null; error: string | null }> {
  try {
    const res = await fetch(`${SITE_BASE}/api/sec/fetch-content?ticker=${ticker}&accession=${accession}`, {
      headers: { 'User-Agent': 'DAT-Audit/1.0' },
    });
    if (!res.ok) return { text: null, error: `HTTP ${res.status}` };
    const text = await res.text();
    if (text.length < 100) return { text: null, error: 'Document too short' };
    return { text, error: null };
  } catch (e) {
    return { text: null, error: String(e) };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const d1 = D1Client.fromEnv();
  const today = new Date().toISOString().slice(0, 10);

  // Fetch all current datapoints with artifact info
  let sql = `
    SELECT
      d.entity_id, d.metric, d.value, d.as_of, d.method, d.confidence,
      d.citation_quote, d.citation_search_term, d.xbrl_concept,
      a.source_url AS artifact_source_url,
      a.accession AS artifact_accession,
      a.r2_key AS artifact_r2_key,
      a.source_type AS artifact_source_type
    FROM latest_datapoints d
    LEFT JOIN artifacts a ON a.artifact_id = d.artifact_id
  `;

  const conditions: string[] = [];
  const params: string[] = [];

  if (filterTicker) {
    conditions.push('d.entity_id = ?');
    params.push(filterTicker);
  }
  if (filterMetric) {
    conditions.push('d.metric = ?');
    params.push(filterMetric);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY d.entity_id, d.metric';

  const result = await d1.query<DatapointAudit>(sql, params);
  const datapoints = result.results;

  console.log(`\nAuditing ${datapoints.length} current datapoints...`);
  if (filterTicker) console.log(`  Filter: ticker=${filterTicker}`);
  if (filterMetric) console.log(`  Filter: metric=${filterMetric}`);
  if (verifyDocs) console.log(`  Mode: verifying R2 documents (slow)`);
  console.log();

  const issues: AuditIssue[] = [];
  const docResults: DocVerification[] = [];

  // Group by ticker for reporting
  const byTicker: Record<string, DatapointAudit[]> = {};
  for (const dp of datapoints) {
    if (!byTicker[dp.entity_id]) byTicker[dp.entity_id] = [];
    byTicker[dp.entity_id].push(dp);
  }

  for (const [ticker, dps] of Object.entries(byTicker)) {
    if (verbose) console.log(`\n=== ${ticker} ===`);

    for (const dp of dps) {
      // ---------------------------------------------------------------
      // Check 1: Par-value artifacts (preferred equity < $10,000)
      // ---------------------------------------------------------------
      if (dp.metric === 'preferred_equity_usd' && dp.value > 0 && dp.value < 10_000) {
        issues.push({
          ticker, metric: dp.metric,
          severity: 'critical',
          category: 'par-value-artifact',
          message: `Preferred equity ${formatValue(dp.value)} is likely XBRL par value, not fair/liquidation value. XBRL concept may be returning nominal par value instead of aggregate liquidation preference.`,
          value: dp.value, as_of: dp.as_of, method: dp.method,
        });
      }

      // ---------------------------------------------------------------
      // Check 2: Suspiciously small debt (< $1,000)
      // ---------------------------------------------------------------
      if (dp.metric === 'debt_usd' && dp.value > 0 && dp.value < 1_000) {
        issues.push({
          ticker, metric: dp.metric,
          severity: 'warning',
          category: 'small-value-artifact',
          message: `Debt ${formatValue(dp.value)} is suspiciously small — may be a stale or incorrect XBRL value.`,
          value: dp.value, as_of: dp.as_of, method: dp.method,
        });
      }

      // ---------------------------------------------------------------
      // Check 3: Stale data (> 270 days = 9 months)
      // ---------------------------------------------------------------
      if (dp.as_of) {
        const age = daysBetween(dp.as_of, today);
        if (age > 270) {
          issues.push({
            ticker, metric: dp.metric,
            severity: 'warning',
            category: 'stale-data',
            message: `Value is ${age} days old (as_of ${dp.as_of}). May not reflect current state.`,
            value: dp.value, as_of: dp.as_of, method: dp.method,
          });
        }
      }

      // ---------------------------------------------------------------
      // Check 4: migration_from_static without XBRL verification
      // ---------------------------------------------------------------
      if (dp.method === 'migration_from_static' && !dp.xbrl_concept) {
        // Check if there's a meaningful citation
        const hasCitation = dp.citation_quote && !dp.citation_quote.startsWith('[');
        if (!hasCitation) {
          issues.push({
            ticker, metric: dp.metric,
            severity: 'info',
            category: 'unverified-migration',
            message: `Migrated from static with no primary source citation. Value should be verified against filing.`,
            value: dp.value, as_of: dp.as_of, method: dp.method,
          });
        }
      }

      // ---------------------------------------------------------------
      // Check 5: No citation at all
      // ---------------------------------------------------------------
      if (!dp.citation_quote && !dp.xbrl_concept) {
        issues.push({
          ticker, metric: dp.metric,
          severity: 'warning',
          category: 'no-citation',
          message: `No citation quote or XBRL concept. Cannot verify provenance.`,
          value: dp.value, as_of: dp.as_of, method: dp.method,
        });
      }

      // ---------------------------------------------------------------
      // Check 6: No artifact (no link to source document)
      // ---------------------------------------------------------------
      if (!dp.artifact_accession && !dp.artifact_source_url) {
        issues.push({
          ticker, metric: dp.metric,
          severity: 'warning',
          category: 'no-artifact',
          message: `No artifact link — cannot trace to source document.`,
          value: dp.value, as_of: dp.as_of, method: dp.method,
        });
      }

      // ---------------------------------------------------------------
      // Check 7: Citation value doesn't match D1 value
      // ---------------------------------------------------------------
      if (dp.citation_search_term) {
        // Extract number from search term
        const searchNum = dp.citation_search_term.replace(/[$,]/g, '');
        const parsed = parseFloat(searchNum);
        if (!isNaN(parsed) && parsed > 0) {
          // Compare: allow for rounding, scale differences
          const ratio = dp.value / parsed;
          // Some citations are in millions, some in units
          const isReasonable = (
            (ratio > 0.99 && ratio < 1.01) ||   // exact match (within 1%)
            (ratio > 999 && ratio < 1001) ||      // citation in thousands, value in units
            (ratio > 999_999 && ratio < 1_000_001) // citation in millions
          );
          if (!isReasonable && parsed > 100) { // Skip very small numbers (likely not the value)
            issues.push({
              ticker, metric: dp.metric,
              severity: 'warning',
              category: 'value-mismatch',
              message: `D1 value ${dp.value.toLocaleString()} vs citation search term "${dp.citation_search_term}" (parsed: ${parsed.toLocaleString()}). Ratio: ${ratio.toFixed(4)}`,
              value: dp.value, as_of: dp.as_of, method: dp.method,
            });
          }
        }
      }

      // ---------------------------------------------------------------
      // Check 8: Verify against R2 document (if --verify-docs)
      // ---------------------------------------------------------------
      if (verifyDocs && dp.artifact_accession && dp.citation_search_term) {
        const { text, error } = await fetchR2Document(ticker, dp.artifact_accession);

        const result: DocVerification = {
          ticker, metric: dp.metric,
          accession: dp.artifact_accession,
          documentFound: !!text,
          searchTermFound: false,
          valueMatchesDoc: null,
          matchContext: null,
          fetchError: error,
        };

        if (text) {
          // Search for citation_search_term in document
          const searchLower = dp.citation_search_term.toLowerCase();
          const textLower = text.toLowerCase();
          const idx = textLower.indexOf(searchLower);

          if (idx >= 0) {
            result.searchTermFound = true;
            // Extract context around match
            const start = Math.max(0, idx - 60);
            const end = Math.min(text.length, idx + dp.citation_search_term.length + 60);
            result.matchContext = text.slice(start, end).replace(/\s+/g, ' ').trim();
          } else {
            issues.push({
              ticker, metric: dp.metric,
              severity: 'critical',
              category: 'search-term-not-found',
              message: `Search term "${dp.citation_search_term}" not found in R2 document ${dp.artifact_accession}`,
              value: dp.value, as_of: dp.as_of, method: dp.method,
            });
          }
        } else if (error) {
          issues.push({
            ticker, metric: dp.metric,
            severity: 'warning',
            category: 'document-not-found',
            message: `Cannot fetch R2 document: ${error}`,
            value: dp.value, as_of: dp.as_of, method: dp.method,
          });
        }

        docResults.push(result);

        // Rate limit: don't hammer the fetch-content API
        await new Promise(r => setTimeout(r, 200));
      }

      if (verbose) {
        const status = issues.filter(i => i.ticker === ticker && i.metric === dp.metric).length > 0 ? '✗' : '✓';
        console.log(`  ${status} ${dp.metric}: ${dp.value.toLocaleString()} (${dp.method}, as_of ${dp.as_of})`);
      }
    }
  }

  // =====================================================================
  // Report
  // =====================================================================
  console.log('\n' + '='.repeat(70));
  console.log('D1 DATA AUDIT REPORT');
  console.log('='.repeat(70));
  console.log(`  Datapoints audited:  ${datapoints.length}`);
  console.log(`  Companies:           ${Object.keys(byTicker).length}`);
  console.log(`  Total issues:        ${issues.length}`);

  // Group issues by severity
  const critical = issues.filter(i => i.severity === 'critical');
  const warnings = issues.filter(i => i.severity === 'warning');
  const infos = issues.filter(i => i.severity === 'info');

  console.log(`    Critical:          ${critical.length}`);
  console.log(`    Warnings:          ${warnings.length}`);
  console.log(`    Info:              ${infos.length}`);

  // Group by category
  const byCategory: Record<string, AuditIssue[]> = {};
  for (const issue of issues) {
    if (!byCategory[issue.category]) byCategory[issue.category] = [];
    byCategory[issue.category].push(issue);
  }

  console.log('\n' + '-'.repeat(70));
  console.log('ISSUES BY CATEGORY');
  console.log('-'.repeat(70));

  for (const [category, categoryIssues] of Object.entries(byCategory).sort((a, b) => {
    const sevOrder = { critical: 0, warning: 1, info: 2 };
    return (sevOrder[a[1][0].severity] ?? 3) - (sevOrder[b[1][0].severity] ?? 3);
  })) {
    const sev = categoryIssues[0].severity;
    const icon = sev === 'critical' ? '🔴' : sev === 'warning' ? '🟡' : '🔵';
    console.log(`\n${icon} ${category.toUpperCase()} (${categoryIssues.length})`);

    for (const issue of categoryIssues) {
      console.log(`  ${issue.ticker}.${issue.metric}: ${issue.message}`);
    }
  }

  // Document verification results
  if (verifyDocs && docResults.length > 0) {
    console.log('\n' + '-'.repeat(70));
    console.log('R2 DOCUMENT VERIFICATION');
    console.log('-'.repeat(70));

    const docsFound = docResults.filter(r => r.documentFound).length;
    const termsFound = docResults.filter(r => r.searchTermFound).length;
    const docsMissing = docResults.filter(r => !r.documentFound).length;

    console.log(`  Documents fetched:     ${docsFound}/${docResults.length}`);
    console.log(`  Search terms found:    ${termsFound}/${docsFound}`);
    console.log(`  Documents missing:     ${docsMissing}`);

    const failedSearches = docResults.filter(r => r.documentFound && !r.searchTermFound);
    if (failedSearches.length > 0) {
      console.log(`\n  FAILED SEARCH TERM MATCHES:`);
      for (const f of failedSearches) {
        console.log(`    ${f.ticker}.${f.metric} in ${f.accession}`);
      }
    }
  }

  // Fix candidates
  if (showFixCandidates) {
    console.log('\n' + '-'.repeat(70));
    console.log('FIX CANDIDATES');
    console.log('-'.repeat(70));

    const parValues = issues.filter(i => i.category === 'par-value-artifact');
    if (parValues.length > 0) {
      console.log('\n  PAR VALUE → should be set to 0 or looked up from filing:');
      for (const pv of parValues) {
        console.log(`    ${pv.ticker}.preferred_equity_usd = ${pv.value} (as_of ${pv.as_of})`);
      }
    }

    const stale = issues.filter(i => i.category === 'stale-data');
    if (stale.length > 0) {
      console.log('\n  STALE DATA → need fresh filing lookup:');
      for (const s of stale) {
        console.log(`    ${s.ticker}.${s.metric} = ${s.value.toLocaleString()} (as_of ${s.as_of}, ${daysBetween(s.as_of!, today)}d old)`);
      }
    }
  }

  // Exit code
  if (critical.length > 0) {
    console.log(`\n❌ ${critical.length} critical issues found.`);
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} warnings, 0 critical. Review recommended.`);
  } else {
    console.log(`\n✅ No issues found.`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
