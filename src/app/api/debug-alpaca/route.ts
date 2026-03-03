import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

type DebugAlpacaResult = {
  hasApiKey: boolean;
  hasSecretKey: boolean;
  apiKeyLength: number;
  secretKeyLength: number;
  apiKeyPreview: string;
  error?: string;
  status?: number;
  statusText?: string;
  data?: unknown;
  tickersReturned?: number;
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function GET() {
  const ALPACA_API_KEY = process.env.ALPACA_API_KEY || "";
  const ALPACA_SECRET_KEY = process.env.ALPACA_SECRET_KEY || "";

  const result: DebugAlpacaResult = {
    hasApiKey: !!ALPACA_API_KEY,
    hasSecretKey: !!ALPACA_SECRET_KEY,
    apiKeyLength: ALPACA_API_KEY.length,
    secretKeyLength: ALPACA_SECRET_KEY.length,
    apiKeyPreview: ALPACA_API_KEY.slice(0, 4) + "...",
  };

  if (!ALPACA_API_KEY || !ALPACA_SECRET_KEY) {
    result.error = "Missing API keys";
    return NextResponse.json(result);
  }

  try {
    const response = await fetch(
      "https://data.alpaca.markets/v2/stocks/snapshots?symbols=MSTR,RIOT&feed=iex",
      {
        headers: {
          "APCA-API-KEY-ID": ALPACA_API_KEY,
          "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
        },
        cache: "no-store",
      }
    );

    result.status = response.status;
    result.statusText = response.statusText;

    if (!response.ok) {
      result.error = await response.text();
    } else {
      const data: unknown = await response.json();
      result.data = data;
      result.tickersReturned = isObjectRecord(data) ? Object.keys(data).length : 0;
    }
  } catch (error: unknown) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(result);
}
