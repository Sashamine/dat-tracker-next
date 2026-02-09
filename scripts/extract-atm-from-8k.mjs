/**
 * Extract ATM equity sales from 8-K weekly updates
 * These have structured tables with shares sold, proceeds, etc.
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
  const lower = content.toLowerCase();
  
  // Check if this is an ATM update filing
  if (!lower.includes('atm program summary') && !lower.includes('atm updates')) {
    return null;
  }
  
  const programs = [];
  
  // Extract each ATM program's data
  // Pattern: "2024 Common ATM 353,825 MSTR Shares $128.5 million"
  // Or: "STRK ATM 575,392 STRK Shares $51.8 million $20.87 billion"
  
  const atmPrograms = [
    { name: 'MSTR ATM', security: 'Class A Common (MSTR)' },
    { name: 'Common ATM', security: 'Class A Common (MSTR)' },
    { name: '2024 Common ATM', security: 'Class A Common (MSTR)' },
    { name: '2025 Common ATM', security: 'Class A Common (MSTR)' },
    { name: 'STRK ATM', security: 'Series A Preferred (STRK)' },
    { name: 'STRF ATM', security: 'Series A Perpetual (STRF)' },
    { name: 'STRC ATM', security: 'Series A Stretch (STRC)' },
    { name: 'STRD ATM', security: 'Series A Stride (STRD)' },
  ];
  
  for (const prog of atmPrograms) {
    // Find this program in the content
    const progIdx = content.indexOf(prog.name);
    if (progIdx < 0) continue;
    
    // Get the context around it (the row of data)
    const context = content.slice(progIdx, progIdx + 500);
    
    // Extract shares sold: "353,825 MSTR Shares" or "575,392 STRK Shares"
    const sharesMatch = context.match(/([\d,]+)\s+(?:MSTR|STRK|STRF|STRC|STRD)\s+Shares/i);
    
    // Extract net proceeds: "$128.5 million" or "$51.8 million"
    const proceedsMatch = context.match(/\$([\d,.]+)\s*(million|billion)/gi);
    
    if (sharesMatch || proceedsMatch) {
      const data = {
        program: prog.name.replace('2024 ', '').replace('2025 ', ''),
        security: prog.security,
        sharesSold: sharesMatch ? parseInt(sharesMatch[1].replace(/,/g, ''), 10) : 0,
        netProceeds: 0,
      };
      
      // Find net proceeds (usually the first or second $ amount)
      if (proceedsMatch) {
        for (const match of proceedsMatch) {
          const numMatch = match.match(/\$([\d,.]+)\s*(million|billion)/i);
          if (numMatch) {
            let amount = parseFloat(numMatch[1].replace(/,/g, ''));
            if (numMatch[2].toLowerCase() === 'billion') amount *= 1e9;
            else amount *= 1e6;
            
            // Take the first reasonable amount as proceeds
            if (amount > 0 && amount < 1e12 && data.netProceeds === 0) {
              data.netProceeds = amount;
            }
          }
        }
      }
      
      // Only add if we have actual sales
      if (data.sharesSold > 0 || data.netProceeds > 0) {
        programs.push(data);
      }
    }
  }
  
  // Also try to extract total proceeds
  const totalMatch = content.match(/Total\s+\$([\d,.]+)\s*(million|billion)?/i);
  let totalProceeds = null;
  if (totalMatch) {
    totalProceeds = parseFloat(totalMatch[1].replace(/,/g, ''));
    if (totalMatch[2]?.toLowerCase() === 'billion') totalProceeds *= 1e9;
    else if (totalMatch[2]?.toLowerCase() === 'million' || totalProceeds < 1000) totalProceeds *= 1e6;
  }
  
  if (programs.length === 0) return null;
  
  return { programs, totalProceeds };
}

async function run() {
  console.log('Extracting ATM sales from 8-K weekly updates...\n');
  
  const subUrl = 'https://data.sec.gov/submissions/CIK0001050446.json';
  const subRes = await fetch(subUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const subData = await subRes.json();
  
  const recent = subData.filings.recent;
  
  const allSales = [];
  
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] !== '8-K') continue;
    if (recent.filingDate[i] < '2024-10-01') continue; // ATM updates started late 2024
    
    process.stdout.write(`${recent.filingDate[i]}... `);
    
    const result = await fetch8K(recent.accessionNumber[i]);
    if (!result) {
      console.log('skip');
      continue;
    }
    
    const data = extractATMData(result.content);
    
    if (data) {
      const summary = data.programs.map(p => `${p.program}: ${p.sharesSold.toLocaleString()} shares`).join(', ');
      console.log(`✓ ${summary}`);
      
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
  
  // Sort by date
  allSales.sort((a, b) => a.filingDate.localeCompare(b.filingDate));
  
  console.log('\n' + '='.repeat(70));
  console.log(`Extracted ${allSales.length} ATM update filings`);
  console.log('='.repeat(70));
  
  // Aggregate by program
  const byProgram = {};
  for (const sale of allSales) {
    for (const prog of sale.programs) {
      if (!byProgram[prog.program]) {
        byProgram[prog.program] = { shares: 0, proceeds: 0 };
      }
      byProgram[prog.program].shares += prog.sharesSold;
      byProgram[prog.program].proceeds += prog.netProceeds;
    }
  }
  
  console.log('\nBy ATM Program:');
  let grandTotal = 0;
  for (const [name, data] of Object.entries(byProgram).sort()) {
    console.log(`  ${name}: ${data.shares.toLocaleString()} shares, $${(data.proceeds/1e6).toFixed(0)}M`);
    grandTotal += data.proceeds;
  }
  console.log(`\nGrand Total: $${(grandTotal/1e9).toFixed(2)}B`);
  
  // Write TypeScript file
  const fs = await import('fs');
  fs.writeFileSync('src/lib/data/mstr-atm-sales.ts', generateTypeScript(allSales, byProgram));
  console.log('\nWrote src/lib/data/mstr-atm-sales.ts');
}

function generateTypeScript(sales, byProgram) {
  const lines = [
    '/**',
    ' * MSTR ATM Equity Sales',
    ' * ======================',
    ' * ',
    ' * At-the-market stock sales from weekly 8-K updates.',
    ' * These proceeds funded BTC purchases.',
    ' * ',
    ` * Generated: ${new Date().toISOString()}`,
    ` * Total filings: ${sales.length}`,
    ' */',
    '',
    'export interface ATMProgramSale {',
    '  program: string;',
    '  security: string;',
    '  sharesSold: number;',
    '  netProceeds: number;',
    '}',
    '',
    'export interface ATMUpdateFiling {',
    '  filingDate: string;',
    '  programs: ATMProgramSale[];',
    '  totalProceeds: number | null;',
    '  accessionNumber: string;',
    '  secUrl: string;',
    '}',
    '',
    'export const MSTR_ATM_UPDATES: ATMUpdateFiling[] = [',
  ];
  
  for (const s of sales) {
    const accClean = s.accessionNumber.replace(/-/g, '');
    const secUrl = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accClean}/${s.docName}`;
    
    lines.push('  {');
    lines.push(`    filingDate: "${s.filingDate}",`);
    lines.push(`    programs: [`);
    for (const p of s.programs) {
      lines.push(`      { program: "${p.program}", security: "${p.security}", sharesSold: ${p.sharesSold}, netProceeds: ${p.netProceeds} },`);
    }
    lines.push(`    ],`);
    lines.push(`    totalProceeds: ${s.totalProceeds ?? 'null'},`);
    lines.push(`    accessionNumber: "${s.accessionNumber}",`);
    lines.push(`    secUrl: "${secUrl}",`);
    lines.push('  },');
  }
  
  lines.push('];');
  lines.push('');
  lines.push('/** Aggregated totals by ATM program */');
  lines.push('export const ATM_PROGRAM_TOTALS = {');
  for (const [name, data] of Object.entries(byProgram).sort()) {
    lines.push(`  "${name}": { shares: ${data.shares}, proceeds: ${data.proceeds} },`);
  }
  lines.push('};');
  lines.push('');
  lines.push('export function getTotalATMProceeds(): number {');
  lines.push('  return Object.values(ATM_PROGRAM_TOTALS).reduce((s, p) => s + p.proceeds, 0);');
  lines.push('}');
  lines.push('');
  
  return lines.join('\n');
}

run().catch(console.error);
