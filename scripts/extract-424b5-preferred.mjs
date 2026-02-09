/**
 * Extract preferred stock issuance amounts from 424B5 filings
 */

async function fetchFiling(cik, accession) {
  const accClean = accession.replace(/-/g, '');
  
  // Get index
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accClean}/index.json`;
  const indexRes = await fetch(indexUrl, {
    headers: { 'User-Agent': 'DAT-Tracker research@dat-tracker.com' }
  });
  const index = await indexRes.json();
  
  // Find main document
  const docs = index.directory.item;
  const mainDoc = docs.find(d => d.name.endsWith('.htm') && !d.name.includes('ex'));
  if (!mainDoc) return null;
  
  const docUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accClean}/${mainDoc.name}`;
  const res = await fetch(docUrl, {
    headers: { 'User-Agent': 'DAT-Tracker research@dat-tracker.com' }
  });
  return await res.text();
}

function extractPreferredInfo(content) {
  const clean = content.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
  
  const result = {
    isPreferred: false,
    type: null,
    symbol: null,
    shares: null,
    pricePerShare: null,
    grossProceeds: null,
    netProceeds: null
  };
  
  // Check if it's preferred stock (not common)
  if (clean.includes('Preferred Stock') && !clean.includes('Class A Common Stock offering')) {
    result.isPreferred = true;
    
    // Identify the type
    if (clean.includes('STRK') || clean.includes('Strike')) {
      result.type = 'STRK';
      result.symbol = 'Strike';
    } else if (clean.includes('STRF') || clean.includes('Strife')) {
      result.type = 'STRF';
      result.symbol = 'Strife';
    } else if (clean.includes('STRD') || clean.includes('Stride')) {
      result.type = 'STRD';
      result.symbol = 'Stride';
    } else if (clean.includes('STRC') || clean.includes('Stretch')) {
      result.type = 'STRC';
      result.symbol = 'Stretch';
    } else if (clean.includes('STRE') || clean.includes('Stream')) {
      result.type = 'STRE';
      result.symbol = 'Stream';
    }
    
    // Extract number of shares
    const sharesMatch = clean.match(/offering\s+([\d,]+)\s+shares/i) ||
                        clean.match(/([\d,]+)\s+Shares\s+[\d.]+%\s+Series/i);
    if (sharesMatch) {
      result.shares = parseInt(sharesMatch[1].replace(/,/g, ''), 10);
    }
    
    // Extract price per share (usually $100 for preferred)
    const priceMatch = clean.match(/stated amount of\s+\$?\s*([\d.]+)\s+per share/i) ||
                       clean.match(/\$\s*([\d.]+)\s+per share/i);
    if (priceMatch) {
      result.pricePerShare = parseFloat(priceMatch[1]);
    }
    
    // Calculate gross proceeds
    if (result.shares && result.pricePerShare) {
      result.grossProceeds = result.shares * result.pricePerShare;
    }
    
    // Try to find explicit proceeds
    const proceedsMatch = clean.match(/gross proceeds[^$]*\$\s*([\d,.]+)\s*(million|billion)?/i) ||
                          clean.match(/aggregate offering price[^$]*\$\s*([\d,.]+)\s*(million|billion)?/i);
    if (proceedsMatch) {
      let val = parseFloat(proceedsMatch[1].replace(/,/g, ''));
      if (proceedsMatch[2]?.toLowerCase() === 'billion') val *= 1e9;
      else if (proceedsMatch[2]?.toLowerCase() === 'million') val *= 1e6;
      result.grossProceeds = val;
    }
  }
  
  return result;
}

async function run() {
  const cik = '1050446';
  
  // Get all recent 424B filings
  const subUrl = 'https://data.sec.gov/submissions/CIK0001050446.json';
  const subRes = await fetch(subUrl, {
    headers: { 'User-Agent': 'DAT-Tracker research@dat-tracker.com' }
  });
  const subData = await subRes.json();
  
  const recent = subData.filings.recent;
  const filings424B = [];
  
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i].startsWith('424B')) {
      filings424B.push({
        date: recent.filingDate[i],
        accession: recent.accessionNumber[i],
        form: recent.form[i]
      });
    }
  }
  
  console.log(`Found ${filings424B.length} 424B filings\n`);
  
  const preferredIssuances = [];
  
  for (const filing of filings424B) {
    process.stdout.write(`${filing.date} ${filing.accession}... `);
    
    try {
      const content = await fetchFiling(cik, filing.accession);
      if (!content) {
        console.log('no content');
        continue;
      }
      
      const info = extractPreferredInfo(content);
      
      if (info.isPreferred && info.grossProceeds) {
        console.log(`✓ ${info.type}: ${info.shares?.toLocaleString()} shares @ $${info.pricePerShare} = $${(info.grossProceeds/1e6).toFixed(1)}M`);
        preferredIssuances.push({
          date: filing.date,
          accession: filing.accession,
          ...info
        });
      } else if (info.isPreferred) {
        console.log(`? ${info.type} (no proceeds found)`);
      } else {
        console.log('common stock');
      }
    } catch (e) {
      console.log('error:', e.message);
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('PREFERRED STOCK ISSUANCES FROM 424B5 FILINGS');
  console.log('='.repeat(60));
  
  let total = 0;
  for (const p of preferredIssuances) {
    const amountM = p.grossProceeds / 1e6;
    console.log(`${p.date} ${p.type}: $${amountM.toFixed(1)}M (${p.accession})`);
    total += p.grossProceeds;
  }
  
  console.log(`\nTotal Preferred Raised: $${(total/1e9).toFixed(2)}B`);
  
  // Output for database insert
  console.log('\n--- Data for DB insert ---');
  console.log(JSON.stringify(preferredIssuances, null, 2));
}

run().catch(console.error);
