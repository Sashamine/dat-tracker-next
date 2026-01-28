import { extractShareCounts } from '../src/lib/sec/xbrl-extractor';
import { detectDilutiveInstruments } from '../src/lib/data/dilutive-instruments';

async function test() {
  console.log('Testing TWAV specifically...\n');
  
  const shareCounts = await extractShareCounts('TWAV');
  console.log('Share counts result:', JSON.stringify(shareCounts, null, 2));
  
  if (shareCounts.success) {
    const detection = detectDilutiveInstruments(
      shareCounts.basicShares,
      shareCounts.dilutedShares,
      'TWAV',
      shareCounts.asOfDate,
      shareCounts.filingType,
      shareCounts.secUrl
    );
    console.log('\nDilution detection:', JSON.stringify(detection, null, 2));
  }
}

test().catch(console.error);
