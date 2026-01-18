import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const results = await pool.query(`
  SELECT c.ticker, a.symbol as asset, c.current_holdings, c.holdings_last_updated, c.holdings_source
  FROM companies c
  JOIN assets a ON c.asset_id = a.id
  WHERE a.symbol = 'BTC'
  ORDER BY c.current_holdings DESC
`);

console.log('=== BTC Holdings Database State ===\n');
for (const row of results.rows) {
  const date = row.holdings_last_updated ? new Date(row.holdings_last_updated).toISOString().split('T')[0] : 'N/A';
  const holdings = parseFloat(row.current_holdings).toLocaleString();
  const source = row.holdings_source || 'unknown';
  console.log(`${row.ticker.padEnd(8)} ${holdings.padStart(12)} BTC  (${date})  [${source}]`);
}

await pool.end();
