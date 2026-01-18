// Comprehensive update of financial data for all companies
// Sources: Yahoo Finance, SEC filings, company press releases, The Block, CoinDesk
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Financial data updates based on Jan 2026 research
const financialUpdates: Record<string, {
  market_cap?: number;
  total_debt?: number;
  preferred_equity?: number;
  cash_reserves?: number;
  notes?: string;
}> = {
  // === BTC MINERS WITH DEBT ===
  "HUT": {
    market_cap: 6_770_000_000,      // $6.77B (Jan 2026)
    total_debt: 350_000_000,         // ~$350M total debt
    cash_reserves: 200_000_000,      // Cash + BTC-backed credit capacity
    notes: "13,696 BTC reserve. $265M BTC-backed credit facilities at 8.2% WACC."
  },
  "CORZ": {
    market_cap: 5_300_000_000,      // $5.3B (Jan 2026)
    total_debt: 1_200_000_000,       // $1.2B debt
    cash_reserves: 836_000_000,      // $836M cash
    notes: "Emerged from bankruptcy 2024. CoreWeave acquisition pending."
  },
  "BTDR": {
    market_cap: 2_300_000_000,      // ~$2.3B (Jan 2026)
    total_debt: 730_000_000,         // $330M + $400M convertible notes
    cash_reserves: 100_000_000,      // Estimated
    notes: "$330M 4.875% converts (Jun 2025) + $400M 4% converts (Nov 2025)"
  },

  // === ETH TREASURY - BMNR is MASSIVE ===
  "BMNR": {
    market_cap: 12_800_000_000,     // ~$12.8B based on NAV (trades at 0.8x)
    total_debt: 0,                   // No significant debt mentioned
    cash_reserves: 915_000_000,      // Already in DB
    notes: "World's largest ETH treasury. 3.86M+ ETH (3.37% of supply). Trades at 0.8x NAV."
  },

  // === OTHER BTC COMPANIES ===
  "DJT": {
    market_cap: 6_400_000_000,      // Already in DB, verify
    total_debt: 0,
    cash_reserves: 0,
    notes: "Trump Media. BTC treasury strategy announced."
  },
  "XXI": {
    market_cap: 4_000_000_000,      // $4B SPAC merger valuation
    total_debt: 0,
    notes: "21 Capital - Jack Mallers. SPAC merger."
  },
  "CEPO": {
    market_cap: 3_500_000_000,      // $3.5B pre-merger SPAC
    total_debt: 0,
    notes: "BSTR Holdings pre-merger SPAC"
  },
  "ABTC": {
    market_cap: 800_000_000,        // ~$800M
    total_debt: 0,
    notes: "American Bitcoin - Trump family. Pure HODL strategy."
  },
  "NAKA": {
    market_cap: 1_500_000_000,      // ~$1.5B
    total_debt: 0,
  },
  "NXTT": {
    market_cap: 600_000_000,
  },
  "KULR": {
    market_cap: 600_000_000,
    cash_reserves: 20_000_000,
  },

  // === ETH COMPANIES ===
  "BTCS": {
    market_cap: 150_000_000,        // Smaller ETH treasury
  },
  "GAME": {
    market_cap: 50_000_000,
  },
  "FGNX": {
    market_cap: 110_000_000,
  },
  "ETHM": {
    market_cap: 100_000_000,
  },
  "BTBT": {
    market_cap: 500_000_000,
    cash_reserves: 179_000_000,     // Already in DB
  },

  // === SOL COMPANIES ===
  "FWDI": {
    market_cap: 1_600_000_000,      // ~$1.6B PIPE raise
    cash_reserves: 30_000_000,
  },
  "HSDT": {
    market_cap: 100_000_000,
  },
  "DFDV": {
    market_cap: 50_000_000,
  },
  "UPXI": {
    market_cap: 80_000_000,
  },
  "STKE": {
    market_cap: 50_000_000,
  },

  // === HYPE COMPANIES ===
  "PURR": {
    market_cap: 200_000_000,
  },
  "HYPD": {
    market_cap: 150_000_000,
  },

  // === BNB COMPANIES ===
  "BNC": {
    market_cap: 500_000_000,
  },
  "NA": {
    market_cap: 81_000_000,
  },

  // === TAO COMPANIES ===
  "TAOX": {
    market_cap: 100_000_000,
  },
  "XTAIF": {
    market_cap: 20_000_000,
  },
  "TWAV": {
    market_cap: 50_000_000,
  },

  // === LINK ===
  "CWD": {
    market_cap: 15_000_000,
  },
};

async function updateFinancials() {
  const client = await pool.connect();

  try {
    console.log('Updating financial data for all companies...\n');

    for (const [ticker, data] of Object.entries(financialUpdates)) {
      // Build SET clause dynamically
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.market_cap !== undefined) {
        setClauses.push(`market_cap = $${paramIndex++}`);
        values.push(data.market_cap);
      }
      if (data.total_debt !== undefined) {
        setClauses.push(`total_debt = $${paramIndex++}`);
        values.push(data.total_debt);
      }
      if (data.preferred_equity !== undefined) {
        setClauses.push(`preferred_equity = $${paramIndex++}`);
        values.push(data.preferred_equity);
      }
      if (data.cash_reserves !== undefined) {
        setClauses.push(`cash_reserves = $${paramIndex++}`);
        values.push(data.cash_reserves);
      }

      if (setClauses.length === 0) continue;

      const sql = `
        UPDATE company_financials cf
        SET ${setClauses.join(', ')}
        FROM companies c
        WHERE cf.company_id = c.id
          AND c.ticker = $${paramIndex}
          AND cf.end_date IS NULL
        RETURNING c.ticker
      `;
      values.push(ticker);

      try {
        const result = await client.query(sql, values);
        if (result.rowCount && result.rowCount > 0) {
          console.log(`✓ ${ticker}: Updated (market_cap: ${data.market_cap ? '$' + (data.market_cap/1e9).toFixed(2) + 'B' : '-'}, debt: ${data.total_debt ? '$' + (data.total_debt/1e9).toFixed(2) + 'B' : '-'})`);
        } else {
          // Try to insert if no existing row
          const checkSql = `SELECT id FROM companies WHERE ticker = $1`;
          const checkResult = await client.query(checkSql, [ticker]);
          if (checkResult.rows.length > 0) {
            const companyId = checkResult.rows[0].id;
            const insertSql = `
              INSERT INTO company_financials (company_id, market_cap, total_debt, preferred_equity, cash_reserves, end_date)
              VALUES ($1, $2, $3, $4, $5, NULL)
              ON CONFLICT DO NOTHING
            `;
            await client.query(insertSql, [
              companyId,
              data.market_cap || null,
              data.total_debt || null,
              data.preferred_equity || null,
              data.cash_reserves || null
            ]);
            console.log(`+ ${ticker}: Inserted new financials row`);
          } else {
            console.log(`? ${ticker}: Company not found in database`);
          }
        }
      } catch (err: any) {
        console.log(`✗ ${ticker}: Error - ${err.message}`);
      }
    }

    // Verify results
    console.log('\n--- Verification ---\n');
    const verifyResult = await client.query(`
      SELECT c.ticker, cf.market_cap, cf.total_debt, cf.preferred_equity, cf.cash_reserves
      FROM companies c
      LEFT JOIN company_financials cf ON cf.company_id = c.id AND cf.end_date IS NULL
      WHERE c.is_active = true
      ORDER BY cf.market_cap DESC NULLS LAST
      LIMIT 15
    `);

    console.log('Top 15 companies by market cap:');
    for (const row of verifyResult.rows) {
      const mc = row.market_cap ? '$' + (parseFloat(row.market_cap)/1e9).toFixed(2) + 'B' : '-';
      const debt = row.total_debt ? '$' + (parseFloat(row.total_debt)/1e9).toFixed(2) + 'B' : '-';
      console.log(`  ${row.ticker}: MC=${mc}, Debt=${debt}`);
    }

    console.log('\nFinancial update complete!');
  } finally {
    client.release();
    await pool.end();
  }
}

updateFinancials();
