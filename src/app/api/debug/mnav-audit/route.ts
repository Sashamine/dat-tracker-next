/**
 * mNAV Audit Endpoint
 *
 * Shows provenance of every mNAV input for all companies:
 * - Static value (companies.ts)
 * - D1 value (XBRL pipeline)
 * - Which one "wins" in the overlay
 * - Divergence flags when D1 and static disagree by >10%
 *
 * Usage: GET /api/debug/mnav-audit
 *        GET /api/debug/mnav-audit?ticker=PURR
 */

import { NextRequest, NextResponse } from "next/server";
import { allCompanies } from "@/lib/data/companies";
import { D1Client } from "@/lib/d1";

interface D1Row {
  entity_id: string;
  metric: string;
  value: number;
  as_of: string | null;
}

interface FieldAudit {
  static: number | undefined;
  staticSource?: string;
  d1: number | undefined;
  d1AsOf?: string | null;
  winner: "static" | "d1" | "none";
  effectiveValue: number | undefined;
  divergence?: string;
  flag: "OK" | "WARN" | "CRITICAL";
}

function auditField(
  staticVal: number | undefined,
  d1Val: number | undefined,
  d1AsOf?: string | null,
  staticSource?: string,
): FieldAudit {
  const d1Exists = d1Val != null;
  const staticExists = staticVal != null;

  const winner: "static" | "d1" | "none" = d1Exists ? "d1" : staticExists ? "static" : "none";
  const effectiveValue = d1Exists ? d1Val : staticVal;

  const result: FieldAudit = {
    static: staticVal,
    staticSource,
    d1: d1Val,
    d1AsOf,
    winner,
    effectiveValue,
    flag: "OK",
  };

  if (d1Exists && staticExists && staticVal! > 0 && d1Val! > 0) {
    const pctDiff = ((d1Val! - staticVal!) / staticVal!) * 100;
    const absDiff = Math.abs(pctDiff);

    if (absDiff > 50) {
      result.divergence = `D1 ${pctDiff > 0 ? "+" : ""}${pctDiff.toFixed(0)}% vs static`;
      result.flag = "CRITICAL";
    } else if (absDiff > 10) {
      result.divergence = `D1 ${pctDiff > 0 ? "+" : ""}${pctDiff.toFixed(0)}% vs static`;
      result.flag = "WARN";
    }
  } else if (d1Exists && staticExists && d1Val !== staticVal) {
    if ((d1Val === 0 && staticVal! > 0) || (staticVal === 0 && d1Val! > 0)) {
      result.divergence = `D1=${d1Val}, static=${staticVal} (zero mismatch)`;
      result.flag = "WARN";
    }
  }

  return result;
}

export async function GET(request: NextRequest) {
  const tickerParam = request.nextUrl.searchParams.get("ticker")?.toUpperCase();

  // Fetch all D1 datapoints for mNAV-relevant metrics
  const d1Data: Record<string, Record<string, { value: number; as_of: string | null }>> = {};

  try {
    const d1 = D1Client.fromEnv();
    const metrics = ["cash_usd", "debt_usd", "preferred_equity_usd", "basic_shares", "holdings_native"];
    const inList = metrics.map(() => "?").join(",");

    const result = await d1.query<D1Row>(
      `SELECT entity_id, metric, value, as_of
       FROM latest_datapoints
       WHERE metric IN (${inList})
       ORDER BY entity_id, metric`,
      metrics
    );

    for (const row of result.results) {
      if (!d1Data[row.entity_id]) d1Data[row.entity_id] = {};
      d1Data[row.entity_id][row.metric] = { value: row.value, as_of: row.as_of };
    }
  } catch (error) {
    return NextResponse.json({
      error: "D1 unavailable",
      detail: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }

  const companies = tickerParam
    ? allCompanies.filter(c => c.ticker === tickerParam)
    : allCompanies;

  const audits = companies.map(c => {
    const d1 = d1Data[c.ticker] || {};

    const fields = {
      cashReserves: auditField(c.cashReserves, d1.cash_usd?.value, d1.cash_usd?.as_of, c.cashSource),
      totalDebt: auditField(c.totalDebt, d1.debt_usd?.value, d1.debt_usd?.as_of, c.debtSource),
      preferredEquity: auditField(c.preferredEquity, d1.preferred_equity_usd?.value, d1.preferred_equity_usd?.as_of),
      sharesForMnav: auditField(c.sharesForMnav, d1.basic_shares?.value, d1.basic_shares?.as_of),
      holdings: auditField(c.holdings, d1.holdings_native?.value, d1.holdings_native?.as_of),
    };

    const flags: string[] = [];
    for (const [name, field] of Object.entries(fields)) {
      if (field.flag === "CRITICAL") flags.push(`CRITICAL: ${name} — ${field.divergence}`);
      else if (field.flag === "WARN") flags.push(`WARN: ${name} — ${field.divergence}`);
    }

    return { ticker: c.ticker, name: c.name, asset: c.asset, fields, flags };
  });

  const critical = audits.filter(a => a.flags.some(f => f.startsWith("CRITICAL")));
  const warnings = audits.filter(a => a.flags.some(f => f.startsWith("WARN")) && !a.flags.some(f => f.startsWith("CRITICAL")));

  return NextResponse.json({
    summary: {
      total: audits.length,
      critical: critical.length,
      warnings: warnings.length,
      clean: audits.length - critical.length - warnings.length,
    },
    critical: critical.map(a => ({ ticker: a.ticker, flags: a.flags })),
    warnings: warnings.map(a => ({ ticker: a.ticker, flags: a.flags })),
    audits: tickerParam ? audits : undefined,
  });
}
