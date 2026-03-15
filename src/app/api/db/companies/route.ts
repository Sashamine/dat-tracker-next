// GET /api/db/companies - List all companies with D1 overlay applied server-side.
// Returns D1-overlaid data so the client renders correct values on first paint
// (no flash of stale static data).
import { NextResponse } from 'next/server';
import { allCompanies } from '@/lib/data/companies';
import { getLatestMetrics } from '@/lib/d1';
import { CORE_D1_METRICS } from '@/lib/metrics';
import { applyD1Overlay, type D1MetricMap, type D1MetricSourceMap, type D1MetricDateMap, type D1MetricQuoteMap, type D1MetricSearchTermMap, type D1MetricAccessionMap } from '@/lib/d1-overlay';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const asset = searchParams.get('asset')?.toUpperCase();
    const tier = searchParams.get('tier');

    // Filter companies based on query params
    let companies = [...allCompanies];

    if (asset) {
      companies = companies.filter(c => c.asset === asset);
    }

    if (tier) {
      companies = companies.filter(c => c.tier === parseInt(tier));
    }

    // Fetch D1 metrics for all tickers and apply overlay server-side.
    // This eliminates the flash of stale static data on first render.
    let overlaidCompanies = companies;
    try {
      const tickers = companies.map(c => c.ticker);
      const allRows = await Promise.all(
        tickers.map(async (ticker) => {
          const rows = await getLatestMetrics(ticker, [...CORE_D1_METRICS]);
          return [ticker, rows] as const;
        })
      );

      // Transform into the overlay map shapes
      const values: D1MetricMap = {};
      const sources: D1MetricSourceMap = {};
      const dates: D1MetricDateMap = {};
      const quotes: D1MetricQuoteMap = {};
      const searchTerms: D1MetricSearchTermMap = {};
      const accessions: D1MetricAccessionMap = {};

      for (const [ticker, rows] of allRows) {
        const vMap: Record<string, number> = {};
        const sMap: Record<string, string | null> = {};
        const dMap: Record<string, string | null> = {};
        const qMap: Record<string, string | null> = {};
        const stMap: Record<string, string | null> = {};
        const aMap: Record<string, string | null> = {};
        for (const row of rows) {
          vMap[row.metric] = row.value;
          sMap[row.metric] = row.artifact?.source_url ?? null;
          dMap[row.metric] = row.as_of ?? row.reported_at ?? null;
          qMap[row.metric] = row.citation_quote ?? null;
          stMap[row.metric] = row.citation_search_term ?? null;
          aMap[row.metric] = row.artifact?.accession ?? null;
        }
        values[ticker] = vMap;
        sources[ticker] = sMap;
        dates[ticker] = dMap;
        quotes[ticker] = qMap;
        searchTerms[ticker] = stMap;
        accessions[ticker] = aMap;
      }

      overlaidCompanies = applyD1Overlay(companies, values, sources, dates, quotes, searchTerms, accessions);
    } catch (d1Error) {
      // D1 failure is non-fatal — fall back to static data
      console.error('[/api/db/companies] D1 overlay failed, using static data:', d1Error);
    }

    // Sort by holdings descending
    overlaidCompanies = overlaidCompanies.sort((a, b) => b.holdings - a.holdings);

    // Format to match existing frontend expectations
    const formatted = overlaidCompanies.map(c => ({
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
      costBasisSource: c.costBasisSource,
      costBasisSourceUrl: c.costBasisSourceUrl,
      costBasisAsOf: c.costBasisAsOf,
      stakingPct: c.stakingPct,
      stakingApy: c.stakingApy,
      stakingMethod: c.stakingMethod,
      stakingSource: c.stakingSource,
      stakingSourceUrl: c.stakingSourceUrl,
      stakingAsOf: c.stakingAsOf,
      quarterlyBurnUsd: c.quarterlyBurnUsd,
      burnEstimated: c.burnEstimated,
      burnMethodology: c.burnMethodology,
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
      sharesAsOf: c.sharesAsOf,
      debtAsOf: c.debtAsOf,
      cashAsOf: c.cashAsOf,
      preferredAsOf: c.preferredAsOf,
      sharesSourceUrl: c.sharesSourceUrl,
      sharesSourceQuote: c.sharesSourceQuote,
      sharesSearchTerm: c.sharesSearchTerm,
      debtSourceUrl: c.debtSourceUrl,
      debtSourceQuote: c.debtSourceQuote,
      debtSearchTerm: c.debtSearchTerm,
      cashSourceUrl: c.cashSourceUrl,
      cashSourceQuote: c.cashSourceQuote,
      cashSearchTerm: c.cashSearchTerm,
      preferredSourceUrl: c.preferredSourceUrl,
      preferredSourceQuote: c.preferredSourceQuote,
      preferredSearchTerm: c.preferredSearchTerm,
      sourceQuote: c.sourceQuote,
      sourceSearchTerm: c.sourceSearchTerm,
      pendingMerger: c.pendingMerger || false,
      expectedHoldings: c.expectedHoldings,
      mergerExpectedClose: c.mergerExpectedClose,
      lowLiquidity: c.lowLiquidity,
      secondaryCryptoHoldings: c.secondaryCryptoHoldings,
      cryptoInvestments: c.cryptoInvestments,
      secReferenced: c.secReferenced,
      dataWarnings: c.dataWarnings,
      holdingsBasis: c.holdingsBasis,
      _d1Fields: c._d1Fields,
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
