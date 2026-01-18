import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const miners = [
  { ticker: 'HUT', market_cap: 6770000000, total_debt: 350000000, cash_reserves: 200000000 },
  { ticker: 'CORZ', market_cap: 5300000000, total_debt: 1200000000, cash_reserves: 836000000 },
  { ticker: 'BTDR', market_cap: 2300000000, total_debt: 730000000, cash_reserves: 100000000 },
];

async function fix() {
  const client = await pool.connect();
  try {
    for (const m of miners) {
      // Get company ID
      const res = await client.query('SELECT id FROM companies WHERE ticker = $1', [m.ticker]);
      if (res.rows.length === 0) {
        console.log(m.ticker + ': Not found');
        continue;
      }
      const companyId = res.rows[0].id;

      // Check if financials row exists
      const existsRes = await client.query(
        'SELECT id FROM company_financials WHERE company_id = $1 AND end_date IS NULL',
        [companyId]
      );

      if (existsRes.rows.length > 0) {
        // Update existing
        await client.query(`
          UPDATE company_financials
          SET market_cap = $1, total_debt = $2, cash_reserves = $3
          WHERE company_id = $4 AND end_date IS NULL
        `, [m.market_cap, m.total_debt, m.cash_reserves, companyId]);
        console.log(m.ticker + ': Updated - MC=$' + (m.market_cap/1e9).toFixed(2) + 'B, Debt=$' + (m.total_debt/1e9).toFixed(2) + 'B');
      } else {
        // Insert new
        await client.query(`
          INSERT INTO company_financials (company_id, market_cap, total_debt, cash_reserves, effective_date)
          VALUES ($1, $2, $3, $4, CURRENT_DATE)
        `, [companyId, m.market_cap, m.total_debt, m.cash_reserves]);
        console.log(m.ticker + ': Inserted - MC=$' + (m.market_cap/1e9).toFixed(2) + 'B, Debt=$' + (m.total_debt/1e9).toFixed(2) + 'B');
      }
    }

    // Verify
    const verify = await client.query(`
      SELECT c.ticker, cf.market_cap, cf.total_debt, cf.cash_reserves
      FROM companies c
      JOIN company_financials cf ON cf.company_id = c.id AND cf.end_date IS NULL
      WHERE c.ticker IN ('HUT', 'CORZ', 'BTDR')
    `);
    console.log('\nVerification:');
    for (const row of verify.rows) {
      console.log('  ' + row.ticker + ': MC=$' + (parseFloat(row.market_cap)/1e9).toFixed(2) + 'B, Debt=$' + (parseFloat(row.total_debt)/1e9).toFixed(2) + 'B, Cash=$' + (parseFloat(row.cash_reserves)/1e6).toFixed(0) + 'M');
    }
  } finally {
    client.release();
    await pool.end();
  }
}
fix();
