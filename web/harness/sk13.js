
// =================================================================== HEMOMANCER skills (cls: 'hemomancer')
// tab: 0 Brood (minions) · 1 Hemomancy (bleed, blight, blood magic) · 2 Flesh (mutations and consumption)
Object.assign(SK, {
  // ---------------- BROOD
  hatch: { cls: 'hemomancer', name: 'Hatch Brood', tab: 0, r: 0, c: 1, kind: 'passive', desc: 'Fresh corpses near you swell and split open: swarmlings crawl out on their own while your brood has room. Swarmlings are small, fast and hungry. V opens the Flesh panel: brood grafts and orders.',
    perks: [{ l: 5, v: 'frenzy', name: 'Frenzy', desc: 'Swarmlings bite much faster when the enemy is bleeding.' }, { l: 10, v: 'swollen', name: 'Swollen Brood', desc: 'Every corpse hatches one more swarmling.' }, { l: 15, v: 'infest', name: 'Infestation', desc: 'Anything that dies bleeding or blighted bursts into a swarmling.', stat: ['vit', 50] }] },
  eggsac: { cls: 'hemomancer', name: 'Egg Sac', tab: 0, r: 0, c: 0, kind: 'cast', mana: 9, desc: 'Retch up an egg sac at the cursor. It hatches swarmlings after a moment, or you can burst it with Corpse Burst.' },
  swarmcall: { cls: 'hemomancer', name: 'Swarm Call', tab: 0, r: 1, c: 2, pre: 'hatch', kind: 'cast', mana: 5, desc: 'Shriek: the whole brood leaps on the enemy at the cursor and bites in a frenzy for a few seconds.' },
  graft: { cls: 'hemomancer', name: 'Graft', tab: 0, r: 2, c: 0, pre: 'hatch', kind: 'passive', desc: 'Graft a trait onto the whole brood: Fevered Blood, Leapers, Clingers or Volatile. Chosen in the Flesh panel (V). A second graft slot opens at level 10. Levels strengthen every graft.' },
  fgolem: { cls: 'hemomancer', name: 'Flesh Golem', tab: 0, r: 2, c: 1, pre: 'hatch', kind: 'cast', mana: 22, desc: 'Knit a giant mound of meat. It lumbers to corpses and eats them, laying an egg sac for each one. With nothing to eat it tears sacs out of its own flesh. Once raised, casting it again sends it to the cursor.',
    perks: [{ l: 5, v: 'sacs', name: 'Brood Sacs', desc: 'Each corpse it eats lays two sacs.' }, { l: 10, v: 'gorge', name: 'Gorge', desc: 'Eating heals it far more, and it grows larger and stronger with every meal.' }, { l: 15, v: 'splitG', name: 'Split', desc: 'When it dies it bursts into a swarm of swarmlings.', stat: ['vit', 60] }] },
  assim: { cls: 'hemomancer', name: 'Assimilate', tab: 0, r: 3, c: 2, pre: 'hatch', kind: 'passive', desc: 'Swarmlings that kill grow fat on it: bigger, tougher and harder-biting, up to twice over. Grown swarmlings give more when devoured or burst.' },
  broodm: { cls: 'hemomancer', name: 'Brood Mother', tab: 0, r: 5, c: 1, kind: 'passive', desc: 'Swarmlings and the Flesh Golem gain life and damage, and your brood can grow larger.' },

  // ---------------- HEMOMANCY
  blance: { cls: 'hemomancer', name: 'Blood Lance', tab: 1, r: 0, c: 1, kind: 'cast', mana: 5, desc: 'Hurl a lance of clotted blood in a straight line. It pierces everything and leaves them bleeding. Like all blood magic, when you run out of Spirit you pay in life instead.',
    perks: [{ l: 5, v: 'coag', name: 'Coagulate', desc: 'The lance spatters blood pools along its path.' }, { l: 10, v: 'lacer', name: 'Lacerate', desc: 'Its bleeding runs twice as deep.', stat: ['spi', 50] }] },
  hemor: { cls: 'hemomancer', name: 'Hemorrhage', tab: 1, r: 1, c: 0, kind: 'cast', mana: 10, desc: 'Curse the ground at the cursor: every enemy in it bursts its veins and bleeds heavily. Bleeding enemies leave blood behind them.',
    perks: [{ l: 8, v: 'exsang', name: 'Exsanguinate', desc: 'Bleeding enemies that die spray their blood over everything around them.' }] },
  vwhip: { cls: 'hemomancer', name: 'Vein Whip', tab: 1, r: 1, c: 2, kind: 'cast', mana: 6, desc: 'Lash a whip of veins in front of you. It lacerates what it hits and drags it toward you.' },
  blight: { cls: 'hemomancer', name: 'Blight', tab: 1, r: 2, c: 0, pre: 'hemor', kind: 'cast', mana: 9, desc: 'Infect the enemy at the cursor with a wasting disease that spreads to its neighbours. Anything that dies blighted bursts into a swarmling.',
    perks: [{ l: 8, v: 'plague', name: 'Plague', desc: 'Blight spreads faster, to two victims at a time.' }] },
  cburst: { cls: 'hemomancer', name: 'Corpse Burst', tab: 1, r: 2, c: 2, kind: 'cast', mana: 9, desc: 'Detonate the corpse, egg sac or swarmling nearest the cursor in a burst of meat and bile that blights what it hits. Grown swarmlings burst harder.',
    perks: [{ l: 8, v: 'chainb', name: 'Chain Burst', desc: 'The burst sets off other corpses it reaches.' }] },
  spool: { cls: 'hemomancer', name: 'Sanguine Pool', tab: 1, r: 3, c: 1, kind: 'cast', mana: 12, desc: 'Open a wide pool of blood at the cursor. You and your brood heal while standing in it; enemies wade through it slowly.' },
  hemom: { cls: 'hemomancer', name: 'Hemomancy Mastery', tab: 1, r: 5, c: 1, kind: 'passive', desc: 'All blood magic, bleeding and blight deal more damage.' },

  // ---------------- FLESH (mutations are worn in slots: two, three with Flesh Mastery; swap them any time in the Flesh panel)
  maw: { cls: 'hemomancer', name: 'Maw Hands', tab: 2, r: 0, c: 0, kind: 'passive', mut: true, desc: 'Mutation: mouths open in your palms. Your blows bite harder, open bleeding wounds and drink life.',
    perks: [{ l: 8, v: 'carnal', name: 'Carnal Hunger', desc: 'Your bites drink twice as much life.' }] },
  chitin: { cls: 'hemomancer', name: 'Chitin Plates', tab: 2, r: 0, c: 2, kind: 'passive', mut: true, desc: 'Mutation: plates of chitin grow over your skin. More armor, and less damage from every blow.',
    perks: [{ l: 8, v: 'barbed', name: 'Barbed Chitin', desc: 'Enemies that strike you in melee are cut on the barbs.' }] },
  tentacles: { cls: 'hemomancer', name: 'Tentacles', tab: 2, r: 1, c: 1, kind: 'passive', mut: true, desc: 'Mutation: tentacles burst from your back and lash out on their own, grabbing enemies in reach and dragging them in.',
    perks: [{ l: 8, v: 'twint', name: 'Twin Tentacles', desc: 'Two tentacles strike at once.' }] },
  gills: { cls: 'hemomancer', name: 'Blood Gills', tab: 2, r: 2, c: 0, kind: 'passive', mut: true, desc: 'Mutation: gills split open along your neck. Standing in blood heals you three times as fast and restores Spirit.',
    perks: [{ l: 8, v: 'bbreath', name: 'Blood Breath', desc: 'Pools you stand in spread wider and last longer.' }] },
  devour: { cls: 'hemomancer', name: 'Devour', tab: 2, r: 2, c: 2, kind: 'cast', mana: 0, desc: 'Eat the swarmling or egg sac nearest you: it restores life and Spirit and gives a stacking bonus to all damage. The bigger the meal, the bigger the gain.',
    perks: [{ l: 8, v: 'glutton', name: 'Gluttony', desc: 'Devour stacks higher and lasts longer.' }] },
  bilehump: { cls: 'hemomancer', name: 'Bile Hump', tab: 2, r: 3, c: 1, kind: 'passive', mut: true, desc: 'Mutation: a swollen hump on your back buds fleshy orbs that crawl after enemies and burst into blighting bile.',
    perks: [{ l: 8, v: 'bloated', name: 'Bloated', desc: 'The orbs burst wider.' }] },
  heart: { cls: 'hemomancer', name: 'Second Heart', tab: 2, r: 4, c: 0, kind: 'passive', mut: true, desc: 'Mutation: a second heart beats beside the first. You mend steadily, and when you fall near death it pounds you back up once in a while.' },
  fmastery: { cls: 'hemomancer', name: 'Flesh Mastery', tab: 2, r: 5, c: 1, kind: 'passive', desc: 'Opens a third mutation slot, and every worn mutation grows stronger.' }
});
