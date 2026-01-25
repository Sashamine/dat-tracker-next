/**
 * Migration: Add Verification State Tables
 *
 * Creates tables to track:
 * 1. verified_baselines - Last known verified values per company/field
 * 2. processed_filings - SEC filings we've already read
 * 3. share_events - Timeline of share count changes
 *
 * Run with: npx tsx scripts/migrate-verification-state.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('Creating verification state tables...\n');

    // 1. Verified Baselines
    console.log('Creating verified_baselines table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS verified_baselines (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(20) NOT NULL,
        field VARCHAR(50) NOT NULL,

        -- The verified value
        value NUMERIC NOT NULL,
        value_date DATE NOT NULL,

        -- Source evidence
        source_type VARCHAR(50) NOT NULL,
        source_accession VARCHAR(50),
        source_url TEXT NOT NULL,
        extraction_method VARCHAR(20) NOT NULL,

        -- Verification metadata
        verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        verified_by VARCHAR(20) NOT NULL DEFAULT 'auto',
        confidence VARCHAR(20) NOT NULL DEFAULT 'medium',
        notes TEXT,

        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        -- Unique constraint: one baseline per ticker/field/date
        UNIQUE(ticker, field, value_date)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_verified_baselines_ticker
      ON verified_baselines(ticker);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_verified_baselines_ticker_field
      ON verified_baselines(ticker, field, value_date DESC);
    `);

    console.log('  ✓ verified_baselines created\n');

    // 2. Processed Filings
    console.log('Creating processed_filings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS processed_filings (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(20) NOT NULL,

        -- Filing identification
        accession_number VARCHAR(50) NOT NULL,
        form_type VARCHAR(20) NOT NULL,
        filed_date DATE NOT NULL,
        period_date DATE,

        -- Processing metadata
        processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        processed_by VARCHAR(20) NOT NULL DEFAULT 'auto',

        -- What we extracted (JSONB for flexibility)
        extracted_data JSONB,

        -- Or why we skipped it
        skipped_reason VARCHAR(50),
        skipped_notes TEXT,

        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW(),

        -- Unique constraint: one record per filing
        UNIQUE(accession_number)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_processed_filings_ticker
      ON processed_filings(ticker);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_processed_filings_filed
      ON processed_filings(filed_date DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_processed_filings_ticker_filed
      ON processed_filings(ticker, filed_date DESC);
    `);

    console.log('  ✓ processed_filings created\n');

    // 3. Share Events
    console.log('Creating share_events table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS share_events (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(20) NOT NULL,

        -- Event details
        event_date DATE NOT NULL,
        event_type VARCHAR(50) NOT NULL,

        -- Impact
        shares_delta BIGINT NOT NULL,
        split_ratio VARCHAR(20),

        -- Source evidence
        source_type VARCHAR(50) NOT NULL,
        source_accession VARCHAR(50),
        source_url TEXT NOT NULL,
        source_excerpt TEXT,

        -- Processing metadata
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        recorded_by VARCHAR(20) NOT NULL DEFAULT 'auto',
        confidence VARCHAR(20) NOT NULL DEFAULT 'medium',

        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW(),

        -- Unique constraint: prevent duplicate events
        UNIQUE(ticker, event_date, event_type, source_accession)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_share_events_ticker
      ON share_events(ticker, event_date DESC);
    `);

    console.log('  ✓ share_events created\n');

    // 4. Company Filing Check State (lightweight tracking)
    console.log('Creating company_filing_checks table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS company_filing_checks (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(20) NOT NULL UNIQUE,

        -- When we last checked for new filings
        last_check_at TIMESTAMPTZ,

        -- Most recent filing we found
        latest_filing_accession VARCHAR(50),
        latest_filing_date DATE,

        -- Status
        needs_review BOOLEAN DEFAULT FALSE,
        review_reason TEXT,

        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('  ✓ company_filing_checks created\n');

    // Verify tables exist
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'verified_baselines',
        'processed_filings',
        'share_events',
        'company_filing_checks'
      )
      ORDER BY table_name;
    `);

    console.log('Verification - tables created:');
    tables.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
