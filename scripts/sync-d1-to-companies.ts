#!/usr/bin/env npx tsx

/**
 * sync-d1-to-companies.ts — Sync D1 latest metrics → companies.ts
 *
 * Reads the latest accepted/verified datapoints from D1 and compares them
 * to the current values in companies.ts. Prints a diff and optionally applies
 * updates to keep companies.ts in sync with what the pipeline has extracted.
 *
 * Usage:
 *   # Preview changes (default — dry run)
 *   npx tsx scripts/sync-d1-to-companies.ts
 *
 *   # Apply changes
 *   DRY_RUN=false npx tsx scripts/sync-d1-to-companies.ts
 *
 *   # Specific ticker(s)
 *   TICKERS=MSTR,MARA npx tsx scripts/sync-d1-to-companies.ts
 *
 *   # Show all companies (including unchanged)
 *   VERBOSE=true npx tsx scripts/sync-d1-to-companies.ts
 *
 * Requires: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_API_TOKEN
 */

import * as fs from 'fs';
import * as path from 'path';
import { D1Client } from '../src/lib/d1';

// D1 metric → companies.ts field mapping
const METRIC_TO_FIELD: Record<string, { field: string; dateField?: string; sourceField?: string }> = {
  holdings_native:      { field: 'holdings',        dateField: 'holdingsLastUpdated', sourceField: 'holdingsSourceUrl' },
  basic_shares:         { field: 'sharesForMnav',   dateField: 'sharesAsOf',          sourceField: 'sharesSourceUrl' },
  debt_usd:             { field: 'totalDebt',       dateField: 'debtAsOf',            sourceField: 'debtSourceUrl' },
  cash_usd:             { field: 'cashReserves',    dateField: 'cashAsOf',            sourceField: 'cashSourceUrl' },
  preferred_equity_usd: { field: 'preferredEquity', dateField: 'preferredAsOf',       sourceField: 'preferredSourceUrl' },
};

const METRICS = Object.keys(METRIC_TO_FIELD);

// Thresholds: only flag a change if it exceeds this relative difference
const CHANGE_THRESHOLD_PCT = 0.1; // 0.1% — ignore rounding noise

type LatestRow = {
  entity_id: string;
  metric: string;
  value: number;
  unit: string;
  as_of: string | null;
  reported_at: string | null;
  artifact_source_url: string | null;
  confidence: number | null;
  method: string | null;
  status: string;
};

type FieldChange = {
  metric: string;
  field: string;
  currentValue: number | undefined;
  d1Value: number;
  asOf: string | null;
  sourceUrl: string | null;
  confidence: number | null;
  method: string | null;
  pctChange: number | null;
};

type CompanyDiff = {
  ticker: string;
  changes: FieldChange[];
};

/**
 * Parse the current value of a field from companies.ts for a given ticker.
 * Uses regex to find the company block and extract the field value.
 */
function parseFieldFromCompanies(content: string, ticker: string, fieldName: string): number | undefined {
  // Find the company block by ticker
  const tickerPattern = new RegExp(
    `ticker:\\s*["']${ticker}["'][\\s\\S]*?(?=\\{[\\s\\S]*?ticker:|$)`,
    'i'
  );
  const match = content.match(tickerPattern);
  if (!match) return undefined;

  const block = match[0];

  // Extract the field value — handle numbers with underscores, commas, and expressions
  const fieldPattern = new RegExp(
    `${fieldName}:\\s*([\\d_,.]+(?:\\s*[*/+-]\\s*[\\d_,.]+)*)`,
  );
  const fieldMatch = block.match(fieldPattern);
  if (!fieldMatch) return undefined;

  // Clean and evaluate: remove underscores/commas, handle simple math
  const raw = fieldMatch[1].replace(/[_,]/g, '');
  try {
    // Only evaluate if it looks like a safe numeric expression
    if (/^[\d.+\-*/\s()]+$/.test(raw)) {
      return Number(raw) || undefined;
    }
    return parseFloat(raw) || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Apply a field update to companies.ts content via regex replacement.
 */
function applyFieldUpdate(
  content: string,
  ticker: string,
  fieldName: string,
  newValue: number,
): string {
  // Find the company block
  const tickerIdx = content.indexOf(`ticker: "${ticker}"`);
  const tickerIdx2 = content.indexOf(`ticker: '${ticker}'`);
  const startIdx = Math.max(tickerIdx, tickerIdx2);
  if (startIdx === -1) return content;

  // Find the field within a reasonable range after the ticker
  const searchEnd = Math.min(startIdx + 5000, content.length);
  const searchBlock = content.slice(startIdx, searchEnd);

  const fieldPattern = new RegExp(
    `(${fieldName}:\\s*)([\\d_,.]+(?:\\s*[*/+-]\\s*[\\d_,.]+)*)`,
  );
  const fieldMatch = searchBlock.match(fieldPattern);
  if (!fieldMatch || fieldMatch.index === undefined) return content;

  const fullMatchStart = startIdx + fieldMatch.index;
  const fullMatchEnd = fullMatchStart + fieldMatch[0].length;

  // Format the new value: use underscores for readability (e.g. 1_000_000)
  const formatted = formatNumber(newValue);

  return (
    content.slice(0, fullMatchStart) +
    fieldMatch[1] + formatted +
    content.slice(fullMatchEnd)
  );
}

/**
 * Format a number with underscores for readability in TypeScript.
 */
function formatNumber(n: number): string {
  if (!Number.isInteger(n)) {
    return String(n);
  }
  const s = String(n);
  if (s.length <= 3) return s;

  // Add underscores every 3 digits from the right
  const parts: string[] = [];
  for (let i = s.length; i > 0; i -= 3) {
    parts.unshift(s.slice(Math.max(0, i - 3), i));
  }
  return parts.join('_');
}

async function main() {
  const dryRun = (process.env.DRY_RUN || 'true').toLowerCase() !== 'false';
  const verbose = (process.env.VERBOSE || 'false').toLowerCase() === 'true';
  const tickersFilter = process.env.TICKERS
    ? new Set(process.env.TICKERS.split(',').map(t => t.trim().toUpperCase()).filter(Boolean))
    : null;

  // Check D1 credentials
  if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_D1_DATABASE_ID || !process.env.CLOUDFLARE_API_TOKEN) {
    console.error('Missing D1 credentials. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_API_TOKEN');
    console.error('You can find these in Vercel environment variables or Cloudflare dashboard.');
    process.exit(1);
  }

  const d1 = D1Client.fromEnv();

  // Read companies.ts
  const companiesPath = path.join(process.cwd(), 'src/lib/data/companies.ts');
  let companiesContent = fs.readFileSync(companiesPath, 'utf-8');

  // Get all tickers from companies.ts
  const tickerMatches = companiesContent.matchAll(/ticker:\s*["']([A-Z0-9.]+)["']/g);
  const allTickers = [...tickerMatches].map(m => m[1]);
  const tickers = tickersFilter
    ? allTickers.filter(t => tickersFilter.has(t))
    : allTickers;

  console.log(`Syncing D1 → companies.ts for ${tickers.length} tickers${dryRun ? ' (DRY RUN)' : ''}...\n`);

  // Query D1 for latest metrics across all tickers
  const metricsPlaceholders = METRICS.map(() => '?').join(',');
  const diffs: CompanyDiff[] = [];
  let queriedTickers = 0;

  // Process in batches to avoid overwhelming D1
  const BATCH_SIZE = 10;
  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    const batch = tickers.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (ticker) => {
        const sql = `
          SELECT
            d.entity_id, d.metric, d.value, d.unit,
            d.as_of, d.reported_at, d.confidence, d.method, d.status,
            a.source_url AS artifact_source_url
          FROM latest_datapoints d
          LEFT JOIN artifacts a ON a.artifact_id = d.artifact_id
          WHERE d.entity_id = ?
            AND d.metric IN (${metricsPlaceholders})
          ORDER BY d.metric;
        `;
        const params = [ticker, ...METRICS];
        try {
          const out = await d1.query<LatestRow>(sql, params);
          return { ticker, rows: out.results };
        } catch (err) {
          console.error(`  [ERROR] ${ticker}: ${err instanceof Error ? err.message : String(err)}`);
          return { ticker, rows: [] };
        }
      })
    );

    for (const { ticker, rows } of batchResults) {
      queriedTickers++;
      const changes: FieldChange[] = [];

      for (const row of rows) {
        const mapping = METRIC_TO_FIELD[row.metric];
        if (!mapping) continue;

        const currentValue = parseFieldFromCompanies(companiesContent, ticker, mapping.field);
        const d1Value = row.value;

        // Calculate % change
        let pctChange: number | null = null;
        if (currentValue != null && currentValue > 0) {
          pctChange = ((d1Value - currentValue) / currentValue) * 100;
        }

        // Skip if change is below threshold
        if (pctChange !== null && Math.abs(pctChange) < CHANGE_THRESHOLD_PCT) {
          continue;
        }

        // Skip if values are the same
        if (currentValue === d1Value) continue;

        changes.push({
          metric: row.metric,
          field: mapping.field,
          currentValue,
          d1Value,
          asOf: row.as_of,
          sourceUrl: row.artifact_source_url,
          confidence: row.confidence,
          method: row.method,
          pctChange,
        });
      }

      if (changes.length > 0) {
        diffs.push({ ticker, changes });
      } else if (verbose) {
        console.log(`  ${ticker}: no changes`);
      }
    }

    // Small delay between batches
    if (i + BATCH_SIZE < tickers.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // Print summary
  console.log(`\nQueried ${queriedTickers} tickers. ${diffs.length} have changes:\n`);

  if (diffs.length === 0) {
    console.log('Everything is in sync.');
    return;
  }

  for (const diff of diffs) {
    console.log(`  ${diff.ticker}:`);
    for (const change of diff.changes) {
      const currentStr = change.currentValue != null ? change.currentValue.toLocaleString() : '(not set)';
      const d1Str = change.d1Value.toLocaleString();
      const pctStr = change.pctChange != null ? ` (${change.pctChange > 0 ? '+' : ''}${change.pctChange.toFixed(1)}%)` : '';
      const confStr = change.confidence != null ? ` conf=${change.confidence.toFixed(2)}` : '';
      const methodStr = change.method ? ` [${change.method}]` : '';
      const dateStr = change.asOf ? ` as_of=${change.asOf}` : '';

      console.log(`    ${change.field}: ${currentStr} → ${d1Str}${pctStr}${confStr}${methodStr}${dateStr}`);
    }
  }

  if (dryRun) {
    console.log(`\nDRY RUN — no files modified. Run with DRY_RUN=false to apply.`);
    return;
  }

  // Apply changes
  console.log(`\nApplying ${diffs.reduce((n, d) => n + d.changes.length, 0)} field updates...`);

  let applied = 0;
  let skipped = 0;

  for (const diff of diffs) {
    for (const change of diff.changes) {
      const before = companiesContent;
      companiesContent = applyFieldUpdate(companiesContent, diff.ticker, change.field, change.d1Value);

      if (companiesContent !== before) {
        applied++;
      } else {
        console.log(`    [SKIP] ${diff.ticker}.${change.field}: regex didn't match (may use provenance/expression)`);
        skipped++;
      }
    }
  }

  if (applied > 0) {
    fs.writeFileSync(companiesPath, companiesContent);
    console.log(`\nWrote ${applied} updates to companies.ts (${skipped} skipped).`);
    console.log('Review with: git diff src/lib/data/companies.ts');
  } else {
    console.log('\nNo updates could be applied (all fields may use provenance expressions).');
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
