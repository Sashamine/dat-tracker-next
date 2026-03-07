import { NextRequest, NextResponse } from 'next/server';
import { allCompanies } from '@/lib/data/companies';
import { generateAuditReportData } from '@/lib/audit/report-generator';
import { getBinancePrices } from "@/lib/binance";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');
  
  const company = allCompanies.find(c => c.ticker.toUpperCase() === ticker.toUpperCase());

  if (!company) {
    return NextResponse.json({ success: false, error: 'Company not found' }, { status: 404 });
  }

  try {
    // Fetch fresh crypto prices for the report
    const cryptoPrices = await getBinancePrices();
    const prices = {
      crypto: cryptoPrices,
      stocks: {} 
    };

    const reportData = await generateAuditReportData(ticker, company, prices as { crypto: Record<string, { price: number }>; stocks: Record<string, { price: number }> });

    // STOP CONDITION: If a report has 0 provenance links, it's non-defensible.
    const hasSourceLinks = reportData.provenance.some(p => p.sourceUrl);
    if (!hasSourceLinks && reportData.provenance.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'STOP_CONDITION: report is non-defensible without CitationPopover source URLs' 
      }, { status: 422 });
    }

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        report: reportData
      });
    }

    // Default to returning the structured report for the UI
    return NextResponse.json({
      success: true,
      report: reportData
    });
  } catch (err) {
    console.error(`[Audit API] Error generating report for ${ticker}:`, err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
