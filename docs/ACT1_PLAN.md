# Act I, finished: the plan

*For Derek, 2026-10-05. Nothing new is designed until Act I is a whole, playable, polished game from the title to the
Ossuary Matron's death. Every system it needs already exists in the browser build (v105) or the Godot build; this plan
finishes, fixes and hardens them. Acts II to V, the endgame and new systems wait.*

## What "done" means

A new pilgrim can start from the title, be Read, wake in the camp, walk the Ashen Moor to the Ossuary Matron through
every Act I zone and errand, die and come back, quit and continue, and never meet a crash, a hole in a wall, a creature
standing in a statue, a black shape sliding over the screen, or a zone they have seen before. The night is dangerous,
the lantern matters, the pack fills up, the gold runs short. Derek plays it through and says it is good.

## What I found (2026-10-05, the game run on Derek's PC, screenshots of moor, wood, fen and crypt by day and night)

- **It does not crash.** The smoke test passes: 0 script errors for all four orders, the panels and the title. What's
  wrong is that it doesn't play well, and the smoke test can't see that.
- **The black tree shapes** are `world/foreground.gd`, the "near dark" layer: almost-black grass and reeds drawn over the
  edges of the frame at 1.45x parallax. Trunks and branches were already taken out once (2026-09-30); the reeds and
  grass that are left still read as the same black blots. The browser never had this layer. It goes.
- **Collision is tiles only** (`world/zone.gd`: walls, cliffs, trees, rocks, water, pillars, palisades as whole tiles).
  Chests, statues, gravestones, fences, lantern posts, altars, the waystone ring, the camp's folk: you walk through all
  of them, and so do monsters. Bodies are tested at four points, so corners are cut.
- **Maps are not random.** Every zone was exported from the browser at three seeds (12345, 777, 4242) and a run picks
  one (`core/game.gd`). After three games you have seen every map.
- **The look is behind the browser** (port audits 1 to 3): no light map (coloured light on ground and walls, flame
  halos, a shadow from every flame, embers), the lantern pool too wide and not tinted by the wick, flames fluttering
  instead of breathing, wisps without their wake and dust, one flat shadow, canopy dapple inverted, no moonlit clearings,
  white light-shaft bars laid over the wood and the crypt, blocky fog patches, corpses that don't topple, no blood pools.
- **The camp's folk are placeholders** (blank figures with black faces) and several Act I creatures have no real art.
- **Smaller gaps** from the audits: the worm digs through catacomb floors, rocks block sight (they shouldn't), the wand
  bolt deals the wrong damage, the heavy swing has no impact, hour banners and lines are missing, the chill / freeze /
  shatter chain is missing.

## The order of work

Each step is one or a few commits. The game plays after each, the smoke test stays at 0 errors, and each step ends with
screenshots (or a short clip) you can look at. The browser decides look and behaviour; where it and Godot differ, I copy
the browser, not "improve" it.

### 1. Clear the screen (small, first)
- Remove the near-dark foreground layer.
- Remove the white light-shaft bars that sit over the screen; the browser's shafts are in the world, by day, in the
  woods only. Port those or none.
- Replace the blocky fog patches with the browser's mist (only seen where light reaches it).

### 2. Solid objects
- Every object gets a footprint from its base: round for trunks, rocks, posts, statues and folk; boxes for chests,
  altars, coffins, carts; whole tiles for walls, fences and palisades. Footprints go into the path grid and the body test.
- The body test checks a circle, not four points, so corners can't be cut.
- Monsters push apart in a ring instead of stacking (the browser's `pushOut`).
- A debug view (`--show=collision`) draws every footprint, so we can see what blocks.

### 3. Random maps from seeds
- Port the browser's Act I generators to GDScript: `genMoor`, `genFen`, `genDungeon` (crypt, barrow, catacombs),
  `zz_act1_expand` (the other Act I zones), `zz_openness` and `zz_zz_world89` (open ground, wanderers, tree lines),
  `zd_world22` (lanterns, shrines, altars, chests) and the prop placement in `z_props21`.
- They use the same random generator (`mulberry32`), so **the same seed gives the same map in both builds**. That is
  the test: generate zone X at seed N in the browser and in Godot, and compare tile for tile. Hundreds of seeds,
  automatically.
- A new game takes a fresh seed; Continue keeps the run's seed. Towns and errand vaults stay hand-laid. The three
  exported seeds are retired.
- Every generated zone is checked automatically: every exit reachable, no route narrower than 5 tiles, the lantern and
  waystone reachable, the boss room reachable.

### 4. The lantern, the dark, the day and the weather (the signature)
Ported to the browser exactly, checklist section 7 and the audits:
- **Lantern:** the pool's x0.62 and its day term; the wick colour tints the pool; flames breathe (eased 0.2 s, rare
  gutters and flares) instead of fluttering.
- **The light map:** coloured light in ground and walls, quantised bands, flame halos, the hero's rim light from the
  nearest flame, a shadow from each nearby flame, embers and smoke.
- **The lantern's gameplay:** light is visibility; the dimmed wick (L) with its risk and reward; the lantern keeps a
  little on each death, waiting where you fell; the flame's mood (stutter under 30% life, gutter when a boss wakes);
  eye-shine; item glints.
- **Shadows:** the silhouette shadow away from the lantern, one per near flame, the sun's turning with the hour.
- **Day and night:** the 600 s day, hour banners and lines, the creatures each hour brings (Gasps and Moth-Saints only
  after dusk) and the damage each hour gives. Moonlit clearings.
- **Weather:** one shared wind for mist, leaves, dust, grass and the flame; mist banks seen only in light; rain on the
  fen; dusk embers and dawn dust.
- **Wisps** with their ghostly wake, dust and breathing glow.
- Done means: a capture of the browser and of Godot, same zone, same seed, same hour, side by side, matching.

### 5. Act I whole, start to finish
- Every Act I zone generated and connected; every portal arriving where it should.
- The six errands (the Carrion Warden, the Sighing Lantern, the Widow's Daughter, the Reader's Ink, the Tallow-Mother,
  the Ossuary Matron) start, track and finish, with their rewards and lines.
- Lantern-stones, waystones, shrines, the hidden Arcana shrine, chests, the god altars and their Heralds.
- The camp: Maren, Sister Ysolde, Brannoc, Esk, the Stranger and the Reliquary Chest all working.
- The Matron's death ends Act I with a closing card; Act II is "not yet walked".
- **A walker bot:** a scripted pilgrim that plays the act zone by zone (walk to every exit, kill, pick up, touch every
  lantern, die once, save and continue), run under the real renderer, logging anything stuck, unreachable or broken.
  It runs after every big change.

### 6. Friction: the act made harder, not easier
D2 is hard in the hands as well as in the fights: a small pack, things that need a trip to town, potions you carry and
ration. Godmarrow already has some of this (a 10x4 grid, a 4x4 belt, potions that heal over time, scarce gold and
items, gold left where you die, a 48-slot shared stash, one Hollow Token for a respec, poise as stamina with walking
draining it). The browser removed nothing; these sharpen it. **You choose; I build only what you pick.**
1. **Unread items.** Magic, rare and unique items drop unread: you see the base, not the affixes, and can't wear them
   until read. A leaf of reading (sold by Maren, takes an inventory cell) reads one; after the Reader's Ink errand, Esk
   (or whoever you name) reads them in camp for nothing. This gives the errand a reason and fills the pack.
2. **No free road home.** The only ways back are walking, a kindled waystone, or a consumable (one inventory cell, or a
   belt slot in place of a potion), bought in camp. *(Today the only road home is a waystone or the lantern list, which
   is free. Keep it that way, or add the bought one-way road so the trip home costs something.)*
3. **Nothing stacks in the pack.** Potions stack only in the belt (4 per column); spares in the pack take a cell each.
4. **Wear and repair.** Weapons and armour wear with use and with death; Brannoc mends them for gold. A broken item does
   nothing until mended.
5. **Gold is picked up by hand** (a click), not by walking over it, so that a fight among the coins costs something.
6. **The automap shows only what your light has touched.**
7. **Tallow for the lantern** *(new, so only if you want it)*: the wick burns tallow; it lasts a good while, is bought
   or found, and runs low in long dungeon stretches, which is when the dimmed wick earns its keep.
8. **Difficulty in the numbers, not in sponges:** the browser's Act I curve is kept (ease 0.5 at monster level 5, 1.0 at
   10, 1.2 at 25), checked by the walker bot and by your play.

### 7. Creatures and folk with real art
- Every Act I creature (20 kinds, 4 Heralds, 2 bosses) and the camp's folk as shape sprites through PixelForge, at the
  game's scale, with walk, attack, hit and death clips. Corpses topple from their last pose and darken; blood pools.
- The combat-feel steps from `GAME_HANDOFF.md` (a reaction to every blow, the string's windows, the heavy's charge
  levels, telegraphs as data) go in here, tuned by play.

### 8. Polish and your playthrough
- The audit's small items: worms on stone floors, rocks not blocking sight, the wand bolt, the hit-stop on big hits,
  the level-up pillar, the ERRAND FULFILLED and LEVEL banners, the chill / freeze / shatter chain, music cues per zone.
- You play Act I through with each order. Whatever you hate goes on the list, gets fixed, and you play again.

## Questions for Derek
1. Which frictions (step 6, 1 to 8)?
2. Step 3 is the biggest piece (about 3,000 lines of the browser's generator code). Do it third, as listed, or first?
3. Anything you've seen in play that's broken and not on this page?
