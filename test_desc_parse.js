const cheerio = require('cheerio');
const fs = require('fs');

const html = fs.readFileSync('product_page_dump.html', 'utf8');
const $ = cheerio.load(html);

const descEl = $('#xri_ProDt_Description');
console.log('Found #xri_ProDt_Description:', descEl.length > 0);

if (descEl.length > 0) {
  const htmlContent = descEl.html().trim();
  console.log('HTML Content length:', htmlContent.length);
  console.log('HTML Content snippet:\n', htmlContent.substring(0, 500));
  
  // Let's count images inside description
  const imgs = descEl.find('img');
  console.log('Number of images inside description:', imgs.length);
  imgs.each((i, img) => {
    console.log(`Image ${i+1}: src="${$(img).attr('src')}"`);
  });
} else {
  console.log('Failed to find description element.');
}
