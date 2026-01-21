/**
 * Test script for the comparison engine
 */
import 'dotenv/config';
import { loadOurValues, compareOne } from '../src/lib/comparison/engine';

async function main() {
  // First test loadOurValues
  const ourValues = loadOurValues();
  const mstrValues = ourValues.filter(v => v.ticker === 'MSTR');
  console.log('MSTR values from companies.ts:');
  mstrValues.forEach(v => console.log(`  ${v.field}: ${v.value.toLocaleString()}`));

  // Run comparison for MSTR (dry run)
  console.log('\nRunning comparison for MSTR (dry run)...\n');

  try {
    const result = await compareOne('MSTR', { dryRun: true });

    console.log('\nResults:');
    console.log(`  Fetch results: ${result.fetchResults}`);
    console.log(`  Discrepancies: ${result.discrepancies.length}`);
    console.log(`  Errors: ${result.errors.length}`);

    if (result.discrepancies.length > 0) {
      console.log('\nDiscrepancies found:');
      result.discrepancies.forEach(d => {
        console.log(`\n  ${d.field} (${d.severity}):`);
        console.log(`    Ours: ${d.ourValue.toLocaleString()}`);
        Object.entries(d.sourceValues).forEach(([source, sv]) => {
          console.log(`    ${source}: ${sv.value.toLocaleString()} (${d.maxDeviationPct.toFixed(2)}% deviation)`);
        });
      });
    } else {
      console.log('\nNo discrepancies found - all sources match our values!');
    }

    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach(e => console.log(`  ${e.source}: ${e.error}`));
    }
  } catch (error) {
    console.error('Error running comparison:', error);
  }
}

main();
