/**
 * Backfill Verification State from holdings-history.ts
 *
 * Populates verified_baselines table with latest snapshots from holdings-history.ts
 * This establishes the initial baseline for each company/field.
 *
 * Run with: npx tsx scripts/backfill-verification-state.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { HOLDINGS_HISTORY } from '../src/lib/data/holdings-history';
import { allCompanies } from '../src/lib/data/companies';
import { COMPANY_SOURCES } from '../src/lib/data/company-sources';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

interface BackfillStats {
  holdings: number;
  shares: number;
  debt: number;
  cash: number;
  preferred: number;
  skipped: number;
}

async function backfillVerificationState() {
  const client = await pool.connect();
  const stats: BackfillStats = {
    holdings: 0,
    shares: 0,
    debt: 0,
    cash: 0,
    preferred: 0,
    skipped: 0,
  };

  try {
    console.log('Backfilling verification state from holdings-history.ts...\n');

    // Process each company in HOLDINGS_HISTORY
    for (const [ticker, companyHistory] of Object.entries(HOLDINGS_HISTORY)) {
      const history = companyHistory.history;
      if (!history || history.length === 0) {
        console.log(`  [${ticker}] No history, skipping`);
        stats.skipped++;
        continue;
      }

      // Get latest snapshot
      const latest = history[history.length - 1];
      const companySources = COMPANY_SOURCES[ticker];

      console.log(`  [${ticker}] Processing...`);

      // Determine source URL and type
      let sourceUrl = latest.sourceUrl;
      let sourceType = latest.sourceType || 'sec-filing';

      // If no sourceUrl, try to construct from company sources
      if (!sourceUrl && companySources?.secFilingsUrl) {
        sourceUrl = companySources.secFilingsUrl;
      } else if (!sourceUrl) {
        sourceUrl = `https://www.sec.gov/cgi-bin/browse-edgar?company=${ticker}`;
      }

      // Determine extraction method based on source
      const extractionMethod = latest.sourceType === 'sec-filing' ? 'xbrl'
        : latest.sourceType === 'company-website' ? 'fetcher'
        : 'manual';

      // Determine confidence
      const confidence = latest.confidence || 'medium';

      // 1. Insert holdings baseline
      if (latest.holdings !== undefined) {
        await client.query(
          `INSERT INTO verified_baselines (
            ticker, field, value, value_date,
            source_type, source_url, extraction_method,
            verified_by, confidence, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (ticker, field, value_date)
          DO UPDATE SET
            value = EXCLUDED.value,
            source_url = EXCLUDED.source_url,
            updated_at = NOW()`,
          [
            ticker,
            'holdings',
            latest.holdings,
            latest.date,
            sourceType,
            sourceUrl,
            extractionMethod,
            'auto',
            confidence,
            latest.source || null,
          ]
        );
        stats.holdings++;
      }

      // 2. Insert shares_outstanding baseline
      if (latest.sharesOutstanding !== undefined) {
        const sharesDate = latest.sharesAsOf || latest.date;
        const sharesSourceUrl = companySources?.secFilingsUrl || sourceUrl;

        await client.query(
          `INSERT INTO verified_baselines (
            ticker, field, value, value_date,
            source_type, source_url, extraction_method,
            verified_by, confidence, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (ticker, field, value_date)
          DO UPDATE SET
            value = EXCLUDED.value,
            source_url = EXCLUDED.source_url,
            updated_at = NOW()`,
          [
            ticker,
            'shares_outstanding',
            latest.sharesOutstanding,
            sharesDate,
            'sec-filing',
            sharesSourceUrl,
            'xbrl',
            'auto',
            confidence,
            latest.sharesSource || latest.methodology || null,
          ]
        );
        stats.shares++;
      }
    }

    // Process companies.ts for debt, cash, preferred equity
    console.log('\nBackfilling from companies.ts...\n');

    for (const company of allCompanies) {
      const companySources = COMPANY_SOURCES[company.ticker];
      const secUrl = companySources?.secFilingsUrl ||
        `https://www.sec.gov/cgi-bin/browse-edgar?company=${company.ticker}`;

      // 3. Insert debt baseline
      if (company.totalDebt !== undefined && company.totalDebt > 0) {
        const debtDate = company.debtAsOf || company.holdingsLastUpdated || new Date().toISOString().split('T')[0];
        await client.query(
          `INSERT INTO verified_baselines (
            ticker, field, value, value_date,
            source_type, source_url, extraction_method,
            verified_by, confidence, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (ticker, field, value_date)
          DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = NOW()`,
          [
            company.ticker,
            'total_debt',
            company.totalDebt,
            debtDate,
            'sec-filing',
            secUrl,
            'xbrl',
            'auto',
            'medium',
            company.debtSource || null,
          ]
        );
        stats.debt++;
        console.log(`  [${company.ticker}] debt: $${(company.totalDebt / 1e9).toFixed(2)}B`);
      }

      // 4. Insert cash baseline
      if (company.cashReserves !== undefined && company.cashReserves > 0) {
        const cashDate = company.cashAsOf || company.holdingsLastUpdated || new Date().toISOString().split('T')[0];
        await client.query(
          `INSERT INTO verified_baselines (
            ticker, field, value, value_date,
            source_type, source_url, extraction_method,
            verified_by, confidence, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (ticker, field, value_date)
          DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = NOW()`,
          [
            company.ticker,
            'cash',
            company.cashReserves,
            cashDate,
            'sec-filing',
            secUrl,
            'xbrl',
            'auto',
            'medium',
            company.cashSource || null,
          ]
        );
        stats.cash++;
        console.log(`  [${company.ticker}] cash: $${(company.cashReserves / 1e6).toFixed(1)}M`);
      }

      // 5. Insert preferred equity baseline
      if (company.preferredEquity !== undefined && company.preferredEquity > 0) {
        const prefDate = company.debtAsOf || company.holdingsLastUpdated || new Date().toISOString().split('T')[0];
        await client.query(
          `INSERT INTO verified_baselines (
            ticker, field, value, value_date,
            source_type, source_url, extraction_method,
            verified_by, confidence, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (ticker, field, value_date)
          DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = NOW()`,
          [
            company.ticker,
            'preferred_equity',
            company.preferredEquity,
            prefDate,
            'sec-filing',
            secUrl,
            'xbrl',
            'auto',
            'medium',
            null,
          ]
        );
        stats.preferred++;
        console.log(`  [${company.ticker}] preferred: $${(company.preferredEquity / 1e9).toFixed(2)}B`);
      }
    }

    // Initialize company_filing_checks for all companies
    console.log('\nInitializing company filing check state...\n');

    const allTickers = new Set([
      ...Object.keys(HOLDINGS_HISTORY),
      ...allCompanies.map(c => c.ticker),
    ]);

    for (const ticker of allTickers) {
      await client.query(
        `INSERT INTO company_filing_checks (ticker, needs_review)
         VALUES ($1, false)
         ON CONFLICT (ticker) DO NOTHING`,
        [ticker]
      );
    }

    console.log(`  Initialized ${allTickers.size} companies\n`);

    // Print summary
    console.log('═'.repeat(50));
    console.log('BACKFILL COMPLETE');
    console.log('═'.repeat(50));
    console.log(`  Holdings baselines:  ${stats.holdings}`);
    console.log(`  Shares baselines:    ${stats.shares}`);
    console.log(`  Debt baselines:      ${stats.debt}`);
    console.log(`  Cash baselines:      ${stats.cash}`);
    console.log(`  Preferred baselines: ${stats.preferred}`);
    console.log(`  Skipped (no data):   ${stats.skipped}`);
    console.log('═'.repeat(50));

    // Verify
    const countResult = await client.query(
      `SELECT field, COUNT(*) as count
       FROM verified_baselines
       GROUP BY field
       ORDER BY field`
    );
    console.log('\nVerification (baselines by field):');
    countResult.rows.forEach(row => {
      console.log(`  ${row.field}: ${row.count}`);
    });

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

backfillVerificationState();
