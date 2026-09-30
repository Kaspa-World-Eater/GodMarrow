# Skill tree layouts (board: trees)

Code: `src/zz_mech_trees.js`. It changes only `r`, `c` and `pre`. `req` changes only where the row changes, because it is derived from the row. Numbers, costs and text are untouched, and every tab stays where it was.
Pictures: `trees_png/ba_<class>.png` shows the three tabs before (top) and after (bottom). Full 1920x1080 panel shots are `trees_png/before_<class>_<tab>.png` and `after_<class>_<tab>.png`.

Grid: 3 columns by 6 tiers (levels 1/6/12/18/24/30). Arrows are drawn only inside a tab.

## Common rules used
- **Tabs stay put.** A tab carries play effects: the Marrow shard-cost cut, Logos word power, the Kusho sky bonus and pose colours, the "+1 to <tab> skills" affixes, and the fate pages. Moving a skill to another tab would change play, so every fix is a row, column or prerequisite change.
- **Every prerequisite is the skill the child builds on.** When the true dependency is on another page (skeletons for Bone Host, a brood for Devour and Blood Frenzy), the prerequisite points there. The panel then shows a short stub in the other page's colour on top of the icon, lit once it is learned. The tooltip reads "Requires X (Page page)". Only these three skills are cross-page.
- **Masteries at tier 30 keep D2's "no prerequisite" rule.** The exception is a mastery that is useless without a points-gated minion skill, which now ends that tab's spine: Bone Legion after Reassemble, and Brood Mother after Hivemind.
- **Tiers unchanged except one:** Bone Offering moves from tier 1 to tier 6.

## Weaver of Mirrors (animancer): Mirror / Anima / Logos
- **Mirror.** Clear theme: mirror spells in column 0, the golem in columns 1-2. The mirror skills are left alone. *Problem:* Dazzling Challenge (the golem's taunt) required Overcharge (feeding wisps in), which is unrelated. *Fix:* it now requires Iron Golem, routed around Overcharge. Tier 24 stays empty, and Quicksilver Heart stays a free mastery.
- **Anima.** Clear theme: wisps. *Problems:* Soul Leash required Cull, and Choir Mastery (all wisp damage) required Soul Leash, which is unrelated. *Fix:* Leash moves to column 1 under Condense (great wisp, then leash: the anima constructs Anima Mastery boosts). Choir Mastery now requires Cull, the revenant line.
- **Logos.** *Problems:* three orphans (Wraith Form at 6, Mark of Logos and Aether Orb at 12). Chain of Logos (a speech bolt) hung off Soul Storm. *Fix:* Spirit Ward leads to Wraith Form. Soul Swarm leads to Mark ("everything you command"). Spirit Dart leads to Aether Orb, then Word of Unmaking, then Chain of Logos (the speech line, in column 2).
- Minions: no golem without a point. The 4 base wisps are the class resource, not a minion.

## Ossuarch (ossumancer): Ossuary / Marrow / Carapace
- **Ossuary.** *Problems:* Bone Offering ("tear apart a skeleton") sat at level 1 beside Raise Skeleton, needing skeletons you can't have yet. Grave Tithe (kills give shards) required Raise, and War Horn required Tithe, both unrelated. Unearth hung off Banner. Bone Legion (skeleton mastery) could be bought with no skeletons. *Fix:*
  - Raise Skeleton is the single root.
  - Offering moves to tier 6, directly under Raise.
  - Column 0 holds the war-cries: Banner, then Horn, then Shield of Bones.
  - Column 2 holds the harvest: Tithe, then Unearth.
  - Column 1 is the army spine: Raise, then Colossus (routed past Offering), then Reassemble, then Bone Legion.
- **Marrow.** *Problems:* Rib Cage and Ossify were orphans at tier 6. Bone Spikes (bursting from an enemy's bones) hung off Rib Cage, and Shard Storm off Bone Arms. *Fix:*
  - Bone Spear leads to Siphon, Rib Cage and Ossify.
  - Rib Cage leads to Bone Arms (bone that grips).
  - Ossify leads to Spikes, then Bone Rain.
  - Siphon leads to Shard Storm (fill the aura, then fire it), then Grave Spirit.
- **Carapace.** The theme is clear and the order sound. *Problem:* Bone Host (fuses skeletons onto you) required Shard Aura, so you could reach it with no skeletons. *Fix:* it now requires Raise Skeleton (cross-page).
- Minions: skeletons only rise with a point in Raise (checked in play).

## Hemomancer: Brood / Blood / Flesh
- **Brood.** *Problems:* Graft (traits for the whole brood) hung off the Blood Ooze. Brood Nest hung off Graft. Brood Mother was buyable with no brood. *Fix:*
  - Column 0 is the corpse and tumor constructs: Tumor Toss, then Ooze, then Flesh Golem, then Nest.
  - Column 1 is the whole-brood spine: Hatch, then Graft, then Hivemind, then Brood Mother.
  - Column 2 is the spawnlings: Rabid Charge, then Assimilate.
- **Blood.** *Problems:* Blood Frenzy and Blood Pact (minion buffs) hung off Hemorrhage, so a player could reach them with no minions. Corpse Burst hung off Root Veins, and The Leeches off Hemorrhage by a long elbow. *Fix:*
  - Column 0 is the burst line: Boiling Blood, then Hemorrhage, then Corpse Burst, then Blood Wave.
  - Column 1 has Blood Frenzy, which requires Hatch Brood (cross-page), then Blood Pact straight under it.
  - Column 2 is Blood Vomit, then Root Veins, then Leeches (veins squeeze blood, then leeches drink it).
- **Flesh.** *Problems:* Devour ("eat your spawnling or tumor") required Chitin Plates, so you could reach it with no brood. Gills required Swallow Whole. Molt required Devour. *Fix:*
  - Column 0 is the eating line: Belly Maw, then Swallow, then Devour. Devour requires Hatch Brood (cross-page).
  - Column 1 is Tentacles, then Tumor Hump.
  - Column 2 is the survival line: Chitin, then Gills, then Molt, then Second Heart.

## Shrine Keeper (miasmancer): Miasma / Distortion / Death
- **Miasma.** The three columns are wounds, cloud and thrown. *Problem:* Miasma Hurricane ("whip your cloud into a storm") hung off Contagion. *Fix:* it moves to column 1 under Exhale, completing the cloud spine: Miasma, Nova, Exhale, Hurricane, then Toxicology.
- **Distortion.** Clean: traps in column 0, distortion in columns 1-2, and the Mirror-Sister at the end of the haze line. The Sister is a passive that needs points. No change.
- **Death.** Clean: Omen builders lead to the finishers. Tier 24 is empty. No change.

## Kusho (monk): Radiance / Absence / Destroyer
- **Radiance.** Clean spine: Amber, Morning-Star, Eye, Lotus, then the Sun. No change.
- **Absence.** *Problems:* Mirror-With-No-Face (swallows melee blows) hung off Spit-For-The-Starving. Walks-Without-Feet (withering shadow) hung off the alms bowl. *Fix:* the two swap columns. Bowl leads to Mirror (catch missiles, then swallow blows). Spit leads to Walk (the starved dead's roots, then the withering walk).
- **Destroyer.** *Problems:* Mountain-Falls-Laughing (the heavy belly-flop) hung off Grip-Of-Old-Stone. Pagoda (encase in stone) hung off One-Finger-Truth. *Fix:* Grip and One-Finger swap columns so Grip leads straight to Pagoda (calcify, then encase). That-Which-Bars-The-Way leads to Obsidian and to Mountain (routed).
- The Weeping golem needs points (checked).

## Checks
- `trees_png/check.py`: no two icons share a cell, and every prerequisite sits in a higher row. No arrow crosses an icon, and no arrows from different parents cross or overlap. No orphans at tiers 6-24, and `req` matches the row.
  - Before: 5 orphans. After: 0 problems.
- `trees_png/spend.js`, per class:
  - Clicks a level-1 icon on the real panel and a point is spent.
  - Walks levels 1 to 30, learning greedily. Every skill becomes learnable, first at exactly its tier level, and never before its prerequisite.
  - After 3.5 s, a character with no points has no skeletons, brood, golems, sister or weeper.
- smoke32: ERRS none.
