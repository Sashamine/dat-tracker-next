/**
 * Complete database setup script
 * Runs all migrations and seeds initial data
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

async function runMigration(pool, filename) {
  const filePath = path.join(__dirname, 'migrations', filename);
  if (!fs.existsSync(filePath)) {
    console.log(`  Skipping ${filename}: file not found`);
    return;
  }

  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`  Running ${filename}...`);

  try {
    await pool.query(sql);
    console.log(`  ✓ ${filename} completed`);
  } catch (error) {
    // Some errors are OK (like "already exists")
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log(`  ✓ ${filename} (already exists)`);
    } else {
      throw error;
    }
  }
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    console.log('=== Database Setup ===\n');

    // 1. Run migrations
    console.log('1. Running migrations...');
    await runMigration(pool, '004-full-schema.sql');
    await runMigration(pool, '003-monitoring-system.sql');

    // 2. Seed assets (check if needed)
    console.log('\n2. Checking assets...');
    const assetsCount = await pool.query('SELECT COUNT(*) FROM assets');
    if (parseInt(assetsCount.rows[0].count) === 0) {
      console.log('  Seeding assets...');
      await pool.query(`
        INSERT INTO assets (symbol, name, coingecko_id, binance_symbol) VALUES
        ('BTC', 'Bitcoin', 'bitcoin', 'BTCUSDT'),
        ('ETH', 'Ethereum', 'ethereum', 'ETHUSDT'),
        ('SOL', 'Solana', 'solana', 'SOLUSDT'),
        ('HYPE', 'Hyperliquid', 'hyperliquid', NULL),
        ('BNB', 'BNB', 'binancecoin', 'BNBUSDT'),
        ('TAO', 'Bittensor', 'bittensor', 'TAOUSDT'),
        ('LINK', 'Chainlink', 'chainlink', 'LINKUSDT'),
        ('TRX', 'Tron', 'tron', 'TRXUSDT'),
        ('XRP', 'XRP', 'ripple', 'XRPUSDT'),
        ('ZEC', 'Zcash', 'zcash', 'ZECUSDT'),
        ('LTC', 'Litecoin', 'litecoin', 'LTCUSDT'),
        ('SUI', 'Sui', 'sui', 'SUIUSDT'),
        ('DOGE', 'Dogecoin', 'dogecoin', 'DOGEUSDT'),
        ('AVAX', 'Avalanche', 'avalanche-2', 'AVAXUSDT'),
        ('ADA', 'Cardano', 'cardano', 'ADAUSDT'),
        ('HBAR', 'Hedera', 'hedera-hashgraph', 'HBARUSDT')
        ON CONFLICT (symbol) DO NOTHING
      `);
      console.log('  ✓ Assets seeded');
    } else {
      console.log(`  ✓ ${assetsCount.rows[0].count} assets already exist`);
    }

    // 3. Show table counts
    console.log('\n3. Database status:');
    const tables = ['assets', 'companies', 'holdings_snapshots', 'pending_updates', 'monitoring_runs', 'social_sources'];

    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`  - ${table}: ${result.rows[0].count} rows`);
      } catch (error) {
        console.log(`  - ${table}: (table not found)`);
      }
    }

    console.log('\n=== Setup Complete ===');
    console.log('\nNext steps:');
    console.log('1. Run: node scripts/seed-companies.mjs');
    console.log('2. Then trigger monitoring: curl http://localhost:3000/api/cron/monitoring');

  } catch (error) {
    console.error('\nSetup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
