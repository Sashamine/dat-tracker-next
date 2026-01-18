// GET /api/db/companies - List all companies with current data
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const asset = searchParams.get('asset');
    const tier = searchParams.get('tier');

    let sql = `
      SELECT
        c.id,
        c.external_id,
        c.name,
        c.ticker,
        a.symbol as asset,
        c.tier,
        c.current_holdings as holdings,
        c.holdings_last_updated,
        c.holdings_source,
        c.website,
        c.twitter,
        c.tokenized_address,
        c.tokenized_chain,
        c.is_miner,
        c.dat_start_date,
        c.leader,
        c.strategy,
        c.notes,
        cf.cost_basis_avg,
        cf.staking_pct,
        cf.staking_apy,
        cf.staking_method,
        cf.quarterly_burn_usd,
        cf.capital_raised_atm,
        cf.capital_raised_pipe,
        cf.capital_raised_converts,
        cf.atm_remaining,
        cf.avg_daily_volume,
        cf.has_options,
        cf.options_oi,
        cf.market_cap,
        cf.leverage_ratio,
        cf.btc_mined_annual,
        cf.cash_reserves,
        cf.other_investments,
        cf.total_debt,
        cf.preferred_equity,
        c.pending_merger,
        c.expected_holdings,
        c.merger_expected_close
      FROM companies c
      LEFT JOIN assets a ON c.asset_id = a.id
      LEFT JOIN company_financials cf ON cf.company_id = c.id AND cf.end_date IS NULL
      WHERE c.is_active = true
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (asset) {
      sql += ` AND a.symbol = $${paramIndex}`;
      params.push(asset.toUpperCase());
      paramIndex++;
    }

    if (tier) {
      sql += ` AND c.tier = $${paramIndex}`;
      params.push(tier);
      paramIndex++;
    }

    sql += ` ORDER BY c.current_holdings DESC`;

    const companies = await query(sql, params);

    // Transform to match existing frontend format
    const formatted = companies.map(c => ({
      id: c.external_id,
      name: c.name,
      ticker: c.ticker,
      asset: c.asset,
      tier: parseInt(c.tier),
      holdings: parseFloat(c.holdings),
      holdingsLastUpdated: c.holdings_last_updated,
      holdingsSource: c.holdings_source,
      website: c.website,
      twitter: c.twitter,
      tokenizedAddress: c.tokenized_address,
      tokenizedChain: c.tokenized_chain,
      isMiner: c.is_miner,
      datStartDate: c.dat_start_date,
      leader: c.leader,
      strategy: c.strategy,
      notes: c.notes,
      costBasisAvg: c.cost_basis_avg ? parseFloat(c.cost_basis_avg) : undefined,
      stakingPct: c.staking_pct ? parseFloat(c.staking_pct) : undefined,
      stakingApy: c.staking_apy ? parseFloat(c.staking_apy) : undefined,
      stakingMethod: c.staking_method,
      quarterlyBurnUsd: c.quarterly_burn_usd ? parseFloat(c.quarterly_burn_usd) : undefined,
      capitalRaisedAtm: c.capital_raised_atm ? parseFloat(c.capital_raised_atm) : undefined,
      capitalRaisedPipe: c.capital_raised_pipe ? parseFloat(c.capital_raised_pipe) : undefined,
      capitalRaisedConverts: c.capital_raised_converts ? parseFloat(c.capital_raised_converts) : undefined,
      atmRemaining: c.atm_remaining ? parseFloat(c.atm_remaining) : undefined,
      avgDailyVolume: c.avg_daily_volume ? parseFloat(c.avg_daily_volume) : undefined,
      hasOptions: c.has_options,
      optionsOi: c.options_oi ? parseFloat(c.options_oi) : undefined,
      marketCap: c.market_cap ? parseFloat(c.market_cap) : undefined,
      leverageRatio: c.leverage_ratio ? parseFloat(c.leverage_ratio) : undefined,
      btcMinedAnnual: c.btc_mined_annual ? parseFloat(c.btc_mined_annual) : undefined,
      cashReserves: c.cash_reserves ? parseFloat(c.cash_reserves) : undefined,
      otherInvestments: c.other_investments ? parseFloat(c.other_investments) : undefined,
      totalDebt: c.total_debt ? parseFloat(c.total_debt) : undefined,
      preferredEquity: c.preferred_equity ? parseFloat(c.preferred_equity) : undefined,
      pendingMerger: c.pending_merger || false,
      expectedHoldings: c.expected_holdings ? parseFloat(c.expected_holdings) : undefined,
      mergerExpectedClose: c.merger_expected_close,
    }));

    return NextResponse.json({
      companies: formatted,
      count: formatted.length,
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}
