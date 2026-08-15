const fs = require('fs');
const html = fs.readFileSync('product_page_dump.html', 'utf8');

console.log('--- Scanning raw HTML file lines for keywords ---');
const lines = html.split('\n');
lines.forEach((line, idx) => {
  const lower = line.toLowerCase();
  if (lower.includes('weight') || lower.includes('package') || lower.includes('size')) {
    console.log(`Line ${idx+1}: ${line.trim().substring(0, 180)}`);
  }
});
