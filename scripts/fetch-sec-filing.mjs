/**
 * Fetch SEC filing content with proper User-Agent
 */

const url = process.argv[2] || 'https://www.sec.gov/Archives/edgar/data/0001507605/000149315224050693/form8-k.htm';

console.log('Fetching:', url, '\n');

const response = await fetch(url, {
  headers: {
    'User-Agent': 'DAT-Tracker research@dattracker.com',
    'Accept': 'text/html,application/xhtml+xml',
  }
});

if (!response.ok) {
  console.error('Error:', response.status, response.statusText);
  process.exit(1);
}

const text = await response.text();

// Extract just the text content, stripping HTML
const cleaned = text
  .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&#160;/g, ' ')
  .replace(/&#8217;/g, "'")
  .replace(/&#8220;/g, '"')
  .replace(/&#8221;/g, '"')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

// Print full content (up to 15000 chars)
console.log(cleaned.substring(0, 15000));
