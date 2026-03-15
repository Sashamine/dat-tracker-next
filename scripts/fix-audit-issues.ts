#!/usr/bin/env tsx
/**
 * Fix critical issues found by the D1 data audit.
 *
 * 1. Zero out 8 par-value preferred equity artifacts
 * 2. Zero out BMNR restricted_cash_usd (migration bug — was cashReserves in wrong field)
 * 3. Fix bad search terms (STKE dates, CYPH, GAME)
 *
 * Usage:
 *   npx tsx scripts/fix-audit-issues.ts --dry-run    # preview changes
 *   npx tsx scripts/fix-audit-issues.ts               # apply changes
 */
import { D1Client } from '@/lib/d1';

const dryRun = process.argv.includes('--dry-run');

interface Fix {
  ticker: string;
  metric: string;
  action: 'update_value' | 'update_citation' | 'update_search_term';
  newValue?: number;
  newCitationQuote?: string;
  newSearchTerm?: string;
  reason: string;
}

const fixes: Fix[] = [
  // ── Par-value artifacts → set to 0 ──
  { ticker: 'BMNR', metric: 'preferred_equity_usd', action: 'update_value', newValue: 0,
    newCitationQuote: '[Zero value] No material preferred equity outstanding. Prior XBRL value ($45) was par value, not liquidation preference.',
    newSearchTerm: null as any, reason: 'par-value artifact' },
  { ticker: 'CLSK', metric: 'preferred_equity_usd', action: 'update_value', newValue: 0,
    newCitationQuote: '[Zero value] No material preferred equity outstanding. Prior XBRL value ($2,000) was par value, not liquidation preference.',
    newSearchTerm: null as any, reason: 'par-value artifact' },
  { ticker: 'HYPD', metric: 'preferred_equity_usd', action: 'update_value', newValue: 0,
    newCitationQuote: '[Zero value] No material preferred equity outstanding. Prior XBRL value ($544) was par value, not liquidation preference.',
    newSearchTerm: null as any, reason: 'par-value artifact' },
  { ticker: 'SBET', metric: 'preferred_equity_usd', action: 'update_value', newValue: 0,
    newCitationQuote: '[Zero value] No material preferred equity outstanding. Prior XBRL value ($3,936) was par value, not liquidation preference.',
    newSearchTerm: null as any, reason: 'par-value artifact' },
  { ticker: 'TBH', metric: 'preferred_equity_usd', action: 'update_value', newValue: 0,
    newCitationQuote: '[Zero value] No material preferred equity outstanding. Prior XBRL value ($420) was par value, not liquidation preference.',
    newSearchTerm: null as any, reason: 'par-value artifact' },
  { ticker: 'TRON', metric: 'preferred_equity_usd', action: 'update_value', newValue: 0,
    newCitationQuote: '[Zero value] No material preferred equity outstanding. Prior XBRL value ($10) was par value, not liquidation preference.',
    newSearchTerm: null as any, reason: 'par-value artifact' },
  { ticker: 'UPXI', metric: 'preferred_equity_usd', action: 'update_value', newValue: 0,
    newCitationQuote: '[Zero value] No material preferred equity outstanding. Prior XBRL value ($2) was par value, not liquidation preference.',
    newSearchTerm: null as any, reason: 'par-value artifact' },
  { ticker: 'ZONE', metric: 'preferred_equity_usd', action: 'update_value', newValue: 0,
    newCitationQuote: '[Zero value] No material preferred equity outstanding. Prior XBRL value ($100) was par value, not liquidation preference.',
    newSearchTerm: null as any, reason: 'par-value artifact' },

  // ── BMNR restricted_cash migration bug ──
  { ticker: 'BMNR', metric: 'restricted_cash_usd', action: 'update_value', newValue: 0,
    newCitationQuote: '[Zero value] No restricted cash. Prior value ($868M) was cashReserves incorrectly migrated to restricted_cash_usd.',
    newSearchTerm: null as any, reason: 'migration bug: cashReserves put in wrong field' },

  // ── TBH debt migration artifact ──
  { ticker: 'TBH', metric: 'debt_usd', action: 'update_value', newValue: 0,
    newCitationQuote: '[Zero value] No material debt. Prior XBRL value ($424) was de minimis.',
    newSearchTerm: null as any, reason: 'de minimis value artifact' },

  // ── Bad search terms ──
  { ticker: 'STKE', metric: 'cash_usd', action: 'update_search_term',
    newSearchTerm: '160,000', reason: 'search term was a date (2025-12-31) instead of value' },
  { ticker: 'STKE', metric: 'debt_usd', action: 'update_search_term',
    newSearchTerm: '34,900,000', reason: 'search term was a date (2025-12-31) instead of value' },
];

async function main() {
  const d1 = D1Client.fromEnv();
  console.log(`${dryRun ? 'DRY RUN — ' : ''}Applying ${fixes.length} fixes...\n`);

  let applied = 0;
  let skipped = 0;

  for (const fix of fixes) {
    console.log(`${fix.ticker}.${fix.metric}: ${fix.reason}`);

    if (fix.action === 'update_value') {
      // Find the datapoint
      const existing = await d1.query<{ datapoint_id: string; value: number }>(
        `SELECT datapoint_id, value FROM latest_datapoints WHERE entity_id = ? AND metric = ?`,
        [fix.ticker, fix.metric]
      );

      if (existing.results.length === 0) {
        console.log(`  ⚠ No datapoint found — skipping`);
        skipped++;
        continue;
      }

      const dp = existing.results[0];
      console.log(`  Current: ${dp.value.toLocaleString()} → New: ${fix.newValue!.toLocaleString()}`);

      if (!dryRun) {
        await d1.query(
          `UPDATE datapoints SET value = ?, citation_quote = ?, citation_search_term = ?, method = 'manual_correction'
           WHERE datapoint_id = ?`,
          [fix.newValue!, fix.newCitationQuote || null, fix.newSearchTerm || null, dp.datapoint_id]
        );
        console.log(`  ✓ Updated`);
      } else {
        console.log(`  (dry run — would update)`);
      }
      applied++;

    } else if (fix.action === 'update_search_term') {
      const existing = await d1.query<{ datapoint_id: string; citation_search_term: string }>(
        `SELECT datapoint_id, citation_search_term FROM latest_datapoints WHERE entity_id = ? AND metric = ?`,
        [fix.ticker, fix.metric]
      );

      if (existing.results.length === 0) {
        console.log(`  ⚠ No datapoint found — skipping`);
        skipped++;
        continue;
      }

      const dp = existing.results[0];
      console.log(`  Search term: "${dp.citation_search_term}" → "${fix.newSearchTerm}"`);

      if (!dryRun) {
        await d1.query(
          `UPDATE datapoints SET citation_search_term = ? WHERE datapoint_id = ?`,
          [fix.newSearchTerm!, dp.datapoint_id]
        );
        console.log(`  ✓ Updated`);
      } else {
        console.log(`  (dry run — would update)`);
      }
      applied++;
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Applied: ${applied}, Skipped: ${skipped}`);
  if (dryRun) console.log(`\nRun without --dry-run to apply changes.`);
}

main().catch(e => { console.error(e); process.exit(1); });
