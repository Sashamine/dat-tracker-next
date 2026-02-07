#!/usr/bin/env node
/**
 * Apply SEC Updates from API
 * 
 * Calls the production API to get extraction results, then applies
 * the changes locally and commits.
 * 
 * Usage:
 *   node scripts/apply-sec-updates.mjs [--tickers=KULR,DJT] [--dry-run]
 * 
 * Examples:
 *   node scripts/apply-sec-updates.mjs                    # Check all stale companies
 *   node scripts/apply-sec-updates.mjs --tickers=KULR     # Check specific ticker
 *   node scripts/apply-sec-updates.mjs --dry-run          # Preview without applying
 */

import fs from 'fs';
import { execSync } from 'child_process';

const COMPANIES_FILE = 'src/lib/data/companies.ts';
const API_BASE = process.env.API_BASE || 'https://dat-tracker-next.vercel.app';

// Parse args
const args = process.argv.slice(2);
const tickersArg = args.find(a => a.startsWith('--tickers='))?.split('=')[1];
const dryRun = args.includes('--dry-run');
const sinceDays = args.find(a => a.startsWith('--since='))?.split('=')[1] || '30';

async function callSecUpdateAPI(tickers) {
  const params = new URLSearchParams({
    manual: 'true',
    dryRun: 'true', // Always dry-run on API side - we apply locally
    sinceDays,
  });
  
  if (tickers) {
    params.set('tickers', tickers);
  }
  
  const url = `${API_BASE}/api/cron/sec-update?${params}`;
  console.log(`Calling API: ${url}\n`);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Clawdbot-SEC-Updater/1.0',
    },
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

function updateCompaniesFile(ticker, newHoldings, filingDate, source) {
  let content = fs.readFileSync(COMPANIES_FILE, 'utf8');
  
  // Format holdings with underscores for readability
  const formattedHoldings = newHoldings.toLocaleString().replace(/,/g, '_');
  
  // Find the company block and update holdings
  const holdingsRegex = new RegExp(
    `(ticker:\\s*["']${ticker}["'][^}]*holdings:\\s*)([\\d_,]+)`,
    's'
  );
  
  if (!holdingsRegex.test(content)) {
    console.error(`  ❌ Could not find holdings for ${ticker}`);
    return false;
  }
  
  content = content.replace(holdingsRegex, `$1${formattedHoldings}`);
  
  // Update holdingsLastUpdated
  const dateRegex = new RegExp(
    `(ticker:\\s*["']${ticker}["'][^}]*holdingsLastUpdated:\\s*["'])([^"']+)(["'])`,
    's'
  );
  if (dateRegex.test(content)) {
    content = content.replace(dateRegex, `$1${filingDate}$3`);
  }
  
  // Update holdingsSource to sec-filing
  const sourceRegex = new RegExp(
    `(ticker:\\s*["']${ticker}["'][^}]*holdingsSource:\\s*["'])([^"']+)(["'])`,
    's'
  );
  if (sourceRegex.test(content)) {
    content = content.replace(sourceRegex, `$1sec-filing$3`);
  }
  
  fs.writeFileSync(COMPANIES_FILE, content);
  return true;
}

function gitCommit(updates) {
  if (updates.length === 0) return false;
  
  const tickers = updates.map(u => u.ticker).join(', ');
  const summary = updates.map(u => {
    const diff = u.newHoldings - u.previousHoldings;
    const sign = diff > 0 ? '+' : '';
    return `${u.ticker}: ${u.previousHoldings.toLocaleString()} → ${u.newHoldings.toLocaleString()} (${sign}${diff.toLocaleString()})`;
  }).join('\n');
  
  const message = `data: Update holdings from SEC filings

${summary}

Source: SEC EDGAR via dattracker.com/api/cron/sec-update`;

  try {
    execSync(`git add "${COMPANIES_FILE}"`, { stdio: 'pipe' });
    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { stdio: 'pipe' });
    console.log(`\n✅ Committed ${updates.length} update(s)`);
    return true;
  } catch (e) {
    console.error('Git commit failed:', e.message);
    return false;
  }
}

async function main() {
  console.log('🔍 Fetching SEC updates from API...\n');
  
  try {
    const result = await callSecUpdateAPI(tickersArg);
    
    if (!result.success) {
      console.error('API returned error:', result.error);
      process.exit(1);
    }
    
    // Show summary
    console.log('API Summary:');
    console.log(`  Checked: ${result.summary?.totalChecked || 0}`);
    console.log(`  Updated: ${result.summary?.updated || 0}`);
    console.log(`  Needs Review: ${result.summary?.needsReview || 0}`);
    console.log(`  Errors: ${result.summary?.errors || 0}`);
    if (result.summary?.extraction) {
      const x = result.summary.extraction;
      console.log(`  XBRL: ${x.xbrl?.success || 0}/${x.xbrl?.attempted || 0} success`);
      console.log(`  LLM:  ${x.llm?.success || 0}/${x.llm?.attempted || 0} success (${x.llm?.skipped || 0} skipped)`);
    }
    console.log('');
    
    // Collect updates to apply
    const updates = [];
    
    // Process "updated" items (high confidence, would auto-commit)
    if (result.updated?.length > 0) {
      console.log('📊 High-confidence updates:');
      for (const u of result.updated) {
        const diff = u.newHoldings - u.previousHoldings;
        const sign = diff > 0 ? '+' : '';
        console.log(`  ${u.ticker}: ${u.previousHoldings?.toLocaleString()} → ${u.newHoldings?.toLocaleString()} (${sign}${diff.toLocaleString()})`);
        console.log(`    Filed: ${u.filingDate} | Confidence: ${(u.confidence * 100).toFixed(0)}%`);
        updates.push(u);
      }
      console.log('');
    }
    
    // Process "needsReview" items (lower confidence)
    if (result.needsReview?.length > 0) {
      console.log('⚠️  Needs review (lower confidence):');
      for (const u of result.needsReview) {
        const diff = (u.newHoldings || 0) - (u.previousHoldings || 0);
        const sign = diff > 0 ? '+' : '';
        console.log(`  ${u.ticker}: ${u.previousHoldings?.toLocaleString()} → ${u.newHoldings?.toLocaleString()} (${sign}${diff.toLocaleString()})`);
        if (u.reasoning) {
          console.log(`    Reason: ${u.reasoning}`);
        }
        // Still include in updates - I can review the commit
        updates.push(u);
      }
      console.log('');
    }
    
    // Show errors
    if (result.errors?.length > 0) {
      console.log('❌ Errors:');
      for (const e of result.errors) {
        console.log(`  ${e.ticker}: ${e.error}`);
      }
      console.log('');
    }
    
    if (updates.length === 0) {
      console.log('✅ No updates needed.');
      return;
    }
    
    if (dryRun) {
      console.log(`🔍 DRY RUN - would apply ${updates.length} update(s)`);
      return;
    }
    
    // Apply updates
    console.log(`Applying ${updates.length} update(s)...`);
    const applied = [];
    
    for (const u of updates) {
      if (u.newHoldings === undefined || u.newHoldings === u.previousHoldings) {
        continue;
      }
      
      const filingDate = u.filingDate || new Date().toISOString().split('T')[0];
      const success = updateCompaniesFile(u.ticker, u.newHoldings, filingDate, 'sec-filing');
      
      if (success) {
        console.log(`  ✅ ${u.ticker}: Updated to ${u.newHoldings.toLocaleString()}`);
        applied.push(u);
      }
    }
    
    if (applied.length > 0) {
      gitCommit(applied);
      console.log('\n📤 Run `git push` to deploy.');
    } else {
      console.log('\nNo changes applied.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
