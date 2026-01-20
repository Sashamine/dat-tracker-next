// Quick script to update specific company holdings in database
// Run with: npx tsx scripts/update-holdings.ts

import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://postgres:mrxFcPGKlmiEZjhhUHhigixHtqBHaKBF@gondola.proxy.rlwy.net:10200/railway';

interface HoldingsUpdate {
  ticker: string;
  holdings: number;
  holdingsLastUpdated: string;
  holdingsSource: string;
  notes?: string;
  pendingMerger?: boolean;
  expectedHoldings?: number;
}

// Updates to apply
const updates: HoldingsUpdate[] = [
  {
    ticker: 'FWDI',
    holdings: 6979967,
    holdingsLastUpdated: '2026-01-15',
    holdingsSource: 'press-release',
    notes: 'Raised $1.65B PIPE. Debt free. 133K+ SOL staking rewards since Sept 2025. First equity on Solana via Superstate.',
  },
  {
    ticker: 'XRPN',
    holdings: 473276430,
    holdingsLastUpdated: '2026-01-10',
    holdingsSource: 'press-release',
    notes: 'SPAC merger pending Q1 2026. 0.47% of XRP supply. SBI $200M anchor. Ripple, Pantera backed.',
    pendingMerger: true,
    expectedHoldings: 473276430,
  },
  {
    ticker: 'HUT',
    holdings: 10278,  // Standalone (excludes ABTC subsidiary)
    holdingsLastUpdated: '2025-09-30',
    holdingsSource: 'sec-filing',
    notes: 'Standalone holdings (ABTC listed separately). Owns 80% of ABTC. Merged with US Bitcoin Corp 2023.',
  },
  {
    ticker: 'ABTC',
    holdings: 5427,  // Jan 2, 2026
    holdingsLastUpdated: '2026-01-02',
    holdingsSource: 'press-release',
    notes: '19th largest BTC treasury. 80% owned by Hut 8 (HUT). 105% BTC yield since Nasdaq debut.',
  },
  {
    ticker: 'CEPO',
    holdings: 30021,
    holdingsLastUpdated: '2026-01-10',
    holdingsSource: 'sec-filing',
    notes: 'SPAC merger pending (expected Q1 2026). 25K BTC from Adam Back + 5K from investors. Will trade as BSTR post-merger.',
    pendingMerger: true,
    expectedHoldings: 30021,
  },
];

async function updateHoldings() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: false
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!\n');

    for (const update of updates) {
      console.log(`Updating ${update.ticker}...`);

      const result = await client.query(`
        UPDATE companies
        SET
          current_holdings = $1,
          holdings_last_updated = $2,
          notes = $3,
          pending_merger = COALESCE($4, pending_merger),
          expected_holdings = COALESCE($5, expected_holdings)
        WHERE ticker = $6
        RETURNING ticker, current_holdings, pending_merger, expected_holdings
      `, [
        update.holdings,
        update.holdingsLastUpdated,
        update.notes,
        update.pendingMerger ?? null,
        update.expectedHoldings ?? null,
        update.ticker
      ]);

      if (result.rows.length > 0) {
        console.log(`  ✓ ${result.rows[0].ticker}: ${result.rows[0].current_holdings} BTC`);
      } else {
        console.log(`  ⚠ ${update.ticker} not found in database`);
      }
    }

    console.log('\nDone!');

  } catch (err) {
    console.error('Update failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

updateHoldings();
