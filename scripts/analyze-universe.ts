#!/usr/bin/env node
/**
 * Analyze the 56-company universe from src/lib/data/companies (the site's source of truth)
 * and emit a distribution useful for adapter planning.
 */

async function loadCompanies() {
  // Dynamic import avoids brittle ts-node ESM resolution issues
  const mod = await import('../src/lib/data/companies.ts');
  return mod.allCompanies as any[];
}

type Geo = { country: string | null; exchangeMic: string | null; method: string };

function inferGeoFromTicker(ticker: string): Geo {
  const t = ticker.trim();
  if (/\.HK$/i.test(t)) return { country: 'HK', exchangeMic: 'XHKG', method: 'suffix:.HK' };
  if (/\.T$/i.test(t)) return { country: 'JP', exchangeMic: 'XTKS', method: 'suffix:.T' };
  if (/\.TO$/i.test(t)) return { country: 'CA', exchangeMic: 'XTSE', method: 'suffix:.TO' };
  if (/\.V$/i.test(t)) return { country: 'CA', exchangeMic: 'XTSX', method: 'suffix:.V' };
  if (/\.L$/i.test(t)) return { country: 'GB', exchangeMic: 'XLON', method: 'suffix:.L' };
  if (/\.PA$/i.test(t)) return { country: 'FR', exchangeMic: 'XPAR', method: 'suffix:.PA' };
  if (/\.DE$/i.test(t)) return { country: 'DE', exchangeMic: 'XETR', method: 'suffix:.DE' };
  if (/\.DU$/i.test(t)) return { country: 'DE', exchangeMic: 'XETR', method: 'suffix:.DU' };
  if (/\.ST$/i.test(t)) return { country: 'SE', exchangeMic: 'XSTO', method: 'suffix:.ST' };
  if (/\.AX$/i.test(t)) return { country: 'AU', exchangeMic: 'XASX', method: 'suffix:.AX' };
  if (t.includes('.')) return { country: null, exchangeMic: null, method: 'suffix:unknown' };
  return { country: null, exchangeMic: null, method: 'none' };
}

function normalizeSource(s: any): string {
  if (!s) return 'unknown';
  const v = String(s).toLowerCase();
  if (v.includes('10-q')) return '10-q';
  if (v.includes('10-k')) return '10-k';
  if (v.includes('8-k')) return '8-k';
  if (v.includes('press')) return 'press-release';
  if (v.includes('exchange')) return 'exchange-filing';
  if (v.includes('bitcointreasuries')) return 'bitcointreasuries.net';
  if (v.includes('manual')) return 'manual';
  if (v.includes('sec')) return 'sec-filing';
  return v;
}

function hasSec(company: any): boolean {
  return Boolean(company.secReferenced) || Boolean(company.secCik);
}

const byKey = (items: string[]) => {
  const m = new Map<string, number>();
  for (const k of items) m.set(k, (m.get(k) ?? 0) + 1);
  return Array.from(m.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => ({ key: k, n }));
};

async function main() {
  try {
    const allCompanies = await loadCompanies();
    const total = allCompanies.length;

    const sources = allCompanies.map(c => normalizeSource(c.holdingsSource));
    const secFlag = allCompanies.map(c => (hasSec(c) ? 'sec' : 'non-sec'));
    // Use explicit geo if present; use inference only for validation/warnings.
    const explicitGeo = allCompanies.map((c) => ({
      country: c.country ?? null,
      exchangeMic: c.exchangeMic ?? null,
      method: c.country || c.exchangeMic ? 'explicit' : 'missing',
    }));

    const inferredGeo = allCompanies.map(c => inferGeoFromTicker(c.ticker));

    const byCountry = byKey(explicitGeo.map(g => g.country ?? 'unknown'));
    const byExchangeMic = byKey(explicitGeo.map(g => g.exchangeMic ?? 'unknown'));
    const bySource = byKey(sources);
    const bySec = byKey(secFlag);

    const nonUs = allCompanies
      .map((c, i) => ({
        ticker: c.ticker,
        name: c.name,
        holdingsSource: c.holdingsSource ?? null,
        secReferenced: hasSec(c),
        country: explicitGeo[i].country,
        exchangeMic: explicitGeo[i].exchangeMic,
      }))
      .filter(r => r.country && r.country !== 'US')
      .sort((a, b) => (a.country ?? '').localeCompare(b.country ?? '') || a.ticker.localeCompare(b.ticker));

    const unknownGeo = allCompanies
      .map((c) => ({ ticker: c.ticker, name: c.name, secReferenced: hasSec(c), holdingsSource: c.holdingsSource ?? null, country: c.country ?? null, exchangeMic: c.exchangeMic ?? null }))
      .filter((r) => !r.country || !r.exchangeMic)
      .sort((a, b) => a.ticker.localeCompare(b.ticker));

    const geoMismatches = allCompanies
      .map((c, i) => {
        const exp = explicitGeo[i];
        const inf = inferredGeo[i];
        if (!inf.country && !inf.exchangeMic) return null;
        if (!exp.country && !exp.exchangeMic) return null;
        const mismatchCountry = exp.country && inf.country && exp.country !== inf.country;
        const mismatchMic = exp.exchangeMic && inf.exchangeMic && exp.exchangeMic !== inf.exchangeMic;
        if (!mismatchCountry && !mismatchMic) return null;
        return {
          ticker: c.ticker,
          explicit: { country: exp.country, exchangeMic: exp.exchangeMic },
          inferred: { country: inf.country, exchangeMic: inf.exchangeMic, method: inf.method },
        };
      })
      .filter(Boolean);

    console.log(
      JSON.stringify(
        {
          total,
          bySec,
          bySource,
          byCountry,
          byExchangeMic,
          nonUs,
          unknownGeoCount: unknownGeo.length,
          unknownGeo,
          geoMismatchesCount: geoMismatches.length,
          geoMismatches,
        },
        null,
        2
      )
    );
  } catch (e) {
    console.error('analyze-universe failed:', e);
    process.exit(1);
  }
}

main();
