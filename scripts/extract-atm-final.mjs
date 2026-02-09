/**
 * Extract ATM sales - use the "Total $X" line as authoritative proceeds
 * Individual program rows for share counts only
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

function extractATMData(content) {
  if (!content.includes('ATM Program Summary') && !content.toLowerCase().includes('atm updates')) {
    return null;
  }
  
  // Extract "Total $X" - this is the authoritative net proceeds
  // Pattern: "Total $180.3" or "Total $112.2"
  const totalMatch = content.match(/Total\s+\$([\d,.]+)(?:\s|$)/);
  const totalProceeds = totalMatch 
    ? parseFloat(totalMatch[1].replace(/,/g, '')) * 1e6 
    : null;
  
  // Extract share counts per program (these are reliable)
  const sharesByProgram = {};
  
  const programPatterns = [
    { name: 'Common ATM', regex: /Common ATM.*?(\d{1,3}(?:,\d{3})*)\s+MSTR\s+Shares/i },
    { name: 'MSTR ATM', regex: /MSTR ATM.*?(\d{1,3}(?:,\d{3})*)\s+MSTR\s+Shares/i },
    { name: 'STRK ATM', regex: /STRK ATM\s+(\d{1,3}(?:,\d{3})*)\s+STRK\s+Shares/i },
    { name: 'STRF ATM', regex: /STRF ATM\s+(\d{1,3}(?:,\d{3})*)\s+STRF\s+Shares/i },
    { name: 'STRC ATM', regex: /STRC ATM\s+(\d{1,3}(?:,\d{3})*)\s+STRC\s+Shares/i },
    { name: 'STRD ATM', regex: /STRD ATM\s+(\d{1,3}(?:,\d{3})*)\s+STRD\s+Shares/i },
  ];
  
  for (const { name, regex } of programPatterns) {
    const match = content.match(regex);
    if (match) {
      const shares = parseInt(match[1].replace(/,/g, ''), 10);
      // Only add if we found actual shares (not 0)
      if (shares > 0) {
        sharesByProgram[name] = shares;
      }
    }
  }
  
  // If no Total and no shares, skip
  if (!totalProceeds && Object.keys(sharesByProgram).length === 0) {
    return null;
  }
  
  return { sharesByProgram, totalProceeds };
}

async function run() {
  console.log('Extracting ATM sales (using Total line as authoritative)...\n');
  
  const subUrl = 'https://data.sec.gov/submissions/CIK0001050446.json';
  const subRes = await fetch(subUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const subData = await subRes.json();
  
  const recent = subData.filings.recent;
  const allSales = [];
  
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] !== '8-K') continue;
    if (recent.filingDate[i] < '2024-10-01') continue;
    
    process.stdout.write(`${recent.filingDate[i]}... `);
    
    const result = await fetch8K(recent.accessionNumber[i]);
    if (!result) { console.log('skip'); continue; }
    
    const data = extractATMData(result.content);
    
    if (data) {
      const programs = Object.entries(data.sharesByProgram)
        .map(([name, shares]) => `${name}: ${shares.toLocaleString()}`)
        .join(', ');
      
      if (data.totalProceeds) {
        console.log(`✓ $${(data.totalProceeds/1e6).toFixed(1)}M | ${programs || 'no sales'}`);
      } else {
        console.log(`✓ (no total) | ${programs || 'no sales'}`);
      }
      
      allSales.push({
        filingDate: recent.filingDate[i],
        accessionNumber: recent.accessionNumber[i],
        docName: result.docName,
        ...data,
      });
    } else {
      console.log('-');
    }
    
    await new Promise(r => setTimeout(r, 100));
  }
  
  allSales.sort((a, b) => a.filingDate.localeCompare(b.filingDate));
  
  console.log('\n' + '='.repeat(70));
  console.log(`Extracted ${allSales.length} ATM update filings`);
  console.log('='.repeat(70));
  
  // Aggregate
  const aggregateShares = {};
  let totalNetProceeds = 0;
  
  for (const sale of allSales) {
    for (const [prog, shares] of Object.entries(sale.sharesByProgram)) {
      aggregateShares[prog] = (aggregateShares[prog] || 0) + shares;
    }
    totalNetProceeds += (sale.totalProceeds || 0);
  }
  
  console.log('\nShare Sales by Program:');
  for (const [name, shares] of Object.entries(aggregateShares).sort()) {
    console.log(`  ${name.padEnd(15)} ${shares.toLocaleString().padStart(15)} shares`);
  }
  
  console.log(`\nTotal Net Proceeds: $${(totalNetProceeds/1e9).toFixed(3)}B`);
  console.log(`(from ${allSales.filter(s => s.totalProceeds).length} filings with Total line)`);
  
  // Write output
  const fs = await import('fs');
  fs.writeFileSync('src/lib/data/mstr-atm-sales.ts', generateTypeScript(allSales, aggregateShares, totalNetProceeds));
  console.log('\nWrote src/lib/data/mstr-atm-sales.ts');
}

function generateTypeScript(sales, aggregateShares, totalNetProceeds) {
  const lines = [
    '/**',
    ' * MSTR ATM Equity Sales',
    ' * ======================',
    ' * ',
    ' * Weekly ATM updates from 8-K filings.',
    ' * Net proceeds from "Total" line (authoritative).',
    ' * Share counts extracted per program.',
    ' * ',
    ` * Generated: ${new Date().toISOString()}`,
    ` * Total filings: ${sales.length}`,
    ` * Total net proceeds: $${(totalNetProceeds/1e9).toFixed(2)}B`,
    ' */',
    '',
    'export interface ATMWeeklyUpdate {',
    '  filingDate: string;',
    '  sharesByProgram: Record<string, number>;',
    '  totalProceeds: number | null;',
    '  accessionNumber: string;',
    '  secUrl: string;',
    '}',
    '',
    'export const MSTR_ATM_UPDATES: ATMWeeklyUpdate[] = [',
  ];
  
  for (const s of sales) {
    const accClean = s.accessionNumber.replace(/-/g, '');
    const secUrl = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accClean}/${s.docName}`;
    
    lines.push('  {');
    lines.push(`    filingDate: "${s.filingDate}",`);
    lines.push(`    sharesByProgram: ${JSON.stringify(s.sharesByProgram)},`);
    lines.push(`    totalProceeds: ${s.totalProceeds ?? 'null'},`);
    lines.push(`    accessionNumber: "${s.accessionNumber}",`);
    lines.push(`    secUrl: "${secUrl}",`);
    lines.push('  },');
  }
  
  lines.push('];');
  lines.push('');
  lines.push('// Aggregate totals');
  lines.push(`export const ATM_TOTAL_SHARES: Record<string, number> = ${JSON.stringify(aggregateShares, null, 2)};`);
  lines.push('');
  lines.push(`export const ATM_TOTAL_NET_PROCEEDS = ${totalNetProceeds};`);
  lines.push('');
  
  return lines.join('\n');
}

run().catch(console.error);
