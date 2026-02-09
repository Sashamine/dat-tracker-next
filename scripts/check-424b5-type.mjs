/**
 * Check if 424B5 is announcing actual sales or just ATM capacity
 */

async function run() {
  const acc = '0001193125-25-272591';
  const accClean = acc.replace(/-/g, '');
  
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/1050446/${accClean}/index.json`;
  const indexRes = await fetch(indexUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const index = await indexRes.json();
  
  const doc = index.directory.item.find(d => d.name.endsWith('.htm') && !d.name.includes('ex'));
  const docUrl = `https://www.sec.gov/Archives/edgar/data/1050446/${accClean}/${doc.name}`;
  
  const res = await fetch(docUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const content = await res.text();
  const clean = content.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
  
  console.log('Nov 7 2025 424B5 Analysis');
  console.log('='.repeat(50));
  
  // Check for key language patterns
  const patterns = [
    'We are offering',
    'we may offer and sell',
    'from time to time',
    'aggregate offering price of up to',
    'have been sold',
    'we sold',
    'net proceeds'
  ];
  
  for (const p of patterns) {
    const idx = clean.indexOf(p);
    if (idx > 0) {
      console.log(`\n"${p}" found:`);
      console.log(clean.slice(Math.max(0, idx - 30), idx + 150));
    }
  }
  
  // Show first 2000 chars
  console.log('\n\nFirst 2000 chars:');
  console.log(clean.slice(0, 2000));
}

run().catch(console.error);
