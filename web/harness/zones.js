
// =================================================================== more zones (v0.5)
const PACKS_FEN = [['drowned', 3, 5], ['leech', 4, 7], ['bogwitch', 2, 3, 'drowned', 1, 3], ['drowned', 2, 3, 'archer', 1, 2], ['bloat', 2, 3, 'drowned', 1, 2]];
const PACKS_BONE = [['marrow', 2, 3], ['marrow', 1, 2, 'ossarcher', 2, 3], ['ossarcher', 3, 4], ['bogwitch', 2, 3, 'marrow', 1, 1], ['bloat', 2, 4, 'marrow', 1, 1], ['hollow', 5, 7]];
function genFen(seed) {
  const rng = mulberry32(seed), R = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const z = new Zone('fen', 'Drowned Fen', 130, 130, 0.45); z.theme = 'fen';
  const n1 = makeNoise(rng), n2 = makeNoise(rng), n3 = makeNoise(rng);
  for (let y = 0; y < z.h; y++) for (let x = 0; x < z.w; x++) {
    const edge = Math.min(x, y, z.w - 1 - x, z.h - 1 - y);
    const f = fbm(n1, x / 10, y / 10), wv = fbm(n2, x / 14 + 20, y / 14 + 20), r = n3(x / 2.1, y / 2.1);
    let t = T.GRASS;
    if (edge < 3 || (edge < 5 && f > 0.46)) t = T.CLIFF;
    else if (wv < 0.4) t = T.WATER;
    else if (f > 0.6) t = T.TREE;
    else if (f > 0.52 && r > 0.55) t = T.TREE;
    else if (r > 0.96) t = T.ROCK;
    z.set(x, y, t);
  }
  const entry = { x: 7, y: R(55, 75) };
  const chapel = { x: R(55, 72), y: R(55, 72) };
  const cata = { x: R(105, 118), y: R(105, 118) };
  const ne = { x: R(98, 115), y: R(12, 28) };
  const sw = { x: R(18, 34), y: R(100, 116) };
  clearArea(z, entry.x + 2, entry.y, 3, T.GRASS); clearArea(z, chapel.x, chapel.y, 4, T.DIRT); clearArea(z, cata.x, cata.y, 4, T.GRASS);
  clearArea(z, ne.x, ne.y, 3, T.DIRT); clearArea(z, sw.x, sw.y, 3, T.DIRT);
  // a drowned chapel ruin: broken pillars around the lantern
  [[-3, -3], [3, -3], [-3, 3], [3, 3], [0, -4]].forEach(([i, j]) => { if (rng() < 0.8) z.set(chapel.x + i, chapel.y + j, T.PILLAR); });
  carveRoad(z, entry.x + 2, entry.y, chapel.x, chapel.y, rng);
  carveRoad(z, chapel.x, chapel.y, cata.x, cata.y, rng);
  carveRoad(z, chapel.x, chapel.y, ne.x, ne.y, rng);
  carveRoad(z, chapel.x, chapel.y, sw.x, sw.y, rng);
  const seen = floodFrom(z, entry.x + 2, entry.y);
  for (let i = 0; i < z.t.length; i++) if (!seen[i] && SOLID[z.t[i]] === 0) z.t[i] = T.WATER;
  z.start = { x: entry.x + 2.5, y: entry.y + 0.5 };
  z.lanterns.push({ x: entry.x + 3.5, y: entry.y - 1.5, name: "Fen's Edge" });
  z.lanterns.push({ x: chapel.x + 0.5, y: chapel.y + 0.5, name: 'Sunken Chapel' });
  z.lanterns.forEach((l, i) => z.objects.push({ type: 'lantern', x: l.x, y: l.y, idx: i, name: l.name }));
  z.objects.push({ type: 'portal', x: entry.x + 0.5, y: entry.y + 0.5, to: 'moor', name: 'Road to the Ashen Moor', spr: 'gate' });
  z.objects.push({ type: 'portal', x: cata.x + 0.5, y: cata.y + 0.5, to: 'cata1', name: 'Bone Catacombs', spr: 'stairs' });
  z.arrive = { moor: z.start, cata1: { x: cata.x + 0.5, y: cata.y + 2.5 } };
  // treasure at the far sites
  [ne, sw].forEach(s => { z.objects.push({ type: 'chest', x: s.x + 1.5, y: s.y + 0.5, open: false, ilvl: 10 }); z.objects.push({ type: 'chest', x: s.x - 0.5, y: s.y + 1.5, open: false, ilvl: 10 }); });
  const d0 = bfsDist(z, entry.x + 2, entry.y);
  const spots = [];
  for (let y = 4; y < z.h - 4; y++) for (let x = 4; x < z.w - 4; x++) { const i = y * z.w + x; if (d0[i] > 18 && (z.t[i] === T.GRASS || z.t[i] === T.ROAD || z.t[i] === T.DIRT)) spots.push([x, y, d0[i]]); }
  for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
  const used = [[ne.x, ne.y], [sw.x, sw.y]];
  const farEnough = (x, y, r) => used.every(([ux, uy]) => Math.hypot(ux - x, uy - y) > r);
  // guardians at the treasure sites
  placePack(z, ne.x + .5, ne.y + .5, 11, PACKS_FEN, 'fne', rng); placePack(z, sw.x + .5, sw.y + .5, 11, PACKS_FEN, 'fsw', rng);
  let chests = 0, shrines = 0, packs = 0;
  for (const [x, y, d] of spots) {
    if (packs < 70 && farEnough(x, y, 8)) { placePack(z, x + .5, y + .5, clamp(6 + Math.floor(d / 24), 6, 11), PACKS_FEN, 'f' + packs, rng); used.push([x, y]); packs++; continue; }
    if (chests < 16 && z.t[y * z.w + x] === T.GRASS && farEnough(x, y, 4)) { z.objects.push({ type: 'chest', x: x + .5, y: y + .5, open: false, ilvl: clamp(6 + Math.floor(d / 24), 6, 11) }); used.push([x, y]); chests++; continue; }
    if (shrines < 7 && z.t[y * z.w + x] === T.GRASS && farEnough(x, y, 5)) { z.objects.push({ type: 'shrine', x: x + .5, y: y + .5, used: false, kind: pick(['echo', 'wisp', 'stone', 'refill']) }); used.push([x, y]); shrines++; }
  }
  return z;
}
// rooms-and-corridors dungeons: the Crypt, the Barrow and both Catacomb levels
function genDungeon(o) {
  const rng = mulberry32(o.seed), R = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const z = new Zone(o.id, o.name, o.size, o.size, o.dark); z.theme = o.theme;
  z.t.fill(T.WALL);
  const rooms = [];
  for (let i = 0; i < 500 && rooms.length < o.rooms; i++) {
    const w = R(7, 13), h = R(7, 13), x = R(2, z.w - w - 3), y = R(2, z.h - h - 3);
    if (rooms.some(r => x < r.x + r.w + 3 && x + w + 3 > r.x && y < r.y + r.h + 3 && y + h + 3 > r.y)) continue;
    rooms.push({ x, y, w, h, cx: x + w / 2, cy: y + h / 2 });
  }
  rooms.sort((a, b) => (a.cx + a.cy) - (b.cx + b.cy));
  const carveRect = (x0, y0, x1, y1) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (x > 0 && y > 0 && x < z.w - 1 && y < z.h - 1) z.set(x, y, T.FLOOR); };
  rooms.forEach(r => carveRect(r.x, r.y, r.x + r.w - 1, r.y + r.h - 1));
  const corridor = (a, b) => {
    const ax = Math.floor(a.cx), ay = Math.floor(a.cy), bx = Math.floor(b.cx), by = Math.floor(b.cy);
    if (rng() < .5) { carveRect(ax, ay, bx, ay + 1); carveRect(bx, ay, bx + 1, by); }
    else { carveRect(ax, ay, ax + 1, by); carveRect(ax, by, bx, by + 1); }
  };
  for (let i = 1; i < rooms.length; i++) {
    let best = 0, bd = 1e9;
    for (let j = 0; j < i; j++) { const d = Math.hypot(rooms[i].cx - rooms[j].cx, rooms[i].cy - rooms[j].cy); if (d < bd) { bd = d; best = j; } }
    corridor(rooms[i], rooms[best]);
  }
  for (let k = 0; k < 3; k++) corridor(rooms[R(0, rooms.length - 1)], rooms[R(0, rooms.length - 1)]);
  const start = rooms[0];
  const d0 = bfsDist(z, Math.floor(start.cx), Math.floor(start.cy));
  const rd = r => d0[Math.floor(r.cy) * z.w + Math.floor(r.cx)];
  const byFar = rooms.filter(r => r !== start).sort((a, b) => rd(b) - rd(a));
  let boss = null, down = null;
  if (o.boss) {
    boss = byFar.find(r => r.w >= 9 && r.h >= 9) || byFar[0];
    z.bossRoom = boss;
    z.inBoss = (x, y) => x >= boss.x && y >= boss.y && x < boss.x + boss.w && y < boss.y + boss.h;
  }
  if (o.down) down = byFar.find(r => r !== boss) || byFar[0];
  rooms.forEach(r => { if (r.w >= 10 && r.h >= 10) [[3, 3], [r.w - 4, 3], [3, r.h - 4], [r.w - 4, r.h - 4]].forEach(([i, j]) => z.set(r.x + i, r.y + j, T.PILLAR)); });
  z.start = { x: start.cx, y: start.cy + 1.5 };
  z.arrive = { [o.up.to]: z.start };
  z.objects.push({ type: 'portal', x: start.cx - 1.5, y: start.cy - 1.5, to: o.up.to, name: o.up.name, spr: 'stairs' });
  z.lanterns.push({ x: start.cx + 1.5, y: start.cy - 1.5, name: o.lantern });
  z.objects.push({ type: 'lantern', x: start.cx + 1.5, y: start.cy - 1.5, idx: 0, name: o.lantern });
  if (down) {
    z.objects.push({ type: 'portal', x: down.cx, y: down.cy - 1, to: o.down.to, name: o.down.name, spr: 'stairs' });
    z.arrive[o.down.to] = { x: down.cx, y: down.cy + 1.2 };
  }
  let packId = 0; const far = Math.max(1, rd(byFar[0]));
  rooms.forEach(r => {
    if (r === start || r === boss) return;
    const mlvl = clamp(o.lo + Math.round((o.hi - o.lo) * rd(r) / far), o.lo, o.hi);
    const n = r.w * r.h > 90 ? 2 : 1;
    for (let k = 0; k < n; k++) placePack(z, r.x + 2 + rng() * (r.w - 4), r.y + 2 + rng() * (r.h - 4), mlvl, o.packs, o.id + (packId++), rng);
    if (rng() < (o.chests || 0.4)) z.objects.push({ type: 'chest', x: r.x + 1.5, y: r.y + 1.5, open: false, ilvl: mlvl + 1 });
  });
  if (!o.boss && !o.down) { const f = byFar[0]; z.objects.push({ type: 'chest', x: f.cx + 1, y: f.cy, open: false, ilvl: o.hi + 1 }); z.objects.push({ type: 'chest', x: f.cx - 1, y: f.cy, open: false, ilvl: o.hi + 1 }); placePack(z, f.cx, f.cy + 1, o.hi + 1, o.packs, 'lord', rng); }
  if (o.boss) { const b = makeMon(o.boss.type, boss.cx, boss.cy, o.boss.lvl, 'boss', []); b.pack = 'boss'; z.monsters.push(b); z.boss = b; }
  return z;
}
function genCrypt(seed) { return genDungeon({ id: 'crypt', name: 'Hollow Crypt', seed, size: 84, rooms: 16, dark: 0.8, theme: 'crypt', lo: 6, hi: 8, packs: PACKS_CRYPT, up: { to: 'moor', name: 'Ashen Moor' }, lantern: 'Crypt Threshold', boss: { type: 'boss', lvl: 9 } }); }
const ZONE_NAMES = { moor: 'Ashen Moor', crypt: 'Hollow Crypt', fen: 'Drowned Fen', barrow: 'Old Barrow', cata1: 'Bone Catacombs I', cata2: 'Bone Catacombs II' };
const ZONE_GEN = {
  moor: s => genMoor(s),
  crypt: s => genCrypt(s * 7 + 3),
  fen: s => genFen(s * 13 + 5),
  barrow: s => genDungeon({ id: 'barrow', name: 'Old Barrow', seed: s * 17 + 1, size: 60, rooms: 10, dark: 0.75, theme: 'barrow', lo: 3, hi: 6, packs: PACKS_MID, chests: 0.55, up: { to: 'moor', name: 'Ashen Moor' }, lantern: 'Barrow Mouth' }),
  cata1: s => genDungeon({ id: 'cata1', name: 'Bone Catacombs I', seed: s * 19 + 7, size: 90, rooms: 18, dark: 0.82, theme: 'bone', lo: 10, hi: 13, packs: PACKS_BONE, up: { to: 'fen', name: 'Drowned Fen' }, down: { to: 'cata2', name: 'Bone Catacombs II' }, lantern: 'Ossuary Stair' }),
  cata2: s => genDungeon({ id: 'cata2', name: 'Bone Catacombs II', seed: s * 23 + 11, size: 84, rooms: 16, dark: 0.85, theme: 'bone', lo: 13, hi: 15, packs: PACKS_BONE, up: { to: 'cata1', name: 'Bone Catacombs I' }, lantern: 'Marrow Deep', boss: { type: 'matron', lvl: 16 } })
};
