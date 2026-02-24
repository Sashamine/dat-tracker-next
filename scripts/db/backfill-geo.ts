#!/usr/bin/env node
/**
 * Backfill companies.country and companies.exchange heuristically from ticker.
 *
 * Writes to DB (UPDATE). Use with care.
 */
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL env var');
  process.exit(2);
}

type Geo = { country: string | null; exchange: string | null };

function inferGeo(tickerRaw: string): Geo {
  const t = tickerRaw.trim();

  // Common suffix patterns
  if (/\.HK$/i.test(t)) return { country: 'HK', exchange: 'HKEX' };
  if (/\.T$/i.test(t)) return { country: 'JP', exchange: 'TSE' };
  if (/\.TO$/i.test(t)) return { country: 'CA', exchange: 'TSX' };
  if (/\.V$/i.test(t)) return { country: 'CA', exchange: 'TSXV' };
  if (/\.L$/i.test(t)) return { country: 'GB', exchange: 'LSE' };
  if (/\.PA$/i.test(t)) return { country: 'FR', exchange: 'EPA' };
  if (/\.DE$/i.test(t)) return { country: 'DE', exchange: 'XETRA' };

  // If it has a dot but not recognized, mark unknown
  if (t.includes('.')) return { country: null, exchange: null };

  // Heuristic: if it has a CIK, treat as US-listed; if not, unknown
  return { country: null, exchange: null };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const client = new pg.Client({ connectionString: DATABASE_URL, ssl: false });
  await client.connect();

  const rows = await client.query(`
    SELECT id, ticker, sec_cik, country, exchange
    FROM companies
    WHERE is_active
    ORDER BY id;
  `);

  let updates = 0;
  for (const r of rows.rows) {
    const inferred = inferGeo(r.ticker);

    // If we can safely infer US from sec_cik
    if (!inferred.country && r.sec_cik) {
      inferred.country = 'US';
      // exchange still unknown from this field alone
    }

    // Only update if currently null
    const newCountry = r.country ?? inferred.country;
    const newExchange = r.exchange ?? inferred.exchange;

    if (newCountry !== r.country || newExchange !== r.exchange) {
      updates++;
      if (!dryRun) {
        await client.query(
          'UPDATE companies SET country = $1, exchange = $2, updated_at = NOW() WHERE id = $3',
          [newCountry, newExchange, r.id]
        );
      }
    }
  }

  await client.end();
  console.log(JSON.stringify({ dryRun, total: rows.rows.length, updates }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
