import fs from 'fs';

const holdingsContent = fs.readFileSync('src/lib/data/holdings-history.ts', 'utf-8');
const companiesContent = fs.readFileSync('src/lib/data/companies.ts', 'utf-8');

// Companies with debt in companies.ts (source of truth for current values)
const currentDebt = {};
const blocks = companiesContent.split(/\n\s*\{/);
for (const block of blocks) {
  const tickerMatch = block.match(/ticker:\s*["']([^"']+)["']/);
  const debtMatch = block.match(/totalDebt:\s*([0-9_]+)/);
  const prefMatch = block.match(/preferredEquity:\s*([0-9_]+)/);
  const debtSourceMatch = block.match(/debtSource:\s*["']([^"']+)["']/);
  
  if (tickerMatch && (debtMatch || prefMatch)) {
    const ticker = tickerMatch[1];
    const debt = debtMatch ? parseInt(debtMatch[1].replace(/_/g, '')) : 0;
    const pref = prefMatch ? parseInt(prefMatch[1].replace(/_/g, '')) : 0;
    if (debt > 0 || pref > 0) {
      currentDebt[ticker] = {
        debt,
        pref,
        source: debtSourceMatch ? debtSourceMatch[1] : 'unknown'
      };
    }
  }
}

// Check holdings-history entries
console.log('ACCURACY AUDIT:\n');
console.log('Companies with debt in holdings-history.ts:\n');

const historyNames = holdingsContent.match(/const \w+_HISTORY/g) || [];
for (const name of historyNames) {
  const varName = name.replace('const ', '');
  const regex = new RegExp(varName + '[\\s\\S]*?\\];');
  const match = holdingsContent.match(regex);
  
  if (match && match[0].includes('totalDebt:')) {
    // Extract ticker from export mapping
    const tickerRegex = new RegExp(`["']?(\\w+(?:\\.\\w+)?["']?):\\s*\\{[^}]*history:\\s*${varName}`);
    const tickerMatch = holdingsContent.match(tickerRegex);
    const ticker = tickerMatch ? tickerMatch[1].replace(/['"]/g, '') : varName.replace('_HISTORY', '');
    
    // Check if we have verified source
    const hasSecSource = match[0].includes('sourceUrl:') || match[0].includes('sec-filing');
    const debtValues = [...match[0].matchAll(/totalDebt:\s*([0-9_]+)/g)].map(m => parseInt(m[1].replace(/_/g, '')));
    const uniqueDebts = [...new Set(debtValues)];
    
    const verified = currentDebt[ticker]?.source?.includes('SEC') || currentDebt[ticker]?.source?.includes('XBRL');
    
    console.log(`${ticker}:`);
    console.log(`  Debt values used: ${uniqueDebts.map(d => '$' + (d/1e6).toFixed(0) + 'M').join(', ')}`);
    console.log(`  Current source: ${currentDebt[ticker]?.source || 'N/A'}`);
    console.log(`  Verified: ${verified ? '✅ SEC/XBRL' : '⚠️ Estimated'}`);
    console.log('');
  }
}
