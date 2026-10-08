# Stumps and deadwood

In a real old-growth wood almost half of the wood is dead: snags standing broken-topped, logs in five decay classes,
root plates torn up on edge beside their pits, stumps. Godmarrow has no animals, so the fungi are the only decomposers
and the dead are never cleared, only softened. In the Hollow Wood the dead wood is also the god's: the woodcutter's
eleventh trunk "ran red down the blade and warm over my wrists", and a cut vein-tree still bleeds years later. This
page covers the woodcutter's stump (`vein_stump.py`), the engine's dead (`deadwood.py`: root plate, stump, snag) and
the fallen logs (`log.py`).

## The real thing
- **Chapter 5, [cut wood and stumps](../../chapters/05-cut-wood-and-stumps.md):**
  - **the notch** on the fall side: a near-level lower face the stump keeps (a ledge sloping slightly down and out),
    the 45-degree upper face gone with the tree;
  - **the back cut** a little higher, from the far side, so the stump stands at two heights;
  - **the hinge** between them tears into a ridge of silver, stringy splinters, the tallest thing on the stump;
  - **chop facets:** every blow a flat, slightly dished plane with a sharp ridge to the next; an axe face is a field of
    planes (chapter 4's rule for stone);
  - **chips** 5 to 15 cm, a finger thick, mostly on the notch side; old ones grey, curl, sink and moss over;
  - **height** knee to waist; springboard slots on buttressed giants (not used: they do not fit a height field);
  - **wedges** with mushroomed heads, rusting where water sits;
  - **ageing:** the cut face silvers in a year or two; radial **checks** from the heart outward, widest at the rim;
    the sapwood rots first and slumps; the bark stands as a rim or falls in plates; moss low and wet, lichen high and
    dry; a buttressed stump's section is lobed.
- **The old-growth ecosystem** ([`old_growth_forest.md`](../../ecosystems/old_growth_forest.md), STUDY round 13):
  Maser's five decay classes; nurse logs; pit and mound; brackets on snags; foxfire in the softest wood.

## How it is made
### The woodcutter's stump (`tools/landkit/vein_stump.py`)
**Form** (all height in the world, see [form and depth](../methods/01-form-and-depth.md)):
- `stamp(X, Y, H, c, R, fall, seed, north, others, cut)` returns `(H, part, info)`; parts: 1 cut face, 2 bark, 3 hinge
  splinters, 4 iron, 5 chips, -1 roots.
- **The section** is the vein-tree's own (`vein_tree._ridges`, `_lobe`), so the cut is lobed; the stump keeps its own
  modest flare, a shoulder into the roots, never a shelf.
- **The cut:** cut at 0.6 yd (knee height on the 2-yard hero), girth 1.6 yd across the flare; the top simplified to
  three planes (notch ledge, hinge crest, back cut), because a face about 30 px wide holds three tones (chapter 4).
- **Axe facets** 0.36 x 0.8 radii, each its own tilt (pass 2 began at 0.24 x 0.55 and up to 20 degrees; smaller ones
  did not read).
- **Checks:** three plus one opened into the split; the heart dished; the bark rind a little proud.
- **The hinge** raised into a crest of torn fibre, the stump's highest edge.
- **The bores:** a dark open lumen inside each big ridge (the vein in section, the god subtle), each 2 to 3 px with its
  wall rolled out into a lit lip; two still well up wet, the rest dried.
- **The wedge:** 25 cm, standing in the split; a second dropped on the litter.
- **Chips** on the fall side, greyed and sunk.

**Colour** (`paint`): `R_GREY` silver cut wood (greyed after it read cream), `R_SAP` sapwood (greyed after it read as
moss), `R_IRON`/`R_RUST` for the wedge, bark darker and fissured along the grain up the flare, plates sloughed to grey
wood, `LITTER` banked over the foot (deeper away from the moon). Highlights rolled off with `0.9 * (1 - exp(-1.4 v))` so
a lit facet keeps its tone.

**Blood** (`paint_blood`, the shared `blood.py`): traced downhill on the real height field from each bore, off the
ledge and down the flare's grooves, pooling only on the ground; light capped at 0.55; soaked in at its edges (alpha by
depth). See [blood and fluids](blood-and-fluids.md).

**Life:** the 24-frame loop holds without shimmer; the blood churns faintly.

### The engine's dead (`tools/landkit/deadwood.py`)
- **Root plate:** a disc of roots and earth on edge, taller than a man; thick roots radiating from the butt like spokes,
  snapped at the rim, earth packed between, stones held, a ragged crown of root ends. Collision is a thin wall across
  its width (walk round its ends and behind it); cover full.
- **Stump:** a flared foot on buttress roots, bark up the sides, moss on the north side, a jagged broken top with rings,
  its heart crumbled soft brown with foxfire at night. One post.
- **Snag:** seven yards of silver dead wood split by long cracks, dark holes, bark strips low, the top broken jagged;
  3 to 5 tiers of bracket fungi up its moon side, drawn on because they jut out (a height field cannot hold them).
  Lightning seeks it; fire takes it like a torch; force can fell it.
- Ramps: `BARK`, `DEAD`, `WOOD`, `MOSS`, `SOIL`, `ROOT`, `PEB`, `FUNG_TOP`.

### Logs (`tools/landkit/log.py`)
`make(cls, seed, length, radius)`; the class sets how high it rides (`RIDE`: 1.15, 0.95, 0.55, 0.3, 0.0):
1. fresh: bark tight, riding on its broken limbs, limb stubs along its back;
2. loosening: small plates lifted, a few round stubs, sagging;
3. sloughing: bark off in plates, grey wood split on the grain, moss in strips along the top;
4. soft: sunk, blocky, split into cubes, moss over most, foxfire at night;
5. hump: a ridge of crumb under moss.
Every log ends in a jagged snapped end showing pale wood. Combat: cover to its top; dry (1 to 3) burns, wet (4 to 5)
smoulders; 3 to 5 can be broken. Collision: classes 1 to 3 a row of posts; 4 to 5 are stepped over.

## Variants and parameters
| Piece | Key parameters |
|---|---|
| `vein_stump.stamp` | `R` (girth), `fall` (direction the tree fell: chips and notch), `north` (roots), `others` (trees the roots braid to), `cut` |
| `deadwood.root_plate/stump/snag` | `seed` only; exported to the game set (`build_set.py`) |
| `log.make` | `cls` 1 to 5, `length`, `radius` |

## What worked
- **Building from chapter 5** (notch, back cut, hinge crest, facets as planes): the stump read as axe-cut once the top
  was three planes.
- **The god in the section:** bores as wet red mouths with a lit lip, the one true detail of the eleventh trunk.
- **Blood traced over the real surface** and pooling only on the ground; soaked in at its edges.
- **Contact:** litter banked over the foot, deeper away from the moon.
- **The decay classes as one parameter** with ride height, moss, splits and combat data from it.

## What failed, and why (traps)
- **Pass 1, graded F:** clamping the vein-tree's tall flare at the cut made a flat cream shelf toward the hero (one
  white blob in the value test); the blood stuck to the face in bright red blobs ("ketchup"); the facets too small to
  read; the wedge lost.
- **The brightest thing in frame** (passes 2 to 3): cream cut wood under the lantern. Grey the ramp, roll the
  highlights off.
- **The pool as a round blob, then a dithered block** (passes 2 to 10): soak the edge in by depth.
- **The story's small parts at 2 px** (pass 10): the bores and wedge did not read, so it was "a stump with blood", not a
  vein cut open. Make the story pieces a pixel larger with a lit lip.
- **Reused pieces** (Derek, pass 1 of the glade): the engine's stump, snags with their brackets and logs were reused in
  a new scene, against MASTER_RULES 2b.3. Every scene designs its own.
- **The engine's mushrooms, grass and ferns** leaked in as white specks (pass 4); turned off with `GRASS`/`FERNS`.
- **Logs laid out of order:** an old class-5 hump laid over a newer giant. Lay the dead oldest first.
- **Brackets placed from the snag's 7-yard top** instead of the ground beside it.
- **The root plate as a flat disc of noise** reads as a tombstone; it is read by its spokes.
- **The generator's map** grouped stumps together and crowded small trees (Derek); placement must follow the
  ecosystem's causes (see [old-growth wood](../environments/old-growth-wood.md)).

## Derek's rulings and grades (verbatim)
- 2026-10-07: "i know when you generated the map there were stumps all grouped up and a lot of small trees and it looked
  bad."
- 2026-10-07: "you are reusing assets in this scene, against the rules".
- 2026-10-07, the woodcutter's stump after pass 11: **"Looks good."**
- 2026-10-07, on the ritual glade: "i agree with the critique, except lets not worry about dead trees for this area,
  because its a ritualistic place, so magic or something. do the rest". **No dead wood in the ritual glade:** no
  snags, logs or root plates there (the woodcutter's cut stump stays).
- 2026-10-06: "the base of every tree should have collisions ... walk around it ... we should be able to walk behind"
  (the root plate).

## Where it is used
- [The ritual glade](../environments/the-vigil.md): the woodcutter's stump, its roots braiding north.
- [Old-growth wood](../environments/old-growth-wood.md): the judge scene's fallen giant (class 2) with its root plate,
  pit and gap, the stump and the snag; the game's set (`build_set.py old_growth`: logs in every class, root plates,
  stumps, snags).

## Status
- **The woodcutter's stump:** 11 passes, Derek "Looks good"; the glade's table records **B-** (the pass log's own grade
  at pass 11 was C+).
- **`deadwood.py` and `log.py`:** first versions from STUDY round 13, never given ten graded passes; Derek named them
  reused in the glade. Owed: the root plate's form, nurse logs with their seedling rows, stilted trees, fallen crown
  debris, bracket tiers as their own object.
- **Duplicates to merge:** `deadwood.stump` and `vein_stump.py` (one stump generator with cut kinds: axe-felled,
  snapped, hollow, crumbled); the engine's `wood_scene.py` stump and snag painters and `deadwood.py`'s; the `BARK`,
  `DEAD`, `WOOD`, `MOSS` ramps repeated in `wood_scene.py`, `deadwood.py` and `log.py`.
- **Not yet on the warp:** every deadwood piece is still a straight column or a height-field body.
