/**
 * Run all D1 migrations in order.
 *
 * Prerequisites:
 *   1. Apply the schema first:
 *      npx wrangler d1 execute dat-tracker --file scripts/migrations/019-d1-single-source.sql
 *
 *   2. Set env vars:
 *      set -a && source .env.local && set +a
 *
 * Usage:
 *   npx tsx scripts/migrate-to-d1/migrate-all.ts
 *
 * Each script:
 *   1. Reads from static TypeScript source
 *   2. Writes to D1
 *   3. Reads back from D1
 *   4. Compares — any mismatch = hard failure
 *   5. Logs summary
 */

import { execSync } from 'child_process';
import * as path from 'path';

const SCRIPTS = [
  'migrate-entities.ts',
  'migrate-instruments.ts',
  'migrate-purchases.ts',
  'migrate-secondary.ts',
  'migrate-events.ts',
  'migrate-assumptions.ts',
  'migrate-history.ts',
];

async function main() {
  console.log('=== D1 Single Source of Truth Migration ===\n');
  console.log('Running all migration scripts...\n');

  const scriptDir = path.dirname(new URL(import.meta.url).pathname);

  for (const script of SCRIPTS) {
    const scriptPath = path.join(scriptDir, script);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${script}`);
    console.log('='.repeat(60));

    try {
      execSync(`npx tsx ${scriptPath}`, {
        stdio: 'inherit',
        cwd: path.resolve(scriptDir, '../..'),
        env: process.env,
      });
      console.log(`\n✓ ${script} completed successfully`);
    } catch (err) {
      console.error(`\n✗ ${script} FAILED — aborting migration`);
      process.exit(1);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('All migrations completed successfully!');
  console.log('='.repeat(60));
  console.log('\nNext steps:');
  console.log('  1. Run: npx tsx scripts/migrate-to-d1/verify-migration.ts');
  console.log('  2. Review shadow mode in Phase 3');
}

main();
