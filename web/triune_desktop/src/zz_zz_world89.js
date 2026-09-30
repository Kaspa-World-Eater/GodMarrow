// zz_zz_world89.js — the user (2026-09-29): "I said I wanted a big open world but you can still have some channeling
// things like some trees or some ruins that kind of create corridors. Not a lot but sometimes. Makes you feel less like a
// big flat empty area." And: "it's okay to have just a random individual or one or two creatures out in the world, so we
// actually have more stuff to kill; there are points where I feel like there is nothing going on."
//  * CHANNELS: in each open zone, a few lines laid across the open ground: tree lines (hedgerows of the wood's own
//    trees) and broken colonnades (pillars with rubble between), sometimes in parallel pairs a few tiles apart so the
//    ground between them reads as a lane. Every line has gaps; nothing is ever walled off. Never on roads, never near a
//    way in or out, a lantern, a shrine or a camp.
//  * WANDERERS: singles and pairs of the zone's own creatures, spread through the empty stretches between packs.
(function () {
  const rngOf = s => { let a = s >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const hashStr = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
  const OPEN = { 0: 1, 11: 1, 13: 1 };   // grass, dirt, mud
  function keepOut(z) {
    const pts = [];
    if (z.start) pts.push([z.start.x, z.start.y, 9]);
    for (const k in z.arrive || {}) { const a = z.arrive[k]; if (a) pts.push([a.x, a.y, 9]); }
    for (const o of z.objects || []) pts.push([o.x, o.y, 5]);
    for (const l of z.lanterns || []) pts.push([l.x, l.y, 6]);
    if (z._camp) pts.push([z._camp.x, z._camp.y, 6]);
    if (z._herd) pts.push([z._herd.x, z._herd.y, 8]);
    if (z.bossRoom) pts.push([z.bossRoom.x + z.bossRoom.w / 2, z.bossRoom.y + z.bossRoom.h / 2, 14]);
    return pts;
  }
  function channels(z) {
    if (z._w89c) return; z._w89c = true;
    if (!isOutdoor(z) || /town|camp/.test(z.id || '') || !(z.w > 60)) return;
    const r = rngOf(hashStr(z.id) ^ 0x8989), W = z.w, H = z.h, ko = keepOut(z);
    const land = window.__world77 ? window.__world77.landOf(z) : null;
    const clearAt = (x, y) => OPEN[z.get(x, y)] && !ko.some(p => Math.hypot(p[0] - x, p[1] - y) < p[2]) && !z.monsters.some(m => !m.dead && Math.abs(m.x - x) < 1.5 && Math.abs(m.y - y) < 1.5);
    const areaClear = (pts) => pts.every(([x, y]) => { for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (!(OPEN[z.get(x + i, y + j)] || z.get(x + i, y + j) === 1 || z.get(x + i, y + j) === 14)) return false; return clearAt(x, y); });
    function line(x0, y0, ang, len, bend) {
      const pts = []; let a = ang, x = x0, y = y0;
      for (let s = 0; s < len; s++) { a += bend; x += Math.cos(a); y += Math.sin(a); const p = [Math.round(x), Math.round(y)]; if (!pts.length || p[0] !== pts[pts.length - 1][0] || p[1] !== pts[pts.length - 1][1]) pts.push(p); }
      return pts;
    }
    function lay(pts, kind) {
      let gap = 3 + Math.floor(r() * 3);
      pts.forEach(([x, y], i) => {
        gap--; if (gap <= 0) { gap = 4 + Math.floor(r() * 3); return; }                   // a gap to walk through
        if (i === 0 || i === pts.length - 1) return;                                     // open ends
        (z._w89pts = z._w89pts || []).push([x, y]);
        if (kind === 'trees') { if (r() < 0.85) z.set(x, y, 2); }
        else { z.set(x, y, i % 2 ? 9 : (r() < 0.6 ? 3 : 9)); }                            // pillars with rubble between
      });
    }
    const want = Math.max(2, Math.min(6, Math.round(W * H / 5000)));
    let made = 0;
    for (let t = 0; t < 500 && made < want; t++) {
      const x = 10 + Math.floor(r() * (W - 20)), y = 10 + Math.floor(r() * (H - 20)), ang = r() * Math.PI * 2, len = 10 + Math.floor(r() * 8), bend = (r() - 0.5) * 0.08;
      const kind = land === 'wood' || land === 'fen' ? (r() < 0.8 ? 'trees' : 'ruin') : land === 'heath' ? (r() < 0.5 ? 'trees' : 'ruin') : (r() < 0.45 ? 'trees' : 'ruin');
      const A = line(x, y, ang, len, bend);
      if (!areaClear(A)) continue;
      if (r() < 0.55) {                                                                   // a lane: a second line 4-6 tiles over
        const off = 4 + Math.floor(r() * 3), nx = -Math.sin(ang) * off, ny = Math.cos(ang) * off;
        const B = line(x + nx, y + ny, ang, len, bend);
        if (!areaClear(B)) { lay(A, kind); made++; continue; }
        lay(A, kind); lay(B, kind); made += 2;
      } else { lay(A, kind); made++; }
    }
  }
  function wanderers(z) {
    if (z._w89w) return; z._w89w = true;
    if (!isOutdoor(z) || /town|camp/.test(z.id || '') || typeof makeMon !== 'function') return;
    const pool = z.monsters.filter(m => !m.dead && (m.rank === 'normal' || !m.rank) && m.b && m.b.ai !== 'boss' && !m.b.noWander);
    if (!pool.length) return;
    const lv = pool.map(m => m.mlvl || m.lvl || 1).sort((a, b) => a - b)[Math.floor(pool.length / 2)];
    const r = rngOf(hashStr(z.id) ^ 0x8977), W = z.w, H = z.h, ko = keepOut(z);
    const want = Math.max(4, Math.min(18, Math.round(W * H / 1400)));
    let made = 0;
    for (let t = 0; t < 1500 && made < want; t++) {
      const x = 6 + r() * (W - 12), y = 6 + r() * (H - 12);
      if (z.solidAt(x, y) || !OPEN[z.get(Math.floor(x), Math.floor(y))]) continue;
      if (ko.some(p => Math.hypot(p[0] - x, p[1] - y) < p[2] + 4)) continue;
      if (z.monsters.some(m => !m.dead && Math.hypot(m.x - x, m.y - y) < 9)) continue;
      const src = pool[Math.floor(r() * pool.length)], n = r() < 0.65 ? 1 : 2;
      for (let i = 0; i < n; i++) {
        const mx = x + (i ? (r() - 0.5) * 1.6 : 0), my = y + (i ? (r() - 0.5) * 1.6 : 0); if (z.solidAt(mx, my)) continue;
        try { const m = makeMon(src.type, mx, my, lv, 'normal', []); m.pack = 'w89_' + made; m._wander = true; z.monsters.push(m); } catch (e) { }
      }
      made++;
    }
    z._w89n = made;
  }
  if (typeof enterZone === 'function') {
    const _ez = enterZone;
    enterZone = function () {
      const r = _ez.apply(this, arguments);
      try { const z = G.zone; if (z) { channels(z); wanderers(z); } } catch (e) { if (typeof reportError === 'function') reportError(e); }
      return r;
    };
  }
  try { window.__world89 = { channels, wanderers }; } catch (e) { }
})();
