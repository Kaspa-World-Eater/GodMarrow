// zz_zz_maw95.js — the user (2026-09-29): "waypoints are already used in Diablo and bonfires in Dark Souls. Our game should
// have the ancient-looking waypoint, but instead there are Lovecraftian hints that it's a maw: you step into it and the body
// dissolves bloodily, then is reborn at the next place."
// THE WAYSTONE, as drawn now: a ring of old flagstones sunk in the ground, and inside it a ring of pale leaning stones around
// a dark pit. At a glance a stone circle. Look again: the stones are curved like teeth and rooted in something dark and wet,
// the pit narrows and widens slowly, and ridges move down it. A waystone that doesn't know you yet is clenched shut.
// TRAVEL: you walk to the centre; you sink into the throat while it widens; your body comes apart in blood and matter; the
// teeth close. Black. At the destination the teeth part, blood spills out, and you rise out of the throat, wet, and it closes
// behind you. Nothing glows; blood is matter, never light.
(function () {
  const WS = [];                    // per-zone waystone state, keyed by the object itself
  const st = o => (o._maw || (o._maw = { open: 0, want: 0, t: Math.random() * 10, snap: 0, spurt: 0 }));
  const known = () => !!(P.qst && P.qst.wp && G.zone && P.qst.wp[G.zone.id]);
  const SEQ = { on: false, t: 0, id: null, go: null, o: null, from: null, phase: '' };
  const STAINS = [];                // blood left on the ground, fading
  const DRIPS = { t: 0 };           // the hero is wet for a while after arriving
  const RX = 24, RY = 12;           // the ring of teeth, in screen px at world scale

  // ---------------------------------------------------------------- the old sprite goes; the maw draws itself
  if (typeof ztObjSprite === 'function') {
    const _os = ztObjSprite;
    const NONE = (() => { const c = mkCanvas(1, 1); return { c, f: c, w: 1, h: 1, fl: c, flf: c }; })();
    ztObjSprite = function (o) { if (o && o.q === 'wp') return NONE; return _os.apply(this, arguments); };
  }
  const H = (a, b) => hash(a * 13 + 7, b * 29 + 3);
  // v95b, the user: "shouldn't be so obviously a mouth, more like ancient stone ruins with a hint of biology inside".
  // A ruined ring of broken standing stones round a sunken dais; steps go down into a pit. At the bottom, under a crust
  // of old ash, something dark and wet lies, and it moves a little, slowly, like breath. Nothing more is shown.
  const C = { stone: ['#121016', '#1c191e', '#282328', '#353033', '#453e3d', '#585049'], moss: '#27332a',
    crust: ['#2a2622', '#3a342e', '#4a433a'], flesh: ['#0c0506', '#170a0b', '#221011', '#2e1616'], vein: '#3e2422', sheen: 'rgba(170,140,130,0.28)' };
  // the ring: eight shrine-stones, cut and set by hands, each shaped like a fang: a squared plinth, a tapering body curved
  // in toward the pit, carved bands round it and a channel down its face. At the foot of some, a dark stain has seeped
  // out of the plinth, and a pale fibre or two runs into the ground. One has fallen.
  function stones(o, cx, cy, front) {
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + 0.2, sn = Math.sin(a);
      if ((sn > 0) !== front) continue;
      const h = H(i, (o.x | 0) + (o.y | 0)), bx = Math.round(cx + Math.cos(a) * (RX + 6)), by = Math.round(cy + Math.sin(a) * (RY + 3));
      // the plinth: a squared block, lit on top
      ctx.fillStyle = C.stone[0]; ctx.fillRect(bx - 5, by - 3, 10, 4); ctx.fillStyle = C.stone[3]; ctx.fillRect(bx - 5, by - 3, 10, 1); ctx.fillStyle = C.stone[2]; ctx.fillRect(bx - 4, by - 2, 8, 2);
      // a stain seeping from the plinth into the ground (biology, barely)
      if (h > 0.45) { ctx.fillStyle = 'rgba(46,14,16,0.75)'; ctx.fillRect(bx - 2, by + 1, 3 + (h * 3 | 0), 1); ctx.fillRect(bx - 1, by + 2, 2, 1); ctx.fillStyle = 'rgba(46,14,16,0.45)'; ctx.fillRect(bx + 1, by + 3, 2, 1); }
      if (h > 0.7) { ctx.fillStyle = 'rgba(150,130,112,0.5)'; ctx.fillRect(bx + 4, by, 1, 1); ctx.fillRect(bx + 5, by + 1, 2, 1); }   // a pale fibre into the earth
      if (i === 5) {   // the fallen one: its fang lies across the dais edge
        ctx.fillStyle = C.stone[0]; ctx.fillRect(bx - 11, by - 4, 13, 4); ctx.fillStyle = C.stone[3]; ctx.fillRect(bx - 11, by - 4, 11, 1); ctx.fillStyle = C.stone[2]; ctx.fillRect(bx - 10, by - 3, 10, 2); ctx.fillStyle = C.stone[1]; ctx.fillRect(bx - 7, by - 3, 1, 2); ctx.fillRect(bx - 4, by - 3, 1, 2);
        continue;
      }
      // the fang: tapering, curved in toward the pit
      const ht = Math.round(12 + h * 9), w = 3.5 + (h > 0.5 ? 0.8 : 0), dx = (cx - bx) / (RX + 6), lean = 3 + h * 2;
      const tipx = bx + dx * lean, tipy = by - 3 - ht, mx = bx + dx * lean * 0.3, my = by - 3 - ht * 0.55;
      ctx.fillStyle = C.stone[0];
      ctx.beginPath(); ctx.moveTo(bx - w - 1, by - 2); ctx.quadraticCurveTo(mx - w, my, tipx - 0.8, tipy - 1); ctx.lineTo(tipx + 0.8, tipy - 1); ctx.quadraticCurveTo(mx + w + 1, my, bx + w + 1, by - 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.stone[2];
      ctx.beginPath(); ctx.moveTo(bx - w, by - 3); ctx.quadraticCurveTo(mx - w + 0.5, my, tipx - 0.4, tipy); ctx.lineTo(tipx + 0.4, tipy); ctx.quadraticCurveTo(mx + w, my, bx + w, by - 3); ctx.closePath(); ctx.fill();
      // the lit face, a little paler than stone should be
      ctx.fillStyle = h > 0.6 ? '#6f675b' : C.stone[4];
      ctx.beginPath(); ctx.moveTo(bx - w + 0.6, by - 3); ctx.quadraticCurveTo(mx - w + 1, my, tipx - 0.3, tipy + 0.5); ctx.lineTo(bx - 0.5, by - 3); ctx.closePath(); ctx.fill();
      // carved bands and a channel down the face: somebody made these
      for (const f of [0.28, 0.52]) { const yy = Math.round(by - 3 - ht * f), xx = bx + dx * lean * f * 0.6, ww = w * (1 - f * 0.7); ctx.fillStyle = C.stone[1]; ctx.fillRect(Math.round(xx - ww), yy, Math.round(ww * 2), 1); ctx.fillStyle = C.stone[5]; ctx.fillRect(Math.round(xx - ww), yy - 1, Math.round(ww), 1); }
      ctx.fillStyle = C.stone[1]; ctx.fillRect(Math.round(bx + dx * 0.5), Math.round(by - 3 - ht * 0.72), 1, Math.round(ht * 0.4));
      // near the tip, the stone darkens as if wet; a thin dark line in the channel runs down to the plinth
      if (h > 0.3) { ctx.fillStyle = 'rgba(40,16,16,0.55)'; ctx.fillRect(Math.round(tipx - 1), Math.round(tipy + 1), 2, 3); ctx.fillStyle = 'rgba(40,14,15,0.5)'; ctx.fillRect(Math.round(bx + dx * 0.5), Math.round(by - 3 - ht * 0.3), 1, Math.round(ht * 0.3)); }
      if (h > 0.5) { ctx.fillStyle = C.moss; ctx.fillRect(bx - Math.round(w), by - 5, 2, 2); }
    }
  }
  function drawBase(o) {
    const q = iso(o.x, o.y), cx = Math.round(q.sx), cy = Math.round(q.sy), s = st(o);
    // the dais: a ring of flagstones
    for (let i = 0; i < 16; i++) {
      const a0 = i / 16 * Math.PI * 2, a1 = (i + 1) / 16 * Math.PI * 2, h = H(i, o.x | 0);
      ctx.fillStyle = C.stone[1 + ((h * 3) | 0)];
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a0) * (RX + 4), cy + Math.sin(a0) * (RY + 2)); ctx.lineTo(cx + Math.cos(a1) * (RX + 4), cy + Math.sin(a1) * (RY + 2));
      ctx.lineTo(cx + Math.cos(a1) * (RX - 3), cy + Math.sin(a1) * (RY - 1.5)); ctx.lineTo(cx + Math.cos(a0) * (RX - 3), cy + Math.sin(a0) * (RY - 1.5)); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.stone[0]; ctx.fillRect(Math.round(cx + Math.cos(a0) * (RX + 1)), Math.round(cy + Math.sin(a0) * (RY + 0.5)), 1, 1);
    }
    // steps down: two darker rings
    ctx.fillStyle = C.stone[1]; ctx.beginPath(); ctx.ellipse(cx, cy + 1, RX - 4, RY - 2, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = C.stone[0]; ctx.beginPath(); ctx.ellipse(cx, cy + 2, RX - 8, RY - 4, 0, 0, 6.283); ctx.fill();
    // the bottom: a crust of ash over something dark; where it knows you, the crust has fallen in and the dark shows
    const br = 0.5 + 0.5 * Math.sin(s.t * 0.5), ow = s.open, wid = SEQ_widen(o), rx = RX - 10 + wid, ry = (RY - 5) + wid * 0.5;
    ctx.fillStyle = C.flesh[1]; ctx.beginPath(); ctx.ellipse(cx, cy + 2, rx, ry, 0, 0, 6.283); ctx.fill();
    // the dark swells and settles, very slowly
    const sw = 0.6 + br * 0.9;
    ctx.fillStyle = C.flesh[2]; ctx.beginPath(); ctx.ellipse(cx, cy + 2 - sw * 0.4, Math.max(1, rx - 3 + sw), Math.max(1, ry - 1.5 + sw * 0.4), 0, 0, 6.283); ctx.fill();
    // a few thin dark veins running in from the edge
    ctx.strokeStyle = C.vein; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) { const a = i * 1.7 + 0.6, x0 = cx + Math.cos(a) * rx, y0 = cy + 2 + Math.sin(a) * ry; ctx.beginPath(); ctx.moveTo(Math.round(x0) + 0.5, Math.round(y0) + 0.5); ctx.quadraticCurveTo(cx + Math.cos(a + 0.6) * rx * 0.4, cy + 2 + Math.sin(a + 0.6) * ry * 0.4, cx + 0.5, cy + 2.5); ctx.stroke(); }
    // one slow ridge travelling inward
    { const f = (s.t * 0.18) % 1, rr = 1 - f; ctx.strokeStyle = C.flesh[3]; ctx.beginPath(); ctx.ellipse(cx, cy + 2, Math.max(0.5, rx * rr), Math.max(0.5, ry * rr), 0, 0, 6.283); ctx.stroke(); }
    // a wet sheen that comes and goes
    if (br > 0.55) { ctx.fillStyle = C.sheen; ctx.fillRect(Math.round(cx - rx * 0.4), Math.round(cy + 2 - ry * 0.45), Math.max(2, Math.round(rx * 0.5)), 1); }
    // the ash crust: whole when it does not know you, broken open when it does
    const crust = 1 - ow;
    if (crust > 0.02) {
      for (let i = 0; i < 18; i++) {
        const a = i / 18 * Math.PI * 2, h = H(i, 55 + (o.y | 0)), rr = (0.25 + h * 0.75);
        if (h > crust + 0.15) continue;
        ctx.fillStyle = C.crust[(h * 3) | 0]; const px = Math.round(cx + Math.cos(a) * rx * rr), py = Math.round(cy + 2 + Math.sin(a) * ry * rr);
        ctx.fillRect(px - 2, py - 1, 4 + (h * 3 | 0), 2);
      }
      if (crust > 0.6) { ctx.fillStyle = C.crust[1]; ctx.beginPath(); ctx.ellipse(cx, cy + 2, Math.max(1, rx - 2), Math.max(1, ry - 1), 0, 0, 6.283); ctx.fill();
        ctx.fillStyle = C.flesh[1]; ctx.fillRect(cx - 3, cy + 2, 5, 1); ctx.fillRect(cx + 1, cy + 3, 1, 2); }   // one dark crack in the crust
    }
    stones(o, cx, cy, false);
  }
  function SEQ_widen(o) { return SEQ.on && SEQ.o === o ? SEQ.widen || 0 : 0; }
  function drawFront(o) { const q = iso(o.x, o.y); stones(o, Math.round(q.sx), Math.round(q.sy), true); }
  function drawStains() {
    for (const b of STAINS) {
      const q = iso(b.x, b.y), a = Math.min(1, b.life / 6) * 0.85;
      ctx.fillStyle = `rgba(40,6,9,${a.toFixed(3)})`;
      for (const d of b.dots) ctx.fillRect(Math.round(q.sx + d[0]), Math.round(q.sy + d[1]), d[2], 1);
    }
  }
  const _rw = renderWorld;
  renderWorld = function (list) {
    _rw(list);
    const z = G.zone; if (!z) return;
    if (STAINS.length) list.push({ d: -1e5, f: drawStains });
    if (CHUNKS.length || REFORM.length) list.push({ d: P.x + P.y + 0.5, f: drawChunks });
    for (const o of z.objects) if (o.q === 'wp') { const d = o.x + o.y; list.push({ d: d - 0.95, f: () => drawBase(o) }); list.push({ d: d + 0.95, f: () => drawFront(o) }); }
    if (DRIPS.t > 0) list.push({ d: P.x + P.y + 0.02, f: drawDrips });
  };

  // ---------------------------------------------------------------- state: breathing, opening when it knows you
  function stain(x, y, n, r) {
    const dots = []; for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, d = Math.random() * r; dots.push([Math.cos(a) * d * 1.6, Math.sin(a) * d * 0.8, 1 + (Math.random() * 3 | 0)]); }
    STAINS.push({ x, y, dots, life: 40 }); if (STAINS.length > 12) STAINS.shift();
  }
  function gore(x, y, n, up) {
    const BLOOD = ['#3a080b', '#520c10', '#6a1216'], BONE = ['#cdbfa0', '#a8997a', '#e2d6bb'], MEAT = ['#5a2a2a', '#7a3a36', '#40181a', '#6e4a3e'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, s = 0.6 + Math.random() * 2.2, r = Math.random();
      const col = r < 0.6 ? BLOOD[(Math.random() * 3) | 0] : r < 0.8 ? MEAT[(Math.random() * 4) | 0] : BONE[(Math.random() * 3) | 0];
      parts.push({ x, y, z: 4 + Math.random() * (up ? 24 : 8), vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 12 + Math.random() * (up ? 34 : 16), t: 0.6 + Math.random() * 0.7, col });
      if (r > 0.6 && CHUNKS.length < 60) CHUNKS.push({ x: x + Math.cos(a) * s * 0.35, y: y + Math.sin(a) * s * 0.35, col, w: 1 + (Math.random() * 2 | 0), life: 5 + Math.random() * 4 });   // pieces that stay on the ground a while
    }
    if (parts.length > 700) parts.splice(0, parts.length - 700);
  }
  const CHUNKS = [], REFORM = [];
  function drawChunks() {
    for (const c of CHUNKS) { const q = iso(c.x, c.y), a = Math.min(1, c.life / 1.5); ctx.globalAlpha = a; ctx.fillStyle = c.col; ctx.fillRect(Math.round(q.sx), Math.round(q.sy), c.w + 1, c.w); ctx.globalAlpha = 1; }
    for (const r of REFORM) { const k = Math.min(1, r.t / r.dur), e = k * k, x = r.x0 + (P.x - r.x0) * e, y = r.y0 + (P.y - r.y0) * e, q = iso(x, y), z = r.z0 + (18 - r.z0) * e; ctx.fillStyle = r.col; ctx.fillRect(Math.round(q.sx), Math.round(q.sy - z), r.w, r.w); }
  }
  function reform(n) {   // blood, bone and viscera drawn back in from the pit and the ground to where the body is forming
    const BLOOD = ['#3a080b', '#520c10', '#6a1216'], BONE = ['#cdbfa0', '#a8997a'], MEAT = ['#5a2a2a', '#7a3a36'];
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, d = 0.8 + Math.random() * 1.6, r = Math.random(); REFORM.push({ x0: P.x + Math.cos(a) * d, y0: P.y + Math.sin(a) * d * 0.8, z0: Math.random() * 3, t: -Math.random() * 0.5, dur: 0.5 + Math.random() * 0.4, w: 1 + (Math.random() * 2 | 0), col: r < 0.6 ? BLOOD[(Math.random() * 3) | 0] : r < 0.8 ? MEAT[(Math.random() * 2) | 0] : BONE[(Math.random() * 2) | 0] }); }
  }
  function drawDrips() {
    const q = iso(P.x, P.y), k = Math.min(1, DRIPS.t / 2);
    for (let i = 0; i < 6; i++) { const h = (G.time * 0.8 + i * 0.37) % 1, x = Math.round(q.sx - 6 + i * 2.4), y = Math.round(q.sy - 30 + i * 3 % 9 + h * 26); ctx.fillStyle = `rgba(74,13,16,${(0.8 * k * (1 - h)).toFixed(3)})`; ctx.fillRect(x, y, 1, 2); }
  }
  function tick(dt) {
    const z = G.zone; if (!z) return;
    for (const o of z.objects) if (o.q === 'wp') {
      const s = st(o); s.t += dt;
      s.want = known() ? 1 : 0;
      if (!(SEQ.on && SEQ.o === o)) s.open += (s.want - s.open) * Math.min(1, dt * 1.2);
      s.snap = Math.max(0, s.snap - dt * 1.5);
    }
    for (const b of STAINS) b.life -= dt; while (STAINS.length && STAINS[0].life <= 0) STAINS.shift();
    for (const c of CHUNKS) c.life -= dt; for (let i = CHUNKS.length - 1; i >= 0; i--) if (CHUNKS[i].life <= 0) CHUNKS.splice(i, 1);
    for (const r of REFORM) r.t += dt; for (let i = REFORM.length - 1; i >= 0; i--) if (REFORM[i].t >= REFORM[i].dur) REFORM.splice(i, 1);
    if (DRIPS.t > 0) DRIPS.t -= dt;
    if (SEQ.on) seq(dt);
  }
  function wake(o) { const s = st(o); s.snap = 0.6; }

  // ---------------------------------------------------------------- the passage
  function begin(id, go) {
    const z = G.zone, o = z && z.objects.find(v => v.q === 'wp');
    if (!o || SEQ.on || P.dead) return false;
    if (Math.hypot(o.x - P.x, o.y - P.y) > 3.5) return false;     // not standing at one: plain travel
    Object.assign(SEQ, { on: true, t: 0, id, go, o, from: { x: P.x, y: P.y }, phase: 'walk', widen: 0, fade: 0, done: false });
    G.panels.qwp = false; P.path = null; P.target = null;
    return true;
  }
  const ease = k => k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k);
  function seq(dt) {
    SEQ.t += dt; const t = SEQ.t, o = SEQ.o, s = o && st(o);
    try { const QQ = window.__spm && window.__spm.q && window.__spm.q.Q; if (QQ) QQ.wpNear = true; } catch (e) { } G.panels.qwp = false;
    P.cast = Math.max(P.cast || 0, 0.2); P.iframe = Math.max(P.iframe || 0, 0.3); P.path = null; P.target = null;
    if (SEQ.phase === 'walk') {
      const k = ease(t / 0.45); P.x = SEQ.from.x + (o.x - SEQ.from.x) * k; P.y = SEQ.from.y + (o.y + 0.05 - SEQ.from.y) * k;
      s.open += (1 - s.open) * Math.min(1, dt * 6);
      if (t >= 0.45) { SEQ.phase = 'sink'; SEQ.t = 0; sfx(55, 0.9, 'sine', 0.06, -15); sfx(90, 0.4, 'sawtooth', 0.02, -40); }
    } else if (SEQ.phase === 'sink') {
      const k = ease(t / 0.95); P.mawSink = k * 52; SEQ.widen = k * 6;
      if (Math.random() < dt * 40) gore(P.x + (Math.random() - 0.5) * 0.4, P.y + (Math.random() - 0.5) * 0.3, 4, true);
      if (t > 0.3 && !SEQ.wet) { SEQ.wet = true; sfx(160, 0.25, 'sawtooth', 0.03, -120); }
      if (t >= 0.95) {
        SEQ.phase = 'close'; SEQ.t = 0; s.open = 0; s.snap = 1; gore(o.x, o.y, 26, true); stain(o.x, o.y, 22, 9);
        sfx(40, 0.35, 'square', 0.05, -20); sfx(260, 0.08, 'square', 0.03, -200); G.shake = Math.max(G.shake || 0, 3);
      }
    } else if (SEQ.phase === 'close') {
      SEQ.fade = ease(t / 0.45);
      if (t >= 0.55) {
        SEQ.phase = 'dark'; SEQ.t = 0; SEQ.fade = 1;
        try { SEQ.go(SEQ.id); } catch (e) { if (typeof reportError === 'function') reportError(e); }
        const z2 = G.zone, o2 = z2 && z2.objects.find(v => v.q === 'wp');
        SEQ.o = o2 || null;
        if (o2) { P.x = o2.x; P.y = o2.y + 0.05; const s2 = st(o2); s2.open = 0; }
        P.mawSink = 52;
      }
    } else if (SEQ.phase === 'dark') {
      if (t >= 0.35) { SEQ.phase = 'rise'; SEQ.t = 0; if (o) { st(o).snap = 0; } }
    } else if (SEQ.phase === 'rise') {
      SEQ.fade = 1 - ease(t / 0.5);
      if (o) {
        st(o).open += (1 - st(o).open) * Math.min(1, dt * 7);
        if (!SEQ.spilt && t > 0.12) { SEQ.spilt = true; reform(70); gore(o.x, o.y, 24, true); stain(o.x, o.y, 26, 10); sfx(70, 0.5, 'sine', 0.05, 30); sfx(180, 0.2, 'sawtooth', 0.02, -80); }
        SEQ.widen = (1 - ease(t / 1.1)) * 6;
      }
      P.mawSink = (1 - ease((t - 0.15) / 1.0)) * 52;
      if (Math.random() < dt * 14) gore(P.x, P.y, 2, false);
      if (t >= 1.2) { P.mawSink = 0; SEQ.on = false; SEQ.widen = 0; SEQ.fade = 0; SEQ.wet = SEQ.spilt = false; DRIPS.t = 4; if (typeof Q_ === 'undefined') { } }
    }
  }
  // the black between: drawn over everything
  if (typeof renderAll === 'function') {
    const _ra = renderAll;
    renderAll = function () { const r = _ra.apply(this, arguments); if (SEQ.on && SEQ.fade > 0) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(4,1,2,${SEQ.fade.toFixed(3)})`; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore(); } return r; };
  }
  // tick with the player
  if (typeof updatePlayer === 'function') {
    const _up = updatePlayer;
    updatePlayer = function (dt) { const r = _up.apply(this, arguments); try { tick(dt); } catch (e) { if (typeof reportError === 'function') reportError(e); } return r; };
  }
  try { window.__maw = { begin, wake, SEQ, STAINS, st }; } catch (e) { }
})();
