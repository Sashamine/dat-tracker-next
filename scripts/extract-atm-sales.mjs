/**
 * Extract ATM equity sales from 424B5 prospectus supplements
 * These fund a large portion of BTC purchases
 */

const CIK = '1050446';

async function fetch424B5(accession) {
  const accClean = accession.replace(/-/g, '');
  
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accClean}/index.json`;
  const res = await fetch(indexUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const index = await res.json();
  
  // Find the main document (usually .htm)
  const doc = index.directory.item.find(d => 
    (d.name.endsWith('.htm') || d.name.endsWith('.html')) && 
    !d.name.includes('ex') &&
    d.size > 10000  // Main doc should be substantial
  );
  if (!doc) return null;
  
  const docUrl = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accClean}/${doc.name}`;
  const docRes = await fetch(docUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const content = await docRes.text();
  
  return {
    content: content.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' '),
    docName: doc.name,
  };
}

function extractATMData(content, filingDate) {
  const lower = content.toLowerCase();
  
  // Check if it's an ATM-related filing
  const isATM = lower.includes('at-the-market') || lower.includes('atm') || 
                lower.includes('equity distribution') || lower.includes('sales agreement');
  
  if (!isATM) return null;
  
  // Determine security type
  let securityType = 'Class A Common';
  if (lower.includes('strk') || lower.includes('series a preferred') || lower.includes('8.00%')) {
    securityType = 'STRK (Series A Preferred)';
  } else if (lower.includes('strf') || lower.includes('series a perpetual') || lower.includes('10.00%')) {
    securityType = 'STRF (Perpetual Preferred)';
  }
  
  const result = {
    securityType,
    programSize: null,
    sharesSold: null,
    grossProceeds: null,
    netProceeds: null,
    avgPrice: null,
    isUpdate: false,
  };
  
  // Extract program size (total authorization)
  const programPatterns = [
    /aggregate (?:offering|sales) price of up to \$([\d,.]+) (million|billion)/i,
    /up to \$([\d,.]+) (million|billion) (?:of|in) (?:shares|class a)/i,
    /\$([\d,.]+) (million|billion) at-the-market/i,
  ];
  
  for (const pattern of programPatterns) {
    const match = content.match(pattern);
    if (match) {
      let amount = parseFloat(match[1].replace(/,/g, ''));
      if (match[2].toLowerCase() === 'billion') amount *= 1e9;
      else amount *= 1e6;
      result.programSize = amount;
      break;
    }
  }
  
  // Extract shares sold (for periodic updates)
  const sharesPatterns = [
    /sold (?:approximately |an aggregate of )?([\d,]+) shares/i,
    /([\d,]+) shares (?:of class a common stock )?(?:were |have been )?sold/i,
    /aggregate of ([\d,]+) shares/i,
  ];
  
  for (const pattern of sharesPatterns) {
    const match = content.match(pattern);
    if (match) {
      result.sharesSold = parseInt(match[1].replace(/,/g, ''), 10);
      result.isUpdate = true;
      break;
    }
  }
  
  // Extract gross/net proceeds
  const proceedsPatterns = [
    /gross proceeds of (?:approximately )?\$([\d,.]+) (million|billion)/i,
    /net proceeds of (?:approximately )?\$([\d,.]+) (million|billion)/i,
    /aggregate gross proceeds of \$([\d,.]+) (million|billion)/i,
    /proceeds (?:of|from) (?:approximately )?\$([\d,.]+) (million|billion)/i,
  ];
  
  for (const pattern of proceedsPatterns) {
    const match = content.match(pattern);
    if (match) {
      let amount = parseFloat(match[1].replace(/,/g, ''));
      if (match[2].toLowerCase() === 'billion') amount *= 1e9;
      else amount *= 1e6;
      
      if (match[0].toLowerCase().includes('net')) {
        result.netProceeds = amount;
      } else {
        result.grossProceeds = amount;
      }
    }
  }
  
  // Extract average price
  const avgPricePatterns = [
    /average (?:sale |selling )?price of \$([\d,.]+)/i,
    /weighted average price of \$([\d,.]+)/i,
    /\$([\d,.]+) per share/i,
  ];
  
  for (const pattern of avgPricePatterns) {
    const match = content.match(pattern);
    if (match) {
      result.avgPrice = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }
  
  // Only return if we found meaningful data
  if (!result.programSize && !result.sharesSold && !result.grossProceeds) {
    return null;
  }
  
  return result;
}

async function run() {
  console.log('Extracting ATM equity sales from 424B5 filings...\n');
  
  const subUrl = 'https://data.sec.gov/submissions/CIK0001050446.json';
  const subRes = await fetch(subUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const subData = await subRes.json();
  
  const recent = subData.filings.recent;
  
  const atmSales = [];
  
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] !== '424B5') continue;
    if (recent.filingDate[i] < '2020-08-01') continue;
    
    process.stdout.write(`${recent.filingDate[i]}... `);
    
    const result = await fetch424B5(recent.accessionNumber[i]);
    if (!result) {
      console.log('skip (no content)');
      continue;
    }
    
    const data = extractATMData(result.content, recent.filingDate[i]);
    
    if (data) {
      const summary = [];
      if (data.programSize) summary.push(`$${(data.programSize/1e9).toFixed(2)}B program`);
      if (data.sharesSold) summary.push(`${data.sharesSold.toLocaleString()} shares`);
      if (data.grossProceeds) summary.push(`$${(data.grossProceeds/1e6).toFixed(0)}M gross`);
      
      console.log(`✓ ${data.securityType}: ${summary.join(', ')}`);
      
      atmSales.push({
        filingDate: recent.filingDate[i],
        accessionNumber: recent.accessionNumber[i],
        docName: result.docName,
        ...data,
      });
    } else {
      console.log('- (not ATM or no data)');
    }
    
    await new Promise(r => setTimeout(r, 150));
  }
  
  // Sort by date
  atmSales.sort((a, b) => a.filingDate.localeCompare(b.filingDate));
  
  console.log('\n' + '='.repeat(70));
  console.log(`Extracted ${atmSales.length} ATM-related 424B5 filings`);
  console.log('='.repeat(70));
  
  // Summarize
  const programs = atmSales.filter(s => s.programSize && !s.isUpdate);
  const updates = atmSales.filter(s => s.isUpdate);
  
  console.log(`\nProgram announcements: ${programs.length}`);
  console.log(`Sales updates: ${updates.length}`);
  
  // Calculate totals from updates
  const totalShares = updates.reduce((s, u) => s + (u.sharesSold || 0), 0);
  const totalGross = updates.reduce((s, u) => s + (u.grossProceeds || 0), 0);
  
  if (totalShares) console.log(`Total shares sold (from updates): ${totalShares.toLocaleString()}`);
  if (totalGross) console.log(`Total gross proceeds: $${(totalGross/1e9).toFixed(2)}B`);
  
  // Write to file
  const fs = await import('fs');
  fs.writeFileSync('src/lib/data/mstr-atm-sales.ts', generateTypeScript(atmSales));
  console.log('\nWrote src/lib/data/mstr-atm-sales.ts');
}

function generateTypeScript(sales) {
  const lines = [
    '/**',
    ' * MSTR ATM Equity Sales',
    ' * ======================',
    ' * ',
    ' * At-the-market stock sales extracted from SEC 424B5 filings.',
    ' * These funded a large portion of BTC purchases.',
    ' * ',
    ` * Generated: ${new Date().toISOString()}`,
    ` * Total filings: ${sales.length}`,
    ' */',
    '',
    'export interface ATMSaleEvent {',
    '  filingDate: string;',
    '  securityType: string;',
    '  programSize: number | null;',
    '  sharesSold: number | null;',
    '  grossProceeds: number | null;',
    '  netProceeds: number | null;',
    '  avgPrice: number | null;',
    '  isUpdate: boolean;',
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
    lines.push(`    securityType: "${s.securityType}",`);
    lines.push(`    programSize: ${s.programSize ?? 'null'},`);
    lines.push(`    sharesSold: ${s.sharesSold ?? 'null'},`);
    lines.push(`    grossProceeds: ${s.grossProceeds ?? 'null'},`);
    lines.push(`    netProceeds: ${s.netProceeds ?? 'null'},`);
    lines.push(`    avgPrice: ${s.avgPrice ?? 'null'},`);
    lines.push(`    isUpdate: ${s.isUpdate},`);
    lines.push(`    accessionNumber: "${s.accessionNumber}",`);
    lines.push(`    secUrl: "${secUrl}",`);
    lines.push('  },');
  }
  
  lines.push('];');
  lines.push('');
  lines.push('export function getTotalATMProceeds(): number {');
  lines.push('  return MSTR_ATM_SALES');
  lines.push('    .filter(s => s.isUpdate && s.grossProceeds)');
  lines.push('    .reduce((sum, s) => sum + (s.grossProceeds || 0), 0);');
  lines.push('}');
  lines.push('');
  
  return lines.join('\n');
}

run().catch(console.error);
