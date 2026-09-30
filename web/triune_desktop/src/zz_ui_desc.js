
// =================================================================== skill descriptions: lore by default, numbers on Shift
// Board id `desc`. Every skill tooltip of every class now opens as a short souls-like piece of lore (two to four
// lines) with "Hold Shift for details" under it. Holding Shift (or the MORE stud, on touch) turns it into plain,
// numeric information: what it does, what it costs in the class's own resource, its numbers now and at the next level,
// how it is used, what it scales with (synergies, stats, perks), and what it needs.
// Nothing here changes a skill. Every number is pulled live from the game's own functions (skillInfo, skillCost,
// bloodLifeCost, synBonus, perkOn, BS/MS/KS/WS tables) each frame, so balance changes made elsewhere show up on their own.
// Flavour text is keyed by skill id AND its current name: if another agent renames a skill (the Weaver's mirror skills
// are being redesigned), the tooltip falls back to that skill's own description instead of stale lore.
{
  // ---------------------------------------------------------------- lore: [name it was written for, text]
  const LORE = {
    // ---- the Weaver of Mirrors (animancer): Yh'Anuul, the Last Breath
    pillars: ['Standing Mirrors', 'Toli posts of the Forty, planted before every yurt so the dead would see their faces and stay. A soul cannot pass its own reflection. Neither can a blow.'],
    golem: ['Iron Golem', 'The Pir\'s coat of iron and three hundred mirrors, standing empty. It was never alive, so it cannot die. A killing blow strikes only a reflection.'],
    fissure: ['Mirror Fissure', 'In the forest a broken mirror means a death within the year. The Mystic breaks them on purpose, and lets the year come early.'],
    toss: ['Mirror Shield', 'The Great Toli, mother-mirror of the Forty, big as a yurt door. The iron throws it like a full moon laid flat, and it always comes home.'],
    challenge: ['Dazzling Challenge', 'Polished iron shows the attacker its own face. Few things can bear to look away.'],
    cage: ['Hall of Mirrors', 'The old shrines kept halls of mirror-mosaic where a lost soul could wander forever. The Mystic raises one wherever he pleases.'],
    thorns: ['Reflection', 'The dervishes taught that a polished heart returns what is thrown at it. The iron learned the lesson better than the men did.'],
    overcharge: ['Overcharge', 'The coat remembers being worn. Pour enough of the dead into it and it dances the Pir\'s last dance, white and burning, until it bursts.'],
    anvil: ['Falling Mirror', 'A mirror dropped from the sky, as the Pir fell from the crown of Bayterek. What lies beneath learns how heavy a reflection can be.'],
    forge: ['Quicksilver Heart', 'The first Pir polished her heart-mirror with one breath for every day of her life. Glass that has drunk so much breath is slow to break.'],
    wisps: ['Wisps', 'The aruaq: dead whose fortieth night never came. They circle the Mystic because he showed them their own faces, and they could not leave.'],
    restless: ['Restless Dead', 'Zalozhnye, the forest word for those who died before their time. They are in a hurry still, though there is nowhere left to go.'],
    beam: ['Darting Wisps', 'The steppe keeps a lamp burning forty nights in the house of the dead. Some souls never learned to stop burning.'],
    cull: ['Cull', 'Loosed like a hunting eagle from the glove. The dead stoop on the living, take their due, and return to the Mystic\'s arm.'],
    condense: ['Condense', 'An ongon is a vessel for spirits, carved or sewn. The Mystic needs no doll. He presses the dead together until they are one great soul.'],
    prism: ['Splitting Wisps', 'Souls caught in a mirror as it shattered. Each piece remembers being whole, and no two of them agree on how.'],
    leash: ['Soul Leash', 'The steppe lasso, woven of anima. What it binds, the Mystic keeps. What it feeds, grows quick.'],
    totem: ['Soul Lantern', 'The unquenched lamp the forest hermits kept before the stopped clock. In its light every living thing is already half mourned.'],
    choir: ['Choir Mastery', 'May the spirits uphold you, goes the old steppe blessing. His dead take it as an order.'],
    animam: ['Anima Mastery', 'Rope, lantern and great soul remember whose breath first filled them, and answer it more readily.'],
    swarm: ['Soul Swarm', 'Hu, the last syllable of the dhikr, breathed from the belly. The dead ride it out, and they do not come back.'],
    ward: ['Spirit Ward', 'Tumar: a silver amulet with a prayer sewn inside. The prayer is spent before the flesh is.'],
    lance: ['Spirit Dart', 'The silent glow of northern nights, leaping cloud to cloud and never heard. It stops at nothing but a mirror, and a mirror only makes it brighter.'],
    wraith: ['Wraith Form', 'Sayr, the journey. The part of a shaman that climbs the tree goes walking in daylight, and no blade can find it.'],
    storm: ['Soul Storm', 'Boran, the blizzard of the White Steppe. On other days it is made of snow.'],
    mark: ['Mark of Logos', 'Pechat\', the seal: a forest charm spoken low and fast. The marked are already counted among the dead.'],
    orb: ['Aether Orb', 'One long note of the qobyz, bowed across two strings of the god\'s own hair. It rolls away moaning and breaks into echoes.'],
    word: ['Word of Unmaking', 'What the Silence un-says, the Mystic says again, out loud. This one word he borrowed from the other side.'],
    chain: ['Chain of Logos', 'White speech leaping mouth to mouth, as rumour runs through the winter camps. It weakens with every telling.'],
    nmastery: ['Logos Mastery', 'Zikr, the remembrance. Say a name enough times and it cannot be un-said.'],
    // ---- the Ossuarch (ossumancer): Oss-Vharoth, the Bearing Mother (Pale Order voice, 2026-09-29)
    offering: ['Bone Offering', 'The brothers leave a bone at the foot of the stair for the Mother, and in the morning it is gone. Nobody takes it. The Count rises by one.'],
    raise: ['Raise Skeleton', 'The anointed dead stand in their niches facing the stair, and step down when a brother asks. He has only ever had to ask once.'],
    banner: ['Grave Banner', 'A standard of long bones lashed in a frame, carried before the knights on the low road. The dead march better for having something to face.'],
    tithe: ['Grave Tithe', 'Every death on the Hide owes the Mother its frame. The Order is patient about the debt, and never forgets a number.'],
    unearth: ['Unearth', 'The shallow dead of the lowlands were laid without a name or a number. They come up gladly for anyone who will give them one.'],
    colossus: ['Ossuary Colossus', 'Where one wall of an ossuary is counted too often, the niches empty into a single shape. It stands as tall as the wall stood, and a little taller each time.'],
    horn: ['War Horn', 'A horn of hollow thighbone, sounded once at the Feast of the Laying. Every niche on the stair turns toward it. Some turn before it is blown.'],
    bward: ['Shield of Bones', 'The standing dead keep the vigil. Here they keep it round one man, facing out, as they face the stair.'],
    reasm: ['Reassemble', 'Bone keeps its place. Scatter it and it finds its way back, joint to joint, the way water finds the low ground.'],
    legion: ['Bone Legion', 'Two hundred and six of the dead, one for every knot on his cord. The root is eight, an open count, and so they keep coming until it closes.'],
    spear: ['Bone Spear', 'A long bone, anointed and loosed. It goes where it is pointed and through what is in the way, and the brothers write down what it passed through.'],
    siphon: ['Marrow Siphon', 'The warden\'s chrism is drawn from wells under the ossuaries, warm however long it is kept. The living have marrow too. It comes up the same way.'],
    ribcage: ['Rib Cage', 'The Rib Pass runs under one rib of the Mother. Smaller ribs will serve for smaller passes, and smaller graves.'],
    ossify: ['Ossify', 'The fewer is the holier. The flesh is quick to forget and the bone is slow, and this rite asks the flesh to hurry.'],
    wall: ['Bone Arms', 'Under every road on the Hide the dead lie closer than anyone likes to think. They reach up for company.'],
    spikes: ['Bone Spikes', 'Every enemy carries a frame. The Ossuarch only asks it to come out and be counted.'],
    sstorm: ['Shard Storm', 'He loosens the cord of his tallies and lets every notch go at once. What they strike is written down.'],
    bonerain: ['Bone Rain', 'The Order teaches that the stars are the Mother\'s bones not yet fallen to rest, and that the Count cannot close until they come down. He asks them to come down early. They fall straight, and cold, and the brothers go out after with sacks.'],
    spirit: ['Grave Spirit', 'Some skulls on the stair would not stop speaking their number. The brothers learned to point them.'],
    marrowm: ['Marrow Mastery', 'A warden learns to draw the chrism thin and burn it slow, and to see by very little light, as the old halls were made to be seen by.'],
    barmor: ['Bone Armor', 'His plate carries more bone each year than the year before. The armourers of the Ossa say they did not put it there.'],
    aura: ['Shard Aura', 'Loose dust circles a Warden the way it circles the Sky Pogost at first light, rising, and keeping on rising.'],
    blade: ['Bone Blade', 'A long knife from the old halls, made for a hand with more joints than ours. Each year it sits heavier in the grip, and longer.'],
    gcharge: ['Grinding Charge', 'The standing dead of the Ossa once went up a stair of the Peak in a single night. Nothing on the stair stopped them. Nothing on the stair is left.'],
    crush: ['Marrow Crush', 'In the lowest halls the builders left a weight that no two brothers have ever lifted. He has found a way to let it fall.'],
    host: ['Bone Host', 'The dead ride him the way the dust rides the wind: close, patient, counting. He stands taller for every one of them.'],
    bscythe: ['Scythe Sweep', 'The sweeper\'s broom and the reaper\'s blade are one office, say the old brothers. Both clear the floor.'],
    leap: ['Grave Leap', 'The Order climbs the knee-high stairs on its hands. He has learned to come down them faster.'],
    lash: ['Spine Lash', 'A spine is a rope of bones, and the brothers have always known how to pull a rope.'],
    carapm: ['Carapace Mastery', 'Bone keeps still while everything else on the Hide is still dying. He has learned to stand the way it stands.'],
    // ---- the Hemomancer: penitent of the Bleeding Maiden
    eggsac: ['Tumor Toss', 'Milagros: the tin hearts pilgrims hang on saints. The penitent hangs nothing. He throws what grows on him, and it hatches.'],
    hatch: ['Hatch Brood', 'Leve pitit, raise the children. Blood given without a word is given to no one. He gives the word, and the Maiden\'s children come.'],
    thrall: ['Blood Ooze', 'El Relicario. On the saint\'s day the relic-blood liquefies in its glass. This relic drinks, and the procession quickens.'],
    rush: ['Rabid Charge', 'A saeta is the arrow of song one voice hurls at a passing saint. This one is hurled with teeth.'],
    graft: ['Graft', 'Veve: the chalk marks that are a spirit\'s door. Every child of the Maiden carries the mark he draws for it.'],
    fgolem: ['Flesh Golem', 'El Costalero, the float-bearer. It carried the Bleeding Maiden off the broken bridge, and it has not set her down since.'],
    assim: ['Assimilate', 'Gran manje, the great feast. What the Maiden\'s children eat, they become, a little. The Brotherhood said as much of prayer.'],
    nest: ['Brood Nest', 'El Caldero: an iron pot of cemetery earth, fed a cup of the tithe each year. Now it is fed more, and it gives back.'],
    hive: ['Hivemind', 'Konbit: a whole village working one field to one song. His brood sing it without mouths.'],
    broodm: ['Brood Mother', 'Our Lady of the Wounds. When the brood is full, the image on the Costalero\'s back weeps real blood.'],
    bboil: ['Boiling Blood', 'Hervor. The Maiden\'s blood runs warm in every living thing. He only reminds it how hot it can run.'],
    blance: ['Blood Vomit', 'The priest blesses with water shaken from the aspergill. The penitent blesses with what he has, and he has blood.'],
    hemor: ['Hemorrhage', 'Estigma: a martyr\'s wounds, opened on another. The Brotherhood prayed a thousand years for them. He grants them.'],
    vwhip: ['Root Veins', 'La Disciplina, the knotted scourge. He never opened his own back until the night the Wound hatched. Now it opens itself.'],
    bfrenzy: ['Blood Frenzy', 'La Rompida, the breaking of the hour: every drum in the town at once, until the drummers\' knuckles bleed onto the skins.'],
    cburst: ['Corpse Burst', 'Kase kanari: at a funeral the family breaks a clay jar to set the dead free. He breaks the dead instead.'],
    spool: ['The Suckling Clots', 'Sangsi. Blood given is not blood taken, the brothers said. The leeches never learned the difference.'],
    bwave: ['Blood Wave', 'La Riada, the flood. The fast-day of the Fall, again, and the Wound running over.'],
    pact: ['Blood Pact', 'La Promesa: a vow to walk in penance for another. He walks it for his children, and pays in his own veins.'],
    hemom: ['Hemomancy Mastery', 'La Preciosa Sangre. Every drop is owed to the Bleeding Maiden. He decides where it is spent.'],
    maw: ['Belly Maw', 'El Costado, the martyr\'s side-wound, opened as a mouth. The Maiden\'s flesh grows without a mind, and it is always hungry.'],
    chitin: ['Scar-Plates', 'Every welt the scourge ever raised is still on him. The Maiden only taught them to harden.'],
    swallow: ['Swallow Whole', 'Vale. What the side-wound takes in, it keeps, until it is done with it.'],
    tentacles: ['Tentacles', 'Rasin mapou: roots of the silk-cotton tree, where the spirits rest. These roots rest in him.'],
    gills: ['Blood Gills', 'Anba dlo, under the water. The dead wait a year and a day beneath it. He has learned to breathe there.'],
    devour: ['Devour', 'Manje pitit: eat the child. The procession comes round again. Nothing in the Maiden\'s flesh ever ends.'],
    bilehump: ['Tumor Hump', 'La Corcova, glowing under the robe like a lantern. It keeps a brood of its own, and sends them on ahead.'],
    molt: ['Molt', 'La Muda. The empty robe stands where he was, hooded, and the faithful still kneel to it.'],
    heart: ['Second Heart', 'Segon: the crypt plays three drums, and the second answers the mother-drum. His heart has a partner now.'],
    fmastery: ['Flesh Mastery', 'Encarnacion: the painting of flesh on a wooden saint. On him the carving is done from inside, and it is nearly finished.'],
    // ---- the Shrine Keeper (miasmancer): the Myriad
    vblade: ['Venom Claws', 'Nademono, the stroked thing: a paper figure passed over the body to take its impurity. Her claws pass it on.'],
    mcloud: ['Miasma', 'Kegare-goromo, the robe of held impurity: the haze of her held breath, bending her outline like heat over a road.'],
    shuriken: ['Miasma Shuriken', 'Kamaitachi, the weasel in the whirlwind. You do not feel its cuts until you see what leaks out of them.'],
    inhale: ['Inhale', 'Kaka-nomi, the swallowing. In the old prayer a goddess gulps impurity down at the mouth of the sea. So does she.'],
    pnova: ['Miasma Nova', 'Niwa-haki, sweeping the shrine yard. The breath goes out like a broom across the stones, and nothing stays.'],
    contagion: ['Contagion', 'Tomobiki, friend-pulling day, when no funeral is held. The dead take their friends with them.'],
    rotwall: ['Miasma Tide', 'Nagashi-bina: paper dolls sent downriver to carry misfortune away. The river carries whatever stands in it.'],
    exhale: ['Exhale', 'Ibuki, the sacred breath, set loose. Every keeper runs out of room in the end. Better to spend it here.'],
    mstorm: ['Miasma Hurricane', 'Hayasasura, the wandering goddess, who carries sin until it is lost. Nothing caught in her storm finds its way back.'],
    toxic: ['Toxicology', 'Miki, the sacred sake, laid down to deepen. Distortion that is kept bends deeper.'],
    ntrap: ['Needle Sentry', 'Mamori-fuda, the watching talisman on its bamboo stake. It keeps watch after she has gone, and it does not forgive.'],
    blur: ['Blur', 'Torii-kuguri, passing under the torii: one step between worlds, and a paper doll left behind to take the blame.'],
    mwake: ['Miasma Wake', 'Samezu-no-koro, the censer that never cools. Its smoke was prayer once. It still rises, and it still pushes.'],
    haze: ['Haze', 'The mind is a house, and the haze knows every door.'],
    bmine: ['Bloat Mine', 'Tsuji-sonae, an offering left at the crossroads for whatever passes by. One held breath, stoppered in a gourd.'],
    mirage: ['Mirage', 'Rain from a clear sky, lanterns in a field of bent light. Nothing crosses it in a straight line.'],
    lure: ['Siren Lure', 'Tamayobi, calling the soul home. The charm sings in a lost one\'s voice, and the lost cannot help but answer.'],
    warp: ['Warped Miasma', 'Some clouds are only clouds. Hers remember the Drowned Nave.'],
    sister: ['The Mirror-Sister', 'Akane, the paper sister, who took her fevers and her first breath of distortion. She steps out of the haze reversed, as in water.'],
    unseen: ['The Unseen', 'Nanashi, the nameless. What has no name cannot be called, and what cannot be called is hard to strike.'],
    rarc: ['Rending Arc', 'Onusa-barai, the wand\'s cleansing: three strokes to sweep impurity away. The claws sweep away more than impurity.'],
    gstrike: ['Grave Strike', 'The wind carries messages for the small gods. Some of them are omens, and all of those are of death.'],
    thrust: ['Impaling Thrust', 'Ushi-no-koku-mairi, the ox-hour visit: a straw doll nailed to a sacred tree at the second hour. The nail goes through.'],
    talon: ['Carrion Talon', 'Three kicks, the last one a door slammed on a guest who stayed too long.'],
    dstep: ['Death\'s Step', 'She breathes in and steps through the gap between two moments. Whatever stood on the line between is cut.'],
    reap: ['Reap', 'Shide-giri, cutting the streamers. Every omen she carries is spent at once, and the rope comes down.'],
    flurry: ['Black-Rag Flurry', 'Yatagarasu-mai, the dance of the guiding crow, who moves from carcass to carcass and shows the traveller the road.'],
    dhead: ['Death\'s Head', 'Hokorobi-mi, seeing the seam. Every made thing has one, and every breath a gap between in and out.'],
    execute: ['Execute', 'Shimenawa-kiri: cutting the sacred rope that binds a thing to the world. Some ropes are already frayed.'],
    deathm: ['Death Mastery', 'Her fans and claws were made for cleansing. They still are. She has only widened what counts as filth.'],
    // ---- the Kusho (monk): Ur-Nihl, the Silence
    kdawn: ['Hand-That-Opens-Noon', 'The Kinrei-shu chanted a thousand years to hold back the dark. He found it simpler to take the sun in his hand.'],
    kamber: ['Amber-That-Eats-Itself', 'Sacred ash and censer quicksilver, eaten off the altar. It burns still, and it is not particular about whom.'],
    khands: ['Hundred-Hands-Of-Morning', 'The ascetics made a hundred prostrations before dawn. He makes a hundred palms, and none of them are prayers.'],
    klaugh: ['Laughter-Without-Warmth', 'The first laugh blew the roof off the sanctum and left a courtyard of black glass. It has not grown warmer since.'],
    kstar: ['Morning-Star-Exhaled', 'A deep, jolly breath. The raised dead fear the morning star above all things, and he finds that very funny.'],
    kfist: ['Fist-Of-High-Noon', 'The gilded statues raised one hand in blessing. He raised his, and the sky answered with a fist.'],
    ksutra: ['Sutra-That-Seeks', 'Ofuda from the Peak\'s hems, each inked to hold the lowlands\' miasma back. They have found a new thing to seek.'],
    ktears: ['Tears-For-The-Living', 'The mask laughs and weeps at once: one face, because it is one feeling. These are the tears. They burn.'],
    keye: ['Eye-Between-The-Brows', 'The white curl on the brow of the enlightened. On his mask it splits open, and it sees through stone.'],
    kbell: ['Bell-Of-One-Syllable', 'The Peak\'s great bell spoke one syllable at dawn. He learned to speak it himself, and to wear the bell.'],
    klotus: ['Lotus-Without-Mercy', 'He sits as the abbots sat, eyes shut, perfectly still. The stillness is not peace. It is a mill.'],
    ksun: ['He-Who-Hangs-As-The-Sun', 'The Kinrei-shu starved to become clean vessels for the light. He ate everything instead, and became it.'],
    keclipse: ['Hand-That-Closes-The-Sun', 'Nirvana is a blank page. He closes his hand, and for a while the page is dark.'],
    kpalm: ['Palm-That-Is-Hungry', 'The hungry ghosts starve forever through mouths as thin as needles. His palm is not thin.'],
    kclap: ['Clap-That-Ends-Speech', 'At a shrine one claps to wake the kami. This clap wakes nothing. It takes the word out of every mouth.'],
    kbowl: ['Bowl-That-Holds-Nothing', 'A begging bowl from the years of fasting. It is always empty, and he has never once been refused.'],
    kspade: ['Spade-That-Cuts-Shadows', 'The gravedigger\'s spade. A thing that has lost its shadow has nowhere left to stand.'],
    kpinch: ['Pinch-That-Cuts-The-Strings', 'The Ossuary Lords hang their dead on strings of essence. He pinches, and they remember they are corpses.'],
    kbelow: ['Hand-From-Below', 'Something under the world holds everything up. He asks it, politely, to let go of one thing.'],
    kspit: ['Spit-For-The-Starving', 'The starved dead of the Peak had nothing to eat. He spits for them, and they find something.'],
    kwalk: ['Walks-Without-Feet', 'Hungry ghosts drift an inch above the ground, unwelcome in both worlds. His gold turns to pitch when he joins them.'],
    kmirror: ['Mirror-With-No-Face', 'The servants of the Silence show nothing in a mirror. This one shows the blow, and sends it home.'],
    knothing: ['One-With-Nothing', 'For a moment he does as the Silence does, and is not. The world does not notice him leave. It notices his return.'],
    kbar: ['That-Which-Bars-The-Way', 'Fudo, the Immovable. He grew dense on the altar, heavy as a temple bell. Nothing pushes a bell.'],
    kgrip: ['Grip-Of-Old-Stone', 'The gilded kami wept at being trapped in existence. He gives the living their stillness, and leaves no corpse to mourn.'],
    kfinger: ['One-Finger-Truth', 'The old koan: the teacher answered every question by raising one finger. This answer leaves a hole.'],
    kobsid: ['Mantra-Of-Obsidian', 'The Peak\'s courtyard turned to black glass the day he laughed. Now his skin remembers it.'],
    kmount: ['Mountain-Falls-Laughing', 'The Gilded Peak is the god\'s own knee-bone. He carries a little of that mountain in his belly, and drops it.'],
    kstep: ['Step-That-Wakes-Bedrock', 'The pilgrim roads remember every foot that climbed them. He stamps once, and the stone climbs back.'],
    kpagoda: ['Pagoda-For-One', 'A reliquary for a single guest. The abbots rested in gilded ones. This one is not gilded.'],
    kweep: ['The-Weeping-One-Who-Walks', 'The gilded kami of the sanctum wept in agony at being alive. One has stepped down off its plinth to share the feeling.'],
    kthousand: ['Thousand-Arms-Of-Nothing', 'The bodhisattva of a thousand arms reaches for every suffering thing at once. It is not reaching to help.']
  };

  // ---------------------------------------------------------------- colours (mirroring zz_ui's grimoire palette)
  const CLSCOL = { animancer: '#8ecbff', ossumancer: '#e8e2d0', hemomancer: '#e05060', miasmancer: '#b070e0', monk: '#f0c040' };
  const TABCOL = { animancer: ['#b8ccf0', '#8ecbff', '#f4f0ff'], ossumancer: ['#e8e2d0', '#f0c8a0', '#b8ae94'], hemomancer: ['#e05060', '#ff8090', '#d09a88'], miasmancer: ['#b070e0', '#8ab8ff', '#d8c8e8'], monk: ['#ffc040', '#8a80c0', '#c8c0b4'] };
  const tabC = t => (TABCOL[P.cls] || TABCOL.animancer)[t] || CLSCOL[P.cls] || '#c9a45a';
  const C = { lore: '#b4a88c', text: '#a39d8c', dim: '#5a5563', hint: '#6f6a79', head: '#d9a441', cost: '#5c86d6', life: '#c24050', num: '#8b95ff', next: '#8fd08f', perkOn: '#d9a441', perkOff: '#6f6a79', bad: '#c8553d', ok: '#7f9a6a', syn: '#e8d6a0' };
  const RULE = () => ['', '#3a3446', { rule: 1 }];
  const r1 = v => (Math.round(v * 10) / 10).toString();
  const pc = v => Math.round(v * 100) + '%';
  const safe = (f, d) => { try { const v = f(); return v == null ? d : v; } catch (e) { return d; } };
  const moreOn = () => (typeof keys !== 'undefined' && keys.has('shift')) || !!G.tipMore;
  G.descShift = false;

  // wrap to a pixel width in the tooltip font
  function wrapW(t, w) {
    const out = []; let line = '';
    for (const word of String(t).split(/\s+/)) { if (!word) continue; const tr = line ? line + ' ' + word : word; if (line && tw(tr) > w) { out.push(line); line = word; } else line = tr; }
    if (line) out.push(line); return out;
  }
  const push = (out, t, col, w, max) => { let L = wrapW(t, w); if (max && L.length > max) { L = L.slice(0, max); L[max - 1] = L[max - 1].replace(/[ ,.;:]*\S*$/, '') + '...'; } for (const s of L) out.push([s, col]); };
  const resName = () => P.cls === 'hemomancer' ? 'Vitae' : P.cls === 'miasmancer' ? 'Miasma' : 'Essence';

  // the lore for a skill, or its own description (shortened) when the skill has been renamed or has no lore yet
  function lore(id) {
    const s = SK[id], f = LORE[id];
    if (f && s && f[0] === s.name) return f[1];
    const d = String((s && s.desc) || '').replace(/^Mutation: /, '');
    const sent = d.match(/[^.!?]+[.!?]+/g) || [d]; let t = '';
    for (const x of sent) { if ((t + x).length > 170 && t) break; t += x; }
    return t.trim();
  }

  // ---------------------------------------------------------------- live numbers
  // merge "now" and "next level" info strings: same wording, numbers that change become "a>b"
  function mergeInfo(a, b) {
    const re = /(?:(?<![\d)])-)?\d+(?:\.\d+)?/g;   // a dash between two numbers is a range, not a sign
    if (a.replace(re, '#') !== b.replace(re, '#')) return null;
    const nb = b.match(re) || []; let i = 0, changed = false;
    const s = a.replace(re, m => { const n = nb[i++]; if (n !== m) { changed = true; return m + '>' + n; } return m; });
    return { s, changed };
  }
  function infoAt(id, l) { return safe(() => skillInfo(id, l) || '', ''); }
  function costOf(id, l) { return safe(() => skillCost(id, l), SK[id].mana || 0); }
  function shardCost(id) { const s = SK[id]; return Math.max(0, (s.shards || 0) - (P.skills.marrowcost > 0 && s.tab === 1 && s.shards ? 1 : 0)); }
  // the life price of a Hemomancer skill at a given Vitae fullness (the pool is restored afterwards)
  function lifeAt(cost, frac) {
    const m0 = P.mana;
    try { if (frac != null) P.mana = D.maxMana * frac; return bloodLifeCost(cost) * 100 / Math.max(1, D.maxHp); } catch (e) { return null; } finally { P.mana = m0; }
  }
  // each synergy's real worth per hard point, measured by asking synBonus itself (so a retuned formula stays true)
  function synRows(id) {
    const L = (typeof SYN !== 'undefined' && SYN[id]) || null; if (!L || typeof synBonus !== 'function') return [];
    const rows = []; const base = safe(() => synBonus(id), 0);
    for (const [s] of L) {
      if (!SK[s]) continue; const had = Object.prototype.hasOwnProperty.call(P.hard, s), h = P.hard[s] || 0; let per = 0;
      try { P.hard[s] = h + 1; per = synBonus(id) - base; } catch (e) { } finally { if (had) P.hard[s] = h; else delete P.hard[s]; }
      rows.push({ id: s, name: SK[s].name, per: per * 100, now: per * 100 * h, h });
    }
    return rows;
  }
  function kindText(id) {
    const s = SK[id], d = s.desc || '';
    if (s.kind === 'passive') return /^Mutation/.test(d) ? 'Mutation: always working while worn (Flesh panel, V)' : 'Passive: always working once learned';
    if (s.kind === 'weapon') return 'Golem weapon: right-click to arm the golem';
    if (s.kind === 'hold') return 'Hold: channels for as long as the button is held';
    if (/^Toggle/.test(d)) return 'Toggle: cast to start, cast again to end';
    if (/^Hold/.test(d) || /Hold to keep/.test(d)) return 'Cast: hold the button to keep casting';
    return 'Cast: one use per press';
  }
  function holdUnit(id) {
    const s = SK[id]; if (s.kind !== 'hold') return '';
    return id === 'colossus' || id === 'host' ? ' per skeleton' : id === 'overcharge' || id === 'condense' ? ' per wisp' : ' a second';
  }
  // the cost lines, in the class's own resource
  function costLines(id, L, next, out, w) {
    const s = SK[id], res = resName(); let any = false;
    if (s.mana && P.cls === 'monk') {
      const c = costOf(id, L);
      out.push([s.tab === 2 ? `Poise: ${Math.max(1, Math.round(c * 0.6))}` : `${s.tab === 1 ? 'Absence sand' : 'Radiance sand'}: ${Math.max(1, Math.round(Math.min(25, 5 * c / 12.8)))}% of the bulb${holdUnit(id)}`, C.cost]); any = true;
    } else if (s.mana) {
      const c = costOf(id, L), cn = next ? costOf(id, next) : null;
      out.push([`${res}: ${r1(c)}${holdUnit(id)}` + (cn != null && Math.abs(cn - c) > 0.04 ? `  (next level ${r1(cn)})` : ''), C.cost]); any = true;
      if (P.cls === 'hemomancer') {
        const now = lifeAt(c), full = lifeAt(c, 1), empty = lifeAt(c, 0);
        if (now != null) push(out, `Life: ${now.toFixed(1)}% of max now (${full.toFixed(1)}% at full Vitae, ${empty.toFixed(1)}% empty). Never below 1 life.`, C.life, w);
      }
    }
    if (s.stam) { out.push([`Poise: ${s.stam}`, C.head]); any = true; }
    if (s.shards) { const sc = shardCost(id); out.push([`Bone shards: ${sc}` + (sc !== s.shards ? ` (${s.shards}, less 1 from Lean Marrow)` : '') + safe(() => ` · you hold ${Math.floor(P.shards)}`, ''), '#e8e2d0']); any = true; }
    const d = s.desc || '';
    const wm = d.match(/Spend (up to )?(\d+) wisps?/i); if (wm) { out.push([`Wisps: ${wm[1] ? 'up to ' : ''}${wm[2]}` + safe(() => ` · you hold ${P.wisps.length} of ${D.wispCap}`, ''), '#8ecbff']); any = true; }
    else if (P.cls === 'animancer' && /No wisps are spent/.test(d)) { out.push(['Wisps: none spent', '#8ecbff']); any = true; }
    if (id === 'raise' && P.cls === 'ossumancer') { safe(() => out.push([`Each standing skeleton holds ${BS.skelCost()} shards of the aura`, '#cfc6ae']), 0); any = true; }
    const wt = d.match(/\(([+-]\d+) Weight\)/); if (wt) { out.push([`Weight: ${wt[1]}`, '#c9a66b']); any = true; }
    const lp = d.match(/lose (\d+)% of your current life/i); if (lp) { out.push([`Life: ${lp[1]}% of current life`, C.life]); any = true; }
    if (!any) out.push([s.kind === 'passive' ? 'Cost: none' : `Cost: none`, C.dim]);
  }
  // what the skill leans on right now
  function scaleLines(id, out, w) {
    const s = SK[id], d = s.desc || '', cls = P.cls;
    const add = (f, col) => { const t = safe(f, ''); if (t) push(out, t, col || C.text, w); };
    if (s.stam || (cls === 'monk' && s.tab === 2)) add(() => `Melee x${D.meleeMult.toFixed(2)} · weapon ${Math.round(D.wmin)}-${Math.round(D.wmax)}`);
    else if (s.kind !== 'passive' || /damage|harder/i.test(d)) add(() => `Skill damage x${D.dmgMult.toFixed(2)} (Essence ${D.spi}, gear)`);
    if (cls === 'ossumancer' && (s.tab === 1 || s.shards)) add(() => `Aura ${Math.floor(P.shards)} of ${D.shardCap} shards: bone spells at ${pc(BS.floor() + (1 - BS.floor()) * BS.frac())} strength`);
    if (cls === 'hemomancer' && s.mana) add(() => `Vitae ${Math.ceil(P.mana)} of ${D.maxMana}: the fuller it is, the less life it costs`);
    if (cls === 'miasmancer' && s.tab === 0) add(() => `Cloud ${pc(MS.frac())} thick · ${MS.auraR().toFixed(1)} yd · ${pc(MS.evade())} of blows miss`);
    if (cls === 'miasmancer' && s.tab === 2) add(() => `Omens ${P.omens} of ${MS.omenMax()}: each one strikes harder and faster`);
    if (cls === 'monk' && s.tab < 2) add(() => `Sky x${KS.sky(s.tab).toFixed(2)} (${s.tab === 0 ? 'Radiance: stronger by day' : 'Absence: stronger by night'})`);
    if (cls === 'monk' && s.tab < 2 && KS.fill) add(() => { const q = KS.fill(), f = s.tab === 1 ? q.fA : q.fR; return `${s.tab === 1 ? 'Absence' : 'Radiance'} glass ${Math.round(f * 100)}% full: strikes at ${Math.round(KS.sand(s.tab) * 100)}%`; });
    if (cls === 'animancer' && /wisp/i.test(d) && !/Spend/i.test(d)) add(() => `Wisps ${P.wisps.length} of ${D.wispCap}`);
  }

  // ---------------------------------------------------------------- the two tooltips
  function head(id, l, hl) {
    const s = SK[id]; let t = s.name + (l ? ` · level ${l}` : '');
    return [t, tabC(s.tab), { dk: id }];
  }
  function shortTip(id) {
    const s = SK[id], l = P.skills[id] || 0, hl = P.hard[id] || 0, out = [head(id, l, hl)];
    push(out, lore(id), C.lore, 206, 4);
    if (!safe(() => skillReady(id), true)) out.push([P.level < s.req ? `Requires level ${s.req}` : `Requires ${SK[s.pre] ? SK[s.pre].name : s.pre}`, C.bad]);
    out.push([G.touch ? 'MORE stud: details' : 'Hold Shift for details', C.hint, { small: 1 }]);
    return out;
  }
  function fullTip(id, compact) {
    const s = SK[id], l = P.skills[id] || 0, hl = P.hard[id] || 0, W1 = 214, out = [head(id, l, hl)];
    const L = Math.max(1, l), next = hl < 20 ? L + 1 : null;
    out.push([`${kindText(id)}`, C.hint]);
    out.push(RULE());
    push(out, String(s.desc || '').replace(/^Mutation: /, ''), C.text, W1, compact ? 6 : 0);
    out.push(RULE());
    costLines(id, L, next, out, W1);
    // numbers now, and what the next point changes
    const a = infoAt(id, L), b = next ? infoAt(id, next) : '';
    if (a) {
      out.push([(l ? `Level ${L}` : 'Level 1 (not learned)') + (next ? `  >  level ${next}` : '  (max)'), C.head]);
      const pa = a.split(' · '), pb = b ? b.split(' · ') : [];
      if (pb.length === pa.length) pa.forEach((p, i) => { const m = mergeInfo(p, pb[i]); if (m) push(out, m.s, m.changed ? C.next : C.num, W1); else { push(out, p, C.num, W1); push(out, 'next: ' + pb[i], C.next, W1); } });
      else { pa.forEach(p => push(out, p, C.num, W1)); if (pb.length) push(out, 'Next: ' + b, C.next, W1); }
    }
    if (l > hl) out.push([`${hl} points + ${l - hl} from items and Major Arcana`, C.num]);
    // perks, synergies, stats
    const perks = s.perks || [];
    if (perks.length) {
      out.push(RULE()); out.push(['Perks', C.head]);
      perks.forEach((pk, i) => {
        const on = safe(() => perkOn(id, i), false), need = pk.stat ? ` + ${pk.stat[1]} ${STAT_NAME[pk.stat[0]] || pk.stat[0]}` : '';
        const statOk = !pk.stat || (D[pk.stat[0]] || 0) >= pk.stat[1];
        out.push([`${on ? '+' : '-'} lv ${pk.l}${need}: ${pk.name}` + (!on && l >= pk.l && !statOk ? ` (need ${pk.stat[1]} ${STAT_NAME[pk.stat[0]] || pk.stat[0]})` : ''), on ? C.perkOn : C.perkOff]);
        push(out, pk.desc, on ? C.text : C.dim, W1, compact ? 1 : 2);
      });
    }
    const syn = synRows(id);
    if (syn.length) {
      const tot = syn.reduce((q, x) => q + x.now, 0);
      out.push(RULE()); out.push([`Synergies (hard points): now +${Math.round(tot)}%`, C.head]);
      for (const q of syn) out.push([`${q.name}: +${r1(q.per)}% per point (you +${Math.round(q.now)}%)`, q.h ? C.syn : C.perkOff]);
    }
    const sc = []; scaleLines(id, sc, W1);
    if (sc.length) { out.push(RULE()); out.push(['Scales with', C.head]); for (const x of sc) out.push(x); }
    // needs and use
    out.push(RULE());
    const lvOk = P.level >= s.req, preOk = !s.pre || (P.skills[s.pre] || 0) > 0;
    out.push([`Requires level ${s.req}` + (lvOk ? ' (met)' : ` (you are ${P.level})`), lvOk ? C.ok : C.bad]);
    if (s.pre) out.push([`Requires ${SK[s.pre] ? SK[s.pre].name : s.pre}` + (preOk ? ' (learned)' : ''), preOk ? C.ok : C.bad]);
    const how = s.kind === 'weapon' ? (l > 0 ? (P.gweapon === id ? 'Wielded by your golem' : 'Right-click: the golem wields it') : 'Learn it to arm your golem')
      : s.kind === 'passive' ? '' : 'Right-click: right skill · shift+right: left · key: bind';
    if (how) out.push([how, C.dim]);
    return out;
  }
  function descTip(id, full) {
    if (!id || id === 'attack' || !SK[id]) return null;
    try {
      if (!full) return shortTip(id);
      const t = fullTip(id), Lo = layout(rewrap(t));
      // too long even in two columns: shorten the description and perk text rather than cutting the numbers
      return Lo.cols.some(c => c.some(x => x[0] === '...')) ? fullTip(id, true) : t;
    } catch (e) { reportError && reportError(e); return null; }
  }

  // ---------------------------------------------------------------- hooking the tooltip sources
  const _skillTip = skillTip;
  skillTip = function (id) { return descTip(id, moreOn()) || _skillTip(id); };
  const _drawSkills = drawSkills;
  drawSkills = function () {
    const r = _drawSkills.apply(this, arguments);
    const id = G.hoverSkill;
    if (id && id !== 'attack' && SK[id] && tooltip && tooltip[0] && tooltip[0][0] && String(tooltip[0][0]).indexOf(SK[id].name) === 0) { const t = descTip(id, moreOn()); if (t) tooltip = t; }
    return r;
  };
  // the Flesh panel's mutation cards show a skill: same lore and Shift detail
  if (typeof drawBloodPanel === 'function') {
    const _dbp = drawBloodPanel;
    drawBloodPanel = function () {
      const r = _dbp.apply(this, arguments);
      try {
        if (tooltip && tooltip[0] && !(tooltip[0][2] && tooltip[0][2].dk)) {
          const nm = tooltip[0][0], id = SK_ORDER.find(k => SK[k].cls === P.cls && SK[k].name === nm && /^Mutation/.test(SK[k].desc || ''));
          if (id) { const last = tooltip[tooltip.length - 1], t = descTip(id, moreOn()); if (t) tooltip = t.concat(last && last[1] === '#c8553d' ? [last] : []); }
        }
      } catch (e) { }
      return r;
    };
  }
  // the Arcana web: a card that changes named skills shows those skills' live numbers on Shift
  if (typeof drawArcana === 'function') {
    const _da = drawArcana;
    drawArcana = function () {
      const r = _da.apply(this, arguments);
      try {
        if (tooltip) return r;
        const W_ = web(); if (!W_) return r;
        let hov = null; for (const id in W_) { if (id === 'heart') continue; const q = webPos(W_[id]); if (inRect(mouse, q.x - 7, q.y - 8, 14, 16)) { hov = id; break; } }
        const c = hov && ARC[hov]; if (!c) return r;
        const text = (c.up || '') + ' ' + (c.rev || '');
        const ids = SK_ORDER.filter(k => (SK[k].cls || 'animancer') === P.cls && SK[k].name && text.indexOf(SK[k].name) >= 0);
        if (!ids.length) return r;
        const out = [[c.name, c.kind === 'major' ? '#e8d6a0' : '#e8e2d0', { dk: 'arc' }]];
        if (!moreOn()) { push(out, 'Changes ' + ids.map(k => SK[k].name).join(', '), C.text, 206); out.push([G.touch ? 'MORE stud: their numbers' : 'Hold Shift for their numbers', C.hint]); }
        else for (const k of ids) {
          const l = P.skills[k] || 0; if (out.length > 1) out.push(RULE()); out.push([SK[k].name + (l ? ` · level ${l}` : ' · not learned'), tabC(SK[k].tab)]);
          const a = infoAt(k, Math.max(1, l)); if (a) a.split(' · ').forEach(p => push(out, p, C.num, 214));
          if (SK[k].mana) out.push([`${resName()}: ${r1(costOf(k, Math.max(1, l)))}${holdUnit(k)}`, C.cost]);
        }
        tooltip = out;
      } catch (e) { }
      return r;
    };
  }

  // ---------------------------------------------------------------- the box: D2 style, wrapped, clamped, two columns when tall
  const LH = 9, RH = 5, COLW = 222;
  // any line wider than a column (hint lines other code appends, long headers) is wrapped before layout
  function rewrap(lines) { const out = [lines[0]]; for (const l of lines.slice(1)) { if (l[2] && l[2].rule) { out.push(l); continue; } const L = wrapW(l[0], COLW); if (L.length <= 1) out.push(l); else for (const t of L) out.push([t, l[1], l[2]]); } return out; }
  const lineH = l => l[2] && l[2].rule ? RH : LH;
  function layout(lines) {
    const title = lines[0], body = lines.slice(1), availH = HUD_Y - 4, titleH = 16;
    const hOf = arr => arr.reduce((a, l) => a + lineH(l), 0) + 6;
    const wOf = arr => Math.max(40, ...arr.map(l => l[2] && l[2].rule ? 0 : tw(l[0])));
    let cols = [body];
    if (titleH + hOf(body) > availH) {
      // split at the rule closest to the middle that keeps both halves on screen; else at the middle line
      const total = hOf(body); let best = -1, bd = 1e9, acc = 0;
      body.forEach((l, i) => { acc += lineH(l); if (l[2] && l[2].rule) { const d = Math.abs(acc - total / 2); const a = body.slice(0, i), b = body.slice(i + 1); if (titleH + Math.max(hOf(a), hOf(b)) <= availH && d < bd) { bd = d; best = i; } } });
      if (best < 0) { acc = 0; for (let i = 0; i < body.length; i++) { acc += lineH(body[i]); if (acc >= total / 2) { best = i; break; } } cols = [body.slice(0, best + 1), body.slice(best + 1)]; }
      else cols = [body.slice(0, best), body.slice(best + 1)];
      // still too tall: cut the longer column and mark it
      for (const [ci, col] of cols.entries()) while (titleH + hOf(col) > availH && col.length > 2) { col.pop(); col.pop(); col.push(['...', C.hint]); cols[ci] = col; }
    }
    const cw = cols.map(wOf).map(v => Math.min(v, cols.length > 1 ? COLW : W - 16)), gap = 12;
    const w = Math.min(W - 2, Math.max(tw(title[0]) + 16, cw.reduce((a, b) => a + b, 0) + gap * (cols.length - 1) + 14));
    const h = titleH + Math.max(...cols.map(hOf));
    return { title, cols, cw, w, h, gap };
  }
  function drawBox(lines) {
    const Lo = layout(rewrap(lines)), { w, h } = Lo, availB = HUD_Y - 2;
    let x = mouse.x + 12, y = mouse.y + 10;
    if (x + w > W - 1) x = mouse.x - w - 8; if (x < 1) x = Math.max(1, Math.min(W - 1 - w, mouse.x - w / 2));
    if (y + h > availB) y = availB - h; if (y < 1) y = 1;
    x = Math.round(x); y = Math.round(y);
    const qc = Lo.title[1] || '#8a6a2a';
    ctx.fillStyle = 'rgba(6,5,9,0.97)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#050407'; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1); ctx.strokeStyle = '#4a4458'; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3); ctx.strokeStyle = '#1a1720'; ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    ctx.fillStyle = qc; ctx.globalAlpha = 0.7; ctx.fillRect(x + 4, y + 13, w - 8, 1); ctx.globalAlpha = 1; ctx.fillRect(x + 4, y + 13, 3, 1); ctx.fillRect(x + w - 7, y + 13, 3, 1);
    for (const [cx, cy] of [[x + 2, y + 2], [x + w - 4, y + 2], [x + 2, y + h - 4], [x + w - 4, y + h - 4]]) { ctx.fillStyle = '#8a8698'; ctx.fillRect(cx, cy, 2, 2); ctx.fillStyle = '#d0ccdc'; ctx.fillRect(cx, cy, 1, 1); }
    txt(Lo.title[0], x + w / 2, y + 10, qc, 'center', false);
    // columns share the width left to right, each centred on its own axis
    const inner = Lo.cw.reduce((a, b) => a + b, 0) + Lo.gap * (Lo.cols.length - 1); let cx0 = x + (w - inner) / 2;
    Lo.cols.forEach((col, ci) => {
      const cw = Lo.cw[ci], mid = cx0 + cw / 2; let yy = y + 16;
      if (ci > 0) { ctx.fillStyle = '#2a2632'; ctx.fillRect(Math.round(cx0 - Lo.gap / 2), y + 18, 1, h - 24); }
      for (const l of col) {
        if (l[2] && l[2].rule) { ctx.fillStyle = '#2e2a36'; ctx.fillRect(Math.round(mid - cw * 0.35), yy + 2, Math.round(cw * 0.7), 1); yy += RH; continue; }
        txt(l[0], mid, yy + 7, l[1], 'center', false); yy += LH;
      }
      cx0 += cw + Lo.gap;
    });
  }
  const _drawTooltip = drawTooltip;
  drawTooltip = function () {
    G.descShift = moreOn();
    if (tooltip && tooltip[0] && tooltip[0][2] && tooltip[0][2].dk) { try { drawBox(tooltip); return; } catch (e) { reportError && reportError(e); } }
    return _drawTooltip.apply(this, arguments);
  };

  if (typeof window !== 'undefined') window.__desc = { LORE, lore, shortTip, fullTip, descTip, layout: t => layout(rewrap(t)), cardPos: id => webPos(web()[id]), mergeInfo, synRows };
}
