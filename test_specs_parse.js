const cheerio = require('cheerio');
const fs = require('fs');

const html = fs.readFileSync('product_page_dump.html', 'utf8');
const $ = cheerio.load(html);

console.log('--- Scanning page elements for metadata ---');

// Check for schema tags
const metaSku = $('[itemprop="sku"]').attr('content');
const metaName = $('[itemprop="name"]').attr('content');
const metaBrand = $('[itemprop="brand"]').text().trim();
console.log('Meta SKU:', metaSku);
console.log('Meta Name:', metaName);
console.log('Meta Brand:', metaBrand);

// Scan tr elements
$('tr').each((i, el) => {
  const text = $(el).text().replace(/\s+/g, ' ').trim();
  if (text.toLowerCase().includes('weight') || text.toLowerCase().includes('size') || text.toLowerCase().includes('package') || text.toLowerCase().includes('sku')) {
    console.log(`TR ${i+1}: "${text}"`);
  }
});

// Scan li elements
$('li').each((i, el) => {
  const text = $(el).text().replace(/\s+/g, ' ').trim();
  if (text.toLowerCase().includes('weight') || text.toLowerCase().includes('size') || text.toLowerCase().includes('package') || text.toLowerCase().includes('sku')) {
    console.log(`LI ${i+1}: "${text}"`);
  }
});
