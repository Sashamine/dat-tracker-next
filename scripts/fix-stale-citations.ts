#!/usr/bin/env tsx
/**
 * Fix stale/wrong citation quotes and search terms identified by audit.
 *
 * These datapoints have CORRECT values but their citations point to
 * wrong numbers in filings (authorized shares, pre-conversion values, etc.)
 *
 * Usage:
 *   npx tsx scripts/fix-stale-citations.ts --dry-run
 *   npx tsx scripts/fix-stale-citations.ts
 */
import { D1Client } from '@/lib/d1';

const dryRun = process.argv.includes('--dry-run');

interface CitationFix {
  ticker: string;
  metric: string;
  newCitationQuote: string;
  newSearchTerm: string | null;
  reason: string;
}

const fixes: CitationFix[] = [
  // Preferred equity = $0, but search term pointed to authorized/historical amounts
  {
    ticker: 'CYPH', metric: 'preferred_equity_usd',
    newCitationQuote: '[Zero value] No preferred equity outstanding. Prior XBRL value ($67,715) was from old Leap Therapeutics entity before reverse merger into Cypherpunk Technologies.',
    newSearchTerm: null,
    reason: 'search term "67,715" was stale pre-merger Leap data',
  },
  {
    ticker: 'DJT', metric: 'preferred_equity_usd',
    newCitationQuote: '[Zero value] No preferred stock outstanding per 10-K FY2025 ($0.0001 par, none issued). Prior search term was authorized share count.',
    newSearchTerm: null,
    reason: 'search term "308,645,005" was authorized shares, not outstanding',
  },
  {
    ticker: 'FLD', metric: 'preferred_equity_usd',
    newCitationQuote: '[Zero value] No preferred stock outstanding per 10-Q Q3 2025 balance sheet.',
    newSearchTerm: null,
    reason: 'search term "51,246,348" was wrong line item from filing',
  },
  {
    ticker: 'FWDI', metric: 'preferred_equity_usd',
    newCitationQuote: '[Zero value] Series A-1 Convertible Preferred fully converted to common stock (Sep 2025 PIPE). No preferred outstanding.',
    newSearchTerm: null,
    reason: 'search term "4,925,000" was pre-conversion historical value',
  },
  {
    ticker: 'XXI', metric: 'preferred_equity_usd',
    newCitationQuote: '[Zero value] No preferred stock in capital structure post-merger (Dec 2025).',
    newSearchTerm: null,
    reason: 'search term "106.8 million" was wrong line item',
  },
  // GAME preferred: value ($10.15M) correct but citation only mentions Series A-1
  {
    ticker: 'GAME', metric: 'preferred_equity_usd',
    newCitationQuote: '[SEC filing] Preferred stock: $5.15M Series A-1 (10-Q Q3 2025) + $5M Series A-2 for TubeBuddy (Feb 2026 8-K).',
    newSearchTerm: '5,150,000',
    reason: 'citation needed update to include Series A-2',
  },
];

async function main() {
  const d1 = D1Client.fromEnv();
  console.log(`${dryRun ? 'DRY RUN — ' : ''}Fixing ${fixes.length} stale citations...\n`);

  let applied = 0;
  let skipped = 0;

  for (const fix of fixes) {
    console.log(`${fix.ticker}.${fix.metric}: ${fix.reason}`);

    const existing = await d1.query<{
      datapoint_id: string;
      citation_search_term: string | null;
      citation_quote: string | null;
    }>(
      `SELECT datapoint_id, citation_search_term, citation_quote FROM latest_datapoints WHERE entity_id = ? AND metric = ?`,
      [fix.ticker, fix.metric]
    );

    if (existing.results.length === 0) {
      console.log(`  ⚠ No datapoint found — skipping`);
      skipped++;
      continue;
    }

    const dp = existing.results[0];
    console.log(`  Old: "${(dp.citation_search_term || '(null)').slice(0, 40)}"`);
    console.log(`  New: ${fix.newSearchTerm ? `"${fix.newSearchTerm}"` : '(null)'}`);

    if (!dryRun) {
      await d1.query(
        `UPDATE datapoints SET citation_quote = ?, citation_search_term = ? WHERE datapoint_id = ?`,
        [fix.newCitationQuote, fix.newSearchTerm, dp.datapoint_id]
      );
      console.log(`  ✓ Updated`);
    } else {
      console.log(`  (dry run — would update)`);
    }
    applied++;
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Applied: ${applied}, Skipped: ${skipped}`);
  if (dryRun) console.log(`\nRun without --dry-run to apply changes.`);
}

main().catch(e => { console.error(e); process.exit(1); });
