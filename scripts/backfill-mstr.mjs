/**
 * Backfill MSTR event tables with extracted data
 */
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  
  try {
    // Get MSTR company ID
    const companyRes = await client.query("SELECT id FROM companies WHERE ticker = 'MSTR'");
    if (companyRes.rows.length === 0) {
      console.log('MSTR not found in companies table');
      return;
    }
    const companyId = companyRes.rows[0].id;
    console.log('MSTR company_id:', companyId);
    
    // =========================================================================
    // HOLDINGS from Feb 2 8-K (as of Jan 31, 2026)
    // =========================================================================
    console.log('\nInserting holdings event...');
    await client.query(`
      INSERT INTO holdings_events 
        (company_id, holdings, source_type, accession, filing_type, quote, anchor, confidence, event_time)
      VALUES ($1, $2, '8-K filing', $3, '8-K', $4, $5, 1.0, $6)
      ON CONFLICT DO NOTHING
    `, [
      companyId,
      713502,
      '0001193125-26-032731',
      '713,502',
      'Aggregate BTC Holdings',
      '2026-01-31'
    ]);
    console.log('  ✓ Holdings: 713,502 BTC');
    
    // =========================================================================
    // COST BASIS from Feb 2 8-K
    // =========================================================================
    console.log('\nInserting cost basis event...');
    await client.query(`
      INSERT INTO cost_basis_events 
        (company_id, total_cost, avg_cost_per_btc, accession, filing_type, quote, anchor, confidence, event_time)
      VALUES ($1, $2, $3, $4, '8-K', $5, $6, 1.0, $7)
      ON CONFLICT DO NOTHING
    `, [
      companyId,
      54260000000,  // $54.26B
      76052,        // $76,052
      '0001193125-26-032731',
      '$54.26 billion, $76,052 per BTC',
      'Aggregate Purchase Price',
      '2026-01-31'
    ]);
    console.log('  ✓ Total Cost: $54.26B, Avg: $76,052');
    
    // =========================================================================
    // DEBT from Q3 2025 10-Q (XBRL)
    // =========================================================================
    console.log('\nInserting debt event...');
    await client.query(`
      INSERT INTO debt_events 
        (company_id, total_debt, accession, filing_type, quote, anchor, xbrl_fact, period_end, confidence, event_time)
      VALUES ($1, $2, $3, '10-Q', $4, $5, $6, $7, 1.0, $8)
      ON CONFLICT DO NOTHING
    `, [
      companyId,
      8173903000,  // $8.17B
      '0001193125-25-262568',
      '8,173,903,000',
      'LongTermDebt',
      'us-gaap:LongTermDebt',
      '2025-09-30',
      '2025-09-30'
    ]);
    console.log('  ✓ Debt: $8.17B');
    
    // =========================================================================
    // PREFERRED from Q3 2025 10-Q (XBRL)
    // =========================================================================
    console.log('\nInserting preferred event...');
    await client.query(`
      INSERT INTO preferred_events 
        (company_id, preferred_equity, accession, filing_type, quote, anchor, xbrl_fact, period_end, confidence, event_time)
      VALUES ($1, $2, $3, '10-Q', $4, $5, $6, $7, 1.0, $8)
      ON CONFLICT DO NOTHING
    `, [
      companyId,
      5888450000,  // $5.89B (Q3 baseline)
      '0001193125-25-262568',
      '5,888,450,000',
      'ProceedsFromIssuanceOfPreferredStockAndPreferenceStock',
      'us-gaap:ProceedsFromIssuanceOfPreferredStockAndPreferenceStock',
      '2025-09-30',
      '2025-09-30'
    ]);
    console.log('  ✓ Preferred: $5.89B (Q3 baseline)');
    
    // =========================================================================
    // SHARES from Q3 2025 10-Q (XBRL)
    // =========================================================================
    console.log('\nInserting shares event...');
    await client.query(`
      INSERT INTO shares_events 
        (company_id, shares_outstanding, accession, filing_type, quote, anchor, xbrl_fact, period_end, confidence, event_time)
      VALUES ($1, $2, $3, '10-Q', $4, $5, $6, $7, 1.0, $8)
      ON CONFLICT DO NOTHING
    `, [
      companyId,
      272143000,  // 272M (Q3 weighted avg)
      '0001193125-25-262568',
      '272,143,000',
      'WeightedAverageNumberOfSharesOutstandingBasic',
      'us-gaap:WeightedAverageNumberOfSharesOutstandingBasic',
      '2025-09-30',
      '2025-09-30'
    ]);
    console.log('  ✓ Shares: 272M (Q3 weighted avg)');
    
    // =========================================================================
    // CASH from Q3 2025 10-Q (XBRL)
    // =========================================================================
    console.log('\nInserting cash event...');
    await client.query(`
      INSERT INTO cash_events 
        (company_id, cash_reserves, accession, filing_type, quote, anchor, xbrl_fact, period_end, confidence, event_time)
      VALUES ($1, $2, $3, '10-Q', $4, $5, $6, $7, 1.0, $8)
      ON CONFLICT DO NOTHING
    `, [
      companyId,
      54285000,  // $54M
      '0001193125-25-262568',
      '54,285,000',
      'CashAndCashEquivalentsAtCarryingValue',
      'us-gaap:CashAndCashEquivalentsAtCarryingValue',
      '2025-09-30',
      '2025-09-30'
    ]);
    console.log('  ✓ Cash: $54M');
    
    // =========================================================================
    // Verify by querying the views
    // =========================================================================
    console.log('\n' + '='.repeat(50));
    console.log('VERIFICATION - Latest values from views:');
    console.log('='.repeat(50));
    
    const holdings = await client.query('SELECT * FROM latest_holdings WHERE company_id = $1', [companyId]);
    if (holdings.rows[0]) {
      console.log(`Holdings: ${Number(holdings.rows[0].holdings).toLocaleString()} BTC (${holdings.rows[0].accession})`);
    }
    
    const debt = await client.query('SELECT * FROM latest_debt WHERE company_id = $1', [companyId]);
    if (debt.rows[0]) {
      console.log(`Debt: $${(Number(debt.rows[0].total_debt)/1e9).toFixed(2)}B (${debt.rows[0].accession})`);
    }
    
    const cost = await client.query('SELECT * FROM latest_cost_basis WHERE company_id = $1', [companyId]);
    if (cost.rows[0]) {
      console.log(`Cost: $${(Number(cost.rows[0].total_cost)/1e9).toFixed(2)}B, avg $${Number(cost.rows[0].avg_cost_per_btc).toLocaleString()} (${cost.rows[0].accession})`);
    }
    
    console.log('\n✅ Backfill complete!');
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
