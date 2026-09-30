// zz_zx_dark64.js — the user (2026-09-29): "the ambient light comes from nowhere ... It needs to feel like your hero is
// wandering in this wasteland with only their lantern to guide them, but during the day it's a little easier to see ...
// the light radius comes from the lamps not the hero. make the light more defined like a radius on the ground pushes
// the darkness back."
// A layer of darkness is laid over the whole world, and every flame cuts it back: the hero's lantern cuts a clear pool
// on the ground around the lantern (an iso ellipse with a firm, dithered rim, so the light has an edge), braziers,
// fires and lanterns in the world cut their own smaller pools. By night the dark outside is nearly total; by day it is
// a heavy dusk you can see through. The pool breathes with the flame.
(function () {
  if (typeof drawAtmos !== 'function') return;
  const DK = { on: true };
  try { window.__dark64 = DK; } catch (e) { }
  let M = null, mx = null, img = null, last = { w: 0, h: 0 };
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  // per-pixel darkness: 0 in the heart of a pool, 1 in the open dark; the rim falls off over a short band with a dither
  // v0.69 (user: "the lantern should be the primary light ... that indie art feel"): the dark is a cool blue-violet, and
  // each pool is warmed in stepped rings of its own light (an overlay tint, three hard bands), so the lantern's circle glows
  // warm against the cold like a painted scene, and the step between light and dark is a designed edge, not a smear.
  let T = null, tx = null, timg = null, SHM = null, shx = null;
  function paint(holes, A, rgb, sc) {
    // v0.75 perf: on a slow device the dark is painted at half resolution and laid on scaled up
    sc = sc || 1; if (sc !== 1) holes = holes.map(h => Object.assign({}, h, { x: h.x / sc, y: h.y / sc, r: h.r / sc, shadows: h.shadows && h.shadows.map(q => q.map(pt => [pt[0] / sc, pt[1] / sc])) }));
    const W = Math.ceil(VW / sc), H = Math.ceil(VH / sc);
    if (!M || last.w !== W || last.h !== H) { M = mkCanvas(W, H); mx = M.getContext('2d'); img = mx.createImageData(W, H); T = mkCanvas(W, H); tx = T.getContext('2d'); timg = tx.createImageData(W, H); last = { w: W, h: H }; }
    const D = img.data, TD = timg.data, dark = new Float32Array(W * H).fill(1), warmK = new Float32Array(W * H), wc = new Int16Array(W * H * 3);
    // v0.70 (user: "a ring of light, like walking through a cave, the darkness stronger at the edge and growing ... not pitch
    // black outside"): a bright core; three stepped bands; a thin brighter ring where the light meets the dark; then the dark
    // keeps deepening with distance out to about twice the radius, where it settles at the open dark (never full black).
    for (const h of holes) {
      const far = h.far || 2.1, rx = h.r * far, ry = h.r * 0.56 * far, x0 = Math.max(0, Math.floor(h.x - rx)), x1 = Math.min(W - 1, Math.ceil(h.x + rx)), y0 = Math.max(0, Math.floor(h.y - ry)), y1 = Math.min(H - 1, Math.ceil(h.y + ry));
      const core = h.core || 0.5, C = h.rgb || [255, 214, 160], wk = h.w == null ? 0.6 : h.w, iR = 1 / h.r, iRy = 1 / (h.r * 0.56);
      // v0.84 (user: "should objects block the light and cast shadows. The light ring just overlays"): walls, trunks,
      // rocks and pillars stop the lantern's light; behind them the dark stays. Their shadow shapes are painted into a mask.
      let MKD = null;
      if (h.shadows && h.shadows.length) {
        if (!SHM || SHM.width !== W || SHM.height !== H) { SHM = mkCanvas(W, H); shx = SHM.getContext('2d', { willReadFrequently: true }); }
        shx.setTransform(1, 0, 0, 1, 0, 0); shx.clearRect(0, 0, W, H); shx.fillStyle = '#fff'; shx.imageSmoothingEnabled = false;
        shx.beginPath(); for (const q of h.shadows) { shx.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) shx.lineTo(q[i][0], q[i][1]); shx.closePath(); } shx.fill('nonzero');
        MKD = shx.getImageData(0, 0, W, H).data;
      }
      for (let y = y0; y <= y1; y++) {
        const dy = (y - h.y) * iRy;
        for (let x = x0; x <= x1; x++) {
          const dx = (x - h.x) * iR, d = Math.sqrt(dx * dx + dy * dy); if (d >= far) continue;
          let v, band;
          if (d < core) { v = 0; band = 1; }
          else if (d < 1) {
            const u = (d - core) / (1 - core);
            // v0.71 (user: 'too soft ... stylize it'): flat, hard-edged tiers like a painted lamp pool, a bright rim line, a hard edge
            // v0.72 (user: 'too intense ... as if it's actually coming out of a lantern, useful but not intrusive'): a natural
            // lamp falloff, brightest by the lantern and easing out, with only the faintest rim
            // v0.79 (user: 'make the concentric rings of light a little more evident, contrast the light and darkness a bit more'):
            // four gentle steps, each riser softened over a short band, so the rings read without the hard v71 look
            { const q = u * 3, i = Math.floor(q), f = q - i, r0 = Math.max(0, (f - 0.86) / 0.14), s = i + r0 * r0 * (3 - 2 * r0); v = 0.64 * Math.pow(s / 3, 1.15); }
            band = 1 - u * u;
            // v0.73 (user: 'a faint ring is fine, in the light'): a thin, faint brightening just inside the pool's edge
            if (h.ring) { const rg = Math.exp(-Math.pow((d - 0.9) / 0.06, 2)) * h.ring; v = Math.max(0, v - rg); band = Math.max(band, rg * 2.2); }
          } else { const u = (d - 1) / (far - 1); v = 0.64 + 0.36 * Math.pow(u, 0.6); band = 0; }   // the dark keeps gathering beyond
          const k = y * W + x;
          if (MKD) { const mk = MKD[k * 4 + 3] / 255; if (mk > 0) { const sf = d <= 1 ? 0.9 : Math.max(0, 0.9 * (1 - (d - 1) / (far - 1) * 1.6)); v = v + (1 - v) * mk * sf; band *= 1 - mk * sf; } }   // v0.88: never blacker than the open dark
          if (v < dark[k]) dark[k] = v;
          band *= wk; if (band > warmK[k]) { warmK[k] = band; wc[k * 3] = C[0]; wc[k * 3 + 1] = C[1]; wc[k * 3 + 2] = C[2]; }
        }
      }
    }
    for (let y = 0, k = 0; y < H; y++) for (let x = 0; x < W; x++, k++) {
      let v = dark[k];
      v = Math.min(1, Math.floor(v * 12 + BAY[((y & 3) << 2) + (x & 3)]) / 12);   // fine dithered steps, no banding
      const o = k * 4; D[o] = rgb[0]; D[o + 1] = rgb[1]; D[o + 2] = rgb[2]; D[o + 3] = Math.round(255 * A * v);
      const w = warmK[k]; if (w > 0) { TD[o] = wc[k * 3]; TD[o + 1] = wc[k * 3 + 1]; TD[o + 2] = wc[k * 3 + 2]; TD[o + 3] = Math.round(255 * 0.5 * w); } else TD[o + 3] = 0;
    }
    mx.putImageData(img, 0, 0); tx.putImageData(timg, 0, 0);
    return M;
  }
  // the shapes that stop the lantern's light, as screen polygons: each throws a shadow away from the light (world coords
  // first, projected after). Walls, cliffs and palisades are whole tiles; trunks, rocks and pillars are round bases.
  // tile ids (the name T is this file's tint canvas): TREE 2, ROCK 3, CLIFF 5, WALL 7, PILLAR 9, PALISADE 10
  const RND = { 2: 0.24, 3: 0.4, 9: 0.34 }, SQ = { 5: 1, 7: 1, 10: 1 };
  function occluders(z, lx, ly, Rw) {
    const out = [], L = Rw * 1.6, x0 = Math.floor(lx - Rw), x1 = Math.floor(lx + Rw), y0 = Math.floor(ly - Rw), y1 = Math.floor(ly + Rw);
    const P2 = (x, y) => { const p = iso(x, y); return [p.sx, p.sy + 1]; };
    for (let ty = y0; ty <= y1; ty++) for (let tx2 = x0; tx2 <= x1; tx2++) {
      const t = z.get(tx2, ty); const rr = RND[t], sq = SQ[t]; if (!rr && !sq) continue;
      const cx = tx2 + 0.5, cy = ty + 0.5, dx = cx - lx, dy = cy - ly, dd = Math.hypot(dx, dy); if (dd < 0.45 || dd > Rw + 1) continue;
      let a, b;
      if (rr) {
        if (dd <= rr + 0.05) continue;
        const th = Math.atan2(dy, dx), al = Math.asin(Math.min(0.99, rr / dd)), tl = Math.sqrt(dd * dd - rr * rr);
        a = [lx + Math.cos(th - al) * tl, ly + Math.sin(th - al) * tl]; b = [lx + Math.cos(th + al) * tl, ly + Math.sin(th + al) * tl];
      } else {
        const th = Math.atan2(dy, dx); let mn = 9, mx2 = -9;
        for (const c of [[tx2, ty], [tx2 + 1, ty], [tx2, ty + 1], [tx2 + 1, ty + 1]]) { let d = Math.atan2(c[1] - ly, c[0] - lx) - th; d = Math.atan2(Math.sin(d), Math.cos(d)); if (d < mn) { mn = d; a = c; } if (d > mx2) { mx2 = d; b = c; } }
      }
      const ex = (p) => { const vx = p[0] - lx, vy = p[1] - ly, l = Math.hypot(vx, vy) || 1; return [p[0] + vx / l * L, p[1] + vy / l * L]; };
      out.push([P2(a[0], a[1]), P2(b[0], b[1]), P2(...ex(b)), P2(...ex(a))]);
    }
    // v0.85: the things set on the ground cast too: wayside saints, gibbet cages, pilgrims' tents, shrines
    const round = (cx, cy, rr) => {
      const dx = cx - lx, dy = cy - ly, dd = Math.hypot(dx, dy); if (dd <= rr + 0.05 || dd > Rw + 1) return;
      const th = Math.atan2(dy, dx), al = Math.asin(Math.min(0.99, rr / dd)), tl = Math.sqrt(dd * dd - rr * rr);
      const a = [lx + Math.cos(th - al) * tl, ly + Math.sin(th - al) * tl], b = [lx + Math.cos(th + al) * tl, ly + Math.sin(th + al) * tl];
      const ex = (p) => { const vx = p[0] - lx, vy = p[1] - ly, l = Math.hypot(vx, vy) || 1; return [p[0] + vx / l * L, p[1] + vy / l * L]; };
      out.push([P2(a[0], a[1]), P2(b[0], b[1]), P2(...ex(b)), P2(...ex(a))]);
    };
    const DR = { statue_saint: 0.32, statue_angel: 0.34, cage: 0.22, cage2: 0.22, tent: 0.75 };
    try { if (window.__decor66) for (const o of window.__decor66.place(z)) { const rr = DR[o.k]; if (rr) round(o.x, o.y, rr); } } catch (e) { }
    for (const o of z.objects || []) if (o.type === 'shrine' || o.type === 'altar') round(o.x, o.y, 0.4);
    return out;
  }
  let frame = 0, cache = null;
  const _da = drawAtmos;
  drawAtmos = function () {
    try {
      const z = G.zone;
      if (DK.on && z && !G.lowFx2) {
        const out = isOutdoor(z), dk = out ? dayK() : 0;
        // how dark the open dark is: by day you can see, by night the lantern is all you have; underground always night
        const A = (out ? 0.82 - 0.5 * dk * dk : 0.84) * (1 - 0.6 * (window.__flash76 ? window.__flash76() : 0));   // v0.76: the far flash lifts it   // the open dark: deep, never black DK.n = (DK.n || 0) + 1; DK.A = A;
        const holes = [];
        const fl = window.__flameS ? window.__flameS(3.3) : 1, br = 1 + (fl - 1) * 0.35;
        if (!P.dead) {
          const L = window.__plLamp ? window.__plLamp() : null, q = iso(P.x, P.y);
          const LF = window.__lampFoot ? window.__lampFoot() : null, fq = LF ? iso(LF[0], LF[1]) : null, lx = fq ? fq.sx : L ? L.x : q.sx, ly = (fq || q).sy + 1;   // v0.74: under the floating lantern   // the pool lies on the ground straight under the lantern
          const R = Math.min(typeof heroLightR === 'function' ? heroLightR() : 5, 5.4 * (window.__lampK ? window.__lampK() / 1.5 : 1)) * ISO_R * 0.4 * (1 + (br - 1) * 0.4) * (1 + 0.5 * dk) * (window.__lampMood ? window.__lampMood() : 1);   // v0.71: a little tighter (lantern stats widen it)
          const shadows = LF ? occluders(z, LF[0], LF[1], R * 2.1 / ISO_R) : null;
          holes.push({ shadows, x: lx, y: ly, r: R, core: 0.22, far: 2.1, w: 1, ring: 0.26, rgb: (({ hemomancer: '255,164,84', animancer: '120,178,255' })[P.cls] || '255,170,96').split(',').map(Number) });   // the pool's tint: amber candle, ghost-blue glass
        }
        // v0.87: the nearest few world flames are blocked by walls and trunks too (not wall candles: their wall is behind them)
        const nearSrc = (L37.src || []).filter(s => s.kind !== 'wallc' && s.x != null).map(s => [Math.hypot(s.x - P.x, s.y - P.y), s]).sort((a, b) => a[0] - b[0]).slice(0, window.__perf74 && window.__perf74.slow ? 1 : 4).map(e => e[1]);
        for (const s of (L37.src || [])) {
          const R = (s.R || 3) * ISO_R * (s.kind === 'lantern' ? 0.26 : s.kind === 'brazier' ? 0.36 : s.kind === 'wallc' ? 0.3 : 0.32) * (s.f || 1), rr = Math.max(14, R);
          const shadows = nearSrc.includes(s) ? occluders(z, s.x, s.y, rr * 1.6 / ISO_R) : null;
          holes.push({ shadows, x: s.gx != null ? s.gx : s.sx, y: s.gy != null ? s.gy : s.sy, r: rr, core: 0.4, far: 1.6, w: 0.3, rgb: String(s.rgb || '255,150,72').split(',').map(Number) });
        }
        for (const f of G.fires || []) { const p = iso(f.x, f.y); holes.push({ x: p.sx, y: p.sy, r: 26 + (f.R || 1) * 18, core: 0.35, far: 1.5, w: 0.35 }); }
        // v0.74 (user: 'the wisps should cast light but not have a shadow'): each wisp opens a small soft pool of its own
        // light on the ground under it, and a smaller one around its own body so the dark never swallows it
        const WC = { rev: [196, 226, 240], beam: [236, 222, 190], prism: [214, 204, 236] };
        for (const w of (P.wisps || [])) {
          if (w.dart) continue; const p = iso(w.x, w.y), c = WC[w.kind] || WC.rev, br = 0.85 + 0.15 * Math.sin(G.time * 2.3 + (w.wt || 0) * 5);
          holes.push({ x: p.sx, y: p.sy + 1, r: 21 * br, core: 0.25, far: 1.5, w: 0.5, rgb: c });
          holes.push({ x: p.sx, y: p.sy - (w.z || 0), r: 12, core: 0.3, far: 1.4, w: 0.4, rgb: c });
        }
        try { if (window.__extraHoles) for (const h of window.__extraHoles()) holes.push(h); } catch (e) { }
        const rgb = out ? [8, 13, 27] : [8, 9, 20];   // v0.76: blue-teal, analogous (warm light over it reads amber, not pink)   // a cold blue-violet dark
        // repaint every other frame (the pool moves with the hero; half rate is invisible and halves the cost)
        const slow = window.__perf74 && window.__perf74.slow, sc = slow ? 2 : 1;
        if (!cache || (frame++ & 1) === 0 || cache.width !== Math.ceil(VW / sc)) cache = paint(holes, A, rgb, sc);
        ctx.save(); ctx.setTransform(RS * ZK, 0, 0, RS * ZK, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.imageSmoothingEnabled = false;
        ctx.drawImage(cache, 0, 0, cache.width * sc, cache.height * sc);
        ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.2 + 0.1 * (1 - dk); ctx.drawImage(T, 0, 0, T.width * sc, T.height * sc);   // just a breath of the lamp's colour ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
      }
    } catch (e) { if (typeof reportError === 'function') reportError(e); }
    return _da.apply(this, arguments);
  };
})();
// v0.66 (user): "ethereal, ghostly ... little spots of light that leave a ghostly trail. Not tiny insects but also not as
// big as they were." Each wisp is a soft spot of pale light (a bright 2x2 heart, a small breathing halo) trailing a
// thin ghostly wake: the places it has been, fading, curling up and apart like breath in cold air.
(function () {
  const COL = { rev: [196, 226, 240], beam: [236, 222, 190], prism: [214, 204, 236] };
  const TR = new WeakMap();
  function trail(w) {
    let t = TR.get(w); if (!t) { t = { pts: [], last: 0 }; TR.set(w, t); }
    if (G.time - t.last > 0.028) {
      t.last = G.time; t.pts.push({ x: w.x, y: w.y, z: w.z, t: G.time, s: Math.random() * 6.28 });
      while (t.pts.length && G.time - t.pts[0].t > 0.9) t.pts.shift();
    }
    return t.pts;
  }
  function draw(w) {
    const c = COL[w.kind] || COL.rev, rgb = c.join(','), ph = (w.wt || 0) * 5;
    const bob = Math.sin(G.time * 1.3 + ph) * 1.2, p = iso(w.x, w.y), sx = Math.round(p.sx), sy = Math.round(p.sy - w.z + bob);
    const br = 0.72 + 0.28 * Math.sin(G.time * 2.3 + ph) * Math.sin(G.time * 5.1 + ph * 0.7);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // the wake: older points rise and spread and fade
    const pts = trail(w);
    for (let i = 0; i < pts.length; i++) {
      const q = pts[i], age = G.time - q.t, k = 1 - age / 0.9; if (k <= 0) continue;
      const pp = iso(q.x, q.y), drift = age * 6, x = Math.round(pp.sx + Math.sin(q.s + age * 4) * age * 3), y = Math.round(pp.sy - q.z + bob - drift);
      ctx.globalAlpha = 0.34 * k * k * br; ctx.fillStyle = `rgb(${rgb})`; ctx.fillRect(x, y, 1, 1);
      if (k > 0.6) { ctx.globalAlpha = 0.12 * k * br; ctx.fillRect(x + 1, y, 1, 1); }
    }
    // v0.74: a little ethereal dust shed as it goes: single motes that twinkle and sink and fade
    const T2 = TR.get(w);
    if (T2) {
      const ds = T2.dust || (T2.dust = []);
      if (G.time - (T2.dl || 0) > 0.09 && ds.length < 14) { T2.dl = G.time; if (Math.random() < 0.7) ds.push({ x: w.x, y: w.y, z: w.z + bob + (Math.random() - 0.5) * 3, ox: (Math.random() - 0.5) * 5, t: G.time, L: 0.7 + Math.random() * 0.8, s: Math.random() * 6.28 }); }
      for (let i = ds.length - 1; i >= 0; i--) {
        const m = ds[i], a = G.time - m.t, k = 1 - a / m.L; if (k <= 0) { ds.splice(i, 1); continue; }
        const pp = iso(m.x, m.y), x = Math.round(pp.sx + m.ox + Math.sin(m.s + a * 2) * 1.2), y = Math.round(pp.sy - m.z + a * 5);
        const tw = 0.5 + 0.5 * Math.sin(m.s * 3 + a * 14);                     // the twinkle
        ctx.globalAlpha = 0.55 * k * tw; ctx.fillStyle = tw > 0.85 ? '#fff' : `rgb(${rgb})`; ctx.fillRect(x, y, 1, 1);
      }
    }
    // the light itself
    const eb = 0.8 + 0.2 * Math.sin(G.time * 1.1 + ph);   // v0.80: a slow ethereal breath
    glow(sx + 1, sy + 1, 18, rgb, 0.12 * br * eb); glow(sx + 1, sy + 1, 10, rgb, 0.3 * br); glow(sx + 1, sy + 1, 5, rgb, 0.45 * br);   // v0.80: a wide soft halo, more ethereal glow   // v0.76: a little more glow
    ctx.globalAlpha = 0.95 * br; ctx.fillStyle = `rgb(${Math.min(255, c[0] + 30)},${Math.min(255, c[1] + 25)},${Math.min(255, c[2] + 15)})`; ctx.fillRect(sx, sy, 2, 2);
    ctx.globalAlpha = 0.35 * br; ctx.fillStyle = `rgb(${rgb})`; ctx.fillRect(sx - 1, sy, 1, 2); ctx.fillRect(sx + 2, sy, 1, 2); ctx.fillRect(sx, sy - 1, 2, 1); ctx.fillRect(sx, sy + 2, 2, 1);
    ctx.restore();
  }
  if (typeof mnDrawWisp === 'function') mnDrawWisp = function (w) { draw(w); };
  if (typeof wfDrawWisp === 'function') { wfDrawWisp = function (w) { draw(w); }; }   // v0.79: a darting wisp is the same ghost light, not a bright comet streak
})();
