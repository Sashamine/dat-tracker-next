// Run migration to add debt columns
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('Running migration to add debt columns...');

    // Add columns if they don't exist
    await client.query(`
      ALTER TABLE company_financials
      ADD COLUMN IF NOT EXISTS total_debt DECIMAL(20, 2),
      ADD COLUMN IF NOT EXISTS preferred_equity DECIMAL(20, 2);
    `);
    console.log('Columns added successfully');

    // Update MSTR
    const mstrResult = await client.query(`
      UPDATE company_financials cf
      SET
        total_debt = 8200000000,
        preferred_equity = 7800000000
      FROM companies c
      WHERE cf.company_id = c.id
        AND c.ticker = 'MSTR'
        AND cf.end_date IS NULL
      RETURNING c.ticker;
    `);
    console.log('MSTR updated:', mstrResult.rowCount, 'rows');

    // Update MARA
    const maraResult = await client.query(`
      UPDATE company_financials cf
      SET total_debt = 1800000000
      FROM companies c
      WHERE cf.company_id = c.id
        AND c.ticker = 'MARA'
        AND cf.end_date IS NULL
      RETURNING c.ticker;
    `);
    console.log('MARA updated:', maraResult.rowCount, 'rows');

    // Update RIOT
    const riotResult = await client.query(`
      UPDATE company_financials cf
      SET total_debt = 794000000
      FROM companies c
      WHERE cf.company_id = c.id
        AND c.ticker = 'RIOT'
        AND cf.end_date IS NULL
      RETURNING c.ticker;
    `);
    console.log('RIOT updated:', riotResult.rowCount, 'rows');

    // Update CLSK
    const clskResult = await client.query(`
      UPDATE company_financials cf
      SET total_debt = 1150000000
      FROM companies c
      WHERE cf.company_id = c.id
        AND c.ticker = 'CLSK'
        AND cf.end_date IS NULL
      RETURNING c.ticker;
    `);
    console.log('CLSK updated:', clskResult.rowCount, 'rows');

    // Verify
    const verifyResult = await client.query(`
      SELECT c.ticker, cf.total_debt, cf.preferred_equity, cf.cash_reserves
      FROM companies c
      JOIN company_financials cf ON cf.company_id = c.id AND cf.end_date IS NULL
      WHERE c.ticker IN ('MSTR', 'MARA', 'RIOT', 'CLSK')
      ORDER BY c.ticker;
    `);
    console.log('\nVerification:');
    console.table(verifyResult.rows);

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
