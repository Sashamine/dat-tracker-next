// Data migration script - seeds database from TypeScript files
// Run with: npx tsx scripts/seed-data.ts

import pg from 'pg';
import { allCompanies } from '../src/lib/data/companies';
import { HOLDINGS_HISTORY } from '../src/lib/data/holdings-history';

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://postgres:mrxFcPGKlmiEZjhhUHhigixHtqBHaKBF@gondola.proxy.rlwy.net:10200/railway';

async function seedData() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: false
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!\n');

    // Get asset ID mapping
    const assetsResult = await client.query('SELECT id, symbol FROM assets');
    const assetMap: Record<string, number> = {};
    assetsResult.rows.forEach(row => {
      assetMap[row.symbol] = row.id;
    });
    console.log(`Loaded ${Object.keys(assetMap).length} assets\n`);

    // Begin transaction
    await client.query('BEGIN');

    // ============================================
    // SEED COMPANIES
    // ============================================
    console.log('Seeding companies...\n');

    let companyCount = 0;
    let financialsCount = 0;
    const companyIdMap: Record<string, number> = {}; // external_id -> db id

    for (const company of allCompanies) {
      const assetId = assetMap[company.asset];
      if (!assetId) {
        console.log(`  ⚠ Skipping ${company.ticker}: unknown asset ${company.asset}`);
        continue;
      }

      // Check if company already exists
      const existing = await client.query(
        'SELECT id FROM companies WHERE external_id = $1',
        [company.id]
      );

      let companyDbId: number;

      if (existing.rows.length > 0) {
        companyDbId = existing.rows[0].id;
        console.log(`  ⊘ ${company.ticker} already exists`);
      } else {
        // Insert company
        const result = await client.query(`
          INSERT INTO companies (
            external_id, name, ticker, asset_id, tier,
            current_holdings, holdings_last_updated, holdings_source,
            website, twitter, logo_url,
            tokenized_address, tokenized_chain,
            is_miner, dat_start_date,
            leader, strategy, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          RETURNING id
        `, [
          company.id,
          company.name,
          company.ticker,
          assetId,
          String(company.tier),
          company.holdings,
          company.holdingsLastUpdated || null,
          company.holdingsSource || 'manual',
          company.website || null,
          company.twitter || null,
          company.logoUrl || null,
          company.tokenizedAddress || null,
          company.tokenizedChain || null,
          company.isMiner || false,
          company.datStartDate || null,
          company.leader || null,
          company.strategy || null,
          company.notes || null
        ]);

        companyDbId = result.rows[0].id;
        companyCount++;
        console.log(`  ✓ ${company.ticker} (${company.name})`);
      }

      companyIdMap[company.id] = companyDbId;
      companyIdMap[company.ticker] = companyDbId;
      companyIdMap[company.ticker.toUpperCase()] = companyDbId;

      // Insert financials (if any financial data exists)
      const hasFinancials = company.costBasisAvg || company.stakingPct ||
        company.quarterlyBurnUsd || company.capitalRaisedAtm ||
        company.capitalRaisedPipe || company.capitalRaisedConverts ||
        company.avgDailyVolume || company.marketCap;

      if (hasFinancials) {
        // Check if financials exist for today
        const today = new Date().toISOString().split('T')[0];
        const existingFin = await client.query(
          'SELECT id FROM company_financials WHERE company_id = $1 AND effective_date = $2',
          [companyDbId, today]
        );

        if (existingFin.rows.length === 0) {
          await client.query(`
            INSERT INTO company_financials (
              company_id, effective_date,
              cost_basis_avg, staking_pct, staking_apy, staking_method,
              quarterly_burn_usd, burn_source,
              capital_raised_atm, capital_raised_pipe, capital_raised_converts,
              atm_remaining, avg_issuance_premium,
              avg_daily_volume, has_options, options_oi,
              market_cap, leverage_ratio,
              btc_mined_annual, btc_acquired_ytd,
              total_debt, preferred_equity, cash_reserves, other_investments
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
          `, [
            companyDbId,
            today,
            company.costBasisAvg || null,
            company.stakingPct || null,
            company.stakingApy || null,
            company.stakingMethod || null,
            company.quarterlyBurnUsd || null,
            company.burnSource || null,
            company.capitalRaisedAtm || null,
            company.capitalRaisedPipe || null,
            company.capitalRaisedConverts || null,
            company.atmRemaining || null,
            company.avgIssuancePremium || null,
            company.avgDailyVolume || null,
            company.hasOptions || false,
            company.optionsOi || null,
            company.marketCap || null,
            company.leverageRatio || null,
            company.btcMinedAnnual || null,
            company.btcAcquired2025 || null,
            company.totalDebt || null,
            company.preferredEquity || null,
            company.cashReserves || null,
            company.otherInvestments || null
          ]);
          financialsCount++;
        }
      }
    }

    console.log(`\nCompanies: ${companyCount} inserted`);
    console.log(`Financials: ${financialsCount} inserted\n`);

    // ============================================
    // SEED HOLDINGS HISTORY
    // ============================================
    console.log('Seeding holdings history...\n');

    let snapshotCount = 0;

    for (const [ticker, historyData] of Object.entries(HOLDINGS_HISTORY)) {
      const companyDbId = companyIdMap[ticker] || companyIdMap[ticker.toUpperCase()];

      if (!companyDbId) {
        console.log(`  ⚠ Skipping ${ticker}: company not found in database`);
        continue;
      }

      for (const snapshot of historyData.history) {
        // Check if snapshot already exists
        const existing = await client.query(
          'SELECT id FROM holdings_snapshots WHERE company_id = $1 AND snapshot_date = $2',
          [companyDbId, snapshot.date]
        );

        if (existing.rows.length > 0) {
          continue; // Skip existing
        }

        // Determine source type
        let sourceType: string = 'manual';
        if (snapshot.source) {
          if (snapshot.source.includes('10-Q') || snapshot.source.includes('10-K')) {
            sourceType = snapshot.source.includes('10-Q') ? '10-Q filing' : '10-K filing';
          } else if (snapshot.source.includes('8-K')) {
            sourceType = '8-K filing';
          } else if (snapshot.source.toLowerCase().includes('press')) {
            sourceType = 'press release';
          } else if (snapshot.source.includes('HKEX') || snapshot.source.includes('TSE')) {
            sourceType = 'exchange filing';
          }
        }

        await client.query(`
          INSERT INTO holdings_snapshots (
            company_id, holdings, shares_outstanding, holdings_per_share,
            source, source_document, snapshot_date,
            status, reviewed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        `, [
          companyDbId,
          snapshot.holdings,
          snapshot.sharesOutstandingDiluted,
          snapshot.holdingsPerShare,
          sourceType,
          snapshot.source || null,
          snapshot.date,
          'approved' // Historical data is pre-approved
        ]);

        snapshotCount++;
      }

      console.log(`  ✓ ${ticker}: ${historyData.history.length} snapshots`);
    }

    console.log(`\nSnapshots: ${snapshotCount} inserted\n`);

    // Commit transaction
    await client.query('COMMIT');

    // ============================================
    // SUMMARY
    // ============================================
    console.log('========================================');
    console.log('Data migration complete!');
    console.log('========================================\n');

    // Get counts
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM companies) as companies,
        (SELECT COUNT(*) FROM company_financials) as financials,
        (SELECT COUNT(*) FROM holdings_snapshots) as snapshots,
        (SELECT COUNT(*) FROM assets) as assets
    `);

    const c = counts.rows[0];
    console.log('Database totals:');
    console.log(`  Companies: ${c.companies}`);
    console.log(`  Financials: ${c.financials}`);
    console.log(`  Holdings Snapshots: ${c.snapshots}`);
    console.log(`  Assets: ${c.assets}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedData();
