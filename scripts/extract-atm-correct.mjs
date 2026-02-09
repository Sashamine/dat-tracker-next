/**
 * Correctly extract ATM sales from 8-K weekly updates
 * Table structure: Shares Sold | Notional Value | Net Proceeds | Available
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
  // Check if this is an ATM update
  if (!content.includes('ATM Program Summary') && !content.toLowerCase().includes('atm updates')) {
    return null;
  }
  
  const programs = [];
  
  // Programs to look for
  const atmPrograms = [
    { pattern: /(?:2024 |2025 )?Common ATM|MSTR ATM/gi, security: 'Class A Common (MSTR)' },
    { pattern: /STRK ATM/gi, security: 'Series A Strike (STRK)' },
    { pattern: /STRF ATM/gi, security: 'Series A Perpetual (STRF)' },
    { pattern: /STRC ATM/gi, security: 'Series A Stretch (STRC)' },
    { pattern: /STRD ATM/gi, security: 'Series A Stride (STRD)' },
  ];
  
  for (const prog of atmPrograms) {
    const matches = content.matchAll(prog.pattern);
    
    for (const match of matches) {
      const startIdx = match.index;
      // Get context after the program name (the row data)
      const rowContext = content.slice(startIdx, startIdx + 200);
      
      // Pattern: "STRK ATM 626,639 STRK Shares $62.7 $66.4 $20,616.8"
      // Or with dashes for no sales: "Common ATM - - - $18,631.2"
      
      // Extract shares sold
      const sharesMatch = rowContext.match(/(\d{1,3}(?:,\d{3})*)\s+(?:MSTR|STRK|STRF|STRC|STRD)\s+Shares/i);
      const sharesSold = sharesMatch ? parseInt(sharesMatch[1].replace(/,/g, ''), 10) : 0;
      
      // Find all $ amounts in the row
      const dollarAmounts = [];
      const dollarRegex = /\$([\d,.]+)/g;
      let dollarMatch;
      while ((dollarMatch = dollarRegex.exec(rowContext)) !== null) {
        const amount = parseFloat(dollarMatch[1].replace(/,/g, ''));
        dollarAmounts.push(amount);
      }
      
      // Column order: Notional (0), Net Proceeds (1), Available (2)
      // For rows with no sales: only Available is present (1 amount)
      // For rows with sales: all 3 amounts present
      
      let notionalValue = null;
      let netProceeds = null;
      let available = null;
      
      if (dollarAmounts.length >= 3) {
        notionalValue = dollarAmounts[0] * 1e6;  // in millions
        netProceeds = dollarAmounts[1] * 1e6;
        available = dollarAmounts[2] * 1e6;
      } else if (dollarAmounts.length === 1) {
        // No sales, just available capacity
        available = dollarAmounts[0] * 1e6;
        netProceeds = 0;
      }
      
      // Normalize program name
      let programName = match[0].replace(/2024 |2025 /g, '');
      if (programName === 'Common ATM') programName = 'Common ATM';
      
      // Only add if we have valid data and haven't seen this exact program in this filing
      const existingIdx = programs.findIndex(p => p.program === programName);
      if (existingIdx >= 0) {
        // Update if this one has more data
        if (sharesSold > programs[existingIdx].sharesSold) {
          programs[existingIdx] = {
            program: programName,
            security: prog.security,
            sharesSold,
            notionalValue,
            netProceeds,
            available,
          };
        }
      } else {
        programs.push({
          program: programName,
          security: prog.security,
          sharesSold,
          notionalValue,
          netProceeds,
          available,
        });
      }
    }
  }
  
  // Extract total from "Total $112.2" line
  const totalMatch = content.match(/Total\s+\$([\d,.]+)/);
  const totalProceeds = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) * 1e6 : null;
  
  if (programs.length === 0) return null;
  
  return { programs, totalProceeds };
}

async function run() {
  console.log('Extracting ATM sales (corrected column parsing)...\n');
  
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
      const activeSales = data.programs.filter(p => p.sharesSold > 0);
      if (activeSales.length > 0) {
        const summary = activeSales.map(p => 
          `${p.program}: ${p.sharesSold.toLocaleString()} @ $${(p.netProceeds/1e6).toFixed(1)}M`
        ).join(', ');
        console.log(`✓ ${summary}`);
      } else {
        console.log('✓ (no sales this period)');
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
  
  // Aggregate by program
  const byProgram = {};
  for (const sale of allSales) {
    for (const prog of sale.programs) {
      if (!byProgram[prog.program]) {
        byProgram[prog.program] = { shares: 0, proceeds: 0 };
      }
      byProgram[prog.program].shares += prog.sharesSold;
      byProgram[prog.program].proceeds += (prog.netProceeds || 0);
    }
  }
  
  console.log('\nBy ATM Program (Net Proceeds):');
  let grandTotal = 0;
  for (const [name, data] of Object.entries(byProgram).sort()) {
    console.log(`  ${name.padEnd(15)} ${data.shares.toLocaleString().padStart(15)} shares  $${(data.proceeds/1e9).toFixed(3)}B`);
    grandTotal += data.proceeds;
  }
  console.log('-'.repeat(50));
  console.log(`  ${'TOTAL'.padEnd(15)} ${''.padStart(15)}        $${(grandTotal/1e9).toFixed(3)}B`);
  
  // Sum of Total lines as validation
  const sumOfTotals = allSales.reduce((s, sale) => s + (sale.totalProceeds || 0), 0);
  console.log(`\nValidation (sum of 'Total' lines): $${(sumOfTotals/1e9).toFixed(3)}B`);
  
  // Write output
  const fs = await import('fs');
  fs.writeFileSync('src/lib/data/mstr-atm-sales.ts', generateTypeScript(allSales, byProgram, grandTotal));
  console.log('\nWrote src/lib/data/mstr-atm-sales.ts');
}

function generateTypeScript(sales, byProgram, grandTotal) {
  const lines = [
    '/**',
    ' * MSTR ATM Equity Sales',
    ' * ======================',
    ' * ',
    ' * At-the-market stock sales from weekly 8-K updates.',
    ' * Net proceeds column extracted (not available capacity).',
    ' * ',
    ` * Generated: ${new Date().toISOString()}`,
    ` * Total filings: ${sales.length}`,
    ` * Total net proceeds: $${(grandTotal/1e9).toFixed(2)}B`,
    ' */',
    '',
    'export interface ATMProgramSale {',
    '  program: string;',
    '  security: string;',
    '  sharesSold: number;',
    '  notionalValue: number | null;',
    '  netProceeds: number | null;',
    '  available: number | null;',
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
      lines.push(`      { program: "${p.program}", security: "${p.security}", sharesSold: ${p.sharesSold}, notionalValue: ${p.notionalValue ?? 'null'}, netProceeds: ${p.netProceeds ?? 'null'}, available: ${p.available ?? 'null'} },`);
    }
    lines.push(`    ],`);
    lines.push(`    totalProceeds: ${s.totalProceeds ?? 'null'},`);
    lines.push(`    accessionNumber: "${s.accessionNumber}",`);
    lines.push(`    secUrl: "${secUrl}",`);
    lines.push('  },');
  }
  
  lines.push('];');
  lines.push('');
  lines.push('export const ATM_PROGRAM_TOTALS: Record<string, { shares: number; netProceeds: number }> = {');
  for (const [name, data] of Object.entries(byProgram).sort()) {
    lines.push(`  "${name}": { shares: ${data.shares}, netProceeds: ${data.proceeds} },`);
  }
  lines.push('};');
  lines.push('');
  lines.push(`export const TOTAL_ATM_NET_PROCEEDS = ${grandTotal};`);
  lines.push('');
  
  return lines.join('\n');
}

run().catch(console.error);
