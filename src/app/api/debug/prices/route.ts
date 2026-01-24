/**
 * Debug endpoint to test price fetching in comparison engine
 */

import { NextResponse } from 'next/server';
import { getBinancePrices } from '@/lib/binance';
import { FALLBACK_RATES } from '@/lib/utils/currency';

const FMP_API_KEY = process.env.FMP_API_KEY || '';

export async function GET() {
  try {
    // 1. Get crypto prices (same as comparison engine)
    const crypto = await getBinancePrices();

    // 2. Get forex rates from FMP (using stable/batch-quote)
    let forex: Record<string, number> = { ...FALLBACK_RATES };
    let forexError = null;
    if (FMP_API_KEY) {
      try {
        const forexResponse = await fetch(
          `https://financialmodelingprep.com/stable/batch-quote?symbols=USDJPY,USDHKD,USDSEK&apikey=${FMP_API_KEY}`,
          { cache: 'no-store' }
        );
        if (forexResponse.ok) {
          const forexData = await forexResponse.json();
          if (Array.isArray(forexData)) {
            for (const rate of forexData) {
              if (rate.symbol === 'USDJPY') forex.JPY = rate.price;
              if (rate.symbol === 'USDHKD') forex.HKD = rate.price;
              if (rate.symbol === 'USDSEK') forex.SEK = rate.price;
            }
          }
        } else {
          forexError = `HTTP ${forexResponse.status}`;
        }
      } catch (e) {
        forexError = e instanceof Error ? e.message : String(e);
      }
    } else {
      forexError = 'FMP_API_KEY not set';
    }

    // 3. Get stock prices from FMP (using stable/batch-quote)
    const stocks: Record<string, any> = {};
    let stockError = null;
    if (FMP_API_KEY) {
      const stockTickers = ['3350.T', 'MSTR'];
      try {
        const stockResponse = await fetch(
          `https://financialmodelingprep.com/stable/batch-quote?symbols=${stockTickers.join(',')}&apikey=${FMP_API_KEY}`,
          { cache: 'no-store' }
        );
        if (stockResponse.ok) {
          const stockData = await stockResponse.json();
          if (Array.isArray(stockData)) {
            for (const stock of stockData) {
              if (stock?.symbol) {
                stocks[stock.symbol] = {
                  price: stock.price || 0,
                  marketCap: stock.marketCap || 0,
                  raw: stock,
                };
              }
            }
          }
        } else {
          stockError = `HTTP ${stockResponse.status}`;
        }
      } catch (e) {
        stockError = e instanceof Error ? e.message : String(e);
      }
    }

    return NextResponse.json({
      success: true,
      crypto: {
        BTC: crypto.BTC,
        ETH: crypto.ETH,
        count: Object.keys(crypto).length,
      },
      forex: {
        rates: forex,
        error: forexError,
      },
      stocks: {
        data: stocks,
        error: stockError,
      },
      hasFmpKey: !!FMP_API_KEY,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
