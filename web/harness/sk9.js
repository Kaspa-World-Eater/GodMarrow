
// =================================================================== OSSUMANCER skills (cls: 'ossumancer')
// tab: 0 Ossuary (army) · 1 Marrow (bone spells) · 2 Carapace (body)
Object.assign(SK, {
  // ---------------- OSSUARY: the army
  raise: { cls: 'ossumancer', name: 'Raise Skeleton', tab: 0, r: 0, c: 1, kind: 'cast', mana: 6, shards: 3, desc: 'Pull 3 bone shards out of your aura and stand them up as a skeleton knight at the cursor. Fallen skeletons are rebuilt from your aura over time while shards remain. V opens army orders.',
    perks: [{ l: 5, v: 'shieldb', name: 'Shieldbearers', desc: 'Your skeletons carry heater shields and take far less damage.' }, { l: 10, v: 'archers', name: 'Bone Archers', desc: 'Every third skeleton you raise is an archer.' }, { l: 15, v: 'rebirth', name: 'Marrow Rebirth', desc: 'Fallen skeletons rebuild three times as fast, for a single shard.', stat: ['vit', 50] }] },
  command: { cls: 'ossumancer', name: 'Command Bones', tab: 0, r: 1, c: 0, pre: 'raise', kind: 'cast', mana: 2, desc: 'Point: every skeleton and the Colossus turns on the enemy at the cursor, or marches to the spot you point at.' },
  tithe: { cls: 'ossumancer', name: 'Grave Tithe', tab: 0, r: 1, c: 2, pre: 'raise', kind: 'passive', desc: 'Every kill gives up bone: a chance for shards to fly straight into your aura.' },
  colossus: { cls: 'ossumancer', name: 'Ossuary Colossus', tab: 0, r: 2, c: 1, pre: 'raise', kind: 'hold', mana: 4, desc: 'Hold: skeletons march into one giant skeleton at the cursor, one by one. Fuse as few or as many as you like: the more it holds, the bigger and stronger it is. It stays until destroyed. Tap to direct it. Its weapon is chosen in army orders (V).',
    perks: [{ l: 5, v: 'bulwarkC', name: 'Unbroken Bulwark', desc: 'The Colossus takes less damage and bellows a challenge that draws nearby enemies to it.' }, { l: 10, v: 'cracked', name: 'Cracked Marrow', desc: 'Blows that land on the Colossus knock shards loose that fly to you.', stat: ['vit', 50] }] },
  legion: { cls: 'ossumancer', name: 'Bone Legion', tab: 0, r: 5, c: 1, kind: 'passive', desc: 'Skeletons and the Colossus gain life and damage. You can keep one more skeleton standing at levels 1 and 10.' },

  // ---------------- MARROW: bone spells (weaker as your aura runs thin)
  spear: { cls: 'ossumancer', name: 'Bone Spear', tab: 1, r: 0, c: 0, kind: 'cast', mana: 6, desc: 'Hurl a spear of bone that pierces everything in its line. Like all bone spells, it hits harder the more shards orbit you.',
    perks: [{ l: 5, v: 'splinter', name: 'Splinter', desc: 'The first enemy it pierces sprays bone splinters to either side.' }, { l: 10, v: 'impale', name: 'Impale', desc: 'Enemies it pierces are pinned in place for a moment.', stat: ['spi', 50] }] },
  ribcage: { cls: 'ossumancer', name: 'Rib Cage', tab: 1, r: 1, c: 1, kind: 'cast', mana: 9, shards: 2, desc: 'A great rib cage erupts under the target: the ribs pierce everything inside and hold it there, bleeding marrow, until the cage crumbles.',
    perks: [{ l: 8, v: 'mdrain', name: 'Marrow Drain', desc: 'Held enemies feed your aura a shard every second.' }] },
  wall: { cls: 'ossumancer', name: 'Bone Wall', tab: 1, r: 2, c: 0, kind: 'cast', mana: 10, desc: 'A line of bone pillars bursts up at the target, stabbing what stands there and blocking missiles.' },
  spikes: { cls: 'ossumancer', name: 'Bone Spikes', tab: 1, r: 2, c: 2, pre: 'ribcage', kind: 'cast', mana: 10, shards: 2, desc: 'Spikes burst outward from the bones of the enemy at the cursor, tearing it and everything around it.',
    perks: [{ l: 8, v: 'bloom', name: 'Ossuary Bloom', desc: 'Enemies killed by the spikes burst into spikes again.' }] },
  sstorm: { cls: 'ossumancer', name: 'Shard Storm', tab: 1, r: 3, c: 1, pre: 'spear', kind: 'cast', mana: 8, desc: 'Fire your aura: every shard orbiting you (up to a limit) flies out and hunts an enemy. Your armor goes with them.' },
  marrowm: { cls: 'ossumancer', name: 'Marrow Mastery', tab: 1, r: 5, c: 1, kind: 'passive', desc: 'All bone spells deal more damage, and thin aura weakens them less.' },

  // ---------------- CARAPACE: the body
  aura: { cls: 'ossumancer', name: 'Shard Aura', tab: 2, r: 0, c: 1, kind: 'passive', desc: 'You pull bone shards out of the ground; they orbit you as armor. Each shard turns aside part of every blow, and hits can knock them loose. Shards gather faster near the dead.',
    perks: [{ l: 5, v: 'spurs', name: 'Bone Spurs', desc: 'Enemies that strike you in melee are cut by your shards.' }, { l: 10, v: 'deeppull', name: 'Deep Pull', desc: 'You draw bone from corpses much farther away, and much faster.' }, { l: 15, v: 'reforge', name: 'Reforge', desc: 'Every shard you gather mends you.', stat: ['vit', 60] }] },
  blade: { cls: 'ossumancer', name: 'Bone Blade', tab: 2, r: 0, c: 2, kind: 'passive', desc: 'A long blade of bone grows along your weapon: your attacks hit harder and cleave into a second enemy.' },
  sweep: { cls: 'ossumancer', name: 'Scythe Sweep', tab: 2, r: 1, c: 2, pre: 'blade', kind: 'cast', mana: 5, shards: 1, desc: 'Swing a bone scythe in a full circle, cutting everything around you and knocking it back.' },
  host: { cls: 'ossumancer', name: 'Bone Host', tab: 2, r: 2, c: 1, pre: 'aura', kind: 'cast', mana: 8, desc: 'Your skeletons climb onto you and fuse into your armor: you grow larger, and your blows land harder for every skeleton you carry. Blows chip them away; your aura feeds shards in to rebuild them. Cast again to release the survivors.',
    perks: [{ l: 5, v: 'everst', name: 'Everstanding', desc: 'While hosting you take less damage and cannot be knocked back.' }, { l: 10, v: 'shardskin', name: 'Shard Skin', desc: 'While hosting, your aura holds half again as many shards.' }, { l: 15, v: 'titan', name: 'Titanfall', desc: 'While hosting, every third blow slams the ground around you.', stat: ['con', 60] }] },
  gcharge: { cls: 'ossumancer', name: 'Grinding Charge', tab: 2, r: 3, c: 0, kind: 'cast', mana: 8, desc: 'Lower your shoulder and charge to the cursor, grinding through enemies and flinging them aside.' },
  carapm: { cls: 'ossumancer', name: 'Carapace Mastery', tab: 2, r: 5, c: 1, kind: 'passive', desc: 'Your melee hits harder and every shard in your aura turns aside more.' }
});
for (const k in SK) SK[k].cls = SK[k].cls || 'animancer';
