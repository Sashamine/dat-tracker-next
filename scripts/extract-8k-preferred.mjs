/**
 * Extract preferred stock sales from 8-K ATM update filings
 * These have tables showing weekly/periodic sales under ATM programs
 */

const R2_BASE = 'https://pub-1e4356c7aea34102aad6e3493b0c62f1.r2.dev';

async function get8KList() {
  const url = 'https://data.sec.gov/submissions/CIK0001050446.json';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'DAT-Tracker research@dat-tracker.com' }
  });
  const data = await res.json();
  
  const recent = data.filings.recent;
  const filings8K = [];
  
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] === '8-K') {
      filings8K.push({
        date: recent.filingDate[i],
        accession: recent.accessionNumber[i]
      });
    }
  }
  
  return filings8K;
}

async function fetch8KContent(accession) {
  // Try R2 first
  const r2Url = `${R2_BASE}/new-uploads/mstr/${accession}.txt`;
  try {
    const res = await fetch(r2Url);
    if (res.ok) return await res.text();
  } catch (e) {}
  
  // Fall back to SEC
  const cik = '1050446';
  const accClean = accession.replace(/-/g, '');
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accClean}/index.json`;
  const indexRes = await fetch(indexUrl, {
    headers: { 'User-Agent': 'DAT-Tracker research@dat-tracker.com' }
  });
  const index = await indexRes.json();
  
  const doc = index.directory.item.find(d => d.name.endsWith('.htm') && !d.name.includes('ex'));
  if (!doc) return null;
  
  const docUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accClean}/${doc.name}`;
  const res = await fetch(docUrl, {
    headers: { 'User-Agent': 'DAT-Tracker research@dat-tracker.com' }
  });
  return await res.text();
}

function extractPreferredFromATM(content) {
  const clean = content.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
  
  // Check if this is an ATM update 8-K
  if (!clean.includes('ATM Program') && !clean.includes('at-the-market') && !clean.includes('Sales Agreement')) {
    return null;
  }
  
  const results = [];
  
  // Look for preferred stock types and their proceeds
  const preferredTypes = [
    { pattern: /STRK\s+Stock|Strike\s+Preferred|perpetual strike preferred/i, type: 'STRK' },
    { pattern: /STRF\s+Stock|Strife\s+Preferred|perpetual strife preferred/i, type: 'STRF' },
    { pattern: /STRD\s+Stock|Stride\s+Preferred/i, type: 'STRD' },
    { pattern: /STRC\s+Stock|Stretch\s+Preferred/i, type: 'STRC' },
    { pattern: /STRE\s+Stock|Stream\s+Preferred/i, type: 'STRE' }
  ];
  
  for (const { pattern, type } of preferredTypes) {
    if (!pattern.test(clean)) continue;
    
    // Look for net proceeds pattern near this type
    // Pattern: "Net Proceeds (in millions) $ X.X"
    const typeIdx = clean.search(pattern);
    if (typeIdx < 0) continue;
    
    // Search nearby for dollar amounts in the ATM table format
    // Tables show: Shares Sold | Notional Value | Net Proceeds | Available
    const searchArea = clean.slice(Math.max(0, typeIdx - 200), typeIdx + 500);
    
    // Look for patterns like "$ 123.4" or "$123.4 million"
    const proceedsPatterns = [
      // Net proceeds in millions format: "$ 1,619.3"
      /Net Proceeds[^$]*\$\s*([\d,]+\.?\d*)/i,
      // Direct dollar amounts near type name
      /\$\s*([\d,]+\.?\d*)\s*(?:million)?/gi
    ];
    
    // Try to find cumulative proceeds mentioned
    const cumulativeMatch = clean.match(new RegExp(type + '[^.]*cumulative[^$]*\\$\\s*([\\d,]+\\.?\\d*)\\s*(million|billion)?', 'i'));
    if (cumulativeMatch) {
      let val = parseFloat(cumulativeMatch[1].replace(/,/g, ''));
      if (cumulativeMatch[2]?.toLowerCase() === 'billion') val *= 1000;
      else if (cumulativeMatch[2]?.toLowerCase() === 'million') val *= 1;
      else val = val; // assume millions if not specified
      
      results.push({ type, proceedsM: val, cumulative: true });
    }
  }
  
  // Alternative: look for the ATM table structure
  // The table has rows like:
  // STRK Stock | 673,527 | $ - | $ 106.1 | $ 8,063.9
  // Where columns are: Shares Sold | Notional | Net Proceeds | Available
  
  const tablePattern = /(STRK|STRF|STRD|STRC|STRE)\s+Stock[^$]*\$\s*([\d,.-]+)[^$]*\$\s*([\d,.-]+)[^$]*\$\s*([\d,.-]+)/gi;
  let match;
  while ((match = tablePattern.exec(clean)) !== null) {
    const type = match[1].toUpperCase();
    const netProceeds = match[3].replace(/,/g, '').replace('-', '0');
    const proceedsM = parseFloat(netProceeds);
    
    if (proceedsM > 0 && !results.some(r => r.type === type)) {
      results.push({ type, proceedsM, period: true });
    }
  }
  
  return results.length > 0 ? results : null;
}

async function run() {
  console.log('Fetching 8-K list...');
  const filings8K = await get8KList();
  console.log(`Found ${filings8K.length} 8-Ks\n`);
  
  // Focus on 2025 filings (when preferred was issued)
  const filings2025 = filings8K.filter(f => f.date >= '2025-01-01');
  console.log(`Scanning ${filings2025.length} 8-Ks from 2025...\n`);
  
  const allResults = [];
  
  for (const filing of filings2025) {
    process.stdout.write(`${filing.date} ${filing.accession}... `);
    
    try {
      const content = await fetch8KContent(filing.accession);
      if (!content) {
        console.log('no content');
        continue;
      }
      
      const results = extractPreferredFromATM(content);
      
      if (!results) {
        console.log('not ATM');
      } else {
        const summary = results.map(r => `${r.type}: $${r.proceedsM.toFixed(1)}M`).join(', ');
        console.log(`✓ ${summary}`);
        allResults.push({ date: filing.date, accession: filing.accession, results });
      }
    } catch (e) {
      console.log('error:', e.message);
    }
    
    await new Promise(r => setTimeout(r, 150));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('PREFERRED PROCEEDS FROM 8-K ATM UPDATES');
  console.log('='.repeat(60));
  
  // Aggregate by type - use latest cumulative or sum periodic
  const byType = {};
  
  for (const { date, results } of allResults) {
    for (const r of results) {
      if (!byType[r.type]) byType[r.type] = { cumulative: 0, periodic: [] };
      
      if (r.cumulative) {
        byType[r.type].cumulative = Math.max(byType[r.type].cumulative, r.proceedsM);
      } else {
        byType[r.type].periodic.push({ date, amount: r.proceedsM });
      }
    }
  }
  
  let grandTotal = 0;
  for (const [type, data] of Object.entries(byType)) {
    const periodicSum = data.periodic.reduce((s, p) => s + p.amount, 0);
    const total = Math.max(data.cumulative, periodicSum);
    console.log(`\n${type}:`);
    console.log(`  Cumulative: $${data.cumulative.toFixed(1)}M`);
    console.log(`  Periodic sum: $${periodicSum.toFixed(1)}M`);
    console.log(`  Using: $${total.toFixed(1)}M`);
    grandTotal += total;
  }
  
  console.log(`\n==> TOTAL PREFERRED: $${(grandTotal/1000).toFixed(2)}B`);
}

run().catch(console.error);
