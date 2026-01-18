const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const client = await pool.connect();
  try {
    // Check schema first
    const schema = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'holdings_snapshots'");
    console.log('holdings_snapshots columns:', schema.rows.map(r => r.column_name).join(', '));

    const result = await client.query(
      "SELECT c.ticker, c.name, hs.*, cf.market_cap, cf.total_debt, cf.cash_reserves FROM companies c LEFT JOIN holdings_snapshots hs ON hs.company_id = c.id LEFT JOIN company_financials cf ON cf.company_id = c.id AND cf.end_date IS NULL WHERE c.ticker = 'BMNR' ORDER BY hs.snapshot_date DESC LIMIT 5"
    );
    console.log('BMNR Data (last 5 snapshots):');
    for (const row of result.rows) {
      console.log(row);
    }
  } finally {
    client.release();
    await pool.end();
  }
}
check();
