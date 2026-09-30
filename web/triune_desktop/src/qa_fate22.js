
// =================================================================== v0.22: a gentler, longer reading
// More to choose from, one more rite (the Seer's Question, spoken rather than drawn), and every gain and loss
// trimmed so no single choice swings a character hard: gains are about three quarters of what they were, losses
// about half, with a firm ceiling on any loss. The descriptions are rebuilt from the numbers.
FATE.cards.push(
  { id: 'bell', name: 'The Drowned Bell', fx: { res: 5, frw: -3 }, txt: '', rev: { fx: { frw: 5, res: -4 }, txt: '', say: 'The bell reversed rings upward, out of the water. You will hurry toward the surface all your life.' }, say: 'It still rings under the fen. Everyone who hears it goes a little slower, a little safer.' },
  { id: 'tooth', name: 'The Milk Tooth', fx: { lok: 2, armor: -4 }, txt: '', rev: { fx: { armor: 8, lok: -1 }, txt: '', say: 'The tooth kept, not lost. You will hold on to things. Things will hold on to you.' }, say: 'The first thing you ever gave up. You got a coin for it. You have been selling pieces of yourself since.' },
  { id: 'kiln', name: 'The Kiln', fx: { dmg: 5, hpPct: -4 }, txt: '', rev: { fx: { hpPct: 6, dmg: -3 }, txt: '', say: 'The kiln gone cold. Whatever was inside hardened slowly. It will not crack.' }, say: 'What goes in soft comes out hard, or does not come out.' },
  { id: 'loom', name: 'The Unravelling Loom', fx: { xp: 6, stam: -8 }, txt: '', rev: { fx: { stam: 12, xp: -4 }, txt: '', say: 'The loom turned over weaves tighter. Slower, but it holds together under blows.' }, say: 'Someone is weaving you and someone is pulling the thread out, and they are working at the same speed.' }
);
FATE.bones.push(
  { id: 'wheel', see: 'A wheel with one spoke missing', fx: { fcr: 6, armor: -4 }, txt: '', say: 'The Wheel, and a gap in it. Something is going to fall through that gap. Let us hope it is not you.' },
  { id: 'rope', see: 'A knotted rope', fx: { stam: 12, dmg: -2 }, txt: '', say: 'A rope. For climbing, or for the other thing. You will need your strength either way.' },
  { id: 'moon', see: 'A moon split by a crack', fx: { mf: 8, res: -3 }, txt: '', say: 'The cracked moon. Light spills out of it on the nights things are found.' },
  { id: 'spine', see: 'A spine, curled like a sleeper', fx: { con: 3, frw: -3 }, txt: '', say: 'A spine curled up asleep. It will wake in you when you are struck. It will not let you fall.' }
);
FATE.fears.push(
  { id: 'bells', name: 'Bells', fx: { frw: 5, res: -3 }, txt: '', say: 'Bells. Yes. There is one in the ash that walks. You will know it by its ringing. Run sideways.' },
  { id: 'hands', name: 'Hands in the dark', fx: { armor: 8, fcr: -3 }, txt: '', say: 'Hands. They run on their fingers out there. Keep your back to a wall and they cannot come around you.' },
  { id: 'silence', name: 'Silence', fx: { spi: 3, hpPct: -3 }, txt: '', say: 'Silence. Then you fear the right thing. The only thing. Most never learn to.' }
);
FATE.seeks.push(
  { id: 'faith', name: 'A god who answers', fx: { res: 6, gold: -8 }, txt: '', col: '#e8d8a0', say: 'A god who answers. Oh, they answer. That is the whole trouble with them.' },
  { id: 'kin', name: 'Your kin', fx: { hpPct: 6, mf: -5 }, txt: '', col: '#c9a66b', say: 'Your kin. The Tithed scatter like seed. Some of them took root in very strange places.' },
  { id: 'end', name: 'The end of all of it', fx: { dmg: 5, xp: -4 }, txt: '', col: '#4a4454', say: 'The end. You would hand the world to the Void? Then you had better be strong enough to carry it there.' }
);
FATE.sacrifices.push(
  { id: 'taste', give: 'Your sense of taste', fx: { lok: 2, xp: -3 }, txt: '', say: 'Taste. You will eat ash and marrow and not mind it. Good. That is most of what there is.' },
  { id: 'song', give: 'The last song you knew', fx: { fcr: 6, spi: -2 }, txt: '', say: 'The song. I will hum it sometimes. You will not recognise it.' },
  { id: 'fear', give: 'Your fear of heights', fx: { frw: 6, armor: -5 }, txt: '', say: 'You will not fear falling. You will fall a great deal, and you will get up faster for it.' }
);
// the Seer's Question: one of these is asked, three answers, each a small gain and a small loss
FATE.questions = [
  { q: ['When you woke in the ash, something was in your hand.', 'What was it?'], a: [
    { id: 'stone', ans: 'A stone', fx: { armor: 8, frw: -3 }, say: 'A stone. You held on to the world before you knew what it was. It will hold on to you.' },
    { id: 'nothing', ans: 'Nothing', fx: { frw: 5, res: -3 }, say: 'Nothing. Empty hands run faster. They catch less, too.' },
    { id: 'hand', ans: 'Another hand', fx: { lok: 2, gold: -6 }, say: 'Another hand. Cold? It was cold. You have been holding the dead ever since.' }] },
  { q: ['There is a voice in the Drowned Fen that speaks to travellers.', 'When you passed, what did it say?'], a: [
    { id: 'myname', ans: 'My name', fx: { xp: 5, mf: -4 }, say: 'Your name. So it knows you. Learn quickly, before it learns the rest.' },
    { id: 'babble', ans: 'Nothing I understood', fx: { res: 6, dmg: -3 }, say: 'Nothing you understood. A mercy. Understanding is how it gets in.' },
    { id: 'yours', ans: 'Your name', fx: { mf: 8, hpPct: -4 }, say: 'My name? ...Then it is looking for me through you. Find it pretty things, little messenger.' }] },
  { q: ['Everyone here was buried once. The god made sure of that.', 'Who buried you?'], a: [
    { id: 'mother', ans: 'My mother', fx: { hpPct: 6, fcr: -3 }, say: 'Your mother. She buried you gently. You will be hard to kill because of it.' },
    { id: 'stranger', ans: 'A stranger', fx: { gold: 10, xp: -3 }, say: 'A stranger, who took your boots for the trouble. You will learn to take boots too.' },
    { id: 'self', ans: 'No one. I dug myself out', fx: { con: 3, spi: -2 }, say: 'You dug yourself out. Your hands remember the dirt. Your spirit remembers less.' }] },
  { q: ['Suppose you find it. The dead god. Whatever is left of its heart.', 'What will you do?'], a: [
    { id: 'bury', ans: 'Bury it', fx: { res: 6, dmg: -3 }, say: 'Bury a world. It would take a very long time. You have that, perhaps.' },
    { id: 'eat', ans: 'Eat it', fx: { lok: 2, res: -3 }, say: 'Eat it! Ha. Many have tried. The god is patient with its eaters. It becomes them.' },
    { id: 'wake', ans: 'Wake it', fx: { spi: 3, vit: -2 }, say: 'Wake it. Then the Void comes for you first. Remember I warned you.' }] },
  { q: ['The lanterns call you back each time you fall.', 'Why do you think they want you?'], a: [
    { id: 'kind', ans: 'Because they are kind', fx: { hpPct: 5, mf: -4 }, say: 'Kind. Yes. Hold on to that one. Hold on hard.' },
    { id: 'use', ans: 'Because I am useful', fx: { dmg: 4, hpPct: -3 }, say: 'Useful. A tool that knows it is a tool. That is almost a person.' },
    { id: 'hungry', ans: 'Because they are hungry', fx: { gold: 8, res: -3 }, say: 'Hungry. Now you are thinking like one of us.' }] }
];
// the Seer talks between rites now, too: a line of her own before some of the choices
FATE.asides = {
  bones: ['Your hands are shaking. Good. Still hands lie.', 'The bones were a child\'s once. Everything here was something else once.'],
  fear: ['You flinched. Where the Tithed walk, flinching keeps you alive. Fools call it cowardice.', 'I will not laugh at what you fear. I fear things too. Worse things.'],
  seek: ['Some go down for gold, some for gods. The god does not care why. It eats both.', 'You want something. It is written all over you, in a hand I do not like.'],
  sac: ['We are nearly done. This is the part that hurts.', 'Do not look away from the knife. It is rude.']
};
const FATE_LAB = { con: ' Constitution', vit: ' Vitality', spi: ' Essence', stam: ' poise', lok: ' life after each kill', mf: '% magic find', hpPct: '% life', dmg: '% skill damage', fcr: '% faster cast rate', gold: '% gold found', res: '% magic resist', frw: '% faster movement', armor: ' armor', xp: '% experience', regen: '% faster wisp regrowth' };
const FATE_CAP = { con: 2, vit: 2, spi: 2, stam: 8, lok: 1, armor: 6, mf: 6, hpPct: 5, dmg: 4, fcr: 5, gold: 8, res: 5, frw: 4, xp: 4, regen: 6 };
function fateSoften(fx) {
  const out = {};
  for (const k in fx) {
    const v = fx[k]; if (/^skt/.test(k)) { out[k] = v; continue; }
    let n = v > 0 ? Math.max(1, Math.round(v * 0.75)) : -Math.max(1, Math.min(FATE_CAP[k] || 5, Math.round(-v * 0.5)));
    out[k] = n;
  }
  return out;
}
function fateTxtOf(fx, old) {
  const parts = [], keep = old ? old.split(' · ').filter(t => /skills/.test(t)) : [];
  parts.push(...keep);
  const pos = Object.keys(fx).filter(k => fx[k] > 0 && !/^skt/.test(k)), neg = Object.keys(fx).filter(k => fx[k] < 0);
  if (['vit', 'spi', 'con'].every(k => fx[k] > 0 && fx[k] === fx.vit)) { parts.push(`+${fx.vit} to all attributes`); pos.splice(0, pos.length, ...pos.filter(k => !['vit', 'spi', 'con'].includes(k))); }
  for (const k of pos) parts.push(`+${fx[k]}${FATE_LAB[k] || ' ' + k}`);
  for (const k of neg) parts.push(`${fx[k]}${FATE_LAB[k] || ' ' + k}`);
  return parts.join(' · ');
}
(function softenAll() {
  const fix = e => { e.fx = fateSoften(e.fx); e.txt = fateTxtOf(e.fx, e.txt); if (e.rev) { e.rev.fx = fateSoften(e.rev.fx); e.rev.txt = fateTxtOf(e.rev.fx, e.rev.txt); } };
  for (const L of [FATE.cards, FATE.bones, FATE.stars, FATE.sacrifices, FATE.fears, FATE.seeks]) L.forEach(fix);
  for (const g in FATE.faces) FATE.faces[g].forEach(fix);
  for (const q of FATE.questions) q.a.forEach(fix);
})();
function fateAnswer(F) { if (!F || !F.ask) return null; for (const q of FATE.questions) { const a = q.a.find(x => x.id === F.ask); if (a) return a; } return null; }
// v0.36: the gods are named for the dead god's faces now (the display only: ids, classes and numbers are as they were).
// Run when a reading begins or a fate is listed, after every file (the Kusho's star is added by zw_monk.js) is loaded.
const FATE_LORE36 = {
  tower: { name: 'The Bearing Mother', sub: 'the bone of the god', clsName: 'Ossuarch', blurb: 'Bone: the raised dead, the Colossus, bone spells, heavy blows', say: 'The Bearing Mother. She was the god\'s bone, the frame it stood on and the cradle it bore. She held your cradle the way a grave holds a coffin. You will stand. You will not bend. You will break.' },
  wheel: { name: 'The Weeping Maiden', sub: 'the flesh of the god', clsName: 'Hemomancer', blurb: 'Blood: a brood of spawn, bleeding, mutations; every spell costs life', say: 'The Weeping Maiden. The god\'s flesh, still weeping from every wound it took in dying, still growing with no mind to stop it. She drinks what spills. You will live long enough to regret it.' },
  lantern: { name: 'The Veiled Crone', sub: 'the soul of the god', clsName: 'Hollow Mystic', blurb: 'Soul: wisps, the iron golem, soul-wire and spirit magic', say: 'The Veiled Crone. The god\'s soul, threaded through everything it left behind, and she lifts her veil for no one. She leaned close to your cradle and listened. Little moth. Little moth.' },
  hollow: { name: 'The Last Breath', sub: 'what the god never let go', clsName: 'Shrine Keeper', blurb: 'The breath-keepers: miasma drawn out of the world and turned on its makers, claws, traps, killing blows', say: 'The Last Breath. The god died breathing out, and never finished. It hangs in every stone and river and bell, and it is going sour. Your order keeps it in bronze. You will draw the rot out of the world, hold it in yourself, and give it back to what made it.' },
  silence: { name: 'The Void That Emanates', sub: 'what is not there', clsName: 'The Empty Hand', say: 'The Void That Emanates. ... No. I will not look into that one. See: the candle flames lean away from it. It is not a god that looked down on you. It is the hole the god is lying in, and it was smiling.' }
};
function fateLore36() { for (const s of FATE.stars) if (FATE_LORE36[s.id] && !s.lore36) Object.assign(s, FATE_LORE36[s.id], { lore36: true }); }
// the Question scene: the Seer leans in over the table, three spoken answers on iron plates
function drawQuestionScene(full) {
  const V = G.divine, Q = FATE.questions[V.qi];
  if (V.scene !== 'ask' || !full) { if (V.scene === 'askDone' && V.choice != null) { const a = Q.a[V.choice]; faText(`"${a.ans}"`, W / 2, 150, '#f0dcae', FA_HEAD, 'center'); fateTxt(a.txt, W / 2, 162); } return; }
  faPrompt('Answer her', 118);
  const hov = faChoiceRow(Q.a.map(a => ({ label: `"${a.ans}"`, live: true })), 126, 132, 34, 8, i => divinePick(i), FA_HEAD);
  if (hov >= 0) fateTxt(Q.a[hov].txt, W / 2, 172);
}
