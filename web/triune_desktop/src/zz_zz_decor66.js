// zz_zz_decor66.js — the user (2026-09-29): "Don't forget parts of this world will be organic. A hint here and there in
// act 1 would be cool. And an area with dead demon cows. An homage to the secret cow level, but not so overt."
// Act 1 is the god's Hide: a body under the turf. Here and there it shows through: a rib arching out of the ground, a vein
// breaching the soil, a patch of skin with pores and a few coarse hairs, a pool that looks back like an eye. Rare, quiet,
// never explained. And on the Burnt Heath, in the corner farthest from the road, a herd of great horned beasts lies where
// it fell, in a ring, all facing the same way, as if something had opened there once.
(function () {
  const DEC = window.__DECOR66 || {}, IMG = {}, FR = {};
  for (const k in DEC) { const im = new Image(); im.onload = () => { IMG[k] = im; }; im.src = DEC[k].png; }
  const HR = 4;
  function frame(k) {
    if (FR[k]) return FR[k]; const im = IMG[k]; if (!im) return null;
    const hr = mkCanvas(im.naturalWidth, im.naturalHeight); hr.getContext('2d').drawImage(im, 0, 0);
    const lo = mkCanvas(Math.ceil(hr.width / HR), Math.ceil(hr.height / HR)); lo._hr = hr; lo._world = true;
    return (FR[k] = { c: lo, ox: DEC[k].ox / HR, oy: DEC[k].oy / HR, w: lo.width, h: lo.height });
  }
  const ORGANIC = ['org_ribs', 'org_vein', 'org_flesh', 'org_eye'].filter(k => DEC[k]);
  const HIDE = /^(moor|fen|hollow_wood|root_deep|old_barrow|sighing_ridge|ash_shore|burnt_heath|fern_gully|pilgrim_road|drowned_village|sunken_bog|hunter_cache|fallen_watchtower|broken_bridge|tree_hollow|bogwitch_shack)$/;
  const rngOf = s => { let a = s >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const hashStr = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
  function open(z, x, y, r) { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (z.solidAt(x + i + 0.5, y + j + 0.5)) return false; return true; }
  function place(z) {
    if (z._dec66) return z._dec66; const out = z._dec66 = [];
    if (!HIDE.test(z.id) || !ORGANIC.length) return out;
    const R = rngOf(hashStr(z.id) ^ 0x9e37), W = z.w || 60, H = z.h || 60;
    // the Hide showing through: about one piece per 2,500 tiles, never near the entry, never two close together
    const n = Math.min(6, Math.max(2, Math.round(W * H / 2500)));
    for (let tries = 0; out.length < n && tries < 600; tries++) {
      const x = 4 + Math.floor(R() * (W - 8)), y = 4 + Math.floor(R() * (H - 8));
      if (!open(z, x, y, 1) || out.some(o => Math.hypot(o.x - x, o.y - y) < 14)) continue;
      out.push({ x: x + 0.5, y: y + 0.5, k: ORGANIC[Math.floor(R() * ORGANIC.length)], flip: R() < 0.5 });
    }
    // v0.69 flavour: a pilgrims' camp (a tent and a banked fire, the only warm light for a long way), wayside saints by the
    // road, and a gibbet cage or two at the edge of things. A camp in about half the open zones; statues where roads run.
    const free = (x, y, r) => open(z, x, y, r) && !out.some(o => Math.hypot(o.x - x, o.y - y) < 6);
    if (DEC.tent && DEC.campfire && R() < 0.6) for (let t = 0; t < 300; t++) {
      const x = 6 + Math.floor(R() * (W - 12)), y = 6 + Math.floor(R() * (H - 12)); if (!free(x, y, 2)) continue;
      out.push({ x: x + 0.5, y: y - 0.5, k: 'tent', flip: R() < 0.5 }); out.push({ x: x + 2.5, y: y + 1.5, k: 'campfire', flip: false, fire: true }); z._camp = { x: x + 2.5, y: y + 1.5 }; break;
    }
    let st = 0;
    for (let t = 0; t < 800 && st < 2; t++) {
      const x = 4 + Math.floor(R() * (W - 8)), y = 4 + Math.floor(R() * (H - 8));
      if (z.get(x, y) !== T.ROAD || !free(x + 1, y, 0) || z.get(x + 1, y) === T.ROAD) continue;
      out.push({ x: x + 1.5, y: y + 0.5, k: R() < 0.55 ? 'statue_saint' : 'statue_angel', flip: R() < 0.5 }); st++;
    }
    for (let t = 0, c = 0; t < 400 && c < (R() < 0.5 ? 1 : 2); t++) {
      const x = 4 + Math.floor(R() * (W - 8)), y = 4 + Math.floor(R() * (H - 8)); if (!free(x, y, 1)) continue;
      out.push({ x: x + 0.5, y: y + 0.5, k: R() < 0.5 ? 'cage' : 'cage2', flip: R() < 0.5 }); c++;
    }
    // the herd, on the Burnt Heath: the open ground farthest from the middle of the heath
    if (z.id === 'burnt_heath' && DEC.cow_carcass) {
      let best = null, bd = -1;
      for (let y = 6; y < H - 6; y += 2) for (let x = 6; x < W - 6; x += 2) { if (!open(z, x, y, 3)) continue; const d = Math.hypot(x - W / 2, y - H / 2); if (d > bd) { bd = d; best = [x, y]; } }
      if (best) {
        const [cx, cy] = best; z._herd = { x: cx + 0.5, y: cy + 0.5 };
        const k = 7;
        for (let i = 0; i < k; i++) {                                   // a ring, all lying the same way
          const a = i / k * Math.PI * 2 + R() * 0.3, r = 3.2 + R() * 1.2, x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
          if (!z.solidAt(x + 0.5, y + 0.5)) out.push({ x: x + 0.5, y: y + 0.5, k: 'cow_carcass', flip: i % 3 === 1 });
        }
        if (DEC.cow_skulls) { out.push({ x: cx + 0.5, y: cy + 0.5, k: 'cow_skulls', flip: false }); out.push({ x: cx + 5.5, y: cy - 4.5, k: 'cow_skulls', flip: true }); }
      }
    }
    return out;
  }
  // the camp fire lights its ring of ground (and so cuts the dark)
  if (typeof addLights16 === 'function') {
    const _al = addLights16;
    addLights16 = function (z) { _al(z); try { for (const o of place(z)) if (o.fire && typeof fireLight37 === 'function') fireLight37(z, o.x, o.y, 5.5, '255,150,72', 2.2, 6, 0, 'fire', o.x * 3 + o.y); } catch (e) { } };
  }
  if (typeof drawClassLamp === 'function') {
    const _dcl = drawClassLamp;
    drawClassLamp = function (list) {
      _dcl(list);
      try {
        const z = G.zone; if (!z) return;
        for (const o of place(z)) {
          if (!onScreen(o.x, o.y, 120)) continue;
          list.push({ d: o.x + o.y - 0.3, f: () => {
            const fr = frame(o.k); if (!fr) return; const p = iso(o.x, o.y);
            if (o.flip) { ctx.save(); ctx.translate(Math.round(p.sx), 0); ctx.scale(-1, 1); ctx.drawImage(fr.c, Math.round(-fr.ox), Math.round(p.sy - fr.oy)); ctx.restore(); }
            else ctx.drawImage(fr.c, Math.round(p.sx - fr.ox), Math.round(p.sy - fr.oy));
          } });
        }
        // the first time you come upon the herd, one quiet line
        if (z._herd && !z._herdSaid && Math.hypot(P.x - z._herd.x, P.y - z._herd.y) < 7) {
          z._herdSaid = true; if (typeof say === 'function') say('The herd lay down here, facing the same way. The ground between them was opened once, and closed.', 5);
        }
      } catch (e) { if (typeof reportError === 'function') reportError(e); }
    };
  }
  try { window.__decor66 = { place }; } catch (e) { }
})();
