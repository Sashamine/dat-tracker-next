// Update company financials with EV calculation fields
// Run with: npx tsx scripts/update-financials.ts

import pg from 'pg';
import { allCompanies } from '../src/lib/data/companies';

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://postgres:mrxFcPGKlmiEZjhhUHhigixHtqBHaKBF@gondola.proxy.rlwy.net:10200/railway';

async function updateFinancials() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: false
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!\n');

    // Get company ID mapping from database
    const companiesResult = await client.query(`
      SELECT id, external_id, ticker FROM companies
    `);
    const companyMap: Record<string, number> = {};
    companiesResult.rows.forEach(row => {
      companyMap[row.external_id] = row.id;
      companyMap[row.ticker] = row.id;
      companyMap[row.ticker.toUpperCase()] = row.id;
    });
    console.log(`Loaded ${companiesResult.rows.length} companies from DB\n`);

    // Begin transaction
    await client.query('BEGIN');

    let updatedCount = 0;

    for (const company of allCompanies) {
      const companyDbId = companyMap[company.id] || companyMap[company.ticker];

      if (!companyDbId) {
        console.log(`  ⚠ ${company.ticker}: not found in database`);
        continue;
      }

      // Check if company has any EV-related fields to update
      const hasEvData = company.totalDebt || company.preferredEquity ||
                        company.cashReserves || company.otherInvestments ||
                        company.sharesOutstanding || company.marketCap;

      if (!hasEvData) {
        continue;
      }

      // Update the current financials record (where end_date IS NULL)
      const result = await client.query(`
        UPDATE company_financials
        SET
          total_debt = COALESCE($1, total_debt),
          preferred_equity = COALESCE($2, preferred_equity),
          cash_reserves = COALESCE($3, cash_reserves),
          other_investments = COALESCE($4, other_investments),
          shares_outstanding = COALESCE($5, shares_outstanding),
          market_cap = COALESCE($6, market_cap)
        WHERE company_id = $7 AND end_date IS NULL
        RETURNING id
      `, [
        company.totalDebt || null,
        company.preferredEquity || null,
        company.cashReserves || null,
        company.otherInvestments || null,
        company.sharesOutstanding || null,
        company.marketCap || null,
        companyDbId
      ]);

      if (result.rowCount && result.rowCount > 0) {
        updatedCount++;
        const fields = [];
        if (company.totalDebt) fields.push(`debt=$${(company.totalDebt/1e9).toFixed(1)}B`);
        if (company.preferredEquity) fields.push(`pref=$${(company.preferredEquity/1e9).toFixed(1)}B`);
        if (company.cashReserves) fields.push(`cash=$${(company.cashReserves/1e6).toFixed(0)}M`);
        if (company.marketCap) fields.push(`mcap=$${(company.marketCap/1e9).toFixed(1)}B`);
        console.log(`  ✓ ${company.ticker}: ${fields.join(', ')}`);
      } else {
        // No existing record - try to insert one
        const insertResult = await client.query(`
          INSERT INTO company_financials (
            company_id, effective_date,
            total_debt, preferred_equity, cash_reserves, other_investments,
            shares_outstanding, market_cap,
            cost_basis_avg, staking_pct, staking_apy, staking_method,
            quarterly_burn_usd, capital_raised_atm, capital_raised_pipe, capital_raised_converts,
            avg_daily_volume, has_options, options_oi, leverage_ratio, btc_mined_annual
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
          RETURNING id
        `, [
          companyDbId,
          new Date().toISOString().split('T')[0],
          company.totalDebt || null,
          company.preferredEquity || null,
          company.cashReserves || null,
          company.otherInvestments || null,
          company.sharesOutstanding || null,
          company.marketCap || null,
          company.costBasisAvg || null,
          company.stakingPct || null,
          company.stakingApy || null,
          company.stakingMethod || null,
          company.quarterlyBurnUsd || null,
          company.capitalRaisedAtm || null,
          company.capitalRaisedPipe || null,
          company.capitalRaisedConverts || null,
          company.avgDailyVolume || null,
          company.hasOptions || false,
          company.optionsOi || null,
          company.leverageRatio || null,
          company.btcMinedAnnual || null
        ]);

        if (insertResult.rowCount && insertResult.rowCount > 0) {
          updatedCount++;
          console.log(`  + ${company.ticker}: inserted new financials record`);
        }
      }
    }

    // Commit
    await client.query('COMMIT');

    console.log(`\n========================================`);
    console.log(`Updated ${updatedCount} company financials`);
    console.log(`========================================\n`);

    // Verify MSTR as a sanity check
    const mstrCheck = await client.query(`
      SELECT cf.total_debt, cf.preferred_equity, cf.cash_reserves, cf.market_cap
      FROM company_financials cf
      JOIN companies c ON cf.company_id = c.id
      WHERE c.ticker = 'MSTR' AND cf.end_date IS NULL
    `);

    if (mstrCheck.rows.length > 0) {
      const m = mstrCheck.rows[0];
      console.log('MSTR verification:');
      console.log(`  Total Debt: $${(parseFloat(m.total_debt)/1e9).toFixed(2)}B`);
      console.log(`  Preferred Equity: $${(parseFloat(m.preferred_equity)/1e9).toFixed(2)}B`);
      console.log(`  Cash Reserves: $${(parseFloat(m.cash_reserves)/1e9).toFixed(2)}B`);
      console.log(`  Market Cap: $${(parseFloat(m.market_cap)/1e9).toFixed(2)}B`);
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

updateFinancials();
