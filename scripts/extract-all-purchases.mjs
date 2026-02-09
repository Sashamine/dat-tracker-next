/**
 * Extract ALL BTC purchases 2020-2025 with multiple format support
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

function extractPurchaseData(content) {
  // Format 1: "purchased/acquired approximately X bitcoins for approximately $Y million/billion"
  const pattern1 = /(?:purchased|acquired) approximately ([\d,]+) bitcoins? for approximately \$([\d,.]+) (million|billion)/i;
  
  // Format 2: "purchased X bitcoins at an aggregate purchase price of $Y million" (2020)
  const pattern2 = /purchased ([\d,]+) bitcoins? at an aggregate purchase price of \$([\d,.]+) (million|billion)/i;
  
  // Format 3: "purchased approximately X bitcoins for $Y million in cash" (2020-2021)
  const pattern3 = /purchased approximately ([\d,]+) bitcoins? for \$([\d,.]+) (million|billion) in cash/i;
  
  // Format 4: 2025 table format "BTC Acquired...1,895 $ 180.3 million $ 95,167 555,450"
  // Matches: BTC count, then $ amount million/billion, then avg price, then cumulative holdings
  const pattern4 = /BTC Acquired.*?(\d{1,3}(?:,\d{3})*)\s+\$\s*([\d,.]+)\s*(million|billion)?\s+\$\s*([\d,]+)\s+(\d{1,3}(?:,\d{3})*)/i;
  
  // Try formats in order
  for (const pattern of [pattern1, pattern2, pattern3]) {
    const match = content.match(pattern);
    if (match) {
      const btc = parseInt(match[1].replace(/,/g, ''), 10);
      let cost = parseFloat(match[2].replace(/,/g, ''));
      if (match[3].toLowerCase() === 'billion') cost *= 1e9;
      else cost *= 1e6;
      
      const avgMatch = content.match(/average price of approximately \$([\d,]+) per bitcoin/i);
      const avgPrice = avgMatch ? parseInt(avgMatch[1].replace(/,/g, ''), 10) : Math.round(cost / btc);
      
      const cumMatch = content.match(/(?:held|holds) (?:an aggregate of )?approximately ([\d,]+) bitcoins/i);
      const cumulative = cumMatch ? parseInt(cumMatch[1].replace(/,/g, ''), 10) : null;
      
      return { btc, cost, avgPrice, cumulative, format: 'narrative' };
    }
  }
  
  // Try 2025 table format
  const match4 = content.match(pattern4);
  if (match4) {
    const btc = parseInt(match4[1].replace(/,/g, ''), 10);
    let cost = parseFloat(match4[2].replace(/,/g, ''));
    // Check if million/billion is present, default to million
    const unit = match4[3]?.toLowerCase() || 'million';
    if (unit === 'billion') cost *= 1e9;
    else cost *= 1e6;
    
    const avgPrice = parseInt(match4[4].replace(/,/g, ''), 10);
    const cumulative = parseInt(match4[5].replace(/,/g, ''), 10);
    
    return { btc, cost, avgPrice, cumulative, format: 'table' };
  }
  
  return null;
}

async function run() {
  console.log('Extracting ALL BTC purchases (2020-2025)...\n');
  
  const subUrl = 'https://data.sec.gov/submissions/CIK0001050446.json';
  const subRes = await fetch(subUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const subData = await subRes.json();
  
  const recent = subData.filings.recent;
  
  const purchases = [];
  let skipped = 0;
  
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] !== '8-K') continue;
    if (recent.filingDate[i] < '2020-08-01') continue;
    
    process.stdout.write(`${recent.filingDate[i]}... `);
    
    const result = await fetch8K(recent.accessionNumber[i]);
    if (!result) {
      console.log('skip');
      skipped++;
      continue;
    }
    
    const data = extractPurchaseData(result.content);
    
    if (data) {
      console.log(`✓ ${data.btc.toLocaleString()} BTC @ $${data.avgPrice.toLocaleString()} [${data.format}]`);
      purchases.push({
        filingDate: recent.filingDate[i],
        accessionNumber: recent.accessionNumber[i],
        docName: result.docName,
        btcAcquired: data.btc,
        totalCost: data.cost,
        avgPrice: data.avgPrice,
        cumulativeHoldings: data.cumulative,
        format: data.format,
      });
    } else {
      const hasBTC = result.content.toLowerCase().includes('bitcoin');
      if (hasBTC) skipped++;
      console.log(hasBTC ? '? (BTC mentioned)' : '-');
    }
    
    await new Promise(r => setTimeout(r, 100));
  }
  
  // Sort chronologically
  purchases.sort((a, b) => a.filingDate.localeCompare(b.filingDate));
  
  console.log('\n' + '='.repeat(70));
  console.log(`Extracted ${purchases.length} BTC purchase events`);
  console.log(`Skipped ${skipped} BTC-mentioning 8-Ks (not purchases)`);
  console.log('='.repeat(70));
  
  // Summary by year
  const byYear = {};
  for (const p of purchases) {
    const year = p.filingDate.slice(0, 4);
    if (!byYear[year]) byYear[year] = { count: 0, btc: 0, cost: 0 };
    byYear[year].count++;
    byYear[year].btc += p.btcAcquired;
    byYear[year].cost += p.totalCost;
  }
  
  console.log('\nBy Year:');
  for (const [year, data] of Object.entries(byYear).sort()) {
    console.log(`  ${year}: ${data.count} events, ${data.btc.toLocaleString()} BTC, $${(data.cost/1e9).toFixed(2)}B`);
  }
  
  const totalBTC = purchases.reduce((s, p) => s + p.btcAcquired, 0);
  const totalCost = purchases.reduce((s, p) => s + p.totalCost, 0);
  console.log(`\nTotal: ${totalBTC.toLocaleString()} BTC for $${(totalCost/1e9).toFixed(2)}B`);
  
  // Latest holdings
  const latest = [...purchases].reverse().find(p => p.cumulativeHoldings);
  if (latest) {
    console.log(`Latest holdings: ${latest.cumulativeHoldings.toLocaleString()} BTC (as of ${latest.filingDate})`);
  }
  
  // Write to file
  const fs = await import('fs');
  fs.writeFileSync('src/lib/data/mstr-btc-purchases.ts', generateTypeScript(purchases));
  console.log('\nWrote src/lib/data/mstr-btc-purchases.ts');
}

function generateTypeScript(purchases) {
  const lines = [
    '/**',
    ' * MSTR Historical BTC Purchases',
    ' * ==============================',
    ' * ',
    ' * Every purchase event extracted from SEC 8-K filings.',
    ' * Click any secUrl to view the source document.',
    ' * ',
    ` * Generated: ${new Date().toISOString()}`,
    ` * Total events: ${purchases.length}`,
    ' */',
    '',
    'export interface BTCPurchaseEvent {',
    '  filingDate: string;',
    '  btcAcquired: number;',
    '  totalCost: number;',
    '  avgPrice: number;',
    '  cumulativeHoldings: number | null;',
    '  accessionNumber: string;',
    '  secUrl: string;',
    '}',
    '',
    'export const MSTR_BTC_PURCHASES: BTCPurchaseEvent[] = [',
  ];
  
  for (const p of purchases) {
    const accClean = p.accessionNumber.replace(/-/g, '');
    const secUrl = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accClean}/${p.docName}`;
    
    lines.push('  {');
    lines.push(`    filingDate: "${p.filingDate}",`);
    lines.push(`    btcAcquired: ${p.btcAcquired},`);
    lines.push(`    totalCost: ${p.totalCost},`);
    lines.push(`    avgPrice: ${p.avgPrice},`);
    lines.push(`    cumulativeHoldings: ${p.cumulativeHoldings ?? 'null'},`);
    lines.push(`    accessionNumber: "${p.accessionNumber}",`);
    lines.push(`    secUrl: "${secUrl}",`);
    lines.push('  },');
  }
  
  lines.push('];');
  lines.push('');
  lines.push('export function getTotalAcquisitions() {');
  lines.push('  const btc = MSTR_BTC_PURCHASES.reduce((s, p) => s + p.btcAcquired, 0);');
  lines.push('  const cost = MSTR_BTC_PURCHASES.reduce((s, p) => s + p.totalCost, 0);');
  lines.push('  return { btc, cost, avgPrice: Math.round(cost / btc) };');
  lines.push('}');
  lines.push('');
  
  return lines.join('\n');
}

run().catch(console.error);
