# Living landscapes from seeds

*A subchapter of the art study (`STUDY.md`, rounds 11–13). Started 2026-10-06, at Derek's request: "explain what
you're doing here and why it matters, and how you will use it to scale across the world and make full living
landscapes that can be generated from seeds."*

## 1. What I am doing

I am building Godmarrow's land the way the land builds itself, then painting what results.

My first wood floors were painted surfaces: a texture of leaves, tuned until it looked less wrong. They failed
(C-, then C) for one reason. A real forest floor is not a texture. It is a record of everything above it and
everything that died on it:
- a pit beside a mound is where a giant was uprooted three hundred years ago;
- a straight row of trees on stilted roots is where a nurse log lay and has since melted away;
- grass grows only where a canopy gap lets light down.

Each thing is there *because of* something else. Paint the surface and the reasons are missing, and the eye feels it
even when it can't say why. That is why it never looked alive.

So the work now runs in two halves that never mix:

1. **The ecosystem decides *what* is where and *why*.**
   - `wood_ecosystem.py` places the living trees of every age (giants, middle-aged, young), the standing dead and the
     stumps.
   - It lays the fallen where they fell: the recent giant with its root plate on edge, its pit, its gap; the old
     nurse log with its row of seedlings; logs in all five decay classes; centuries of pits and mounds.
   - From those it computes the **light** map (the closed canopy dark, the gap bright, flecks moving as the leaves
     move) and the **wet** map (pits, pools, low ground, the shaded side of logs).
   - It derives the floor from those maps: where litter drifts and thins; where moss, ferns, grass and saplings grow;
     where mushrooms fruit; where bare soil shows.
2. **The painted standard decides *how* each thing looks.**
   - `wood_scene.py` builds a height-field world at true scale (36×18 px a yard, the hero 2 yards tall). It ray-casts
     it in the game's camera and lights it with the moon and the hero's lantern, each with real shadows.
   - It paints every material with hue-shifted ramps and drawn detail, and checks the result against the checklist in
     `docs/PAINTED_STANDARD.md`.
   - Every object (each tree, log, stump, root plate, fern, tuft and leaf) is a crafted, designed thing with its own
     parameters, never a stamp of noise.

## 2. Why it matters

- **Believability.** The player never studies the floor, but they feel it. A wood that obeys its own ecology reads
  as *a place*; one that doesn't reads as *a level*. Old-growth forests hold every age at once (seedlings on logs,
  giants dying, snags standing grey) and that layered time is what "ancient" looks like.
- **Repetition dies by itself.** A floor generated from a placed history has no period to repeat. The tiles become a
  quiet base (humus, litter tone); everything with a *shape* is placed by cause, so no two clearings are alike.
- **The world tells its own story, Dark Souls style.** A fallen giant, a gap, saplings racing for its light: this
  is a story nobody wrote. In Godmarrow's lore the world is a dying god's body. The woods are dying too: blighted
  crowns, dieback, stag-headed oaks. There are no animals (the game's rule), so the fungi are the only decomposers:
  the dead are never cleared, only softened. The ecology *is* the lore, shown and never explained.
- **Gameplay comes out of it for free.** The things the ecology makes are things a game needs, placed for real reasons:
  - **gaps:** bright clearings, where fights read well and the moon shows the monsters' eyes;
  - **logs and root plates:** cover, walls, chokepoints;
  - **pits:** water and mud (the slow ground);
  - **snags and the darkness under the giants:** where things wait (Derek likes eyes gleaming in the dark).

  The same maps that place the moss can place encounters, shrines and loot.
- **Scale.** One person can't hand-paint a world. One person *can* craft a few hundred excellent pieces and a set of
  rules for where they go. Then every seed gives a new, coherent, beautiful land.

## 3. How it scales across the world

### The pipeline (seed → land)

1. **Seed.** One integer per zone (and one per chunk, for large zones), derived from the world seed and the zone's
   name. Everything after it is deterministic: the same seed gives the same wood, every time, on every machine.
2. **Biome rules.** A ruleset per land, matching the game's ground sets (`wood`, `fen`, `moor`, `heath`, `barrow`,
   `ossa`, …). Each ruleset holds:
   - the tree species with their growth habits (crown shape, height, how they age and die);
   - decay rates, the moisture regime, the light regime;
   - what grows where (moss on wet, fern in wet shade, grass in light…);
   - the lore's touches (the blight's reach, which fungi, the bone in the Ossa).
3. **History.** A coarse simulation of centuries, run in a second: trees are born in light, grow, die, fall. Each
   fall leaves a log that decays through the five classes, a root plate that slumps into a mound, a pit that fills
   with leaves and water, and a gap that fills with saplings and closes. What's left at the end is the present.
   History makes the realistic *distributions* (how many logs of each class, how old the gaps are) that placement
   by hand gets wrong.
4. **Maps.** Height (gentle terrain + pits and mounds), light, wet, litter depth, and occupancy (what stands where).
5. **Derivation.** Ground classes per tile; moss, fern and grass fields; the scatter of small things; the placement
   of every crafted prop with its parameters (a log: length, girth, decay class, which way it fell).
6. **Export to Godot.** The game already has the slots:
   - **ground classes** per tile → `shaders/ground_iso.gdshader`'s texture array, with the multi-variant, offset and
     macro-wash tricks against repetition;
   - **scatter items** → `world/zone.gd`'s scatter layer (still and swaying);
   - **props** (trees, logs, plates, stumps, snags) → the zone's sprite props with their foot radii for collision;
   - **light map** → a canopy-shade layer under the game's lights, with the moonflecks as a moving shader;
   - **wet map** → the water classes and footstep sounds (`ground_cls` already tells the feet wet, stone, leaf, ash).

   The existing seeded exporter (`tools/zone_export/`, 20 seeds per Act I zone) is where this plugs in.

### The asset side: crafted once, varied forever

Every prop is a *generator with parameters*, crafted to the standard and graded, not a single drawing:
- a tree: species, age, health, which way it leans;
- a log: decay class, girth, length, how it lies;
- a fern clump: frond count, how wet, how lit.

The generators render to sprites, in the game's camera and at true scale, in the eight lights the game needs.
Their variety comes from the seed, and their quality from the craft, so there's no trade between them.

### What scales to the other lands

The method, not the wood, is the point. Every land gets the same treatment:
- **the fen:** water tables, alder carr on root islands, sedge tussocks, peat;
- **the moor:** wind, heather, stone, a thin soil over rock;
- **the barrows:** old earthworks, the dead under them;
- **the bone desert of the Ossa:** the dune is already a small instance: wind makes ripples, an obstacle makes a
  scour and a tail, footprints fill.

Each needs its own study of the real thing first (as round 13 studied old growth), then its rules, then its crafted
pieces.

## 4. Where it stands (kept up to date)

| Step | State |
|---|---|
| Ecosystem study (old growth: ages, gaps, dead wood, decay classes, pits and mounds, nurse logs, light, wet, floor layers, fungi) | done, `STUDY.md` round 13 |
| The plan generator: placement → light/wet maps → floor derivation | `wood_ecosystem.py`, first version |
| The painted scene from the plan (the judge, Derek: "I want to see it fully finished") (height field, moon + lantern with shadows, rims, bounce, living layers) | `wood_scene.py`; Derek: "looking fantastic … still needs a ton of work". The floor now carries the ecology: litter by depth (windward drifts, pits deep, mounds bare), fresh leaves as placed scatter under the grass |
| Ground tiles in the game's format, with the anti-repetition tricks | `tiles_wood.py`; C. Now a quiet base (the fresh fall moved to placed scatter); repaint still due |
| Crafted pieces: grass clumps (sway frames), leaf and twig stamps | first versions (`scatter_wood.py`, `litter_stamps.py`) |
| The object library (`tools/landkit/`): every object a reusable generator exporting sprite, normal map, height, moon shadow, footprint (Derek: "every rock every grass like everything") | `kit.py` (camera, cast, light, export) and `rock.py` (erratic, slab, stone, cluster); rocks stamped into the scene from the same generator |
| Collision for every object, as the game's posts (circles a body slides round, `world/zone.gd`): trunk feet; rocks' own posts; logs of class 1-3 as rows (4-5 stepped over); the root plate a thin wall you walk behind; grass, ferns and leaves walked through | `wood_collision.py` (proved: an A* path walks round the log and behind the root plate); landkit objects export their `posts` |
| The history simulation (centuries of birth, growth, death, decay) | not started |
| Export to Godot (classes, scatter, props, light map) | **done for the Sunken Bog** (2026-10-08): seeded maze, walkability proof on 100 seeds, chunked bake with normals, heights and wind, in the game at 60 fps (`library/methods/10-baking-a-land.md`). The wood is next with the same method |
| Other lands' studies and rules | not started |

## 5. Next

1. **The floor carries the ecology:**
   - litter deep in pits and banked against the windward side of logs, thin and bare on mounds;
   - the fermentation layer dark beneath;
   - the base tiles repainted until their value pattern is as clear as the dune's ripples.
2. **Each object painted to the standard,** one at a time, graded: root plate, log, trunks, stump, snag.
3. **Ferns and moss** at their true density.
4. **Motion:** grass in the wind, moonflecks moving, leaves falling, spores in the lantern, the lantern breathing.
5. **The history simulation.**
6. **The first export into a real Godot zone,** to see a seeded wood in the game itself.
