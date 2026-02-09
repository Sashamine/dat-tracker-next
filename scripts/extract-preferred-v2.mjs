/**
 * Extract actual preferred stock issuances (not authorizations) from 424B5s
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

function extractIssuance(content) {
  const clean = content.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
  
  // Skip if it's an authorization/registration (not actual sale)
  const isAuthorization = 
    clean.includes('may offer and sell') ||
    clean.includes('may be sold from time to time') ||
    clean.includes('We may offer') ||
    (clean.includes('up to $') && clean.includes('aggregate offering'));
    
  // Check for actual sale language
  const isActualSale = 
    clean.includes('We are offering') ||
    clean.includes('We have entered into') ||
    clean.includes('we sold') ||
    clean.includes('We sold') ||
    clean.includes('gross proceeds of approximately') ||
    clean.includes('net proceeds of approximately');
  
  if (isAuthorization && !isActualSale) {
    return { skip: true, reason: 'authorization/registration' };
  }
  
  const result = {
    skip: false,
    type: null,
    shares: null,
    pricePerShare: null,
    grossProceeds: null
  };
  
  // Identify preferred type
  if (clean.includes('STRK') || clean.includes('Strike Preferred')) {
    result.type = 'STRK';
  } else if (clean.includes('STRF') || clean.includes('Strife Preferred')) {
    result.type = 'STRF';
  } else if (clean.includes('STRD') || clean.includes('Stride Preferred')) {
    result.type = 'STRD';
  } else if (clean.includes('STRC') || clean.includes('Stretch Preferred')) {
    result.type = 'STRC';
  } else if (clean.includes('STRE') || clean.includes('Stream Preferred')) {
    result.type = 'STRE';
  } else if (clean.includes('Class A Common Stock')) {
    return { skip: true, reason: 'common stock' };
  }
  
  if (!result.type) {
    return { skip: true, reason: 'unknown security type' };
  }
  
  // Extract shares from "offering X shares" or "X shares of"
  const sharesPatterns = [
    /(?:offering|sold)\s+([\d,]+)\s+shares/i,
    /([\d,]+)\s+shares\s+of\s+(?:our\s+)?(?:\d+\.?\d*%\s+)?Series/i,
    /(?:issue|issuance of)\s+([\d,]+)\s+shares/i
  ];
  
  for (const p of sharesPatterns) {
    const m = clean.match(p);
    if (m) {
      result.shares = parseInt(m[1].replace(/,/g, ''), 10);
      break;
    }
  }
  
  // Extract price per share
  const priceMatch = clean.match(/(?:price|amount)\s+of\s+\$\s*([\d.]+)\s+per\s+share/i) ||
                     clean.match(/\$\s*([\d.]+)\s+per\s+share/i);
  if (priceMatch) {
    result.pricePerShare = parseFloat(priceMatch[1]);
  }
  
  // Extract actual proceeds (not "up to" amounts)
  const proceedsPatterns = [
    /gross proceeds of approximately \$([\d,.]+)\s*(million|billion)?/i,
    /net proceeds of approximately \$([\d,.]+)\s*(million|billion)?/i,
    /aggregate gross proceeds of \$([\d,.]+)\s*(million|billion)?/i,
    /(?:we received|receiving) (?:net )?proceeds of \$([\d,.]+)\s*(million|billion)?/i
  ];
  
  for (const p of proceedsPatterns) {
    const m = clean.match(p);
    if (m) {
      let val = parseFloat(m[1].replace(/,/g, ''));
      if (m[2]?.toLowerCase() === 'billion') val *= 1e9;
      else if (m[2]?.toLowerCase() === 'million') val *= 1e6;
      result.grossProceeds = val;
      break;
    }
  }
  
  // Calculate from shares * price if no explicit proceeds
  if (!result.grossProceeds && result.shares && result.pricePerShare) {
    result.grossProceeds = result.shares * result.pricePerShare;
  }
  
  // Skip if still no proceeds or shares
  if (!result.grossProceeds && !result.shares) {
    return { skip: true, reason: 'no proceeds or shares found' };
  }
  
  return result;
}

async function run() {
  const cik = '1050446';
  
  // Get all 424B filings
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
  
  console.log(`Scanning ${filings424B.length} 424B filings...\n`);
  
  const issuances = [];
  
  for (const filing of filings424B) {
    process.stdout.write(`${filing.date} ${filing.accession}... `);
    
    try {
      const content = await fetchFiling(cik, filing.accession);
      if (!content) {
        console.log('no content');
        continue;
      }
      
      const info = extractIssuance(content);
      
      if (info.skip) {
        console.log(`skip: ${info.reason}`);
      } else if (info.grossProceeds) {
        const proceedsM = info.grossProceeds / 1e6;
        console.log(`✓ ${info.type}: ${info.shares?.toLocaleString() || '?'} shares = $${proceedsM.toFixed(1)}M`);
        issuances.push({
          date: filing.date,
          accession: filing.accession,
          ...info
        });
      } else if (info.shares) {
        const est = (info.shares * (info.pricePerShare || 100)) / 1e6;
        console.log(`✓ ${info.type}: ${info.shares.toLocaleString()} shares (~$${est.toFixed(0)}M est)`);
        issuances.push({
          date: filing.date,
          accession: filing.accession,
          ...info,
          grossProceeds: info.shares * (info.pricePerShare || 100)
        });
      }
      
    } catch (e) {
      console.log('error:', e.message);
    }
    
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('ACTUAL PREFERRED ISSUANCES');
  console.log('='.repeat(60));
  
  let total = 0;
  const byType = {};
  
  for (const p of issuances) {
    const amountM = (p.grossProceeds || 0) / 1e6;
    console.log(`${p.date} ${p.type}: $${amountM.toFixed(1)}M (${p.shares?.toLocaleString() || '?'} shares) [${p.accession}]`);
    total += p.grossProceeds || 0;
    byType[p.type] = (byType[p.type] || 0) + (p.grossProceeds || 0);
  }
  
  console.log('\n--- By Type ---');
  for (const [type, amount] of Object.entries(byType)) {
    console.log(`${type}: $${(amount/1e9).toFixed(2)}B`);
  }
  
  console.log(`\n==> TOTAL PREFERRED RAISED: $${(total/1e9).toFixed(2)}B`);
}

run().catch(console.error);
