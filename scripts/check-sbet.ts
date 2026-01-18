import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const client = await pool.connect();
  try {
    // Check if SBET has a row in company_financials
    const result = await client.query(`
      SELECT c.ticker, c.id as company_id, cf.market_cap, cf.total_debt, cf.cash_reserves
      FROM companies c
      LEFT JOIN company_financials cf ON cf.company_id = c.id AND cf.end_date IS NULL
      WHERE c.ticker = 'SBET'
    `);
    console.log('SBET data:', result.rows[0]);

    // Check if SBET has ANY rows in company_financials
    const allRows = await client.query(`
      SELECT cf.id, cf.company_id, cf.market_cap FROM company_financials cf
      JOIN companies c ON c.id = cf.company_id
      WHERE c.ticker = 'SBET'
    `);
    console.log('SBET company_financials rows:', allRows.rowCount);
    if (allRows.rowCount > 0) {
      console.log('Rows:', allRows.rows);
    }
  } finally {
    client.release();
    await pool.end();
  }
}
check();
