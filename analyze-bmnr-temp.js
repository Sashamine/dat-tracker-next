const bmnrHistory = [
  { date: "2025-07-17", holdings: 300657, shares: 50_000_000, holdingsPerShare: 0.006013 },
  { date: "2025-08-10", holdings: 1150263, shares: 150_000_000, holdingsPerShare: 0.007668 },
  { date: "2025-08-17", holdings: 1523373, shares: 180_000_000, holdingsPerShare: 0.008463 },
  { date: "2025-08-24", holdings: 1713899, shares: 221_515_180, holdingsPerShare: 0.007738 },
  { date: "2025-09-07", holdings: 2069443, shares: 260_000_000, holdingsPerShare: 0.007959 },
  { date: "2025-11-09", holdings: 3505723, shares: 350_000_000, holdingsPerShare: 0.010016 },
  { date: "2025-11-20", holdings: 3559879, shares: 384_067_823, holdingsPerShare: 0.009269 },
  { date: "2025-11-30", holdings: 3726499, shares: 400_000_000, holdingsPerShare: 0.009316 },
  { date: "2025-12-14", holdings: 3967210, shares: 410_000_000, holdingsPerShare: 0.009676 },
  { date: "2025-12-28", holdings: 4110525, shares: 425_000_000, holdingsPerShare: 0.009672 },
  { date: "2026-01-04", holdings: 4143502, shares: 430_000_000, holdingsPerShare: 0.009636 },
  { date: "2026-01-20", holdings: 4203036, shares: 455_000_000, holdingsPerShare: 0.009237 },
];

console.log("BMNR Holdings History Analysis\n");
console.log("Date Range: July 2025 - January 2026 (6 months)");
console.log("Data Points: 12 snapshots\n");

// Share dilution analysis
const firstShares = bmnrHistory[0].shares;
const lastShares = bmnrHistory[bmnrHistory.length - 1].shares;
const shareDilution = ((lastShares - firstShares) / firstShares * 100).toFixed(1);
console.log("Share Dilution:");
console.log(`  Start: ${(firstShares / 1_000_000).toFixed(1)}M shares (Jul 2025)`);
console.log(`  End: ${(lastShares / 1_000_000).toFixed(1)}M shares (Jan 2026)`);
console.log(`  Growth: +${((lastShares - firstShares) / 1_000_000).toFixed(1)}M shares (+${shareDilution}%)\n`);

// Holdings growth
const firstHoldings = bmnrHistory[0].holdings;
const lastHoldings = bmnrHistory[bmnrHistory.length - 1].holdings;
const holdingsGrowth = ((lastHoldings - firstHoldings) / firstHoldings * 100).toFixed(1);
console.log("ETH Holdings Growth:");
console.log(`  Start: ${(firstHoldings / 1_000_000).toFixed(2)}M ETH (Jul 2025)`);
console.log(`  End: ${(lastHoldings / 1_000_000).toFixed(2)}M ETH (Jan 2026)`);
console.log(`  Growth: +${((lastHoldings - firstHoldings) / 1_000_000).toFixed(2)}M ETH (+${holdingsGrowth}%)\n`);

// Holdings per share
const firstPerShare = bmnrHistory[0].holdingsPerShare;
const lastPerShare = bmnrHistory[bmnrHistory.length - 1].holdingsPerShare;
const perShareGrowth = ((lastPerShare - firstPerShare) / firstPerShare * 100).toFixed(1);
console.log("ETH Per Share:");
console.log(`  Start: ${firstPerShare.toFixed(6)} ETH/share`);
console.log(`  End: ${lastPerShare.toFixed(6)} ETH/share`);
console.log(`  Growth: ${perShareGrowth > 0 ? '+' : ''}${perShareGrowth}%\n`);

// Check for massive share jumps
console.log("Share Count Jumps (>20% in single update):");
for (let i = 1; i < bmnrHistory.length; i++) {
  const prev = bmnrHistory[i-1];
  const curr = bmnrHistory[i];
  const jump = ((curr.shares - prev.shares) / prev.shares * 100);
  if (Math.abs(jump) > 20) {
    const days = Math.floor((new Date(curr.date) - new Date(prev.date)) / (1000 * 60 * 60 * 24));
    console.log(`  ${prev.date} → ${curr.date} (${days} days): ${(prev.shares/1_000_000).toFixed(1)}M → ${(curr.shares/1_000_000).toFixed(1)}M (+${jump.toFixed(1)}%)`);
  }
}

// Data source analysis
console.log("\nData Sources:");
console.log("  Press releases: 11 snapshots");
console.log("  SEC 10-K filing: 1 snapshot (Nov 20, 2025)");
console.log("  Total: 11 of 12 from press releases (92%)\n");

console.log("Issues Identified:");
console.log("  ✗ No SEC XBRL quarterly data (only 1 10-K filing cited)");
console.log("  ✗ No 8-K inter-quarter events tracked");
console.log("  ✗ Share counts are estimates, not from quarterly filings");
console.log("  ✗ No ATM sales tracking (despite $10B ATM program)");
console.log("  ✗ No verification of press release data against SEC filings");
console.log("  ✗ 810% share dilution in 6 months not explained");
