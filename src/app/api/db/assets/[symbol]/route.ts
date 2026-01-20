// GET /api/db/assets/[symbol] - Get asset with its companies
import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;

    // Get asset
    const asset = await queryOne(`
      SELECT id, symbol, name, coingecko_id, binance_symbol
      FROM assets
      WHERE UPPER(symbol) = UPPER($1)
    `, [symbol]);

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    // Get companies for this asset
    const companies = await query(`
      SELECT
        c.external_id,
        c.name,
        c.ticker,
        c.tier,
        c.current_holdings as holdings,
        c.holdings_last_updated,
        c.is_miner,
        c.leader,
        cf.market_cap,
        cf.staking_pct,
        cf.has_options,
        cf.cash_reserves,
        cf.other_investments,
        c.pending_merger,
        c.expected_holdings,
        c.merger_expected_close,
        c.notes
      FROM companies c
      LEFT JOIN company_financials cf ON cf.company_id = c.id AND cf.end_date IS NULL
      WHERE c.asset_id = $1 AND c.is_active = true
      ORDER BY c.current_holdings DESC
    `, [asset.id]);

    const formattedCompanies = companies.map(c => ({
      id: c.external_id,
      name: c.name,
      ticker: c.ticker,
      tier: parseInt(c.tier),
      holdings: parseFloat(c.holdings),
      holdingsLastUpdated: c.holdings_last_updated,
      isMiner: c.is_miner,
      leader: c.leader,
      marketCap: c.market_cap ? parseFloat(c.market_cap) : null,
      stakingPct: c.staking_pct ? parseFloat(c.staking_pct) : null,
      hasOptions: c.has_options,
      cashReserves: c.cash_reserves ? parseFloat(c.cash_reserves) : null,
      otherInvestments: c.other_investments ? parseFloat(c.other_investments) : null,
      pendingMerger: c.pending_merger || false,
      expectedHoldings: c.expected_holdings ? parseFloat(c.expected_holdings) : null,
      mergerExpectedClose: c.merger_expected_close,
      notes: c.notes,
    }));

    const totalHoldings = formattedCompanies.reduce((sum, c) => sum + c.holdings, 0);

    return NextResponse.json({
      asset: {
        symbol: asset.symbol,
        name: asset.name,
        coingeckoId: asset.coingecko_id,
        binanceSymbol: asset.binance_symbol,
      },
      companies: formattedCompanies,
      totalHoldings,
      companyCount: formattedCompanies.length,
    });
  } catch (error) {
    console.error('Error fetching asset:', error);
    return NextResponse.json(
      { error: 'Failed to fetch asset' },
      { status: 500 }
    );
  }
}
