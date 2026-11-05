/* VYPRA admin — edits a draft in this browser, then exports / publishes data/site.json */
(async function () {
  const $ = (s, r = document) => r.querySelector(s);
  const root = $('#root');
  let data = await loadData();
  applyTheme(data);
  let tab = 'products', editing = -1, specRows = [];

  /* ---------- utils ---------- */
  const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const setP = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };
  const slug = s => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
  const uid = () => 'x' + Math.random().toString(36).slice(2, 8);
  let tt;
  function toast(m = 'Draft saved') { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 1400); }
  function save(msg) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); toast(msg); } catch (e) { alert('Browser storage is full — remove large images or publish to GitHub first.'); } applyTheme(data); }
  async function sha(s) {
    if (window.crypto && crypto.subtle) {
      const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
      return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
    }
    let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return 'f' + (h >>> 0).toString(16).padStart(8, '0').repeat(2);
  }
  const move = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; };

  function fileToDataUrl(file, max = 1600) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = rej;
      fr.onload = () => {
        if (file.type === 'image/svg+xml' || file.type === 'image/gif') return res(fr.result);
        const img = new Image();
        img.onerror = rej;
        img.onload = () => {
          const sc = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          let out = c.toDataURL('image/webp', .88);
          if (!out.startsWith('data:image/webp')) out = c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', .88);
          res(out);
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  /* ---------- field builders ---------- */
  const val = p => getP(data, p) ?? '';
  const inp = (l, p, o = {}) => `<div class="f"><label>${l}</label><input data-bind="${p}" ${o.num ? 'data-num="1"' : ''} type="${o.type || 'text'}" value="${esc(val(p))}" placeholder="${esc(o.ph || '')}" ${o.ro ? 'readonly' : ''}></div>`;
  const txt = (l, p) => `<div class="f"><label>${l}</label><textarea data-bind="${p}">${esc(val(p))}</textarea></div>`;
  const chk = (l, p) => `<div class="f chk"><input type="checkbox" id="c_${p}" data-bind="${p}" ${getP(data, p) ? 'checked' : ''}><label for="c_${p}">${l}</label></div>`;
  const sel = (l, p, opts) => `<div class="f"><label>${l}</label><select data-bind="${p}">${opts.map(o => `<option value="${esc(o.v)}" ${o.v === val(p) ? 'selected' : ''}>${esc(o.t)}</option>`).join('')}</select></div>`;
  const color = (l, p) => `<div class="f"><label>${l}</label><input type="color" data-bind="${p}" value="${esc(val(p) || '#000000')}"></div>`;
  const imgf = (l, p) => {
    const v = val(p);
    return `<div class="f"><label>${l}</label><div class="imgfield"><div class="pv">${v ? `<img src="${esc(v)}" alt="">` : '<span>No image<br>(generated art is used)</span>'}</div>
    <div><input data-bind="${p}" class="" type="text" value="${v.startsWith && v.startsWith('data:') ? '' : esc(v)}" placeholder="Paste an image URL / path, or upload below" style="width:100%;background:var(--surface2);border:1px solid var(--line);color:var(--text);padding:10px 12px;margin-bottom:8px;outline:0">
    <div class="acts"><label class="btn small ghost" style="cursor:pointer">Upload image<input type="file" accept="image/*" data-up="${p}" hidden></label>${v ? `<button class="btn small danger" data-act="clearimg" data-path="${p}">Remove</button>` : ''}</div>
    ${v.startsWith && v.startsWith('data:') ? '<div class="note">Uploaded image stored in draft — it is saved into your repo when you publish.</div>' : ''}</div></div></div>`;
  };

  /* ---------- auth ---------- */
  const PW_KEY = 'vypra_admin_hash';
  const authed = () => sessionStorage.getItem('vypra_ok') === '1';
  async function currentHash() { return localStorage.getItem(PW_KEY) || await sha('admin123'); }

  function loginView() {
    root.innerHTML = `<div class="login"><form class="box cut" id="lf"><div class="logo" style="margin-bottom:16px">${logoMarkup(data.brand)}</div>
    <h3>Admin sign-in</h3><div class="f"><label>Password</label><input type="password" id="pw" autofocus></div>
    <button class="btn" style="width:100%;justify-content:center">Enter</button>
    <p class="note" id="lmsg">First time? The default password is <b>admin123</b> — change it under Publish.</p></form></div>`;
    $('#lf').onsubmit = async e => {
      e.preventDefault();
      if (await sha($('#pw').value) === await currentHash()) { sessionStorage.setItem('vypra_ok', '1'); render(); }
      else { $('#lmsg').innerHTML = '<span class="bad">Wrong password.</span>'; }
    };
  }

  /* ---------- views ---------- */
  const catOpts = () => data.categories.map(c => ({ v: c.id, t: c.name }));

  function productsView() {
    if (editing >= 0) return productEditor(editing);
    return `<div class="top"><div><h1>Products</h1><div class="hint" style="margin:0">${data.products.length} products · changes are saved to a draft automatically</div></div><button class="btn" data-act="p-add">+ Add product</button></div>
    <div class="box" style="padding:0;overflow:auto"><table class="tbl"><tr><th></th><th>Name</th><th>Category</th><th>Price</th><th>Featured</th><th></th></tr>
    ${data.products.map((p, i) => `<tr><td><div class="tn">${mediaFor(p)}</div></td><td><b>${esc(p.name)}</b><div class="note" style="margin:0">${esc(p.id)}</div></td>
      <td>${esc(data.categories.find(c => c.id === p.category)?.name || p.category)}</td><td>${money(p.price)}</td><td>${p.featured ? '★' : ''}</td>
      <td><div class="acts"><button class="btn small ghost" data-act="p-edit" data-i="${i}">Edit</button><button class="btn small ghost" data-act="p-dup" data-i="${i}">Duplicate</button><button class="btn small danger" data-act="p-del" data-i="${i}">Delete</button></div></td></tr>`).join('') || '<tr><td colspan="6">No products yet.</td></tr>'}</table></div>`;
  }

  function productEditor(i) {
    const p = data.products[i], P = 'products.' + i;
    return `<div class="top"><button class="btn ghost small" data-act="back">← All products</button><a class="btn ghost small" target="_blank" href="product.html?id=${encodeURIComponent(p.id)}">Preview page ↗</a></div>
    <h1>Edit product</h1><p class="hint">Everything here appears on the product page and in listings.</p>
    <div class="box"><h3>Basics</h3><div class="row">${inp('Name', P + '.name')}${inp('URL id (slug)', P + '.id')}${sel('Category', P + '.category', catOpts())}${inp('Price in USD (blank = “Contact us”)', P + '.price', { num: 1, type: 'number' })}${inp('Badge (e.g. New, Hot)', P + '.badge')}</div>
      ${chk('Featured on the home page', P + '.featured')}${txt('Short summary', P + '.summary')}${inp('Buy link (optional — blank uses an email enquiry)', P + '.buyLink', { ph: 'https://…' })}</div>
    <div class="box"><h3>Filter tags</h3><div class="row">${inp('Chipset', P + '.chipset')}${inp('Socket', P + '.socket')}${inp('Form factor / size', P + '.formFactor')}${inp('Memory', P + '.memory')}</div></div>
    <div class="box"><h3>Main visual</h3>${imgf('Product image', P + '.image')}</div>
    <div class="box"><h3>Key features (with visuals)</h3>
      ${(p.features || []).map((f, j) => `<div class="rep"><div class="rep-h"><span>Feature ${j + 1}</span><span class="acts"><button class="btn small ghost" data-act="f-up" data-j="${j}">↑</button><button class="btn small ghost" data-act="f-down" data-j="${j}">↓</button><button class="btn small danger" data-act="f-del" data-j="${j}">Remove</button></span></div>
        ${inp('Title', `${P}.features.${j}.title`)}${txt('Description', `${P}.features.${j}.text`)}${imgf('Feature image', `${P}.features.${j}.image`)}</div>`).join('')}
      <button class="btn small ghost" data-act="f-add">+ Add feature</button></div>
    <div class="box"><h3>Specifications</h3>
      ${specRows.map((r, j) => `<div class="kv"><input class="spk" data-j="${j}" placeholder="Label (e.g. Memory)" value="${esc(r[0])}"><input class="spv" data-j="${j}" placeholder="Value" value="${esc(r[1])}"><button class="btn small danger" data-act="s-del" data-j="${j}">✕</button></div>`).join('')}
      <button class="btn small ghost" data-act="s-add">+ Add spec row</button></div>`;
  }

  function heroView() {
    return `<div class="top"><div><h1>Home visuals</h1><div class="hint" style="margin:0">The rotating banner slides on the home page.</div></div><button class="btn" data-act="h-add">+ Add slide</button></div>
    ${data.hero.map((s, i) => `<div class="box"><div class="rep-h"><span>Slide ${i + 1}</span><span class="acts"><button class="btn small ghost" data-act="h-up" data-i="${i}">↑</button><button class="btn small ghost" data-act="h-down" data-i="${i}">↓</button><button class="btn small danger" data-act="h-del" data-i="${i}">Delete</button></span></div>
      <div class="row">${inp('Small label', `hero.${i}.eyebrow`)}${inp('Big title', `hero.${i}.title`)}${inp('Button text', `hero.${i}.ctaText`)}${inp('Button link', `hero.${i}.ctaLink`, { ph: 'products.html?cat=motherboards' })}</div>
      ${txt('Subtitle', `hero.${i}.subtitle`)}${imgf('Banner visual (blank = generated art)', `hero.${i}.image`)}</div>`).join('')}`;
  }

  function brandView() {
    return `<h1>Brand &amp; colors</h1><p class="hint">Colors apply instantly across the whole site.</p>
    <div class="box"><h3>Brand</h3><div class="row">${inp('Brand name', 'brand.name')}${inp('Tagline', 'brand.tagline')}${inp('Contact email', 'brand.contactEmail')}</div>${inp('Footer text', 'brand.footer')}${imgf('Logo image (blank = built-in logo mark)', 'brand.logo')}</div>
    <div class="box"><h3>Color theme</h3><div class="row">${color('Primary accent', 'theme.primary')}${color('Secondary accent', 'theme.secondary')}${color('Background', 'theme.bg')}${color('Panels', 'theme.surface')}${color('Text', 'theme.text')}${color('Muted text', 'theme.muted')}</div>
    <div class="acts" style="margin-top:6px"><button class="btn small ghost" data-act="reset-colors">Reset to default orange/black</button></div></div>
    <div class="box"><h3>“Why us” highlights (home page)</h3>
      ${data.highlights.map((h, i) => `<div class="rep"><div class="rep-h"><span>Highlight ${i + 1}</span><button class="btn small danger" data-act="hl-del" data-i="${i}">Remove</button></div>${inp('Title', `highlights.${i}.title`)}${txt('Text', `highlights.${i}.text`)}</div>`).join('')}
      <button class="btn small ghost" data-act="hl-add">+ Add highlight</button></div>`;
  }

  function catView() {
    return `<div class="top"><div><h1>Categories</h1><div class="hint" style="margin:0">Shown in the menu and on the home page.</div></div><button class="btn" data-act="c-add">+ Add category</button></div>
    <div class="box">${data.categories.map((c, i) => `<div class="kv" style="grid-template-columns:1fr 1fr auto"><input data-bind="categories.${i}.name" value="${esc(c.name)}" placeholder="Display name"><input value="${esc(c.id)}" readonly title="id is fixed so products stay linked"><button class="btn small danger" data-act="c-del" data-i="${i}">✕</button></div>`).join('')}</div>`;
  }

  const ghGet = () => { let c = {}; try { c = JSON.parse(localStorage.getItem('vypra_gh') || '{}'); } catch (e) { } return { branch: 'main', dir: '', ...c, token: sessionStorage.getItem('vypra_tok') || '' }; };

  function publishView() {
    const g = ghGet();
    const gi = (id, l, v, ph = '', type = 'text') => `<div class="f"><label>${l}</label><input id="${id}" type="${type}" value="${esc(v)}" placeholder="${esc(ph)}"></div>`;
    return `<h1>Publish</h1><p class="hint">Your edits live as a draft in this browser. Publishing writes them to your GitHub repo so everyone sees them.</p>
    <div class="box"><h3>Option A — Publish straight to GitHub</h3>
      <div class="row">${gi('g_owner', 'GitHub username / org', g.owner || '', 'yourname')}${gi('g_repo', 'Repository', g.repo || '', 'my-store')}${gi('g_branch', 'Branch', g.branch)}${gi('g_dir', 'Site folder in repo (blank if at root)', g.dir, 'e.g. docs')}</div>
      ${gi('g_token', 'Personal access token (kept only for this browser tab)', g.token, 'github_pat_…', 'password')}
      <button class="btn" data-act="publish">Publish to GitHub</button><div id="pubLog" class="note" style="line-height:1.8"></div>
      <p class="note">Create a fine-grained token at GitHub → Settings → Developer settings, limited to this one repository with <b>Contents: Read and write</b>. GitHub Pages redeploys in about a minute.</p></div>
    <div class="box"><h3>Option B — Manual</h3><div class="acts"><button class="btn ghost" data-act="dl">Download site.json</button>
      <label class="btn ghost" style="cursor:pointer">Import site.json<input type="file" accept="application/json" id="impf" hidden></label></div>
      <p class="note">Replace <b>data/site.json</b> in your repo with the downloaded file and commit. Uploaded images are embedded inside it (Option A stores them as real files instead).</p></div>
    <div class="box"><h3>Draft</h3><div class="acts"><a class="btn ghost" href="index.html" target="_blank">Preview site ↗</a><button class="btn danger" data-act="discard">Discard draft &amp; reload live data</button></div></div>
    <div class="box"><h3>Admin password</h3><div class="row">${gi('pw1', 'New password (min 6 chars)', '', '', 'password')}</div><button class="btn small ghost" data-act="chpw">Change password</button>
      <p class="note">Heads-up: this password only guards the admin screen in your own browser. The real protection is that nobody can change the live site without your GitHub token or repo access.</p></div>`;
  }

  /* ---------- shell ---------- */
  const tabs = [['products', 'Products'], ['hero', 'Home visuals'], ['brand', 'Brand & colors'], ['categories', 'Categories'], ['publish', 'Publish']];
  function render() {
    if (!authed()) return loginView();
    const views = { products: productsView, hero: heroView, brand: brandView, categories: catView, publish: publishView };
    root.innerHTML = `<div class="adm"><aside class="side"><a class="logo" href="index.html">${logoMarkup(data.brand)}</a>
      ${tabs.map(([k, t]) => `<button class="tab ${tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}">${t}</button>`).join('')}
      <div class="grow"></div><a class="tab btn ghost small" href="index.html" target="_blank" style="justify-content:center">View site ↗</a><button class="tab" data-act="logout">Sign out</button></aside>
      <div class="panel">${views[tab]()}</div></div>`;
  }

  /* ---------- events ---------- */
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.classList.contains('spk') || el.classList.contains('spv')) {
      const j = +el.dataset.j; specRows[j][el.classList.contains('spk') ? 0 : 1] = el.value;
      data.products[editing].specs = Object.fromEntries(specRows.filter(r => r[0].trim()));
      return save();
    }
    const p = el.dataset && el.dataset.bind; if (!p) return;
    let v = el.type === 'checkbox' ? el.checked : el.value;
    if (el.dataset.num) v = v === '' ? '' : Number(v);
    setP(data, p, v);
    const pv = el.closest('.imgfield'); if (pv) { pv.querySelector('.pv').innerHTML = v ? `<img src="${esc(v)}" alt="">` : '<span>No image</span>'; }
    save();
  });

  document.addEventListener('change', async e => {
    const el = e.target;
    if (el.dataset && el.dataset.up) {
      const f = el.files[0]; if (!f) return;
      try { setP(data, el.dataset.up, await fileToDataUrl(f)); save('Image added'); render(); } catch (err) { alert('Could not read that image.'); }
    }
    if (el.id === 'impf') {
      const f = el.files[0]; if (!f) return;
      try { const j = JSON.parse(await f.text()); if (!j.products || !j.brand) throw 0; data = j; save('Imported'); editing = -1; render(); }
      catch (err) { alert('That file is not a valid site.json.'); }
    }
  });

  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act, i = +b.dataset.i, j = +b.dataset.j, pr = data.products[editing];
    switch (a) {
      case 'tab': tab = b.dataset.tab; editing = -1; break;
      case 'logout': sessionStorage.removeItem('vypra_ok'); break;
      case 'back': editing = -1; break;
      case 'p-add': {
        const base = 'new-product'; let id = base, n = 1; while (data.products.some(p => p.id === id)) id = base + '-' + (++n);
        data.products.unshift({ id, name: 'New Product', category: data.categories[0]?.id || '', chipset: '', socket: '', formFactor: '', memory: '', price: '', badge: '', featured: false, image: '', buyLink: '', summary: '', features: [], specs: {} });
        editing = 0; specRows = []; save('Product added'); break;
      }
      case 'p-edit': editing = i; specRows = Object.entries(data.products[i].specs || {}); break;
      case 'p-dup': { const c = JSON.parse(JSON.stringify(data.products[i])); c.name += ' (copy)'; c.id = c.id + '-copy-' + uid().slice(1, 4); data.products.splice(i + 1, 0, c); save('Duplicated'); break; }
      case 'p-del': if (confirm('Delete “' + data.products[i].name + '”?')) { data.products.splice(i, 1); save('Deleted'); } break;
      case 'f-add': (pr.features = pr.features || []).push({ title: 'New feature', text: '', image: '' }); save(); break;
      case 'f-del': pr.features.splice(j, 1); save(); break;
      case 'f-up': move(pr.features, j, -1); save(); break;
      case 'f-down': move(pr.features, j, 1); save(); break;
      case 's-add': specRows.push(['', '']); break;
      case 's-del': specRows.splice(j, 1); pr.specs = Object.fromEntries(specRows.filter(r => r[0].trim())); save(); break;
      case 'h-add': data.hero.push({ id: uid(), eyebrow: 'New', title: 'NEW SLIDE', subtitle: '', image: '', ctaText: 'Explore', ctaLink: 'products.html' }); save(); break;
      case 'h-del': if (confirm('Delete this slide?')) { data.hero.splice(i, 1); save(); } break;
      case 'h-up': move(data.hero, i, -1); save(); break;
      case 'h-down': move(data.hero, i, 1); save(); break;
      case 'hl-add': data.highlights.push({ title: 'New highlight', text: '' }); save(); break;
      case 'hl-del': data.highlights.splice(i, 1); save(); break;
      case 'c-add': { const n = prompt('Category name?'); if (!n) return; let id = slug(n); while (data.categories.some(c => c.id === id)) id += '-2'; data.categories.push({ id, name: n }); save(); break; }
      case 'c-del': { const c = data.categories[i]; const used = data.products.filter(p => p.category === c.id).length; if (confirm(used ? `${used} product(s) use “${c.name}”. Delete anyway?` : `Delete “${c.name}”?`)) { data.categories.splice(i, 1); save(); } break; }
      case 'clearimg': setP(data, b.dataset.path, ''); save(); break;
      case 'reset-colors': data.theme = { primary: '#ff6a00', secondary: '#ff2d2d', bg: '#0b0b0d', surface: '#141417', text: '#f2f2f2', muted: '#9a9aa3' }; save('Colors reset'); break;
      case 'dl': {
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        const l = document.createElement('a'); l.href = url; l.download = 'site.json'; l.click(); URL.revokeObjectURL(url); return;
      }
      case 'discard': if (confirm('Throw away all unpublished changes?')) { localStorage.removeItem(DRAFT_KEY); window.__draft = false; data = await (await fetch('data/site.json', { cache: 'no-store' })).json(); applyTheme(data); editing = -1; toast('Draft discarded'); } break;
      case 'chpw': { const v = $('#pw1').value; if (v.length < 6) return alert('Use at least 6 characters.'); localStorage.setItem(PW_KEY, await sha(v)); $('#pw1').value = ''; toast('Password changed'); return; }
      case 'publish': return publish();
    }
    render();
  });

  /* ---------- GitHub publish ---------- */
  async function publish() {
    const cfg = { owner: $('#g_owner').value.trim(), repo: $('#g_repo').value.trim(), branch: $('#g_branch').value.trim() || 'main', dir: $('#g_dir').value.trim().replace(/^\/+|\/+$/g, '') };
    const token = $('#g_token').value.trim();
    localStorage.setItem('vypra_gh', JSON.stringify(cfg)); sessionStorage.setItem('vypra_tok', token);
    const log = $('#pubLog'); log.innerHTML = '';
    const say = (m, c = '') => { log.innerHTML += `<span class="${c}">${m}</span><br>`; };
    if (!cfg.owner || !cfg.repo || !token) return say('Fill in username, repository and token first.', 'bad');
    const H = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' };
    const base = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/`;
    const pre = cfg.dir ? cfg.dir + '/' : '';
    async function put(path, b64, msg) {
      const url = base + path.split('/').map(encodeURIComponent).join('/');
      let sh; const g = await fetch(url + '?ref=' + encodeURIComponent(cfg.branch), { headers: H });
      if (g.ok) sh = (await g.json()).sha; else if (g.status !== 404) throw new Error(`Reading ${path} failed (${g.status}) — check the token, repo name and branch.`);
      const r = await fetch(url, { method: 'PUT', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, content: b64, branch: cfg.branch, ...(sh ? { sha: sh } : {}) }) });
      if (!r.ok) throw new Error(`Writing ${path} failed (${r.status}). ${(await r.text()).slice(0, 140)}`);
    }
    try {
      const copy = JSON.parse(JSON.stringify(data)); const done = {};
      const extOf = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' };
      async function walk(o) {
        for (const k in o) {
          const v = o[k];
          if (typeof v === 'string' && v.startsWith('data:image/')) {
            if (!done[v]) {
              const m = v.match(/^data:([\w/+.-]+);base64,(.*)$/); if (!m) continue;
              const rel = 'assets/uploads/' + (await sha(v)).slice(0, 16) + '.' + (extOf[m[1]] || 'img');
              say('Uploading ' + rel + '…'); await put(pre + rel, m[2], 'Admin: upload image'); done[v] = rel;
            }
            o[k] = done[v];
          } else if (v && typeof v === 'object') await walk(v);
        }
      }
      await walk(copy);
      say('Writing data/site.json…');
      await put(pre + 'data/site.json', btoa(unescape(encodeURIComponent(JSON.stringify(copy, null, 2)))), 'Admin: update site content');
      data = copy; save('Published');
      say('Published! GitHub Pages will update in about a minute. Your draft now points at the uploaded files, so images preview after the deploy finishes.', 'ok');
    } catch (err) { say(err.message, 'bad'); }
  }

  render();
})();
