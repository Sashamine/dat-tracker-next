import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '003-monitoring-system.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration: 003-monitoring-system.sql');

    // Execute the migration
    await pool.query(sql);

    console.log('Migration completed successfully!');

    // Verify tables were created
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('pending_updates', 'monitoring_runs', 'social_sources', 'notifications')
    `);

    console.log('\nCreated tables:');
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
