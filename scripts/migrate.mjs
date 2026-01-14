// Database migration script
// Run with: node scripts/migrate.mjs

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://postgres:mrxFcPGKlmiEZjhhUHhigixHtqBHaKBF@gondola.proxy.rlwy.net:10200/railway';

// Split SQL into executable statements, handling $$ blocks
function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let i = 0;

  while (i < sql.length) {
    // Check for $$ delimiter
    if (sql.slice(i, i + 2) === '$$') {
      inDollarQuote = !inDollarQuote;
      current += '$$';
      i += 2;
      continue;
    }

    // Check for semicolon (statement end)
    if (sql[i] === ';' && !inDollarQuote) {
      current += ';';
      const trimmed = current.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        statements.push(trimmed);
      }
      current = '';
      i++;
      continue;
    }

    current += sql[i];
    i++;
  }

  // Add any remaining statement
  const trimmed = current.trim();
  if (trimmed && !trimmed.startsWith('--')) {
    statements.push(trimmed);
  }

  return statements;
}

async function migrate() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: false
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!\n');

    // Read the schema file
    const schemaPath = path.join(__dirname, '../docs/database-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Remove comments that are on their own lines
    const cleanedSchema = schema
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    const statements = splitSqlStatements(cleanedSchema);

    console.log(`Running ${statements.length} statements...\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        if (!statement.trim()) continue;

        // Get identifier for logging
        const match = statement.match(/CREATE\s+(TYPE|TABLE|INDEX|VIEW|FUNCTION|TRIGGER|OR REPLACE FUNCTION)\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
        const label = match ? `${match[1]} ${match[2]}` : statement.substring(0, 50);

        await client.query(statement);
        console.log(`✓ ${label}`);
        successCount++;
      } catch (err) {
        const label = statement.substring(0, 50).replace(/\n/g, ' ');

        // Expected errors
        if (err.code === '42710') { // type already exists
          console.log(`⊘ ${label}... (type exists)`);
          skipCount++;
        } else if (err.code === '42P07') { // table already exists
          console.log(`⊘ ${label}... (table exists)`);
          skipCount++;
        } else if (err.code === '42P01') { // table doesn't exist (for indexes on non-existent tables)
          console.log(`⊘ ${label}... (dependency missing)`);
          skipCount++;
        } else if (err.code === '42883') { // function doesn't exist
          console.log(`⊘ ${label}... (function missing)`);
          skipCount++;
        } else {
          console.error(`✗ ${label}`);
          console.error(`  Error [${err.code}]: ${err.message}`);
          errorCount++;
        }
      }
    }

    console.log(`\n========================================`);
    console.log(`Migration complete!`);
    console.log(`  Successful: ${successCount}`);
    console.log(`  Skipped: ${skipCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log(`========================================\n`);

    // Verify tables were created
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('Tables created:');
    if (tables.rows.length === 0) {
      console.log('  (none)');
    } else {
      tables.rows.forEach(row => console.log(`  - ${row.table_name}`));
    }

    // Check for types
    const types = await client.query(`
      SELECT typname FROM pg_type
      WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND typtype = 'e'
      ORDER BY typname
    `);

    console.log('\nCustom types created:');
    types.rows.forEach(row => console.log(`  - ${row.typname}`));

  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
