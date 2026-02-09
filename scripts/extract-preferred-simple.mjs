/**
 * Simple preferred extraction - just count shares @ $100
 */

async function fetchFiling(cik, accession) {
  const accClean = accession.replace(/-/g, '');
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accClean}/index.json`;
  const indexRes = await fetch(indexUrl, {
    headers: { 'User-Agent': 'DAT-Tracker research@dat-tracker.com' }
  });
  const index = await indexRes.json();
  
  const docs = index.directory.item;
  const mainDoc = docs.find(d => d.name.endsWith('.htm') && !d.name.includes('ex'));
  if (!mainDoc) return null;
  
  const docUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accClean}/${mainDoc.name}`;
  const res = await fetch(docUrl, {
    headers: { 'User-Agent': 'DAT-Tracker research@dat-tracker.com' }
  });
  return await res.text();
}

function extractShares(content) {
  const clean = content.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
  
  // Determine type
  let type = null;
  if (clean.includes('Strike Preferred') || clean.match(/STRK\s+Stock/i)) type = 'STRK';
  else if (clean.includes('Strife Preferred') || clean.match(/STRF\s+Stock/i)) type = 'STRF';
  else if (clean.includes('Stride Preferred') || clean.match(/STRD\s+Stock/i)) type = 'STRD';
  else if (clean.includes('Stretch Preferred') || clean.match(/STRC\s+Stock/i)) type = 'STRC';
  else if (clean.includes('Stream Preferred') || clean.match(/STRE\s+Stock/i)) type = 'STRE';
  
  if (!type) return null;
  
  // Skip if it's a preliminary/registration (not final)
  if (clean.includes('Subject to Completion') || clean.includes('Preliminary Prospectus')) {
    return { type, skip: true, reason: 'preliminary' };
  }
  
  // Look for "We are offering X shares" pattern in first 5000 chars
  const first5k = clean.slice(0, 5000);
  
  const offeringMatch = first5k.match(/(?:We are offering|offering)\s+([\d,]+)\s+shares\s+of/i);
  if (offeringMatch) {
    return {
      type,
      shares: parseInt(offeringMatch[1].replace(/,/g, ''), 10),
      skip: false
    };
  }
  
  // Try "X Shares" in title area
  const titleMatch = first5k.match(/([\d,]+)\s+Shares\s+[\d.]+%\s+Series/i);
  if (titleMatch) {
    return {
      type,
      shares: parseInt(titleMatch[1].replace(/,/g, ''), 10),
      skip: false
    };
  }
  
  return { type, skip: true, reason: 'no share count' };
}

async function run() {
  const cik = '1050446';
  
  const subUrl = 'https://data.sec.gov/submissions/CIK0001050446.json';
  const subRes = await fetch(subUrl, {
    headers: { 'User-Agent': 'DAT-Tracker research@dat-tracker.com' }
  });
  const subData = await subRes.json();
  
  const recent = subData.filings.recent;
  const filings424B5 = [];
  
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] === '424B5') {  // Only 424B5, not 424B2 etc
      filings424B5.push({
        date: recent.filingDate[i],
        accession: recent.accessionNumber[i]
      });
    }
  }
  
  console.log(`Found ${filings424B5.length} 424B5 filings\n`);
  
  const issuances = [];
  
  for (const filing of filings424B5) {
    process.stdout.write(`${filing.date} ${filing.accession}... `);
    
    try {
      const content = await fetchFiling(cik, filing.accession);
      if (!content) {
        console.log('no content');
        continue;
      }
      
      const info = extractShares(content);
      
      if (!info) {
        console.log('not preferred');
      } else if (info.skip) {
        console.log(`skip: ${info.reason}`);
      } else {
        const proceeds = info.shares * 100; // $100 per share
        console.log(`✓ ${info.type}: ${info.shares.toLocaleString()} shares = $${(proceeds/1e6).toFixed(0)}M`);
        issuances.push({
          date: filing.date,
          accession: filing.accession,
          type: info.type,
          shares: info.shares,
          proceeds
        });
      }
    } catch (e) {
      console.log('error:', e.message);
    }
    
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('PREFERRED STOCK ISSUANCES (@ $100/share)');
  console.log('='.repeat(60));
  
  let totalShares = 0;
  let totalProceeds = 0;
  const byType = {};
  
  for (const p of issuances) {
    console.log(`${p.date} ${p.type}: ${p.shares.toLocaleString()} shares = $${(p.proceeds/1e6).toFixed(0)}M [${p.accession}]`);
    totalShares += p.shares;
    totalProceeds += p.proceeds;
    byType[p.type] = (byType[p.type] || 0) + p.proceeds;
  }
  
  console.log('\n--- By Type ---');
  for (const [type, amount] of Object.entries(byType)) {
    console.log(`${type}: $${(amount/1e9).toFixed(2)}B`);
  }
  
  console.log(`\nTOTAL: ${totalShares.toLocaleString()} shares = $${(totalProceeds/1e9).toFixed(2)}B`);
}

run().catch(console.error);
