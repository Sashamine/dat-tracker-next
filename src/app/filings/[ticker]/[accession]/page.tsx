import { notFound } from "next/navigation";
import * as fs from "fs";
import * as path from "path";

interface PageProps {
  params: Promise<{
    ticker: string;
    accession: string;
  }>;
  searchParams: Promise<{
    highlight?: string;
  }>;
}

export default async function FilingViewerPage({ params, searchParams }: PageProps) {
  const { ticker, accession } = await params;
  const { highlight } = await searchParams;
  
  const tickerUpper = ticker.toUpperCase();
  
  // Find the filing file
  const dataDir = path.join(process.cwd(), "data", "sec", ticker.toLowerCase(), "8k");
  
  let filingContent = "";
  let filingDate = "";
  let filingFile = "";
  
  try {
    // Look for file matching the accession
    const files = fs.readdirSync(dataDir);
    const matchingFile = files.find(f => f.includes(accession) && f.endsWith(".html"));
    
    if (!matchingFile) {
      // Try to find by date pattern in accession
      const dateMatch = accession.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        const dateFile = files.find(f => f.includes(dateMatch[1]));
        if (dateFile) {
          filingFile = dateFile;
        }
      }
    } else {
      filingFile = matchingFile;
    }
    
    if (!filingFile) {
      return notFound();
    }
    
    // Extract date from filename
    const dateExtract = filingFile.match(/8k-(\d{4}-\d{2}-\d{2})/);
    filingDate = dateExtract ? dateExtract[1] : "Unknown";
    
    // Read the file
    const filePath = path.join(dataDir, filingFile);
    filingContent = fs.readFileSync(filePath, "utf-8");
    
    // If highlight param exists, wrap matching text in a highlight span
    if (highlight) {
      const highlightText = decodeURIComponent(highlight);
      // Find and wrap the text (case insensitive, partial match)
      const regex = new RegExp(`(${highlightText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').substring(0, 50)})`, "gi");
      filingContent = filingContent.replace(regex, '<mark id="highlight" style="background-color: #fef08a; padding: 2px 4px;">$1</mark>');
    }
    
    // Inject scroll-to-highlight script and basic styling
    const scrollScript = highlight ? `
      <script>
        window.addEventListener('load', function() {
          const highlight = document.getElementById('highlight');
          if (highlight) {
            highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      </script>
    ` : "";
    
    // Wrap content with our styling
    const styledContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${tickerUpper} 8-K Filing - ${filingDate}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background: #f9fafb;
          }
          .filing-header {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 20px;
            position: sticky;
            top: 0;
            z-index: 100;
          }
          .filing-header h1 {
            margin: 0 0 8px 0;
            font-size: 18px;
            color: #111827;
          }
          .filing-header p {
            margin: 0;
            font-size: 14px;
            color: #6b7280;
          }
          .filing-header a {
            color: #4f46e5;
            text-decoration: none;
          }
          .filing-header a:hover {
            text-decoration: underline;
          }
          .filing-content {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
          }
          mark {
            background-color: #fef08a !important;
            padding: 2px 4px;
            border-radius: 2px;
          }
        </style>
        ${scrollScript}
      </head>
      <body>
        <div class="filing-header">
          <h1>${tickerUpper} Form 8-K - ${filingDate}</h1>
          <p>
            <a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=8-K" target="_blank">View on SEC EDGAR →</a>
            ${highlight ? ' | <span style="color: #d97706;">Highlighted text below</span>' : ''}
          </p>
        </div>
        <div class="filing-content">
          ${filingContent}
        </div>
      </body>
      </html>
    `;
    
    return (
      <iframe
        srcDoc={styledContent}
        className="w-full h-screen border-0"
        title={`${tickerUpper} 8-K Filing - ${filingDate}`}
      />
    );
    
  } catch (error) {
    console.error("Error loading filing:", error);
    return notFound();
  }
}
