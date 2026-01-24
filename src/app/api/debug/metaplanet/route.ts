/**
 * Debug endpoint to test Metaplanet mNAV comparison
 */

import { NextResponse } from 'next/server';
import { metaplanetFetcher } from '@/lib/fetchers/dashboards/metaplanet';
import { allCompanies } from '@/lib/data/companies';
import { calculateMNAV } from '@/lib/calculations';
import { getMarketCapForMnavSync } from '@/lib/utils/market-cap';
import { FALLBACK_RATES } from '@/lib/utils/currency';

export async function GET() {
  try {
    // Test the fetcher to get official mNAV
    const fetcherResults = await metaplanetFetcher.fetch(['3350.T']);
    const officialMnav = fetcherResults.find(r => r.field === 'mnav');
    const officialHoldings = fetcherResults.find(r => r.field === 'holdings');

    // Get Metaplanet company data
    const company = allCompanies.find(c => c.ticker === '3350.T');
    if (!company) {
      return NextResponse.json({ success: false, error: 'Company not found' }, { status: 404 });
    }

    // Sample price data (hardcoded for debugging - in production this comes from /api/prices)
    const stockData = { price: 512, marketCap: 4000000000 }; // ¥512, ¥4B
    const btcPrice = 89356;
    const forexRates = { JPY: 156, HKD: 7.8, SEK: 10.5 };

    // Calculate market cap using our method
    const { marketCap } = getMarketCapForMnavSync(company, stockData, forexRates);

    // Calculate our mNAV
    const ourMnav = calculateMNAV(
      marketCap,
      company.holdings,
      btcPrice,
      company.cashReserves ?? 0,
      0,
      company.totalDebt ?? 0,
      company.preferredEquity ?? 0,
      company.restrictedCash ?? 0
    );

    // Calculate components
    const priceInUsd = stockData.price / forexRates.JPY;
    const calculatedMarketCap = priceInUsd * (company.sharesForMnav || 0);
    const btcNav = company.holdings * btcPrice;
    const freeCash = (company.cashReserves ?? 0) - (company.restrictedCash ?? 0);
    const ev = marketCap + (company.totalDebt ?? 0) + (company.preferredEquity ?? 0) - freeCash;

    return NextResponse.json({
      success: true,
      official: {
        mnav: officialMnav?.value,
        holdings: officialHoldings?.value,
      },
      ours: {
        mnav: ourMnav,
        holdings: company.holdings,
      },
      calculation: {
        stockPriceJPY: stockData.price,
        priceInUSD: priceInUsd.toFixed(4),
        sharesForMnav: company.sharesForMnav,
        calculatedMarketCap: calculatedMarketCap,
        marketCapFromFunction: marketCap,
        btcPrice,
        btcHoldings: company.holdings,
        btcNav,
        totalDebt: company.totalDebt,
        cashReserves: company.cashReserves,
        restrictedCash: company.restrictedCash,
        freeCash,
        preferredEquity: company.preferredEquity,
        enterpriseValue: ev,
        mnavFormula: `EV($${(ev/1e9).toFixed(2)}B) / BTC_NAV($${(btcNav/1e9).toFixed(2)}B) = ${ourMnav?.toFixed(4)}`,
      },
      discrepancy: officialMnav && ourMnav ? {
        difference: Math.abs(officialMnav.value - ourMnav),
        percentDiff: (Math.abs(officialMnav.value - ourMnav) / officialMnav.value * 100).toFixed(2) + '%',
      } : null,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
