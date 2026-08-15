const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db.json');

if (!fs.existsSync(DB_FILE)) {
  console.error('db.json not found!');
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const products = db.products || [];

const USD_CNY_RATE = 7.20; // Using 7.2 as standard exchange rate
const priceB = parseFloat((36 / USD_CNY_RATE).toFixed(2)); // 5.00 USD
const priceNB = parseFloat((56 / USD_CNY_RATE).toFixed(2)); // 7.78 USD

console.log(`USD/CNY Rate: ${USD_CNY_RATE}`);
console.log(`B Series target price (RMB 36): $${priceB}`);
console.log(`NB Series target price (RMB 56): $${priceNB}`);

let updatedB = 0;
let updatedNB = 0;
let updatedOthers = 0;

const updatedProducts = products.map(p => {
  const category = p.category || '';
  const title = p.title || '';
  
  // Check if B Series
  const isB = category === 'B General Remote' || 
              title.includes(' B ') || 
              title.startsWith('B ') || 
              title.includes('KD B') ||
              title.match(/\bB\d+\b/); // e.g. B19, B13

  // Check if NB Series
  const isNB = category === 'NB Electronic Remote' || 
               title.includes(' NB ') || 
               title.startsWith('NB ') || 
               title.includes('KD NB') ||
               title.match(/\bNB\d+\b/); // e.g. NB11, NB33

  if (isB) {
    p.price = priceB;
    p.originalPrice = parseFloat((priceB * 1.2).toFixed(2)); // Set a mock original price
    p.brand = 'KeyDIY';
    updatedB++;
  } else if (isNB) {
    p.price = priceNB;
    p.originalPrice = parseFloat((priceNB * 1.25).toFixed(2));
    p.brand = 'KeyDIY';
    updatedNB++;
  } else {
    // If other products have a price of 0 or are empty, let's assign realistic USD prices based on category
    if (p.price === 0 || !p.price) {
      if (category.includes('Programmers')) {
        // e.g. KD-MAX, KD-X4
        if (title.includes('X4')) {
          p.price = 613.00;
          p.originalPrice = 699.00;
        } else if (title.includes('MAX')) {
          p.price = 269.00;
          p.originalPrice = 299.00;
        } else if (title.includes('MATE')) {
          p.price = 65.00;
          p.originalPrice = 79.00;
        } else {
          p.price = 120.00;
          p.originalPrice = 149.00;
        }
      } else if (category.includes('ZB Smart')) {
        p.price = 22.00;
        p.originalPrice = 28.00;
      } else if (category.includes('TB Smart')) {
        p.price = 28.00;
        p.originalPrice = 35.00;
      } else if (category.includes('TDB Smart')) {
        p.price = 32.00;
        p.originalPrice = 39.00;
      } else if (category.includes('MLB')) {
        p.price = 68.00;
        p.originalPrice = 85.00;
      } else if (category.includes('Phone As Key')) {
        p.price = 45.00;
        p.originalPrice = 55.00;
      } else if (category.includes('ACCESSORIES')) {
        if (title.includes('Watch')) {
          p.price = 89.00;
          p.originalPrice = 109.00;
        } else if (title.includes('Cable')) {
          p.price = 15.00;
          p.originalPrice = 19.00;
        } else if (title.includes('Chip')) {
          p.price = 25.00;
          p.originalPrice = 30.00;
        } else {
          p.price = 35.00;
          p.originalPrice = 45.00;
        }
      } else if (category.includes('License')) {
        p.price = 150.00;
        p.originalPrice = 199.00;
      } else {
        p.price = 19.99;
      }
      updatedOthers++;
    }
  }

  // Ensure brand is filled
  if (!p.brand) {
    if (title.includes('Xhorse')) {
      p.brand = 'Xhorse';
    } else if (title.includes('Autel')) {
      p.brand = 'Autel';
    } else {
      p.brand = 'KeyDIY';
    }
  }
  
  return p;
});

db.products = updatedProducts;
fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');

console.log(`Update complete!`);
console.log(`- B Series Products updated: ${updatedB}`);
console.log(`- NB Series Products updated: ${updatedNB}`);
console.log(`- Other products assigned pricing: ${updatedOthers}`);
