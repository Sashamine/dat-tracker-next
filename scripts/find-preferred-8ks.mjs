/**
 * Find preferred stock issuance amounts in 8-Ks
 */
const R2 = 'https://pub-1e4356c7aea34102aad6e3493b0c62f1.r2.dev';
const PREFIXES = ['new-uploads', 'batch3', 'batch2', 'batch1', 'batch4', 'batch5', 'batch6'];

async function fetch8K(accession) {
  for (const prefix of PREFIXES) {
    const url = `${R2}/${prefix}/mstr/${accession}.txt`;
    try {
      const res = await fetch(url);
      if (res.ok) return { content: await res.text(), prefix };
    } catch {}
  }
  return null;
}

function searchPreferredAmounts(content) {
  const clean = content.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
  const results = [];
  
  // Pattern 1: "sold X shares ... proceeds of $Y"
  const soldPattern = /sold\s+([\d,]+)\s+shares[^.]*?(?:net proceeds|proceeds)[^$]*?\$\s*([\d,.]+)\s*(million|billion)?/gi;
  for (const match of clean.matchAll(soldPattern)) {
    results.push({
      type: 'sold',
      shares: match[1],
      amount: match[2],
      unit: match[3] || 'dollars',
      context: match[0].slice(0, 150)
    });
  }
  
  // Pattern 2: "net proceeds of approximately $X"
  const proceedsPattern = /(?:net )?proceeds[^$]*?\$\s*([\d,.]+)\s*(million|billion)/gi;
  for (const match of clean.matchAll(proceedsPattern)) {
    if (!results.some(r => r.context?.includes(match[0].slice(0, 50)))) {
      results.push({
        type: 'proceeds',
        amount: match[1],
        unit: match[2],
        context: match[0].slice(0, 150)
      });
    }
  }
  
  // Pattern 3: "STRK" or "STRF" with dollar amounts
  const strkPattern = /(STRK|STRF|Strike|Strife)[^$]*?\$\s*([\d,.]+)\s*(million|billion)/gi;
  for (const match of clean.matchAll(strkPattern)) {
    results.push({
      type: match[1],
      amount: match[2],
      unit: match[3],
      context: match[0].slice(0, 150)
    });
  }
  
  // Pattern 4: Preferred ATM with proceeds
  const atmPattern = /preferred\s+(?:stock\s+)?ATM[^$]*?\$\s*([\d,.]+)\s*(million|billion)/gi;
  for (const match of clean.matchAll(atmPattern)) {
    results.push({
      type: 'preferred ATM',
      amount: match[1],
      unit: match[2],
      context: match[0].slice(0, 150)
    });
  }
  
  return results;
}

async function run() {
  // Get list of 8-Ks from SEC
  const secUrl = 'https://data.sec.gov/submissions/CIK0001050446.json';
  const secRes = await fetch(secUrl, {
    headers: { 'User-Agent': 'DAT-Tracker research@dat-tracker.com' }
  });
  const secData = await secRes.json();
  
  const recent = secData.filings.recent;
  const eightKs = [];
  for (let i = 0; i < Math.min(30, recent.form.length); i++) {
    if (recent.form[i] === '8-K') {
      eightKs.push({
        accession: recent.accessionNumber[i],
        date: recent.filingDate[i],
        description: recent.primaryDocument[i]
      });
    }
  }
  
  console.log(`Found ${eightKs.length} 8-Ks to search\n`);
  
  const allResults = [];
  
  for (const filing of eightKs) {
    const result = await fetch8K(filing.accession);
    if (!result) {
      console.log(`${filing.date} ${filing.accession}: Not in R2`);
      continue;
    }
    
    const amounts = searchPreferredAmounts(result.content);
    if (amounts.length > 0) {
      console.log(`\n${filing.date} ${filing.accession}:`);
      amounts.forEach(a => {
        const value = a.unit === 'billion' ? parseFloat(a.amount) * 1000 : 
                      a.unit === 'million' ? parseFloat(a.amount.replace(/,/g, '')) : 
                      parseFloat(a.amount.replace(/,/g, ''));
        console.log(`  ${a.type}: $${a.amount} ${a.unit || ''}`);
        console.log(`    "${a.context.slice(0, 100)}..."`);
        
        allResults.push({
          date: filing.date,
          accession: filing.accession,
          ...a,
          valueMillions: a.unit === 'billion' ? parseFloat(a.amount) * 1000 : parseFloat(a.amount.replace(/,/g, ''))
        });
      });
    } else {
      console.log(`${filing.date} ${filing.accession}: No preferred amounts found`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY - Preferred issuances found:');
  console.log('='.repeat(60));
  
  // Dedupe and sum
  const seen = new Set();
  let totalMillions = 0;
  for (const r of allResults) {
    const key = `${r.accession}-${r.amount}`;
    if (!seen.has(key) && r.valueMillions > 10) { // Filter small amounts
      seen.add(key);
      console.log(`${r.date}: $${r.valueMillions}M (${r.accession})`);
      totalMillions += r.valueMillions;
    }
  }
  console.log(`\nTotal from 8-Ks: $${(totalMillions/1000).toFixed(2)}B`);
}

run().catch(console.error);
