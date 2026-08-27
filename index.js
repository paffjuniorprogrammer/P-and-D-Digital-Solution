/*
   P&D Digital Solutions — Public Website Logic
   Database-only content hydration
   ========================================================= */

const DATA_LOAD_TIMEOUT = 10000;
const CONFIG = {
  whatsappNumber: '',
  whatsappMessage: '',
  email: ''
};
let PROJECTS = [];
let OFFERS = [];
let contentStatus = 'loading';

function withTimeout(promise, ms = DATA_LOAD_TIMEOUT) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Database request timed out')), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeProjectUrl(url) {
  const value = String(url || '').trim();
  if (!value || value === '#') return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (/^(www\.)?[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9-]+)+(?::\d+)?(?:[/?#].*)?$/i.test(value)) {
    return 'https://' + value;
  }
  return value;
}

function isRealLink(url) {
  return /^https?:\/\//i.test(normalizeProjectUrl(url));
}

function getProjectHost(url) {
  try {
    return new URL(url).host;
  } catch (_) {
    return '';
  }
}

function getPrimaryThumb(project) {
  if (project.imageUrl && /^https?:\/\//i.test(project.imageUrl)) {
    return project.imageUrl;
  }
  const projectUrl = normalizeProjectUrl(project.url);
  return isRealLink(projectUrl)
    ? 'https://image.thum.io/get/width/800/crop/600/noanimate/' + projectUrl
    : '';
}

function getSecondaryThumb(project) {
  const projectUrl = normalizeProjectUrl(project.url);
  return isRealLink(projectUrl)
    ? 'https://s.wordpress.com/mshots/v1/' + encodeURIComponent(projectUrl) + '?w=800&h=500'
    : '';
}

function getTertiaryThumb(project) {
  const projectUrl = normalizeProjectUrl(project.url);
  return isRealLink(projectUrl)
    ? 'https://image.thum.io/get/width/800/' + projectUrl
    : '';
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function applyContactConfig() {
  const number = String(CONFIG.whatsappNumber || '').trim();
  const message = String(CONFIG.whatsappMessage || '').trim();
  const email = String(CONFIG.email || '').trim();
  const hasWhatsApp = Boolean(number);
  const hasEmail = Boolean(email);

  const waLink = hasWhatsApp
    ? 'https://wa.me/' + number.replace(/\D/g, '') + '?text=' + encodeURIComponent(message)
    : '#';
  ['waNavBtn', 'waContactBtn'].forEach(id => {
    const element = document.getElementById(id);
    if (!element) return;
    element.href = waLink;
    element.setAttribute('aria-disabled', String(!hasWhatsApp));
    element.classList.toggle('is-disabled', !hasWhatsApp);
  });
  setText('waDisplay', hasWhatsApp ? '+' + number.replace(/^\+/, '') : 'Contact number unavailable');

  const emailLinks = document.querySelectorAll('a[href^="mailto:"], #emailContactBtn');
  emailLinks.forEach(link => {
    if (hasEmail) {
      link.href = 'mailto:' + email;
      link.textContent = 'Email ' + email;
      link.removeAttribute('aria-disabled');
      link.classList.remove('is-disabled');
    } else {
      link.removeAttribute('href');
      link.textContent = 'Email unavailable';
      link.setAttribute('aria-disabled', 'true');
      link.classList.add('is-disabled');
    }
  });
  setText('emailDisplay', hasEmail ? email : 'Email unavailable');
}

function renderProjectsGrid() {
  const grid = document.getElementById('projectsGrid');
  if (!grid) return;

  if (contentStatus === 'loading') {
    grid.innerHTML = '<div class="content-state">Loading projects from the database…</div>';
    return;
  }
  if (contentStatus === 'error') {
    grid.innerHTML = '<div class="content-state content-state--error">Projects are temporarily unavailable. Please try again later.</div>';
    return;
  }
  if (PROJECTS.length === 0) {
    grid.innerHTML = '<div class="content-state">No projects have been published yet.</div>';
    return;
  }

  grid.innerHTML = PROJECTS.map(project => {
    const projectUrl = normalizeProjectUrl(project.url);
    const hasLink = isRealLink(projectUrl);
    const cardClass = hasLink ? 'project-card' : 'project-card placeholder';
    const primaryImg = getPrimaryThumb(project);
    const secondaryImg = getSecondaryThumb(project);
    const tertiaryImg = getTertiaryThumb(project);
    const domainHost = getProjectHost(projectUrl);
    const title = escapeHtml(project.title || 'Untitled project');
    const imageMarkup = primaryImg
      ? `<div class="browser-bar" aria-hidden="true">
           <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
           <span class="browser-url">${escapeHtml(domainHost)}</span>
         </div>
         <div class="thumb-skeleton"></div>
         <img src="${escapeHtml(primaryImg)}"
              alt="Live website screenshot of ${title}"
              loading="lazy"
              decoding="async"
              onload="this.previousElementSibling.style.display='none'; this.style.opacity='1';"
              style="opacity:0; transition: opacity 0.4s ease;"
              onerror="if(!this.dataset.step){ this.dataset.step='1'; this.src='${escapeHtml(secondaryImg)}'; } else if(this.dataset.step==='1'){ this.dataset.step='2'; this.src='${escapeHtml(tertiaryImg)}'; } else { this.onerror=null; this.style.display='none'; this.previousElementSibling.style.display='none'; this.nextElementSibling.style.display='flex'; }">
         <div class="preview-unavailable" style="display:none">Live preview unavailable</div>`
      : `<div class="no-preview"><span>Preview unavailable</span></div>`;

    return `<a class="${cardClass}" href="${hasLink ? escapeHtml(projectUrl) : '#'}" target="_blank" rel="noopener">
      <div class="project-thumb">
        <span class="project-tag">${escapeHtml(project.tag || 'Web')}</span>
        ${imageMarkup}
      </div>
      <div class="project-body">
        <div><h3>${title}</h3><p>${escapeHtml(project.description || '')}</p></div>
        <span class="project-link">View project
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M7 17 17 7M7 7h10v10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
      </div>
    </a>`;
  }).join('');
}

function renderOffersGrid() {
  const grid = document.getElementById('offersGrid');
  if (!grid) return;

  if (contentStatus === 'loading') {
    grid.innerHTML = '<div class="content-state">Loading offers from the database…</div>';
    return;
  }
  if (contentStatus === 'error') {
    grid.innerHTML = '<div class="content-state content-state--error">Offers are temporarily unavailable. Please try again later.</div>';
    return;
  }

  const activeOffers = OFFERS.filter(offer => offer.isActive !== false);
  if (activeOffers.length === 0) {
    grid.innerHTML = '<div class="content-state">No active offers are available right now.</div>';
    return;
  }

  grid.innerHTML = activeOffers.map((offer, index) => {
    const featuresMarkup = (Array.isArray(offer.features) ? offer.features : []).map(feature => `
      <li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>${escapeHtml(feature)}</li>
    `).join('');
    const promoMessage = `Hello P&D Digital Solutions! I am interested in claiming your offer: ${offer.title} (${offer.priceRange || ''}).`;
    const offerUrl = CONFIG.whatsappNumber
      ? 'https://wa.me/' + String(CONFIG.whatsappNumber).replace(/\D/g, '') + '?text=' + encodeURIComponent(promoMessage)
      : '#';
    const featured = index === 0;

    return `<div class="promo-card${featured ? ' featured' : ''}">
      <span class="promo-badge-tag">${escapeHtml(offer.badge || 'Offer')}</span>
      <h3 class="promo-title">${escapeHtml(offer.title || '')}</h3>
      <div class="promo-price-wrap"><div class="promo-price-label">Offer Amount Range</div><div class="promo-price-val">${escapeHtml(offer.priceRange || '')}</div></div>
      <p class="promo-desc">${escapeHtml(offer.description || '')}</p>
      <ul class="promo-features-list">${featuresMarkup}</ul>
      <a href="${escapeHtml(offerUrl)}" target="_blank" rel="noopener" class="btn ${featured ? 'btn-primary' : 'btn-ghost-dark'} promo-cta-btn">Claim Offer via WhatsApp &rarr;</a>
    </div>`;
  }).join('');
}

async function loadPublicContent() {
  try {
    if (!window.db) throw new Error('Database client is not available');

    const [projectsResult, offersResult, contactResult] = await Promise.all([
      withTimeout(window.db.from('projects').select('*').order('created_at', { ascending: false })),
      withTimeout(window.db.from('offers').select('*').eq('isActive', true).order('created_at', { ascending: false })),
      withTimeout(window.db.from('public_contact_settings').select('key,value').limit(20))
    ]);

    if (projectsResult.error) throw projectsResult.error;
    if (offersResult.error) throw offersResult.error;
    if (contactResult.error) throw contactResult.error;

    PROJECTS = Array.isArray(projectsResult.data) ? projectsResult.data : [];
    OFFERS = Array.isArray(offersResult.data) ? offersResult.data : [];
    Object.assign(CONFIG, Object.fromEntries((contactResult.data || []).map(row => [row.key, row.value])));
    contentStatus = 'ready';
    applyContactConfig();
    renderProjectsGrid();
    renderOffersGrid();
  } catch (error) {
    contentStatus = 'error';
    console.error('[Public content] Database load failed:', error);
    applyContactConfig();
    renderProjectsGrid();
    renderOffersGrid();
  }
}

setText('footerYear', '© ' + new Date().getFullYear() + ' P&D Digital Solutions. All rights reserved.');
applyContactConfig();
renderProjectsGrid();
renderOffersGrid();
loadPublicContent();

const stripTrack = document.getElementById('stripTrack');
if (stripTrack) {
  const stripItems = ['Websites', 'Web apps', 'Full-stack systems', 'Digital transformation advisory', 'Google Business Profile setup', 'Social media management'];
  const stripHtml = stripItems.map(item => `<span>${item}</span><span aria-hidden="true">·</span>`).join('');
  stripTrack.innerHTML = stripHtml + stripHtml;
}

const menuToggle = document.getElementById('menuToggle');
const mobileMenu = document.getElementById('mobileMenu');
if (menuToggle && mobileMenu) {
  const desktopNav = document.querySelector('.nav-inner nav.links');
  if (desktopNav) mobileMenu.innerHTML = desktopNav.innerHTML;
  menuToggle.addEventListener('click', () => {
    const open = mobileMenu.style.display === 'flex';
    mobileMenu.style.display = open ? 'none' : 'flex';
    menuToggle.setAttribute('aria-expanded', String(!open));
  });
  mobileMenu.addEventListener('click', event => {
    if (event.target.tagName === 'A') mobileMenu.style.display = 'none';
  });
}

const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(element => observer.observe(element));
} else {
  revealEls.forEach(element => element.classList.add('in'));
}
