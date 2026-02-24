#!/usr/bin/env node
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL env var');
  process.exit(2);
}

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL, ssl: false });
  await client.connect();
  await client.query('BEGIN');
  await client.query('SET TRANSACTION READ ONLY');

  const byCountry = await client.query(`
    SELECT COALESCE(country, 'NULL') AS country, COUNT(*)::int AS n
    FROM companies
    WHERE is_active
    GROUP BY 1
    ORDER BY n DESC;
  `);

  const byExchange = await client.query(`
    SELECT COALESCE(exchange, 'NULL') AS exchange, COUNT(*)::int AS n
    FROM companies
    WHERE is_active
    GROUP BY 1
    ORDER BY n DESC;
  `);

  const nonUs = await client.query(`
    SELECT ticker, name, country, exchange, holdings_source
    FROM companies
    WHERE is_active AND (country IS DISTINCT FROM 'US')
    ORDER BY country NULLS LAST, ticker;
  `);

  await client.query('ROLLBACK');
  await client.end();

  console.log(JSON.stringify({ byCountry: byCountry.rows, byExchange: byExchange.rows, nonUs: nonUs.rows }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
