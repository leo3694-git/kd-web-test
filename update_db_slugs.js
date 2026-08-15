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
  
  // Clean SKU
  let cleanSku = (product.sku || '').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!cleanSku) {
    cleanSku = 'item-' + Math.random().toString(36).substring(2, 6);
  }
  
  return `${cleanSku}${buttons}-${brand}`.toLowerCase();
}

console.log('--- Generating Slugs for All Products ---');
db.products.forEach(p => {
  p.slug = generateProductSlug(p);
  console.log(`Title: ${p.title.substring(0, 40)}... \n -> SKU: ${p.sku} \n -> Slug: ${p.slug}.html\n`);
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log('Updated db.json with slugs successfully!');
