const fs = require('fs');
const content = fs.readFileSync('src/lib/data/companies.ts', 'utf8');

// Find all *SourceUrl fields
const urlRegex = /(\w+SourceUrl):\s*["']([^"']+)["']/g;
let match;
const external = [];
const local = [];

while ((match = urlRegex.exec(content)) !== null) {
  const field = match[1];
  const url = match[2];
  
  if (url.startsWith('/') || url.startsWith('./')) {
    local.push({ field, url });
  } else {
    external.push({ field, url });
  }
}

console.log('=== EXTERNAL URLs (' + external.length + ') ===\n');

const byDomain = {};
for (const e of external) {
  const domainMatch = e.url.match(/https?:\/\/([^\/]+)/);
  const domain = domainMatch ? domainMatch[1] : 'unknown';
  if (!byDomain[domain]) byDomain[domain] = [];
  byDomain[domain].push(e);
}

const sorted = Object.entries(byDomain).sort((a, b) => b[1].length - a[1].length);
for (const [domain, urls] of sorted) {
  console.log(domain + ': ' + urls.length + ' URLs');
}

console.log('\n=== LOCAL URLs (' + local.length + ') ===');
local.forEach(l => console.log('  ' + l.url));

console.log('\n=== SUMMARY ===');
console.log('External: ' + external.length);
console.log('Local: ' + local.length);
console.log('Total: ' + (external.length + local.length));
