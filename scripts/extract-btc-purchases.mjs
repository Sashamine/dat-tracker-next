/**
 * Extract all historical BTC purchases from 8-K filings
 * Outputs TypeScript file with full provenance
 */

const CIK = '1050446';

async function fetch8K(accession) {
  const accClean = accession.replace(/-/g, '');
  
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accClean}/index.json`;
  const indexRes = await fetch(indexUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const index = await indexRes.json();
  
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

function extractPurchaseData(content, filingDate) {
  // Pattern 1: "purchased/acquired approximately X bitcoins for approximately $Y million/billion"
  const purchasePattern1 = /(?:purchased|acquired) approximately ([\d,]+) bitcoins? for approximately \$([\d,.]+) (million|billion)/i;
  
  // Pattern 2: "purchased X bitcoins at an aggregate purchase price of $Y million" (early 2020)
  const purchasePattern2 = /purchased ([\d,]+) bitcoins? at an aggregate purchase price of \$([\d,.]+) (million|billion)/i;
  
  // Pattern 3: "purchased approximately X bitcoins for $Y million in cash" (2020-2021)
  const purchasePattern3 = /purchased approximately ([\d,]+) bitcoins? for \$([\d,.]+) (million|billion) in cash/i;
  
  // Try all patterns
  const purchaseMatch = content.match(purchasePattern1) || 
                        content.match(purchasePattern2) || 
                        content.match(purchasePattern3);
  
  // Pattern 2: Average price "at an average price of approximately $X per bitcoin"
  const avgPricePattern = /average price of approximately \$([\d,]+) per bitcoin/i;
  const avgPriceMatch = content.match(avgPricePattern);
  
  // Pattern 3: Cumulative holdings "held approximately X bitcoins" or "holds approximately X bitcoins"
  const cumulativePattern = /(?:held|holds) (?:an aggregate of )?approximately ([\d,]+) bitcoins/i;
  const cumulativeMatch = content.match(cumulativePattern);
  
  // Pattern 4: Cumulative cost "aggregate purchase price of (?:approximately )?\$X billion/million"
  const cumulativeCostPattern = /aggregate purchase price of (?:approximately )?\$([\d,.]+) (billion|million)/i;
  const cumulativeCostMatch = content.match(cumulativeCostPattern);
  
  // Pattern 5: Period dates "between X and Y" or "from X through Y"
  const periodPattern = /(?:between|from) ([A-Za-z]+ \d+, \d{4})(?: and| through) ([A-Za-z]+ \d+, \d{4})/i;
  const periodMatch = content.match(periodPattern);
  
  if (!purchaseMatch) return null;
  
  const btcAcquired = parseInt(purchaseMatch[1].replace(/,/g, ''), 10);
  let totalCost = parseFloat(purchaseMatch[2].replace(/,/g, ''));
  if (purchaseMatch[3].toLowerCase() === 'billion') totalCost *= 1e9;
  else if (purchaseMatch[3].toLowerCase() === 'million') totalCost *= 1e6;
  
  const avgPrice = avgPriceMatch ? parseInt(avgPriceMatch[1].replace(/,/g, ''), 10) : Math.round(totalCost / btcAcquired);
  
  let cumulativeHoldings = null;
  if (cumulativeMatch) {
    cumulativeHoldings = parseInt(cumulativeMatch[1].replace(/,/g, ''), 10);
  }
  
  let cumulativeCost = null;
  if (cumulativeCostMatch) {
    cumulativeCost = parseFloat(cumulativeCostMatch[1].replace(/,/g, ''));
    if (cumulativeCostMatch[2].toLowerCase() === 'billion') cumulativeCost *= 1e9;
    else if (cumulativeCostMatch[2].toLowerCase() === 'million') cumulativeCost *= 1e6;
  }
  
  return {
    btcAcquired,
    totalCost,
    avgPrice,
    cumulativeHoldings,
    cumulativeCost,
    periodStart: periodMatch ? periodMatch[1] : null,
    periodEnd: periodMatch ? periodMatch[2] : null,
  };
}

async function run() {
  console.log('Extracting BTC purchases from historical 8-Ks...\n');
  
  // Get all 8-K filings
  const subUrl = `https://data.sec.gov/submissions/CIK0001050446.json`;
  const subRes = await fetch(subUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const subData = await subRes.json();
  
  const recent = subData.filings.recent;
  
  // Filter to 8-Ks from 2020-2024
  const filings8K = [];
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] === '8-K' && 
        recent.filingDate[i] >= '2020-08-01' && 
        recent.filingDate[i] <= '2024-12-31') {
      filings8K.push({
        filingDate: recent.filingDate[i],
        accession: recent.accessionNumber[i],
      });
    }
  }
  
  console.log(`Found ${filings8K.length} 8-Ks to process\n`);
  
  const purchases = [];
  
  for (const filing of filings8K) {
    process.stdout.write(`${filing.filingDate}... `);
    
    const result = await fetch8K(filing.accession);
    if (!result) {
      console.log('skip (no content)');
      continue;
    }
    
    const data = extractPurchaseData(result.content, filing.filingDate);
    
    if (data) {
      console.log(`✓ ${data.btcAcquired.toLocaleString()} BTC @ $${data.avgPrice.toLocaleString()}`);
      
      purchases.push({
        filingDate: filing.filingDate,
        accessionNumber: filing.accession,
        docName: result.docName,
        ...data,
      });
    } else {
      // Check if it mentions bitcoin but we couldn't parse
      if (result.content.toLowerCase().includes('bitcoin')) {
        console.log('? (BTC mentioned but not parsed)');
      } else {
        console.log('- (not BTC)');
      }
    }
    
    await new Promise(r => setTimeout(r, 150));
  }
  
  // Sort by filing date
  purchases.sort((a, b) => a.filingDate.localeCompare(b.filingDate));
  
  console.log('\n' + '='.repeat(70));
  console.log(`Extracted ${purchases.length} BTC purchase events`);
  console.log('='.repeat(70));
  
  // Generate TypeScript file
  const tsContent = generateTypeScript(purchases);
  
  const fs = await import('fs');
  fs.writeFileSync('src/lib/data/mstr-btc-purchases.ts', tsContent);
  console.log('\nWrote src/lib/data/mstr-btc-purchases.ts');
  
  // Summary
  const totalBTC = purchases.reduce((sum, p) => sum + p.btcAcquired, 0);
  const totalSpent = purchases.reduce((sum, p) => sum + p.totalCost, 0);
  console.log(`\nTotal: ${totalBTC.toLocaleString()} BTC for $${(totalSpent / 1e9).toFixed(2)}B`);
}

function generateTypeScript(purchases) {
  const lines = [
    '/**',
    ' * MSTR Historical BTC Purchases',
    ' * ==============================',
    ' * ',
    ' * Every purchase event extracted from SEC 8-K filings.',
    ' * Click any accession number to view the source document.',
    ' * ',
    ` * Generated: ${new Date().toISOString()}`,
    ` * Total events: ${purchases.length}`,
    ' */',
    '',
    'export interface BTCPurchaseEvent {',
    '  /** SEC filing date */',
    '  filingDate: string;',
    '  ',
    '  /** BTC acquired in this purchase */',
    '  btcAcquired: number;',
    '  ',
    '  /** Total USD spent */',
    '  totalCost: number;',
    '  ',
    '  /** Average price per BTC */',
    '  avgPrice: number;',
    '  ',
    '  /** Cumulative BTC holdings after this purchase (if reported) */',
    '  cumulativeHoldings: number | null;',
    '  ',
    '  /** Cumulative cost basis (if reported) */',
    '  cumulativeCost: number | null;',
    '  ',
    '  /** Purchase period start (if reported) */',
    '  periodStart: string | null;',
    '  ',
    '  /** Purchase period end (if reported) */',
    '  periodEnd: string | null;',
    '  ',
    '  // Provenance',
    '  accessionNumber: string;',
    '  secUrl: string;',
    '}',
    '',
    '/**',
    ' * All BTC purchases from SEC 8-K filings (2020-2024)',
    ' * Sorted chronologically by filing date',
    ' */',
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
    lines.push(`    cumulativeCost: ${p.cumulativeCost ?? 'null'},`);
    lines.push(`    periodStart: ${p.periodStart ? `"${p.periodStart}"` : 'null'},`);
    lines.push(`    periodEnd: ${p.periodEnd ? `"${p.periodEnd}"` : 'null'},`);
    lines.push(`    accessionNumber: "${p.accessionNumber}",`);
    lines.push(`    secUrl: "${secUrl}",`);
    lines.push('  },');
  }
  
  lines.push('];');
  lines.push('');
  lines.push('/**');
  lines.push(' * Get purchase event by filing date');
  lines.push(' */');
  lines.push('export function getPurchaseByDate(filingDate: string): BTCPurchaseEvent | undefined {');
  lines.push('  return MSTR_BTC_PURCHASES.find(p => p.filingDate === filingDate);');
  lines.push('}');
  lines.push('');
  lines.push('/**');
  lines.push(' * Get all purchases in a date range');
  lines.push(' */');
  lines.push('export function getPurchasesInRange(start: string, end: string): BTCPurchaseEvent[] {');
  lines.push('  return MSTR_BTC_PURCHASES.filter(p => p.filingDate >= start && p.filingDate <= end);');
  lines.push('}');
  lines.push('');
  lines.push('/**');
  lines.push(' * Get total BTC acquired and cost');
  lines.push(' */');
  lines.push('export function getTotalAcquisitions(): { btc: number; cost: number; avgPrice: number } {');
  lines.push('  const btc = MSTR_BTC_PURCHASES.reduce((sum, p) => sum + p.btcAcquired, 0);');
  lines.push('  const cost = MSTR_BTC_PURCHASES.reduce((sum, p) => sum + p.totalCost, 0);');
  lines.push('  return { btc, cost, avgPrice: Math.round(cost / btc) };');
  lines.push('}');
  lines.push('');
  
  return lines.join('\n');
}

run().catch(console.error);
