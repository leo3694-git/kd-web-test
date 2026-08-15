const fs = require('fs');

const dbPath = './db.json';
if (!fs.existsSync(dbPath)) {
  console.error('db.json not found!');
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

function extractShortName(product) {
  const title = product.title.trim();
  const upperTitle = title.toUpperCase();
  
  // 0. Check partial title overrides first
  if (upperTitle.includes('FORD OBD FUNCTION EXTENSION')) return 'SF433';
  if (upperTitle.includes('JAGUAR LAND ROVER KVM')) return 'SO819';
  if (upperTitle.includes('LI AUTO GATEWAY')) return 'SF438';

  // 1. If it's a programmer item, match starting name specifically
  if (product.category === 'KEYDIY KD-Programmers') {
    if (upperTitle.startsWith('KEYDIY KD-MAX') || upperTitle.startsWith('KEYDIY KD MAX')) return 'KD-MAX';
    if (upperTitle.startsWith('KEYDIY KD-MATE') || upperTitle.startsWith('KEYDIY KD MATE')) return 'KD-MATE';
    if (upperTitle.startsWith('KEYDIY KD-X4') || upperTitle.startsWith('KEYDIY KD X4') || upperTitle.startsWith('[COMBO KIT] KEYDIY KD-X4')) return 'KD-X4';
    if (upperTitle.startsWith('KEYDIY KD-X2') || upperTitle.startsWith('KEYDIY KD X2') || upperTitle.startsWith('[COMBO KIT] KEYDIY KD-X2')) return 'KD-X2';
    if (upperTitle.startsWith('KEYDIY KD-MP') || upperTitle.startsWith('KEYDIY KD MP') || upperTitle.startsWith('KEYDIY KDMP')) return 'KD-MP';
    if (upperTitle.startsWith('KEYDIY KD-MINI') || upperTitle.startsWith('KEYDIY KD MINI') || upperTitle.startsWith('KEYDIY MINI')) return 'KD-MINI';
    if (upperTitle.includes('COMBO') || (upperTitle.includes('KD-MAX') && upperTitle.includes('KD-MATE'))) return 'KD-MAX+KD-MATE';
  }

  // 2. Check for standard remote/key codes (e.g. B08-4, NB11-3, ZB15-3, TB36-3, TDB01-3, ZB66, MLB26, MLB08, MLB19, FGB25-5, DZ-ZB15-4, ZB71-4)
  const remotePattern = /\b(TDB\d+-\d+|TB\d+-\d+|ZB\d+-\d+|NB\d+-\d+|B\d+-\d+|B\d+|MLB\d+|PAK\d+|FGB\d+-\d+|FGB\d+|DZ-ZB\d+-\d+|DZ-ZB\d+|ZB\d+|NB\d+|PAK\d+|SK\d+|SF\d+|SO\d+)\b/i;
  const match = title.match(remotePattern);
  if (match) {
    return match[1].toUpperCase();
  }
  
  // 3. Fallback for chips, adapters, tokens
  const otherKeywords = /\b(D\d+|DB\d+|BDC\d+|CEM|BCM\d+|ID\d+|NCF\d+|LI AUTO|YAMAHA|VOLVO)\b/i;
  const otherMatch = title.match(otherKeywords);
  if (otherMatch) {
    return otherMatch[1].toUpperCase();
  }

  // 4. Default fallback: Clean original SKU code
  let clean = product.sku.replace(/-5PCS|-10PCS|-5PC|-10PC|-F/gi, '').trim();
  if (clean.startsWith('HK')) clean = clean.substring(2);
  
  return clean || product.sku;
}

console.log('--- Extracting and Updating SKUs with Final Refined Priority Rules ---');
let updatedCount = 0;

db.products.forEach(p => {
  let shortName = extractShortName(p);
  shortName = shortName.toUpperCase().replace(/\s+/g, '-');
  
  console.log(`Title: ${p.title.substring(0, 50)}... \n -> New SKU: ${shortName}\n`);
  
  p.sku = shortName;
  updatedCount++;
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log(`Successfully updated ${updatedCount} products in db.json!`);
