import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function scan() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        c.ticker,
        a.symbol as asset,
        cf.market_cap,
        cf.total_debt,
        cf.preferred_equity,
        cf.cash_reserves,
        cf.other_investments
      FROM companies c
      JOIN assets a ON c.asset_id = a.id
      LEFT JOIN company_financials cf ON cf.company_id = c.id AND cf.end_date IS NULL
      WHERE c.is_active = true
      ORDER BY cf.market_cap DESC NULLS LAST
    `);

    console.log('Companies with financial data:\n');
    console.log('Ticker | Asset | Market Cap | Debt | Preferred | Cash | Other');
    console.log('-------|-------|------------|------|-----------|------|------');

    for (const row of result.rows) {
      const mc = row.market_cap ? (parseFloat(row.market_cap)/1e9).toFixed(2) + 'B' : '-';
      const debt = row.total_debt ? (parseFloat(row.total_debt)/1e9).toFixed(2) + 'B' : '-';
      const pref = row.preferred_equity ? (parseFloat(row.preferred_equity)/1e9).toFixed(2) + 'B' : '-';
      const cash = row.cash_reserves ? (parseFloat(row.cash_reserves)/1e6).toFixed(0) + 'M' : '-';
      const other = row.other_investments ? (parseFloat(row.other_investments)/1e6).toFixed(0) + 'M' : '-';
      console.log(`${row.ticker.padEnd(6)} | ${row.asset.padEnd(5)} | ${mc.padStart(10)} | ${debt.padStart(4)} | ${pref.padStart(9)} | ${cash.padStart(4)} | ${other}`);
    }

    // Count companies missing data
    const missingMC = result.rows.filter(r => !r.market_cap).length;
    const withDebt = result.rows.filter(r => r.total_debt).length;
    const withCash = result.rows.filter(r => r.cash_reserves).length;

    console.log('\n--- Summary ---');
    console.log('Total companies:', result.rows.length);
    console.log('Missing market cap:', missingMC);
    console.log('Have debt data:', withDebt);
    console.log('Have cash data:', withCash);
  } finally {
    client.release();
    await pool.end();
  }
}
scan();
