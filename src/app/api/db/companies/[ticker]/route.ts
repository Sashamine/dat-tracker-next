// GET /api/db/companies/[ticker] - Get single company with financials
import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;

    // Get company with financials
    const company = await queryOne(`
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
        c.logo_url,
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
        cf.total_debt,
        cf.preferred_equity,
        cf.shares_outstanding,
        cf.leverage_ratio,
        cf.btc_mined_annual,
        cf.cash_reserves,
        cf.other_investments,
        c.pending_merger,
        c.expected_holdings,
        c.merger_expected_close
      FROM companies c
      LEFT JOIN assets a ON c.asset_id = a.id
      LEFT JOIN company_financials cf ON cf.company_id = c.id AND cf.end_date IS NULL
      WHERE c.ticker = $1 AND c.is_active = true
    `, [ticker.toUpperCase()]);

    if (!company) {
      // Try case-insensitive search
      const altCompany = await queryOne(`
        SELECT c.*, a.symbol as asset
        FROM companies c
        LEFT JOIN assets a ON c.asset_id = a.id
        WHERE LOWER(c.ticker) = LOWER($1) AND c.is_active = true
      `, [ticker]);

      if (!altCompany) {
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        );
      }
    }

    const c = company;

    // Get recent holdings snapshots
    const holdings = await query(`
      SELECT
        holdings,
        shares_outstanding,
        holdings_per_share,
        source,
        source_document,
        snapshot_date,
        status
      FROM holdings_snapshots
      WHERE company_id = $1 AND status = 'approved'
      ORDER BY snapshot_date DESC
      LIMIT 20
    `, [c.id]);

    // Format response to match frontend expectations
    const formatted = {
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
      logoUrl: c.logo_url,
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
      totalDebt: c.total_debt ? parseFloat(c.total_debt) : undefined,
      preferredEquity: c.preferred_equity ? parseFloat(c.preferred_equity) : undefined,
      sharesOutstanding: c.shares_outstanding ? parseFloat(c.shares_outstanding) : undefined,
      leverageRatio: c.leverage_ratio ? parseFloat(c.leverage_ratio) : undefined,
      btcMinedAnnual: c.btc_mined_annual ? parseFloat(c.btc_mined_annual) : undefined,
      cashReserves: c.cash_reserves ? parseFloat(c.cash_reserves) : undefined,
      otherInvestments: c.other_investments ? parseFloat(c.other_investments) : undefined,
      pendingMerger: c.pending_merger || false,
      expectedHoldings: c.expected_holdings ? parseFloat(c.expected_holdings) : undefined,
      mergerExpectedClose: c.merger_expected_close,
    };

    // Format holdings history
    const holdingsHistory = holdings.map(h => ({
      date: h.snapshot_date,
      holdings: parseFloat(h.holdings),
      sharesOutstanding: h.shares_outstanding ? parseFloat(h.shares_outstanding) : null,
      holdingsPerShare: h.holdings_per_share ? parseFloat(h.holdings_per_share) : null,
      source: h.source_document || h.source,
    }));

    return NextResponse.json({
      company: formatted,
      holdingsHistory,
    });
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company' },
      { status: 500 }
    );
  }
}
