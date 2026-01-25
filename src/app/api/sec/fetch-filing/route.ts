// SEC Filing Content Fetcher
// Fetches actual filing content from SEC EDGAR with proper headers
// GET /api/sec/fetch-filing?url=<SEC_URL>

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// SEC requires a User-Agent with contact info
const SEC_USER_AGENT = "DATTracker/1.0 (https://dat-tracker-next.vercel.app; contact@dattracker.com)";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 });
  }

  // Only allow SEC URLs
  if (!url.includes("sec.gov")) {
    return NextResponse.json({ error: "Only SEC URLs are allowed" }, { status: 400 });
  }

  try {
    console.log(`[SEC Fetch] Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        "User-Agent": SEC_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,text/plain,application/xml",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({
        error: `SEC returned ${response.status}`,
        url,
      }, { status: response.status });
    }

    const content = await response.text();

    // Clean HTML to extract text content
    const cleanedContent = cleanHtmlContent(content);

    return NextResponse.json({
      url,
      contentLength: content.length,
      cleanedLength: cleanedContent.length,
      content: cleanedContent.substring(0, 50000), // Limit response size
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[SEC Fetch] Error:", error);
    return NextResponse.json({
      error: "Failed to fetch filing",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

// Clean HTML content to extract readable text
function cleanHtmlContent(html: string): string {
  return html
    // Remove style tags and content
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    // Remove script tags and content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, "")
    // Replace common entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    // Remove all HTML tags
    .replace(/<[^>]*>/g, " ")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}
