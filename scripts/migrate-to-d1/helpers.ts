/**
 * Shared helpers for D1 migration scripts.
 */

import { D1Client } from '../../src/lib/d1';
import { randomUUID } from 'crypto';

export function getD1(): D1Client {
  return D1Client.fromEnv();
}

export function uuid(): string {
  return randomUUID();
}

/**
 * Run the migration SQL schema if tables don't exist yet.
 */
export async function ensureSchema(d1: D1Client): Promise<void> {
  // Just check if entities table exists - if so, schema is applied
  try {
    await d1.query('SELECT COUNT(*) as c FROM entities');
  } catch {
    console.log('Tables not found. Please run migration 019-d1-single-source.sql first.');
    console.log('  npx wrangler d1 execute dat-tracker --file scripts/migrations/019-d1-single-source.sql');
    process.exit(1);
  }
}

/**
 * Verify a migration by reading back all inserted rows and comparing to source data.
 * Returns { matched, mismatched, missing } counts.
 */
export async function verifyMigration<T>(
  d1: D1Client,
  table: string,
  idColumn: string,
  sourceData: { id: string; verify: (row: Record<string, unknown>) => string[] }[]
): Promise<{ matched: number; mismatched: number; missing: number; errors: string[] }> {
  let matched = 0;
  let mismatched = 0;
  let missing = 0;
  const errors: string[] = [];

  for (const item of sourceData) {
    const result = await d1.query<Record<string, unknown>>(
      `SELECT * FROM ${table} WHERE ${idColumn} = ?`,
      [item.id]
    );

    if (!result.results || result.results.length === 0) {
      missing++;
      errors.push(`MISSING: ${item.id} not found in ${table}`);
      continue;
    }

    const row = result.results[0];
    const fieldErrors = item.verify(row);

    if (fieldErrors.length === 0) {
      matched++;
    } else {
      mismatched++;
      for (const err of fieldErrors) {
        errors.push(`MISMATCH [${item.id}]: ${err}`);
      }
    }
  }

  return { matched, mismatched, missing, errors };
}

/**
 * Compare two values with tolerance for floating point.
 */
export function approxEqual(a: number | undefined | null, b: number | undefined | null, tolerance = 0.01): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (a === 0 && b === 0) return true;
  const diff = Math.abs(a - b);
  const max = Math.max(Math.abs(a), Math.abs(b));
  return diff / max < tolerance;
}

/**
 * Batch insert helper - inserts rows in chunks to avoid D1 limits.
 */
export async function batchInsert(
  d1: D1Client,
  sql: string,
  rows: unknown[][],
  batchSize = 50
): Promise<number> {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    for (const params of batch) {
      await d1.query(sql, params);
      inserted++;
    }
  }
  return inserted;
}

export function log(msg: string): void {
  console.log(`[migrate] ${msg}`);
}

export function logSuccess(table: string, count: number): void {
  console.log(`\n✓ ${table}: ${count} rows migrated and verified`);
}

export function logError(msg: string): void {
  console.error(`✗ ${msg}`);
}
