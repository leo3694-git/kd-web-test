const cheerio = require('cheerio');
const fs = require('fs');

const html = fs.readFileSync('product_page_dump.html', 'utf8');
const $ = cheerio.load(html);

console.log('--- Finding elements containing specs keywords ---');

// Search for weight
$(':contains("weight")').each((i, el) => {
  if ($(el).children().length === 0) {
    console.log(`Weight Text Node: Tag=${el.tagName}, Text="${$(el).text().trim()}"`);
    console.log(`Parent HTML: ${$(el).parent().html().substring(0, 150)}`);
  }
});

// Search for package
$(':contains("package")').each((i, el) => {
  if ($(el).children().length === 0) {
    console.log(`Package Text Node: Tag=${el.tagName}, Text="${$(el).text().trim()}"`);
  }
});
