#!/usr/bin/env node
/**
 * Read-only distribution report for the DAT universe.
 *
 * Usage:
 *   DATABASE_URL=... node --loader ts-node/esm scripts/db/company-distribution.ts
 */
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL env var');
  process.exit(2);
}

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL, ssl: false });
  await client.connect();

  // Ensure read-only transaction
  await client.query('BEGIN');
  await client.query('SET TRANSACTION READ ONLY');

  const counts = await client.query(`
    SELECT
      COUNT(*)::int AS companies,
      SUM(CASE WHEN is_active THEN 1 ELSE 0 END)::int AS active
    FROM companies;
  `);

  const cols = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='companies'
    ORDER BY ordinal_position;
  `);

  const holdingsSourceDist = await client.query(`
    SELECT COALESCE(holdings_source::text, 'NULL') AS holdings_source, COUNT(*)::int AS n
    FROM companies
    GROUP BY 1
    ORDER BY n DESC;
  `);

  const snapshotSourceDist = await client.query(`
    SELECT COALESCE(source::text, 'NULL') AS source, COUNT(*)::int AS n
    FROM holdings_snapshots
    GROUP BY 1
    ORDER BY n DESC
    LIMIT 50;
  `);

  await client.query('ROLLBACK');
  await client.end();

  const out = {
    counts: counts.rows[0],
    companyColumns: cols.rows.map(r => r.column_name),
    holdings_source_distribution: holdingsSourceDist.rows,
    holdings_snapshots_source_distribution: snapshotSourceDist.rows,
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
