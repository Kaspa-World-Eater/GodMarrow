
// =================================================================== v0.21: dressing the world
// Every zone is scattered, once, with things that tell you where you are: graves, cairns, gibbets and crows on the
// moor; reeds, stumps and glowing fungus in the fen; coffins, skull piles, candles and braziers underground.
// Props never block movement. Static parts are painted once into cached frames; flames, reeds, cages and birds move.
const PROPPAL = { s0: '#1e1c22', s1: '#3a3640', s2: '#58545e', s3: '#7c7884', s4: '#a8a4ae', m0: '#26301e', m1: '#3e4c2c', b0: '#6a6250', b1: '#a89e84', b2: '#d8d0b8', b3: '#f2ecda',
  w0: '#241810', w1: '#3e2a1a', w2: '#5e4228', w3: '#80603c', i0: '#1e2026', i1: '#3a3e48', i2: '#6a707c', i3: '#a4aab6', wax: '#e8dcc0', wax2: '#b8a888', gap: '#0e0d12',
  r0: '#1e2a1a', r1: '#3a5028', r2: '#5e7a3c', r3: '#8aa65a', f0: '#1e3a36', f1: '#2e6a5e', f2: '#6ad8b4', f3: '#c8ffe8', bl: '#5a1418', rust: '#6a3a22' };
const PROP_PAINT = {
  grave(A, v) {
    const tilt = [0, 1, -1, 0][v];
    if (v === 1) { // a Celtic cross
      A.R(-1, -16, 3, 16, 's2'); A.R(-4, -12, 9, 3, 's2'); A.E(0.5, -10.5, 3.5, 3.5, 's1'); A.E(0.5, -10.5, 2, 2, 'gap'); A.R(-1, -16, 3, 16, 's2'); A.R(-4, -12, 9, 3, 's3'); A.R(-1, -16, 1, 16, 's3'); A.R(1, -15, 1, 15, 's1'); A.P(0, -11, 's4');
    } else if (v === 2) { // a leaning obelisk
      for (let y = -18; y < 0; y++) { const hw = 2 + (y + 18) * 0.12; A.R(-hw + (y + 18) * 0.06 * tilt, y, hw * 2, 1, 's2'); A.P(-hw + (y + 18) * 0.06 * tilt, y, 's3'); } A.P(0, -19, 's3'); A.L(1, -12, 0, -8, 's1');
    } else { // a round-topped slab
      A.R(-4, -11, 8, 11, 's2'); A.E(0, -11, 4, 3, 's2'); A.R(-4, -11, 1, 11, 's3'); A.E(-1, -12, 2.5, 1.5, 's3'); A.R(3, -11, 1, 11, 's1');
      A.R(-2, -9, 4, 1, 's1'); A.R(-2, -7, 4, 1, 's1'); A.R(-1, -5, 2, 1, 's1'); A.L(2, -13, 0, -9, 'gap');
    }
    for (let i = 0; i < 4; i++) A.P(-4 + i * 2 + (i % 2), -1 - (i % 2), i % 2 ? 'm1' : 'm0'); A.R(-5, -1, 10, 1, 'm0');
  },
  cairn(A, v) { // a heap of skulls and long bones
    const n = 3 + v;
    for (let i = 0; i < n; i++) { const x = -4 + (i * 5) % 9, y = -2 - Math.floor(i / 3) * 3; A.E(x, y, 2, 1.8, 'b1'); A.E(x - 0.4, y - 0.4, 1.4, 1.1, 'b2'); A.P(x - 0.5, y, 'gap'); A.P(x + 0.7, y, 'gap'); A.P(x, y + 1, 'b0'); }
    A.L(-6, -1, 5, -3, 'b1'); A.P(-6, -1, 'b3'); A.P(5, -3, 'b3'); A.L(-3, 0, 6, 0, 'b0');
  },
  shrub(A, v) { // a dead thorn bush
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.42 + (v - 1) * 0.1, L = 6 + ((i * 7 + v * 3) % 5); A.L(0, 0, Math.cos(a) * L, Math.sin(a) * L * 0.9, i % 2 ? 'w2' : 'w1'); A.L(Math.cos(a) * L * 0.6, Math.sin(a) * L * 0.55, Math.cos(a + 0.6) * L * 0.8, Math.sin(a + 0.6) * L * 0.7, 'w1'); }
    A.E(0, 0, 3, 1, 'w0');
  },
  stump(A, v) {
    A.E(0, -3, 4, 4, 'w1'); A.R(-4, -3, 8, 3, 'w1'); A.E(0, -6, 4, 1.6, 'w3'); A.E(0, -6, 2.4, 0.9, 'w2'); A.P(0, -6, 'w1'); A.R(-4, -5, 1, 4, 'w2'); A.R(3, -5, 1, 4, 'w0');
    A.L(-4, -1, -7, 0, 'w1'); A.L(3, -1, 6, 0, 'w0'); if (v % 2) { A.P(-2, -3, 'm1'); A.P(-1, -2, 'm1'); A.P(2, -4, 'm0'); }
  },
  coffin(A, v) {
    const open = v % 2;
    for (let y = -6; y <= 0; y++) { const hw = y < -3 ? 3 + (y + 6) * 0.6 : 5 - (y + 3) * 0.6; A.R(-hw - 3, y, hw * 2 + 6, 1, 'w2'); }
    A.R(-8, -6, 16, 1, 'w3'); A.R(-8, 0, 16, 1, 'w0');
    if (open) { A.R(-6, -5, 12, 4, 'gap'); A.E(-4, -3, 1.4, 1.2, 'b2'); A.L(-3, -3, 4, -3, 'b1'); A.L(-1, -4, -1, -2, 'b1'); A.L(1, -4, 1, -2, 'b1'); A.L(-9, -9, 3, -12, 'w2', 2); A.L(-9, -8, 3, -11, 'w0'); }
    else { A.L(-2, -6, -2, 0, 'w1'); A.L(-4, -3, 0, -3, 'w1'); A.P(6, -3, 'i2'); A.P(-7, -3, 'i2'); }
  },
  pillar(A, v) { // a broken column stub
    const h = 7 + v * 2;
    A.R(-4, -h, 8, h, 's2'); A.R(-4, -h, 2, h, 's3'); A.R(2, -h, 2, h, 's1'); for (let y = -h + 2; y < 0; y += 3) A.R(-4, y, 8, 1, 's1');
    A.R(-5, -1, 10, 1, 's1'); for (let i = 0; i < 4; i++) A.P(-4 + i * 2, -h - (i % 2), 's3');
    A.E(6, -1, 2, 1.2, 's2'); A.E(-6, 0, 1.5, 1, 's1');
  },
  bones(A, v) { // scattered bones on the floor
    A.L(-5, 0, 1, -2, 'b1'); A.P(-5, 0, 'b3'); A.P(1, -2, 'b3'); A.L(0, 1, 5, 0, 'b0'); A.E(3 + v, -2, 1.6, 1.3, 'b2'); A.P(2.6 + v, -2, 'gap'); A.P(3.8 + v, -2, 'gap');
  },
  fungus(A, v) { // pale cap mushrooms that glow in the dark
    for (let i = 0; i < 3 + v; i++) { const x = -4 + i * 2.5, h = 2 + (i * 5 + v) % 4; A.L(x, 0, x, -h, 'f0'); A.E(x, -h, 1.8, 1, 'f1'); A.P(x - 0.5, -h - 0.5, 'f2'); A.P(x + 0.5, -h, 'f3'); }
  },
  gibbetPost(A) { A.R(-1, -30, 2, 30, 'w1'); A.R(-1, -30, 1, 30, 'w2'); A.R(-1, -30, 10, 2, 'w1'); A.R(-1, -30, 10, 1, 'w2'); A.L(0, -24, 5, -29, 'w0'); A.R(-3, -1, 6, 1, 'w0'); },
  brazier(A) { A.L(-3, 0, 0, -8, 'i1'); A.L(3, 0, 0, -8, 'i1'); A.L(0, 0, 0, -8, 'i2'); A.E(0, -9, 4, 1.8, 'i1'); A.E(0, -10, 3.4, 1, 'i0'); A.R(-4, -10, 8, 2, 'i2'); A.P(-3, -10, 'i3'); A.E(0, -10, 2.4, 0.8, 'rust'); },
  candles(A, v) { const n = 3 + v; for (let i = 0; i < n; i++) { const x = -5 + i * 2.6, h = 3 + (i * 7 + v) % 5; A.R(x, -h, 2, h, 'wax'); A.P(x, -h, 'wax2'); A.P(x + 1, -h + 1, 'wax2'); A.P(x, -1, 'wax2'); } A.E(0, 0, 6, 1.2, 'wax2'); }
};
const PROP_FR = {};
function propFrame(kind, v) {
  const key = kind + v; if (PROP_FR[key]) return PROP_FR[key];
  const big = kind === 'gibbetPost', w = big ? 30 : 24, h = big ? 36 : 26;
  const fr = mkFrame(w, h, (x, ox, oy) => PROP_PAINT[kind](painter(x, ox, oy, PROPPAL), v));
  PROP_FR[key] = fr; return fr;
}
// ------------------------------------------------------------------- placement: once per zone, seeded by position
function genProps(z) {
  const out = [], th = z.theme || 'moor', rnd = (x, y, k) => hash(x * 31 + k * 7, y * 17 + k * 13);
  const occupied = new Set(z.objects.map(o => Math.floor(o.x) + ',' + Math.floor(o.y)));
  const nearWall = (x, y) => { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const t = z.get(x + i, y + j); if (t === T.WALL || t === T.PILLAR) return true; } return false; };
  const nearWater = (x, y) => { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (z.get(x + i, y + j) === T.WATER) return true; return false; };
  for (let y = 1; y < z.h - 1; y++) for (let x = 1; x < z.w - 1; x++) {
    const t = z.get(x, y); if (occupied.has(x + ',' + y)) continue;
    if (t !== T.FLOOR && hash(Math.floor(x / 9) * 7 + 3, Math.floor(y / 9) * 5 + 1) < 0.45) continue;   // v0.22d: quiet stretches with nothing in them
    const r = rnd(x, y, 1), v = Math.floor(rnd(x, y, 2) * 4), px = x + 0.2 + rnd(x, y, 3) * 0.6, py = y + 0.2 + rnd(x, y, 4) * 0.6, add = (kind, extra) => out.push({ kind, v, x: px, y: py, ...extra });
    // v0.35: things hung on the walls underground: torches in iron brackets, tattered cloths, chains, cobwebs in the corners
    const wallN = z.get(x, y - 1) === T.WALL, wallW = z.get(x - 1, y) === T.WALL, mount = (kind, extra) => { const side = wallN ? 0 : 1; out.push({ kind, v, side, wx: side ? x - 1 : x, wy: side ? y : y - 1, x: side ? x + 0.02 : x + 0.5, y: side ? y + 0.5 : y + 0.02, ...extra }); };
    if (th === 'moor') {
      if (t === T.GRASS || t === T.DIRT) {
        if (r < 0.012) { add('grave'); if (rnd(x, y, 9) < 0.45) out.push({ kind: 'offering', v, x: px + 0.75, y: py + 0.35 }); if (rnd(x, y, 10) < 0.3) out.push({ kind: 'railing', v: v | 1, x: px - 0.95, y: py + 0.05 }); }
        else if (r < 0.018) add('shrub'); else if (r < 0.021) add('cairn'); else if (r < 0.0215) add('gibbet', { ph: rnd(x, y, 5) * 6 });
        else if (r < 0.024) add('crows', { birds: Array.from({ length: 3 + v }, (_, i) => ({ dx: (rnd(x + i, y, 6) - 0.5) * 1.4, dy: (rnd(x, y + i, 7) - 0.5) * 0.8, ph: rnd(x, y, 8 + i) * 6, fly: 0, vx: 0, vy: 0, z: 0 })) });
        else if (r < 0.0265) add('skulls'); else if (r < 0.028) add('railing');
      }
      if (t === T.ROAD && r < 0.006) add('bones');
      if (t === T.FLAGS) { if (r < 0.007) add('arch'); else if (r < 0.04) add('rubble'); else if (r < 0.05) add('skulls'); else if (r < 0.06) add('candles', { light: 38, lrgb: '255,190,110', lz: 9 }); }
    } else if (th === 'fen') {
      if ((t === T.MUD || (t === T.GRASS && nearWater(x, y))) && r < 0.0035) add('bell');
      else if (t === T.GRASS && nearWater(x, y) && r < 0.12) add('reeds', { n: 4 + v * 2, ph: rnd(x, y, 5) * 6 });
      else if (t === T.GRASS && r < 0.01) add('stump'); else if (t === T.GRASS && r < 0.016) add('fungus', { light: 18, lrgb: '100,255,200', lz: 3 }); else if (t === T.GRASS && r < 0.02) add('shrub');
      else if (t === T.GRASS && r < 0.023) add('skulls'); else if (t === T.MUD && r < 0.03) add('bones');
      else if (t === T.WATER && r < 0.03) add('lily', { ph: rnd(x, y, 5) * 6 });
      if (t === T.FLAGS) { if (r < 0.015) add('arch'); else if (r < 0.04) add('rubble'); }
    } else if (t === T.FLOOR) {
      const wall = nearWall(x, y), r2 = rnd(x, y, 11);
      if ((wallN || wallW) && r2 < 0.038) mount('sconce', { light: 62, lrgb: '255,150,70', lz: 34 });
      else if ((wallN || wallW) && r2 < 0.08 && th !== 'bone') mount('cloth');
      else if ((wallN || wallW) && r2 < 0.1 && th !== 'barrow') mount('wallchain');
      if (wallN && wallW && r2 > 0.5) out.push({ kind: 'cobweb', v, side: 0, wx: x, wy: y - 1, x: x + 0.02, y: y + 0.02 });
      if (wall && r < 0.022) add('brazier', { light: 70, lrgb: '255,150,70', lz: 20 });
      else if (wall && r < 0.06) add('candles', { light: 38, lrgb: '255,190,110', lz: 9 });
      else if (wall && r < 0.08) add(th === 'bone' ? 'cairn' : 'coffin');
      else if (wall && r < 0.095) add('chains');
      else if (r < 0.012) add('bones'); else if (r < 0.016) add(th === 'barrow' ? 'fungus' : 'pillar', th === 'barrow' ? { light: 18, lrgb: '100,255,200', lz: 3 } : {});
      else if (r < 0.019 && th === 'bone') add('cairn');
      else if (r < 0.024) add('rubble'); else if (r < 0.027) add('skulls');
      else if (r < 0.031 && th !== 'bone') add('drip', { ph: rnd(x, y, 5) * 6, per: 1.6 + rnd(x, y, 6) * 2.4 });
    }
  }
  return out;
}
function ensureProps() { const z = G.zone; if (!z) return; if (G.propsZone !== z) { G.propsZone = z; G.props16 = genProps(z); } }
// ------------------------------------------------------------------- drawing
function flame(sx, sy, s, seed) {
  const t = G.time * 9 + seed, h = s * (1 + 0.25 * Math.sin(t) + 0.15 * Math.sin(t * 2.3));
  ctx.globalCompositeOperation = 'lighter'; glow(sx, sy - h * 0.6, s * 3, '255,140,60', 0.35); ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#c8401e'; ctx.beginPath(); ctx.moveTo(sx - s * 0.7, sy); ctx.quadraticCurveTo(sx - s * 0.5, sy - h * 0.6, sx + Math.sin(t * 1.7) * s * 0.3, sy - h); ctx.quadraticCurveTo(sx + s * 0.5, sy - h * 0.5, sx + s * 0.7, sy); ctx.fill();
  ctx.fillStyle = '#ffb040'; ctx.beginPath(); ctx.moveTo(sx - s * 0.4, sy); ctx.quadraticCurveTo(sx - s * 0.3, sy - h * 0.45, sx + Math.sin(t * 1.9) * s * 0.2, sy - h * 0.72); ctx.quadraticCurveTo(sx + s * 0.3, sy - h * 0.35, sx + s * 0.4, sy); ctx.fill();
  ctx.fillStyle = '#fff0b0'; ctx.fillRect(Math.round(sx) - 1, Math.round(sy - h * 0.3), 2, Math.max(1, Math.round(h * 0.25)));
  if (Math.random() < 0.04) { const w = screenToWorld(sx, sy + 8); parts.push({ g: '255,150,60', s: 0.8, x: w.x, y: w.y, z: 10 + h, vx: rand(-0.6, 0.6), vy: rand(-0.6, 0.6), vz: 14, t: 0.7, t0: 0.7 }); }
}
// v0.23: props are 32-bit frames from zt_env32.js, drawn at their foot; the moving parts are pixel frames too
function drawStatic(o) {
  const fr = ztPropFrame(o.kind === 'gibbet' ? 'gibbetPost' : o.kind, o.v), p = iso(o.x, o.y), flip = o.v % 2 && o.kind !== 'gibbet' && o.kind !== 'candles';
  const sx = Math.round(p.sx), sy = Math.round(p.sy);
  ctx.drawImage(flip ? fr.f : fr.c, sx - (flip ? fr.w - 1 - fr.ox : fr.ox), sy - fr.oy);
  return { sx, sy };
}
function drawProp(o) {
  const t = G.time;
  if (o.kind === 'reeds') {
    const p = iso(o.x, o.y), w = Math.sin(t * 1.4 + o.ph) + Math.sin(t * 3.1 + o.ph) * 0.3, k = w < -0.6 ? 0 : w < 0 ? 1 : w < 0.6 ? 2 : 3, fr = ztReeds(Math.min(10, o.n), k);
    ctx.drawImage(fr.c, Math.round(p.sx) - fr.ox, Math.round(p.sy) - fr.oy); return;
  }
  if (o.kind === 'lily') {
    // v0.35: bigger pads with a cut notch, veins, a curled brown edge, a bud or a flower; a ring of dark water round each
    const p = iso(o.x, o.y), b = Math.sin(t * 1.2 + o.ph) > 0 ? 1 : 0, fr = ztFrame('lily' + (o.v % 3), 28, 14, 14, 8, (A, ox, oy) => {
      const v = o.v % 3;
      A.ell(ox, oy, 9 + v, 4, 'ztLily', { band: 2 }); A.poly([[ox + 1, oy], [ox + 10 + v, oy - 2], [ox + 9 + v, oy + 2]], '#070c08', { flat: true, contour: false });
      A.line(ox - 5, oy - 1, ox - 1, oy, '#627e4a'); A.line(ox - 3, oy + 2, ox, oy, '#46663a'); A.line(ox - 6, oy + 1, ox - 2, oy + 1, '#2e4a26');
      A.px(ox - 8 - v, oy, '#5a4a28'); A.px(ox - 7 - v, oy - 1, '#7a6634'); A.px(ox + 3, oy + 3, '#5a4a28');
      if (v === 0) { A.ell(ox - 2, oy - 3, 2.6, 2, 'ztWax', { tone: 1 }); A.px(ox - 3, oy - 5, '#f2e8cc'); A.px(ox - 1, oy - 4, '#f2e8cc'); A.px(ox - 2, oy - 3, '#c86a8a'); A.px(ox - 4, oy - 2, '#b0a080'); }
      else if (v === 1) { A.limb([[ox + 4, oy - 1], [ox + 5, oy - 5]], 0.7, 0.6, 'ztReed', { contour: false }); A.ell(ox + 5, oy - 6, 1.4, 2, 'ztWax', { tone: -1 }); A.px(ox + 5, oy - 8, '#c86a8a'); }
      for (let k = 0; k < 6; k++) A.px(ox - 12 - v + k * 5 + (k % 2), oy + 3 + (k % 3 === 0 ? 1 : 0), k % 2 ? '#0a100a' : '#1a2e18');
      if (v === 2) { A.ell(ox + 12, oy + 1, 3, 1.4, 'ztLily', { tone: -1 }); }
    });
    ctx.drawImage(fr.c, Math.round(p.sx) - fr.ox, Math.round(p.sy) - fr.oy + b); return;
  }
  if (o.kind === 'crows') {
    const near = Math.hypot(P.x - o.x, P.y - o.y) < 3.2;
    for (const b of o.birds) {
      if (near && !b.fly) { b.fly = 0.01; const a = Math.atan2(b.dy - (P.y - o.y), b.dx - (P.x - o.x)); b.vx = Math.cos(a) * 3 + rand(-1, 1); b.vy = Math.sin(a) * 3 + rand(-1, 1); if (Math.random() < 0.3) sfx(900 + Math.random() * 300, 0.08, 'square', 0.012, -400); }
      let img, sx, sy;
      if (b.fly) {
        b.fly += 0.016; b.dx += b.vx * 0.016; b.dy += b.vy * 0.016; b.z += 30 * 0.016;
        if (b.fly > 6) { b.fly = 0; b.z = 0; b.dx = (Math.random() - 0.5) * 1.4; b.dy = (Math.random() - 0.5) * 0.8; }
        const q = iso(o.x + b.dx, o.y + b.dy); sx = q.sx; sy = q.sy - b.z; img = ztCrowImg(Math.sin(t * 22 + b.ph) > 0 ? 'fly0' : 'fly1');
      } else { const q = iso(o.x + b.dx, o.y + b.dy); sx = q.sx; sy = q.sy; img = ztCrowImg(Math.sin(t * 3 + b.ph * 5) > 0.7 ? 'peck' : 'sit'); }
      const fl = b.vx < 0 || (!b.fly && b.ph > 3);
      ctx.drawImage(fl ? img.f : img.c, Math.round(sx) - img.ox, Math.round(sy) - img.oy);
    }
    return;
  }
  // v0.35: things on the walls hang at their mount height on the wall face; when the wall is cut to a stub, so are they
  if (o.side != null) {
    const a = iso(o.wx, o.wy), wsx = Math.round(a.sx), wsy = Math.round(a.sy);
    if (P && !P.dead && P.x + P.y < o.wx + o.wy + 1 && ztHeroNear(wsx, wsy, 16, 50)) return;
    const p = iso(o.x, o.y), sx = Math.round(p.sx), sy = Math.round(p.sy), fr = ztPropFrame(o.kind, o.v), flip = o.side === 1;
    const h = o.kind === 'sconce' ? 16 : o.kind === 'cobweb' ? 33 : o.kind === 'cloth' ? 10 : 6, sw = o.kind === 'cloth' ? Math.round(Math.sin(t * 0.9 + o.x) * 0.6 + 0.5) : 0;
    ctx.drawImage(flip ? fr.f : fr.c, sx - (flip ? fr.w - 1 - fr.ox : fr.ox) + sw, sy - h - fr.oy);
    if (o.kind === 'sconce') ztDrawFlame(sx + (flip ? -5 : 5), sy - h - 29, 2, o.x * 7 + o.y * 3);
    return;
  }
  if (o.kind === 'drip') {
    const p = drawStatic(o), k = ((t + o.ph) % o.per) / o.per;
    if (k < 0.3) { const q = k / 0.3, z = 54 * (1 - q * q); ctx.fillStyle = q < 0.1 ? '#6a7a88' : '#aebccc'; ctx.fillRect(p.sx, Math.round(p.sy - z), 1, q < 0.1 ? 1 : 2); }
    else if (k < 0.75) { const q = (k - 0.3) / 0.45; ctx.strokeStyle = `rgba(190,205,220,${0.55 * (1 - q)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(p.sx + 0.5, p.sy - 0.5, 1 + q * 6, 0.5 + q * 3, 0, 0, 6.29); ctx.stroke(); if (q < 0.2) { ctx.fillStyle = '#d8e4f0'; ctx.fillRect(p.sx, p.sy - 2, 1, 1); } }
    return;
  }
  const p = drawStatic(o);
  if (o.kind === 'gibbet') {
    // the cage swings from the arm in whole pixels, a skeleton folded inside
    const cage = ztPropFrame('cage', 0), sw = Math.round(Math.sin(t * 1.1 + o.ph) * 2);
    ctx.fillStyle = '#26282f'; ctx.fillRect(p.sx + 17, p.sy - 44, 1, 3);
    ctx.drawImage(cage.c, p.sx + 17 - cage.ox + sw, p.sy - 42 - cage.oy + 4);
  }
  if (o.kind === 'brazier') ztDrawFlame(p.sx, p.sy - 18, 3, o.x * 7);
  if (o.kind === 'candles') { const n = 3 + o.v; for (let i = 0; i < n; i++) { const x = p.sx - 6 + Math.round(i * (12 / Math.max(1, n - 1))), h = 5 + (i * 7 + o.v * 3) % 7, f = Math.sin(t * 12 + i * 2 + o.x) > 0.3 ? 1 : 0, y0 = p.sy - h - 2; ctx.fillStyle = '#c8401e'; ctx.fillRect(x, y0, 1, 1); ctx.fillStyle = '#ffb040'; ctx.fillRect(x, y0 - 1 - f, 1, 1 + f); ctx.fillStyle = '#fff0b0'; ctx.fillRect(x, y0 - 2 - f, 1, 1); } ctx.globalCompositeOperation = 'lighter'; glow(p.sx, p.sy - 8, 14, '255,180,90', 0.25); ctx.globalCompositeOperation = 'source-over'; }
  if (o.kind === 'fungus') { ctx.globalCompositeOperation = 'lighter'; glow(p.sx, p.sy - 4, 10, '100,255,200', 0.22 + 0.08 * Math.sin(t * 2 + o.x)); ctx.globalCompositeOperation = 'source-over'; }
}
function propsToList(list) {
  ensureProps(); if (!G.props16) return;
  for (const o of G.props16) { if (!onScreen(o.x, o.y, 40)) continue; list.push({ d: o.x + o.y - (o.kind === 'lily' || o.kind === 'bones' ? 0.8 : 0), f: () => drawProp(o) }); }
}

// ------------------------------------------------------------------- trees: gnarled, dead, painted, swaying in the wind
const TREE_FR = {};
function treeFrame(v, theme) {
  const key = v + theme; if (TREE_FR[key]) return TREE_FR[key];
  const pal = { t0: '#140e0a', t1: '#241a12', t2: '#3a2a1e', t3: '#5a4430', moss: '#2e3c22', moss2: '#4a5a30', noose: '#8a7a52' };
  const fr = mkFrame(36, 50, (x, ox, oy) => {
    const A = painter(x, ox, oy, pal), rng = mulberry32(v * 977 + (theme === 'fen' ? 5 : 1));
    // roots and a twisted trunk
    A.L(-5, 0, -1, -4, 't1', 2); A.L(5, 0, 1, -4, 't1', 2); A.L(-2, 0, 0, -3, 't0');
    let cx = 0, pts = [];
    for (let y = 0; y > -26 - v * 2; y -= 2) { cx += (rng() - 0.5) * 1.6; pts.push([cx, y]); }
    for (let i = 1; i < pts.length; i++) { const w = Math.max(1, 3.4 - i * 0.18); A.L(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 't2', Math.round(w)); A.L(pts[i - 1][0] - w / 2, pts[i - 1][1], pts[i][0] - w / 2, pts[i][1], 't3'); A.L(pts[i - 1][0] + w / 2, pts[i - 1][1], pts[i][0] + w / 2, pts[i][1], 't1'); }
    A.E(pts[3][0] + 0.5, pts[3][1], 1, 1.4, 't0');   // a knot hole
    // branches, forking and clawing at the sky
    const branch = (x0, y0, a, L, d) => { if (d > 2 || L < 2.5) return; const x1 = x0 + Math.cos(a) * L, y1 = y0 + Math.sin(a) * L; A.L(x0, y0, x1, y1, d < 1 ? 't2' : 't1', d < 1 ? 2 : 1); if (d < 2) A.L(x0, y0 - 1, x1, y1 - 1, 't3'); branch(x1, y1, a - 0.5 - rng() * 0.3, L * 0.68, d + 1); branch(x1, y1, a + 0.4 + rng() * 0.3, L * 0.6, d + 1); };
    for (let i = 4; i < pts.length; i += 3) { const side = i % 4 < 2 ? -1 : 1; branch(pts[i][0], pts[i][1], -Math.PI / 2 + side * (0.7 + rng() * 0.5), 5 + rng() * 5, 0); }
    const top = pts[pts.length - 1]; branch(top[0], top[1], -Math.PI / 2 - 0.3, 6, 0); branch(top[0], top[1], -Math.PI / 2 + 0.4, 5, 1);
    if (theme === 'fen') for (let i = 0; i < 6; i++) { const b = pts[4 + (i % (pts.length - 5))], hx = b[0] + (rng() - 0.5) * 12; A.L(hx, b[1] - 2, hx + (rng() - 0.5) * 2, b[1] + 3 + rng() * 5, i % 2 ? 'moss' : 'moss2'); }
    if (v === 3 && theme !== 'fen') { const b = pts[6]; A.L(b[0] + 7, b[1] - 1, b[0] + 7, b[1] + 7, 'noose'); A.E(b[0] + 7, b[1] + 8.5, 1.4, 1.6, 'noose'); A.P(b[0] + 7, b[1] + 8.5, 't0'); }
  });
  TREE_FR[key] = fr; return fr;
}
function drawTree16(x, y, z) {
  if (typeof ztDrawTree === 'function') return ztDrawTree(x, y, z);   // v0.23: the 32-bit trees (zt_env32.js)
  const v = (hash(x, y) * 4) | 0, fr = treeFrame(v, z.theme === 'fen' ? 'fen' : 'moor'), p = iso(x + 0.5, y + 0.5), flip = hash(y, x) > 0.5;
  const X = Math.round(p.sx) - (flip ? fr.w - fr.ox : fr.ox), Y = Math.round(p.sy) + 4 - (fr.oy + 1);
  // sway: the crown leans with the wind, the roots stay put (a shear about the base)
  const sway = (Math.sin(G.time * 0.9 + x * 0.7 + y * 0.3) * 0.5 + Math.sin(G.time * 2.1 + x) * 0.15) * 0.05;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(p.sx, p.sy + 3, 7, 3, 0, 0, 6.28); ctx.fill();
  ctx.save(); ctx.translate(Math.round(p.sx), Y + fr.h - 2); ctx.transform(1, 0, sway, 1, 0, 0); ctx.drawImage(flip ? fr.f : fr.c, X - Math.round(p.sx), -(fr.h - 2)); ctx.restore();
}

// ------------------------------------------------------------------- water: moving glints and slow ripples over the tiles
function drawWaterGlints(x, y, a) {
  // v0.23: glints in whole pixels across the 24x12 tile, two ripples that brighten and fade
  const t = G.time, sx = Math.round(a.sx), sy = Math.round(a.sy), k = (t * 0.6 + hash(x, y) * 3) % 1, v = Math.sin(k * Math.PI);
  const fen = G.zone.theme === 'fen';
  if (v > 0.4) { ctx.fillStyle = v > 0.85 ? (fen ? '#4e6a4a' : '#5a7898') : (fen ? '#30442e' : '#34506c'); ctx.fillRect(sx - 8 + Math.round(k * 9), sy + 4 + ((hash(x, y * 3) * 3) | 0), v > 0.85 ? 4 : 3, 1); }
  const k2 = (t * 0.4 + hash(y, x) * 5) % 1, v2 = Math.sin(k2 * Math.PI);
  if (v2 > 0.5) { ctx.fillStyle = fen ? '#243424' : '#2a4058'; ctx.fillRect(sx + 2 - Math.round(k2 * 7), sy + 7, 5, 1); }
  // v0.35: a slow dark swell crossing the water, drawn as one row per tile so it never greys the water
  const sw = (t * 0.25 + (x - y) * 0.11 + y * 0.03) % 1; if (sw < 0.12) { ctx.fillStyle = fen ? '#080c08' : '#050810'; ctx.fillRect(sx - 6, sy + 2 + Math.round(sw * 40), 12, 1); }
  // v0.35: foam and scum lapping at the shore: a few pale pixels along the tile's landward edges that creep and fade
  const z = G.zone, N = z.get(x, y - 1), Wt = z.get(x - 1, y), wet = q => q === T.WATER || q === T.SHALLOW;
  if (N != null && !wet(N) && !SOLID[N] || Wt != null && !wet(Wt) && !SOLID[Wt]) {
    const f = (t * 0.5 + hash(x * 3, y) * 4) % 1, s2 = Math.sin(f * Math.PI);
    if (s2 > 0.3) { ctx.fillStyle = s2 > 0.75 ? (fen ? '#6a7a48' : '#8aa0a8') : (fen ? '#48583a' : '#5a7480'); const side = !wet(N) && !SOLID[N] && N != null; const q = Math.round(f * 8); ctx.fillRect(side ? sx + 2 + q : sx - 10 + q, sy + 1 + (side ? q >> 1 : (8 - q) >> 1), 2, 1); }
  }
  // v0.35: the lanterns lie in the water: a broken column of warm light below each one, shivering with the ripples
  const L = z.lanterns; if (L) for (let i = 0; i < L.length; i++) {
    const l = L[i]; if (Math.abs(l.x - x) > 2.5 || Math.abs(l.y - y) > 2.5) continue;
    const q = iso(l.x, l.y), lsx = Math.round(q.sx), lsy = Math.round(q.sy) - 30; if (Math.abs(lsx - sx) > 13 || sy < lsy || sy > lsy + 90) continue;
    for (let j = 0; j < 12; j++) {
      const hw = j < 6 ? 2 * j + 1 : 2 * (11 - j) + 1, yy = sy + j, d = yy - lsy; if (d < 24 || d > 88) continue;
      const wob = Math.round(Math.sin(t * 2.2 + yy * 0.5) * 1.4), px = lsx + wob; if (px < sx - hw || px >= sx + hw) continue;
      const n = hash(yy, Math.floor(t * 3) + i * 7); if (n < 0.45 + (d - 24) / 130) continue;
      ctx.fillStyle = d < 44 && n > 0.9 ? '#d8a848' : d < 60 ? '#8a6a30' : '#4e4022'; ctx.fillRect(px, yy, 1, 1);
    }
  }
}

