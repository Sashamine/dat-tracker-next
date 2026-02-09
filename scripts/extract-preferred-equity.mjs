/**
 * Extract ALL preferred stock issuances (STRK, STRF, STRC, STRD, STRE)
 * From 8-K filings and prospectus supplements
 */

const CIK = '1050446';

async function fetch8K(accession) {
  const accClean = accession.replace(/-/g, '');
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accClean}/index.json`;
  const res = await fetch(indexUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  if (!res.ok) return null;
  const index = await res.json();
  
  const doc = index.directory.item.find(d => d.name.endsWith('.htm') && !d.name.includes('ex'));
  if (!doc) return null;
  
  const docUrl = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accClean}/${doc.name}`;
  const docRes = await fetch(docUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  return await docRes.text();
}

async function run() {
  const subUrl = 'https://data.sec.gov/submissions/CIK0001050446.json';
  const subRes = await fetch(subUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const subData = await subRes.json();
  
  const recent = subData.filings.recent;
  
  console.log('='.repeat(70));
  console.log('EXTRACTING PREFERRED STOCK ISSUANCES');
  console.log('='.repeat(70));
  
  const preferredPrograms = {
    STRK: { name: 'Strike (8%)', shares: 0, proceeds: 0, events: [] },
    STRF: { name: 'Strife (10%)', shares: 0, proceeds: 0, events: [] },
    STRC: { name: 'Strive', shares: 0, proceeds: 0, events: [] },
    STRD: { name: 'Stride', shares: 0, proceeds: 0, events: [] },
    STRE: { name: 'Stream (EUR)', shares: 0, proceeds: 0, events: [] },
  };
  
  // Track IPO/initial offerings
  const ipoFilings = [];
  
  for (let i = 0; i < Math.min(recent.form.length, 300); i++) {
    const form = recent.form[i];
    const date = recent.filingDate[i];
    const acc = recent.accessionNumber[i];
    
    // Check 8-K, 424B, S-3 filings
    if (!['8-K', '424B3', '424B5', 'S-3', 'S-3/A'].includes(form)) continue;
    if (date < '2024-01-01') continue;
    
    const raw = await fetch8K(acc);
    if (!raw) continue;
    
    const content = raw.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
    const lower = content.toLowerCase();
    
    // Check for preferred stock mentions
    const hasPreferred = lower.includes('preferred stock') || 
                         lower.includes('strk') || 
                         lower.includes('strf') ||
                         lower.includes('strc') ||
                         lower.includes('strd') ||
                         lower.includes('stre') ||
                         lower.includes('perpetual preferred');
    
    if (!hasPreferred) continue;
    
    // Determine which program
    let program = null;
    if (lower.includes('strike') || content.includes('STRK')) program = 'STRK';
    else if (lower.includes('strife') || content.includes('STRF')) program = 'STRF';
    else if (lower.includes('strive') || content.includes('STRC')) program = 'STRC';
    else if (lower.includes('stride') || content.includes('STRD')) program = 'STRD';
    else if (lower.includes('stream') || content.includes('STRE') || lower.includes('€') || lower.includes('eur')) program = 'STRE';
    
    if (!program) continue;
    
    // Extract shares and proceeds
    // Pattern 1: "X shares...net proceeds of $Y"
    const sharesMatch = content.match(new RegExp(`(\\d{1,3}(?:,\\d{3})*)\\s+shares?\\s+of\\s+(?:${program}|${preferredPrograms[program].name.split(' ')[0]})`, 'i')) ||
                        content.match(new RegExp(`${program}[^\\d]*(\\d{1,3}(?:,\\d{3})*)\\s+shares?`, 'i'));
    
    // Pattern 2: Look for proceeds in various formats
    const proceedsPatterns = [
      /net\s+proceeds[^$]*\$\s*([\d,.]+)\s*(billion|million)?/i,
      /aggregate\s+(?:net\s+)?proceeds[^$]*\$\s*([\d,.]+)\s*(billion|million)?/i,
      /gross\s+proceeds[^$]*\$\s*([\d,.]+)\s*(billion|million)?/i,
      /€\s*([\d,.]+)\s*(billion|million)?/i,  // Euro for STRE
    ];
    
    let proceeds = 0;
    let isEuro = false;
    for (const pattern of proceedsPatterns) {
      const match = content.match(pattern);
      if (match) {
        proceeds = parseFloat(match[1].replace(/,/g, ''));
        const unit = match[2]?.toLowerCase();
        if (unit === 'billion') proceeds *= 1e9;
        else if (unit === 'million') proceeds *= 1e6;
        else if (proceeds < 1000) proceeds *= 1e6;  // Assume millions
        
        if (pattern.source.includes('€')) {
          isEuro = true;
          proceeds *= 1.08;  // Approximate EUR to USD
        }
        break;
      }
    }
    
    // Check for IPO/initial offering announcement
    const isIPO = lower.includes('initial public offering') || 
                  lower.includes('pricing') && lower.includes('offering') ||
                  lower.includes('closes') && lower.includes('offering');
    
    if (isIPO && proceeds > 0) {
      console.log(`${date} [${form}]: ${program} ${isIPO ? 'IPO/OFFERING' : ''} - $${(proceeds/1e6).toFixed(1)}M${isEuro ? ' (EUR)' : ''}`);
      
      preferredPrograms[program].proceeds += proceeds;
      preferredPrograms[program].events.push({
        date,
        type: 'ipo',
        proceeds,
        accession: acc,
      });
    }
    
    await new Promise(r => setTimeout(r, 100));
  }
  
  // Now check ATM tables for ongoing preferred sales
  console.log('\n--- Checking ATM tables for preferred sales ---\n');
  
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] !== '8-K') continue;
    if (recent.filingDate[i] < '2025-01-01') continue;
    
    const raw = await fetch8K(recent.accessionNumber[i]);
    if (!raw) continue;
    
    const content = raw.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
    
    if (!content.includes('ATM Program Summary') && !content.includes('ATM Update')) continue;
    
    // Extract proceeds per program from table
    // Format: "STRK ATM 575,392 STRK Shares $ 57.5 $ 57.5..."
    // Or: "STRK Stock 38,796 $ - $ 3.5..."
    
    for (const [ticker, prog] of Object.entries(preferredPrograms)) {
      if (ticker === 'STRE') continue;  // STRE not in ATM
      
      // Look for net proceeds column for this ticker
      // Pattern: "TICKER ATM/Stock ... $ X.X" where X.X is net proceeds in millions
      const patterns = [
        new RegExp(`${ticker}\\s+(?:ATM|Stock)[^$]*\\$\\s*[\\d,.]+\\s*\\$\\s*([\\d,.]+)`, 'i'),
        new RegExp(`${ticker}[^\\n]*Net Proceeds[^$]*\\$\\s*([\\d,.]+)`, 'i'),
      ];
      
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          const netProceeds = parseFloat(match[1].replace(/,/g, '')) * 1e6;
          if (netProceeds > 0 && netProceeds < 1e9) {  // Sanity check
            // Don't double count - this is cumulative in tables
            // We'll take the max value seen
          }
          break;
        }
      }
    }
    
    await new Promise(r => setTimeout(r, 50));
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY BY PROGRAM');
  console.log('='.repeat(70));
  
  let totalProceeds = 0;
  for (const [ticker, prog] of Object.entries(preferredPrograms)) {
    if (prog.events.length > 0) {
      console.log(`\n${ticker} (${prog.name}):`);
      console.log(`  Events: ${prog.events.length}`);
      console.log(`  Total Proceeds: $${(prog.proceeds/1e6).toFixed(1)}M`);
      totalProceeds += prog.proceeds;
      
      for (const e of prog.events) {
        console.log(`    ${e.date}: $${(e.proceeds/1e6).toFixed(1)}M`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log(`TOTAL PREFERRED PROCEEDS: $${(totalProceeds/1e9).toFixed(2)}B`);
  console.log('='.repeat(70));
}

run().catch(console.error);
