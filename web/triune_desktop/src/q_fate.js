
// =================================================================== v0.14: the Divination. A new character is read by the Mysterious Stranger.
// Four rites, each its own little pixel-art scene: draw a card, read the bones, name your deity, give something up.
const FATE = {
  cards: [
    { id: 'digger', name: "The Gravedigger's Hands", fx: { con: 3, stam: -5 }, txt: '+3 Constitution · -5 stamina', rev: { fx: { lok: 2, con: -2 }, txt: '+2 life after each kill · -2 Constitution', say: 'Reversed, the hands dig their own grave. They are very good at it.' }, say: 'You have buried more than you remember. Your hands have not forgotten.' },
    { id: 'moth', name: 'The Moth', fx: { mf: 12, hpPct: -4 }, txt: '+12% magic find · -4% life', rev: { fx: { fcr: 6, mf: -10 }, txt: '+6% faster cast rate · -10% magic find', say: 'The moth, upside down: it has already burned. It moves quicker for it.' }, say: 'Drawn to every light that burns you. You will find pretty things in the ash.' },
    { id: 'lamb', name: 'The Lamb', fx: { hpPct: 8, dmg: -4 }, txt: '+8% life · -4% skill damage', rev: { fx: { dmg: 6, hpPct: -8 }, txt: '+6% skill damage · -8% life', say: 'The lamb reversed is the knife. Softness was never going to last.' }, say: 'Soft. Warm. It will not last, but it will bleed a long while.' },
    { id: 'crow', name: 'The Crow', fx: { gold: 15, res: -4 }, txt: '+15% gold found · -4% magic resist', rev: { fx: { mf: 8, gold: -15 }, txt: '+8% magic find · -15% gold found', say: 'The crow turned over picks at better things than coin.' }, say: 'You will pick at what the others leave behind. So do I.' },
    { id: 'saint', name: 'The Weeping Saint', fx: { vit: 3, fcr: -3 }, txt: '+3 Vitality · -3% faster cast rate', rev: { fx: { res: 6, vit: -2 }, txt: '+6% magic resist · -2 Vitality', say: 'The saint reversed stops weeping and starts to endure.' }, say: 'She wept for all of you. None of you wept for her.' },
    { id: 'scholar', name: "The Scholar's Eye", fx: { spi: 3, con: -2 }, txt: '+3 Essence · -2 Constitution', rev: { fx: { xp: 6, spi: -2 }, txt: '+6% experience · -2 Essence', say: 'The eye turned inward learns faster, and sees less.' }, say: 'You will read the world closely. The world does not like being read.' },
    { id: 'twin', name: 'The Hanged Twin', fx: { frw: 5, armor: -5 }, txt: '+5% faster movement · -5 armor', rev: { fx: { armor: 10, frw: -4 }, txt: '+10 armor · -4% faster movement', say: 'Reversed, it is the hanged one you become. Heavier. Harder to kill.' }, say: 'One of you hangs. The other runs. You know which one you are.' },
    { id: 'ratking', name: 'The Rat King', fx: { lok: 2, hpPct: -4 }, txt: '+2 life after each kill · -4% life', rev: { fx: { gold: 12, res: -3 }, txt: '+12% gold found · -3% magic resist', say: 'The rat king reversed hoards instead of eats.' }, say: 'Many mouths, one hunger. You will eat well at every grave.' },
    { id: 'wick', name: 'The Wick', fx: { fcr: 8, hpPct: -5 }, txt: '+8% faster cast rate · -5% life', rev: { fx: { hpPct: 5, fcr: -6 }, txt: '+5% life · -6% faster cast rate', say: 'The wick upside down burns slow. You will last. You will be slow about it.' }, say: 'You burn quickly. Everyone who burns quickly thinks it is a gift.' },
    { id: 'pilgrim', name: 'The Pilgrim', fx: { stam: 15, dmg: -3 }, txt: '+15 stamina · -3% skill damage', rev: { fx: { frw: 4, stam: -10 }, txt: '+4% faster movement · -10 stamina', say: 'The pilgrim reversed runs from the road instead of walking it.' }, say: 'A long road, and nothing at the end of it. You will walk it anyway.' },
    { id: 'mourner', name: 'The Mourner', fx: { res: 6, xp: -5 }, txt: '+6% magic resist · -5% experience', rev: { fx: { spi: 3, res: -5 }, txt: '+3 Essence · -5% magic resist', say: 'Grief reversed is rage. It will feed your spells and leave you open.' }, say: 'Grief has made you hard to wound. It has made you hard to love, too.' },
    { id: 'key', name: 'The Ossuary Key', fx: { armor: 8, frw: -3 }, txt: '+8 armor · -3% faster movement', rev: { fx: { mf: 10, armor: -6 }, txt: '+10% magic find · -6 armor', say: 'The key turned opens the other doors, the ones with treasure behind them.' }, say: 'It opens every door in the house of bones. Only one of them lets you out.' },
    { id: 'cup', name: "The Beggar's Cup", fx: { xp: 6, gold: -10 }, txt: '+6% experience · -10% gold found', rev: { fx: { gold: 20, xp: -4 }, txt: '+20% gold found · -4% experience', say: 'The cup reversed spills gold. You will be rich and learn nothing.' }, say: 'Empty, always empty. You will fill it with the lives of others.' }
  ],
  bones: [
    { id: 'crown', see: 'A crown, broken in two', fx: { dmg: 4, armor: -5 }, txt: '+4% skill damage · -5 armor', say: 'A crown. Yes. The god wore one too, before it was carved up for meat.' },
    { id: 'door', see: 'A door, standing open', fx: { frw: 6, res: -4 }, txt: '+6% faster movement · -4% magic resist', say: 'An open door. Everything is an open door, to those who do not look at what waits inside.' },
    { id: 'mouth', see: 'A mouth, and nothing behind it', fx: { lok: 3, hpPct: -5 }, txt: '+3 life after each kill · -5% life', say: 'A hungry mouth. Ha. So you do know yourself, a little.' },
    { id: 'hand', see: "A child's hand, reaching", fx: { hpPct: 10, fcr: -3 }, txt: '+10% life · -3% faster cast rate', say: 'A child. Whose, I wonder? Not yours. Nothing of you will be left to have children.' },
    { id: 'ladder', see: 'A ladder going down', fx: { xp: 8, gold: -10 }, txt: '+8% experience · -10% gold found', say: 'Down. Always down. Every road in this world goes down in the end.' },
    { id: 'tower', see: 'A tower that is also a grave', fx: { armor: 15, frw: -4 }, txt: '+15 armor · -4% faster movement', say: 'The Tower. Walls to keep the dead in, or the living out. It never matters which.' },
    { id: 'birds', see: 'Birds leaving a dead tree', fx: { fcr: 8, con: -2 }, txt: '+8% faster cast rate · -2 Constitution', say: 'They leave before the end. Clever birds. Cleverer than you.' },
    { id: 'eye', see: 'An eye, closed and weeping', fx: { res: 8, mf: -6 }, txt: '+8% magic resist · -6% magic find', say: 'It weeps because it has seen your ending. Do not ask me to describe it.' }
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
    { id: 'tower', name: 'Oss-Vharoth', sub: 'the Standing Dead', cls: 'ossumancer', clsName: 'Ossurarch', blurb: 'Bone: skeletons, the Colossus, bone spells, melee', fx: { con: 5, fcr: -5 }, txt: '+5 Constitution · -5% faster cast rate', col: '#e8e2d0', say: 'Oss-Vharoth. The Standing Dead, the skeleton that would not lie down when the god fell. It held your cradle the way a grave holds a coffin. You will stand. You will not bend. You will break.' },
    { id: 'wheel', name: 'Nol-Shogthuth', sub: 'Mother of the Wheel', cls: 'hemomancer', clsName: 'Hemomancer', blurb: 'Blood: a brood of spawn, bleeding, mutations; every spell costs life', fx: { vit: 5, res: -6 }, txt: '+5 Vitality · -6% magic resist', col: '#c24050', say: 'Nol-Shogthuth, the flesh that keeps growing with no mind to stop it. The Wheel turns in her and she drinks what spills. She was ascendant, and she was thirsty. You will live long enough to regret it.' },
    { id: 'lantern', name: "Yh'Anuul", sub: 'the Last Breath', cls: 'animancer', clsName: 'Animancer', blurb: 'Breath: wisps, the iron golem, spirit magic', fx: { spi: 5, armor: -6 }, txt: '+5 Essence · -6 armor', col: '#bfe8ff', say: "Yh'Anuul, the god's last exhale, still leaving the body and never done leaving. It leaned close to your cradle and listened." + ' Little moth. Little moth.' },
    { id: 'hollow', name: 'The Myriad', sub: 'the Spirits in All Things', cls: 'miasmancer', clsName: 'Assassin', blurb: 'The purifiers: miasma drawn out of the world and turned on its makers, claws, traps, killing blows', fx: { res: 8, mf: 8, hpPct: -5 }, txt: '+8% magic resist · +8% magic find · -5% life', col: '#e8a060', say: 'The Myriad. Not one god: every stone and river and rotting thing in this corpse-world has a small spirit of its own, and they are choking on the filth. Your people bow to all of them. You will draw the rot out of the world, hold it in yourself, and give it back to what made it.' }
  ],
  sacrifices: [
    { id: 'name', give: 'Your name', fx: { xp: 10, gold: -15 }, txt: '+10% experience · -15% gold found', say: 'Your name, then. No one will speak it over your grave. There will be no one to speak.' },
    { id: 'shadow', give: 'Your shadow', fx: { frw: 10, hpPct: -8 }, txt: '+10% faster movement · -8% life', say: 'Your shadow. Light as smoke without it. Thin as smoke, too.' },
    { id: 'eye', give: 'Your left eye', fx: { dmg: 8, armor: -15 }, txt: '+8% skill damage · -15 armor', say: 'The left eye. It saw too much kindness anyway. Now you will see only what you strike.' },
    { id: 'warmth', give: 'Your warmth', fx: { res: 12, stam: -15 }, txt: '+12% magic resist · -15 stamina', say: 'Cold, then. The cold keeps. The cold keeps everything.' },
    { id: 'mother', give: "Your mother's face", fx: { spi: 6, vit: -3 }, txt: '+6 Essence · -3 Vitality', say: 'Her face. Already gone. You will wonder, some nights, whose voice that was.' },
    { id: 'sleep', give: 'Your sleep', fx: { fcr: 12, hpPct: -6 }, txt: '+12% faster cast rate · -6% life', say: 'No more sleep. No more dreams. You will not miss the dreams. Trust me.' },
    { id: 'voice', give: 'Your voice', fx: { con: 5, fcr: -8 }, txt: '+5 Constitution · -8% faster cast rate', say: 'Your voice. You will scream silently now, like the rest of us.' },
    { id: 'luck', give: 'Your luck', fx: { vit: 2, spi: 2, con: 2, mf: -25 }, txt: '+2 to all attributes · -25% magic find', say: 'Luck. Ha! You never had much. I will take what there is.' },
    { id: 'hunger', give: 'Your hunger', fx: { lok: 4, gold: -10 }, txt: '+4 life after each kill · -10% gold found', say: 'Hunger. Strange gift to give. The dead will feed you instead.' }
  ],
  // every god has three faces; the one that turned toward you favors one of your three paths (skill pages)
  faces: {
    tower: [
      { id: 'keeper', name: 'The Gravekeeper', eyes: 1, mouth: 2, fx: { skt0: 1, armor: 6, frw: -3 }, txt: '+1 to Ossuary skills · +6 armor · -3% faster movement', say: 'The Gravekeeper, lantern low, counting his dead. He will lend you the ones he cannot fit in the ground.' },
      { id: 'marrow', name: 'The Marrow-Eater', eyes: 0, mouth: 0, fx: { skt1: 1, spi: 3, armor: -5 }, txt: '+1 to Marrow skills · +3 Essence · -5 armor', say: 'The Marrow-Eater cracks the bones to suck out what is inside. Hungry god. Hungry child.' },
      { id: 'wall', name: 'The Ossuary Wall', eyes: 2, mouth: 4, fx: { skt2: 1, con: 3, fcr: -4 }, txt: '+1 to Carapace skills · +3 Constitution · -4% faster cast rate', say: 'The Wall. Bone on bone on bone. Behind it you will be safe. Nothing behind it is ever safe.' }
    ],
    wheel: [
      { id: 'mother', name: 'The Brood-Bride', eyes: 3, mouth: 2, fx: { skt0: 1, hpPct: 6, dmg: -4 }, txt: '+1 to Brood skills · +6% life · -4% skill damage', say: 'The Brood-Bride. Every tumour is a child to her. You will make a very good mother.' },
      { id: 'vein', name: 'The Open Vein', eyes: 0, mouth: 1, fx: { skt1: 1, dmg: 4, hpPct: -5 }, txt: '+1 to Blood skills · +4% skill damage · -5% life', say: 'The Open Vein. She never closed. She never will. Neither will you.' },
      { id: 'butcher', name: 'The Butcher', eyes: 2, mouth: 0, fx: { skt2: 1, con: 3, res: -3 }, txt: '+1 to Flesh skills · +3 Constitution · -3% magic resist', say: 'The Butcher, apron stiff with it. She taught the golem how to stand. She will teach you how to carve.' }
    ],
    lantern: [
      { id: 'smith', name: 'The Soul-Smith', eyes: 0, mouth: 4, fx: { skt0: 1, armor: 8, fcr: -4 }, txt: '+1 to Iron skills · +8 armor · -4% faster cast rate', say: 'The Soul-Smith hammers breath into iron. The iron screams, and then it obeys. Everything obeys, in the end.' },
      { id: 'bearer', name: 'The Lantern-Bearer', eyes: 1, mouth: 2, fx: { skt1: 1, regen: 10, armor: -5 }, txt: '+1 to Anima skills · +10% faster wisp regrowth · -5 armor', say: 'The Lantern-Bearer. The wisps come to her like moths. They will come to you. Pray they are only moths.' },
      { id: 'speaker', name: 'The Speaker', eyes: 1, mouth: 0, fx: { skt2: 1, fcr: 5, hpPct: -5 }, txt: '+1 to Logos skills · +5% faster cast rate · -5% life', say: 'The Speaker. Her words unmade a city. Yours will unmake smaller things. Begin with yourself.' }
    ],
    hollow: [
      { id: 'breath', name: 'The Purifier', eyes: 2, mouth: 3, fx: { skt0: 1, res: 6, hpPct: -5 }, txt: '+1 to Miasma skills · +6% magic resist · -5% life', say: 'The Purifier. She draws the defilement out of the dead and binds it in paper. Breathe in what the world cannot bear, little assassin.' },
      { id: 'unseen', name: 'The Keeper at the Gate', eyes: 4, mouth: 4, fx: { skt1: 1, frw: 5, armor: -5 }, txt: '+1 to Distortion skills · +5% faster movement · -5 armor', say: 'The Keeper at the Gate, who guards the spirit road. It is never where you look. Neither will you be.' },
      { id: 'knell', name: 'The Bell-Rope', eyes: 0, mouth: 1, fx: { skt2: 1, lok: 2, res: -4 }, txt: '+1 to Death skills · +2 life after each kill · -4% magic resist', say: 'The Bell-Rope, pulled to wake the spirits before a killing. One pull for every ending. It will be pulled once for you.' }
    ]
  },
  fears: [
    { id: 'dark', name: 'The dark', fx: { res: 6, mf: -5 }, txt: '+6% magic resist · -5% magic find', say: 'The dark. Good. It is the one thing down there that will never lie to you.' },
    { id: 'fire', name: 'Burning', fx: { vit: 3, fcr: -3 }, txt: '+3 Vitality · -3% faster cast rate', say: 'Fire. Everything you love will burn, so you have that to look forward to.' },
    { id: 'water', name: 'Drowning', fx: { stam: 15, frw: -3 }, txt: '+15 stamina · -3% faster movement', say: 'Drowning. You will hold your breath a long time. Longer than the others. Not long enough.' },
    { id: 'crowd', name: 'Being surrounded', fx: { armor: 10, dmg: -3 }, txt: '+10 armor · -3% skill damage', say: 'So many hands. You will learn to wear something thick. It will not be enough.' },
    { id: 'forgot', name: 'Being forgotten', fx: { xp: 6, gold: -8 }, txt: '+6% experience · -8% gold found', say: 'Forgotten. Then go and do something worth remembering. Quickly.' },
    { id: 'dogs', name: 'The dogs', fx: { frw: 6, armor: -4 }, txt: '+6% faster movement · -4 armor', say: 'The dogs. You can hear them already, can you not? Run.' },
    { id: 'mirror', name: 'Your own face', fx: { spi: 3, vit: -2 }, txt: '+3 Essence · -2 Vitality', say: 'Your own face. Wise. I have seen it. I would not look either.' },
    { id: 'hunger', name: 'Starving', fx: { lok: 2, stam: -5 }, txt: '+2 life after each kill · -5 stamina', say: 'Hunger. The dead are full of meat. You will learn not to mind.' }
  ],
  seeks: [
    { id: 'vengeance', name: 'Vengeance', fx: { dmg: 6, res: -5 }, txt: '+6% skill damage · -5% magic resist', col: '#c8553d', say: 'Vengeance. That door is heavy, and it only opens one way.' },
    { id: 'knowledge', name: 'Knowledge', fx: { xp: 8, dmg: -3 }, txt: '+8% experience · -3% skill damage', col: '#8b95ff', say: 'Knowledge. There is a library beneath the Crypt. Its books read you back.' },
    { id: 'wealth', name: 'Wealth', fx: { gold: 20, mf: 8, hpPct: -6 }, txt: '+20% gold found · +8% magic find · -6% life', col: '#d9a441', say: 'Gold. Of course. The dead do not need it, and they will not stop you. Mostly.' },
    { id: 'absolution', name: 'Absolution', fx: { hpPct: 10, dmg: -4 }, txt: '+10% life · -4% skill damage', col: '#e8e2d0', say: 'Absolution. From whom? Every god you could ask is dead or hungry.' },
    { id: 'oblivion', name: 'Oblivion', fx: { res: 10, xp: -6 }, txt: '+10% magic resist · -6% experience', col: '#6f6a79', say: 'Oblivion. That door is always open. You need not hurry.' },
    { id: 'power', name: 'Power', fx: { spi: 4, vit: -3 }, txt: '+4 Essence · -3 Vitality', col: '#b48ad9', say: 'Power. They all say power. They all looked like you when they said it.' },
    { id: 'home', name: 'A way home', fx: { frw: 8, armor: -8 }, txt: '+8% faster movement · -8 armor', col: '#9ad0a0', say: 'A way home. There is no home. There is a road, and it is long, and it goes down.' },
    { id: 'corpse', name: 'The dead god', fx: { con: 3, vit: 2, fcr: -6 }, txt: '+3 Constitution · +2 Vitality · -6% faster cast rate', col: '#c24050', say: 'The dead god itself. Its heart is down there somewhere, under all of us. You would not be the first to go looking. You would not be the last to be eaten.' }
  ],
  roads: [
    { id: 'pilgrim', name: 'The Pilgrim Road', fx: { frw: 1, armor: -2 }, txt: '', say: 'The pilgrim road. Worn hollow by knees. Everyone on it was walking to a god who had already died.' },
    { id: 'river', name: 'The Black River', fx: { res: 1, stam: -2 }, txt: '', say: 'The river. It runs under the barrows and comes up cold. You still smell of it.' },
    { id: 'ash', name: 'The Ash Road', fx: { armor: 3, hpPct: -1 }, txt: '', say: 'The ash road. Something burned at both ends of it. You walked through the middle.' },
    { id: 'bone', name: 'The Ossuary Stair', fx: { con: 1, mf: -1 }, txt: '', say: 'The stair of bones. Every step was someone. You counted them, at first.' },
    { id: 'blood', name: 'The Red Ditch', fx: { lok: 1, res: -1 }, txt: '', say: 'The red ditch. It was a road once. Then the war came, and then the war stayed.' },
    { id: 'dark', name: 'The Lampless Way', fx: { mf: 1, frw: -1 }, txt: '', say: 'No lamps on that way. You found it by touch. Your hands remember things your eyes never saw.' },
    { id: 'bell', name: 'The Bell Road', fx: { fcr: 1, stam: -2 }, txt: '', say: 'The bell road. They ring for the dead up there, day and night. You learned to speak between the strokes.' },
    { id: 'nowhere', name: 'No Road at All', fx: { xp: 1, gold: -1 }, txt: '', say: 'No road. You simply were here, one evening, by my fire. That happens more than you would think. It is never good.' }
  ],
  prophecies: [
    'You will die in the dark, and it will not be the last time.',
    'A crown of bone is waiting for a head. It is not particular about whose.',
    'Something below the Crypt has learned your name. Try not to answer it.',
    'The lanterns will keep calling you back. Ask yourself why they want you so badly.',
    'Three faces will want you. None of them will want you whole.'
  ]
};
// the numbers a fate adds: the plain stats ride along with your gear, the rest is applied in derive()
function fateFx() {
  const out = {}; const F = P.fate; if (!F) return out;
  for (const [list, id] of [[FATE.cards, F.card], [FATE.bones, F.bones], [FATE.stars, F.star], [FATE.sacrifices, F.sac], [FATE.faces[F.star] || [], F.face], [FATE.fears, F.fear], [FATE.seeks, F.seek], [FATE.roads || [], F.road], [FATE.questions ? FATE.questions.flatMap(q => q.a) : [], F.ask]]) {
    const e = list.find(q => q.id === id); if (!e) continue;
    const fx = list === FATE.cards && F.cardRev && e.rev ? e.rev.fx : e.fx;
    for (const k in fx) out[k] = (out[k] || 0) + fx[k];
  }
  return out;
}
function fateStats(s) { const f = fateFx(); for (const k of ['vit', 'spi', 'con', 'dmg', 'frw', 'fcr', 'res', 'mf', 'lok', 'armor', 'skt0', 'skt1', 'skt2', 'regen']) if (f[k]) s[k] = (s[k] || 0) + f[k]; return s; }
function fateDerive(d) { const f = fateFx(); if (f.hpPct) d.maxHp = Math.max(10, Math.round(d.maxHp * (1 + f.hpPct / 100))); if (f.stam) d.maxStam = Math.max(20, d.maxStam + f.stam); d.xpK = 1 + (f.xp || 0) / 100; d.goldK = 1 + (f.gold || 0) / 100; }
function fateLines() {
  const F = P.fate; if (!F) return []; fateLore36();
  const f1 = (L, id) => L.find(q => q.id === id);
  const c = f1(FATE.cards, F.card), b = f1(FATE.bones, F.bones), s = f1(FATE.stars, F.star), x = f1(FATE.sacrifices, F.sac), fa = f1(FATE.faces[F.star] || [], F.face), fe = f1(FATE.fears, F.fear), sk = f1(FATE.seeks, F.seek);
  return [s && ['God: ' + s.name, s.txt], fa && ['Face: ' + fa.name, fa.txt], c && ['Card: ' + c.name + (F.cardRev ? ' (reversed)' : ''), F.cardRev && c.rev ? c.rev.txt : c.txt], b && ['Bones: ' + b.see, b.txt], fe && ['Fears: ' + fe.name.toLowerCase(), fe.txt], sk && ['Seeks: ' + sk.name.toLowerCase(), sk.txt], f1(FATE.roads || [], F.road) && ['Came by: ' + f1(FATE.roads, F.road).name, f1(FATE.roads, F.road).txt], fateAnswer(F) && ['Answered: "' + fateAnswer(F).ans + '"', fateAnswer(F).txt], x && ['Gave: ' + x.give, x.txt]].filter(Boolean);
}

// ------------------------------------------------------------------- the reading, scene by scene
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function beginDivination(test) {
  fateLore36();
  try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) { actx = null; }
  document.getElementById('intro').hidden = true; cv.focus();
  const V = G.divine = { scene: 'intro', t: 0, lines: [], li: 0, shown: 0, choice: null, picks: {}, btn: [], hover: -1, fade: 1 };
  V.cards = shuffle(FATE.cards).slice(0, 3); V.glyphs = shuffle([0, 1, 2, 3, 4, 5, 6, 7]).slice(0, 3); V.bones = shuffle(FATE.bones).slice(0, 3); V.pattern = pick(FATE.patterns); V.sacs = shuffle(FATE.sacrifices).slice(0, 3); V.fears = shuffle(FATE.fears).slice(0, 3); V.seeks = shuffle(FATE.seeks).slice(0, 3);
  V.roads = shuffle(FATE.roads || []).slice(0, 3);
  V.qi = Math.floor(Math.random() * FATE.questions.length);
  V.bonePos = V.pattern.map(() => ({ x: rand(-0.1, 0.1), y: rand(-0.1, 0.1), a: rand(-0.3, 0.3) }));
  if (test) { V.test = true; divineSay('star', ['A tester. The gods are patient with you. Choose one and go.', 'Which god?']); V.li = 1; V.shown = 99; return; }
  divineSay('intro', ['Ah. Another one the dead god forgot to finish.', 'Sit. Your kind always sits, in the end. The chair remembers all of you.', 'Let us see what thread the Void left hanging from you... and how soon it will be cut.']);
  sfx(55, 2, 'sine', 0.05, 0);
}
function divineSay(scene, lines) { const V = G.divine; if (FATE.asides && FATE.asides[scene] && !V.test && Math.random() < 0.65) lines = [pick(FATE.asides[scene])].concat(lines); V.scene = scene; V.lines = lines; V.li = 0; V.shown = 0; V.t = 0; V.fade = 1; }
function divineAdvance() {
  const V = G.divine; const line = V.lines[V.li] || '';
  if (V.shown < line.length) { V.shown = line.length; return; }
  if (V.li < V.lines.length - 1) { V.li++; V.shown = 0; sfx(180, 0.05, 'triangle', 0.015); return; }
  // end of this scene's words: move on (choice scenes wait for a pick instead)
  const next = { intro: 'star', starDone: 'face', faceDone: 'cards', cardsDone: 'cardRev', cardRevDone: 'bones', bonesDone: 'fear', fearDone: 'seek', seekDone: 'road', roadDone: 'ask', askDone: 'sac', sacDone: 'end' }[V.scene];
  if (V.scene === 'end') { finishDivination(); return; }
  if (V.test && V.scene === 'starDone') { const g = FATE.stars.find(q => q.id === V.picks.star); G.pickCls = g.cls; G.divine = null; startGame('test'); return; }
  if (!next) return;
  if (next === 'cardRev') V.choice0 = V.choice;
  if (next !== 'cardRev') { V.choice = null; V.flipT = null; }
  if (next === 'star') divineSay('star', ['Look up. The god is dead, and its body is the ground you crawled out of. But its faces still hang there in the dark: the Weeping Maiden, who was its flesh. The Bearing Mother, its bone. The Veiled Crone, its soul.', 'Below them, the last breath it never finished letting go. And the hole where the Void That Emanates waits. Not for you. Not yet. Unless it is already smiling at you.', 'One of them was looking down the night you were dragged screaming into the dead god\'s body. Which?']);
  else if (next === 'face') { const g = FATE.stars.find(q => q.id === V.picks.star); divineSay('face', [`${g.name} has more than one face. Every god does. Most of them are worse than the first.`, 'Which face did it turn toward you?']); }
  else if (next === 'cards') divineSay('cards', ['Three cards. Draw one.', 'The other two were never yours. Do not pretend you will miss them.']);
  else if (next === 'cardRev') { const c = V.cards[V.choice0]; V.choice = null; divineSay('cardRev', [`Every card has two faces. ${c.name} fell upright... but you may turn it.`, 'Take it as it fell, or reversed?']); }
  else if (next === 'bones') { divineSay('bones', ['Now the bones. Old bones. Older than your gods, older than their war.', 'They have fallen. Look closely. What do you see?']); sfx(300, 0.2, 'square', 0.03, -200); setTimeout(() => sfx(420, 0.1, 'square', 0.03, -250), 120); }
  else if (next === 'fear') { divineSay('fear', ['The candle gutters. Something moves on the wall behind you. Do not turn around.', 'Tell me what it is. What do you fear?']); sfx(60, 1.2, 'sine', 0.05, -10); }
  else if (next === 'seek') divineSay('seek', ['Far below, three doors. You have been walking toward one of them your whole life.', 'What is it you seek down there?']);
  else if (next === 'road') divineSay('road', ['Every one of you came by some road, and every road left its dust on you.', 'Which road brought you to my fire?']);
  else if (next === 'ask') divineSay('ask', FATE.questions[V.qi].q.slice());
  else if (next === 'sac') divineSay('sac', ['Nothing is given. Not by me. Not by them.', 'Choose what you will lose.']);
  else if (next === 'end') {
    const P0 = V.picks, f1 = (L, id) => L.find(q => q.id === id), c = f1(FATE.cards, P0.card), b = f1(FATE.bones, P0.bones), s = f1(FATE.stars, P0.star), x = f1(FATE.sacrifices, P0.sac), fa = f1(FATE.faces[P0.star], P0.face), fe = f1(FATE.fears, P0.fear), sk = f1(FATE.seeks, P0.seek);
    divineSay('end', [`Child of ${s.name.replace(/^The /, 'the ')}, marked by ${fa.name.replace(/^The /, 'the ')}. ${c.name}${P0.cardRev ? ', reversed' : ''}. ${b.see}.`, `Afraid of ${fe.name.toLowerCase()}. Looking for ${sk.name.toLowerCase()}. Robbed of ${x.give.toLowerCase()}. A ${s.clsName.toLowerCase()}, then.`, pick(FATE.prophecies), 'Go. The Void is patient. It has waited far longer than you have lived.']);
  }
}
function divinePick(i) {
  const V = G.divine;
  if (V.scene === 'cards' && V.choice == null) { V.choice = i; V.picks.card = V.cards[i].id; V.flipT = 0; sfx(700, 0.3, 'sine', 0.03, -300); setTimeout(() => { if (G.divine) divineSay('cardsDone', [`${V.cards[i].name}.`, V.cards[i].say, 'And these... what you might have been. Do not mourn them. They would not have mourned you.']); }, 900); }
  else if (V.scene === 'cardRev' && V.choice == null) { const c = V.cards[V.choice0]; V.choice = i; V.picks.cardRev = i === 1; V.revT = 0; sfx(i ? 240 : 600, 0.5, 'sine', 0.03, i ? -120 : 200); divineSay('cardRevDone', [i ? c.rev.say : 'Upright, then. As it fell. Cowards and wise men choose the same.']); }
  else if (V.scene === 'bones' && V.choice == null) { V.choice = i; V.picks.bones = V.bones[i].id; sfx(220, 0.4, 'sine', 0.03, 60); divineSay('bonesDone', [V.bones[i].say]); }
  else if (V.scene === 'star') { V.picks.star = FATE.stars[i].id; V.picks.face = null; sfx(900, 0.5, 'sine', 0.03, -400); divineSay('starDone', [FATE.stars[i].say, `So. You will walk the ${FATE.stars[i].clsName.toLowerCase()}'s road. There is no other road for you now.`]); }
  else if (V.scene === 'face') { const F = FATE.faces[V.picks.star][i]; V.choice = i; V.picks.face = F.id; sfx(500, 0.6, 'sine', 0.03, -200); divineSay('faceDone', [F.say]); }
  else if (V.scene === 'fear') { const F = V.fears[i]; V.choice = i; V.picks.fear = F.id; sfx(80, 0.8, 'sine', 0.05, -30); divineSay('fearDone', [F.say]); }
  else if (V.scene === 'seek') { const F = V.seeks[i]; V.choice = i; V.picks.seek = F.id; sfx(260, 0.7, 'triangle', 0.03, 120); divineSay('seekDone', [F.say]); }
  else if (V.scene === 'road' && V.choice == null) { const F = V.roads[i]; V.choice = i; V.picks.road = F.id; sfx(200, 0.6, 'triangle', 0.03, 40); divineSay('roadDone', [F.say]); }
  else if (V.scene === 'ask' && V.choice == null) { const a = FATE.questions[V.qi].a[i]; V.choice = i; V.picks.ask = a.id; sfx(330, 0.5, 'sine', 0.03, -60); divineSay('askDone', [a.say]); }
  else if (V.scene === 'sac') { V.picks.sac = V.sacs[i].id; sfx(70, 0.8, 'sawtooth', 0.04, -20); divineSay('sacDone', [V.sacs[i].say, 'It is done. You will not get it back. No one ever does.']); }
}
function skipDivination() {
  const V = G.divine; if (!V) return;
  // the god is your class: that one choice cannot be skipped
  if (!V.picks.star) { if (V.scene !== 'star') { V.choice = null; divineSay('star', ['Impatient. Fine. But this much you must answer yourself.', 'Which god was looking down the night you were born?']); V.li = 1; } return; }
  V.picks.face = V.picks.face || pick(FATE.faces[V.picks.star]).id;
  V.picks.card = V.picks.card || pick(V.cards).id; V.picks.bones = V.picks.bones || pick(V.bones).id; V.picks.sac = V.picks.sac || pick(V.sacs).id;
  V.picks.ask = V.picks.ask || pick(FATE.questions[V.qi].a).id;
  V.picks.fear = V.picks.fear || pick(V.fears).id; V.picks.seek = V.picks.seek || pick(V.seeks).id; V.picks.road = V.picks.road || (V.roads ? pick(V.roads).id : null);
  finishDivination();
}
function finishDivination() {
  const V = G.divine, P0 = V.picks; G.pendingFate = { star: P0.star, face: P0.face, card: P0.card, cardRev: !!P0.cardRev, bones: P0.bones, fear: P0.fear, seek: P0.seek, road: P0.road, ask: P0.ask, sac: P0.sac };
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

// =================================================================== v0.36: the Divination, repainted
// Every scene is painted once, at twice the UI's grain (one art pixel = half a UI pixel), by a small relief
// renderer: each object is laid down as a height field with its own colour, then lit per pixel by the candles
// in front of it and a cold phosphor rim from behind, with crevice darkening, a selective dark outline, and
// an ordered-dither quantize so it reads as hand-placed pixels, not a smooth gradient. The painted layers are
// cached; only the flames, glows, eyes, smoke and the UI are drawn every frame.
const FA = { S: 2, c: {} };
function faCv(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
function faHash(x, y, s) { let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
function faN(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = faHash(xi, yi, s), b = faHash(xi + 1, yi, s), c = faHash(xi, yi + 1, s), d = faHash(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function faF(x, y, s, o = 4) { let t = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { t += a * faN(x * f, y * f, s + i * 17); n += a; f *= 2.03; a *= 0.5; } return t / n; }
const faG = (x, s) => Math.exp(-(x * x) / (s * s));
function faSeg(px2, py2, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1e-9, t = Math.max(0, Math.min(1, ((px2 - ax) * dx + (py2 - ay) * dy) / L)); const qx = ax + t * dx - px2, qy = ay + t * dy - py2; return [Math.sqrt(qx * qx + qy * qy), t]; }
function faHex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
const FA_BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16 - 0.47);
// a relief: height, albedo, specular, emissive, mask, and a part id (a seam is drawn where parts meet)
function faRel(w, h) { w = Math.ceil(w); h = Math.ceil(h); return { w, h, H: new Float32Array(w * h), A: new Float32Array(w * h * 3), S: new Float32Array(w * h), E: new Float32Array(w * h * 3), M: new Uint8Array(w * h), P: new Uint16Array(w * h) }; }
const FAO = { h: 0, r: 0, g: 0, b: 0, s: 0, e: null, keep: false, add: false };
// fn(x, y, o) fills o and returns true to paint the pixel; o.add adds to the height instead of replacing it,
// o.keep leaves the colour as it was (for dents, wrinkles and stitches painted on top)
let FA_PART = 1;
// every painter is a generator that pauses every few rows, so the layers can be painted a slice at a time in the
// background (the title screen, the reading's pauses) instead of stalling a frame; faRun finishes one at once
function faRun(g) { let r; while (!(r = g.next()).done); return r.value; }
function* faPutG(R, x0, y0, x1, y1, fn) {
  // a relief can be finer than the art grain it is described in: R.k pixels per unit, its corner at (R.ox, R.oy)
  const k = R.k || 1, ox = R.ox || 0, oy = R.oy || 0;
  if (k !== 1) { x0 = (x0 - ox) * k; x1 = (x1 - ox) * k + k; y0 = (y0 - oy) * k; y1 = (y1 - oy) * k + k; }
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(R.w - 1, Math.ceil(x1)); y1 = Math.min(R.h - 1, Math.ceil(y1));
  if (x1 < x0 || y1 < y0) return;
  const part = FA_PART++, o = FAO;
  R.bb = R.bb ? [Math.min(R.bb[0], x0), Math.min(R.bb[1], y0), Math.max(R.bb[2], x1), Math.max(R.bb[3], y1)] : [x0, y0, x1, y1];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      o.s = 0; o.e = null; o.keep = false; o.add = false; o.h = 0;
      if (!fn(k === 1 ? x + 0.5 : ox + (x + 0.5) / k, k === 1 ? y + 0.5 : oy + (y + 0.5) / k, o)) continue;
      if (k !== 1) o.h *= k;
      const i = y * R.w + x;
      if (o.add) { if (!R.M[i]) continue; R.H[i] += o.h; } else { R.H[i] = o.h; R.M[i] = 1; R.P[i] = part; }
      if (!o.keep) { R.A[i * 3] = o.r; R.A[i * 3 + 1] = o.g; R.A[i * 3 + 2] = o.b; R.S[i] = o.s; }
      if (o.e) { R.E[i * 3] = o.e[0]; R.E[i * 3 + 1] = o.e[1]; R.E[i * 3 + 2] = o.e[2]; }
    }
    if ((y & 7) === 7) yield;
  }
}
function faPut(R, x0, y0, x1, y1, fn) { faRun(faPutG(R, x0, y0, x1, y1, fn)); }
// light a relief. L = { amb:[r,g,b], dirs:[{v:[x,y,z], c:[r,g,b]}], pts:[{x,y,z,c:[r,g,b],r}], ao, lv, dith, ol, seam, gain }
function* faShadeG(R, L) {
  const { w, h, H, A, S, E, M, P } = R, c = faCv(w, h), cx = c.getContext('2d'), img = cx.createImageData(w, h), D = img.data;
  if (!R.bb) return c;
  // only the painted part of the relief is worked (and a margin for the blur)
  const rad = Math.round((L.aoR || 4) * (R.k || 1)), X0 = Math.max(0, R.bb[0] - rad - 1), Y0 = Math.max(0, R.bb[1] - rad - 1), X1 = Math.min(w - 1, R.bb[2] + rad + 1), Y1 = Math.min(h - 1, R.bb[3] + rad + 1);
  // crevices: how far below its blurred neighbourhood each pixel sits
  const B = new Float32Array(w * h), T = new Float32Array(w * h);
  for (let y = Y0; y <= Y1; y++) { let s = 0, n = 0; for (let x = X0 - rad; x <= X1 + rad; x++) { const xa = x + rad, xr = x - rad - 1; if (xa <= X1 && xa >= X0) { s += H[y * w + xa]; n++; } if (xr >= X0 && xr <= X1) { s -= H[y * w + xr]; n--; } if (x >= X0 && x <= X1) T[y * w + x] = s / Math.max(1, n); } if ((y & 31) === 31) yield; }
  for (let x = X0; x <= X1; x++) { let s = 0, n = 0; for (let y = Y0 - rad; y <= Y1 + rad; y++) { const ya = y + rad, yr = y - rad - 1; if (ya <= Y1 && ya >= Y0) { s += T[ya * w + x]; n++; } if (yr >= Y0 && yr <= Y1) { s -= T[yr * w + x]; n--; } if (y >= Y0 && y <= Y1) B[y * w + x] = s / Math.max(1, n); } if ((x & 63) === 63) yield; }
  const amb = L.amb || [0.1, 0.1, 0.12], dirs = (L.dirs || []).map(d => { const n = Math.hypot(...d.v); return { v: d.v.map(q => q / n), c: d.c }; }), RK = R.k || 1, pts = (L.pts || []).map(p => RK === 1 ? p : Object.assign({}, p, { x: (p.x - (R.ox || 0)) * RK, y: (p.y - (R.oy || 0)) * RK, z: p.z * RK, r: p.r * RK }));
  const aoK = (L.ao == null ? 0.06 : L.ao) / RK, lv = L.lv || 22, lq = lv - 1, dith = L.dith == null ? 1 : L.dith, gain = L.gain || 1, nk = L.nk || 1, nd = dirs.length, np = pts.length;
  for (let y = Y0; y <= Y1; y++) {
    for (let x = X0; x <= X1; x++) {
      const i = y * w + x; if (!M[i]) continue;
      const hl = x > 0 && M[i - 1] ? H[i - 1] : H[i], hr = x < w - 1 && M[i + 1] ? H[i + 1] : H[i], hu = y > 0 && M[i - w] ? H[i - w] : H[i], hd = y < h - 1 && M[i + w] ? H[i + w] : H[i];
      let nx = -(hr - hl) * 0.5 * nk, ny = -(hd - hu) * 0.5 * nk, nz = 1; const nl = Math.sqrt(nx * nx + ny * ny + 1); nx /= nl; ny /= nl; nz /= nl;
      let lr = amb[0], lg = amb[1], lb = amb[2], sr = 0, sg = 0, sb = 0;
      for (let q = 0; q < nd; q++) { const d = dirs[q], k = nx * d.v[0] + ny * d.v[1] + nz * d.v[2]; if (k > 0) { lr += d.c[0] * k; lg += d.c[1] * k; lb += d.c[2] * k; } }
      for (let q = 0; q < np; q++) {
        const p = pts[q]; let lx = p.x - x, ly = p.y - y, lz = p.z - H[i]; const dd = Math.sqrt(lx * lx + ly * ly + lz * lz); lx /= dd; ly /= dd; lz /= dd;
        const k = nx * lx + ny * ly + nz * lz; if (k <= 0) continue;
        const at = 1 / (1 + (dd / p.r) * (dd / p.r)); lr += p.c[0] * k * at; lg += p.c[1] * k * at; lb += p.c[2] * k * at;
        if (S[i] > 0) { const hz = lz + 1, hn = Math.sqrt(lx * lx + ly * ly + hz * hz); const sp = Math.pow(Math.max(0, (nx * lx + ny * ly + nz * hz) / hn), 28) * S[i] * at * 2.2; sr += p.c[0] * sp; sg += p.c[1] * sp; sb += p.c[2] * sp; }
      }
      const ao = Math.max(0.2, Math.min(1.1, 1 - (B[i] - H[i]) * aoK));
      let r = (A[i * 3] * lr + sr * 255) * ao * gain + E[i * 3], g = (A[i * 3 + 1] * lg + sg * 255) * ao * gain + E[i * 3 + 1], b = (A[i * 3 + 2] * lb + sb * 255) * ao * gain + E[i * 3 + 2];
      // selective outline: dark on the outer silhouette, a thin seam where parts meet (only on the far side)
      const edge = (x > 0 && !M[i - 1]) || (x < w - 1 && !M[i + 1]) || (y > 0 && !M[i - w]) || (y < h - 1 && !M[i + w]);
      if (edge && L.ol !== false) { r *= 0.35; g *= 0.35; b *= 0.35; }
      else if (L.seam !== false && ((x > 0 && M[i - 1] && P[i - 1] > P[i] && H[i - 1] > H[i] + 1.5) || (y > 0 && M[i - w] && P[i - w] > P[i] && H[i - w] > H[i] + 1.5))) { r *= 0.5; g *= 0.5; b *= 0.5; }
      const bd = FA_BAYER[(y & 3) * 4 + (x & 3)] * dith, o = i * 4;
      r = r < 0 ? 0 : r > 255 ? 1 : r / 255; g = g < 0 ? 0 : g > 255 ? 1 : g / 255; b = b < 0 ? 0 : b > 255 ? 1 : b / 255;
      D[o] = Math.round(Math.max(0, Math.min(lq, r * lq + bd))) * 255 / lq; D[o + 1] = Math.round(Math.max(0, Math.min(lq, g * lq + bd))) * 255 / lq; D[o + 2] = Math.round(Math.max(0, Math.min(lq, b * lq + bd))) * 255 / lq; D[o + 3] = 255;
    }
    if ((y & 7) === 7) yield;
  }
  cx.putImageData(img, 0, 0); return c;
}
function faShade(R, L) { return faRun(faShadeG(R, L)); }
// quantize and grain a flat painting (skies, glows baked into a layer)
function* faPixelizeG(c, lv = 24, grain = 0.04, dith = 1) {
  const x = c.getContext('2d'), img = x.getImageData(0, 0, c.width, c.height), D = img.data, w = c.width;
  for (let i = 0, n = D.length / 4; i < n; i++) {
    if (!D[i * 4 + 3]) continue; const px2 = i % w, py2 = (i / w) | 0, bd = FA_BAYER[(py2 & 3) * 4 + (px2 & 3)] * dith, gr = 1 + (faHash(px2, py2, 9) - 0.5) * grain * 2;
    if ((i & 16383) === 16383) yield;
    for (let k = 0; k < 3; k++) { const v = Math.max(0, Math.min(1, D[i * 4 + k] * gr / 255)); D[i * 4 + k] = Math.round(Math.max(0, Math.min(lv - 1, v * (lv - 1) + bd))) * 255 / (lv - 1); }
  }
  x.putImageData(img, 0, 0); return c;
}
function faPixelize(c, lv, grain, dith) { return faRun(faPixelizeG(c, lv, grain, dith)); }
// draw a cached art layer (art pixels) at UI coordinates
function faDraw(c, x, y, w, h) { if (!c) return; ctx.drawImage(c, x, y, w == null ? c.width / FA.S : w, h == null ? c.height / FA.S : h); }
function faGet(key, make) { if (FA.reg) { FA.reg.push([key, function* () { return make(); }]); return null; } return FA.c[key] || (FA.c[key] = make()); }
// a big layer is a job: faBake(key, mk) returns it, finishing it now if the background has not; faPump advances
// the queued jobs for a few milliseconds at a time
FA.jobs = {};
function faBake(key, mk) {
  if (FA.reg) { FA.reg.push([key, mk]); return null; }
  if (FA.c[key]) return FA.c[key];
  const j = FA.jobs[key] || (FA.jobs[key] = mk()); FA.c[key] = faRun(j); delete FA.jobs[key]; return FA.c[key];
}
function faPump(budget) {
  const t0 = performance.now();
  for (const [key, mk] of FA_PREBAKE) {
    if (FA.c[key]) continue;
    const j = FA.jobs[key] || (FA.jobs[key] = mk());
    while (performance.now() - t0 < budget) { const r = j.next(); if (r.done) { FA.c[key] = r.value; delete FA.jobs[key]; break; } }
    if (performance.now() - t0 >= budget) return false;
  }
  return true;
}
// common colour ramps
const FAC = { bone: [196, 184, 156], boneD: [120, 108, 88], iron: [58, 54, 56], rust: [104, 52, 30], gold: [176, 132, 56], blood: [96, 14, 20], velvet: [92, 18, 26], wool: [34, 28, 32], wax: [214, 200, 168], skin: [150, 142, 120], stone: [70, 64, 66], wood: [64, 40, 28] };
const faMix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const faSet = (o, c, k = 1) => { o.r = c[0] * k; o.g = c[1] * k; o.b = c[2] * k; };
// shape kit: an ellipsoid bump, a capsule chain (limbs, bones, ropes), a bevelled slab (plates, stones, doors)
function faBlob(R, cx, cy, rx, ry, h, base, colFn, spec = 0.1) {
  faPut(R, cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1, (x, y, o) => { const u = (x - cx) / rx, v = (y - cy) / ry, d = u * u + v * v; if (d > 1) return false; o.h = base + Math.sqrt(1 - d) * h; faSet(o, typeof colFn === 'function' ? colFn(x, y, u, v) : colFn); o.s = spec; return true; });
}
function faCap(R, pts, r0, r1, base, colFn, spec = 0.1, hk = 1) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), rm = Math.max(r0, r1), n = pts.length - 1;
  faPut(R, Math.min(...xs) - rm - 1, Math.min(...ys) - rm - 1, Math.max(...xs) + rm + 1, Math.max(...ys) + rm + 1, (x, y, o) => {
    let best = 1e9, tt = 0; for (let k = 0; k < n; k++) { const [d, t] = faSeg(x, y, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]); if (d < best) { best = d; tt = (k + t) / n; } }
    const r = r0 + (r1 - r0) * tt; if (best > r) return false;
    o.h = base + Math.sqrt(r * r - best * best) * hk; faSet(o, typeof colFn === 'function' ? colFn(x, y, tt, best / r) : colFn); o.s = spec; return true;
  });
}
function faInPoly(x, y, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
function faPolyD(x, y, P) { let m = 1e9; for (let i = 0, j = P.length - 1; i < P.length; j = i++) m = Math.min(m, faSeg(x, y, P[j][0], P[j][1], P[i][0], P[i][1])[0]); return m; }
function faSlab(R, P, base, h, bev, colFn, spec = 0.1) {
  const xs = P.map(p => p[0]), ys = P.map(p => p[1]);
  faPut(R, Math.min(...xs) - 1, Math.min(...ys) - 1, Math.max(...xs) + 1, Math.max(...ys) + 1, (x, y, o) => { if (!faInPoly(x, y, P)) return false; const d = faPolyD(x, y, P); o.h = base + h * Math.min(1, d / bev); faSet(o, typeof colFn === 'function' ? colFn(x, y, d) : colFn); o.s = spec; return true; });
}
// the light a relief receives from one direction, 0..1 per pixel (for engraving and for masks of light)
function faLum(R, v = [-0.5, -0.6, 0.65], amb = 0.12) {
  const { w, h, H, M } = R, out = new Float32Array(w * h), n = Math.hypot(...v), l = v.map(q => q / n);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (!M[i]) continue;
    const hl = x > 0 && M[i - 1] ? H[i - 1] : H[i], hr = x < w - 1 && M[i + 1] ? H[i + 1] : H[i], hu = y > 0 && M[i - w] ? H[i - w] : H[i], hd = y < h - 1 && M[i + w] ? H[i + w] : H[i];
    let nx = -(hr - hl) * 0.5, ny = -(hd - hu) * 0.5, nz = 1; const nl = Math.hypot(nx, ny, nz);
    out[i] = Math.min(1, amb + Math.max(0, (nx * l[0] + ny * l[1] + nz * l[2]) / nl));
  }
  return out;
}

// ------------------------------------------------------------------- the Seer's chamber: an ossuary with an iron aureole
// candles on the table, in art pixels (x, y of the flame, height of the candle), shared by the lighting and the flames
const FA_CANDLES = [[118, 346, 58], [152, 364, 34], [186, 356, 22], [790, 350, 50], [822, 364, 30], [760, 368, 18], [58, 330, 20]];
function faChamberLights(k = 1) {
  const pts = FA_CANDLES.map(([x, y, h]) => ({ x, y: y - 8, z: 70, c: [1.25 * k, 0.74 * k, 0.36 * k], r: 150 }));
  return { amb: [0.05, 0.05, 0.07], dirs: [{ v: [-0.5, -0.8, -0.35], c: [0.26, 0.42, 0.4] }, { v: [0.1, -1, 0.6], c: [0.07, 0.07, 0.09] }], pts };
}
function faSkull(R, sx, sy, s, seed, lit) {
  // a skull stacked in the wall, seen from the front: dome, sockets, a nasal hole, a row of teeth
  const rx = 17 * s, ry = 19 * s, tint = 0.72 + faHash(sx, sy, seed) * 0.3, rot = (faHash(sx, sy, seed + 1) - 0.5) * 0.3, cs = Math.cos(rot), sn = Math.sin(rot);
  faPut(R, sx - rx - 2, sy - ry - 2, sx + rx + 2, sy + ry + 8 * s, (x, y, o) => {
    let u = ((x - sx) * cs + (y - sy) * sn) / rx, v = (-(x - sx) * sn + (y - sy) * cs) / ry;
    const jaw = v > 0.45 ? 1 + (v - 0.45) * 1.1 : 1, uu = u * jaw, d = uu * uu + v * v;
    if (d > 1 || v > 1.18) return false;
    let hgt = Math.sqrt(1 - Math.min(1, d)) * 13 * s + 4;
    const eyeL = ((u + 0.4) / 0.27) ** 2 + ((v - 0.12) / 0.25) ** 2, eyeR = ((u - 0.4) / 0.27) ** 2 + ((v - 0.12) / 0.25) ** 2, nose = (u / 0.1) ** 2 + ((v - 0.48) / 0.16) ** 2;
    let hole = 0; if (eyeL < 1) hole = Math.max(hole, 1 - eyeL); if (eyeR < 1) hole = Math.max(hole, 1 - eyeR); if (nose < 1) hole = Math.max(hole, (1 - nose) * 0.8);
    hgt -= Math.sqrt(hole) * 11 * s;
    hgt += faG(v + 0.05, 0.07) * 2.5 * s * (Math.abs(u) < 0.75 ? 1 : 0);    // brow
    if (v > 0.78 && Math.abs(u) < 0.5) { const tt = Math.abs(Math.sin((u + 0.5) * 22)); hgt += tt * 1.5 * s - 1; }
    const n = faF(x * 0.12, y * 0.12, seed, 3), dirt = faF(x * 0.05, y * 0.05, seed + 3, 3);
    let c = faMix(FAC.boneD, FAC.bone, Math.min(1, 0.35 + n * 0.8)); c = faMix(c, [70, 56, 40], Math.max(0, dirt - 0.5) * 1.4);
    if (hole > 0.15) c = faMix(c, [12, 9, 10], Math.min(1, (hole - 0.15) * 2.2));
    if (v > 0.84 && Math.abs(u) < 0.5 && ((Math.floor((u + 0.5) * 7) & 1))) c = faMix(c, [40, 32, 26], 0.6);
    o.h = hgt; faSet(o, c, tint); o.s = 0.08; return true;
  });
}
function* faChamberBG() {
  const R = faRel(960, 540);
  // the mortar: a black-brown grit the bones are set in
  yield* faPutG(R, 0, 0, 959, 539, (x, y, o) => { const n = faF(x * 0.08, y * 0.08, 5, 4); o.h = n * 3; faSet(o, faMix([18, 14, 14], [40, 32, 30], n)); return true; });
  // courses of skulls, then courses of long-bone ends, all the way up the wall
  for (let row = 0; row < 9; row++) {
    yield;
    const y0 = 10 + row * 62, off = row % 2 ? 19 : 0;
    for (let x = -20 + off; x < 980; x += 38) if (faHash(x, row, 3) > 0.06) faSkull(R, x + (faHash(x, row, 4) - 0.5) * 4, y0 + 20, 0.98 + faHash(x, row, 5) * 0.12, row * 31 + x, 1);
    const yb = y0 + 50;
    for (let x = -10 + (row % 2) * 7; x < 970; x += 14) {
      const bx = x + (faHash(x, row, 7) - 0.5) * 3, by = yb + (faHash(x, row, 8) - 0.5) * 3, tint = 0.7 + faHash(x, row, 9) * 0.35;
      yield* faPutG(R, bx - 8, by - 7, bx + 8, by + 7, (xx, yy, o) => {
        // the end of a thighbone: two knuckles side by side
        const a = ((xx - bx + 3) / 4.2) ** 2 + ((yy - by) / 5.5) ** 2, b = ((xx - bx - 3) / 4.2) ** 2 + ((yy - by) / 5.5) ** 2, d = Math.min(a, b);
        if (d > 1) return false; const n = faF(xx * 0.2, yy * 0.2, 12, 2);
        o.h = Math.sqrt(1 - d) * 6 + 3; faSet(o, faMix(FAC.boneD, FAC.bone, 0.3 + n * 0.6), tint); o.s = 0.06; return true;
      });
    }
  }
  // the niche she sits in: a pointed arch of carved stone, deep and dark, a cold light at its crown
  const AX = 480, AT = 26, AW = 200, ASP = 250;   // centre, apex, half-width, where the arch meets its piers
  const archD = (x, y) => {
    // signed distance to the arch outline (negative inside). Two arcs of radius AR centred at AX -/+ (AR - AW)
    const AR = AW * 1.6, c1 = AX + (AR - AW), c0 = AX - (AR - AW), cy = ASP;
    if (y > ASP) return Math.abs(x - AX) - AW;
    const dl = Math.hypot(x - c1, y - cy) - AR, dr = Math.hypot(x - c0, y - cy) - AR;
    return x < AX ? dl : dr;
  };
  yield* faPutG(R, AX - AW - 60, 0, AX + AW + 60, 539, (x, y, o) => {
    const d = archD(x, y);
    if (d < -34) {   // the recess itself
      const n = faF(x * 0.05, y * 0.05, 21, 4), cr = Math.abs(faF(x * 0.02, y * 0.02, 25, 3) - 0.5) < 0.012, ray = Math.abs(Math.sin(Math.atan2(y - 146, x - AX) * 13)) > 0.8 && Math.hypot(x - AX, y - 146) > 110;
      o.h = -30 + n * 7 - (cr ? 3 : 0);
      faSet(o, faMix([14, 14, 18], [40, 36, 38], n)); if (ray) faSet(o, faMix([o.r, o.g, o.b], [70, 56, 34], 0.35 * n)); if (cr) faSet(o, [6, 6, 8]);
      const k = Math.max(0, 1 - Math.hypot(x - AX, (y - 140) * 0.9) / 230), k2 = k * k; o.e = [10 * k + 14 * k2, 34 * k + 34 * k2, 30 * k + 30 * k2]; return true;
    }
    if (d > 44) return false;
    // mouldings: three rolls and a hollow, rising from the wall
    const t = d + 34, roll = t < 14 ? Math.sin(t / 14 * Math.PI) * 7 : t < 22 ? 2 : t < 40 ? Math.sin((t - 22) / 18 * Math.PI) * 11 + 3 : t < 56 ? 5 - (t - 40) * 0.2 : t < 70 ? Math.sin((t - 56) / 14 * Math.PI) * 6 + 2 : 0;
    const n = faF(x * 0.1, y * 0.1, 22, 4), chip = faF(x * 0.03, y * 0.03, 23, 3) > 0.66 ? -3 : 0, block = Math.abs(((Math.atan2(y - 250, x - AX) * 30 + 100) % 3) - 1.5) < 0.06 || (y > ASP && (y % 46) < 1.5);
    o.h = 8 + roll + n * 3 + chip - (block ? 3 : 0); faSet(o, faMix([58, 54, 56], [104, 98, 94], n * 0.9 + (roll > 6 ? 0.15 : 0)));
    if (faF(x * 0.04, y * 0.02, 24, 3) > 0.6) faSet(o, faMix([o.r, o.g, o.b], [44, 58, 40], 0.45));   // damp moss in the cracks
    o.s = 0.05; return true;
  });
  // the iron aureole: a ring of rusted blades nailed to the niche behind her head
  const HX = 480, HY = 146;
  yield* faPutG(R, HX - 190, HY - 190, HX + 190, HY + 190, (x, y, o) => {
    const dx = x - HX, dy = y - HY, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx), N = 26, seg = (a / (Math.PI * 2) * N + N + 0.5) % 1 - 0.5, idx = Math.floor((a / (Math.PI * 2) * N + N + 0.5)) % N;
    const L = idx % 2 ? 150 : 190 - (idx % 4 === 0 ? 16 : 0), half = 0.3 * Math.pow(1 - (r - 106) / (L - 106), 0.8), rust = faF(x * 0.15, y * 0.15, 30, 3);
    let hgt = null;
    if (r > 94 && r < 108) { const t = (r - 101) / 7; hgt = Math.sqrt(Math.max(0, 1 - t * t)) * 7 + 22; if ((Math.floor(a * 18 / Math.PI) & 1) && Math.abs(t) < 0.35) hgt += 2.5; }
    else if (r >= 108 && r < L && Math.abs(seg) < half) { const k = 1 - Math.abs(seg) / half; hgt = 18 + k * 7 + (seg > 0 ? 0 : 1.5); }
    if (hgt == null) return false;
    o.h = hgt; faSet(o, faMix([30, 26, 28], [96, 48, 28], Math.max(0, rust - 0.3) * 1.5)); o.s = rust < 0.45 ? 0.6 : 0.15; if (r >= 108 && seg > half * 0.45) { o.e = [60, 44, 20]; } return true;
  });
  // chains from the vault, each holding a tin heart run through with blades
  for (const [cx0, len, seed] of [[64, 150, 1], [152, 96, 2], [812, 118, 3], [904, 170, 4]]) {
    for (let y = -4; y < len; y += 9) {
      const vert = (y / 9) & 1, lx = cx0 + Math.sin(y * 0.02 + seed) * 2;
      yield* faPutG(R, lx - 6, y - 7, lx + 6, y + 7, (x, yy, o) => {
        const u = (x - lx) / (vert ? 2.6 : 5), v = (yy - y) / (vert ? 6.5 : 5.5), d = Math.hypot(u, v), rim = Math.abs(d - 0.72);
        if (rim > 0.3 || (!vert && Math.abs(x - lx) < 1)) return false;
        o.h = 40 + (0.3 - rim) * 8; faSet(o, faMix([50, 46, 46], [110, 60, 36], faHash(x | 0, yy | 0, seed) * 0.5)); o.s = 0.5; return true;
      });
    }
    const hx = cx0, hy = len + 18;
    yield* faPutG(R, hx - 22, hy - 22, hx + 22, hy + 24, (x, y, o) => {
      // a heart: two lobes and a point
      const u = (x - hx) / 16, v = (y - hy) / 16, hv = (u * u + v * v - 1), heart = hv * hv * hv - u * u * v * v * v;
      if (heart > 0) return false; const inner = -heart;
      o.h = 44 + Math.min(10, Math.sqrt(inner) * 16); const n = faF(x * 0.3, y * 0.3, seed + 40, 2);
      faSet(o, faMix([96, 88, 84], [150, 140, 128], n)); if (faF(x * 0.1, y * 0.1, seed + 41, 3) > 0.55) faSet(o, [96, 44, 30]); o.s = 0.9; return true;
    });
    for (let k = -1; k <= 1; k++) { // blades through it
      const a = -Math.PI / 2 + k * 0.5 + Math.PI, ax = hx + Math.cos(a) * 28, ay = hy - 4 + Math.sin(a) * 28, bx = hx - Math.cos(a) * 6, by = hy - 4 - Math.sin(a) * 6;
      yield* faPutG(R, Math.min(ax, bx) - 4, Math.min(ay, by) - 4, Math.max(ax, bx) + 4, Math.max(ay, by) + 4, (x, y, o) => {
        const [d, t] = faSeg(x, y, ax, ay, bx, by); const wdt = t < 0.15 ? 2.8 : 1.4; if (d > wdt) return false;
        o.h = 56 + (wdt - d); faSet(o, t < 0.15 ? [120, 88, 40] : [150, 150, 156]); o.s = 1; return true;
      });
    }
  }
  // the wall is lost in the dark away from the candles; only the niche keeps its cold light
  for (let y = 0; y < R.h; y++) for (let x = 0; x < R.w; x++) {
    const i = y * R.w + x; let dmin = 1e9; for (const [cx0, cy] of FA_CANDLES) dmin = Math.min(dmin, Math.hypot(x - cx0, (y - cy) * 1.3));
    const k = 0.4 * Math.max(0.06, Math.min(1, 1 - dmin / 260)) * (0.4 + 0.6 * Math.min(1, y / 330));
    R.A[i * 3] *= k; R.A[i * 3 + 1] *= k; R.A[i * 3 + 2] *= k;
    if (x === R.w - 1 && (y & 15) === 15) yield;
  }
  const L = faChamberLights(0.9); L.pts.forEach(p => { p.r = 150; p.z = 70; }); L.amb = [0.03, 0.03, 0.04];
  return yield* faShadeG(R, Object.assign(L, { ao: 0.08, aoR: 5, lv: 22 }));
}


// ------------------------------------------------------------------- the Mysterious Stranger
// a tall, starved old woman under a hood and a rotted lace veil; the sockets empty, soot tears under them;
// a gilt band on her brow hung with tin votives, a collar of finger bones, a crimson stole worked in gold
const FA_SEER = { CX: 480, FY: 150 };
function faWool(x, y, s) { const n = faF(x * 0.16, y * 0.16, s, 3), w = faF(x * 0.7, y * 1.6, s + 5, 2); return faMix([14, 12, 16], [42, 36, 40], n * 0.7 + w * 0.3); }
function* faSeer(pose) {
  const R = faRel(960, 540), CX = FA_SEER.CX, FY = FA_SEER.FY;
  // the robe under everything: heavy vertical folds from the chest to the table
  yield* faPutG(R, CX - 170, 190, CX + 170, 372, (x, y, o) => {
    const W = 112 + (y - 190) * 0.26, dx = x - CX; if (Math.abs(dx) > W) return false;
    const u = dx / W, f = faF(x * 0.01, y * 0.004, 150, 2) * 4;
    const fold = Math.sin(u * 11 + f) * 5 + Math.pow(Math.abs(Math.sin(u * 5.5 + f * 0.7 + 0.8)), 0.35) * 6;
    o.h = Math.sqrt(1 - u * u) * 20 + fold; faSet(o, faWool(x, y, 151)); o.s = 0.03;
    if (faF(x * 0.05, y * 0.05, 152, 3) > 0.72) { faSet(o, [10, 8, 10]); o.h -= 3; }
    return true;
  });
  // the stole: two bands of old crimson velvet, gold thread worked into lozenges and eyes
  for (const sd of [-1, 1]) {
    yield* faPutG(R, CX + sd * 44 - 22, 206, CX + sd * 44 + 22, 372, (x, y, o) => {
      const cxs = CX + sd * (30 + (y - 206) * 0.12), u = (x - cxs) / 13; if (Math.abs(u) > 1) return false;
      o.h = 26 + Math.sqrt(1 - u * u) * 4 + Math.sin(y * 0.08 + sd) * 1.5;
      let c = faMix([50, 8, 14], [118, 24, 30], faF(x * 0.15, y * 0.06, 153 + sd, 3)); o.s = 0.05;
      const au = Math.abs(u), yy = ((y - 206) % 40 + 40) % 40;
      const edge = au > 0.76 && au < 0.9, loz = Math.abs(au * 13 * 1.3 + Math.abs(yy - 20) - 11) < 1.1, eye = Math.hypot(u * 13, (yy - 20) * 1.4) < 3 && Math.hypot(u * 13, (yy - 20) * 1.4) > 1.6, pupil = Math.hypot(u * 13, yy - 20) < 1;
      if (edge || loz || eye || pupil) { c = faMix([110, 80, 34], [206, 164, 82], faHash(x | 0, y | 0, 154)); o.s = 0.8; o.h += 0.8; }
      if (faF(x * 0.08, y * 0.08, 155, 3) > 0.66) c = faMix(c, [26, 8, 10], 0.65);
      faSet(o, c); return true;
    });
  }
  // a rosary of knuckle bones hanging to her lap
  for (let i = 0; i < 26; i++) {
    const t = i / 25, bx = CX - 4 + Math.sin(t * 3.1) * 7, by = 222 + t * 128, rr = i % 6 === 5 ? 3.6 : 2.6;
    yield* faPutG(R, bx - 5, by - 5, bx + 5, by + 5, (x, y, o) => { const d = Math.hypot(x - bx, (y - by) * 1.2); if (d > rr) return false; o.h = 34 + Math.sqrt(rr * rr - d * d) * 1.2; faSet(o, faMix(FAC.boneD, FAC.bone, 0.45 + faHash(i, 2, 156) * 0.4)); o.s = 0.25; return true; });
  }
  faSkull(R, CX - 2, 358, 0.4, 157, 1);
  // sleeves: long heavy bells of wool, the forearms laid on the table
  const sleeves = pose === 'open' ? [[[-112, 244], [-124, 300], [-108, 330]], [[112, 244], [124, 300], [108, 330]]] : [[[-112, 244], [-104, 300], [-90, 338]], [[112, 244], [104, 300], [90, 338]]];
  for (const sl of sleeves) {
    const pts = sl.map(([dx, y]) => [CX + dx, y]), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    yield* faPutG(R, Math.min(...xs) - 46, Math.min(...ys) - 30, Math.max(...xs) + 46, Math.max(...ys) + 40, (x, y, o) => {
      let best = 1e9, tt = 0; for (let k = 0; k < pts.length - 1; k++) { const [d, t] = faSeg(x, y, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]); if (d < best) { best = d; tt = (k + t) / (pts.length - 1); } }
      const r = 20 + tt * 10 + Math.max(0, tt - 0.75) * 50; if (best > r) return false;
      const k = best / r, ring = Math.pow(Math.abs(Math.sin(tt * 16 + faF(x * 0.05, y * 0.05, 158, 2) * 3)), 0.5) * 3.5;
      o.h = 40 + Math.sqrt(1 - k * k) * 14 - ring; faSet(o, faWool(x, y, 159)); o.s = 0.03;
      if (tt > 0.85) { faSet(o, faMix(faWool(x, y, 160), [34, 20, 18], 0.4)); if (faF(x * 0.25, y * 0.25, 161, 2) > 0.62) return false; }   // the cuff, frayed
      return true;
    });
  }
  // the hood and its cape: falls from a high peak over the shoulders, open at the front below the chin
  const hwH = y => y < 150 ? 82 * Math.sqrt(Math.max(0, 1 - ((y - 150) / 94) ** 2)) : 82 + (y - 150) * 0.42;
  const hem = x => 262 + Math.abs(Math.sin((x - CX) * 0.07)) * 10 + Math.abs(x - CX) * 0.05;
  yield* faPutG(R, CX - 130, 50, CX + 130, 290, (x, y, o) => {
    const dx = x - CX, W = hwH(y); if (Math.abs(dx) > W || y > hem(x)) return false;
    if (y > 196 && Math.abs(dx) < 22 + (y - 196) * 0.55) return false;          // the front opening
    const u = dx / W, a = Math.atan2(dx, y - 50);
    const fold = Math.sin(a * 13 + faF(x * 0.02, y * 0.02, 162, 2) * 5) * (2 + (y - 56) * 0.035) + Math.pow(Math.abs(Math.sin(a * 6.5 + 1.1)), 0.4) * 4;
    o.h = Math.sqrt(Math.max(0, 1 - u * u)) * 26 + fold + 42; faSet(o, faWool(x, y, 163)); o.s = 0.03;
    // the veil: rosettes of lace on a net, rotted through in places; half-sheer over the wool
    const gx = ((x + (Math.floor(y / 22) & 1) * 11) % 22 + 22) % 22 - 11, gy = (y % 22 + 22) % 22 - 11, th = Math.atan2(gy, gx), rr = Math.hypot(gx, gy);
    const petal = Math.abs(rr - (6 + 2 * Math.cos(th * 6))) < 0.8, core = rr < 1.4, net = (Math.abs(gy) < 0.6 && rr > 8.5) || (Math.abs(gx) < 0.6 && rr > 8.5);
    const hemY = hem(x) - 4, scal = y > hemY - 8 && Math.abs(Math.sin((x - CX) * 0.35)) * 6 > (hemY - y);
    if ((petal || core || net || scal) && faF(x * 0.06, y * 0.06, 164, 3) < 0.58 && y < 150 + Math.abs(dx) * 1.3) { faSet(o, faMix(faWool(x, y, 163), [140, 132, 120], petal || core || scal ? 0.5 : 0.3)); o.h += 1; o.s = 0.12; }
    return true;
  });
  yield* faSeerHead(R);
  return R;
}
function* faSeerHead(R) {
  const CX = FA_SEER.CX, FY = FA_SEER.FY;
  // the hood's mouth: a deep shadow around the face, a rolled and frayed edge
  yield* faPutG(R, CX - 56, FY - 72, CX + 56, FY + 72, (x, y, o) => {
    const u = (x - CX) / 47, v = (y - FY + 2) / 61, d = Math.hypot(u, v); if (d > 1.16) return false;
    if (d < 0.9) { o.h = 16 + d * 10; faSet(o, faMix([3, 3, 4], [16, 13, 16], Math.max(0, d - 0.6) * 3)); return true; }
    const t = (d - 0.9) / 0.26; o.h = 58 + Math.sin(t * Math.PI * 0.8) * 6 + Math.sin(Math.atan2(v, u) * 34 + faF(x * 0.1, y * 0.1, 178, 2) * 4) * 1.5; faSet(o, faMix(faWool(x, y, 165), [8, 6, 8], (1 - t) * 0.6)); o.s = 0.02; return true;
  });
  // the neck: cords and a hollow throat, mostly in shadow
  yield* faPutG(R, CX - 18, FY + 28, CX + 18, FY + 56, (x, y, o) => {
    const u = (x - CX) / (12 + (y - FY - 28) * 0.14); if (Math.abs(u) > 1) return false;
    const tend = faG(u - 0.45, 0.15) + faG(u + 0.45, 0.15), pit = faG(u, 0.25) * faG(y - FY - 52, 5);
    o.h = 20 + Math.sqrt(1 - u * u) * 8 + tend * 2.5 - pit * 4; faSet(o, faMix([70, 66, 58], [120, 112, 96], faF(x * 0.2, y * 0.2, 166, 2)), 0.7 + (y - FY - 26) * 0.006); o.s = 0.12; return true;
  });
  // the face
  yield* faPutG(R, CX - 34, FY - 46, CX + 34, FY + 44, (x, y, o) => {
    const v = (y - FY) / 40, wv = v < 0.05 ? 0.86 + 0.14 * (1 - ((v - 0.05) / 1.05) ** 2) : 1 - 0.48 * Math.pow((v - 0.05) / 0.95, 1.25), u = (x - CX) / (30 * wv), d = u * u + (v / 1.02) ** 2; if (d > 1) return false;
    let h = Math.sqrt(1 - d) * 18; const au = Math.abs(u);
    h += faG(v + 0.3, 0.09) * 3.5 * (au < 0.85 ? 1 : 0.3);
    const sock = Math.max(0, 1 - (((au - 0.39) / 0.25) ** 2 + ((v + 0.1) / 0.19) ** 2)); h -= Math.pow(sock, 0.65) * 13;
    h += faG(u, 0.075) * Math.max(0, Math.min(1, (v + 0.14) / 0.42)) * (v < 0.4 ? 6 : 0) + faG(u, 0.12) * faG(v - 0.36, 0.07) * 3.5;
    h -= faG(au - 0.1, 0.05) * faG(v - 0.43, 0.04) * 3.5;
    h += faG(au - 0.62, 0.14) * faG(v - 0.06, 0.09) * 7;
    h -= faG(au - 0.55, 0.2) * faG(v - 0.42, 0.15) * 9;
    h -= faG(au - 0.87, 0.13) * faG(v + 0.3, 0.2) * 3.5;
    const lipU = faG(v - 0.62, 0.05) * faG(u, 0.3), lipL = faG(v - 0.73, 0.05) * faG(u, 0.24), slit = faG(v - 0.675, 0.022) * faG(u, 0.32);
    h += lipU * 2 + lipL * 2.2 - slit * 4 + faG(v - 0.95, 0.1) * faG(u, 0.28) * 3;
    h += faG(au - 0.36, 0.05) * faG(v - 0.72, 0.1) * 1.5;                                          // the lines from nose to mouth
    const wr = Math.sin(v * 80 + faF(x * 0.1, y * 0.1, 167, 2) * 6) * faG(v + 0.55, 0.14) * 0.3 + Math.sin(Math.atan2(v + 0.1, au - 0.39) * 10) * faG(au - 0.72, 0.1) * faG(v + 0.05, 0.14) * 0.9 + Math.sin(u * 60) * faG(v - 0.85, 0.08) * faG(u, 0.2) * 0.5;
    h += wr + (faF(x * 0.45, y * 0.45, 168, 2) - 0.5) * 0.9 + (faF(x * 1.7, y * 1.7, 175, 2) - 0.5) * 0.5;
    h -= faG(v - 0.67, 0.035) * faG(u, 0.28) * Math.pow(Math.abs(Math.sin(u * 70)), 3) * 0.6;                 // the lips, pleated with age
    h += faG(au - 0.55, 0.14) * faG(v - 0.82, 0.1) * 2 - faG(au - 0.42, 0.04) * faG(v - 0.86, 0.12) * 1.2;  // jowls
    h -= faG(au - 0.2, 0.05) * faG(v + 0.28, 0.05) * 1.5;                                                    // the frown between the brows
    let c = faMix([128, 130, 122], [190, 188, 176], faF(x * 0.12, y * 0.12, 169, 3)); c = faMix(c, [120, 96, 96], Math.max(0, faF(x * 0.05, y * 0.05, 172, 2) - 0.55));
    c = faMix(c, [84, 64, 80], Math.min(1, sock * 1.5 + faG(au - 0.4, 0.3) * faG(v - 0.14, 0.08) * 0.6));
    if (sock > 0.3) c = faMix(c, [3, 3, 5], Math.min(1, (sock - 0.3) * 2.6));
    c = faMix(c, [92, 60, 66], Math.min(1, lipU + lipL)); if (slit > 0.45) c = [12, 6, 8];
    if (au > 0.62 && v < 0.1 && v > -0.6 && Math.abs(faF(x * 0.25, y * 0.25, 176, 2) - 0.5) < 0.025) c = faMix(c, [70, 76, 100], 0.55);   // veins at the temples
    if (faHash(Math.floor(x * 2), Math.floor(y * 2), 177) > 0.985) c = faMix(c, [90, 70, 60], 0.6);                                         // liver spots
    const tearX = au - 0.39 - Math.sin(v * 11 + (u > 0 ? 1 : 0)) * 0.025; if (v > 0.06 && v < 0.8 && Math.abs(tearX) < 0.03 + v * 0.025) c = faMix(c, [30, 18, 20], 0.85 - v * 0.6);
    if (Math.abs(v + 0.52) < 0.02 && au < 0.5 && (Math.floor((u + 1) * 18) & 1)) { c = [60, 36, 34]; h -= 0.3; }
    faSet(o, c, (0.35 + 0.65 * Math.max(0, Math.min(1, (v + 0.9) / 0.75))) * (1 - 0.55 * Math.max(0, Math.min(1, (au - 0.6) / 0.4))));    // the hood shades her brow and the sides of her face
    o.h = h + 22; o.s = 0.16; return true;
  });
  // a gilt band on the brow, holding the veil, hung with little tin votives (a heart, an eye, a hand)
  yield* faPutG(R, CX - 42, FY - 52, CX + 42, FY - 30, (x, y, o) => {
    const u = (x - CX) / 40, arcY = FY - 44 + u * u * 9; if (Math.abs(y - arcY) > 3.4 || Math.abs(u) > 1) return false;
    o.h = 76 + (3.4 - Math.abs(y - arcY)) * 1.2 + ((Math.floor(x / 4) & 1) ? 0.8 : 0); faSet(o, faMix([90, 64, 30], [196, 156, 80], faF(x * 0.3, y, 170, 2))); o.s = 0.9; return true;
  });
  for (let i = -3; i <= 3; i++) {
    const vx = CX + i * 10.5, vy = FY - 44 + (i / 3.8) ** 2 * 9 + 7 + (i & 1) * 3;
    yield* faPutG(R, vx - 4, vy - 5, vx + 4, vy + 7, (x, y, o) => { const u = (x - vx) / 2.2, v = (y - vy) / 3.6, d = u * u + v * v; if (d > 1 || (v > 0.3 && Math.abs(u) > 1 - v)) return false; o.h = 80 + Math.sqrt(1 - d) * 1.5; faSet(o, i & 1 ? [110, 106, 100] : [140, 104, 50]); o.s = 0.8; return true; });
  }
  // a collar of finger bones strung on gut, over the opening of the cape
  for (let i = -9; i <= 9; i++) {
    if (faHash(i, 5, 179) < 0.15) continue; const t = i / 9, bx = CX + t * 42 + (faHash(i, 6, 179) - 0.5) * 2, by = FY + 48 + t * t * 12, L = 7 + faHash(i, 7, 179) * 8, ang = t * 0.45 + (faHash(i, 8, 179) - 0.5) * 0.5, ex = bx + Math.sin(ang) * L, ey = by + Math.cos(ang) * L;
    yield* faPutG(R, Math.min(bx, ex) - 4, by - 3, Math.max(bx, ex) + 4, ey + 4, (x, y, o) => { const [d, s] = faSeg(x, y, bx, by, ex, ey), r = 2.2 + (s < 0.15 || s > 0.85 ? 0.8 : 0); if (d > r) return false; o.h = 72 + Math.sqrt(r * r - d * d) * 1.4; faSet(o, faMix([70, 62, 50], [170, 160, 136], 0.3 + faHash(i, 1, 171) * 0.5)); o.s = 0.12; return true; });
  }
}
function faSeerLayer(pose) {
  return faBake('seer_' + pose, function* () { const L = faChamberLights(0.85); L.dirs[0].c = [0.4, 0.62, 0.56]; L.dirs.push({ v: [-0.55, 0.6, 0.5], c: [0.42, 0.24, 0.12] }); L.amb = [0.03, 0.035, 0.05]; const R = yield* faSeer(pose); return yield* faShadeG(R, Object.assign(L, { ao: 0.08, aoR: 4, lv: 24, nk: 1.5 })); });
}
// her head, painted at twice the grain of everything else (one screen pixel per pixel on a desktop)
function faSeerHeadLayer() {
  return faBake('seerhead', function* () {
    const R = faRel(240, 320); R.k = 2; R.ox = 420; R.oy = 70; yield* faSeerHead(R);
    const L = faChamberLights(0.8); L.pts.forEach(p => { p.c = [1.15, 0.8, 0.5]; }); L.dirs[0].c = [0.36, 0.62, 0.58]; L.dirs.push({ v: [-0.6, 0.55, 0.55], c: [0.4, 0.26, 0.16] }); L.amb = [0.035, 0.045, 0.06];
    return yield* faShadeG(R, Object.assign(L, { ao: 0.09, aoR: 4, lv: 28, nk: 1.6, dith: 0.8 }));
  });
}
// her hands: long, the knuckles swollen, the nails long and yellow, an iron ring on one finger
function faHandsLayer(pose) {
  return faBake('hands_' + pose, function* () {
    const R = faRel(960, 540), open = pose === 'open', dir = open ? -1 : 1;
    for (const sd of [-1, 1]) {
      const wx = 480 + sd * (open ? 110 : 90), wy = open ? 322 : 332;        // the wrist, where it leaves the cuff
      const kx = wx - sd * 3, ky = wy + dir * 22;                             // the knuckle line
      // the back of the hand (or the palm, turned up to you): narrow at the wrist, broad at the knuckles
      yield* faPutG(R, wx - 22, Math.min(wy, ky) - 6, wx + 22, Math.max(wy, ky) + 6, (x, y, o) => {
        const t = (y - wy) / (ky - wy); if (t < -0.15 || t > 1.12) return false;
        const half = 8 + 5 * Math.max(0, Math.min(1, t)), cxl = wx + (kx - wx) * t, u = (x - cxl) / half; if (Math.abs(u) > 1) return false;
        const tend = [-0.6, -0.2, 0.2, 0.6].reduce((a, q) => a + faG(u - q, 0.08) * Math.max(0, t - 0.1), 0), kn = faG(t - 1, 0.1) * [-0.6, -0.2, 0.2, 0.6].reduce((a, q) => a + faG(u - q, 0.14), 0);
        o.h = 62 + Math.sqrt(1 - u * u) * 6 + (open ? -faG(u, 0.4) * faG(t - 0.5, 0.3) * 2 : tend * 1.6 + kn * 2);
        let c = faMix([100, 92, 78], [160, 148, 124], faF(x * 0.2, y * 0.2, 180, 3));
        if (!open && tend > 0.5) c = faMix(c, [84, 88, 104], 0.25);                // veins
        if (open && Math.abs(u - (t - 0.5) * 0.8) < 0.06) c = faMix(c, [70, 50, 50], 0.6);
        faSet(o, c); o.s = 0.15; return true;
      });
      // fingers: long, jointed, a little apart; the thumb from the inner side
      for (let f = 0; f < 5; f++) {
        const thumb = f === 4, L = (thumb ? 22 : [28, 34, 33, 25][f]) * (open ? 1.25 : 1);
        const bx = thumb ? wx - sd * 9 : kx + (f - 1.5) * 6 * sd * -1 * -1, by = thumb ? wy + dir * 8 : ky;
        const a0 = thumb ? -sd * 0.95 : (f - 1.5) * (open ? 0.16 : 0.07) + (open ? sd * 0.12 : 0), curl = open ? 0.25 : 0.12;
        const pts = [[bx, by]]; let px2 = bx, py2 = by, ang = a0;
        for (let s2 = 0; s2 < 3; s2++) { px2 += Math.sin(ang) * L / 3; py2 += Math.cos(ang) * L / 3 * dir; pts.push([px2, py2]); ang += thumb ? sd * 0.25 : curl * Math.sign(a0 || 0.001) * 0.3; }
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        yield* faPutG(R, Math.min(...xs) - 6, Math.min(...ys) - 6, Math.max(...xs) + 6, Math.max(...ys) + 6, (x, y, o) => {
          let best = 1e9, tt = 0; for (let k = 0; k < 3; k++) { const [d, t] = faSeg(x, y, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]); if (d < best) { best = d; tt = (k + t) / 3; } }
          const knuckle = faG(tt - 0.36, 0.05) * 0.9 + faG(tt - 0.68, 0.05) * 0.6, r = (thumb ? 3.6 : 3.3) - tt * 1.1 + knuckle * 0.7;
          if (best > r) return false;
          o.h = 66 + Math.sqrt(Math.max(0, r * r - best * best)) * 1.6 + knuckle;
          let c = faMix([104, 94, 80], [166, 154, 130], faF(x * 0.3, y * 0.3, 181 + f, 2)); if (knuckle > 0.5) c = faMix(c, [120, 86, 84], 0.35);
          if (tt > 0.8) { c = faMix([110, 96, 58], [186, 168, 116], (tt - 0.8) * 5); o.s = 0.6; } else o.s = 0.15;
          if (f === 2 && sd > 0 && Math.abs(tt - 0.2) < 0.07) { c = [62, 54, 54]; o.s = 1; o.h += 1.5; }
          faSet(o, c); return true;
        });
      }
    }
    const L = faChamberLights(0.9); L.dirs.push({ v: [-0.5, -0.5, 0.7], c: [0.25, 0.2, 0.18] }); return yield* faShadeG(R, Object.assign(L, { ao: 0.05, aoR: 3, lv: 24 }));
  });
}
// the table: a black oak board under an altar cloth, wax puddled everywhere, the candles on iron prickets
function faTableLayer() {
  return faBake('table', function* () {
    const R = faRel(960, 540), TY = 346;
    yield* faPutG(R, 0, TY, 959, 539, (x, y, o) => {
      const persp = (x - 480) / (1 + (y - TY) * 0.012), plank = Math.abs(((persp / 56) % 1 + 1) % 1 - 0.5) > 0.485, grain = faF(persp * 0.05, y * 0.5, 100, 3);
      o.h = (y - TY) * 0.02 - (plank ? 0.8 : 0); faSet(o, faMix([20, 13, 10], [54, 36, 25], grain * 0.8 + (y - TY) * 0.002), plank ? 0.8 : 1); o.s = 0.2;
      if (y < TY + 3) { o.h += 2; faSet(o, [80, 60, 44]); }
      return true;
    });
    // the altar cloth: crimson, heavy, its border worked in tarnished gold, fringed
    yield* faPutG(R, 300, TY + 2, 660, 539, (x, y, o) => {
      const sp = 150 + (y - TY) * 0.9, dx = x - 480; if (Math.abs(dx) > sp) return false;
      const fold = Math.sin(dx * 0.05 + faF(x * 0.01, y * 0.02, 101, 2) * 3) * 1.6;
      o.h = 3 + fold; let c = faMix([46, 6, 12], [112, 22, 30], faF(x * 0.06, y * 0.1, 102, 3) * 0.9 + 0.1); o.s = 0.06;
      const bd = sp - Math.abs(dx); if (bd < 16) { const pat = (Math.floor((y - TY) / 5) + Math.floor(bd / 5)) & 1; c = faMix([88, 62, 26], [180, 140, 64], pat ? 0.7 : 0.3); o.s = 0.7; o.h += 0.8; }
      if (faF(x * 0.05, y * 0.05, 103, 3) > 0.7) c = faMix(c, [18, 4, 6], 0.5);   // old stains
      faSet(o, c); return true;
    });
    // wax: puddles and runs under every candle, candles on iron dishes
    for (const [cx0, cy, hgt] of FA_CANDLES) {
      const by = cy + hgt;
      yield* faPutG(R, cx0 - 30, by - 10, cx0 + 30, by + 14, (x, y, o) => { const d = Math.hypot((x - cx0) / 24, (y - by - 2) / 8) + (faF(x * 0.2, y * 0.2, cx0, 2) - 0.5) * 0.5; if (d > 1) return false; o.h = 8 + (1 - d) * 3; faSet(o, faMix([52, 46, 36], [96, 86, 68], faHash(x | 0, y | 0, 104) * 0.3 + faF(x * 0.1, y * 0.2, 104, 2) * 0.5)); o.s = 0.4; return true; });
      yield* faPutG(R, cx0 - 13, by - 4, cx0 + 13, by + 6, (x, y, o) => { const d = Math.hypot((x - cx0) / 12, (y - by) / 4); if (d > 1) return false; o.h = 14 + (d > 0.75 ? 2 : 0); faSet(o, [52, 44, 44]); o.s = 0.8; return true; });
      const cw = 5 + hgt * 0.06;
      yield* faPutG(R, cx0 - cw - 5, cy - 2, cx0 + cw + 5, by + 1, (x, y, o) => {
        const u = (x - cx0) / cw, drip = Math.max(0, faF(x * 0.5, 3, cx0, 2) - 0.45) * 30 * (Math.abs(u) > 0.5 ? 1 : 0.3);
        const top = cy + (1 - Math.abs(u)) * 2.5 - (Math.abs(u) > 0.7 ? 2.5 : 0); if (Math.abs(u) > 1.12 || y < top) return false;
        if (Math.abs(u) > 1 && y > cy + drip * 0.5 + 6) return false;
        o.h = 20 + Math.sqrt(Math.max(0, 1 - u * u)) * cw * 1.2 + (Math.abs(u) > 0.95 ? 1 : 0); faSet(o, faMix([62, 54, 42], [112, 100, 80], faF(x * 0.3, y * 0.1, cx0 + 5, 2)), 0.55 + 0.45 * Math.cos(u * 1.3)); o.s = 0.25;
        if (y < cy + 4 && Math.abs(u) < 0.6) faSet(o, [120, 100, 76]);
        return true;
      });
    }
    // a skull by the left candles, the smallest candle stuck on its crown
    faSkull(R, 58, 362, 0.72, 105, 1);
    const L = faChamberLights(0.9); L.pts.forEach(p => { p.z = 60; p.r = 110; });
    return yield* faShadeG(R, Object.assign(L, { ao: 0.06, aoR: 4, lv: 22 }));
  });
}
// a flame: a bright core, a warm body, a flicker, and a thin smoke line
function faFlame(x, y, s = 1, seed = 0) {
  const t = G.time, fl = Math.sin(t * 13 + seed) * 0.6 + Math.sin(t * 7.3 + seed * 2) * 0.4 + Math.sin(t * 23 + seed) * 0.2, lean = Math.sin(t * 2.1 + seed) * 0.6;
  ctx.globalCompositeOperation = 'lighter';
  glow(x, y - 3 * s, 34 * s, '255,150,60', 0.16 + 0.03 * fl); glow(x, y - 3 * s, 10 * s, '255,210,140', 0.35 + 0.05 * fl);
  ctx.globalCompositeOperation = 'source-over';
  const h = (6.5 + fl * 0.9) * s, ax = x + lean * 0.5;
  ctx.fillStyle = '#b84a18'; ctx.beginPath(); ctx.moveTo(x - 1.6 * s, y); ctx.quadraticCurveTo(x - 1.9 * s, y - h * 0.5, ax, y - h); ctx.quadraticCurveTo(x + 1.9 * s, y - h * 0.5, x + 1.6 * s, y); ctx.fill();
  ctx.fillStyle = '#ffb24a'; ctx.beginPath(); ctx.moveTo(x - 1.1 * s, y - 0.3); ctx.quadraticCurveTo(x - 1.3 * s, y - h * 0.45, ax, y - h * 0.85); ctx.quadraticCurveTo(x + 1.3 * s, y - h * 0.45, x + 1.1 * s, y - 0.3); ctx.fill();
  ctx.fillStyle = '#fff1c8'; ctx.beginPath(); ctx.ellipse(x, y - h * 0.3, 0.6 * s, h * 0.24, 0, 0, 6.28); ctx.fill();
  ctx.fillStyle = '#1a0c08'; ctx.fillRect(x - 0.25, y - 1, 0.5, 1.5);
}
function faCandleFlames() { FA_CANDLES.forEach(([x, y], i) => faFlame(x / 2, y / 2 - 1, 1, i * 1.7)); }

// ------------------------------------------------------------------- frames, plates, type
(function faFonts() { try { if (!document.getElementById('fa-fell')) { const l = document.createElement('link'); l.id = 'fa-fell'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&display=swap'; document.head.appendChild(l); } } catch (e) { } })();
const FA_SAY = '11px "IM Fell English", "IM Fell English SC", Georgia, serif', FA_SAYI = 'italic 11px "IM Fell English", Georgia, serif';
const FA_HEAD = '13px "IM Fell English SC", Georgia, serif', FA_BIG = '16px "IM Fell English SC", Georgia, serif', FA_SMALL = '10px "IM Fell English SC", Georgia, serif';
function faText(s, x, y, col, font, align = 'left', sh = 0.9) {
  ctx.font = font; ctx.textAlign = align;
  if (sh) { ctx.fillStyle = `rgba(0,0,0,${sh})`; ctx.fillText(s, x + 0.5, y + 0.75); }
  ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function faWrap(t, w, font) { ctx.font = font; const out = []; let line = ''; for (const word of t.split(' ')) { const tr = line ? line + ' ' + word : word; if (ctx.measureText(tr).width > w && line) { out.push(line); line = word; } else line = tr; } if (line) out.push(line); return out; }
// an iron frame with a gilt bead and a skull at each corner, at any size (cached)
function faFrame(w, h, kind = 'panel') {
  return faGet(`frame_${w}_${h}_${kind}`, () => {
    const S = FA.S, W2 = w * S, H2 = h * S, R = faRel(W2, H2), gold = kind === 'gold' || kind === 'hot', red = kind === 'red';
    faPut(R, 0, 0, W2 - 1, H2 - 1, (x, y, o) => {
      const d = Math.min(x, y, W2 - 1 - x, H2 - 1 - y);
      if (d > 7) { const n = faF(x * 0.05, y * 0.05, 120, 3); o.h = 0; faSet(o, faMix([10, 9, 12], [22, 18, 22], n)); return true; }
      const prof = d < 1.5 ? 2 : d < 4.5 ? 5 + Math.sin((d - 1.5) / 3 * Math.PI) * 2 : 3 + Math.sin((d - 4.5) / 2.5 * Math.PI) * 1.5;
      o.h = prof; const n = faF(x * 0.2, y * 0.2, 121, 2);
      if (d >= 4.5) { faSet(o, gold ? faMix([120, 86, 36], [210, 170, 90], n) : red ? faMix([90, 22, 22], [150, 50, 40], n) : faMix([82, 62, 32], [150, 116, 60], n)); o.s = 0.9; }
      else { faSet(o, faMix([34, 30, 32], [70, 62, 60], n)); o.s = 0.4; if (faF(x * 0.1, y * 0.1, 122, 2) > 0.62) faSet(o, [84, 44, 28]); }
      return true;
    });
    if (w >= 60 && h >= 24) for (const [cx0, cy] of [[6, 6], [W2 - 7, 6], [6, H2 - 7], [W2 - 7, H2 - 7]]) faSkullBoss(R, cx0, cy, 0.34);
    const L = { amb: [0.2, 0.19, 0.2], dirs: [{ v: [-0.6, -0.7, 0.6], c: kind === 'hot' ? [1.3, 1.0, 0.6] : [0.9, 0.78, 0.6] }, { v: [0.4, 0.8, 0.3], c: [0.12, 0.1, 0.12] }], ao: 0.1, aoR: 2, lv: 24 };
    return faShade(R, L);
  });
}
function faSkullBoss(R, cx0, cy, s) {
  faPut(R, cx0 - 20 * s, cy - 20 * s, cx0 + 20 * s, cy + 22 * s, (x, y, o) => {
    const u = (x - cx0) / (17 * s), v = (y - cy) / (19 * s), jaw = v > 0.45 ? 1 + (v - 0.45) * 1.2 : 1, d = (u * jaw) ** 2 + v * v; if (d > 1) return false;
    const eye = Math.min(((u + 0.4) / 0.28) ** 2 + ((v - 0.1) / 0.26) ** 2, ((u - 0.4) / 0.28) ** 2 + ((v - 0.1) / 0.26) ** 2);
    o.h = 9 + Math.sqrt(1 - d) * 6 - (eye < 1 ? (1 - eye) * 6 : 0); faSet(o, eye < 0.6 ? [16, 12, 12] : faMix([130, 120, 100], [210, 200, 170], faF(x * 0.3, y * 0.3, 123, 2))); o.s = 0.2; return true;
  });
}
function divVignette(a) {
  const g = ctx.createRadialGradient(W / 2, H * 0.42, 70, W / 2, H * 0.45, 300); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.7, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0.88)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // incense: slow grey coils rising through the candle light
  for (let i = 0; i < 9; i++) {
    const t = G.time * 0.12 + i * 0.61, y = H - ((t * 34 + i * 47) % (H + 40)), x = (i * 83 + 40) % W + Math.sin(t * 2.3 + i) * 18;
    const a2 = 0.05 * Math.sin(Math.min(1, (H - y) / H) * Math.PI);
    ctx.strokeStyle = `rgba(170,160,176,${a2})`; ctx.lineWidth = 3; ctx.beginPath();
    for (let k = 0; k < 8; k++) { const yy = y + k * 5, xx = x + Math.sin(yy * 0.08 + t * 3 + i) * (4 + k); k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); ctx.lineWidth = 1;
  }
  // embers drifting up
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 16; i++) { const t = G.time * (0.05 + (i % 5) * 0.012) + i * 0.37, y = H - ((t * 300 + i * 29) % (H + 20)), x = (i * 61 + Math.sin(t * 7 + i) * 12 + 480) % W, f = 0.5 + 0.5 * Math.sin(G.time * 9 + i * 3); ctx.fillStyle = `rgba(255,${120 + (i % 3) * 40},60,${0.35 * f})`; ctx.fillRect(x, y, 0.5, 0.5); }
  ctx.globalCompositeOperation = 'source-over';
  // between words and rites the candles dip: a dark that closes in from the edges first
  if (a > 0) { const e = Math.min(1, a) ** 1.4, g2 = ctx.createRadialGradient(W / 2, H * 0.45, 20 + 200 * (1 - e), W / 2, H * 0.45, 60 + 260 * (1 - e)); g2.addColorStop(0, `rgba(0,0,0,${e * 0.85})`); g2.addColorStop(1, `rgba(0,0,0,${Math.min(1, e * 1.3)})`); ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H); }
}
// a choice plate: dark iron, a gilt bead that catches the light when you consider it
function faPlate(x, y, w, h, st) {
  // st: 0 idle, 1 considered (hover), 2 chosen, 3 faded
  const f = faFrame(Math.round(w), Math.round(h), st === 1 ? 'hot' : st === 2 ? 'gold' : 'panel');
  if (st === 1 || st === 2) { ctx.globalCompositeOperation = 'lighter'; glow(x + w / 2, y + h / 2, Math.max(w, h) * 0.7, '255,150,60', 0.1 + 0.03 * Math.sin(G.time * 5)); ctx.globalCompositeOperation = 'source-over'; }
  ctx.globalAlpha = st === 3 ? 0.4 : 1; faDraw(f, x, y, w, h); ctx.globalAlpha = 1;
  if (st === 1 || st === 2) {
    // considered: the plate warms from within, a thin flame-line runs along its foot, and a little flame marks it
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(255,170,80,0.02)'); g.addColorStop(1, `rgba(255,150,60,${st === 1 ? 0.16 : 0.1})`); ctx.fillStyle = g; ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,190,110,${0.35 + 0.15 * Math.sin(G.time * 7)})`; ctx.fillRect(x + 8, y + h - 4, w - 16, 0.5); ctx.globalCompositeOperation = 'source-over';
    if (st === 1) { faFlame(x + 9, y + h / 2 + 3, 0.55, x); faFlame(x + w - 9, y + h / 2 + 3, 0.55, x + 1); }
  }
}
// the Seer speaks: an iron frame across the foot of the screen; her name on a gilt plate set into it
function divDialog() {
  const V = G.divine, full0 = V.lines[V.li] || '', line = full0.slice(0, Math.floor(V.shown));
  const x = 14, y = 212, w = W - 28, h = 54;
  ctx.fillStyle = 'rgba(4,3,5,0.82)'; ctx.fillRect(x, y, w, h);
  faDraw(faFrame(w, h, 'panel'), x, y, w, h);
  const np = faFrame(86, 14, 'gold'); faDraw(np, x + 14, y - 7, 86, 14);
  faText('The Mysterious Stranger', x + 57, y + 3.5, '#2a1a0c', FA_SMALL, 'center', 0); faText('The Mysterious Stranger', x + 57, y + 3, '#f0d8a0', FA_SMALL, 'center', 0);
  const lines = faWrap(full0, w - 40, FA_SAY), shownLines = []; let n = Math.floor(V.shown);
  for (const l of lines) { if (n <= 0) break; shownLines.push(l.slice(0, n)); n -= l.length + 1; }
  const top = y + 20 + (lines.length < 3 ? 4 : 0) - Math.max(0, lines.length - 3) * 5;
  shownLines.slice(0, 4).forEach((l, i) => faText(l, x + 20, top + i * (lines.length > 3 ? 10 : 11), '#e6dcc4', FA_SAY, 'left', 0.8));
  const full = V.shown >= full0.length;
  if (full && !['cards', 'cardRev', 'bones', 'star', 'sac', 'face', 'fear', 'seek', 'ask'].includes(V.scene) || (full && V.li < V.lines.length - 1)) {
    // a small guttering flame is the "go on" mark
    const k = 0.6 + 0.4 * Math.sin(G.time * 5); ctx.globalAlpha = k; faFlame(x + w - 18, y + h - 9, 0.7, 3); ctx.globalAlpha = 1;
  }
}
// pros in candle-gold, cons in dried-blood red, in one centred line (or stacked when narrow)
function fateTxt(str, x, y, maxW, dim) {
  if (!str) return;
  const parts = str.split(' · '), gap = tw(' · ') + 2, ws = parts.map(tw), total = ws.reduce((a, b) => a + b, 0) + gap * (parts.length - 1);
  const col = t => t.startsWith('-') ? (dim ? '#6a2a24' : '#d4553c') : (dim ? '#6f6a64' : '#e3b25a');
  if (!maxW || total <= maxW) { let cx = x - total / 2; parts.forEach((t, i) => { txt(t, cx, y, col(t), 'left', true); if (i < parts.length - 1) { ctx.fillStyle = dim ? '#3a3230' : '#7a6040'; ctx.fillRect(Math.round(cx + ws[i] + gap / 2 - 1), y - 3, 1, 1); ctx.fillRect(Math.round(cx + ws[i] + gap / 2 - 1), y - 4, 1, 1); } cx += ws[i] + gap; }); return; }
  parts.forEach((t, i) => txt(t, x, y + i * 9 - (parts.length - 1) * 4.5, col(t), 'center', true));
}
function faSkip() {
  const x = W - 86, y = 4, w = 80, h = 14, hov = inRect(mouse, x, y, w, h);
  G.divine.btn.push({ x, y, w, h, fn: () => skipDivination() });
  faText('Skip the reading', W - 8, 14, hov ? '#e8d8b0' : '#6a6068', FA_SMALL, 'right', 0.8);
}
function divButton(x, y, w, h, fn) { G.divine.btn.push({ x, y, w, h, fn }); return inRect(mouse, x, y, w, h); }

// ------------------------------------------------------------------- the cards: vellum and gilt, each face an engraving
const FA_CW = 104, FA_CH = 160;
function faCardFrame(R, face) {
  faPut(R, 0, 0, FA_CW - 1, FA_CH - 1, (x, y, o) => {
    const d = Math.min(x, y, FA_CW - 1 - x, FA_CH - 1 - y), n = faF(x * 0.09, y * 0.09, face ? 200 : 201, 4);
    if (d < 7) { const t = d / 7; o.h = 4 + Math.sin(t * Math.PI) * 4 + (d > 5.2 ? -2 : 0); faSet(o, faMix([96, 70, 30], [206, 166, 84], faF(x * 0.3, y * 0.3, 202, 2))); if (faF(x * 0.15, y * 0.15, 203, 2) > 0.66) faSet(o, [70, 50, 28]); o.s = 0.9; return true; }
    o.h = 1 + n; o.s = 0.05;
    if (face) { let c = faMix([150, 132, 98], [206, 188, 150], n); const fox = faF(x * 0.05, y * 0.05, 204, 3); if (fox > 0.6) c = faMix(c, [120, 84, 50], (fox - 0.6) * 2); faSet(o, c); }
    else { let c = faMix([34, 8, 12], [84, 20, 26], n); const cr = Math.abs(faF(x * 0.07, y * 0.07, 205, 3) - 0.5) < 0.018; if (cr) { c = [16, 6, 8]; o.h -= 1; } faSet(o, c); o.s = 0.45; }
    return true;
  });
}
// the backs: oxblood lacquer, an eye inside a ring of thorns, worked in gilt
function faCardBack() {
  return faGet('cardback', () => {
    const R = faRel(FA_CW, FA_CH), cx = 52, cy = 80, gold = (x, y) => faMix([100, 72, 30], [212, 172, 90], faF(x * 0.3, y * 0.3, 210, 2));
    faCardFrame(R, false);
    faPut(R, 10, 10, 93, 149, (x, y, o) => { const d = Math.min(x - 10, y - 10, 93 - x, 149 - y); if (d > 1.4) return false; o.h = 4; faSet(o, gold(x, y)); o.s = 0.9; return true; });
    // the thorn ring
    faPut(R, cx - 34, cy - 34, cx + 34, cy + 34, (x, y, o) => {
      const r = Math.hypot(x - cx, y - cy), a = Math.atan2(y - cy, x - cx), sp = Math.abs(((a / (Math.PI * 2) * 14) % 1 + 1) % 1 - 0.5);
      const ring = Math.abs(r - 24) < 2.6, thorn = r > 26 && r < 26 + (0.5 - sp) * 16 && sp < 0.18;
      if (!ring && !thorn) return false; o.h = 6 + (ring ? Math.sqrt(Math.max(0, 1 - ((r - 24) / 2.6) ** 2)) * 3 : (1 - (r - 26) / 8) * 2); faSet(o, gold(x, y)); o.s = 0.9; return true;
    });
    // the eye: lids, a gilt iris, a black pupil
    faPut(R, cx - 18, cy - 10, cx + 18, cy + 10, (x, y, o) => {
      const u = (x - cx) / 17, lid = 9 * (1 - u * u); if (Math.abs(u) > 1 || Math.abs(y - cy) > lid) return false;
      const edge = lid - Math.abs(y - cy) < 1.6, ir = Math.hypot(x - cx, y - cy);
      o.h = 5 + (edge ? 2 : 0) + (ir < 7 ? Math.sqrt(49 - ir * ir) * 0.3 : 0); faSet(o, edge ? gold(x, y) : ir < 2.6 ? [10, 6, 6] : ir < 7 ? faMix(gold(x, y), [120, 30, 20], 0.3) : [178, 164, 132]); o.s = ir < 7 ? 0.9 : 0.3; return true;
    });
    for (const [x0, y0] of [[22, 22], [82, 22], [22, 138], [82, 138]]) faBlob(R, x0, y0, 4, 4, 3, 4, (x, y) => gold(x, y), 0.9);
    for (const [x0, y0] of [[52, 22], [52, 138]]) faSkullBoss(R, x0, y0, 0.36);
    return faShade(R, { amb: [0.25, 0.22, 0.22], dirs: [{ v: [-0.5, -0.7, 0.6], c: [1.0, 0.8, 0.6] }, { v: [0.3, 0.6, 0.4], c: [0.15, 0.1, 0.1] }], ao: 0.08, aoR: 2, lv: 26 });
  });
}
// the engravings: each glyph is built as a relief, then cut into the vellum as hatching in sepia ink
function faGlyph(R, g) {
  const X = 52, Y = 66, ink = [60, 60, 60], red = [150, 26, 30], gold = [210, 160, 60], acc = (o, c) => { o.e = c; };
  const put = (fn) => faPut(R, 12, 14, 92, 118, fn);
  if (g === 0) {   // an eye that weeps
    put((x, y, o) => { const u = (x - X) / 32, lid = 16 * (1 - u * u); if (Math.abs(u) > 1 || Math.abs(y - Y) > lid) return false; const ir = Math.hypot(x - X, y - Y); o.h = 6 + Math.sqrt(Math.max(0, lid * lid - (y - Y) ** 2)) * 0.4 + (ir < 11 ? Math.sqrt(121 - ir * ir) * 0.5 : 0) - (ir < 4 ? 6 : 0); faSet(o, ink); if (ir < 4) acc(o, [20, 10, 10]); return true; });
    for (let i = -4; i <= 4; i++) { const t = i / 4.5, bx = X + t * 30, by = Y - 16 * (1 - t * t); faCap(R, [[bx, by], [bx + t * 8, by - 9 - (1 - Math.abs(t)) * 4]], 1.2, 0.5, 6, ink); }
    for (let i = 0; i < 3; i++) { const ty = Y + 20 + i * 11; faBlob(R, X - 6 + i, ty, 2.2 - i * 0.3, 3.4 - i * 0.4, 3, 4, ink); put((x, y, o) => { if (Math.hypot(x - X + 6 - i, y - ty) > 3.2) return false; o.add = true; o.h = 0; o.keep = true; acc(o, red); return true; }); }
  } else if (g === 1) {   // the tower that is also a grave
    faBlob(R, X, 118, 44, 16, 8, 0, ink);
    faSlab(R, [[40, 108], [40, 44], [64, 44], [64, 108]], 4, 8, 5, ink);
    for (let i = 0; i < 4; i++) faSlab(R, [[39 + i * 7, 44], [39 + i * 7, 36], [44 + i * 7, 36], [44 + i * 7, 44]], 4, 6, 2, ink);
    faSlab(R, [[46, 80], [46, 66], [52, 60], [58, 66], [58, 80]], 12, -8, 2, ink);
    put((x, y, o) => { if (Math.abs(x - 52) > 5 || y < 62 || y > 80 || !faInPoly(x, y, [[46, 80], [46, 66], [52, 60], [58, 66], [58, 80]])) return false; o.add = true; o.h = 0; o.keep = true; acc(o, [26, 18, 12]); return true; });
    for (const [bx, by] of [[24, 30], [78, 26], [84, 40]]) faCap(R, [[bx - 5, by + 2], [bx, by], [bx + 5, by + 2]], 1.2, 1.2, 6, ink);
    for (let i = 0; i < 5; i++) faSlab(R, [[40, 52 + i * 12], [64, 52 + i * 12], [64, 53 + i * 12], [40, 53 + i * 12]], 11, -2, 1, ink);
  } else if (g === 2) {   // the hanged one
    faSlab(R, [[22, 116], [22, 22], [28, 22], [28, 116]], 2, 6, 3, ink); faSlab(R, [[22, 22], [72, 22], [72, 28], [22, 28]], 2, 6, 3, ink); faCap(R, [[28, 40], [40, 26]], 2, 2, 6, ink);
    faCap(R, [[62, 28], [62, 46]], 1, 1, 8, ink);
    faBlob(R, 62, 52, 6, 7, 6, 6, ink); faCap(R, [[62, 58], [61, 84]], 8, 6, 6, ink); faCap(R, [[59, 84], [58, 104]], 3, 2, 6, ink); faCap(R, [[65, 84], [66, 102]], 3, 2, 6, ink);
    faCap(R, [[55, 62], [54, 80]], 2.5, 2, 9, ink); faCap(R, [[69, 62], [70, 80]], 2.5, 2, 9, ink);
  } else if (g === 3) {   // the cracked moon over the fen
    put((x, y, o) => { const r = Math.hypot(x - X, y - 56); if (r > 28) return false; const bite = Math.hypot(x - X - 14, y - 50); if (bite < 24) return false; o.h = Math.sqrt(784 - r * r) * 0.6 - faG(faF(x * 0.12, y * 0.12, 220, 2) - 0.6, 0.08) * 3; faSet(o, ink); if (Math.abs(x - X + 8 - (y - 56) * 0.3 + Math.sin(y * 0.5) * 2) < 1) { o.h -= 4; } return true; });
    faBlob(R, 30, 124, 34, 16, 6, 0, ink); faBlob(R, 80, 126, 30, 14, 5, 0, ink);
    for (let i = 0; i < 4; i++) faSlab(R, [[18 + i * 20, 104 - i % 2 * 3], [36 + i * 20, 104 - i % 2 * 3], [36 + i * 20, 105 - i % 2 * 3], [18 + i * 20, 105 - i % 2 * 3]], 1, 1, 1, ink);
  } else if (g === 4) {   // a skull with a candle stuck on its crown
    faSkull(R, X, 80, 1.15, 221, 1);
    faCap(R, [[X, 58], [X, 38]], 5, 5, 16, ink); faCap(R, [[X + 4, 50], [X + 5, 56]], 1.5, 1.5, 20, ink);
    put((x, y, o) => { const d = Math.hypot((x - X) / 3, (y - 30) / 6); if (d > 1) return false; o.h = 24; faSet(o, ink); acc(o, gold); return true; });
  } else if (g === 5) {   // a knife, point down, and what drips from it
    faSlab(R, [[48, 28], [56, 28], [55, 84], [52, 96], [49, 84]], 4, 5, 3, ink); faCap(R, [[52, 32], [52, 80]], 0.8, 0.5, 6, ink);
    faCap(R, [[36, 26], [68, 26]], 3, 3, 8, ink); faCap(R, [[52, 24], [52, 12]], 3, 3, 8, ink); faBlob(R, 52, 10, 5, 4, 4, 8, ink);
    for (let i = 0; i < 3; i++) { const ty = 102 + i * 7; faBlob(R, 52, ty, 1.8 + i * 0.3, 2.6 + i * 0.3, 3, 4, ink); put((x, y, o) => { if (Math.hypot(x - 52, y - ty) > 3.2) return false; o.add = true; o.h = 0; o.keep = true; acc(o, red); return true; }); }
    put((x, y, o) => { if (y < 84 || y > 96 || Math.abs(x - 52) > 3) return false; o.add = true; o.h = 0; o.keep = true; acc(o, red); return true; });
  } else if (g === 6) {   // a serpent swallowing itself
    const pts = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 1.9 - Math.PI / 2; pts.push([X + Math.cos(a) * 28, 66 + Math.sin(a) * 36]); }
    faCap(R, pts, 3, 7.5, 4, (x, y, t) => ink, 0.2, 0.8);
    put((x, y, o) => { if (!R.M[(y | 0) * R.w + (x | 0)]) return false; o.add = true; o.h = Math.abs(Math.sin(x * 0.9) * Math.sin(y * 0.9)) * 1.2; o.keep = true; return true; });
    faBlob(R, pts[40][0] + 2, pts[40][1] - 2, 8, 6, 5, 6, ink); faBlob(R, pts[40][0] + 4, pts[40][1] - 4, 1.3, 1.3, 1, 10, ink);
  } else {   // the wounded sun
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, L = i % 2 ? 36 : 44; faSlab(R, [[X + Math.cos(a - 0.1) * 20, 64 + Math.sin(a - 0.1) * 20], [X + Math.cos(a) * L, 64 + Math.sin(a) * L], [X + Math.cos(a + 0.1) * 20, 64 + Math.sin(a + 0.1) * 20]], 2, 4, 3, ink); }
    faBlob(R, X, 64, 21, 21, 10, 4, ink);
    for (const sx of [-7, 7]) put((x, y, o) => { if (Math.hypot(x - X - sx, (y - 60) * 2) > 4) return false; o.add = true; o.h = -4; o.keep = true; return true; });
    put((x, y, o) => { if (Math.abs(x - X) > 1.6 + (y - 66) * 0.05 || y < 66 || y > 104) return false; o.h = 12; faSet(o, ink); acc(o, red); return true; });
  }
}
function faCardFace(g) {
  return faGet('cardface' + g, () => {
    const R = faRel(FA_CW, FA_CH); faCardFrame(R, true);
    faPut(R, 11, 13, 92, 119, (x, y, o) => { const d = Math.min(x - 11, y - 13, 92 - x, 119 - y); if (d > 1.2) return false; o.h = 2; faSet(o, [52, 38, 26]); return true; });
    // the banner for the name: a ribbon with folded tails
    faSlab(R, [[6, 126], [16, 122], [88, 122], [98, 126], [92, 134], [98, 142], [88, 146], [16, 146], [6, 142], [12, 134]], 2, 3, 3, (x, y) => faMix([140, 120, 88], [196, 176, 138], faF(x * 0.2, y * 0.2, 230, 2)), 0.1);
    const card = faShade(R, { amb: [0.3, 0.28, 0.26], dirs: [{ v: [-0.5, -0.7, 0.6], c: [0.95, 0.82, 0.62] }], ao: 0.06, aoR: 2, lv: 26 });
    // the engraving
    const Gr = faRel(FA_CW, FA_CH); faGlyph(Gr, g);
    const lum = faLum(Gr, [-0.55, -0.55, 0.62], 0.08), cx2 = card.getContext('2d'), img = cx2.getImageData(0, 0, FA_CW, FA_CH), D = img.data;
    for (let y = 14; y < 119; y++) for (let x = 12; x < 92; x++) {
      const i = y * FA_CW + x, o = i * 4;
      if (!Gr.M[i]) {   // the sky of the engraving: fine horizontal lines, darker to the top
        const d = 0.34 - (y - 14) / 105 * 0.34; if ((y % 4 === 0) && faF(x * 0.15, y * 0.3, 231, 2) < d * 1.6) { D[o] = D[o] * 0.55; D[o + 1] = D[o + 1] * 0.5; D[o + 2] = D[o + 2] * 0.45; }
        continue;
      }
      const L = lum[i], dk = 1 - L, edge = !Gr.M[i - 1] || !Gr.M[i + 1] || !Gr.M[i - FA_CW] || !Gr.M[i + FA_CW];
      const h1 = ((x + y) % 3) === 0, h2 = ((x - y + 300) % 3) === 0, h3 = (y % 2) === 0;
      let on = edge || (dk > 0.3 && h1) || (dk > 0.55 && h2) || (dk > 0.78 && h3) || dk > 0.93;
      const ac = Gr.E[i * 3] + Gr.E[i * 3 + 1] + Gr.E[i * 3 + 2] > 0;
      if (ac) { const k = 0.45 + 0.7 * L; D[o] = Math.min(255, Gr.E[i * 3] * k); D[o + 1] = Math.min(255, Gr.E[i * 3 + 1] * k); D[o + 2] = Math.min(255, Gr.E[i * 3 + 2] * k); if (edge) { D[o] *= 0.4; D[o + 1] *= 0.4; D[o + 2] *= 0.4; } continue; }
      if (on) { D[o] = 42; D[o + 1] = 28; D[o + 2] = 22; }
    }
    cx2.putImageData(img, 0, 0); return card;
  });
}
function faCardGlyph(e) {
  let s = 0; for (const c of e.id) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  const gi = G.divine && G.divine.cards ? G.divine.cards.indexOf(e) : -1;
  return gi >= 0 && G.divine.glyphs ? G.divine.glyphs[gi] : s % 8;
}
function divCard(x, y, w, h, face, e, hi, flipK) {
  const k = flipK == null ? 1 : flipK, sw = Math.max(2, Math.round(w * Math.abs(Math.cos(Math.min(1, k) * Math.PI)) * 2) / 2), showFace = face && k > 0.5, cx = x + w / 2;
  // a shadow on the cloth, then the warm light of consideration
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(cx - sw / 2 + 2, y + 3, sw, h);
  if (hi) { ctx.globalCompositeOperation = 'lighter'; glow(cx, y + h / 2, 50, '255,160,70', 0.16 + 0.05 * Math.sin(G.time * 5)); ctx.globalCompositeOperation = 'source-over'; }
  faDraw(showFace ? faCardFace(faCardGlyph(e)) : faCardBack(), cx - sw / 2, y, sw, h);
  if (hi) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,170,80,0.07)'; ctx.fillRect(cx - sw / 2, y, sw, h); ctx.globalCompositeOperation = 'source-over'; }
  if (showFace && sw >= w * 0.8) {
    // the name on its ribbon: one line if it fits, a smaller hand if it must, two lines only as a last resort
    const nm = e.name.replace(/^The /, ''), f7 = '7px "IM Fell English SC", Georgia, serif', f6 = '6px "IM Fell English SC", Georgia, serif';
    ctx.font = f7; const w7 = ctx.measureText(nm).width; ctx.font = f6; const w6 = ctx.measureText(nm).width;
    if (w7 <= w - 12) faText(nm, cx, y + h - 11.5 + 2, '#2a1a10', f7, 'center', 0);
    else if (w6 <= w - 10) faText(nm, cx, y + h - 11.5 + 1.8, '#2a1a10', f6, 'center', 0);
    else faWrap(nm, w - 12, f6).slice(0, 2).forEach((l, i) => faText(l, cx, y + h - 13 + i * 5.5, '#2a1a10', f6, 'center', 0));
  }
}
// ------------------------------------------------------------------- the rites at the table
// a line of plates: returns the index under the mouse. items: [{ label, sub, st }]
function faChoiceRow(items, y, w, h, gap, pick, font = FA_HEAD) {
  const n = items.length, x0 = W / 2 - (n * w + (n - 1) * gap) / 2; let hov = -1;
  items.forEach((it, i) => {
    const x = x0 + i * (w + gap), on = it.live && inRect(mouse, x, y, w, h); if (on) hov = i;
    if (it.live) divButton(x, y, w, h, () => pick(i));
    faPlate(x, y, w, h, it.st != null ? it.st : on ? 1 : 0);
    const ls = faWrap(it.label, w - 14, font), lh = font === FA_HEAD ? 11 : 10, ty = y + h / 2 + 4 - (ls.length - 1) * lh / 2 - (it.sub ? 5 : 0);
    ls.forEach((l, j) => faText(l, x + w / 2, ty + j * lh, on || it.st === 2 ? '#f4e2b8' : it.st === 3 ? '#5a5048' : '#c9bca0', font, 'center', 0.9));
    if (it.sub) it.sub.split(' · ').forEach((t, j) => txt(t, x + w / 2, y + h - 9 + j * 8 - (it.sub.split(' · ').length - 1) * 8 + 4, t.startsWith('-') ? '#d4553c' : '#e3b25a', 'center', true));
  });
  return hov;
}
function faPrompt(s, y) { faText(s, W / 2, y, '#b8a888', FA_HEAD, 'center', 0.9); }
// the drawn card, held up to the candles: keep it upright or turn it over
function drawCardRev(full) {
  const V = G.divine, e = V.cards[V.choice0], cx = 240, cy = 140;
  const hovR = full && V.scene === 'cardRev' && inRect(mouse, 282, 120, 150, 44), hovU = full && V.scene === 'cardRev' && inRect(mouse, 48, 120, 150, 44);
  const want = V.scene === 'cardRevDone' ? (V.picks.cardRev ? 1 : 0) : hovR ? 1 : 0;
  V.revA = (V.revA || 0) + (want - (V.revA || 0)) * 0.15;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI * V.revA); ctx.translate(-cx, -cy);
  divCard(cx - 26, cy - 40, 52, 80, true, e, true, 1);
  ctx.restore();
  if (V.scene !== 'cardRev' || !full) { if (V.scene === 'cardRevDone') fateTxt(V.picks.cardRev ? e.rev.txt : e.txt, W / 2, 200); return; }
  for (const [x, rev, hov] of [[48, false, hovU], [282, true, hovR]]) {
    divButton(x, 120, 150, 44, () => divinePick(rev ? 1 : 0));
    faPlate(x, 120, 150, 44, hov ? 1 : 0);
    faText(rev ? 'Reversed' : 'Upright', x + 75, 135, hov ? '#f4e2b8' : '#c9bca0', FA_HEAD, 'center', 0.9);
    fateTxt(rev ? e.rev.txt : e.txt, x + 75, 150, 134);
  }
}
// the bones: a long bone, painted once, laid along each stroke of the pattern
function faBoneSprite() {
  return faGet('bone', () => {
    const R = faRel(72, 18), col = (x, y) => faMix([120, 108, 84], [214, 204, 176], faF(x * 0.3, y * 0.3, 240, 2));
    faCap(R, [[10, 9], [62, 9]], 3.2, 3.2, 3, col, 0.2);
    for (const ex of [8, 64]) { faBlob(R, ex, 6, 5, 4.5, 4, 3, col, 0.2); faBlob(R, ex, 12, 5, 4.5, 4, 3, col, 0.2); }
    return faShade(R, { amb: [0.22, 0.2, 0.2], dirs: [{ v: [-0.4, -0.6, 0.7], c: [1.0, 0.82, 0.6] }], ao: 0.05, aoR: 2, lv: 24 });
  });
}
function faMat() {
  return faGet('bonemat', () => {
    // a round of cured hide laid on the cloth, a circle and its signs cut into it
    const R = faRel(360, 100), cx = 180, cy = 50;
    faPut(R, 0, 0, 359, 99, (x, y, o) => {
      const u = (x - cx) / 172, v = (y - cy) / 44, d = Math.hypot(u, v) + (faF(x * 0.05, y * 0.1, 241, 2) - 0.5) * 0.06; if (d > 1) return false;
      o.h = 2 + (1 - d) * 3; let c = faMix([40, 26, 20], [84, 58, 42], faF(x * 0.06, y * 0.12, 242, 3));
      const r1 = Math.abs(Math.hypot(u, v) - 0.78) < 0.012, r2 = Math.abs(Math.hypot(u, v) - 0.7) < 0.01, a = Math.atan2(v, u), tick = Math.hypot(u, v) > 0.7 && Math.hypot(u, v) < 0.78 && Math.abs(((a / Math.PI * 12) % 1 + 1) % 1 - 0.5) < 0.05;
      if (r1 || r2 || tick) { c = faMix(c, [150, 30, 30], 0.7); o.h -= 0.6; }
      faSet(o, c); o.s = 0.15; return true;
    });
    return faShade(R, { amb: [0.12, 0.1, 0.1], pts: [{ x: -60, y: 80, z: 90, c: [1.2, 0.72, 0.36], r: 260 }, { x: 420, y: 80, z: 90, c: [1.2, 0.72, 0.36], r: 260 }], dirs: [{ v: [0, -0.3, 1], c: [0.2, 0.18, 0.16] }], ao: 0.05, aoR: 3, lv: 22 });
  });
}
function drawBoneThrow(full) {
  const V = G.divine, cx = 240, cy = 186, k = Math.min(1, V.t / 0.6), bone = faBoneSprite();
  faDraw(faMat(), cx - 90, cy - 25, 180, 50);
  V.pattern.forEach((sg, i) => {
    const o = V.bonePos[i], drop = (1 - k) * (60 + i * 15), bounce = k < 1 ? 0 : 0;
    const x0 = cx + (sg[0] + o.x) * 72, y0 = cy + (sg[1] + o.y) * 20 - drop, x1 = cx + (sg[2] + o.x) * 72, y1 = cy + (sg[3] + o.y) * 20 - drop;
    const L = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0);
    ctx.save(); ctx.translate((x0 + x1) / 2 + 1.5, (y0 + y1) / 2 + 2 + bounce); ctx.rotate(a); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(-L / 2, -2, L, 4); ctx.restore();
    ctx.save(); ctx.translate((x0 + x1) / 2, (y0 + y1) / 2 + bounce); ctx.rotate(a); faDraw(bone, -L / 2 - 4, -4.5, L + 8, 9); ctx.restore();
  });
  if (V.scene === 'bones' && full) {
    const hov = faChoiceRow(V.bones.map(b => ({ label: b.see, live: true })), 124, 128, 30, 8, i => divinePick(i), FA_SMALL);
    if (hov >= 0) fateTxt(V.bones[hov].txt, W / 2, 116);
  } else if (V.scene === 'bonesDone' && V.choice != null) { faText(V.bones[V.choice].see, W / 2, 138, '#f0dcae', FA_HEAD, 'center'); fateTxt(V.bones[V.choice].txt, W / 2, 150); }
}
// the offering: a stone basin of blood on the cloth, a knife beside it
function faBasin() {
  return faGet('basin', () => {
    const R = faRel(220, 90), cx = 110;
    faPut(R, 20, 20, 200, 88, (x, y, o) => { const u = (x - cx) / 80, v = (y - 58) / 24, d = u * u + v * v; if (d > 1) return false; const rim = d > 0.62; o.h = rim ? 14 + Math.sqrt(Math.max(0, 1 - Math.abs(d - 0.81) / 0.19)) * 4 : 6; faSet(o, rim ? faMix([50, 46, 48], [104, 96, 92], faF(x * 0.1, y * 0.1, 250, 3)) : faMix([26, 2, 4], [70, 8, 12], faF(x * 0.05, y * 0.1, 251, 3))); o.s = rim ? 0.1 : 1.6; return true; });
    faSlab(R, [[40, 70], [42, 60], [60, 56], [70, 58], [70, 66], [58, 72]], 16, 4, 3, faMix([40, 30, 24], [80, 60, 40], 0.5), 0.1);   // the base, carved
    // the knife: an iron blade laid across the rim
    faSlab(R, [[150, 42], [206, 30], [210, 33], [152, 50]], 22, 3, 2, (x, y) => faMix([90, 92, 98], [190, 190, 196], faF(x * 0.2, y * 0.2, 252, 2)), 1);
    faCap(R, [[130, 49], [150, 45]], 4, 4, 22, [60, 38, 24], 0.2); faBlob(R, 128, 49, 5, 5, 3, 22, [120, 90, 40], 0.9);
    return faShade(R, { amb: [0.12, 0.1, 0.1], pts: [{ x: -80, y: 60, z: 100, c: [1.3, 0.8, 0.4], r: 240 }, { x: 300, y: 60, z: 100, c: [1.3, 0.8, 0.4], r: 240 }], dirs: [{ v: [-0.3, -0.8, 0.5], c: [0.2, 0.3, 0.3] }], ao: 0.06, aoR: 3, lv: 24 });
  });
}
function drawSacrifice(full) {
  const V = G.divine;
  faDraw(faBasin(), 185, 150, 110, 45);
  const k = 0.6 + 0.4 * Math.sin(G.time * 2.1); ctx.globalCompositeOperation = 'lighter'; glow(240, 179, 26, '160,20,30', 0.12 * k); ctx.globalCompositeOperation = 'source-over';
  // a slow ripple on the blood
  const rr = (G.time * 6) % 16; ctx.strokeStyle = `rgba(220,90,90,${0.25 * (1 - rr / 16)})`; ctx.beginPath(); ctx.ellipse(240, 179, rr * 1.8, rr * 0.5, 0, 0, 6.28); ctx.stroke();
  if (V.scene !== 'sac' || !full) return;
  faPrompt('Give one', 108);
  faChoiceRow(V.sacs.map(e => ({ label: e.give, sub: e.txt, live: true })), 116, 128, 38, 8, i => divinePick(i), FA_HEAD);
}

// ------------------------------------------------------------------- the sky over the dead god
const FA_GODRGB = { tower: [226, 214, 186], wheel: [206, 60, 70], lantern: [150, 196, 230], hollow: [196, 150, 210], silence: [224, 196, 110] };
function faSky() {
  return faBake('sky', function* () {
    const c = faCv(960, 540), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 540); g.addColorStop(0, '#030307'); g.addColorStop(0.45, '#0a0a18'); g.addColorStop(0.58, '#1a1622'); g.addColorStop(0.66, '#2c2224'); g.addColorStop(1, '#0c0a0c'); x.fillStyle = g; x.fillRect(0, 0, 960, 540);
    // the long smear of stars across the sky, and dust across it
    const img = x.getImageData(0, 0, 960, 540), D = img.data;
    for (let py = 0; py < 420; py++) for (let px2 = 0; px2 < 960; px2++) {
      const band = faG((py - 60 - px2 * 0.28) / 90, 1), dust = faF(px2 * 0.012, py * 0.02, 300, 5), cloud = faF(px2 * 0.004 + 3, py * 0.012, 301, 4), o = (py * 960 + px2) * 4;
      const neb = band * Math.max(0, dust - 0.35) * 1.4, dk = band * Math.max(0, faF(px2 * 0.02, py * 0.03, 302, 4) - 0.55) * 2;
      D[o] += neb * 38 - dk * 10; D[o + 1] += neb * 34 - dk * 10; D[o + 2] += neb * 48 - dk * 10;
      const cl = Math.max(0, cloud - 0.58) * 2.4 * Math.min(1, py / 200); D[o] += cl * 40; D[o + 1] += cl * 34; D[o + 2] += cl * 40;
      const st = faHash(px2, py, 303), dens = 0.004 + band * 0.02;
      if (st < dens) { const b = 90 + faHash(px2, py, 304) * 165, t = faHash(px2, py, 305); D[o] = Math.max(D[o], b * (t > 0.8 ? 1 : 0.85)); D[o + 1] = Math.max(D[o + 1], b * 0.92); D[o + 2] = Math.max(D[o + 2], b * (t < 0.3 ? 1 : 0.8)); }
      if (px2 === 959 && (py & 7) === 7) yield;
    }
    x.putImageData(img, 0, 0);
    // a few big stars with long cross-flares
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) { const sx = faHash(i, 1, 306) * 960, sy = faHash(i, 2, 306) * 380, L = 3 + faHash(i, 3, 306) * 7; x.fillStyle = 'rgba(200,210,255,0.5)'; x.fillRect(sx - L, sy, L * 2 + 1, 1); x.fillRect(sx, sy - L, 1, L * 2 + 1); x.fillStyle = '#ffffff'; x.fillRect(sx, sy, 1, 1); }
    x.globalCompositeOperation = 'source-over';
    // the sick moon, pitted
    const R = faRel(960, 540);
    yield* faPutG(R, 20, 4, 110, 80, (px2, py, o) => { const u = (px2 - 58) / 24, v = (py - 38) / 24, d = u * u + v * v; if (d > 1) return false; const cr = faF(px2 * 0.08, py * 0.08, 307, 4); o.h = Math.sqrt(1 - d) * 30 - Math.max(0, cr - 0.55) * 30; faSet(o, faMix([130, 128, 108], [220, 214, 184], faF(px2 * 0.04, py * 0.04, 308, 3))); return true; });
    const moon = yield* faShadeG(R, { amb: [0.02, 0.02, 0.02], dirs: [{ v: [-0.8, -0.2, 0.35], c: [1.1, 1.05, 0.9] }], ao: 0.05, aoR: 3, lv: 26, ol: false });
    x.globalCompositeOperation = 'lighter'; const mg = x.createRadialGradient(58, 38, 16, 58, 38, 120); mg.addColorStop(0, 'rgba(160,160,130,0.22)'); mg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = mg; x.fillRect(0, 0, 400, 300); x.globalCompositeOperation = 'source-over';
    x.drawImage(moon, 0, 0);
    // the land: the god's body. Ribs arching out of the moor, a hand the size of a hill, the skull on the horizon
    const L = faRel(960, 540), earth = (px2, py) => faMix([12, 10, 12], [34, 28, 30], faF(px2 * 0.03, py * 0.03, 310, 4)), bone = (px2, py) => faMix([36, 32, 30], [84, 78, 70], faF(px2 * 0.1, py * 0.1, 311, 3));
    yield* faPutG(L, 0, 300, 959, 539, (px2, py, o) => { const hz = 334 + Math.sin(px2 * 0.013) * 8 + Math.sin(px2 * 0.041 + 1) * 4 + faF(px2 * 0.02, 1, 312, 3) * 16; if (py < hz) return false; o.h = 20 + (py - hz) * 0.3 + faF(px2 * 0.05, py * 0.05, 313, 3) * 8; faSet(o, earth(px2, py)); return true; });
    for (let i = 0; i < 9; i++) {   // the ribs: great curved bones rising from the ground and bending over
      const bx = 170 + i * 28, top = 240 + Math.abs(i - 4) * 9, sd = i < 4 ? -1 : 1, Rr = (352 - top) / 1.25, pts = [];
      for (let k = 0; k <= 14; k++) { const a = k / 14 * 2.3; pts.push([bx + sd * (Rr - Rr * Math.cos(a)) * 0.55, 352 - Rr * Math.sin(a) * 1.25 + (a > 1.57 ? (a - 1.57) * 6 : 0)]); }
      faCap(L, pts, 5.5, 2, 30, bone, 0.1);
    }
    for (let k = 0; k < 22; k++) faBlob(L, 150 + k * 13, 350 - Math.sin(k / 21 * Math.PI) * 10, 6, 5, 4, 26, bone, 0.1);   // the spine, half buried
    // the hand, fingers curled against the sky
    faBlob(L, 720, 346, 60, 30, 20, 24, bone, 0.1);
    for (let f = 0; f < 4; f++) { const fx = 684 + f * 22, h0 = [90, 118, 110, 80][f]; faCap(L, [[fx, 334], [fx + 4, 334 - h0 * 0.6], [fx + 14, 334 - h0], [fx + 22, 334 - h0 + 16]], 9, 5, 34, bone, 0.1); }
    faCap(L, [[664, 342], [640, 302], [650, 282]], 9, 6, 34, bone, 0.1);
    // the skull, half sunk, on the far horizon
    faSkull(L, 884, 330, 1.5, 314, 1);
    // a chapel with one lit window on the moor, and a gibbet
    faSlab(L, [[520, 346], [520, 322], [534, 308], [548, 322], [548, 346]], 30, 6, 2, [40, 34, 34]);
    faCap(L, [[590, 348], [590, 292]], 1.8, 1.8, 30, [30, 26, 26]); faCap(L, [[590, 294], [610, 294]], 1.5, 1.5, 30, [30, 26, 26]);
    const land = yield* faShadeG(L, { amb: [0.05, 0.05, 0.08], dirs: [{ v: [-0.85, -0.5, 0.25], c: [0.95, 0.95, 0.9] }, { v: [0.3, -0.7, 0.4], c: [0.2, 0.12, 0.12] }], ao: 0.08, aoR: 4, lv: 22 });
    x.drawImage(land, 0, 0);
    x.fillStyle = '#f0b060'; x.fillRect(533, 326, 2, 3);
    // mist in the hollows
    for (let i = 0; i < 40; i++) { const mx = faHash(i, 5, 315) * 960, my = 340 + faHash(i, 6, 315) * 80; const mg2 = x.createRadialGradient(mx, my, 0, mx, my, 60); mg2.addColorStop(0, 'rgba(110,110,130,0.08)'); mg2.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = mg2; x.fillRect(mx - 60, my - 60, 120, 120); }
    return yield* faPixelizeG(c, 28, 0.03, 0.8);
  });
}
// the constellation of each face, and the ghost of the face itself behind it (pre-lit, drawn as light)
const FA_SIGNS = {
  wheel: { pts: [[0, -26], [-12, -20], [-16, -6], [-13, 8], [-6, 18], [0, 20], [6, 18], [13, 8], [16, -6], [12, -20], [-7, -5], [7, -5], [-7, 6], [-8, 26], [-9, 32]], lines: [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0], [10, 12, 13, 14]] },
  tower: { pts: [[0, -26], [0, -14], [0, -2], [0, 10], [0, 22], [-14, -10], [-18, 2], [14, -10], [18, 2], [-12, 12], [12, 12], [-6, 26], [6, 26]], lines: [[0, 1, 2, 3, 4], [1, 5, 6, 9, 3], [1, 7, 8, 10, 3], [4, 11], [4, 12]] },
  lantern: { pts: [[0, -28], [-10, -16], [-16, 0], [-18, 18], [-10, 30], [10, 30], [18, 18], [16, 0], [10, -16], [-6, -2], [6, -2], [0, 10]], lines: [[0, 1, 2, 3, 4, 5, 6, 7, 8, 0], [9, 11, 10]] },
  hollow: { pts: [[-8, 26], [8, 26], [14, 12], [12, -2], [6, -8], [-6, -8], [-12, -2], [-14, 12], [0, -14], [4, -22], [-2, -30], [3, -36]], lines: [[0, 1, 2, 3, 4, 5, 6, 7, 0], [4, 8, 5], [8, 9, 10, 11]] },
  silence: { pts: [0, 1, 2, 3, 4, 5, 6, 7].map(k => [Math.cos(k * 0.785 - 1.57) * 22, Math.sin(k * 0.785 - 1.57) * 22]), lines: [[0, 1, 2, 3, 4, 5, 6, 7, 0]] }
};
function faGhost(id) {
  return faGet('ghost_' + id, () => {
    const R = faRel(140, 140), X = 70, Y = 70, w = [200, 200, 200];
    if (id === 'wheel') {   // a girl's face, eyes shut, weeping
      faPut(R, 30, 18, 110, 124, (x, y, o) => { const u = (x - X) / 30, v = (y - Y + 4) / 42; if (u * u + v * v > 1) return false; const au = Math.abs(u); o.h = Math.sqrt(1 - u * u - v * v) * 20 - faG(au - 0.38, 0.14) * faG(v + 0.1, 0.08) * 6 + faG(u, 0.08) * faG(v - 0.1, 0.25) * 5 - faG(v - 0.55, 0.03) * faG(u, 0.25) * 3; faSet(o, w); return true; });
      for (const sx of [-11, 11]) faCap(R, [[X + sx, 72], [X + sx * 1.1, 100], [X + sx, 128]], 1.6, 2.4, 22, w);
    } else if (id === 'tower') {   // a ribcage cradling a small skull
      faCap(R, [[X, 22], [X, 122]], 3.5, 3.5, 10, w);
      for (let k = 0; k < 5; k++) for (const sd of [-1, 1]) { const y0 = 40 + k * 15, pts = []; for (let t = 0; t <= 8; t++) { const a = t / 8 * 2.6; pts.push([X + sd * Math.sin(a) * (34 - k * 3), y0 + (1 - Math.cos(a)) * 12]); } faCap(R, pts, 2.6, 1.6, 8, w); }
      faSkull(R, X, 84, 0.55, 320, 1);
    } else if (id === 'lantern') {   // a veiled head, bowed
      faPut(R, 26, 14, 114, 132, (x, y, o) => { const t = (y - 14) / 118, half = 10 + Math.sin(Math.min(1, t * 1.5) * 1.6) * 34 + t * 8; if (Math.abs(x - X) > half) return false; const u = (x - X) / half; o.h = Math.sqrt(1 - u * u) * 18 + Math.sin(u * 9 + t * 3) * 2; faSet(o, w); return true; });
      faBlob(R, X, 62, 16, 22, -8, 10, w);
    } else if (id === 'hollow') {   // a lidded urn with its breath curling out
      faPut(R, 36, 50, 104, 128, (x, y, o) => { const t = (y - 50) / 78, half = 14 + Math.sin(t * Math.PI) * 22; if (Math.abs(x - X) > half) return false; const u = (x - X) / half; o.h = Math.sqrt(1 - u * u) * 18 + (Math.abs(t - 0.3) < 0.02 ? 2 : 0); faSet(o, w); return true; });
      faBlob(R, X, 48, 16, 5, 4, 16, w); faBlob(R, X, 42, 4, 4, 3, 18, w);
      const pts = []; for (let t = 0; t <= 20; t++) pts.push([X + Math.sin(t * 0.5) * (4 + t * 0.9), 38 - t * 1.6]); faCap(R, pts, 2.5, 1, 6, w);
    } else {   // a black sun: a ring of light around nothing
      faPut(R, 0, 0, 139, 139, (x, y, o) => { const r = Math.hypot(x - X, y - Y), a = Math.atan2(y - Y, x - X); const ray = r > 30 && r < 30 + 26 * Math.pow(Math.abs(Math.sin(a * 8)), 6); if (!(Math.abs(r - 28) < 4 || ray)) return false; o.h = Math.abs(r - 28) < 4 ? Math.sqrt(16 - (r - 28) ** 2) * 2 : 2; faSet(o, w); return true; });
    }
    const lum = faLum(R, [-0.4, -0.7, 0.6], 0.2), c = faCv(140, 140), x = c.getContext('2d'), img = x.createImageData(140, 140), D = img.data, col = FA_GODRGB[id];
    for (let i = 0; i < 140 * 140; i++) { if (!R.M[i]) continue; const px2 = i % 140, py = (i / 140) | 0, bd = FA_BAYER[(py & 3) * 4 + (px2 & 3)] * 0.25, L = Math.max(0, Math.min(1, Math.round((lum[i] + bd) * 6) / 6)); D[i * 4] = col[0]; D[i * 4 + 1] = col[1]; D[i * 4 + 2] = col[2]; D[i * 4 + 3] = 255 * L; }
    x.putImageData(img, 0, 0); return c;
  });
}
function faStarPt(x, y, rgb, k, big) {
  const c = `rgba(${rgb.join(',')},`;
  ctx.globalCompositeOperation = 'lighter';
  glow(x, y, big ? 7 : 4, rgb.join(','), 0.35 * k);
  ctx.fillStyle = c + (0.5 * k) + ')'; const L = big ? 4 : 2.5; ctx.fillRect(x - L, y - 0.25, L * 2, 0.5); ctx.fillRect(x - 0.25, y - L, 0.5, L * 2);
  ctx.fillStyle = `rgba(255,255,255,${0.9 * k})`; ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
  ctx.globalCompositeOperation = 'source-over';
}
function drawStarScene(full) {
  const V = G.divine; fateLore36();
  faDraw(faSky(), 0, 0, W, H);
  const n5 = FATE.stars.length > 4, SX = i => n5 ? 48 + i * 96 : 80 + i * 107, CY = 88;
  // the headings: a thin gilt bracket over the three faces
  faText("The dead god's three faces", SX(1), 34, '#8a7a60', FA_SMALL, 'center', 0.9);
  ctx.fillStyle = 'rgba(150,120,70,0.5)'; ctx.fillRect(SX(0) - 30, 38, SX(2) - SX(0) + 60, 0.5); ctx.fillRect(SX(0) - 30, 38, 0.5, 4); ctx.fillRect(SX(2) + 30, 38, 0.5, 4);
  if (n5) faText('What was left', SX(3), 34, '#6a6070', FA_SMALL, 'center', 0.9);
  faText('What is not there', SX(n5 ? 4 : 3), 34, '#6a6070', FA_SMALL, 'center', 0.9);
  let shown = null;
  FATE.stars.forEach((s, i) => {
    const cx = SX(i), hov = full && V.scene === 'star' && inRect(mouse, cx - 44, CY - 46, 88, 100), chosen = V.picks.star === s.id, rgb = FA_GODRGB[s.id] || [220, 210, 190];
    if (full && V.scene === 'star') divButton(cx - 44, CY - 46, 88, 100, () => divinePick(i));
    if (hov || (chosen && V.scene === 'starDone')) shown = s;
    const fade = V.scene === 'starDone' && !chosen ? 0.25 : 1, k = (hov || chosen ? 1 : 0.55) * fade;
    // the ghost of the face, and a breath of its colour in the sky
    ctx.globalCompositeOperation = 'lighter';
    glow(cx, CY, 46, rgb.join(','), (hov || chosen ? 0.16 + 0.04 * Math.sin(G.time * 3) : 0.05) * fade);
    ctx.globalAlpha = (hov || chosen ? 0.5 : 0.16) * fade; faDraw(faGhost(s.id), cx - 35, CY - 35, 70, 70); ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (s.id === 'silence') { ctx.fillStyle = `rgba(0,0,0,${0.9 * fade})`; ctx.beginPath(); ctx.arc(cx, CY, 13, 0, 6.28); ctx.fill(); ctx.strokeStyle = `rgba(${rgb.join(',')},${0.6 * k})`; ctx.lineWidth = 0.75; ctx.beginPath(); ctx.arc(cx, CY + 1, 7, 0.35, Math.PI - 0.35); ctx.stroke(); ctx.lineWidth = 1; }
    // the lines between its stars, and the stars
    const sg = FA_SIGNS[s.id] || FA_SIGNS.silence, P2 = sg.pts.map(([a, b]) => [cx + a * 1.25, CY + b * 1.25]);
    ctx.strokeStyle = `rgba(${rgb.join(',')},${(hov || chosen ? 0.7 : 0.22) * fade})`; ctx.lineWidth = 0.5;
    for (const ln of sg.lines) { ctx.beginPath(); ln.forEach((q, j) => j ? ctx.lineTo(P2[q][0], P2[q][1]) : ctx.moveTo(P2[q][0], P2[q][1])); ctx.stroke(); }
    ctx.lineWidth = 1;
    P2.forEach(([a, b], j) => faStarPt(a, b, rgb, k * (0.7 + 0.3 * Math.sin(G.time * (1.3 + j * 0.37) + j)), j === 0));
    // the name, on two lines if it must be
    const nm = faWrap(s.name, 92, FA_HEAD), col = hov || chosen ? `rgb(${rgb.join(',')})` : '#9a9080';
    ctx.globalAlpha = fade; nm.forEach((l, j) => faText(l, cx, CY + 50 + j * 11, col, FA_HEAD, 'center', 0.9)); ctx.globalAlpha = 1;
  });
  if (shown) {
    const rgb = FA_GODRGB[shown.id] || [220, 210, 190], x = 56, y = 156, w = W - 112, h = 56;
    ctx.fillStyle = 'rgba(4,3,6,0.85)'; ctx.fillRect(x, y, w, h); faDraw(faFrame(w, h, 'panel'), x, y, w, h);
    faText(shown.clsName, W / 2, y + 15, `rgb(${rgb.join(',')})`, FA_BIG, 'center', 0.9); faText(shown.name + ', ' + shown.sub, W / 2, y + 24, '#8a7e6a', FA_SMALL, 'center', 0.8);
    const bl = faWrap(shown.blurb, w - 30, FA_SMALL); bl.slice(0, 2).forEach((l, j) => faText(l, W / 2, y + 33 + j * 8, '#b8ac94', FA_SMALL, 'center', 0.8));
    fateTxt(shown.txt, W / 2, y + h - 6);
  } else if (V.scene === 'star' && full) faText('Your god is your calling', W / 2, 190, '#8a7e6a', FA_HEAD, 'center', 0.9);
}

// ------------------------------------------------------------------- the god's faces: three masks in a shrine wall
const FA_NICHE_X = [120, 240, 360];
function faShrineWall() {
  return faBake('shrine', function* () {
    const R = faRel(960, 540);
    // ashlar: big dressed blocks, chipped, joints full of black grime
    yield* faPutG(R, 0, 0, 959, 539, (x, y, o) => {
      const row = Math.floor(y / 44), bx = (x + (row & 1) * 46) % 92, by = y % 44, jt = bx < 2 || by < 2, n = faF(x * 0.07, y * 0.07, 400, 4), chip = faF(x * 0.03 + row, y * 0.03, 401, 3);
      o.h = jt ? 0 : 6 + n * 3 - (chip > 0.68 ? 3 : 0) + Math.min(bx, 92 - bx, by, 44 - by, 4) * 0.5; faSet(o, jt ? [10, 8, 10] : faMix([40, 36, 40], [84, 78, 80], n)); o.s = 0.05;
      if (faF(x * 0.02, y * 0.05, 402, 3) > 0.62) faSet(o, faMix([o.r, o.g, o.b], [30, 40, 30], 0.5));
      return true;
    });
    // three niches, pointed, with a sill and a ledge for a candle
    for (const nx of FA_NICHE_X.map(v => v * 2)) {
      yield* faPutG(R, nx - 110, 30, nx + 110, 320, (x, y, o) => {
        const hw = 82, top = 58, sp = 140, dx = Math.abs(x - nx);
        const inArch = y > sp ? dx < hw : Math.hypot(dx + hw * 0.6, y - sp) < hw * 1.6 && y > top;
        const outer = y > sp ? dx < hw + 18 : Math.hypot(dx + hw * 0.6, y - sp) < hw * 1.6 + 18 && y > top - 14;
        if (y > 290 || !outer) return false;
        const n = faF(x * 0.08, y * 0.08, 403, 3);
        if (inArch) { o.h = -24 + n * 4; faSet(o, faMix([12, 10, 12], [30, 26, 28], n)); return true; }
        const d = y > sp ? hw + 18 - dx : hw * 1.6 + 18 - Math.hypot(dx + hw * 0.6, y - sp);
        o.h = 8 + Math.sin(Math.min(1, d / 18) * Math.PI) * 6 + (d > 9 && d < 11 ? -2 : 0); faSet(o, faMix([56, 50, 52], [110, 102, 98], n)); o.s = 0.06; return true;
      });
      faSlab(R, [[nx - 96, 290], [nx + 96, 290], [nx + 104, 304], [nx - 104, 304]], 12, 6, 3, (x, y) => faMix([60, 54, 56], [116, 108, 104], faF(x * 0.1, y * 0.1, 404, 3)), 0.08);
      faBlob(R, nx, 68, 2.5, 2.5, 2, 10, [90, 80, 70], 0.8);   // the nail
    }
    // a lintel carved with a line of skulls over the three
    faSlab(R, [[80, 6], [880, 6], [880, 38], [80, 38]], 8, 6, 4, (x, y) => faMix([50, 46, 48], [100, 94, 90], faF(x * 0.1, y * 0.1, 405, 3)), 0.06);
    for (let i = 0; i < 18; i++) faSkullBoss(R, 110 + i * 44, 22, 0.42);
    const pts = FA_NICHE_X.map(v => ({ x: v * 2, y: 300, z: 60, c: [1.2, 0.72, 0.36], r: 130 }));
    const c = yield* faShadeG(R, { amb: [0.03, 0.03, 0.04], dirs: [{ v: [0, -1, 0.2], c: [0.1, 0.12, 0.14] }], pts, ao: 0.07, aoR: 5, lv: 22 });
    return c;
  });
}
const FA_MASKMAT = {
  tower: { lo: [104, 96, 80], hi: [214, 204, 176], spec: 0.1 },       // dry bone
  wheel: { lo: [56, 12, 18], hi: [150, 64, 62], spec: 0.5 },          // waxen flesh
  lantern: { lo: [70, 72, 80], hi: [176, 180, 188], spec: 1.1 },      // tarnished silver
  hollow: { lo: [140, 134, 124], hi: [220, 214, 200], spec: 0.4 },    // white lacquer on paper
  silence: { lo: [110, 76, 26], hi: [226, 180, 90], spec: 1.2 }       // gilt
};
function faMask(gid, F, lit) {
  return faGet(`mask_${gid}_${F.eyes}_${F.mouth}_${lit ? 1 : 0}`, () => {
    const R = faRel(160, 200), X = 80, Y = 100, M = FA_MASKMAT[gid] || FA_MASKMAT.tower, rgb = FA_GODRGB[gid] || [200, 200, 200];
    const eyeD = (u, v) => ({ l: ((u + 0.38) / 0.2) ** 2 + ((v + 0.12) / 0.11) ** 2, r: ((u - 0.38) / 0.2) ** 2 + ((v + 0.12) / 0.11) ** 2 });
    faPut(R, X - 50, Y - 70, X + 50, Y + 72, (x, y, o) => {
      const v = (y - Y) / 66, wv = 1 - 0.3 * Math.pow(Math.max(0, v), 1.3), u = (x - X) / (44 * wv), d = u * u + v * v; if (d > 1) return false;
      const au = Math.abs(u); let h = Math.sqrt(1 - d) * 22 + faG(v + 0.3, 0.08) * 3 + faG(u, 0.07) * Math.max(0, Math.min(1, (v + 0.15) / 0.45)) * (v < 0.35 ? 5 : 0) + faG(au - 0.55, 0.16) * faG(v - 0.1, 0.1) * 3 - faG(au - 0.5, 0.2) * faG(v - 0.42, 0.14) * 3;
      let c = faMix(M.lo, M.hi, 0.35 + faF(x * 0.1, y * 0.1, 410, 3) * 0.65), e = null, sp = M.spec;
      const E = eyeD(u, v), em = Math.min(E.l, E.r);
      if (F.eyes === 0) { if (em < 1 && Math.abs(v + 0.12) < 0.028) { h -= 5; c = [8, 6, 8]; } }
      else if (F.eyes === 1) { if (em < 1) { h -= 7 * (1 - em); c = faMix([10, 6, 8], rgb, 0.2 * (1 - em)); e = [rgb[0] * 0.5 * (1 - em), rgb[1] * 0.5 * (1 - em), rgb[2] * 0.5 * (1 - em)]; } }
      else if (F.eyes === 2) { if (em < 1) { h += 1.2 * (1 - em); if (Math.abs(v + 0.12) < 0.02 || (Math.abs(v + 0.12) < 0.08 && ((x | 0) % 4 === 0))) { c = [30, 18, 16]; sp = 0; h -= 1; } } }
      else if (F.eyes === 3) { for (let k = 0; k < 7; k++) { const ex = (faHash(k, 1, 411) - 0.5) * 1.1, ey = -0.45 + faHash(k, 2, 411) * 0.55, dd = ((u - ex) / 0.12) ** 2 + ((v - ey) / 0.08) ** 2; if (dd < 1) { h += Math.sqrt(1 - dd) * 2; c = dd < 0.18 ? [14, 6, 8] : [226, 218, 196]; sp = 1.2; } } }
      const mv = v - 0.5;
      if (F.mouth === 0) { const dd = (u / 0.3) ** 2 + (mv / 0.12) ** 2; if (dd < 1) { h -= 6; c = [8, 4, 6]; if (Math.abs(mv) > 0.05 && ((Math.floor((u + 0.3) * 30) & 1) === 0)) { h += 5; c = [216, 206, 180]; sp = 0.5; } } }
      else if (F.mouth === 1) { const dd = (u / 0.05) ** 2 + ((mv + 0.02) / 0.2) ** 2; if (dd < 1) { h -= 5; c = dd < 0.4 ? [40, 2, 6] : [130, 20, 26]; sp = 1.2; } }
      else if (F.mouth === 2) { if (Math.abs(mv - u * u * 0.3) < 0.018 && au < 0.3) { h -= 2.5; c = [16, 10, 10]; } }
      else if (F.mouth === 3) { const dd = (u / 0.14) ** 2 + (mv / 0.1) ** 2; if (dd < 1) { h -= 7 * (1 - dd); c = [6, 4, 8]; } }
      // the god's own marks
      if (gid === 'tower' && Math.abs(u - 0.2 - Math.sin(v * 9) * 0.06) < 0.02 && v < 0.2) { c = [40, 34, 28]; h -= 1; }
      if (gid === 'tower' && Math.abs(u + 0.5 + v * 0.3) < 0.02 && v > 0.1) { c = [40, 34, 28]; h -= 1; }
      if (gid === 'wheel') { for (const sx of [-0.38, 0.38]) if (v > -0.05 && v < 0.2 + faHash(sx * 10 | 0, 3, 412) * 0.6 && Math.abs(u - sx + Math.sin(v * 12) * 0.02) < 0.035) { c = [100, 4, 10]; sp = 1.4; h += 0.8; } }
      if (gid === 'lantern' && v < -0.2) { const lace = Math.abs(Math.sin(x * 0.6) * Math.sin(y * 0.6)) > 0.85 || Math.abs(Math.hypot((x % 10) - 5, (y % 10) - 5) - 3.5) < 0.6; c = lace ? faMix(c, [200, 196, 188], 0.6) : faMix(c, [30, 30, 36], 0.5); sp = lace ? 0.2 : sp; }
      if (gid === 'hollow') { if (Math.abs(v + 0.62) < 0.06 && au < 0.5) c = [180, 40, 30]; if (au > 0.62 && au < 0.72 && v > -0.3 && v < 0.3) c = [170, 36, 28]; if (Math.abs(u) < 0.03 && v < -0.5) c = [170, 36, 28]; }
      if (gid === 'silence') { if (Math.abs(u + 0.15 - v * 0.2 + Math.sin(v * 14) * 0.03) < 0.018 && v < 0.6) { c = [40, 28, 10]; h -= 1; } for (const sx of [-0.38, 0.38]) if (v > 0 && v < 0.9 && Math.abs(u - sx) < 0.03) { c = [150, 176, 190]; sp = 1.5; } }
      h += (faF(x * 0.3, y * 0.3, 413, 2) - 0.5) * (gid === 'tower' ? 1.4 : 0.5);
      o.h = h + 10; faSet(o, c); o.s = sp; if (e) o.e = e; return true;
    });
    if (gid === 'hollow') for (const sd of [-1, 1]) {   // paper streamers, folded in zigzags
      const pts = []; for (let k = 0; k <= 8; k++) pts.push([X + sd * (54 + (k & 1) * 8), Y - 56 + k * 14]);
      faCap(R, pts, 3.2, 3.2, 12, [226, 220, 204], 0.2);
    }
    faCap(R, [[X, Y - 66], [X - 12, Y - 80], [X, Y - 90], [X + 12, Y - 80], [X, Y - 66]], 1, 1, 30, [80, 60, 40], 0.1);   // the cord on its nail
    const L = { amb: [0.06, 0.05, 0.06], pts: [{ x: X, y: 210, z: 170, c: lit ? [1.2, 0.8, 0.46] : [0.8, 0.5, 0.3], r: 200 }], dirs: [{ v: [-0.6, -0.7, 0.5], c: lit ? [0.5, 0.46, 0.44] : [0.22, 0.24, 0.28] }, { v: [0.7, -0.3, 0.2], c: [0.1, 0.16, 0.18] }], ao: 0.08, aoR: 3, lv: 26 };
    return faShade(R, L);
  });
}
function drawFaceScene(full) {
  const V = G.divine, god = FATE.stars.find(q => q.id === V.picks.star), faces = FATE.faces[god.id], rgb = FA_GODRGB[god.id] || [200, 200, 200];
  faDraw(faShrineWall(), 0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter'; glow(240, -20, 220, rgb.join(','), 0.07); ctx.globalCompositeOperation = 'source-over';
  const np = faFrame(200, 16, 'gold'); faDraw(np, 140, 3, 200, 16); faText(god.name, 240, 14.5, '#f0d8a0', FA_HEAD, 'center', 0.9);
  const pages = TAB_SETS[god.cls] || ['', '', ''];
  faces.forEach((F, i) => {
    const cx = FA_NICHE_X[i], cy = 84, hov = full && V.scene === 'face' && inRect(mouse, cx - 48, 30, 96, 170), chosen = V.choice === i, fadeOut = V.choice != null && !chosen;
    if (full && V.scene === 'face') divButton(cx - 48, 30, 96, 170, () => divinePick(i));
    ctx.globalAlpha = fadeOut ? 0.35 : 1;
    if (hov || chosen) { ctx.globalCompositeOperation = 'lighter'; glow(cx, cy, 60, rgb.join(','), 0.14 + 0.05 * Math.sin(G.time * 4)); ctx.globalCompositeOperation = 'source-over'; }
    const sway = Math.sin(G.time * 0.9 + i * 2) * 0.012;
    ctx.save(); ctx.translate(cx, cy - 50); ctx.rotate(sway); faDraw(faMask(god.id, F, hov || chosen), -40, 0, 80, 100); ctx.restore();
    if (F.eyes === 1) { ctx.globalCompositeOperation = 'lighter'; for (const sx of [-8.4, 8.4]) glow(cx + sx, cy - 4, 7, rgb.join(','), (hov || chosen ? 0.6 : 0.3) * (0.8 + 0.2 * Math.sin(G.time * 3))); ctx.globalCompositeOperation = 'source-over'; }
    if (F.mouth === 3) for (let k = 0; k < 6; k++) { const t2 = (G.time * 0.5 + k / 6) % 1; ctx.fillStyle = `rgba(${rgb.join(',')},${0.16 * (1 - t2)})`; ctx.beginPath(); ctx.ellipse(cx + Math.sin(t2 * 6 + k) * 5, cy + 16 - t2 * 40, 2 + t2 * 7, 1.5 + t2 * 3, 0, 0, 6.28); ctx.fill(); }
    faFlame(cx, 144, 0.8, i * 3);
    faText(F.name.replace(/^The /, ''), cx, 166, hov || chosen ? `rgb(${rgb.join(',')})` : '#a89c88', FA_HEAD, 'center', 0.9);
    faText('+1 to ' + pages[i] + ' skills', cx, 176, hov || chosen ? '#e3b25a' : '#6a6058', FA_SMALL, 'center', 0.9);
    if (hov || chosen) fateTxt(F.txt.split(' · ').slice(1).join(' · '), cx, 193, 110);
    ctx.globalAlpha = 1;
  });
}
// ------------------------------------------------------------------- the fear: one candle on the floor, and what it throws on the wall
function faFearRoom() {
  return faBake('fearroom', function* () {
    const R = faRel(960, 540), FL = 336;
    yield* faPutG(R, 0, 0, 959, FL, (x, y, o) => {
      const row = Math.floor(y / 30), bw = 60 + (row % 3) * 8, bx = (x + row * 37) % bw, by = y % 30, jt = bx < 2 || by < 2, n = faF(x * 0.06, y * 0.06, 420, 4), pit = faF(x * 0.2, y * 0.2, 421, 2);
      o.h = jt ? 0 : 5 + n * 5 + Math.min(bx, bw - bx, by, 30 - by, 3) * 0.7 - (pit > 0.7 ? 2 : 0); faSet(o, jt ? [8, 6, 6] : faMix([46, 40, 38], [96, 86, 80], n)); o.s = 0.04;
      if (faF(x * 0.01, y * 0.03, 422, 3) > 0.6 && y > 200) faSet(o, faMix([o.r, o.g, o.b], [20, 16, 14], 0.6));   // soot from a thousand candles
      return true;
    });
    yield* faPutG(R, 0, FL, 959, 539, (x, y, o) => {
      const t = (y - FL) / 168, px2 = (x - 480) / (0.3 + t * 1.5) + 480, rowY = Math.pow(t, 0.7) * 6, jt = Math.abs((px2 / 70) % 1) < 0.04 || (rowY % 1) < 0.08, n = faF(px2 * 0.05, rowY * 3, 423, 3);
      o.h = jt ? 0 : 2 + n * 2; faSet(o, jt ? [8, 6, 6] : faMix([30, 26, 24], [62, 54, 50], n)); o.s = 0.2; return true;
    });
    yield* faPutG(R, 0, FL - 6, 959, FL + 2, (x, y, o) => { o.h = 8; faSet(o, [50, 44, 40]); return true; });   // the skirting
    // the candle, stuck in its own wax on the floor, and a few bones swept against the wall
    yield* faPutG(R, 440, 314, 520, 356, (x, y, o) => { const d = Math.hypot((x - 480) / 36, (y - 342) / 10) + (faF(x * 0.2, y * 0.2, 424, 2) - 0.5) * 0.4; if (d > 1) return false; o.h = 10 + (1 - d) * 3; faSet(o, [110, 98, 76]); o.s = 0.5; return true; });
    faCap(R, [[480, 340], [480, 316]], 5, 5, 14, (x) => faMix([96, 86, 66], [170, 156, 124], Math.max(0, 1 - Math.abs(x - 479) / 5)), 0.3);
    for (const [bx, by, a] of [[160, 330, 0.2], [760, 332, -0.3], [820, 326, 0.9]]) faCap(R, [[bx - Math.cos(a) * 16, by - Math.sin(a) * 4], [bx + Math.cos(a) * 16, by + Math.sin(a) * 4]], 2.4, 2.4, 10, [120, 110, 90], 0.1);
    faSkull(R, 118, 320, 0.7, 425, 1);
    return yield* faShadeG(R, { amb: [0.012, 0.012, 0.016], pts: [{ x: 480, y: 300, z: 40, c: [2.2, 1.3, 0.66], r: 300 }], dirs: [], ao: 0.08, aoR: 4, lv: 24 });
  });
}
function drawFearScene(full) {
  const V = G.divine;
  faDraw(faFearRoom(), 0, 0, W, H);
  const hov = full && V.scene === 'fear' ? V.fears.findIndex((e, i) => inRect(mouse, W / 2 - (3 * 128 + 16) / 2 + i * 136, 188, 128, 20)) : -1;
  const show = V.choice != null ? V.fears[V.choice].id : hov >= 0 ? V.fears[hov].id : null;
  // the shadow on the wall, soft at its edges, shaking with the flame
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, 168); ctx.clip(); try { ctx.filter = 'blur(1.2px)'; } catch (e) { }
  fearShadow(show, 240, 168, 1); ctx.filter = 'none'; ctx.restore();
  const fl = 0.85 + 0.1 * Math.sin(G.time * 13) + 0.05 * Math.sin(G.time * 29);
  ctx.globalCompositeOperation = 'lighter'; glow(240, 150, 170, '255,140,60', 0.07 * fl); ctx.globalCompositeOperation = 'source-over';
  faFlame(240, 157, 1.1, 5);
  if (V.scene === 'fear' && full) {
    const h2 = faChoiceRow(V.fears.map(e => ({ label: e.name, live: true })), 188, 128, 20, 8, i => divinePick(i), FA_HEAD);
    if (h2 >= 0) fateTxt(V.fears[h2].txt, W / 2, 182);
  }
  if (V.choice != null) { faText(V.fears[V.choice].name, W / 2, 186, '#f0dcae', FA_HEAD, 'center'); fateTxt(V.fears[V.choice].txt, W / 2, 198); }
}
// ------------------------------------------------------------------- the doors, far below
const FA_DOOR_X = [110, 240, 370];
function faDoorHall() {
  return faBake('doorhall', function* () {
    const R = faRel(960, 540), FL = 380;
    yield* faPutG(R, 0, 0, 959, FL, (x, y, o) => { const n = faF(x * 0.02, y * 0.03, 430, 5), n2 = faF(x * 0.1, y * 0.1, 431, 3), ridge = 1 - Math.abs(faF(x * 0.015, y * 0.04, 434, 4) * 2 - 1), strata = Math.sin(y * 0.16 + n * 7 + x * 0.01); o.h = ridge * 18 + strata * 3 + n2 * 3 - (Math.abs(strata) < 0.08 ? 3 : 0); faSet(o, faMix([18, 16, 20], [66, 58, 58], ridge * 0.5 + n2 * 0.5), Math.abs(strata) < 0.08 ? 0.5 : 1); o.s = 0.12; return true; });
    yield* faPutG(R, 0, FL, 959, 539, (x, y, o) => { const t = (y - FL) / 160, n = faF(x * 0.03 / (0.4 + t), y * 0.1, 432, 3), step = ((y - FL) % 18) < 2; o.h = step ? 0 : 3 + n * 2; faSet(o, step ? [8, 6, 8] : faMix([28, 24, 26], [60, 54, 54], n)); return true; });
    for (const dx of FA_DOOR_X.map(v => v * 2)) {
      const top = 184, w = 88, h2 = 192, cx = dx;
      // the portal: a carved arch of stone around the door, a skull at the keystone
      yield* faPutG(R, cx - w / 2 - 34, top - w / 2 - 36, cx + w / 2 + 34, top + h2 + 4, (x, y, o) => {
        const ddx = Math.abs(x - cx), r = y < top ? Math.hypot(x - cx, y - top) : ddx, inner = w / 2 + 4, outer = w / 2 + 30;
        if (r < inner || r > outer || y > top + h2) return false;
        const t = (r - inner) / (outer - inner), prof = Math.sin(t * Math.PI * 3) * 3 + Math.sin(t * Math.PI) * 8, blocks = y < top ? Math.abs(((Math.atan2(y - top, x - cx) / Math.PI * 9) % 1 + 1) % 1 - 0.5) > 0.47 : (y % 32) < 1.6;
        o.h = 30 + prof - (blocks ? 3 : 0); faSet(o, faMix([56, 50, 50], [120, 110, 104], faF(x * 0.1, y * 0.1, 433, 3))); o.s = 0.06; return true;
      });
      faSkullBoss(R, cx, top - w / 2 - 18, 0.62);
      yield* faPutG(R, cx - w / 2 - 4, top - w / 2 - 4, cx + w / 2 + 4, top + h2, (x, y, o) => { const r = y < top ? Math.hypot(x - cx, y - top) : Math.abs(x - cx); if (r > w / 2 + 4) return false; o.h = -10; faSet(o, [4, 3, 4]); return true; });
      faSlab(R, [[cx - w / 2 - 36, top + h2], [cx + w / 2 + 36, top + h2], [cx + w / 2 + 40, top + h2 + 10], [cx - w / 2 - 40, top + h2 + 10]], 20, 5, 3, [80, 72, 70], 0.05);   // the threshold
    }
    // sconces between the doors
    for (const sx of [175, 305]) { faCap(R, [[sx * 2, 260], [sx * 2, 236]], 4, 6, 30, [60, 44, 36], 0.6); faBlob(R, sx * 2, 232, 9, 4, 3, 34, [70, 50, 40], 0.8); }
    return yield* faShadeG(R, { amb: [0.02, 0.02, 0.03], pts: [175, 305].map(sx => ({ x: sx * 2, y: 222, z: 40, c: [1.3, 0.8, 0.4], r: 150 })).concat([{ x: 480, y: 540, z: 200, c: [0.3, 0.26, 0.3], r: 400 }]), dirs: [], ao: 0.06, aoR: 5, lv: 22 });
  });
}
function faDoorLeaf() {
  return faGet('doorleaf', () => {
    const w = 88, h2 = 192, top = 44, R = faRel(w, h2 + top), cx = w / 2;
    faPut(R, 0, 0, w - 1, h2 + top - 1, (x, y, o) => {
      const r = y < top ? Math.hypot(x - cx, y - top) : 0; if (r > w / 2) return false;
      const plank = (x % 22) < 1.5, n = faF(x * 0.3, y * 0.04, 440, 3), band = [top + 20, top + h2 - 40].some(b => Math.abs(y - b) < 5), stud = band && (x % 11 > 4 && x % 11 < 7) && Math.abs(y - [top + 20, top + h2 - 40].find(b => Math.abs(y - b) < 5)) < 1.6;
      o.h = plank ? 0 : 4 + n * 2; faSet(o, plank ? [10, 6, 4] : faMix([34, 20, 14], [84, 54, 36], n)); o.s = 0.1;
      if (band) { o.h = 8 + (stud ? 2 : 0); faSet(o, faMix([40, 36, 36], [96, 64, 44], faF(x * 0.2, y * 0.2, 441, 2))); o.s = 0.7; }
      return true;
    });
    faPut(R, cx + 18, top + 94, cx + 34, top + 112, (x, y, o) => { const d = Math.hypot(x - cx - 26, y - top - 102); if (Math.abs(d - 6) > 1.6) return false; o.h = 14; faSet(o, [110, 86, 50]); o.s = 1; return true; });
    return faShade(R, { amb: [0.05, 0.04, 0.05], pts: [{ x: -60, y: 60, z: 60, c: [1.1, 0.7, 0.36], r: 160 }, { x: 150, y: 60, z: 60, c: [1.1, 0.7, 0.36], r: 160 }], dirs: [], ao: 0.06, aoR: 3, lv: 24 });
  });
}
function drawSeekScene(full) {
  const V = G.divine;
  faDraw(faDoorHall(), 0, 0, W, H);
  for (const sx of [175, 305]) faFlame(sx, 113, 1, sx);
  if (!V.dOpen) V.dOpen = [0, 0, 0];
  V.seeks.forEach((e, i) => {
    const cx = FA_DOOR_X[i], top = 92, w = 44, h2 = 96, hov = full && V.scene === 'seek' && inRect(mouse, cx - 32, 50, 64, 150), chosen = V.choice === i, rgb = e.col.match(/\w\w/g).map(v => parseInt(v, 16));
    if (full && V.scene === 'seek') divButton(cx - 32, 50, 64, 150, () => divinePick(i));
    V.dOpen[i] += ((chosen ? 1 : hov ? 0.3 : 0) - V.dOpen[i]) * 0.12;
    const open = V.dOpen[i], x = cx - w / 2;
    ctx.globalAlpha = V.choice != null && !chosen ? 0.45 : 1;
    if (open > 0.01) {
      // what is behind it: its own light, pouring out across the steps
      ctx.save(); ctx.beginPath(); ctx.rect(x, top - w / 2, w, h2 + w / 2); ctx.clip();
      const lg = ctx.createRadialGradient(cx, top + 6, 2, cx, top + 20, h2 * 0.9); lg.addColorStop(0, `rgba(${rgb.map(v => Math.min(255, v + 60)).join(',')},${open})`); lg.addColorStop(0.35, `rgba(${rgb.join(',')},${0.85 * open})`); lg.addColorStop(1, `rgba(${rgb.map(v => v * 0.25 | 0).join(',')},${open})`); ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(cx, top, w / 2, Math.PI, 0); ctx.lineTo(x + w, top + h2); ctx.lineTo(x, top + h2); ctx.fill();
      // a stair beyond, climbing away into the light, and the walls of the passage
      ctx.fillStyle = `rgba(0,0,0,${0.55 * open})`; for (let k = 0; k < 9; k++) { const t = k / 9, sy = top + h2 - Math.pow(t, 0.7) * (h2 - 10), sw = w * (1 - t * 0.8); ctx.fillRect(cx - sw / 2, sy, sw, Math.max(0.5, 2.5 * (1 - t))); }
      ctx.beginPath(); ctx.moveTo(x, top + h2); ctx.lineTo(cx - 4, top + 8); ctx.lineTo(x, top - w / 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + w, top + h2); ctx.lineTo(cx + 4, top + 8); ctx.lineTo(x + w, top - w / 2); ctx.fill();
      ctx.restore();
      ctx.globalCompositeOperation = 'lighter'; glow(cx, top + h2 / 2, 40 + open * 40, rgb.join(','), 0.12 + 0.2 * open);
      ctx.fillStyle = `rgba(${rgb.join(',')},${0.18 * open})`; ctx.beginPath(); ctx.moveTo(x + w * (1 - 0.6 * open), top + h2); ctx.lineTo(x + w, top + h2); ctx.lineTo(cx + w * 1.3, 205); ctx.lineTo(cx - w * 0.3, 205); ctx.fill();
      for (let k = 0; k < 5; k++) { const t2 = (G.time * 0.3 + k / 5) % 1; ctx.fillStyle = `rgba(${rgb.join(',')},${0.4 * open * (1 - t2)})`; ctx.fillRect(cx - w / 2 + ((k * 13) % w), top + h2 - t2 * 60, 0.75, 0.75); }
      ctx.globalCompositeOperation = 'source-over';
    }
    // the leaf swings inward: it narrows toward its hinge
    const dw = w * (1 - 0.62 * open); faDraw(faDoorLeaf(), x, top - w / 2, dw, h2 + w / 2);
    if (hov && !chosen) { ctx.globalCompositeOperation = 'lighter'; glow(cx, top + 40, 30, '255,160,70', 0.1); ctx.globalCompositeOperation = 'source-over'; }
    faText(e.name, cx, 204, hov || chosen ? e.col : '#a89c88', FA_HEAD, 'center', 0.9);
    ctx.globalAlpha = 1;
    if (hov || chosen) fateTxt(e.txt, cx, 34, 125);
  });
}
// the shadow the candle throws on the wall (v0.15), kept as it was
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

// ------------------------------------------------------------------- the chamber, composed each frame
function divRoom() { faDraw(faBake('chamberBG', faChamberBG), 0, 0, W, H); }
function divSeer(pose) {
  const V = G.divine, br = Math.round(Math.sin(G.time * 1.1) * 1.2) / 2, lean = V && (V.scene === 'ask' || V.scene === 'askDone') ? 1 : 0;
  // her breathing: the whole figure rises half a pixel, the head a little more
  ctx.save(); ctx.translate(0, br + lean * 2); faDraw(faSeerLayer(pose || 'rest'), 0, 0, W, H); faDraw(faSeerHeadLayer(), 210, 35, 60, 80); ctx.restore();
  // the empty sockets: a phosphor pinpoint deep in each, and a green light on the bone around them
  const ey = 72 + br + lean * 2, blink = (G.time % 6.3) < 0.1 ? 0.15 : 1, k = (0.75 + 0.25 * Math.sin(G.time * 2.3)) * blink;
  ctx.globalCompositeOperation = 'lighter';
  for (const sx of [-5.8, 5.8]) { glow(240 + sx, ey + 0.5, 4, '90,220,170', 0.07 * k); ctx.fillStyle = `rgba(200,255,225,${0.9 * k})`; ctx.fillRect(240 + sx - 0.25, ey + 0.25, 0.5, 0.5); }
  ctx.globalCompositeOperation = 'source-over';
}
function divHands(x, y, open) { const br = Math.round(Math.sin(G.time * 1.1) * 1.2) / 2; ctx.save(); ctx.translate(0, br * 0.5); faDraw(faHandsLayer(open ? 'open' : 'rest'), 0, 0, W, H); ctx.restore(); }
function divTable() { faDraw(faTableLayer(), 0, 0, W, H); }
function divCandle() { }
function faCandleLight() {
  // the candles' light breathes on everything: a warm flicker over the lower half, strongest at the table
  const fl = 0.5 + 0.3 * Math.sin(G.time * 11) + 0.2 * Math.sin(G.time * 17.3);
  ctx.globalCompositeOperation = 'lighter';
  glow(70, 170, 120, '255,140,60', 0.05 + 0.02 * fl); glow(400, 172, 120, '255,140,60', 0.05 + 0.02 * fl);
  ctx.globalCompositeOperation = 'source-over';
}
function drawDivine() {
  const V = G.divine; V.btn = [];
  const full = V.shown >= (V.lines[V.li] || '').length && V.li >= V.lines.length - 1;
  ctx.fillStyle = '#050406'; ctx.fillRect(0, 0, W, H);
  // if the scene's big layers are not painted yet, paint them a slice at a time behind one candle in the dark
  const need = faNeeds(V.scene);
  if (!faReadyKeys(need)) { faPumpKeys(need, 28); V.fade = 1; faFlame(240, 150, 1.2, 0); divVignette(0); divDialog(); faSkip(); return; }
  if (V.scene === 'star' || V.scene === 'starDone') drawStarScene(full);
  else if (['face', 'faceDone', 'fear', 'fearDone', 'seek', 'seekDone'].includes(V.scene)) { /* drawn below */ }
  else {
    const open = V.scene === 'end';
    divRoom(); divSeer(open ? 'open' : 'rest'); divTable();
    if (V.scene === 'intro' || V.scene === 'end' || V.scene === 'ask' || V.scene === 'askDone' || V.scene === 'sac' || V.scene === 'sacDone') divHands(240, 170, open);
    faCandleFlames(); faCandleLight();
    if (V.scene === 'cards' || V.scene === 'cardsDone') drawCardSpread(full);
    if (V.scene === 'cardRev' || V.scene === 'cardRevDone') drawCardRev(full);
    if (V.scene === 'bones' || V.scene === 'bonesDone') drawBoneThrow(full);
    if (V.scene === 'sac' || V.scene === 'sacDone') drawSacrifice(full);
    if (V.scene === 'ask' || V.scene === 'askDone') drawQuestionScene(full);
  }
  if (V.scene === 'face' || V.scene === 'faceDone') drawFaceScene(full);
  if (V.scene === 'fear' || V.scene === 'fearDone') drawFearScene(full);
  if (V.scene === 'seek' || V.scene === 'seekDone') drawSeekScene(full);
  divVignette(V.fade);
  divDialog();
  faSkip();
}
function drawCardSpread(full) {
  const V = G.divine;
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
    if (fk > 0.9) fateTxt(e.txt, W / 2, 206, 0, show !== V.choice);
  }
  if (V.choice == null && full) faPrompt('Draw a card', 110);
}
// ------------------------------------------------------------------- painting ahead of time
// Every layer the reading will need, in the order it will need them. They are painted a few milliseconds at a
// time while the title screen is up (and in the reading's pauses), so no scene has to stop to paint itself.
let FA_PREBAKE = [];
function faRegister() {
  FA.reg = [];
  try {
    faFrame(W - 28, 54, 'panel'); faFrame(86, 14, 'gold'); divRoomKey(); faSeerLayer('rest'); faSeerHeadLayer(); faTableLayer(); faHandsLayer('rest');
    faSky(); for (const g of ['tower', 'wheel', 'lantern', 'hollow', 'silence']) faGhost(g); faFrame(W - 112, 56, 'panel');
    faShrineWall(); faFrame(200, 16, 'gold');
    faCardBack(); for (let g = 0; g < 8; g++) faCardFace(g); faFrame(150, 44, 'panel'); faFrame(150, 44, 'hot');
    faBoneSprite(); faMat(); faFrame(128, 30, 'panel'); faFrame(128, 30, 'hot');
    faFearRoom(); faFrame(128, 20, 'panel'); faFrame(128, 20, 'hot'); faFrame(128, 20, 'gold');
    faDoorHall(); faDoorLeaf();
    faFrame(132, 34, 'panel'); faFrame(132, 34, 'hot'); faBasin(); faFrame(128, 38, 'panel'); faFrame(128, 38, 'hot'); faSeerLayer('open'); faHandsLayer('open');
  } finally { FA_PREBAKE = FA.reg; FA.reg = null; }
}
function faNeeds(sc) {
  if (sc === 'star' || sc === 'starDone') return ['sky'];
  if (sc === 'face' || sc === 'faceDone') return ['shrine'];
  if (sc === 'fear' || sc === 'fearDone') return ['fearroom'];
  if (sc === 'seek' || sc === 'seekDone') return ['doorhall', 'doorleaf'];
  return ['chamberBG', 'seer_rest', 'seerhead', 'table', 'hands_rest'];
}
function faReadyKeys(keys) { return keys.every(k => FA.c[k]); }
function faPumpKeys(keys, budget) {
  if (!FA_PREBAKE.length) faRegister();
  const t0 = performance.now();
  for (const key of keys) {
    if (FA.c[key]) continue; const e = FA_PREBAKE.find(q => q[0] === key); if (!e) continue;
    const j = FA.jobs[key] || (FA.jobs[key] = e[1]());
    while (performance.now() - t0 < budget) { const r = j.next(); if (r.done) { FA.c[key] = r.value; delete FA.jobs[key]; break; } }
    if (performance.now() - t0 >= budget) return;
  }
}
function divRoomKey() { return faBake('chamberBG', faChamberBG); }
(function faIdle() {
  let started = false;
  const tick = () => {
    try {
      if (!started) { faRegister(); started = true; }
      if (!G.running && faPump(G.divine ? 4 : 7)) return;
    } catch (e) { return; }
    setTimeout(tick, 20);
  };
  setTimeout(tick, 600);
})();
