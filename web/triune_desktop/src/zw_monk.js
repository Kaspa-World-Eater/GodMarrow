// =================================================================== v0.25: THE KŪSHŌ (code id 'monk'), the Silence's class
// Empty Laughter: the last ascetic of the Gilded Peak, who broke his fast on the altar and grew dense with a thousand
// years of stagnant holiness. Three trees: Radiance (光明, stronger by day), Absence (無, stronger by night) and
// Destroyer (不動, stone and blunt force, untouched by the sky). He turns the sky himself (Hand-That-Turns-The-Sky).
// Weight (重) is a balance gauge beside his Essence. It starts in the middle (50) and follows what he does: heavy
// actions (standing his ground, slams, rooting, blocking, the heavy skills) push it up; light ones (moving, rolling,
// leaping, quick strikes, the light skills) push it down. Heavy: slower on his feet, far bigger hits, blows barely
// move him. Light: fast feet, quick hands, afterimages. At 100 he has PERFECT POISE: no stagger, no knockback, no slows, +8% damage. His kills leave
// no corpse: glass, dust, rubble or red mist, never a body (Ur-Nihl's servants leave nothing to raise).
// Everything the class needs is in this file and zw_monk_ui.js; the shared files only call in through a few hooks
// (wrapped functions below, and a handful of one-line branches in e_ui.js and q_fate.js).
Object.assign(G, { skyForce: null, kglass: [], kcones: [], kfists: [], kofuda: [], ktears: [], kgeysers: [], kbell: null, kbeams: [], kclaps: [], kshades: [], khands: [], kroots: [], kwaves: [], kspikes: [], kstepQ: [], kpagodas: [], kbuddha: null, kbuddhaMem: null, kthousand: null, kflurry: null, kpalm: null, kslams: [], kflash: null, kmarks: [] });
Object.assign(P, { weight: 50, kpoise: false, kghost: [], kposeId: null, kposeT: 0, kstillT: 0, kghostT: 0, kstepPh: -1, kKillT: 9, kMultiT: 0, kamber: false, kamberT: 0, kwalk: false, kwalkT: 0, klotus: null, keye: null, kleap: null, kobsid: 0, kmirror: 0, knothing: 0, ksun: 0, ksunT: 0, kbowl: 0, klaughT: 3, kskyCd: 0, khalo: 0, khaloT: 0, kcd: {}, kbarHold: false, kfaultN: 0 });
function isMonk() { return P.cls === 'monk'; }
const MONK_TAB = ['Radiance', 'Absence', 'Destroyer'];
TAB_SETS.monk = MONK_TAB;

// ------------------------------------------------------------------- the skills (data)
// tab 0 Radiance · 1 Absence · 2 Destroyer. Capstones (row 5) carry a stat-gated perk, like the other classes' masteries.
const MONK_SK = {
  // ---------------- RADIANCE 光明 Kōmyō: a tyrannical purity that burns away everything imperfect
  kdawn: { name: 'Hand-That-Opens-Noon', jp: 'Shōgo-no-te', tab: 0, r: 0, c: 0, kind: 'cast', mana: 12, desc: 'The class skill (shares its cooldown with Hand-That-Closes-The-Sun). Raise your palm and force a blinding noon for 20 s. Radiance peaks; night creatures are dazzled; ghosts and Gasps are dragged into the open. Underground it lasts half as long and costs half.',
    perks: [{ l: 5, v: 'kdawn2', name: 'Long Noon', desc: 'The false noon lasts 8 s longer.' }, { l: 10, v: 'kdawn3', name: 'White Glare', desc: 'Everything the glare dazzles also burns.' }] },
  kamber: { name: 'Amber-That-Eats-Itself', jp: 'Hōshoku', tab: 0, r: 0, c: 1, kind: 'cast', mana: 6, desc: 'Toggle: an aura of amber-white fire sears everything near you. While it burns it sets you on fire: it eats your Weight (a light skill) and a little of your life every second.',
    perks: [{ l: 5, v: 'kash', name: 'Ash-For-Breakfast', desc: 'Enemies the aura kills give back 3% of your life.' }, { l: 10, v: 'kamberw', name: 'Wide Amber', desc: 'The aura reaches a yard farther.', stat: ['spi', 50] }] },
  khands: { name: 'Hundred-Hands-Of-Morning', jp: 'Hyaku-te', tab: 0, r: 0, c: 2, kind: 'cast', mana: 8, desc: 'A light, quick melee flurry (-14 Weight): one hundred open palms in 1.5 s into the enemy nearest the cursor, each burning it, ending with a shove that throws it back.',
    perks: [{ l: 5, v: 'khshove', name: 'Last Palm', desc: 'The final shove stuns for 1.5 s and throws twice as far.' }] },
  klaugh: { name: 'Laughter-Without-Warmth', jp: 'Musōshō', tab: 0, r: 1, c: 0, pre: 'kdawn', kind: 'passive', desc: 'Every few seconds your belly laughs: a pulse of white radiation that burns everything near and strips wards: shield-guards drop, parries break, the Silent Ones\' darkness lifts. Heavy, you laugh more often; light, it sputters. Each laugh settles 2 Weight into your belly.',
    perks: [{ l: 5, v: 'klaughw', name: 'Belly Of The Bell', desc: 'The laugh reaches 25% farther.' }] },
  kstar: { name: 'Morning-Star-Exhaled', jp: 'Myōjō-iki', tab: 0, r: 1, c: 1, pre: 'kamber', kind: 'cast', mana: 10, desc: 'A deep, jolly breath, then a cone of radiant fire that sweeps the arc of your aim. Half again as strong against the raised dead.',
    perks: [{ l: 5, v: 'kstarun', name: 'Dawn On The Grave', desc: 'The raised dead it touches keep burning.' }] },
  kfist: { name: 'Fist-Of-High-Noon', jp: 'Shōgo-ken', tab: 0, r: 2, c: 2, pre: 'khands', kind: 'cast', mana: 16, desc: 'Raise one golden hand: a colossal fist of light slams down from the sky on the cursor. Huge damage to the one beneath it, then a ring of holy fire.',
    perks: [{ l: 5, v: 'kfring', name: 'Noon Ring', desc: 'The ring of fire is a yard wider and sets what it touches alight.' }] },
  ksutra: { name: 'Sutra-That-Seeks', jp: 'Tsuishū-kyō', tab: 0, r: 2, c: 0, pre: 'klaugh', kind: 'cast', mana: 6, desc: 'A halo of burning ofuda floats behind your head. Cast to loose it: each talisman peels off, seeks an enemy near the cursor and bursts. The halo regrows over time.',
    perks: [{ l: 5, v: 'ksmore', name: 'Long Sutra', desc: 'Two more talismans in the halo.' }] },
  ktears: { name: 'Tears-For-The-Living', jp: 'Aware-no-namida', tab: 0, r: 3, c: 0, pre: 'ksutra', kind: 'cast', mana: 12, desc: 'Weep in mock sorrow. Glowing tears fall around you and lie as flame-mines; each erupts as a geyser of white fire when something steps on it.',
    perks: [{ l: 5, v: 'ktmore', name: 'Inconsolable', desc: 'Three more tears.' }] },
  keye: { name: 'Eye-Between-The-Brows', jp: 'Byakugō', tab: 0, r: 3, c: 1, pre: 'kstar', kind: 'hold', mana: 4, desc: 'Hold: the third eye opens and fires a thin phosphor-white beam from your forehead. Move the cursor to sweep it. It cuts through everything in its line, armour and bone, and through the ruins\' pillars too.',
    perks: [{ l: 5, v: 'keyecut', name: 'Armour Like Paper', desc: 'What the beam touches loses a third of its armour for 4 s.' }] },
  kbell: { name: 'Bell-Of-One-Syllable', jp: 'Ichion-shō', tab: 0, r: 3, c: 2, pre: 'kfist', kind: 'cast', mana: 18, desc: 'Chant one deafening syllable (a heavy, blocking stance: +12 Weight): a bell of bronze light drops over you. It stops missiles, and every blow struck on it from outside rings a blinding wave that burns and dazzles.',
    perks: [{ l: 5, v: 'kbloud', name: 'Great Bell', desc: 'Its waves stun for 1.5 s.' }] },
  klotus: { name: 'Lotus-Without-Mercy', jp: 'Muji-renge', tab: 0, r: 4, c: 1, pre: 'keye', kind: 'hold', mana: 5, desc: 'Hold: sit cross-legged in the air, eyes shut. A vortex of solid light grows around you every second, shredding anything inside. You cannot move, and nothing can shake you.',
    perks: [{ l: 5, v: 'klpull', name: 'Drawn To The Flame', desc: 'The vortex drags enemies inward.' }] },
  ksun: { name: 'He-Who-Hangs-As-The-Sun', jp: 'Gisō-no-hi', tab: 0, r: 5, c: 1, pre: 'klotus', kind: 'cast', mana: 40, desc: 'Laugh, rise into the air and become a small sun for 10 s. No blow can reach you, and amber beams track and melt every enemy in your gaze. Once every 30 s.',
    perks: [{ l: 1, v: 'ksunlong', name: 'The Long Day', desc: 'You hang in the sky 4 s longer, and your beams strike one more enemy.', stat: ['spi', 75] }] },
  // ---------------- ABSENCE 無 Mu: the space where life used to be
  keclipse: { name: 'Hand-That-Closes-The-Sun', jp: 'Nisshoku-no-te', tab: 1, r: 0, c: 0, kind: 'cast', mana: 12, desc: 'The class skill (shares its cooldown with Hand-That-Opens-Noon). Close your hand over the sun and force night for 20 s. Every light but your own gutters; Absence peaks; enemies lose sight of you beyond 6 yd. Underground it lasts half as long and costs half.',
    perks: [{ l: 5, v: 'kecl2', name: 'Long Night', desc: 'The false night lasts 8 s longer.' }, { l: 10, v: 'kecl3', name: 'Blind Dark', desc: 'Enemies lose you beyond 4 yd instead.' }] },
  kpalm: { name: 'Palm-That-Is-Hungry', jp: 'Gaki-te', tab: 1, r: 0, c: 1, kind: 'cast', mana: 10, desc: 'Open one palm into a black hole. For a second it drags every enemy within 7 yd across the field toward you, tearing at them as they come.',
    perks: [{ l: 5, v: 'kpalmw', name: 'Bottomless', desc: 'It reaches 10 yd.' }] },
  kclap: { name: 'Clap-That-Ends-Speech', jp: 'Mugon-hakushu', tab: 1, r: 0, c: 2, kind: 'cast', mana: 8, desc: 'One enormous clap: a ring of negative pressure. Everything near is stunned for a moment, and every wind-up is broken off: the blow never lands.',
    perks: [{ l: 5, v: 'kclapw', name: 'Thunder Of Nothing', desc: 'The ring is 1.5 yd wider and stuns twice as long.' }] },
  kbowl: { name: 'Bowl-That-Holds-Nothing', jp: 'Kūhachi', tab: 1, r: 1, c: 0, pre: 'keclipse', kind: 'cast', mana: 0, desc: 'You carry a wooden alms bowl. Missiles and spells that strike you from the front can fall into it instead (the chance grows with level). When it is full you drink: Weight and life. Cast to drink what is in it now.',
    perks: [{ l: 5, v: 'kbowlw', name: 'Beggar Of All Sides', desc: 'The bowl catches missiles from every side.' }] },
  kspade: { name: 'Spade-That-Cuts-Shadows', jp: 'Kagegari', tab: 1, r: 1, c: 1, pre: 'kpalm', kind: 'cast', mana: 7, desc: 'A wide arc of the spade (or staff, or fist) that hooks enemies\' shadows and tears them loose. A shadowless enemy is rooted to the spot and bleeds spirit. It only works on the lit: torchlight matters. Best with a spade.',
    perks: [{ l: 5, v: 'kspadew', name: 'Grave-Light', desc: 'It tears the shadows of the unlit too, for half as long.' }] },
  kpinch: { name: 'Pinch-That-Cuts-The-Strings', jp: 'Ito-kiri', tab: 1, r: 1, c: 2, pre: 'kclap', kind: 'cast', mana: 7, desc: 'A precise pinch at the enemy nearest the cursor. Lesser raised things (Husks, Weepers, the Ossuary\'s dead) collapse to dust at once. The living are silenced and drained: they cannot strike for 3 s and hit weakly for 6.',
    perks: [{ l: 5, v: 'kpinchx', name: 'All Strings', desc: 'Champions of the raised dead collapse too.' }] },
  kbelow: { name: 'Hand-From-Below', jp: 'Soko-no-te', tab: 1, r: 2, c: 1, pre: 'kspade', kind: 'cast', mana: 14, desc: 'A colossal, many-jointed hand of shadow erupts under the strongest enemy near the cursor. It grips it, holds it and slowly crushes it. Bosses are held for a moment only.',
    perks: [{ l: 8, v: 'kbelow2', name: 'Two Hands', desc: 'A second hand grips the next strongest enemy nearby.' }] },
  kspit: { name: 'Spit-For-The-Starving', jp: 'Gaki-mizu', tab: 1, r: 2, c: 2, pre: 'kpinch', kind: 'cast', mana: 12, desc: 'Spit in the dirt at the cursor. Black roots of the starved dead burst up under your enemies: they entangle them and siphon their blood to you.',
    perks: [{ l: 5, v: 'kspitw', name: 'Famine Field', desc: 'The roots spread half again as wide.' }] },
  kwalk: { name: 'Walks-Without-Feet', jp: 'Gaki-aruki', tab: 1, r: 3, c: 0, pre: 'kbowl', kind: 'cast', mana: 6, desc: 'Toggle: float an inch above the ground, your gold turned to pitch. Rhythmic waves of shadow wither everything around you. Mud and water no longer slow you. Drains Essence while it lasts.',
    perks: [{ l: 5, v: 'kwalkw', name: 'Hungry Ground', desc: 'The waves also slow what they wither.' }] },
  kmirror: { name: 'Mirror-With-No-Face', jp: 'Mumen-kyō', tab: 1, r: 3, c: 2, pre: 'kspit', kind: 'cast', mana: 10, desc: 'A short stance: your silks go abyss-black. Any melee blow that lands is swallowed, and a shadow-copy of the attacker strikes it back at double force.',
    perks: [{ l: 5, v: 'kmirror2', name: 'Deep Mirror', desc: 'Reflected blows strike at triple force.' }] },
  knothing: { name: 'One-With-Nothing', jp: 'Mui-ichinyo', tab: 1, r: 5, c: 1, pre: 'kbelow', kind: 'cast', mana: 35, desc: 'For 8 s you do not exist: nothing can strike or see you, and the world drains to grey. Everything you pass near is marked. When you return, every mark collapses inward at once. Once every 30 s.',
    perks: [{ l: 1, v: 'knoth2', name: 'Returned Whole', desc: 'Each collapsing mark gives back 2% of your life.', stat: ['spi', 75] }] },
  // ---------------- DESTROYER 不動 Fudō: the Immovable. Stone, gravity and blunt force
  kbar: { name: 'That-Which-Bars-The-Way', jp: 'Fudō-shin', tab: 2, r: 0, c: 0, kind: 'passive', desc: 'Your body is a fortress: blows lose much of their force on you and no longer push you. Standing in a doorway or a narrow pass, you close it: nothing smaller than a Bellwether can press past you. Standing your ground is a heavy action: it fills your Weight.',
    perks: [{ l: 5, v: 'kbarthorn', name: 'Stone Thorns', desc: 'Enemies that strike you in melee take a fifth of the blow back.' }] },
  kgrip: { name: 'Grip-Of-Old-Stone', jp: 'Sekka-te', tab: 2, r: 0, c: 1, kind: 'cast', mana: 8, desc: 'Grasp the enemy nearest the cursor with ash-coated hands: it calcifies into weeping stone and cannot move. Your next blow on it shatters it into rubble for great damage. No corpse.',
    perks: [{ l: 5, v: 'kgrip2', name: 'Spreading Stone', desc: 'The stone creeps into one more enemy beside it.' }] },
  kfinger: { name: 'One-Finger-Truth', jp: 'Ippon-shi', tab: 2, r: 0, c: 2, kind: 'cast', mana: 6, desc: 'After the old koan of the teacher who answered every question with one finger: a single thrust that ignores armour and guards and leaves a cauterized hole straight through. Always critical against the stone-cursed.',
    perks: [{ l: 5, v: 'kfinger2', name: 'Straight Through', desc: 'The hole goes on into the enemy behind.' }] },
  kobsid: { name: 'Mantra-Of-Obsidian', jp: 'Kokuyō-shingon', tab: 2, r: 1, c: 0, pre: 'kbar', kind: 'cast', mana: 12, desc: 'A guttural chant turns your skin to polished obsidian for a while (+12 Weight). You move slower, but your fists hit far harder, and every punch leaves a fault in the enemy: at five faults it shatters.',
    perks: [{ l: 5, v: 'kobsid2', name: 'Brittle World', desc: 'Four faults are enough.' }] },
  kmount: { name: 'Mountain-Falls-Laughing', jp: 'Yama-warai', tab: 2, r: 1, c: 1, pre: 'kgrip', kind: 'cast', mana: 14, desc: 'Leap with shocking agility and land belly-first at the cursor, flattening everything beneath you; an earthquake of jagged stone rolls out from the impact. Light, you leap farther; heavy, the crater is bigger. The landing is a heavy action (+12 Weight).',
    perks: [{ l: 5, v: 'kmount2', name: 'Aftershock', desc: 'The rolling stone stuns what it strikes.' }] },
  kstep: { name: 'Step-That-Wakes-Bedrock', jp: 'Kiban-fumi', tab: 2, r: 2, c: 1, pre: 'kmount', kind: 'cast', mana: 12, desc: 'A slow, deliberate stomp: a line of bedrock spears thrusts up toward the cursor and impales from below. Water stops it; on the old flagstone roads it strikes twice as hard.',
    perks: [{ l: 5, v: 'kstep2', name: 'Forked Stone', desc: 'Two more lines of spears fan out beside the first.' }] },
  kpagoda: { name: 'Pagoda-For-One', jp: 'Hitori-no-tō', tab: 2, r: 2, c: 2, pre: 'kfinger', kind: 'cast', mana: 14, desc: 'Slap the ground with both palms: a stone pagoda bursts up and encases the enemy nearest the cursor. A snap of your fingers two seconds later collapses it inward.',
    perks: [{ l: 5, v: 'kpagoda2', name: 'Falling Tiers', desc: 'The collapse crushes everything within 2 yd.' }] },
  kweep: { name: 'The-Weeping-One-Who-Walks', jp: 'Nakibotoke', tab: 2, r: 3, c: 0, pre: 'kobsid', kind: 'cast', mana: 24, desc: 'Call up a huge stone golem carved as a many-armed Buddha, weeping from its eyes. It lumbers after your enemies, smashes them flat and draws their anger to itself. One at a time; cast again to send it to the cursor, or on it to dismiss it. It keeps its wounds.',
    perks: [{ l: 5, v: 'kweep2', name: 'Quaking Palm', desc: 'Its slams stun for a second.' }, { l: 10, v: 'kweep3', name: 'Temple Stone', desc: 'Half again as much life.', stat: ['vit', 60] }] },
  kthousand: { name: 'Thousand-Arms-Of-Nothing', jp: 'Senju-mu', tab: 2, r: 5, c: 1, pre: 'kstep', kind: 'cast', mana: 45, desc: 'A spectral many-armed bodhisattva stands up behind you, and a thousand gold and stone arms strike out in a cone. Armour is pulverised; crowds turn to red mist. Once every 12 s.',
    perks: [{ l: 1, v: 'kthous2', name: 'Ten Thousand', desc: 'Half again as many blows.', stat: ['con', 75] }] }
};
for (const k in MONK_SK) {
  const s = MONK_SK[k]; s.cls = 'monk'; if (s.mana) s.mana = Math.round(s.mana * COST_MULT * 10) / 10; s.req = ROWREQ[s.r];
  SK[k] = s; SK_ORDER.push(k); (s.perks || []).forEach((p, i) => { VIRT[p.v] = { s: k, i }; });
  if (s.kind === 'cast' || s.kind === 'hold') { RIGHT_SKILLS.push(k); LEFT_SKILLS.push(k); }
}
Object.assign(SYN, {
  kstar: [['kamber', 6], ['kfist', 5]], kfist: [['khands', 8], ['kstar', 5]], khands: [['kfist', 6]], keye: [['kstar', 6], ['klotus', 5]], klotus: [['keye', 6], ['kamber', 5]],
  kpalm: [['kbelow', 6]], kbelow: [['kpalm', 6], ['kspit', 5]], kspit: [['kbelow', 5]], kspade: [['kbelow', 5]],
  kmount: [['kstep', 7], ['kobsid', 4]], kstep: [['kmount', 7]], kfinger: [['kgrip', 6], ['kobsid', 5]], kpagoda: [['kgrip', 6], ['kstep', 5]], kthousand: [['kmount', 3], ['kstep', 3], ['kfinger', 3]]
});
const MONK_CD = { ksun: 30, knothing: 30, kthousand: 12 };
// what each skill does to his Weight: + heavy actions (slams, rooting, blocking, stone), - light ones (quick strikes, leaps,
// breath and fire, vanishing). Held and toggled skills push it every second instead (marked /s).
const MONK_WT = { kdawn: 0, keclipse: 0, kamber: -4, khands: -14, klaugh: 2, kstar: -6, kfist: 10, ksutra: -6, ktears: -6, keye: -4, kbell: 12, klotus: 8, ksun: -15,
  kpalm: 8, kclap: 6, kbowl: 0, kspade: -5, kpinch: -5, kbelow: 6, kspit: -4, kwalk: -3, kmirror: 8, knothing: -25,
  kbar: 0, kgrip: 8, kfinger: -5, kobsid: 12, kmount: 12, kstep: 12, kpagoda: 10, kweep: 10, kthousand: 12 };
const MONK_WT_PER_S = { kamber: 1, keye: 1, klotus: 1, kwalk: 1 };
const MONK_WT_CAP = 12;   // no single heavy action settles more than this (v0.35: poise gains capped)
function wtAdd(v) {
  if (!v || !isMonk()) return;
  if (v > MONK_WT_CAP) v = MONK_WT_CAP;
  P.weight = clamp(P.weight + v, 0, 100);
  if (!P.kpoise && P.weight >= 100) {
    P.kpoise = true; floatText(P.x, P.y - 0.9, 'PERFECT POISE', '#f0d070'); sfx(70, 0.9, 'square', 0.06, -10); sfx(140, 0.6, 'triangle', 0.04, 0);
    if (typeof mkShock === 'function') { mkShock(P.x, P.y, 2.2, '#3a2a10', '#f0d070', 0.6, 4); mkFx({ k: 'crack', x: P.x, y: P.y, R: 1.6, n: 9, seed: Math.random() * 6, t: 2.5, t0: 2.5 }); }
    G.shake = Math.max(G.shake, 4);
  } else if (P.kpoise && P.weight < 90) { P.kpoise = false; floatText(P.x, P.y - 0.8, 'poise loosens', '#a39d8c'); }
}
function wtText(id) { const v = MONK_WT[id]; if (!v) return ''; const per = MONK_WT_PER_S[id] ? '/s' : ''; return ` · Weight ${v > 0 ? '+' + v : v}${per} (${v > 0 ? 'heavy' : 'light'})`; }

// the class's weapons: fist wraps are his signature; the gravedigger's spade and the ringed staff exist too
Object.assign(BASES, {
  wraps: { name: 'Fist Wraps', slot: 'weapon', w: 1, h: 2, dmg: [3, 6], lvl: 1, icon: 'wraps', fist: true, cls: 'monk' },
  iwraps: { name: 'Sutra-Bound Wraps', slot: 'weapon', w: 1, h: 2, dmg: [6, 11], lvl: 8, icon: 'iwraps', fist: true, cls: 'monk' },
  spade: { name: "Gravedigger's Spade", slot: 'weapon', w: 1, h: 3, dmg: [5, 11], lvl: 4, icon: 'spade', spade: true, cls: 'monk' },
  shakujo: { name: 'Ringed Staff', slot: 'weapon', w: 1, h: 3, dmg: [6, 12], lvl: 6, icon: 'shakujo', cls: 'monk' }
});
function monkWpn() { const w = P.eq && P.eq.weapon; return w && BASES[w.base] ? w.base : null; }
function fistOn() { const b = monkWpn(); return !b || !!BASES[b].fist; }

// ------------------------------------------------------------------- the reading: Ur-Nihl, the Silence
{
  const star = { id: 'silence', name: 'Ur-Nihl', sub: 'the Silence', cls: 'monk', clsName: 'The Empty Hand', blurb: 'Empty Laughter: radiance by day, absence by night, stone always', fx: { res: 8, con: 3, hpPct: -5 }, txt: '', col: '#d8c890',
    say: 'Ur-Nihl. ... No. I will not look into the bowl for that one. See: the blood has gone still. Smooth as black glass. It is not a god that looked down on you. It is the hole the gods are lying in, and it was smiling.' };
  const faces = [
    { id: 'laugh', name: 'The Laughing Face', eyes: 0, mouth: 0, fx: { skt0: 1, dmg: 4, res: -4 }, txt: '+1 to Radiance skills', say: 'The Laughing Face. It laughs at the sun for thinking it could clean anything. Laugh with it, and burn.' },
    { id: 'bowl', name: 'The Empty Bowl', eyes: 4, mouth: 4, fx: { skt1: 1, lok: 2, hpPct: -4 }, txt: '+1 to Absence skills', say: 'The Empty Bowl. Everything poured into it is gone. Beg with it, little monk. The world will fill it for you.' },
    { id: 'unmoved', name: 'The Unmoved', eyes: 2, mouth: 2, fx: { skt2: 1, con: 3, frw: -4 }, txt: '+1 to Destroyer skills', say: 'The Unmoved. A mountain does not hate the valley. It simply falls on it.' }
  ];
  const soft = e => { e.fx = fateSoften(e.fx); e.txt = fateTxtOf(e.fx, e.txt); };
  soft(star); faces.forEach(soft);
  FATE.stars.push(star); FATE.faces.silence = faces;
}

// ------------------------------------------------------------------- numbers
const RAISED = { hollow: 1, drowned: 1, archer: 1, ossarcher: 1, marrow: 1, knight: 1, hbone: 1, hollowH: 1 };
function isRaised(m) { return !!(m && (RAISED[m.type] || RAISED[m.b.spr] || /husk|ossuary|weeper|bone|marrow/i.test(m.b.name || ''))); }
const MONK_TUNE = 0.75;   // v0.35: every skill's damage (base and per-level) cut by a quarter; Amber and the Laugh a little more below
const KS = {
  // the sky: 1 at noon, 0 at night; underground it is dusk (neutral) unless he has turned it
  skyK: () => G.skyForce ? (G.skyForce.kind === 'noon' ? 1 : 0) : (G.zone && isOutdoor(G.zone) ? dayK() : null),
  sky: tab => { const k = KS.skyK(); if (k == null || tab === 2 || tab == null) return 1; return tab === 0 ? 0.75 + 0.6 * k : 0.75 + 0.6 * (1 - k); },
  area: () => { const k = KS.skyK(); return k == null ? 1 : 0.88 + 0.24 * k; },        // Radiance: bigger areas by day
  dur: () => { const k = KS.skyK(); return k == null ? 1 : 0.85 + 0.35 * (1 - k); },    // Absence: longer by night
  wK: () => clamp(P.weight / 100, 0, 1),
  wS: () => clamp((P.weight - 50) / 50, -1, 1),            // -1 light .. 0 settled .. 1 heavy
  wH: () => Math.max(0, KS.wS()), wL: () => Math.max(0, -KS.wS()),
  wDmg: () => (1 + 0.25 * KS.wH() - 0.05 * KS.wL()) * (P.kpoise ? 1.08 : 1),
  pow: id => D.dmgMult * KS.sky(SK[id] ? SK[id].tab : null) * KS.wDmg() * (SK[id] ? syn(id) : 1),
  fist: () => (D.wmin + D.wmax) / 2 * D.meleeMult * KS.wDmg() * (P.kobsid > 0 ? 1.45 + 0.03 * L1('kobsid') : 1),
  dr: () => P.skills.kbar > 0 ? Math.min(0.45, 0.15 + 0.015 * L1('kbar')) : 0,
  stance: () => P.kpoise ? 'Perfect Poise' : P.weight >= 66 ? 'Heavy' : P.weight > 34 ? 'Settled' : 'Light',
  // damage per skill (before armour): base grows with the skill's level
  d: (id, b, per) => (b + per * (L1(id) - 1)) * KS.pow(id) * MONK_TUNE,
  skyLen: id => (20 + (P.skills[id === 'kdawn' ? 'kdawn2' : 'kecl2'] > 0 ? 8 : 0)) * (isOutdoor(G.zone) ? 1 : 0.5),
  skyCdLen: () => Math.max(30, 48 - 0.8 * Math.max(L1('kdawn'), L1('keclipse'))),
  amberR: () => (2.1 + (P.skills.kamberw > 0 ? 1 : 0)) * KS.area(),
  laughR: () => 3.2 * KS.area() * (P.skills.klaughw > 0 ? 1.25 : 1),
  laughEvery: () => Math.max(2, 5 - 2.4 * KS.wK() - 0.05 * L1('klaugh')),
  haloMax: () => 3 + Math.floor(P.skills.ksutra / 4) + (P.skills.ksmore > 0 ? 2 : 0),
  bowlChance: () => Math.min(0.85, 0.3 + 0.025 * L1('kbowl')),
  faults: () => P.skills.kobsid2 > 0 ? 4 : 5,
  buddha: () => { const l = L1('kweep'); return { max: Math.round((90 + 40 * l + P.level * 6) * (P.skills.kweep3 > 0 ? 1.5 : 1)), dmg: (10 + 6 * l) * D.dmgMult * KS.wDmg() }; }
};
function monkInfo(id) { const s0 = monkInfo0(id); return s0 ? s0 + wtText(id) : s0; }
function monkInfo0(id) {
  const r = Math.round, pc = v => Math.round(v * 100) + '%', sk = SK[id]; if (!sk || sk.cls !== 'monk') return '';
  const sky = sk.tab < 2 ? ` · sky x${KS.sky(sk.tab).toFixed(2)}` : '';
  switch (id) {
    case 'kdawn': case 'keclipse': return `${KS.skyLen(id).toFixed(0)} s · turning the sky pours three times the sand`;
    case 'kamber': return `${r(KS.d('kamber', 6.5, 3))}/s within ${KS.amberR().toFixed(1)} yd · eats 5 Weight and 1% life a second${sky}`;
    case 'khands': return `100 palms · ${r(KS.fist() * (0.09 + 0.01 * L1('khands')) * KS.sky(0) * syn('khands') * 100)} in all${sky}`;
    case 'klaugh': return `${r(KS.d('klaugh', 5.6, 2.8))} within ${KS.laughR().toFixed(1)} yd every ${KS.laughEvery().toFixed(1)} s${sky}`;
    case 'kstar': return `${r(KS.d('kstar', 12, 5.5))} in a ${(4.6 * KS.area()).toFixed(1)} yd cone · x1.5 on the raised dead${sky}`;
    case 'kfist': return `${r(KS.d('kfist', 42, 18))} to the one beneath · ring ${r(KS.d('kfist', 42, 18) * 0.35)}${sky}`;
    case 'ksutra': return `${KS.haloMax()} talismans · ${r(KS.d('ksutra', 9, 4))} each · one regrows every 1.4 s${sky}`;
    case 'ktears': return `${5 + Math.floor(P.skills.ktears / 5) + (P.skills.ktmore > 0 ? 3 : 0)} tears · geysers ${r(KS.d('ktears', 16, 7))} · lie 15 s${sky}`;
    case 'keye': return `${r(KS.d('keye', 24, 9))}/s along 7.5 yd, through walls${sky}`;
    case 'kbell': return `${(5 + 0.15 * L1('kbell')).toFixed(1)} s · waves ${r(KS.d('kbell', 10, 4.5))} · blows on the bell lose 70%${sky}`;
    case 'klotus': return `${r(KS.d('klotus', 14, 6))}/s at full size · grows to ${(3.6 * KS.area()).toFixed(1)} yd${sky}`;
    case 'ksun': return `${10 + (P.skills.ksunlong > 0 ? 4 : 0)} s · beams ${r(KS.d('ksun', 20, 7))} at ${3 + Math.floor(L1('ksun') / 6) + (P.skills.ksunlong > 0 ? 1 : 0)} enemies${sky}`;
    case 'kpalm': return `Drags within ${P.skills.kpalmw > 0 ? 10 : 7} yd · ${r(KS.d('kpalm', 5, 2.4) * 5)}/s${sky}`;
    case 'kclap': return `${r(KS.d('kclap', 6, 2.6))} · stuns ${(0.7 * KS.dur() * (P.skills.kclapw > 0 ? 2 : 1)).toFixed(1)} s within ${(3.4 + (P.skills.kclapw > 0 ? 1.5 : 0)).toFixed(1)} yd${sky}`;
    case 'kbowl': return `${pc(KS.bowlChance())} of frontal missiles swallowed · full at 6 · holds ${P.kbowl}`;
    case 'kspade': return `${r(KS.fist() * (1.1 + 0.08 * L1('kspade')) * KS.sky(1) * syn('kspade') * (monkWpn() === 'spade' ? 1.3 : 1))} in an arc · shadowless: rooted ${(2.5 * KS.dur()).toFixed(1)} s, ${r(KS.d('kspade', 7, 3))}/s${sky}`;
    case 'kpinch': return `Lesser raised dead collapse · the living: silenced 3 s, ${r(KS.d('kpinch', 14, 6))} damage${sky}`;
    case 'kbelow': return `Holds ${(3 * KS.dur()).toFixed(1)} s · crushes ${r(KS.d('kbelow', 12, 5))}/s${sky}`;
    case 'kspit': return `Roots ${(2.2 * (P.skills.kspitw > 0 ? 1.5 : 1)).toFixed(1)} yd · ${r(KS.d('kspit', 7, 3.2))}/s for ${(3 * KS.dur()).toFixed(1)} s · a fifth comes back as life${sky}`;
    case 'kwalk': return `Waves ${r(KS.d('kwalk', 7, 3.2))} every 1.2 s within 2.8 yd · drains 1.5 Essence/s${sky}`;
    case 'kmirror': return `${(3 + 0.1 * L1('kmirror')).toFixed(1)} s · blows come back x${P.skills.kmirror2 > 0 ? 3 : 2}${sky}`;
    case 'knothing': return `8 s unseen · each mark collapses for ${r(KS.d('knothing', 34, 13))}${sky}`;
    case 'kbar': return `${pc(KS.dr())} less from blows · holds doorways · standing still: Weight +3/s`;
    case 'kgrip': return `Stone ${4} s · the shattering blow +${r(KS.d('kgrip', 26, 11))}`;
    case 'kfinger': return `${r(KS.fist() * (1.7 + 0.16 * L1('kfinger')) * syn('kfinger'))} through any armour · x2.5 on stone`;
    case 'kobsid': return `${(10 + 0.5 * L1('kobsid')).toFixed(0)} s · fists x${(1.45 + 0.03 * L1('kobsid')).toFixed(2)} · ${KS.faults()} faults shatter`;
    case 'kmount': return `Leap ${(3 + 4 * (1 - KS.wK())).toFixed(1)} yd · ${r(KS.d('kmount', 20, 8) * (1 + 0.5 * KS.wK()))} in ${(1.5 + 1.6 * KS.wK()).toFixed(1)} yd`;
    case 'kstep': return `${r(KS.d('kstep', 15, 6.5))} per spear · 6.5 yd · x2 on flagstones`;
    case 'kpagoda': return `${r(KS.d('kpagoda', 34, 13))} when it falls`;
    case 'kweep': { const b = KS.buddha(); return `Life ${b.max} · slams ${r(b.dmg)} · draws enemies within 5 yd`; }
    case 'kthousand': return `${P.skills.kthous2 > 0 ? 18 : 12} waves · ${r(KS.d('kthousand', 9, 3.5))} each in a 5.5 yd cone · halves armour`;
  }
  return '';
}

// ------------------------------------------------------------------- helpers
function kHit(m, dmg, col, src) {
  if (!m || m.dead || m.hidden) return;
  if (m.type === 'pyre' && src && SK[src] && SK[src].tab === 0) dmg *= 0.5;   // the Pyre-Saint is a burning martyr too
  const was = G.kSrc; G.kSrc = src || null;
  hurtMon(m, dmg, col); G.kSrc = was;
}
function kFoes(x, y, R, filt) { const out = []; for (const m of G.zone.monsters) { if (m.dead || m.hidden) continue; if (Math.hypot(m.x - x, m.y - y) < R + m.r && (!filt || filt(m))) out.push(m); } return out; }
function kNear(pt, R, filt) { let best = null, bd = R; for (const m of G.zone.monsters) { if (m.dead || m.hidden || (filt && !filt(m))) continue; const d = Math.hypot(m.x - pt.x, m.y - pt.y); if (d < bd) { bd = d; best = m; } } return best; }
function kStun(m, t) { if (!m || m.dead) return; m.stun = Math.max(m.stun || 0, m.rank === 'boss' ? t * 0.3 : t); }
function kRoot(m, t) { if (!m || m.dead) return; m.root = Math.max(m.root || 0, m.rank === 'boss' ? Math.min(0.6, t) : t); }
function kShove(m, fx, fy, d) { if (!m || m.dead || m.rank === 'boss') return; const L = Math.hypot(m.x - fx, m.y - fy) || 1; for (let i = 0; i < 4; i++) moveCircle(m, (m.x - fx) / L * d / 4, (m.y - fy) / L * d / 4); }
function kRing(x, y, R, col, t) { parts.push({ ring: true, x, y, r: 0.2, max: R, t: t || 0.4, col }); }
// melee skills walk you in, then strike
const MONK_MELEE = { khands: [1.4, false], kspade: [1.9, true], kgrip: [1.4, false], kfinger: [1.6, false] };
function monkReach() { const b = monkWpn(); return b === 'shakujo' ? 0.35 : b === 'spade' ? 0.25 : 0; }
function kMeleeTarget(a, reach) {
  reach += monkReach();
  const m = meleeFoe(a, 3.6); if (!m || dist(m, P) > reach + m.r + 0.3) return null;
  faceTo(m.x, m.y); return m;
}
// a punch landed: Mantra-Of-Obsidian leaves faults
function kFault(m) {
  if (!m || m.dead || !(P.kobsid > 0)) return;
  m.kfault = (m.kfault || 0) + 1; floatText(m.x, m.y - 0.2, `fault ${m.kfault}`, '#8a86a0');
  if (m.kfault >= KS.faults()) { m.kfault = 0; burst(m.x, m.y, '#1c1826', 18, 2.6); burst(m.x, m.y, '#8a86a0', 10, 2); kRing(m.x, m.y, 1.4, '#8a86a0', 0.35); sfx(90, 0.35, 'square', 0.05, -40); kHit(m, KS.fist() * 3 + KS.d('kobsid', 20, 8), '#8a86a0', 'rubble'); G.shake = Math.max(G.shake, 3); }
}

// ------------------------------------------------------------------- casting
function monkCast(id, pt) {
  const s = SK[id]; if (!isMonk() || !s || s.cls !== 'monk' || !P.skills[id] || s.kind === 'passive') return;
  // toggles and the bowl can be used mid-cast
  if (id === 'kamber') { toggleAmber(); return; }
  if (id === 'kwalk') { toggleWalk(); return; }
  if (P.roll > 0 || P.cast > 0 || P.kleap || P.knothing > 0 && id !== 'kbowl') return;
  if (P.klotus && id !== 'klotus') return;
  const a = pt || aimPoint();
  if (MONK_CD[id] && (P.kcd[id] || 0) > 0) { say(`${s.name}: ${Math.ceil(P.kcd[id])} s`, 1); return; }
  if ((id === 'kdawn' || id === 'keclipse') && P.kskyCd > 0) { say(`The sky will not turn for ${Math.ceil(P.kskyCd)} s`, 1.2); sfx(90, 0.12, 'sawtooth', 0.03); return; }
  const M = MONK_MELEE[id]; if (M && !meleeApproach(id, a, M[0] + monkReach(), M[1])) return;
  if (id === 'kbowl') { if (P.kbowl <= 0) { say('The bowl is empty', 1); return; } drinkBowl(); return; }
  if (id === 'kweep' && G.kbuddha) { commandBuddha(a); return; }
  if (!spendMana(id, (id === 'kdawn' || id === 'keclipse') && !isOutdoor(G.zone) ? skillCost(id) * 0.5 : undefined)) return;
  faceTo(a.x, a.y); P.path = null;
  const m0 = P.mana;
  if (MONK_CD[id]) P.kcd[id] = MONK_CD[id];
  const cs = D.castSpd;
  switch (id) {
    case 'kdawn': turnSky('noon'); P.cast = 0.5 / cs; break;
    case 'keclipse': turnSky('night'); P.cast = 0.5 / cs; break;
    case 'khands': castHundred(a); break;
    case 'kstar': castStar(a); P.cast = 0.5 / cs; break;
    case 'kfist': castFist(a); P.cast = 0.45 / cs; break;
    case 'ksutra': castSutra(a); P.cast = 0.35 / cs; break;
    case 'ktears': castTears(); P.cast = 0.55 / cs; break;
    case 'keye': P.keye = { ang: Math.atan2(a.y - P.y, a.x - P.x), t: 0, tick: 0 }; sfx(1400, 0.4, 'sine', 0.03, 600); break;
    case 'kbell': G.kbell = { t: 5 + 0.15 * L1('kbell'), max: 5 + 0.15 * L1('kbell'), cd: 0, drop: 0.25 }; sfx(196, 1.4, 'sine', 0.06, 0); sfx(392, 1.0, 'triangle', 0.03, 0); floatText(P.x, P.y - 0.6, 'OM', '#f0d890'); P.cast = 0.4 / cs; break;
    case 'klotus': P.klotus = { t: 0, tick: 0 }; sfx(260, 0.8, 'sine', 0.04, 260); break;
    case 'ksun': P.ksun = 10 + (P.skills.ksunlong > 0 ? 4 : 0); P.ksunT = 0; banner('HE WHO HANGS AS THE SUN', '#ffd870', 1.6); monkLaughFx(); sfx(110, 1.4, 'sawtooth', 0.04, 220); P.cast = 0.4; break;
    case 'kpalm': G.kpalm = { t: 1.0, tick: 0, R: P.skills.kpalmw > 0 ? 10 : 7 }; P.cast = 1.0; sfx(60, 1.0, 'sawtooth', 0.05, -20); break;
    case 'kclap': castClap(); P.cast = 0.4 / cs; break;
    case 'kspade': castSpade(a); P.cast = 0.5 / cs; P.swing = 0.22; break;
    case 'kpinch': castPinch(a); P.cast = 0.35 / cs; break;
    case 'kbelow': castBelow(a); P.cast = 0.5 / cs; break;
    case 'kspit': castSpit(a); P.cast = 0.4 / cs; break;
    case 'kmirror': P.kmirror = 3 + 0.1 * L1('kmirror'); burst(P.x, P.y, '#120e18', 16, 2); sfx(320, 0.6, 'sine', 0.04, -240); P.cast = 0.25; break;
    case 'knothing': castNothing(); P.cast = 0.3; break;
    case 'kgrip': castGrip(a); P.cast = 0.45 / cs; P.swing = 0.22; break;
    case 'kfinger': castFinger(a); P.cast = 0.4 / cs; P.swing = 0.22; break;
    case 'kobsid': P.kobsid = 10 + 0.5 * L1('kobsid'); burst(P.x, P.y, '#1c1826', 20, 2.2); sfx(70, 1.0, 'sawtooth', 0.05, 10); floatText(P.x, P.y - 0.6, 'ON KOKUYO', '#8a86a0'); P.cast = 0.5 / cs; break;
    case 'kmount': castMount(a); break;
    case 'kstep': castStep(a); P.cast = 0.6 / cs; break;
    case 'kpagoda': castPagoda(a); P.cast = 0.45 / cs; break;
    case 'kweep': summonBuddha(a); P.cast = 0.6 / cs; break;
    case 'kthousand': G.kthousand = { t: 0, ang: Math.atan2(a.y - P.y, a.x - P.x), tick: 0, n: 0, max: P.skills.kthous2 > 0 ? 18 : 12, dmg: KS.d('kthousand', 9, 3.5) }; P.cast = 1.5; sfx(55, 1.8, 'sawtooth', 0.05, 30); break;
  }
  // it fired (a whiff refunds its Essence): show its name, strike its pose, move his Weight, throw its flourish
  if (P.mana <= m0 + 1e-6 && !P._kwhiff) {
    P.kposeId = id; P.kposeT = Math.max(0.3, P.cast || 0);
    monkCallout(id); if (!MONK_WT_PER_S[id]) wtAdd(id === 'kmount' ? -6 : MONK_WT[id] || 0);
    try { monkCastFx(id, a); } catch (e) { reportError(e); }
  }
  P._kwhiff = false;
}
// the flourish each skill throws as it fires (the lasting effects draw themselves in zw_monk_ui.js)
function monkCastFx(id, a) {
  const tab = SK[id].tab, x = P.x, y = P.y;
  switch (id) {
    case 'kdawn': mkFx({ k: 'pillar', x, y, w: 16, c0: '#ffe070', c1: '#ffffff', t: 1.0, t0: 1.0 }); mkShock(x, y, 4, '#c07810', '#fff4b0', 0.7, 4); for (let i = 0; i < 12; i++) mkFx({ k: 'palm', x: x + Math.cos(i / 2) * 2, y: y + Math.sin(i / 2) * 2, z: 20 + i * 3, sc: 0.6, t: 0.6, t0: 0.6, vz: 40 }); break;
    case 'keclipse': mkFx({ k: 'pillar', x, y, w: 16, c0: '#0a0612', c1: '#6a4aa0', dark: true, t: 1.0, t0: 1.0 }); mkShock(x, y, 4, '#050308', '#b8a0f0', 0.7, 5); mkFx({ k: 'hole', x, y, z: 70, r: 10, t: 1.2, t0: 1.2 }); break;
    case 'kstar': mkShock(x, y, 1.6, '#c05010', '#ffe070', 0.3, 2, 20); break;
    case 'kfist': mkFx({ k: 'glyph', x, y, z: 64, s: '光', col: '#ffe070', t: 0.8, t0: 0.8, vz: 10 }); break;
    case 'ksutra': mkShock(x, y, 1.4, '#c05010', '#ffd070', 0.3, 2, 40); break;
    case 'ktears': for (let i = 0; i < 8; i++) mkFx({ k: 'flame', x: x + rand(-0.5, 0.5), y: y + rand(-0.5, 0.5), z: 44, v: i % 3, mat: 'mkFireV', sc: 0.5, t: 0.5, t0: 0.5, vz: -30 }); break;
    case 'kbell': mkFx({ k: 'glyph', x, y, z: 76, s: 'OM', col: '#ffe07a', t: 1.2, t0: 1.2, vz: 8 }); mkShock(x, y, 3, '#6a3a04', '#ffe070', 0.5, 4); break;
    case 'kpalm': mkShock(x, y, 7, '#050308', '#8a6ac8', 0.9, 3); break;
    case 'kclap': mkShock(x, y, 3.4 + (P.skills.kclapw > 0 ? 1.5 : 0), '#050308', '#d8c8ff', 0.8, 6); mkShock(x, y, 2, '#1a1024', '#ffffff', 0.5, 2, 22); mkFx({ k: 'glyph', x, y, z: 60, s: '無', col: '#d8c8ff', t: 0.7, t0: 0.7, vz: 20 }); break;
    case 'kspade': break;
    case 'kpinch': break;
    case 'kbelow': mkShock(a.x, a.y, 2, '#050308', '#7a5ab0', 0.5, 4); break;
    case 'kspit': break;
    case 'kmirror': for (let i = 0; i < 8; i++) mkFx({ k: 'arm', x, y, ai: i * 2, kind: 'palm', mat: 'mkVoidFx', add: false, z: 20, t: 0.5, t0: 0.5 }); mkShock(x, y, 1.8, '#050308', '#a888e0', 0.5, 3); break;
    case 'knothing': mkShock(x, y, 5, '#2a2830', '#e8e2f0', 0.8, 3); break;
    case 'kgrip': mkShock(x, y, 1.2, '#2a2824', '#bcb8ac', 0.35, 3); break;
    case 'kfinger': break;
    case 'kobsid': mkShock(x, y, 2.4, '#020104', '#9a92c0', 0.6, 5); for (let i = 0; i < 14; i++) { const an = i / 14 * 6.283; mkFx({ k: 'rock', x, y, z: 20, vx: Math.cos(an) * 2.5, vy: Math.sin(an) * 2.5, vz: 40, col: '#342c4c', t: 0.8, t0: 0.8 }); } mkFx({ k: 'glyph', x, y, z: 68, s: '不動', col: '#b8b0e0', t: 0.9, t0: 0.9, vz: 10 }); break;
    case 'kstep': mkFx({ k: 'crack', x, y, R: 1.4, n: 6, seed: Math.random() * 6, t: 1.2, t0: 1.2, glint: '#bcb8ac' }); mkFx({ k: 'dust', x, y, seed: Math.random() * 6, t: 0.6, t0: 0.6 }); break;
    case 'kpagoda': mkFx({ k: 'dust', x, y, seed: Math.random() * 6, t: 0.6, t0: 0.6 }); mkShock(x, y, 1.5, '#2a2824', '#bcb8ac', 0.35, 3); break;
    case 'kweep': mkFx({ k: 'dust', x, y, seed: 1, t: 0.6, t0: 0.6 }); break;
    case 'kthousand': mkFx({ k: 'glyph', x, y, z: 80, s: '千手', col: '#ffe07a', t: 1.4, t0: 1.4, vz: 6 }); break;
    case 'kmount': mkFx({ k: 'dust', x, y, seed: 2, t: 0.5, t0: 0.5 }); break;
  }
  if (tab === 0 && !['kdawn', 'kfist', 'kbell'].includes(id)) for (let i = 0; i < 6; i++) parts.push({ x: x + rand(-0.4, 0.4), y: y + rand(-0.4, 0.4), z: rand(20, 40), vx: 0, vy: 0, vz: rand(10, 30), t: 0.6, col: '#fff0a0' });
}

// ---- the sky
function turnSky(kind) {
  const id = kind === 'noon' ? 'kdawn' : 'keclipse', t = KS.skyLen(id);
  G.skyForce = { kind, t, max: t };
  P.kskyCd = KS.skyCdLen();
  G.hour = hourOf();   // the hour changes under our hand: no second banner from the clock
  G.kflash = { kind, t: 0.9 };
  if (kind === 'noon') {
    banner('HAND THAT OPENS NOON', '#fff0b0', 2); say('A blinding noon. Radiance peaks.', 2);
    sfx(880, 0.9, 'sine', 0.05, 440); sfx(1320, 0.6, 'triangle', 0.03, 0);
    // night creatures are dazzled; the things that hide from the day are dragged into it
    for (const m of G.zone.monsters) {
      if (m.dead || dist(m, P) > 13) continue;
      const H = HOURS[m.type], nightling = (H && H.when && !H.when.includes('day')) || (H && (H.night || 1) > 1.15) || m.dark || m.b.ai === 'ghost' || m.b.ai === 'flyer';
      if (m._timeHidden || m.hidden) { m._timeHidden = false; m.hidden = false; m.kreveal = t; burst(m.x, m.y, '#fff0b0', 10, 1.6); }
      if (nightling) { kStun(m, 1.6); m.slow = Math.max(m.slow || 0, 0.5); m.kdazzle = 3; if (P.skills.kdawn3 > 0) burnMon(m, KS.d('kdawn', 6, 2.5), 4); floatText(m.x, m.y - 0.3, 'dazzled', '#fff0b0'); }
    }
  } else {
    banner('HAND THAT CLOSES THE SUN', '#8a7aa8', 2); say('The sun goes out. Every light but yours gutters.', 2);
    sfx(55, 1.4, 'sawtooth', 0.05, -10); sfx(110, 1.0, 'sine', 0.04, -50);
    for (const m of G.zone.monsters) if (!m.dead && dist(m, P) > 6 && m.state !== 'idle') { m.state = 'idle'; m.path = null; }
  }
}
function endSky() {
  const f = G.skyForce; G.skyForce = null;
  // it snaps back with a sound like a bell
  sfx(523, 1.6, 'sine', 0.05, 0); sfx(784, 1.2, 'sine', 0.025, 0); sfx(262, 2, 'triangle', 0.03, 0);
  G.hour = hourOf(); say(f && f.kind === 'noon' ? 'The false noon cracks and falls away' : 'The sun comes back through the crack', 2);
  for (const m of G.zone.monsters) if (m.kreveal) m.kreveal = 0;
}

// ---- Radiance
function toggleAmber() {
  if (P.kamber) { P.kamber = false; burst(P.x, P.y, '#ffd890', 8, 1.5); sfx(300, 0.2, 'sine', 0.03, -200); return; }
  if (!spendMana('kamber')) return;
  P.kamber = true; P.kamberT = 0; burst(P.x, P.y, '#ffe8a0', 18, 2.4); sfx(500, 0.4, 'sawtooth', 0.03, 200); sfx(120, 0.8, 'sawtooth', 0.04, 60); monkCallout('kamber'); P.kposeId = 'kamber'; P.kposeT = 0.4; P.cast = Math.max(P.cast, 0.3);
  mkShock(P.x, P.y, KS.amberR(), '#7a1604', '#ffd040', 0.5, 4); for (let i = 0; i < 10; i++) mkFx({ k: 'flame', x: P.x + Math.cos(i / 10 * 6.283) * KS.amberR() * 0.8, y: P.y + Math.sin(i / 10 * 6.283) * KS.amberR() * 0.8, z: 0, v: i % 3, sc: 1.2, seed: i, t: 0.6, t0: 0.6 });
}
function castHundred(a) {
  const m = kMeleeTarget(a, 1.4); if (!m) { say('No enemy in reach', 0.8); P.cast = 0.2; P._kwhiff = true; return; }
  G.kflurry = { m, t: 0, n: 0, tick: 0, dmg: KS.fist() * (0.09 + 0.01 * L1('khands')) * KS.sky(0) * syn('khands') };
  P.cast = 1.5; sfx(700, 0.1, 'square', 0.03, 300);
}
function updateFlurry(dt) {
  const F = G.kflurry; if (!F) return;
  F.t += dt; F.tick -= dt;
  const m = F.m;
  if (!m || m.dead || dist(m, P) > 2.6 + m.r) { G.kflurry = null; P.cast = Math.min(P.cast, 0.15); return; }
  faceTo(m.x, m.y); kStun(m, 0.15);
  while (F.tick <= 0 && F.n < 100) {
    F.tick += 1.5 / 100; F.n++;
    kHit(m, F.dmg, '#ffe8a0', 'khands'); if (F.n % 3 === 0 && m.dmg) burnMon(m, F.dmg * 2, 2);
    if (F.n % 20 === 0) kFault(m);
    // a storm of glowing palm prints on the target, and afterimage arms blasting out of him at it
    if (F.n % 3 === 0) mkFx({ k: 'palm', x: m.x + rand(-0.8, 0.8), y: m.y + rand(-0.6, 0.6), z: rand(2, 38), sc: Math.random() < 0.2 ? 1.5 : 1, t: 0.24, t0: 0.24 });
    if (F.n % 3 === 0) { const sa = iso(P.x, P.y), sb = iso(m.x, m.y), an = Math.atan2(sb.sy - 14 - (sa.sy - 26), sb.sx - sa.sx) + rand(-0.5, 0.5), ai = ((Math.round(an / 6.283 * 16) % 16) + 16) % 16; mkFx({ k: 'arm', x: P.x, y: P.y, z: 28 + rand(-8, 8), ai, kind: Math.random() < 0.5 ? 'palm' : 'fist', dx: (sb.sx - sa.sx) * 0.8, dy: (sb.sy - sa.sy) * 0.8, t: 0.2, t0: 0.2 }); }
    if (F.n % 10 === 0) mkShock(m.x, m.y, 1 + m.r, '#c07810', '#fff4b0', 0.2, 2, 12);
    if (F.n % 6 === 0) sfx(600 + Math.random() * 400, 0.03, 'square', 0.018, -200);
    if (m.dead) break;
  }
  if (F.n >= 100 || m.dead) {
    if (!m.dead) {
      const big = P.skills.khshove > 0; kShove(m, P.x, P.y, big ? 3 : 1.5); kStun(m, big ? 1.5 : 0.5);
      kHit(m, F.dmg * 8, '#fff0b0', 'khands'); mkFx({ k: 'palm', x: m.x, y: m.y, z: 4, sc: 3, t: 0.5, t0: 0.5 }); mkShock(m.x, m.y, 2, '#c07810', '#ffffff', 0.45, 4); sfx(160, 0.3, 'square', 0.05, -80); G.shake = Math.max(G.shake, 4);
    }
    G.kflurry = null; P.cast = Math.min(P.cast, 0.2);
  }
}
function castStar(a) {
  const ang = Math.atan2(a.y - P.y, a.x - P.x), R = 4.6 * KS.area();
  G.kcones.push({ x: P.x, y: P.y, ang, a0: ang - 0.7, a1: ang + 0.7, t: 0, dur: 0.6, R, hit: new Set(), dmg: KS.d('kstar', 12, 5.5) });
  monkLaughFx(true); sfx(240, 0.6, 'sawtooth', 0.04, 300);
}
function updateCones(dt) {
  for (const c of G.kcones) {
    c.t += dt; const k = Math.min(1, c.t / c.dur), sweep = c.a0 + (c.a1 - c.a0) * k;
    for (const m of G.zone.monsters) {
      if (m.dead || m.hidden || c.hit.has(m)) continue;
      const dx = m.x - c.x, dy = m.y - c.y, d = Math.hypot(dx, dy); if (d > c.R + m.r || d < 0.1) continue;
      let da = Math.atan2(dy, dx) - c.a0; while (da < -Math.PI) da += 6.283; while (da > Math.PI) da -= 6.283;
      const span = c.a1 - c.a0; if (da < -0.15 || da > span + 0.15) continue;
      if (c.a0 + da > sweep + 0.1) continue;   // the sweep has not reached it yet
      c.hit.add(m); const und = isRaised(m) || m.rank === 'boss' && /Warden|Ossuary/.test(m.name);
      kHit(m, c.dmg * (und ? 1.5 : 1), '#ffb060', 'kstar'); burnMon(m, c.dmg * 0.25, 3);
      if (und && P.skills.kstarun > 0) burnMon(m, c.dmg * 0.4, 5);
    }
    for (let i = 0; i < 5; i++) { const aa = sweep + rand(-0.12, 0.12), rr = rand(0.6, c.R); parts.push({ x: c.x + Math.cos(aa) * rr, y: c.y + Math.sin(aa) * rr, z: rand(4, 12), vx: Math.cos(aa) * 2, vy: Math.sin(aa) * 2, vz: 10, t: 0.4, col: Math.random() < 0.5 ? '#ffe8a0' : '#ff9a40' }); }
  }
  G.kcones = G.kcones.filter(c => c.t < c.dur + 0.35);
}
function castFist(a) {
  const p = clampCast(a, 9), m = kNear(p, 1.6);
  G.kfists.push({ x: m ? m.x : p.x, y: m ? m.y : p.y, m, t: 0, dur: 0.6, dmg: KS.d('kfist', 42, 18) });
  sfx(1200, 0.5, 'sine', 0.03, -900);
}
function updateFists(dt) {
  for (const f of G.kfists) {
    f.t += dt; if (f.m && !f.m.dead && f.t < f.dur) { f.x = f.m.x; f.y = f.m.y; }
    if (f.t >= f.dur && !f.done) {
      f.done = true; G.shake = Math.max(G.shake, 7); sfx(50, 0.7, 'square', 0.07, -20); sfx(200, 0.4, 'sawtooth', 0.04, -150);
      const main = f.m && !f.m.dead && Math.hypot(f.m.x - f.x, f.m.y - f.y) < 1.2 ? f.m : kNear(f, 1.2);
      if (main) { kHit(main, f.dmg, '#fff0b0', 'kfist'); kStun(main, 0.6); }
      const RR = 2.5 + (P.skills.kfring > 0 ? 1 : 0);
      for (const m of kFoes(f.x, f.y, RR)) { if (m === main) continue; kHit(m, f.dmg * 0.35, '#ffb060', 'kfist'); if (P.skills.kfring > 0) burnMon(m, f.dmg * 0.15, 4); }
      kRing(f.x, f.y, RR, '#ffd870', 0.5); kRing(f.x, f.y, RR * 0.6, '#fff0b0', 0.4); burst(f.x, f.y, '#ffe8a0', 40, 4); burst(f.x, f.y, '#ff9a40', 20, 3);
    }
  }
  G.kfists = G.kfists.filter(f => f.t < f.dur + 0.5);
}
function castSutra(a) {
  const n = P.khalo; if (n <= 0) { say('The halo is burnt out: it regrows', 1); P.mana += skillCost('ksutra'); P._kwhiff = true; return; }
  const foes = kFoes(a.x, a.y, 5).sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y));
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + (i - (n - 1) / 2) * 0.5, tg = foes.length ? foes[i % foes.length] : null;
    G.kofuda.push({ x: P.x - 0.2, y: P.y - 0.2, z: 30, vx: Math.cos(ang + Math.PI / 4) * 3, vy: Math.sin(ang + Math.PI / 4) * 3, target: tg, aim: { x: a.x, y: a.y }, t: 3, delay: i * 0.07, spin: Math.random() * 6, dmg: KS.d('ksutra', 9, 4) });
  }
  P.khalo = 0; P.khaloT = 0; sfx(900, 0.3, 'triangle', 0.03, -300);
}
function updateOfuda(dt) {
  for (const o of G.kofuda) {
    if (o.delay > 0) { o.delay -= dt; o.x = P.x - 0.2; o.y = P.y - 0.2; continue; }
    o.t -= dt; o.spin += dt * 9;
    if (!o.target || o.target.dead) o.target = kNear(o.aim, 6) || kNear(o, 6);
    const tx = o.target ? o.target.x : o.aim.x, ty = o.target ? o.target.y : o.aim.y, dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy) || 1;
    o.vx += (dx / d * 11 - o.vx) * Math.min(1, dt * 5); o.vy += (dy / d * 11 - o.vy) * Math.min(1, dt * 5);
    o.x += o.vx * dt; o.y += o.vy * dt; o.z += (10 - o.z) * Math.min(1, dt * 4);
    if (Math.random() < 0.6) parts.push({ x: o.x, y: o.y, z: o.z, vx: 0, vy: 0, vz: 4, t: 0.3, col: Math.random() < 0.5 ? '#ff9a40' : '#ffe8a0' });
    const hit = G.zone.monsters.find(m => !m.dead && !m.hidden && Math.hypot(m.x - o.x, m.y - o.y) < m.r + 0.3);
    if (hit || o.t <= 0 || (!o.target && d < 0.3)) {
      o.t = 0; for (const m of kFoes(o.x, o.y, 1.2)) { kHit(m, o.dmg, '#ffb060', 'ksutra'); burnMon(m, o.dmg * 0.2, 2); }
      burst(o.x, o.y, '#ffd870', 12, 2); kRing(o.x, o.y, 1.2, '#ffb060', 0.25); sfx(420, 0.12, 'square', 0.03, -200);
    }
  }
  G.kofuda = G.kofuda.filter(o => o.t > 0);
}
function castTears() {
  const n = 5 + Math.floor(P.skills.ktears / 5) + (P.skills.ktmore > 0 ? 3 : 0);
  for (let i = 0; i < n; i++) {
    const a = i / n * 6.283 + rand(-0.3, 0.3), r = rand(1.2, 3.2), p = { x: P.x + Math.cos(a) * r, y: P.y + Math.sin(a) * r };
    if (G.zone.solidAt(p.x, p.y)) continue;
    G.ktears.push({ x: p.x, y: p.y, x0: P.x, y0: P.y - 0.1, fall: 0.35 + i * 0.05, arm: 0.6 + i * 0.05, t: 15, dmg: KS.d('ktears', 16, 7) });
  }
  floatText(P.x, P.y - 0.6, 'boo hoo', '#bfe8ff'); sfx(660, 0.5, 'sine', 0.03, -330); sfx(440, 0.6, 'sine', 0.02, -220);
  while (G.ktears.length > 30) G.ktears.shift();
}
function updateTears(dt) {
  for (const t of G.ktears) {
    t.t -= dt; if (t.fall > 0) t.fall -= dt; if (t.arm > 0) { t.arm -= dt; continue; }
    const m = G.zone.monsters.find(q => !q.dead && !q.hidden && !q.fly && Math.hypot(q.x - t.x, q.y - t.y) < q.r + 0.45);
    if (m) {
      t.t = 0; G.kgeysers.push({ x: t.x, y: t.y, t: 0.7 });
      for (const q of kFoes(t.x, t.y, 1.3)) { kHit(q, t.dmg, '#fff0b0', 'ktears'); burnMon(q, t.dmg * 0.2, 3); }
      burst(t.x, t.y, '#fff8d0', 18, 3); sfx(300, 0.35, 'sawtooth', 0.04, 400);
    }
  }
  G.ktears = G.ktears.filter(t => t.t > 0);
  for (const g of G.kgeysers) g.t -= dt; G.kgeysers = G.kgeysers.filter(g => g.t > 0);
}
function bellRing(src) {
  const B = G.kbell; if (!B || B.cd > 0) return; B.cd = 0.35; B.ring = 0.4;
  const dmg = KS.d('kbell', 10, 4.5);
  for (const m of kFoes(P.x, P.y, 3)) { kHit(m, dmg, '#f0d890', 'kbell'); kStun(m, P.skills.kbloud > 0 ? 1.5 : 0.5); m.kdazzle = 1.5; }
  kRing(P.x, P.y, 3, '#f0d890', 0.4); sfx(262 + Math.random() * 20, 1.2, 'sine', 0.05, 0); sfx(523, 0.8, 'triangle', 0.02, 0);
}
function updateEye(dt) {
  const E = P.keye; if (!E) return;
  if (!heldSkill('keye') && E.t > 0.35 || P.dead || P.roll > 0) { P.keye = null; return; }
  const cost = skillCost('keye') * dt; if (P.mana < cost) { P.keye = null; say('Not enough Essence', 1); return; }
  P.mana -= cost; E.t += dt; P.path = null; wtAdd(MONK_WT.keye * dt);
  const a = aimPoint(), want = Math.atan2(a.y - P.y, a.x - P.x); let da = want - E.ang; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283;
  E.ang += clamp(da, -3 * dt, 3 * dt); faceTo(P.x + Math.cos(E.ang), P.y + Math.sin(E.ang));
  E.tick -= dt; if (E.tick > 0) return; E.tick = 0.15;
  const L = 7.5, dx = Math.cos(E.ang), dy = Math.sin(E.ang), dmg = KS.d('keye', 24, 9) * 0.15;
  for (const m of G.zone.monsters) {
    if (m.dead || m.hidden) continue; const ox = m.x - P.x, oy = m.y - P.y, al = ox * dx + oy * dy; if (al < 0 || al > L + m.r) continue;
    if (Math.abs(ox * dy - oy * dx) > 0.35 + m.r) continue;
    kHit(m, dmg * 100 / (100 + Math.min(m.armor, 60)) * (1 + m.armor / 100), '#ffffff', 'keye');   // it slices armour: most of it is ignored
    if (P.skills.keyecut > 0 && !m.kcutT) { m.kcutT = 4; m.kcutA = m.armor * 0.33; m.armor -= m.kcutA; }
  }
}
function updateLotus(dt) {
  const Lo = P.klotus; if (!Lo) return;
  if ((!heldSkill('klotus') && Lo.t > 0.35) || P.dead) { P.klotus = null; return; }
  const cost = skillCost('klotus') * dt; if (P.mana < cost) { P.klotus = null; say('Not enough Essence', 1); return; }
  P.mana -= cost; Lo.t += dt; P.path = null; P.poiseGrace = 0.5; wtAdd(MONK_WT.klotus * dt);
  const R = Math.min(3.6, 1.1 + Lo.t * 0.65) * KS.area(); Lo.R = R;
  if (P.skills.klpull > 0) for (const m of kFoes(P.x, P.y, R + 1.5)) { if (m.rank === 'boss') continue; const d = dist(m, P) || 1; if (d > 0.9) moveCircle(m, (P.x - m.x) / d * 1.6 * dt, (P.y - m.y) / d * 1.6 * dt); }
  Lo.tick -= dt; if (Lo.tick > 0) return; Lo.tick = 0.25;
  const dmg = KS.d('klotus', 14, 6) * 0.25 * (0.55 + 0.45 * Math.min(1, Lo.t / 4));
  for (const m of kFoes(P.x, P.y, R)) kHit(m, dmg, '#ffe8a0', 'klotus');
  if (Math.random() < 0.5) sfx(300 + Lo.t * 40, 0.1, 'sine', 0.012, 60);
}
function updateSun(dt) {
  if (!(P.ksun > 0)) return;
  P.ksun -= dt; P.ksunT -= dt;
  if (P.ksunT <= 0) {
    P.ksunT = 0.35; const n = 3 + Math.floor(L1('ksun') / 6) + (P.skills.ksunlong > 0 ? 1 : 0), dmg = KS.d('ksun', 20, 7) * 0.35;
    const foes = kFoes(P.x, P.y, 7.5).sort((a, b) => dist(a, P) - dist(b, P)).slice(0, n);
    for (const m of foes) { kHit(m, dmg, '#ffd870', 'ksun'); G.kbeams.push({ x: m.x, y: m.y, t: 0.22, col: '#ffd870' }); }
    if (foes.length) sfx(1100, 0.08, 'sine', 0.015, -300);
  }
  if (P.ksun <= 0) { P.ksun = 0; burst(P.x, P.y, '#ffd870', 20, 2.5); sfx(220, 0.8, 'sine', 0.04, -150); }
}
function monkLaughFx(small) {
  floatText(P.x + rand(-0.3, 0.3), P.y - 0.8, small ? 'ha' : 'HA HA HA', '#fff0d0');
  sfx(180, 0.12, 'triangle', 0.035, 60); setTimeout(() => sfx(170, 0.12, 'triangle', 0.03, 60), 140); if (!small) setTimeout(() => sfx(160, 0.14, 'triangle', 0.03, 60), 280);
}
function laughPulse() {
  const R = KS.laughR(), dmg = KS.d('klaugh', 5.6, 2.8);
  for (const m of kFoes(P.x, P.y, R)) {
    kHit(m, dmg, '#ffffff', 'klaugh');
    if (m.b.ai === 'shield') { m.reel = Math.max(m.reel || 0, 0.9); }   // the Warden's guard drops
    if (m.state === 'parry') { m.state = 'chase'; m.t = 0; }
    if (m.dark) { m.dark = false; m.kdarkOff = 3; }
    if (m.kward) m.kward = 0;
  }
  mkShock(P.x, P.y, R, '#c07810', '#ffffff', 0.5, 4); mkShock(P.x, P.y, R * 0.6, '#fff0a0', '#ffffff', 0.35, 2, 16); mkFx({ k: 'glyph', x: P.x, y: P.y, z: 62, s: 'HA!', col: '#fff4c0', t: 0.7, t0: 0.7, vz: 24 }); wtAdd(MONK_WT.klaugh);
  if (G.zone.monsters.some(m => !m.dead && dist(m, P) < R + 3)) monkLaughFx(true);
}

// ---- Absence
function updatePalm(dt) {
  const H = G.kpalm; if (!H) return;
  H.t -= dt; H.tick -= dt;
  const dmgTick = H.tick <= 0; if (dmgTick) H.tick = 0.2;
  for (const m of kFoes(P.x, P.y, H.R)) {
    const d = dist(m, P) || 1;
    if (m.rank !== 'boss' && d > 0.9 + m.r) { const s = Math.min(d - 0.8, 6 * dt); moveCircle(m, (P.x - m.x) / d * s, (P.y - m.y) / d * s); }
    if (dmgTick) { kHit(m, KS.d('kpalm', 5, 2.4), '#6a5a8a', 'kpalm'); }
    if (Math.random() < 0.15) flyMote(m.x, m.y, 10, P, '#3a2a4a');
  }
  if (H.t <= 0) G.kpalm = null;
}
function castClap() {
  const R = 3.4 + (P.skills.kclapw > 0 ? 1.5 : 0), st = 0.7 * KS.dur() * (P.skills.kclapw > 0 ? 2 : 1), dmg = KS.d('kclap', 6, 2.6);
  let broke = 0;
  for (const m of kFoes(P.x, P.y, R)) {
    if (/wind|Wind|charge/.test(m.state || '')) { broke++; m.state = 'chase'; m.t = 0; m.cd = Math.max(m.cd || 0, 0.8); floatText(m.x, m.y - 0.3, 'hushed', '#b8a8d8'); }
    kStun(m, st); kHit(m, dmg, '#b8a8d8', 'kclap');
  }
  G.kclaps.push({ x: P.x, y: P.y, t: 0, dur: 0.45, R });
  G.shake = Math.max(G.shake, 4); sfx(40, 0.4, 'square', 0.07, 0); sfx(1800, 0.05, 'square', 0.03, -1600);
  if (broke) say(`${broke} blow${broke > 1 ? 's' : ''} never landed`, 1);
}
function castSpade(a) {
  const ang = Math.atan2(a.y - P.y, a.x - P.x), R = 2.1 + monkReach(), spade = monkWpn() === 'spade';
  const dmg = KS.fist() * (1.1 + 0.08 * L1('kspade')) * KS.sky(1) * syn('kspade') * (spade ? 1.3 : 1);
  let n = 0;
  for (const m of kFoes(P.x, P.y, R)) {
    let da = Math.atan2(m.y - P.y, m.x - P.x) - ang; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; if (Math.abs(da) > 1.65) continue;
    n++; kHit(m, dmg, '#6a5a8a', 'kspade'); kFault(m);
    const lit = lightLevel(m.x, m.y) > 0.3 || m.b.ai === 'pyre';
    if (lit || P.skills.kspadew > 0) {
      const k = lit ? 1 : 0.5, t = 2.5 * KS.dur() * k;
      m.kshadow = { t: 4 * KS.dur() * k, dps: KS.d('kspade', 7, 3), tick: 0.5 }; kRoot(m, t);
      G.kshades.push({ x: m.x, y: m.y, vx: Math.cos(ang) * 2 + rand(-0.5, 0.5), vy: Math.sin(ang) * 2 + rand(-0.5, 0.5), t: 1.1, w: m.r });
      floatText(m.x, m.y - 0.3, 'shadowless', '#8a7aa8');
    }
  }
  G.kslams.push({ x: P.x, y: P.y, t: 0.25, kind: 'arc', a: ang, R });
  sfx(n ? 180 : 320, 0.12, 'square', 0.04, -120); if (spade) sfx(90, 0.2, 'triangle', 0.03, -20);
}
function castPinch(a) {
  const m = kNear(a, 2.2) || kNear(P, 8, q => lineClear(G.zone, P, q) && Math.hypot(q.x - a.x, q.y - a.y) < 4);
  if (!m) { say('Nothing near the cursor to pinch', 1); P.mana += skillCost('kpinch'); return; }
  faceTo(m.x, m.y); G.kbeams.push({ x: m.x, y: m.y, t: 0.3, col: '#f0d890', thread: true });
  const weak = isRaised(m) && (m.rank === 'normal' || m.rank === 'minion' || (m.rank === 'champion' && P.skills.kpinchx > 0));
  if (weak) { floatText(m.x, m.y - 0.3, 'strings cut', '#f0d890'); const was = G.kSrc; G.kSrc = 'dust'; killMon(m); G.kSrc = was; sfx(1600, 0.08, 'triangle', 0.03, -1200); return; }
  kHit(m, KS.d('kpinch', 14, 6) * (isRaised(m) ? 2 : 1), '#f0d890', 'kpinch');
  if (!m.dead) { m.cd = Math.max(m.cd || 0, 3); m.kweak = 6; if (/wind|charge/i.test(m.state || '')) { m.state = 'chase'; m.t = 0; } floatText(m.x, m.y - 0.3, 'silenced', '#b8a8d8'); }
  sfx(1400, 0.06, 'triangle', 0.03, -900);
}
function castBelow(a) {
  const pick1 = ex => { let best = null, bh = -1; for (const m of kFoes(a.x, a.y, 3)) { if (ex.includes(m)) continue; const h = m.max * (m.rank === 'boss' ? 3 : m.rank === 'unique' ? 2 : m.rank === 'champion' ? 1.5 : 1); if (h > bh) { bh = h; best = m; } } return best; };
  const t1 = pick1([]); if (!t1) { say('No enemy near the cursor', 1); P.mana += skillCost('kbelow'); return; }
  const tg = [t1]; if (P.skills.kbelow2 > 0) { const t2 = pick1([t1]); if (t2) tg.push(t2); }
  for (const m of tg) {
    const hold = m.rank === 'boss' ? 0.6 : 3 * KS.dur();
    G.khands.push({ m, x: m.x, y: m.y, t: 0, dur: hold, tick: 0, dps: KS.d('kbelow', 12, 5) });
    kStun(m, hold); kRoot(m, hold);
  }
  G.shake = Math.max(G.shake, 3); sfx(70, 0.8, 'sawtooth', 0.05, -20);
}
function updateHands(dt) {
  for (const h of G.khands) {
    h.t += dt; const m = h.m; if (m && !m.dead) { m.x = h.x; m.y = h.y; }
    h.tick -= dt; if (h.tick <= 0 && m && !m.dead && h.t < h.dur) { h.tick = 0.4; kHit(m, h.dps * 0.4, '#6a5a8a', 'kbelow'); if (Math.random() < 0.4) sfx(120, 0.08, 'square', 0.02, -60); }
  }
  G.khands = G.khands.filter(h => h.t < h.dur + 0.4);
}
function castSpit(a) {
  const p = clampCast(a, 8), R = 2.2 * (P.skills.kspitw > 0 ? 1.5 : 1), t = 3 * KS.dur();
  G.kroots.push({ x: p.x, y: p.y, R, t, max: t, tick: 0, dps: KS.d('kspit', 7, 3.2), seed: Math.random() * 99 });
  for (const m of kFoes(p.x, p.y, R)) kRoot(m, 2.5 * KS.dur());
  G.kbeams.push({ x: p.x, y: p.y, t: 0.25, col: '#3a2a2a', spit: true });
  sfx(200, 0.15, 'sawtooth', 0.03, -150); setTimeout(() => sfx(80, 0.5, 'sawtooth', 0.04, -30), 150);
}
function updateRoots(dt) {
  for (const r of G.kroots) {
    r.t -= dt; r.tick -= dt; if (r.tick > 0) continue; r.tick = 0.5;
    for (const m of kFoes(r.x, r.y, r.R)) { const d = r.dps * 0.5; kHit(m, d, '#8e2630', 'kspit'); kRoot(m, 0.6); P.hp = Math.min(D.maxHp, P.hp + d * 0.2); flyMote(m.x, m.y, 6, P, '#c24050'); }
  }
  G.kroots = G.kroots.filter(r => r.t > 0);
}
function toggleWalk() {
  if (P.kwalk) { P.kwalk = false; burst(P.x, P.y, '#2a2034', 8, 1.4); sfx(200, 0.3, 'sine', 0.03, 200); return; }
  if (!spendMana('kwalk')) return;
  P.kwalk = true; P.kwalkT = 0.3; sfx(90, 0.6, 'sine', 0.04, -40); monkCallout('kwalk'); mkShock(P.x, P.y, 2.8, '#050308', '#7a5ab0', 0.6, 4);
}
function castNothing() {
  P.knothing = 8; G.kmarks = []; P.path = null;
  for (const m of G.zone.monsters) if (!m.dead && m.state !== 'idle') { m.state = 'idle'; m.path = null; }
  banner('ONE WITH NOTHING', '#9a94a8', 1.6); sfx(40, 2, 'sine', 0.06, 0); sfx(2000, 0.3, 'sine', 0.01, -1800);
}
function endNothing() {
  P.knothing = 0; let n = 0; const dmg = KS.d('knothing', 34, 13);
  for (const m of G.kmarks) { if (m.dead) continue; n++; G.kslams.push({ x: m.x, y: m.y, t: 0.5, kind: 'implode' }); kHit(m, dmg, '#9a94a8', 'knothing'); if (P.skills.knoth2 > 0) P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.02); }
  G.kmarks = []; banner('RETURNED', '#e8e2d0', 1); if (n) { G.shake = Math.max(G.shake, 5); sfx(60, 0.8, 'square', 0.05, -30); }
  sfx(300, 0.6, 'sine', 0.03, 300);
}
function drinkBowl() {
  const f = P.kbowl; if (!f) return; P.kbowl = 0;
  wtAdd(5 * f); P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.015 * f);
  floatText(P.x, P.y - 0.6, `drinks nothing (${f})`, '#c9a66b'); sfx(240, 0.4, 'sine', 0.03, -60); burst(P.x, P.y, '#c9a66b', 8, 1.2);
}

// ---- Destroyer
function castGrip(a) {
  const m = kMeleeTarget(a, 1.4); if (!m) { say('No enemy in reach', 0.8); P.cast = 0.2; P._kwhiff = true; return; }
  const stone = (q, t) => { q.kstone = q.rank === 'boss' ? 1 : t; kStun(q, q.kstone); kRoot(q, q.kstone); burst(q.x, q.y, '#8a867c', 12, 1.6); floatText(q.x, q.y - 0.3, 'weeping stone', '#b0aca0'); };
  stone(m, 4); kHit(m, KS.fist() * 0.5, '#b0aca0', 'kgrip');
  if (P.skills.kgrip2 > 0) { const o = kNear(m, 2, q => q !== m); if (o) stone(o, 3); }
  sfx(110, 0.5, 'square', 0.04, -50);
}
function castFinger(a) {
  const m = kMeleeTarget(a, 1.6); if (!m) { say('No enemy in reach', 0.8); P.cast = 0.2; P._kwhiff = true; return; }
  const st = m.kstone > 0, dmg = KS.fist() * (1.7 + 0.16 * L1('kfinger')) * syn('kfinger') * (st ? 2.5 : 1);
  const hit = q => { const fd = q.fdir; q.fdir = null; kHit(q, dmg * (100 + q.armor) / 100, '#ffffff', 'kfinger'); q.fdir = fd; kFault(q); };   // no armour, no guard
  hit(m); if (st) floatText(m.x, m.y - 0.4, 'truth', '#ffffff');
  const ang = Math.atan2(m.y - P.y, m.x - P.x);
  G.kslams.push({ x: m.x, y: m.y, t: 0.5, kind: 'hole', a: ang });
  if (P.skills.kfinger2 > 0) { const o = kNear({ x: m.x + Math.cos(ang) * 1.3, y: m.y + Math.sin(ang) * 1.3 }, 1.2, q => q !== m); if (o) { hit(o); G.kslams.push({ x: o.x, y: o.y, t: 0.5, kind: 'hole', a: ang }); } }
  sfx(1500, 0.05, 'square', 0.04, -1200); sfx(90, 0.2, 'square', 0.03, -30);
}
function castMount(a) {
  const wk = KS.wK(), R = 3 + 4 * (1 - wk), p = clampCast(a, R);
  P.kleap = { x0: P.x, y0: P.y, x1: p.x, y1: p.y, t: 0, dur: 0.55, wk }; P.cast = 0.7; P.iframe = Math.max(P.iframe, 0.5);
  monkLaughFx(true); sfx(300, 0.3, 'triangle', 0.03, 300);
}
function updateLeap(dt) {
  const L = P.kleap; if (!L) return;
  L.t += dt; const k = Math.min(1, L.t / L.dur);
  P.x = L.x0 + (L.x1 - L.x0) * k; P.y = L.y0 + (L.y1 - L.y0) * k; P.leapZ = Math.sin(k * Math.PI) * 30; P.path = null;
  if (k >= 1) {
    P.kleap = null; P.leapZ = 0; pushOut(P);
    const R = 1.5 + 1.6 * L.wk, dmg = KS.d('kmount', 20, 8) * (1 + 0.5 * L.wk);
    for (const m of kFoes(P.x, P.y, R)) { kHit(m, dmg, '#c9b48a', 'kmount'); kStun(m, 0.8); kFault(m); }
    G.kslams.push({ x: P.x, y: P.y, t: 0.6, kind: 'crater', R });
    G.kquake = { x: P.x, y: P.y, r: R * 0.6, max: R + 3, hit: new Set(), dmg: dmg * 0.4 };
    G.shake = Math.max(G.shake, 8); burst(P.x, P.y, '#8a7a5a', 30, 4); sfx(45, 0.8, 'square', 0.08, -10); sfx(120, 0.5, 'sawtooth', 0.05, -60);
    wtAdd(MONK_WT.kmount); mkShock(P.x, P.y, R + 1, '#2a2418', '#d8c8a0', 0.6, 5); mkFx({ k: 'crack', x: P.x, y: P.y, R: R + 0.6, n: 10, seed: Math.random() * 6, t: 2, t0: 2, glint: '#ffb060' }); mkFx({ k: 'dust', x: P.x, y: P.y, seed: 3, t: 0.8, t0: 0.8 });
    for (let i = 0; i < 16; i++) { const an = Math.random() * 6.283, sp = rand(2, 5); mkFx({ k: 'rock', x: P.x, y: P.y, z: 4, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, vz: rand(40, 80), t: 1, t0: 1 }); }
  }
}
function updateQuake(dt) {
  const Q = G.kquake; if (!Q) return;
  Q.r += 7 * dt;
  for (const m of G.zone.monsters) { if (m.dead || m.hidden || Q.hit.has(m)) continue; const d = Math.hypot(m.x - Q.x, m.y - Q.y); if (Math.abs(d - Q.r) < 0.5 + m.r) { Q.hit.add(m); kHit(m, Q.dmg, '#c9b48a', 'kmount'); if (P.skills.kmount2 > 0) kStun(m, 1); } }
  for (let i = 0; i < 3; i++) { const a = Math.random() * 6.283; G.kspikes.push({ x: Q.x + Math.cos(a) * Q.r, y: Q.y + Math.sin(a) * Q.r, t: 0.45, max: 0.45, h: rand(5, 9), small: true }); }
  if (Q.r >= Q.max) G.kquake = null;
}
function castStep(a) {
  const base = Math.atan2(a.y - P.y, a.x - P.x), angs = P.skills.kstep2 > 0 ? [base, base - 0.35, base + 0.35] : [base];
  for (const ang of angs) G.kstepQ.push({ x: P.x, y: P.y, dx: Math.cos(ang), dy: Math.sin(ang), i: 0, n: 11, tick: 0, dmg: KS.d('kstep', 15, 6.5) * (ang === base ? 1 : 0.7), hit: new Set() });
  G.shake = Math.max(G.shake, 4); sfx(60, 0.5, 'square', 0.06, -20);
}
function updateStep(dt) {
  for (const q of G.kstepQ) {
    q.tick -= dt; if (q.tick > 0) continue; q.tick = 0.045; q.i++;
    const x = q.x + q.dx * (0.4 + q.i * 0.6), y = q.y + q.dy * (0.4 + q.i * 0.6), t = G.zone.get(Math.floor(x), Math.floor(y));
    if (t === T.WATER || t === T.SHALLOW || G.zone.solidAt(x, y) && t !== T.ROCK) { q.i = q.n; burst(x, y, '#8ab0c0', 6, 1.2); continue; }
    const road = t === T.ROAD || t === T.FLAGS;
    G.kspikes.push({ x, y, t: 0.6, max: 0.6, h: road ? 14 : 11, road });
    for (const m of kFoes(x, y, 0.75)) { if (q.hit.has(m)) continue; q.hit.add(m); kHit(m, q.dmg * (road ? 2 : 1), '#c9b48a', 'kstep'); kStun(m, 0.4); }
    if (q.i % 3 === 0) sfx(100 + q.i * 8, 0.08, 'square', 0.025, -40);
  }
  G.kstepQ = G.kstepQ.filter(q => q.i < q.n);
}
function castPagoda(a) {
  const m = kNear(a, 2.2) || kNear(P, 7, q => Math.hypot(q.x - a.x, q.y - a.y) < 3.5);
  if (!m) { say('No enemy near the cursor', 1); P.mana += skillCost('kpagoda'); return; }
  G.kpagodas.push({ m, x: m.x, y: m.y, t: 0, dur: 2.2, dmg: KS.d('kpagoda', 34, 13), r: m.r });
  kStun(m, 2.3); kRoot(m, 2.3); G.shake = Math.max(G.shake, 3); sfx(80, 0.4, 'square', 0.05, 40); sfx(70, 0.3, 'square', 0.05, 20);
}
function updatePagodas(dt) {
  for (const p of G.kpagodas) {
    p.t += dt; const m = p.m; if (m && !m.dead && p.t < p.dur) { m.x = p.x; m.y = p.y; }
    if (p.t >= p.dur && !p.done) {
      p.done = true; sfx(2400, 0.04, 'square', 0.03, -1000);   // the snap of his fingers
      setTimeout(() => sfx(60, 0.6, 'square', 0.07, -20), 60);
      if (m && !m.dead) kHit(m, p.dmg, '#c9b48a', 'rubble');
      if (P.skills.kpagoda2 > 0) for (const q of kFoes(p.x, p.y, 2)) if (q !== m) kHit(q, p.dmg * 0.4, '#c9b48a', 'rubble');
      burst(p.x, p.y, '#8a867c', 30, 3); G.shake = Math.max(G.shake, 5);
    }
  }
  G.kpagodas = G.kpagodas.filter(p => p.t < p.dur + 0.6);
}
function updateThousand(dt) {
  const Th = G.kthousand; if (!Th) return;
  Th.t += dt; Th.tick -= dt; P.path = null;
  if (Th.t > 0.35 && Th.tick <= 0 && Th.n < Th.max) {
    Th.tick = 1.1 / Th.max; Th.n++;
    const L = 5.5;
    for (const m of G.zone.monsters) {
      if (m.dead || m.hidden) continue; const dx = m.x - P.x, dy = m.y - P.y, d = Math.hypot(dx, dy); if (d > L + m.r) continue;
      let da = Math.atan2(dy, dx) - Th.ang; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; if (Math.abs(da) > 0.85) continue;
      kHit(m, Th.dmg, Th.n % 2 ? '#ffd870' : '#b0aca0', 'kthousand');
      if (!m.kpulv) { m.kpulv = true; m.armor = Math.round(m.armor * 0.5); }
    }
    for (let i = 0; i < 4; i++) { const aa = Th.ang + rand(-0.8, 0.8), rr = rand(1.2, L), gold = Math.random() < 0.5; mkFx({ k: 'palm', x: P.x + Math.cos(aa) * rr, y: P.y + Math.sin(aa) * rr, z: rand(4, 24), sc: rand(1, 1.8), mat: gold ? 'mkGoldFx' : 'mkStoneFx', rgb: gold ? '255,210,110' : '200,196,186', t: 0.3, t0: 0.3 }); }
    for (let i = 0; i < 3; i++) { const aa = Th.ang + rand(-0.8, 0.8), sa = iso(P.x, P.y), sb = iso(P.x + Math.cos(aa) * 3, P.y + Math.sin(aa) * 3), an = Math.atan2(sb.sy - sa.sy, sb.sx - sa.sx), ai = ((Math.round(an / 6.283 * 16) % 16) + 16) % 16; mkFx({ k: 'arm', x: P.x, y: P.y, z: 30 + rand(-10, 14), ai, kind: i % 2 ? 'palm' : 'fist', mat: Math.random() < 0.5 ? 'mkGoldFx' : 'mkStoneFx', dx: (sb.sx - sa.sx) * 1.2, dy: (sb.sy - sa.sy) * 1.2, t: 0.22, t0: 0.22 }); }
    if (Th.n % 2) sfx(100 + Math.random() * 80, 0.06, 'square', 0.03, -40);
    G.shake = Math.max(G.shake, 2);
  }
  if (Th.t > 1.8) G.kthousand = null;
}

// ---- the Weeping One Who Walks: a stone Buddha that follows, smashes and draws anger
function summonBuddha(a) {
  const p = clampCast(a, 5), st = KS.buddha(), mem = G.kbuddhaMem;
  let hp = st.max;
  if (mem) { const regen = (G.time - mem.at) * 0.01 * st.max; hp = Math.min(st.max, mem.frac * st.max + regen); }
  G.kbuddha = { isKBuddha: true, x: p.x, y: p.y, r: 0.62, hp: Math.max(st.max * 0.25, hp), max: st.max, face: 1, cd: 1, t: 0, state: 'rise', rise: 1, atk: null, tauntT: 0.5, order: null, walkD: 0 };
  G.kbuddhaMem = null; G.shake = Math.max(G.shake, 5); burst(p.x, p.y, '#8a867c', 30, 3); sfx(50, 1.2, 'square', 0.06, 10); say('The Weeping One rises', 1.5);
}
function commandBuddha(a) {
  const b = G.kbuddha; if (!b) return;
  if (Math.hypot(b.x - a.x, b.y - a.y) < 1.4) { G.kbuddhaMem = { frac: b.hp / b.max, at: G.time }; burst(b.x, b.y, '#8a867c', 24, 2.4); G.kbuddha = null; say('The Weeping One sinks back into the earth (it keeps its wounds)', 1.6); sfx(60, 0.6, 'square', 0.04, -30); P.cast = 0.3; return; }
  b.order = { x: a.x, y: a.y, t: 4 }; b.atk = null; floatText(b.x, b.y - 0.8, 'go', '#b0aca0'); P.cast = 0.2;
}
function hurtBuddha(b, dmg) {
  if (b !== G.kbuddha) return;
  b.hp -= dmg * 0.8; b.hurt = 0.12;
  if (b.hp <= 0) { burst(b.x, b.y, '#8a867c', 40, 3.5); burst(b.x, b.y, '#bfe8ff', 10, 2); G.kbuddhaMem = { frac: 0.5, at: G.time }; G.kbuddha = null; say('The Weeping One crumbles', 1.6); sfx(40, 1.2, 'square', 0.07, -10); G.shake = Math.max(G.shake, 5); }
}
function updateBuddha(dt) {
  const b = G.kbuddha; if (!b) return;
  const st = KS.buddha(); b.max = st.max; b.t += dt; b.cd -= dt; if (b.hurt > 0) b.hurt -= dt;
  if (b.rise > 0) { b.rise -= dt; return; }
  b.tauntT -= dt;
  if (b.tauntT <= 0) { b.tauntT = 3; let n = 0; for (const m of kFoes(b.x, b.y, 5)) { m.ktaunt = 3; if (m.state === 'idle') m.state = 'chase'; n++; } if (n) { kRing(b.x, b.y, 5, 'rgba(176,172,160,0.5)', 0.5); sfx(80, 0.3, 'triangle', 0.03, 0); } }
  const ox = b.x, oy = b.y;
  if (b.atk) {
    b.atk.t += dt;
    if (b.atk.t >= 0.55 && !b.atk.done) {
      b.atk.done = true; const hx = b.x + b.atk.dx * 0.9, hy = b.y + b.atk.dy * 0.9;
      for (const m of kFoes(hx, hy, 1.5)) { kHit(m, st.dmg, '#b0aca0', 'kweep'); kStun(m, P.skills.kweep2 > 0 ? 1 : 0.35); }
      G.kslams.push({ x: hx, y: hy, t: 0.5, kind: 'crater', R: 1.4 }); G.shake = Math.max(G.shake, 4); sfx(55, 0.4, 'square', 0.06, -20);
    }
    if (b.atk.t > 1.0) { b.atk = null; b.cd = 0.9; }
    return;
  }
  if (b.order) { b.order.t -= dt; const d = Math.hypot(b.order.x - b.x, b.order.y - b.y); if (d < 0.4 || b.order.t <= 0) b.order = null; else { stepToward(b, b.order.x, b.order.y, 2.6 * dt); b.face = (b.order.x - b.order.y) > (b.x - b.y) ? 1 : -1; } }
  else {
    const tg = kNear(b, 7, m => dist(m, P) < 11);
    if (tg) {
      const d = dist(tg, b); b.face = (tg.x - tg.y) > (b.x - b.y) ? 1 : -1;
      if (d > 1.1 + tg.r) stepToward(b, tg.x, tg.y, 2.4 * dt);
      else if (b.cd <= 0) { const L = d || 1; b.atk = { t: 0, dx: (tg.x - b.x) / L, dy: (tg.y - b.y) / L }; }
    } else if (dist(b, P) > 2.2) { stepToward(b, P.x, P.y, 2.8 * dt); b.face = (P.x - P.y) > (b.x - b.y) ? 1 : -1; }
    else if (b.hp < b.max) b.hp = Math.min(b.max, b.hp + b.max * 0.01 * dt);
  }
  b.walkD += Math.hypot(b.x - ox, b.y - oy);
  if (dist(b, P) > 16) { b.x = P.x + 1; b.y = P.y; if (G.zone.solidAt(b.x, b.y)) { b.x = P.x; b.y = P.y; } }
}

// ------------------------------------------------------------------- the hooks into the shared game
{
  const _cs = castSkill;
  castSkill = function (id, pt) { if (SK[id] && SK[id].cls === 'monk') { monkCast(id, losPoint(pt || aimPoint())); return; } return _cs(id, pt); };
  const _der = derive;
  derive = function () {
    const d = _der(); if (!isMonk()) return d;
    d.wispCap = 0; d.itemWisps = 0; d.wardPct = 0;
    // fists (bare or wrapped) grow with him; the heavier he is the harder they land
    if (fistOn()) { d.wmin += 1 + P.level * 0.5; d.wmax += 2 + P.level * 0.8; }
    // Weight: heavy is slow of foot and hand and very hard to shift; light is quick on both
    const h = KS.wH(), l = KS.wL();
    d.moveSpd *= (1 - 0.18 * h) * (1 + 0.25 * l) * (P.kobsid > 0 && !P.kpoise ? 0.85 : 1) * (P.kwalk ? 1.1 : 1);
    d.castSpd *= (1 - 0.06 * h) * (1 + 0.25 * l);
    d.maxStam = Math.round(d.maxStam * (1 + 0.5 * h));
    if (P.kobsid > 0) d.armor += 30;
    return d;
  };
  const _defK = defaultKeys;
  defaultKeys = function (cls) { if ((cls || P.cls) === 'monk') return { q: 'kstar', w: 'kpalm', e: 'khands', r: 'kfist', t: 'kclap', y: 'kmount', u: 'kbelow', f: 'kgrip' }; return _defK(cls); };
  const _defR = defaultRight;
  defaultRight = function (cls) { return (cls || P.cls) === 'monk' ? 'attack' : _defR(cls); };
  const _mi = miasInfo;
  miasInfo = function (id) { return _mi(id) || monkInfo(id); };
  const _ar = arcRooted;
  arcRooted = function () { return _ar() || (isMonk() && !!(P.klotus || P.keye || P.kleap || G.kflurry || G.kpalm || G.kthousand)); };
  const _up = updatePlayer;
  updatePlayer = function (dt) { _up(dt); if (isMonk() && !P.dead && G.zone) { try { updateMonk(dt); } catch (e) { reportError(e); } } };
  const _ud = updateDay;
  updateDay = function (dt) { if (G.skyForce) { G.skyForce.t -= dt; if (G.skyForce.t <= 0) endSky(); } if (P.kskyCd > 0) P.kskyCd -= dt; if (G.kflash) { G.kflash.t -= dt; if (G.kflash.t <= 0) G.kflash = null; } _ud(dt); };
  // the sky he holds: the clock's phase is overridden, so the light, the hours and the creatures all follow
  const _dp = dayPhase;
  dayPhase = function () { const f = G.skyForce; if (f) return f.kind === 'night' ? 0.78 : 0.3; return _dp(); };
  // a False Dawn drags the things that hide from the day into it
  const _uh = updateHours;
  updateHours = function (dt) { _uh(dt); if (G.skyForce && G.skyForce.kind === 'noon' && G.zone) for (const m of G.zone.monsters) if (m.kreveal > 0 && m._timeHidden) { m._timeHidden = false; m.hidden = false; } };
  // Mountain Flesh: his poise drains, but it never breaks
  const _pph = playerPoiseHit;
  playerPoiseHit = function (d, fx, fy) {
    if (!isMonk()) return _pph(d, fx, fy);
    if (P.dead || d <= 0) return;
    if (P.kpoise) { if (Math.random() < 0.3) floatText(P.x, P.y - 0.7, 'unmoved', '#f0d070'); return; }   // perfect poise: nothing shakes him
    return _pph(d * (1 - 0.3 * KS.wH()) * (1 + 0.2 * KS.wL()), fx, fy);
  };
  const _hp = hurtPlayer;
  hurtPlayer = function (dmg, type, fx, fy) {
    if (!isMonk()) return _hp(dmg, type, fx, fy);
    if (P.knothing > 0) return;
    if (P.ksun > 0 && type === 'phys') { floatText(P.x, P.y - 0.8, 'untouched', '#ffd870'); return; }
    if (type === 'phys') dmg *= 1 - KS.dr();
    if (P.klotus || P.kobsid > 0) dmg *= 0.85;
    const x = P.x, y = P.y; _hp(dmg, type, fx, fy);
    // knockback: heavy barely moves, light is thrown further; perfect poise, the fortress and the lotus not at all
    const kb = P.kpoise || P.skills.kbar > 0 || P.klotus ? 0 : (1 - 0.6 * KS.wH()) * (1 + 0.3 * KS.wL());
    P.x = x + (P.x - x) * kb; P.y = y + (P.y - y) * kb;
    if (P.cast <= 0 && !P.path) wtAdd(2);   // taking a blow on his feet: a heavy action
  };
  const _ht = hitTarget;
  hitTarget = function (T, dmg, type, fx, fy, src) {
    if (T && T.isKBuddha) { hurtBuddha(T, dmg); return; }
    if (T === P && isMonk() && !P.dead) {
      if (P.knothing > 0) return;
      if (src && src.kweak > 0) dmg *= 0.6;
      const melee = type === 'phys' && src && !src.dead && dist(src, P) < 2.6;
      if (melee && P.kmirror > 0) {
        const k = P.skills.kmirror2 > 0 ? 3 : 2; G.kslams.push({ x: src.x, y: src.y, t: 0.35, kind: 'mirror', face: src.face || 1 }); kHit(src, dmg * k, '#6a5a8a', 'kmirror');
        floatText(P.x, P.y - 0.6, 'swallowed', '#8a7aa8'); sfx(180, 0.2, 'sawtooth', 0.04, -120); return;
      }
      if (melee && G.kbell) { dmg *= 0.3; bellRing(src); }
      if (melee && P.skills.kbarthorn > 0) kHit(src, dmg * 0.2, '#b0aca0', 'kbar');
    }
    return _ht(T, dmg, type, fx, fy, src);
  };
  // missiles: the bell stops them, the bowl swallows them, the stone Buddha takes them
  const _msh = miasShotHit;
  miasShotHit = function (s) {
    if (_msh(s)) return true;
    if (!isMonk() || s.friendly) return false;
    const b = G.kbuddha; if (b && b.rise <= 0 && Math.hypot(b.x - s.x, b.y - s.y) < b.r + (s.r || 0.15)) { hurtBuddha(b, s.dmg); return true; }
    if (P.dead) return false;
    const d = Math.hypot(P.x - s.x, P.y - s.y);
    if (G.kbell && d < 1.7 && d > 1.2) { burst(s.x, s.y, '#f0d890', 5, 1.2); bellRing(null); return true; }
    if (P.skills.kbowl > 0 && d < P.r + (s.r || 0.15) + 0.25) {
      const fv = monkFacing(), sp = Math.hypot(s.vx, s.vy) || 1, front = -(s.vx * fv.x + s.vy * fv.y) / sp > 0.2;
      if ((front || P.skills.kbowlw > 0) && Math.random() < KS.bowlChance()) {
        P.kbowl = Math.min(6, P.kbowl + 1); floatText(P.x, P.y - 0.5, 'into the bowl', '#c9a66b'); sfx(700, 0.08, 'triangle', 0.02, -300);
        if (P.kbowl >= 6) drinkBowl(); return true;
      }
    }
    return false;
  };
  // monsters: the Weeping One draws them, an eclipse hides him, One-With-Nothing removes him
  const _mt = monTarget;
  monTarget = function (m) {
    const b = G.kbuddha;
    if (isMonk() && b && b.rise <= 0 && (m.ktaunt > 0 || P.knothing > 0) && dist(m, b) < 9) return b;
    return _mt(m);
  };
  const _um = updateMon;
  updateMon = function (m, dt, dp) {
    if (isMonk()) {
      if (m.ktaunt > 0) m.ktaunt -= dt; if (m.kweak > 0) m.kweak -= dt; if (m.kdazzle > 0) m.kdazzle -= dt;
      if (m.kdarkOff > 0) { m.kdarkOff -= dt; if (m.kdarkOff <= 0) m.dark = true; }
      if (m.kcutT > 0) { m.kcutT -= dt; if (m.kcutT <= 0) { m.armor += m.kcutA || 0; m.kcutT = 0; } }
      if (m.kstone > 0) { m.kstone -= dt; m.hurt = 0; }
      if (m.kshadow) { const S = m.kshadow; S.t -= dt; S.tick -= dt; if (S.tick <= 0) { S.tick = 0.5; kHit(m, S.dps * 0.5, '#8a7aa8', 'kspade'); } if (S.t <= 0) m.kshadow = null; }
      if (m.dead) return;
      // unseen: he does not exist, so there is nothing to fight (the Weeping One excepted)
      if (P.knothing > 0 && !(G.kbuddha && dist(m, G.kbuddha) < 9)) { m.hurt = Math.max(0, m.hurt - dt); if (m.state !== 'idle') { m.state = 'idle'; m.path = null; } return; }
      // under his eclipse they lose sight of him past 6 yd (4 with Blind Dark)
      if (G.skyForce && G.skyForce.kind === 'night' && m.state !== 'idle' && m.rank !== 'boss' && m.tgt === P && dp > (P.skills.kecl3 > 0 ? 4 : 6)) { m.state = 'idle'; m.path = null; return; }
      if (G.skyForce && G.skyForce.kind === 'night' && m.state === 'idle' && dp > (P.skills.kecl3 > 0 ? 4 : 6)) return;
    }
    return _um(m, dt, dp);
  };
  // his kills vitrify: glass, dust, rubble or red mist, never a corpse
  const _km = killMon;
  killMon = function (m) {
    if (m.dead) return;
    const src = G.kSrc, mine = isMonk();
    _km(m);
    if (!mine) return;
    P.kKillT = 0; P.kMultiT = 0.6;
    if (src === 'kamber' && P.skills.kash > 0) P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.03);
    if (m.rank === 'boss') return;
    const kind = src === 'dust' || src === 'kpinch' ? 'dust' : src === 'kthousand' ? 'mist' : src === 'rubble' || m.kstone > 0 || src === 'kpagoda' || src === 'kgrip' ? 'rubble' : 'glass';
    m.hatched = m.eaten = m.burst = m.drained = m.echoed = m.infected = true; m.erased = true; m.kvitr = kind;
    G.kglass.push({ x: m.x, y: m.y, r: m.r, t: kind === 'glass' ? 14 : kind === 'rubble' ? 10 : 2.2, max: kind === 'glass' ? 14 : kind === 'rubble' ? 10 : 2.2, kind, seed: Math.random() * 99, spr: m.b.spr });
    while (G.kglass.length > 40) G.kglass.shift();
    if (kind === 'mist') burst(m.x, m.y, '#a01828', 26, 3); else if (kind === 'dust') burst(m.x, m.y, '#b0aca0', 22, 2.4); else if (kind === 'rubble') burst(m.x, m.y, '#8a867c', 20, 2.6); else { burst(m.x, m.y, '#0c0a12', 14, 2); burst(m.x, m.y, '#e8e2ff', 4, 1.5); }
  };
  // Grip-Of-Old-Stone: the next blow on the weeping stone shatters it
  const _hm = hurtMon;
  hurtMon = function (m, dmg, col) {
    if (isMonk() && m && !m.dead && m.kstone > 0 && G.kSrc !== 'kgrip' && !G.kShatter) {
      m.kstone = 0; m.stun = Math.min(m.stun || 0, 0.05); m.root = 0; G.kShatter = true;
      const was = G.kSrc; G.kSrc = 'rubble';
      try { _hm(m, dmg + KS.d('kgrip', 26, 11), '#b0aca0'); } finally { G.kSrc = was; G.kShatter = false; }
      burst(m.x, m.y, '#8a867c', 18, 2.6); floatText(m.x, m.y - 0.4, 'shattered', '#b0aca0'); sfx(70, 0.4, 'square', 0.06, -30); G.shake = Math.max(G.shake, 3);
      return;
    }
    return _hm(m, dmg, col);
  };
  // every punch of the basic attack
  const _as = arcSwing;
  arcSwing = function (m) { _as(m); if (isMonk()) wtAdd(-1.5); if (isMonk() && m && !m.dead) { kFault(m); if (monkWpn() === 'shakujo') sfx(1800 + Math.random() * 300, 0.12, 'triangle', 0.012, 0); G.kslams.push({ x: m.x, y: m.y, z: 10, t: 0.16, kind: monkWpn() === 'spade' ? 'arc' : 'palm', a: Math.atan2(m.y - P.y, m.x - P.x), R: 0.8 }); } };
  const _ms = meleeReach;
  meleeReach = function () { return _ms() + (isMonk() ? monkReach() : 0); };
  // Walks-Without-Feet: mud and water do not slow him
  const _ts = terrainSpd;
  terrainSpd = function (o) { if (o === P && isMonk() && (P.kwalk || P.ksun > 0 || P.kpoise)) return 1; return _ts(o); };
  // rolling is a light action
  const _tr = tryRoll;
  tryRoll = function () { const r0 = P.roll; const r = _tr.apply(this, arguments); if (isMonk() && P.roll > r0) wtAdd(-12); return r; };
  // light: by day he is the light (the biggest lamp in the game); at night his black flame shrinks it, but shows him everything inside it
  const _hl = heroLightR;
  heroLightR = function () { const r = _hl(); if (!isMonk()) return r; const k = KS.skyK(); return k == null ? r : k > 0.5 ? r + 3.5 * k : r * 0.8; };
  const _ll = lightLevel;
  lightLevel = function (x, y) {
    if (!isMonk() || !G.skyForce || G.skyForce.kind !== 'night' || !G.zone) return _ll(x, y);
    // every light but his own gutters
    const hr = heroLightR(), d = Math.hypot(x - P.x, y - P.y); return clamp(0.02 + (d < hr ? Math.max(0, 1 - d / hr) * 1.1 : 0), 0, 1);
  };
  const _mv = monVisibility;
  monVisibility = function (m) { if (isMonk() && !P.dead) { const k = KS.skyK(); if (k != null && k < 0.5 && dist(m, P) < heroLightR() + 1) return 1; if (m.kreveal > 0) return 1; } return _mv(m); };
  // new characters and the test character
  const _nc = newCharacter;
  newCharacter = function () { _nc(); if (P.cls === 'monk') { P.eq = { weapon: newBaseItem('wraps') }; P.keys = defaultKeys('monk'); resetMonk(); } };
  const _tc = testCharacter;
  testCharacter = function () {
    _tc(); if (P.cls !== 'monk') return;
    const roll = base => { let it = null; for (let i = 0; i < 400; i++) { it = rollItem(12, 300); if (it.base === base && (it.q === 'rare' || it.q === 'unique')) break; } if (!it || it.base !== base) it = newBaseItem(base); it.lvl = Math.min(it.lvl, 30); return it; };
    P.eq.weapon = roll('iwraps'); invAdd(roll('shakujo')); invAdd(roll('spade'));
  };
  const _die = die;
  die = function () { _die(); resetMonk(); };
  const _ez = enterZone;
  enterZone = function (id, pos, li) { _ez(id, pos, li); monkZone(); };
  // the sky he holds is shown by a crack across the dial; it snaps back with a bell
  const _sd = drawSkyDial;
  drawSkyDial = function () { _sd(); if (G.skyForce && G.running) drawSkyCrack(); };
}
function monkFacing() { const sx = P.face || 1, sy = P._fb ? -1 : 1, x = (sx + sy) / 2, y = (sy - sx) / 2, l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; }
function monkZone() {
  P.weight = 50; P.kpoise = false; P.kghost = []; G.kfx = []; G.kembers = []; G.kcall = null;
  G.kcones = []; G.kfists = []; G.kofuda = []; G.ktears = []; G.kgeysers = []; G.kbeams = []; G.kclaps = []; G.kshades = []; G.khands = []; G.kroots = []; G.kwaves = []; G.kspikes = []; G.kstepQ = []; G.kpagodas = []; G.kslams = []; G.kglass = []; G.kmarks = [];
  G.kflurry = null; G.kpalm = null; G.kthousand = null; G.kquake = null; P.kleap = null; P.leapZ = 0; P.klotus = null; P.keye = null;
  if (G.kbuddha) { G.kbuddha.x = P.x + 1; G.kbuddha.y = P.y; if (G.zone && G.zone.solidAt(G.kbuddha.x, G.kbuddha.y)) { G.kbuddha.x = P.x; G.kbuddha.y = P.y; } G.kbuddha.atk = null; G.kbuddha.order = null; }
}
function resetMonk() {
  monkZone(); G.kbell = null; G.kbuddha = null; G.kbuddhaMem = null; if (G.skyForce) G.skyForce = null;
  Object.assign(P, { weight: 50, kpoise: false, kKillT: 9, kamber: false, kwalk: false, kobsid: 0, kmirror: 0, knothing: 0, ksun: 0, kbowl: 0, kcd: {}, kskyCd: 0, khalo: 0, khaloT: 0 });
}

// ------------------------------------------------------------------- every frame
function updateMonk(dt) {
  // Weight follows what he does: moving lightens him, standing his ground settles him (the held and toggled skills below)
  P.kKillT += dt; if (P.kMultiT > 0) P.kMultiT -= dt; if (P.kposeT > 0) P.kposeT -= dt;
  const mv = P._kpx == null ? 0 : Math.hypot(P.x - P._kpx, P.y - P._kpy); P._kpx = P.x; P._kpy = P.y;
  const moving = mv > 0.004 && mv < 1 && !P.kleap;
  if (moving) { P.kstillT = 0; if (!P.kwalk && P.ksun <= 0) wtAdd(-3.6 * dt); }
  else if (P.cast <= 0 || P.klotus || G.kbell || P.kmirror > 0) { P.kstillT += dt; if (P.kstillT > 0.4) wtAdd((P.kbarHold ? 4.8 : 3) * dt); }
  if (P.kpoise) { P.stagger = 0; P.poiseGrace = Math.max(P.poiseGrace || 0, 0.1); }
  // heavy: every footfall stamps dust (and at perfect poise the ground cracks); light: he leaves afterimages
  const wb = monkWtBucket();
  if (moving) {
    const ph = Math.floor(P._wd * 4.4) % 8, foot = ph === 2 || ph === 6;
    if (foot && P.kstepPh !== ph && wb >= 2) { mkFx({ k: 'dust', x: P.x, y: P.y, seed: Math.random() * 6, t: 0.45, t0: 0.45 }); if (wb === 3) { mkFx({ k: 'crack', x: P.x, y: P.y, R: 1, n: 5, seed: Math.random() * 6, t: 1.4, t0: 1.4 }); G.shake = Math.max(G.shake, 1.5); } sfx(wb === 3 ? 55 : 75, 0.12, 'square', 0.03, -20); }
    P.kstepPh = ph;
    if (wb === 0) { P.kghostT -= dt; if (P.kghostT <= 0) { P.kghostT = 0.06; const [po, pph] = heroPose(); P.kghost.push({ x: P.x, y: P.y, pose: po, ph: pph, view: P._view || 'front', face: P.face || 1, lift: P.leapZ || 0, t: 0.3, t0: 0.3 }); if (P.kghost.length > 6) P.kghost.shift(); } }
  }
  mkUpdateFx(dt);
  for (const k in P.kcd) if (P.kcd[k] > 0) P.kcd[k] -= dt;
  // the halo of ofuda regrows
  if (P.skills.ksutra > 0) { const mx = KS.haloMax(); if (P.khalo < mx) { P.khaloT += dt; if (P.khaloT >= 1.4) { P.khaloT = 0; P.khalo++; } } else P.khaloT = 0; if (P.khalo > mx) P.khalo = mx; }
  // Amber-That-Eats-Itself
  if (P.kamber) {
    wtAdd(MONK_WT.kamber * dt); P.hp = Math.max(1, P.hp - D.maxHp * 0.01 * dt);
    P.kamberT -= dt; if (P.kamberT <= 0) { P.kamberT = 0.5; const R = KS.amberR(), d = KS.d('kamber', 6.5, 3) * 0.5; for (const m of kFoes(P.x, P.y, R)) kHit(m, d, '#ffcf70', 'kamber'); }
    if (Math.random() < 0.8) { const a = Math.random() * 6.283, r = Math.random() * KS.amberR(); parts.push({ x: P.x + Math.cos(a) * r, y: P.y + Math.sin(a) * r, z: rand(0, 6), vx: 0, vy: 0, vz: rand(14, 30), t: 0.5, col: Math.random() < 0.5 ? '#ffd870' : '#fff0c0' }); }
  }
  // Walks-Without-Feet
  if (P.kwalk) {
    P.mana -= 1.5 * dt; wtAdd(MONK_WT.kwalk * dt); if (P.mana <= 0) { P.mana = 0; P.kwalk = false; say('Your Essence gives out', 1); }
    P.kwalkT -= dt; if (P.kwalkT <= 0) { P.kwalkT = 1.2; G.kwaves.push({ x: P.x, y: P.y, t: 0, dur: 0.6, R: 2.8 }); const d = KS.d('kwalk', 7, 3.2); for (const m of kFoes(P.x, P.y, 2.8)) { kHit(m, d, '#6a5a8a', 'kwalk'); if (P.skills.kwalkw > 0) m.slow = Math.max(m.slow || 0, 0.5); } sfx(70, 0.3, 'sine', 0.03, -20); }
  }
  // Laughter-Without-Warmth
  if (P.skills.klaugh > 0) { P.klaughT -= dt; if (P.klaughT <= 0) { P.klaughT = KS.laughEvery(); if (G.zone.monsters.some(m => !m.dead && !m.hidden && dist(m, P) < KS.laughR() + 1)) laughPulse(); else P.klaughT = 0.5; } }
  // timers
  if (P.kobsid > 0) { P.kobsid -= dt; if (P.kobsid <= 0) { floatText(P.x, P.y - 0.6, 'the stone softens', '#8a86a0'); P.kobsid = 0; } }
  if (P.kmirror > 0) P.kmirror -= dt;
  if (P.knothing > 0) {
    P.knothing -= dt; P.iframe = Math.max(P.iframe, 0.1);
    for (const m of kFoes(P.x, P.y, 1.6)) if (!G.kmarks.includes(m)) { G.kmarks.push(m); floatText(m.x, m.y - 0.3, 'marked', '#9a94a8'); }
    if (P.knothing <= 0) endNothing();
  }
  if (G.kbell) { const B = G.kbell; B.t -= dt; if (B.cd > 0) B.cd -= dt; if (B.ring > 0) B.ring -= dt; if (B.drop > 0) B.drop -= dt; if (B.t <= 0) { G.kbell = null; sfx(330, 0.5, 'sine', 0.03, -100); } }
  // the chokepoint: standing in a door or a narrow pass, nothing small presses past
  if (P.skills.kbar > 0) {
    const z = G.zone, x = Math.floor(P.x), y = Math.floor(P.y), s = (i, j) => z.solidAt(x + i + 0.5, y + j + 0.5);
    P.kbarHold = (s(-1, 0) && s(1, 0) && !s(0, -1) && !s(0, 1)) || (s(0, -1) && s(0, 1) && !s(-1, 0) && !s(1, 0));
    if (P.kbarHold) for (const m of kFoes(P.x, P.y, 1.2)) { if (m.r >= 0.5 || m.rank === 'boss' || m.fly || m.ghost) continue; const d = dist(m, P) || 1, need = m.r + P.r + 0.35; if (d < need) moveCircle(m, (m.x - P.x) / d * (need - d), (m.y - P.y) / d * (need - d)); }
  } else P.kbarHold = false;
  // the float: lotus, sun, walking on nothing
  if (!P.kleap) { const want = P.ksun > 0 ? 16 + Math.sin(G.time * 2) * 2 : P.klotus ? 7 + Math.sin(G.time * 2.4) * 1.2 : P.kwalk ? 2 + Math.sin(G.time * 3) * 0.6 : 0; P.leapZ = (P.leapZ || 0) + (want - (P.leapZ || 0)) * Math.min(1, dt * 6); if (Math.abs(P.leapZ) < 0.05) P.leapZ = 0; }
  updateFlurry(dt); updateCones(dt); updateFists(dt); updateOfuda(dt); updateTears(dt); updateEye(dt); updateLotus(dt); updateSun(dt);
  updatePalm(dt); updateHands(dt); updateRoots(dt); updateLeap(dt); updateQuake(dt); updateStep(dt); updatePagodas(dt); updateThousand(dt); updateBuddha(dt);
  for (const q of G.kclaps) q.t += dt; G.kclaps = G.kclaps.filter(q => q.t < q.dur);
  for (const q of G.kwaves) q.t += dt; G.kwaves = G.kwaves.filter(q => q.t < q.dur);
  for (const q of G.kbeams) q.t -= dt; G.kbeams = G.kbeams.filter(q => q.t > 0);
  for (const q of G.kshades) { q.t -= dt; q.x += q.vx * dt; q.y += q.vy * dt; } G.kshades = G.kshades.filter(q => q.t > 0);
  for (const q of G.kspikes) q.t -= dt; G.kspikes = G.kspikes.filter(q => q.t > 0);
  for (const q of G.kslams) q.t -= dt; G.kslams = G.kslams.filter(q => q.t > 0);
  for (const q of G.kglass) q.t -= dt; G.kglass = G.kglass.filter(q => q.t > 0);
  // hold to repeat the quick melee skills
  if (P.cast <= 0 && P.roll <= 0 && !P.approach) for (const id of ['kspade', 'kfinger', 'kstar']) if (P.skills[id] > 0 && heldSkill(id)) { monkCast(id); break; }
}
window.__monk = { KS, SK, hourOf: () => hourOf(), tabNames: () => tabNames(), monkCast, turnSky, endSky, resetMonk, isRaised, updateMonk, summonBuddha };
