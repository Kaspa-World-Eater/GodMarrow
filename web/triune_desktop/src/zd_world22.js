
// =================================================================== v0.22: the land itself
// Shallows at the water's edge (wade through them to douse a Pyre-Saint; they slow you), mud in the fen, and the
// ruins of the Triune's cathedrals scattered everywhere: colonnades that break line of sight and funnel the big
// creatures, chapel shells with doorways for chokepoints, toppled three-faced statues for cover, old flagstone
// that the Vein-Borers cannot dig through. And rarely, a god's altar, where a Herald waits.
T.RUIN = 15; SOLID[T.RUIN] = 1; TALL[T.RUIN] = 1;
// --- floor tiles painted at 2x
function inTile2(i, r) { const hw = r < 8 ? (r + 1) * 2 : (16 - r) * 2; return r >= 0 && r < 16 && i >= 16 - hw && i < 16 + hw; }
function makeTileHR(base, paint, seed) {
  const c2 = mkCanvas(32, 18), x = c2.getContext('2d'), rng = mulberry32(seed * 7919 + 71), B = hexRgb(base);
  const put = (i, r, col) => { if (inTile2(i, r)) { x.fillStyle = col; x.fillRect(i, r, 1, 1); } };
  const shade = (k, cold = 0) => rgbHex(B[0] * k, B[1] * k, B[2] * k + cold);
  for (let r = 0; r < 16; r++) for (let i = 0; i < 32; i++) { if (!inTile2(i, r)) continue; const n = hash(i + seed * 17, r + seed * 31), m = hash((i >> 3) + seed * 5, (r >> 2) + seed * 3); let k = 1 + (m - 0.5) * 0.16 + (n > 0.9 ? 0.08 : n < 0.08 ? -0.08 : 0); put(i, r, shade(k)); }
  paint({ put, shade, rng, x });
  const c = mkCanvas(16, 9), cx = c.getContext('2d'); cx.imageSmoothingEnabled = false; cx.drawImage(c2, 0, 0, 16, 9); c._hr = c2; return c;
}
TILES.shallow = [0, 1, 2].map(s => makeTileHR('#1f3038', ({ put, shade, rng }) => {
  // sand and pebbles under a skin of water, the surface catching the light in bands
  for (let k = 0; k < 16; k++) { const i = Math.floor(rng() * 30) + 1, r = Math.floor(rng() * 14) + 1; put(i, r, rng() < 0.5 ? '#3a4a48' : '#2a3a3c'); }
  for (let k = 0; k < 4; k++) { const i = 4 + Math.floor(rng() * 22), r = 3 + Math.floor(rng() * 10); put(i, r, '#6a7a70'); put(i + 1, r, '#4e5c56'); }
  for (let b = 0; b < 3; b++) { const r = 3 + b * 4 + Math.floor(rng() * 2), i0 = 6 + Math.floor(rng() * 10); for (let i = i0; i < i0 + 6 + Math.floor(rng() * 6); i++) put(i, r, shade(1.45, 12)); }
}, s + 300));
TILES.shallowFen = [0, 1, 2].map(s => makeTileHR('#1c2a22', ({ put, shade, rng }) => {
  for (let k = 0; k < 18; k++) { const i = Math.floor(rng() * 30) + 1, r = Math.floor(rng() * 14) + 1; put(i, r, rng() < 0.5 ? '#2e3e2c' : '#243424'); }
  for (let k = 0; k < 3; k++) { const i = 4 + Math.floor(rng() * 22), r = 3 + Math.floor(rng() * 10); put(i, r, '#4a6a3a'); put(i + 1, r, '#3a5a2e'); put(i, r - 1, '#5a7a44'); }
  for (let b = 0; b < 3; b++) { const r = 3 + b * 4 + Math.floor(rng() * 2), i0 = 6 + Math.floor(rng() * 10); for (let i = i0; i < i0 + 5 + Math.floor(rng() * 6); i++) put(i, r, shade(1.4, 8)); }
}, s + 310));
TILES.mud = [0, 1, 2].map(s => makeTileHR('#2a2018', ({ put, shade, rng }) => {
  // churned mud: wet gloss on the ridges, dark puddles, a footprint or a drag mark
  for (let k = 0; k < 7; k++) { const i = 3 + Math.floor(rng() * 24), r = 2 + Math.floor(rng() * 11); for (let j = 0; j < 4; j++) put(i + j, r, shade(0.62)); put(i + 1, r - 1, shade(1.5, 6)); put(i + 2, r - 1, shade(1.3, 6)); }
  for (let k = 0; k < 2; k++) { const i = 6 + Math.floor(rng() * 16), r = 4 + Math.floor(rng() * 7); for (let a = -2; a <= 2; a++) for (let b = -1; b <= 1; b++) if (Math.abs(a) + Math.abs(b) < 3) put(i + a, r + b, '#161210'); put(i - 1, r - 1, '#5a5048'); }
  if (rng() < 0.5) { const i = 8 + Math.floor(rng() * 12), r = 5 + Math.floor(rng() * 5); put(i, r, '#120e0c'); put(i + 1, r, '#120e0c'); put(i + 3, r + 1, '#120e0c'); put(i + 4, r + 1, '#120e0c'); }
}, s + 320));
TILES.flags = [0, 1, 2, 3].map(s => makeTileHR(['#4a4640', '#46423c', '#4c4842', '#44403a'][s], ({ put, shade, rng }) => {
  // big worn flagstones of the old pilgrim roads: pale, cracked, moss in the joints
  const off = Math.floor(rng() * 12);
  for (let i = 0; i < 32; i++) { const r = Math.round((i + off) * 0.5) % 16; put(i, r, shade(0.58)); put(i, r - 1, shade(1.16)); }
  for (let r = 0; r < 16; r++) { const i = (24 - Math.round(r * 2 + off)) & 31; put(i, r, shade(0.6)); put(i - 1, r, shade(1.12)); if (rng() < 0.3) put(i + 1, r, '#3e5230'); }
  for (let k = 0; k < 10; k++) put(2 + Math.floor(rng() * 28), 1 + Math.floor(rng() * 14), rng() < 0.5 ? '#3a4a2c' : '#4a5a36');
  if (rng() < 0.5) { let i = 6 + Math.floor(rng() * 16), r = 3 + Math.floor(rng() * 8); for (let t = 0; t < 7; t++) { put(i, r, shade(0.5)); i += rng() < 0.5 ? 1 : -1; r += rng() < 0.6 ? 1 : 0; } }
  if (s === 2) for (let k = 0; k < 3; k++) { const i = 10 + k * 4, r = 7 + (k % 2); put(i, r, '#b8ae94'); put(i + 1, r, '#8a8270'); }
}, s + 330));
{
  const _ft = floorTileFor;
  floorTileFor = function (z, x, y, t) {
    if (typeof ztTileFor === 'function') return ztTileFor(z, x, y);   // v0.23: 24x12 tiles from the world painter
    const hv = hash(x, y);
    if (t === T.SHALLOW) return (z.theme === 'fen' ? TILES.shallowFen : TILES.shallow)[Math.floor(hv * 3)];
    if (t === T.MUD) return TILES.mud[Math.floor(hv * 3)];
    if (t === T.FLAGS) return TILES.flags[Math.floor(hv * 4)];
    if (t === T.RUIN) return TILES.flags[Math.floor(hv * 4)];
    return _ft(z, x, y, t);
  };
}
// shallows catch the light like the deep water, only paler
function drawShallowGlints(x, y, a) {
  const t = G.time, sx = Math.round(a.sx), sy = Math.round(a.sy), k = (t * 0.5 + hash(x, y) * 3) % 1, v = Math.sin(k * Math.PI);
  if (v < 0.35) return;
  ctx.fillStyle = v > 0.8 ? '#8aa4a8' : '#5a767e'; ctx.fillRect(sx - 6 + Math.round(k * 8), sy + 5 + ((hash(y, x) * 3) | 0), v > 0.8 ? 4 : 3, 1);
}

// --- dressing a freshly made zone
function dressZone(z, seed) {
  const rng = mulberry32((seed || 1) * 131 + z.id.length * 977);
  const outdoor = z.theme === 'moor' || z.theme === 'fen';
  if (outdoor) {
    // shallows: water that touches land, and a second band in the fen
    const band = (p, from) => { const out = []; for (let y = 1; y < z.h - 1; y++) for (let x = 1; x < z.w - 1; x++) { if (z.get(x, y) !== T.WATER) continue; let ok = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = z.get(x + dx, y + dy); if (from(n)) ok = true; } if (ok && rng() < p) out.push([x, y]); } for (const [x, y] of out) z.set(x, y, T.SHALLOW); };
    band(z.theme === 'fen' ? 0.85 : 0.7, n => SOLID[n] === 0 && n !== T.SHALLOW);
    if (z.theme === 'fen') band(0.45, n => n === T.SHALLOW);
    if (z.theme === 'fen') { const nz = makeNoise(rng); for (let y = 2; y < z.h - 2; y++) for (let x = 2; x < z.w - 2; x++) if (z.get(x, y) === T.GRASS && nz(x / 4.5, y / 4.5) > 0.66) z.set(x, y, T.MUD); }
    const n = z.theme === 'moor' ? 8 : 5; let placed = 0, tries = 0;
    while (placed < n && tries++ < 500) if (placeRuin(z, rng)) placed++;
    // v0.22d: breathing room. Trees gather into groves with open heath between them; the gaps become grass or
    // bare earth. Fewer chests and shrines, so each one is a find.
    const ng = makeNoise(rng), nd = makeNoise(rng);
    for (let y = 3; y < z.h - 3; y++) for (let x = 3; x < z.w - 3; x++) {
      if (z.get(x, y) !== T.TREE) continue;
      const g = ng(x / 12, y / 12), keep = g > 0.64 ? rng() < 0.75 : g > 0.52 ? rng() < 0.32 : rng() < 0.07;
      if (!keep) z.set(x, y, nd(x / 7, y / 7) > 0.63 ? T.DIRT : T.GRASS);
    }
  }
  { const thin = (type, keepK, keepMin, spare) => { const all = z.objects.filter(o => o.type === type && !(spare && spare(o))); for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; } const drop = new Set(all.slice(Math.max(keepMin, Math.round(all.length * keepK)))); z.objects = z.objects.filter(o => !drop.has(o)); };
    thin('chest', outdoor ? 0.3 : 0.5, outdoor ? 5 : 1); thin('shrine', 0.55, 3); }
  placeAltar(z, rng, outdoor);
}
// the objects that must stay reachable after ruins go up
function reachableAll(z) {
  const seen = floodFrom(z, Math.floor(z.start.x), Math.floor(z.start.y));
  const ok = (x, y) => { const X = Math.floor(x), Y = Math.floor(y); for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (seen[(Y + j) * z.w + X + i]) return true; return false; };
  return z.objects.every(o => ok(o.x, o.y)) && z.monsters.every(m => m.rank !== 'boss' || ok(m.x, m.y));
}
function placeRuin(z, rng) {
  const kinds = ['chapel', 'colonnade', 'colonnade', 'statue', 'arch', 'chapel'];
  const kind = kinds[Math.floor(rng() * kinds.length)], S = kind === 'chapel' ? 10 : kind === 'colonnade' ? 11 : 6;
  const x0 = 6 + Math.floor(rng() * (z.w - S - 12)), y0 = 6 + Math.floor(rng() * (z.h - S - 12));
  if (Math.hypot(x0 - z.start.x, y0 - z.start.y) < 20) return false;
  let trees = 0; for (let y = y0 - 1; y <= y0 + S; y++) for (let x = x0 - 1; x <= x0 + S; x++) { const t = z.get(x, y); if (t === T.TREE) trees++; else if (t !== T.GRASS && t !== T.DIRT && t !== T.MUD) return false; }
  if (trees > S * S * 0.5) return false;
  if (z.objects.some(o => o.x > x0 - 2 && o.x < x0 + S + 2 && o.y > y0 - 2 && o.y < y0 + S + 2)) return false;
  const saved = []; const set = (x, y, t) => { saved.push([x, y, z.get(x, y)]); z.set(x, y, t); };
  // the dead trees give way to the old stones
  for (let y = y0 - 1; y <= y0 + S; y++) for (let x = x0 - 1; x <= x0 + S; x++) if (z.get(x, y) === T.TREE) set(x, y, T.GRASS);
  const ruin = { kind, x: x0, y: y0, S };
  if (kind === 'chapel') {
    // a roofless chapel: flagstone floor, broken walls, a doorway on two sides, a pillar or two
    const w = 7 + Math.floor(rng() * 3), h = 7 + Math.floor(rng() * 3), doors = [Math.floor(rng() * 4), (Math.floor(rng() * 4) + 2) % 4];
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const edge = x === x0 || y === y0 || x === x0 + w - 1 || y === y0 + h - 1; if (!edge) { set(x, y, T.FLAGS); continue; }
      const side = y === y0 ? 0 : x === x0 + w - 1 ? 1 : y === y0 + h - 1 ? 2 : 3, mid = side % 2 ? y - y0 - Math.floor(h / 2) : x - x0 - Math.floor(w / 2);
      if (doors.includes(side) && (mid === 0 || mid === -1)) { set(x, y, T.FLAGS); continue; }
      set(x, y, rng() < 0.28 ? (rng() < 0.5 ? T.FLAGS : T.ROCK) : T.RUIN);
    }
    set(x0 + 2, y0 + 2, T.PILLAR); if (rng() < 0.6) set(x0 + w - 3, y0 + h - 3, T.PILLAR);
    ruin.cx = x0 + w / 2; ruin.cy = y0 + h / 2;
  } else if (kind === 'colonnade') {
    // two rows of columns along a flagstone road; some fallen
    const L = 8 + Math.floor(rng() * 3), vert = rng() < 0.5;
    for (let k = 0; k < L; k++) for (let j = 0; j < 4; j++) { const x = vert ? x0 + j : x0 + k, y = vert ? y0 + k : y0 + j; set(x, y, T.FLAGS); }
    for (let k = 0; k < L; k += 2) for (const j of [0, 3]) { const x = vert ? x0 + j : x0 + k, y = vert ? y0 + k : y0 + j; set(x, y, rng() < 0.2 ? T.ROCK : rng() < 0.12 ? T.FLAGS : T.PILLAR); }
    ruin.cx = x0 + (vert ? 1.5 : L / 2); ruin.cy = y0 + (vert ? L / 2 : 1.5);
  } else if (kind === 'statue') {
    // a toppled three-faced statue of the Triune, broken in pieces on a flagstone plinth
    for (let y = y0 + 1; y < y0 + 5; y++) for (let x = x0 + 1; x < x0 + 5; x++) set(x, y, T.FLAGS);
    set(x0 + 2, y0 + 2, T.ROCK); set(x0 + 3, y0 + 2, T.ROCK); if (rng() < 0.6) set(x0 + 3, y0 + 3, T.ROCK);
    ruin.cx = x0 + 3; ruin.cy = y0 + 3; z.objects.push({ type: 'statue', x: x0 + 2.5, y: y0 + 4.2, deco: true, v: Math.floor(rng() * 3) });
  } else {
    // an arch standing alone with its wall stubs: a doorway to nowhere, a perfect chokepoint
    const vert = rng() < 0.5;
    for (let k = 0; k < 6; k++) { const x = vert ? x0 + 2 : x0 + k, y = vert ? y0 + k : y0 + 2; if (k === 2 || k === 3) set(x, y, T.FLAGS); else set(x, y, k === 1 || k === 4 ? T.PILLAR : T.RUIN); }
    ruin.cx = x0 + 2.5; ruin.cy = y0 + 2.5;
  }
  if (!reachableAll(z)) { for (let i = saved.length - 1; i >= 0; i--) z.set(saved[i][0], saved[i][1], saved[i][2]); z.objects = z.objects.filter(o => !(o.type === 'statue' && o.x > x0 - 1 && o.x < x0 + S + 1 && o.y > y0 - 1 && o.y < y0 + S + 1)); return false; }
  // shove out anything the stone now stands on
  for (const m of z.monsters) if (z.solidAt(m.x, m.y)) { const p = openSpot(z, m.x, m.y); if (p) { m.x = p.x; m.y = p.y; m.hx = m.x; m.hy = m.y; } }
  (z.ruins || (z.ruins = [])).push(ruin);
  return true;
}

// ------------------------------------------------------------------- god altars and their Heralds
// An altar rarely stands in a zone. Touch it and the god's Herald wakes. Only a Herald grants a Major Arcanum.
const GODS22 = {
  bone: { name: 'Old Upright', herald: 'The Marrow Pontiff', rgb: '232,226,208', col: '#e8e2d0', mon: 'hbone' },
  flesh: { name: 'the Red Mother', herald: 'The Wet Nurse', rgb: '220,70,80', col: '#c24050', mon: 'hflesh' },
  breath: { name: 'the Last Breath', herald: 'The Long Exhale', rgb: '180,225,255', col: '#bfe8ff', mon: 'hbreath' },
  hollow: { name: 'the Hush', herald: 'A Silent One', rgb: '150,110,200', col: '#9a7ad0', mon: 'hhollow' }
};
const ACT_MAJORS = 4, ACT_MINORS = 16;
function actOf() { return 1; }
function placeAltar(z, rng, outdoor) {
  if (!P.arc) return;
  const got = P.arc.majAct || 0; if (got >= ACT_MAJORS) return;
  if (rng() > (outdoor ? 0.4 : 0.25)) return;
  const left = Object.keys(GODS22).filter(g => !P.done.includes('herald:' + g)); if (!left.length) return;
  const god = left[Math.floor(rng() * left.length)];
  // prefer the heart of a ruined chapel; otherwise a quiet open spot far from the start
  let spot = null;
  const ch = (z.ruins || []).find(r => r.kind === 'chapel');
  if (ch && !z.solidAt(ch.cx, ch.cy)) spot = { x: ch.cx, y: ch.cy };
  for (let i = 0; i < 300 && !spot; i++) {
    const x = 4 + Math.floor(rng() * (z.w - 8)), y = 4 + Math.floor(rng() * (z.h - 8));
    if (Math.hypot(x - z.start.x, y - z.start.y) < 25) continue;
    let open = true; for (let j = -2; j <= 2 && open; j++) for (let k = -2; k <= 2; k++) if (z.solidAt(x + k + 0.5, y + j + 0.5)) { open = false; break; }
    if (open && !z.objects.some(o => Math.hypot(o.x - x, o.y - y) < 5)) spot = { x: x + 0.5, y: y + 0.5 };
  }
  if (!spot) return;
  z.objects.push({ type: 'altar', god, x: spot.x, y: spot.y, used: false });
}
function altarInteract(o) {
  if (o.used || o.woke) { if (o.used) say('The altar is cold', 1.2); return; }
  const g = GODS22[o.god]; o.woke = true;
  banner(g.herald.toUpperCase(), g.col, 3); say(`The altar of ${g.name} wakes. Its Herald comes.`, 3);
  sfx(55, 2.2, 'sine', 0.07, 30); sfx(82, 2.2, 'triangle', 0.04, 20); G.shake = Math.max(G.shake, 4);
  parts.push({ ring: true, x: o.x, y: o.y, r: 0.3, max: 5, t: 1, col: g.col });
  const lvl = Math.max(3, G.zone.monsters.filter(m => !m.dead).reduce((a, m) => Math.max(a, m.mlvl), 1));
  const p = openSpot(G.zone, o.x + 2, o.y + 1) || { x: o.x + 1.5, y: o.y + 1.5 };
  const h = makeMon(g.mon, p.x, p.y, lvl, 'unique', []);
  h.hp = h.max = Math.round(h.max * 0.45); h.name = g.herald; h.herald = o.god; h.altar = o; h.state = 'chase'; h.rise = 1.2;
  G.zone.monsters.push(h);
}
function heraldDeath(m) {
  const g = GODS22[m.herald]; if (!g) return;
  if (m.altar) m.altar.used = true;
  if (!P.done.includes('herald:' + m.herald)) P.done.push('herald:' + m.herald);
  P.arc.maj = (P.arc.maj || 0) + 1; P.arc.majAct = (P.arc.majAct || 0) + 1;
  setTimeout(() => { banner('MAJOR ARCANUM', '#e8d6a0', 4); say(`${g.herald} is unmade. A Major Arcanum is yours to set in your web (press A).`, 4.5); sfx(262, 1.2, 'sine', 0.05, 262); sfx(392, 1.4, 'sine', 0.04, 196); }, 900);
  gainArcana(1, g.herald);
}
// the Heralds: great versions of their god's creatures, each with the god's own trick
Object.assign(MON, {
  hbone: { name: 'The Marrow Pontiff', spr: 'hbone', hp: 260, dmg: [12, 20], spd: 1.7, r: 0.55, xp: 700, ai: 'herald', god: 'bone', range: 1.6, wind: 0.7, rec: 0.9, armor: 40, poiseK: 1.2 },
  hflesh: { name: 'The Wet Nurse', spr: 'hflesh', hp: 320, dmg: [10, 17], spd: 1.1, r: 0.7, xp: 700, ai: 'herald', god: 'flesh', range: 1.5, wind: 0.8, rec: 1, poiseK: 1.4 },
  hbreath: { name: 'The Long Exhale', spr: 'hbreath', hp: 200, dmg: [12, 19], spd: 1.9, r: 0.5, xp: 700, ai: 'herald', god: 'breath', wind: 0.8, poiseK: 0.8 },
  hhollow: { name: 'A Silent One', spr: 'hhollow', hp: 230, dmg: [14, 22], spd: 2.3, r: 0.4, xp: 700, ai: 'herald', god: 'hollow', range: 1.2, wind: 0.5, rec: 0.6, poiseK: 0.9 }
});
Object.assign(MFRAME, { hbone: [70, 64], hflesh: [66, 52], hbreath: [58, 72], hhollow: [50, 60] });
Object.assign(MPAL, {
  hbone: Object.assign({}, MPAL.warden, { _k: 1.55, iron: mkRamp('#1a1408', '#8a6a2a', '#f8e0a0', 7), shield: mkRamp('#241e16', '#c8b890', '#fffaec', 6), eye: '#ffd070', eyeHi: '#ffffff', cloth: mkRamp('#10060a', '#5a1a2a', '#a8404a', 6) }),
  hflesh: { _k: 1.6, skin: mkRamp('#1e0a0e', '#9a4a4a', '#f0b0a0', 7), robe: mkRamp('#12060a', '#5a1a22', '#a8404a', 6), rope: '#c86a5a', hole: '#1a0406', blood: '#c01a1e', glow: '#ff4a3a', glowHi: '#ffe0c0', eye: '#050304', tear: '#8a0a0c', teeth: '#f0e8d0' },
  hbreath: Object.assign({}, MPAL.gasp, { _k: 1.7, gauze: ['rgba(40,50,70,0.8)', 'rgba(90,120,150,0.75)', 'rgba(150,190,220,0.7)', 'rgba(200,230,250,0.65)', 'rgba(240,250,255,0.6)'], eye: '#ffffff' }),
  hhollow: Object.assign({}, MPAL.weeper, { _k: 1.55, robe: mkRamp('#000000', '#08070c', '#1a1624', 6), veil: mkRamp('#000000', '#0c0a12', '#26202e', 6), hand: mkRamp('#000000', '#0e0c14', '#2a2434', 6), needle: '#ffffff', tearGlow: '#e8d8ff', hollow: '#ffffff', trim: '#1a1624' })
});
// scaled painters: the Heralds reuse their kin's bodies at a larger size
MPAINT_HR.hbone = (A, pose, ph) => MPAINT_HR.warden(A, pose, ph);
MPAINT_HR.hflesh = (A, pose, ph) => MPAINT_HR.hollow(A, pose, ph);
MPAINT_HR.hbreath = (A, pose, ph) => MPAINT_HR.gasp(A, pose, ph);
MPAINT_HR.hhollow = (A, pose, ph) => MPAINT_HR.weeper(A, pose, ph);
for (const k of ['hbone', 'hflesh', 'hbreath', 'hhollow']) { MPAINT[k] = MPAINT[k] || MPAINT.hollow; SPR[k] = SPR[k] || SPR.hollow; }
AI22.herald = function (m, dt, T, d, tp) {
  const g = m.b.god; m.skT = (m.skT || 3) - dt;
  if (m.rise > 0) { m.rise -= dt; return; }
  const enr = m.hp < m.max * 0.5 ? 1.3 : 1;
  if (g === 'bone') {
    // the Pontiff walls you in with bone and calls its wardens once
    if (m.skT <= 0 && d < 7) { m.skT = 7 / enr; const n = 7; for (let i = 0; i < n; i++) { const a = i / n * 6.28 + Math.random() * 0.3; const px = T.x + Math.cos(a) * 2.6, py = T.y + Math.sin(a) * 2.6; if (!G.zone.solidAt(px, py)) G.bwalls22.push({ x: px, y: py, t: 5, max: 5 }); } say('Bone rises around you', 1); sfx(90, 0.8, 'square', 0.05, 60); }
    if (!m.called && m.hp < m.max * 0.5) { m.called = true; for (let i = 0; i < 3; i++) { const p = openSpot(G.zone, m.x + rand(-2, 2), m.y + rand(-2, 2)); if (p) { const w = makeMon('knight', p.x, p.y, m.mlvl - 1, 'normal', []); w.state = 'chase'; G.zone.monsters.push(w); } } }
    m.fdir = { x: tp.x, y: tp.y }; meleeStd(m, dt, T, d, tp, m.b.range, enr); return;
  }
  if (g === 'flesh') {
    // the Wet Nurse births husks and spews bile
    if (m.skT <= 0) { m.skT = 6 / enr; const kids = G.zone.monsters.filter(o => !o.dead && o.nurse === m).length; if (kids < 6) for (let i = 0; i < 2; i++) { const p = openSpot(G.zone, m.x + rand(-1.5, 1.5), m.y + rand(-1.5, 1.5)); if (p) { const h = makeMon('hollow', p.x, p.y, Math.max(1, m.mlvl - 2), 'normal', []); h.nurse = m; h.state = 'chase'; G.zone.monsters.push(h); burst(p.x, p.y, '#c24050', 16, 2); } } sfx(70, 0.6, 'sawtooth', 0.05, -20); }
    if (d > 2 && d < 6 && (m.spewT = (m.spewT || 2) - dt) <= 0) { m.spewT = 3.5; for (let i = -2; i <= 2; i++) { const a = Math.atan2(tp.y, tp.x) + i * 0.18; shots.push({ x: m.x, y: m.y, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, t: 1.4, dmg: rand(m.dmg[0], m.dmg[1]) * 0.45, type: 'magic', kind: 'orb', r: 0.25 }); } }
    meleeStd(m, dt, T, d, tp, m.b.range, 1); return;
  }
  if (g === 'breath') {
    // the Long Exhale drifts like a Gasp, and breathes you away or pulls you in
    if (m.skT <= 0 && d < 6) { m.skT = 5 / enr; const inhale = Math.random() < 0.5; const k = inhale ? -1 : 1; for (let i = 0; i < 12; i++) moveCircle(P, (P.x - m.x) / (d || 1) * 0.28 * k, (P.y - m.y) / (d || 1) * 0.28 * k); if (!inhale) hurtPlayer(rand(m.dmg[0], m.dmg[1]) * 0.6, 'magic', m.x, m.y); say(inhale ? 'It breathes in...' : 'It breathes out', 0.9); parts.push({ ring: true, x: m.x, y: m.y, r: inhale ? 4 : 0.4, max: inhale ? 0.4 : 5, t: 0.5, col: '#bfe8ff' }); sfx(inhale ? 300 : 120, 0.8, 'sine', 0.05, inhale ? 300 : -80); }
    AI22.ghost(m, dt, T, d, tp); return;
  }
  // a Silent One: no light near it, and it steps out of the dark behind you
  m.dark = true;
  if (m.skT <= 0 && d < 9 && T === P) { m.skT = 4.5 / enr; const f = playerFront(P), bx = P.x - f.x * 1.2, by = P.y - f.y * 1.2; if (!G.zone.solidAt(bx, by)) { burst(m.x, m.y, '#1a1624', 16, 2); m.x = bx; m.y = by; m.state = 'windup'; m.t = 0.1; m.aim = { x: (P.x - m.x) / 1.2, y: (P.y - m.y) / 1.2 }; sfx(40, 0.5, 'sine', 0.06, 0); return; } }
  meleeStd(m, dt, T, d, tp, m.b.range, enr);
};
// the Pontiff's bone walls: short-lived, they block walking
if (!G.bwalls22) G.bwalls22 = [];
function updateBoneWalls(dt) {
  if (!G.bwalls22.length) return;
  for (const w of G.bwalls22) {
    w.t -= dt;
    for (const o of [P].concat(minionList())) { if (!o || o.dead) continue; const dd = Math.hypot(o.x - w.x, o.y - w.y), mm = 0.45 + (o.r || 0.3); if (dd < mm && dd > 0.001) moveCircle(o, (o.x - w.x) / dd * (mm - dd), (o.y - w.y) / dd * (mm - dd)); }
  }
  G.bwalls22 = G.bwalls22.filter(w => w.t > 0);
}
function drawBoneWalls(list) {
  for (const w of G.bwalls22) list.push({ d: w.x + w.y, f: () => { const q = iso(w.x, w.y), k = Math.min(1, (w.max - w.t) / 0.25, w.t / 0.4), h = 16 * k; for (let i = 0; i < 3; i++) { ctx.fillStyle = i === 1 ? '#e8e2d0' : '#a8a08a'; ctx.fillRect(Math.round(q.sx - 4 + i * 3), Math.round(q.sy - h + i % 2 * 2), 2, Math.round(h)); ctx.fillStyle = '#f4efe2'; ctx.fillRect(Math.round(q.sx - 4 + i * 3), Math.round(q.sy - h + i % 2 * 2), 1, 2); } } });
}
// the altar itself: a slab of old stone under a column of the god's light
const ALTAR_FR = {};
function altarFrame(god) {
  if (typeof ztAltarFrame === 'function') return ztAltarFrame(god);   // v0.23: the 32-bit altar (zt_env32.js)
  if (ALTAR_FR[god]) return ALTAR_FR[god];
  const g = GODS22[god], glow = g.col, stone = mkRamp('#141218', '#5a5460', '#b8b0b8', 6);
  const fr = mkFrameHR(30, 30, (x, ox, oy) => {
    const A = painter2(x, ox, oy, {});
    A.slab([[-8, -2], [0, -6], [8, -2], [0, 2]], stone, { base: 0.8 });
    A.slab([[-6, -3], [-6, -10], [6, -10], [6, -3], [0, 0]], stone, { base: 0.7, gx: 0.5 });
    A.slab([[-7, -10], [0, -13.5], [7, -10], [0, -6.5]], stone, { base: 0.95 });
    A.L(-6, -8.5, 0, -5.4, stone[0], 0.5); A.L(0, -5.4, 6, -8.5, stone[1], 0.5);
    // the god's mark on the front
    if (god === 'bone') { skullHR(A, -1, -6.6, 0.55, SK_BONE, '#ffe8a0', '#ffffff', '#0a080c'); }
    else if (god === 'flesh') { A.ball(0, -6.5, 1.5, 1.8, mkRamp('#2a0608', '#a02a30', '#ff9a8a', 5)); A.L(0, -4.8, 0, -3.4, '#8e1a1e', 0.5); }
    else if (god === 'breath') { for (let i = 0; i < 3; i++) A.L(-2 + i * 0.3, -8 + i * 1.3, 2 - i * 0.3, -8 + i * 1.3, '#bfe8ff', 0.5); }
    else { A.E(0, -6.6, 1.6, 1.9, '#000000'); A.E(0, -6.6, 1.1, 1.3, '#000000'); A.P(0.6, -7.4, '#9a7ad0'); }
    // candles, offerings, and a bowl on the top
    for (const cx of [-4.5, 4.5]) { A.R(cx - 0.4, -13, 0.9, 2.2, '#d8cfb4'); A.P(cx, -13.6, '#ffd070'); A.P(cx, -14.1, '#fff6c8'); }
    A.ball(0, -11, 2, 0.9, stone, { lit: 0.1 }); A.E(0, -11.3, 1.4, 0.4, glow);
  });
  ALTAR_FR[god] = fr; return fr;
}
function drawAltars(list, hoverCands) {
  for (const o of G.zone.objects) {
    if (o.type !== 'altar' || !onScreen(o.x, o.y, 60)) continue;
    list.push({ d: o.x + o.y, f: () => {
      const g = GODS22[o.god], fr = altarFrame(o.god), q = iso(o.x, o.y), X = Math.round(q.sx - (fr.ox != null ? fr.ox : fr.w / 2)), Y = Math.round(fr.oy != null ? q.sy - fr.oy : q.sy + 4 - fr.h + 2);
      shadow(o.x, o.y, 0.7);
      if (!o.used) { ctx.globalCompositeOperation = 'lighter'; const k = 0.5 + 0.2 * Math.sin(G.time * 2); const gr = ctx.createLinearGradient(0, q.sy - 140, 0, q.sy); gr.addColorStop(0, `rgba(${g.rgb},0)`); gr.addColorStop(1, `rgba(${g.rgb},${0.28 * k})`); ctx.fillStyle = gr; ctx.fillRect(q.sx - 7, q.sy - 140, 14, 134); ctx.fillStyle = `rgba(${g.rgb},${0.18 * k})`; ctx.fillRect(q.sx - 2, q.sy - 160, 4, 154); ctx.globalCompositeOperation = 'source-over'; }
      ctx.drawImage(fr.c, X, Y);
      if (!o.used) hoverCands.push({ kind: 'obj', ref: o, rect: { x: X, y: Y, w: fr.w, h: fr.h }, d: o.x + o.y });
    } });
  }
}
// toppled three-faced statues: a head on its side, three faces, one looking up
const STATUE_FR = {};
function statueFrame(v) {
  if (typeof ztStatueFrame === 'function') return ztStatueFrame(v);   // v0.23: the 32-bit statue (zt_env32.js)
  if (STATUE_FR[v]) return STATUE_FR[v];
  const st = mkRamp('#18161c', '#6a6468', '#cac2bc', 7), moss = '#4a5a36';
  const fr = mkFrameHR(34, 22, (x, ox, oy) => {
    const A = painter2(x, ox, oy, {});
    A.ball(-3, -4, 7.5, 4.2, st, { ao: 0.4 });
    A.ball(3.5, -5, 4.2, 4.4, st, { ao: 0.3 });
    // three faces on the head: forward, up, and one crushed into the dirt
    A.L(5.5, -7, 7, -6.8, st[1], 0.5); A.L(5.8, -5.2, 7.2, -5.2, st[1], 0.5); A.L(6, -3.4, 7.2, -3.6, st[0], 0.5);
    A.L(2, -9, 4, -9.2, st[1], 0.5); A.P(3, -8.2, st[0]);
    A.L(-8, -6, -2, -8, st[5], 0.5); for (let i = 0; i < 9; i++) A.P(-9 + i * 1.6, -2 + (i % 3) * 0.5, moss);
    if (v === 1) { A.ball(-11, -1.6, 2.2, 1.4, st, { lit: -0.1 }); A.ball(10, -1.2, 1.8, 1.2, st); }
    if (v === 2) { A.slab([[-10, -1], [-6, -9], [-4, -8], [-7, 0]], st, { base: 0.6 }); }
  });
  STATUE_FR[v] = fr; return fr;
}
function drawStatues(list) {
  for (const o of G.zone.objects) {
    if (o.type !== 'statue' || !onScreen(o.x, o.y, 50)) continue;
    list.push({ d: o.x + o.y - 0.3, f: () => { const fr = statueFrame(o.v || 0), q = iso(o.x, o.y); ctx.drawImage(fr.c, Math.round(q.sx - (fr.ox != null ? fr.ox : fr.w / 2)), Math.round(fr.oy != null ? q.sy - fr.oy + 2 : q.sy + 2 - fr.h)); } });
  }
}

// ------------------------------------------------------------------- the Arcana, reworked
// Minor Arcana (the points) come from shrines, bosses and now and then a unique creature, but only so many per
// act in a playthrough. Majors come only from Heralds. Between the cards run Threads: small steps (a little life,
// a little Essence, a little speed) so the web grows in increments, and the cards themselves are what change how
// you play.
const THREAD_FX = [
  { k: 'dmg', v: 2, t: '+2% skill damage' }, { k: 'life', v: 3, t: '+3% life' }, { k: 'spi', v: 2, t: '+2 Essence' },
  { k: 'fcr', v: 3, t: '+3% faster cast rate' }, { k: 'armor', v: 5, t: '+5 armor' }, { k: 'poise', v: 6, t: '+6 poise' },
  { k: 'res', v: 2, t: '+2% magic resist' }, { k: 'frw', v: 2, t: '+2% faster movement' }, { k: 'vit', v: 2, t: '+2 Vitality' }
];
const THREAD_NAMES = ['Thread of Ash', 'Thread of Marrow', 'Thread of Breath', 'Thread of Salt', 'Thread of Wax', 'Thread of Iron', 'Thread of Rain', 'Thread of Rust', 'Thread of Bells'];
{
  const _bw = buildWeb;
  buildWeb = function (cls) {
    const nodes = _bw(cls); if (!nodes) return nodes;
    // thread every link that leads into a card from the heart outward, until the web is half again as large
    const want = Math.round(Object.keys(nodes).filter(k => k !== 'heart').length * 0.5);
    const edges = []; const seen = new Set();
    for (const a in nodes) for (const b of nodes[a].links) { const key = a < b ? a + '|' + b : b + '|' + a; if (seen.has(key)) continue; seen.add(key); if (ARC[a] && ARC[a].kind === 'void' || ARC[b] && ARC[b].kind === 'void') continue; edges.push([a, b]); }
    // prefer the links into Majors and the long branch links
    edges.sort((p, q) => { const s = e => (ARC[e[0]] && ARC[e[0]].kind === 'major' || ARC[e[1]] && ARC[e[1]].kind === 'major' ? 0 : 1) + (e.includes('heart') ? 2 : 0); return s(p) - s(q); });
    let n = 0;
    for (const [a, b] of edges) {
      if (n >= want) break;
      const id = `t_${cls}_${n}`, fx = THREAD_FX[(n * 5 + cls.length) % THREAD_FX.length];
      ARC[id] = { cls, kind: 'thread', name: THREAD_NAMES[(n * 7 + cls.length) % THREAD_NAMES.length], up: fx.t + '. A small step toward the Major Arcana beyond.', fx };
      nodes[id] = { id, x: (nodes[a].x + nodes[b].x) / 2, y: (nodes[a].y + nodes[b].y) / 2, links: new Set([a, b]) };
      nodes[a].links.delete(b); nodes[b].links.delete(a); nodes[a].links.add(id); nodes[b].links.add(id);
      n++;
    }
    return nodes;
  };
  const _derive = arcDerive;
  arcDerive = function (d, s) {
    _derive(d, s);
    let life = 0;
    for (const k in P.arc.taken) { const c = ARC[k]; if (!c || c.kind !== 'thread') continue; const f = c.fx;
      if (f.k === 'dmg') d.dmgMult *= 1 + f.v / 100; else if (f.k === 'life') life += f.v; else if (f.k === 'spi') { d.spi += f.v; d.maxMana += f.v * 2; }
      else if (f.k === 'fcr') d.castSpd *= 1 + f.v / 100; else if (f.k === 'armor') d.armor += f.v; else if (f.k === 'poise') d.maxStam += f.v;
      else if (f.k === 'res') d.res = Math.min(75, d.res + f.v); else if (f.k === 'frw') d.moveSpd *= 1 + f.v / 100; else if (f.k === 'vit') { d.vit += f.v; d.maxHp += f.v * 3; } }
    if (life) d.maxHp = Math.round(d.maxHp * (1 + life / 100));
  };
  const _why = arcWhyNot;
  arcWhyNot = function (id) {
    const c = ARC[id];
    if (c && (c.kind === 'major' || c.kind === 'hybrid') && !arcOf(id)) {
      if (!arcReachable(id)) return 'Not connected to your Major Arcana yet';
      if (!(P.arc.maj > 0)) return 'Majors are won only from a Herald, at a god\'s altar';
      return null;
    }
    return _why(id);
  };
  const _take = takeCard;
  takeCard = function (id, orient) {
    const c = ARC[id];
    if (c && (c.kind === 'major' || c.kind === 'hybrid')) {
      if (arcWhyNot(id)) return false;
      P.arc.maj--; P.arc.taken[id] = hasOrient(id) ? (orient === 'r' ? 'r' : 'u') : 1; onArcChange(); sfx(392, 0.5, 'sine', 0.05, 196); return true;
    }
    return _take(id, orient);
  };
  const _gain = gainArcana;
  gainArcana = function (n, why) {
    const got = P.arc.got || 0, room = ACT_MINORS - got;
    if (room <= 0) { say(`${why}: this act's Arcana are all found`, 2.5); return; }
    n = Math.min(n, room); P.arc.got = got + n; _gain(n, why);
  };
}
// uniques sometimes carry a Minor Arcanum (the old drops, a quarter more often)
function arcanaDrop22(m) {
  if (m.herald || m.rank === 'boss') return;
  const ch = m.rank === 'unique' ? 0.25 : m.rank === 'champion' ? 0.05 : 0;
  if (ch && Math.random() < ch) gainArcana(1, m.name.split(' ')[0] + ' carried a Major Arcanum');
}

// ------------------------------------------------------------------- day and night
// Outside, the sky turns: a long grey day, a red dusk, a night where only your own light and the lanterns hold
// the dark back, and a pale dawn. Underground it is always dim. Things are seen by light: the far and the unlit
// melt into the dark and come out of it as they near your lamp.
const DAY = { len: 600, start: 0.12 };
G.clock = DAY.len * DAY.start;
function dayPhase() { return (G.clock / DAY.len) % 1; }
// 1 by day, 0 at night, easing through dusk (0.55-0.66) and dawn (0.9-1.0)
function dayK() { const p = dayPhase(); if (p < 0.55) return 1; if (p < 0.66) return 1 - (p - 0.55) / 0.11; if (p < 0.9) return 0; return (p - 0.9) / 0.1; }
function isOutdoor(z) { return z && (z.theme === 'moor' || z.theme === 'fen'); }
function dayName() { const p = dayPhase(); return p < 0.55 ? 'Day' : p < 0.66 ? 'Dusk' : p < 0.9 ? 'Night' : 'Dawn'; }
G.night = false;
function updateDay(dt) { G.clock += dt; const was = G.night; G.night = isOutdoor(G.zone) && dayK() < 0.3; if (G.night !== was && isOutdoor(G.zone)) say(G.night ? 'Night falls. Keep to the light.' : 'The sky greys toward day', 2.5); }
// v0.22d: darker all round (the user: the game was too bright). Out of the light the world is dim but always there.
const AMB_DAY = { moor: [150, 146, 158], fen: [130, 144, 138] }, AMB_DUSK = [228, 132, 84], AMB_NIGHT = { moor: [66, 68, 92], fen: [58, 72, 78] }, AMB_DEEP = { crypt: [80, 76, 96], barrow: [86, 78, 74], bone: [86, 84, 80] };   // v0.23: a little more to see by
function ambient22(z) {
  if (!isOutdoor(z)) return AMB_DEEP[z.theme] || [96, 92, 110];
  const d = AMB_DAY[z.theme], n = AMB_NIGHT[z.theme], k = dayK(), p = dayPhase();
  const base = d.map((v, i) => n[i] + (v - n[i]) * k);
  const dusk = p > 0.52 && p < 0.7 ? Math.sin((p - 0.52) / 0.18 * Math.PI) * 0.75 : p > 0.9 ? Math.sin((p - 0.9) / 0.1 * Math.PI) * 0.25 : 0;
  return base.map((v, i) => Math.round(v + (AMB_DUSK[i] - v) * dusk));
}
// how well lit a spot is, 0..1: the ambient, your own lamp, lanterns, braziers and fires
function lightLevel(x, y) {
  const z = G.zone; let L = isOutdoor(z) ? 0.04 + 0.26 * dayK() : 0.05;
  const hr = heroLightR();
  if (!P.dead) { const d = Math.hypot(x - P.x, y - P.y); if (d < hr && (d < 1.2 || lineClear(z, P, { x, y }))) L += Math.max(0, 1 - d / hr) * 1.1; }   // things behind a wall stay in the lamp's shadow
  for (const l of z.lanterns) { const d = Math.hypot(x - l.x, y - l.y); if (d < 9) L += (1 - d / 9) * 1.2; }
  if (G.props16) for (const o of G.props16) if (o.light) { const d = Math.hypot(x - o.x, y - o.y); if (d < 4) L += (1 - d / 4) * 0.8; }
  for (const f of G.fires) { const d = Math.hypot(x - f.x, y - f.y); if (d < 3) L += (1 - d / 3) * 0.6; }
  for (const f of G.efires || []) { const d = Math.hypot(x - f.x, y - f.y); if (d < 3) L += (1 - d / 3) * 0.6; }
  for (const o of z.objects) if (o.type === 'altar' && !o.used) { const d = Math.hypot(x - o.x, y - o.y); if (d < 6) L += (1 - d / 6) * 0.7; }
  for (const m of z.monsters) if (m.dark && !m.dead) { const d = Math.hypot(x - m.x, y - m.y); if (d < 5) L *= 0.3 + 0.7 * d / 5; }
  return clamp(L, 0, 1);
}
// your lamp reaches farther at night; the Silent Ones swallow it
function heroLightR() {
  let r = isOutdoor(G.zone) ? 7 + 1.5 * (1 - dayK()) : 7.5;
  for (const m of G.zone.monsters) if (m.dark && !m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 6) r *= 0.45;
  return r;
}
// monsters show by light: emissive things always; everything else fades into the dark
function monVisibility(m) {
  if (m.b.ai === 'pyre' && !m.doused) return 1;
  if (m.hurt > 0 || m.bossLit || (G.bossFight && m.rank === 'boss')) return 1;
  const L = lightLevel(m.x, m.y);
  // far out of the light a creature is only a faint shape; it comes out of the dark as it nears your lamp
  return clamp(L * 1.2 + 0.05, 0.16, 1);
}

// ------------------------------------------------------------------- every class carries its own light
// The Animancer a caged wisp, the Ossurarch a skull with a candle in it, the Hemomancer a heart-lamp of
// smouldering blood, the Assassin a paper lantern on a pole: small, swaying, always at the hero's side.
const LAMP_RGB = { animancer: '170,215,255', ossumancer: '255,226,170', hemomancer: '255,110,90', miasmancer: '255,200,140' };
const LAMP_FR = {};
function lampFrame(cls) {
  if (LAMP_FR[cls]) return LAMP_FR[cls];
  const iron = mkRamp('#0c0c10', '#3e4048', '#8a8e98', 4);
  const fr = mkFrameHR(12, 16, (x, ox, oy) => {
    const A = painter2(x, ox, oy, {});
    if (cls === 'animancer') {
      A.L(0, -14, 0, -12, iron[2], 0.5); A.R(-2, -12, 4, 0.5, iron[2]);
      A.R(-2, -11.5, 4, 6, 'rgba(160,210,255,0.35)'); A.E(0, -8.5, 1.4, 1.8, '#d8f3ff'); A.P(0, -9, '#ffffff');
      for (const xx of [-2, -0.7, 0.7, 2]) A.L(xx, -11.5, xx, -5.5, iron[1], 0.5);
      A.R(-2.2, -5.5, 4.4, 0.8, iron[2]); A.R(-2.2, -12.2, 4.4, 0.6, iron[3]);
    } else if (cls === 'ossumancer') {
      A.L(0, -14, 0, -11.5, '#8a7a52', 0.5);
      skullHR(A, -0.8, -8, 0.95, SK_BONE, '#ffd070', '#ffffff', '#1a0e06');
      A.R(-0.3, -12, 0.6, 1.4, '#e8dcc0'); A.P(0, -12.6, '#ffd070'); A.P(0, -13, '#fff6c8');
    } else if (cls === 'hemomancer') {
      A.L(0, -14, 0, -12, iron[2], 0.5);
      A.ball(0, -8.5, 2.2, 2.6, mkRamp('#2a0406', '#b02020', '#ffb080', 5), { spec: '#ffe0c0' });
      for (const [a, b] of [[-2, -10], [2, -7], [-1.5, -6.5]]) A.L(0, -8.5, a, b, '#5a0a0e', 0.5);
      A.R(-2.4, -11.4, 4.8, 0.6, iron[2]); A.R(-2.4, -5.8, 4.8, 0.6, iron[2]);
    } else {
      // a paper lantern on a short pole: red paper, black ribs, a warm glow inside
      A.L(0, -15, 0, -12.5, '#3a2a1a', 0.5); A.R(-1.2, -12.6, 2.4, 0.6, '#1a1210');
      A.ball(0, -9, 2.4, 3.2, mkRamp('#5a1010', '#d8402a', '#ffd6a0', 5), { lit: 0.15 });
      for (let i = 0; i < 4; i++) A.L(-2.3, -11 + i * 1.4, 2.3, -11 + i * 1.4, 'rgba(20,10,10,0.5)', 0.5);
      A.R(-1.2, -5.8, 2.4, 0.6, '#1a1210'); A.L(0, -5.2, 0, -3.6, '#c8a040', 0.5);
    }
  });
  LAMP_FR[cls] = fr; return fr;
}
function drawClassLamp(list) {
  if (P.dead || !G.zone) return;
  list.push({ d: P.x + P.y + 0.05, f: () => {
    const fr = lampFrame(P.cls), q = iso(P.x, P.y), f = P.face || 1, sway = Math.sin(G.time * 2.4) * 1.2 + (P.path ? Math.sin(G.time * 9) * 0.8 : 0);
    const X = Math.round(q.sx + f * 7 - fr.w / 2 + sway), Y = Math.round(q.sy - 14 - fr.h / 2 + Math.abs(sway) * 0.3);
    ctx.drawImage(f < 0 ? fr.f : fr.c, X, Y);
    ctx.globalCompositeOperation = 'lighter'; glow(X + fr.w / 2, Y + fr.h * 0.55, 6, LAMP_RGB[P.cls] || '255,220,160', 0.12 + 0.03 * Math.sin(G.time * 9)); ctx.globalCompositeOperation = 'source-over';
  } });
}

// ------------------------------------------------------------------- a clock in the corner
function drawSkyDial() {
  if (!G.zone || !isOutdoor(G.zone) || !G.running) return;
  const cx = W - 22, cy = 14, p = dayPhase(), a = p * Math.PI * 2 - Math.PI / 2;
  ctx.fillStyle = 'rgba(10,9,13,0.6)'; ctx.beginPath(); ctx.arc(cx, cy, 8, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = '#3a3446'; ctx.beginPath(); ctx.arc(cx, cy, 8, Math.PI, 0); ctx.stroke();
  const night = G.night, sx = cx + Math.cos(a) * 6, sy = cy + Math.sin(a) * 6;
  if (sy <= cy + 1) { ctx.fillStyle = night ? '#d8e0f0' : '#f0d080'; ctx.beginPath(); ctx.arc(sx, sy, 1.8, 0, 6.28); ctx.fill(); }
  txt(dayName(), cx, cy + 9, night ? '#a8b4d8' : '#c9b48a', 'center', false);
}

// ------------------------------------------------------------------- make every new zone with its ruins and altars
for (const id in ZONE_GEN) { const f = ZONE_GEN[id]; ZONE_GEN[id] = s => { const z = f(s); try { dressZone(z, s); } catch (e) { reportError(e); } return z; }; }
