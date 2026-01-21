/**
 * Debug script to inspect SEC filing structure
 */

const USER_AGENT = 'DAT-Tracker/1.0 (https://dattracker.com; admin@dattracker.com)';

async function fetchFilingIndex(cik: string, accessionNumber: string) {
  const accNum = accessionNumber.replace(/-/g, '');
  const cikNum = cik.replace(/^0+/, '');
  const url = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNum}/index.json`;

  console.log(`Fetching: ${url}`);

  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    console.error(`HTTP ${response.status}`);
    const text = await response.text();
    console.log(text.substring(0, 500));
    return null;
  }

  return response.json();
}

async function fetchDocument(url: string) {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    return null;
  }

  return response.text();
}

async function main() {
  const cik = '0001050446'; // MSTR
  const accessionNumber = '0001193125-26-016002'; // Most recent 8-K

  console.log('='.repeat(60));
  console.log('Debugging SEC Filing Structure');
  console.log('='.repeat(60));
  console.log(`CIK: ${cik}`);
  console.log(`Accession: ${accessionNumber}`);
  console.log();

  // Get filing index
  const index = await fetchFilingIndex(cik, accessionNumber);
  if (!index) {
    console.error('Failed to fetch filing index');
    return;
  }

  console.log('Documents in filing:');
  console.log('-'.repeat(60));

  const docs = index.directory?.item || [];
  for (const doc of docs) {
    console.log(`${doc.name} (${doc.size} bytes) - ${doc.type || 'N/A'}`);
  }

  // Find and check .htm files
  const htmDocs = docs.filter((d: any) => d.name.match(/\.htm$/i));
  console.log(`\nFound ${htmDocs.length} .htm documents`);

  // Check which ones might have crypto content
  const btcKeywords = ['bitcoin', 'btc', 'digital asset', 'cryptocurrency'];

  for (const doc of htmDocs.slice(0, 5)) {
    const cikNum = cik.replace(/^0+/, '');
    const accNum = accessionNumber.replace(/-/g, '');
    const url = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNum}/${doc.name}`;

    console.log(`\nChecking: ${doc.name}`);
    const content = await fetchDocument(url);

    if (!content) {
      console.log('  Failed to fetch');
      continue;
    }

    // Clean content
    const cleanContent = content
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase();

    const foundKeywords = btcKeywords.filter(kw => cleanContent.includes(kw));

    if (foundKeywords.length > 0) {
      console.log(`  ✓ Found keywords: ${foundKeywords.join(', ')}`);

      // Find context around bitcoin mention
      const btcIndex = cleanContent.indexOf('bitcoin');
      if (btcIndex !== -1) {
        const context = cleanContent.substring(Math.max(0, btcIndex - 100), btcIndex + 200);
        console.log(`  Context: ...${context}...`);
      }
    } else {
      console.log(`  ✗ No crypto keywords found`);
      console.log(`  Preview: ${cleanContent.substring(0, 200)}...`);
    }

    await new Promise(r => setTimeout(r, 300));
  }
}

main().catch(console.error);
