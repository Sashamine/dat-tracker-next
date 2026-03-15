import { NextRequest, NextResponse } from 'next/server';
import { getEntities, getLatestMetrics } from '@/lib/d1';
import { CORE_D1_METRICS } from '@/lib/metrics';
import { calculateMNAV } from '@/lib/calculations/mnav';
import { getEffectiveSharesFromD1 } from '@/lib/d1-read';

/**
 * GET /api/v1/metrics/mnav?cryptoPrices=BTC:88000,ETH:3200&stockPrices=MSTR:160,KULR:3
 *
 * Returns mNAV leaderboard for all companies.
 * Requires cryptoPrices and stockPrices as comma-separated key:value pairs.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse price inputs
    const cryptoPrices = parsePrices(searchParams.get('cryptoPrices'));
    const stockPrices = parsePrices(searchParams.get('stockPrices'));

    if (Object.keys(cryptoPrices).length === 0) {
      return NextResponse.json(
        { success: false, error: 'cryptoPrices query param required (e.g. cryptoPrices=BTC:88000,ETH:3200)' },
        { status: 400 }
      );
    }

    const entities = await getEntities();

    const results = await Promise.all(
      entities.map(async (entity) => {
        const ticker = entity.entity_id;
        const cryptoPrice = cryptoPrices[entity.asset.toUpperCase()];
        if (!cryptoPrice) return null;

        const metrics = await getLatestMetrics(ticker, [...CORE_D1_METRICS]);
        const byMetric: Record<string, number> = {};
        for (const m of metrics) byMetric[m.metric] = m.value;

        const holdings = byMetric.holdings_native ?? 0;
        const basicShares = byMetric.basic_shares ?? 0;
        const totalDebt = byMetric.debt_usd ?? 0;
        const cashReserves = byMetric.cash_usd ?? 0;
        const preferredEquity = byMetric.preferred_equity_usd ?? 0;
        const restrictedCash = byMetric.restricted_cash_usd ?? 0;

        const stockPrice = stockPrices[ticker];
        if (!stockPrice || basicShares <= 0 || holdings <= 0) return null;

        const effectiveShares = await getEffectiveSharesFromD1(ticker, basicShares, stockPrice);
        const marketCap = effectiveShares.diluted * stockPrice;
        const adjustedDebt = Math.max(0, totalDebt - effectiveShares.inTheMoneyDebtValue);
        const adjustedCash = cashReserves + effectiveShares.inTheMoneyWarrantProceeds;

        const mnav = calculateMNAV(
          marketCap, holdings, cryptoPrice,
          adjustedCash, 0, adjustedDebt, preferredEquity, restrictedCash,
        );

        if (mnav === null) return null;

        return {
          ticker,
          name: entity.name,
          asset: entity.asset,
          mnav: Math.round(mnav * 1000) / 1000,
          holdings,
          marketCap: Math.round(marketCap),
          cryptoNav: Math.round(holdings * cryptoPrice),
        };
      })
    );

    const valid = results.filter(Boolean).sort((a, b) => a!.mnav - b!.mnav);

    return NextResponse.json({
      success: true,
      count: valid.length,
      results: valid,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

function parsePrices(input: string | null): Record<string, number> {
  if (!input) return {};
  const result: Record<string, number> = {};
  for (const pair of input.split(',')) {
    const [key, val] = pair.split(':');
    if (key && val) {
      const num = parseFloat(val);
      if (!isNaN(num)) result[key.toUpperCase()] = num;
    }
  }
  return result;
}

export const runtime = 'nodejs';
export const maxDuration = 60;
