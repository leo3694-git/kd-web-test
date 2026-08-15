const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

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

const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

// Ensure directories exist
if (!fs.existsSync(path.join(__dirname, 'public'))) {
  fs.mkdirSync(path.join(__dirname, 'public'));
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,zh-TW;q=0.8,zh;q=0.7'
};

async function downloadImage(url, filename) {
  try {
    const filePath = path.join(UPLOADS_DIR, filename);
    
    // Check if image already exists
    if (fs.existsSync(filePath)) {
      return `/uploads/${filename}`;
    }
    
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
      headers: headers,
      timeout: 10000
    });
    
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(`/uploads/${filename}`));
      writer.on('error', (err) => {
        console.error(`Error writing image ${filename}:`, err.message);
        resolve(null);
      });
    });
  } catch (err) {
    console.error(`Error downloading image ${url}:`, err.message);
    return null;
  }
}

// Scrape deep details from individual product pages
async function scrapeProductDetails(detailUrl) {
  const url = detailUrl.startsWith('http') ? detailUrl : `${BASE_URL}${detailUrl}`;
  console.log(`  -> Fetching product detail page: ${url}`);
  try {
    const response = await axios.get(url, { headers, timeout: 15000 });
    const $ = cheerio.load(response.data);
    
    // 1. Parse Description Content: Look inside tabs or product details block
    let descriptionHtml = '';
    const descSelectors = [
      '#xri_ProDt_Description', // KeyDIY specific description selector
      '#tab-description', 
      '.product-description', 
      '.description', 
      '#description', 
      '.xr-tab-content',
      '#tab-details',
      '.product-details',
      '.product-desc',
      '#prod-details',
      '.xr-product-desc-content'
    ];
    
    for (const sel of descSelectors) {
      const el = $(sel);
      if (el.length > 0) {
        descriptionHtml = el.html().trim();
        break;
      }
    }

    if (!descriptionHtml) {
      const mainContent = $('.entry-content, .post-content, #content, .xr-layout-main');
      if (mainContent.length > 0) {
        descriptionHtml = mainContent.html().trim();
      }
    }

    // Convert absolute image URLs inside descriptionHtml to make sure they render
    if (descriptionHtml) {
      descriptionHtml = descriptionHtml.replace(/src="\/(?=[^/])/g, `src="${BASE_URL}/`);
      descriptionHtml = descriptionHtml.replace(/src="upload\//g, `src="${BASE_URL}/upload/`);
    }

    // 2. Parse Specifications from elements
    let weight = null;
    let pkgLength = null;
    let pkgWidth = null;
    let pkgHeight = null;
    let sku = $('[itemprop="sku"]').attr('content') || '';
    let brand = 'KEYDIY';
    
    // Parse brand from texts
    $('tr, li, p, div').each((i, el) => {
      const text = $(el).text().trim().toLowerCase();
      if (text.includes('brand:')) {
        const match = $(el).text().match(/brand\s*:\s*(\w+)/i);
        if (match && match[1]) brand = match[1].trim();
      }
    });

    // Parse Weight from specific form-row label
    const weightLabel = $('.form-row').filter((i, el) => $(el).find('div').first().text().trim() === 'Weight:');
    if (weightLabel.length > 0) {
      const valText = weightLabel.find('.col').text().trim();
      const match = valText.match(/([\d.]+)\s*(KG|G|g|kg)/i);
      if (match) {
        let val = parseFloat(match[1]);
        let unit = match[2].toLowerCase();
        if (unit === 'kg') val = val * 1000;
        weight = Math.round(val);
      }
    }

    // Parse Package from specific form-row label
    const pkgLabel = $('.form-row').filter((i, el) => $(el).find('div').first().text().trim() === 'Package:');
    if (pkgLabel.length > 0) {
      const valText = pkgLabel.find('.col').text().trim();
      const match = valText.match(/([\d.]+)\s*\*?\s*([\d.]+)\s*\*?\s*([\d.]+)\s*(cm|mm)/i);
      if (match) {
        pkgLength = parseFloat(match[1]);
        pkgWidth = parseFloat(match[2]);
        pkgHeight = parseFloat(match[3]);
      }
    }

    // 3. Extract Feature Bullet Points
    const features = [];
    $('li').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 8 && text.length < 90 && features.length < 5) {
        const parent = $(el).closest('ul, ol');
        if (parent.length > 0 && (parent.closest('#tab-description, .product-description, .xr-tab-content').length > 0)) {
          features.push(text);
        }
      }
    });

    // Fallback features if list items empty
    if (features.length === 0 && descriptionHtml) {
      const cleanText = cheerio.load(descriptionHtml).text();
      const sentences = cleanText
        .split(/[.\n]+/)
        .map(s => s.trim().replace(/\s+/g, ' '))
        .filter(s => s.length > 15 && s.length < 90 && !s.includes('http') && !s.includes('Copyright'));
      features.push(...sentences.slice(0, 5));
    }

    // 3.5. Extract multiple product images (thumbnails)
    const detailImages = [];
    $('img.img-fluid.p-1').each((i, el) => {
      const src = $(el).attr('src');
      if (src && src.includes('/upload/pro-xs/')) {
        const highRes = src.replace('/pro-xs/', '/pro/');
        if (!detailImages.includes(highRes)) {
          detailImages.push(highRes);
        }
      }
    });

    return {
      descriptionHtml: descriptionHtml || null,
      sku: sku || null,
      brand: brand || 'KEYDIY',
      weight: weight || null,
      pkgLength: pkgLength || null,
      pkgWidth: pkgWidth || null,
      pkgHeight: pkgHeight || null,
      features: features.slice(0, 5),
      detailImages: detailImages
    };
  } catch (err) {
    console.error(`  Error scraping details for ${url}:`, err.message);
    return null;
  }
}

async function scrapeCategory(cat) {
  const url = `${BASE_URL}${cat.path}`;
  console.log(`Scraping category list: ${cat.name} (${url})`);
  
  try {
    const response = await axios.get(url, { headers, timeout: 15000 });
    const $ = cheerio.load(response.data);
    
    const products = [];
    const productItems = [];
    
    // Parse list of products on page
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.startsWith('/wholesale/') && href.endsWith('.html') && !href.includes('new_arrivals') && !href.includes('hot_products')) {
        const img = $(el).find('img').first();
        if (img.length > 0) {
          const title = $(el).attr('title') || img.attr('alt') || $(el).text().trim();
          const imgUrl = img.attr('src');
          
          if (title && imgUrl) {
            let priceText = '';
            let originalPriceText = '';
            
            const parent = $(el).closest('.border, .card, td, div');
            if (parent.length > 0) {
              const eurSpan = parent.find('[name="xrn-Curr-EUR"]').first();
              if (eurSpan.length > 0) {
                const throughSpan = parent.find('.xr-text-line-through').first();
                if (throughSpan.length > 0) {
                  originalPriceText = throughSpan.text().trim();
                }
                priceText = eurSpan.text().trim();
              } else {
                priceText = parent.text();
              }
            }
            
            productItems.push({
              title: title.replace(/\s+/g, ' ').trim(),
              detailUrl: href,
              imgUrl: imgUrl,
              priceText: priceText,
              originalPriceText: originalPriceText
            });
          }
        }
      }
    });
    
    // Deduplicate by URL
    const uniqueItems = [];
    const seenUrls = new Set();
    for (const item of productItems) {
      if (!seenUrls.has(item.detailUrl)) {
        seenUrls.add(item.detailUrl);
        uniqueItems.push(item);
      }
    }
    
    console.log(`Found ${uniqueItems.length} unique products. Deep scraping detail pages...`);
    
    for (const item of uniqueItems) {
      let price = 0;
      let originalPrice = null;
      
      const priceMatch = item.priceText.match(/€\s*([\d.]+)/);
      if (priceMatch) {
        price = parseFloat(priceMatch[1]);
      } else {
        const numMatch = item.priceText.replace(/&euro;|\u20AC/g, '').match(/([\d.]+)/);
        if (numMatch) price = parseFloat(numMatch[1]);
      }
      
      if (item.originalPriceText) {
        const origMatch = item.originalPriceText.match(/€\s*([\d.]+)/);
        if (origMatch) {
          originalPrice = parseFloat(origMatch[1]);
        }
      }
      
      // Download listing image
      let localImgPath = '/uploads/placeholder.jpg';
      if (item.imgUrl) {
        const imgExt = path.extname(item.imgUrl.split('?')[0]) || '.jpg';
        const imgFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}${imgExt}`;
        
        // Try high-resolution first
        const highResUrl = item.imgUrl.replace('/pro-sm/', '/pro/');
        const fullImgUrl = highResUrl.startsWith('http') ? highResUrl : `${BASE_URL}${highResUrl}`;
        let downloaded = await downloadImage(fullImgUrl, imgFilename);
        
        if (!downloaded) {
          // Try medium-resolution second
          const medResUrl = item.imgUrl.replace('/pro-sm/', '/pro-md/');
          const fullMedUrl = medResUrl.startsWith('http') ? medResUrl : `${BASE_URL}${medResUrl}`;
          downloaded = await downloadImage(fullMedUrl, imgFilename);
        }
        
        if (!downloaded) {
          // Try original thumbnail third
          const fullSmUrl = item.imgUrl.startsWith('http') ? item.imgUrl : `${BASE_URL}${item.imgUrl}`;
          downloaded = await downloadImage(fullSmUrl, imgFilename);
        }
        
        if (downloaded) {
          localImgPath = downloaded;
        }
      }
      
      // Fetch details
      const details = await scrapeProductDetails(item.detailUrl);
      
      // Throttle details loading
      await new Promise(r => setTimeout(r, 400));

      // Download all detail page images
      const localImages = [localImgPath]; // Always include primary image first
      if (details && details.detailImages && details.detailImages.length > 0) {
        for (const remoteImgUrl of details.detailImages) {
          // Avoid downloading primary image twice if it has the same URL filename
          const remoteFilename = path.basename(remoteImgUrl.split('?')[0]);
          const primaryFilename = path.basename(item.imgUrl.split('?')[0]);
          
          if (remoteFilename === primaryFilename) {
            continue;
          }

          const imgExt = path.extname(remoteImgUrl.split('?')[0]) || '.jpg';
          const imgFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}${imgExt}`;
          const fullImgUrl = remoteImgUrl.startsWith('http') ? remoteImgUrl : `${BASE_URL}${remoteImgUrl}`;

          // Try downloading high-res
          let downloaded = await downloadImage(fullImgUrl, imgFilename);
          
          if (!downloaded) {
            // Try medium-res fallback
            const medResUrl = remoteImgUrl.replace('/pro/', '/pro-md/');
            const fullMedUrl = medResUrl.startsWith('http') ? medResUrl : `${BASE_URL}${medResUrl}`;
            downloaded = await downloadImage(fullMedUrl, imgFilename);
          }

          if (downloaded) {
            localImages.push(downloaded);
          }
        }
      }
      
      products.push({
        id: 'kd-' + Math.random().toString(36).substring(2, 9),
        title: item.title,
        description: details?.descriptionHtml || `High quality KeyDIY ${cat.name} product. ${item.title}. Compatible with various models.`,
        price: price || 0,
        originalPrice: originalPrice,
        imageUrl: localImgPath,
        images: localImages,
        category: cat.name,
        created_at: new Date().toISOString(),
        sku: details?.sku || 'KD-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        brand: details?.brand || 'KEYDIY',
        weight: details?.weight || 150, // default grams
        pkgLength: details?.pkgLength || 10,
        pkgWidth: details?.pkgWidth || 5,
        pkgHeight: details?.pkgHeight || 3,
        feature1: details?.features?.[0] || 'Original KeyDIY high-grade product',
        feature2: details?.features?.[1] || 'Highly compatible with OBD key clone and programmers',
        feature3: details?.features?.[2] || 'Top grade security remote frequency signal transmission',
        feature4: details?.features?.[3] || 'Tested extensively for structural and button durability',
        feature5: details?.features?.[4] || 'Direct warehouse shipping and quality assurance guarantee'
      });
    }
    
    return products;
  } catch (err) {
    console.error(`Error scraping category ${cat.name}:`, err.message);
    return [];
  }
}

async function run() {
  console.log('Starting Scraper containing deep detail pages parsing...');
  let allProducts = [];
  
  for (const cat of CATEGORIES) {
    const products = await scrapeCategory(cat);
    allProducts = allProducts.concat(products);
    await new Promise(r => setTimeout(r, 800));
  }
  
  console.log(`Deep scraping complete. Total products gathered: ${allProducts.length}`);
  
  if (allProducts.length === 0) {
    console.log('No online products found, compiling default database...');
    allProducts = getMockProducts();
  }
  
  const dbData = {
    products: allProducts,
    categories: CATEGORIES.map(c => c.name)
  };
  
  // Preserve members and orders if they exist in the current database
  const dbFile = path.join(__dirname, 'db.json');
  if (fs.existsSync(dbFile)) {
    try {
      const existingDb = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
      if (existingDb.members) dbData.members = existingDb.members;
      if (existingDb.orders) dbData.orders = existingDb.orders;
    } catch (e) {
      console.error('Failed to parse existing database to merge data:', e.message);
    }
  }
  
  fs.writeFileSync(dbFile, JSON.stringify(dbData, null, 2));
  console.log('Database initialized in db.json with deep specifications, bullet features, and HTML descriptions!');
}

function getMockProducts() {
  return [
    {
      id: 'kd-zb66',
      title: 'KEYDIY KD ZB66 Universal Smart Remote Key 3 Buttons',
      description: 'High quality KeyDIY Universal Smart Remote Key with 3 Buttons. Compatible with KD-X4 and KD-MAX program tools.',
      price: 22.00,
      originalPrice: null,
      imageUrl: '/uploads/placeholder.jpg',
      category: 'ZB Smart Remote',
      created_at: new Date().toISOString(),
      sku: 'ZB66-3',
      brand: 'KEYDIY',
      weight: 150,
      pkgLength: 12,
      pkgWidth: 6,
      pkgHeight: 4,
      feature1: 'High grade ABS plastic casing with metallic borders',
      feature2: 'Supports hundreds of smart key generation procedures',
      feature3: 'Low battery consumption and reliable range',
      feature4: 'Includes key blade slot and matching key rings',
      feature5: 'Guaranteed 100% factory original validation'
    }
  ];
}

run();
