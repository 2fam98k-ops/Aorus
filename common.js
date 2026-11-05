/* Shared helpers: data loading, theme, header/footer, generated artwork */
const DRAFT_KEY = 'vypra_draft';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function loadData() {
  try {
    const d = localStorage.getItem(DRAFT_KEY);
    if (d) { window.__draft = true; return JSON.parse(d); }
  } catch (e) { /* ignore */ }
  const r = await fetch('data/site.json', { cache: 'no-store' });
  return r.json();
}

function applyTheme(data) {
  const t = data.theme || {};
  const root = document.documentElement.style;
  ['primary', 'secondary', 'bg', 'surface', 'text', 'muted'].forEach(k => { if (t[k]) root.setProperty('--' + k, t[k]); });
  document.title = (data.brand?.name || 'Store') + ' — ' + (data.brand?.tagline || '');
}

let _artN = 0;
/* Original generated artwork (no third-party imagery). kind: motherboards | graphics | monitors | memory */
function artSvg(kind = 'motherboards', seed = 0) {
  const id = 'a' + (++_artN);
  const defs = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--secondary)"/><stop offset="1" stop-color="var(--primary)"/></linearGradient>
  <filter id="${id}f"><feGaussianBlur stdDeviation="3"/></filter></defs>`;
  const g = `url(#${id})`;
  const o = (seed * 13) % 20;
  if (kind === 'graphics') {
    return `<svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg">${defs}
    <rect x="20" y="60" width="360" height="140" rx="10" fill="#17171b" stroke="#2c2c34" stroke-width="2"/>
    <rect x="20" y="60" width="360" height="6" fill="${g}"/>
    ${[100, 200, 300].map(x => `<g><circle cx="${x}" cy="130" r="48" fill="#0c0c0e" stroke="${g}" stroke-width="3"/>${[0, 60, 120, 180, 240, 300].map(a => `<path d="M${x} 130 L${x + 40 * Math.cos(a * Math.PI / 180)} ${130 + 40 * Math.sin(a * Math.PI / 180)}" stroke="${g}" stroke-width="9" stroke-linecap="round" opacity=".85"/>`).join('')}<circle cx="${x}" cy="130" r="9" fill="#17171b" stroke="${g}" stroke-width="2"/></g>`).join('')}
    <rect x="40" y="200" width="150" height="26" fill="#d6a643" opacity=".85"/>
    <rect x="30" y="190" width="340" height="4" fill="${g}" filter="url(#${id}f)"/></svg>`;
  }
  if (kind === 'monitors') {
    return `<svg viewBox="0 0 400 280" xmlns="http://www.w3.org/2000/svg">${defs}
    <rect x="30" y="20" width="340" height="190" rx="8" fill="#0c0c0e" stroke="#33333c" stroke-width="4"/>
    <rect x="42" y="32" width="316" height="166" fill="${g}" opacity=".9"/>
    <path d="M42 150 L130 100 L200 140 L270 70 L358 130 L358 198 L42 198Z" fill="#0b0b0d" opacity=".55"/>
    <circle cx="300" cy="75" r="22" fill="#fff" opacity=".35"/>
    <rect x="185" y="210" width="30" height="40" fill="#25252c"/><rect x="130" y="248" width="140" height="10" rx="4" fill="#33333c"/>
    <rect x="30" y="206" width="340" height="3" fill="${g}" filter="url(#${id}f)"/></svg>`;
  }
  if (kind === 'memory') {
    return `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg">${defs}
    ${[0, 1].map(i => `<g transform="translate(0 ${i * 78})"><rect x="20" y="30" width="360" height="62" rx="4" fill="#17171b" stroke="#2c2c34" stroke-width="2"/>
    <rect x="20" y="30" width="360" height="14" fill="${g}"/>${[0, 1, 2, 3, 4, 5, 6, 7].map(n => `<rect x="${44 + n * 38}" y="52" width="28" height="30" fill="#0c0c0e" stroke="#33333c"/>`).join('')}
    <rect x="30" y="86" width="340" height="3" fill="#d6a643"/></g>`).join('')}</svg>`;
  }
  // motherboard
  return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">${defs}
  <rect x="10" y="10" width="380" height="280" rx="8" fill="#131316" stroke="#2c2c34" stroke-width="2"/>
  <rect x="10" y="10" width="380" height="5" fill="${g}"/>
  <rect x="30" y="28" width="170" height="38" rx="3" fill="#1d1d22" stroke="${g}" stroke-width="2"/>
  ${[0, 1, 2, 3, 4, 5, 6].map(i => `<rect x="${38 + i * 23}" y="34" width="14" height="26" fill="${g}" opacity="${0.35 + (i % 3) * 0.2}"/>`).join('')}
  <rect x="26" y="78" width="54" height="130" rx="3" fill="#1d1d22" stroke="${g}" stroke-width="2"/>
  ${[0, 1, 2, 3, 4].map(i => `<rect x="34" y="${88 + i * 24}" width="38" height="14" fill="${g}" opacity="${0.3 + (i % 2) * 0.3}"/>`).join('')}
  <rect x="100" y="86" width="86" height="86" fill="#0c0c0e" stroke="${g}" stroke-width="3"/>
  <rect x="116" y="102" width="54" height="54" fill="#1d1d22" stroke="#444"/>
  <circle cx="143" cy="129" r="${10 + o / 4}" fill="${g}" opacity=".8"/>
  ${[0, 1, 2, 3].map(i => `<rect x="${236 + i * 28}" y="26" width="14" height="150" rx="2" fill="#0c0c0e" stroke="${g}" stroke-width="1.5"/>`).join('')}
  <rect x="236" y="190" width="108" height="64" rx="3" fill="#1d1d22" stroke="${g}" stroke-width="2"/>
  <path d="M250 205 h80 M250 222 h60 M250 238 h80" stroke="${g}" stroke-width="3"/>
  <rect x="30" y="224" width="190" height="14" rx="2" fill="#0c0c0e" stroke="#444"/>
  <rect x="30" y="250" width="190" height="14" rx="2" fill="#0c0c0e" stroke="#444"/>
  <rect x="352" y="60" width="26" height="120" fill="#1d1d22" stroke="#333"/>
  <rect x="10" y="12" width="380" height="3" fill="${g}" filter="url(#${id}f)"/></svg>`;
}

function mediaFor(product, data) {
  if (product.image) return `<img src="${esc(product.image)}" alt="${esc(product.name)}" loading="lazy">`;
  return artSvg(product.category, (product.name || '').length);
}
const money = n => (n === '' || n == null || isNaN(n)) ? 'Contact us' : '$' + Number(n).toLocaleString();

function logoMarkup(brand) {
  if (brand.logo) return `<img src="${esc(brand.logo)}" alt="${esc(brand.name)}">`;
  return `<svg viewBox="0 0 40 40"><defs><linearGradient id="lg" x1="0" x2="1"><stop offset="0" stop-color="var(--secondary)"/><stop offset="1" stop-color="var(--primary)"/></linearGradient></defs><path d="M2 6h10l8 16 8-16h10L20 38z" fill="url(#lg)"/></svg><span>${esc(brand.name)}</span>`;
}

function renderChrome(data, active = '') {
  const b = data.brand || {};
  const cats = data.categories || [];
  const banner = window.__draft ? `<div class="draft-banner">Previewing your unpublished draft — <a href="admin.html">back to admin</a></div>` : '';
  document.getElementById('site-header').innerHTML = `${banner}
  <div class="container nav">
    <a class="logo" href="index.html">${logoMarkup(b)}</a>
    <button class="menu-btn" aria-label="menu" onclick="document.querySelector('.nav-links').classList.toggle('open')">☰</button>
    <nav class="nav-links">
      <a href="index.html" class="${active === 'home' ? 'active' : ''}">Home</a>
      <a href="products.html" class="${active === 'products' ? 'active' : ''}">All Products</a>
      ${cats.map(c => `<a href="products.html?cat=${esc(c.id)}">${esc(c.name)}</a>`).join('')}
      <form class="nav-search" action="products.html"><input type="search" name="q" placeholder="Search…"></form>
    </nav>
  </div>`;
  document.getElementById('site-footer').innerHTML = `
  <div class="container foot">
    <div><a class="logo" href="index.html">${logoMarkup(b)}</a><p style="color:var(--muted);margin-top:12px;max-width:340px">${esc(b.tagline)}</p></div>
    <div><h4>Shop</h4>${cats.map(c => `<a href="products.html?cat=${esc(c.id)}">${esc(c.name)}</a>`).join('')}</div>
    <div><h4>Contact</h4><a href="mailto:${esc(b.contactEmail)}">${esc(b.contactEmail)}</a><a href="admin.html">Admin</a></div>
  </div>
  <div class="container copy"><span>${esc(b.footer)}</span></div>`;
}

async function boot(active, render) {
  const data = await loadData();
  window.SITE = data;
  applyTheme(data);
  renderChrome(data, active);
  render(data);
}

function cardHtml(p) {
  return `<a class="card" href="product.html?id=${encodeURIComponent(p.id)}">
    ${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ''}
    <div class="thumb">${mediaFor(p)}</div>
    <div class="body"><h3>${esc(p.name)}</h3>
      <div class="meta">${[p.chipset, p.socket, p.formFactor].filter(Boolean).map(esc).join(' · ')}</div>
      <div class="meta">${esc(p.summary || '').slice(0, 90)}${(p.summary || '').length > 90 ? '…' : ''}</div>
      <div class="price">${money(p.price)}</div></div></a>`;
}
