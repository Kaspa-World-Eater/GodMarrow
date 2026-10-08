# Stones, rocks and paving

Stone is the world's oldest layer: the old road's paving and chapels, older than the Wood ("the roads were there first,
and the Wood grew away from them the way skin grows away from a nail"); the Gate's courtyard of basalt under the Moor;
the flat stones of the Hollow Wood where the pickers lay white caps on Flat Days; erratics and slabs in the old woods.
The god breaks up through stone from below, through its joints first. This page covers loose stones and slabs
(`flat_stone.py`, `rock.py`), the paving and the craggy floor (`ground.py`), and rubble. Walls, columns and the Gate's
megaliths are on [columns, ruins and iron](columns-ruins-iron.md).

## The real thing
- **Chapter 1, [detail and nuance](../../chapters/01-detail-and-nuance.md):** detail is history; each slab from its
  own bed; settling leaves one edge proud of the next (the strongest read in an old pavement); dished wear on the
  paths, arrises round on the path and sharp off it; cracks from point loads with the halves offset; spalls with sharp
  rims; edges hold the information, interiors stay calm.
- **Chapter 2, [ruins, ash, rock and scree](../../chapters/02-ruins-ash-rock-scree.md):** Pompeii's dark basalt
  polygons (40 to 90 cm, 4 to 7 sides, joints of 0.5 to 2 cm as hairlines), the processional way polished paler and
  bluer; rock types and how they break (granite corestones, basalt columns, sandstone on its bedding); scree and
  collapsed walls (one fall side, small core rubble in a ridge, dressed blocks thrown further, islands of stone in
  ash); age read at the edges (fresh pale breaks on dark rinds); lichen size reads as age; cause masks.
- **Chapter 4, [stone and caves at 5 cm a pixel](../../chapters/04-stone-and-caves.md), the settled rule:** at 5 cm
  a pixel a paving stone is 8 to 12 px, a rubble block 4 px, a 2 cm step 0.4 px. **A smooth small dome, lit and
  snapped to a ramp, becomes concentric rings: pillow shading by construction.** Fine height noise turns normals into
  speckle. So a stone is **a tilted plane** (2 to 8 degrees), 1 to 3 **planar chips** (at least 2 to 3 px, each facing
  its own way), **a 1 px bevel**, a dark joint with AO, three tones at most for a 10 px stone. Normals never blurred.
  Its tilt is the variation, not texture.

## How it is made
### The flat stones (`tools/landkit/flat_stone.py`)
- **Form** (`stamp(X, Y, H, c, size, yaw, seed)` returns `(H, part, info)`; part 1 top, 2 side, 3 chip): a convex
  polygon of 5 to 7 sides, longer than wide (radii `0.55 size` by `0.36 size`, split on its bedding); standing 0.07 to
  0.14 size out of the peat; its top a plane tilted 3 to 7 degrees (`tilt` up to 0.12 each way); a bevel 0.03 yd deep
  over the outer 0.045 yd; 1 to 3 planar chips, each a cut plane at its own angle. All height in the world.
- **Colour** (`paint`): the Wood's own `STONE` ramp, 8 tones from `#110f11` to `#756653` (dark, damp, weathered
  grey-brown), the light scaled by 0.72 so it never shines cream; bedding bands down the sides; chips one step paler
  (fresh); moss at the wet foot on the side turned from the moon; lichen rosettes with a pale growing ring on the dry
  top.
- **Caps** (`caps`, `draw_caps`): see [fungi and the three lights](fungi-and-lights.md).
- **The spiral** (`vigil.py:_spiral_stones`): small sunk stones along an opening spiral round the glade (`r =
  0.9 + 0.62 th`), three quarters of a yard apart, pushed (σ 0.12 yd), 16 percent gone, never on a trunk, the stump,
  the pilgrim or the bones; every fifth a larger flat one (size 0.82 to 0.92) that the pickers still cap. Felt, not
  seen.

### Rocks (`tools/landkit/rock.py`)
- `make(kind, seed)`; kinds **erratic** (granite, a yard or two, rounded with a few broad worn facets, sunk a third,
  thick moss cap, lichen rosettes, a wet line at its foot), **slab** (sandstone on its bedding, flat-topped, chipped,
  cracked, tilted), **stone** (half a yard, rounded, half buried), **cluster** (three to six together).
- `boulder` is an ellipsoid cut by facet planes, the cuts rounded with a smooth minimum (`smin`); `cracks` are cut into
  the height; `moss_cap` is a raised cushion (top and north side, thickest in the crown's hollows); `lichen` on the lit
  faces, now and then rust-orange.
- Ramps `GRANITE`, `SANDST`, `MOSS`, `LICHEN`, `RUST`. Exported with posts filled greedily; stones under a quarter-yard
  are stepped over.

### Paving and the craggy floor (`tools/landkit/ground.py`)
- **`_poly(px, py, seed, heave, path, facet)`:** warped Worley cells (0.78 yd; warp 0.35 so no lattice shows) give
  irregular stones 0.45 to 1 yd; patches of small repair cobbles (0.36 yd cells) where a slow fbm passes 0.62; joint
  gap 0.008 to 0.018 yd plus `heave * 0.06`; each stone settled (±0.02 yd) and tipped its own way, more where
  `heave` lifts it. With `facet=True` (chapter 4) the top is a plane tilted ±0.08 a yard, the outer 0.05 yd bevelled
  down 0.028 yd, and up to three planar chips.
- **`paving_height(..., facet)`** returns the real height for the world field; **`paving_poly(..., selfshade=False)`**
  returns only the material: dark basalt (`BASALT`), the processional way polished paler and bluer (`BASALT_POL`), a
  warm rind off the way (`BASALT_RIND`), pale ash fines (`FINES`) in the hairline joints, sparse vesicles, rare lichen.
- **`craggy_height(px, py, seed, source_dist, path, relief, reach, pw)`, LOCKED:** old paving heaved and tipped by
  something beneath; `CRAGGY = dict(relief=1.6, heave_reach=1.3, heave_pow=1.6)`; heave is
  `clip(1 - source_dist / reach)^pw`, so every stone near the source is lifted and tipped, each a lit top and a shaded
  face casting on its neighbour. With `source_dist` small everywhere (a crack network) the whole floor goes craggy.
- **Rubble** is still scene-local (`flesh_scene.py` `kind="rubble"`, `paint_rubble`, `R_RUBBLE`): a near ridge of small
  core stones, big dressed blocks thrown further out, half sunk in ash.

**Light:** the depth effect (MASTER_RULES 0.6): height into the 0.04 yd world grid, colour with `selfshade=False`, the
engine lighting the real normals with the moon's and lamps' shadows; `NORMAL_BLUR` 0.35 in the Gate, 0.6 in the glade.
See [form and depth](../methods/01-form-and-depth.md), [values, ramps, dither](../methods/05-values-ramps-dither.md).

## Variants and parameters
| Generator | Use | Key parameters |
|---|---|---|
| `flat_stone.stamp` | the Wood's flat stones, the spiral | `size`, `yaw`, `seed` |
| `rock.make` | erratic, slab, stone, cluster | `kind`, `seed` |
| `ground._poly` / `paving_height` / `paving_poly` | courtyard paving | `heave`, `path`, `facet`, `selfshade` |
| `ground.craggy_height` | ground torn up from below (locked) | `source_dist`, `relief` 1.6, `reach` 1.3, `pw` 1.6 |
| `ground.flags` | the first square-coursed flags (retired) | `heave`, `moon` |

## What worked
- **Building the paving from a real ruin** (Pompeii, Gate passes 58 to 59): it read as real paving at the first render,
  which no tweaking of invented flags had done.
- **Flags on the world's axes** (diamonds in this camera) read as a floor; screen-aligned rectangles read as a wall.
- **Height first, light from the form** (passes 89 to 90): lit tops, shaded sides, stones casting on their neighbours.
- **Heave placed by its cause:** only near the god's own parts (the eye, the vein, the pool), a little lift at the
  cracks' edges.
- **Faceted stones** (pass 93): each a flat plane at its own tilt, a bevel, planar chips: chiselled stone, each its
  own tone.
- **No two stones alike** (pass 73): mostly basalt, with robbed pale limestone, red tuff, carved slabs with worn lines;
  each stone its own fate (cracked with the far piece dropped, sunk under ash, gone to an ash-filled pit).
- **Gradual edges:** paving running out under ash in stages (thick ash, thin ash with tops showing and joints full,
  bare paving).
- **The flat stones' own ramp** (`flat_stone.STONE`) in place of the borrowed sandstone: they stopped shining cream in
  the lantern and sat in the ground.
- **Small true-scale things on calm stone in light** (the bones by the lantern) read; on busy ground they vanish.

## What failed, and why (traps)
- **Flags along the screen axes:** "a brick wall painted flat" (pass 55).
- **Flags lit by a painted lip and fall:** smeared plaster; colour pretending to be form.
- **Height computed, then used only to shade a colour** (passes up to 88): the world stayed a smooth sheet. "it's 1
  dimensional, there's no depth to it, no 3D". Now MASTER_RULES 0.5.
- **Heave from distance to any flesh,** with cracks everywhere, tipped every stone (pass 89): a boulder field. Derek
  liked it, so it was locked as the craggy floor, but for a courtyard the heave must stay near its cause.
- **Pillowed domes** at 8 to 12 px: rings, "cartoony". Superseded by planes (chapter 4).
- **Joints too wide and the flesh in every joint** (pass 58): cobbles, not Pompeii.
- **The pustules' light tinting the yard olive** flattened it (pass 73); a sick light must stay local.
- **Stamped tiles of flags:** "the stone tiles look too similar"; "tiles look terrible and reused".
- **The borrowed rock in the church** (Derek: "the rock is a reused asset") and the Gate's: "the rock sucks too".
- **A stone placed on the pilgrim's spot** read as a pedestal (the ruin's fallen voussoir); keep the threshold clear.
- **Rubble as lumps:** dressed blocks keep a crisp arris, faces darker than tops, a lit lip where they meet (pass 87).
- **The grey wall against the brown floor:** "it should be the same materials for the most part" (pass 95). One warm
  stone for the floor, walls and rubble.

## Derek's rulings and grades (verbatim)
- 2026-10-06: "the stones should be more irregular and the lines less intense."
- 2026-10-07: "the stones and tiles just look awful, you really need to spend a lot of time on that"; "The ground looks
  pretty bad still"; "The stone tiles look too similar."
- 2026-10-07: "study famous ruins and Ashen grounds and the forms of different types of rocks and scree and then apply
  it to your tile building."
- 2026-10-07: "do another study on stone and caves, because it looks cartoony. i get the impression you aren't using
  enough pixels, whereas your desert sands look great".
- 2026-10-07: "Much better ... have the rules updated with the depth effect"; **"the craggy look looked really good, lock
  that tech for later areas"** (MASTER_RULES 0b).
- 2026-10-07: "so why can't we apply that to everything? look at the flat shitty texture of the back walls".
- 2026-10-07: "arrange the small stones so the vague impression is of them once being arranged in a spiral, long ago".

## Where it is used
- [Caves and the organic deep](../environments/caves-and-the-organic-deep.md) and [the Ashen
  Moor](../environments/ash-moor.md): the Gate in the Flesh's basalt courtyard, faceted and heaved near the god.
- [The ritual glade](../environments/the-vigil.md): the flat stones, their caps and the spiral.
- [Ruins and stone](../environments/ruins-and-stone.md): the church floor (`tiles_ruin.church_flags`, retired road).
- [Old-growth wood](../environments/old-growth-wood.md): `rock.py` in the game's set.

## Status
- **The craggy floor:** LOCKED (keep or improve only). Note it keeps the pillowed `_poly` recipe; `facet` is an option.
- **Courtyard paving:** passes 54 to 93 of the Gate; faceted and height-first; no Derek grade on its own since "the
  ground looks pretty bad still".
- **Flat stones and the spiral:** 5 passes, **C+**. **Rock.py:** first version, called reused; owed a redesign per
  scene.
- **Duplicates to merge:** `ground.flags` (square courses, retired) and `_poly`; `rock.SANDST` and the flat stones'
  first borrowed ramp; scene-local rubble (`flesh_scene.py`) into a landkit rubble generator (convex polytopes,
  chapter 4 recipe B).
