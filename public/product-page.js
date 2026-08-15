// State management (mirrors app.js)
let state = {
  currency: localStorage.getItem('selectedCurrency') || 'USD',
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
  member: JSON.parse(localStorage.getItem('keydiy_member_session')) || null
};

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchClearBtn = document.getElementById('search-clear-btn');
const currSelectorBtn = document.getElementById('curr-selector-btn');
const currCodeText = document.getElementById('curr-code');
const currDropdown = document.getElementById('curr-dropdown');

// Cart DOM Elements
const headerCartBtn = document.getElementById('header-cart-btn');
const cartCountBadge = document.getElementById('cart-count-badge');
const cartDrawer = document.getElementById('cart-drawer');
const cartCloseBtn = document.getElementById('cart-close-btn');
const cartDrawerOverlay = document.getElementById('cart-drawer-overlay');
const cartItemsContainer = document.getElementById('cart-items-container');
const cartSubtotalAmount = document.getElementById('cart-subtotal-amount');
const cartCheckoutBtn = document.getElementById('cart-checkout-btn');

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

// Product Page Specific Elements
const qtyMinusBtn = document.getElementById('qty-minus-btn');
const qtyPlusBtn = document.getElementById('qty-plus-btn');
const qtyInputVal = document.getElementById('qty-input-val');
const addToCartBtn = document.getElementById('add-to-cart-btn');
const buyNowBtn = document.getElementById('buy-now-btn');
const detailPricesWrapper = document.getElementById('detail-prices-wrapper');

// WhatsApp Support Config
const SUPPORT_WHATSAPP_LINK = "https://api.whatsapp.com/send?phone=886979056575";

// Initialize
function initProductPage() {
  updateMemberUI();
  updateCartUI();
  updatePriceDisplay();
  
  // Search Bar redirection
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && searchInput.value.trim() !== '') {
        window.location.href = `/?q=${encodeURIComponent(searchInput.value.trim())}`;
      }
    });
    searchInput.addEventListener('input', () => {
      if (searchInput.value.trim() !== '') {
        searchClearBtn.classList.remove('d-none');
      } else {
        searchClearBtn.classList.add('d-none');
      }
    });
    searchClearBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchClearBtn.classList.add('d-none');
    });
  }

  // Currency Selection event listeners
  if (currSelectorBtn) {
    currSelectorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      currDropdown.classList.toggle('d-none');
    });
    document.addEventListener('click', () => {
      currDropdown.classList.add('d-none');
    });
    document.querySelectorAll('.curr-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        const cur = e.target.getAttribute('data-curr');
        state.currency = cur;
        localStorage.setItem('selectedCurrency', cur);
        currCodeText.textContent = `${cur} (${state.currencySymbols[cur]})`;
        currDropdown.classList.add('d-none');
        updatePriceDisplay();
        updateCartUI();
      });
    });
    // Set initial currency visual value
    const cur = state.currency;
    currCodeText.textContent = `${cur} (${state.currencySymbols[cur]})`;
  }

  // Quantity controllers
  if (qtyMinusBtn && qtyPlusBtn && qtyInputVal) {
    qtyMinusBtn.addEventListener('click', () => {
      let val = parseInt(qtyInputVal.value) || 1;
      if (val > 1) {
        qtyInputVal.value = val - 1;
      }
    });
    qtyPlusBtn.addEventListener('click', () => {
      let val = parseInt(qtyInputVal.value) || 1;
      if (val < 99) {
        qtyInputVal.value = val + 1;
      }
    });
    qtyInputVal.addEventListener('change', () => {
      let val = parseInt(qtyInputVal.value);
      if (isNaN(val) || val < 1) qtyInputVal.value = 1;
      if (val > 99) qtyInputVal.value = 99;
    });
  }

  // Add to Cart
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
      const product = window.CURRENT_PRODUCT;
      if (!product) return;
      
      const isMember = !!state.member;
      const isLocked = product.memberOnly && !isMember;
      if (isLocked) {
        openMemberAuthModal();
        return;
      }

      const qty = parseInt(qtyInputVal.value) || 1;
      addToCart(product, qty);
      openCartDrawer();
    });
  }

  // Buy Now (WhatsApp Direct)
  if (buyNowBtn) {
    buyNowBtn.addEventListener('click', () => {
      const product = window.CURRENT_PRODUCT;
      if (!product) return;

      const isMember = !!state.member;
      const isLocked = product.memberOnly && !isMember;
      if (isLocked) {
        openMemberAuthModal();
        return;
      }

      const qty = parseInt(qtyInputVal.value) || 1;
      const symbol = state.currencySymbols[state.currency];
      const rate = state.exchangeRates[state.currency];
      const convertedPrice = (product.price * rate).toFixed(2);
      
      const text = encodeURIComponent(
        `Hello KEYDIY Shop, I want to buy this product directly:\n\n` +
        `- Product: ${product.title}\n` +
        `- SKU: ${product.sku}\n` +
        `- Brand: ${product.brand}\n` +
        `- Quantity: ${qty}\n` +
        `- Unit Price: ${symbol}${convertedPrice} ${state.currency}\n` +
        `- Subtotal: ${symbol}${(convertedPrice * qty).toFixed(2)} ${state.currency}\n\n` +
        `Please confirm shipping and payment details.`
      );
      window.open(`https://api.whatsapp.com/send?phone=886979056575&text=${text}`, '_blank');
    });
  }

  // Cart Drawer open/close
  if (headerCartBtn) {
    headerCartBtn.addEventListener('click', openCartDrawer);
  }
  if (cartCloseBtn) {
    cartCloseBtn.addEventListener('click', closeCartDrawer);
  }
  if (cartDrawerOverlay) {
    cartDrawerOverlay.addEventListener('click', closeCartDrawer);
  }

  // Member Login toggle links
  if (goToRegisterLink) {
    goToRegisterLink.addEventListener('click', (e) => {
      e.preventDefault();
      memberLoginPanel.classList.add('d-none');
      memberRegisterPanel.classList.remove('d-none');
    });
  }
  if (goToLoginLink) {
    goToLoginLink.addEventListener('click', (e) => {
      e.preventDefault();
      memberRegisterPanel.classList.add('d-none');
      memberLoginPanel.classList.remove('d-none');
    });
  }

  // Sign In Click
  if (memberSigninBtn) {
    memberSigninBtn.addEventListener('click', openMemberAuthModal);
  }
  if (memberAuthCloseBtn) {
    memberAuthCloseBtn.addEventListener('click', closeMemberAuthModal);
  }
  if (memberAuthOverlay) {
    memberAuthOverlay.addEventListener('click', closeMemberAuthModal);
  }

  // Login Form Submit
  if (memberLoginForm) {
    memberLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('member-login-username').value.trim();
      const password = document.getElementById('member-login-password').value;
      
      memberLoginError.classList.add('d-none');
      try {
        const response = await fetch('/api/member/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok && data.success) {
          state.member = { username: data.username, token: data.token };
          localStorage.setItem('keydiy_member_session', JSON.stringify(state.member));
          closeMemberAuthModal();
          updateMemberUI();
          updatePriceDisplay();
          updateCartUI();
        } else {
          memberLoginError.textContent = data.error || 'Invalid credentials';
          memberLoginError.classList.remove('d-none');
        }
      } catch (err) {
        memberLoginError.textContent = 'Server connection failed';
        memberLoginError.classList.remove('d-none');
      }
    });
  }

  // Register Form Submit
  if (memberRegisterForm) {
    memberRegisterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('member-reg-username').value.trim();
      const email = document.getElementById('member-reg-email').value.trim();
      const password = document.getElementById('member-reg-password').value;
      
      memberRegisterError.classList.add('d-none');
      try {
        const response = await fetch('/api/member/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password })
        });
        const data = await response.json();
        if (response.ok && data.success) {
          // Log in automatically after registration
          state.member = { username: data.username, token: data.token };
          localStorage.setItem('keydiy_member_session', JSON.stringify(state.member));
          closeMemberAuthModal();
          updateMemberUI();
          updatePriceDisplay();
          updateCartUI();
        } else {
          memberRegisterError.textContent = data.error || 'Registration failed';
          memberRegisterError.classList.remove('d-none');
        }
      } catch (err) {
        memberRegisterError.textContent = 'Server connection failed';
        memberRegisterError.classList.remove('d-none');
      }
    });
  }

  // Logout Click
  if (memberLogoutBtn) {
    memberLogoutBtn.addEventListener('click', () => {
      state.member = null;
      localStorage.removeItem('keydiy_member_session');
      updateMemberUI();
      updatePriceDisplay();
      updateCartUI();
    });
  }

  // Checkout Button
  if (cartCheckoutBtn) {
    cartCheckoutBtn.addEventListener('click', handleCartCheckout);
  }

  // Set up hover zoom
  const imageBox = document.querySelector('.detail-image-box');
  const mainImg = document.querySelector('.detail-main-img');
  setupImageZoom(imageBox, mainImg);
}

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

// Format Price
function formatPrice(val) {
  const rate = state.exchangeRates[state.currency];
  const symbol = state.currencySymbols[state.currency];
  return `${symbol}${(val * rate).toFixed(2)}`;
}

// Update Price Display on page
function updatePriceDisplay() {
  const product = window.CURRENT_PRODUCT;
  if (!product || !detailPricesWrapper) return;

  const isMember = !!state.member;
  const isLocked = product.memberOnly && !isMember;

  if (isLocked) {
    detailPricesWrapper.innerHTML = `
      <span class="member-only-locked-price" style="cursor: pointer;" onclick="openMemberAuthModal()"><i class="fa-solid fa-lock"></i> Sign In to View Price</span>
    `;
    if (addToCartBtn) {
      addToCartBtn.innerHTML = `<i class="fa-solid fa-lock"></i> Sign In to View Price`;
      addToCartBtn.style.backgroundColor = 'var(--text-muted)';
    }
    if (buyNowBtn) buyNowBtn.disabled = true;
  } else {
    detailPricesWrapper.innerHTML = `
      <span class="price-current" style="font-size: 2rem; font-weight: 700; color: var(--accent-color);">${formatPrice(product.price)}</span>
    `;
    if (addToCartBtn) {
      addToCartBtn.innerHTML = `<i class="fa-solid fa-cart-plus"></i> Add to Cart`;
      addToCartBtn.style.backgroundColor = '';
    }
    if (buyNowBtn) buyNowBtn.disabled = false;
  }
}

// Update Member UI
function updateMemberUI() {
  if (state.member) {
    memberAuthSection.classList.add('d-none');
    memberInfoSection.classList.remove('d-none');
    memberWelcomeMsg.textContent = `Hello, ${state.member.username}`;
  } else {
    memberInfoSection.classList.add('d-none');
    memberAuthSection.classList.remove('d-none');
  }
}

// Update Cart UI
function updateCartUI() {
  const count = state.cart.reduce((total, item) => total + item.quantity, 0);
  if (count > 0) {
    cartCountBadge.textContent = count;
    cartCountBadge.classList.remove('d-none');
  } else {
    cartCountBadge.classList.add('d-none');
  }

  // Populated in Drawer
  if (state.cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-secondary); margin-top: 3rem;">
        <i class="fa-solid fa-shopping-basket" style="font-size: 3rem; margin-bottom: 1rem; color: var(--text-muted);"></i>
        <p>Your cart is empty.</p>
      </div>
    `;
    cartSubtotalAmount.textContent = formatPrice(0);
  } else {
    let subtotal = 0;
    cartItemsContainer.innerHTML = state.cart.map(item => {
      const itemSubtotal = item.price * item.quantity;
      subtotal += itemSubtotal;
      
      const isMember = !!state.member;
      const isLocked = item.memberOnly && !isMember;

      const priceStr = isLocked ? 'Locked' : formatPrice(item.price);
      
      return `
        <div style="display: flex; gap: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--bg-tertiary);">
          <img src="${item.imageUrl}" alt="${item.title}" onerror="this.src='/uploads/placeholder.jpg'" style="width: 70px; height: 70px; object-fit: contain; background: #fff; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
          <div style="flex: 1; display: flex; flex-direction: column; gap: 0.25rem;">
            <h4 style="font-size: 0.9rem; font-weight: 600; line-height: 1.3; color: var(--text-primary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" title="${item.title}">${item.title}</h4>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">SKU: ${item.sku}</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
              <div style="display: flex; align-items: center; border: 1px solid var(--border-color); border-radius: 4px; overflow: hidden; background: var(--bg-secondary);">
                <button onclick="updateCartQty('${item.id}', ${item.quantity - 1})" style="border: none; background: transparent; padding: 0.25rem 0.5rem; cursor: pointer; color: var(--text-secondary); font-weight: bold;">-</button>
                <span style="padding: 0 0.5rem; font-size: 0.85rem; font-weight: 600; min-width: 20px; text-align: center;">${item.quantity}</span>
                <button onclick="updateCartQty('${item.id}', ${item.quantity + 1})" style="border: none; background: transparent; padding: 0.25rem 0.5rem; cursor: pointer; color: var(--text-secondary); font-weight: bold;">+</button>
              </div>
              <div style="font-weight: 600; color: var(--accent-color); font-size: 0.95rem;">${isLocked ? '🔒 locked' : formatPrice(itemSubtotal)}</div>
            </div>
          </div>
          <button onclick="removeCartItem('${item.id}')" style="border: none; background: transparent; color: var(--text-muted); cursor: pointer; align-self: flex-start; padding: 0.2rem; transition: color 0.2s;" onmouseover="this.style.color='var(--danger-color)'" onmouseout="this.style.color='var(--text-muted)'"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      `;
    }).join('\n');
    cartSubtotalAmount.textContent = formatPrice(subtotal);
  }
}

// Add to Cart Logic
function addToCart(product, qty) {
  const existing = state.cart.find(item => item.id === product.id);
  if (existing) {
    existing.quantity += qty;
  } else {
    state.cart.push({
      id: product.id,
      title: product.title,
      price: product.price,
      imageUrl: product.imageUrl,
      sku: product.sku,
      brand: product.brand,
      memberOnly: product.memberOnly,
      quantity: qty
    });
  }
  localStorage.setItem('keydiy_cart', JSON.stringify(state.cart));
  updateCartUI();
}

// Update Qty in Cart Drawer
window.updateCartQty = function(id, newQty) {
  if (newQty <= 0) {
    removeCartItem(id);
    return;
  }
  const item = state.cart.find(i => i.id === id);
  if (item) {
    item.quantity = newQty;
    localStorage.setItem('keydiy_cart', JSON.stringify(state.cart));
    updateCartUI();
  }
};

// Remove Item from Cart Drawer
window.removeCartItem = function(id) {
  state.cart = state.cart.filter(item => item.id !== id);
  localStorage.setItem('keydiy_cart', JSON.stringify(state.cart));
  updateCartUI();
};

// Checkout Compilation
function handleCartCheckout() {
  if (state.cart.length === 0) return;

  const isMember = !!state.member;
  const symbol = state.currencySymbols[state.currency];
  const rate = state.exchangeRates[state.currency];

  let textLines = [
    `Hello KEYDIY Shop, I'd like to place an order:`,
    `--------------------------------------`
  ];
  
  let total = 0;
  state.cart.forEach((item, idx) => {
    const isLocked = item.memberOnly && !isMember;
    if (isLocked) {
      textLines.push(`${idx + 1}. [🔒 Member Price Locked] ${item.title} (Qty: ${item.quantity})`);
    } else {
      const itemSub = item.price * item.quantity;
      total += itemSub;
      textLines.push(
        `${idx + 1}. ${item.title}\n` +
        `   SKU: ${item.sku} | Brand: ${item.brand}\n` +
        `   Price: ${symbol}${(item.price * rate).toFixed(2)} x ${item.quantity} = ${symbol}${(itemSub * rate).toFixed(2)}`
      );
    }
  });

  textLines.push(`--------------------------------------`);
  textLines.push(`Subtotal: ${symbol}${(total * rate).toFixed(2)} ${state.currency}`);
  
  if (state.member) {
    textLines.push(`Member Username: ${state.member.username}`);
  } else {
    textLines.push(`Checkout Mode: Guest Visitor`);
  }
  textLines.push(`\nPlease confirm delivery fee and instructions.`);

  const textEncoded = encodeURIComponent(textLines.join('\n'));
  window.open(`https://api.whatsapp.com/send?phone=886979056575&text=${textEncoded}`, '_blank');
}

// Modal Helpers
function openCartDrawer() {
  cartDrawer.classList.remove('d-none');
  updateCartUI();
}
function closeCartDrawer() {
  cartDrawer.classList.add('d-none');
}

function openMemberAuthModal() {
  memberAuthModal.classList.remove('d-none');
  memberLoginPanel.classList.remove('d-none');
  memberRegisterPanel.classList.add('d-none');
}
function closeMemberAuthModal() {
  memberAuthModal.classList.add('d-none');
}

// Change Main Image (Thumbnail Click Action)
function changeMainImage(src, thumbElement) {
  const mainImg = document.querySelector('.detail-main-img');
  if (mainImg) {
    mainImg.src = src;
  }
  
  // Update active thumbnail borders
  const thumbs = document.querySelectorAll('.thumb-item');
  thumbs.forEach(t => t.classList.remove('active'));
  if (thumbElement) {
    thumbElement.classList.add('active');
  }
}
window.changeMainImage = changeMainImage;

// Navigate images with arrow buttons (standalone product page)
function navigateImage(direction) {
  const thumbs = Array.from(document.querySelectorAll('#detail-thumbnails .thumb-item'));
  if (thumbs.length === 0) return;
  const activeIndex = thumbs.findIndex(t => t.classList.contains('active'));
  const newIndex = (activeIndex + direction + thumbs.length) % thumbs.length;
  const newThumb = thumbs[newIndex];
  // thumb-item can be <img> itself (SSR) or a <div> wrapping <img> (modal)
  const newSrc = newThumb.tagName === 'IMG' ? newThumb.src : newThumb.querySelector('img').src;
  changeMainImage(newSrc, newThumb);
}
window.navigateImage = navigateImage;

// Run Initialization
document.addEventListener('DOMContentLoaded', initProductPage);
