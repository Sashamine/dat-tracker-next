// GET /api/db/assets - List all assets with company counts
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const assets = await query(`
      SELECT
        a.id,
        a.symbol,
        a.name,
        a.coingecko_id,
        a.binance_symbol,
        COUNT(c.id) as company_count,
        SUM(c.current_holdings) as total_holdings
      FROM assets a
      LEFT JOIN companies c ON c.asset_id = a.id AND c.is_active = true
      GROUP BY a.id, a.symbol, a.name, a.coingecko_id, a.binance_symbol
      HAVING COUNT(c.id) > 0
      ORDER BY SUM(c.current_holdings) DESC NULLS LAST
    `);

    const formatted = assets.map(a => ({
      symbol: a.symbol,
      name: a.name,
      coingeckoId: a.coingecko_id,
      binanceSymbol: a.binance_symbol,
      companyCount: parseInt(a.company_count),
      totalHoldings: a.total_holdings ? parseFloat(a.total_holdings) : 0,
    }));

    return NextResponse.json({
      assets: formatted,
      count: formatted.length,
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
      { status: 500 }
    );
  }
}
