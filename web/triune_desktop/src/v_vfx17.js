
// =================================================================== v0.17: the light of spells
// The phosphorus beam set the bar: everything magical now glows. Projectiles leave trails of drifting light,
// every hit throws sparks in the colour of what struck it, heavy blows scorch the ground for a moment,
// and casting draws motes of the hero's power into their hands.
const HEXRGB = {};
function rgbOf(hex) { if (HEXRGB[hex]) return HEXRGB[hex]; let r = '232,226,208'; if (hex && hex[0] === '#') { const c = hexRgb(hex); r = c.join(','); } HEXRGB[hex] = r; return r; }
function ember(x, y, z, rgb, n = 3, spd = 1, life = 0.45, size = 1) {
  for (let i = 0; i < n; i++) parts.push({ g: rgb, s: size * (0.7 + Math.random() * 0.6), x: x + rand(-0.08, 0.08), y: y + rand(-0.08, 0.08), z, vx: rand(-2, 2) * spd, vy: rand(-2, 2) * spd, vz: (6 + Math.random() * 10) * spd, t: life * (0.6 + Math.random() * 0.8), t0: life });
}
if (!G.scars) G.scars = [];
function scar(x, y, R, rgb, life = 2.2) { G.scars.push({ x, y, R, rgb, t: life, max: life, seed: Math.random() * 6 }); if (G.scars.length > 70) G.scars.shift(); }
// struck: sparks of the striking colour; a big hit scorches
function vfxHit(m, col, d) {
  if ((m._fxT || 0) > G.time) return; m._fxT = G.time + 0.08;
  const rgb = rgbOf(col), big = d > m.max * 0.18;
  ember(m.x, m.y, 7 + Math.random() * 5, rgb, big ? 6 : 3, big ? 1.4 : 1, 0.4, big ? 1.3 : 1);
  if (big) { scar(m.x, m.y, 0.35 + Math.random() * 0.15, rgb, 1.6); hitStop(d > m.max * 0.5 ? 0.06 : 0.035); }
}
const TRAILS = [
  () => [souls, '160,215,255', 8], () => [shots, '216,243,255', 6], () => [G.bspears, '240,232,212', 6], () => [G.blances, '255,80,100', 6], () => [G.spits, '255,70,90', 6],
  () => [G.shuris, '190,130,255', 6], () => [G.mthrows, '190,130,255', 6], () => [G.arcShots, '220,200,255', 8], () => [G.orbs, '200,230,255', 10], () => [G.eshots, '255,150,90', 6], () => [G.biles, '200,220,90', 8], () => [G.mmiss, '170,215,255', 11]
];
function updateVfx(dt) {
  for (const f of TRAILS) {
    const [arr, rgb, z0] = f(); if (!arr || !arr.length) continue;
    for (const s of arr) { if (s == null || s.x == null || Math.random() > 0.55) continue; parts.push({ g: rgb, s: 0.8 + Math.random() * 0.5, x: s.x + rand(-0.05, 0.05), y: s.y + rand(-0.05, 0.05), z: (s.z != null ? s.z : z0) + rand(-1, 1), vx: rand(-0.4, 0.4), vy: rand(-0.4, 0.4), vz: rand(-1, 3), t: 0.32 + Math.random() * 0.2, t0: 0.5 }); }
  }
  // the hero draws motes of power into the hands while casting
  // v0.59 (user): the glowing motes pulled into the hands read as a white charge aura; grounded now, none
  if (false && !P.dead && (P.cast > 0 || P.infuse || P.condensing) && Math.random() < 0.7) {
    const rgb = { animancer: '160,215,255', ossumancer: '240,232,212', hemomancer: '255,80,100', miasmancer: '190,130,255' }[P.cls] || '232,226,208', a = Math.random() * 6.28;
    parts.push({ g: rgb, s: 1, x: P.x + Math.cos(a) * 0.7, y: P.y + Math.sin(a) * 0.7, z: 4 + Math.random() * 10, vx: -Math.cos(a) * 6, vy: -Math.sin(a) * 6, vz: 12, t: 0.3, t0: 0.3 });
  }
  for (const s of G.scars) s.t -= dt; G.scars = G.scars.filter(s => s.t > 0);
}
// glowing particles: an additive halo with a hot core; they float, they do not fall
function drawGlowPart(p, q) {
  const a = Math.min(1, p.t / (p.t0 || 0.4) * 1.6), sx = q.sx, sy = q.sy - p.z;
  if (!isFinite(sx) || !isFinite(sy) || !isFinite(a)) { if (!G._gpWarn) { G._gpWarn = 1; console.warn('bad glow part', JSON.stringify(p).slice(0, 200)); } return; }
  if (!(p.s > 0)) p.s = 0.6;
  ctx.globalCompositeOperation = 'lighter'; glow(sx, sy, 3.5 * p.s + 1, p.g, 0.35 * a); ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = a; ctx.fillStyle = `rgb(${p.g})`; ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
  if (a > 0.6) { ctx.fillStyle = '#ffffff'; ctx.globalAlpha = a - 0.5; ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1); }
  ctx.globalAlpha = 1;
}
// scorches: a glowing smear on the ground that cools through its colour to ash
function drawScars() {
  for (const s of G.scars) {
    if (!onScreen(s.x, s.y)) continue;
    const q = iso(s.x, s.y), k = s.t / s.max, R = s.R * (1.1 - 0.1 * k);
    ctx.fillStyle = `rgba(20,14,16,${0.35 * Math.min(1, k * 2)})`; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, R * ISO_R, R * ISO_RY, 0, 0, 6.28); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(q.sx, q.sy, 0, q.sx, q.sy, R * ISO_R); g.addColorStop(0, `rgba(${s.rgb},${0.5 * k * k})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, R * ISO_R, R * ISO_RY, 0, 0, 6.28); ctx.fill();
    for (let i = 0; i < 3; i++) { const a = s.seed + i * 2.1, fl = Math.sin(G.time * 13 + a) > 0; if (fl && k > 0.3) { ctx.fillStyle = `rgba(${s.rgb},${0.8 * k})`; ctx.fillRect(Math.round(q.sx + Math.cos(a) * R * 6), Math.round(q.sy + Math.sin(a) * R * 3), 1, 1); } }
    ctx.globalCompositeOperation = 'source-over';
  }
}
