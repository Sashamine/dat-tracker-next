/**
 * Seed Monitoring Sources
 * Populates social_sources table with Twitter handles for major DAT companies
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const { Pool } = pg;

// Social sources to seed - Twitter handles for major companies
const SOCIAL_SOURCES = [
  // BTC Companies
  { ticker: 'MSTR', platform: 'twitter', handle: '@MicroStrategy', type: 'official', trust: 'verified' },
  { ticker: 'MSTR', platform: 'twitter', handle: '@saboringcompany', type: 'official', trust: 'verified' },
  { ticker: 'MARA', platform: 'twitter', handle: '@MAboringscompany', type: 'official', trust: 'verified' },
  { ticker: 'RIOT', platform: 'twitter', handle: '@RiotPlatforms', type: 'official', trust: 'verified' },
  { ticker: 'CLSK', platform: 'twitter', handle: '@CleanSpark_Inc', type: 'official', trust: 'verified' },
  { ticker: 'XXI', platform: 'twitter', handle: '@twentyone_co', type: 'official', trust: 'verified' },
  { ticker: 'SMLR', platform: 'twitter', handle: '@Semaboringhow', type: 'official', trust: 'verified' },
  { ticker: 'KULR', platform: 'twitter', handle: '@KULRTech', type: 'official', trust: 'verified' },
  { ticker: 'DJT', platform: 'twitter', handle: '@TrumpMediaTech', type: 'official', trust: 'verified' },

  // ETH Companies
  { ticker: 'BMNR', platform: 'twitter', handle: '@BitMineImmersion', type: 'official', trust: 'verified' },
  { ticker: 'SBET', platform: 'twitter', handle: '@SharpLinkGaming', type: 'official', trust: 'verified' },
  { ticker: 'ETHM', platform: 'twitter', handle: '@theethermachine', type: 'official', trust: 'verified' },
  { ticker: 'BTBT', platform: 'twitter', handle: '@Aboringcompany', type: 'official', trust: 'verified' },
  { ticker: 'BTCS', platform: 'twitter', handle: '@BTCSInc', type: 'official', trust: 'verified' },

  // SOL Companies
  { ticker: 'FWDI', platform: 'twitter', handle: '@FWD_Industries', type: 'official', trust: 'verified' },
  { ticker: 'HSDT', platform: 'twitter', handle: '@HeliogenGroup', type: 'official', trust: 'verified' },
  { ticker: 'UPXI', platform: 'twitter', handle: '@UpxiCorp', type: 'official', trust: 'verified' },

  // Analysts/News - Community sources
  { ticker: 'MSTR', platform: 'twitter', handle: '@BitcoinForCorps', type: 'analyst', trust: 'community' },
  { ticker: 'MSTR', platform: 'twitter', handle: '@MSTRtracker', type: 'analyst', trust: 'community' },

  // General crypto treasury tracking
  { ticker: '*', platform: 'twitter', handle: '@BitcoinTreasury', type: 'news', trust: 'community' },
];

async function seedSources() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    // First, ensure companies table exists and get company IDs
    const companiesResult = await client.query(`
      SELECT id, ticker FROM companies
    `);

    const companyMap = new Map();
    for (const row of companiesResult.rows) {
      companyMap.set(row.ticker, row.id);
    }

    console.log(`Found ${companyMap.size} companies in database`);

    // If no companies in DB, we need to work with the static data approach
    // For now, let's create a mapping based on ticker order
    if (companyMap.size === 0) {
      console.log('No companies in database - social sources will use ticker matching');
    }

    let inserted = 0;
    let skipped = 0;

    for (const source of SOCIAL_SOURCES) {
      // Skip wildcard sources (used for general tracking)
      if (source.ticker === '*') {
        console.log(`Skipping wildcard source: ${source.handle}`);
        skipped++;
        continue;
      }

      const companyId = companyMap.get(source.ticker);

      if (!companyId) {
        console.log(`Company not in DB: ${source.ticker} - will insert with NULL company_id`);
      }

      try {
        await client.query(`
          INSERT INTO social_sources (
            company_id,
            platform,
            account_handle,
            account_type,
            trust_level,
            is_active
          ) VALUES ($1, $2, $3, $4, $5::source_trust_level, true)
          ON CONFLICT (company_id, platform, account_handle) DO UPDATE
          SET
            account_type = EXCLUDED.account_type,
            trust_level = EXCLUDED.trust_level,
            is_active = true
        `, [
          companyId || null,
          source.platform,
          source.handle,
          source.type,
          source.trust,
        ]);
        inserted++;
        console.log(`Inserted: ${source.ticker} - ${source.handle}`);
      } catch (err) {
        console.error(`Error inserting ${source.handle}:`, err.message);
        skipped++;
      }
    }

    console.log(`\nSeed complete: ${inserted} inserted, ${skipped} skipped`);

    // Show what's in the table now
    const result = await client.query(`
      SELECT
        ss.id,
        ss.account_handle,
        ss.platform,
        ss.trust_level,
        c.ticker
      FROM social_sources ss
      LEFT JOIN companies c ON c.id = ss.company_id
      ORDER BY ss.id
    `);

    console.log('\nCurrent social sources:');
    console.table(result.rows);

    client.release();
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedSources()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
