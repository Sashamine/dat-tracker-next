import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const { Pool } = pg;

async function runMigration() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error('Usage: node run-migration.mjs <migration-file>');
    console.error('Example: node run-migration.mjs 006-discrepancies.sql');
    console.error('\nAvailable migrations:');
    const files = fs.readdirSync(path.join(__dirname, 'migrations'))
      .filter(f => f.endsWith('.sql'))
      .sort();
    files.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    const migrationPath = path.join(__dirname, 'migrations', migrationFile);

    if (!fs.existsSync(migrationPath)) {
      console.error(`Migration file not found: ${migrationPath}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log(`Running migration: ${migrationFile}`);
    await pool.query(sql);
    console.log('Migration completed successfully!');

    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    console.log('\nTables in database:');
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
