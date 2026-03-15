import { NextRequest, NextResponse } from 'next/server';
import { getEntity, getLatestMetrics, getAllInstruments } from '@/lib/d1';
import { CORE_D1_METRICS } from '@/lib/metrics';
import { calculateMNAVExtended } from '@/lib/calculations/mnav';
import { getEffectiveSharesFromD1 } from '@/lib/d1-read';

/**
 * GET /api/v1/companies/:ticker/mnav?stockPrice=X&cryptoPrice=Y
 *
 * Returns current mNAV calculation with full input breakdown.
 * Both stockPrice and cryptoPrice are required query params.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const entityId = ticker.toUpperCase();
    const { searchParams } = new URL(request.url);

    const stockPrice = parseFloat(searchParams.get('stockPrice') ?? '');
    const cryptoPrice = parseFloat(searchParams.get('cryptoPrice') ?? '');

    if (isNaN(stockPrice) || isNaN(cryptoPrice)) {
      return NextResponse.json(
        { success: false, error: 'stockPrice and cryptoPrice query params are required' },
        { status: 400 }
      );
    }

    const [entity, metrics] = await Promise.all([
      getEntity(entityId),
      getLatestMetrics(entityId, [...CORE_D1_METRICS]),
    ]);

    if (!entity) {
      return NextResponse.json(
        { success: false, error: `Company ${entityId} not found` },
        { status: 404 }
      );
    }

    // Extract metric values
    const byMetric: Record<string, number> = {};
    const byMetricDate: Record<string, string | null> = {};
    for (const m of metrics) {
      byMetric[m.metric] = m.value;
      byMetricDate[m.metric] = m.as_of;
    }

    const holdings = byMetric.holdings_native ?? 0;
    const basicShares = byMetric.basic_shares ?? 0;
    const totalDebt = byMetric.debt_usd ?? 0;
    const cashReserves = byMetric.cash_usd ?? 0;
    const preferredEquity = byMetric.preferred_equity_usd ?? 0;
    const restrictedCash = byMetric.restricted_cash_usd ?? 0;

    // Calculate diluted shares and ITM debt adjustment from D1 instruments
    const effectiveShares = await getEffectiveSharesFromD1(entityId, basicShares, stockPrice);
    const marketCap = effectiveShares.diluted * stockPrice;
    const adjustedDebt = Math.max(0, totalDebt - effectiveShares.inTheMoneyDebtValue);
    const adjustedCash = cashReserves + effectiveShares.inTheMoneyWarrantProceeds;

    const result = calculateMNAVExtended(
      marketCap,
      holdings,
      cryptoPrice,
      adjustedCash,
      0, // otherInvestments
      adjustedDebt,
      preferredEquity,
      restrictedCash,
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Cannot calculate mNAV (no crypto holdings or NAV is zero)' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      ticker: entityId,
      mnav: {
        value: Math.round(result.mNAV * 1000) / 1000,
        enterpriseValue: Math.round(result.enterpriseValue),
        cryptoNav: Math.round(result.cryptoNav),
        totalNav: Math.round(result.totalNav),
      },
      inputs: {
        holdings,
        holdingsAsOf: byMetricDate.holdings_native,
        basicShares,
        dilutedShares: effectiveShares.diluted,
        stockPrice,
        cryptoPrice,
        marketCap: Math.round(marketCap),
        totalDebt,
        adjustedDebt: Math.round(adjustedDebt),
        inTheMoneyDebtValue: effectiveShares.inTheMoneyDebtValue,
        cashReserves,
        adjustedCash: Math.round(adjustedCash),
        inTheMoneyWarrantProceeds: effectiveShares.inTheMoneyWarrantProceeds,
        preferredEquity,
        restrictedCash,
      },
      methodology: 'EV = MarketCap + AdjustedDebt + PreferredEquity - FreeCash. CryptoNAV = Holdings × CryptoPrice. mNAV = EV / CryptoNAV. Debt adjusted for ITM convertible face values. Cash includes ITM warrant exercise proceeds.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30;
