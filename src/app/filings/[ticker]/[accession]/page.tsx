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

// Filing types to search, in priority order
const FILING_TYPES = ["8k", "10k", "10q"] as const;
type FilingType = typeof FILING_TYPES[number];

const FILING_TYPE_LABELS: Record<FilingType, string> = {
  "8k": "Form 8-K",
  "10k": "Form 10-K (Annual Report)",
  "10q": "Form 10-Q (Quarterly Report)",
};

export default async function FilingViewerPage({ params, searchParams }: PageProps) {
  const { ticker, accession } = await params;
  const { highlight } = await searchParams;
  
  const tickerUpper = ticker.toUpperCase();
  const tickerLower = ticker.toLowerCase();
  
  let filingContent = "";
  let filingDate = "";
  let filingFile = "";
  let filingType: FilingType = "8k";
  let foundFilingDir = "";
  
  try {
    // Search all filing type folders for matching file
    for (const type of FILING_TYPES) {
      const dataDir = path.join(process.cwd(), "data", "sec", tickerLower, type);
      
      // Skip if directory doesn't exist
      if (!fs.existsSync(dataDir)) continue;
      
      const files = fs.readdirSync(dataDir);
      
      // Look for file matching the accession
      let matchingFile = files.find(f => f.includes(accession) && f.endsWith(".html"));
      
      if (!matchingFile) {
        // Try to find by date pattern in accession (e.g., "2025-09-30")
        const dateMatch = accession.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          matchingFile = files.find(f => f.includes(dateMatch[1]) && f.endsWith(".html"));
        }
      }
      
      if (matchingFile) {
        filingFile = matchingFile;
        filingType = type;
        foundFilingDir = dataDir;
        break;
      }
    }
    
    if (!filingFile || !foundFilingDir) {
      return notFound();
    }
    
    // Extract date from filename (handles 8k-DATE, 10k-DATE, 10q-DATE patterns)
    const dateExtract = filingFile.match(/(?:8k|10k|10q)-(\d{4}-\d{2}-\d{2})/i);
    filingDate = dateExtract ? dateExtract[1] : "Unknown";
    
    // Read the file
    const filePath = path.join(foundFilingDir, filingFile);
    filingContent = fs.readFileSync(filePath, "utf-8");
    
    // If highlight param exists, find and highlight the relevant section
    if (highlight) {
      const highlightText = decodeURIComponent(highlight);
      const numMatch = highlightText.match(/[\d,]+/);
      const searchNum = numMatch ? numMatch[0] : highlightText;
      
      // For table-format filings, highlight the cell containing the number
      if (filingContent.includes(searchNum)) {
        // Add highlight style to the number itself (in table cells)
        filingContent = filingContent.replace(
          new RegExp(`(>\\s*)(${searchNum.replace(/,/g, ',')})(\\s*<)`, 'g'),
          '$1<span id="highlight" style="background-color: #fef08a; padding: 2px 6px; border-radius: 4px; font-weight: bold; box-shadow: 0 0 0 3px #eab308;">$2</span>$3'
        );
        
        // Also try to highlight prose mentions like "acquired X bitcoins"
        const prosePattern = new RegExp(`(acquired[^.]*${searchNum}[^.]*\\.)`, 'gi');
        filingContent = filingContent.replace(prosePattern, 
          '<div style="background: linear-gradient(to right, #fef08a, #fde047); padding: 16px; margin: 16px 0; border-left: 4px solid #eab308; border-radius: 4px;">$1</div>'
        );
      }
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
    
    const filingLabel = FILING_TYPE_LABELS[filingType];
    
    // Wrap content with our styling
    const styledContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${tickerUpper} ${filingLabel} - ${filingDate}</title>
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
          .filing-type-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 8px;
          }
          .badge-8k { background: #dbeafe; color: #1d4ed8; }
          .badge-10k { background: #dcfce7; color: #16a34a; }
          .badge-10q { background: #fef3c7; color: #d97706; }
          /* Highlight anchor targets (btc-holdings, operating-burn, etc.) */
          :target {
            background: linear-gradient(to right, #fef08a, #fde047) !important;
            outline: 3px solid #eab308;
            outline-offset: 2px;
            border-radius: 4px;
            animation: pulse-highlight 2s ease-in-out;
          }
          @keyframes pulse-highlight {
            0%, 100% { outline-color: #eab308; }
            50% { outline-color: #facc15; }
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
          <h1>
            ${tickerUpper} ${filingLabel} - ${filingDate}
            <span class="filing-type-badge badge-${filingType}">${filingType.toUpperCase()}</span>
          </h1>
          <p>
            <a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${tickerLower}&type=${filingType}" target="_blank">View all ${filingType.toUpperCase()} filings on SEC EDGAR →</a>
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
        title={`${tickerUpper} ${filingLabel} - ${filingDate}`}
      />
    );
    
  } catch (error) {
    console.error("Error loading filing:", error);
    return notFound();
  }
}
