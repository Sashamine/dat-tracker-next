// GET /api/db/companies/[ticker] - Get single company from companies.ts with holdings history from DB
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCompanyByTicker } from '@/lib/data/companies';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;

    // Get company from companies.ts (source of truth)
    const company = getCompanyByTicker(ticker.toUpperCase());

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Get recent holdings snapshots from database (historical data for charts)
    let holdingsHistory: any[] = [];
    try {
      // Need to find company ID in database for historical data
      const dbCompany = await query(
        `SELECT id FROM companies WHERE ticker = $1`,
        [ticker.toUpperCase()]
      );

      if (dbCompany && dbCompany.length > 0) {
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
        `, [dbCompany[0].id]);

        holdingsHistory = holdings.map((h: any) => ({
          date: h.snapshot_date,
          holdings: parseFloat(h.holdings),
          sharesOutstanding: h.shares_outstanding ? parseFloat(h.shares_outstanding) : null,
          holdingsPerShare: h.holdings_per_share ? parseFloat(h.holdings_per_share) : null,
          source: h.source_document || h.source,
        }));
      }
    } catch (dbError) {
      // Database might not be available, continue without historical data
      console.log('Could not fetch holdings history from database:', dbError);
    }

    // Format response to match frontend expectations
    const formatted = {
      id: company.id,
      name: company.name,
      ticker: company.ticker,
      asset: company.asset,
      tier: company.tier,
      holdings: company.holdings,
      holdingsLastUpdated: company.holdingsLastUpdated,
      holdingsSource: company.holdingsSource,
      holdingsSourceUrl: company.holdingsSourceUrl,
      website: company.website,
      twitter: company.twitter,
      logoUrl: company.logoUrl,
      tokenizedAddress: company.tokenizedAddress,
      tokenizedChain: company.tokenizedChain,
      isMiner: company.isMiner,
      datStartDate: company.datStartDate,
      leader: company.leader,
      strategy: company.strategy,
      notes: company.notes,
      costBasisAvg: company.costBasisAvg,
      stakingPct: company.stakingPct,
      stakingApy: company.stakingApy,
      stakingMethod: company.stakingMethod,
      quarterlyBurnUsd: company.quarterlyBurnUsd,
      capitalRaisedAtm: company.capitalRaisedAtm,
      capitalRaisedPipe: company.capitalRaisedPipe,
      capitalRaisedConverts: company.capitalRaisedConverts,
      atmRemaining: company.atmRemaining,
      avgDailyVolume: company.avgDailyVolume,
      hasOptions: company.hasOptions,
      optionsOi: company.optionsOi,
      marketCap: company.marketCap,
      totalDebt: company.totalDebt,
      preferredEquity: company.preferredEquity,
      sharesOutstandingFD: company.sharesOutstandingFD,
      sharesForMnav: company.sharesForMnav,
      leverageRatio: company.leverageRatio,
      btcMinedAnnual: company.btcMinedAnnual,
      cashReserves: company.cashReserves,
      otherInvestments: company.otherInvestments,
      pendingMerger: company.pendingMerger || false,
      expectedHoldings: company.expectedHoldings,
      mergerExpectedClose: company.mergerExpectedClose,
      lowLiquidity: company.lowLiquidity,
      secondaryCryptoHoldings: company.secondaryCryptoHoldings,
      cryptoInvestments: company.cryptoInvestments,
      secReferenced: company.secReferenced,
      dataWarnings: company.dataWarnings,
    };

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
