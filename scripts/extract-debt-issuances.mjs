/**
 * Extract all debt issuances from 8-K filings
 * These funded the BTC purchases
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
  const content = await docRes.text();
  
  return {
    content: content.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' '),
    docName: doc.name,
  };
}

function extractDebtData(content, filingDate) {
  const lower = content.toLowerCase();
  
  // Skip if not debt related
  if (!lower.includes('convertible') && !lower.includes('notes') && !lower.includes('loan')) {
    return null;
  }
  
  // Skip if it's a redemption-only filing
  if (lower.includes('redemption') && !lower.includes('offering') && !lower.includes('issued')) {
    return null;
  }
  
  const result = {
    type: null,
    principalAmount: null,
    interestRate: null,
    maturityDate: null,
    conversionPrice: null,
    useOfProceeds: null,
  };
  
  // Determine type
  if (lower.includes('senior secured')) {
    result.type = 'Senior Secured Notes';
  } else if (lower.includes('convertible')) {
    result.type = 'Convertible Notes';
  } else if (lower.includes('loan')) {
    result.type = 'Secured Loan';
  } else {
    result.type = 'Notes';
  }
  
  // Extract principal amount - multiple patterns
  const principalPatterns = [
    /aggregate principal amount of (?:the notes (?:is|being offered is) )?\$([\d,.]+) (million|billion)/i,
    /\$([\d,.]+) (million|billion) aggregate principal amount/i,
    /offering of \$([\d,.]+) (million|billion)/i,
    /issued \$([\d,.]+) (million|billion)/i,
    /principal amount of \$([\d,.]+) (million|billion)/i,
  ];
  
  for (const pattern of principalPatterns) {
    const match = content.match(pattern);
    if (match) {
      let amount = parseFloat(match[1].replace(/,/g, ''));
      if (match[2].toLowerCase() === 'billion') amount *= 1e9;
      else if (match[2].toLowerCase() === 'million') amount *= 1e6;
      result.principalAmount = amount;
      break;
    }
  }
  
  // Extract interest rate
  const ratePatterns = [
    /bear(?:s|ing)? interest at(?: a rate of)? ([\d.]+)%/i,
    /([\d.]+)% Convertible/i,
    /interest rate of ([\d.]+)%/i,
    /do not bear regular interest/i,
  ];
  
  for (const pattern of ratePatterns) {
    const match = content.match(pattern);
    if (match) {
      if (match[0].includes('do not bear')) {
        result.interestRate = 0;
      } else {
        result.interestRate = parseFloat(match[1]);
      }
      break;
    }
  }
  
  // Extract maturity date
  const maturityPatterns = [
    /mature on ([A-Za-z]+ \d+, \d{4})/i,
    /will mature (?:on )?([A-Za-z]+ \d+, \d{4})/i,
    /due (\d{4})/i,
    /maturity date of ([A-Za-z]+ \d+, \d{4})/i,
  ];
  
  for (const pattern of maturityPatterns) {
    const match = content.match(pattern);
    if (match) {
      result.maturityDate = match[1];
      break;
    }
  }
  
  // Extract conversion price (for convertibles)
  const conversionPatterns = [
    /conversion price of(?: approximately)? \$([\d,.]+)/i,
    /initial conversion rate of ([\d.]+) shares per \$1,000/i,
  ];
  
  for (const pattern of conversionPatterns) {
    const match = content.match(pattern);
    if (match) {
      if (match[0].includes('rate')) {
        // Convert rate to price: $1000 / rate
        result.conversionPrice = Math.round(1000 / parseFloat(match[1]));
      } else {
        result.conversionPrice = parseFloat(match[1].replace(/,/g, ''));
      }
      break;
    }
  }
  
  // Check use of proceeds
  if (lower.includes('acquire additional bitcoin') || lower.includes('invest') && lower.includes('bitcoin')) {
    result.useOfProceeds = 'Bitcoin acquisition';
  }
  
  // Only return if we found meaningful data
  if (!result.principalAmount) return null;
  
  return result;
}

async function run() {
  console.log('Extracting debt issuances from 8-Ks...\n');
  
  const subUrl = 'https://data.sec.gov/submissions/CIK0001050446.json';
  const subRes = await fetch(subUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const subData = await subRes.json();
  
  const recent = subData.filings.recent;
  
  const issuances = [];
  const seen = new Set(); // Avoid duplicates (pricing + closing for same deal)
  
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] !== '8-K') continue;
    if (recent.filingDate[i] < '2020-08-01' || recent.filingDate[i] > '2024-12-31') continue;
    
    process.stdout.write(`${recent.filingDate[i]}... `);
    
    const result = await fetch8K(recent.accessionNumber[i]);
    if (!result) {
      console.log('skip');
      continue;
    }
    
    const data = extractDebtData(result.content, recent.filingDate[i]);
    
    if (data) {
      // Create a key to dedupe (same amount + maturity = same deal)
      const key = `${data.principalAmount}-${data.maturityDate}`;
      if (seen.has(key)) {
        console.log(`skip (duplicate of ${data.type})`);
        continue;
      }
      seen.add(key);
      
      console.log(`✓ ${data.type}: $${(data.principalAmount / 1e6).toFixed(0)}M`);
      
      issuances.push({
        filingDate: recent.filingDate[i],
        accessionNumber: recent.accessionNumber[i],
        docName: result.docName,
        ...data,
      });
    } else {
      console.log('-');
    }
    
    await new Promise(r => setTimeout(r, 150));
  }
  
  // Sort by filing date
  issuances.sort((a, b) => a.filingDate.localeCompare(b.filingDate));
  
  console.log('\n' + '='.repeat(70));
  console.log(`Extracted ${issuances.length} debt issuances`);
  console.log('='.repeat(70));
  
  // Generate TypeScript file
  const tsContent = generateTypeScript(issuances);
  
  const fs = await import('fs');
  fs.writeFileSync('src/lib/data/mstr-debt-issuances.ts', tsContent);
  console.log('\nWrote src/lib/data/mstr-debt-issuances.ts');
  
  // Summary
  const totalRaised = issuances.reduce((sum, i) => sum + (i.principalAmount || 0), 0);
  console.log(`\nTotal debt raised: $${(totalRaised / 1e9).toFixed(2)}B`);
}

function generateTypeScript(issuances) {
  const lines = [
    '/**',
    ' * MSTR Debt Issuances',
    ' * ====================',
    ' * ',
    ' * All debt raised to fund BTC purchases, extracted from SEC 8-K filings.',
    ' * Click any accession number to view the source document.',
    ' * ',
    ` * Generated: ${new Date().toISOString()}`,
    ` * Total issuances: ${issuances.length}`,
    ' */',
    '',
    'export interface DebtIssuance {',
    '  /** SEC filing date */',
    '  filingDate: string;',
    '  ',
    '  /** Type of debt instrument */',
    '  type: string;',
    '  ',
    '  /** Principal amount in USD */',
    '  principalAmount: number;',
    '  ',
    '  /** Interest rate (0 for zero-coupon) */',
    '  interestRate: number | null;',
    '  ',
    '  /** Maturity date */',
    '  maturityDate: string | null;',
    '  ',
    '  /** Conversion price for convertibles */',
    '  conversionPrice: number | null;',
    '  ',
    '  /** Stated use of proceeds */',
    '  useOfProceeds: string | null;',
    '  ',
    '  // Provenance',
    '  accessionNumber: string;',
    '  secUrl: string;',
    '}',
    '',
    '/**',
    ' * All debt issuances from SEC 8-K filings (2020-2024)',
    ' * Sorted chronologically by filing date',
    ' */',
    'export const MSTR_DEBT_ISSUANCES: DebtIssuance[] = [',
  ];
  
  for (const i of issuances) {
    const accClean = i.accessionNumber.replace(/-/g, '');
    const secUrl = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accClean}/${i.docName}`;
    
    lines.push('  {');
    lines.push(`    filingDate: "${i.filingDate}",`);
    lines.push(`    type: "${i.type}",`);
    lines.push(`    principalAmount: ${i.principalAmount},`);
    lines.push(`    interestRate: ${i.interestRate ?? 'null'},`);
    lines.push(`    maturityDate: ${i.maturityDate ? `"${i.maturityDate}"` : 'null'},`);
    lines.push(`    conversionPrice: ${i.conversionPrice ?? 'null'},`);
    lines.push(`    useOfProceeds: ${i.useOfProceeds ? `"${i.useOfProceeds}"` : 'null'},`);
    lines.push(`    accessionNumber: "${i.accessionNumber}",`);
    lines.push(`    secUrl: "${secUrl}",`);
    lines.push('  },');
  }
  
  lines.push('];');
  lines.push('');
  lines.push('/**');
  lines.push(' * Get total debt raised');
  lines.push(' */');
  lines.push('export function getTotalDebtRaised(): number {');
  lines.push('  return MSTR_DEBT_ISSUANCES.reduce((sum, i) => sum + i.principalAmount, 0);');
  lines.push('}');
  lines.push('');
  lines.push('/**');
  lines.push(' * Get debt by type');
  lines.push(' */');
  lines.push('export function getDebtByType(type: string): DebtIssuance[] {');
  lines.push('  return MSTR_DEBT_ISSUANCES.filter(i => i.type === type);');
  lines.push('}');
  lines.push('');
  
  return lines.join('\n');
}

run().catch(console.error);
