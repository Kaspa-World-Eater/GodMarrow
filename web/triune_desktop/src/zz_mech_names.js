// =================================================================== zz_mech_names.js — approved skill renames + flavor pass
// Board id: renames. Overrides only SK[id].name / SK[id].desc / SK[id].perks[i].name/desc, TAB_SETS[cls][tab] and
// CLASS_NAME[cls]. Does NOT touch prerequisites, costs, damage, positions, or any effect. Loads after all zy_* / zw_*
// files (they set some of these names first), so we win the last write. Rewrites lean into each class's voice:
// Ossuarch — bone, marrow, pilgrimage, starving ascetic; Hemomancer — flesh, blood, covenant, Bleeding Maiden;
// Miasmancer / Shrine Keeper — miasma, sickness, breath; Animancer / Weaver of Mirrors — mirror, glass, choir,
// grave-light; Monk — untouched (its own file already sings).
(() => {
  // ---------------------------------------------------------------- Ossuarch (ossumancer)
  const OSS_NAMES = {
    spear: 'Bone Lance',
    spikes: 'Bone Spurs',
    ribcage: 'Charnel Cage',
    horn: 'Death March',
    banner: 'Prayer Banner',
    marrowm: 'Bone Mastery'
    // Marrow Crush (crush) keeps its name
  };
  for (const id in OSS_NAMES) { if (SK[id]) SK[id].name = OSS_NAMES[id]; }
  if (TAB_SETS && TAB_SETS.ossumancer) TAB_SETS.ossumancer[1] = 'Bone';

  // ------------------------------------------------------------- flavor rewrites (skill.desc + mastery perk.desc)
  // Each entry is { desc, perks?: {vId: 'new desc'} } — perks map by their virtual id so we don't care about order.
  const REWRITE = {
    // ============ Animancer / Weaver of Mirrors ============
    ward: { desc: 'Your Essence answers the blow before your body does. Cuts and curses bruise the ward first, and only what breaks it ever reaches skin.' },
    restless: { desc: 'The revenants in your choir go slower to rest. They tear through more of the living before the pull of the grave takes them home again.' },
    storm: { desc: 'Spend two wisps to tear a shrieking vortex open at the target. It hangs there and spits seeking souls into everything in reach until its throat closes.' },
    mark: { desc: 'Speak a brand over the living in a wide arc: their true names blister in the air above them, and every blow you and your choir land on the marked burns deeper.' },
    wraith: { desc: 'Toggle: your body thins to grave-smoke. You walk through the living untouched and drift through walls of flesh, and no blade knows where to find you. Essence bleeds out as you go, and the first strike you make drags you back.' },
    choir: { desc: 'Your choir sings louder. Every wisp bites harder into the living, and the dead climb back into your orbit sooner.' },
    animam: { desc: 'The great wisp burns brighter, the Soul Leash bites deeper, and the Soul Lantern draws its dead more hungrily.' },
    nmastery: { desc: 'The word made force sharpens on your tongue. Every Logos spell speaks harder, and its Essence flows back to you sooner.' },
    // zy_anim.js renamed forge → Quicksilver Heart; keep its mirror voice.
    forge: { desc: 'The heart of your work runs silver-quick. Mirrors, glass and the golem all strike harder, and every pane you raise stands longer before it silvers over and falls.' },

    // ============ Ossuarch (ossumancer) ============
    // renamed skills whose desc still described the old name
    spear:   { desc: 'Hurl a lance of packed bone that pierces everything in its line. Like all bone spells, it bites deeper the more shards orbit you.' },
    spikes:  { desc: 'Force the enemy\'s own bones outward as jagged spurs. They tear the marked thing open and gore everything within a step of it.' },
    ribcage: { desc: 'A great cage of ribs erupts under the target, hollow and stinking of the ossuary. The ribs pierce everything inside and hold it there, bleeding marrow, until the cage crumbles.' },
    horn:    { desc: 'Sound the march. For a few seconds your skeletons and the Colossus step in time and strike faster; the living near you falter with dread in their marrow, and drag their feet.' },
    banner:  { desc: 'Plant a stave of bone hung with prayer-strips of flayed hide. Your skeletons and the Colossus fight faster and mend in its shadow; the living wither and slow as they draw near.' },
    // untouched-name ossuarch skills that read thin
    tithe:   { desc: 'The grave takes its share. Every kill owes bone to your aura, and now and then a shard tears loose from the dying and flies straight into your orbit.' },
    barmor:  { desc: 'Plates of bone lock over your body seam by seam. They drink every blow meant for you until they crack apart and blow away as splinters.' },
    gcharge: { desc: 'Lower your shoulder and drive to the cursor. Bone plates grind everything in your path into the dirt and fling the rest aside like broken pilgrims.' },
    bscythe: { desc: 'Grow a scythe of vertebrae out of your arm and cut a full ring around you. Everything in reach is opened, then thrown clear on the follow-through.' },
    leap:    { desc: 'Kick free of the earth and come down on the cursor in a burst of driven spikes. The impact throws the living clear and staples the dying where they fall.' },
    legion:  { desc: 'The march grows. Your skeletons and the Colossus stand harder and cut deeper, and the choir of the risen counts one more soul.' },
    marrowm: { desc: 'Bone answers you sooner and hits truer. Every bone spell strikes harder, and a thin aura is slower to weaken them.' },
    carapm:  { desc: 'Your shell hardens as the pilgrimage grinds you thin. Your blows fall heavier, and every shard in your aura turns aside a little more of what strikes it.' },

    // ============ Hemomancer ============
    hemom:    { desc: 'Your covenant with the Bleeding Maiden deepens. Every blood-work and every open wound cuts a little further into what it opens.' },
    broodm:   { desc: 'You are the belly they came from. Spawnlings, oozes and the Flesh Golem stand harder and bite harder, and the brood you carry grows fatter with you.' },
    fmastery: { desc: 'The Bleeding Maiden reshapes you further. A third mutation slot opens beneath your skin, and every mutation you wear grows into you more truly.' },
    chitin:   { desc: 'Mutation: plates of black chitin push up through your skin, seam and split. Blows glance off them, and what does bite you loses much of its weight before it ever reaches meat.' },

    // ============ Miasmancer / Shrine Keeper (the Unthawed) ============
    vblade:  { desc: 'Draw miasma along the length of your claws and let it settle in the metal. For a long while your blows leave the sickness in the wound, and the wounded drag their feet.' },
    bmine:   { desc: 'Set a swollen spore-mine on the ground. It sits fat and waiting; the moment anything comes near it bursts and coughs out a great cloud of miasma.' },
    lure:    { desc: 'Throw a charm of birch and finger-bone that sings small and terrible. For a few seconds it drags the living toward it by the ears.' },
    dhead:   { desc: 'You find the seam under the skin, where a stroke goes through to the marrow. Now and then your blows and strikes land as clean, killing cuts.' },
    toxic:   { desc: 'The breath you make is fouler. Every miasma cloud hangs longer, and its sickness bites deeper into whatever stands in it.' },
    deathm:  { desc: 'Death sits closer to your hands. Every claw stroke and every strike falls heavier than the last.' }
  };

  for (const id in REWRITE) {
    const s = SK[id]; if (!s) continue;
    const r = REWRITE[id];
    if (r.desc) s.desc = r.desc;
    if (r.perks && s.perks) {
      for (const p of s.perks) { if (p && r.perks[p.v]) p.desc = r.perks[p.v]; }
    }
  }
})();
