/**
 * Extract 2025 BTC purchases from 8-Ks
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
  const patterns = [
    /(?:purchased|acquired) approximately ([\d,]+) bitcoins? for approximately \$([\d,.]+) (million|billion)/i,
    /purchased ([\d,]+) bitcoins? at an aggregate purchase price of \$([\d,.]+) (million|billion)/i,
    /purchased approximately ([\d,]+) bitcoins? for \$([\d,.]+) (million|billion) in cash/i,
  ];
  
  for (const pattern of patterns) {
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
      
      return { btc, cost, avgPrice, cumulative };
    }
  }
  return null;
}

async function run() {
  console.log('Extracting 2025 BTC purchases...\n');
  
  const subUrl = 'https://data.sec.gov/submissions/CIK0001050446.json';
  const subRes = await fetch(subUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const subData = await subRes.json();
  
  const recent = subData.filings.recent;
  
  const purchases2025 = [];
  
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] !== '8-K') continue;
    if (!recent.filingDate[i].startsWith('2025')) continue;
    
    process.stdout.write(`${recent.filingDate[i]}... `);
    
    const result = await fetch8K(recent.accessionNumber[i]);
    if (!result) {
      console.log('skip');
      continue;
    }
    
    const data = extractPurchaseData(result.content);
    
    if (data) {
      console.log(`✓ ${data.btc.toLocaleString()} BTC @ $${data.avgPrice.toLocaleString()}`);
      purchases2025.push({
        filingDate: recent.filingDate[i],
        accessionNumber: recent.accessionNumber[i],
        docName: result.docName,
        ...data,
      });
    } else {
      const hasBTC = result.content.toLowerCase().includes('bitcoin');
      console.log(hasBTC ? '? (BTC mentioned)' : '-');
    }
    
    await new Promise(r => setTimeout(r, 150));
  }
  
  console.log('\n' + '='.repeat(70));
  console.log(`2025 Purchases: ${purchases2025.length} events`);
  
  if (purchases2025.length > 0) {
    const totalBTC = purchases2025.reduce((s, p) => s + p.btc, 0);
    const totalCost = purchases2025.reduce((s, p) => s + p.cost, 0);
    console.log(`Total: ${totalBTC.toLocaleString()} BTC for $${(totalCost/1e9).toFixed(2)}B`);
    
    // Show latest cumulative
    const latest = purchases2025.find(p => p.cumulative);
    if (latest) {
      console.log(`Latest holdings: ${latest.cumulative.toLocaleString()} BTC (as of ${latest.filingDate})`);
    }
    
    console.log('\nDetailed:');
    for (const p of purchases2025) {
      console.log(`  ${p.filingDate}: ${p.btc.toLocaleString()} BTC @ $${p.avgPrice.toLocaleString()} (cumulative: ${p.cumulative?.toLocaleString() || 'N/A'})`);
    }
  }
}

run().catch(console.error);
