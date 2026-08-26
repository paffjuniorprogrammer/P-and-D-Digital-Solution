/* =========================================================
   P&D Digital Solutions — Main Website Logic (v3.3)
   Multi-Fallback Live Screenshot Engine & Instant Rendering
   ========================================================= */

// Default Fallbacks
const DEFAULT_CONFIG = {
  whatsappNumber: "250780000000",
  whatsappMessage: "Hello P&D Digital Solutions, I'd like to discuss a project.",
  email: "paffdaddy06@gmail.com"
};

const DEFAULT_PROJECTS = [
  { 
    id: "p1", 
    title: "Advanced Luxe Line Ltd", 
    tag: "Web", 
    description: "Advanced Luxe Line Ltd is a hospitality and relaxation establishment in Musanze, Rwanda, offering luxury rooms, a sauna and massage center, pool snooker, and a dining spot known for nyama choma and chilled drinks.", 
    url: "https://advancedluxeline.com", 
    imageUrl: "" 
  },
  { 
    id: "p2", 
    title: "Corporate Enterprise Portal", 
    tag: "System", 
    description: "Full-stack client management portal with real-time analytics, booking management, and automated invoicing.", 
    url: "https://example.com", 
    imageUrl: "" 
  },
  { 
    id: "p3", 
    title: "Modern SaaS Web Application", 
    tag: "App", 
    description: "Responsive web application with interactive user dashboard, payment gateway, and role permissions.", 
    url: "https://example.com", 
    imageUrl: "" 
  }
];

const DEFAULT_OFFERS = [
  {
    id: "off1",
    title: "Weekend Promotion: Custom Business Website",
    badge: "🔥 Weekend Special",
    priceRange: "$150 – $350",
    description: "We build high-performance custom websites for amount up to amount to make your business perfect for clients.",
    features: [
      "Full Responsive Mobile & Desktop Design",
      "Fast Page Load & Google SEO Setup",
      "Direct WhatsApp & Contact Form Integration",
      "Custom Domain & Free Hosting Setup",
      "1 Month Free Technical Support"
    ],
    isActive: true
  }
];

// Helper: Timeout wrapper for Supabase requests
function withTimeout(promise, ms = 2500) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Timeout')), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

// Read config & state from Local Storage if modified in Admin Panel
function getLocalState() {
  try {
    const raw = localStorage.getItem("pnd_admin_state_v1");
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Using default site configuration");
  }
  return {};
}

const localState = getLocalState();
const CONFIG = { ...DEFAULT_CONFIG, ...(localState.contact || {}) };
let PROJECTS = (localState.projects && localState.projects.length > 0) ? localState.projects : DEFAULT_PROJECTS;
let OFFERS = (localState.offers && localState.offers.length > 0) ? localState.offers : DEFAULT_OFFERS;

// Set Footer Year & Contact Links
document.getElementById('footerYear').textContent = "© " + new Date().getFullYear() + " P&D Digital Solutions. All rights reserved.";

const waLink = "https://wa.me/" + CONFIG.whatsappNumber + "?text=" + encodeURIComponent(CONFIG.whatsappMessage);
if (document.getElementById('waNavBtn')) document.getElementById('waNavBtn').href = waLink;
if (document.getElementById('waContactBtn')) document.getElementById('waContactBtn').href = waLink;
if (document.getElementById('waDisplay')) document.getElementById('waDisplay').textContent = "+" + CONFIG.whatsappNumber;

// Build marquee strip
const stripItems = ["Websites", "Web apps", "Full-stack systems", "Digital transformation advisory", "Google Business Profile setup", "Social media management"];
const stripTrack = document.getElementById('stripTrack');
if (stripTrack) {
  const stripHtml = stripItems.map(i => `<span>${i}</span><span aria-hidden="true">·</span>`).join('');
  stripTrack.innerHTML = stripHtml + stripHtml;
}

// Thumbnail helpers
function isRealLink(url) {
  return url && url !== "#" && /^https?:\/\//i.test(url);
}

function getPrimaryThumb(p) {
  // Use custom image if provided by admin
  if (p.imageUrl && /^https?:\/\//i.test(p.imageUrl)) {
    return p.imageUrl;
  }
  if (isRealLink(p.url)) {
    // Primary: image.thum.io — free, no API key needed, reliable
    return "https://image.thum.io/get/width/800/crop/600/noanimate/" + p.url;
  }
  return "";
}

function getSecondaryThumb(p) {
  if (isRealLink(p.url)) {
    // Secondary: WordPress mshots — free, no API key needed
    return "https://s.wordpress.com/mshots/v1/" + encodeURIComponent(p.url) + "?w=800&h=500";
  }
  return "";
}

function getTertiaryThumb(p) {
  if (isRealLink(p.url)) {
    // Tertiary: thum.io alternate format
    return "https://image.thum.io/get/width/800/" + p.url;
  }
  return "";
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ---------- Render Projects Grid ---------- */
const grid = document.getElementById('projectsGrid');

function renderProjectsGrid() {
  if (!grid) return;

  const displayList = (PROJECTS && PROJECTS.length > 0) ? PROJECTS : DEFAULT_PROJECTS;

  grid.innerHTML = displayList.map(p => {
    const hasLink = isRealLink(p.url);
    const cardClass = hasLink ? "project-card" : "project-card placeholder";
    const primaryImg = getPrimaryThumb(p);
    const secondaryImg = getSecondaryThumb(p);
    const tertiaryImg = getTertiaryThumb(p);
    const fallbackTechImg = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop";
    const domainHost = hasLink ? p.url.replace(/^https?:\/\//i, '').split('/')[0] : 'website.com';

    const thumb = hasLink
      ? `<div class="browser-bar" aria-hidden="true">
           <span class="dot red"></span>
           <span class="dot yellow"></span>
           <span class="dot green"></span>
           <span class="browser-url">https://${domainHost}</span>
         </div>
         <div class="thumb-skeleton"></div>
         <img src="${primaryImg}" 
              alt="Live website screenshot of ${escapeHtml(p.title)}" 
              loading="eager"
              decoding="async"
              onload="this.previousElementSibling.style.display='none'; this.style.opacity='1';"
              style="opacity:0; transition: opacity 0.4s ease;"
              onerror="if(!this.dataset.step){ this.dataset.step='1'; this.src='${secondaryImg}'; } else if(this.dataset.step==='1'){ this.dataset.step='2'; this.src='${tertiaryImg}'; } else if(this.dataset.step==='2'){ this.dataset.step='3'; this.onerror=null; this.previousElementSibling.style.display='none'; this.src='${fallbackTechImg}'; this.style.opacity='1'; }">`
      : `<div class="no-preview">
           <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M3 9h18" stroke="currentColor" stroke-width="1.6"/></svg>
           <span>Add a link to preview</span>
         </div>`;

    return `
    <a class="${cardClass}" href="${p.url}" target="_blank" rel="noopener">
      <div class="project-thumb">
        <span class="project-tag">${escapeHtml(p.tag || 'Web')}</span>
        ${thumb}
      </div>
      <div class="project-body">
        <div>
          <h3>${escapeHtml(p.title)}</h3>
          <p>${escapeHtml(p.description || '')}</p>
        </div>
        <span class="project-link">
          View project
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M7 17 17 7M7 7h10v10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
      </div>
    </a>
  `;
  }).join('');
}

// Instant synchronous render!
renderProjectsGrid();

// Background Supabase sync
async function loadProjectsFromSupabase() {
  try {
    if (window.db) {
      const { data, error } = await withTimeout(
        window.db.from('projects').select('*').order('created_at', { ascending: false }),
        2500
      );

      if (!error && data && data.length > 0) {
        PROJECTS = data;
        renderProjectsGrid();
      }
    }
  } catch (e) {
    console.log("Using local/default projects list");
  }
}
loadProjectsFromSupabase();

/* ---------- Render Special Offers Grid ---------- */
const offersGrid = document.getElementById('offersGrid');

function renderOffersGrid() {
  if (!offersGrid) return;

  const activeOffers = (OFFERS && OFFERS.length > 0) ? OFFERS.filter(o => o.isActive !== false) : DEFAULT_OFFERS;

  if (activeOffers.length === 0) {
    offersGrid.innerHTML = `
      <div class="promo-card featured">
        <span class="promo-badge-tag">🔥 Weekend Promotion</span>
        <h3 class="promo-title">Custom Business Website Package</h3>
        <div class="promo-price-wrap">
          <div class="promo-price-label">Promotional Package Price</div>
          <div class="promo-price-val">$150 – $350</div>
        </div>
        <p class="promo-desc">We build custom responsive websites for amount up to amount to make your business perfect for clients and boost your online presence.</p>
        <ul class="promo-features-list">
          <li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Full Responsive Mobile &amp; Desktop Design</li>
          <li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Ultra Fast Page Loading &amp; SEO Setup</li>
          <li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> WhatsApp Direct Chat &amp; Contact Integration</li>
          <li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> 1 Month Free Technical Support</li>
        </ul>
        <a href="${waLink}" target="_blank" class="btn btn-primary promo-cta-btn">Claim Weekend Deal via WhatsApp &rarr;</a>
      </div>
    `;
    return;
  }

  offersGrid.innerHTML = activeOffers.map((o, idx) => {
    const isFeatured = idx === 0;
    const cardClass = isFeatured ? "promo-card featured" : "promo-card";
    const featuresMarkup = (o.features || []).map(f => `
      <li>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        ${escapeHtml(f)}
      </li>
    `).join('');

    const promoWaMessage = `Hello P&D Digital Solutions! I am interested in claiming your offer: ${o.title} (${o.priceRange || ''}).`;
    const offerWaUrl = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(promoWaMessage)}`;

    return `
      <div class="${cardClass}">
        <span class="promo-badge-tag">${escapeHtml(o.badge || '🔥 Weekend Special')}</span>
        <h3 class="promo-title">${escapeHtml(o.title)}</h3>
        <div class="promo-price-wrap">
          <div class="promo-price-label">Offer Amount Range</div>
          <div class="promo-price-val">${escapeHtml(o.priceRange || '$150 – $350')}</div>
        </div>
        <p class="promo-desc">${escapeHtml(o.description || 'We build custom websites for amount up to amount to make your business perfect for clients.')}</p>
        <ul class="promo-features-list">
          ${featuresMarkup}
        </ul>
        <a href="${offerWaUrl}" target="_blank" class="btn ${isFeatured ? 'btn-primary' : 'btn-ghost-dark'} promo-cta-btn">Claim Offer via WhatsApp &rarr;</a>
      </div>
    `;
  }).join('');
}

// Instant synchronous render!
renderOffersGrid();

// Background Supabase sync
async function loadOffersFromSupabase() {
  try {
    if (window.db) {
      const { data, error } = await withTimeout(
        window.db.from('offers').select('*').eq('isActive', true).order('created_at', { ascending: false }),
        2500
      );

      if (!error && data && data.length > 0) {
        OFFERS = data;
        renderOffersGrid();
      }
    }
  } catch (e) {
    console.log("Using local/default offers list");
  }
}
loadOffersFromSupabase();

/* ---------- Mobile Menu ---------- */
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
  mobileMenu.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') { mobileMenu.style.display = 'none'; }
  });
}

/* ---------- Scroll Reveal ---------- */
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => io.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('in'));
}
