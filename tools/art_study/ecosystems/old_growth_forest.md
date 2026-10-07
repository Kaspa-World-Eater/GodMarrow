# Old-growth forest

*Zones: the Hollow Wood, the Root Deep below it, the old groves along the Pilgrim Road (Act I). The first ecosystem
built; its scene is the judge (`tools/art_study/wood_scene.py`).*

## The real thing
(Studied in `../STUDY.md`, round 13.)

**Every age at once.** Giants of 250 to 1,000 years stand with their bark deeply fissured and their crowns broken and
rebuilt. Middle-aged trees wait under them, saplings under those, and seedlings grow on the logs. The canopy is in
several layers, never one even roof.

**Gaps are the heartbeat.** A giant dies and falls, and opens a gap. Under the closed canopy the floor gets less than
5% of daylight, most of it in brief, moving flecks. In a gap the light comes down and everything that needs it crowds
in. The gap fills and closes over decades, so the wood is a patchwork of gaps of every age.

**Dead wood is half the forest.** In Białowieża almost half of all wood is dead. Snags stand: broken-topped, barkless,
holed, with tiers of brackets. Logs lie in all five decay classes:
1. fresh, held up on its own branches;
2. bark loosening, sagging;
3. bark sloughing in plates, wood still hard, moss starting;
4. soft, blocky, sunk, moss-covered (the most alive of all);
5. a soft hump under moss.

**Nurse logs.** Seedlings grow in a line along a log. When the log has gone, the trees stand on stilts in a row.

**Pit and mound.** An uprooted giant tears up its root plate. The plate stands on edge, taller than a man; the pit
beside it fills with leaves and water, and the plate slumps into a mound. Centuries of these make the floor hummocky.

**The floor in layers.** The litter is this year's leaves. Under it lies fermentation, older matted leaves, and under
that the humus, black and greasy. The litter drifts against things and into pits and thins on mounds. Moss maps the
wet and the still. Ferns grow in wet shade; spring flowers carpet the floor only where the wood has stood unbroken
for centuries. Grass grows only in light.

**Fungi are the other half.** They decay the wood, feed the trees through their nets, and fruit on class 3–4 logs, on
stumps and on snags.

## In Godmarrow
- The Hollow Wood grows on the Hide, the god's skin. The god is dying, so the wood is dying too:
  - blighted crowns, stag-headed oaks with silver dead limbs above the leaves;
  - cankers and bleeding sap, bracket fungi in tiers;
  - dieback twigs, witches' brooms.
- No animals: fungi are the only decomposers, so the dead are never cleared, only softened, and fungi are everywhere
  the dead lie.
- **Deeper (the Root Deep):** the roots reach down into the god. Marrow seeps along the roots, the roots grow pale and
  bone-hard, and the litter darkens and grows greasy (see [the organic deep](organic_deep.md)).

## Species and elements
- **Trees:** the great broadleaf (oak-like), the hornbeam-like understorey tree, saplings in the gaps.
- **Dead wood:** stag-headed giants, snags, stumps, logs in five decay classes, root plates.
- **Floor:** leaf litter (layered, drifting), humus, moss cushions, ferns, gap grasses, mushrooms in clusters,
  brackets, lichen, stones and erratics.
- **Water:** rain standing in old pits (pools), seeps.

## Rules
(`wood_ecosystem.py`)
1. Place the trees, ages mixed, and the snags and stumps.
2. Lay the fallen where they fell, each with its root plate, pit, mound and gap. Nothing stands where a giant fell.
3. Compute light (crowns shade, gaps bright, flecks) and wet (pits, pools, low ground, the shaded side of logs).
4. Derive the floor:
   - litter drifts on the windward side of logs, deep in pits, thin on mounds;
   - moss on logs of class 3 and up, on mounds, at the feet of giants and at the pool's rim;
   - ferns in wet shade, grass and saplings in the gaps;
   - fungi on the dead;
   - bare mineral soil on fresh mounds.
5. Collision: trunk feet, firm logs as rows, the root plate as a thin wall, rocks as their posts.

## Transitions
- **Into deciduous wood:** fewer giants, more even ages, fewer dead.
- **Into moor and heath:** the wood edge, thick with shrubs, the trees shrinking and wind-bent.
- **Into fen:** alder carr, the ground going wet and the trees thinning onto root-islands.

## Objects to craft
- Trees by species, age and health.
- Logs by decay class.
- Root plate, stump, snag.
- Rocks: done (`../../landkit/rock.py`).
- Fern clump, moss cushion, grass clump (done: `../scatter_wood.py`), mushroom cluster, bracket tier.
- Leaf and twig stamps (done: `../litter_stamps.py`).
- Ground tiles: `../tiles_wood.py` (graded C).

## Status
- **Scene:** first complete pass plus three refinement passes, animated, with collision proved.
- **Next:** the root plate's form, the near half of the log, the left log and the mound; then convert every object
  to landkit.

## Living layers (the scene's motion)
- **The one wind, with a gust once a loop.** Grass, ferns and saplings sway in a wave rolling with it. At the gust,
  leaves lift off the floor and skitter.
- **The canopy overhead swaying:** leaf shadows slide over the moonlit floor, and the moonflecks move with them.
- **Ground mist** drifts through the hollows and the gap.
- **Leaves** fall, fluttering.
- **Spores** turn in the lantern's light, and the lantern breathes.
- **Light rays** at dawn and dusk through the gaps (see the shared rules in the README).

**Two bugs on the way.** The fern loop reused the time variable's name, which froze every layer drawn after it. Then
the hero was drawn over the grass in front of his feet; the living layers now keep their depth so what grows nearer
the camera covers him, and a contact shadow grounds him.

## The full inventory (what the old growth needs to be generated anywhere)
Every item is a landkit generator (`tools/landkit/`): a crafted object with parameters, exporting a sprite, normal
map, height, moon shadow and collision posts. "Scene" means it exists only inside `wood_scene.py` so far.

### Ground tiles (the quiet base, the game's 320x160 format)
| Tile | Status |
|---|---|
| Leaf litter, four variants | graded C; repaint due |
| Bare mineral soil (fresh mounds, root plates' pits) | `dirt_0`, first version |
| Humus, dark and wet (pit floors, under logs) | to do |
| Moss carpet (the wet hollows, round the pools) | to do |
| Pit mud and pool margin | to do |
| Trodden path (the pilgrims' and the game's roads through the wood) | to do |
| Root mat (the Root Deep, roots over the surface, marrow-dark) | to do |

### Trees (by species, age, health; each sways with the wind)
| Object | Status |
|---|---|
| Great broadleaf: sapling, young, middle, mature, ancient | studies exist (`tree_anatomy`, `tree_foliage`) |
| Health: blighted crown, stag-headed, dying, dead | study exists (`blighted_tree`) |
| Understorey tree (hornbeam-like) | to do |
| Holly-like evergreen shrub | to do |

### The dead
| Object | Status |
|---|---|
| Snag: barked, barkless, broken-topped, with bracket tiers | scene |
| Stump: cut, snapped, hollow, crumbled heart (foxfire) | scene |
| Log: decay classes 1-5, girths and lengths, broken branch stubs | scene |
| Root plate with its pit and mound | scene |
| Fallen crown debris (broken limbs in the gap) | to do |
| Nurse log with its row of seedlings | to do |
| Stilted tree (where a nurse log was) | to do |

### The floor's life
| Object | Status |
|---|---|
| Grass clump (three sway frames) | done (`scatter_wood.py`) |
| Fern clump (sways) | scene |
| Bracken drift | to do |
| Bramble | to do |
| Moss cushion | to do |
| Mushroom clusters (several kinds) | scene |
| Bracket fungus tiers | scene |
| Foxfire patch | scene |
| Leaf and twig stamps, the fresh fall | done (`litter_stamps.py`) |
| Fallen sticks and branches | to do |

### Stone and water
| Object | Status |
|---|---|
| Erratic, slab, stone, cluster | done (`landkit/rock.py`) |
| Pool in an old pit | scene (water) |
| Seep | to do |

### Living layers and light
| Effect | Status |
|---|---|
| Wind: the base breeze plus gusts every 9-22 s (the game's `core/gust.gd`) | scene |
| Tree sway (more at the crown, more in the gust, each tree its own phase) | scene |
| Grass, fern and sapling sway; leaves skittering at gusts | scene |
| Falling leaves, spores in light, leaf shadows sliding, moonflecks | scene |
| Ground mist | scene |
| Wisp-fire (rare) | scene |
| Light rays by the hour (dawn, dusk, a low moon; in gaps; in mist and spores) | rule written, to build |
