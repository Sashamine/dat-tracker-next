// Update market caps to fully diluted values
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function updateMarketCaps() {
  const client = await pool.connect();

  try {
    console.log('Updating fully diluted market caps...');

    // Update MSTR market cap ($55.522B) and preferred equity ($8.064B)
    const mstrResult = await client.query(`
      UPDATE company_financials cf
      SET
        market_cap = 55522000000,
        preferred_equity = 8064000000
      FROM companies c
      WHERE cf.company_id = c.id
        AND c.ticker = 'MSTR'
        AND cf.end_date IS NULL
      RETURNING c.ticker;
    `);
    console.log('MSTR updated:', mstrResult.rowCount, 'rows');

    // Update SBET market cap ($2.363B)
    const sbetResult = await client.query(`
      UPDATE company_financials cf
      SET market_cap = 2363000000
      FROM companies c
      WHERE cf.company_id = c.id
        AND c.ticker = 'SBET'
        AND cf.end_date IS NULL
      RETURNING c.ticker;
    `);
    console.log('SBET updated:', sbetResult.rowCount, 'rows');

    // Verify all relevant companies
    const verifyResult = await client.query(`
      SELECT c.ticker, cf.market_cap, cf.total_debt, cf.preferred_equity, cf.cash_reserves
      FROM companies c
      JOIN company_financials cf ON cf.company_id = c.id AND cf.end_date IS NULL
      WHERE c.ticker IN ('MSTR', 'SBET')
      ORDER BY c.ticker;
    `);
    console.log('\nVerification:');
    console.table(verifyResult.rows);

    console.log('\nMarket cap updates completed!');
  } catch (error) {
    console.error('Update failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateMarketCaps();
