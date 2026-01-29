/**
 * Test Burn Quality Score System
 *
 * Fetches burn quality metrics for top 26 DAT companies and outputs:
 * - Raw XBRL burn
 * - Adjusted burn
 * - Quality score
 * - Review needed (yes/no)
 *
 * Run with: npx tsx scripts/test-burn-quality.ts
 */

import { fetchAllBurnQualityMetrics, BurnQualityMetrics } from '../src/lib/fetchers/sec-xbrl';
import {
  analyzeBurnQuality,
  formatBurn,
  getScoreLabel,
  BurnQualityResult,
} from '../src/lib/verification/burn-quality';
import {
  btcCompanies,
  ethCompanies,
  solCompanies,
  hypeCompanies,
  bnbCompanies,
  taoCompanies,
} from '../src/lib/data/companies';

// Get all companies with SEC CIKs
const allCompanies = [
  ...btcCompanies,
  ...ethCompanies,
  ...solCompanies,
  ...hypeCompanies,
  ...bnbCompanies,
  ...taoCompanies,
].filter(c => c.secCik);

// Build ticker -> isMiner map
const minerMap = new Map<string, boolean>();
for (const company of allCompanies) {
  minerMap.set(company.ticker, company.isMiner ?? false);
}

// Take top 26 companies
const top26 = allCompanies.slice(0, 26);
const tickers = top26.map(c => c.ticker);

console.log('');
console.log('=' .repeat(120));
console.log('BURN QUALITY SCORE ANALYSIS');
console.log('=' .repeat(120));
console.log('');
console.log(`Analyzing ${tickers.length} companies: ${tickers.join(', ')}`);
console.log('');

async function main() {
  console.log('Fetching XBRL data from SEC EDGAR...\n');
  
  const metricsResults = await fetchAllBurnQualityMetrics(tickers);
  
  const results: BurnQualityResult[] = [];
  const errors: Array<{ ticker: string; error: string }> = [];
  
  for (const { ticker, metrics, error } of metricsResults) {
    if (error || !metrics) {
      errors.push({ ticker, error: error || 'No metrics found' });
      continue;
    }
    
    const isMiner = minerMap.get(ticker) ?? false;
    const result = analyzeBurnQuality(ticker, metrics, isMiner);
    results.push(result);
  }
  
  // Sort by quality score (ascending - worst first)
  results.sort((a, b) => a.qualityScore.score - b.qualityScore.score);
  
  // Print results table
  console.log('');
  console.log('-'.repeat(120));
  console.log(
    'Ticker'.padEnd(8) +
    'Miner'.padEnd(7) +
    'Raw Burn'.padEnd(18) +
    'Adjusted Burn'.padEnd(18) +
    'Qtrly Adj'.padEnd(16) +
    'Score'.padEnd(8) +
    'Quality'.padEnd(10) +
    'Review'.padEnd(8) +
    'Method'
  );
  console.log('-'.repeat(120));
  
  for (const r of results) {
    const rawBurn = formatBurn(-r.metrics.operatingCashFlow!);
    const adjBurn = formatBurn(-r.adjustedBurn.adjustedBurn);
    const qtrlyBurn = formatBurn(r.adjustedBurn.quarterlyAdjustedBurn);
    const scoreLabel = getScoreLabel(r.qualityScore.score);
    const reviewNeeded = r.qualityScore.needsReview ? '⚠️ YES' : '✅ No';
    
    console.log(
      r.ticker.padEnd(8) +
      (r.isMiner ? '⛏️' : '📊').padEnd(7) +
      rawBurn.padEnd(18) +
      adjBurn.padEnd(18) +
      qtrlyBurn.padEnd(16) +
      r.qualityScore.score.toString().padEnd(8) +
      scoreLabel.padEnd(10) +
      reviewNeeded.padEnd(8) +
      r.adjustedBurn.adjustmentMethod
    );
  }
  
  console.log('-'.repeat(120));
  
  // Print detailed breakdown for companies needing review
  const needsReview = results.filter(r => r.qualityScore.needsReview);
  
  if (needsReview.length > 0) {
    console.log('');
    console.log('=' .repeat(120));
    console.log(`COMPANIES NEEDING MANUAL REVIEW (Score < 50): ${needsReview.length}`);
    console.log('=' .repeat(120));
    
    for (const r of needsReview) {
      console.log('');
      console.log(`📋 ${r.ticker} (Score: ${r.qualityScore.score})`);
      console.log(`   Type: ${r.isMiner ? 'Miner' : 'Treasury'}`);
      console.log(`   Adjustment: ${r.adjustedBurn.adjustmentReason}`);
      console.log(`   Issues:`);
      for (const issue of r.qualityScore.issues) {
        console.log(`     - ${issue}`);
      }
      console.log(`   Score breakdown:`);
      console.log(`     - NI/OCF Gap: ${r.qualityScore.components.niOcfGapScore}/40`);
      console.log(`     - SBC Ratio: ${r.qualityScore.components.sbcRatioScore}/30`);
      console.log(`     - D&A Ratio: ${r.qualityScore.components.daRatioScore}/30`);
    }
  }
  
  // Print miners section
  const miners = results.filter(r => r.isMiner);
  if (miners.length > 0) {
    console.log('');
    console.log('=' .repeat(120));
    console.log(`MINERS (Using SG&A as burn proxy): ${miners.length}`);
    console.log('=' .repeat(120));
    
    for (const r of miners) {
      const sga = r.metrics.sgaExpenses;
      const ocf = r.metrics.operatingCashFlow;
      const da = r.metrics.depreciation;
      
      console.log('');
      console.log(`⛏️ ${r.ticker}`);
      console.log(`   Operating Cash Flow: ${ocf !== null ? `$${(ocf / 1_000_000).toFixed(2)}M` : 'N/A'}`);
      console.log(`   SG&A Expenses: ${sga !== null ? `$${(sga / 1_000_000).toFixed(2)}M` : 'N/A'}`);
      console.log(`   Depreciation & Amortization: ${da !== null ? `$${(da / 1_000_000).toFixed(2)}M` : 'N/A'}`);
      console.log(`   → Adjusted Quarterly Burn: ${formatBurn(r.adjustedBurn.quarterlyAdjustedBurn)}`);
    }
  }
  
  // Print errors
  if (errors.length > 0) {
    console.log('');
    console.log('=' .repeat(120));
    console.log(`ERRORS: ${errors.length}`);
    console.log('=' .repeat(120));
    
    for (const { ticker, error } of errors) {
      console.log(`   ❌ ${ticker}: ${error}`);
    }
  }
  
  // Summary
  console.log('');
  console.log('=' .repeat(120));
  console.log('SUMMARY');
  console.log('=' .repeat(120));
  console.log(`   Total analyzed: ${results.length}`);
  console.log(`   High quality (80+): ${results.filter(r => r.qualityScore.score >= 80).length}`);
  console.log(`   Medium quality (50-79): ${results.filter(r => r.qualityScore.score >= 50 && r.qualityScore.score < 80).length}`);
  console.log(`   Low quality (<50): ${results.filter(r => r.qualityScore.score < 50).length}`);
  console.log(`   Miners (using SG&A proxy): ${miners.length}`);
  console.log(`   Errors: ${errors.length}`);
  console.log('');
}

main().catch(console.error);
