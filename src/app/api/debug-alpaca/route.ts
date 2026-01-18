import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  const ALPACA_API_KEY = process.env.ALPACA_API_KEY || "";
  const ALPACA_SECRET_KEY = process.env.ALPACA_SECRET_KEY || "";

  const result: any = {
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
      const data = await response.json();
      result.data = data;
      result.tickersReturned = Object.keys(data).length;
    }
  } catch (error: any) {
    result.error = error.message;
  }

  return NextResponse.json(result);
}
