import { NextRequest, NextResponse } from "next/server";

// SEC requires a proper User-Agent
const SEC_USER_AGENT = "DAT-Tracker research@dat-tracker.com";

interface XBRLFact {
  fact: string;
  value: number;
  unit: string;
  periodStart?: string;
  periodEnd: string;
  form: string;
  filed: string;
  accession: string;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ cik: string }> }
) {
  const { cik } = await context.params;
  const { searchParams } = new URL(request.url);
  const accession = searchParams.get("accession");

  // Pad CIK to 10 digits
  const paddedCik = cik.padStart(10, "0");

  try {
    // Fetch company facts from SEC XBRL API
    const res = await fetch(
      `https://data.sec.gov/api/xbrl/companyfacts/CIK${paddedCik}.json`,
      {
        headers: {
          "User-Agent": SEC_USER_AGENT,
          Accept: "application/json",
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `SEC API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const facts: XBRLFact[] = [];

    // Process us-gaap facts
    if (data.facts?.["us-gaap"]) {
      for (const [factName, factData] of Object.entries(data.facts["us-gaap"] as Record<string, { units?: Record<string, Array<{ val: number; start?: string; end: string; form: string; filed: string; accn: string }>> }>)) {
        if (!factData.units) continue;

        for (const [unit, values] of Object.entries(factData.units)) {
          for (const v of values) {
            // If filtering by accession, only include matching facts
            if (accession && v.accn !== accession) continue;

            facts.push({
              fact: `us-gaap:${factName}`,
              value: v.val,
              unit: unit === "USD" ? "USD" : unit === "shares" ? "shares" : "pure",
              periodStart: v.start,
              periodEnd: v.end,
              form: v.form,
              filed: v.filed,
              accession: v.accn,
            });
          }
        }
      }
    }

    // Process dei facts (entity info like shares outstanding)
    if (data.facts?.["dei"]) {
      for (const [factName, factData] of Object.entries(data.facts["dei"] as Record<string, { units?: Record<string, Array<{ val: number; start?: string; end: string; form: string; filed: string; accn: string }>> }>)) {
        if (!factData.units) continue;

        for (const [unit, values] of Object.entries(factData.units)) {
          for (const v of values) {
            if (accession && v.accn !== accession) continue;

            facts.push({
              fact: `dei:${factName}`,
              value: v.val,
              unit: unit === "USD" ? "USD" : unit === "shares" ? "shares" : "pure",
              periodStart: v.start,
              periodEnd: v.end,
              form: v.form,
              filed: v.filed,
              accession: v.accn,
            });
          }
        }
      }
    }

    // Sort by filed date (newest first), then by fact name
    facts.sort((a, b) => {
      const dateCompare = b.filed.localeCompare(a.filed);
      if (dateCompare !== 0) return dateCompare;
      return a.fact.localeCompare(b.fact);
    });

    return NextResponse.json({
      cik: paddedCik,
      entityName: data.entityName,
      facts,
    });
  } catch (error) {
    console.error("XBRL fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch XBRL data" },
      { status: 500 }
    );
  }
}
