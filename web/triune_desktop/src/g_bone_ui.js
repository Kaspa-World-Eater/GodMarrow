
// =================================================================== OSSUMANCER: sprites, rendering, HUD and army orders
Object.assign(PAL, { c: '#8e2630', v: '#b8ae94', u: '#f4efe2', G: '#16141a', H: '#b8ae94', E: '#9fe8ff' });
// the Ossurarch: a knight in carved ivory plate, crested helm, heraldic tabard
SPR.ossu = sprite([
  '.....KK.....',
  '....KuuK....',
  '...KbWWbK...',
  '..KbWWWWbK..',
  '..KWKKKKWK..',
  '..KbWyyWbK..',
  '.KKKbbbbKKK.',
  'KuWKcWWcKWuK',
  'KbWKcccWKWbK',
  'KbbKWccWKbbK',
  '.KKKcWWcKKK.',
  '..KhvccvhK..',
  '..KbbvvbbK..',
  '..KbbKKbbK..',
  '..KWbK.KbWK.',
  '..KWbK.KbWK.',
  '.KKKK..KKKK.'
]);
SPR.skel = sprite([
  '...KKK......',
  '..KWWWK.....',
  '..KWKWK...K.',
  '..KWWWK..KuK',
  '...KWK...KuK',
  '.KKWWWKK.KuK',
  'KW.WKW.WKuK.',
  'KW.WWW.WKK..',
  '.K.WKW.K.y..',
  '...WWW......',
  '...KWK......',
  '..KW.WK.....',
  '..KW.WK.....',
  '..KW.WK.....',
  '.KKK.KKK....'
]);
SPR.skelArcher = sprite([
  '...KKK...w..',
  '..KWWWK..Kw.',
  '..KEKEK..K.w',
  '..KWWWK..K.w',
  '...KWK...K.w',
  '.KKWWWKKKK.w',
  'KW.HGH.W.K.w',
  'KW.WHW.W.K.w',
  '.K.GHG.K.Kw.',
  '...WGW...w..',
  '...KWK......',
  '..KW.WK.....',
  '..KW.WK.....',
  '..KW.WK.....',
  '.KKK.KKK....'
]);
SPR.colossus = sprite([
  '.....KKKKK......',
  '....KuWWWuK.....',
  '...KWWWWWWWK....',
  '...KWKKWKKWK....',
  '...KWKEWKEWK....',
  '...KWWWKWWWK....',
  '....KWKWKWK.....',
  '..KKKKWWWKKKK...',
  '.KuWWKWWWKWWuK..',
  'KWW.KWHWHWK.WWK.',
  'KW..KHGHGHK..WK.',
  'KW..KWHWHWK..WK.',
  'KW..KHGHGHK..WK.',
  'KWK..KWKWK..KWK.',
  '.KK..KWWWK...KK.',
  '....KWWKWWK.....',
  '....KWK.KWK.....',
  '....KWK.KWK.....',
  '....KWK.KWK.....',
  '...KWWK.KWWK....',
  '...KKKK.KKKK....'
]);
SPR.skelDim = tint(SPR.skel, '#5a5563', 0.5);
// v0.16: the dead are not clean. Every ribcage is still packed with meat, and the eyes are embers
SPR.skelBare = sprite(['...KKK......', '..KWWWK.....', '..KEKEK.....', '..KWWWK.....', '...KWK......', '.KKWWWKK....', 'KW.HGH.WK...', 'KW.WHW.WK...', '.K.GHG.K....', '...WGW......', '...KWK......', '..KW.WK.....', '..KW.WK.....', '..KW.WK.....', '.KKK.KKK....']);
// a skeleton's weapon, drawn by hand so the loadout shows and swings
function drawSkelWeapon(e, r, sink) {
  const f = e.face, hx = f > 0 ? r.x + 9 : r.x + 2, hy = r.y + 7 + sink, sw = e.swingT > 0 ? e.swingT / 0.2 : 0;
  const px = (x, y, c, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const W = '#e8e2d0', U = '#f4efe2', B = '#b8ae94', K = '#0e0d12', R = '#8e2630';
  if (e.load === 'shield') {
    for (let i = 0; i < 5; i++) px(hx + f * (sw * i * 0.8), hy - 1 - i + sw * i, U);
    const sx = f > 0 ? r.x - 1 : r.x + r.w - 5; px(sx, hy - 2, K, 5, 7); px(sx + 1, hy - 1, B, 3, 5); px(sx + 2, hy - 1, R, 1, 5);
  } else if (e.load === 'greatsword') {
    for (let i = 0; i < 9; i++) { const a = -1.1 + sw * 2.2; px(hx + f * Math.cos(a) * i, hy + Math.sin(a) * i, i < 2 ? '#5a4330' : U); }
  } else if (e.load === 'halberd') {
    const a = -1.35 + sw * 0.9, tx = hx + f * Math.cos(a) * 12, ty = hy + Math.sin(a) * 12;
    for (let i = -3; i < 12; i++) px(hx + f * Math.cos(a) * i, hy + Math.sin(a) * i, '#5a4330');
    px(tx - (f > 0 ? 0 : 2), ty - 1, U, 3, 3); px(tx + f * 2, ty + 1, W, 1, 2);
  } else if (e.load === 'mage') {
    for (let i = -2; i < 11; i++) px(hx + f * 0.2 * i, hy - i + (sw ? 1 : 0), '#5a4330');
    const glowK = 0.6 + 0.4 * Math.sin(G.time * 6 + e.x); px(hx + f * 2 - 1, hy - 12, '#b48ad9', 3, 3); px(hx + f * 2, hy - 11, glowK > 0.8 ? '#ffffff' : '#e8d6ff');
  } else if (e.load === 'flail') {
    for (let i = 0; i < 4; i++) px(hx + f * i * 0.5, hy - i, '#5a4330');
    const bx = hx + f * (2 + sw * 4), by = hy - 4 + (sw ? -2 : 4);
    for (let t = 0; t < 1; t += 0.25) px(hx + f * 2 + (bx - hx - f * 2) * t, hy - 4 + (by - hy + 4) * t, B);
    px(bx - 1, by - 1, K, 3, 3); px(bx, by, W);
  }
}
function drawScaled(s, x, y, face, flash, k, alpha = 1, lift = 0) {
  const p = iso(x, y), img = (flash && OPT.flash) ? (face < 0 ? s.flf : s.fl) : (face < 0 ? s.f : s.c);
  const w = Math.round(s.w * k), h = Math.round(s.h * k), rx = Math.round(p.sx - w / 2), ry = Math.round(p.sy + 3 - h - lift);
  if (alpha !== 1) ctx.globalAlpha = alpha;
  if (s === SPR.colossus && G.colossus) { const r = drawGiant('colossus', s, G.colossus, x, y, face, flash, alpha, k, lift); ctx.globalAlpha = 1; return r; }
  if (x === P.x && y === P.y && s === SPR.ossu) { const r = drawHero(s, x, y, face, flash, alpha, lift, k); ctx.globalAlpha = 1; return r; }
  ctx.drawImage(img, rx, ry, w, h); ctx.globalAlpha = 1;
  return { x: rx, y: ry, w, h };
}
const hostScale = () => P.host ? 1 + 0.1 * Math.min(10, P.host.n) : 1;
function drawOssu(alpha, lift) {
  const k = hostScale(), r = drawScaled(SPR.ossu, P.x, P.y, P.face, P.hurt > 0, k, alpha, lift);
  if (P.host) {
    // skeletons worn as armor: ribs over the shoulders, skulls at the belt
    const n = Math.min(8, P.host.n);
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1, row = Math.floor(i / 2), sx = r.x + r.w / 2 + side * (r.w / 2 - 1), sy = r.y + 6 * k + row * 3 * k;
      ctx.fillStyle = '#0e0d12'; ctx.fillRect(Math.round(sx) - 2, Math.round(sy) - 1, 4, 3);
      ctx.fillStyle = '#f4efe2'; ctx.fillRect(Math.round(sx) - 1, Math.round(sy), 2, 1); ctx.fillRect(Math.round(sx + side * 2), Math.round(sy - 2), 1, 2);
    }
    // bone grows out along the weapon arm: a long jagged blade
    const f = P.face, hx = r.x + r.w / 2 + f * r.w * 0.45, hy = r.y + r.h * 0.55, L = 5 + 2.2 * Math.min(8, P.host.n), sw = P.swing > 0 ? -1.2 + 2.4 * (1 - P.swing / 0.22) : -0.5;
    const dx = Math.cos(sw) * f, dy = Math.sin(sw);
    ctx.strokeStyle = '#0e0d12'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + dx * L, hy + dy * L); ctx.stroke();
    ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = '#f4efe2'; for (let i = 3; i < L; i += 3) ctx.fillRect(Math.round(hx + dx * i - dy * f * 2), Math.round(hy + dy * i + dx * f * 0 - 2), 1, 2);
  }
  return r;
}
function drawColossusWeapon(c, p, k) {
  const f = c.face, hx = p.sx + f * 9 * k, hy = p.sy - 9 * k;
  let ang = -0.9, kk = -1;
  if (c.atk) { kk = c.atk.t / c.atk.dur; ang = kk < 0.5 ? -0.9 - 1.3 * (kk / 0.5) : kk < 0.65 ? -2.2 + 3 * ((kk - 0.5) / 0.15) : 0.8 - 1.7 * ((kk - 0.65) / 0.35); }
  const dx = Math.cos(ang) * f, dy = Math.sin(ang), nx = -dy * f, ny = dx * f;
  const dot = (x, y, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };
  const line = (t0, t1, col, off = 0) => { for (let t = t0; t <= t1; t += 0.5) dot(hx + dx * t + nx * off, hy + dy * t + ny * off, col); };
  const L = 12 * k;
  if (kk > 0.5 && kk < 0.85) { ctx.strokeStyle = `rgba(232,226,208,${0.5 * (1 - (kk - 0.5) / 0.35)})`; ctx.lineWidth = 2; ctx.beginPath(); if (f > 0) ctx.arc(hx, hy, L, -2.2, ang); else ctx.arc(hx, hy, L, Math.PI + 2.2, Math.PI - ang, true); ctx.stroke(); ctx.lineWidth = 1; }
  const w = P.cweapon;
  if (w === 'scythe') { line(-2, L, '#cfc6ae'); for (let o = 0; o <= 7 * k; o += 0.5) dot(hx + dx * L + nx * o - dx * o * 0.4, hy + dy * L + ny * o - dy * o * 0.4, o > 6 * k - 1 ? '#f4efe2' : '#b8ae94'); }
  else if (w === 'swords') { line(-1, L, '#e8e2d0'); line(-1, L * 0.85, '#b8ae94', 2.5); }
  else if (w === 'flail') { line(-1, 5, '#cfc6ae'); const ex = hx + dx * 5, ey = hy + dy * 5, a2 = c.atk && kk > 0.4 ? ang - 0.5 : 1.4, bx = ex + Math.cos(a2) * f * 9 * k, by = ey + Math.sin(a2) * 9 * k; for (let t = 0; t <= 1; t += 0.12) dot(ex + (bx - ex) * t, ey + (by - ey) * t, t * 8 % 2 < 1 ? '#e8e2d0' : '#8f8a7c'); ctx.fillStyle = '#0e0d12'; ctx.fillRect(Math.round(bx) - 3, Math.round(by) - 3, 6, 6); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(Math.round(bx) - 2, Math.round(by) - 2, 4, 4); ctx.fillStyle = '#0e0d12'; ctx.fillRect(Math.round(bx) - 1, Math.round(by) - 1, 1, 1); ctx.fillRect(Math.round(bx) + 1, Math.round(by) - 1, 1, 1); }
  else if (w === 'shield') { line(-1, L * 0.6, '#cfc6ae'); const sx = p.sx - f * 9 * k, sy = p.sy - 16 * k; ctx.fillStyle = '#0e0d12'; ctx.fillRect(Math.round(sx - 4 * k), Math.round(sy), Math.round(8 * k), Math.round(12 * k)); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(Math.round(sx - 3 * k), Math.round(sy + 1), Math.round(6 * k), Math.round(10 * k)); ctx.fillStyle = '#8e2630'; ctx.fillRect(Math.round(sx - 0.5 * k), Math.round(sy + 2), Math.max(1, Math.round(k)), Math.round(8 * k)); ctx.fillRect(Math.round(sx - 2.5 * k), Math.round(sy + 4 * k), Math.round(5 * k), Math.max(1, Math.round(k))); }
  else if (w === 'ribs') { for (let i = 0; i < 4; i++) { ctx.strokeStyle = '#e8e2d0'; ctx.beginPath(); ctx.arc(p.sx, p.sy - 10 * k, (5 + i * 1.5) * k, f > 0 ? -1.2 : Math.PI - 0.6, f > 0 ? 0.6 : Math.PI + 1.2); ctx.stroke(); } line(-1, L * 0.7, '#cfc6ae'); }
}
function boneRender(list, hoverCands) {
  if (!G.zone) return;
  // corpses being drained, rubble of fallen skeletons
  for (const s of G.bspikes) if (s.pile) list.push({ d: s.x + s.y - 0.5, f: () => { const q = iso(s.x, s.y); ctx.globalAlpha = Math.min(1, s.t * 2); ctx.fillStyle = '#cfc6ae'; for (let i = 0; i < (s.big ? 14 : 6); i++) ctx.fillRect(Math.round(q.sx - 6 + ((i * 7) % 12)), Math.round(q.sy - 1 + (i % 3)), 2, 1); ctx.globalAlpha = 1; } });
  // rib cages: ribs on the ground behind and in front
  for (const c of G.ribcages) {
    const k = Math.min(1, (c.max - c.t) / 0.15), fade = Math.min(1, c.t * 2);
    const ribs = c.small ? 5 : 9;
    for (let i = 0; i < ribs; i++) {
      const a = i / ribs * Math.PI * 2, x = c.x + Math.cos(a) * c.R, y = c.y + Math.sin(a) * c.R;
      list.push({ d: x + y, f: () => {
        const q = iso(x, y), top = iso(c.x + Math.cos(a) * c.R * 0.35, c.y + Math.sin(a) * c.R * 0.35), h = (c.small ? 9 : 16) * k;
        ctx.globalAlpha = fade; ctx.strokeStyle = '#0e0d12'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(q.sx, q.sy); ctx.quadraticCurveTo(q.sx, q.sy - h, top.sx, top.sy - h * 1.1); ctx.stroke();
        ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(q.sx, q.sy); ctx.quadraticCurveTo(q.sx, q.sy - h, top.sx, top.sy - h * 1.1); ctx.stroke(); ctx.globalAlpha = 1;
      } });
    }
    if (!c.small) { const q = iso(c.x, c.y); ctx.fillStyle = `rgba(142,38,48,${0.18 * fade})`; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, c.R * ISO_R, c.R * ISO_RY, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  // bone arms clawing up out of the ground
  for (const a of G.barms) if (a.delay <= 0) list.push({ d: a.x + a.y, f: () => {
    const q = iso(a.x, a.y), sx = Math.round(q.sx), sy = Math.round(q.sy);
    const k = a.rise > 0 ? 1 - a.rise / 0.2 : Math.min(1, a.life / 0.4), h = Math.round(6 * k);
    const sway = Math.sin(G.time * 3 + a.seed) * 0.8 + a.lean * 1.2 + (a.grab ? Math.sin(G.time * 18) : 0), tx = Math.round(sx + sway);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(sx - 3, sy, 6, 1); ctx.fillStyle = '#4a4236'; ctx.fillRect(sx - 2, sy - 1, 4, 1);
    if (h <= 0) return;
    ctx.strokeStyle = '#0e0d12'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, sy - h); ctx.stroke(); ctx.lineWidth = 1;
    ctx.strokeStyle = '#e8e2d0'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, sy - h); ctx.stroke();
    ctx.fillStyle = '#cfc6ae'; ctx.fillRect(Math.round(sx + sway * 0.5) - 1, sy - Math.round(h * 0.5), 3, 1);
    // the hand: splayed fingers, curling when something is caught
    const curl = a.grab ? 1 : 0;
    ctx.fillStyle = '#f4efe2'; ctx.fillRect(tx - 1, sy - h - 1, 3, 2);
    [[-2, -3 + curl], [-1, -4 + curl], [1, -4 + curl], [2, -3 + curl], [3, -1]].forEach(([fx, fy]) => ctx.fillRect(tx + fx, sy - h + fy, 1, 2 - curl));
  } });
  // skeletons
  for (const e of G.skels) list.push({ d: e.x + e.y, f: () => {
    shadow(e.x, e.y, e.r);
    if (aU('o_pyredead') && e.rise <= 0) { const q = iso(e.x, e.y); ctx.globalCompositeOperation = 'lighter'; glow(q.sx, q.sy - 8, 12, '255,140,50', 0.45 + 0.15 * Math.sin(G.time * 17 + e.x)); ctx.globalCompositeOperation = 'source-over'; if (Math.random() < 0.6) parts.push({ x: e.x + rand(-0.15, 0.15), y: e.y + rand(-0.15, 0.15), z: 4 + Math.random() * 10, vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), vz: 14 + Math.random() * 10, t: 0.35 + Math.random() * 0.2, col: Math.random() < 0.5 ? '#ff9a3c' : '#ffd070' }); }
    const risek = e.rise > 0 ? 1 - e.rise / 0.45 : 1, s = e.load === 'bow' ? SPR.skelArcher : SPR.skelBare;
    const tele = false;
    const q = iso(e.x, e.y), sink = Math.round((1 - risek) * 22);
    ctx.save(); ctx.beginPath(); ctx.rect(q.sx - 18, q.sy - 34, 36, 37); ctx.clip();
    const r = drawSkel16(e, e.hurt > 0, sink);
    ctx.restore();
    if (e.hp < e.max) { ctx.fillStyle = '#0e0d12'; ctx.fillRect(r.x + 1, r.y - 3, 10, 2); ctx.fillStyle = '#cfc6ae'; ctx.fillRect(r.x + 1, r.y - 3, Math.round(10 * e.hp / e.max), 2); }
  } });
  // the Colossus
  if (G.colossus) { const c = G.colossus; list.push({ d: c.x + c.y, f: () => {
    const k = 1.15 + 0.07 * Math.min(12, c.n) + c.grow * 0.4, p = iso(c.x, c.y);
    shadow(c.x, c.y, c.r * 1.1);
    const flash = c.hurt > 0 && OPT.flash;
    const lz = c.z || 0, r = drawScaled(SPR.colossus, c.x, c.y, c.face, flash, k, 1, lz);
    drawColossusWeapon(c, { sx: p.sx, sy: p.sy - lz }, k);
    hoverCands.push({ kind: 'minion', ref: c, rect: { x: r.x, y: r.y, w: r.w, h: r.h }, d: c.x + c.y + 4 });
    ctx.fillStyle = '#0e0d12'; ctx.fillRect(r.x + 2, r.y - 4, r.w - 4, 2); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(r.x + 2, r.y - 4, Math.round((r.w - 4) * clamp(c.hp / c.max, 0, 1)), 2);
    txt(String(c.n), r.x + r.w / 2, r.y - 7, '#cfc6ae', 'center', false);
  } }); }
  // the shard aura: slivers of bone orbiting the Ossurarch
  if (isBone() && !P.dead) {
    const n = Math.round(18 * P.shards / Math.max(1, D.shardCap)), R = 0.62 * hostScale();
    for (let i = 0; i < n; i++) {
      const a = G.time * 1.7 + i / Math.max(1, n) * Math.PI * 2, x = P.x + Math.cos(a) * R, y = P.y + Math.sin(a) * R, z = 7 + Math.sin(G.time * 3 + i) * 2;
      list.push({ d: x + y + 0.02, f: () => {
        const q = iso(x, y), sx = Math.round(q.sx), sy = Math.round(q.sy - z * hostScale()), vert = (i + Math.floor(G.time * 4)) % 3 === 0;
        ctx.fillStyle = '#0e0d12'; ctx.fillRect(sx - 1, sy - 1, vert ? 3 : 4, vert ? 4 : 3);
        ctx.fillStyle = '#f4efe2'; ctx.fillRect(sx, sy, vert ? 1 : 2, vert ? 2 : 1);
      } });
    }
  }
  for (const b of G.bmotes) list.push({ d: b.x + b.y + 0.03, f: () => { const q = iso(b.x, b.y); if (!b.vis && b.rise > 0) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(Math.round(q.sx) - 2, Math.round(q.sy), 4, 1); } ctx.fillStyle = '#0e0d12'; ctx.fillRect(Math.round(q.sx) - 1, Math.round(q.sy - b.z) - 1, 4, 3); ctx.fillStyle = '#f4efe2'; ctx.fillRect(Math.round(q.sx), Math.round(q.sy - b.z), 2, 1); } });
  // bone spears
  for (const s of G.bspears) list.push({ d: s.x + s.y + 0.05, f: () => {
    const q = iso(s.x, s.y), dx = (s.vx - s.vy) * 0.5, dy = (s.vx + s.vy) * 0.25, l = Math.hypot(dx, dy) || 1, L = s.small ? 5 : 11, sx = q.sx, sy = q.sy - 8;
    ctx.strokeStyle = '#0e0d12'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - dx / l * L, sy - dy / l * L); ctx.stroke();
    ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - dx / l * L, sy - dy / l * L); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(sx), Math.round(sy) - 1, 2, 2);
  } });
  for (const s of G.barrows) list.push({ d: s.x + s.y, f: () => { const q = iso(s.x, s.y), dx = (s.vx - s.vy) * 0.5, dy = (s.vx + s.vy) * 0.25, l = Math.hypot(dx, dy) || 1; ctx.strokeStyle = '#e8e2d0'; ctx.beginPath(); ctx.moveTo(q.sx, q.sy - 7); ctx.lineTo(q.sx - dx / l * 5, q.sy - 7 - dy / l * 5); ctx.stroke(); } });
  // spikes bursting out
  for (const s of G.bspikes) if (!s.pile) {
    const k = 1 - s.t / 0.5, grow = Math.min(1, k * 5), x2 = s.x + Math.cos(s.a) * s.len * grow, y2 = s.y + Math.sin(s.a) * s.len * grow;
    list.push({ d: x2 + y2, f: () => { const a = iso(s.x, s.y), b = iso(x2, y2); ctx.globalAlpha = Math.min(1, s.t * 4); ctx.strokeStyle = '#0e0d12'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a.sx, a.sy - 6); ctx.lineTo(b.sx, b.sy - 3); ctx.stroke(); ctx.strokeStyle = '#f4efe2'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.sx, a.sy - 6); ctx.lineTo(b.sx, b.sy - 3); ctx.stroke(); ctx.globalAlpha = 1; } });
  }
  // orders on the ground
  if (G.cmd) { const o = G.cmd.ref || G.cmd.pt, q = iso(o.x, o.y); ctx.strokeStyle = `rgba(232,226,208,${0.4 + 0.25 * Math.sin(G.time * 8)})`; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, 9, 4.5, 0, 0, Math.PI * 2); ctx.stroke(); if (G.cmd.pt) { ctx.fillStyle = '#e8e2d0'; ctx.fillRect(Math.round(q.sx), Math.round(q.sy) - 7, 1, 7); ctx.fillStyle = '#8e2630'; ctx.fillRect(Math.round(q.sx) + 1, Math.round(q.sy) - 7, 4, 3); } }
  if (G.colossus && G.colossus.order) { const o = G.colossus.order, q = iso(o.x, o.y); ctx.strokeStyle = 'rgba(232,226,208,0.45)'; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, 11, 5.5, 0, 0, Math.PI * 2); ctx.stroke(); }
  if (P.sweepFx > 0) { const q = iso(P.x, P.y), k = 1 - P.sweepFx / 0.3, R = 1.6 + (P.host ? 0.06 * P.host.n : 0); ctx.strokeStyle = `rgba(244,239,226,${0.9 * (1 - k)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(q.sx, q.sy - 6, R * ISO_R, R * ISO_RY, 0, k * 6, k * 6 + 4.5); ctx.stroke(); ctx.lineWidth = 1; }
  if (P.fusing && !P.hostChan && G.colossus) { const a = iso(P.x, P.y), b = iso(G.colossus.x, G.colossus.y); ctx.strokeStyle = `rgba(232,226,208,${0.3 + 0.2 * Math.sin(G.time * 16)})`; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(a.sx, a.sy - 8); ctx.lineTo(b.sx, b.sy - 14); ctx.stroke(); ctx.setLineDash([]); }
}
function boneLight() {
  if (G.colossus) { const p = iso(G.colossus.x, G.colossus.y); lightHole(p.sx, p.sy - 14, 30, 0.5); }
  for (const c of G.ribcages) { const p = iso(c.x, c.y); lightHole(p.sx, p.sy - 6, 18, 0.35); }
}
// HUD: shard pips instead of wisp pips
function drawShardRow() {
  // the aura gauge: shards | empty | held by minions
  const cap = Math.max(1, D.shardCap), have = Math.floor(P.shards), resv = reservedShards(), GW = 116, gx = 68, gy = HUD_Y + 12;
  ctx.fillStyle = '#0a090d'; ctx.fillRect(gx - 1, gy - 1, GW + 2, 7);
  ctx.fillStyle = '#211f27'; ctx.fillRect(gx, gy, GW, 5);
  const fw = Math.round(GW * clamp(P.shards / cap, 0, 1)), rw = Math.round(GW * clamp(resv / cap, 0, 1));
  ctx.fillStyle = '#e8e2d0'; ctx.fillRect(gx, gy, fw, 5); ctx.fillStyle = '#f4efe2'; ctx.fillRect(gx, gy, fw, 1);
  if (rw) { ctx.fillStyle = '#6d6554'; ctx.fillRect(gx + GW - rw, gy, rw, 5); ctx.fillStyle = '#0a090d'; for (let k = 1; k * BS.skelCost() < resv; k++) ctx.fillRect(gx + GW - Math.round(GW * k * BS.skelCost() / cap), gy, 1, 5); }
  if (inFlight() > 0.5) { ctx.fillStyle = 'rgba(244,239,226,0.35)'; ctx.fillRect(gx + fw, gy + 1, Math.min(GW - fw - rw, Math.round(GW * inFlight() / cap)), 3); }
  // v0.52: no separate marrow strip: Marrow is the name of the Ossuarch's mana orb
  uiButton(66, HUD_Y + 10, 120, 9, () => { G.panels.army = !G.panels.army; });
  if (inRect(mouse, 66, HUD_Y + 10, 120, 9) && !G.panels.army) tooltip = [['Shard aura', '#e8e2d0'], [`${have} shards · ${resv} held by your army · ${Math.max(0, cap - resv - have)} empty`, '#a39d8c'], [`Turns aside ${Math.round(BS.dr() * 100)}% of every blow`, '#a39d8c'], [`Marrow (the thin bar): ${Math.floor(P.marrow || 0)}/${BS.marrowCap()}, raises your skeletons`, '#9a7a4a'], ['Hold Shard Aura to pull bone faster', '#6f6a79'], ['Click or press V for army orders', '#6f6a79']];
  const wl = `${have}/${freeCap()} shards`;
  txt(wl, 68, HUD_Y + 26, '#a39d8c');
  txt(`Lv ${P.level}`, 68 + tw(wl) + 8, HUD_Y + 26, '#d9a441');
}
function boneHudText() {
  let y = 22;
  if (P.host) { const h = P.host, k = clamp((h.pool - (h.n - 1) * BS.hostPer()) / BS.hostPer(), 0, 1); txt(`BONE HOST · ${h.n}/${BS.hostMax()}`, 8, y, '#e8e2d0'); ctx.fillStyle = '#0e0d12'; ctx.fillRect(100, y - 6, 42, 4); ctx.fillStyle = '#cfc6ae'; ctx.fillRect(101, y - 5, Math.round(40 * k), 2); y += 10; }
  if (P.fusing) { txt(P.hostChan ? `CHANNELING ONTO YOU · ${P.host ? P.host.n : 0}/${BS.hostMax()}` : `FUSING · ${G.colossus ? G.colossus.n : 0}/${BS.colMax()}`, 8, y, '#e8e2d0'); y += 10; }
  y = Math.max(y, 30);
  if (P.skills.raise > 0) { txt(`Skeletons ${G.skels.length}/${BS.skelMax()}`, 8, y, '#cfc6ae'); y += 10; }
  if (G.colossus) { const c = G.colossus; txt(`Colossus ${Math.ceil(c.hp)}/${Math.round(c.max)} · ${c.n} bones · ${CWEAPON_NAMES[P.cweapon]}`, 8, y, '#cfc6ae'); y += 10; }

}
// army orders: three squads (count, loadout, orders) and the Colossus (loadout, orders)
function drawArmy() {
  const p = GB, tab = G.armyTab || 0, isCol = tab === 3;
  gothicBg(p, true);
  ctx.strokeStyle = '#3a3446'; ctx.strokeRect(p.x + .5, p.y + .5, p.w - 1, p.h - 1);
  ctx.font = TITLE_FONT; ctx.textAlign = 'left'; ctx.fillStyle = '#e8e2d0'; ctx.fillText('Army orders', p.x + 8, p.y + 16);
  txt(`${G.skels.length}/${BS.skelMax()} standing`, p.x + p.w - 18, p.y + 12, '#8f8a7c', 'right', false);
  txt('x', p.x + p.w - 10, p.y + 12, '#6f6a79'); uiButton(p.x + p.w - 14, p.y + 4, 12, 12, () => { G.panels.army = false; });
  // tabs
  ['Squad I', 'Squad II', 'Squad III', 'Colossus'].forEach((name, i) => {
    const bx = p.x + 5 + i * 56, by = p.y + 22, on = tab === i;
    ctx.fillStyle = on ? '#3a3446' : '#1b1920'; ctx.fillRect(bx, by, 54, 13);
    if (on) { ctx.fillStyle = '#d9a441'; ctx.fillRect(bx, by + 12, 54, 1); }
    const sub = '';
    txt(name + sub, bx + 27, by + 9, on ? '#e8e2d0' : '#a39d8c', 'center', false);
    uiButton(bx, by, 54, 13, () => { G.armyTab = i; });
  });
  const S = isCol ? null : P.squads[tab], B = isCol ? P.sbeh : S.beh;
  // behavior grid
  const gx = p.x + 22, gy = p.y + 52, cs = 14;
  txt('ATTACK', gx + cs * 2.5, gy - 3, '#c8553d', 'center', false);
  txt('GUARD', gx + cs * 2.5, gy + cs * 5 + 8, '#5c86d6', 'center', false);
  txt('CLOSE', gx - 3, gy + cs * 5 + 16, '#6f6a79', 'left', false); txt('ROAM', gx + cs * 5 + 3, gy + cs * 5 + 16, '#6f6a79', 'right', false);
  for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 5; xx++) {
    const cx = gx + xx * cs, cy = gy + yy * cs, on = B.x === xx && 4 - B.y === yy, agg = (4 - yy) / 4;
    ctx.fillStyle = `rgb(${24 + agg * 40},${22 + xx * 2},${30 + (1 - agg) * 30})`; ctx.fillRect(cx, cy, cs - 1, cs - 1);
    if (on) { ctx.fillStyle = '#f4efe2'; ctx.fillRect(cx + 4, cy + 3, 5, 4); ctx.fillStyle = '#0e0d12'; ctx.fillRect(cx + 5, cy + 4, 1, 1); ctx.fillRect(cx + 7, cy + 4, 1, 1); ctx.fillStyle = '#f4efe2'; ctx.fillRect(cx + 6, cy + 8, 1, 3); ctx.strokeStyle = '#d9a441'; ctx.strokeRect(cx - .5, cy - .5, cs, cs); }
    uiButton(cx, cy, cs - 1, cs - 1, () => { B.x = xx; B.y = 4 - yy; });
  }
  const tx = p.x + 112;
  // count
  if (!isCol) {
    const y = p.y + 44, total = P.squads.reduce((a, s) => a + s.n, 0), mx = BS.skelMax();
    txt(`Keep ${S.n}`, tx, y + 9, '#e8e2d0', 'left', false);
    smallBtn('-', tx + 46, y, () => { S.n = Math.max(0, S.n - 1); }, S.n > 0);
    smallBtn('+', tx + 60, y, () => { S.n++; }, total < mx);
    txt(`${total}/${mx}`, tx + 78, y + 9, total > mx ? '#c8553d' : '#6f6a79', 'left', false);
    if (inRect(mouse, tx, y, 118, 12)) tooltip = [['Squad size', '#e8e2d0'], [`${total} of ${mx} skeletons assigned across squads`, '#a39d8c'], ['Each skeleton holds 5 shards of your aura.', '#a39d8c'], ['Squads fill in order: I, then II, then III.', '#a39d8c']];
  } else {
    txt(G.colossus ? `${G.colossus.n} skeletons fused` : 'Not raised yet', tx, p.y + 53, '#e8e2d0', 'left', false);
  }
  // loadout
  txt('LOADOUT', tx, p.y + 70, '#8f8a7c', 'left', false);
  const list = isCol ? CWEAPONS : SLOADS;
  list.forEach((wid, i) => {
    const bx = tx + i * 20, by = p.y + 74, on = isCol ? P.cweapon === wid : S.load === wid, ok = isCol || loadOk(wid);
    ctx.fillStyle = on ? '#3a3446' : '#1b1920'; ctx.fillRect(bx, by, 19, 21); if (on) { ctx.strokeStyle = '#d9a441'; ctx.strokeRect(bx + .5, by + .5, 18, 20); }
    if (!ok) ctx.globalAlpha = 0.3;
    boneIcon((isCol ? 'w_' : 's_') + wid, bx + 1, by + 1);
    ctx.globalAlpha = 1;
    if (ok) uiButton(bx, by, 19, 21, () => { if (isCol) { P.cweapon = wid; say(`The Colossus takes up the ${CWEAPON_NAMES[wid]}`, 1.2); } else { S.load = wid; rearm(); } });
    if (inRect(mouse, bx, by, 19, 21)) tooltip = isCol
      ? [[CWEAPON_NAMES[wid], '#e8e2d0'], [CWEAPON_DESC[wid], '#a39d8c'], [`x${CW[wid].mult.toFixed(2)} damage` + (CW[wid].dr ? ` · ${Math.round(CW[wid].dr * 100)}% less damage taken` : ''), '#8b95ff']]
      : [[SLOAD_NAMES[wid], '#e8e2d0'], [SLOAD_DESC[wid], '#a39d8c'], [`x${SL[wid].dmg.toFixed(2)} damage · x${SL[wid].hp.toFixed(2)} life` + (SL[wid].dr ? ` · ${Math.round(SL[wid].dr * 100)}% less damage taken` : ''), '#8b95ff']].concat(ok ? [] : [[wid === 'mage' ? 'Needs The Grave-Chanter Major Arcanum (press A)' : 'Needs The Bowyer Major Arcanum (press A)', '#c8553d']]).concat(wid === 'bow' && aR('o_bowyer') ? [['Reversed Bowyer: shots hook and drag', '#b48ad9']] : wid === 'mage' && aR('o_chanter') ? [['Reversed Chanter: mages chant, not fight', '#b48ad9']] : []);
  });
  // toggles
  [['focus', 'Attack my target'], ['hold', 'Hold position']].forEach(([k, label], i) => {
    const y = p.y + 102 + i * 14;
    ctx.fillStyle = '#0a090d'; ctx.fillRect(tx, y, 9, 9); ctx.fillStyle = B[k] ? '#d9a441' : '#2a2733'; ctx.fillRect(tx + 2, y + 2, 5, 5);
    txt(label, tx + 13, y + 8, '#e8e2d0', 'left', false);
    uiButton(tx, y, 100, 11, () => { B[k] = !B[k]; if (k === 'hold') { if (isCol) { if (G.colossus) G.colossus.hold = B.hold ? { x: G.colossus.x, y: G.colossus.y } : null; } else for (const e of G.skels) if (e.sq === tab) e.hold = B.hold ? { x: e.x, y: e.y } : null; } });
  });
  const O = { aggro: 3 + B.x * 1.6, guard: B.y <= 1 };
  const lines = [`Engages foes within ${O.aggro.toFixed(1)} yd · ` + (O.guard ? 'only what threatens you' : 'seeks any enemy'), (B.hold ? 'Holds where they stand' : 'Follows you') + ' · Command Bones overrides'];
  lines.forEach((l, i) => txt(l, p.x + 8, p.y + 154 + i * 9, '#8f8a7c', 'left', false));
}
// skill icons
function boneIcon(id, x, y) {
  const c = x + 9, m = y + 9, W = '#e8e2d0', U = '#f4efe2', B = '#b8ae94', R = '#8e2630', K = '#0e0d12';
  const f = (col, a, b, w, h) => { ctx.fillStyle = col; ctx.fillRect(x + a, y + b, w, h); };
  const skull = (a, b) => { f(W, a, b, 5, 4); f(K, a + 1, b + 1, 1, 1); f(K, a + 3, b + 1, 1, 1); f(W, a + 1, b + 4, 3, 1); };
  switch (id) {
    case 'raise': skull(6, 2); f(W, 8, 7, 1, 6); f(W, 6, 8, 5, 1); f(W, 6, 10, 5, 1); f(W, 7, 13, 1, 3); f(W, 9, 13, 1, 3); f(B, 3, 15, 12, 1); break;
    case 'shieldb': f(B, 4, 3, 9, 10); f(B, 5, 13, 7, 2); f(R, 8, 4, 2, 10); f(R, 5, 7, 8, 2); break;
    case 's_mage': f('#5a4330', 12, 3, 1, 13); f('#b48ad9', 11, 1, 3, 3); f('#ffffff', 12, 2, 1, 1); skull(3, 6); f(W, 4, 11, 3, 4); break;
    case 'mknit': skull(6, 3); f('#8e2630', 4, 10, 10, 1); f(W, 8, 8, 1, 6); f('#d9a441', 12, 12, 3, 1); f('#d9a441', 13, 11, 1, 3); break;
    case 'archers': skull(3, 3); ctx.strokeStyle = '#8f7a55'; ctx.beginPath(); ctx.arc(x + 9, m, 6, -1.2, 1.2); ctx.stroke(); f(W, 10, 9, 6, 1); break;
    case 'bburst': skull(6, 7); [[0, -7], [6, -4], [7, 3], [-6, 4], [-7, -3], [2, 7]].forEach(([a, b]) => f(U, 9 + a, 9 + b, 2, 1)); break;
    case 'command': f(B, 8, 2, 1, 14); f(R, 9, 2, 6, 4); f(R, 9, 6, 4, 1); skull(2, 10); break;
    case 'tithe': f('#5a4330', 3, 12, 12, 3); skull(6, 6); f(U, 12, 3, 2, 1); f(U, 3, 4, 1, 2); f(U, 15, 7, 1, 2); break;
    case 'colossus': skull(5, 1); f(W, 3, 6, 12, 2); f(W, 7, 8, 4, 5); f(W, 2, 8, 2, 6); f(W, 14, 8, 2, 6); f(W, 6, 13, 2, 4); f(W, 10, 13, 2, 4); break;
    case 'bulwarkC': f(W, 4, 2, 10, 12); f(R, 8, 3, 2, 10); f(R, 5, 6, 8, 2); f(B, 6, 14, 6, 2); break;
    case 'cracked': f(W, 5, 3, 8, 12); f(K, 8, 3, 1, 4); f(K, 9, 7, 1, 3); f(K, 8, 10, 1, 4); f(U, 14, 4, 2, 1); f(U, 2, 9, 2, 1); break;
    case 'legion': for (let i = 0; i < 3; i++) skull(1 + i * 6, 5 + (i % 2) * 3); f(B, 1, 15, 16, 1); break;
    case 'spear': for (let i = 0; i < 12; i++) f(i > 9 ? U : W, 3 + i, 14 - i, 1, 1); f(W, 13, 2, 3, 3); break;
    case 'splinter': for (let i = 0; i < 8; i++) f(W, 2 + i, 9, 1, 1); for (let i = 0; i < 6; i++) { f(U, 10 + i, 8 - i, 1, 1); f(U, 10 + i, 10 + i, 1, 1); } break;
    case 'impale': f(W, 8, 1, 2, 15); f(R, 4, 7, 10, 4); f(U, 8, 1, 2, 2); break;
    case 'ribcage': for (let i = 0; i < 4; i++) { ctx.strokeStyle = W; ctx.beginPath(); ctx.arc(c, y + 16, 3 + i * 2, Math.PI + 0.3, -0.3); ctx.stroke(); } f(B, 8, 3, 2, 13); break;
    case 'mdrain': for (let i = 0; i < 3; i++) { ctx.strokeStyle = W; ctx.beginPath(); ctx.arc(c, y + 16, 3 + i * 2.5, Math.PI + 0.3, -0.3); ctx.stroke(); } f(U, 13, 2, 2, 1); f(U, 3, 3, 2, 1); f(R, 8, 12, 2, 2); break;
    case 'wall': [[3, 5], [8, 2], [13, 6]].forEach(([a, b]) => { f(W, a, b + 3, 1, 14 - b); f(U, a - 1, b + 1, 3, 2); f(U, a - 2, b - 1, 1, 2); f(U, a, b - 1, 1, 2); f(U, a + 2, b - 1, 1, 2); }); f('#4a4236', 1, 16, 16, 1); break;
    case 'charnel': for (let i = 0; i < 7; i++) { const a = i * 2.4, r = 2 + i; const px = Math.round(9 + Math.cos(a) * r * 0.9), py = Math.round(10 + Math.sin(a) * r * 0.5); f(W, px, py - 3, 1, 3); f(U, px - 1, py - 4, 3, 1); } break;
    case 'spikes': f(R, 7, 7, 4, 4); [[0, -7], [6, -4], [7, 3], [0, 7], [-6, 4], [-7, -3]].forEach(([a, b]) => { for (let t = 0.3; t <= 1; t += 0.15) f(W, 9 + Math.round(a * t) - 1, 9 + Math.round(b * t) - 1, 1, 1); }); break;
    case 'bloom': [[4, 4], [12, 6], [7, 12]].forEach(([a, b]) => { f(R, a, b, 2, 2); f(W, a - 2, b, 1, 1); f(W, a + 3, b + 1, 1, 1); f(W, a, b - 2, 1, 1); f(W, a + 1, b + 3, 1, 1); }); break;
    case 'sstorm': for (let i = 0; i < 7; i++) { const a = i * 0.9, r = 2 + i; f(U, Math.round(9 + Math.cos(a) * r) - 1, Math.round(9 + Math.sin(a) * r) - 1, 2, 1); } break;
    case 'marrowm': f(W, 5, 4, 8, 10); f(R, 7, 6, 4, 6); f('#d9a441', 5, 1, 8, 2); break;
    case 'aura': f(B, 7, 5, 4, 8); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; f(U, Math.round(c + Math.cos(a) * 7) - 1, Math.round(m + Math.sin(a) * 4) - 1, 2, 1); } break;
    case 'spurs': f(B, 5, 5, 8, 8); [[9, 1], [9, 15], [1, 9], [15, 9], [3, 3], [14, 3], [3, 14], [14, 14]].forEach(([a, b]) => f(U, a, b, 1, 2)); break;
    case 'deeppull': f('#5a4330', 2, 13, 14, 3); for (let i = 0; i < 4; i++) f(U, 4 + i * 3, 11 - i * 2, 2, 1); f(B, 13, 2, 3, 4); break;
    case 'reforge': f(W, 5, 5, 8, 8); f('#c24050', 7, 7, 4, 4); f(U, 2, 3, 2, 1); f(U, 14, 4, 2, 1); break;
    case 'blade': for (let i = 0; i < 12; i++) { f(W, 3 + i, 14 - i, 1, 1); f(U, 4 + i, 14 - i, 1, 1); } f('#5a4330', 2, 14, 3, 3); break;
    case 'sweep': ctx.strokeStyle = W; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c, m, 6, 0.3, 5.2); ctx.stroke(); ctx.lineWidth = 1; f(U, 14, 4, 3, 2); break;
    case 'host': f(B, 5, 2, 8, 6); f(W, 3, 8, 12, 7); f(K, 7, 4, 1, 2); f(K, 10, 4, 1, 2); f(W, 1, 7, 2, 3); f(W, 15, 7, 2, 3); f(R, 8, 9, 2, 5); break;
    case 'everst': f(W, 6, 2, 6, 12); f(B, 4, 14, 10, 2); f('#d9a441', 6, 1, 6, 1); break;
    case 'shardskin': f(B, 6, 4, 6, 10); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; f(U, Math.round(c + Math.cos(a) * 7) - 1, Math.round(m + Math.sin(a) * 7) - 1, 2, 1); } break;
    case 'titan': f(W, 6, 2, 6, 8); f(B, 2, 14, 14, 2); for (let i = 0; i < 4; i++) f(U, 1 + i * 4, 12 - (i % 2), 2, 1); break;
    case 'gcharge': f(W, 9, 4, 6, 9); f(B, 11, 2, 4, 3); for (let i = 0; i < 3; i++) f('#8f8a7c', 1 + i * 2, 6 + i * 3, 5, 1); break;
    case 'carapm': f(W, 4, 4, 10, 11); f(B, 6, 6, 6, 7); f('#d9a441', 5, 1, 8, 2); break;
    case 'w_shield': f(W, 4, 1, 10, 12); f(W, 5, 13, 8, 2); f(R, 8, 2, 2, 12); f(R, 5, 5, 8, 2); break;
    case 'w_scythe': for (let i = 0; i < 12; i++) f(B, 4 + Math.floor(i / 3), 15 - i, 1, 1); ctx.strokeStyle = U; ctx.beginPath(); ctx.arc(x + 11, y + 6, 5, Math.PI, 0.2); ctx.stroke(); break;
    case 'w_swords': for (let i = 0; i < 11; i++) { f(W, 3 + i, 14 - i, 1, 1); f(U, 14 - i, 14 - i, 1, 1); } break;
    case 'w_flail': for (let i = 0; i < 6; i++) f(B, 3 + i, 15 - i, 1, 1); for (let i = 0; i < 4; i++) f(W, 9 + i, 9 - i, 1, 1); f(W, 11, 2, 5, 5); f(K, 12, 3, 1, 1); f(K, 14, 3, 1, 1); break;
    case 'w_ribs': for (let i = 0; i < 3; i++) { ctx.strokeStyle = W; ctx.beginPath(); ctx.arc(c, y + 16, 3 + i * 2.5, Math.PI + 0.2, -0.2); ctx.stroke(); } f(B, 8, 2, 2, 14); break;
    case 's_shield': skull(3, 2); f(W, 5, 6, 1, 8); f(B, 10, 5, 7, 9); f(R, 13, 6, 1, 7); f(R, 11, 8, 5, 1); f(U, 2, 8, 1, 1); break;
    case 's_greatsword': for (let i = 0; i < 13; i++) f(i < 3 ? '#5a4330' : U, 2 + i, 15 - i, 1, 1); f(B, 3, 11, 4, 1); break;
    case 's_halberd': for (let i = 0; i < 15; i++) f('#5a4330', 8, 2 + i, 1, 1); f(U, 9, 2, 4, 4); f(U, 6, 3, 2, 2); f(W, 8, 0, 1, 2); break;
    case 's_flail': for (let i = 0; i < 6; i++) f('#5a4330', 3 + i, 15 - i, 1, 1); for (let i = 0; i < 4; i++) f(B, 9 + i, 9 - i, 1, 1); f(W, 11, 2, 5, 5); f(K, 12, 3, 1, 1); f(K, 14, 5, 1, 1); break;
    case 's_bow': ctx.strokeStyle = '#8f7a55'; ctx.beginPath(); ctx.arc(x + 6, m, 7, -1.2, 1.2); ctx.stroke(); f(W, 8, 3, 1, 12); for (let i = 0; i < 9; i++) f(U, 5 + i, 9, 1, 1); f(U, 14, 8, 1, 3); break;
    default: if (!bloodIcon(id, x, y)) f('#3a3446', 4, 4, 10, 10);
  }
}
