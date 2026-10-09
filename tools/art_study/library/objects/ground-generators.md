# Ground generators

The ground under everything: the Moor's ash over the god's cheek, the old road's paving, the god's flesh breaking up
through the cracks, the carr's black peat and tussocks under the Hollow Wood, the worn way to the altar. The rule
(MASTER_RULES 2b.6): **no ground is a stamped picture repeated across the floor.** Every surface is a generator that
paints each place from its own world position, so no two yards of any map are alike; the generator is the asset. Every
generator has two outputs, a **height** that goes into the world (FORM IS LAW) and a **colour** that is only the
material. This page covers `ground.py`, `fen_ground.py` and `tile_sheet.py`; the stone itself is on [stones, rocks and
paving](stones-rocks-paving.md).

## The real thing
- **Chapter 2, [ruins, ash, rock and scree](../../chapters/02-ruins-ash-rock-scree.md), ash:** grain sizes (ash under
  2 mm is colour only, lapilli 0.5 to 1 px speckle, bombs are sprites); ripples 5 to 20 cm across the wind with coarse
  crests; drift tails in the lee of every object and scour hollows windward; wet ash crusts and cracks into polygons with
  curled lit rims; **groove bottoms pale with ash, ribs dark**; obsidian where blood ran into ash; wildfire's white ghosts
  of things burned away; the cause masks (exposure, edge, water path, traffic, wind, age, burial).
- **Wetlands and the old growth:** peat black and wet, sedge tussocks as mounds, sphagnum and brown mosses on the
  hummocks, still water in every hollow lying level, leaves matted dark into the wet; litter drifts against things, deep
  in pits, thin on mounds.
- **Chapter 4 and report 1:** the ground stays quiet so the story pieces read; true-scale small things need contrast,
  not size.

## How it is made
**The depth effect** (MASTER_RULES 0.6; [form and depth](../methods/01-form-and-depth.md)): the height goes into the
scene's world height field at the 0.04 yd grid, added to the ground under it, only where nothing stands (tag 0), before
the scene is cast and lit; the colour generator is called with `selfshade=False`; things standing on it take their ground
from the same height; relief true to the thing; heave placed by its cause.

**`tools/landkit/ground.py`** (hashes `h1`, warped Worley `cells`, `fbm`; every call at another place gives other ground):
- `ash(px, py, seed)`: broad tone pools, drifts banked along the wind, ripples only on soft drift, crusted plates only in
  patches; warped cells so no lattice shows; broken cracks; cinders (a quarter of the first count) and rare bone grit.
- `flags(qa, qp, px, py, seed, heave, moon)`: the first laid flagstones, wandering hand-laid courses, every stone its own
  size, tone, tilt, chips, crack and fate; ash-packed joints (retired by `_poly`).
- `paving_height`, `paving_poly`, `craggy_height` (`CRAGGY`, locked): see [stones, rocks and
  paving](stones-rocks-paving.md).
- `flesh_height(px, py, seed)`: lumps on warped cells 0.5 to 0.8 yd, each a dome 0.05 to 0.1 yd, the larger folds'
  creases (1.5 yd cells) sunk 0.06; `flesh(px, py, seed, moon, selfshade)`: swollen lumps, creases, two nets of veins,
  bruise and rot by place, pores, a wet mask on the swollen tops that face the light. In the Gate the flesh rises
  through the cracks (0.16 yd at a crack's heart).

**`tools/landkit/fen_ground.py`:**
- `height(X, Y, seed, keep)` returns `(dH, water, level, tus)`: hummock and hollow a yard or two across (fbm at 0.45,
  ±0.17 yd), finer relief (±0.04 yd), sedge **tussocks** (`_tussocks`: domed mounds 0.25 to 0.4 yd across, 0.12 to 0.28
  yd tall, tufted by `1 + 0.18 sin(5 ang)`, spaced 0.22 a square yard), thriving where the carr is wettest; pools where
  the ground is low and no tussock stands, levelled at the water table.
- `paint(img, m, v, px, py, water, tus, T, moon, depth, sx, sy, lamp, path)`: peat (`R_PEAT`), matted leaves in broad
  patches near the peat's hue (`R_LEAF`), brown mosses dulled by night with ragged cushion edges (`R_SPHAG`), straw on
  the tussocks (`R_STRAW`); the pools as blood (see [blood and fluids](blood-and-fluids.md)) or black water; warm only
  near the flames (the GROUND painter had no warm hue until the altar).
- **The worn way** (`vigil.fen_floor` and `paint(..., path)`): a path trodden for generations from the glade's front
  to the altar's blood, about 0.42 yd half-width with a wandering edge; trodden flat (`dH * (1 - path * 0.85)`: no tussock
  stands on it), pools kept off it, packed peat paler and a little warmer, moss creeping back in from its edges.

**`tools/landkit/tile_sheet.py`** ("show me just the tiles as assets"): a tile is only a window onto the generator,
a 320 x 160 iso diamond (about 9 yd across) under a plain moon, no scene; surfaces ash, paving, way, flesh, and "cracked"
(the god coming up through the floor's cracks: warped cells 2.8 yd, crack width widening by fbm); the last row shows
neighbouring tiles cut from one stretch of ground, each different, meeting without a seam. Preview
`landkit/previews/tiles_sheet.png`.

**For the game** (`docs/archive/ACT1_PLAN.md`): the generators cannot be stored as images per zone (a Moor alone would be tens of
megapixels at 36 x 18 px a yard, times seeds and zones). The plan is to **port them to a Godot ground shader**, as the
blood already is (`shaders/blood_pool.gdshader`): colour and normal from world position, unique without end, no storage,
lit by the game's lights so the form law holds in the game. Not built yet.

## Variants and parameters
| Surface | Height | Colour |
|---|---|---|
| Ash | (slope shading toward the moon; no height export yet) | `ground.ash` |
| Basalt paving / processional way | `paving_height(..., facet=True)` | `paving_poly(..., path, selfshade=False)` |
| Craggy floor (locked) | `craggy_height` | `paving_poly` |
| Flesh | `flesh_height` | `flesh(..., selfshade=False)` |
| Fen and carr | `fen_ground.height` | `fen_ground.paint` |
| Retired tiles | baked into the albedo | `tiles_wood.py`, `tiles_moor.py`, `tiles_ruin.py` |

## What worked
- **World-position generators instead of stamped tiles:** no repeat anywhere (Gate pass 25), then made the rule.
- **The depth effect:** "much better"; lit tops, shaded faces, stones casting on their neighbours.
- **Light-direction slope shading** for the ash's micro-form (sample a step toward the moon): drifts gained form.
- **Gradual transitions read from the same maps:** paving running out under ash in stages; flesh feathering over stones.
- **One idea for the whole place** (cohesion, report 1 §20): ancient stone everywhere, the god only where it breaks up.
- **Quiet ground:** the glade's floor calmed (broad matted patches near the peat's hue) so bones, stones and caps read.
- **Tussocks as height** and pools levelled at their own rims: "dark wet carr under the giants".
- **The worn way** leading the eye to the altar; brought back after the calming hid it.

## What failed, and why (traps)
- **Stamped tiles** (ash, putrid, flags): "tiles look terrible and reused". One small picture repeated.
- **Ash cracks as unwarped Voronoi:** a hex lattice. **Cinders too many:** "flat dirty concrete with too many black
  cinder dots". **The thread pattern** as a lattice over too wide a band: a white dash grid; then scribble.
- **Height used only for colour:** "it's 1 dimensional, there's no depth to it, no 3D".
- **The flesh one same-sized net everywhere,** no big shapes, hard cut-outs at its edges: "patchy and jumbled".
- **The flesh glittering** by the socket (pink glitter): calmer, larger lumps, few pores, sheen only on lit tops.
- **The fen's moss as green camouflage blotches** (pass 1), a pool under the pilgrim.
- **The first warm ground tint** turned the whole fen orange.
- **The floor's fine speckle** busy at the edges (the glade at B-), calmed in the last round.
- **Tiles at the wrong scale** (STUDY round 10): ripples 4 px apart broke into dashes. Read the projection first.
- **A soft feature mask** left a field of dying half-ripples; a sharp mask gives clean patches and quiet ground.

## Derek's rulings and grades (verbatim)
- 2026-10-06: "The world you craft is only as good as its foundation."
- 2026-10-07: "tiles look terrible and reused, rule was every piece unique and a work of art"; then "yes" to the rule.
- 2026-10-07: "is the ground a tile? Needs to look more alive with the mycelium threading in and out".
- 2026-10-07: "build scenes, which also means building the reusable tiles for the game"; "show me just the tiles as
  assets".
- 2026-10-07: "it's 1 dimensional, there's no depth to it, no 3D, which is why everything looks so flat"; "why do these
  tiles look so different and low pixel count".
- 2026-10-07: "for the tiles make them a little fen like".

## Where it is used
- [Caves and the organic deep](../environments/caves-and-the-organic-deep.md) and [the Ashen Moor](../environments/ash-moor.md):
  ash, paving, the craggy floor and the flesh (`flesh_scene.py`); the Moor's retired tiles (`moor_scene.py`).
- [Fen and carr](../environments/fen-and-carr.md) and [the ritual glade](../environments/the-vigil.md): `fen_ground`
  and the worn way.
- [Old-growth wood](../environments/old-growth-wood.md): still on the retired `tiles_wood.py` litter (graded C-).

## Status
- **Fen floor and the worn way:** 6 passes, **B-**. **Gate ground:** passes 25 to 93, last Derek word "the ground looks
  pretty bad still" before the depth effect, then "much better".
- **Retired but still shipped:** `build_set.py` still puts `tiles_wood` and `tiles_ruin.church_flags` into the game's
  old-growth set, and `tile_sheet.py` renders colour with self-shading. Both belong to the retired tile road.
- **Not built:** the Godot ground-shader port; ash as exported height; litter as height for the old growth; the moss
  carpet, humus, pit mud, root mat and trodden path of the old-growth inventory as generators.
- **Duplicates to merge:** the old wood's tiles into a world-position litter generator; `ground.flags` into `_poly`.
