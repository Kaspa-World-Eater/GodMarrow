
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
  // the deities: the Triune's three broken aspects, and the god that is not there. Your god is your calling.
  stars: [
    { id: 'tower', name: 'Ossark', sub: 'the Standing Dead', cls: 'ossumancer', clsName: 'Ossumancer', blurb: 'Bone: skeletons, the Colossus, bone spells, melee', fx: { con: 5 }, txt: '+5 Constitution', col: '#e8e2d0', say: 'Ossark. The Standing Dead, god of stacked bones. He held your cradle the way a grave holds a coffin. You will stand. You will not bend. You will break.' },
    { id: 'wheel', name: 'Hemera', sub: 'Mother of the Wheel', cls: 'hemomancer', clsName: 'Hemomancer', blurb: 'Blood: a brood of spawn, bleeding, mutations; every spell costs life', fx: { vit: 5 }, txt: '+5 Vitality', col: '#c24050', say: 'Hemera, who turns the Wheel and drinks what spills. She was ascendant, and she was thirsty. You will live long enough to regret it.' },
    { id: 'lantern', name: 'Vey', sub: 'the Last Breath', cls: 'animancer', clsName: 'Animancer', blurb: 'Breath: wisps, the iron golem, spirit magic', fx: { spi: 5 }, txt: '+5 Spirit', col: '#bfe8ff', say: 'Vey, keeper of the last breath, still warm in her lantern. She leaned close to your cradle and listened. Little moth. Little moth.' },
    { id: 'hollow', name: 'Ur-Nihl', sub: 'the Hollow God', cls: 'miasmancer', clsName: 'Assassin', blurb: 'The death cult: miasma, claws, traps, killing blows', fx: { res: 8, mf: 8 }, txt: '+8% magic resist · +8% magic find', col: '#b48ad9', say: 'Ur-Nihl. The god that is not there. It was watching the night you were born. It is watching now.' }
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
  // every god has three faces; the one that turned toward you favors one of your three paths (skill pages)
  faces: {
    tower: [
      { id: 'keeper', name: 'The Gravekeeper', eyes: 1, mouth: 2, fx: { skt0: 1, armor: 6 }, txt: '+1 to Ossuary skills · +6 armor', say: 'The Gravekeeper, lantern low, counting his dead. He will lend you the ones he cannot fit in the ground.' },
      { id: 'marrow', name: 'The Marrow-Eater', eyes: 0, mouth: 0, fx: { skt1: 1, spi: 3 }, txt: '+1 to Marrow skills · +3 Spirit', say: 'The Marrow-Eater cracks the bones to suck out what is inside. Hungry god. Hungry child.' },
      { id: 'wall', name: 'The Ossuary Wall', eyes: 2, mouth: 4, fx: { skt2: 1, con: 3 }, txt: '+1 to Carapace skills · +3 Constitution', say: 'The Wall. Bone on bone on bone. Behind it you will be safe. Nothing behind it is ever safe.' }
    ],
    wheel: [
      { id: 'mother', name: 'The Brood-Mother', eyes: 3, mouth: 2, fx: { skt0: 1, hpPct: 6 }, txt: '+1 to Brood skills · +6% life', say: 'The Brood-Mother. Every tumor is a child to her. You will make a very good mother.' },
      { id: 'vein', name: 'The Open Vein', eyes: 0, mouth: 1, fx: { skt1: 1, dmg: 4 }, txt: '+1 to Blood skills · +4% skill damage', say: 'The Open Vein. She never closed. She never will. Neither will you.' },
      { id: 'butcher', name: 'The Butcher', eyes: 2, mouth: 0, fx: { skt2: 1, con: 3 }, txt: '+1 to Flesh skills · +3 Constitution', say: 'The Butcher, apron stiff with it. She taught the golem how to stand. She will teach you how to carve.' }
    ],
    lantern: [
      { id: 'smith', name: 'The Soul-Smith', eyes: 0, mouth: 4, fx: { skt0: 1, armor: 8 }, txt: '+1 to Iron skills · +8 armor', say: 'The Soul-Smith hammers breath into iron. The iron screams, and then it obeys. Everything obeys, in the end.' },
      { id: 'bearer', name: 'The Lantern-Bearer', eyes: 1, mouth: 2, fx: { skt1: 1, regen: 10 }, txt: '+1 to Anima skills · +10% faster wisp regrowth', say: 'The Lantern-Bearer. The wisps come to her like moths. They will come to you. Pray they are only moths.' },
      { id: 'speaker', name: 'The Speaker', eyes: 1, mouth: 0, fx: { skt2: 1, fcr: 5 }, txt: '+1 to Logos skills · +5% faster cast rate', say: 'The Speaker. Her words unmade a city. Yours will unmake smaller things. Begin with yourself.' }
    ],
    hollow: [
      { id: 'breath', name: 'The Choking Breath', eyes: 2, mouth: 3, fx: { skt0: 1, res: 6 }, txt: '+1 to Miasma skills · +6% magic resist', say: 'The Choking Breath. Ur-Nihl exhaled once, and a whole people stopped. Breathe in, little assassin.' },
      { id: 'unseen', name: 'The Unseen', eyes: 4, mouth: 4, fx: { skt1: 1, frw: 5 }, txt: '+1 to Distortion skills · +5% faster movement', say: 'The Unseen. You will stand in a crowded room and no one will turn. Not even after you are gone.' },
      { id: 'knell', name: 'The Knell', eyes: 0, mouth: 1, fx: { skt2: 1, lok: 2 }, txt: '+1 to Death skills · +2 life after each kill', say: 'The Knell. One toll for every ending. You will ring it often. It will ring once for you.' }
    ]
  },
  fears: [
    { id: 'dark', name: 'The dark', fx: { res: 6 }, txt: '+6% magic resist', say: 'The dark. Good. It is the one thing down there that will never lie to you.' },
    { id: 'fire', name: 'Burning', fx: { vit: 3 }, txt: '+3 Vitality', say: 'Fire. Everything you love will burn, so you have that to look forward to.' },
    { id: 'water', name: 'Drowning', fx: { stam: 15 }, txt: '+15 stamina', say: 'Drowning. You will hold your breath a long time. Longer than the others. Not long enough.' },
    { id: 'crowd', name: 'Being surrounded', fx: { armor: 10 }, txt: '+10 armor', say: 'So many hands. You will learn to wear something thick. It will not be enough.' },
    { id: 'forgot', name: 'Being forgotten', fx: { xp: 6 }, txt: '+6% experience', say: 'Forgotten. Then go and do something worth remembering. Quickly.' },
    { id: 'dogs', name: 'The dogs', fx: { frw: 6 }, txt: '+6% faster movement', say: 'The dogs. You can hear them already, can you not? Run.' },
    { id: 'mirror', name: 'Your own face', fx: { spi: 3 }, txt: '+3 Spirit', say: 'Your own face. Wise. I have seen it. I would not look either.' },
    { id: 'hunger', name: 'Starving', fx: { lok: 2 }, txt: '+2 life after each kill', say: 'Hunger. The dead are full of meat. You will learn not to mind.' }
  ],
  seeks: [
    { id: 'vengeance', name: 'Vengeance', fx: { dmg: 6 }, txt: '+6% skill damage', col: '#c8553d', say: 'Vengeance. That door is heavy, and it only opens one way.' },
    { id: 'knowledge', name: 'Knowledge', fx: { xp: 8 }, txt: '+8% experience', col: '#8b95ff', say: 'Knowledge. There is a library beneath the Crypt. Its books read you back.' },
    { id: 'wealth', name: 'Wealth', fx: { gold: 20, mf: 8 }, txt: '+20% gold · +8% magic find', col: '#d9a441', say: 'Gold. Of course. The dead do not need it, and they will not stop you. Mostly.' },
    { id: 'absolution', name: 'Absolution', fx: { hpPct: 10 }, txt: '+10% life', col: '#e8e2d0', say: 'Absolution. From whom? Every god you could ask is dead or hungry.' },
    { id: 'oblivion', name: 'Oblivion', fx: { res: 10 }, txt: '+10% magic resist', col: '#6f6a79', say: 'Oblivion. That door is always open. You need not hurry.' },
    { id: 'power', name: 'Power', fx: { spi: 4 }, txt: '+4 Spirit', col: '#b48ad9', say: 'Power. They all say power. They all looked like you when they said it.' },
    { id: 'home', name: 'A way home', fx: { frw: 8 }, txt: '+8% faster movement', col: '#9ad0a0', say: 'A way home. There is no home. There is a road, and it is long, and it goes down.' },
    { id: 'corpse', name: 'The dead god', fx: { con: 3, vit: 2 }, txt: '+3 Constitution · +2 Vitality', col: '#c24050', say: 'The Triune itself. Its corpse is down there somewhere. You would not be the first to go looking. You would not be the last to be eaten.' }
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
  for (const [list, id] of [[FATE.cards, F.card], [FATE.bones, F.bones], [FATE.stars, F.star], [FATE.sacrifices, F.sac], [FATE.faces[F.star] || [], F.face], [FATE.fears, F.fear], [FATE.seeks, F.seek]]) {
    const e = list.find(q => q.id === id); if (!e) continue;
    for (const k in e.fx) out[k] = (out[k] || 0) + e.fx[k];
  }
  return out;
}
function fateStats(s) { const f = fateFx(); for (const k of ['vit', 'spi', 'con', 'dmg', 'frw', 'fcr', 'res', 'mf', 'lok', 'armor', 'skt0', 'skt1', 'skt2', 'regen']) if (f[k]) s[k] = (s[k] || 0) + f[k]; return s; }
function fateDerive(d) { const f = fateFx(); if (f.hpPct) d.maxHp = Math.max(10, Math.round(d.maxHp * (1 + f.hpPct / 100))); if (f.stam) d.maxStam = Math.max(20, d.maxStam + f.stam); d.xpK = 1 + (f.xp || 0) / 100; d.goldK = 1 + (f.gold || 0) / 100; }
function fateLines() {
  const F = P.fate; if (!F) return [];
  const f1 = (L, id) => L.find(q => q.id === id);
  const c = f1(FATE.cards, F.card), b = f1(FATE.bones, F.bones), s = f1(FATE.stars, F.star), x = f1(FATE.sacrifices, F.sac), fa = f1(FATE.faces[F.star] || [], F.face), fe = f1(FATE.fears, F.fear), sk = f1(FATE.seeks, F.seek);
  return [s && ['God: ' + s.name, s.txt], fa && ['Face: ' + fa.name, fa.txt], c && ['Card: ' + c.name, c.txt], b && ['Bones: ' + b.see, b.txt], fe && ['Fears: ' + fe.name.toLowerCase(), fe.txt], sk && ['Seeks: ' + sk.name.toLowerCase(), sk.txt], x && ['Gave: ' + x.give, x.txt]].filter(Boolean);
}

// ------------------------------------------------------------------- the reading, scene by scene
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function beginDivination() {
  try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) { actx = null; }
  document.getElementById('intro').hidden = true; cv.focus();
  const V = G.divine = { scene: 'intro', t: 0, lines: [], li: 0, shown: 0, choice: null, picks: {}, btn: [], hover: -1, fade: 1 };
  V.cards = shuffle(FATE.cards).slice(0, 3); V.glyphs = shuffle([0, 1, 2, 3, 4, 5, 6, 7]).slice(0, 3); V.bones = shuffle(FATE.bones).slice(0, 3); V.pattern = pick(FATE.patterns); V.sacs = shuffle(FATE.sacrifices).slice(0, 3); V.fears = shuffle(FATE.fears).slice(0, 3); V.seeks = shuffle(FATE.seeks).slice(0, 3);
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
  const next = { intro: 'star', starDone: 'face', faceDone: 'cards', cardsDone: 'bones', bonesDone: 'fear', fearDone: 'seek', seekDone: 'sac', sacDone: 'end' }[V.scene];
  if (V.scene === 'end') { finishDivination(); return; }
  if (!next) return;
  V.choice = null; V.flipT = null;
  if (next === 'star') divineSay('star', ['Look up. The Triune hangs there still, broken in three and nailed to the dark: Ossark, Hemera, Vey. And beside them, the hole where Ur-Nihl should be.', 'One of them was looking down the night you were dragged screaming into this rotten world. Which?']);
  else if (next === 'face') { const g = FATE.stars.find(q => q.id === V.picks.star); divineSay('face', [`${g.name} has more than one face. Every god does. Most of them are worse than the first.`, 'Which face did it turn toward you?']); }
  else if (next === 'cards') divineSay('cards', ['Three cards. Draw one.', 'The other two were never yours. Do not pretend you will miss them.']);
  else if (next === 'bones') { divineSay('bones', ['Now the bones. Old bones. Older than your gods, older than their war.', 'They have fallen. Look closely. What do you see?']); sfx(300, 0.2, 'square', 0.03, -200); setTimeout(() => sfx(420, 0.1, 'square', 0.03, -250), 120); }
  else if (next === 'fear') { divineSay('fear', ['The candle gutters. Something moves on the wall behind you. Do not turn around.', 'Tell me what it is. What do you fear?']); sfx(60, 1.2, 'sine', 0.05, -10); }
  else if (next === 'seek') divineSay('seek', ['Far below, three doors. You have been walking toward one of them your whole life.', 'What is it you seek down there?']);
  else if (next === 'sac') divineSay('sac', ['Nothing is given. Not by me. Not by them.', 'Choose what you will lose.']);
  else if (next === 'end') {
    const P0 = V.picks, f1 = (L, id) => L.find(q => q.id === id), c = f1(FATE.cards, P0.card), b = f1(FATE.bones, P0.bones), s = f1(FATE.stars, P0.star), x = f1(FATE.sacrifices, P0.sac), fa = f1(FATE.faces[P0.star], P0.face), fe = f1(FATE.fears, P0.fear), sk = f1(FATE.seeks, P0.seek);
    divineSay('end', [`Child of ${s.name}, marked by ${fa.name.replace(/^The /, 'the ')}. ${c.name}. ${b.see}.`, `Afraid of ${fe.name.toLowerCase()}. Looking for ${sk.name.toLowerCase()}. Robbed of ${x.give.toLowerCase()}. A ${s.clsName.toLowerCase()}, then.`, pick(FATE.prophecies), 'Go. The Silence is patient. It has waited far longer than you have lived.']);
  }
}
function divinePick(i) {
  const V = G.divine;
  if (V.scene === 'cards' && V.choice == null) { V.choice = i; V.picks.card = V.cards[i].id; V.flipT = 0; sfx(700, 0.3, 'sine', 0.03, -300); setTimeout(() => { if (G.divine) divineSay('cardsDone', [`${V.cards[i].name}.`, V.cards[i].say, 'And these... what you might have been. Do not mourn them. They would not have mourned you.']); }, 900); }
  else if (V.scene === 'bones' && V.choice == null) { V.choice = i; V.picks.bones = V.bones[i].id; sfx(220, 0.4, 'sine', 0.03, 60); divineSay('bonesDone', [V.bones[i].say]); }
  else if (V.scene === 'star') { V.picks.star = FATE.stars[i].id; V.picks.face = null; sfx(900, 0.5, 'sine', 0.03, -400); divineSay('starDone', [FATE.stars[i].say, `So. You will walk the ${FATE.stars[i].clsName.toLowerCase()}'s road. There is no other road for you now.`]); }
  else if (V.scene === 'face') { const F = FATE.faces[V.picks.star][i]; V.choice = i; V.picks.face = F.id; sfx(500, 0.6, 'sine', 0.03, -200); divineSay('faceDone', [F.say]); }
  else if (V.scene === 'fear') { const F = V.fears[i]; V.choice = i; V.picks.fear = F.id; sfx(80, 0.8, 'sine', 0.05, -30); divineSay('fearDone', [F.say]); }
  else if (V.scene === 'seek') { const F = V.seeks[i]; V.choice = i; V.picks.seek = F.id; sfx(260, 0.7, 'triangle', 0.03, 120); divineSay('seekDone', [F.say]); }
  else if (V.scene === 'sac') { V.picks.sac = V.sacs[i].id; sfx(70, 0.8, 'sawtooth', 0.04, -20); divineSay('sacDone', [V.sacs[i].say, 'It is done. You will not get it back. No one ever does.']); }
}
function skipDivination() {
  const V = G.divine; if (!V) return;
  // the god is your class: that one choice cannot be skipped
  if (!V.picks.star) { if (V.scene !== 'star') { V.choice = null; divineSay('star', ['Impatient. Fine. But this much you must answer yourself.', 'Which god was looking down the night you were born?']); V.li = 1; } return; }
  V.picks.face = V.picks.face || pick(FATE.faces[V.picks.star]).id;
  V.picks.card = V.picks.card || pick(V.cards).id; V.picks.bones = V.picks.bones || pick(V.bones).id; V.picks.sac = V.picks.sac || pick(V.sacs).id;
  V.picks.fear = V.picks.fear || pick(V.fears).id; V.picks.seek = V.picks.seek || pick(V.seeks).id;
  finishDivination();
}
function finishDivination() {
  const V = G.divine, P0 = V.picks; G.pendingFate = { star: P0.star, face: P0.face, card: P0.card, bones: P0.bones, fear: P0.fear, seek: P0.seek, sac: P0.sac };
  const g = FATE.stars.find(q => q.id === P0.star); if (g) G.pickCls = g.cls;
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
  if (full && !['cards', 'bones', 'star', 'sac', 'face', 'fear', 'seek'].includes(V.scene) || (full && V.li < V.lines.length - 1)) { if (Math.floor(G.time * 2) % 2) txt('click', W - 34, 258, '#6f6a79', 'right', false); }
}
function divButton(x, y, w, h, fn) { G.divine.btn.push({ x, y, w, h, fn }); return inRect(mouse, x, y, w, h); }
function drawDivine() {
  const V = G.divine; V.btn = [];
  const full = V.shown >= (V.lines[V.li] || '').length && V.li >= V.lines.length - 1;
  if (V.scene === 'star' || V.scene === 'starDone') drawStarScene(full);
  else if (['face', 'faceDone', 'fear', 'fearDone', 'seek', 'seekDone'].includes(V.scene)) { /* drawn below */ }
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
  if (V.scene === 'face' || V.scene === 'faceDone') drawFaceScene(full);
  if (V.scene === 'fear' || V.scene === 'fearDone') drawFearScene(full);
  if (V.scene === 'seek' || V.scene === 'seekDone') drawSeekScene(full);
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
  ctx.globalCompositeOperation = 'lighter'; glow(36, 34, 50, '200,190,160', 0.15); ctx.globalCompositeOperation = 'source-over';
  bEll(36, 34, 16, 16, '#d6cfb8'); bEll(42, 30, 13, 14, '#141026');
  px(0, 200, W, 70, '#0a080c'); ctx.fillStyle = '#0a080c'; ctx.beginPath(); ctx.moveTo(0, 205); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 196 + Math.sin(x * 0.05) * 5); ctx.lineTo(W, 270); ctx.lineTo(0, 270); ctx.fill();
  px(52, 150, 10, 50, '#0a080c'); px(48, 146, 18, 6, '#0a080c'); for (let i = 0; i < 3; i++) px(49 + i * 6, 142, 4, 5, '#0a080c');
  ctx.strokeStyle = '#0a080c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(430, 200); ctx.lineTo(432, 160); ctx.lineTo(420, 140); ctx.moveTo(432, 170); ctx.lineTo(446, 150); ctx.moveTo(426, 150); ctx.lineTo(412, 146); ctx.stroke(); ctx.lineWidth = 1;
  // the Triune's three aspects are joined by a faint, broken line; Ur-Nihl hangs apart
  txt('THE TRIUNE, BROKEN IN THREE', 187, 36, '#5a5563', 'center', false); txt('WHAT IS NOT THERE', 401, 36, '#5a5563', 'center', false);
  ctx.strokeStyle = 'rgba(200,190,220,0.12)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(80, 44); ctx.lineTo(294, 44); ctx.stroke(); ctx.setLineDash([]);
  if (V.scene === 'star' && full) txt('Your god is your calling', W / 2, 206, '#6f6a79', 'center', false);
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
    if (hov || (chosen && V.scene === 'starDone')) {
      txt(s.clsName.toUpperCase(), W / 2, 170, s.col, 'center');
      txt(s.blurb, W / 2, 182, '#a39d8c', 'center', false);
      txt('Patron gift: ' + s.txt, W / 2, 193, '#d9a441', 'center', false);
    }
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

// ------------------------------------------------------------------- v0.15 scenes: the god's faces, the fear, the doors
function divMask(cx, cy, god, F, hi) {
  const col = god.col, rgb = { tower: '232,226,208', wheel: '194,64,80', lantern: '191,232,255', hollow: '180,138,217' }[god.id];
  if (hi) { ctx.globalCompositeOperation = 'lighter'; glow(cx, cy, 46, rgb, 0.25 + 0.1 * Math.sin(G.time * 5)); ctx.globalCompositeOperation = 'source-over'; }
  const base = { tower: '#d8cfb8', wheel: '#8e3a42', lantern: '#7a8a96', hollow: '#2a2034' }[god.id], dark = { tower: '#8f8a7c', wheel: '#4a141c', lantern: '#3e4650', hollow: '#120e18' }[god.id];
  // the mask: a long oval with a notched brow, hung from a nail
  px(cx - 1, cy - 44, 2, 8, '#3a3438'); px(cx - 2, cy - 46, 4, 3, '#6f6a79');
  bEll(cx, cy, 22, 30, '#0a0809'); bEll(cx, cy, 20, 28, base); bEll(cx + 5, cy + 4, 13, 22, dark); bEll(cx - 3, cy - 3, 15, 22, base);
  // god marks
  if (god.id === 'tower') { ctx.strokeStyle = '#6f6a5c'; ctx.beginPath(); ctx.moveTo(cx + 6, cy - 27); ctx.lineTo(cx + 2, cy - 16); ctx.lineTo(cx + 7, cy - 9); ctx.stroke(); }
  if (god.id === 'wheel') for (let i = 0; i < 4; i++) { const dx = -12 + i * 8, L = 6 + ((i * 7 + Math.floor(G.time * 2)) % 5); px(cx + dx, cy + 18, 2, L, '#c24050'); px(cx + dx, cy + 18 + L, 2, 2, '#e06070'); }
  if (god.id === 'lantern') { ctx.globalCompositeOperation = 'lighter'; glow(cx, cy - 30, 14, '191,232,255', 0.3); ctx.globalCompositeOperation = 'source-over'; px(cx - 14, cy - 30, 28, 2, '#a4a4ae'); for (let i = 0; i < 5; i++) px(cx - 12 + i * 6, cy - 34, 2, 4, '#a4a4ae'); }
  if (god.id === 'hollow') { ctx.strokeStyle = '#b48ad9'; ctx.beginPath(); ctx.ellipse(cx, cy, 21, 29, 0, 0, 6.28); ctx.stroke(); }
  // eyes: 0 slits, 1 glowing holes, 2 stitched shut, 3 many small eyes, 4 none at all
  const ey = cy - 8;
  if (F.eyes === 0) { px(cx - 12, ey, 8, 2, '#0a0809'); px(cx + 4, ey, 8, 2, '#0a0809'); px(cx - 12, ey - 1, 2, 1, '#0a0809'); px(cx + 10, ey - 1, 2, 1, '#0a0809'); }
  else if (F.eyes === 1) { bEll(cx - 8, ey, 4, 5, '#0a0809'); bEll(cx + 8, ey, 4, 5, '#0a0809'); ctx.globalCompositeOperation = 'lighter'; glow(cx - 8, ey, 6, rgb, 0.7); glow(cx + 8, ey, 6, rgb, 0.7); ctx.globalCompositeOperation = 'source-over'; px(cx - 9, ey - 1, 2, 2, '#ffffff'); px(cx + 7, ey - 1, 2, 2, '#ffffff'); }
  else if (F.eyes === 2) { for (const sx of [-8, 8]) { px(cx + sx - 5, ey, 10, 1, '#1e1214'); for (let i = 0; i < 4; i++) px(cx + sx - 4 + i * 3, ey - 2, 1, 5, '#1e1214'); } }
  else if (F.eyes === 3) { for (let i = 0; i < 7; i++) { const ex = cx - 13 + (i * 37) % 26, yy = ey - 8 + (i * 23) % 16; bEll(ex, yy, 2.5, 2, '#f0e6d0'); px(ex - 1, yy - 1, 2, 2, '#1a0a0e'); } }
  // mouth: 0 open with teeth, 1 a vertical wound, 2 a thin line, 3 open and breathing smoke, 4 none
  const my = cy + 12;
  if (F.mouth === 0) { bEll(cx, my, 9, 5, '#0a0809'); for (let i = 0; i < 6; i++) { px(cx - 8 + i * 3, my - 4, 2, 3, '#f0e6d0'); px(cx - 7 + i * 3, my + 2, 2, 2, '#f0e6d0'); } }
  else if (F.mouth === 1) { bEll(cx, my - 2, 3, 10, '#0a0809'); bEll(cx, my - 2, 1.5, 8, '#8e2630'); }
  else if (F.mouth === 2) { px(cx - 8, my, 16, 2, '#0a0809'); px(cx - 9, my - 1, 2, 1, '#0a0809'); px(cx + 7, my + 2, 2, 1, '#0a0809'); }
  else if (F.mouth === 3) { bEll(cx, my, 6, 6, '#0a0809'); for (let i = 0; i < 6; i++) { const t2 = (G.time * 0.6 + i / 6) % 1; ctx.fillStyle = `rgba(150,110,190,${0.35 * (1 - t2)})`; ctx.beginPath(); ctx.ellipse(cx + Math.sin(t2 * 6 + i) * 6, my - t2 * 40, 3 + t2 * 8, 2 + t2 * 4, 0, 0, 6.28); ctx.fill(); } }
}
function drawFaceScene(full) {
  const V = G.divine, god = FATE.stars.find(q => q.id === V.picks.star), faces = FATE.faces[god.id];
  // a shrine niche: dark stone, the god's colour bleeding in from above
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b0a0f'); g.addColorStop(1, '#140f16'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < 200; y += 14) for (let x = (y / 14) % 2 ? -16 : 0; x < W; x += 32) px(x, y, 31, 13, `rgb(${18 + ((x * 7 + y * 3) % 8)},${16 + ((x * 3 + y) % 6)},${22 + ((x + y * 5) % 7)})`);
  const rgb = { tower: '232,226,208', wheel: '194,64,80', lantern: '191,232,255', hollow: '180,138,217' }[god.id];
  ctx.globalCompositeOperation = 'lighter'; glow(240, 0, 200, rgb, 0.08); ctx.globalCompositeOperation = 'source-over';
  px(60, 30, 360, 6, '#2a2530'); px(60, 170, 360, 8, '#2a2530'); px(60, 170, 360, 2, '#4a4450');
  txt(god.name.toUpperCase() + ' · ' + god.sub.toUpperCase(), W / 2, 22, god.col, 'center', false);
  divCandle(36, 170, 20); divCandle(444, 170, 20);
  const pages = TAB_SETS[god.cls];
  faces.forEach((F, i) => {
    const cx = 120 + i * 120, cy = 96, hov = full && V.scene === 'face' && inRect(mouse, cx - 50, cy - 44, 100, 104), chosen = V.choice === i;
    if (full && V.scene === 'face') divButton(cx - 50, cy - 44, 100, 104, () => divinePick(i));
    ctx.globalAlpha = V.choice != null && !chosen ? 0.35 : 1;
    divMask(cx, cy, god, F, hov || chosen);
    ctx.font = TITLE_FONT; ctx.textAlign = 'center'; ctx.fillStyle = hov || chosen ? god.col : '#8f8a7c'; ctx.fillText(F.name.replace(/^The /, ''), cx, 150);
    txt('+1 to ' + pages[i] + ' skills', cx, 162, hov || chosen ? '#8b95ff' : '#5a5563', 'center', false);
    if (hov || chosen) txt(F.txt.split(' · ')[1], cx, 196, '#d9a441', 'center', false);
    ctx.globalAlpha = 1;
  });
}
function fearShadow(id, cx, base, k) {
  // the shadow the candle throws on the wall: black shapes, trembling with the flame
  ctx.fillStyle = `rgba(0,0,0,${0.75 * k})`; const tr = Math.sin(G.time * 11) * 1.5, E2 = (x, y, rx, ry) => { ctx.beginPath(); ctx.ellipse(cx + x + tr, base + y, rx, ry, 0, 0, 6.28); ctx.fill(); };
  if (id === 'fire') for (let i = 0; i < 7; i++) { const x = -60 + i * 20, h = 50 + Math.sin(G.time * 5 + i * 1.7) * 18 + (i % 2) * 20; ctx.beginPath(); ctx.moveTo(cx + x - 12, base); ctx.quadraticCurveTo(cx + x - 8 + tr, base - h * 0.6, cx + x + Math.sin(G.time * 7 + i) * 5, base - h); ctx.quadraticCurveTo(cx + x + 8, base - h * 0.5, cx + x + 12, base); ctx.fill(); }
  else if (id === 'water') { const lvl = 40 + Math.sin(G.time * 0.8) * 10; ctx.beginPath(); ctx.moveTo(cx - 110, base); for (let x = -110; x <= 110; x += 6) ctx.lineTo(cx + x, base - lvl - Math.sin(x * 0.08 + G.time * 3) * 5); ctx.lineTo(cx + 110, base); ctx.fill(); E2(0, -lvl - 14, 9, 11); ctx.fillRect(cx - 14 + tr, base - lvl - 30, 4, 14); ctx.fillRect(cx + 10 + tr, base - lvl - 34, 4, 18); }
  else if (id === 'crowd') for (let i = 0; i < 9; i++) { const x = -96 + i * 24, y = -(i % 2) * 8 - 40; E2(x, y - 18, 8, 10); ctx.beginPath(); ctx.ellipse(cx + x + tr, base + y + 20, 13, 26, 0, 0, 6.28); ctx.fill(); if (i % 3 === 1) ctx.fillRect(cx + x + 8 + tr, base + y - 30, 3, 26); }
  else if (id === 'forgot') { for (let i = 0; i < 40; i++) { const a = i * 2.4, r = (i * 7) % 30; if ((i + Math.floor(G.time * 3)) % 3) ctx.fillRect(cx + Math.cos(a) * r * 0.5 + tr, base - 60 + Math.sin(a) * r * 1.6, 3, 3); } }
  else if (id === 'dogs') for (const sd of [-1, 1]) { const x = sd * 50, j = Math.max(0, Math.sin(G.time * 4 + sd)) * 8; ctx.beginPath(); ctx.moveTo(cx + x - sd * 30, base); ctx.lineTo(cx + x - sd * 26, base - 50); ctx.lineTo(cx + x - sd * 10, base - 80); ctx.lineTo(cx + x - sd * 16, base - 96); ctx.lineTo(cx + x - sd * 4, base - 86); ctx.lineTo(cx + x + sd * 26, base - 82); ctx.lineTo(cx + x + sd * 30, base - 76 + j * 0.3); ctx.lineTo(cx + x + sd * 6, base - 68 + j); ctx.lineTo(cx + x + sd * 10, base - 40); ctx.lineTo(cx + x + sd * 20, base); ctx.fill(); }
  else if (id === 'mirror') { ctx.strokeStyle = `rgba(0,0,0,${0.75 * k})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(cx + tr, base - 60, 34, 48, 0, 0, 6.28); ctx.stroke(); ctx.lineWidth = 1; E2(0, -70, 14, 17); ctx.beginPath(); ctx.ellipse(cx + tr, base - 30, 20, 18, 0, Math.PI, 0); ctx.fill(); }
  else if (id === 'hunger') { ctx.beginPath(); ctx.ellipse(cx + tr, base - 60, 70, 40, 0, 0, 6.28); ctx.fill(); ctx.fillStyle = `rgba(90,70,60,${0.5 * k})`; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(cx - 56 + i * 14, base - 92); ctx.lineTo(cx - 49 + i * 14, base - 70); ctx.lineTo(cx - 42 + i * 14, base - 92); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx - 56 + i * 14, base - 28); ctx.lineTo(cx - 49 + i * 14, base - 50); ctx.lineTo(cx - 42 + i * 14, base - 28); ctx.fill(); } }
  else if (id === 'dark') { const t2 = 0.5 + 0.5 * Math.sin(G.time * 0.7); const gg = ctx.createRadialGradient(cx, base - 50, 20, cx, base - 50, 160 - 40 * t2); gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(1, `rgba(0,0,0,${0.95 * k})`); ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H); for (const [x, y] of [[-90, -90], [80, -110], [120, -40], [-130, -30]]) { px(cx + x, base + y, 3, 1, `rgba(255,220,150,${0.6 * k * t2})`); px(cx + x + 6, base + y, 3, 1, `rgba(255,220,150,${0.6 * k * t2})`); } }
  else { // your own shadow, shaking
    E2(0, -92, 11, 13); ctx.beginPath(); ctx.moveTo(cx - 26 + tr, base); ctx.lineTo(cx - 20 + tr, base - 60); ctx.quadraticCurveTo(cx + tr, base - 84, cx + 20 + tr, base - 60); ctx.lineTo(cx + 26 + tr, base); ctx.fill(); }
}
function drawFearScene(full) {
  const V = G.divine;
  // a bare wall, one candle on the floor; its light throws a shadow up behind you
  ctx.fillStyle = '#07060a'; ctx.fillRect(0, 0, W, H);
  const fl = 0.85 + 0.1 * Math.sin(G.time * 13) + 0.05 * Math.sin(G.time * 29);
  const wg = ctx.createRadialGradient(240, 180, 10, 240, 150, 230); wg.addColorStop(0, `rgba(120,86,60,${0.55 * fl})`); wg.addColorStop(0.5, `rgba(60,40,34,${0.4 * fl})`); wg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = wg; ctx.fillRect(0, 0, W, 190);
  for (let y = 0; y < 186; y += 12) for (let x = (y / 12) % 2 ? -12 : 0; x < W; x += 24) { ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.strokeRect(x + 0.5, y + 0.5, 23, 11); }
  px(0, 186, W, 84, '#0c0a0e'); px(0, 186, W, 2, '#2a2024');
  const hov = full && V.scene === 'fear' ? V.fears.findIndex((e, i) => inRect(mouse, 40 + i * 136, 190, 128, 16)) : -1;
  const show = V.choice != null ? V.fears[V.choice].id : hov >= 0 ? V.fears[hov].id : null;
  fearShadow(show, 240, 186, 1);
  divCandle(240, 184, 10);
  if (V.scene === 'fear' && full) V.fears.forEach((e, i) => {
    const x = 40 + i * 136, y = 190, w = 128, h = 16, on = hov === i;
    divButton(x, y, w, h, () => divinePick(i));
    px(x, y, w, h, on ? '#3a3446' : 'rgba(18,16,22,0.9)'); ctx.strokeStyle = on ? '#d9a441' : '#3a3446'; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    txt(e.name, x + w / 2, y + 10, '#e8e2d0', 'center', false);
    if (on) txt(e.txt, x + w / 2, y - 5, '#d9a441', 'center');
  });
  if (V.choice != null) txt(V.fears[V.choice].txt, W / 2, 204, '#d9a441', 'center', false);
}
function drawDoor(cx, top, w, h, e, open, hi) {
  // an arched door set in the rock; a crack of coloured light when it is chosen or considered
  const x = cx - w / 2, rgb = e.col.match(/\w\w/g).map(v => parseInt(v, 16)).join(',');
  px(x - 4, top - 4, w + 8, h + 4, '#1a171e'); ctx.fillStyle = '#1a171e'; ctx.beginPath(); ctx.arc(cx, top, w / 2 + 4, Math.PI, 0); ctx.fill();
  if (open > 0) { ctx.globalCompositeOperation = 'lighter'; glow(cx, top + h / 2, 40 + open * 30, rgb, 0.18 + 0.2 * open); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = e.col; ctx.fillRect(x, top, w, h); ctx.beginPath(); ctx.arc(cx, top, w / 2, Math.PI, 0); ctx.fill(); }
  const dw = w * (1 - 0.55 * open);
  ctx.fillStyle = '#3a2a22'; ctx.fillRect(x, top, dw, h); ctx.save(); ctx.beginPath(); ctx.rect(x, top - w / 2, dw, w / 2); ctx.clip(); ctx.beginPath(); ctx.arc(cx, top, w / 2, Math.PI, 0); ctx.fill(); ctx.restore();
  for (let i = 1; i < 4; i++) px(x + i * dw / 4, top - 4, 1, h + 4, '#241a16');
  px(x, top + 12, dw, 3, '#4a4450'); px(x, top + h - 16, dw, 3, '#4a4450'); px(x + dw - 7, top + h / 2, 3, 3, hi ? '#d9a441' : '#8f8a7c');
  if (open > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(${rgb},${0.25 * open})`; ctx.beginPath(); ctx.moveTo(x + dw, top + h); ctx.lineTo(x + w, top + h); ctx.lineTo(cx + w * 1.2, 190); ctx.lineTo(cx - w * 0.2, 190); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
}
function drawSeekScene(full) {
  const V = G.divine;
  // a stair ends in a rock hall far below; three doors
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#040306'); g.addColorStop(1, '#120e14'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0e0c11'; ctx.beginPath(); ctx.moveTo(0, 190); ctx.lineTo(W, 190); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
  for (let i = 0; i < 8; i++) { const y = 190 + i * 3; px(0, y, W, 1, `rgba(60,52,70,${0.25 - i * 0.03})`); }
  for (let i = 0; i < 12; i++) px((i * 53) % W, 20 + (i * 37) % 60, 2, 30 + (i * 11) % 40, '#0a080c');
  V.seeks.forEach((e, i) => {
    const cx = 110 + i * 130, top = 92, hov = full && V.scene === 'seek' && inRect(mouse, cx - 32, 50, 64, 140), chosen = V.choice === i;
    if (full && V.scene === 'seek') divButton(cx - 32, 50, 64, 140, () => divinePick(i));
    if (!V.dOpen) V.dOpen = [0, 0, 0];
    V.dOpen[i] += ((chosen ? 1 : hov ? 0.35 : 0) - V.dOpen[i]) * 0.12;
    ctx.globalAlpha = V.choice != null && !chosen ? 0.4 : 1;
    drawDoor(cx, top, 44, 96, e, V.dOpen[i], hov || chosen);
    ctx.font = TITLE_FONT; ctx.textAlign = 'center'; ctx.fillStyle = hov || chosen ? e.col : '#8f8a7c'; ctx.fillText(e.name, cx, 204);
    ctx.globalAlpha = 1;
    if (hov || chosen) txt(e.txt, cx, 44, '#d9a441', 'center', false);
  });
}
