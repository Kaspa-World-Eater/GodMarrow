
// =================================================================== v0.16 ART: the world, the grade, the HUD
// Floors are dithered and flagged, walls are laid in courses of stone lit from the upper left, the palisade is a row
// of sharpened stakes, the whole frame gets a cold-shadow / warm-light grade with grain and drifting haze, and the
// orbs become glass globes of liquid in iron cages.

// ------------------------------------------------------------------- floor tiles
function tileMask(x) { x.beginPath(); for (let r = 0; r < 8; r++) { const hw = r < 4 ? (r + 1) * 2 : (8 - r) * 2; x.rect(8 - hw, r, hw * 2, 1); } }
function inTile(i, r) { const hw = r < 4 ? (r + 1) * 2 : (8 - r) * 2; return r >= 0 && r < 8 && i >= 8 - hw && i < 8 + hw; }
function makeTile16(base, opt, seed) {
  const c = mkCanvas(TW, TH + 1), x = c.getContext('2d'), rng = mulberry32(seed * 7919 + 13);
  const B = hexRgb(base), put = (i, r, col) => { if (inTile(i, r)) { x.fillStyle = col; x.fillRect(i, r, 1, 1); } };
  const shade = (k, hue = 0) => rgbHex(B[0] * k + hue * 4, B[1] * k, B[2] * k + (k < 1 ? (1 - k) * 18 : 0));
  // base with a fine two-tone dither and larger mottling
  for (let r = 0; r < 8; r++) for (let i = 0; i < 16; i++) {
    if (!inTile(i, r)) continue;
    const n = hash(i + seed * 17, r + seed * 31), m = hash((i >> 2) + seed * 5, (r >> 1) + seed * 3);
    let k = 1 + (m - 0.5) * 0.18; if (n > 0.86) k += 0.12; else if (n < 0.12) k -= 0.12;
    if (((i + r) & 1) && m < 0.3) k -= 0.05;
    x.fillStyle = shade(k); x.fillRect(i, r, 1, 1);
  }
  if (opt.flags) {
    // flagstones: a seam along one diagonal and a lit lip on the stone above it
    const off = Math.floor(rng() * 6);
    for (let i = 0; i < 16; i++) { const r = Math.round((i + off) * 0.5) % 8; put(i, r, shade(0.62)); put(i, r - 1, shade(1.18)); }
    for (let r = 0; r < 8; r++) { const i = 12 - Math.round(r * 2 + off) % 16; put(i, r, shade(0.66)); put(i - 1, r, shade(1.12)); }
    if (rng() < 0.45) { let i = 3 + Math.floor(rng() * 9), r = 2 + Math.floor(rng() * 4); for (let s = 0; s < 4; s++) { put(i, r, shade(0.55)); i += rng() < 0.5 ? 1 : -1; r += rng() < 0.6 ? 1 : 0; } }
  }
  if (opt.cobble) for (let k = 0; k < 7; k++) { const i = 2 + Math.floor(rng() * 12), r = 1 + Math.floor(rng() * 6); put(i, r, shade(1.2)); put(i + 1, r, shade(1.1)); put(i, r + 1, shade(0.7)); put(i + 1, r + 1, shade(0.62)); }
  if (opt.grass) for (let k = 0; k < opt.grass; k++) { const i = 1 + Math.floor(rng() * 14), r = 1 + Math.floor(rng() * 6), g = rng() < 0.5 ? opt.gcol[0] : opt.gcol[1]; put(i, r, g); put(i, r - 1, opt.gcol[2]); if (rng() < 0.4) put(i + 1, r, g); }
  if (opt.dead && rng() < 0.6) { const i = 3 + Math.floor(rng() * 10), r = 2 + Math.floor(rng() * 4); put(i, r, '#5a3a22'); put(i + 1, r, '#7a5230'); }
  if (opt.bloom && rng() < 0.3) { const i = 3 + Math.floor(rng() * 10), r = 2 + Math.floor(rng() * 4); put(i, r, '#b8b0c8'); }
  if (opt.bones && rng() < 0.3) {
    const i = 3 + Math.floor(rng() * 9), r = 2 + Math.floor(rng() * 4);
    if (rng() < 0.35) { put(i, r, '#cfc6ae'); put(i + 1, r, '#cfc6ae'); put(i, r + 1, '#8f8a7c'); put(i + 1, r + 1, '#1a181e'); put(i + 2, r, '#8f8a7c'); }
    else { put(i, r, '#8a8474'); put(i + 1, r, '#a8a08a'); put(i + 2, r, '#8a8474'); put(i - 1, r + 1, '#5a564c'); }
  }
  if (opt.blood && rng() < opt.blood) { const i = 4 + Math.floor(rng() * 8), r = 2 + Math.floor(rng() * 4); for (let k = 0; k < 6; k++) put(i + Math.floor(rng() * 4) - 1, r + Math.floor(rng() * 3) - 1, rng() < 0.5 ? '#4a1216' : '#3a0e12'); }
  if (opt.moss) for (let k = 0; k < opt.moss; k++) put(2 + Math.floor(rng() * 12), 1 + Math.floor(rng() * 6), rng() < 0.5 ? '#2e3a24' : '#3a4a2c');
  if (opt.wet) { for (let k = 0; k < 3; k++) { const i = 2 + Math.floor(rng() * 10), r = 2 + Math.floor(rng() * 5); put(i, r, shade(1.35)); put(i + 1, r, shade(1.2)); put(i + 2, r, shade(1.1)); } }
  c._autoHR = 'tile';
  return c;
}
{
  const G3 = ['#3a4630', '#2e3828', '#4e5c38'], F3 = ['#34442c', '#2a3624', '#46583a'];
  TILES.grass = [0, 1, 2, 3, 4, 5].map(s => makeTile16(['#2a2c26', '#292b25', '#2c2f27', '#272823', '#2d2e28', '#292b24'][s], { grass: 6 + s, gcol: G3, dead: 1, bloom: s === 3 }, s + 1));
  TILES.road = [0, 1, 2].map(s => makeTile16('#3a332b', { cobble: 1 }, s + 20));
  TILES.dirt = [0, 1].map(s => makeTile16('#33302a', { grass: 1, gcol: G3, dead: 1 }, s + 30));
  TILES.water = [0, 1].map(s => makeTile16('#121a25', { wet: 1 }, s + 40));
  TILES.floor = [0, 1, 2, 3].map(s => makeTile16(['#27242c', '#25222b', '#28262c', '#232028'][s], { flags: 1, moss: s === 2 ? 3 : 0, bones: s === 1, blood: s === 3 ? 0.4 : 0 }, s + 50));
  TILES.arena = [0, 1].map(s => makeTile16('#2b2322', { flags: 1, blood: 0.9, bones: 1 }, s + 60));
  TILES.fen = [0, 1, 2, 3].map(s => makeTile16(['#232a22', '#222821', '#252c23', '#20261f'][s], { grass: 5 + s, gcol: F3, moss: 3, wet: s % 2 }, s + 70));
  TILES.bog = [0, 1].map(s => makeTile16('#15201b', { wet: 1, moss: 2 }, s + 80));
  TILES.bone = [0, 1, 2, 3].map(s => makeTile16(['#2f2c28', '#2d2a26', '#312e29', '#2b2824'][s], { flags: 1, bones: 1, blood: s === 2 ? 0.5 : 0 }, s + 90));
  TILES.barrow = [0, 1, 2].map(s => makeTile16(['#2c2620', '#2a241e', '#2e2821'][s], { flags: 1, bones: s === 0, moss: 2 }, s + 100));
}

// ------------------------------------------------------------------- walls, cliffs, pillars, palisades, rocks
const WALL16 = {};
// kinds: wall (courses of cut stone), cliff (strata of raw rock), pillar (carved column), stakes (palisade), rock (boulder)
function wallImg(kind, theme, v, h) {
  const key = kind + theme + v + '|' + h; if (WALL16[key]) return WALL16[key];
  const c = mkCanvas(16, h + 9), x = c.getContext('2d'), rng = mulberry32(v * 131 + h * 7 + kind.length * 17 + theme.length);
  const pal = kind === 'cliff' ? ['#3c3834', '#2a2723', '#1e1c19', '#4e4a44'] : kind === 'pillar' ? ['#34303c', '#221f28', '#18161d', '#4a4556'] : kind === 'rock' ? ['#4a4640', '#34312c', '#2a2723', '#5e5a52'] :
    theme === 'bone' ? ['#3e3a33', '#2c2924', '#221f1b', '#56514a'] : theme === 'barrow' ? ['#342c24', '#241e18', '#1a1612', '#4a4034'] : ['#2e2a36', '#1f1c26', '#17151c', '#443f4e'];
  const [top, left, right, lite] = pal.map(hexRgb);
  const col = (C, k) => rgbHex(C[0] * k, C[1] * k, C[2] * k + (k < 1 ? (1 - k) * 10 : 0));
  // faces are filled pixel by pixel so every stone gets its own mortar line, noise and edge light
  for (let i = 0; i < 16; i++) {
    const leftFace = i < 8, ytop = leftFace ? 4 + i * 0.5 : 4 + (15 - i) * 0.5, C = leftFace ? left : right;
    for (let yy = 0; yy < h + 4; yy++) {
      const py = Math.floor(ytop + yy); if (py < 0 || py > h + 8) continue;
      const u = leftFace ? i : 15 - i, v2 = yy + (leftFace ? 0 : 0);
      let k = 1 + (hash(i * 3 + v * 11, py * 5 + v) - 0.5) * 0.16;
      if (kind === 'wall' || kind === 'pillar') {
        const course = Math.floor(v2 / 4), joint = (u + course * 3 + v) % 6;
        if (v2 % 4 === 0) k *= 0.62; else if (joint === 0 && kind === 'wall') k *= 0.66; else if (v2 % 4 === 1) k *= 1.12;
        if (kind === 'pillar' && (v2 % 8 === 0)) k *= 1.2;
      } else if (kind === 'cliff') { const band = Math.floor((v2 + Math.sin(u * 0.9 + v) * 1.4) / 3); if ((v2 + Math.floor(Math.sin(u * 0.9 + v) * 1.4)) % 3 === 0) k *= 0.72; if (band % 2) k *= 1.06; }
      else if (kind === 'rock') { k *= 1 - v2 * 0.03; }
      if (leftFace && u === 7) k *= 0.85;             // the corner between the faces
      if (yy >= h + 2) k *= 0.55;                      // footing, in shadow
      x.fillStyle = col(C, k); x.fillRect(i, py, 1, 1);
    }
  }
  // the cap: a diamond with a bright leading edge
  for (let r = 0; r < 8; r++) { const hw = r < 4 ? (r + 1) * 2 : (8 - r) * 2; for (let i = 8 - hw; i < 8 + hw; i++) { let k = 1 + (hash(i + v * 7, r + v * 3) - 0.5) * 0.14; if (r < 4 && i < 8 && i === 8 - hw) k = 1.3; if (r === 0 || (r < 4 && i >= 8 && i === 8 + hw - 1)) k *= 1.15; x.fillStyle = col(r < 5 ? lite : top, k * (r < 5 ? 0.85 : 1)); x.fillRect(i, r, 1, 1); } }
  // details: moss dripping over the edge, a skull set in the stone, an iron ring, a crack
  if ((theme === 'fen' || theme === 'wild' || theme === 'barrow') && rng() < 0.6) for (let k = 0; k < 6; k++) { const i = Math.floor(rng() * 16), yy = 4 + Math.floor(rng() * 3) + (i < 8 ? i * 0.5 : (15 - i) * 0.5); x.fillStyle = rng() < 0.5 ? '#2e3a24' : '#3e4e2e'; x.fillRect(i, Math.round(yy), 1, 1 + Math.floor(rng() * 3)); }
  if (kind === 'wall' && theme === 'bone' && rng() < 0.4) { const i = 2 + Math.floor(rng() * 3), yy = 8 + Math.floor(rng() * Math.max(1, h - 8)); x.fillStyle = '#0e0d12'; x.fillRect(i, yy, 4, 4); x.fillStyle = '#cfc6ae'; x.fillRect(i + 1, yy, 3, 3); x.fillStyle = '#0e0d12'; x.fillRect(i + 1, yy + 1, 1, 1); x.fillRect(i + 3, yy + 1, 1, 1); x.fillStyle = '#8f8a7c'; x.fillRect(i + 1, yy + 3, 3, 1); }
  else if (kind === 'wall' && rng() < 0.07) { const i = 10 + Math.floor(rng() * 3), yy = 8 + Math.floor(rng() * Math.max(1, h - 8)); x.strokeStyle = '#5a5e68'; x.beginPath(); x.arc(i + 0.5, yy + 2.5, 1.5, 0, 6.28); x.stroke(); x.fillStyle = '#8a909c'; x.fillRect(i, yy, 1, 1); }
  if (kind !== 'rock' && rng() < 0.35) { let i = 1 + Math.floor(rng() * 6), yy = 6 + Math.floor(rng() * 4); x.fillStyle = '#0e0d12'; for (let s = 0; s < 5; s++) { x.fillRect(i, yy, 1, 1); i += rng() < 0.5 ? 1 : 0; yy += 1; } }
  c._autoHR = 'spr'; WALL16[key] = c; return c;
}
function stakesImg(v) {
  const key = 'stk' + v; if (WALL16[key]) return WALL16[key];
  const c = mkCanvas(16, 24), x = c.getContext('2d'), rng = mulberry32(v * 97 + 5);
  const W0 = '#2a1e14', W1 = '#4a3622', W2 = '#6e5234', W3 = '#94724a';
  // a row of sharpened logs along the tile's diagonal, rope-bound, one sometimes crowned with a skull
  for (let s = 0; s < 4; s++) {
    const bx = 1 + s * 4, by = 12 + s * 2 - (s > 1 ? (s - 1) * 4 : 0), hgt = 12 + Math.floor(rng() * 4), top = by - hgt + 10;
    x.fillStyle = W0; x.fillRect(bx - 1, top, 4, by + 10 - top);
    x.fillStyle = W1; x.fillRect(bx, top + 1, 2, by + 9 - top); x.fillStyle = W2; x.fillRect(bx, top + 1, 1, by + 9 - top);
    x.fillStyle = W0; x.fillRect(bx, top - 2, 2, 2); x.fillStyle = W3; x.fillRect(bx, top - 2, 1, 2); x.fillStyle = W0; x.fillRect(bx, top - 3, 1, 1);
    for (let yy = top + 3; yy < by + 8; yy += 3) { x.fillStyle = W0; x.fillRect(bx + 1, yy, 1, 1); }
    x.fillStyle = '#6a5a3a'; x.fillRect(bx - 1, by + 2, 4, 1); x.fillStyle = '#8a7a52'; x.fillRect(bx, by + 2, 2, 1);
    if (s === 1 && rng() < 0.3) { x.fillStyle = '#0e0d12'; x.fillRect(bx - 1, top - 6, 4, 4); x.fillStyle = '#d8d0b8'; x.fillRect(bx - 1, top - 6, 3, 3); x.fillStyle = '#0e0d12'; x.fillRect(bx, top - 5, 1, 1); x.fillRect(bx + 2, top - 5, 1, 1); x.fillStyle = '#6e1418'; x.fillRect(bx, top - 3, 2, 3); }
  }
  c._autoHR = 'spr'; WALL16[key] = c; return c;
}
function drawWall16(x, y, t, z, sh) {
  if (typeof ztDrawWall === 'function') return ztDrawWall(x, y, t, z);   // v0.23: 32-bit walls at the 24x12 grid (zt_env32.js)
  const a = iso(x, y), sx = Math.round(a.sx), sy = Math.round(a.sy), v = (hash(x * 5, y * 9) * 4) | 0, th = z.theme || 'wild';
  if (t === T.PALISADE) { const s = stakesImg(v); ctx.drawImage(s, sx - 8, sy - 14); return; }
  const kind = t === T.CLIFF ? 'cliff' : t === T.PILLAR ? 'pillar' : t === T.ROCK ? 'rock' : 'wall', h = t === T.PILLAR ? 24 : t === T.ROCK ? 5 : t === T.RUIN ? 5 + ((hash(x * 3, y * 5) * 4) | 0) * 2 : 16;
  const img = wallImg(kind, th, v, h);
  ctx.drawImage(img, sx - 8, sy - h);
}

// ------------------------------------------------------------------- the grade: cold shadows, warm lights, grain, haze
const GRAIN16 = (() => { const c = mkCanvas(96, 96), x = c.getContext('2d'), img = x.createImageData(96, 96); for (let i = 0; i < img.data.length; i += 4) { const n = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = n; img.data[i + 3] = 255; } x.putImageData(img, 0, 0); return c; })();
function postGrade(z) {
  // cool the whole frame, then pull the bottom corners toward warm umber like old candle-lit oils
  ctx.globalCompositeOperation = 'soft-light';
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(70,90,150,0.28)'); g.addColorStop(0.6, 'rgba(120,110,140,0.12)'); g.addColorStop(1, 'rgba(170,100,60,0.24)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // haze drifting across the ground
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 5; i++) { const t = G.time * (0.012 + i * 0.004) + i * 0.37, hx = ((t % 1) * (W + 300)) - 150, hy = 60 + ((i * 53) % 150); const hg = ctx.createRadialGradient(hx, hy, 4, hx, hy, 110); hg.addColorStop(0, `rgba(120,120,150,${z && z.dark > 0.3 ? 0.035 : 0.06})`); hg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = hg; ctx.fillRect(hx - 110, hy - 110, 220, 220); }
  // film grain
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.07;
  const ox = Math.floor(Math.random() * 96), oy = Math.floor(Math.random() * 96);
  for (let yy = -oy; yy < H; yy += 96) for (let xx = -ox; xx < W; xx += 96) ctx.drawImage(GRAIN16, xx, yy);
  ctx.globalAlpha = 1;
  // only the very corners darken, a frame rather than a spotlight
  ctx.globalCompositeOperation = 'multiply';
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.62, W / 2, H / 2, W * 0.66); vg.addColorStop(0, 'rgba(255,255,255,1)'); vg.addColorStop(1, 'rgba(170,160,180,1)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
}

// ------------------------------------------------------------------- the HUD: carved stone, iron, glass
const HUDBG16 = (() => {
  const c = mkCanvas(480, 34), x = c.getContext('2d');
  for (let yy = 0; yy < 34; yy++) for (let i = 0; i < 480; i++) {
    const n = hash(i, yy * 3), m = hash(i >> 3, yy >> 2), k = 0.9 + (m - 0.5) * 0.2 + (n > 0.9 ? 0.12 : n < 0.08 ? -0.12 : 0);
    const course = (yy + 2) % 11 === 0 || (i + ((yy + 2) / 11 | 0) * 17) % 34 === 0 ? 0.6 : 1;
    x.fillStyle = rgbHex(22 * k * course, 20 * k * course, 27 * k * course + 2); x.fillRect(i, yy, 1, 1);
  }
  // top moulding: bevel, a row of iron studs
  x.fillStyle = '#0a090d'; x.fillRect(0, 4, 480, 1); x.fillStyle = '#4a4454'; x.fillRect(0, 5, 480, 1); x.fillStyle = '#2c2834'; x.fillRect(0, 6, 480, 1);
  for (let i = 12; i < 480; i += 24) { x.fillStyle = '#0a090d'; x.fillRect(i - 1, 7, 3, 3); x.fillStyle = '#6a6e7a'; x.fillRect(i - 1, 7, 2, 2); x.fillStyle = '#a4a8b4'; x.fillRect(i - 1, 7, 1, 1); }
  // a crenellated crest along the top: small gothic spikes
  for (let i = 0; i < 480; i += 8) { x.fillStyle = '#0a090d'; x.fillRect(i + 3, 1, 2, 3); x.fillStyle = '#3a3644'; x.fillRect(i + 3, 2, 1, 2); x.fillStyle = '#0a090d'; x.fillRect(i + 3, 0, 1, 1); }
  return c;
})();
function hudPanel16() { ctx.drawImage(HUDBG16, 0, HUD_Y - 4); }
function drawOrb16(cx, cy, r, v, max, col, dim) {
  const k = clamp(v / max, 0, 1), C = hexRgb(col), D2 = hexRgb(dim), t = G.time;
  // the cage: an iron ring with four claws holding the glass
  ctx.fillStyle = '#060508'; ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a3642'; ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5a5664'; ctx.beginPath(); ctx.arc(cx - 0.5, cy - 0.5, r + 2.4, Math.PI * 1.0, Math.PI * 1.6); ctx.lineTo(cx, cy); ctx.fill();
  ctx.fillStyle = '#0c0b10'; ctx.beginPath(); ctx.arc(cx, cy, r + 1, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2, ax = cx + Math.cos(a) * (r + 3), ay = cy + Math.sin(a) * (r + 3); ctx.fillStyle = '#0a090d'; ctx.fillRect(Math.round(ax) - 2, Math.round(ay) - 2, 4, 4); ctx.fillStyle = '#6a6674'; ctx.fillRect(Math.round(ax) - 1, Math.round(ay) - 2, 2, 2); ctx.fillStyle = '#a4a0b0'; ctx.fillRect(Math.round(ax) - 1, Math.round(ay) - 2, 1, 1); }
  // inside the glass
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  const bg = ctx.createRadialGradient(cx, cy, 2, cx, cy, r); bg.addColorStop(0, '#16141c'); bg.addColorStop(1, '#08070b'); ctx.fillStyle = bg; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  const lvl = cy + r - 2 * r * k;
  if (k > 0) {
    // the liquid, darker in the depths, with a moving surface and a bright meniscus
    const lg = ctx.createLinearGradient(0, lvl, 0, cy + r); lg.addColorStop(0, rgbHex(C[0] * 1.25, C[1] * 1.25, C[2] * 1.25)); lg.addColorStop(1, rgbHex(C[0] * 0.45, C[1] * 0.4, C[2] * 0.5));
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(cx - r, cy + r);
    for (let i = 0; i <= 2 * r; i += 2) ctx.lineTo(cx - r + i, lvl + Math.sin(t * 2.4 + i * 0.35) * 0.9 + Math.sin(t * 1.3 + i * 0.13) * 0.6);
    ctx.lineTo(cx + r, cy + r); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgbHex(D2[0] * 1.2, D2[1] * 1.2, D2[2] * 1.2);
    for (let i = 0; i <= 2 * r; i += 1) ctx.fillRect(cx - r + i, Math.round(lvl + Math.sin(t * 2.4 + i * 0.35) * 0.9 + Math.sin(t * 1.3 + i * 0.13) * 0.6), 1, 1);
    // bubbles rising
    for (let i = 0; i < 4; i++) { const ph = (t * (0.3 + i * 0.07) + i * 0.29) % 1, by = cy + r - ph * (cy + r - lvl), bx = cx - r * 0.5 + ((i * 7) % 11) * r * 0.1 + Math.sin(t * 3 + i) * 1.2; if (by > lvl + 1) { ctx.fillStyle = `rgba(255,255,255,${0.25 * (1 - ph)})`; ctx.fillRect(Math.round(bx), Math.round(by), 1, 1); } }
  }
  // the glass: a curved highlight and a darker rim
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r - 3, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke(); ctx.lineWidth = 1;
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(Math.round(cx - r * 0.45), Math.round(cy - r * 0.6), 2, 2);
  const rg = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,0.55)'); ctx.fillStyle = rg; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  ctx.restore();
}
