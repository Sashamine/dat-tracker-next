/**
 * D1 Cross-Check Script
 *
 * Queries D1 for latest holdings_native, basic_shares, debt_usd, cash_usd per entity.
 * Compares against companies.ts values. Flags >1% divergence.
 *
 * Requires env vars: set -a && source .env.local && set +a
 * Run: npx tsx scripts/reconciliation-d1.ts
 */

import { allCompanies } from "../src/lib/data/companies";

const D1_API_BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://dat-tracker-next.vercel.app";

interface D1Datapoint {
  entity_ticker: string;
  field_name: string;
  value_numeric: number;
  period_end: string;
  source_accession: string;
}

interface Divergence {
  ticker: string;
  field: string;
  companiesTs: number;
  d1Value: number;
  pctDiff: string;
  d1Date: string;
}

const FIELDS_TO_CHECK = [
  { d1Field: "holdings_native", companyField: "holdings" as const },
  { d1Field: "basic_shares", companyField: "sharesForMnav" as const },
  { d1Field: "debt_usd", companyField: "totalDebt" as const },
  { d1Field: "cash_usd", companyField: "cashReserves" as const },
] as const;

async function fetchLatestD1(ticker: string): Promise<D1Datapoint[]> {
  const url = `${D1_API_BASE}/api/d1/latest?ticker=${encodeURIComponent(ticker)}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "reconciliation-d1/1.0" } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.datapoints || data.results || [];
  } catch {
    return [];
  }
}

async function main() {
  console.log("D1 Reconciliation Cross-Check");
  console.log("=".repeat(70));
  console.log(`Checking ${allCompanies.length} companies against D1...\n`);

  const divergences: Divergence[] = [];
  let checked = 0;
  let skipped = 0;

  for (const company of allCompanies) {
    if (company.pendingMerger) {
      skipped++;
      continue;
    }

    const d1Data = await fetchLatestD1(company.ticker);
    if (d1Data.length === 0) {
      skipped++;
      continue;
    }

    checked++;

    for (const { d1Field, companyField } of FIELDS_TO_CHECK) {
      const d1Point = d1Data.find((dp) => dp.field_name === d1Field);
      if (!d1Point) continue;

      const companiesValue = (company as Record<string, unknown>)[companyField] as number | undefined;
      if (companiesValue === undefined || companiesValue === null) continue;

      const d1Value = d1Point.value_numeric;
      if (d1Value === 0 && companiesValue === 0) continue;

      const denom = Math.max(Math.abs(companiesValue), Math.abs(d1Value), 1);
      const pctDiff = Math.abs(companiesValue - d1Value) / denom;

      if (pctDiff > 0.01) {
        divergences.push({
          ticker: company.ticker,
          field: d1Field,
          companiesTs: companiesValue,
          d1Value,
          pctDiff: (pctDiff * 100).toFixed(1) + "%",
          d1Date: d1Point.period_end,
        });
      }
    }

    // Rate limiting
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`Checked: ${checked} | Skipped: ${skipped}\n`);

  if (divergences.length === 0) {
    console.log("✅ No divergences >1% found between companies.ts and D1.\n");
  } else {
    console.log(`⚠️  ${divergences.length} divergence(s) found:\n`);
    console.table(divergences);
  }
}

main().catch(console.error);
