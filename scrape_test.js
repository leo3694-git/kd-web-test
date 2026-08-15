const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const url = 'https://www.keydiy.fr/wholesale/keydiy-kd-mp.html';
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
};

axios.get(url, { headers })
  .then(response => {
    const $ = cheerio.load(response.data);
    
    console.log('--- Document title:', $('title').text());
    
    // Find all elements with classes containing 'tab'
    console.log('--- Elements containing tab:');
    $('[class*="tab"], [id*="tab"]').each((i, el) => {
      const className = $(el).attr('class') || '';
      const idName = $(el).attr('id') || '';
      const tagName = el.tagName;
      console.log(`Tag: ${tagName}, ID: ${idName}, Class: ${className}`);
    });
    
    // Let's search for "Product Description" text in the document
    console.log('--- Element containing text "Product Description":');
    $(':contains("Product Description")').each((i, el) => {
      if ($(el).children().length === 0 || $(el).children('a').length > 0) {
        console.log(`Tag: ${el.tagName}, ID: ${$(el).attr('id')}, Class: ${$(el).attr('class')}, Text: ${$(el).text().trim().substring(0, 100)}`);
      }
    });

    // Let's write the full HTML to a local file so we can inspect it manually if needed!
    fs.writeFileSync('product_page_dump.html', response.data);
    console.log('Saved product_page_dump.html');
  })
  .catch(err => {
    console.error('Error fetching page:', err.message);
  });
