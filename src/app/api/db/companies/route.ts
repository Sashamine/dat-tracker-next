// GET /api/db/companies - List all companies from companies.ts (source of truth)
import { NextResponse } from 'next/server';
import { allCompanies } from '@/lib/data/companies';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const asset = searchParams.get('asset')?.toUpperCase();
    const tier = searchParams.get('tier');

    // Filter companies based on query params
    let companies = allCompanies;

    if (asset) {
      companies = companies.filter(c => c.asset === asset);
    }

    if (tier) {
      companies = companies.filter(c => c.tier === parseInt(tier));
    }

    // Sort by holdings descending
    companies = [...companies].sort((a, b) => b.holdings - a.holdings);

    // Format to match existing frontend expectations
    const formatted = companies.map(c => ({
      id: c.id,
      name: c.name,
      ticker: c.ticker,
      asset: c.asset,
      tier: c.tier,
      holdings: c.holdings,
      holdingsLastUpdated: c.holdingsLastUpdated,
      holdingsSource: c.holdingsSource,
      holdingsSourceUrl: c.holdingsSourceUrl,
      website: c.website,
      twitter: c.twitter,
      tokenizedAddress: c.tokenizedAddress,
      tokenizedChain: c.tokenizedChain,
      isMiner: c.isMiner,
      datStartDate: c.datStartDate,
      leader: c.leader,
      strategy: c.strategy,
      notes: c.notes,
      costBasisAvg: c.costBasisAvg,
      stakingPct: c.stakingPct,
      stakingApy: c.stakingApy,
      stakingMethod: c.stakingMethod,
      quarterlyBurnUsd: c.quarterlyBurnUsd,
      burnEstimated: c.burnEstimated,
      capitalRaisedAtm: c.capitalRaisedAtm,
      capitalRaisedPipe: c.capitalRaisedPipe,
      capitalRaisedConverts: c.capitalRaisedConverts,
      atmRemaining: c.atmRemaining,
      avgDailyVolume: c.avgDailyVolume,
      hasOptions: c.hasOptions,
      optionsOi: c.optionsOi,
      marketCap: c.marketCap,
      leverageRatio: c.leverageRatio,
      btcMinedAnnual: c.btcMinedAnnual,
      cashReserves: c.cashReserves,
      restrictedCash: c.restrictedCash,
      otherInvestments: c.otherInvestments,
      totalDebt: c.totalDebt,
      preferredEquity: c.preferredEquity,
      preferredDividendAnnual: c.preferredDividendAnnual,
      sharesForMnav: c.sharesForMnav,
      sharesOutstandingFD: c.sharesOutstandingFD,
      pendingMerger: c.pendingMerger || false,
      expectedHoldings: c.expectedHoldings,
      mergerExpectedClose: c.mergerExpectedClose,
      lowLiquidity: c.lowLiquidity,
      secondaryCryptoHoldings: c.secondaryCryptoHoldings,
      cryptoInvestments: c.cryptoInvestments,
      secReferenced: c.secReferenced,
      dataWarnings: c.dataWarnings,
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
