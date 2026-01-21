// GET /api/db/assets/[symbol] - Get asset with its companies from companies.ts
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const upperSymbol = symbol.toUpperCase();

    // Get asset metadata
    const metadata = ASSET_METADATA[upperSymbol];
    if (!metadata) {
      // Check if any companies exist for this asset
      const hasCompanies = allCompanies.some(c => c.asset === upperSymbol);
      if (!hasCompanies) {
        return NextResponse.json(
          { error: 'Asset not found' },
          { status: 404 }
        );
      }
    }

    // Get companies for this asset from companies.ts
    const companies = allCompanies
      .filter(c => c.asset === upperSymbol)
      .sort((a, b) => b.holdings - a.holdings);

    const formattedCompanies = companies.map(c => ({
      id: c.id,
      name: c.name,
      ticker: c.ticker,
      tier: c.tier,
      holdings: c.holdings,
      holdingsLastUpdated: c.holdingsLastUpdated,
      holdingsSource: c.holdingsSource,
      holdingsSourceUrl: c.holdingsSourceUrl,
      isMiner: c.isMiner,
      leader: c.leader,
      marketCap: c.marketCap,
      stakingPct: c.stakingPct,
      hasOptions: c.hasOptions,
      cashReserves: c.cashReserves,
      otherInvestments: c.otherInvestments,
      totalDebt: c.totalDebt,
      preferredEquity: c.preferredEquity,
      sharesForMnav: c.sharesForMnav,
      pendingMerger: c.pendingMerger || false,
      expectedHoldings: c.expectedHoldings,
      mergerExpectedClose: c.mergerExpectedClose,
      notes: c.notes,
      lowLiquidity: c.lowLiquidity,
    }));

    const totalHoldings = formattedCompanies.reduce((sum, c) => sum + c.holdings, 0);
    const assetMeta = metadata || { name: upperSymbol, coingeckoId: '', binanceSymbol: '' };

    return NextResponse.json({
      asset: {
        symbol: upperSymbol,
        name: assetMeta.name,
        coingeckoId: assetMeta.coingeckoId,
        binanceSymbol: assetMeta.binanceSymbol,
      },
      companies: formattedCompanies,
      totalHoldings,
      companyCount: formattedCompanies.length,
    });
  } catch (error) {
    console.error('Error fetching asset:', error);
    return NextResponse.json(
      { error: 'Failed to fetch asset' },
      { status: 500 }
    );
  }
}
