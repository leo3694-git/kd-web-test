// State management
let state = {
  products: [],
  categories: [],
  selectedCategory: 'all',
  searchQuery: '',
  sortBy: 'default',
  currency: 'USD', // USD is default base currency
  exchangeRates: {
    USD: 1.0,
    EUR: 0.92,
    GBP: 0.78
  },
  currencySymbols: {
    USD: '$',
    EUR: '€',
    GBP: '£'
  },
  cart: JSON.parse(localStorage.getItem('keydiy_cart')) || [],
  member: JSON.parse(localStorage.getItem('keydiy_member_session')) || null // { username, token }
};

// DOM Elements
const productsGrid = document.getElementById('products-grid');
const categoryList = document.getElementById('category-list');
const displayedCount = document.getElementById('displayed-products-count');
const loadingSpinner = document.getElementById('loading-spinner');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const searchClearBtn = document.getElementById('search-clear-btn');
const sortSelect = document.getElementById('sort-select');
const currSelectorBtn = document.getElementById('curr-selector-btn');
const currCodeText = document.getElementById('curr-code');
const currDropdown = document.getElementById('curr-dropdown');
const resetFiltersBtn = document.getElementById('reset-filters-btn');

// Cart DOM Elements
const headerCartBtn = document.getElementById('header-cart-btn');
const cartCountBadge = document.getElementById('cart-count-badge');
const cartDrawer = document.getElementById('cart-drawer');
const cartCloseBtn = document.getElementById('cart-close-btn');
const cartDrawerOverlay = document.getElementById('cart-drawer-overlay');
const cartItemsContainer = document.getElementById('cart-items-container');
const cartSubtotalAmount = document.getElementById('cart-subtotal-amount');
const cartCheckoutBtn = document.getElementById('cart-checkout-btn');
const cartShippingZone = document.getElementById('cart-shipping-zone');
if (cartShippingZone) cartShippingZone.addEventListener('change', () => renderCartItems());

// Member Auth DOM Elements
const memberAuthSection = document.getElementById('member-auth-section');
const memberInfoSection = document.getElementById('member-info-section');
const memberWelcomeMsg = document.getElementById('member-welcome-msg');
const memberSigninBtn = document.getElementById('member-signin-btn');
const memberLogoutBtn = document.getElementById('member-logout-btn');

const memberAuthModal = document.getElementById('member-auth-modal');
const memberAuthOverlay = document.getElementById('member-auth-overlay');
const memberAuthCloseBtn = document.getElementById('member-auth-close-btn');
const memberLoginPanel = document.getElementById('member-login-panel');
const memberRegisterPanel = document.getElementById('member-register-panel');
const memberLoginForm = document.getElementById('member-login-form');
const memberRegisterForm = document.getElementById('member-register-form');
const memberLoginError = document.getElementById('member-login-error');
const memberRegisterError = document.getElementById('member-register-error');
const goToRegisterLink = document.getElementById('go-to-register');
const goToLoginLink = document.getElementById('go-to-login');

// Sidebar Drawer DOM Elements
const sidebarEl = document.getElementById('sidebar');
const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
const sidebarOverlay = document.getElementById('sidebar-overlay');

function openSidebar() {
  sidebarEl.classList.add('open');
  sidebarOverlay.classList.add('active');
  sidebarToggleBtn.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  sidebarEl.classList.remove('open');
  sidebarOverlay.classList.remove('active');
  sidebarToggleBtn.classList.remove('open');
  document.body.style.overflow = '';
}

if (sidebarToggleBtn) sidebarToggleBtn.addEventListener('click', () => {
  sidebarEl.classList.contains('open') ? closeSidebar() : openSidebar();
});
if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

// Modal Elements
const productModal = document.getElementById('product-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalDetailContent = document.getElementById('modal-product-detail');

// Contact details
const SUPPORT_WHATSAPP_LINK = "https://api.whatsapp.com/send?phone=886979056575";

// Initialize Store
async function initStore() {
  showLoading(true);
  try {
    updateMemberUI();
    updateCartUI();
    await Promise.all([
      fetchCategories(),
      fetchProducts()
    ]);
    
    // Parse URL Search Parameters (SEO back navigation support)
    const urlParams = new URLSearchParams(window.location.search);
    const queryParam = urlParams.get('q');
    if (queryParam) {
      state.searchQuery = queryParam;
      if (searchInput) {
        searchInput.value = queryParam;
        searchClearBtn.classList.remove('d-none');
      }
    }

    renderCategories();
    renderProducts();
  } catch (err) {
    console.error('Initialization error:', err);
    productsGrid.innerHTML = `<div class="error-message">Failed to load catalog data. Please try again later.</div>`;
  } finally {
    showLoading(false);
  }
}

// Fetch APIs
async function fetchCategories() {
  const response = await fetch('/api/categories');
  if (!response.ok) throw new Error('Failed to fetch categories');
  state.categories = await response.json();
}

async function fetchProducts() {
  const response = await fetch('/api/products');
  if (!response.ok) throw new Error('Failed to fetch products');
  state.products = await response.json();
}

// Loading utility
function showLoading(show) {
  if (show) {
    loadingSpinner.classList.remove('d-none');
    productsGrid.classList.add('d-none');
  } else {
    loadingSpinner.classList.add('d-none');
    productsGrid.classList.remove('d-none');
  }
}

// Render Categories in Sidebar
function renderCategories() {
  const allItem = categoryList.querySelector('[data-category="all"]');
  categoryList.innerHTML = '';
  categoryList.appendChild(allItem);

  const counts = { all: state.products.length };
  state.categories.forEach(cat => {
    counts[cat] = state.products.filter(p => p.category === cat).length;
  });

  document.getElementById('count-all').textContent = counts.all;

  state.categories.forEach(cat => {
    const li = document.createElement('li');
    li.className = `category-item ${state.selectedCategory === cat ? 'active' : ''}`;
    li.setAttribute('data-category', cat);
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'cat-name';
    nameSpan.textContent = cat;

    const countSpan = document.createElement('span');
    countSpan.className = 'cat-count';
    countSpan.textContent = counts[cat] || 0;

    li.appendChild(nameSpan);
    li.appendChild(countSpan);
    categoryList.appendChild(li);
  });

  // Re-attach event listeners
  categoryList.querySelectorAll('.category-item').forEach(item => {
    item.addEventListener('click', () => {
      categoryList.querySelectorAll('.category-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      state.selectedCategory = item.getAttribute('data-category');
      renderProducts();
      closeSidebar();
    });
  });
}

// Format Price helper based on selected currency
function formatPrice(usdAmount) {
  if (usdAmount === null || usdAmount === undefined) return '';
  const converted = usdAmount * state.exchangeRates[state.currency];
  const symbol = state.currencySymbols[state.currency];
  return `${symbol}${converted.toFixed(2)}`;
}

// Render products grid
function renderProducts() {
  let filtered = [...state.products];

  // Category Filter
  if (state.selectedCategory !== 'all') {
    filtered = filtered.filter(p => p.category === state.selectedCategory);
  }

  // Search Filter
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    filtered = filtered.filter(p => 
      p.title.toLowerCase().includes(query) || 
      (p.description && p.description.toLowerCase().includes(query)) ||
      (p.sku && p.sku.toLowerCase().includes(query)) ||
      (p.internalCode && p.internalCode.toLowerCase().includes(query))
    );
  }

  // Sort
  if (state.sortBy === 'price-low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (state.sortBy === 'price-high') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (state.sortBy === 'name-asc') {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  }

  displayedCount.textContent = filtered.length;

  if (filtered.length === 0) {
    emptyState.classList.remove('d-none');
    productsGrid.innerHTML = '';
  } else {
    emptyState.classList.add('d-none');
    
    // Generate Cards
    productsGrid.innerHTML = filtered.map(p => {
      const hasDiscount = p.originalPrice && p.originalPrice > p.price;
      const discountTag = hasDiscount ? `<span class="product-tag">Sale</span>` : '';
      
      const isMember = !!state.member;
      const isLocked = p.memberOnly && !isMember;

      let priceHtml = '';
      let cartButtonHtml = '';

      if (isLocked) {
        priceHtml = `<span class="member-only-locked-price" onclick="event.preventDefault(); event.stopPropagation(); openMemberAuthModal();"><i class="fa-solid fa-lock"></i> Sign In to View Price</span>`;
        cartButtonHtml = `
          <button class="card-add-to-cart-btn" style="background-color: var(--text-muted); cursor: pointer;" title="Locked" onclick="event.preventDefault(); event.stopPropagation(); openMemberAuthModal();">
            <i class="fa-solid fa-lock"></i>
          </button>
        `;
      } else {
        const originalPriceHtml = hasDiscount ? `<span class="price-original">${formatPrice(p.originalPrice)}</span>` : '';
        priceHtml = `
          <span class="price-current">${formatPrice(p.price)}</span>
          ${originalPriceHtml}
        `;
        cartButtonHtml = `
          <button class="card-add-to-cart-btn" title="Add to Cart" onclick="handleCardAddToCart(event, '${p.id}')">
            <i class="fa-solid fa-cart-plus"></i>
          </button>
        `;
      }

      return `
        <a href="/wholesale/${p.slug}.html" class="product-card" data-id="${p.id}" style="text-decoration: none; color: inherit; display: block;">
          <div class="product-img-wrapper">
            ${discountTag}
            <img class="product-img" src="${p.imageUrl}" alt="${p.title}" onerror="this.src='/uploads/placeholder.jpg'">
          </div>
          <div class="product-info">
            <div class="product-category">${p.category}</div>
            <h3 class="product-title" title="${p.title}">${p.title}</h3>
            <div class="product-price-row">
              ${priceHtml}
            </div>
          </div>
          ${cartButtonHtml}
        </a>
      `;
    }).join('');
  }
}

// Shopping Cart Actions
function handleCardAddToCart(event, productId) {
  event.preventDefault();
  event.stopPropagation(); // Prevent opening modal details & link navigation
  addToCart(productId, 1);
}

function addToCart(productId, quantity = 1) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  // Check member lock
  if (product.memberOnly && !state.member) {
    openMemberAuthModal();
    return;
  }

  const existing = state.cart.find(item => item.id === productId);
  if (existing) {
    existing.qty += quantity;
  } else {
    state.cart.push({
      id: product.id,
      title: product.title,
      price: product.price,
      imageUrl: product.imageUrl,
      qty: quantity
    });
  }

  localStorage.setItem('keydiy_cart', JSON.stringify(state.cart));
  updateCartUI();
  openCartDrawer();
}

function updateCartUI() {
  const totalCount = state.cart.reduce((sum, item) => sum + item.qty, 0);
  
  if (totalCount > 0) {
    cartCountBadge.textContent = totalCount;
    cartCountBadge.classList.remove('d-none');
  } else {
    cartCountBadge.classList.add('d-none');
  }

  renderCartItems();
}

function renderCartItems() {
  if (state.cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-secondary); margin-top: 5rem; display: flex; flex-direction: column; align-items: center; gap: 1rem;">
        <i class="fa-solid fa-shopping-basket" style="font-size: 2.5rem; color: var(--text-muted);"></i>
        <span>Your cart is empty.</span>
      </div>
    `;
    cartSubtotalAmount.textContent = formatPrice(0);
    return;
  }

  let subtotal = 0;
  cartItemsContainer.innerHTML = state.cart.map(item => {
    const itemTotal = item.price * item.qty;
    subtotal += itemTotal;

    return `
      <div class="cart-drawer-item">
        <div class="cart-item-img-wrapper">
          <img src="${item.imageUrl}" alt="${item.title}" onerror="this.src='/uploads/placeholder.jpg'">
        </div>
        <div class="cart-item-info">
          <div class="cart-item-title" title="${item.title}">${item.title}</div>
          <div class="cart-item-price">${formatPrice(item.price)}</div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
          <div class="cart-item-qty-controls">
            <button class="cart-qty-btn" onclick="adjustCartItemQty('${item.id}', -1)">-</button>
            <span class="cart-qty-val">${item.qty}</span>
            <button class="cart-qty-btn" onclick="adjustCartItemQty('${item.id}', 1)">+</button>
          </div>
          <button class="cart-item-remove-btn" onclick="removeCartItem('${item.id}')" title="Remove">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  const zoneSelect = document.getElementById('cart-shipping-zone');
  const freeMsg = document.getElementById('free-shipping-msg');
  const selectedZone = zoneSelect ? zoneSelect.value : 'zone2';

  let shippingCost = 0;
  let msg = '';

  if (selectedZone === 'zone1') {
    if (subtotal >= 50) {
      shippingCost = 0;
      msg = '🎉 Qualified for FREE Shipping (Asia)!';
    } else {
      shippingCost = 5;
      msg = `Add ${formatPrice(50 - subtotal)} more for FREE Shipping!`;
    }
  } else if (selectedZone === 'zone2') {
    if (subtotal >= 150) {
      shippingCost = 0;
      msg = '🎉 Qualified for FREE Shipping (Europe/USA)!';
    } else {
      shippingCost = 12;
      msg = `Add ${formatPrice(150 - subtotal)} more for FREE Shipping!`;
    }
  } else {
    shippingCost = 25;
    msg = 'Flat Rate Shipping: $25 (Rest of World)';
  }

  if (freeMsg) freeMsg.innerHTML = msg;
  cartSubtotalAmount.textContent = `${formatPrice(subtotal + shippingCost)} ${shippingCost > 0 ? `(Inc. ${formatPrice(shippingCost)} shipping)` : '(Free Shipping)'}`;
}

window.adjustCartItemQty = function(productId, amount) {
  const item = state.cart.find(i => i.id === productId);
  if (!item) return;

  item.qty += amount;
  if (item.qty <= 0) {
    state.cart = state.cart.filter(i => i.id !== productId);
  }

  localStorage.setItem('keydiy_cart', JSON.stringify(state.cart));
  updateCartUI();
};

window.removeCartItem = function(productId) {
  state.cart = state.cart.filter(i => i.id !== productId);
  localStorage.setItem('keydiy_cart', JSON.stringify(state.cart));
  updateCartUI();
};

function openCartDrawer() {
  cartDrawer.classList.remove('d-none');
  document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
  cartDrawer.classList.add('d-none');
  document.body.style.overflow = '';
}

// Checkout and send order via WhatsApp
async function checkoutCart() {
  if (state.cart.length === 0) return;

  let orderText = `*🛒 New Order Request*\n`;
  orderText += `---------------------------\n`;
  
  let subtotal = 0;
  state.cart.forEach((item, idx) => {
    const total = item.price * item.qty;
    subtotal += total;
    orderText += `${idx + 1}. *${item.title}*\n`;
    orderText += `   Qty: ${item.qty} x ${formatPrice(item.price)} = *${formatPrice(total)}*\n`;
  });
  
  orderText += `---------------------------\n`;
  orderText += `*Total Order Value: ${formatPrice(subtotal)}*\n\n`;
  
  if (state.member) {
    orderText += `👤 *Customer:* ${state.member.username}\n`;
  }
  orderText += `Please verify details and arrange shipping. Thank you!`;

  const link = `${SUPPORT_WHATSAPP_LINK}&text=${encodeURIComponent(orderText)}`;
  window.open(link, '_blank');
}

// Member Auth Modal triggers
function openMemberAuthModal() {
  memberLoginPanel.classList.remove('d-none');
  memberRegisterPanel.classList.add('d-none');
  memberLoginError.classList.add('d-none');
  memberRegisterError.classList.add('d-none');
  memberLoginForm.reset();
  memberRegisterForm.reset();
  memberAuthModal.classList.remove('d-none');
}

function closeMemberAuthModal() {
  memberAuthModal.classList.add('d-none');
}

function updateMemberUI() {
  if (state.member) {
    memberAuthSection.classList.add('d-none');
    memberInfoSection.classList.remove('d-none');
    memberWelcomeMsg.textContent = `${state.member.username}`;
  } else {
    memberAuthSection.classList.remove('d-none');
    memberInfoSection.classList.add('d-none');
    memberWelcomeMsg.textContent = '';
  }
}

// Member Forms handlers
memberLoginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  memberLoginError.classList.add('d-none');

  const username = document.getElementById('member-login-username').value.trim();
  const password = document.getElementById('member-login-password').value;

  try {
    const res = await fetch('/api/member/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      state.member = { username: data.username, token: data.token };
      localStorage.setItem('keydiy_member_session', JSON.stringify(state.member));
      closeMemberAuthModal();
      updateMemberUI();
      renderProducts(); // Refresh products grid to unlock prices!
    } else {
      memberLoginError.textContent = data.error || 'Invalid credentials';
      memberLoginError.classList.remove('d-none');
    }
  } catch (err) {
    console.error('Login error:', err);
    memberLoginError.textContent = 'Server connection failed.';
    memberLoginError.classList.remove('d-none');
  }
});

memberRegisterForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  memberRegisterError.classList.add('d-none');

  const username = document.getElementById('member-reg-username').value.trim();
  const email = document.getElementById('member-reg-email').value.trim();
  const password = document.getElementById('member-reg-password').value;

  try {
    const res = await fetch('/api/member/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();
    if (res.ok) {
      alert('Registration successful! Please log in.');
      memberLoginPanel.classList.remove('d-none');
      memberRegisterPanel.classList.add('d-none');
      memberLoginForm.reset();
      document.getElementById('member-login-username').value = username;
    } else {
      memberRegisterError.textContent = data.error || 'Registration failed';
      memberRegisterError.classList.remove('d-none');
    }
  } catch (err) {
    console.error('Registration error:', err);
    memberRegisterError.textContent = 'Server connection failed.';
    memberRegisterError.classList.remove('d-none');
  }
});

// Logout Member
function handleMemberLogout() {
  state.member = null;
  localStorage.removeItem('keydiy_member_session');
  updateMemberUI();
  renderProducts(); // Re-lock member-only products!
}

// Open product details modal
async function openProductDetails(id) {
  const product = state.products.find(p => p.id === id);
  if (!product) return;

  const isMember = !!state.member;
  const isLocked = product.memberOnly && !isMember;
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;

  // Compute pricing UI
  let originalPriceHtml = '';
  let pricingRowHtml = '';
  let actionButtonsHtml = '';

  if (isLocked) {
    pricingRowHtml = `
      <div class="detail-buy-now-row" onclick="openMemberAuthModal();" style="cursor: pointer;">
        <span class="buy-now-label">Price:</span>
        <span class="buy-now-price" style="font-size: 1.4rem; color: var(--text-muted);"><i class="fa-solid fa-lock"></i> Sign In to View Price</span>
      </div>
    `;
    actionButtonsHtml = `
      <button class="btn-add-cart-blue" style="background-color: var(--text-muted); flex: 1;" onclick="openMemberAuthModal()">
        <i class="fa-solid fa-lock"></i> Sign In to Buy
      </button>
    `;
  } else {
    const discountPct = hasDiscount ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
    const discountPriceBadge = hasDiscount ? `<span class="price-discount-tag">${discountPct}% off</span>` : '';
    
    originalPriceHtml = hasDiscount ? `
      <div class="latest-price-text">Latest price: <span class="price-through">${formatPrice(product.originalPrice)}</span></div>
    ` : '';

    pricingRowHtml = `
      <div class="detail-buy-now-row">
        <span class="buy-now-label">Buy Now:</span>
        <span class="buy-now-price">${formatPrice(product.price)}</span>
        ${discountPriceBadge}
      </div>
    `;

    actionButtonsHtml = `
      <button class="btn-paypal-buy" onclick="handlePayPalBuy('${product.id}')">
        PayPal Buy Now
      </button>
      <button class="btn-add-cart-blue" onclick="handleAddToCart('${product.id}')">
        <i class="fa-solid fa-cart-plus"></i> Add to Cart
      </button>
    `;
  }

  // Sibling options variations
  const siblings = state.products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 2);
  let variationsHtml = '';
  if (siblings.length > 0) {
    variationsHtml = `
      <div class="detail-variations-box">
        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem; font-weight: 500;">Options:</div>
        <div class="variations-flex">
          <div class="var-item active">
            <img src="${product.imageUrl}" alt="${product.title}" onerror="this.src='/uploads/placeholder.jpg'">
            <span>${isLocked ? 'Locked' : formatPrice(product.price)}</span>
          </div>
          ${siblings.map(sib => {
            const sibLocked = sib.memberOnly && !isMember;
            return `
              <div class="var-item" onclick="openProductDetails('${sib.id}')">
                <img src="${sib.imageUrl}" alt="${sib.title}" onerror="this.src='/uploads/placeholder.jpg'">
                <span>${sibLocked ? 'Locked' : formatPrice(sib.price)}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // Highlights / Features list
  const features = [
    product.feature1,
    product.feature2,
    product.feature3,
    product.feature4,
    product.feature5
  ].filter(f => f && f.trim() !== '');

  let featuresHtml = '';
  if (features.length > 0) {
    featuresHtml = `
      <div class="detail-features-box">
        <ul class="detail-features-list">
          ${features.map(f => `
            <li>
              <i class="fa-solid fa-circle-check feature-check-icon"></i>
              <span>${f}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  // Weight & Size formatting
  const weightKg = product.weight ? (product.weight / 1000).toFixed(2) : '0.00';
  const weightLb = product.weight ? (product.weight * 0.00220462).toFixed(2) : '0.00';
  const hasPkgSize = product.pkgLength || product.pkgWidth || product.pkgHeight;
  const pkgSizeCm = hasPkgSize ? `${product.pkgLength}cm*${product.pkgWidth}cm*${product.pkgHeight}cm` : 'N/A';
  const pkgSizeIn = hasPkgSize ? `&nbsp;( Inch: ${(product.pkgLength*0.3937).toFixed(2)}*${(product.pkgWidth*0.3937).toFixed(2)}*${(product.pkgHeight*0.3937).toFixed(2)} )` : '';

  // Return policy
  let returnPolicyText = 'Return for refund within 30 days, buyer pays return shipping.';
  if (product.returnPolicy === '14-days-seller-pays') {
    returnPolicyText = 'Return within 14 days, seller pays return shipping.';
  } else if (product.returnPolicy === 'no-returns') {
    returnPolicyText = 'No returns allowed (Final Sale).';
  }

  // Badges calculation
  const discountPct = hasDiscount ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const discountImgBadge = (hasDiscount && !isLocked) ? `<div class="img-discount-badge">↓${discountPct}% off</div>` : '';
  const showRedShipBadge = (product.freeShipping || product.category.includes('Programmers') || product.title.toLowerCase().includes('ship') || product.isSpecial) ? 
    `<span class="eu-ship-title-badge">EU SHIP</span>` : '';

  modalDetailContent.innerHTML = `
    <div class="detail-layout">
      <!-- Left image -->
      <div class="detail-left">
        <div class="detail-image-box">
          ${discountImgBadge}
          <img class="detail-main-img" id="detail-main-img" src="${product.imageUrl}" alt="${product.title}" onerror="this.src='/uploads/placeholder.jpg'">
        </div>
        <div class="thumb-nav-row">
          <button class="thumb-nav-btn" onclick="navigateModalImage(-1)" aria-label="Previous"><i class="fa-solid fa-chevron-left"></i></button>
          <div class="detail-thumbnails">
            ${(product.images && product.images.length > 0 ? product.images : [product.imageUrl]).map((img, i) => `
              <div class="thumb-item${i === 0 ? ' active' : ''}" onclick="changeModalMainImage('${img}', this)">
                <img src="${img}" alt="Thumb" onerror="this.src='/uploads/placeholder.jpg'">
              </div>
            `).join('')}
          </div>
          <button class="thumb-nav-btn" onclick="navigateModalImage(1)" aria-label="Next"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
        <div class="detail-digg-box">
          <button class="digg-btn" onclick="handleLike('${product.id}')">
            <i class="fa-solid fa-thumbs-up"></i> <span id="detail-digg-count-text">${product.diggCount || 0}</span> Likes
          </button>
        </div>
      </div>

      <!-- Right detail info -->
      <div class="detail-right-info">
        <h2 class="detail-product-title">
          ${showRedShipBadge}${product.title}
        </h2>

        <div class="detail-meta-row">
          <span>Brand: <span class="meta-val highlight">${product.brand || 'KEYDIY'}</span></span>
          <span>Item No. <span class="meta-val">${product.sku || product.internalCode || 'HKSK465-F'}</span></span>
          <span><span class="stock-status-green"><i class="fa-solid fa-circle-check"></i> ${product.stockStatus !== false ? 'In Stock.' : 'Out of Stock.'}</span></span>
          <span>History <span class="highlight">${product.soldCount || 160}</span> sold.</span>
        </div>

        <div class="detail-rating-row">
          <div class="stars">
            <i class="fa-solid fa-star"></i>
            <i class="fa-solid fa-star"></i>
            <i class="fa-solid fa-star"></i>
            <i class="fa-solid fa-star"></i>
            <i class="fa-solid fa-star"></i>
          </div>
          <span>0 rating</span>
          <span class="divider">|</span>
          <a href="#" class="rating-link">Have a question?</a>
        </div>

        <!-- Prices Box -->
        <div class="detail-price-section">
          ${isLocked ? '' : originalPriceHtml}
          ${pricingRowHtml}
        </div>

        <!-- Variations Sibling Options -->
        ${variationsHtml}

        <!-- 5 Features List -->
        ${featuresHtml}

        <!-- Shipping details -->
        <div class="detail-shipping-info">
          <div style="font-weight: 500; display: flex; gap: 0.5rem; align-items: center;">
            Shipping: <span class="shipping-green">${product.freeShipping ? 'Free Shipping' : 'Flat Rate Shipping'}</span>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">
            Express Shipping Service &nbsp;<span style="color: var(--text-muted);">Estimated delivery time: 3-7 working days. <a href="#" style="color: var(--accent-color); text-decoration: underline;">See details »</a></span>
          </div>
        </div>

        <!-- Quantity Picker -->
        <div class="detail-qty-row">
          <span class="qty-label">Quantity:</span>
          <div class="qty-picker">
            <button class="qty-btn" ${isLocked ? 'disabled' : ''} onclick="adjustQty(-1)">-</button>
            <input type="number" id="detail-qty-input" value="1" min="1" readonly>
            <button class="qty-btn" ${isLocked ? 'disabled' : ''} onclick="adjustQty(1)">+</button>
          </div>
        </div>

        <!-- Buttons Row -->
        <div class="detail-buttons-row">
          ${actionButtonsHtml}
          <button class="btn-favorite-heart">
            <i class="fa-regular fa-heart"></i>
          </button>
        </div>

        <!-- Specs bottom box -->
        <div class="detail-specs-box">
          <div class="spec-line"><strong>Weight:</strong> ${weightKg}KG &nbsp;( ${weightLb}LB )</div>
          <div class="spec-line"><strong>Package:</strong> ${pkgSizeCm} ${pkgSizeIn}</div>
          <div class="spec-line"><strong>Returns:</strong> ${returnPolicyText} <a href="#" style="color: var(--accent-color); text-decoration: underline;">Read details</a></div>
        </div>
      </div>

      <!-- Description HTML Section (Scraped Details & Images) -->
      <div class="detail-description-section" style="margin-top: 2.5rem; border-top: 1px solid var(--border-color); padding-top: 2rem; grid-column: span 2;">
        <h3 style="font-family: var(--font-display); font-size: 1.15rem; margin-bottom: 1.25rem; color: var(--text-primary); border-bottom: 2px solid var(--accent-color); display: inline-block; padding-bottom: 0.35rem; font-weight: 600;">Product Detailed Description</h3>
        <div class="detail-description-html" style="font-size: 0.95rem; line-height: 1.7; color: var(--text-secondary); padding-right: 0.5rem;">
          ${product.description || 'No description available for this item.'}
        </div>
      </div>
    </div>
  `;

  productModal.classList.remove('d-none');
  document.body.style.overflow = 'hidden';

  // Set up hover zoom inside modal
  const modalImgContainer = productModal.querySelector('.detail-img-container');
  const modalImg = productModal.querySelector('.detail-img');
  setupImageZoom(modalImgContainer, modalImg);
}

// Global modal/helpers mapping
window.openProductDetails = openProductDetails;
window.handleCardAddToCart = handleCardAddToCart;
window.openMemberAuthModal = openMemberAuthModal;

window.adjustQty = function(amount) {
  const input = document.getElementById('detail-qty-input');
  if (input && !input.disabled) {
    let val = parseInt(input.value) || 1;
    val += amount;
    if (val < 1) val = 1;
    input.value = val;
  }
};

window.handleLike = function(productId) {
  const text = document.getElementById('detail-digg-count-text');
  if (text) {
    let val = parseInt(text.textContent) || 0;
    val += 1;
    text.textContent = val;

    // Persist in state
    const product = state.products.find(p => p.id === productId);
    if (product) {
      product.diggCount = val;
    }
  }
};

window.handlePayPalBuy = function(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;
  const qty = document.getElementById('detail-qty-input')?.value || 1;
  alert(`Redirecting to PayPal for: ${qty}x "${product.title}" (Total: ${formatPrice(product.price * qty)})`);
};

window.handleAddToCart = function(productId) {
  const qty = parseInt(document.getElementById('detail-qty-input')?.value) || 1;
  addToCart(productId, qty);
  closeModal();
};

// Close detail modal
function closeModal() {
  productModal.classList.add('d-none');
  document.body.style.overflow = '';
}

// Event Listeners for Details Modal
modalCloseBtn.addEventListener('click', closeModal);
productModal.querySelector('.modal-overlay').addEventListener('click', closeModal);

// Event Listeners for Cart Drawer
headerCartBtn.addEventListener('click', openCartDrawer);
cartCloseBtn.addEventListener('click', closeCartDrawer);
cartDrawerOverlay.addEventListener('click', closeCartDrawer);
cartCheckoutBtn.addEventListener('click', checkoutCart);

// Event Listeners for Member Auth Modal
memberSigninBtn.addEventListener('click', openMemberAuthModal);
memberLogoutBtn.addEventListener('click', handleMemberLogout);
memberAuthCloseBtn.addEventListener('click', closeMemberAuthModal);
memberAuthOverlay.addEventListener('click', closeMemberAuthModal);

goToRegisterLink.addEventListener('click', (e) => {
  e.preventDefault();
  memberLoginPanel.classList.add('d-none');
  memberRegisterPanel.classList.remove('d-none');
});

goToLoginLink.addEventListener('click', (e) => {
  e.preventDefault();
  memberLoginPanel.classList.remove('d-none');
  memberRegisterPanel.classList.add('d-none');
});

// Search Handling
searchInput.addEventListener('input', (e) => {
  state.searchQuery = e.target.value;
  if (state.searchQuery) {
    searchClearBtn.classList.remove('d-none');
  } else {
    searchClearBtn.classList.add('d-none');
  }
  renderProducts();
});

searchClearBtn.addEventListener('click', () => {
  searchInput.value = '';
  state.searchQuery = '';
  searchClearBtn.classList.add('d-none');
  renderProducts();
});

// Sort Handling
sortSelect.addEventListener('change', (e) => {
  state.sortBy = e.target.value;
  renderProducts();
});

// Currency dropdown toggle
currSelectorBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  currDropdown.classList.toggle('d-none');
});

document.addEventListener('click', () => {
  currDropdown.classList.add('d-none');
});

// Currency Option Select
document.querySelectorAll('.curr-option').forEach(option => {
  option.addEventListener('click', (e) => {
    const selectedCurr = option.getAttribute('data-curr');
    state.currency = selectedCurr;
    const symbol = state.currencySymbols[selectedCurr];
    currCodeText.textContent = `${selectedCurr} (${symbol})`;
    renderProducts();
    updateCartUI();
  });
});

// Reset filters button
resetFiltersBtn.addEventListener('click', () => {
  state.selectedCategory = 'all';
  state.searchQuery = '';
  state.sortBy = 'default';
  searchInput.value = '';
  sortSelect.value = 'default';
  searchClearBtn.classList.add('d-none');
  
  categoryList.querySelectorAll('.category-item').forEach(el => {
    if (el.getAttribute('data-category') === 'all') {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  renderProducts();
});

// Hover Zoom Helper
function setupImageZoom(container, img) {
  if (!container || !img) return;

  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    img.style.transformOrigin = `${x}% ${y}%`;
    img.style.transform = 'scale(2.2)';
  });

  container.addEventListener('mouseleave', () => {
    img.style.transform = 'scale(1.0)';
    img.style.transformOrigin = 'center center';
  });
}

// Run Init
document.addEventListener('DOMContentLoaded', initStore);

// Change Modal Main Image (Thumbnail Click Action)
function changeModalMainImage(src, thumbElement) {
  const mainImg = document.getElementById('detail-main-img');
  if (mainImg) {
    mainImg.src = src;
  }
  // Update active thumbnail border in the modal
  const thumbs = thumbElement.parentElement.querySelectorAll('.thumb-item');
  thumbs.forEach(t => t.classList.remove('active'));
  thumbElement.classList.add('active');
}
window.changeModalMainImage = changeModalMainImage;

// Navigate Modal Images with Arrow Buttons
function navigateModalImage(direction) {
  const thumbs = Array.from(document.querySelectorAll('.detail-thumbnails .thumb-item'));
  if (thumbs.length === 0) return;
  const activeIndex = thumbs.findIndex(t => t.classList.contains('active'));
  const newIndex = (activeIndex + direction + thumbs.length) % thumbs.length;
  const newThumb = thumbs[newIndex];
  const newSrc = newThumb.querySelector('img').src;
  changeModalMainImage(newSrc, newThumb);
}
window.navigateModalImage = navigateModalImage;
