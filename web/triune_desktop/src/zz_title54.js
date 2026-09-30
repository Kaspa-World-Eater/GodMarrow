// zz_title54.js (v0.54) — the title menu, centred and drawn into the scene. The user (2026-09-29): "I want the title
// screen menu different, more esoteric, animated, pixel art, on theme, centered"; the painted backdrop can stay.
//  - The chapel is moved so the god's face and the Seer's bowl stand in the middle of the screen (the scene is nearly
//    symmetric about the face; the strip it never painted on the right is its own left side, mirrored).
//  - GODMARROW is cut across the top in stepped bronze, with a line from the lede under it and an eye that blinks.
//  - The choices float on the blood in the bowl, the way the reading will: pale words that drift with the ripples.
//    The chosen one kindles like an ember, a sigil turns on either side of it, and the god's next drop falls into it.
//  - The HTML buttons are still there (hidden), so the keyboard, a controller and screen readers work as before; the
//    painted menu follows whichever one has focus. "Controls" opens the old panel.
(function () {
  if (typeof drawTitleScene !== 'function' || typeof TT === 'undefined') return;
  const SHIFT = -100, MIR = {};                                   // the face (x 340) to the middle (x 240)
  const intro = document.getElementById('intro');
  const st = document.createElement('style');
  st.textContent = `#intro { background: none !important; pointer-events: none; }
    #intro:not(.showpanel) .intro-panel { position: absolute !important; left: -9999px !important; opacity: 0; }
    #intro.showpanel { place-items: center !important; padding-left: 0 !important; background: rgba(3,2,5,.55) !important; pointer-events: auto; }`;
  document.head.appendChild(st);
  const ctlDetails = intro.querySelector('details.ctl');

  // ---- the choices: the HTML buttons that are showing, then Controls
  function items() {
    const L = [];
    for (const id of ['continueBtn', 'newBtn', 'testBtn', 'fsBtn']) {
      const b = document.getElementById(id); if (!b || b.hidden) continue;
      const label = id === 'testBtn' ? 'Trial of Thirty' : id === 'newBtn' ? 'New Pilgrim' : id === 'continueBtn' ? 'Continue' : (b.textContent || 'Full screen').trim();
      L.push({ id, label, el: b, act: () => b.click() });
    }
    L.push({ id: 'codex', label: 'The Ossuary of Words', el: null, act: () => { if (window.__tome && window.__tome.open) window.__tome.open(); } });
    L.push({ id: 'ctl', label: 'Controls', el: ctlDetails ? ctlDetails.querySelector('summary') : null, act: () => { intro.classList.add('showpanel'); if (ctlDetails) ctlDetails.open = true; } });
    return L;
  }
  const CX = 240, Y0 = 184, DY = 12;
  let sel = 0, lastMouse = { x: -1, y: -1 }, kindle = {}, drops = [];
  function layout() {
    const L = items(), y0 = Y0 - Math.max(0, L.length - 4) * DY / 2;
    ctx.save(); ctx.font = '8px "IM Fell English SC", Georgia, serif';
    L.forEach((it, i) => { it.x = CX; it.y = y0 + i * DY; it.w = Math.ceil(ctx.measureText(it.label).width * 1.12) + 18; });
    ctx.restore(); return L;
  }
  const hit = (L, x, y) => L.findIndex(it => x >= it.x - it.w / 2 && x <= it.x + it.w / 2 && y >= it.y - 8 && y <= it.y + 3);

  // ---- the title, cut once into stepped bronze at the screen's own resolution
  let titleC = null;
  function buildTitle() {
    const S = 4, w = 300, h = 34, hr = mkCanvas(w * S, h * S), x = hr.getContext('2d');
    x.font = `${22 * S}px "IM Fell English SC", Georgia, serif`; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    const tx = w * S / 2, ty = 25 * S;
    const txt = 'GODMARROW';
    // the letters as a mask
    const m = mkCanvas(w * S, h * S), mx = m.getContext('2d'); mx.font = x.font; mx.textAlign = 'center'; mx.fillStyle = '#fff';
    if ('letterSpacing' in mx) mx.letterSpacing = `${2 * S}px`;
    mx.fillText(txt, tx, ty);
    const md = mx.getImageData(0, 0, m.width, m.height).data, out = x.createImageData(m.width, m.height), od = out.data;
    const at = (i, j) => (i < 0 || j < 0 || i >= m.width || j >= m.height) ? 0 : md[(j * m.width + i) * 4 + 3];
    const BZ = [[26, 16, 8], [61, 37, 18], [112, 70, 34], [168, 116, 58], [224, 180, 108], [250, 226, 170]];
    const top = 25 * S - 17 * S, bot = 25 * S + 1 * S;
    for (let j = 0; j < m.height; j++) for (let i = 0; i < m.width; i++) {
      const a = at(i, j), o = (j * m.width + i) * 4;
      if (a > 110) {
        // stepped bands down the letter, a lit lip on edges that face up and left, a dark lip facing down and right
        const f = (j - top) / (bot - top); let k = f < 0.18 ? 4 : f < 0.45 ? 3 : f < 0.75 ? 2 : 1;
        if (at(i - S, j - S) < 110) k = Math.min(5, k + 1);
        if (at(i + S, j + S) < 110) k = Math.max(0, k - 1);
        const c = BZ[k]; od[o] = c[0]; od[o + 1] = c[1]; od[o + 2] = c[2]; od[o + 3] = 255;
      } else {
        // the cut: a dark bed one step out, and a shadow down and right
        let near = 0; for (const [di, dj] of [[S, 0], [-S, 0], [0, S], [0, -S], [-S, -S], [-2 * S, -2 * S]]) if (at(i + di, j + dj) > 110) near = 1;
        if (near) { od[o] = 6; od[o + 1] = 4; od[o + 2] = 5; od[o + 3] = 235; }
      }
    }
    // snap every value to the logical grid's 1/4 steps so it stays blocky
    x.putImageData(out, 0, 0);
    const lo = mkCanvas(w, h); lo.getContext('2d').drawImage(hr, 0, 0, w, h); lo._hr = hr;
    return lo;
  }

  // ---- a label cast in pitted bronze, at four times the grid, cached per word and state
  const CAST = {};
  function castLabel(label, bright) {
    const key = label + (bright ? '|1' : '|0'); if (CAST[key]) return CAST[key];
    const S = 4, fs = 10, h = 14, m0 = mkCanvas(8, 8).getContext('2d'); m0.font = `${fs * S}px "IM Fell English SC", Georgia, serif`;
    if ('letterSpacing' in m0) m0.letterSpacing = `${S}px`;
    const w = Math.ceil(m0.measureText(label).width / S) + 6, m = mkCanvas(w * S, h * S), mx = m.getContext('2d');
    mx.font = m0.font; if ('letterSpacing' in mx) mx.letterSpacing = `${S}px`; mx.textAlign = 'center'; mx.fillStyle = '#fff'; mx.fillText(label, w * S / 2, 10 * S);
    const md = mx.getImageData(0, 0, m.width, m.height).data, hr = mkCanvas(w * S, h * S), x = hr.getContext('2d'), out = x.createImageData(m.width, m.height), od = out.data;
    const at = (i, j) => (i < 0 || j < 0 || i >= m.width || j >= m.height) ? 0 : md[(j * m.width + i) * 4 + 3];
    const BZ = bright ? [[27, 16, 8], [61, 37, 18], [112, 70, 34], [168, 116, 58], [214, 164, 96], [240, 210, 150]]
                      : [[40, 26, 14], [96, 64, 34], [146, 104, 58], [182, 138, 82], [208, 166, 104], [226, 190, 130]];
    const VG = [[29, 51, 38], [42, 71, 53], [58, 92, 70]], top = 10 * S - 8 * S, bot = 10 * S + S;
    for (let j = 0; j < m.height; j++) for (let i = 0; i < m.width; i++) {
      const a = at(i, j), o = (j * m.width + i) * 4;
      if (a > 110) {
        const f = (j - top) / (bot - top); let k = f < 0.2 ? 4 : f < 0.5 ? 3 : f < 0.8 ? 2 : 1;
        if (at(i - S, j - S) < 110) k = Math.min(5, k + 1);
        if (at(i + S, j + S) < 110) k = Math.max(0, k - 1);
        let c = BZ[k];
        // pits: the metal is eaten in small cells; tarnished letters hold verdigris in them
        const gi = Math.floor(i / S), gj = Math.floor(j / S), hsh = hash(gi * 7 + label.length * 13, gj * 11 + 5);
        if (hsh < (bright ? 0.05 : 0.08)) c = !bright && hsh < 0.03 ? VG[2] : BZ[Math.max(1, k - 1)];
        od[o] = c[0]; od[o + 1] = c[1]; od[o + 2] = c[2]; od[o + 3] = 255;
      } else {
        let near = 0; for (const [di, dj] of [[S, 0], [-S, 0], [0, S], [0, -S], [-S, -S], [S, S], [2 * S, 2 * S], [0, 2 * S], [S, 2 * S]]) if (at(i + di, j + dj) > 110) near = 1;
        if (near) { od[o] = 5; od[o + 1] = 3; od[o + 2] = 3; od[o + 3] = 245; }
      }
    }
    x.putImageData(out, 0, 0);
    const lo = mkCanvas(w, h); lo.getContext('2d').drawImage(hr, 0, 0, w, h); lo._hr = hr;
    if (document.fonts && document.fonts.check && document.fonts.check(`${fs}px "IM Fell English SC"`)) CAST[key] = lo;
    return lo;
  }

  // ---- drawing
  const _dts = drawTitleScene;
  drawTitleScene = function (dt) {
    // the scene, moved to the middle, and its missing right edge from its own left side, mirrored
    ctx.save(); ctx.translate(SHIFT, 0); _dts.apply(this, arguments); ctx.restore();
    // the strip right of the scene: its own left side, mirrored about the face (the chapel is symmetric)
    // (the painted backdrop only, laid in with a stepped cross-fade so no seam shows, then the film grain over it)
    if (TT.bg) {
      const hr = TT.bg._hr || TT.bg, k = hr.width / TT.bg.width;
      const slice = (x0, w, a) => { ctx.save(); ctx.globalAlpha = a; ctx.translate(580, 0); ctx.scale(-1, 1); const sx = 580 - x0 - w; ctx.drawImage(hr, sx * k, 0, w * k, 270 * k, sx, 0, w, 270); ctx.restore(); };
      for (let i = 0; i < 6; i++) slice(368 + i * 2, 2, (i + 1) / 7);
      slice(380, 100, 1);
      if (TT.grain) { const g = TT.grain[((Math.floor((G.time || 0) * 14) % 4) + 4) % 4], gh = g._hr || g, gk = gh.width / g.width; ctx.drawImage(gh, 380 * gk, 0, 100 * gk, 270 * gk, 380, 0, 100, 270); }
    }
    // a vignette at both sides (it also hides the seam of the mirrored strip): stepped, not smooth
    for (let i = 0; i < 12; i++) {
      const a = 0.07 + i * 0.045, w = 10;
      ctx.fillStyle = `rgba(3,2,4,${a.toFixed(3)})`;
      ctx.fillRect(480 - (12 - i) * w, 0, w, 270); ctx.fillRect((12 - i - 1) * w, 0, w, 270);
    }
    if (intro.classList.contains('showpanel')) return;
    const t = G.time || 0;
    // a dark band behind the title, dithered, and the title
    for (let y = 0; y < 50; y += 1) { const a = 0.55 * (1 - y / 50); ctx.fillStyle = `rgba(4,3,6,${a.toFixed(3)})`; ctx.fillRect(0, y, 480, 1); }
    if (!titleC && document.fonts && document.fonts.check && document.fonts.check('22px "IM Fell English SC"')) titleC = buildTitle();
    if (!titleC && G.time > 3) titleC = buildTitle();
    if (titleC) ctx.drawImage(titleC, 240 - 150, 1);
    // the rule under it, with an eye in the middle that opens and shuts
    ctx.fillStyle = '#3d2512'; ctx.fillRect(150, 36, 76, 1); ctx.fillRect(254, 36, 76, 1);
    ctx.fillStyle = '#704622'; ctx.fillRect(170, 36, 50, 1); ctx.fillRect(260, 36, 50, 1);
    for (const x of [150, 329]) { ctx.fillStyle = '#945e2e'; ctx.fillRect(x, 35, 1, 3); }
    const blink = (t % 6.5) > 6.25;
    ctx.fillStyle = '#945e2e'; ctx.fillRect(233, 36, 14, 1);
    if (!blink) {
      ctx.fillStyle = '#1b1008'; ctx.fillRect(235, 34, 10, 5); ctx.fillStyle = '#c08644'; ctx.fillRect(234, 35, 1, 3); ctx.fillRect(245, 35, 1, 3); ctx.fillRect(236, 33, 8, 1); ctx.fillRect(236, 39, 8, 1);
      ctx.fillStyle = '#e8d8b0'; ctx.fillRect(237, 35, 6, 3); ctx.fillStyle = '#84181c'; ctx.fillRect(239, 35, 2, 3); ctx.fillStyle = '#050303'; ctx.fillRect(239 + Math.round(Math.sin(t * 0.7)), 36, 1, 1);
    } else { ctx.fillStyle = '#c08644'; ctx.fillRect(235, 36, 10, 1); }
    ctx.save(); ctx.font = 'italic 7px "IM Fell English", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#050304'; ctx.fillText('The god is dead, and has not finished dying.', 240.5, 49.5);
    ctx.fillStyle = '#8f7a5c'; ctx.fillText('The god is dead, and has not finished dying.', 240, 49); ctx.restore();

    // the choices, floating on the blood
    const L = layout(); if (!L.length) return;
    const f = document.activeElement, fi = L.findIndex(it => it.el && it.el === f);
    if (fi >= 0) sel = fi; sel = Math.min(sel, L.length - 1);
    ctx.save(); ctx.font = '8px "IM Fell English SC", Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    L.forEach((it, i) => {
      const on = i === sel; kindle[it.id] = Math.max(0, Math.min(1, (kindle[it.id] || 0) + (on ? 0.08 : -0.05)));
      const k = kindle[it.id], drift = 0;   // v95: the words hold still (they jiggled)
      const x = it.x + drift, y = it.y;
      // v94: the words are cast in old pitted bronze (tarnished, green in the pits); the chosen one is rubbed bright
      const lab = castLabel(it.label, k > 0.5);
      ctx.drawImage(lab, Math.round(x - lab.width / 2), y - 10);
      if (on) {
        // a sigil turning on either side: a small triangle with its eye
        for (const side of [-1, 1]) {
          const sx = Math.round(x + side * (it.w / 2 + 2)), sy = y - 3, a = t * 1.6 * side;
          for (let q = 0; q < 6; q++) { const aa = a + q * 1.047; ctx.fillStyle = q % 2 ? '#553418' : '#945e2e'; ctx.fillRect(Math.round(sx + Math.cos(aa) * 3), Math.round(sy + Math.sin(aa) * 3), 1, 1); }
          ctx.fillStyle = '#2a4735'; ctx.fillRect(sx, sy, 1, 1);
        }
      }
    });
    ctx.restore();
    // the god's drop answers the choice: it falls into the chosen word and rings the blood
    const cur = L[sel]; if (cur && cur.id !== drops.lastId) { drops.lastId = cur.id; drops.push({ x: cur.x, y: 128, ty: cur.y - 3, v: 30 }); }
    for (const d of drops) { if (d.done) continue; d.v += 380 * dt; d.y += d.v * dt; if (d.y >= d.ty) { d.done = true; TT.rings.push({ x: d.x - SHIFT, y: d.ty, r: 0, t: 0 }); } else { ctx.fillStyle = '#84181c'; ctx.fillRect(Math.round(d.x), Math.round(d.y) - 2, 1, 3); ctx.fillStyle = '#e8704e'; ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 1); } }
    for (let i = drops.length - 1; i >= 0; i--) if (drops[i].done) drops.splice(i, 1);
    // what hovering the mouse does
    if (mouse.x !== lastMouse.x || mouse.y !== lastMouse.y) { lastMouse = { x: mouse.x, y: mouse.y }; const h = hit(L, mouse.x, mouse.y); if (h >= 0) { sel = h; if (L[h].el && L[h].el.focus) try { L[h].el.focus({ preventScroll: true }); } catch (e) { } } }
  };
  // the touch code asks TT.hover what is under a finger: give it the choice there
  const _tu = ttUpdate;
  ttUpdate = function () {
    const r = _tu.apply(this, arguments);
    try { if (!intro.classList.contains('showpanel')) { const L = layout(), h = hit(L, mouse.x, mouse.y); if (h >= 0) { const it = L[h]; TT.hover = { x: it.x - it.w / 2 + 6, y: it.y - 2, act: it.act }; sel = h; } } } catch (e) { }
    return r;
  };
  // clicks and keys on the painted menu
  cv.addEventListener('click', e => {
    if (G.running || G.divine || intro.hidden || intro.classList.contains('showpanel') || (typeof TOUCH !== 'undefined' && TOUCH.on)) return;
    const L = layout(), h = hit(L, mouse.x, mouse.y); if (h >= 0) { sfx && sfx(520, 0.08, 'sine', 0.03); L[h].act(); }
  });
  addEventListener('keydown', e => {
    if (G.running || G.divine || intro.hidden) return;
    if (intro.classList.contains('showpanel')) { if (e.key === 'Escape') { intro.classList.remove('showpanel'); e.preventDefault(); } return; }
    const L = layout(); if (!L.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + L.length) % L.length; if (L[sel].el) try { L[sel].el.focus({ preventScroll: true }); } catch (er) { } e.preventDefault(); }
    else if (e.key === 'Enter' && !(document.activeElement && document.activeElement.tagName === 'BUTTON')) { L[sel].act(); e.preventDefault(); }
  });
  // the old panel closes when you click outside it
  intro.addEventListener('click', e => { if (intro.classList.contains('showpanel') && !e.target.closest('.intro-panel')) intro.classList.remove('showpanel'); });
  try { window.__title54 = { items, layout, get sel() { return sel; } }; } catch (e) { }
})();
