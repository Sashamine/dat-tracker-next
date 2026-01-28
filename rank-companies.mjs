import { allCompanies } from './src/lib/data/companies.ts';

// Rough prices for ranking
const prices = { BTC: 100000, ETH: 3200, SOL: 200, HYPE: 25, BNB: 700, TAO: 500, LINK: 20, LTC: 100, DOGE: 0.35, XRP: 2.5 };

const ranked = allCompanies
  .map(c => ({
    ticker: c.ticker,
    name: c.name,
    asset: c.asset,
    holdings: c.holdings,
    value: c.holdings * (prices[c.asset] || 100)
  }))
  .sort((a, b) => b.value - a.value)
  .slice(0, 10);

console.log('Top 10 DAT Companies by Treasury Value:\n');
ranked.forEach((c, i) => {
  const val = c.value >= 1e9 ? `$${(c.value/1e9).toFixed(2)}B` : `$${(c.value/1e6).toFixed(0)}M`;
  console.log(`${i+1}. ${c.ticker.padEnd(8)} ${c.name.substring(0,30).padEnd(31)} ${c.holdings.toLocaleString().padStart(12)} ${c.asset.padEnd(4)} ${val}`);
});
