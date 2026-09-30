
// =================================================================== v0.21: the Iron Golem and the Colossus, painted
// The Iron Golem: a hulking knight of riveted black iron with domed pauldrons, a sunken helm with a burning visor,
// and a grille in its chest where the wisps you pour in glow; it walks with a heavy rolling gait and slumps when
// dormant. The Colossus: a giant knit from the bones of many skeletons, skulls set into its shoulders and hips.
// Both keep the old sprites' footprint, so weapons, shields and bars still attach where they did.
const GIANTPAL = {
  i0: '#101218', i1: '#232733', i2: '#3a404e', i3: '#5c6474', i4: '#9aa2b4', rv: '#c8ced8', rust: '#6a3a22', rust2: '#8a5230', core: '#6ad0ff', core2: '#d8f6ff', gap: '#07080c', eye: '#9fe8ff',
  b0: '#4a4436', b1: '#8c8468', b2: '#c8bea0', b3: '#eee8d4', bg: '#16141a', beye: '#9fe8ff'
};
MPAINT.igolem = function (A, pose, ph, dorm) {
  const sw = pose === 'walk' ? [1, 0, -1, 0][ph] : 0, br = pose === 'idle' ? ph : 0, slump = dorm ? 3 : 0, u = br * 0.5 + slump;
  // legs: armored columns, knee plates, broad sabatons
  const leg = (x0, s, near) => { A.R(x0 - 2 + s * 0.5, -9, 5, 5, near ? 'i2' : 'i1'); A.R(x0 - 2 + s, -5, 5, 4, near ? 'i2' : 'i1'); A.R(x0 - 3 + s * 1.5, -2, 7, 2, near ? 'i3' : 'i2'); A.E(x0 + s * 0.7, -5, 2.2, 1.4, near ? 'i3' : 'i2'); A.P(x0 + s * 0.7, -6, near ? 'i4' : 'i3'); A.P(x0 - 1 + s, -8, 'rust'); };
  leg(-4, -sw, false); leg(4, sw, true);
  // far arm and gauntlet (the shield side)
  A.limb([[-8, -18 + u], [-10, -14 + u], [-9, -10 + u]], 'i1', null, 3); A.E(-9, -9 + u, 2.2, 2, 'i2');
  // the torso: a barrel of plate, a belly band, rivets, and the grille over the soul-core
  A.E(0, -15 + u, 8.5, 7, 'i1'); A.E(-0.5, -16 + u, 7.5, 6, 'i2'); A.E(-2, -18 + u, 4.5, 3, 'i3'); A.P(-4, -20 + u, 'i4');
  A.R(-7, -11 + u, 14, 2, 'i1'); A.R(-7, -11 + u, 14, 1, 'i3');
  for (const [a, b] of [[-6, -15], [6, -15], [-5, -19], [5, -19], [-6, -11], [0, -11], [6, -11]]) A.P(a, b + u, 'rv');
  const coreOn = !dorm, cf = coreOn ? (ph % 2 ? 'core' : 'core2') : 'i0';
  A.R(-2, -17 + u, 5, 5, 'gap'); A.R(-1, -16 + u, 3, 3, cf); A.P(0, -15 + u, coreOn ? 'core2' : 'i1');
  for (let i = 0; i < 3; i++) A.L(-2 + i * 2, -17 + u, -2 + i * 2, -13 + u, 'i3');
  A.P(3, -12 + u, 'rust2'); A.P(-4, -13 + u, 'rust'); A.P(5, -17 + u, 'rust');
  // pauldrons: great domes with a spike each
  A.E(-7, -20 + u, 4, 3, 'i1'); A.E(-7.5, -21 + u, 3, 2, 'i3'); A.P(-9, -24 + u, 'i3'); A.P(-9, -23 + u, 'i2');
  A.E(7, -20 + u, 4.2, 3, 'i2'); A.E(6.5, -21 + u, 3, 2, 'i4'); A.P(9, -24 + u, 'i4'); A.P(9, -23 + u, 'i3'); A.P(8, -20 + u, 'rv');
  // the helm, sunk between the shoulders; the visor burns (dark when dormant)
  const hy = -23 + u + (dorm ? 2 : 0);
  A.R(-2, hy - 3, 5, 5, 'i2'); A.R(-2, hy - 3, 5, 1, 'i4'); A.R(2, hy - 2, 1, 4, 'i1'); A.P(0, hy - 4, 'i3'); A.P(1, hy - 5, 'i3');
  A.R(-1, hy - 1, 4, 1, dorm ? 'i0' : 'eye'); if (!dorm) A.P(1, hy - 1, 'core2');
  // the near arm, reaching for the weapon hilt
  A.limb([[7, -18 + u], [9, -13 + u], [10, -8 + u]], 'i2', 'i1', 3); A.E(10, -7 + u, 2.3, 2, 'i3'); A.P(9, -8 + u, 'i4');
};
MPAINT.colossus = function (A, pose, ph) {
  const sw = pose === 'walk' ? [1, 0, -1, 0][ph] : 0, br = pose === 'idle' ? ph : 0, u = br * 0.5;
  // legs of stacked thighbones
  for (const [x0, s, n] of [[-3, -sw, false], [3, sw, true]]) { A.L(x0, -10, x0 + s * 0.5, -5, n ? 'b2' : 'b1', 2); A.L(x0 + s * 0.5, -5, x0 + s, -1, n ? 'b2' : 'b1', 2); A.E(x0 + s * 0.5, -5, 1.6, 1.4, n ? 'b3' : 'b2'); A.R(x0 - 2 + s, -1, 5, 1, n ? 'b2' : 'b1'); }
  // pelvis with two skulls set into it
  A.R(-5, -12, 10, 3, 'b1'); A.R(-5, -12, 10, 1, 'b2');
  for (const sx of [-3, 3]) { A.E(sx, -10.5, 1.6, 1.4, 'b2'); A.P(sx - 0.6, -10.5, 'bg'); A.P(sx + 0.6, -10.5, 'bg'); }
  // the ribcage: many ribs fused, gaps dark between them, a spine of vertebrae
  A.E(0, -18 + u, 7, 6, 'bg');
  for (let i = 0; i < 5; i++) { const y = -22 + i * 2 + u, hw = 6.5 - Math.abs(i - 1.5) * 0.6; A.L(-hw, y + 0.5, hw, y, 'b2'); A.P(-hw, y + 0.5, 'b3'); A.P(hw, y, 'b1'); }
  A.L(0, -24 + u, 0, -12, 'b1'); for (let i = 0; i < 6; i++) A.P(0, -23 + i * 2 + u, 'b3');
  // arms of many bones, and shoulders crowded with skulls
  A.limb([[-7, -22 + u], [-10, -16 + u], [-9, -10 + u]], 'b1', null, 2); A.E(-9, -9.5 + u, 1.8, 1.6, 'b1');
  for (const [sx, sy] of [[-7, -23], [-5, -25], [6, -23], [8, -24.5]]) { A.E(sx, sy + u, 1.8, 1.6, 'b2'); A.P(sx - 0.6, sy + u, 'bg'); A.P(sx + 0.6, sy + u, 'bg'); }
  // the great skull, horned, eyes cold
  const hy = -28 + u;
  A.E(0.5, hy, 3.4, 3.2, 'b2'); A.E(0, hy - 0.8, 2.4, 2, 'b3'); A.R(-1, hy + 1.5, 4, 2, 'b1');
  A.R(-1, hy - 0.5, 1, 2, 'bg'); A.R(1.5, hy - 0.5, 2, 2, 'bg'); A.P(2, hy - 0.5, 'beye'); A.P(-1, hy, 'beye'); A.P(0, hy + 2, 'bg'); A.P(2, hy + 2, 'bg');
  A.limb([[-2, hy - 2], [-5, hy - 4], [-6, hy - 7]], 'b1'); A.limb([[3, hy - 2], [5, hy - 5], [5, hy - 8]], 'b2'); A.P(-6, hy - 8, 'b3'); A.P(5, hy - 9, 'b3');
  A.limb([[7, -22 + u], [10, -16 + u], [9, -10 + u]], 'b2', 'b0', 2); A.E(9, -9.5 + u, 1.8, 1.6, 'b2');
};
const GIANT_FR = {};
function giantFrame(kind, pose, ph, dorm) {
  const key = kind + pose + ph + (dorm ? 'd' : ''); if (GIANT_FR[key]) return GIANT_FR[key];
  const fr = mkFrame(40, 40, (x, ox, oy) => MPAINT[kind](painter(x, ox, oy, GIANTPAL), pose, ph, dorm));
  GIANT_FR[key] = fr; return fr;
}
function giantPose(o, speedK) {
  const mv = o._px == null ? 0 : Math.hypot(o.x - o._px, o.y - o._py); o._px = o.x; o._py = o.y; o._wd = (o._wd || 0) + mv;
  if (mv > 0.004) return ['walk', Math.floor(o._wd * (speedK || 3.5)) % 4];
  return ['idle', Math.floor(G.time * 1.2 + o.x) % 2];
}
// drawn in place of the old sprite; returns the old sprite's rect so everything attached still lines up
function drawGiant(kind, s, o, x, y, face, flash, alpha, k, lift) {
  const dorm = kind === 'igolem' && o && o.state === 'dormant', [pose, ph] = dorm ? ['idle', 0] : giantPose(o || { x, y }), fr = giantFrame(kind, pose, ph, dorm), p = iso(x, y), K = k || 1;
  const img = (flash && OPT.flash) ? (face < 0 ? fr.flf : fr.fl) : (face < 0 ? fr.f : fr.c);
  const X = Math.round(p.sx - (face < 0 ? fr.w - fr.ox : fr.ox) * K), Y = Math.round(p.sy + 3 - (fr.oy + 1) * K - (lift || 0));
  if (alpha !== 1) ctx.globalAlpha = alpha;
  if (dorm) ctx.globalAlpha *= 0.85;
  ctx.drawImage(img, X, Y, fr.w * K, fr.h * K); ctx.globalAlpha = 1;
  const sw = Math.round(s.w * K), sh = Math.round(s.h * K);
  return { x: Math.round(p.sx - sw / 2), y: Math.round(p.sy + 3 - sh - (lift || 0)), w: sw, h: sh };
}

// =================================================================== v0.21: weight and ceremony
// Heavy blows freeze the world for a heartbeat; entering a zone fades up out of black; walking kicks up dust;
// levelling up drops a pillar of gold light.
const JUICE = { stop: 0, fade: 0, pillar: 0 };
function hitStop(s) { JUICE.stop = Math.max(JUICE.stop, s); }
function zoneFade() { JUICE.fade = 1; }
function levelPillar() { JUICE.pillar = 1.6; for (let i = 0; i < 40; i++) parts.push({ g: '255,215,120', s: 1.2, x: P.x + rand(-0.4, 0.4), y: P.y + rand(-0.4, 0.4), z: Math.random() * 10, vx: rand(-1, 1), vy: rand(-1, 1), vz: 30 + Math.random() * 40, t: 1 + Math.random() * 0.6, t0: 1.6 }); }
function footDust(o, rgb) {
  const mv = o._fdx == null ? 0 : Math.hypot(o.x - o._fdx, o.y - o._fdy); o._fdx = o.x; o._fdy = o.y; o._fdd = (o._fdd || 0) + mv;
  if (o._fdd > 0.55) { o._fdd = 0; if (G.zone && G.zone.get(Math.floor(o.x), Math.floor(o.y)) !== T.WATER) for (let i = 0; i < 2; i++) parts.push({ x: o.x + rand(-0.12, 0.12), y: o.y + rand(-0.12, 0.12), z: 0.5, vx: rand(-0.8, 0.8), vy: rand(-0.8, 0.8), vz: 6 + Math.random() * 6, t: 0.35, col: rgb || '#5a5448' }); }
}
function updateJuice(dt) {
  JUICE.fade = Math.max(0, JUICE.fade - dt * 1.4); JUICE.pillar = Math.max(0, JUICE.pillar - dt);
  if (!P.dead) footDust(P); if (G.golem && G.golem.state !== 'dormant') footDust(G.golem, '#4a4640'); if (G.fgolem) footDust(G.fgolem, '#5a2a22');
}
function drawJuice() {
  if (JUICE.pillar > 0 && !P.dead) {
    const p = iso(P.x, P.y), k = JUICE.pillar / 1.6, w = 10 + 6 * Math.sin(G.time * 12) * k;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, 0, 0, p.sy); g.addColorStop(0, 'rgba(255,220,140,0)'); g.addColorStop(1, `rgba(255,220,140,${0.45 * k})`);
    ctx.fillStyle = g; ctx.fillRect(p.sx - w / 2, 0, w, p.sy); glow(p.sx, p.sy - 4, 30, '255,215,120', 0.5 * k);
    ctx.globalCompositeOperation = 'source-over';
  }
  if (JUICE.fade > 0) { ctx.fillStyle = `rgba(4,3,6,${JUICE.fade})`; ctx.fillRect(0, 0, W, HUD_Y); }
}
