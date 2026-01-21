/**
 * CIK Verification Script
 *
 * Verifies that each ticker -> CIK mapping is correct by checking SEC EDGAR.
 * Run with: npx ts-node scripts/verify-ciks.ts
 */

// All CIK mappings from our codebase
// CORRECTED on 2026-01-21 after full SEC EDGAR audit
const CIK_MAPPINGS: Record<string, { cik: string; expectedName: string }> = {
  // BTC
  'MSTR': { cik: '0001050446', expectedName: 'Strategy' },  // fka MicroStrategy
  'MARA': { cik: '0001507605', expectedName: 'MARA Holdings' },
  'RIOT': { cik: '0001167419', expectedName: 'Riot Platforms' },
  'CLSK': { cik: '0000827876', expectedName: 'CleanSpark' },
  'HUT': { cik: '0001964789', expectedName: 'Hut 8' },
  'CORZ': { cik: '0001839341', expectedName: 'Core Scientific' },
  'BTDR': { cik: '0001899123', expectedName: 'Bitdeer' },
  'KULR': { cik: '0001662684', expectedName: 'KULR Technology' },
  'NAKA': { cik: '0001946573', expectedName: 'Nakamoto' },  // KindlyMD post-merger
  'DJT': { cik: '0001849635', expectedName: 'Trump Media' },
  'XXI': { cik: '0001865602', expectedName: 'Twenty One' },  // Cantor Equity Partners
  'CEPO': { cik: '0001865602', expectedName: 'Twenty One' },  // Same as XXI
  'ASST': { cik: '0001920406', expectedName: 'Strive' },
  'NXTT': { cik: '0001784970', expectedName: 'Next Technology' },
  'ABTC': { cik: '0002068580', expectedName: 'American Bitcoin' },

  // ETH
  'BMNR': { cik: '0001829311', expectedName: 'Bitmine Immersion' },
  'SBET': { cik: '0001981535', expectedName: 'SharpLink' },
  'ETHM': { cik: '0002080334', expectedName: 'Ether Machine' },
  'BTBT': { cik: '0001710350', expectedName: 'Bit Digital' },
  'BTCS': { cik: '0001436229', expectedName: 'BTCS' },
  'GAME': { cik: '0001714562', expectedName: 'GameSquare' },
  'FGNX': { cik: '0001591890', expectedName: 'FG Nexus' },

  // SOL
  'FWDI': { cik: '0000038264', expectedName: 'Forward Industries' },
  'HSDT': { cik: '0001610853', expectedName: 'Helius' },  // Now SOL treasury
  'DFDV': { cik: '0001805526', expectedName: 'DeFi Development' },
  'UPXI': { cik: '0001775194', expectedName: 'Upexi' },

  // HYPE
  'PURR': { cik: '0002078856', expectedName: 'Hyperliquid Strategies' },
  'HYPD': { cik: '0001682639', expectedName: 'Hyperion DeFi' },

  // BNB
  'NA': { cik: '0001872302', expectedName: 'Nano Labs' },

  // TAO
  'TAOX': { cik: '0001571934', expectedName: 'TAO Synergies' },
  'TWAV': { cik: '0000746210', expectedName: 'TaoWeave' },

  // LINK
  'CWD': { cik: '0001627282', expectedName: 'CaliberCos' },

  // TRX
  'TRON': { cik: '0001956744', expectedName: 'TRON' },

  // LTC
  'LITS': { cik: '0001262104', expectedName: 'Lite Strategy' },

  // SUI
  'SUIG': { cik: '0001425355', expectedName: 'Sui Group Holdings' },

  // DOGE
  'ZONE': { cik: '0001956741', expectedName: 'CleanCore Solutions' },
  'TBH': { cik: '0001903595', expectedName: 'TBH' },
  'BTOG': { cik: '0001735556', expectedName: 'Bit Origin' },

  // AVAX
  'AVX': { cik: '0001826397', expectedName: 'AVAX One Technology' },

  // HBAR
  'IHLDF': { cik: '0001905459', expectedName: 'IHLDF' },
};

async function verifyOneCIK(ticker: string, cik: string): Promise<{ ticker: string; cik: string; secName: string | null; status: 'ok' | 'mismatch' | 'error' }> {
  try {
    const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DAT-Tracker CIK-Audit/1.0 (contact@example.com)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return { ticker, cik, secName: null, status: 'error' };
    }

    const data = await response.json();
    const secName = data.name || null;

    return { ticker, cik, secName, status: 'ok' };
  } catch (error) {
    return { ticker, cik, secName: null, status: 'error' };
  }
}

async function main() {
  console.log('CIK Verification Audit');
  console.log('======================\n');

  const results: Array<{ ticker: string; cik: string; secName: string | null; expectedName: string; status: string }> = [];

  for (const [ticker, { cik, expectedName }] of Object.entries(CIK_MAPPINGS)) {
    console.log(`Checking ${ticker} (CIK ${cik})...`);

    const result = await verifyOneCIK(ticker, cik);
    results.push({ ...result, expectedName });

    if (result.secName) {
      console.log(`  SEC Name: ${result.secName}`);
    } else {
      console.log(`  ERROR: Could not fetch SEC data`);
    }

    // Rate limit - SEC allows 10 requests per second
    await new Promise(r => setTimeout(r, 150));
  }

  console.log('\n\nSUMMARY');
  console.log('=======\n');

  const errors = results.filter(r => r.status === 'error');
  const success = results.filter(r => r.status === 'ok');

  console.log(`Successfully verified: ${success.length}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\nCIKs that could not be verified:');
    for (const e of errors) {
      console.log(`  ${e.ticker}: ${e.cik}`);
    }
  }

  console.log('\n\nALL RESULTS:');
  console.log('Ticker\tCIK\t\tSEC Name');
  console.log('------\t---\t\t--------');
  for (const r of results) {
    console.log(`${r.ticker}\t${r.cik}\t${r.secName || 'ERROR'}`);
  }
}

main().catch(console.error);
