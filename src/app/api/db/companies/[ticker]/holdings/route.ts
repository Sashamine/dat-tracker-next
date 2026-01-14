// GET /api/db/companies/[ticker]/holdings - Get full holdings history
import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;

    // Get company ID
    const company = await queryOne(`
      SELECT c.id, c.ticker, c.name, a.symbol as asset
      FROM companies c
      LEFT JOIN assets a ON c.asset_id = a.id
      WHERE LOWER(c.ticker) = LOWER($1) AND c.is_active = true
    `, [ticker]);

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Get all approved holdings snapshots
    const holdings = await query(`
      SELECT
        holdings,
        shares_outstanding,
        holdings_per_share,
        source,
        source_document,
        snapshot_date
      FROM holdings_snapshots
      WHERE company_id = $1 AND status = 'approved'
      ORDER BY snapshot_date ASC
    `, [company.id]);

    // Format for charts
    const history = holdings.map(h => ({
      date: h.snapshot_date,
      holdings: parseFloat(h.holdings),
      sharesOutstanding: h.shares_outstanding ? parseFloat(h.shares_outstanding) : null,
      holdingsPerShare: h.holdings_per_share ? parseFloat(h.holdings_per_share) : null,
      source: h.source_document || h.source,
    }));

    // Calculate growth metrics if we have enough data
    let growth = null;
    if (history.length >= 2) {
      const oldest = history[0];
      const latest = history[history.length - 1];

      if (oldest.holdingsPerShare && latest.holdingsPerShare && oldest.holdingsPerShare > 0) {
        const startDate = new Date(oldest.date);
        const endDate = new Date(latest.date);
        const periodYears = (endDate.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

        const totalGrowth = (latest.holdingsPerShare / oldest.holdingsPerShare - 1) * 100;
        const annualizedGrowth = periodYears > 0
          ? (Math.pow(latest.holdingsPerShare / oldest.holdingsPerShare, 1 / periodYears) - 1) * 100
          : 0;

        growth = {
          totalGrowth: Math.round(totalGrowth * 100) / 100,
          annualizedGrowth: Math.round(annualizedGrowth * 100) / 100,
          periodYears: Math.round(periodYears * 100) / 100,
          latestHoldingsPerShare: latest.holdingsPerShare,
          oldestHoldingsPerShare: oldest.holdingsPerShare,
        };
      }
    }

    return NextResponse.json({
      ticker: company.ticker,
      name: company.name,
      asset: company.asset,
      history,
      growth,
      dataPoints: history.length,
    });
  } catch (error) {
    console.error('Error fetching holdings history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holdings history' },
      { status: 500 }
    );
  }
}
