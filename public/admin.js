// Admin State
let adminState = {
  token: localStorage.getItem('keydiy_admin_token') || '',
  products: [],
  categories: [],
  currentTab: 'products', // products, categories
  searchQuery: ''
};

// DOM Elements
const loginContainer = document.getElementById('login-container');
const adminContainer = document.getElementById('admin-container');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

// Main Panel Tabs
const tabProducts = document.getElementById('tab-products');
const tabCategories = document.getElementById('tab-categories');
const contentProducts = document.getElementById('content-products');
const contentCategories = document.getElementById('content-categories');

// Product Table & List
const adminProductsTbody = document.getElementById('admin-products-tbody');
const adminSearch = document.getElementById('admin-search');
const btnAddProduct = document.getElementById('btn-add-product');

// Product Form Modal
const productFormModal = document.getElementById('product-form-modal');
const formModalClose = document.getElementById('form-modal-close');
const modalFormTitle = document.getElementById('modal-form-title');
const productFormError = document.getElementById('product-form-error');
const productCrudForm = document.getElementById('product-crud-form');
const productEditId = document.getElementById('product-edit-id');
const btnCancelForm = document.getElementById('btn-cancel-form');

// Form fields - Tab 1 (Basic)
const prodTitle = document.getElementById('prod-title');
const prodShortName = document.getElementById('prod-short-name');
const prodSku = document.getElementById('prod-sku');
const prodInternalCode = document.getElementById('prod-internal-code');
const prodBrand = document.getElementById('prod-brand');
const prodCategory = document.getElementById('prod-category');
const prodSubcategory = document.getElementById('prod-subcategory');
const prodPrice = document.getElementById('prod-price');
const prodOriginalPrice = document.getElementById('prod-original-price');
const prodUnit = document.getElementById('prod-unit');
const prodPriceMode = document.getElementById('prod-price-mode');
const prodImageUrl = document.getElementById('prod-image-url');
const prodImageFile = document.getElementById('prod-image-file');
const imageUploadArea = document.getElementById('image-upload-area');
const uploadPrompt = document.getElementById('upload-prompt');
const uploadPreviewImg = document.getElementById('upload-preview-img');

// Form fields - Tab 2 (Logistics & Badges)
const prodPublishStatus = document.getElementById('prod-publish-status');
const prodStockStatus = document.getElementById('prod-stock-status');
const prodMemberOnly = document.getElementById('prod-member-only');
const prodAllowCc = document.getElementById('prod-allow-cc');
const prodIsVirtual = document.getElementById('prod-is-virtual');

const prodBadgeNew = document.getElementById('prod-badge-new');
const prodBadgeRecommend = document.getElementById('prod-badge-recommend');
const prodBadgeSpecial = document.getElementById('prod-badge-special');
const prodBadgeHot = document.getElementById('prod-badge-hot');
const prodBadgePinned = document.getElementById('prod-badge-pinned');
const prodBadgeHomepage = document.getElementById('prod-badge-homepage');

const prodSortOrder = document.getElementById('prod-sort-order');
const prodSoldCount = document.getElementById('prod-sold-count');
const prodDiggCount = document.getElementById('prod-digg-count');

const prodShippingMethod = document.getElementById('prod-shipping-method');
const prodFreeShipping = document.getElementById('prod-free-shipping');
const prodMinOrder = document.getElementById('prod-min-order');
const prodWeight = document.getElementById('prod-weight');
const prodPkgLength = document.getElementById('prod-pkg-length');
const prodPkgWidth = document.getElementById('prod-pkg-width');
const prodPkgHeight = document.getElementById('prod-pkg-height');
const prodReturnPolicy = document.getElementById('prod-return-policy');

// Form fields - Tab 3 (Features & Descriptions)
const prodFeature1 = document.getElementById('prod-feature-1');
const prodFeature2 = document.getElementById('prod-feature-2');
const prodFeature3 = document.getElementById('prod-feature-3');
const prodFeature4 = document.getElementById('prod-feature-4');
const prodFeature5 = document.getElementById('prod-feature-5');
const prodOverview = document.getElementById('prod-overview');
const prodDetailsHtml = document.getElementById('prod-details-html');

// Form fields - Tab 4 (SEO & Variations & Lang)
const prodMetaTitle = document.getElementById('prod-meta-title');
const prodMetaKeywords = document.getElementById('prod-meta-keywords');
const prodMetaDescription = document.getElementById('prod-meta-description');
const prodTags = document.getElementById('prod-tags');
const prodCanonicalUrl = document.getElementById('prod-canonical-url');
const prodSitemapWeight = document.getElementById('prod-sitemap-weight');
const prodSitemapFreq = document.getElementById('prod-sitemap-freq');
const prodGoogleShopping = document.getElementById('prod-google-shopping');
const prodVarRole = document.getElementById('prod-var-role');
const prodVarTheme = document.getElementById('prod-var-theme');
const prodVarValue = document.getElementById('prod-var-value');
const prodLanguage = document.getElementById('prod-language');
const prodVersion = document.getElementById('prod-version');

// Category tab fields
const addCategoryForm = document.getElementById('add-category-form');
const newCategoryName = document.getElementById('new-category-name');
const categoryError = document.getElementById('category-error');
const adminCategoriesList = document.getElementById('admin-categories-list');

// Authentication Headers helper
function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminState.token}`
  };
}

// Initial authentication check
async function checkAuth() {
  if (!adminState.token) {
    showLogin(true);
    return;
  }

  try {
    const res = await fetch('/api/auth/check', {
      headers: { 'Authorization': `Bearer ${adminState.token}` }
    });
    const data = await res.json();
    if (data.authenticated) {
      showLogin(false);
      initDashboard();
    } else {
      showLogin(true);
    }
  } catch (err) {
    console.error('Auth check error:', err);
    showLogin(true);
  }
}

function showLogin(show) {
  if (show) {
    loginContainer.classList.remove('d-none');
    adminContainer.classList.add('d-none');
  } else {
    loginContainer.classList.add('d-none');
    adminContainer.classList.remove('d-none');
  }
}

// Dashboard Init
async function initDashboard() {
  try {
    await Promise.all([
      fetchCategories(),
      fetchProducts()
    ]);
    renderProducts();
    renderCategories();
    populateCategoryDropdown();
  } catch (err) {
    console.error('Error fetching admin data:', err);
  }
}

// Fetch APIs
async function fetchCategories() {
  const response = await fetch('/api/categories');
  if (!response.ok) throw new Error('Failed to fetch categories');
  adminState.categories = await response.json();
}

async function fetchProducts() {
  const response = await fetch('/api/products');
  if (!response.ok) throw new Error('Failed to fetch products');
  adminState.products = await response.json();
}

// Render Products Table
function renderProducts() {
  let filtered = [...adminState.products];
  
  if (adminState.searchQuery) {
    const q = adminState.searchQuery.toLowerCase();
    filtered = filtered.filter(p => 
      p.title.toLowerCase().includes(q) || 
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.internalCode && p.internalCode.toLowerCase().includes(q)) ||
      p.category.toLowerCase().includes(q)
    );
  }

  // Sort by SortOrder (ascending/descending, let's show highest order first)
  filtered.sort((a, b) => {
    const orderA = a.sortOrder !== undefined ? parseInt(a.sortOrder) : 1000;
    const orderB = b.sortOrder !== undefined ? parseInt(b.sortOrder) : 1000;
    return orderA - orderB;
  });

  if (filtered.length === 0) {
    adminProductsTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 3rem;">No products found.</td></tr>`;
    return;
  }

  adminProductsTbody.innerHTML = filtered.map(p => {
    const origPriceText = p.originalPrice ? `€${parseFloat(p.originalPrice).toFixed(2)}` : '-';
    const skuText = p.sku ? `<span style="background: rgba(255,255,255,0.05); padding: 0.15rem 0.35rem; border-radius: 4px;">SKU: ${p.sku}</span>` : '';
    const publishBadge = p.publishStatus === false ? 
      `<span style="background: var(--danger-color); color: white; font-size: 0.7rem; padding: 0.15rem 0.35rem; border-radius: 4px; margin-left: 0.5rem;">Draft</span>` : '';

    return `
      <tr>
        <td>
          <img class="table-img" src="${p.imageUrl}" alt="${p.title}" onerror="this.src='/uploads/placeholder.jpg'">
        </td>
        <td>
          <div style="font-weight: 500; color: var(--text-primary); font-size: 0.95rem;">
            ${p.title} ${publishBadge}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.35rem; display: flex; gap: 0.75rem;">
            <span>ID: ${p.id}</span>
            ${skuText}
          </div>
        </td>
        <td>
          <span class="highlight" style="font-size: 0.85rem;">${p.category}</span>
        </td>
        <td style="font-weight: 600;">€${parseFloat(p.price).toFixed(2)}</td>
        <td style="color: var(--text-secondary);">${origPriceText}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-icon edit-btn" data-id="${p.id}" title="Edit Product"><i class="fa-solid fa-pen-to-square"></i></button>
            <button class="btn-icon delete-btn" data-id="${p.id}" title="Delete Product"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Attach event listeners
  adminProductsTbody.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openEditModal(id);
    });
  });

  adminProductsTbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      handleDeleteProduct(id);
    });
  });
}

// Categories tags render
function renderCategories() {
  if (adminState.categories.length === 0) {
    adminCategoriesList.innerHTML = `<div style="color: var(--text-secondary); font-size: 0.9rem;">No categories added yet.</div>`;
    return;
  }

  adminCategoriesList.innerHTML = adminState.categories.map(cat => {
    return `
      <div class="category-tag-item">
        <span style="font-weight: 500;">${cat}</span>
        <button class="btn-icon delete-btn" data-name="${cat}" title="Delete Category" style="padding: 0.25rem 0.4rem;">
          <i class="fa-solid fa-xmark" style="font-size: 0.85rem;"></i>
        </button>
      </div>
    `;
  }).join('');

  adminCategoriesList.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-name');
      handleDeleteCategory(name);
    });
  });
}

function populateCategoryDropdown() {
  prodCategory.innerHTML = adminState.categories.map(cat => {
    return `<option value="${cat}">${cat}</option>`;
  }).join('');
}

// Form Tabs functionality
function initFormTabs() {
  const tabButtons = document.querySelectorAll('.form-tab-btn');
  const tabContentPanels = document.querySelectorAll('.form-tab-content-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-form-tab');
      
      // Update active button state
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Show/Hide panels
      tabContentPanels.forEach(panel => {
        if (panel.id === `form-tab-${targetTab}`) {
          panel.classList.remove('d-none');
        } else {
          panel.classList.add('d-none');
        }
      });
    });
  });
}

function resetFormTabs() {
  const tabButtons = document.querySelectorAll('.form-tab-btn');
  const tabContentPanels = document.querySelectorAll('.form-tab-content-panel');

  tabButtons.forEach((btn, idx) => {
    if (idx === 0) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  tabContentPanels.forEach((panel, idx) => {
    if (idx === 0) {
      panel.classList.remove('d-none');
    } else {
      panel.classList.add('d-none');
    }
  });
}

// Open modals
function openAddModal() {
  modalFormTitle.textContent = '新增產品 (Add Product)';
  productEditId.value = '';
  productCrudForm.reset();
  resetFormTabs();
  
  // Set default placeholder preview
  uploadPreviewImg.src = '/uploads/placeholder.jpg';
  uploadPreviewImg.classList.add('d-none');
  uploadPrompt.classList.remove('d-none');
  document.querySelector('.image-upload-area .fa-cloud-arrow-up').classList.remove('d-none');
  
  prodImageUrl.value = '/uploads/placeholder.jpg';

  // Set explicit default checkbox states
  prodPublishStatus.checked = true;
  prodStockStatus.checked = true;
  prodAllowCc.checked = true;
  prodBadgeHomepage.checked = true;

  // Clear inputs values that forms don't reset automatically
  prodSortOrder.value = '1000';
  prodSoldCount.value = '0';
  prodDiggCount.value = '0';
  prodMinOrder.value = '1';
  prodWeight.value = '0';
  document.getElementById('prod-pkg-length').value = '0';
  document.getElementById('prod-pkg-width').value = '0';
  document.getElementById('prod-pkg-height').value = '0';
  
  productFormError.classList.add('d-none');
  productFormModal.classList.remove('d-none');
}

function openEditModal(id) {
  const p = adminState.products.find(prod => prod.id === id);
  if (!p) return;

  modalFormTitle.textContent = '編輯產品 (Edit Product)';
  productEditId.value = p.id;
  resetFormTabs();
  
  // TAB 1
  prodTitle.value = p.title || '';
  prodShortName.value = p.shortName || '';
  prodSku.value = p.sku || '';
  prodInternalCode.value = p.internalCode || '';
  prodBrand.value = p.brand || 'KeyDIY';
  prodCategory.value = p.category || '';
  prodSubcategory.value = p.subcategory || '';
  prodPrice.value = p.price || 0;
  prodOriginalPrice.value = p.originalPrice || '';
  prodUnit.value = p.unit || 'pcs';
  prodPriceMode.value = p.priceMode || 'fixed';
  prodImageUrl.value = p.imageUrl || '';

  // TAB 2
  prodPublishStatus.checked = p.publishStatus !== false;
  prodStockStatus.checked = p.stockStatus !== false;
  prodMemberOnly.checked = !!p.memberOnly;
  prodAllowCc.checked = p.allowCreditCard !== false;
  prodIsVirtual.checked = !!p.isVirtual;

  prodBadgeNew.checked = !!p.isNew;
  prodBadgeRecommend.checked = !!p.isRecommend;
  prodBadgeSpecial.checked = !!p.isSpecial;
  prodBadgeHot.checked = !!p.isHot;
  prodBadgePinned.checked = !!p.isPinned;
  prodBadgeHomepage.checked = p.showOnHomepage !== false;

  prodSortOrder.value = p.sortOrder !== undefined ? p.sortOrder : 1000;
  prodSoldCount.value = p.soldCount || 0;
  prodDiggCount.value = p.diggCount || 0;

  prodShippingMethod.value = p.shippingMethod || 'standard';
  prodFreeShipping.checked = !!p.freeShipping;
  prodMinOrder.value = p.minOrderQty || 1;
  prodWeight.value = p.weight || 0;
  document.getElementById('prod-pkg-length').value = p.pkgLength || 0;
  document.getElementById('prod-pkg-width').value = p.pkgWidth || 0;
  document.getElementById('prod-pkg-height').value = p.pkgHeight || 0;
  prodReturnPolicy.value = p.returnPolicy || '30-days-buyer-pays';

  // TAB 3
  prodFeature1.value = p.feature1 || '';
  prodFeature2.value = p.feature2 || '';
  prodFeature3.value = p.feature3 || '';
  prodFeature4.value = p.feature4 || '';
  prodFeature5.value = p.feature5 || '';
  prodOverview.value = p.overview || '';
  prodDetailsHtml.value = p.detailsHtml || p.description || '';

  // TAB 4
  prodMetaTitle.value = p.metaTitle || '';
  prodMetaKeywords.value = p.metaKeywords || '';
  prodMetaDescription.value = p.metaDescription || '';
  prodTags.value = p.tags || '';
  prodCanonicalUrl.value = p.canonicalUrl || '';
  prodSitemapWeight.value = p.sitemapWeight || '0.7';
  prodSitemapFreq.value = p.sitemapFreq || 'weekly';
  prodGoogleShopping.checked = !!p.googleShopping;
  
  prodVarRole.value = p.variationRole || 'standalone';
  prodVarTheme.value = p.variationTheme || '';
  prodVarValue.value = p.variationValue || '';
  
  prodLanguage.value = p.language || 'en';
  prodVersion.value = p.version || '';

  // Handle image preview
  if (p.imageUrl) {
    uploadPreviewImg.src = p.imageUrl;
    uploadPreviewImg.classList.remove('d-none');
    uploadPrompt.classList.add('d-none');
    document.querySelector('.image-upload-area .fa-cloud-arrow-up').classList.add('d-none');
  } else {
    uploadPreviewImg.src = '';
    uploadPreviewImg.classList.add('d-none');
    uploadPrompt.classList.remove('d-none');
    document.querySelector('.image-upload-area .fa-cloud-arrow-up').classList.remove('d-none');
  }

  productFormError.classList.add('d-none');
  productFormModal.classList.remove('d-none');
}

function closeFormModal() {
  productFormModal.classList.add('d-none');
}

// Handle Forms & Uploads
imageUploadArea.addEventListener('click', () => {
  prodImageFile.click();
});

prodImageFile.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Show a local loading preview
  const reader = new FileReader();
  reader.onload = (event) => {
    uploadPreviewImg.src = event.target.result;
    uploadPreviewImg.classList.remove('d-none');
    uploadPrompt.classList.add('d-none');
    document.querySelector('.image-upload-area .fa-cloud-arrow-up').classList.add('d-none');
  };
  reader.readAsDataURL(file);

  // Upload file immediately
  const formData = new FormData();
  formData.append('image', file);

  try {
    uploadPrompt.textContent = 'Uploading...';
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminState.token}`
      },
      body: formData
    });

    const data = await res.json();
    if (res.ok && data.imageUrl) {
      prodImageUrl.value = data.imageUrl;
      uploadPrompt.textContent = '點擊上傳圖片 (Click to Upload)';
    } else {
      throw new Error(data.error || 'Upload failed');
    }
  } catch (err) {
    console.error('Upload error:', err);
    alert('Failed to upload image: ' + err.message);
    uploadPrompt.textContent = '點擊上傳圖片 (Click to Upload)';
    uploadPreviewImg.classList.add('d-none');
    uploadPrompt.classList.remove('d-none');
    document.querySelector('.image-upload-area .fa-cloud-arrow-up').classList.remove('d-none');
  }
});

// Product Form Submit (Create or Update)
productCrudForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  productFormError.classList.add('d-none');

  const id = productEditId.value;
  
  // Construct all fields matching the screenshots
  const productData = {
    // Tab 1: Basic
    title: prodTitle.value,
    shortName: prodShortName.value,
    sku: prodSku.value,
    internalCode: prodInternalCode.value,
    brand: prodBrand.value,
    category: prodCategory.value,
    subcategory: prodSubcategory.value,
    price: parseFloat(prodPrice.value),
    originalPrice: prodOriginalPrice.value ? parseFloat(prodOriginalPrice.value) : null,
    unit: prodUnit.value,
    priceMode: prodPriceMode.value,
    imageUrl: prodImageUrl.value,
    
    // Tab 2: Publish & Logistics
    publishStatus: prodPublishStatus.checked,
    stockStatus: prodStockStatus.checked,
    memberOnly: prodMemberOnly.checked,
    allowCreditCard: prodAllowCc.checked,
    isVirtual: prodIsVirtual.checked,
    isNew: prodBadgeNew.checked,
    isRecommend: prodBadgeRecommend.checked,
    isSpecial: prodBadgeSpecial.checked,
    isHot: prodBadgeHot.checked,
    isPinned: prodBadgePinned.checked,
    showOnHomepage: prodBadgeHomepage.checked,
    sortOrder: parseInt(prodSortOrder.value) || 1000,
    soldCount: parseInt(prodSoldCount.value) || 0,
    diggCount: parseInt(prodDiggCount.value) || 0,
    
    shippingMethod: prodShippingMethod.value,
    freeShipping: prodFreeShipping.checked,
    minOrderQty: parseInt(prodMinOrder.value) || 1,
    weight: parseFloat(prodWeight.value) || 0,
    pkgLength: parseFloat(document.getElementById('prod-pkg-length').value) || 0,
    pkgWidth: parseFloat(document.getElementById('prod-pkg-width').value) || 0,
    pkgHeight: parseFloat(document.getElementById('prod-pkg-height').value) || 0,
    returnPolicy: prodReturnPolicy.value,

    // Tab 3: Features & Descriptions
    feature1: prodFeature1.value,
    feature2: prodFeature2.value,
    feature3: prodFeature3.value,
    feature4: prodFeature4.value,
    feature5: prodFeature5.value,
    overview: prodOverview.value,
    description: prodDetailsHtml.value, // Keep 'description' matching details for compatibility
    detailsHtml: prodDetailsHtml.value,

    // Tab 4: SEO & Variations
    metaTitle: prodMetaTitle.value,
    metaKeywords: prodMetaKeywords.value,
    metaDescription: prodMetaDescription.value,
    tags: prodTags.value,
    canonicalUrl: prodCanonicalUrl.value,
    sitemapWeight: parseFloat(prodSitemapWeight.value) || 0.7,
    sitemapFreq: prodSitemapFreq.value,
    googleShopping: prodGoogleShopping.checked,
    
    variationRole: prodVarRole.value,
    variationTheme: prodVarTheme.value,
    variationValue: prodVarValue.value,
    
    language: prodLanguage.value,
    version: prodVersion.value
  };

  const isEdit = !!id;
  const url = isEdit ? `/api/products/${id}` : '/api/products';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: method,
      headers: getAuthHeaders(),
      body: JSON.stringify(productData)
    });

    const data = await res.json();
    if (res.ok) {
      closeFormModal();
      initDashboard(); // Reload products
    } else {
      productFormError.textContent = data.error || 'Failed to save product';
      productFormError.classList.remove('d-none');
    }
  } catch (err) {
    console.error('Save product error:', err);
    productFormError.textContent = 'Network error, please try again.';
    productFormError.classList.remove('d-none');
  }
});

// Product Delete Action
async function handleDeleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
    return;
  }

  try {
    const res = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (res.ok) {
      initDashboard();
    } else {
      const data = await res.json();
      alert('Delete failed: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Delete error:', err);
    alert('Network error during deletion.');
  }
}

// Category Management Handlers
addCategoryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  categoryError.classList.add('d-none');
  
  const name = newCategoryName.value.trim();
  if (!name) return;

  try {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name })
    });

    const data = await res.json();
    if (res.ok) {
      newCategoryName.value = '';
      initDashboard();
    } else {
      categoryError.textContent = data.error || 'Failed to add category';
      categoryError.classList.remove('d-none');
    }
  } catch (err) {
    console.error('Add category error:', err);
    categoryError.textContent = 'Network error.';
    categoryError.classList.remove('d-none');
  }
});

async function handleDeleteCategory(name) {
  if (!confirm(`Are you sure you want to delete the category "${name}"? Products inside this category will be changed to "Uncategorized".`)) {
    return;
  }

  try {
    const res = await fetch('/api/categories', {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name })
    });

    if (res.ok) {
      initDashboard();
    } else {
      const data = await res.json();
      alert('Failed to delete category: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Delete category error:', err);
    alert('Network error.');
  }
}

// Search Product inside Table
adminSearch.addEventListener('input', (e) => {
  adminState.searchQuery = e.target.value;
  renderProducts();
});

// Login Handling
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('d-none');

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      adminState.token = data.token;
      localStorage.setItem('keydiy_admin_token', data.token);
      showLogin(false);
      initDashboard();
    } else {
      loginError.textContent = data.error || 'Invalid credentials';
      loginError.classList.remove('d-none');
    }
  } catch (err) {
    console.error('Login error:', err);
    loginError.textContent = 'Connection failed, please check your server.';
    loginError.classList.remove('d-none');
  }
});

// Logout Handling
logoutBtn.addEventListener('click', () => {
  adminState.token = '';
  localStorage.removeItem('keydiy_admin_token');
  showLogin(true);
});

// Tab Switcher Helper Function
function switchMainTab(activeTabId) {
  const tabs = [
    { btn: document.getElementById('tab-products'), content: document.getElementById('content-products'), name: 'products' },
    { btn: document.getElementById('tab-categories'), content: document.getElementById('content-categories'), name: 'categories' },
    { btn: document.getElementById('tab-orders'), content: document.getElementById('content-orders'), name: 'orders' },
    { btn: document.getElementById('tab-analytics'), content: document.getElementById('content-analytics'), name: 'analytics' },
    { btn: document.getElementById('tab-reviews'), content: document.getElementById('content-reviews'), name: 'reviews' }
  ];

  tabs.forEach(t => {
    if (!t.btn || !t.content) return;
    if (t.name === activeTabId) {
      t.btn.classList.add('active');
      t.content.classList.remove('d-none');
    } else {
      t.btn.classList.remove('active');
      t.content.classList.add('d-none');
    }
  });

  if (activeTabId === 'orders') loadAdminOrders();
  if (activeTabId === 'analytics') loadAdminAnalytics();
  if (activeTabId === 'reviews') loadAdminReviews();
}

// Tab Listeners
const tabProductsEl = document.getElementById('tab-products');
const tabCategoriesEl = document.getElementById('tab-categories');
const tabOrdersEl = document.getElementById('tab-orders');
const tabAnalyticsEl = document.getElementById('tab-analytics');
const tabReviewsEl = document.getElementById('tab-reviews');

if (tabProductsEl) tabProductsEl.addEventListener('click', () => switchMainTab('products'));
if (tabCategoriesEl) tabCategoriesEl.addEventListener('click', () => switchMainTab('categories'));
if (tabOrdersEl) tabOrdersEl.addEventListener('click', () => switchMainTab('orders'));
if (tabAnalyticsEl) tabAnalyticsEl.addEventListener('click', () => switchMainTab('analytics'));
if (tabReviewsEl) tabReviewsEl.addEventListener('click', () => switchMainTab('reviews'));

// Load Orders
async function loadAdminOrders() {
  const tbody = document.getElementById('admin-orders-list');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Loading orders...</td></tr>';

  try {
    const res = await fetch('/api/admin/orders');
    const orders = await res.json();

    if (!orders || orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 2rem;">No orders yet.</td></tr>';
      return;
    }

    tbody.innerHTML = orders.map(o => `
      <tr>
        <td style="font-weight: 600; font-family: monospace;">${o.id}</td>
        <td style="font-size: 0.85rem;">${(o.created_at || '').split('T')[0]}</td>
        <td>
          <div style="font-weight: 500;">${o.customerName || 'Guest'}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">${o.customerEmail || ''} ${o.customerPhone ? '| ' + o.customerPhone : ''}</div>
        </td>
        <td style="font-weight: 700; color: var(--accent-color);">$${(o.totalPrice || 0).toFixed(2)}</td>
        <td><span style="font-size: 0.8rem; background: var(--bg-tertiary); padding: 0.2rem 0.5rem; border-radius: 4px;">${o.shippingZone || 'Zone A'}</span></td>
        <td>
          <select onchange="updateOrderStatus('${o.id}', this.value)" style="background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--border-color); padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem;">
            <option value="paid" ${o.status === 'paid' ? 'selected' : ''}>Paid</option>
            <option value="pending_payment" ${o.status === 'pending_payment' ? 'selected' : ''}>Pending Payment</option>
            <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>Shipped</option>
            <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>Completed</option>
            <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
        <td>
          <button class="btn-secondary" style="padding: 0.25rem 0.6rem; font-size: 0.8rem;" onclick="alert('Customer Details:\\nName: ${o.customerName}\\nEmail: ${o.customerEmail}\\nPhone: ${o.customerPhone}\\nAddress: ${o.shippingAddress}\\nItems:\\n${(o.items||[]).map(i=>'- '+i.title+' x'+i.quantity).join('\\n')}')">Details</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--danger-color); padding: 2rem;">Failed to load orders.</td></tr>';
  }
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    loadAdminOrders();
  } catch (err) {
    alert('Failed to update status');
  }
}
window.updateOrderStatus = updateOrderStatus;

// Load Analytics
async function loadAdminAnalytics() {
  try {
    const res = await fetch('/api/admin/analytics');
    const data = await res.json();

    document.getElementById('kpi-sales').innerText = `$${(data.totalSales || 0).toFixed(2)}`;
    document.getElementById('kpi-orders').innerText = data.totalOrders || 0;
    document.getElementById('kpi-products').innerText = data.totalProducts || 0;
    document.getElementById('kpi-members').innerText = data.totalMembers || 0;
  } catch (err) {
    console.error('Failed to load analytics', err);
  }
}

// Load Reviews
async function loadAdminReviews() {
  const tbody = document.getElementById('admin-reviews-list');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">Loading reviews...</td></tr>';

  try {
    const res = await fetch('/api/admin/reviews');
    const reviews = await res.json();

    if (!reviews || reviews.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 2rem;">No customer reviews yet.</td></tr>';
      return;
    }

    tbody.innerHTML = reviews.map(r => `
      <tr>
        <td style="color: #f59e0b; font-size: 0.9rem;">${'★'.repeat(r.rating || 5)}${'☆'.repeat(5 - (r.rating || 5))}</td>
        <td>
          <div style="font-weight: 500;">${r.authorName || 'Anonymous'}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">${r.authorEmail || ''}</div>
        </td>
        <td>
          <div style="font-weight: 600; font-size: 0.85rem;">${r.title || ''}</div>
          <div style="font-size: 0.85rem; color: var(--text-secondary);">${r.comment || ''}</div>
        </td>
        <td style="font-size: 0.85rem;">${(r.created_at || '').split('T')[0]}</td>
        <td>
          <button class="btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; background: var(--danger-color); color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="deleteAdminReview('${r.id}')">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--danger-color); padding: 2rem;">Failed to load reviews.</td></tr>';
  }
}

async function deleteAdminReview(id) {
  if (!confirm('Are you sure you want to delete this review?')) return;
  try {
    await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
    loadAdminReviews();
  } catch (err) {
    alert('Failed to delete review');
  }
}
window.deleteAdminReview = deleteAdminReview;

// Form Modals Toggles
btnAddProduct.addEventListener('click', openAddModal);
formModalClose.addEventListener('click', closeFormModal);
btnCancelForm.addEventListener('click', closeFormModal);
productFormModal.querySelector('.modal-overlay').addEventListener('click', closeFormModal);

// Run Check & Initialization
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initFormTabs();
});
