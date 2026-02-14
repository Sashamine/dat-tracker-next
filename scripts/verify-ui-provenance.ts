/**
 * Verify all provenance data has correct citation structure for UI rendering.
 * Tests the data layer that powers the citation popovers.
 */

// Import all provenance modules
import { ABTC_PROVENANCE } from "../src/lib/data/provenance/abtc";
import { BTBT_PROVENANCE } from "../src/lib/data/provenance/btbt";
import { NAKA_PROVENANCE } from "../src/lib/data/provenance/naka";
import { HSDT_PROVENANCE } from "../src/lib/data/provenance/hsdt";
import { DFDV_PROVENANCE } from "../src/lib/data/provenance/dfdv";
import { UPXI_PROVENANCE } from "../src/lib/data/provenance/upxi";

type Provenance = Record<string, any>;

const companies: [string, Provenance][] = [
  ["ABTC", ABTC_PROVENANCE],
  ["BTBT", BTBT_PROVENANCE],
  ["NAKA", NAKA_PROVENANCE],
  ["HSDT", HSDT_PROVENANCE],
  ["DFDV", DFDV_PROVENANCE],
  ["UPXI", UPXI_PROVENANCE],
];

let totalPass = 0;
let totalFail = 0;
const failures: string[] = [];

for (const [ticker, prov] of companies) {
  console.log(`\n📋 ${ticker}`);
  
  for (const [field, pv] of Object.entries(prov)) {
    if (!pv || typeof pv !== "object" || !("value" in pv)) continue;
    
    const source = pv.source;
    const value = pv.value;
    const note = pv.note;
    
    const issues: string[] = [];
    
    // Check source exists
    if (!source) {
      issues.push("No source");
    } else {
      // Check source has type
      if (!source.type) issues.push("No source.type");
      
      // Check for searchTerm or XBRL fact
      if (source.type === "xbrl") {
        if (!source.fact) issues.push("XBRL missing fact name");
        if (source.rawValue === undefined) issues.push("XBRL missing rawValue");
      } else {
        if (!source.searchTerm) issues.push("No searchTerm");
        if (!source.url && !source.cik) issues.push("No URL or CIK");
      }
      
      // Check filing metadata  
      if (!source.cik && !source.url) issues.push("No CIK or URL");
      if (!source.filingType) issues.push("No filingType");
    }

    if (issues.length === 0) {
      const srcType = source.type === "xbrl" ? `XBRL:${source.fact}` : 
                      source.type === "sec-document" ? `${source.filingType}:${source.searchTerm?.substring(0,30)}` :
                      source.type;
      const linkTarget = source.url ? source.url.substring(0, 60) : source.cik ? `CIK:${source.cik}` : "?";
      console.log(`   ✅ ${field}: ${srcType} → ${linkTarget}`);
      totalPass++;
    } else {
      console.log(`   ❌ ${field}: ${issues.join(", ")}`);
      failures.push(`${ticker}.${field}: ${issues.join(", ")}`);
      totalFail++;
    }
  }
}

console.log(`\n${"=".repeat(50)}`);
console.log(`📊 PROVENANCE DATA STRUCTURE`);
console.log(`${"=".repeat(50)}`);
console.log(`✅ Pass: ${totalPass}`);
console.log(`❌ Fail: ${totalFail}`);
if (failures.length > 0) {
  console.log(`\nFailures:`);
  failures.forEach(f => console.log(`  ${f}`));
}
