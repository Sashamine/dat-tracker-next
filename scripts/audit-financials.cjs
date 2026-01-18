const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function audit() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT c.ticker, c.name, cf.market_cap, cf.total_debt, cf.preferred_equity, cf.cash_reserves FROM companies c JOIN company_financials cf ON cf.company_id = c.id AND cf.end_date IS NULL WHERE cf.market_cap IS NOT NULL ORDER BY cf.market_cap DESC"
    );

    console.log('=== AUDIT: Companies with Financial Data ===\n');
    console.log('Ticker | Market Cap | Debt | Preferred | Cash | Notes');
    console.log('-------|------------|------|-----------|------|------');

    let hasPreferred = [];
    let hasDebt = [];

    for (const row of result.rows) {
      const mc = row.market_cap ? (parseFloat(row.market_cap)/1e9).toFixed(2) + 'B' : '-';
      const debt = row.total_debt ? (parseFloat(row.total_debt)/1e9).toFixed(2) + 'B' : '-';
      const pref = row.preferred_equity ? (parseFloat(row.preferred_equity)/1e9).toFixed(2) + 'B' : '-';
      const cash = row.cash_reserves ? (parseFloat(row.cash_reserves)/1e6).toFixed(0) + 'M' : '-';

      let notes = [];
      if (row.preferred_equity && parseFloat(row.preferred_equity) > 0) {
        hasPreferred.push({ ticker: row.ticker, pref: row.preferred_equity, mc: row.market_cap });
        notes.push('HAS PREFERRED');
      }
      if (row.total_debt && parseFloat(row.total_debt) > 0) {
        hasDebt.push(row.ticker);
      }

      console.log(row.ticker.padEnd(6) + ' | ' + mc.padStart(10) + ' | ' + debt.padStart(5) + ' | ' + pref.padStart(9) + ' | ' + cash.padStart(5) + ' | ' + notes.join(', '));
    }

    console.log('\n=== SUMMARY ===');
    console.log('Total companies:', result.rows.length);
    console.log('With preferred equity:', hasPreferred.length);
    console.log('With debt:', hasDebt.length);

    if (hasPreferred.length > 0) {
      console.log('\n=== COMPANIES WITH PREFERRED EQUITY (DOUBLE-COUNT RISK) ===');
      for (const item of hasPreferred) {
        const mcNum = parseFloat(item.mc);
        const prefNum = parseFloat(item.pref);
        const pctOfMC = ((prefNum / mcNum) * 100).toFixed(1);
        console.log('  ' + item.ticker + ':');
        console.log('    Market Cap: $' + (mcNum/1e9).toFixed(2) + 'B');
        console.log('    Preferred:  $' + (prefNum/1e9).toFixed(2) + 'B (' + pctOfMC + '% of MC)');
        console.log('    RISK: If MC is "fully diluted", preferred may be double-counted');
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}
audit();
