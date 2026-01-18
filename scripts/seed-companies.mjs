/**
 * Seed companies from static data into the database
 * Run after 004-full-schema.sql migration
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import pg from 'pg';

const { Pool } = pg;

// Map our source names to DB enum values
const SOURCE_MAP = {
  'press-release': 'press release',
  'sec-8k': '8-K filing',
  'sec-10q': '10-Q filing',
  'sec-10k': '10-K filing',
  'sec-filing': '8-K filing',
  'aggregator': 'bitcointreasuries.net',
  'manual': 'manual',
  'api': 'api',
};

// Import would require build, so we'll define inline
const COMPANIES = [
  // ETH
  { id: "bmnr", name: "Bitmine Immersion", ticker: "BMNR", asset: "ETH", tier: 1, holdings: 4144000, lastUpdated: "2026-01-10", source: "press release" },
  { id: "sbet", name: "SharpLink Gaming", ticker: "SBET", asset: "ETH", tier: 1, holdings: 863424, lastUpdated: "2026-01-10", source: "manual" },
  { id: "ethm", name: "The Ether Machine", ticker: "ETHM", asset: "ETH", tier: 1, holdings: 495362, lastUpdated: "2026-01-10", source: "manual" },
  { id: "btbt", name: "Bit Digital", ticker: "BTBT", asset: "ETH", tier: 1, holdings: 154000, lastUpdated: "2026-01-10", source: "manual" },
  { id: "btcs", name: "BTCS Inc.", ticker: "BTCS", asset: "ETH", tier: 2, holdings: 70000, lastUpdated: "2026-01-10", source: "manual" },
  { id: "game", name: "GameSquare", ticker: "GAME", asset: "ETH", tier: 1, holdings: 15600, lastUpdated: "2026-01-10", source: "manual" },
  { id: "fgnx", name: "FG Nexus", ticker: "FGNX", asset: "ETH", tier: 1, holdings: 40005, lastUpdated: "2026-01-10", source: "manual" },

  // BTC
  { id: "mstr", name: "Strategy (fka MicroStrategy)", ticker: "MSTR", asset: "BTC", tier: 1, holdings: 687410, lastUpdated: "2026-01-12", source: "8-K filing", secCik: "0001050446", isMiner: false },
  { id: "3350t", name: "Metaplanet", ticker: "3350.T", asset: "BTC", tier: 1, holdings: 35102, lastUpdated: "2026-01-10", source: "manual", isMiner: false },
  { id: "xxi", name: "Twenty One Capital", ticker: "XXI", asset: "BTC", tier: 1, holdings: 43514, lastUpdated: "2026-01-10", source: "manual", isMiner: false },
  { id: "cepo", name: "BSTR Holdings", ticker: "CEPO", asset: "BTC", tier: 1, holdings: 30021, lastUpdated: "2026-01-10", source: "manual", isMiner: false },
  { id: "mara", name: "MARA Holdings", ticker: "MARA", asset: "BTC", tier: 1, holdings: 52850, lastUpdated: "2026-01-17", source: "bitcointreasuries.net", secCik: "0001507605", isMiner: true },
  { id: "riot", name: "Riot Platforms", ticker: "RIOT", asset: "BTC", tier: 1, holdings: 19287, lastUpdated: "2025-10-30", source: "8-K filing", secCik: "0001167419", isMiner: true },
  { id: "clsk", name: "CleanSpark", ticker: "CLSK", asset: "BTC", tier: 1, holdings: 13099, lastUpdated: "2026-01-17", source: "bitcointreasuries.net", secCik: "0001785459", isMiner: true },
  { id: "asst", name: "Strive (Strive + Semler)", ticker: "ASST", asset: "BTC", tier: 1, holdings: 12798, lastUpdated: "2026-01-16", source: "8-K filing", secCik: "0001920406", isMiner: false },
  { id: "kulr", name: "KULR Technology", ticker: "KULR", asset: "BTC", tier: 1, holdings: 1021, lastUpdated: "2026-01-10", source: "manual", secCik: "0001662684", isMiner: false },
  { id: "altbg", name: "The Blockchain Group", ticker: "ALTBG", asset: "BTC", tier: 2, holdings: 2201, lastUpdated: "2025-12-01", source: "bitcointreasuries.net", isMiner: false },
  { id: "h100st", name: "H100 Group", ticker: "H100.ST", asset: "BTC", tier: 2, holdings: 1046, lastUpdated: "2025-12-01", source: "bitcointreasuries.net", isMiner: false },
  { id: "naka", name: "Nakamoto Holdings", ticker: "NAKA", asset: "BTC", tier: 1, holdings: 5398, lastUpdated: "2025-11-12", source: "press release", secCik: "0001977303", isMiner: false },
  { id: "djt", name: "Trump Media & Technology", ticker: "DJT", asset: "BTC", tier: 1, holdings: 15000, lastUpdated: "2026-01-01", source: "press release", secCik: "0001849635", isMiner: false },
  { id: "boyaa", name: "Boyaa Interactive", ticker: "0434.HK", asset: "BTC", tier: 1, holdings: 4091, lastUpdated: "2025-11-01", source: "press release", isMiner: false },
  { id: "nxtt", name: "Next Technology Holding", ticker: "NXTT", asset: "BTC", tier: 1, holdings: 5833, lastUpdated: "2025-11-01", source: "bitcointreasuries.net", secCik: "0001831978", isMiner: false },
  { id: "abtc", name: "American Bitcoin", ticker: "ABTC", asset: "BTC", tier: 1, holdings: 5098, lastUpdated: "2025-12-14", source: "press release", secCik: "0002068580", isMiner: true },
  { id: "hut", name: "Hut 8", ticker: "HUT", asset: "BTC", tier: 1, holdings: 13696, lastUpdated: "2025-11-04", source: "8-K filing", secCik: "0001964789", isMiner: true },
  { id: "corz", name: "Core Scientific", ticker: "CORZ", asset: "BTC", tier: 1, holdings: 2116, lastUpdated: "2026-01-17", source: "bitcointreasuries.net", secCik: "0001878848", isMiner: true },
  { id: "btdr", name: "Bitdeer Technologies", ticker: "BTDR", asset: "BTC", tier: 1, holdings: 2470, lastUpdated: "2026-01-17", source: "bitcointreasuries.net", secCik: "0001899123", isMiner: true },

  // SOL
  { id: "fwdi", name: "Forward Industries", ticker: "FWDI", asset: "SOL", tier: 1, holdings: 6921342, lastUpdated: "2026-01-10", source: "manual" },
  { id: "hsdt", name: "Solana Company", ticker: "HSDT", asset: "SOL", tier: 1, holdings: 2200000, lastUpdated: "2026-01-10", source: "manual" },
  { id: "dfdv", name: "DeFi Development Corp", ticker: "DFDV", asset: "SOL", tier: 1, holdings: 2221329, lastUpdated: "2026-01-10", source: "manual" },
  { id: "upxi", name: "Upexi", ticker: "UPXI", asset: "SOL", tier: 1, holdings: 2106989, lastUpdated: "2026-01-10", source: "manual" },
  { id: "stke", name: "Sol Strategies", ticker: "STKE", asset: "SOL", tier: 2, holdings: 526637, lastUpdated: "2026-01-10", source: "manual" },

  // HYPE
  { id: "purr", name: "Hyperliquid Strategies", ticker: "PURR", asset: "HYPE", tier: 1, holdings: 12600000, lastUpdated: "2026-01-10", source: "manual" },
  { id: "hypd", name: "Hyperion DeFi", ticker: "HYPD", asset: "HYPE", tier: 2, holdings: 1712195, lastUpdated: "2026-01-10", source: "manual" },

  // BNB
  { id: "bnc", name: "BNB Network Company", ticker: "BNC", asset: "BNB", tier: 1, holdings: 500000, lastUpdated: "2026-01-10", source: "manual" },
  { id: "na", name: "Nano Labs", ticker: "NA", asset: "BNB", tier: 2, holdings: 130000, lastUpdated: "2026-01-10", source: "manual", secCik: "0001847577" },

  // TAO
  { id: "taox", name: "TAO Synergies", ticker: "TAOX", asset: "TAO", tier: 1, holdings: 54058, lastUpdated: "2026-01-10", source: "manual", secCik: "0001539029" },
  { id: "xtaif", name: "xTAO Inc", ticker: "XTAIF", asset: "TAO", tier: 1, holdings: 59962, lastUpdated: "2026-01-10", source: "manual" },
  { id: "twav", name: "TaoWeave", ticker: "TWAV", asset: "TAO", tier: 2, holdings: 21943, lastUpdated: "2026-01-10", source: "manual", secCik: "0001319927" },

  // LINK
  { id: "cwd", name: "Caliber", ticker: "CWD", asset: "LINK", tier: 1, holdings: 562535, lastUpdated: "2026-01-10", source: "manual", secCik: "0001724670" },

  // TRX
  { id: "tron", name: "Tron Inc", ticker: "TRON", asset: "TRX", tier: 1, holdings: 677596945, lastUpdated: "2026-01-10", source: "manual", secCik: "0001956744" },

  // XRP
  { id: "xrpn", name: "Evernorth Holdings", ticker: "XRPN", asset: "XRP", tier: 1, holdings: 473276430, lastUpdated: "2026-01-10", source: "manual" },

  // ZEC
  { id: "cyph", name: "Cypherpunk Technologies", ticker: "CYPH", asset: "ZEC", tier: 1, holdings: 290062, lastUpdated: "2026-01-10", source: "manual" },

  // LTC
  { id: "lits", name: "Lite Strategy", ticker: "LITS", asset: "LTC", tier: 1, holdings: 929548, lastUpdated: "2026-01-10", source: "manual", secCik: "0001411460" },
  { id: "luxff", name: "Luxxfolio Holdings", ticker: "LUXFF", asset: "LTC", tier: 2, holdings: 20084, lastUpdated: "2026-01-10", source: "manual" },

  // SUI
  { id: "suig", name: "SUI Group Holdings", ticker: "SUIG", asset: "SUI", tier: 1, holdings: 108098436, lastUpdated: "2026-01-10", source: "manual", secCik: "0001066923" },

  // DOGE
  { id: "zone", name: "CleanCore Solutions", ticker: "ZONE", asset: "DOGE", tier: 1, holdings: 710000000, lastUpdated: "2026-01-10", source: "manual", secCik: "0001814329" },
  { id: "tbh", name: "Brag House / House of Doge", ticker: "TBH", asset: "DOGE", tier: 1, holdings: 730000000, lastUpdated: "2026-01-10", source: "manual", secCik: "0001903595" },
  { id: "btog", name: "Bit Origin", ticker: "BTOG", asset: "DOGE", tier: 2, holdings: 40500000, lastUpdated: "2026-01-10", source: "manual", secCik: "0001833498" },

  // AVAX
  { id: "avx", name: "AVAX One Technology", ticker: "AVX", asset: "AVAX", tier: 1, holdings: 13800000, lastUpdated: "2026-01-10", source: "manual", secCik: "0001845123" },

  // HBAR
  { id: "imtl", name: "Immutable Holdings", ticker: "IHLDF", asset: "HBAR", tier: 1, holdings: 48000000, lastUpdated: "2026-01-10", source: "manual", secCik: "0001905459" },
];

async function seedCompanies() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    console.log('Seeding companies...');

    for (const company of COMPANIES) {
      // Get asset ID
      const assetResult = await pool.query(
        'SELECT id FROM assets WHERE symbol = $1',
        [company.asset]
      );

      if (assetResult.rows.length === 0) {
        console.log(`  Skipping ${company.ticker}: asset ${company.asset} not found`);
        continue;
      }

      const assetId = assetResult.rows[0].id;

      // Upsert company
      await pool.query(`
        INSERT INTO companies (
          external_id, name, ticker, asset_id, tier,
          current_holdings, holdings_last_updated, holdings_source,
          sec_cik, is_miner
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (external_id) DO UPDATE SET
          name = EXCLUDED.name,
          ticker = EXCLUDED.ticker,
          current_holdings = EXCLUDED.current_holdings,
          holdings_last_updated = EXCLUDED.holdings_last_updated,
          holdings_source = EXCLUDED.holdings_source,
          sec_cik = EXCLUDED.sec_cik,
          is_miner = EXCLUDED.is_miner,
          updated_at = NOW()
      `, [
        company.id,
        company.name,
        company.ticker,
        assetId,
        company.tier.toString(),
        company.holdings,
        company.lastUpdated,
        company.source,
        company.secCik || null,
        company.isMiner || false
      ]);

      console.log(`  ✓ ${company.ticker}: ${company.holdings.toLocaleString()} ${company.asset}`);
    }

    // Show summary
    const countResult = await pool.query('SELECT COUNT(*) FROM companies');
    console.log(`\nSeeded ${countResult.rows[0].count} companies`);

  } catch (error) {
    console.error('Error seeding companies:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedCompanies();
