
// =================================================================== v0.14: the Divination. A new character is read by the Hollow Seer.
// Four rites, each its own little pixel-art scene: draw a card, read the bones, name your deity, give something up.
const FATE = {
  cards: [
    { id: 'digger', name: "The Gravedigger's Hands", fx: { con: 3 }, txt: '+3 Constitution', say: 'You have buried more than you remember. Your hands have not forgotten.' },
    { id: 'moth', name: 'The Moth', fx: { mf: 12 }, txt: '+12% better chance of magic items', say: 'Drawn to every light that burns you. You will find pretty things in the ash.' },
    { id: 'lamb', name: 'The Lamb', fx: { hpPct: 8 }, txt: '+8% life', say: 'Soft. Warm. It will not last, but it will bleed a long while.' },
    { id: 'crow', name: 'The Crow', fx: { gold: 15 }, txt: '+15% gold found', say: 'You will pick at what the others leave behind. So do I.' },
    { id: 'saint', name: 'The Weeping Saint', fx: { vit: 3 }, txt: '+3 Vitality', say: 'She wept for all of you. None of you wept for her.' },
    { id: 'scholar', name: "The Scholar's Eye", fx: { spi: 3 }, txt: '+3 Spirit', say: 'You will read the world closely. The world does not like being read.' },
    { id: 'twin', name: 'The Hanged Twin', fx: { frw: 5 }, txt: '+5% faster movement', say: 'One of you hangs. The other runs. You know which one you are.' },
    { id: 'ratking', name: 'The Rat King', fx: { lok: 2 }, txt: '+2 life after each kill', say: 'Many mouths, one hunger. You will eat well at every grave.' },
    { id: 'wick', name: 'The Wick', fx: { fcr: 8 }, txt: '+8% faster cast rate', say: 'You burn quickly. Everyone who burns quickly thinks it is a gift.' },
    { id: 'pilgrim', name: 'The Pilgrim', fx: { stam: 15 }, txt: '+15 stamina', say: 'A long road, and nothing at the end of it. You will walk it anyway.' },
    { id: 'mourner', name: 'The Mourner', fx: { res: 6 }, txt: '+6% magic resist', say: 'Grief has made you hard to wound. It has made you hard to love, too.' },
    { id: 'key', name: 'The Ossuary Key', fx: { armor: 8 }, txt: '+8 armor', say: 'It opens every door in the house of bones. Only one of them lets you out.' },
    { id: 'cup', name: "The Beggar's Cup", fx: { xp: 6 }, txt: '+6% experience', say: 'Empty, always empty. You will fill it with the lives of others.' }
  ],
  bones: [
    { id: 'crown', see: 'A crown, broken in two', fx: { dmg: 4 }, txt: '+4% skill damage', say: 'A crown. Yes. The Triune wore one too, before it was carved up for meat.' },
    { id: 'door', see: 'A door, standing open', fx: { frw: 6 }, txt: '+6% faster movement', say: 'An open door. Everything is an open door, to those who do not look at what waits inside.' },
    { id: 'mouth', see: 'A mouth, and nothing behind it', fx: { lok: 3 }, txt: '+3 life after each kill', say: 'A hungry mouth. Ha. So you do know yourself, a little.' },
    { id: 'hand', see: "A child's hand, reaching", fx: { hpPct: 10 }, txt: '+10% life', say: 'A child. Whose, I wonder? Not yours. Nothing of you will be left to have children.' },
    { id: 'ladder', see: 'A ladder going down', fx: { xp: 8 }, txt: '+8% experience', say: 'Down. Always down. Every road in this world goes down in the end.' },
    { id: 'tower', see: 'A tower that is also a grave', fx: { armor: 15 }, txt: '+15 armor', say: 'The Tower. Walls to keep the dead in, or the living out. It never matters which.' },
    { id: 'birds', see: 'Birds leaving a dead tree', fx: { fcr: 8 }, txt: '+8% faster cast rate', say: 'They leave before the rot. Clever birds. Cleverer than you.' },
    { id: 'eye', see: 'An eye, closed and weeping', fx: { res: 8 }, txt: '+8% magic resist', say: 'It weeps because it has seen your ending. Do not ask me to describe it.' }
  ],
  // the patterns the thrown bones can make: each is a few line segments on a unit disc
  patterns: [
    [[-0.6, 0.2, 0, -0.5], [0, -0.5, 0.6, 0.2], [-0.4, 0.5, 0.4, 0.5], [0, -0.1, 0, 0.3]],
    [[-0.5, -0.5, 0.5, 0.5], [0.5, -0.5, -0.5, 0.5], [-0.2, 0, 0.2, 0], [0.6, -0.1, 0.7, 0.3]],
    [[-0.7, 0, 0.7, 0], [-0.3, -0.5, -0.3, 0.5], [0.3, -0.5, 0.3, 0.5], [-0.1, 0.6, 0.2, 0.7]],
    [[0, -0.7, 0, 0.7], [-0.5, -0.3, 0.5, -0.3], [-0.4, 0.3, 0.4, 0.3], [-0.6, 0.6, -0.3, 0.4]]
  ],
  stars: [
    { id: 'tower', name: 'Ossark', sub: 'the Standing Dead', fx: { con: 5 }, txt: '+5 Constitution', col: '#e8e2d0', say: 'Ossark. The Standing Dead, god of stacked bones. He held your cradle the way a grave holds a coffin. You will stand. You will not bend. You will break.' },
    { id: 'wheel', name: 'Hemera', sub: 'Mother of the Wheel', fx: { vit: 5 }, txt: '+5 Vitality', col: '#c24050', say: 'Hemera, who turns the Wheel and drinks what spills. She was ascendant, and she was thirsty. You will live long enough to regret it.' },
    { id: 'lantern', name: 'Vey', sub: 'the Last Breath', fx: { spi: 5 }, txt: '+5 Spirit', col: '#bfe8ff', say: 'Vey, keeper of the last breath, still warm in her lantern. She leaned close to your cradle and listened. Little moth. Little moth.' },
    { id: 'hollow', name: 'Ur-Nihl', sub: 'the Hollow God', fx: { res: 8, mf: 8 }, txt: '+8% magic resist · +8% magic find', col: '#b48ad9', say: 'Ur-Nihl. The god that is not there. It was watching the night you were born. It is watching now.' }
  ],
  sacrifices: [
    { id: 'name', give: 'Your name', fx: { xp: 10, gold: -15 }, txt: '+10% experience · -15% gold found', say: 'Your name, then. No one will speak it over your grave. There will be no one to speak.' },
    { id: 'shadow', give: 'Your shadow', fx: { frw: 10, hpPct: -8 }, txt: '+10% faster movement · -8% life', say: 'Your shadow. Light as smoke without it. Thin as smoke, too.' },
    { id: 'eye', give: 'Your left eye', fx: { dmg: 8, armor: -15 }, txt: '+8% skill damage · -15 armor', say: 'The left eye. It saw too much kindness anyway. Now you will see only what you strike.' },
    { id: 'warmth', give: 'Your warmth', fx: { res: 12, stam: -15 }, txt: '+12% magic resist · -15 stamina', say: 'Cold, then. The cold keeps. The cold keeps everything.' },
    { id: 'mother', give: "Your mother's face", fx: { spi: 6, vit: -3 }, txt: '+6 Spirit · -3 Vitality', say: 'Her face. Already gone. You will wonder, some nights, whose voice that was.' },
    { id: 'sleep', give: 'Your sleep', fx: { fcr: 12, hpPct: -6 }, txt: '+12% faster cast rate · -6% life', say: 'No more sleep. No more dreams. You will not miss the dreams. Trust me.' },
    { id: 'voice', give: 'Your voice', fx: { con: 5, fcr: -8 }, txt: '+5 Constitution · -8% faster cast rate', say: 'Your voice. You will scream silently now, like the rest of us.' },
    { id: 'luck', give: 'Your luck', fx: { vit: 2, spi: 2, con: 2, mf: -25 }, txt: '+2 to all attributes · -25% magic find', say: 'Luck. Ha! You never had much. I will take what there is.' },
    { id: 'hunger', give: 'Your hunger', fx: { lok: 4, gold: -10 }, txt: '+4 life after each kill · -10% gold found', say: 'Hunger. Strange gift to give. The dead will feed you instead.' }
  ],
  prophecies: [
    'You will die in the dark, and it will not be the last time.',
    'A crown of bone is waiting for a head. It is not particular about whose.',
    'Something below the Crypt has learned your name. Try not to answer it.',
    'The lanterns will keep calling you back. Ask yourself why they want you so badly.',
    'Three gods will want you. None of them will want you whole.'
  ]
};
// the numbers a fate adds: the plain stats ride along with your gear, the rest is applied in derive()
function fateFx() {
  const out = {}; const F = P.fate; if (!F) return out;
  for (const [list, id] of [[FATE.cards, F.card], [FATE.bones, F.bones], [FATE.stars, F.star], [FATE.sacrifices, F.sac]]) {
    const e = list.find(q => q.id === id); if (!e) continue;
    for (const k in e.fx) out[k] = (out[k] || 0) + e.fx[k];
  }
  return out;
}
function fateStats(s) { const f = fateFx(); for (const k of ['vit', 'spi', 'con', 'dmg', 'frw', 'fcr', 'res', 'mf', 'lok', 'armor']) if (f[k]) s[k] = (s[k] || 0) + f[k]; return s; }
function fateDerive(d) { const f = fateFx(); if (f.hpPct) d.maxHp = Math.max(10, Math.round(d.maxHp * (1 + f.hpPct / 100))); if (f.stam) d.maxStam = Math.max(20, d.maxStam + f.stam); d.xpK = 1 + (f.xp || 0) / 100; d.goldK = 1 + (f.gold || 0) / 100; }
function fateLines() {
  const F = P.fate; if (!F) return [];
  const c = FATE.cards.find(q => q.id === F.card), b = FATE.bones.find(q => q.id === F.bones), s = FATE.stars.find(q => q.id === F.star), x = FATE.sacrifices.find(q => q.id === F.sac);
  return [c && ['Card: ' + c.name, c.txt], b && ['Bones: ' + b.see, b.txt], s && ['Deity: ' + s.name, s.txt], x && ['Gave: ' + x.give, x.txt]].filter(Boolean);
}

// ------------------------------------------------------------------- the reading, scene by scene
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function beginDivination() {
  try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) { actx = null; }
  document.getElementById('intro').hidden = true; cv.focus();
  const V = G.divine = { scene: 'intro', t: 0, lines: [], li: 0, shown: 0, choice: null, picks: {}, btn: [], hover: -1, fade: 1 };
  V.cards = shuffle(FATE.cards).slice(0, 3); V.glyphs = shuffle([0, 1, 2, 3, 4, 5, 6, 7]).slice(0, 3); V.bones = shuffle(FATE.bones).slice(0, 3); V.pattern = pick(FATE.patterns); V.sacs = shuffle(FATE.sacrifices).slice(0, 3);
  V.bonePos = V.pattern.map(() => ({ x: rand(-0.1, 0.1), y: rand(-0.1, 0.1), a: rand(-0.3, 0.3) }));
  divineSay('intro', ['Ah. Another one the Triune forgot to finish.', 'Sit. Your kind always sits, in the end. The chair remembers all of you.', 'Let us see what thread the Silence left hanging from you... and how soon it will be cut.']);
  sfx(55, 2, 'sine', 0.05, 0);
}
function divineSay(scene, lines) { const V = G.divine; V.scene = scene; V.lines = lines; V.li = 0; V.shown = 0; V.t = 0; V.fade = 1; }
function divineAdvance() {
  const V = G.divine; const line = V.lines[V.li] || '';
  if (V.shown < line.length) { V.shown = line.length; return; }
  if (V.li < V.lines.length - 1) { V.li++; V.shown = 0; sfx(180, 0.05, 'triangle', 0.015); return; }
  // end of this scene's words: move on (choice scenes wait for a pick instead)
  const next = { intro: 'cards', cardsDone: 'bones', bonesDone: 'star', starDone: 'sac', sacDone: 'end' }[V.scene];
  if (V.scene === 'end') { finishDivination(); return; }
  if (next === 'cards') divineSay('cards', ['Three cards. Draw one.', 'The other two were never yours. Do not pretend you will miss them.']);
  else if (next === 'bones') { V.choice = null; V.flipT = null; divineSay('bones', ['Now the bones. Old bones. Older than your gods, older than their war.', 'They have fallen. Look closely. What do you see?']); sfx(300, 0.2, 'square', 0.03, -200); setTimeout(() => sfx(420, 0.1, 'square', 0.03, -250), 120); }
  else if (next === 'star') divineSay('star', ['Look up. The old gods hang there still, nailed to the dark. The night you were first dragged screaming into this rotten world, one of them was looking down...', 'Which deity was ascendant?']);
  else if (next === 'sac') divineSay('sac', ['Nothing is given. Not by me. Not by them.', 'Choose what you will lose.']);
  else if (next === 'end') {
    const P0 = V.picks, c = FATE.cards.find(q => q.id === P0.card), b = FATE.bones.find(q => q.id === P0.bones), s = FATE.stars.find(q => q.id === P0.star), x = FATE.sacrifices.find(q => q.id === P0.sac);
    divineSay('end', [`${c.name}. ${b.see.toLowerCase()}. Born under ${s.name}. Robbed of ${x.give.toLowerCase().replace(/^your /, 'your ')}.`, pick(FATE.prophecies), 'Go, then. The Silence is patient. It has waited far longer than you have lived.']);
  }
}
function divinePick(i) {
  const V = G.divine;
  if (V.scene === 'cards' && V.choice == null) { V.choice = i; V.picks.card = V.cards[i].id; V.flipT = 0; sfx(700, 0.3, 'sine', 0.03, -300); setTimeout(() => { if (G.divine) divineSay('cardsDone', [`${V.cards[i].name}.`, V.cards[i].say, 'And these... what you might have been. Do not mourn them. They would not have mourned you.']); }, 900); }
  else if (V.scene === 'bones' && V.choice == null) { V.choice = i; V.picks.bones = V.bones[i].id; sfx(220, 0.4, 'sine', 0.03, 60); divineSay('bonesDone', [V.bones[i].say]); }
  else if (V.scene === 'star') { V.picks.star = FATE.stars[i].id; sfx(900, 0.5, 'sine', 0.03, -400); divineSay('starDone', [FATE.stars[i].say]); }
  else if (V.scene === 'sac') { V.picks.sac = V.sacs[i].id; sfx(70, 0.8, 'sawtooth', 0.04, -20); divineSay('sacDone', [V.sacs[i].say, 'It is done. You will not get it back. No one ever does.']); }
}
function skipDivination() {
  const V = G.divine; if (!V) return;
  V.picks.card = V.picks.card || pick(V.cards).id; V.picks.bones = V.picks.bones || pick(V.bones).id; V.picks.star = V.picks.star || pick(FATE.stars).id; V.picks.sac = V.picks.sac || pick(V.sacs).id;
  finishDivination();
}
function finishDivination() {
  const V = G.divine; G.pendingFate = { card: V.picks.card, bones: V.picks.bones, star: V.picks.star, sac: V.picks.sac };
  G.divine = null; startGame('new');
}
function divineClick() {
  const V = G.divine; if (!V) return;
  for (const b of V.btn) if (inRect(mouse, b.x, b.y, b.w, b.h)) { b.fn(); return; }
  divineAdvance();
}
function updateDivine(dt) {
  const V = G.divine; V.t += dt; V.fade = Math.max(0, V.fade - dt * 1.5);
  const line = V.lines[V.li] || ''; if (V.shown < line.length) { V.shown = Math.min(line.length, V.shown + dt * 38); if (Math.random() < 0.3) sfx(90 + Math.random() * 40, 0.03, 'triangle', 0.006); }
  if (V.flipT != null) V.flipT += dt;
}

// ------------------------------------------------------------------- the pixel-art scenes
function px(x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function divCandle(x, y, h) {
  const fl = Math.sin(G.time * 13 + x) * 0.8 + Math.sin(G.time * 7.3 + x * 2) * 0.6;
  ctx.globalCompositeOperation = 'lighter'; glow(x + 1, y - h - 4, 26, '255,170,80', 0.22 + 0.04 * fl); glow(x + 1, y - h - 4, 8, '255,220,150', 0.5); ctx.globalCompositeOperation = 'source-over';
  px(x - 1, y - h, 4, h, '#d8cfb4'); px(x - 1, y - h, 1, h, '#f4efe2'); px(x + 2, y - h + 2, 1, 3, '#b8ae94');
  px(x, y - h - 2, 2, 2, '#0e0d12'); px(x, y - h - 6 - Math.round(fl), 2, 4 + Math.round(fl), '#ffb050'); px(x, y - h - 4 - Math.round(fl), 2, 2, '#ffe9b0');
  px(x - 2, y, 6, 2, '#3a3028');
}
function divRoom() {
  // a low stone chamber lit only by candles
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b0a0f'); g.addColorStop(1, '#16121a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < 150; y += 12) for (let x = (y / 12) % 2 ? -12 : 0; x < W; x += 24) { px(x, y, 23, 11, `rgb(${22 + ((x * 7 + y * 3) % 9)},${19 + ((x * 3 + y) % 7)},${26 + ((x + y * 5) % 8)})`); }
  // hanging bones and a cracked arch
  ctx.strokeStyle = '#2a2530'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(240, 170, 150, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) { const x = 70 + i * 57, L = 14 + (i * 13) % 20, sw = Math.sin(G.time * 0.8 + i) * 2; ctx.strokeStyle = '#3a3438'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + sw, L); ctx.stroke(); px(x - 2 + sw, L, 5, 4, '#8f8a7c'); px(x - 1 + sw, L + 1, 1, 1, '#0e0d12'); px(x + 1 + sw, L + 1, 1, 1, '#0e0d12'); }
}
function divSeer(eyesK) {
  // the Hollow Seer: a great hood, a shadow for a face, two pale eyes, long fingers of bone
  const cx = 240, top = 38, br = Math.sin(G.time * 1.3) * 1.2;
  ctx.fillStyle = '#0c0a10'; ctx.beginPath(); ctx.moveTo(cx - 70, 180); ctx.quadraticCurveTo(cx - 64, top + 40 + br, cx - 24, top + 8 + br); ctx.quadraticCurveTo(cx, top - 8 + br, cx + 24, top + 8 + br); ctx.quadraticCurveTo(cx + 64, top + 40 + br, cx + 70, 180); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2a2233'; ctx.beginPath(); ctx.moveTo(cx - 62, 180); ctx.quadraticCurveTo(cx - 56, top + 46 + br, cx - 20, top + 14 + br); ctx.quadraticCurveTo(cx, top + 2 + br, cx + 20, top + 14 + br); ctx.quadraticCurveTo(cx + 56, top + 46 + br, cx + 62, 180); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3a3046'; for (let i = 0; i < 5; i++) px(cx - 50 + i * 22, top + 60 + (i % 2) * 6 + br, 2, 110 - (i % 2) * 6, '#1e1826');
  // the face is only dark
  ctx.fillStyle = '#050407'; ctx.beginPath(); ctx.ellipse(cx, top + 34 + br, 17, 21, 0, 0, 6.28); ctx.fill();
  const ek = eyesK == null ? 1 : eyesK, blink = (G.time % 5) < 0.12 ? 0.1 : 1;
  ctx.globalCompositeOperation = 'lighter'; glow(cx - 7, top + 30 + br, 8, '255,220,140', 0.5 * ek); glow(cx + 7, top + 30 + br, 8, '255,220,140', 0.5 * ek); ctx.globalCompositeOperation = 'source-over';
  px(cx - 9, top + 29 + br, 4, 2 * blink, '#ffe2a0'); px(cx + 5, top + 29 + br, 4, 2 * blink, '#ffe2a0');
  // a thin smile, sometimes
  if (Math.sin(G.time * 0.7) > 0.6) { px(cx - 6, top + 44 + br, 12, 1, '#3a2a2a'); px(cx - 7, top + 43 + br, 1, 1, '#3a2a2a'); px(cx + 6, top + 43 + br, 1, 1, '#3a2a2a'); }
}
function divHands(x, y, open) {
  for (const s of [-1, 1]) {
    const hx = x + s * 44, hy = y;
    px(hx - 10, hy - 3, 20, 7, '#2a2233');
    for (let i = 0; i < 4; i++) { const fx = hx - 7 + i * 4 + s * (open ? 2 : 0), L = 9 + (i === 1 || i === 2 ? 3 : 0); px(fx, hy + 3, 2, L, '#cfc6ae'); px(fx, hy + 3 + L - 1, 2, 1, '#f4efe2'); px(fx, hy + 6, 2, 1, '#8f8a7c'); }
  }
}
function divTable() {
  px(0, 176, W, 94, '#1a1016'); px(0, 176, W, 3, '#3a2230');
  const g = ctx.createLinearGradient(0, 178, 0, H); g.addColorStop(0, '#4a1822'); g.addColorStop(1, '#22090e'); ctx.fillStyle = g; ctx.fillRect(40, 178, 400, 92);
  for (let x = 44; x < 436; x += 16) px(x, 178, 8, 2, '#6a2a34');
}
function divVignette(a) {
  const g = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 280); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.75})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); }
  // drifting smoke
  for (let i = 0; i < 14; i++) { const t = G.time * 0.15 + i * 0.37, x = (i * 67 + Math.sin(t * 3) * 30) % W, y = H - ((t * 40 + i * 31) % H); ctx.fillStyle = 'rgba(200,190,220,0.035)'; ctx.beginPath(); ctx.ellipse(x, y, 30, 8, 0, 0, 6.28); ctx.fill(); }
}
function divCard(x, y, w, h, face, e, hi, flipK) {
  const k = flipK == null ? 1 : flipK, sw = Math.max(2, Math.round(w * Math.abs(Math.cos(Math.min(1, k) * Math.PI)))), showFace = face && k > 0.5, cx = x + w / 2;
  if (hi) { ctx.globalCompositeOperation = 'lighter'; glow(cx, y + h / 2, 44, '217,164,65', 0.25 + 0.1 * Math.sin(G.time * 6)); ctx.globalCompositeOperation = 'source-over'; }
  px(cx - sw / 2 - 2, y - 2, sw + 4, h + 4, '#0a0809');
  if (!showFace) {
    px(cx - sw / 2, y, sw, h, '#2a1a30'); px(cx - sw / 2 + 2, y + 2, sw - 4, h - 4, '#3a2446');
    if (sw > 16) { ctx.strokeStyle = '#b48ad9'; ctx.beginPath(); ctx.moveTo(cx, y + 10); ctx.lineTo(cx + 12, y + h / 2); ctx.lineTo(cx, y + h - 10); ctx.lineTo(cx - 12, y + h / 2); ctx.closePath(); ctx.stroke(); px(cx - 2, y + h / 2 - 2, 4, 4, '#d9a441'); }
    return;
  }
  px(cx - sw / 2, y, sw, h, '#e8dcc0'); px(cx - sw / 2 + 2, y + 2, sw - 4, h - 4, '#d6c8a4');
  if (sw < w * 0.8) return;
  // a figure on the card, chosen from its id
  let s = 0; for (const c of e.id) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  const ink = '#3a2a2a', red = '#8e2630', gold = '#9a7430', fy = y + 12;
  const gi = G.divine && G.divine.cards ? G.divine.cards.indexOf(e) : -1;
  switch (gi >= 0 && G.divine.glyphs ? G.divine.glyphs[gi] : s % 8) {
    case 0: /* eye */ px(cx - 10, fy + 14, 21, 9, ink); px(cx - 7, fy + 16, 15, 5, '#e8dcc0'); px(cx - 2, fy + 16, 5, 5, red); for (let i = 0; i < 5; i++) px(cx - 12 + i * 6, fy + 6 - (i % 2) * 3, 1, 5, ink); break;
    case 1: /* tower */ px(cx - 5, fy + 6, 11, 32, ink); px(cx - 7, fy + 2, 15, 5, ink); px(cx - 1, fy + 14, 3, 5, gold); px(cx + 7, fy + 4, 3, 2, red); px(cx + 9, fy + 8, 2, 3, red); break;
    case 2: /* hanged figure */ px(cx - 12, fy, 25, 2, ink); px(cx, fy + 2, 1, 10, ink); px(cx - 3, fy + 12, 7, 6, ink); px(cx - 1, fy + 18, 3, 14, ink); px(cx - 5, fy + 22, 11, 2, ink); break;
    case 3: /* moon */ ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(cx, fy + 18, 11, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#d6c8a4'; ctx.beginPath(); ctx.arc(cx + 5, fy + 15, 10, 0, Math.PI * 2); ctx.fill(); px(cx - 14, fy + 34, 29, 2, ink); break;
    case 4: /* skull */ px(cx - 8, fy + 8, 17, 14, ink); px(cx - 5, fy + 22, 11, 6, ink); px(cx - 5, fy + 12, 4, 4, '#e8dcc0'); px(cx + 2, fy + 12, 4, 4, '#e8dcc0'); px(cx - 3, fy + 24, 1, 3, '#d6c8a4'); px(cx + 1, fy + 24, 1, 3, '#d6c8a4'); break;
    case 5: /* blade */ px(cx - 1, fy + 2, 3, 26, '#6f6a79'); px(cx - 7, fy + 28, 15, 3, gold); px(cx - 1, fy + 31, 3, 7, ink); px(cx, fy + 8, 1, 3, red); break;
    case 6: /* serpent */ for (let i = 0; i < 12; i++) px(cx - 2 + Math.round(8 * Math.sin(i * 0.8)), fy + 4 + i * 3, 5, 4, i ? ink : red); break;
    default: /* sun with wound */ ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(cx, fy + 18, 8, 0, Math.PI * 2); ctx.fill(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; px(cx + Math.cos(a) * 13 - 1, fy + 18 + Math.sin(a) * 13 - 1, 3, 3, gold); } px(cx - 1, fy + 14, 2, 9, red);
  }
  const words = wrapPx(e.name.replace(/^The /, ''), w - 8);
  words.slice(0, 2).forEach((l, i) => txt(l, cx, y + h - 16 + i * 8, '#2a1a1a', 'center', false));
}
function divDialog() {
  const V = G.divine, line = (V.lines[V.li] || '').slice(0, Math.floor(V.shown));
  px(20, 212, W - 40, 52, 'rgba(8,7,11,0.9)'); ctx.strokeStyle = '#3a3446'; ctx.strokeRect(20.5, 212.5, W - 41, 51);
  ctx.font = TITLE_FONT; ctx.textAlign = 'left'; ctx.fillStyle = '#d9a441'; ctx.fillText('The Hollow Seer', 30, 228);
  const lines = wrapPx(line, W - 70); lines.slice(0, 3).forEach((l, i) => txt(l, 30, 240 + i * 9, '#e8e2d0', 'left', false));
  const full = V.shown >= (V.lines[V.li] || '').length;
  if (full && !['cards', 'bones', 'star', 'sac'].includes(V.scene) || (full && V.li < V.lines.length - 1)) { if (Math.floor(G.time * 2) % 2) txt('click', W - 34, 258, '#6f6a79', 'right', false); }
}
function divButton(x, y, w, h, fn) { G.divine.btn.push({ x, y, w, h, fn }); return inRect(mouse, x, y, w, h); }
function drawDivine() {
  const V = G.divine; V.btn = [];
  const full = V.shown >= (V.lines[V.li] || '').length && V.li >= V.lines.length - 1;
  if (V.scene === 'star' || V.scene === 'starDone') drawStarScene(full);
  else {
    divRoom(); divSeer(); divTable();
    divCandle(78, 196, 22); divCandle(96, 200, 14); divCandle(392, 198, 18); divCandle(410, 194, 26);
    if (V.scene === 'intro' || V.scene === 'end') divHands(240, 170, V.scene === 'end');
    if (V.scene === 'cards' || V.scene === 'cardsDone') {
      V.cards.forEach((e, i) => {
        const x = 150 + i * 64, y = 118 + (V.choice === i ? -8 : 0), hov = V.choice == null && full && inRect(mouse, x, y, 52, 80);
        if (V.choice == null && full) divButton(x, y, 52, 80, () => divinePick(i));
        const fk = V.flipT == null ? 0 : V.choice === i ? Math.min(1, V.flipT / 0.5) : Math.min(1, Math.max(0, (V.flipT - 1.6 - i * 0.2) / 0.5));
        divCard(x, y + (hov ? -4 : 0), 52, 80, fk > 0.5, e, hov || V.choice === i, fk);
      });
      if (V.choice != null) {
        const hi = V.cards.findIndex((e, i) => i !== V.choice && inRect(mouse, 150 + i * 64, 118, 52, 80));
        const show = hi >= 0 ? hi : V.choice, e = V.cards[show];
        const fk = V.flipT == null ? 0 : show === V.choice ? Math.min(1, V.flipT / 0.5) : Math.min(1, Math.max(0, (V.flipT - 1.6 - show * 0.2) / 0.5));
        if (fk > 0.9) [(show === V.choice ? '' : 'Unchosen: ') + e.txt].forEach((l, j) => txt(l, W / 2, 206, show === V.choice ? '#d9a441' : '#6f6a79', 'center', false));
      }
      if (V.choice == null && full) txt('Draw a card', W / 2, 108, '#a39d8c', 'center');
    }
    if (V.scene === 'bones' || V.scene === 'bonesDone') drawBoneThrow(full);
    if (V.scene === 'sac' || V.scene === 'sacDone') drawSacrifice(full);
  }
  divVignette(V.fade);
  divDialog();
  // a quiet way out
  if (divButton(W - 72, 6, 66, 12, () => skipDivination())) txt('Skip the reading', W - 8, 14, '#e8e2d0', 'right', false); else txt('Skip the reading', W - 8, 14, '#5a5563', 'right', false);
}
function drawBoneThrow(full) {
  const V = G.divine, cx = 240, cy = 150, R = 42, k = Math.min(1, V.t / 0.6);
  bEll(cx, cy, R * 1.5, R * 0.7, '#2a0e14'); ctx.strokeStyle = '#6a2a34'; ctx.beginPath(); ctx.ellipse(cx, cy, R * 1.5, R * 0.7, 0, 0, 6.28); ctx.stroke();
  ctx.strokeStyle = 'rgba(217,164,65,0.25)'; ctx.beginPath(); ctx.ellipse(cx, cy, R * 1.1, R * 0.5, 0, 0, 6.28); ctx.stroke();
  V.pattern.forEach((sg, i) => {
    const o = V.bonePos[i], drop = (1 - k) * (60 + i * 15);
    const x0 = cx + (sg[0] + o.x) * R * 1.3, y0 = cy + (sg[1] + o.y) * R * 0.6 - drop, x1 = cx + (sg[2] + o.x) * R * 1.3, y1 = cy + (sg[3] + o.y) * R * 0.6 - drop;
    ctx.strokeStyle = '#0e0d12'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 3; ctx.stroke(); ctx.lineWidth = 1;
    px(x0 - 2, y0 - 2, 4, 4, '#f4efe2'); px(x1 - 2, y1 - 2, 4, 4, '#f4efe2');
  });
  if (V.scene === 'bones' && full) V.bones.forEach((b, i) => {
    const x = 60 + i * 124, y = 186, w = 116, h = 20, hov = inRect(mouse, x, y, w, h);
    divButton(x, y, w, h, () => divinePick(i));
    px(x, y, w, h, hov ? '#3a3446' : 'rgba(18,16,22,0.9)'); ctx.strokeStyle = hov ? '#d9a441' : '#3a3446'; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    const ls = wrapPx(b.see, w - 8); ls.slice(0, 2).forEach((l, j) => txt(l, x + w / 2, y + 8 + j * 8 - (ls.length > 1 ? 0 : -3), '#e8e2d0', 'center', false));
    if (hov) txt(b.txt, x + w / 2, y - 4, '#d9a441', 'center');
  });
}
function drawStarScene(full) {
  const V = G.divine;
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05040a'); g.addColorStop(0.7, '#141026'); g.addColorStop(1, '#221a2a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 140; i++) { const x = (i * 97.3) % W, y = (i * 53.7) % 190, tw2 = 0.4 + 0.6 * Math.abs(Math.sin(G.time * (0.5 + (i % 7) * 0.3) + i)); px(x, y, 1, 1, `rgba(232,226,208,${tw2 * (i % 3 ? 0.5 : 0.9)})`); }
  // a sick moon and the silhouette of a dead tree and a tower on the moor
  ctx.globalCompositeOperation = 'lighter'; glow(388, 46, 50, '200,190,160', 0.15); ctx.globalCompositeOperation = 'source-over';
  bEll(388, 46, 16, 16, '#d6cfb8'); bEll(394, 42, 13, 14, '#141026');
  px(0, 200, W, 70, '#0a080c'); ctx.fillStyle = '#0a080c'; ctx.beginPath(); ctx.moveTo(0, 205); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 196 + Math.sin(x * 0.05) * 5); ctx.lineTo(W, 270); ctx.lineTo(0, 270); ctx.fill();
  px(52, 150, 10, 50, '#0a080c'); px(48, 146, 18, 6, '#0a080c'); for (let i = 0; i < 3; i++) px(49 + i * 6, 142, 4, 5, '#0a080c');
  ctx.strokeStyle = '#0a080c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(430, 200); ctx.lineTo(432, 160); ctx.lineTo(420, 140); ctx.moveTo(432, 170); ctx.lineTo(446, 150); ctx.moveTo(426, 150); ctx.lineTo(412, 146); ctx.stroke(); ctx.lineWidth = 1;
  // the four deities, drawn as constellations
  const shapes = { tower: [[0, -14], [0, 0], [-6, 8], [6, 8], [0, 0]], wheel: [[0, -12], [11, -4], [7, 10], [-7, 10], [-11, -4], [0, -12]], lantern: [[0, -14], [-6, -6], [-5, 6], [5, 6], [6, -6], [0, -14]], hollow: [[-10, -10], [10, -10], [10, 10], [-10, 10]] };
  FATE.stars.forEach((s, i) => {
    const cx = 80 + i * 107, cy = 96, pts = shapes[s.id], hov = full && V.scene === 'star' && inRect(mouse, cx - 44, cy - 44, 88, 96), chosen = V.picks.star === s.id;
    if (full && V.scene === 'star') divButton(cx - 44, cy - 44, 88, 96, () => divinePick(i));
    ctx.globalCompositeOperation = 'lighter'; if (hov || chosen) glow(cx, cy, 44, '217,190,120', 0.2 + 0.1 * Math.sin(G.time * 5));
    const rgb = s.col === '#e8e2d0' ? '232,226,208' : s.col === '#c24050' ? '194,64,80' : s.col === '#bfe8ff' ? '191,232,255' : '180,138,217';
    glow(cx, cy, 30, rgb, 0.12); ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = hov || chosen ? s.col : 'rgba(200,190,220,0.35)'; ctx.beginPath(); pts.forEach(([a, b], j) => j ? ctx.lineTo(cx + a * 2, cy + b * 2) : ctx.moveTo(cx + a * 2, cy + b * 2)); if (s.id === 'hollow') ctx.closePath(); ctx.stroke();
    pts.forEach(([a, b]) => { px(cx + a * 2 - 1, cy + b * 2 - 1, 3, 3, s.col); px(cx + a * 2, cy + b * 2, 1, 1, '#ffffff'); });
    if (s.id === 'hollow') { bEll(cx, cy, 6, 6, '#05040a'); ctx.strokeStyle = '#b48ad9'; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 6.28); ctx.stroke(); }
    ctx.font = TITLE_FONT; ctx.textAlign = 'center'; ctx.fillStyle = hov || chosen ? s.col : '#8f8a7c'; ctx.fillText(s.name, cx, cy + 44);
    txt(s.sub, cx, cy + 54, '#6f6a79', 'center', false);
    if (hov) txt(s.txt, cx, cy + 64, '#d9a441', 'center');
  });
}
function drawSacrifice(full) {
  const V = G.divine;
  // the altar: a stone slab, a bowl, a knife
  px(170, 160, 140, 18, '#2a2530'); px(170, 160, 140, 2, '#4a4450'); px(180, 178, 16, 30, '#1e1a24'); px(284, 178, 16, 30, '#1e1a24');
  bEll(240, 158, 18, 6, '#0e0d12'); bEll(240, 157, 15, 4.5, '#3a1418'); bEll(240, 156, 11, 3, '#8e2630'); ctx.globalCompositeOperation = 'lighter'; glow(240, 156, 14, '200,40,56', 0.25 + 0.08 * Math.sin(G.time * 3)); ctx.globalCompositeOperation = 'source-over';
  px(268, 150, 14, 2, '#cfd6e0'); px(262, 150, 7, 2, '#5a4330'); px(281, 149, 2, 1, '#ffffff');
  if (V.scene !== 'sac' || !full) return;
  V.sacs.forEach((e, i) => {
    const x = 50 + i * 130, y = 112, w = 120, h = 40, hov = inRect(mouse, x, y, w, h);
    divButton(x, y, w, h, () => divinePick(i));
    px(x, y, w, h, hov ? 'rgba(58,52,70,0.95)' : 'rgba(18,16,22,0.9)'); ctx.strokeStyle = hov ? '#c8553d' : '#3a3446'; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.font = TITLE_FONT; ctx.textAlign = 'center'; ctx.fillStyle = hov ? '#e8e2d0' : '#a39d8c'; ctx.fillText(e.give, x + w / 2, y + 17);
    const parts2 = e.txt.split(' · '); parts2.forEach((t, j) => txt(t, x + w / 2, y + 27 + j * 8, t.startsWith('-') ? '#c8553d' : '#8b95ff', 'center', false));
  });
  txt('Give one', W / 2, 104, '#a39d8c', 'center');
}
