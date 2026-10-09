# Rework the old scenes, bake the assets, generate Act I's forests from seed

Derek, 2026-10-07: "continue with the plan: rework and improve old scenes. Then create the assets. Then attempt to make
the area for act one, at least the forest areas, and see if it looks better, has open areas and there are enough
assets to not look repetitive. Dialing in asset placement and creating the code that does it perfectly from seed is
very important." Also: "update the workbench and reshare every time we reach a true milestone."

Every stage below ends at a milestone. At each milestone the workbench is updated (the new render in place of the
old) and its link reshared. The library (`tools/art_study/library/`) is the reference for every technique named here.

## Stage 1: rework and improve the old scenes
Each old scene is brought up to what the Vigil taught. Each gets its own graded passes in its pass log.

| Scene | What it needs |
|---|---|
| **The old-growth judge** (`wood_scene.py`) | Trunks as warped columns with bark channels (taper, swell, wander, twist); normals unblurred; the retired leaf tiles replaced by a world-position litter generator with real height (drifts, pits, mounds); the old layers checked as seamless loops; rain and fog in the world available as options |
| **Cap Hollow** (`hollow_camp.py`) | Its pale trees take the warp and channels; its floor the new litter generator; its weeping eyes are already 3D |
| **The night chapel ruin** (`ruin_scene.py`) | Paving and blocks as tilted planes with chips (chapter 4), normals unblurred, the bell (its worst failure) |
| **The Gate in the Flesh** (`flesh_scene.py`) | Normals unblurred; the paving's domes made planes (the craggy floor stays: it is locked) |
| **The Jaw** (`moor_scene.py`) | Its teeth onto the ray-cast `fang.py` (`tooth.py` merged into it); its flat painted eye replaced by the approved `eye.py` |

The duplicate code merges as each scene is reworked: `tooth.py` into `fang.py`, the moor eye into `eye.py`,
`deadwood.stump` onto `vein_stump.py`'s method.

**Milestone 1:** the reworked scenes, before and after, on the workbench.

## Stage 2: create the assets (the forest set)
Every object the forests need, baked from its generator into the game's form: a sprite and normal map in the game's
camera, a shadow, collision posts, cover, material and hp. Each object comes in many seeded variants, enough that no
two in view repeat.
- **Trees:** the warped vein-trees (giants, middle, young, dying, dead; each with its own ridges, channels and twist)
  and the broadleaf old-growth trees for the groves outside the Hollow Wood.
- **The dead:** snags, stumps (the vein stump's method), logs in their decay classes, root plates.
- **Stone:** this Wood's flat stones, boulders.
- **The god in the wood:** eye trees, candle alcoves, bleeding stumps, tendrils, used sparingly as the lore says.
- **Floor life:** the three lights, fungi, dead plants.
- **Set pieces:** the Vigil as a dropped-in set piece.
- **The ground:** the litter, fen and worn-way generators, to become a Godot ground shader (`ACT1_PLAN.md`), so the
  floor is unique without storage.

`tools/landkit/build_set.py` writes the set to `art/landkit/<set>/` with `index.json`; `world/landkit.gd` stands them
in the zone. Checked in the game with `tools/smoke.sh`.

**Milestone 2:** the set as a sheet on the workbench (every piece, its variants, beside the Ossuarch for scale), and
in the game.

## Stage 3: generate Act I's forest areas from seed, our own way
Today the maps come from the old browser build's generators (`tools/zone_export`): the clumped stumps and the crowd
of small trees are its placement. The new generator is ours, written from the ecosystem rules (`LIVING_LANDSCAPES.md`,
`ecosystems/old_growth_forest.md`), not ported (Derek: one-to-one porting "has been a disaster").

`tools/worldgen/forest.py`, from (zone, seed):
1. **The zone's bones:** its size, entrances, exits and required features (waystones, shrines, chests, set pieces) from
   `data/zones/`.
2. **The ways first:** paths between the entrances and exits, least-cost across the ground, wide enough to fight on;
   clearings where the ways meet and where set pieces stand. These are kept open before anything grows.
3. **History:**
   - a coarse simulation of centuries: trees born in light, growing, dying, falling;
   - each fall leaves a log in its decay class, a root plate, a pit and mound, and a gap that saplings fill;
   - what is left is the present.
   This gives every age at once, gaps of every age and the dead in true proportion.
4. **Spacing by rule:**
   - blue-noise (Poisson-disk) placement by species and age, so nothing clumps;
   - giants far apart with their crowns out of frame;
   - small trees mostly dead, or seedlings in the gaps;
   - the ways kept clear.
5. **The floor from the maps:** light, wet, litter depth, moss, fen where the ground is low and wet, the worn ways.
6. **The god, by the lore's measure:** a few of its pieces per zone (eyes in the bark, bleeding cuts, the three lights
   by their causes).
7. **Variety:** each placed object takes a variant chosen so that none repeats within a screen (blue-noise
   assignment of variants).
8. **Output:**
   - the Godot zone format (so the game loads it unchanged);
   - a preview render through the scene engine;
   - the numbers:
     - open area (share of the zone walkable and clear);
     - nearest-neighbour spacing (no clumps);
     - variant repetition per screen;
     - walkability (`tools/zone_export/check.py`).

**Milestone 3:** an Act I forest zone at several seeds: the old browser map beside the new one, on the workbench,
with the numbers.

## Order
Stage 1 in the order of the table (the judge first: the forests come from it), then stage 2, then stage 3.
