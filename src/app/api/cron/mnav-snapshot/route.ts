import { NextRequest, NextResponse } from "next/server";
import { D1Client } from "@/lib/d1";
import { allCompanies } from "@/lib/data/companies";
import { getCompanyMNAVDetailed } from "@/lib/math/mnav-engine";
import { getMarketCapForMnavSync } from "@/lib/utils/market-cap";
import type { Company } from "@/lib/types";

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  if (!authHeader) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * GET /api/cron/mnav-snapshot
 *
 * Captures current mNAV for all companies and stores in D1.
 * Runs hourly during market hours. The stored snapshots are used
 * for 24hr mNAV change calculations — no more reconstructing
 * yesterday's mNAV from price history.
 */
export async function GET(request: NextRequest) {
  const isManual = request.nextUrl.searchParams.get("manual") === "true";
  if (!isManual && !verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { origin } = new URL(request.url);

  try {
    // Fetch current prices (same source the frontend uses)
    const pricesRes = await fetch(`${origin}/api/prices`, {
      cache: "no-store",
    });
    if (!pricesRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch prices" },
        { status: 502 }
      );
    }
    const prices = await pricesRes.json();

    const d1 = D1Client.fromEnv();
    const now = new Date();
    const capturedAt = now.toISOString();
    const captureDate = capturedAt.split("T")[0];

    let captured = 0;
    let skipped = 0;

    for (const company of allCompanies) {
      const stockData = prices.stocks?.[company.ticker];
      const cryptoPrice = prices.crypto?.[company.asset]?.price;

      if (!stockData?.price || !cryptoPrice) {
        skipped++;
        continue;
      }

      const mnavResult = getCompanyMNAVDetailed(company, prices);
      const { marketCap } = getMarketCapForMnavSync(
        company,
        stockData,
        prices.forex
      );

      await d1.query(
        `INSERT INTO mnav_snapshots
          (ticker, mnav, stock_price_usd, crypto_price_usd, market_cap_usd, crypto_nav_usd, ev_usd, captured_at, capture_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          company.ticker,
          mnavResult.mnav,
          stockData.price,
          cryptoPrice,
          marketCap,
          mnavResult.cryptoNavUsd,
          mnavResult.evUsd,
          capturedAt,
          captureDate,
        ]
      );
      captured++;
    }

    // Prune snapshots older than 7 days
    await d1.query(
      `DELETE FROM mnav_snapshots WHERE captured_at < datetime('now', '-7 days')`
    );

    return NextResponse.json({
      success: true,
      captured,
      skipped,
      capturedAt,
      captureDate,
    });
  } catch (error) {
    console.error("mNAV snapshot error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
