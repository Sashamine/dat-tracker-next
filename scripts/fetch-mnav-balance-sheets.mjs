/**
 * One-time script to fetch balance sheet data from mNAV.com
 * for populating companies.ts with debt/cash/preferred values
 */

const slugs = {
  'MSTR': 'strategy',
  'MARA': 'mara',
  'RIOT': 'riot',
  'CLSK': 'cleanspark',
  'CORZ': 'core-scientific',
  'BTDR': 'bitdeer',
  'HUT': 'hut-8',
  'BITF': 'bitfarms',
  'CIFR': 'cipher',
  'BTBT': 'bit-digital',
  'KULR': 'kulr',
  'DJT': 'trump-media',
  'NAKA': 'nakamoto',
  '3350.T': 'metaplanet',
  '0434.HK': 'boyaa',
  'H100.ST': 'h100',
  'NXTT': 'next-technology',
};

async function fetchAll() {
  const results = [];

  for (const [ticker, slug] of Object.entries(slugs)) {
    try {
      const url = `https://www.mnav.com/api/companies/${slug}/prepared-chart-data`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DAT-Tracker/1.0)' }
      });

      if (!res.ok) {
        console.error(`${ticker}: HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const latest = data.latest || {};

      results.push({
        ticker,
        holdings: latest.btcHeld,
        debt: latest.totalDebt || 0,
        cash: latest.totalCash || 0,
        fdShares: latest.fullyDilutedShares || 0,
        preferredEquity: latest.totalPreferredStock || 0,
        preparedAt: data.preparedAt
      });

      console.log(`${ticker}: fetched`);

      // Rate limit
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`${ticker}: ${err.message}`);
    }
  }

  // Output as formatted table
  console.log('\nTicker  | Holdings   | Debt      | Cash      | Preferred | FD Shares');
  console.log('--------|------------|-----------|-----------|-----------|----------');
  for (const r of results) {
    const debt = r.debt ? `$${(r.debt / 1e6).toFixed(0)}M` : '$0';
    const cash = r.cash ? `$${(r.cash / 1e6).toFixed(0)}M` : '$0';
    const pref = r.preferredEquity ? `$${(r.preferredEquity / 1e6).toFixed(0)}M` : '$0';
    const shares = r.fdShares ? `${(r.fdShares / 1e6).toFixed(1)}M` : '?';
    console.log(
      `${r.ticker.padEnd(8)}| ${String(r.holdings || '?').padEnd(11)}| ${debt.padEnd(10)}| ${cash.padEnd(10)}| ${pref.padEnd(10)}| ${shares}`
    );
  }

  // Also output raw JSON for updating companies.ts
  console.log('\n--- Raw data for companies.ts ---\n');
  for (const r of results) {
    if (r.debt || r.cash || r.preferredEquity) {
      console.log(`// ${r.ticker}`);
      if (r.debt) console.log(`totalDebt: ${r.debt}, // $${(r.debt/1e6).toFixed(1)}M per mNAV.com`);
      if (r.cash) console.log(`cashReserves: ${r.cash}, // $${(r.cash/1e6).toFixed(1)}M per mNAV.com`);
      if (r.preferredEquity) console.log(`preferredEquity: ${r.preferredEquity}, // $${(r.preferredEquity/1e6).toFixed(1)}M per mNAV.com`);
      console.log('');
    }
  }
}

fetchAll().catch(console.error);
