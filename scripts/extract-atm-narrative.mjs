/**
 * Extract ATM sales from narrative format (late 2024 - early 2025)
 * Pattern: "sold an aggregate of X Shares...for aggregate [net] proceeds of $Y"
 */

const CIK = '1050446';

async function fetch8K(accession) {
  const accClean = accession.replace(/-/g, '');
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accClean}/index.json`;
  const res = await fetch(indexUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const index = await res.json();
  
  const doc = index.directory.item.find(d => d.name.endsWith('.htm') && !d.name.includes('ex'));
  if (!doc) return null;
  
  const docUrl = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accClean}/${doc.name}`;
  const docRes = await fetch(docUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const content = await docRes.text();
  
  return {
    content: content.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' '),
    docName: doc.name,
  };
}

function extractNarrativeATM(content) {
  // Pattern: "sold an aggregate of X Shares...for aggregate [gross/net] proceeds of $Y [million/billion]"
  // Note: Some filings have space after $: "$ 4.6 billion"
  const patterns = [
    // Main pattern with shares and proceeds (handles "$ 4.6 billion" spacing)
    /sold an aggregate of ([\d,]+) Shares[^$]*for aggregate (?:gross |net )?proceeds[^$]*\$\s*([\d,.]+)\s*(million|billion)/i,
    // Alternative: "aggregate of X shares...net proceeds...approximately $Y"
    /aggregate of ([\d,]+) Shares[^$]*(?:net|gross) proceeds[^$]*\$\s*([\d,.]+)\s*(million|billion)/i,
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const shares = parseInt(match[1].replace(/,/g, ''), 10);
      let proceeds = parseFloat(match[2].replace(/,/g, ''));
      if (match[3].toLowerCase() === 'billion') proceeds *= 1e9;
      else proceeds *= 1e6;
      
      return { shares, proceeds, format: 'narrative' };
    }
  }
  
  // Check for "did not sell any shares" pattern
  if (content.includes('did not sell any shares')) {
    return { shares: 0, proceeds: 0, format: 'narrative-zero' };
  }
  
  return null;
}

function extractTableATM(content) {
  // Check for table format (has "ATM Program Summary" or "ATM Update")
  if (!content.includes('ATM Program Summary') && !content.includes('ATM Update')) return null;
  
  // Handle "Total $X", "Total $ X", "Total $X billion", "Total $X million"
  // Capture the number AND the optional unit (billion/million)
  const totalMatch = content.match(/Total\s+\$\s*([\d,.]+)\s*(billion|million)?/i);
  
  // Validate - if no match, skip
  if (!totalMatch) return null;
  
  // Calculate total proceeds based on unit
  const rawAmount = parseFloat(totalMatch[1].replace(/,/g, ''));
  const unit = totalMatch[2]?.toLowerCase();
  
  let totalProceeds;
  if (unit === 'billion') {
    totalProceeds = rawAmount * 1e9;
  } else if (unit === 'million') {
    totalProceeds = rawAmount * 1e6;
  } else {
    // No unit - assume millions for values > 10, billions for small decimals
    totalProceeds = rawAmount < 10 ? rawAmount * 1e9 : rawAmount * 1e6;
  }
  
  // Sanity check
  if (totalProceeds > 50e9) return null;
  
  // Extract share counts - two formats:
  // Old: "STRK ATM 575,392 STRK Shares"
  // New: "STRK Stock 38,796" or "MSTR Stock 10,399,650"
  const sharesByProgram = {};
  const programPatterns = [
    // Old format: "XXX ATM 123,456 XXX Shares"
    { name: 'Common ATM', regex: /Common ATM.*?(\d{1,3}(?:,\d{3})*)\s+MSTR\s+Shares/i },
    { name: 'MSTR ATM', regex: /MSTR ATM.*?(\d{1,3}(?:,\d{3})*)\s+MSTR\s+Shares/i },
    { name: 'STRK ATM', regex: /STRK ATM\s+(\d{1,3}(?:,\d{3})*)\s+STRK\s+Shares/i },
    { name: 'STRF ATM', regex: /STRF ATM\s+(\d{1,3}(?:,\d{3})*)\s+STRF\s+Shares/i },
    { name: 'STRC ATM', regex: /STRC ATM\s+(\d{1,3}(?:,\d{3})*)\s+STRC\s+Shares/i },
    { name: 'STRD ATM', regex: /STRD ATM\s+(\d{1,3}(?:,\d{3})*)\s+STRD\s+Shares/i },
    // New format: "MSTR Stock 10,399,650"
    { name: 'MSTR ATM', regex: /MSTR Stock\s+(\d{1,3}(?:,\d{3})*)/i },
    { name: 'STRK ATM', regex: /STRK Stock\s+(\d{1,3}(?:,\d{3})*)/i },
    { name: 'STRF ATM', regex: /STRF Stock\s+(\d{1,3}(?:,\d{3})*)/i },
    { name: 'STRC ATM', regex: /STRC Stock\s+(\d{1,3}(?:,\d{3})*)/i },
    { name: 'STRD ATM', regex: /STRD Stock\s+(\d{1,3}(?:,\d{3})*)/i },
  ];
  
  let totalShares = 0;
  for (const { name, regex } of programPatterns) {
    const match = content.match(regex);
    if (match) {
      const shares = parseInt(match[1].replace(/,/g, ''), 10);
      if (shares > 0) {
        sharesByProgram[name] = shares;
        totalShares += shares;
      }
    }
  }
  
  return { 
    shares: totalShares, 
    proceeds: totalProceeds, 
    sharesByProgram,
    format: 'table' 
  };
}

async function run() {
  console.log('Extracting ATM sales (all formats)...\n');
  
  const subUrl = 'https://data.sec.gov/submissions/CIK0001050446.json';
  const subRes = await fetch(subUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const subData = await subRes.json();
  
  const recent = subData.filings.recent;
  const allSales = [];
  
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] !== '8-K') continue;
    if (recent.filingDate[i] < '2024-10-01') continue;  // ATM started Oct 2024
    
    process.stdout.write(`${recent.filingDate[i]}... `);
    
    const result = await fetch8K(recent.accessionNumber[i]);
    if (!result) { console.log('skip'); continue; }
    
    // Try table format first (more structured)
    let data = extractTableATM(result.content);
    
    // Fall back to narrative format
    if (!data) {
      data = extractNarrativeATM(result.content);
    }
    
    if (data && (data.shares > 0 || data.proceeds > 0)) {
      console.log(`✓ [${data.format}] ${data.shares.toLocaleString()} shares, $${(data.proceeds/1e6).toFixed(1)}M`);
      
      allSales.push({
        filingDate: recent.filingDate[i],
        accessionNumber: recent.accessionNumber[i],
        docName: result.docName,
        ...data,
      });
    } else if (data && data.format === 'narrative-zero') {
      console.log('✓ [narrative] no sales this period');
    } else {
      // Check if it has ATM content at all
      const hasATM = result.content.toLowerCase().includes('atm update');
      console.log(hasATM ? '? (ATM mentioned but not parsed)' : '-');
    }
    
    await new Promise(r => setTimeout(r, 100));
  }
  
  allSales.sort((a, b) => a.filingDate.localeCompare(b.filingDate));
  
  console.log('\n' + '='.repeat(70));
  console.log(`Extracted ${allSales.length} ATM sale events`);
  console.log('='.repeat(70));
  
  // Aggregate
  const totalShares = allSales.reduce((s, e) => s + e.shares, 0);
  const totalProceeds = allSales.reduce((s, e) => s + e.proceeds, 0);
  
  const byFormat = {};
  for (const sale of allSales) {
    byFormat[sale.format] = (byFormat[sale.format] || 0) + 1;
  }
  
  console.log('\nBy Format:');
  for (const [format, count] of Object.entries(byFormat)) {
    console.log(`  ${format}: ${count} filings`);
  }
  
  console.log(`\nTotal Shares Sold: ${totalShares.toLocaleString()}`);
  console.log(`Total Net Proceeds: $${(totalProceeds/1e9).toFixed(3)}B`);
  
  // Write output
  const fs = await import('fs');
  fs.writeFileSync('src/lib/data/mstr-atm-sales.ts', generateTypeScript(allSales, totalShares, totalProceeds));
  console.log('\nWrote src/lib/data/mstr-atm-sales.ts');
}

function generateTypeScript(sales, totalShares, totalProceeds) {
  const lines = [
    '/**',
    ' * MSTR ATM Equity Sales',
    ' * ======================',
    ' * ',
    ' * Combines narrative format (late 2024) and table format (2025+).',
    ' * ',
    ` * Generated: ${new Date().toISOString()}`,
    ` * Total events: ${sales.length}`,
    ` * Total shares: ${totalShares.toLocaleString()}`,
    ` * Total proceeds: $${(totalProceeds/1e9).toFixed(2)}B`,
    ' */',
    '',
    'export interface ATMSaleEvent {',
    '  filingDate: string;',
    '  shares: number;',
    '  proceeds: number;',
    '  format: "narrative" | "table";',
    '  sharesByProgram?: Record<string, number>;',
    '  accessionNumber: string;',
    '  secUrl: string;',
    '}',
    '',
    'export const MSTR_ATM_SALES: ATMSaleEvent[] = [',
  ];
  
  for (const s of sales) {
    const accClean = s.accessionNumber.replace(/-/g, '');
    const secUrl = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accClean}/${s.docName}`;
    
    lines.push('  {');
    lines.push(`    filingDate: "${s.filingDate}",`);
    lines.push(`    shares: ${s.shares},`);
    lines.push(`    proceeds: ${s.proceeds},`);
    lines.push(`    format: "${s.format}",`);
    if (s.sharesByProgram) {
      lines.push(`    sharesByProgram: ${JSON.stringify(s.sharesByProgram)},`);
    }
    lines.push(`    accessionNumber: "${s.accessionNumber}",`);
    lines.push(`    secUrl: "${secUrl}",`);
    lines.push('  },');
  }
  
  lines.push('];');
  lines.push('');
  lines.push(`export const ATM_TOTAL_SHARES = ${totalShares};`);
  lines.push(`export const ATM_TOTAL_PROCEEDS = ${totalProceeds};`);
  lines.push('');
  
  return lines.join('\n');
}

run().catch(console.error);
