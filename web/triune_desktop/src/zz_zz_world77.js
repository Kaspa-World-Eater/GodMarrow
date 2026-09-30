// zz_zz_world77.js — the user (2026-09-29): "work on enhancing the graphics of the world. The objects, detailing things.
// You can decide."
// The open zones were generated at a deliberately low tree density (room to run, the Diablo way), which left long
// stretches of bare ground. This adds the small things a real ground is made of, none of them solid:
//  * SCATTER: little pixel still-lifes laid on the ground, chosen by the land. The wood: leaf litter, fallen twigs, moss,
//    pale mushrooms in twos and threes, ferns. The moor: ash, grey stones, chips of old bone, black glass (the Husk's
//    blood, hardened), dead straw. The fen: reeds with a cattail or two, wet stones, moss, still puddles holding the sky.
//    The burnt heath: charcoal, ash drifts, bone. Grass and reeds lean with the wind (and the gusts of zz_atmos62).
//  * CANOPY: in the woods, the ground is dappled by the shadow of leaves you never see, drifting a little as the crowns
//    move. By day it is the strongest thing on the ground; by night it is barely there.
// Painted at twice the world's grain (one canvas pixel each), so they sit at the same fineness as the ground and heroes.
(function () {
  if (typeof drawSplats !== 'function') return;
  const K = 2, SEED = s => { let a = s >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const hashStr = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
  // ------------------------------------------------------------------ painters (hr pixels; the sprite's foot is its bottom centre)
  function sprite(w, h, paint) { const c = mkCanvas(w, h), x = c.getContext('2d'); const px = (i, j, col) => { if (i < 0 || j < 0 || i >= w || j >= h) return; x.fillStyle = col; x.fillRect(i | 0, j | 0, 1, 1); }; paint(px, x); return { c, w, h }; }
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  function stones(r, P) {
    const n = 1 + Math.floor(r() * 3); return sprite(18, 8, px => {
      for (let s = 0; s < n; s++) { const cx = 3 + r() * 11, w = 2 + Math.floor(r() * 3), h = 1 + Math.floor(r() * 2), cy = 6 - (h > 1 ? 1 : 0);
        for (let i = -w; i <= w; i++) { const hh = Math.round(h * Math.sqrt(1 - (i / (w + 0.5)) ** 2)); for (let j = 0; j <= hh; j++) px(cx + i, cy - j, j === hh ? (i < 0 ? P[2] : P[1]) : j === 0 ? P[0] : P[1]); }
        px(cx - w + 1, cy - h, P[3] || P[2]); px(cx + w + 1, cy + 1, 'rgba(0,0,0,0.35)'); }
    });
  }
  function twig(r, P) {
    return sprite(20, 8, px => {
      const L = 8 + Math.floor(r() * 8), a = (r() - 0.5) * 0.7, x0 = 10 - Math.cos(a) * L / 2, y0 = 5 - Math.sin(a) * L / 2;
      for (let i = 0; i < L; i++) { const x = x0 + Math.cos(a) * i, y = y0 + Math.sin(a) * i; px(x, y + 1, 'rgba(0,0,0,0.3)'); px(x, y, i % 3 ? P[0] : P[1]); }
      const f = 3 + Math.floor(r() * (L - 5)), fx = x0 + Math.cos(a) * f, fy = y0 + Math.sin(a) * f, s = r() < 0.5 ? -1 : 1;
      for (let i = 1; i < 4; i++) px(fx + i * 0.7, fy + s * i * 0.7 - 0.5, P[0]);
    });
  }
  function litter(r, P) {
    return sprite(16, 8, px => { const n = 5 + Math.floor(r() * 8); for (let i = 0; i < n; i++) { const a = r() * 6.28, d = Math.sqrt(r()), x = 8 + Math.cos(a) * d * 7, y = 4 + Math.sin(a) * d * 3; const c = pick(r, P); px(x, y, c); if (r() < 0.5) px(x + 1, y, c); } });
  }
  function moss(r, P) {
    return sprite(16, 7, px => { const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]; for (let j = 0; j < 7; j++) for (let i = 0; i < 16; i++) { const d = ((i - 8) / 8) ** 2 + ((j - 3.5) / 3.5) ** 2 + (r() - 0.5) * 0.3; if (d > 1) continue; const v = (1 - d) * 16; if (v < B[(j & 3) * 4 + (i & 3)] * 0.7) continue; px(i, j, d < 0.35 ? P[2] : d < 0.7 ? P[1] : P[0]); } });
  }
  function mushrooms(r, P) {
    const n = 2 + Math.floor(r() * 2); return sprite(14, 9, px => {
      for (let s = 0; s < n; s++) { const x = 2 + Math.floor(r() * 9), h = 2 + Math.floor(r() * 2), w = r() < 0.5 ? 1 : 2;
        px(x + 1, 8, 'rgba(0,0,0,0.4)'); for (let j = 0; j < h; j++) px(x, 8 - j, P[2]);
        for (let i = -w; i <= w; i++) px(x + i, 8 - h, P[0]); px(x - w + 1, 8 - h - 1, P[1]); if (w > 1) px(x, 8 - h - 1, P[1]); }
    });
  }
  function bones(r, P) {
    const n = 1 + Math.floor(r() * 3); return sprite(16, 7, px => {
      for (let s = 0; s < n; s++) { const L = 3 + Math.floor(r() * 4), x = 2 + r() * 8, y = 2 + r() * 3, a = (r() - 0.5) * 1.2;
        for (let i = 0; i < L; i++) { const X = x + Math.cos(a) * i, Y = y + Math.sin(a) * i; px(X, Y + 1, P[2]); px(X, Y, i === 0 || i === L - 1 ? P[0] : P[1]); }
        px(x - 0.5, y - 0.5, P[0]); }
    });
  }
  function glass(r, P) {
    return sprite(10, 6, px => { const n = 1 + Math.floor(r() * 2); for (let s = 0; s < n; s++) { const x = 2 + Math.floor(r() * 5), y = 2 + Math.floor(r() * 2); px(x, y, P[0]); px(x + 1, y, P[0]); px(x, y + 1, P[1]); px(x + 1, y + 1, P[0]); px(x, y, P[2]); } });
  }
  function puddle(r, P) {
    return sprite(22, 8, px => { const w = 7 + r() * 3, h = 2.2 + r() * 1; for (let j = 0; j < 8; j++) for (let i = 0; i < 22; i++) { const d = ((i - 11) / w) ** 2 + ((j - 4) / h) ** 2; if (d > 1) continue; px(i, j, d > 0.7 ? P[1] : P[0]); }
      const hx = 11 - w * 0.3; for (let i = 0; i < 4; i++) px(hx + i, 4 - h * 0.35, P[2]); });
  }
  function ashdrift(r, P) {
    return sprite(20, 7, px => { const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]; for (let j = 0; j < 7; j++) for (let i = 0; i < 20; i++) { const d = ((i - 10) / 10) ** 2 + ((j - 3.5) / 3.5) ** 2; if (d > 1) continue; const v = (1 - d) * 10; if (v < B[(j & 3) * 4 + (i & 3)]) continue; px(i, j, d < 0.4 ? P[1] : P[0]); } });
  }
  // grass and reeds: three lean frames each, swapped with the wind
  function tuft(r, P, tall) {
    const n = tall ? 4 + Math.floor(r() * 4) : 4 + Math.floor(r() * 4), bl = [];
    for (let i = 0; i < n; i++) bl.push({ x: 4 + r() * 8, h: tall ? 7 + Math.floor(r() * 8) : 3 + Math.floor(r() * 5), c: Math.floor(r() * 3), bend: (r() - 0.5) * 0.6, cat: tall && r() < 0.25 });
    const f = lean => sprite(16, tall ? 17 : 10, px => {
      const H = tall ? 16 : 9;
      for (const b of bl) { for (let j = 0; j < b.h; j++) { const t = j / b.h, x = b.x + (b.bend + lean) * t * t * b.h * 0.5; px(x, H - j, t < 0.3 ? P[0] : t < 0.75 ? P[1 + (b.c > 1 ? 1 : 0)] : P[2]); }
        if (b.cat) { const x = b.x + (b.bend + lean) * b.h * 0.5; px(x, H - b.h, P[3] || '#3a2a1c'); px(x, H - b.h - 1, P[3] || '#3a2a1c'); px(x, H - b.h - 2, P[3] || '#3a2a1c'); } }
    });
    return { sway: true, fr: [f(-0.35), f(0), f(0.35)] };
  }
  // ------------------------------------------------------------------ the lands
  const PAL = {
    stone: ['#2c2b2a', '#4a4845', '#65625c', '#86827a'], wetstone: ['#1f2624', '#3a4440', '#56625c', '#74827a'],
    twig: ['#3a2a1a', '#54402a'], litter: ['#5a3a1c', '#7a4a22', '#94602a', '#6b5a2a', '#3e2a16', '#8a7a3a'],
    moss: ['#1c2e18', '#263c1f', '#324c26'], mush: ['#cfc3a8', '#eee4cc', '#b8ae96'], bone: ['#d8d0bc', '#b8ae98', '#5a5448'],
    glass: ['#15151b', '#2c2f3c', '#a6b2cc'], straw: ['#4a4228', '#7a6c42', '#a09058'], grass: ['#1e3418', '#34522a', '#5a7a3a'],
    reed: ['#1e3424', '#3a5a3a', '#6a8a50', '#3a2a1c'], puddle: ['#10181c', '#1a262c', '#6a8494'], ash: ['#4a4642', '#6a6560'],
    char: ['#1a1816', '#2c2824', '#3e3830', '#524a40'],
  };
  const LAND = {
    wood: [[litter, 'litter', 5], [twig, 'twig', 3], [moss, 'moss', 2], [mushrooms, 'mush', 1.2], [stones, 'stone', 1.5], [tuft, 'grass', 3.5]],
    moor: [[stones, 'stone', 3], [ashdrift, 'ash', 2], [bones, 'bone', 1.2], [glass, 'glass', 1.2], [tuft, 'straw', 3.5], [twig, 'twig', 1], [moss, 'moss', 0.6]],
    fen: [[tuft, 'reed', 4, true], [moss, 'moss', 2.5], [stones, 'wetstone', 2], [puddle, 'puddle', 1.5], [twig, 'twig', 1], [mushrooms, 'mush', 0.5]],
    heath: [[ashdrift, 'ash', 3], [stones, 'char', 2.5], [bones, 'bone', 1.5], [twig, 'char', 2], [tuft, 'straw', 1.5]],
  };
  const landOf = z => {
    const id = z.id || '', th = z.theme || '';
    if (/burnt|ash_shore|heath/.test(id)) return 'heath';
    if (/fen|bog|drowned|mire|marsh/.test(id + th)) return 'fen';
    if (/wood|root|tree|fern|hunter|gully|grove|forest/.test(id + th)) return 'wood';
    if (/moor|ridge|road|barrow|bridge|watchtower|pilgrim|shore/.test(id + th)) return 'moor';
    return null;
  };
  const WOODY = z => landOf(z) === 'wood';
  const GROUND = { 0: 1, 11: 1, 13: 1, 12: 0.4, 1: 0.3, 14: 0.3 };   // roads and flags: a weed in a crack, a loose stone   // grass, dirt, mud; shallows only take reeds and puddles
  // ------------------------------------------------------------------ laying it out (once per zone), bucketed for drawing
  const BK = 8;
  function lay(z) {
    if (z._w77) return z._w77;
    const land = typeof isOutdoor === 'function' && isOutdoor(z) ? landOf(z) : null, out = z._w77 = { land, b: new Map(), n: 0 };
    if (!land) return out;
    const r = SEED(hashStr(z.id) ^ 0x77a1), set = LAND[land], tot = set.reduce((a, s) => a + s[2], 0), W = z.w || 60, H = z.h || 60;
    const lib = [];   // a small library of variants per kind, reused (keeps memory and paint time down)
    for (const s of set) for (let v = 0; v < 6; v++) lib.push({ s, sp: s[0](r, PAL[s[1]], s[3]) });
    const dens = (window.__perf74 && window.__perf74.slow ? 0.1 : 0.16);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const t = z.get(x, y), g = GROUND[t]; if (!g || r() > dens * g) continue;
      let q = r() * tot, s = set[0]; for (const e of set) { q -= e[2]; if (q <= 0) { s = e; break; } }
      if (t === 12 && s[0] !== tuft && s[0] !== puddle) continue;
      if ((t === 1 || t === 14) && s[0] !== tuft && s[0] !== stones && s[0] !== litter && s[0] !== ashdrift) continue;
      const cands = lib.filter(l => l.s === s), it = cands[Math.floor(r() * cands.length)];
      const o = { x: x + r(), y: y + r(), sp: it.sp, flip: r() < 0.5, ph: r() * 6.28 };
      const key = ((o.x / BK) | 0) + ',' + ((o.y / BK) | 0); let arr = out.b.get(key); if (!arr) out.b.set(key, arr = []); arr.push(o); out.n++;
    }
    return out;
  }
  // ------------------------------------------------------------------ canopy: a tile of dappled leaf-shadow
  let CAN = null;
  function canopy() {
    if (CAN) return CAN;
    const S = 192, c = mkCanvas(S, S), x = c.getContext('2d'), im = x.createImageData(S, S), D = im.data, r = SEED(9177);
    const blobs = []; for (let i = 0; i < 60; i++) blobs.push([r() * S, r() * S, 8 + r() * 22, 0.4 + r() * 0.6]);
    const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      let v = 0; for (const [bx, by, br, bk] of blobs) { let dx = Math.abs(i - bx), dy = Math.abs(j - by) * 1.8; if (dx > S / 2) dx = S - dx; if (dy > S * 0.9) dy = S * 1.8 - dy; const d = Math.hypot(dx, dy) / br; if (d < 1) v = Math.max(v, (1 - d * d) * bk); }
      // holes in the leaves: where the light gets through
      const q = Math.min(1, v * 1.6), lv = q * 16 > B[(j & 3) * 4 + (i & 3)] ? 1 : 0; const o = (j * S + i) * 4; D[o] = 6; D[o + 1] = 10; D[o + 2] = 8; D[o + 3] = lv ? 255 : 0;
    }
    x.putImageData(im, 0, 0); CAN = c; return c;
  }
  // ------------------------------------------------------------------ drawing: on the ground, under the splats and shadows
  const draw = (_raw => function (img, dx, dy, dw, dh) { (typeof _drawImage !== 'undefined' ? _drawImage : ctx.drawImage).call(ctx, img, dx, dy, dw, dh); })();
  function paintGround() {
    const z = G.zone; if (!z) return; const L = lay(z); if (!L.land) return;
    // the world range on screen: invert the four corners
    const inv = (sx, sy) => { const u = (sx + cam.x) / (TW / 2), v = (sy + cam.y) / (TH / 2); return [(u + v) / 2, (v - u) / 2]; };
    const cs = [inv(-20, -20), inv(VW + 20, -20), inv(-20, VH + 30), inv(VW + 20, VH + 30)];
    const x0 = Math.min(...cs.map(c => c[0])), x1 = Math.max(...cs.map(c => c[0])), y0 = Math.min(...cs.map(c => c[1])), y1 = Math.max(...cs.map(c => c[1]));
    const gust = (window.__atmos62 && window.__atmos62.gust) || 0, t = G.time;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    for (let by = Math.floor(y0 / BK); by <= Math.floor(y1 / BK); by++) for (let bx = Math.floor(x0 / BK); bx <= Math.floor(x1 / BK); bx++) {
      const arr = L.b.get(bx + ',' + by); if (!arr) continue;
      for (const o of arr) {
        const p = iso(o.x, o.y); if (p.sx < -20 || p.sx > VW + 20 || p.sy < -20 || p.sy > VH + 30) continue;
        let sp = o.sp;
        if (sp.sway) { const w = Math.sin(t * 1.3 + o.x * 0.7 + o.y * 0.3) * 0.6 + gust * 1.2; sp = sp.fr[w < -0.35 ? 0 : w > 0.35 ? 2 : 1]; }
        const w = sp.w / K, h = sp.h / K, X = Math.round((p.sx - w / 2) * K) / K, Y = Math.round((p.sy - h + 1) * K) / K;
        if (o.flip) { ctx.save(); ctx.translate(X + w, Y); ctx.scale(-1, 1); draw(sp.c, 0, 0, w, h); ctx.restore(); } else draw(sp.c, X, Y, w, h);
      }
    }
    ctx.restore();
    // the canopy's dapple, anchored to the world, swaying a little with the crowns
    if (WOODY(z) && !(window.__perf74 && window.__perf74.slow && G.lowFx2)) {
      const dk = typeof dayK === 'function' ? dayK() : 1, a = 0.16 + 0.2 * dk; if (a > 0.02) {
        const c = canopy(), ox = Math.sin(t * 0.23) * 2 + gust * 2, oy = Math.cos(t * 0.19) * 1;
        const pat = ctx.createPattern(c, 'repeat');
        ctx.save(); ctx.globalAlpha = a; ctx.translate(-cam.x + ox, -cam.y + oy);
        ctx.fillStyle = pat; ctx.fillRect(cam.x - ox - 4, cam.y - oy - 4, VW + 8, VH + 8); ctx.restore();
      }
    }
  }
  const _sp = drawSplats;
  drawSplats = function () { try { paintGround(); } catch (e) { if (typeof reportError === 'function') reportError(e); } return _sp.apply(this, arguments); };
  try { window.__world77 = { lay, landOf }; } catch (e) { }
})();
