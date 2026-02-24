#!/usr/bin/env node
/**
 * Conservative non-US landing page upgrader (deterministic):
 * - Scans src/lib/data/companies.ts
 * - For known "landing" URLs (SEDAR landing, MFN issuer index, generic disclosures pages),
 *   replaces with a more specific URL found in the SAME company object block.
 * - Only upgrades when a "specific" URL is present (PDF or obvious disclosure document URL).
 */
import fs from 'node:fs/promises';

const LANDING_PATTERNS = [
  'https://www.sedarplus.ca/landingpage/',
  'https://mfn.se/a/',
  'https://metaplanet.jp/en/shareholders/disclosures',
];

function isLanding(url) {
  if (typeof url !== 'string') return false;
  return LANDING_PATTERNS.some((p) => url.startsWith(p));
}

function isSpecific(url) {
  if (typeof url !== 'string') return false;
  const u = url.toLowerCase();
  if (u.endsWith('.pdf')) return true;
  if (u.includes('sec.gov/archives/edgar/data/') || u.includes('sec.gov/ixviewer')) return true;
  // Yahoo JP disclosure PDFs
  if (u.includes('/disclosure/') && u.endsWith('.pdf')) return true;
  // Finanzwire press release pages are specific
  if (u.includes('finanzwire.com/press-release/')) return true;
  // MFN specific article pages (not just /a/<issuer>)
  if (u.startsWith('https://mfn.se/a/') && u.split('/').length > 5) return true;
  return u.includes('/disclosure/') || u.includes('/press-release/') || u.includes('/press-releases/');
}

function findSpecificInBlock(block) {
  // Grab quoted URLs
  const urls = Array.from(block.matchAll(/"(https?:\/\/[^\"]+)"/g)).map((m) => m[1]);
  // Prefer PDFs first
  const pdf = urls.find((u) => String(u).toLowerCase().endsWith('.pdf'));
  if (pdf) return pdf;
  // Then SEC Archives/ixviewer
  const sec = urls.find((u) => {
    const s = String(u).toLowerCase();
    return s.includes('sec.gov/archives/edgar/data/') || s.includes('sec.gov/ixviewer');
  });
  if (sec) return sec;
  // Then any non-landing URL that looks like a specific doc/article
  const other = urls.find((u) => !isLanding(u) && u.length > 30);
  return other || null;
}

async function main() {
  const p = 'src/lib/data/companies.ts';
  let s = await fs.readFile(p, 'utf8');

  // Split into object blocks roughly by "{\n" + "}," boundaries in arrays.
  const parts = s.split(/\n\s*\},\n\s*\{/);
  let upgraded = 0;

  for (let i = 0; i < parts.length; i++) {
    const block = parts[i];
    // quick skip
    if (!LANDING_PATTERNS.some((p) => block.includes(p))) continue;

    const specific = findSpecificInBlock(block);
    if (!specific) continue;

    let newBlock = block;
    for (const pat of LANDING_PATTERNS) {
      // Replace exact landing URL occurrences inside quotes
      const re = new RegExp(`\"(${pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\"]*)\"`, 'g');
      newBlock = newBlock.replace(re, `"${specific}"`);
    }

    if (newBlock !== block) {
      parts[i] = newBlock;
      upgraded++;
    }
  }

  const out = parts.join('\n  },\n  {');
  if (out !== s) {
    await fs.writeFile(p, out);
  }

  console.log(`ok: upgraded ${upgraded} landing urls`);
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
