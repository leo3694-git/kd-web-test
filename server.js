const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// Admin credentials must be supplied through environment variables.
// Keep these values out of source control; see .env.example.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin_password';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'kd_admin_secret_token_2026';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Product details page (SEO friendly routing)
app.get('/wholesale/:slug.html', (req, res) => {
  const db = readDB();
  const slug = req.params.slug;
  const product = db.products.find(p => p.slug === slug);
  if (!product) {
    return res.status(404).send('Product not found');
  }

  // Load the product details template HTML file
  const templatePath = path.join(__dirname, 'public', 'product.html');
  if (!fs.existsSync(templatePath)) {
    return res.status(500).send('Product template file not found');
  }

  let html = fs.readFileSync(templatePath, 'utf8');

  // Strip HTML tags for the meta description tag
  const plainDesc = (product.description || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 155);

  const keywords = `keydiy, remote key, ${product.brand}, ${product.sku}, ${product.category}`;

  // Serve locked price text to crawler / guest
  const basePriceText = `$${product.price.toFixed(2)} USD`;
  const priceDisplay = product.memberOnly 
    ? `<span class="member-only-locked-price"><i class="fa-solid fa-lock"></i> Sign In to View Price</span>`
    : `<span class="price-current">${basePriceText}</span>`;

  // Map features list items
  const featuresHtml = [
    product.feature1,
    product.feature2,
    product.feature3,
    product.feature4,
    product.feature5
  ].filter(f => f && f.trim() !== '')
   .map(f => `<li><i class="fa-solid fa-circle-check text-primary"></i> <span>${f}</span></li>`)
   .join('\n');

  // Generate thumbnails list HTML
  const productImages = product.images && product.images.length > 0 ? product.images : [product.imageUrl];
  const thumbsHtml = productImages.map((img, i) => {
    return `<img class="thumb-item${i === 0 ? ' active' : ''}" src="${img}" alt="Thumbnail ${i+1}" onclick="changeMainImage('${img}', this)" onerror="this.src='/uploads/placeholder.jpg'">`;
  }).join('\n');

  // Perform server-side dynamic replacements (for SEO)
  html = html
    .replace(/{{META_TITLE}}/g, `${product.title} | keydiyshop`)
    .replace(/{{META_DESCRIPTION}}/g, plainDesc || `Get original ${product.title} from keydiyshop. Premium quality car key.`)
    .replace(/{{META_KEYWORDS}}/g, keywords)
    .replace(/{{PRODUCT_TITLE}}/g, product.title)
    .replace(/{{PRODUCT_IMAGE}}/g, product.imageUrl)
    .replace(/{{PRODUCT_THUMBNAILS}}/g, thumbsHtml)
    .replace(/{{PRODUCT_SKU}}/g, product.sku || '')
    .replace(/{{PRODUCT_BRAND}}/g, product.brand || 'KEYDIY')
    .replace(/{{PRODUCT_CATEGORY}}/g, product.category || '')
    .replace(/{{PRODUCT_WEIGHT}}/g, product.weight ? `${(product.weight / 1000).toFixed(2)}KG ( ${(product.weight / 1000 * 2.2).toFixed(2)}LB )` : 'N/A')
    .replace(/{{PRODUCT_PKG_SIZE}}/g, product.pkgLength ? `${product.pkgLength}cm*${product.pkgWidth}cm*${product.pkgHeight}cm` : 'N/A')
    .replace(/{{PRODUCT_FEATURES}}/g, featuresHtml)
    .replace(/{{PRODUCT_PRICE_HTML}}/g, priceDisplay)
    .replace(/{{PRODUCT_DESCRIPTION}}/g, product.description || '')
    .replace(/{{PRODUCT_ID}}/g, product.id)
    .replace(/{{PRODUCT_RAW_PRICE}}/g, product.price)
    .replace(/{{PRODUCT_MEMBER_ONLY}}/g, product.memberOnly ? 'true' : 'false')
    .replace(/{{PRODUCT_ORIGINAL_PRICE_HTML}}/g, product.originalPrice ? `<span class="price-original">$${product.originalPrice.toFixed(2)}</span>` : '');

  res.send(html);
});

// Configure Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Helper functions to read/write DB
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    return { products: [], categories: [], members: [], reviews: [], orders: [] };
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const db = JSON.parse(data);
    db.members = db.members || [];
    db.reviews = db.reviews || [];
    db.orders = db.orders || [];
    return db;
  } catch (e) {
    console.error('Error reading DB:', e);
    return { products: [], categories: [], members: [], reviews: [], orders: [] };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing to db.json:', err.message);
    return false;
  }
}

// Auth Middleware
function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader === `Bearer ${ADMIN_TOKEN}`) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized. Admin access required.' });
  }
}

// Authentication API
app.post('/api/login', (req, res) => {
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !ADMIN_TOKEN) {
    return res.status(503).json({ success: false, error: 'Admin authentication is not configured.' });
  }
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    res.json({ success: true, token: ADMIN_TOKEN });
  } else {
    res.status(401).json({ success: false, error: 'Invalid username or password' });
  }
});

app.get('/api/auth/check', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader === `Bearer ${ADMIN_TOKEN}`) {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

// Categories API
app.get('/api/categories', (req, res) => {
  const db = readDB();
  res.json(db.categories || []);
});

app.post('/api/categories', requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Category name is required' });
  }
  
  const db = readDB();
  db.categories = db.categories || [];
  
  if (db.categories.includes(name.trim())) {
    return res.status(400).json({ error: 'Category already exists' });
  }
  
  db.categories.push(name.trim());
  writeDB(db);
  res.status(201).json({ success: true, categories: db.categories });
});

app.delete('/api/categories', requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }
  
  const db = readDB();
  db.categories = db.categories || [];
  
  db.categories = db.categories.filter(c => c !== name);
  
  // Update products under this category to "Uncategorized" or delete their category field
  db.products = db.products.map(p => {
    if (p.category === name) {
      return { ...p, category: 'Uncategorized' };
    }
    return p;
  });
  
  writeDB(db);
  res.json({ success: true, categories: db.categories });
});

// Products API
app.get('/api/products', (req, res) => {
  const db = readDB();
  let list = db.products || [];
  
  // Search filter
  const q = req.query.q;
  if (q) {
    const query = q.toLowerCase();
    list = list.filter(p => 
      p.title.toLowerCase().includes(query) || 
      (p.description && p.description.toLowerCase().includes(query)) ||
      (p.sku && p.sku.toLowerCase().includes(query)) ||
      (p.internalCode && p.internalCode.toLowerCase().includes(query)) ||
      (p.brand && p.brand.toLowerCase().includes(query))
    );
  }
  
  // Category filter
  const category = req.query.category;
  if (category) {
    list = list.filter(p => p.category === category);
  }
  
  res.json(list);
});

app.get('/api/products/:id', (req, res) => {
  const db = readDB();
  const product = db.products.find(p => p.id === req.params.id);
  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ error: 'Product not found' });
  }
});

app.post('/api/products', requireAdmin, (req, res) => {
  const body = req.body;
  if (!body.title || !body.price) {
    return res.status(400).json({ error: 'Title and price are required' });
  }
  
  const db = readDB();
  
  // Verify SKU uniqueness
  if (body.sku) {
    const skuExists = db.products.some(p => p.sku === body.sku);
    if (skuExists) {
      return res.status(400).json({ error: `SKU '${body.sku}' is already in use by another product.` });
    }
  }

  const newProduct = {
    ...body,
    id: 'kd-' + Math.random().toString(36).substring(2, 9),
    price: parseFloat(body.price) || 0,
    originalPrice: body.originalPrice ? parseFloat(body.originalPrice) : null,
    imageUrl: body.imageUrl || '/uploads/placeholder.jpg',
    category: body.category || 'Uncategorized',
    created_at: new Date().toISOString()
  };
  
  db.products.push(newProduct);
  writeDB(db);
  
  res.status(201).json(newProduct);
});

app.put('/api/products/:id', requireAdmin, (req, res) => {
  const db = readDB();
  const index = db.products.findIndex(p => p.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  const body = req.body;
  if (!body.title || !body.price) {
    return res.status(400).json({ error: 'Title and price are required' });
  }
  
  // Verify SKU uniqueness (excluding current product)
  if (body.sku) {
    const skuExists = db.products.some(p => p.sku === body.sku && p.id !== req.params.id);
    if (skuExists) {
      return res.status(400).json({ error: `SKU '${body.sku}' is already in use by another product.` });
    }
  }
  
  const updatedProduct = {
    ...db.products[index],
    ...body,
    price: parseFloat(body.price) || 0,
    originalPrice: body.originalPrice ? parseFloat(body.originalPrice) : null,
    category: body.category || 'Uncategorized',
    updated_at: new Date().toISOString()
  };
  
  db.products[index] = updatedProduct;
  writeDB(db);
  
  res.json(updatedProduct);
});

app.delete('/api/products/:id', requireAdmin, (req, res) => {
  const db = readDB();
  const index = db.products.findIndex(p => p.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  // Optionally delete the local image file if it's not the default placeholder
  const product = db.products[index];
  if (product.imageUrl && product.imageUrl.startsWith('/uploads/') && product.imageUrl !== '/uploads/placeholder.jpg') {
    const imagePath = path.join(__dirname, 'public', product.imageUrl);
    if (fs.existsSync(imagePath)) {
      try {
        fs.unlinkSync(imagePath);
      } catch (err) {
        console.error('Error deleting product image file:', err.message);
      }
    }
  }
  
  db.products.splice(index, 1);
  writeDB(db);
  res.json({ success: true, message: 'Product deleted' });
});

// Image upload API
app.post('/api/upload', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }
  res.json({ imageUrl: `/uploads/${req.file.filename}` });
});

// Member registration API
app.post('/api/member/register', (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    return res.status(400).json({ error: 'Username, password and email are required' });
  }

  const db = readDB();
  const exists = db.members.some(m => m.username.toLowerCase() === username.toLowerCase() || m.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'Username or Email already registered' });
  }

  const newMember = {
    id: 'm-' + Math.random().toString(36).substring(2, 9),
    username,
    password, // store as plain text for easy setup/demo
    email,
    created_at: new Date().toISOString()
  };

  db.members.push(newMember);
  writeDB(db);

  res.status(201).json({ success: true, message: 'Registration successful' });
});

// Member login API
app.post('/api/member/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const db = readDB();
  const member = db.members.find(m => m.username.toLowerCase() === username.toLowerCase() && m.password === password);
  if (member) {
    res.json({ success: true, token: 'member_token_' + member.id, username: member.username });
  } else {
    res.status(401).json({ error: 'Invalid username or password' });
  }
});

// ===== SEO Automation: Sitemap.xml & Robots.txt =====
app.get('/sitemap.xml', (req, res) => {
  const host = req.protocol + '://' + req.get('host');
  const db = readDB();
  const now = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  xml += `  <url><loc>${host}/</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>\n`;

  (db.products || []).forEach(p => {
    if (p.slug) {
      xml += `  <url><loc>${host}/wholesale/${p.slug}.html</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
    }
  });

  xml += `</urlset>`;
  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

app.get('/robots.txt', (req, res) => {
  const host = req.protocol + '://' + req.get('host');
  const content = `User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /api/\n\nSitemap: ${host}/sitemap.xml\n`;
  res.header('Content-Type', 'text/plain');
  res.send(content);
});

// ===== Reviews API =====
app.get('/api/reviews', (req, res) => {
  const { productId } = req.query;
  const db = readDB();
  let reviews = db.reviews || [];
  if (productId) {
    reviews = reviews.filter(r => r.productId === productId && (r.status === 'approved' || !r.status));
  }
  res.json(reviews);
});

app.post('/api/reviews', (req, res) => {
  const { productId, authorName, authorEmail, rating, title, comment } = req.body;
  if (!productId || !authorName || !rating || !comment) {
    return res.status(400).json({ error: 'Missing required review fields' });
  }

  const db = readDB();
  const newReview = {
    id: 'rev-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    productId,
    authorName,
    authorEmail: authorEmail || '',
    rating: parseInt(rating) || 5,
    title: title || '',
    comment,
    status: 'approved',
    created_at: new Date().toISOString()
  };

  db.reviews = db.reviews || [];
  db.reviews.unshift(newReview);
  writeDB(db);

  res.status(201).json({ success: true, review: newReview });
});

app.get('/api/admin/reviews', (req, res) => {
  const db = readDB();
  res.json(db.reviews || []);
});

app.delete('/api/admin/reviews/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.reviews = (db.reviews || []).filter(r => r.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// ===== Orders API =====
app.post('/api/orders', (req, res) => {
  const { customerName, customerEmail, customerPhone, shippingAddress, items, totalPrice, shippingCost, shippingZone } = req.body;
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Order items are required' });
  }

  const db = readDB();
  const orderId = 'ORD-' + Date.now().toString().slice(-6) + Math.random().toString(36).substring(2, 5).toUpperCase();
  
  const newOrder = {
    id: orderId,
    customerName: customerName || 'Guest Buyer',
    customerEmail: customerEmail || '',
    customerPhone: customerPhone || '',
    shippingAddress: shippingAddress || '',
    shippingZone: shippingZone || 'Zone A',
    shippingCost: parseFloat(shippingCost) || 0,
    items,
    totalPrice: parseFloat(totalPrice) || 0,
    status: 'paid',
    shippingStatus: 'processing',
    created_at: new Date().toISOString()
  };

  db.orders = db.orders || [];
  db.orders.unshift(newOrder);
  writeDB(db);

  res.status(201).json({ success: true, order: newOrder });
});

app.get('/api/admin/orders', (req, res) => {
  const db = readDB();
  res.json(db.orders || []);
});

app.put('/api/admin/orders/:id', (req, res) => {
  const { id } = req.params;
  const { status, shippingStatus, trackingNumber } = req.body;
  const db = readDB();
  const order = (db.orders || []).find(o => o.id === id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  if (status) order.status = status;
  if (shippingStatus) order.shippingStatus = shippingStatus;
  if (trackingNumber) order.trackingNumber = trackingNumber;

  writeDB(db);
  res.json({ success: true, order });
});

// ===== Analytics Dashboard API =====
app.get('/api/admin/analytics', (req, res) => {
  const db = readDB();
  const products = db.products || [];
  const orders = db.orders || [];
  const members = db.members || [];
  const reviews = db.reviews || [];

  const totalSales = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  const totalOrders = orders.length;
  const totalProducts = products.length;
  const totalMembers = members.length;
  const totalReviews = reviews.length;

  const categoryCounts = {};
  products.forEach(p => {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
  });

  res.json({
    totalSales,
    totalOrders,
    totalProducts,
    totalMembers,
    totalReviews,
    categoryCounts,
    recentOrders: orders.slice(0, 5)
  });
});

// ===== CSV Export APIs =====
app.get('/api/export/products.csv', (req, res) => {
  const db = readDB();
  const products = db.products || [];

  let csv = '\uFEFFSKU,Title,Category,Price ($),Stock,Brand,Slug\n';
  products.forEach(p => {
    const title = `"${(p.title || '').replace(/"/g, '""')}"`;
    const cat = `"${(p.category || '').replace(/"/g, '""')}"`;
    csv += `${p.sku || ''},${title},${cat},${p.price || 0},${p.stockStatus !== false ? 'In Stock' : 'Out of Stock'},${p.brand || 'KEYDIY'},${p.slug || ''}\n`;
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=keydiyshop_products.csv');
  res.status(200).send(csv);
});

app.get('/api/export/orders.csv', (req, res) => {
  const db = readDB();
  const orders = db.orders || [];

  let csv = '\uFEFFOrder ID,Date,Customer Name,Customer Email,Customer Phone,Total ($),Shipping ($),Status,Shipping Status,Items\n';
  orders.forEach(o => {
    const name = `"${(o.customerName || '').replace(/"/g, '""')}"`;
    const email = `"${(o.customerEmail || '').replace(/"/g, '""')}"`;
    const phone = `"${(o.customerPhone || '').replace(/"/g, '""')}"`;
    const itemsStr = `"${(o.items || []).map(i => `${i.title || i.id} x${i.quantity || 1}`).join('; ').replace(/"/g, '""')}"`;
    csv += `${o.id || ''},${(o.created_at || '').split('T')[0]},${name},${email},${phone},${o.totalPrice || 0},${o.shippingCost || 0},${o.status || 'paid'},${o.shippingStatus || 'processing'},${itemsStr}\n`;
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=keydiyshop_orders.csv');
  res.status(200).send(csv);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
