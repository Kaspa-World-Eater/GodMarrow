// zz_zz_boss83.js — the user (2026-09-29): "do the boss telegraphs and the stagger meter next."
//  * TELEGRAPHS (PoE2's "every lethal attack has a tell any build can dodge"; our rules: no glow, no corny markers). While
//    a boss winds up, the ground where the blow will land shows it: dust and ash lift in the circle a slam will crush,
//    thickening from the centre out as the moment comes, ringed by a broken line of pale grit; a charge scores its lane
//    along the ground in front of it. Drawn above the dark, so the lantern's reach never hides a tell. Bone-grey, never red.
//    Great creatures (champions and uniques) show a small tell under their own wind-ups too.
//  * THE STAGGER METER: a thin bone line under the boss's life shows its poise giving way; it brightens when the next
//    heavy blows will break it, and fills while it reels. Hovered champions and uniques show the same line.
//  * Bosses left behind go home and wait **without healing** (v75's rule; the old code healed them 20% a second).
(function () {
  const BONE = [216, 206, 184];
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const hash01 = (x, y, s) => { let h = Math.imul((x | 0) * 374761393 + (y | 0) * 668265263 + ((s * 97) | 0), 1274126177); h ^= h >>> 13; h = Math.imul(h, 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const seedOf = m => (m._tgs || (m._tgs = Math.random() * 1000));
  // a filled, dithered area on the ground (world polygon sampled as a function) + a broken outline
  function dustDisc(cx, cy, r, k, seed) {
    // k: 0..1 how far the wind-up has come. The dust thickens from the centre outward.
    const c = iso(cx, cy), rx = r * ISO_R, ry = rx * 0.5, x0 = Math.floor(c.sx - rx), x1 = Math.ceil(c.sx + rx), y0 = Math.floor(c.sy - ry), y1 = Math.ceil(c.sy + ry);
    const front = 0.25 + 0.75 * k;
    ctx.fillStyle = `rgb(${BONE})`;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = (x - c.sx) / rx, dy = (y - c.sy) / ry, d = Math.hypot(dx, dy); if (d > 1) continue;
      const inner = d < front ? 1 : 0; if (!inner) continue;
      const dens = (0.1 + 0.26 * k) * (1 - d * 0.45), hsh = hash01(x, y, seed);
      if (hsh > dens) continue;                                   // scattered grit, not a screen-door grid
      ctx.globalAlpha = (0.25 + 0.45 * k) * (0.6 + 0.4 * hash01(y, x, seed + 7)); ctx.fillRect(x, y, 1, 1);
    }
    // the rim: a broken line of grit
    ctx.globalAlpha = 0.35 + 0.45 * k;
    const n = Math.max(24, Math.round(r * 30));
    for (let i = 0; i < n; i++) { if ((i + (seed | 0)) % 3 === 2) continue; const a = i / n * Math.PI * 2, p = iso(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.fillRect(Math.round(p.sx), Math.round(p.sy), 1, 1); }
    // cracks reaching in, near the end
    if (k > 0.55) { ctx.globalAlpha = (k - 0.55) * 1.6; ctx.fillStyle = '#3a342c';
      for (let j = 0; j < 5; j++) { const a = (j * 1.3 + seed) % 6.283; for (let s = 0.2; s < r * (k - 0.3); s += 0.08) { const w = Math.sin(s * 9 + j) * 0.06, p = iso(cx + Math.cos(a + w) * s, cy + Math.sin(a + w) * s); ctx.fillRect(Math.round(p.sx), Math.round(p.sy), 1, 1); } } }
    ctx.globalAlpha = 1;
  }
  function dustLane(x, y, ax, ay, len, half, k, seed) {
    const px = -ay, py = ax;
    ctx.fillStyle = `rgb(${BONE})`;
    const L = len * (0.3 + 0.7 * k);
    // the two edges, broken
    for (let s = 0; s < L; s += 0.12) for (const sd of [-1, 1]) {
      if (((s * 25 | 0) + (seed | 0)) % 4 === 3) continue;
      const p = iso(x + ax * s + px * half * sd, y + ay * s + py * half * sd); ctx.globalAlpha = (0.3 + 0.5 * k) * (1 - s / (len * 1.1)); ctx.fillRect(Math.round(p.sx), Math.round(p.sy), 1, 1);
    }
    // scored grit down the middle
    for (let s = 0.3; s < L; s += 0.1) for (let w = -half + 0.12; w < half; w += 0.18) {
      if (((s * 37 + w * 53 + seed) | 0) % 3) continue;
      const p = iso(x + ax * s + px * w, y + ay * s + py * w); ctx.globalAlpha = (0.15 + 0.3 * k) * (1 - s / (len * 1.1)); ctx.fillRect(Math.round(p.sx), Math.round(p.sy), 1, 1);
    }
    ctx.globalAlpha = 1;
  }
  function telegraphs() {
    const z = G.zone; if (!z || P.dead) return;
    for (const m of z.monsters) {
      if (m.dead || m.hidden || !(typeof onScreen === 'function' ? onScreen(m.x, m.y, 80) : true)) continue;
      const fast = m.phase === 2 ? 1.25 : 1, sd = seedOf(m);
      if (m.state === 'slamWind' && m.target) dustDisc(m.target.x, m.target.y, 2.1, Math.min(1, m.t / (0.9 / fast)), sd);
      else if (m.state === 'chargeWind' && m.aim) dustLane(m.x, m.y, m.aim.x, m.aim.y, 6, (m.r || 0.5) + 0.35, Math.min(1, m.t / (0.7 / fast)), sd);
      else if (m.state === 'windup' && (m.rank === 'boss' || m.rank === 'unique' || m.rank === 'champion') && m.aim && m.b && (m.b.ai === 'melee' || m.b.ai === 'shield' || m.b.ai === 'charger' || m.b.ai === 'duelist')) {
        const k = Math.min(1, m.t / Math.max(0.2, m.b.wind || 0.6));
        dustDisc(m.x + m.aim.x * 0.8, m.y + m.aim.y * 0.8, 0.8, k, sd);
      }
    }
  }
  if (typeof drawAtmos === 'function') {
    const _da = drawAtmos;
    drawAtmos = function () {
      const r = _da.apply(this, arguments);
      try { ctx.save(); ctx.setTransform(RS * ZK, 0, 0, RS * ZK, 0, 0); ctx.imageSmoothingEnabled = false; telegraphs(); hazards(); ctx.restore(); } catch (e) { if (typeof reportError === 'function') reportError(e); }
      return r;
    };
  }
  // ------------------------------------------------------------------ the stagger meter
  const SHOW = new WeakMap();
  function stagger(m) {
    let v;
    if (m.reel > 0) v = 1;
    else { const mx = typeof monPoiseMax === 'function' ? monPoiseMax(m) : 1; v = m.poise == null ? 0 : Math.max(0, Math.min(1, 1 - m.poise / mx)); }
    const s = SHOW.get(m) || { v: 0 }; s.v += (v - s.v) * 0.25; SHOW.set(m, s); return s.v;
  }
  function meter(x, y, w, m) {
    const v = stagger(m), primed = v >= (m.rank === 'boss' ? 0.8 : 0.7);
    ctx.fillStyle = '#0a090d'; ctx.fillRect(x - 1, y - 1, w + 2, 3);
    ctx.fillStyle = m.reel > 0 ? '#f2ead8' : primed ? '#e2d6b8' : '#8a8270'; ctx.fillRect(x, y, Math.round(w * v), 1);
  }
  if (typeof drawHud === 'function') {
    const _dh = drawHud;
    drawHud = function () {
      const r = _dh.apply(this, arguments);
      try {
        const z = G.zone;
        if (G.bossFight && z && z.boss && !z.boss.dead) meter(90, HUD_Y - 3, 300, z.boss);
        const h = G.hover;
        if (h && h.kind === 'mon' && h.ref && !h.ref.dead && (h.ref.rank === 'unique' || h.ref.rank === 'champion' || h.ref.rank === 'boss')) {
          const m = h.ref, w = Math.max(90, (typeof tw === 'function' ? tw(m.name) : 60) + 16); meter(W / 2 - w / 2, 18, w, m);
        }
      } catch (e) { }
      return r;
    };
  }
  // ------------------------------------------------------------------ v0.85: the slam's aftermath
  // Where a boss's slam lands the ground stays broken for 2.5 s: cracks and settling dust. Standing in it drains poise
  // (the footing is gone); it does no harm by itself, but it makes the next blow the one that breaks you.
  const HZ = [];
  if (typeof updateBoss === 'function') {
    const _ub0 = updateBoss;
    updateBoss = function (m) {
      const st = m && m.state, tg = m && m.target && { x: m.target.x, y: m.target.y };
      const r = _ub0.apply(this, arguments);
      try { if (st === 'slamWind' && m.state === 'recover' && tg) HZ.push({ x: tg.x, y: tg.y, r: 2.1, t: 2.5, T: 2.5, z: G.zone, s: Math.random() * 99 }); } catch (e) { }
      return r;
    };
  }
  let lastT = 0;
  function hazards() {
    const dt = Math.max(0, Math.min(0.1, G.time - lastT)); lastT = G.time;
    for (let i = HZ.length - 1; i >= 0; i--) {
      const h = HZ[i]; h.t -= dt; if (h.t <= 0 || h.z !== G.zone) { HZ.splice(i, 1); continue; }
      if (!P.dead && !(P.roll > 0) && Math.hypot(P.x - h.x, P.y - h.y) < h.r) { P.stam = Math.max(0, (P.stam || 0) - 14 * dt); P.stamDelay = Math.max(P.stamDelay || 0, 0.3); }
      // draw: cracks radiating from the centre, and a thin settling dust, fading out
      const k = h.t / h.T;
      for (let j = 0; j < 7; j++) { const a = (j * 0.9 + h.s) % 6.283;
        for (let sdist = 0.15; sdist < h.r * 0.95; sdist += 0.06) { const w = Math.sin(sdist * 8 + j * 2) * 0.08, p = iso(h.x + Math.cos(a + w) * sdist, h.y + Math.sin(a + w) * sdist), x = Math.round(p.sx), y = Math.round(p.sy);
          ctx.globalAlpha = 0.9 * k; ctx.fillStyle = '#120f0c'; ctx.fillRect(x, y, 1, 1);
          ctx.globalAlpha = 0.45 * k; ctx.fillStyle = `rgb(${BONE})`; ctx.fillRect(x, y + 1, 1, 1); } }   // a crack with a lit lip
      ctx.fillStyle = `rgb(${BONE})`; ctx.globalAlpha = 0.3 * k;
      for (let i = 0; i < 40; i++) { if (i % 3 === 2) continue; const a = i / 40 * 6.283, p = iso(h.x + Math.cos(a) * h.r, h.y + Math.sin(a) * h.r); ctx.fillRect(Math.round(p.sx), Math.round(p.sy), 1, 1); }
      ctx.fillStyle = `rgb(${BONE})`;
      for (let n = 0; n < 40; n++) { const a = hash01(n, 3, h.s) * 6.283, rr = Math.sqrt(hash01(n, 7, h.s)) * h.r, p = iso(h.x + Math.cos(a) * rr, h.y + Math.sin(a) * rr); ctx.globalAlpha = 0.35 * k * hash01(n, 11, h.s); ctx.fillRect(Math.round(p.sx), Math.round(p.sy - (1 - k) * 3 * hash01(n, 5, h.s)), 1, 1); }
      ctx.globalAlpha = 1;
    }
  }
  try { window.__hz85 = HZ; } catch (e) { }
  // ------------------------------------------------------------------ no healing when left behind
  if (typeof updateBoss === 'function') {
    const _ub = updateBoss;
    updateBoss = function (m) { const hp = m && m.hp; const r = _ub.apply(this, arguments); try { if (!G.bossFight && m && m.hp > hp) m.hp = hp; } catch (e) { } return r; };
  }
  try { window.__boss83 = { telegraphs, stagger }; } catch (e) { }
})();
