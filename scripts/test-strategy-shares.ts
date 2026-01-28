/**
 * Test strategy.com share derivation for MSTR
 */

import { strategyFetcher } from '../src/lib/fetchers/dashboards/strategy';

async function main() {
  console.log('Testing strategy.com MSTR share extraction...\n');
  
  const results = await strategyFetcher.fetch(['MSTR']);
  
  const sharesResult = results.find(r => r.field === 'shares_outstanding');
  
  if (sharesResult) {
    console.log('Shares Outstanding:');
    console.log(`  Value: ${sharesResult.value.toLocaleString()}`);
    console.log(`  Source: ${sharesResult.source.name}`);
    console.log(`  Derived from: ${(sharesResult.raw as any).derivedFrom}`);
    console.log(`  Note: ${(sharesResult.raw as any).note}`);
    console.log(`  Raw marketCap: ${(sharesResult.raw as any).marketCap}`);
    console.log(`  Raw price: ${(sharesResult.raw as any).price}`);
  } else {
    console.log('No shares data returned!');
  }
  
  console.log(`\nTotal results: ${results.length}`);
  console.log('Fields:', results.map(r => r.field).join(', '));
}

main().catch(console.error);
