import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  
  try {
    // Step 1: Add enum values (one at a time, outside transaction)
    console.log('Adding enum values...');
    const enumValues = ['on-chain', 'arkham', 'mempool', 'validator', 'tracker'];
    for (const val of enumValues) {
      try {
        await client.query(`ALTER TYPE holdings_source ADD VALUE IF NOT EXISTS '${val}'`);
        console.log(`  Added: ${val}`);
      } catch (e) {
        console.log(`  Skipped ${val}: ${e.message}`);
      }
    }
    
    // Step 2: Create holdings_events table
    console.log('Creating holdings_events table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS holdings_events (
        id SERIAL PRIMARY KEY,
        company_id INT REFERENCES companies(id) ON DELETE CASCADE,
        holdings DECIMAL(20, 8) NOT NULL,
        source_type holdings_source NOT NULL,
        source_url VARCHAR(1000),
        source_id VARCHAR(200),
        confidence DECIMAL(3, 2) NOT NULL DEFAULT 1.0,
        event_time TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        raw_data JSONB,
        accession VARCHAR(25),
        filing_type VARCHAR(10),
        quote TEXT,
        anchor VARCHAR(200)
      )
    `);
    
    // Step 3: Create indexes
    console.log('Creating indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_holdings_events_company ON holdings_events(company_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_holdings_events_time ON holdings_events(event_time DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_holdings_events_accession ON holdings_events(accession)`);
    
    // Step 4: Create other event tables
    console.log('Creating debt_events...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS debt_events (
        id SERIAL PRIMARY KEY,
        company_id INT REFERENCES companies(id) ON DELETE CASCADE,
        total_debt DECIMAL(20, 2) NOT NULL,
        accession VARCHAR(25) NOT NULL,
        filing_type VARCHAR(10) NOT NULL,
        quote TEXT,
        anchor VARCHAR(200),
        xbrl_fact VARCHAR(200),
        period_end DATE,
        source_url VARCHAR(1000),
        confidence DECIMAL(3, 2) NOT NULL DEFAULT 1.0,
        event_time TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        raw_data JSONB
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_debt_events_company ON debt_events(company_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_debt_events_time ON debt_events(event_time DESC)`);
    
    console.log('Creating preferred_events...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS preferred_events (
        id SERIAL PRIMARY KEY,
        company_id INT REFERENCES companies(id) ON DELETE CASCADE,
        preferred_equity DECIMAL(20, 2) NOT NULL,
        accession VARCHAR(25) NOT NULL,
        filing_type VARCHAR(10) NOT NULL,
        quote TEXT,
        anchor VARCHAR(200),
        xbrl_fact VARCHAR(200),
        period_end DATE,
        source_url VARCHAR(1000),
        confidence DECIMAL(3, 2) NOT NULL DEFAULT 1.0,
        event_time TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        raw_data JSONB
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_preferred_events_company ON preferred_events(company_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_preferred_events_time ON preferred_events(event_time DESC)`);
    
    console.log('Creating shares_events...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS shares_events (
        id SERIAL PRIMARY KEY,
        company_id INT REFERENCES companies(id) ON DELETE CASCADE,
        shares_outstanding DECIMAL(20, 0) NOT NULL,
        accession VARCHAR(25) NOT NULL,
        filing_type VARCHAR(10) NOT NULL,
        quote TEXT,
        anchor VARCHAR(200),
        xbrl_fact VARCHAR(200),
        period_end DATE,
        source_url VARCHAR(1000),
        confidence DECIMAL(3, 2) NOT NULL DEFAULT 1.0,
        event_time TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        raw_data JSONB
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_shares_events_company ON shares_events(company_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_shares_events_time ON shares_events(event_time DESC)`);
    
    console.log('Creating cash_events...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS cash_events (
        id SERIAL PRIMARY KEY,
        company_id INT REFERENCES companies(id) ON DELETE CASCADE,
        cash_reserves DECIMAL(20, 2) NOT NULL,
        accession VARCHAR(25) NOT NULL,
        filing_type VARCHAR(10) NOT NULL,
        quote TEXT,
        anchor VARCHAR(200),
        xbrl_fact VARCHAR(200),
        period_end DATE,
        source_url VARCHAR(1000),
        confidence DECIMAL(3, 2) NOT NULL DEFAULT 1.0,
        event_time TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        raw_data JSONB
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cash_events_company ON cash_events(company_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cash_events_time ON cash_events(event_time DESC)`);
    
    console.log('Creating cost_basis_events...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS cost_basis_events (
        id SERIAL PRIMARY KEY,
        company_id INT REFERENCES companies(id) ON DELETE CASCADE,
        total_cost DECIMAL(20, 2) NOT NULL,
        avg_cost_per_btc DECIMAL(20, 2),
        accession VARCHAR(25) NOT NULL,
        filing_type VARCHAR(10) NOT NULL,
        quote TEXT,
        anchor VARCHAR(200),
        source_url VARCHAR(1000),
        confidence DECIMAL(3, 2) NOT NULL DEFAULT 1.0,
        event_time TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        raw_data JSONB
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cost_basis_events_company ON cost_basis_events(company_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cost_basis_events_time ON cost_basis_events(event_time DESC)`);
    
    // Step 5: Create views
    console.log('Creating views...');
    
    await client.query(`
      CREATE OR REPLACE VIEW latest_holdings AS
      SELECT DISTINCT ON (company_id)
        company_id, holdings, source_type, source_url, accession, filing_type, quote, anchor,
        confidence, event_time, created_at
      FROM holdings_events
      ORDER BY company_id, event_time DESC
    `);
    
    await client.query(`
      CREATE OR REPLACE VIEW latest_debt AS
      SELECT DISTINCT ON (company_id)
        company_id, total_debt, accession, filing_type, quote, anchor,
        xbrl_fact, period_end, event_time
      FROM debt_events
      ORDER BY company_id, event_time DESC
    `);
    
    await client.query(`
      CREATE OR REPLACE VIEW latest_preferred AS
      SELECT DISTINCT ON (company_id)
        company_id, preferred_equity, accession, filing_type, quote, anchor,
        xbrl_fact, period_end, event_time
      FROM preferred_events
      ORDER BY company_id, event_time DESC
    `);
    
    await client.query(`
      CREATE OR REPLACE VIEW latest_shares AS
      SELECT DISTINCT ON (company_id)
        company_id, shares_outstanding, accession, filing_type, quote, anchor,
        xbrl_fact, period_end, event_time
      FROM shares_events
      ORDER BY company_id, event_time DESC
    `);
    
    await client.query(`
      CREATE OR REPLACE VIEW latest_cash AS
      SELECT DISTINCT ON (company_id)
        company_id, cash_reserves, accession, filing_type, quote, anchor,
        xbrl_fact, period_end, event_time
      FROM cash_events
      ORDER BY company_id, event_time DESC
    `);
    
    await client.query(`
      CREATE OR REPLACE VIEW latest_cost_basis AS
      SELECT DISTINCT ON (company_id)
        company_id, total_cost, avg_cost_per_btc, accession, filing_type, quote, anchor,
        event_time
      FROM cost_basis_events
      ORDER BY company_id, event_time DESC
    `);
    
    console.log('✅ Migration complete!');
    
  } catch (e) {
    console.error('Migration failed:', e);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
