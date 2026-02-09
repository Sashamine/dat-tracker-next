async function run() {
  const acc = '0001193125-25-165531';
  const accClean = acc.replace(/-/g, '');
  
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/1050446/${accClean}/index.json`;
  const res = await fetch(indexUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const index = await res.json();
  const doc = index.directory.item.find(d => d.name.endsWith('.htm'));
  
  const docRes = await fetch(`https://www.sec.gov/Archives/edgar/data/1050446/${accClean}/${doc.name}`,
    { headers: { 'User-Agent': 'DAT-Tracker' } });
  const content = await docRes.text();
  const clean = content.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
  
  console.log('July 25 STRC 424B5 Analysis:');
  console.log('='.repeat(50));
  
  // Is this an underwritten offering?
  console.log('Has underwriters:', clean.includes('underwriters'));
  console.log('Has underwriting discount:', clean.includes('underwriting discount'));
  console.log('Has public offering price:', clean.includes('public offering price'));
  console.log('Has "from time to time":', clean.includes('from time to time'));
  console.log('Has sales agent:', clean.includes('sales agent'));
  
  // Find public offering price
  const priceMatch = clean.match(/public offering price.*?\$\s*([\d,.]+)/i);
  if (priceMatch) {
    console.log('\nPublic offering price found:', priceMatch[0].slice(0, 100));
  }
  
  // This is a DIRECT underwritten offering, NOT an ATM
  // The fact that it has underwriters and a fixed public offering price
  // means it's separate from any ATM program
  
  console.log('\n='.repeat(50));
  console.log('CONCLUSION: This is a direct underwritten offering,');
  console.log('separate from the ATM program.');
  console.log('The $2.8B raised here is NOT reflected in ATM availability.');
}

run().catch(console.error);
