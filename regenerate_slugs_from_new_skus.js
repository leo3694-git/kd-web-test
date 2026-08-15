const fs = require('fs');

const dbPath = './db.json';
if (!fs.existsSync(dbPath)) {
  console.error('db.json not found!');
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

function generateProductSlug(product) {
  const brand = (product.brand || 'keydiy').toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Find button count in title or description
  let buttons = '';
  const btnMatch = product.title.match(/(\d+)\s*(?:buttons?|btn|keys?)/i) ||
                   (product.description || '').match(/(\d+)\s*(?:buttons?|btn|keys?)/i);
  if (btnMatch) {
    buttons = `-${btnMatch[1]}-button`;
  } else {
    // If no button specified, check for accessories or watches
    if (product.title.toLowerCase().includes('watch')) {
      buttons = '-watch';
    } else if (product.title.toLowerCase().includes('cable') || product.title.toLowerCase().includes('adapter')) {
      buttons = '-accessory';
    } else {
      buttons = '-remote';
    }
  }
  
  // Clean new simplified SKU (which is now B08-4, ZB15-3, BDC2, etc.)
  let cleanSku = (product.sku || '').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!cleanSku) {
    cleanSku = 'item-' + Math.random().toString(36).substring(2, 6);
  }
  
  return `${cleanSku}${buttons}-${brand}`.toLowerCase();
}

console.log('--- Regenerating Slugs From New SKU Short Names ---');
db.products.forEach(p => {
  const oldSlug = p.slug;
  const newSlug = generateProductSlug(p);
  p.slug = newSlug;
  console.log(`Title: ${p.title.substring(0, 45)}... \n -> SKU: ${p.sku} \n -> Old URL: /wholesale/${oldSlug}.html \n -> New URL: /wholesale/${newSlug}.html\n`);
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log('Regenerated slugs from new short name SKUs in db.json successfully!');
