import { NextResponse } from "next/server";

export const runtime = "edge";

type PricesSnapshot = {
  crypto?: Record<string, { price?: number }>;
  stocks?: Record<string, { price?: number; marketCap?: number }>;
  forex?: Record<string, number>;
};

type CompanyLike = {
  ticker: string;
  asset: string;
  pendingMerger?: boolean;
};

async function fetchJson<T>(url: URL): Promise<T | null> {
  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ticker = (url.searchParams.get("ticker") || "").toUpperCase();

  // Pull from our own endpoints so this stays environment-correct (local/preview/prod)
  const origin = url.origin;
  const prices = await fetchJson<PricesSnapshot>(new URL("/api/prices", origin));
  const companiesRes = await fetchJson<{ companies: CompanyLike[] }>(
    new URL("/api/db/companies", origin),
  );

  if (!prices || !companiesRes) {
    return NextResponse.json(
      {
        error: "Failed to load /api/prices or /api/db/companies",
        hasPrices: !!prices,
        hasCompanies: !!companiesRes,
      },
      { status: 500 },
    );
  }

  const companies = companiesRes.companies || [];

  const missingStockTickers: string[] = [];
  const zeroMarketCapTickers: string[] = [];
  const missingCryptoAssets: string[] = [];

  const uniqueAssets = new Set(companies.map((c) => c.asset));
  for (const asset of uniqueAssets) {
    const p = prices.crypto?.[asset]?.price;
    if (!p || p <= 0) missingCryptoAssets.push(asset);
  }

  for (const c of companies) {
    const stock = prices.stocks?.[c.ticker];
    if (!stock) {
      missingStockTickers.push(c.ticker);
      continue;
    }
    const mc = stock.marketCap ?? 0;
    if (!mc || mc <= 0) zeroMarketCapTickers.push(c.ticker);
  }

  const debugTicker = ticker || null;
  const debug =
    debugTicker && companies.find((c) => c.ticker === debugTicker)
      ? {
          ticker: debugTicker,
          pendingMerger: companies.find((c) => c.ticker === debugTicker)
            ?.pendingMerger,
          stock: prices.stocks?.[debugTicker] ?? null,
          cryptoAsset: companies.find((c) => c.ticker === debugTicker)?.asset,
          cryptoPrice:
            prices.crypto?.[
              companies.find((c) => c.ticker === debugTicker)!.asset
            ]?.price ?? null,
        }
      : null;

  return NextResponse.json({
    companyCount: companies.length,
    missingStockTickers,
    zeroMarketCapTickers,
    missingCryptoAssets,
    debug,
  });
}
