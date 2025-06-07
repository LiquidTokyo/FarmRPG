// ==UserScript==
// @name         Item Drop Tracker – Ephemeral Sessions v1.1
// @namespace    FarmRPG Custom
// @version      1.1
// @description  Tracks item drops per Explore location: auto-loads all possible items, real stamina delta, Apple Cider & Palmer, per-location reset and global reset via top-bar “refresh” icon; German thousands separator; highlights full items and remembers them across reloads.
// @author       LiquidTokyo
// @match        https://farmrpg.com/*
// @match        https://*.farmrpg.com/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  /* ---------- 0. SMALL HELPERS ---------- */
  const fmt = n => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const docFromHTML = h => { const d = document.implementation.createHTMLDocument(''); d.documentElement.innerHTML = h; return d; };

  /* ---------- 1. CACHES ---------- */
  /* 1-a  icon cache (persists) */
  const ICON_CACHE_KEY = 'frpg_itemicon_cache_v1';
  let iconCache = JSON.parse(localStorage.getItem(ICON_CACHE_KEY) || '{}');
  const saveIconCache = () => localStorage.setItem(ICON_CACHE_KEY, JSON.stringify(iconCache));

  /* 1-b  “inventory full” flags (persist per location) */
  const fullKey = loc => `frpg_fullflags_${loc}`;
  const loadFull = loc => JSON.parse(localStorage.getItem(fullKey(loc)) || '{}');
  const saveFull = (loc, flags) => localStorage.setItem(fullKey(loc), JSON.stringify(flags));
  const clearAllFullFlags = () =>
    Object.keys(localStorage).filter(k => k.startsWith('frpg_fullflags_')).forEach(k => localStorage.removeItem(k));

  /* ---------- 2. SESSION HANDLING ---------- */
  const sessions = {};                              // { locId → session }
  const blank = () => ({ dropCounts:{}, dropOrder:[], explore:0, cider:0, palmer:0, totalStaminaUsed:0, fullFlags:{} });
  const getSession = id => sessions[id] || (sessions[id] = blank());

  const resetSession = id => { sessions[id] = blank(); saveFull(id, {}); };

  const resetAllSessions = () => {
    Object.keys(sessions).forEach(id => (sessions[id] = blank()));
    clearAllFullFlags();
    buildIfPossible();                              // rebuild current tracker if we are in a location
  };

  /* ---------- 3. LOCATION & ITEM DISCOVERY ---------- */
  const itemsCache = {};                            // { locId → [possible item names] }

  const getLocId = () => {
    const m = (location.hash || location.search).match(/id=(\d+)/);
    if (m) return m[1];
    const el = document.querySelector('#explorelocationname,.locationtitle,h2.location');
    return el ? el.textContent.trim().replace(/\s+/g, '_').toLowerCase() : null;
  };

  async function fetchLocationItems(id) {
    if (itemsCache[id]) return itemsCache[id];
    const r = await fetch(`/location.php?type=explore&id=${id}`);
    if (!r.ok) return [];
    const doc = docFromHTML(await r.text());
    const names = [...doc.querySelectorAll('.content-block img[alt],.card img[alt]')]
      .map(i => i.alt.trim())
      .filter((v, i, a) => v && a.indexOf(v) === i);
    itemsCache[id] = names;
    return names;
  }

  /* ---------- 4. BOX RENDERING ---------- */
  const iconHTML = n => `<img src="${iconCache[n] || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='}" alt="${n}" style="width:28px;height:28px;border-radius:8px;box-shadow:0 0 4px #2b3f2c60;">`;

  async function buildBox(id) {
    const s = getSession(id);
    document.getElementById('locstat-box')?.remove();

    /* preload item list once */
    if (s.dropOrder.length === 0) {
      (await fetchLocationItems(id)).forEach(n => {
        if (!(n in s.dropCounts)) { s.dropCounts[n] = 0; s.dropOrder.push(n); }
      });
    }

    /* wait until explore options are in the DOM */
    let tries = 0;
    (function ensure() {
      const anchor = document.getElementById('exploreoptions');
      if (!anchor && ++tries < 60) return requestAnimationFrame(ensure);

      const items = s.dropOrder.map(n => `
        <div style="display:flex;flex-direction:column;align-items:center;gap:2px;${s.fullFlags[n] ? 'background:rgba(255,0,0,.1);border-radius:6px;' : ''}">
          ${iconHTML(n)}
          <div id="locdrop-${encodeURIComponent(n)}" style="font-size:13.2px;color:#e2ffd7;">${fmt(s.dropCounts[n])}</div>
        </div>`).join('');

      const box = document.createElement('div');
      box.id = 'locstat-box';
      box.style = `margin:13px auto 0;padding:8px 10px;
        background:linear-gradient(135deg,#18201c 90%,#22352a 100%);
        color:#c7ebcb;border-radius:12px;font-size:14px;
        box-shadow:0 3px 12px #01100833,0 0 3px #223f2955 inset;
        border:1.5px solid #22462b;opacity:.95;user-select:none;`;

      box.innerHTML = `
        <div id="loc-items" style="display:flex;flex-wrap:wrap;justify-content:center;gap:10px 14px;">${items || '<div style="font-size:13px;">No drops yet.</div>'}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin:8px 0 4px;padding:0 6px;">
          <div style="display:flex;gap:8px;">
            <div># of Explores: <b id="locstat-explore">${fmt(s.explore)}</b></div>
            <div>Stamina used: <b id="locstat-stamreal">${fmt(s.totalStaminaUsed)}</b></div>
            <div>Apple Cider: <b id="locstat-cider">${fmt(s.cider)}</b></div>
            <div>Arnold Palmer: <b id="locstat-palmer">${fmt(s.palmer)}</b></div>
          </div>
          <button id="locstat-reset" style="padding:2px 6px;font-size:12px;border-radius:4px;">Reset</button>
        </div>`;

      (anchor?.parentNode || document.body).insertBefore(box, anchor?.nextSibling || null);
      box.style.width = (anchor?.parentNode || document.body).clientWidth + 'px';

      /* per-location reset */
      box.querySelector('#locstat-reset').onclick = () => { resetSession(id); buildBox(id); };
    })();
  }

  function updateBox(id) {
    const s = getSession(id);
    s.dropOrder.forEach(n => {
      const el = document.getElementById(`locdrop-${encodeURIComponent(n)}`);
      if (el) {
        el.textContent = fmt(s.dropCounts[n]);
        el.parentElement.style.background = s.fullFlags[n] ? 'rgba(255,0,0,.1)' : 'transparent';
      }
    });
    [['locstat-explore', s.explore], ['locstat-stamreal', s.totalStaminaUsed],
     ['locstat-cider', s.cider], ['locstat-palmer', s.palmer]]
      .forEach(([i, v]) => { const e = document.getElementById(i); if (e) e.textContent = fmt(v); });
  }

  /* ---------- 5. DROP PARSING ---------- */
  function addDrops(id) {
    const s = getSession(id);
    const con = document.getElementById('exploreconsole');
    if (!con) return false;
    let fresh = false;

    con.querySelectorAll('img[alt]').forEach(img => {
      const st = getComputedStyle(img);
      const gray = (+st.opacity < 1) || st.filter.includes('grayscale');
      const name = img.alt.trim();

      if (gray) { s.fullFlags[name] = true; saveFull(id, s.fullFlags); return; }

      s.fullFlags[name] = false; saveFull(id, s.fullFlags);

      let cnt = 1;
      const t = img.nextSibling?.textContent.match(/\(x(\d+)\)/);
      if (t) cnt = +t[1];

      if (!(name in s.dropCounts)) { s.dropCounts[name] = 0; s.dropOrder.push(name); fresh = true; }
      s.dropCounts[name] += cnt;

      if (!iconCache[name]) { iconCache[name] = img.src; saveIconCache(); fresh = true; }
    });
    return fresh;
  }

  /* ---------- 6. CLICK HOOKS ---------- */
  function hookClicks(id) {
    const s = getSession(id);
    const stamina = () => +document.getElementById('stamina')?.textContent.replace(/,/g, '') || null;
    const addOnce = (sel, ev, fn) => { const e = document.querySelector(sel); if (e && !e.dataset.trk) { e.addEventListener(ev, fn); e.dataset.trk = 1; } };

    /* normal explore */
    const ex = () => {
      const before = stamina();
      setTimeout(() => {
        const after = stamina(); if (before && after) s.totalStaminaUsed += before - after;
        s.explore++; addDrops(id) ? buildBox(id) : updateBox(id);
      }, 200);
    };
    addOnce('#exploreconsole', 'click', ex);
    addOnce('.item-content.explorebtn', 'click', ex);

    /* apple cider */
    const cid = () => setTimeout(() => {
      const h = document.getElementById('exploreconsole')?.innerHTML || '';
      const m = h.match(/explored <strong>([\d,]+)x<\/strong> and used <strong>([\d,]+)</i);
      if (m) { s.explore += +m[1].replace(/,/g, ''); s.totalStaminaUsed += +m[2].replace(/,/g, ''); s.cider++; }
      addDrops(id) ? buildBox(id) : updateBox(id);
    }, 300);
    addOnce('.item-content.drinkcidernc', 'click', cid);

    /* arnold palmer */
    const pal = () => setTimeout(() => { s.palmer++; addDrops(id) ? buildBox(id) : updateBox(id); }, 300);
    addOnce('.item-content.drinklmnc', 'click', pal);
  }

  /* ---------- 7. INIT / REBUILD ---------- */
  async function init() {
    const id = getLocId();
    if (!id) { document.getElementById('locstat-box')?.remove(); return; }

    const s = getSession(id);
    s.fullFlags = loadFull(id);

    (await fetchLocationItems(id)).forEach(n => {
      if (!(n in s.dropCounts)) { s.dropCounts[n] = 0; s.dropOrder.push(n); }
    });

    buildBox(id); hookClicks(id);
  }

  const buildIfPossible = () => { const id = getLocId(); if (id && document.getElementById('exploreoptions')) buildBox(id); };

  /* Listener for page-scope refresh icon (class="refreshbtn") -> global reset */
  document.addEventListener('click', e => {
    if (e.target.closest('a.refreshbtn')) resetAllSessions();
  });

  window.addEventListener('load', init);
  window.addEventListener('hashchange', init);
  setInterval(() => {
    const id = getLocId(), box = document.getElementById('locstat-box');
    if (id && !box && document.getElementById('exploreoptions')) init();
    if (!id && box) box.remove();
  }, 500);
})();
