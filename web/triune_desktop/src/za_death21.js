
// =================================================================== v0.21: how things die, and the numbers
// The slain topple: their last pose tips over onto the ground, then lies there darkened, bleeding into the floor
// (or scattering bone), until something raises, hatches or eats the corpse, or it fades after a minute.
// Damage numbers are chunky pixel digits with a dark rim; rapid hits on one enemy add up into a single number
// that swells as it grows, and big hits are drawn twice the size.
const BONY = { archer: 1, knight: 0, skel: 1 };
const CORPSE_LIFE = 30;   // v0.22d: the dead rot away in half a minute: they darken, sink and fall to bones, then are gone
if (!G.splats) G.splats = [];
function deathFx(m) {
  const fleshy = !BONY[m.b.spr];
  m.fall = { t: 0, dir: Math.random() < 0.5 ? -1 : 1 };
  if (fleshy) { for (let i = 0; i < 3 + (m.r > 0.35 ? 3 : 0); i++) G.splats.push({ x: m.x + rand(-0.35, 0.35), y: m.y + rand(-0.25, 0.25), r: 0.12 + Math.random() * 0.22, t: 26, seed: Math.random() * 9, col: m.b.spr === 'bloat' ? 'g' : 'r' }); }
  else for (let i = 0; i < 4; i++) G.splats.push({ x: m.x + rand(-0.4, 0.4), y: m.y + rand(-0.3, 0.3), r: 0.06, t: 45, seed: Math.random() * 9, col: 'b' });
  while (G.splats.length > 140) G.splats.shift();
  ember(m.x, m.y, 8, fleshy ? '200,40,50' : '230,220,200', 6, 1.4, 0.5);
}
function drawSplats() {
  for (const s of G.splats) {
    if (!onScreen(s.x, s.y, 20)) continue;
    const q = iso(s.x, s.y), a = Math.min(1, s.t / 8), R = s.r * ISO_R;
    if (s.col === 'b') { ctx.fillStyle = `rgba(210,200,180,${0.8 * a})`; ctx.fillRect(Math.round(q.sx), Math.round(q.sy), 2, 1); ctx.fillStyle = `rgba(120,112,100,${0.8 * a})`; ctx.fillRect(Math.round(q.sx) + 1, Math.round(q.sy) + 1, 1, 1); continue; }
    const c = s.col === 'g' ? [70, 80, 30] : [70, 8, 14];
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.75 * a})`; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, R, R * 0.5, 0, 0, 6.28); ctx.fill();
    for (let i = 0; i < 4; i++) { const an = s.seed + i * 1.7, d = R * (1 + (i % 2) * 0.5); ctx.beginPath(); ctx.ellipse(q.sx + Math.cos(an) * d, q.sy + Math.sin(an) * d * 0.5, R * 0.3, R * 0.16, 0, 0, 6.28); ctx.fill(); }
    ctx.fillStyle = `rgba(${c[0] * 2},${c[1] * 3},${c[2] * 2},${0.35 * a})`; ctx.fillRect(Math.round(q.sx - R * 0.4), Math.round(q.sy - R * 0.2), 2, 1);
  }
}
function updateDeath(dt) {
  for (const s of G.splats) s.t -= dt; G.splats = G.splats.filter(s => s.t > 0);
}
// the fallen: tips over from its last pose, then lies still
function corpsesToList(list) {
  const z = G.zone;
  for (const m of z.monsters) {
    if (!m.dead || m.hatched || m.eaten || m.burst || m.erased || m.engulfed || !MPAINT[m.b.spr]) continue;
    const age = G.time - (m.deadAt || 0); if (age > CORPSE_LIFE || !onScreen(m.x, m.y, 40)) continue;
    list.push({ d: m.x + m.y - 0.4, f: () => {
      const type = m.b.spr, [pk, pal] = monPal(m, type), fr = monFrame(type, pk, pal, 'idle', 0), p = iso(m.x, m.y), face = m.face || 1;
      const k = Math.min(1, age / 0.35), ease = 1 - (1 - k) * (1 - k), dir = (m.fall ? m.fall.dir : 1) * face, rot = clamp((age - 4) / (CORPSE_LIFE - 10), 0, 1), fade = age > CORPSE_LIFE - 6 ? Math.max(0, (CORPSE_LIFE - age) / 6) : 1;
      ctx.save(); ctx.globalAlpha = fade;
      ctx.translate(Math.round(p.sx), Math.round(p.sy) + 2); ctx.rotate(dir * ease * Math.PI / 2 * 0.92); ctx.scale(1, (1 - 0.25 * ease) * (1 - 0.45 * rot));
      ctx.filter = k >= 1 ? `brightness(${(0.62 - 0.34 * rot).toFixed(2)}) saturate(${(0.7 - 0.5 * rot).toFixed(2)}) sepia(${(0.4 * rot).toFixed(2)})` : 'none';
      ctx.drawImage(face < 0 ? fr.f : fr.c, -(face < 0 ? fr.w - fr.ox : fr.ox), -(fr.oy + 1));
      ctx.filter = 'none'; ctx.restore(); ctx.globalAlpha = 1;
    } });
  }
}
// ------------------------------------------------------------------- damage numbers
const DIGITS = { '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'], '2': ['111', '001', '111', '100', '111'], '3': ['111', '001', '011', '001', '111'], '4': ['101', '101', '111', '001', '001'], '5': ['111', '100', '111', '001', '111'], '6': ['111', '100', '111', '101', '111'], '7': ['111', '001', '010', '010', '010'], '8': ['111', '101', '111', '101', '111'], '9': ['111', '101', '111', '001', '111'] };
function dmgText(m, d, col) {
  const now = G.time;
  const t = texts.find(q => q.dmg && q.ref === m && q.col === col && now - q.born < 0.35);
  if (t) { t.val += d; t.s = String(Math.max(1, Math.round(t.val))); t.pop = 0.12; t.t = 0.9; t.born = now; t.big = t.big || t.val > m.max * 0.25; return; }
  texts.push({ dmg: true, ref: m, x: m.x, y: m.y, z: 18 + Math.random() * 4, s: String(Math.max(1, Math.round(d))), val: d, col, t: 0.9, pop: 0.12, born: now, big: d > m.max * 0.25, dx: rand(-4, 4) });
  if (texts.length > 70) texts.shift();
}
function drawDigits(s, cx, y, col, k) {
  const w = s.length * 4 - 1, x0 = Math.round(cx - w * k / 2);
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass ? col : '#0a0709';
    for (let i = 0; i < s.length; i++) { const g = DIGITS[s[i]]; if (!g) continue; for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r][c] === '1') { if (pass) ctx.fillRect(x0 + (i * 4 + c) * k, y + r * k, k, k); else { ctx.fillRect(x0 + (i * 4 + c) * k + 1, y + r * k + 1, k, k); ctx.fillRect(x0 + (i * 4 + c) * k - 1, y + r * k, k, k); } } }
  }
}
function drawTexts() {
  for (const t of texts) {
    const p = iso(t.x, t.y); ctx.globalAlpha = Math.min(1, t.t * 2.5);
    if (t.dmg) {
      const k = t.big ? 2 : 1, pop = t.pop > 0 ? 1 + t.pop * 3 : 1, col = t.big ? '#ffd870' : t.col;
      drawDigits(t.s, p.sx + (t.dx || 0), Math.round(p.sy - t.z - 5 * k), col, Math.max(1, Math.round(k * pop)));
    } else txt(t.s, Math.round(p.sx), Math.round(p.sy - t.z), t.col, 'center');
  }
  ctx.globalAlpha = 1;
}

// =================================================================== v0.21: gothic panels
// Every window is a slab of dark stone set in an iron frame: bevelled edges, riveted corner plates with a small
// skull, and a gold-lined plate for the title.
const GBG = {};
function gothicBg(p, alt) {
  const key = p.w + 'x' + p.h + (alt ? 'a' : ''); let c = GBG[key];
  if (!c) {
    c = mkCanvas(p.w, p.h); const x = c.getContext('2d'), w = p.w, h = p.h;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const n = hash(i + w, j * 3 + h), m = hash(i >> 3, j >> 2), e = Math.min(i, j, w - 1 - i, h - 1 - j), edge = e < 14 ? 0.72 + e * 0.02 : 1;
      const k = (0.92 + (m - 0.5) * 0.14 + (n > 0.93 ? 0.1 : n < 0.06 ? -0.1 : 0)) * edge;
      x.fillStyle = alt ? rgbHex(14 * k, 13 * k, 19 * k) : rgbHex(19 * k, 17 * k, 23 * k); x.fillRect(i, j, 1, 1);
    }
    // iron frame
    x.fillStyle = '#050407'; x.fillRect(0, 0, w, 1); x.fillRect(0, h - 1, w, 1); x.fillRect(0, 0, 1, h); x.fillRect(w - 1, 0, 1, h);
    x.fillStyle = '#4e4858'; x.fillRect(1, 1, w - 2, 1); x.fillRect(1, 1, 1, h - 2);
    x.fillStyle = '#2c2834'; x.fillRect(1, h - 2, w - 2, 1); x.fillRect(w - 2, 1, 1, h - 2);
    x.fillStyle = '#3a3644'; x.fillRect(2, 2, w - 4, 1); x.fillRect(2, 2, 1, h - 4); x.fillRect(2, h - 3, w - 4, 1); x.fillRect(w - 3, 2, 1, h - 4);
    x.fillStyle = '#0a090d'; x.fillRect(3, 3, w - 6, 1); x.fillRect(3, 3, 1, h - 6); x.fillRect(3, h - 4, w - 6, 1); x.fillRect(w - 4, 3, 1, h - 6);
    // studs along the frame
    for (let i = 14; i < w - 14; i += 18) for (const yy of [1, h - 3]) { x.fillStyle = '#6e6a7a'; x.fillRect(i, yy, 2, 2); x.fillStyle = '#a8a4b4'; x.fillRect(i, yy, 1, 1); }
    // corner plates with a little skull
    for (const [cx, cy] of [[0, 0], [w - 9, 0], [0, h - 9], [w - 9, h - 9]]) {
      x.fillStyle = '#050407'; x.fillRect(cx, cy, 9, 9); x.fillStyle = '#3e3a48'; x.fillRect(cx + 1, cy + 1, 7, 7); x.fillStyle = '#5a5664'; x.fillRect(cx + 1, cy + 1, 7, 1); x.fillRect(cx + 1, cy + 1, 1, 7);
      x.fillStyle = '#cfc6ae'; x.fillRect(cx + 3, cy + 2, 3, 3); x.fillRect(cx + 3, cy + 5, 3, 1); x.fillStyle = '#0a090d'; x.fillRect(cx + 3, cy + 3, 1, 1); x.fillRect(cx + 5, cy + 3, 1, 1); x.fillRect(cx + 4, cy + 5, 1, 1);
    }
    GBG[key] = c;
  }
  ctx.drawImage(c, p.x, p.y);
}
function titlePlate(p, title) {
  ctx.font = TITLE_FONT; const w = Math.min(p.w - 30, ctx.measureText(title).width + 30), x = Math.round(p.x + p.w / 2 - w / 2), y = p.y + 6;
  ctx.fillStyle = '#0a090d'; ctx.fillRect(x, y, w, 17); ctx.fillStyle = '#1e1a24'; ctx.fillRect(x + 1, y + 1, w - 2, 15);
  ctx.fillStyle = '#8a6a2a'; ctx.fillRect(x + 3, y + 3, w - 6, 1); ctx.fillRect(x + 3, y + 13, w - 6, 1); ctx.fillStyle = '#d9a441'; ctx.fillRect(x + 3, y + 3, 4, 1); ctx.fillRect(x + w - 7, y + 13, 4, 1);
  ctx.fillStyle = '#d9a441'; ctx.fillRect(x - 3, y + 7, 3, 3); ctx.fillRect(x + w, y + 7, 3, 3);
}

// =================================================================== v0.21: the title scene
// Behind the title screen: a ruined cathedral under a sick moon marked with the Triune's broken sigil, a
// graveyard in the foreground, fog rolling through, ash falling, crows crossing, and far lightning.
let TITLE_BG = null;
function buildTitleBg() {
  const c = mkCanvas(W, H), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#07060c'); g.addColorStop(0.55, '#1a1426'); g.addColorStop(0.8, '#2a1a24'); g.addColorStop(1, '#0a080c'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  // the moon, and the sigil of the broken Triune cut into it
  const mx = 330, my = 70;
  const mg = x.createRadialGradient(mx, my, 10, mx, my, 110); mg.addColorStop(0, 'rgba(220,210,190,0.25)'); mg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = mg; x.fillRect(0, 0, W, H);
  x.fillStyle = '#d8cfb8'; x.beginPath(); x.arc(mx, my, 30, 0, 6.28); x.fill();
  for (let i = 0; i < 40; i++) { const a = hash(i, 3) * 6.28, r = hash(i, 5) * 26; x.fillStyle = `rgba(150,140,120,${0.2 + hash(i, 7) * 0.3})`; x.beginPath(); x.arc(mx + Math.cos(a) * r, my + Math.sin(a) * r, 1 + hash(i, 9) * 4, 0, 6.28); x.fill(); }
  x.strokeStyle = 'rgba(90,20,30,0.7)'; x.lineWidth = 1.5; for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 3; x.beginPath(); x.arc(mx + Math.cos(a) * 9, my + Math.sin(a) * 9, 11, 0, 6.28); x.stroke(); }
  x.lineWidth = 1;
  // far hills
  x.fillStyle = '#120e18'; x.beginPath(); x.moveTo(0, 190); for (let i = 0; i <= W; i += 12) x.lineTo(i, 172 + Math.sin(i * 0.02) * 10 + Math.sin(i * 0.07) * 4); x.lineTo(W, H); x.lineTo(0, H); x.fill();
  // the ruined cathedral: nave, a broken spire, flying buttresses, a rose window
  const K = '#08070b'; x.fillStyle = K;
  x.fillRect(300, 120, 120, 80); x.fillRect(290, 150, 140, 50);
  x.beginPath(); x.moveTo(300, 120); x.lineTo(360, 92); x.lineTo(420, 120); x.fill();
  x.fillRect(318, 60, 22, 70); x.beginPath(); x.moveTo(316, 62); x.lineTo(329, 22); x.lineTo(342, 62); x.fill();
  x.fillRect(392, 76, 18, 50); x.beginPath(); x.moveTo(390, 78); x.lineTo(396, 58); x.lineTo(401, 66); x.lineTo(405, 52); x.lineTo(412, 78); x.fill();   // the broken spire
  for (let i = 0; i < 4; i++) { const bx = 290 - i * 10; x.beginPath(); x.moveTo(bx, 200); x.lineTo(bx + 4, 200); x.lineTo(300, 140 + i * 4); x.lineTo(300, 146 + i * 4); x.fill(); x.fillRect(bx - 2, 150 + i * 8, 5, 50); }
  for (let i = 0; i < 5; i++) { x.fillStyle = K; x.fillRect(303 + i * 24, 108, 2, 14); x.beginPath(); x.moveTo(301 + i * 24, 110); x.lineTo(304 + i * 24, 102); x.lineTo(307 + i * 24, 110); x.fill(); }
  // gravestones and crosses in the foreground, a dead tree at the left
  x.fillStyle = K; x.fillRect(0, 222, W, 48);
  x.beginPath(); x.moveTo(0, 226); for (let i = 0; i <= W; i += 8) x.lineTo(i, 222 + Math.sin(i * 0.05) * 4 + hash(i, 1) * 3); x.lineTo(W, H); x.lineTo(0, H); x.fill();
  for (let i = 0; i < 16; i++) { const gx = 12 + i * 30 + hash(i, 11) * 14, gh = 10 + hash(i, 13) * 14, tilt = (hash(i, 17) - 0.5) * 0.25; x.save(); x.translate(gx, 226); x.rotate(tilt); if (hash(i, 19) > 0.5) { x.fillRect(-1, -gh, 3, gh); x.fillRect(-5, -gh + 4, 11, 3); } else { x.fillRect(-4, -gh, 8, gh); x.beginPath(); x.arc(0, -gh, 4, Math.PI, 0); x.fill(); } x.restore(); }
  x.strokeStyle = K; x.lineWidth = 4; x.beginPath(); x.moveTo(60, 226); x.lineTo(64, 170); x.lineTo(52, 130); x.moveTo(62, 175); x.lineTo(90, 140); x.lineTo(104, 138); x.moveTo(56, 145); x.lineTo(30, 120); x.stroke(); x.lineWidth = 2; x.beginPath(); x.moveTo(90, 140); x.lineTo(96, 118); x.moveTo(52, 130); x.lineTo(58, 104); x.moveTo(30, 120); x.lineTo(18, 112); x.moveTo(80, 152); x.lineTo(84, 172); x.stroke(); x.lineWidth = 1;
  return c;
}
const TITLE = { crows: [], flash: 0, flashT: 4 };
function drawTitleScene(dt) {
  if (!TITLE_BG) TITLE_BG = buildTitleBg();
  const t = G.time; ctx.drawImage(TITLE_BG, 0, 0);
  // the rose window glows, and a light moves in the nave
  ctx.globalCompositeOperation = 'lighter'; glow(360, 138, 16 + Math.sin(t * 1.3) * 2, '200,60,50', 0.35); glow(340 + Math.sin(t * 0.4) * 30, 175, 8, '255,170,90', 0.3); ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'rgba(255,120,90,0.6)'; ctx.beginPath(); ctx.arc(360, 138, 7, 0, 6.28); ctx.stroke(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + t * 0.05; ctx.beginPath(); ctx.moveTo(360, 138); ctx.lineTo(360 + Math.cos(a) * 7, 138 + Math.sin(a) * 7); ctx.stroke(); }
  // stars
  for (let i = 0; i < 90; i++) { const sx = hash(i, 21) * W, sy = hash(i, 23) * 150, b = 0.3 + 0.7 * Math.abs(Math.sin(t * (0.3 + hash(i, 25)) + i)); if (Math.hypot(sx - 330, sy - 70) < 36) continue; ctx.fillStyle = `rgba(232,226,208,${b * 0.6})`; ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1); }
  // far lightning now and then
  TITLE.flashT -= dt; if (TITLE.flashT <= 0) { TITLE.flash = 0.25; TITLE.flashT = 6 + Math.random() * 8; }
  if (TITLE.flash > 0) { TITLE.flash -= dt; ctx.fillStyle = `rgba(200,200,255,${TITLE.flash * 0.35})`; ctx.fillRect(0, 0, W, 190); }
  // fog rolling through the graves
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 7; i++) { const fx = ((t * (6 + i * 2) + i * 90) % (W + 240)) - 120, fy = 200 + (i % 3) * 14; const g = ctx.createRadialGradient(fx, fy, 4, fx, fy, 90); g.addColorStop(0, 'rgba(120,110,140,0.14)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(fx - 90, fy - 40, 180, 80); }
  ctx.globalCompositeOperation = 'source-over';
  // ash falling
  for (let i = 0; i < 60; i++) { const k = (t * (0.05 + hash(i, 31) * 0.05) + hash(i, 33)) % 1, ax = (hash(i, 35) * W + k * 60 + Math.sin(t + i) * 4) % W, ay = k * H; ctx.fillStyle = i % 9 ? 'rgba(200,196,204,0.5)' : 'rgba(255,150,80,0.8)'; ctx.fillRect(Math.round(ax), Math.round(ay), 1, 1); }
  // crows crossing the moon
  if (Math.random() < 0.004 && TITLE.crows.length < 6) for (let i = 0; i < 3; i++) TITLE.crows.push({ x: -10 - i * 12, y: 60 + Math.random() * 60, v: 30 + Math.random() * 12, ph: Math.random() * 6 });
  for (const c of TITLE.crows) { c.x += c.v * dt; c.y += Math.sin(t * 2 + c.ph) * 0.2; const wing = Math.sin(t * 14 + c.ph) > 0; ctx.fillStyle = '#060508'; ctx.fillRect(Math.round(c.x), Math.round(c.y), 3, 1); ctx.fillRect(Math.round(c.x) - 2, Math.round(c.y) + (wing ? -2 : 1), 2, 1); ctx.fillRect(Math.round(c.x) + 3, Math.round(c.y) + (wing ? -2 : 1), 2, 1); }
  TITLE.crows = TITLE.crows.filter(c => c.x < W + 20);
}
