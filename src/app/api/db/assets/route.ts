// GET /api/db/assets - List all assets derived from companies.ts
import { NextResponse } from 'next/server';
import { allCompanies } from '@/lib/data/companies';

export const dynamic = 'force-dynamic';

// Asset metadata (name, coingecko ID, binance symbol)
const ASSET_METADATA: Record<string, { name: string; coingeckoId: string; binanceSymbol: string }> = {
  BTC: { name: 'Bitcoin', coingeckoId: 'bitcoin', binanceSymbol: 'BTCUSDT' },
  ETH: { name: 'Ethereum', coingeckoId: 'ethereum', binanceSymbol: 'ETHUSDT' },
  SOL: { name: 'Solana', coingeckoId: 'solana', binanceSymbol: 'SOLUSDT' },
  HYPE: { name: 'Hyperliquid', coingeckoId: 'hyperliquid', binanceSymbol: 'HYPEUSDT' },
  BNB: { name: 'BNB', coingeckoId: 'binancecoin', binanceSymbol: 'BNBUSDT' },
  TAO: { name: 'Bittensor', coingeckoId: 'bittensor', binanceSymbol: 'TAOUSDT' },
  LINK: { name: 'Chainlink', coingeckoId: 'chainlink', binanceSymbol: 'LINKUSDT' },
  TRX: { name: 'TRON', coingeckoId: 'tron', binanceSymbol: 'TRXUSDT' },
  XRP: { name: 'XRP', coingeckoId: 'ripple', binanceSymbol: 'XRPUSDT' },
  ZEC: { name: 'Zcash', coingeckoId: 'zcash', binanceSymbol: 'ZECUSDT' },
  LTC: { name: 'Litecoin', coingeckoId: 'litecoin', binanceSymbol: 'LTCUSDT' },
  SUI: { name: 'Sui', coingeckoId: 'sui', binanceSymbol: 'SUIUSDT' },
  DOGE: { name: 'Dogecoin', coingeckoId: 'dogecoin', binanceSymbol: 'DOGEUSDT' },
  AVAX: { name: 'Avalanche', coingeckoId: 'avalanche-2', binanceSymbol: 'AVAXUSDT' },
  HBAR: { name: 'Hedera', coingeckoId: 'hedera-hashgraph', binanceSymbol: 'HBARUSDT' },
  ADA: { name: 'Cardano', coingeckoId: 'cardano', binanceSymbol: 'ADAUSDT' },
};

export async function GET() {
  try {
    // Group companies by asset and calculate totals
    const assetStats = new Map<string, { companyCount: number; totalHoldings: number }>();

    for (const company of allCompanies) {
      const existing = assetStats.get(company.asset) || { companyCount: 0, totalHoldings: 0 };
      assetStats.set(company.asset, {
        companyCount: existing.companyCount + 1,
        totalHoldings: existing.totalHoldings + company.holdings,
      });
    }

    // Build response with metadata
    const assets = Array.from(assetStats.entries())
      .map(([symbol, stats]) => {
        const metadata = ASSET_METADATA[symbol] || { name: symbol, coingeckoId: '', binanceSymbol: '' };
        return {
          symbol,
          name: metadata.name,
          coingeckoId: metadata.coingeckoId,
          binanceSymbol: metadata.binanceSymbol,
          companyCount: stats.companyCount,
          totalHoldings: stats.totalHoldings,
        };
      })
      // Sort by total holdings descending
      .sort((a, b) => b.totalHoldings - a.totalHoldings);

    return NextResponse.json({
      assets,
      count: assets.length,
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
      { status: 500 }
    );
  }
}
