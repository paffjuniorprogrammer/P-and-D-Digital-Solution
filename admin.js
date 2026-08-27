/* =========================================================
   P&D Digital Solutions — Admin Dashboard Logic (v3.1)
   Database-only content management
   ========================================================= */

let state = {
  contact: { whatsappNumber: '', whatsappMessage: '', email: '' },
  projects: [],
  offers: []
};

/* ---------- Toast Notification System ---------- */
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success' ? '✅' : (type === 'error' ? '⚠️' : 'ℹ️');
  toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
  
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

/* ---------- Resilient Supabase Helper with Timeout ---------- */
function withTimeout(promise, ms = 3000) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Network request timed out')), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

const ADMIN_API_URL = 'https://qizmvaqpgwrxwpzrhrmm.supabase.co/functions/v1/admin-content';
let adminToken = '';

async function callAdminApi(action, payload = {}, requiresAuth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (requiresAuth && adminToken) headers.Authorization = `Bearer ${adminToken}`;
  const response = await fetch(ADMIN_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...payload })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Admin request failed (${response.status})`);
  return result;
}

/* ---------- DOM Elements ---------- */
const loginScreen = document.getElementById('loginScreen');
const adminHeader = document.getElementById('adminHeader');
const dashboard = document.getElementById('dashboard');
const logoutBtn = document.getElementById('logoutBtn');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

/* ---------- Login Logic ---------- */

// Hash a string with SHA-256 using the browser's built-in Web Crypto API
async function sha256(str) {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Set login button to loading state
function setLoginLoading(loading) {
  loginBtn.disabled = loading;
  loginBtn.textContent = loading ? 'Verifying…' : 'Access Dashboard';
}

function showLoginError(msg) {
  loginError.style.display = 'block';
  loginError.textContent = msg;
  passwordInput.value = '';
  passwordInput.focus();
  loginError.classList.remove('shake');
  void loginError.offsetWidth; // reflow to restart animation
  loginError.classList.add('shake');
  setTimeout(() => loginError.classList.remove('shake'), 500);
}

async function tryLogin() {
  const val = passwordInput.value.trim();
  if (!val) {
    showLoginError('Please enter your password.');
    return;
  }

  setLoginLoading(true);

  try {
    const result = await callAdminApi('login', { password: val }, false);
    adminToken = result.token;
    loginError.style.display = 'none';
    await enterDashboard();
  } catch (err) {
    showLoginError('⚠️ ' + (err.message || String(err)));
    console.error('[Login] Exception:', err);
  } finally {
    setLoginLoading(false);
  }
}

loginBtn.addEventListener('click', tryLogin);
passwordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryLogin(); });

async function enterDashboard() {
  loginScreen.style.display = 'none';
  dashboard.style.display = '';
  adminHeader.style.display = 'block';
  dashboard.classList.add('show');
  
  await syncWithSupabase();
  renderContact();
  renderProjects();
  renderOffers();
  updateStats();
}

logoutBtn.addEventListener('click', () => {
  adminToken = '';
  loginScreen.style.display = 'flex';
  adminHeader.style.display = 'none';
  dashboard.classList.remove('show');
  dashboard.style.display = '';
  passwordInput.value = '';
  loginError.style.display = 'none';
  setTimeout(() => passwordInput.focus(), 200);
});

/* ---------- Tabs Navigation ---------- */
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

function switchTab(tabName) {
  tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });
  tabPanels.forEach(panel => {
    panel.classList.toggle('active', panel.id === `panel${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
  });
}

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    switchTab(btn.getAttribute('data-tab'));
  });
});

/* ---------- Contact Settings ---------- */
function renderContact() {
  document.getElementById('waNumber').value = state.contact.whatsappNumber || '';
  document.getElementById('waMessage').value = state.contact.whatsappMessage || '';
  document.getElementById('emailInput').value = state.contact.email || '';
}

document.getElementById('saveContactBtn').addEventListener('click', async () => {
  const num = document.getElementById('waNumber').value.trim();
  if (!num) {
    showToast('Please enter a valid WhatsApp number', 'error');
    return;
  }
  
  const nextContact = {
    whatsappNumber: num,
    whatsappMessage: document.getElementById('waMessage').value.trim(),
    email: document.getElementById('emailInput').value.trim()
  };

  try {
    await Promise.all([
      callAdminApi('contact.upsert', { record: { key: 'whatsappNumber', value: nextContact.whatsappNumber } }),
      callAdminApi('contact.upsert', { record: { key: 'whatsappMessage', value: nextContact.whatsappMessage } }),
      callAdminApi('contact.upsert', { record: { key: 'email', value: nextContact.email } })
    ]);
    state.contact = nextContact;
    renderContact();
    showToast('Contact settings saved to database!', 'success');
  } catch (err) {
    showToast('Contact settings were not saved: ' + err.message, 'error');
  }
});

/* ---------- Projects Management ---------- */
const projectsList = document.getElementById('projectsList');
const searchInput = document.getElementById('searchInput');
const saveProjectBtn = document.getElementById('saveProjectBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editingIdInput = document.getElementById('editingId');
const formEyebrow = document.getElementById('formEyebrow');
const formTitle = document.getElementById('formTitle');

searchInput.addEventListener('input', (e) => {
  renderProjects(e.target.value.trim().toLowerCase());
});

function updateStats() {
  document.getElementById('statTotal').textContent = state.projects.length;
  const liveCount = state.projects.filter(p => p.url && p.url !== '#' && /^https?:\/\//i.test(p.url)).length;
  document.getElementById('statLive').textContent = liveCount;
  
  const activeOffersCount = state.offers.filter(o => o.isActive).length;
  document.getElementById('statOffers').textContent = activeOffersCount;
  document.getElementById('activeOffersBadge').textContent = activeOffersCount;
}

function renderProjects(filter = '') {
  const filtered = state.projects.filter(p => {
    if (!filter) return true;
    return p.title.toLowerCase().includes(filter) || (p.tag && p.tag.toLowerCase().includes(filter));
  });

  document.getElementById('projectsCountLabel').textContent = `${filtered.length} item${filtered.length === 1 ? '' : 's'}`;
  document.getElementById('emptyNote').style.display = filtered.length === 0 ? 'block' : 'none';

  projectsList.innerHTML = filtered.map(p => `
    <div class="item-card">
      <div class="item-main">
        <div class="item-tags">
          <span class="tag-pill">${escapeHtml(p.tag || 'Web')}</span>
          ${p.imageUrl ? '<span class="status-pill active">📷 Custom Image Set</span>' : '<span class="status-pill active">🌐 Auto Live Screenshot</span>'}
        </div>
        <h4 class="item-title">${escapeHtml(p.title)}</h4>
        <p class="item-desc">${escapeHtml(p.description || 'No description provided.')}</p>
        <a href="${escapeHtml(p.url)}" target="_blank" class="soft hint" style="font-size: 0.8rem;">🔗 ${escapeHtml(p.url)}</a>
      </div>
      <div class="item-actions">
        <button class="btn btn-light btn-sm" onclick="startEditProject('${p.id}')">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProject('${p.id}')">🗑️ Delete</button>
      </div>
    </div>
  `).join('');
}

function startEditProject(id) {
  const p = state.projects.find(x => String(x.id) === String(id));
  if (!p) return;

  editingIdInput.value = p.id;
  document.getElementById('pTitle').value = p.title || '';
  document.getElementById('pTag').value = p.tag || 'Web';
  document.getElementById('pDescription').value = p.description || '';
  document.getElementById('pUrl').value = p.url || '';
  document.getElementById('pImageUrl').value = p.imageUrl || '';

  formEyebrow.textContent = 'Edit project';
  formTitle.textContent = p.title;
  saveProjectBtn.querySelector('.btn-text').textContent = 'Save changes';
  cancelEditBtn.style.display = 'inline-flex';
  
  switchTab('projects');
  document.getElementById('pTitle').focus();
}

function resetProjectForm() {
  editingIdInput.value = '';
  document.getElementById('pTitle').value = '';
  document.getElementById('pTag').value = 'Web';
  document.getElementById('pDescription').value = '';
  document.getElementById('pUrl').value = '';
  document.getElementById('pImageUrl').value = '';

  formEyebrow.textContent = 'Add a project';
  formTitle.textContent = 'New project';
  saveProjectBtn.querySelector('.btn-text').textContent = 'Add project';
  cancelEditBtn.style.display = 'none';
}

cancelEditBtn.addEventListener('click', resetProjectForm);

async function deleteProject(id) {
  if (!confirm('Are you sure you want to delete this project?')) return;

  try {
    await callAdminApi('projects.delete', { id });
    await syncWithSupabase();
    renderProjects();
    updateStats();
    showToast('Project deleted successfully', 'success');
  } catch (err) {
    showToast('Project database delete failed: ' + err.message, 'error');
  }
}

saveProjectBtn.addEventListener('click', async () => {
  const title = document.getElementById('pTitle').value.trim();
  const url = document.getElementById('pUrl').value.trim();

  if (!title || !url) {
    showToast('Please enter both a title and project URL link', 'error');
    return;
  }

  const projectData = {
    title,
    tag: document.getElementById('pTag').value,
    description: document.getElementById('pDescription').value.trim(),
    url,
    imageUrl: document.getElementById('pImageUrl').value.trim()
  };

  const editingId = editingIdInput.value;
  const record = { id: editingId || 'p_' + Date.now(), ...projectData };

  try {
    await callAdminApi('projects.upsert', { record });
    await syncWithSupabase();
    renderProjects();
    updateStats();
    resetProjectForm();
    showToast(editingId ? 'Project changes saved successfully!' : 'New project published successfully!', 'success');
  } catch (err) {
    showToast('Project database save failed: ' + err.message, 'error');
  }
});

/* ---------- Weekend Offers Management ---------- */
const offersList = document.getElementById('offersList');
const saveOfferBtn = document.getElementById('saveOfferBtn');
const cancelOfferEditBtn = document.getElementById('cancelOfferEditBtn');
const editingOfferIdInput = document.getElementById('editingOfferId');

function renderOffers() {
  const count = state.offers.length;
  document.getElementById('offersCountLabel').textContent = `${count} item${count === 1 ? '' : 's'}`;
  document.getElementById('emptyOffersNote').style.display = count === 0 ? 'block' : 'none';

  offersList.innerHTML = state.offers.map(o => {
    const featuresList = (o.features || []).map(f => `<span class="feature-chip">✓ ${escapeHtml(f)}</span>`).join('');
    return `
      <div class="item-card">
        <div class="item-main">
          <div class="item-tags">
            <span class="price-pill">💰 ${escapeHtml(o.priceRange || '$150 – $350')}</span>
            <span class="tag-pill" style="background: rgba(249, 115, 22, 0.15); color: #ff9d5c;">${escapeHtml(o.badge || 'Weekend Offer')}</span>
            <span class="status-pill ${o.isActive ? 'active' : 'inactive'}">${o.isActive ? '● Active on Site' : '○ Inactive'}</span>
          </div>
          <h4 class="item-title">${escapeHtml(o.title)}</h4>
          <p class="item-desc">${escapeHtml(o.description || '')}</p>
          <div class="item-features-list">${featuresList}</div>
        </div>
        <div class="item-actions">
          <button class="btn btn-ghost-dark btn-sm" onclick="toggleOfferActive('${o.id}')">${o.isActive ? 'Pause' : 'Activate'}</button>
          <button class="btn btn-light btn-sm" onclick="startEditOffer('${o.id}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteOffer('${o.id}')">🗑️ Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

function startEditOffer(id) {
  const o = state.offers.find(x => String(x.id) === String(id));
  if (!o) return;

  editingOfferIdInput.value = o.id;
  document.getElementById('oTitle').value = o.title || '';
  document.getElementById('oBadge').value = o.badge || '';
  document.getElementById('oPriceRange').value = o.priceRange || '';
  document.getElementById('oDescription').value = o.description || '';
  document.getElementById('oFeatures').value = (o.features || []).join(', ');
  document.getElementById('oIsActive').checked = !!o.isActive;

  document.getElementById('offerFormEyebrow').textContent = 'Edit promotion';
  document.getElementById('offerFormTitle').textContent = o.title;
  saveOfferBtn.querySelector('.btn-text').textContent = 'Save offer changes';
  cancelOfferEditBtn.style.display = 'inline-flex';
  
  switchTab('offers');
  document.getElementById('oTitle').focus();
}

function resetOfferForm() {
  editingOfferIdInput.value = '';
  document.getElementById('oTitle').value = '';
  document.getElementById('oBadge').value = '🔥 Weekend Special';
  document.getElementById('oPriceRange').value = '';
  document.getElementById('oDescription').value = '';
  document.getElementById('oFeatures').value = '';
  document.getElementById('oIsActive').checked = true;

  document.getElementById('offerFormEyebrow').textContent = 'Post Special Promotion';
  document.getElementById('offerFormTitle').textContent = 'New Weekend Offer';
  saveOfferBtn.querySelector('.btn-text').textContent = 'Publish Offer';
  cancelOfferEditBtn.style.display = 'none';
}

cancelOfferEditBtn.addEventListener('click', resetOfferForm);

async function toggleOfferActive(id) {
  const offer = state.offers.find(item => String(item.id) === String(id));
  if (!offer) return;

  const record = { ...offer, isActive: !offer.isActive };
  try {
    await callAdminApi('offers.upsert', { record });
    await syncWithSupabase();
    renderOffers();
    updateStats();
    showToast(`Offer ${record.isActive ? 'activated' : 'paused'}`, 'info');
  } catch (err) {
    showToast('Offer status was not saved: ' + err.message, 'error');
  }
}

async function deleteOffer(id) {
  if (!confirm('Are you sure you want to delete this offer?')) return;

  try {
    await callAdminApi('offers.delete', { id });
    await syncWithSupabase();
    renderOffers();
    updateStats();
    showToast('Offer deleted successfully', 'success');
  } catch (e) {
    showToast('Offer database delete failed: ' + e.message, 'error');
  }
}

saveOfferBtn.addEventListener('click', async () => {
  const title = document.getElementById('oTitle').value.trim();
  const priceRange = document.getElementById('oPriceRange').value.trim();

  if (!title || !priceRange) {
    showToast('Please enter both an offer title and price range', 'error');
    return;
  }

  const featuresText = document.getElementById('oFeatures').value;
  const features = featuresText ? featuresText.split(',').map(s => s.trim()).filter(Boolean) : [];

  const offerData = {
    title,
    badge: document.getElementById('oBadge').value.trim() || '🔥 Weekend Promotion',
    priceRange,
    description: document.getElementById('oDescription').value.trim(),
    features,
    isActive: document.getElementById('oIsActive').checked
  };

  const editingId = editingOfferIdInput.value;
  const record = { id: editingId || 'off_' + Date.now(), ...offerData };

  try {
    await callAdminApi('offers.upsert', { record });
    await syncWithSupabase();
    renderOffers();
    updateStats();
    resetOfferForm();
    showToast(editingId ? 'Offer changes saved successfully!' : 'Weekend Offer published successfully!', 'success');
  } catch (err) {
    showToast('Offer database save failed: ' + err.message, 'error');
  }
});

/* ---------- Supabase Sync Initializer ---------- */
async function syncWithSupabase() {
  if (!adminToken) return;
  try {
    const projectsResult = await callAdminApi('projects.list');
    if (projectsResult.data) {
      state.projects = projectsResult.data;
      renderProjects();
      updateStats();
    }
  } catch (e) {
    showToast('Could not load database projects: ' + e.message, 'error');
  }

  try {
    const offersResult = await callAdminApi('offers.list');
    if (offersResult.data) {
      state.offers = offersResult.data;
      renderOffers();
      updateStats();
    }
  } catch (e) {
    showToast('Could not load database offers: ' + e.message, 'error');
  }

  try {
    const contactResult = await callAdminApi('contact.list');
    const contact = Object.fromEntries((contactResult.data || []).map(row => [row.key, row.value]));
    if (Object.keys(contact).length) {
      state.contact = { ...state.contact, ...contact };
      renderContact();
    }
  } catch (e) {
    showToast('Could not load database contact settings: ' + e.message, 'error');
  }
}

/* ---------- Utility Helpers ---------- */
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.getElementById('adminYear').textContent = new Date().getFullYear();

// Content and authentication are intentionally not restored from browser storage.
loginScreen.style.display = 'flex';
adminHeader.style.display = 'none';
dashboard.style.display = 'none';
setTimeout(() => passwordInput.focus(), 300);
