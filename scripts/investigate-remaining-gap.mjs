/**
 * Investigate the remaining ~$5.5B ATM gap
 * Check: unparsed weeks, STRE offering, other sources
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
  return await docRes.text();
}

async function run() {
  const subUrl = 'https://data.sec.gov/submissions/CIK0001050446.json';
  const subRes = await fetch(subUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const subData = await subRes.json();
  
  const recent = subData.filings.recent;
  
  console.log('='.repeat(70));
  console.log('INVESTIGATING REMAINING ATM GAP (~$5.5B)');
  console.log('='.repeat(70));
  
  // 1. Check unparsed ATM weeks
  console.log('\n1. UNPARSED ATM WEEKS (no Total line):\n');
  
  const unparsedDates = ['2025-10-06', '2025-08-04', '2025-07-28', '2025-07-07'];
  
  for (const targetDate of unparsedDates) {
    let acc = null;
    for (let i = 0; i < recent.form.length; i++) {
      if (recent.form[i] === '8-K' && recent.filingDate[i] === targetDate) {
        acc = recent.accessionNumber[i];
        break;
      }
    }
    if (!acc) continue;
    
    const raw = await fetch8K(acc);
    if (!raw) continue;
    
    const content = raw.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
    
    // Find ATM section
    const atmIdx = content.indexOf('ATM');
    if (atmIdx > 0) {
      const section = content.slice(atmIdx, atmIdx + 600);
      
      // Check for any $ amounts
      const amounts = section.match(/\$\s*[\d,.]+\s*(billion|million)?/gi) || [];
      const hasNoSales = section.toLowerCase().includes('did not sell') || 
                         section.includes('- $') || 
                         section.includes('$ -');
      
      console.log(`${targetDate}: ${hasNoSales ? 'NO SALES' : amounts.join(', ') || 'no $ found'}`);
    }
    
    await new Promise(r => setTimeout(r, 200));
  }
  
  // 2. Check for STRE and other preferred offerings
  console.log('\n\n2. NON-ATM EQUITY OFFERINGS (STRE, direct offerings):\n');
  
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] !== '8-K') continue;
    if (recent.filingDate[i] < '2025-01-01') continue;
    
    const raw = await fetch8K(recent.accessionNumber[i]);
    if (!raw) continue;
    
    const content = raw.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
    const lower = content.toLowerCase();
    
    // Look for non-ATM offerings
    const hasSTRE = lower.includes('stre') || lower.includes('stream');
    const hasOffering = lower.includes('public offering') && !lower.includes('atm');
    const hasDirectPlacement = lower.includes('direct') && lower.includes('placement');
    
    if (hasSTRE || hasOffering || hasDirectPlacement) {
      // Find gross/net proceeds
      const proceedsMatch = content.match(/(?:gross|net)\s+proceeds[^$]*\$\s*([\d,.]+)\s*(billion|million)?/i);
      
      if (proceedsMatch) {
        let amount = parseFloat(proceedsMatch[1].replace(/,/g, ''));
        const unit = proceedsMatch[2]?.toLowerCase();
        if (unit === 'billion') amount *= 1e9;
        else if (unit === 'million') amount *= 1e6;
        else if (amount < 1000) amount *= 1e6;  // Assume millions
        
        console.log(`${recent.filingDate[i]}: ${hasSTRE ? 'STRE' : 'Other'} offering - $${(amount/1e6).toFixed(1)}M`);
      }
    }
    
    await new Promise(r => setTimeout(r, 100));
  }
  
  // 3. Check 2024 August ATM (before October $21B program)
  console.log('\n\n3. EARLY ATM (August 2024 $2B program):\n');
  
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] !== '8-K') continue;
    if (recent.filingDate[i] < '2024-08-01' || recent.filingDate[i] > '2024-10-29') continue;
    
    const raw = await fetch8K(recent.accessionNumber[i]);
    if (!raw) continue;
    
    const content = raw.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
    const lower = content.toLowerCase();
    
    if (lower.includes('atm') || lower.includes('sale agreement') || lower.includes('sold')) {
      const sharesMatch = content.match(/sold\s+(?:an\s+aggregate\s+of\s+)?([\d,]+)\s+shares/i);
      const proceedsMatch = content.match(/(?:net|gross)\s+proceeds[^$]*\$\s*([\d,.]+)\s*(billion|million)?/i);
      
      if (sharesMatch || proceedsMatch) {
        const shares = sharesMatch ? sharesMatch[1] : 'N/A';
        let proceeds = 'N/A';
        if (proceedsMatch) {
          let amt = parseFloat(proceedsMatch[1].replace(/,/g, ''));
          const unit = proceedsMatch[2]?.toLowerCase();
          if (unit === 'billion') amt *= 1e9;
          else if (unit === 'million') amt *= 1e6;
          proceeds = `$${(amt/1e6).toFixed(1)}M`;
        }
        console.log(`${recent.filingDate[i]}: ${shares} shares, ${proceeds}`);
      }
    }
    
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
}

run().catch(console.error);
