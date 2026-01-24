/**
 * Debug endpoint to test Metaplanet fetcher
 */

import { NextResponse } from 'next/server';
import { metaplanetFetcher } from '@/lib/fetchers/dashboards/metaplanet';
import { loadOurValues } from '@/lib/comparison/engine';
import { FALLBACK_RATES } from '@/lib/utils/currency';

export async function GET() {
  try {
    // Test the fetcher
    const results = await metaplanetFetcher.fetch(['3350.T']);

    // Get our calculated values (without live prices for now)
    const ourValues = loadOurValues(null);
    const ourMetaplanet = ourValues.filter(v => v.ticker === '3350.T');

    // Fetch live prices
    const pricesResponse = await fetch(
      `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/prices`,
      { cache: 'no-store' }
    );
    const pricesData = await pricesResponse.json();

    // Get our mNAV with live prices
    const priceData = {
      crypto: pricesData.crypto || {},
      stocks: pricesData.stocks || {},
      forex: pricesData.forex || FALLBACK_RATES,
    };
    const ourValuesWithPrices = loadOurValues(priceData);
    const ourMnavValue = ourValuesWithPrices.find(v => v.ticker === '3350.T' && v.field === 'mnav');

    return NextResponse.json({
      success: true,
      fetcherResults: results,
      ourMnav: ourMnavValue,
      ourValues: ourMetaplanet,
      btcPrice: pricesData.crypto?.BTC?.price,
      stockPrice: pricesData.stocks?.['3350.T']?.price,
      forexJPY: pricesData.forex?.JPY,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
