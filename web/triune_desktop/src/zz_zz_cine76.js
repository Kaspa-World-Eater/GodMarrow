// zz_zz_cine76.js — the user (2026-09-29): "explore cinematography even more and great movies and great games that
// have done it well and then let's emulate that into our game in our own style." (Notes: claude/godmarrow-cinematography.md)
//
//  1. SHAPES IN THE DARK (horror cinema; Limbo/Inside's silhouettes). Beyond your pool, what's watching you shows as two
//     points of eye-shine catching your lantern: faint, now and then blinking, brighter when it is coming for you. You
//     learn to read the dark before anything steps into the light.
//  2. SHADOWS THAT REACH (Deakins' flare-lit ruins in 1917; D2's torchlit halls). Your lantern throws every creature's
//     shadow away from you, long across the ground, so a pack at the edge of the light fans its shadows out into the
//     dark. (The world's flames already did this; now your own light does too.)
//  3. THE FLASH (1917's flares; storm-lit horror). Rarely, on open ground at night, cold heat-lightning flickers far off:
//     for a breath the whole land stands up out of the dark (the ridgeline, the dead trees, whatever is standing out
//     there) and then it is gone. No sound. Never in town, never more than once a minute or so.
//  4. THE LIGHT GUIDES THE EYE (Inside's selective light). Things worth picking up catch the lantern: a glint on anything
//     lying in your pool, every few seconds.
//  5. THE FLAME IS THE MOOD (the lantern as a character). When you are close to death the flame struggles: the pool
//     shrinks and stutters. When something great wakes, the flame gutters and draws in, as if it's afraid too.
//  6. ANALOGOUS DARKS, COMPLEMENTARY LIGHTS (Hyper Light Drifter's colour script). The dark leans blue-teal instead of
//     violet, so warm light over it reads amber, not pink. (No red light, ever.)
(function () {
  const slow = () => window.__perf74 && window.__perf74.slow;
  const out = () => G.zone && typeof isOutdoor === 'function' && isOutdoor(G.zone);
  const night = () => out() ? 1 - (typeof dayK === 'function' ? dayK() : 1) : 1;
  const lampFoot = () => (window.__lampFoot && window.__lampFoot()) || [P.x, P.y];
  // the pool's edge, in tiles (the same sum zz_zx_dark64 makes for the hole, over ISO_R px per tile)
  const poolR = () => { const hl = typeof heroLightR === 'function' ? heroLightR() : 5, lk = window.__lampK ? window.__lampK() / 1.5 : 1, dk = out() ? (typeof dayK === 'function' ? dayK() : 1) : 0;
    return Math.min(hl, 5.4 * lk) * 0.4 * (1 + 0.5 * dk) * MOOD.k; };
  // ------------------------------------------------------------------ 5. the flame's mood
  const MOOD = { k: 1 };
  window.__lampMood = () => MOOD.k;
  function mood() {
    let k = 1; const t = G.time;
    try {
      const f = typeof D !== 'undefined' && D && D.maxHp ? P.hp / D.maxHp : 1;
      if (f < 0.3 && !P.dead) {   // struggling: shrinks with the wound, stutters
        const s = (0.3 - f) / 0.3;
        k *= 1 - 0.18 * s; k *= 1 - 0.1 * s * (0.5 + 0.5 * Math.sin(t * 2.2) * Math.sin(t * 0.9));   // v0.79: a slow struggle, no strobe
      }
      if (G.bossFight) k *= 0.92 + 0.04 * Math.sin(t * 2.1) - (Math.sin(t * 0.83) > 0.9 ? 0.06 : 0);   // it gutters
    } catch (e) { }
    MOOD.k += (k - MOOD.k) * 0.25;
  }
  // ------------------------------------------------------------------ 3. the flash
  const FL = { next: 0, t0: -9, v: 0 };
  window.__flash76 = () => FL.v;
  function flash() {
    const t = G.time; FL.v = 0; if (FL.force != null) { FL.v = FL.force; return; }
    if (!out() || night() < 0.6 || (G.zone && /town|camp|rest/.test(G.zone.id || ''))) { FL.next = Math.max(FL.next, t + 20); return; }
    if (!FL.next) FL.next = t + 30 + Math.random() * 40;
    if (t > FL.next && !G.bossFight) { FL.t0 = t; FL.next = t + 55 + Math.random() * 70; }
    const a = t - FL.t0; if (a < 0 || a > 0.9) return;
    // two flickers: a quick one, a gap, a longer one fading
    const f1 = a < 0.07 ? 0.7 : 0, f2 = a > 0.16 && a < 0.9 ? Math.pow(1 - (a - 0.16) / 0.74, 2.2) : 0;
    FL.v = Math.max(f1, f2) * night();
    if (FL.force != null) FL.v = FL.force;
  }
  // ------------------------------------------------------------------ where each creature stood on screen this frame
  if (typeof drawMon16 === 'function') {
    const _dm = drawMon16;
    drawMon16 = function (m) { const r = _dm.apply(this, arguments); if (r && m) { m._rc = r; m._rcT = G.time; } return r; };
  }
  // ------------------------------------------------------------------ 2. your lantern throws their shadows
  if (typeof figureShadows37 === 'function') {
    const _fs = figureShadows37;
    figureShadows37 = function () {
      const W = window.__lampW && window.__lampW(), push = W && !P.dead && L37 && L37.src;
      if (push) { const nk = night(); L37.src.push({ x: W.x, y: W.y, sx: 0, sy: 0, gx: 0, gy: 0, R: poolR() * 2.4, rgb: '255,200,150', a: out() ? 0.2 + 0.65 * nk : 0.8, kind: 'lamp', f: 1 }); }
      try { return _fs.apply(this, arguments); } finally { if (push) L37.src.pop(); }
    };
  }
  // ------------------------------------------------------------------ 1 and 4: drawn over the dark
  const EYE = new WeakMap();
  function eyes() {
    const z = G.zone; if (!z || P.dead) return;
    const nk = night(); if (nk < 0.35) return;
    const F = lampFoot(), R = poolR(), rgb = (window.__lampRGB && window.__lampRGB()) || '255,214,170', C = rgb.split(',').map(Number);
    const col = `rgb(${Math.min(255, C[0] * 0.6 + 110)},${Math.min(255, C[1] * 0.6 + 100)},${Math.min(255, C[2] * 0.5 + 80)})`;
    for (const m of z.monsters) {
      if (m.dead || m.hidden || !m._rc || G.time - m._rcT > 0.1 || (m.b && m.b.fly) || (m.rise > 0)) continue;
      const d = Math.hypot(m.x - F[0], m.y - F[1]); if (d < R * 1.05 || d > R * 3.2) continue;
      // facing you? (screen-x toward the hero)
      const tx = (P.x - P.y) - (m.x - m.y); if (Math.abs(tx) > 0.4 && Math.sign(tx) !== (m.face || 1)) continue;
      let e = EYE.get(m); if (!e) { e = { blink: G.time + 2 + Math.random() * 4, s: Math.random() * 6.28, on: Math.random() < 0.8 }; EYE.set(m, e); }
      if (!e.on) continue;
      if (G.time > e.blink) { if (G.time > e.blink + 0.14) e.blink = G.time + 2.5 + Math.random() * 5; continue; }
      const hunting = m.state === 'chase' || m.state === 'windup', fade = Math.min(1, (d - R * 1.05) / (R * 0.4)) * Math.min(1, (R * 3.2 - d) / (R * 0.8));
      const a = (hunting ? 0.85 : 0.45) * fade * nk * (0.85 + 0.15 * Math.sin(G.time * 3 + e.s));
      if (a < 0.05) continue;
      const r = m._rc, cx = Math.round(r.x + r.w / 2 + (m.face || 1) * Math.max(1, r.w * 0.08)), cy = Math.round(r.y + r.h * 0.2), gap = r.w > 34 ? 3 : 2;
      ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fillRect(cx - gap, cy, 1, 1); ctx.fillRect(cx + gap - 1, cy, 1, 1);
    }
    ctx.globalAlpha = 1;
  }
  const GL = new WeakMap();
  function glints() {
    const z = G.zone; if (!z || P.dead || !z.items) return;
    const F = lampFoot(), R = poolR();
    for (const g of z.items) {
      if (Math.hypot(g.x - F[0], g.y - F[1]) > R * 0.95 || (typeof onScreen === 'function' && !onScreen(g.x, g.y))) continue;
      let s = GL.get(g); if (!s) { s = { t: G.time + Math.random() * 3 }; GL.set(g, s); }
      const a = G.time - s.t; if (a > 3.2) { s.t = G.time + Math.random() * 1.5; continue; } if (a < 0 || a > 0.3) continue;
      const k = Math.sin(a / 0.3 * Math.PI), p = iso(g.x, g.y), x = Math.round(p.sx), y = Math.round(p.sy - 2);
      ctx.globalAlpha = 0.9 * k; ctx.fillStyle = '#fff6e0'; ctx.fillRect(x, y, 1, 1);
      ctx.globalAlpha = 0.45 * k; ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x, y - 1, 1, 1); ctx.fillRect(x, y + 1, 1, 1);
    }
    ctx.globalAlpha = 1;
  }
  if (typeof drawAtmos === 'function') {
    const _da = drawAtmos;
    drawAtmos = function () {
      try { mood(); flash(); } catch (e) { }
      const r = _da.apply(this, arguments);
      try {
        ctx.save(); ctx.setTransform(RS * ZK, 0, 0, RS * ZK, 0, 0); ctx.imageSmoothingEnabled = false;
        eyes(); glints();
        if (FL.v > 0.01) { ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.12 * FL.v; ctx.fillStyle = '#9fb4dc'; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }   // the flash is cold
        ctx.restore();
      } catch (e) { if (typeof reportError === 'function') reportError(e); }
      return r;
    };
  }
  try { window.__cine76 = { MOOD, FL, dbg: () => ({ hl: heroLightR(), poolR: poolR(), ISO_R, TW, TH, out: out(), night: night(), lowFx2: G.lowFx2, A: window.__dark64 && window.__dark64.A }) }; } catch (e) { }
})();
