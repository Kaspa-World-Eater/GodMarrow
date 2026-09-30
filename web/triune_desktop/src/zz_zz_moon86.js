// zz_zz_moon86.js — "do everything you want to do to enhance the game" (2026-09-29). Two beats of light:
//  * MOONLIT CLEARINGS (FromSoft's warm islands, turned cold): on open ground at night, two or three clearings in each
//    outdoor zone lie under a gap in the cloud. The moon lights a soft pale pool there, with a slow fall of motes. It is a
//    place to breathe: standing in it, your poise comes back half again as fast and your wounds close a little. Nothing
//    stops the dark finding you there; it only feels like it might not.
//  * LIGHT THROUGH THE CANOPY (Limbo/Inside's shafts): in the woods by day, long pale shafts slant down through the
//    leaves, drifting as the crowns move, with dust turning in them. Drawn over everything, faint; gone at dusk.
(function () {
  const rngOf = s => { let a = s >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const hashStr = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
  const night = () => (G.zone && isOutdoor(G.zone) ? 1 - dayK() : 0);
  const R_MOON = 2.3;   // tiles
  function clearings(z) {
    if (z._moon86) return z._moon86; const out = z._moon86 = [];
    if (!isOutdoor(z) || /town|camp/.test(z.id || '')) return out;
    const r = rngOf(hashStr(z.id) ^ 0x86a1), W = z.w || 60, H = z.h || 60, want = 2 + Math.floor(r() * 2);
    const open = (x, y, rr) => { for (let j = -rr; j <= rr; j++) for (let i = -rr; i <= rr; i++) if (z.solidAt(x + i + 0.5, y + j + 0.5)) return false; return true; };
    for (let t = 0; t < 900 && out.length < want; t++) {
      const x = 6 + Math.floor(r() * (W - 12)), y = 6 + Math.floor(r() * (H - 12));
      if (!open(x, y, 3) || out.some(o => Math.hypot(o.x - x, o.y - y) < 18)) continue;
      if (z.start && Math.hypot(z.start.x - x, z.start.y - y) < 8) continue;
      out.push({ x: x + 0.5, y: y + 0.5, s: r() * 99 });
    }
    return out;
  }
  // the pools cut the dark (a cool tint), through the dark layer's extra-holes hook
  const _eh = window.__extraHoles;
  window.__extraHoles = function () {
    const base = _eh ? _eh() : []; const z = G.zone, nk = night(); if (!z || nk < 0.35) return base;
    const k = Math.min(1, (nk - 0.35) / 0.3);
    for (const c of clearings(z)) { if (!onScreen(c.x, c.y, 120)) continue; const p = iso(c.x, c.y); base.push({ x: p.sx, y: p.sy, r: R_MOON * ISO_R * 0.5 * (0.6 + 0.4 * k), core: 0.35, far: 1.8, w: 0.55 * k, rgb: [150, 176, 222] }); }
    return base;
  };
  // the rest it gives
  let lastT = 0;
  function rest() {
    const dt = Math.max(0, Math.min(0.1, G.time - lastT)); lastT = G.time;
    const z = G.zone; if (!z || P.dead || night() < 0.35) return;
    for (const c of clearings(z)) if (Math.hypot(P.x - c.x, P.y - c.y) < R_MOON * 0.8) {
      try { P.stam = Math.min(D.maxStam, (P.stam || 0) + 15 * dt); P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.006 * dt); } catch (e) { }
      if (!c.said && typeof say === 'function') { c.said = true; say('A gap in the cloud. The moon finds this one place, and lets you breathe.', 3); }
    }
  }
  if (typeof updateMonsters === 'function') { const _um = updateMonsters; updateMonsters = function () { try { rest(); } catch (e) { } return _um.apply(this, arguments); }; }
  // motes falling in the moonlight, and shafts in the woods: drawn over the dark
  function drawMotes() {
    const z = G.zone, nk = night(); if (!z || nk < 0.35) return; const t = G.time;
    for (const c of clearings(z)) {
      if (!onScreen(c.x, c.y, 80)) continue;
      for (let i = 0; i < 14; i++) {
        const ph = (t * 0.12 + i * 0.137 + c.s) % 1, a = (i * 2.4 + c.s) % 6.283, rr = ((i * 0.37 + c.s) % 1) * R_MOON * 0.8;
        const p = iso(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr), y = p.sy - 40 * (1 - ph);
        ctx.globalAlpha = 0.5 * Math.sin(ph * Math.PI) * nk; ctx.fillStyle = '#dde6f4'; ctx.fillRect(Math.round(p.sx + Math.sin(t + i) * 2), Math.round(y), 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }
  function drawShafts() {
    const z = G.zone; if (!z || !window.__world77 || window.__world77.landOf(z) !== 'wood' || !isOutdoor(z)) return;
    const dk = dayK(); if (dk < 0.25) return; const t = G.time, a0 = 0.11 * Math.min(1, (dk - 0.25) / 0.4);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    const span = 190, off = ((cam.x * 0.9) % span + span) % span;   // world-anchored, drifting
    for (let i = -2; i < 5; i++) {
      const x0 = i * span - off + 60 + Math.sin(t * 0.13 + i) * 6, w = 22 + ((i * 37) % 3 + 3) % 3 * 12, br = 0.7 + 0.3 * Math.sin(t * 0.21 + i * 1.7);
      const g = ctx.createLinearGradient(x0, 0, x0 + 90, VH);
      g.addColorStop(0, `rgba(244,232,200,${a0 * br})`); g.addColorStop(0.7, `rgba(244,232,200,${a0 * 0.6 * br})`); g.addColorStop(1, 'rgba(244,232,200,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, -10); ctx.lineTo(x0 + w, -10); ctx.lineTo(x0 + w + 110, VH + 10); ctx.lineTo(x0 + 110, VH + 10); ctx.closePath(); ctx.fill();
      // dust turning in the shaft
      ctx.fillStyle = '#f6ecd2';
      for (let n = 0; n < 6; n++) { const u = ((t * 0.05 + n * 0.19 + i * 0.3) % 1), px = x0 + w * 0.5 + u * 110 + Math.sin(t * 0.7 + n) * 4, py = -10 + u * (VH + 20); ctx.globalAlpha = 0.5 * Math.sin(u * Math.PI) * dk; ctx.fillRect(Math.round(px), Math.round(py), 1, 1); }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  if (typeof drawAtmos === 'function') {
    const _da = drawAtmos;
    drawAtmos = function () {
      const r = _da.apply(this, arguments);
      try { ctx.save(); ctx.setTransform(RS * ZK, 0, 0, RS * ZK, 0, 0); ctx.imageSmoothingEnabled = false; drawMotes(); if (!(window.__perf74 && window.__perf74.slow)) drawShafts(); ctx.restore(); } catch (e) { if (typeof reportError === 'function') reportError(e); }
      return r;
    };
  }
  try { window.__moon86 = { clearings }; } catch (e) { }
})();
