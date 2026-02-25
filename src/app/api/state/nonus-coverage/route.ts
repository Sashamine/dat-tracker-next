import { NextRequest, NextResponse } from 'next/server';
import { D1Client } from '@/lib/d1';
import { allCompanies } from '@/lib/data/companies';
import { COMPANY_SOURCES } from '@/lib/data/company-sources';

const METRICS = ['cash_usd', 'debt_usd', 'basic_shares', 'bitcoin_holdings_usd'] as const;

type Metric = (typeof METRICS)[number];

function isLikelyNonUS(ticker: string, country?: string | null): boolean {
  if (country && country.toUpperCase() !== 'US') return true;
  // Common non-US ticker suffixes we use in this repo
  return /\.(T|HK|AX|DU|ST|TO|V|L|F)$/i.test(ticker);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const asset = (searchParams.get('asset') || 'BTC').trim().toUpperCase();

  const companies = allCompanies
    .filter(c => (c.asset || '').toUpperCase() === asset)
    .filter(c => isLikelyNonUS(c.ticker, (c as any).country || null));

  // If D1 isn't configured, return just the company list.
  let d1: D1Client | null = null;
  try {
    d1 = D1Client.fromEnv();
  } catch {
    d1 = null;
  }

  const results = [] as any[];

  for (const c of companies) {
    let available: Partial<Record<Metric, boolean>> = {};

    if (d1) {
      try {
        const inList = METRICS.map(() => '?').join(',');
        const q = await d1.query<{ metric: string }>(
          `SELECT metric FROM latest_datapoints WHERE entity_id = ? AND metric IN (${inList});`,
          [c.ticker.toUpperCase(), ...METRICS]
        );
        const set = new Set(q.results.map(r => r.metric));
        for (const m of METRICS) available[m] = set.has(m);
      } catch {
        // keep it empty
      }
    }

    const companySources = COMPANY_SOURCES[c.ticker.toUpperCase()] || (COMPANY_SOURCES as any)[c.ticker];

    results.push({
      ticker: c.ticker,
      name: c.name,
      asset: c.asset,
      country: (c as any).country || null,
      exchangeMic: (c as any).exchangeMic || null,
      sources: {
        // from companies.ts
        secCik: (c as any).secCik || null,
        holdingsSource: (c as any).holdingsSource || null,
        holdingsSourceUrl: (c as any).holdingsSourceUrl || null,
        // from company-sources.ts (verification/citations mapping)
        edinetCode: companySources?.edinetCode || null,
        edinetFilingsUrl: companySources?.edinetFilingsUrl || null,
        hkexStockCode: companySources?.hkexStockCode || null,
        hkexFilingsUrl: companySources?.hkexFilingsUrl || null,
        sedarIsin: companySources?.sedarIsin || null,
        sedarFilingsUrl: companySources?.sedarFilingsUrl || null,
        euronextIsin: companySources?.euronextIsin || null,
        euronextFilingsUrl: companySources?.euronextFilingsUrl || null,
        ngmIsin: companySources?.ngmIsin || null,
        ngmFilingsUrl: companySources?.ngmFilingsUrl || null,
      },
      d1: {
        has: available,
      },
    });
  }

  return NextResponse.json({
    success: true,
    asset,
    nonUsCount: results.length,
    metrics: METRICS,
    results,
  });
}

export const runtime = 'nodejs';
export const maxDuration = 60;
