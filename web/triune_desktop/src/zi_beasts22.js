
// =================================================================== v0.22: the Act I bestiary, painted at 2x
// Nothing here is an animal. Everything grew out of the dead god: pilgrims hollowed by its blood, a severed hand
// that learned to walk, mourners, stray breath, martyrs still burning, a bell that grew a body, a torn artery,
// a moth wearing a saint's face, the bone knights of its ossuaries.
const SK_BONE = mkRamp('#2e2a24', '#9a9278', '#f2ecd6', 7);
const BR = {
  skinGrey: mkRamp('#15161c', '#5e6258', '#c9c7a8', 7),
  skinPale: mkRamp('#2a1a1e', '#a88878', '#f4e2cc', 7),
  wax: mkRamp('#241a1a', '#b8a08a', '#f8ecd8', 7),
  meat: mkRamp('#1e0508', '#8a1e22', '#ff8a6a', 7),
  robeBrown: mkRamp('#100c10', '#3e3226', '#86704e', 6),
  robeBlack: mkRamp('#07060a', '#221c2a', '#4e4460', 6),
  veil: mkRamp('#4a4652', '#b8b2b0', '#fbf6ea', 6),
  char: mkRamp('#060404', '#2a1e1a', '#5e4a3e', 6),
  ember: mkRamp('#5a1206', '#ff6a1a', '#fff2b0', 5),
  bronze: mkRamp('#1a0e06', '#8a5a26', '#f0c880', 7),
  verd: mkRamp('#12241e', '#3e7a62', '#9ad8b4', 5),
  hide: mkRamp('#120c0c', '#4e3a30', '#9a8068', 7),
  artery: mkRamp('#14030a', '#7a1024', '#ff6a78', 7),
  dirt: mkRamp('#0e0a08', '#3a2e24', '#6e5a44', 5),
  mothFur: mkRamp('#241c14', '#8a7658', '#efe2c0', 6),
  mothWing: mkRamp('#2e2820', '#9a8c70', '#f2e8cc', 6),
  porcelain: mkRamp('#5a5660', '#d8d4d0', '#ffffff', 6),
  gold: mkRamp('#3a2206', '#b48a2a', '#fff0a0', 5),
  iron: mkRamp('#0c0e12', '#4a5262', '#c4ccd8', 7),
  rust: mkRamp('#1a0a06', '#6a3418', '#b8683a', 5),
  redCloth: mkRamp('#1a0406', '#6e1418', '#c24040', 6),
  gauze: ['rgba(30,26,40,0.85)', 'rgba(70,62,86,0.8)', 'rgba(120,112,140,0.75)', 'rgba(170,164,190,0.7)', 'rgba(215,212,232,0.65)']
};
// v0.22 palettes: one per creature; tints still work (champions, uniques, the drowned and the mire kinds)
Object.assign(MPAL, {
  hollow: { skin: BR.skinGrey, robe: BR.robeBrown, rope: '#8a7650', hole: '#1a0406', blood: '#8e1a1e', glow: '#ff6a3a', glowHi: '#ffd8a0', eye: '#050304', tear: '#3a0a0c', teeth: '#d8d0b0' },
  hand: { skin: mkRamp('#1c1216', '#9a7c72', '#ecd6c2', 7), nail: mkRamp('#3a3018', '#a89458', '#f4e6b0', 5), crease: '#5a3a30', meat: BR.meat, bone: '#efe6cc', mouth: '#12040a', tooth: '#f6f0dc', vein: '#6a4a6a' },
  weeper: { robe: BR.robeBlack, veil: BR.veil, hand: BR.skinGrey, needle: '#eef4ff', tearGlow: '#9fd8ff', hollow: '#2a2632', trim: '#6e5a3a' },
  gasp: { gauze: BR.gauze, mouth: 'rgba(8,4,12,0.95)', tooth: 'rgba(240,236,220,0.95)', lip: 'rgba(120,70,90,0.85)', mist: 'rgba(190,186,220,0.45)', eye: '#d8e8ff' },
  pyre: { char: BR.char, ember: BR.ember, wood: mkRamp('#120a06', '#5a3a1e', '#9a7040', 5), chain: BR.iron, flame: ['#6a1a06', '#d8420e', '#ff8a1a', '#ffd050', '#fff6c8'], ash: mkRamp('#1a1a1c', '#5a5a5e', '#a8a8ac', 5), steam: 'rgba(210,220,230,0.5)', halo: '#ffe08a' },
  bell: { bronze: BR.bronze, verd: BR.verd, hide: mkRamp('#0c080c', '#4a3c42', '#98848a', 7), sack: mkRamp('#120e0a', '#4a3e2c', '#8a7658', 5), chain: BR.iron, skull: SK_BONE, eye: '#ffb040', dark: '#050304', rope: '#6a5a3a', scar: '#8a2a22' },
  worm: { art: BR.artery, dirt: BR.dirt, tooth: mkRamp('#5a5040', '#d8ceb0', '#fffbe8', 4), valve: '#3a0610', inner: '#0e0206', vein: '#c83a4a', slime: '#ff9aa8' },
  moth: { fur: BR.mothFur, wing: BR.mothWing, face: BR.porcelain, halo: BR.gold, spot: '#1e1612', spot2: '#8a3a2a', lip: '#b8303a', crack: '#4a4050', leg: '#3a2e20' },
  warden: { bone: SK_BONE, iron: BR.iron, rust: BR.rust, cloth: BR.robeBlack, shield: mkRamp('#241e16', '#a89a78', '#f6eed4', 6), eye: '#8ad8ff', eyeHi: '#e8fbff', gap: '#0a080c', wood: mkRamp('#140c06', '#5a4028', '#96724a', 5) },
  duelist: { bone: SK_BONE, blade: mkRamp('#1a1c22', '#8a92a2', '#ffffff', 6), sash: BR.redCloth, iron: BR.iron, eye: '#ff6a3a', eyeHi: '#ffe0a0', gap: '#0a080c', grip: '#3a2418' }
});
Object.assign(MFRAME, { hollow: [34, 32], hand: [38, 26], weeper: [30, 38], gasp: [34, 42], pyre: [34, 38], bell: [54, 50], worm: [32, 36], moth: [48, 44], warden: [44, 40], duelist: [40, 38] });

// shared: a skull seen from the side, facing +x
function skullHR(A, x, y, s, ramp, eye, eyeHi, gap) {
  A.ball(x, y, 2.4 * s, 2.3 * s, ramp, { ao: 0.3 });
  A.ball(x + 1.3 * s, y + 1.3 * s, 1.5 * s, 1.1 * s, ramp, { lit: -0.08 });
  A.E(x + 0.9 * s, y - 0.1 * s, 0.8 * s, 0.75 * s, gap); A.glowPx(x + 1 * s, y - 0.2 * s, eye, eyeHi);
  A.E(x + 2.2 * s, y + 0.9 * s, 0.35 * s, 0.4 * s, gap);
  const RR = A.col(ramp); for (let i = 0; i < 3; i++) A.P(x + (1.2 + i * 0.5) * s, y + 2.1 * s, RR[RR.length - 2]);
}
// fire tongues rising from a point; ph animates them
function flamesHR(A, x, y, w, h, ph, pal, hot) {
  const F = A.col(pal); const n = Math.max(2, Math.round(w * 1.4));
  for (let i = 0; i < n; i++) {
    const fx = x - w / 2 + (i + 0.5) * w / n, k = 0.55 + 0.45 * Math.abs(Math.sin(i * 2.7 + ph * 1.9)), fh = h * k, sway = Math.sin(ph * 1.3 + i) * 0.6;
    for (let j = 0; j < 4; j++) { const t = j / 4, rr = (1 - t) * w / n * 0.75 + 0.3; A.E(fx + sway * t, y - fh * t, rr, fh / 4, F[Math.min(F.length - 1, j + (hot ? 1 : 0))]); }
  }
}

// ------------------------------------------------------------------- HUSK: a pilgrim who drank from the wound
MPAINT_HR.hollow = function (A, pose, ph) {
  const sw = pose === 'walk' ? [1, 0, -1, 0][ph] : 0, br = pose === 'idle' ? ph * 0.5 : 0, lean = pose === 'atk' ? 2 : pose === 'wind' ? -0.5 : 0.6;
  const hx = 3.4 + lean, hy = -18 + br + (pose === 'atk' ? 1 : 0);
  // far leg and arm
  A.tube([[-0.5, -9], [0.5 - sw, -4.5], [-0.5 - sw * 2, -0.5]], 1, 0.75, 'skin', { lit: -0.22 });
  A.R(-1.8 - sw * 2, -0.8, 2.6, 0.8, BR.skinGrey[1]);
  const sh = [1 + lean, -15 + br];
  const armF = pose === 'wind' ? [sh, [2, -19.5], [3, -23]] : pose === 'atk' ? [sh, [5.5, -14], [9.5, -13.5]] : [sh, [1.5 - sw * 0.5, -10.5 + br], [2 - sw, -6.5 + br]];
  A.tube(armF, 0.85, 0.6, 'skin', { lit: -0.25 });
  // the pilgrim's cloak: hood to calves, hanging open at the front, the hem torn into strips
  const hem = []; for (let i = 0; i <= 7; i++) hem.push([-4.4 + i * 0.95, -3.2 + ((i * 7) % 3) * 0.8 - (i === 3 ? 1 : 0)]);
  A.slab([[hx - 3.6, hy - 2.4], [hx - 1.2, hy - 3.4], [hx - 0.2, hy - 1], [0.6 + lean * 0.4, -14 + br], [-0.2, -9], [hem[7][0] - 1.2, hem[7][1]], ...hem.slice().reverse(), [-3.8, -9], [-3.6 + lean * 0.3, -14 + br]], 'robe', { base: 0.66, gx: 0.3, gy: 0.4, folds: 4, fph: ph * 0.8 });
  for (let i = 0; i < 4; i++) A.L(-3 + i * 0.9, -13 + br, -3.8 + i * 1.2, -4, BR.robeBrown[0], 0.5);
  // the torso under it: grey skin over ribs, the chest split open and glowing with the god's blood
  A.ball(0.9 + lean * 0.5, -13.4 + br, 2, 3, 'skin', { lit: -0.12, ao: 0.4 });
  for (let i = 0; i < 3; i++) A.L(0.4 + lean * 0.5, -14.8 + i * 1.2 + br, 2.4 + lean * 0.5, -14.4 + i * 1.2 + br, BR.skinGrey[1], 0.5);
  A.E(1.5 + lean * 0.5, -12.8 + br, 0.7, 1.4, 'hole'); A.glowPx(1.4 + lean * 0.5, -13.2 + br, 'glow', 'glowHi'); A.P(1.6 + lean * 0.5, -12 + br, 'blood');
  A.R(-3.6, -11 + br * 0.3, 5.4, 0.6, 'rope'); A.L(0.8, -10.6, 1.2, -8.4, 'rope', 0.5);
  // near leg
  A.tube([[0.6, -9], [2 + sw, -4.5], [1 + sw * 2, -0.5]], 1.1, 0.8, 'skin');
  A.R(0.2 + sw * 2, -0.8, 2.8, 0.8, BR.skinGrey[2]);
  // the head in its hood: a gaunt grey face, black sockets running dark tears, jaw hanging
  A.ball(hx - 0.8, hy, 2.9, 3, 'robe', { ao: 0.3, lit: -0.05 });
  A.ball(hx + 0.5, hy + 0.4, 1.8, 2.1, 'skin', { ao: 0.5, lit: -0.05 });
  A.E(hx + 1.1, hy - 0.2, 0.5, 0.6, 'eye'); A.E(hx - 0.1, hy - 0.2, 0.4, 0.55, 'eye'); A.L(hx + 1.2, hy + 0.4, hx + 1.4, hy + 1.8, 'tear', 0.5);
  const jaw = pose === 'wind' || pose === 'atk' ? 1.4 : 0.8;
  A.R(hx + 0.2, hy + 1.3, 1.6, jaw, 'hole'); A.P(hx + 0.8, hy + 1.3, 'teeth'); A.P(hx + 1.4, hy + 1.3, 'teeth');
  A.ball(hx + 0.6, hy + 1.6 + jaw, 1.1, 0.5, 'skin', { lit: -0.15 });
  // near arm, long, clawed
  const armN = pose === 'wind' ? [[0.8 + lean, -15 + br], [1.2, -20.5], [1.8, -24]] : pose === 'atk' ? [[0.8 + lean, -15 + br], [4.5, -13], [9, -12]] : [[0.8 + lean, -15 + br], [2.4 + sw * 0.5, -10.5 + br], [3.2 + sw, -6.5 + br]];
  A.tube(armN, 0.95, 0.6, 'skin');
  const hd = armN[2]; for (let i = 0; i < 3; i++) A.L(hd[0], hd[1], hd[0] + 1 + i * 0.4, hd[1] + 1.4 - i * 0.2, BR.skinGrey[4], 0.5);
};

// ------------------------------------------------------------------- TITHE-HAND: a severed hand of the god, running on its fingers
MPAINT_HR.hand = function (A, pose, ph) {
  // palm down, wrist raised behind, the four fingers striding out in front like legs, the thumb braced at the side
  const g = pose === 'walk' ? ph : 0, rear = pose === 'wind' ? 1 : pose === 'atk' ? 0.3 : 0, bob = pose === 'walk' ? [0, -0.4, 0, -0.4][g] : pose === 'idle' ? ph * 0.3 : 0, fwd = pose === 'atk' ? 3 : 0;
  const px = fwd - 1, py = -9.5 + bob - rear * 3;
  const finger = (i, near) => {
    const phase = pose === 'walk' ? (g + i * 2) % 4 : 0, lift = pose === 'walk' && phase === 1 ? 1.4 : 0, step = pose === 'walk' ? [1, 0.3, -1, -0.3][phase] * 1.4 : 0;
    const kn = [px + 2.8 + i * 0.7, py + 1.2 - i * 0.25];
    const pip = [kn[0] + 2.6 + i * 0.4 + step * 0.4 + rear * 1.5, py - 1.6 - rear * 2 - lift * 0.6 - (i === 1 || i === 2 ? 0.8 : 0)];
    const tip = [kn[0] + 3.4 + i * 0.9 + step, -0.6 - lift];
    const lit = near ? 0.02 : -0.28;
    A.tube([kn, pip], 1.05, 0.9, 'skin', { lit }); A.ball(pip[0], pip[1], 0.9, 0.85, 'skin', { lit: lit + 0.08 });
    A.tube([pip, tip], 0.85, 0.55, 'skin', { lit }); A.P(pip[0] - 0.2, pip[1] + 0.4, 'crease'); A.P(pip[0] + 0.3, pip[1] + 0.3, 'crease');
    A.ball(tip[0] + 0.3, tip[1] - 0.2, 0.6, 0.45, 'nail', { lit });
  };
  finger(3, false); finger(2, false);
  // the wrist stump raised behind: torn meat, tendons, two white bone ends
  const wx = px - 5.5, wy = py - 3.2 - rear;
  A.tube([[px - 1, py], [wx, wy]], 2.3, 2, 'skin', { ao: 0.2, lit: -0.05 });
  A.ball(wx - 0.4, wy, 1.7, 2, 'meat', { ao: 0.1 }); A.E(wx - 0.9, wy - 0.5, 0.55, 0.65, 'bone'); A.E(wx - 0.6, wy + 0.8, 0.45, 0.5, 'bone');
  for (let i = 0; i < 3; i++) A.L(wx - 1.2, wy - 0.8 + i * 0.8, wx - 2.6 - (i % 2) * 0.6, wy - 0.4 + i * 1.3 + (pose === 'walk' ? g % 2 : 0) * 0.4, BR.meat[4], 0.5);
  // the back of the hand: waxy, tendons standing out toward each knuckle, a blue vein
  A.ball(px + 0.6, py - 0.2, 3.8, 2.4, 'skin', { ao: 0.45, rot: 0.25 - rear * 0.3, spec: BR.wax[6] });
  for (let i = 0; i < 4; i++) A.L(px - 1.6, py - 0.4, px + 2.6 + i * 0.7, py - 1.2 + i * 0.5 - rear * 0.5, BR.wax[4], 0.5);
  A.L(px - 2.4, py + 0.4, px + 0.6, py + 0.6, 'vein', 0.5); A.L(px + 0.6, py + 0.6, px + 2.2, py + 1.4, 'vein', 0.5);
  // the palm-mouth under it, gaping when it rears to bite
  const open = rear > 0.5 ? 1.6 : rear > 0 ? 0.8 : 0.3;
  A.E(px + 1.2, py + 2.2, 2.6, open, 'mouth'); for (let i = 0; i < 6; i++) { A.P(px - 0.8 + i * 0.75, py + 2.3 - open, 'tooth'); if (open > 0.5) A.P(px - 0.6 + i * 0.75, py + 1.9 + open, 'tooth'); }
  finger(1, true); finger(0, true);
  // the thumb, braced to the near side, a little apart from the others
  const th = pose === 'wind' ? [px + 3, py - 5.5] : pose === 'atk' ? [px + 6.5, py - 1] : [px - 0.4 + (pose === 'walk' ? [0.6, 0, -0.6, 0][g] : 0), -0.6];
  const tk = [px - 1.8, py + 2.8];
  A.tube([[px - 0.6, py + 1.2], tk, th], 1.1, 0.7, 'skin', { lit: 0.08 }); A.ball(th[0] + 0.3, th[1] - 0.2, 0.65, 0.5, 'nail', { lit: 0.1 });
};

// ------------------------------------------------------------------- WEEPER: a faceless mourner whose tears harden into needles
MPAINT_HR.weeper = function (A, pose, ph) {
  const sw = pose === 'walk' ? [1, 0, -1, 0][ph] : 0, br = pose === 'idle' ? ph * 0.5 : 0, back = pose === 'wind' ? 1 : 0, flick = pose === 'atk';
  const top = -30 + br;
  // a long black robe, narrow at the shoulders, pooling at the hem
  A.slab([[-2.2, top + 7], [2.6, top + 7], [4.2 + sw * 0.3, -1], [3, 0], [0.5, -0.6], [-1.8, 0], [-4 + sw * 0.3, -1]], 'robe', { base: 0.6, gx: 0.4, gy: 0.25, folds: 4, fph: ph * 0.7 });
  for (let i = 0; i < 4; i++) A.L(-1.8 + i * 1.5, top + 9, -3 + i * 2.2 + sw * 0.2, -1, BR.robeBlack[0], 0.5);
  A.R(-2.4, top + 12, 5.2, 0.6, 'trim');
  // far arm
  A.tube([[-1.4, top + 8.5], [-2.2, top + 13], [-1.6, top + 17]], 0.8, 0.6, 'robe', { lit: -0.15 });
  // shoulders and a thin neck
  A.ball(0.3, top + 8.4, 2.7, 1.8, 'robe', { ao: 0.2 });
  // the head, bowed, wrapped in a pale veil with only a hollow where the face should be
  const hx = 1.2 + back * -0.6, hy = top + 4.3 - back * 0.8;
  A.ball(hx, hy, 2.4, 3, 'veil', { rot: back ? -0.4 : 0.25, ao: 0.35 });
  A.slab([[hx - 2.4, hy], [hx + 0.6, hy + 1.5], [hx - 0.8, top + 10], [hx - 3, top + 9]], 'veil', { base: 0.55 });
  A.E(hx + 1.2, hy + (back ? -0.8 : 0.2), 0.9, 1.3, 'hollow');
  // tears: bone needles hanging from the hollow; glowing when it is about to weep them at you
  for (let i = 0; i < 3; i++) { const tx = hx + 0.8 + i * 0.5, ty = hy + 1.2 + (back ? -1 : 0); A.L(tx, ty, tx + (back ? 0.4 : 0), ty + 1.6 + i * 0.4, back ? 'tearGlow' : 'needle', 0.5); }
  if (back) { A.glowPx(hx + 1.2, hy - 0.8, 'tearGlow', '#ffffff'); }
  // near arm: hands raised to the veil, or flung out with the needles
  const hand = flick ? [7, top + 10] : back ? [hx + 2, hy - 0.4] : [hx + 1.6, hy + 1.4];
  A.tube([[1.6, top + 8.4], flick ? [4.4, top + 9.2] : [2.4, top + 11.5], hand], 0.85, 0.6, 'robe');
  A.ball(hand[0] + 0.2, hand[1], 0.8, 0.65, 'hand'); for (let i = 0; i < 3; i++) A.L(hand[0], hand[1], hand[0] + 0.7, hand[1] - 1.1 + i * 0.5, BR.skinGrey[4], 0.5);
  if (flick) for (let i = 0; i < 3; i++) A.L(hand[0] + 1.4 + i, hand[1] - 0.6 + i * 0.3, hand[0] + 3 + i * 1.3, hand[1] - 0.8 + i * 0.35, 'needle', 0.5);
};

// ------------------------------------------------------------------- GASP: a stray piece of the god's last breath, a veil of mouths
MPAINT_HR.gasp = function (A, pose, ph) {
  const bob = pose === 'walk' ? [0, -0.6, -1, -0.6][ph] : pose === 'idle' ? ph * 0.6 : 0, bill = pose === 'wind' ? 1.35 : pose === 'atk' ? 1.15 : 1, lift = -9 + bob;
  const W0 = 5 * bill, top = lift - 22;
  // trailing tatters in place of legs
  for (let i = 0; i < 5; i++) { const x0 = -W0 + i * W0 * 0.5, len = 6 + (i % 2) * 3; A.tube([[x0, lift - 2], [x0 - 0.6 + Math.sin(ph * 1.6 + i) * 0.8, lift + len * 0.5], [x0 - 1.4 + Math.sin(ph * 1.6 + i + 1) * 1.2, lift + len]], 0.9, 0.2, 'gauze', { lit: -0.1 }); }
  // the veil: a tall rounded sheet
  A.slab([[-1.5, top], [1.8, top - 0.5], [W0 * 0.8, top + 6], [W0, lift - 1], [W0 * 0.3, lift + 1], [-W0 * 0.3, lift], [-W0, lift - 1], [-W0 * 0.8, top + 6]], 'gauze', { base: 0.72, gx: 0.4, gy: 0.3, folds: 3, fph: ph * 0.9 });
  A.ball(0.3, top + 4, 3.6 * bill, 4.2, 'gauze', { ao: 0.2 });
  // smoke arms
  const reach = pose === 'atk' ? 1 : 0;
  A.tube([[W0 * 0.7, top + 8], [W0 + 2 + reach * 3, top + 11 - reach * 2], [W0 + 3 + reach * 5, top + 14 - reach * 4]], 0.9, 0.3, 'gauze');
  // mouths: several, scattered, gasping open wider on the in-breath
  const mouths = [[1.4, top + 4, 1.2], [-2.2, top + 9, 1], [2.4, top + 12, 0.9], [-1, top + 15.5, 1.1], [0.8, top + 19, 0.8]];
  mouths.forEach(([mx, my, s], i) => {
    const open = (0.35 + 0.3 * Math.abs(Math.sin(ph * 1.7 + i))) * (pose === 'wind' ? 1.9 : 1) * s;
    A.E(mx, my, 1.2 * s, open + 0.25, 'lip'); A.E(mx, my, 1 * s, open, 'mouth');
    for (let k = 0; k < 3; k++) { A.P(mx - 0.6 * s + k * 0.6 * s, my - open + 0.1, 'tooth'); A.P(mx - 0.4 * s + k * 0.6 * s, my + open - 0.4, 'tooth'); }
  });
  A.glowPx(2.4, top + 1.6, 'eye', '#ffffff');
};

// ------------------------------------------------------------------- PYRE-SAINT: a martyr whose faith is still burning
MPAINT_HR.pyre = function (A, pose, ph) {
  const pal = A.col, doused = A.col('_doused') === 1;
  const sw = pose === 'walk' ? [1, 0, -1, 0][ph] : 0, br = pose === 'idle' ? ph * 0.4 : 0, hot = pose === 'wind', fph = ph + (pose === 'walk' ? 0.5 : 0) + (hot ? 2 : 0);
  const skin = doused ? 'ash' : 'char';
  // the wooden yoke across the shoulders, arms bound along it
  const yy = -19 + br;
  A.tube([[-1.5, -9], [-0.5 - sw, -4.5], [-1.2 - sw * 2, -0.5]], 1.05, 0.8, skin, { lit: -0.15 });
  A.tube([[0.8, -9], [2 + sw, -4.5], [1.2 + sw * 2, -0.5]], 1.15, 0.85, skin);
  // a burnt loincloth and the body: blackened, cracked through with embers
  A.ball(0.1, -13.8 + br, 2.8, 4.4, skin, { ao: 0.3 });
  A.slab([[-2.4, -10.4], [2.6, -10.4], [2, -7.4], [0.4, -8.2], [-1.6, -7]], doused ? 'ash' : 'wood', { base: 0.4 });
  if (!doused) { const cr = [[-1, -16, 1, -13], [1, -13, 0.4, -11], [-1.6, -12.6, -0.4, -11], [1.6, -16.6, 0.6, -15]]; for (const [a, b, c, d] of cr) A.L(a, b + br, c, d + br, hot ? '#fff2b0' : '#ff7a2a', 0.5); }
  A.R(-9, yy - 0.6, 18, 1.6, 'wood'); A.R(-9, yy - 0.6, 18, 0.5, A.col('wood')[4]); A.R(-9, yy + 0.8, 18, 0.3, A.col('wood')[0]);
  for (const s of [-1, 1]) { A.tube([[s * 1.8, yy + 0.5], [s * 5, yy + 0.3], [s * 8, yy + 0.4]], 0.85, 0.7, skin); for (let i = 0; i < 3; i++) A.R(s * (3 + i * 2) - 0.3, yy - 0.8, 0.6, 2, A.col('chain')[3]); A.ball(s * 8.6, yy + 0.4, 0.8, 0.8, skin); }
  // head bowed in prayer, a crown of fire
  A.ball(1, yy - 3.2, 2, 2.2, skin, { ao: 0.3 });
  if (!doused) { A.glowPx(1.8, yy - 3.4, hot ? '#ffffff' : '#ffb040', '#ffffff'); A.L(1.6, yy - 2, 2.6, yy - 1.4, '#ff7a2a', 0.5); }
  if (doused) {
    for (let i = 0; i < 3; i++) A.tube([[-1 + i * 1.5, yy - 5], [-1.4 + i * 1.5 + Math.sin(ph + i) * 0.8, yy - 8], [-0.8 + i * 1.5, yy - 11]], 0.7, 0.3, [A.col('steam')]);
  } else {
    flamesHR(A, 1, yy - 4.4, 5, 7 + (hot ? 3 : 0), fph, 'flame', hot);
    flamesHR(A, -7.5, yy - 0.8, 3, 4.5, fph + 1, 'flame', hot); flamesHR(A, 8.5, yy - 0.8, 3, 4.5, fph + 2, 'flame', hot);
    flamesHR(A, 0, -9.5, 4, 3.5, fph + 3, 'flame', hot);
    A.R(-1, yy - 6.4, 4, 0.5, 'halo');
  }
};

// ------------------------------------------------------------------- BELLWETHER: a hulk that wears a cathedral bell for a skull
MPAINT_HR.bell = function (A, pose, ph) {
  const g = pose === 'walk' ? ph : 0, sw = pose === 'walk' ? [1.2, 0, -1.2, 0][g] : 0, br = pose === 'idle' ? ph * 0.6 : 0;
  const swing = pose === 'wind' ? (ph ? 0.3 : -0.2) : pose === 'atk' ? -0.15 : Math.sin(ph * 1.4) * 0.05, duck = pose === 'atk' ? 3 : 0;
  const hide = 'hide';
  // short hind legs
  A.tube([[-6, -12], [-7.5 - sw, -6.5], [-6.5 - sw * 2, -0.5]], 2.2, 1.6, hide, { lit: -0.25 });
  A.tube([[-3, -12], [-2 + sw, -6.5], [-3 + sw * 2, -0.5]], 2.4, 1.7, hide);
  A.R(-8.5 - sw * 2, -1, 4, 1, BR.hide[1]); A.R(-5 + sw * 2, -1, 4.2, 1, BR.hide[2]);
  // the far arm, knuckles on the ground
  A.tube([[-2, -21 + br + duck], [3, -13], [5.5 - sw * 1.2, -1.2]], 2.3, 1.8, hide, { lit: -0.3 });
  // the hunched back, sackcloth over it, chains wound round
  A.ball(-3.5, -18 + br + duck * 0.4, 7.4, 7, hide, { ao: 0.45 });
  A.ball(1.4, -22.5 + br + duck, 5.4, 4.6, hide, { ao: 0.2 });
  A.slab([[-9, -22 + br], [-3, -26.5 + br], [2, -26 + br + duck], [0, -17 + br], [-4, -12], [-9.6, -14]], 'sack', { base: 0.6, folds: 3, fph: ph });
  for (let i = 0; i < 14; i++) { const t = i / 13, cx = -9.5 + t * 12, cy = -13.5 - Math.sin(t * Math.PI) * 9.5 + br + duck * t; A.ball(cx, cy, 0.55, 0.45, 'chain', { lit: 0.1 }); }
  // the bell hung where a head should be: bronze, a cast band of letters, a skull for a clapper
  const bx = 7.5 + duck * 0.7, byy = -27 + br + duck, ca = Math.cos(swing), sa = Math.sin(swing);
  const R = (x, y) => [bx + x * ca - y * sa, byy + x * sa + y * ca];
  A.tube([[2, -24 + br + duck], [bx - 1, byy - 6.5]], 1.4, 1, 'chain');
  A.slab([R(-2.8, -7.5), R(2.8, -7.5), R(3.8, -5.2), R(4.6, 1), R(6.6, 4), R(-6.6, 4), R(-4.6, 1), R(-3.8, -5.2)], 'bronze', { base: 0.85, gx: 0.7, gy: 0.3 });
  const top = R(0, -7.6); A.ball(top[0], top[1], 2.9, 1.3, 'bronze', { lit: 0.15 });
  const b1 = [R(-4.1, -2.5), R(4.1, -2.5)], b2 = [R(-4.4, -1.4), R(4.4, -1.4)];
  A.L(b1[0][0], b1[0][1], b1[1][0], b1[1][1], BR.bronze[5], 0.5); A.L(b2[0][0], b2[0][1], b2[1][0], b2[1][1], BR.bronze[1], 0.5);
  for (let i = 0; i < 6; i++) { const p = R(-3.4 + i * 1.3, -2); A.P(p[0], p[1], BR.bronze[i % 2 ? 1 : 2]); }
  for (let i = 0; i < 3; i++) { const p = R(-3 + i * 2.6, 1.5 + (i % 2)); A.E(p[0], p[1], 0.7, 1.4, BR.verd[1 + (i % 2)]); A.L(p[0], p[1] + 1.2, p[0] + 0.2, p[1] + 3, BR.verd[2], 0.5); }
  const l0 = R(-6.6, 4), l1 = R(6.6, 4); A.L(l0[0], l0[1], l1[0], l1[1], BR.bronze[6], 0.5); A.L(l0[0], l0[1] + 0.5, l1[0], l1[1] + 0.5, BR.bronze[2], 0.5);
  const hole = R(0, 4.6); A.E(hole[0], hole[1], 5.8, 1.2, 'dark');
  const cl = R(Math.sin(ph * 2) * 0.8, 6); skullHR(A, cl[0] - 0.9, cl[1], 0.75, 'skull', 'eye', '#fff0c0', 'dark');
  // the near arm, fist bound in rope
  const fist = pose === 'atk' ? [13.5, -8.5] : [10 + sw * 1.2, -1.4];
  A.ball(-1, -18.5 + br + duck * 0.6, 3.4, 3.2, hide, { lit: 0.05 });
  A.tube([[-1, -18 + br + duck * 0.6], [4 + (pose === 'atk' ? 4 : 0), -10.5 + (pose === 'atk' ? -3 : 0)], fist], 2.7, 2, hide);
  A.ball(fist[0] + 0.5, fist[1] - 0.6, 2.1, 1.7, hide, { lit: 0.1 }); for (let i = 0; i < 3; i++) A.L(fist[0] - 1.2, fist[1] - 2 + i * 0.9, fist[0] + 1.6, fist[1] - 1.7 + i * 0.9, 'rope', 0.5);
};

// ------------------------------------------------------------------- VEIN-WORM: a torn artery of the god, still pumping
MPAINT_HR.worm = function (A, pose, ph) {
  const pulse = 1 + 0.08 * Math.sin(ph * Math.PI), lash = pose === 'atk' ? 1 : 0, rise = pose === 'wind' ? 0.55 : 1, sway = pose === 'walk' ? Math.sin(ph * Math.PI / 2) * 1.2 : Math.sin(ph * 1.7) * 0.5;
  // the torn ground it bursts from
  A.ball(0, -0.8, 6.5, 2, 'dirt', { ao: 0.2 }); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; A.ball(Math.cos(a) * 5.5, -0.8 + Math.sin(a) * 1.6, 1.2, 0.8, 'dirt', { lit: 0.1 }); }
  A.E(0, -1.2, 3.4, 1, '#0a0406');
  // the artery: a thick tube rising and bending, veins wound around it
  const h = 22 * rise, top = [3 + sway + lash * 7, -h + lash * 7];
  const pts = [[0, -1], [-1 + sway * 0.3, -h * 0.35], [0.5 + sway * 0.7 + lash * 3, -h * 0.7 + lash * 2], top];
  A.tube(pts, 2.9 * pulse, 2.2 * pulse, 'art', { ao: 0.1 });
  for (let i = 0; i < 7; i++) { const t = i / 7, k = Math.min(pts.length - 2, Math.floor(t * 3)), u = t * 3 - k, a = pts[k], b = pts[k + 1]; const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u; A.L(x - 2.4, y + 0.6, x + 2.2, y - 0.8, 'vein', 0.5); }
  // the valve-mouth at the top, ringed with teeth, weeping
  const open = pose === 'wind' ? 0.6 : lash ? 2.4 : 1.4 + 0.3 * Math.sin(ph * 2);
  A.ball(top[0], top[1] - 0.4, 3.1 * pulse, 1.9, 'art', { lit: 0.12, rot: -lash * 0.5 });
  A.E(top[0] + 0.4, top[1] - 0.6, 2.2, open * 0.7, 'inner');
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; A.ball(top[0] + 0.4 + Math.cos(a) * 2.1, top[1] - 0.6 + Math.sin(a) * open * 0.6, 0.35, 0.5, 'tooth'); }
  A.P(top[0] + 1.8, top[1] + 1, 'slime'); A.L(top[0] + 2, top[1] + 1, top[0] + 2.3, top[1] + 2.4, 'slime', 0.5);
};

// ------------------------------------------------------------------- MOTH-SAINT: a moth wearing the porcelain face of a saint
MPAINT_HR.moth = function (A, pose, ph) {
  const flap = pose === 'wind' ? -1 : [1, 0.35, -0.7, 0.35][ph % 4] * (pose === 'idle' ? 0.7 : 1), fold = pose === 'wind', dive = pose === 'atk' ? 1 : 0;
  const by = -18 + dive * 3;
  const wing = (dx, s, up, lit) => {
    const tipY = by - 13 * up * s, tipX = dx + (fold ? -12 : -4) * s, lowY = by + 6 * s;
    A.slab([[dx, by - 1.2], [tipX, tipY], [tipX - 5.5 * s, tipY + 4], [dx - 8 * s, by + 3], [dx - 4 * s, lowY], [dx, by + 2]], 'wing', { base: 0.8 + lit, gx: 0.25, gy: 0.45 });
    for (let k = 0; k < 3; k++) A.L(dx, by, tipX - k * 2 * s, tipY + k * 1.6, BR.mothWing[1 + (lit < -0.1 ? 0 : 1)], 0.5);
    A.E(tipX - 1.6 * s, tipY + 3.4, 2 * s, 1.7 * s, 'spot'); A.E(tipX - 1.6 * s, tipY + 3.4, 1.1 * s, 0.9 * s, 'spot2'); A.P(tipX - 1.9 * s, tipY + 3, '#f2e8cc');
    A.R(tipX - 4.5 * s, tipY + 3, 1, 0.6, BR.mothWing[4]);
  };
  wing(0.4, 0.85, fold ? 0.2 : flap, -0.28);
  wing(-0.6, 0.75, fold ? -0.25 : -flap * 0.4 - 0.25, -0.34);
  // abdomen, ringed; the furred thorax
  A.tube([[-1, by + 1.4], [-4.5, by + 4], [-7.5, by + 5.4 + dive]], 2.4, 0.9, 'fur', { ao: 0.2 });
  for (let i = 0; i < 5; i++) A.L(-2 - i * 1.3, by + 1.6 + i * 0.8, -1.2 - i * 1.3, by + 4.4 + i * 0.7, BR.mothFur[1], 0.5);
  A.ball(0.4, by - 0.2, 2.8, 3, 'fur', { ao: 0.3 }); A.grain(-2, by - 3, 5, 6, BR.mothFur[5], 26, 3);
  for (let i = 0; i < 3; i++) A.L(-0.5 + i, by + 2.6, -1.2 + i * 1.4, by + 6 + (i % 2), 'leg', 0.5);
  // the gilded halo and the porcelain face: eyes closed, a painted mouth, a crack running across it
  for (let i = 0; i < 44; i++) { const a = i / 44 * 6.28; A.P(2.8 + Math.cos(a) * 4.4, by - 4.2 + Math.sin(a) * 4.4, A.col('halo')[i % 11 < 5 ? 4 : 3]); }
  A.ball(4, by - 3.2, 2, 3.2, 'face', { spec: '#ffffff' });
  A.L(3.8, by - 3.8, 5.2, by - 3.6, '#6a6470', 0.5); A.L(4.4, by - 4.6, 5.4, by - 4.6, '#a8a2ac', 0.5);
  A.R(4.8, by - 1.4, 1, 0.6, 'lip');
  A.L(2.5, by - 4.8, 4.6, by - 1.8, 'crack', 0.5); A.L(4.6, by - 1.8, 5, by - 0.8, 'crack', 0.5);
  if (fold || dive) A.glowPx(4.6, by - 3.8, '#ffe8a0', '#ffffff');
  for (const k of [0, 1]) { const e = [1 + k * 3.2, by - 10]; A.L(2.9 + k * 0.8, by - 5.8, e[0], e[1], 'leg', 0.5); for (let j = 0; j < 4; j++) A.P(e[0] + 0.5 - (2.9 + k * 0.8 - e[0]) * j / 5, e[1] + 4 * j / 5 - 0.4, 'leg'); }
  wing(1, 1.05, fold ? 0.4 : flap, 0);
};

// ------------------------------------------------------------------- OSSUARY WARDEN: a bone knight behind a tower shield of skulls
MPAINT_HR.warden = function (A, pose, ph) {
  const sw = pose === 'walk' ? [1, 0, -1, 0][ph] : 0, br = pose === 'idle' ? ph * 0.4 : 0, thrust = pose === 'atk' ? 1 : pose === 'wind' ? -1 : 0;
  const bone = 'bone';
  // legs in greaves
  A.tube([[-1, -12], [-0.4 - sw, -6], [-1 - sw * 2, -0.5]], 1, 0.8, bone, { lit: -0.2 }); A.ball(-0.4 - sw, -6, 1.1, 1.2, 'iron', { lit: -0.2 });
  A.tube([[1, -12], [2 + sw, -6], [1.2 + sw * 2, -0.5]], 1.05, 0.85, bone); A.ball(2 + sw, -6, 1.2, 1.3, 'iron');
  A.R(-2 - sw * 2, -1, 2.6, 1, BR.iron[2]); A.R(0.2 + sw * 2, -1, 2.8, 1, BR.iron[3]);
  // spear held back or thrust
  const sp0 = [-6 + thrust * 7, -17 + br], sp1 = [8 + thrust * 7, -19 + br - thrust * 0.5];
  A.L(sp0[0], sp0[1], sp1[0], sp1[1], A.col('wood')[3], 0.5); A.L(sp0[0], sp0[1] + 0.5, sp1[0], sp1[1] + 0.5, A.col('wood')[1], 0.5);
  A.slab([[sp1[0], sp1[1] - 0.8], [sp1[0] + 3, sp1[1] + 0.1], [sp1[0], sp1[1] + 1]], 'iron', { base: 0.9 });
  // body: ribs behind a torn surcoat, a rusted gorget
  A.slab([[-3, -20 + br], [3, -20 + br], [3.4, -11], [-3.2, -11]], 'cloth', { base: 0.55, folds: 2 });
  A.ball(0, -18 + br, 3.2, 3, 'iron', { lit: -0.05, spec: BR.iron[6] }); A.R(-3, -16 + br, 6.2, 0.6, 'rust');
  // skull in a rusted open helm
  A.ball(0.6, -23.2 + br, 2.9, 2.8, 'iron', { ao: 0.2 }); skullHR(A, 1.2, -22.4 + br, 0.85, bone, 'eye', 'eyeHi', 'gap');
  A.R(-2.4, -26 + br, 5.8, 0.8, 'rust'); A.L(0.6, -26.2 + br, 0.6, -28.4 + br, BR.iron[4], 0.5);
  // the near arm on the spear
  A.tube([[1.2, -19 + br], [2.6 + thrust * 3, -16.5 + br], [3.4 + thrust * 6, -17.8 + br]], 0.9, 0.7, bone);
  // the tower shield in front: skulls fused into a slab, iron-banded
  const sx = 5.5 - thrust * 1.5, sy = -8;
  A.slab([[sx - 1, sy - 17 + br], [sx + 3, sy - 16 + br], [sx + 3.4, sy + 5], [sx - 0.6, sy + 6]], 'shield', { base: 0.7, gx: 0.5, gy: 0.2 });
  for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) { const kx = sx + 0.4 + c * 1.6, ky = sy - 14 + r * 4 + (c % 2) * 1.2 + br; A.ball(kx, ky, 0.95, 1.05, 'shield', { lit: 0.1 }); A.P(kx + 0.3, ky - 0.2, 'gap'); A.P(kx - 0.4, ky - 0.2, 'gap'); A.P(kx, ky + 0.6, 'gap'); }
  for (const yb of [sy - 11, sy - 1]) A.L(sx - 0.8, yb + br, sx + 3.3, yb + 0.6 + br, BR.iron[3], 0.5);
};

// ------------------------------------------------------------------- MARROW DUELIST: a skeleton fencer who parries a flurry
MPAINT_HR.duelist = function (A, pose, ph) {
  const sw = pose === 'walk' ? [1, 0, -1, 0][ph] : 0, br = pose === 'idle' ? ph * 0.4 : 0, parry = pose === 'parry', cut = pose === 'atk' ? 1 : pose === 'wind' ? -1 : 0;
  const bone = 'bone';
  A.tube([[-0.8, -11], [-0.2 - sw * 1.2, -5.5], [-1.2 - sw * 2.4, -0.5]], 0.75, 0.6, bone, { lit: -0.2 });
  A.tube([[0.8, -11], [2.4 + sw * 1.2, -5.5], [1.4 + sw * 2.4, -0.5]], 0.8, 0.6, bone);
  // a red sash streaming behind
  A.slab([[-1.6, -18 + br], [-0.6, -17 + br], [-4.6 + Math.sin(ph) * 0.6, -9], [-6 + Math.sin(ph + 1) * 0.8, -8], [-3.4, -15 + br]], 'sash', { base: 0.7, folds: 2, fph: ph });
  // pelvis, spine, ribs
  A.ball(0, -11.2, 1.8, 0.9, bone); A.L(0, -12, 0.4, -18 + br, SK_BONE[3], 0.5);
  for (let i = 0; i < 4; i++) { const y = -17.4 + i * 1.3 + br; A.slab([[-1.6, y], [2.2, y - 0.3], [2.2, y + 0.5], [-1.6, y + 0.6]], bone, { base: 0.75 }); }
  A.E(0.5, -15.2 + br, 1, 2, 'gap');
  // skull with a bone crest
  skullHR(A, 1.4, -21 + br, 0.8, bone, 'eye', 'eyeHi', 'gap');
  A.slab([[-0.6, -23.4 + br], [1.8, -24 + br], [0.2, -26.6 + br]], bone, { base: 0.85 });
  // the sword arm: blade raised for the cut, drawn through, or held upright to parry
  const hand = parry ? [4, -20 + br] : cut < 0 ? [-1.5, -23 + br] : cut > 0 ? [7.5, -14 + br] : [3.6, -15.5 + br];
  A.tube([[0.8, -18.4 + br], parry ? [3, -17 + br] : cut < 0 ? [0, -21 + br] : [3.4, -16.6 + br], hand], 0.6, 0.5, bone);
  const ang = parry ? -Math.PI / 2 : cut < 0 ? -2.4 : cut > 0 ? 0.25 : -0.6, L = 8.5, ca = Math.cos(ang), sa = Math.sin(ang);
  const tip = [hand[0] + ca * L, hand[1] + sa * L], mid = [hand[0] + ca * L * 0.6 - sa * 0.9, hand[1] + sa * L * 0.6 + ca * 0.9];
  A.slab([hand, [mid[0] + sa * 0.6, mid[1] - ca * 0.6], tip, [mid[0] - sa * 0.4, mid[1] + ca * 0.4]], 'blade', { base: 0.95, gx: 0.3, gy: 0.2 });
  A.L(hand[0] - sa * 1.4, hand[1] + ca * 1.4, hand[0] + sa * 1.4, hand[1] - ca * 1.4, 'grip', 0.5);
  if (parry || cut > 0) A.glowPx(tip[0] - ca, tip[1] - sa, '#ffffff', '#ffffff');
  // the far arm balances
  A.tube([[-0.4, -18.2 + br], [-2.4, -16 + br], [-3.2, -13.4 + br]], 0.55, 0.45, bone, { lit: -0.2 });
};
