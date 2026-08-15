const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://www.keydiy.fr';

const CATEGORIES = [
  { name: 'KEYDIY KD-Programmers', path: '/wholesale/keydiy-kd-programmers/' },
  { name: 'B General Remote', path: '/wholesale/b-general-remote/' },
  { name: 'NB Electronic Remote', path: '/wholesale/nb-electronic-remote/' },
  { name: 'ZB Smart Remote', path: '/wholesale/zb-smart-remote/' },
  { name: 'TB Smart Remote', path: '/wholesale/tb-smart-remote/' },
  { name: 'TDB Smart Remote', path: '/wholesale/tdb-smart-remote/' },
  { name: 'MLB Dedicated Key', path: '/wholesale/mlb-dedicated-key/' },
  { name: 'Phone As Key', path: '/wholesale/phone-as-key/' },
  { name: 'ACCESSORIES', path: '/wholesale/accessories/' },
  { name: 'KEYDIY License and Tokens', path: '/wholesale/keydiy-license-and-tokens/' }
];

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
};

async function countProducts() {
  console.log('Fetching and counting all products listed on keydiy.fr...');
  
  let totalUniqueUrls = new Set();
  let categoryCounts = {};

  for (const cat of CATEGORIES) {
    const url = `${BASE_URL}${cat.path}`;
    try {
      const response = await axios.get(url, { headers, timeout: 15000 });
      const $ = cheerio.load(response.data);
      
      let catUrls = new Set();
      
      $('a').each((i, el) => {
        const href = $(el).attr('href');
        if (href && href.startsWith('/wholesale/') && href.endsWith('.html') && !href.includes('new_arrivals') && !href.includes('hot_products')) {
          catUrls.add(href);
          totalUniqueUrls.add(href);
        }
      });
      
      categoryCounts[cat.name] = catUrls.size;
      console.log(`Category "${cat.name}": Found ${catUrls.size} products`);
      
      // Pause slightly between requests
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`Error fetching category ${cat.name}:`, err.message);
    }
  }

  console.log('\n--- Final Product Count Summary ---');
  console.log(`Total Unique Products Across All Categories: ${totalUniqueUrls.size}`);
  console.log('Breakdown by Category:');
  console.log(JSON.stringify(categoryCounts, null, 2));
}

countProducts();
