# Form and depth

Everything in Godmarrow that has height in the real world is built as real height: put into the scene's world
height field, or ray-cast as a solid (see [ray-casting](02-ray-casting.md)), then lit by the renderer through its
own normals. Colour only says what the material is. This page covers the law (FORM IS LAW), the way it is applied
to ground and objects (the depth effect), how stones are shaped (tilted planes, never domes), why normals are never
blurred, the locked craggy floor, and the one thing colour may still carry: what is smaller than a pixel. Use it for
every ground surface and every object, before any colour is chosen.

## The rule
- [MASTER_RULES](../../../../docs/MASTER_RULES.md) section 0, FORM IS LAW: nothing is painted flat; the light comes
  from the form; texture only for what is smaller than a pixel; the value-only test every pass; a height computed
  and then used only to shade a colour breaks the law.
- MASTER_RULES 0.6, the depth effect: height into the world at the grid's resolution, `selfshade=False`, relief true
  to the thing, heave placed by its cause, things standing on it take their ground from the same height.
- MASTER_RULES 0b: the craggy floor is a locked technique (keep or improve only, one shared place).
- [PAINTED_STANDARD](../../../../docs/PAINTED_STANDARD.md) rule 12 (form before texture) and checklist line 3.
- **Superseded advice.** MASTER_RULES 0.1 still lists "each paving stone's dome" and 0.6 "worn paving: domes a few
  cm"; [chapter 2](../../chapters/02-ruins-ash-rock-scree.md) and report 1 (technique 14) built Pompeii paving as
  pillowed domes. [Chapter 4](../../chapters/04-stone-and-caves.md) supersedes all of them: at 8 to 12 px a smooth
  dome becomes "concentric rings of tone: pillow shading by construction". Stones are **tilted planes with planar
  chips and a bevel, never domes**. The wording in MASTER_RULES 0 should be brought in line (only Derek or the
  rules' owner edits that file).

## How it is done
**The depth effect (every surface generator):**
1. The generator has two outputs: a **height** in yards and a **colour** (the material only). Height functions:
   `tools/landkit/ground.py:paving_height`, `ground.py:flesh_height`, `ground.py:craggy_height`,
   `tools/landkit/fen_ground.py:height`, `tools/landkit/flat_stone.py:stamp`, `tools/landkit/vein_stump.py:stamp`,
   `tools/landkit/vein_tree.py:stamp`.
2. A build hook adds the height into the world grid `W["H"]` (resolution `wood_scene.RES` = 0.04 yd, under a pixel)
   **before** the scene is cast, only where nothing stands (`W["tag"] == 0`), and copies it into `W["Hrest"]` (see
   [the scene engine](08-scene-engine.md)). Examples: `tools/art_study/flesh_scene.py` (paving `facet=True` times
   1.05, faded in by the courtyard's soft edge; the flesh rising 0.16 yd at a crack's heart plus `flesh_height`
   lumps) and `tools/art_study/vigil.py:fen_floor` (hummocks and tussocks added where `keep`, each pool then
   levelled at its own rim with `nd.label` and the minimum of the ring round it).
3. The colour is called with `selfshade=False` (`ground.py:paving_poly`, `ground.py:flesh`); `fen_ground.py:paint`
   and `flat_stone.py:paint` take the scene's light `v` and never compute their own.
4. The engine lights it (`tools/art_study/wood_scene.py:shade`): normals from the gradient of `H`; the moon's shadow
   marched 70 steps of 0.08 yd toward `SUN`, starting 0.12 yd out along the normal with a 0.03 yd bias; the lantern
   and every `LIGHTS` entry marched 24 steps; AO from `gaussian_filter(H, 8) - H`.
5. Anything standing on the ground reads its ground from the same `H` (`wood_scene.py:settle_hero`; the stones,
   bones and candles look up `W["H"]`). Read an object's ground **before** stamping it (see failures).
6. Place relief by its cause: heave only near what pushes up (the eye, the vein, the pool in the Gate; roots for the
   stump), never everywhere.

**Stones as tilted planes** (chapter 4 section 5A; `ground.py:_poly(..., facet=True)`):
- polygon cells (relaxed, warped Voronoi so no lattice shows), 0.45 to 1 yd;
- the top a plane at its own height (settle plus or minus about 2 cm) and its own tilt (chapter 4: 2 to 8 degrees);
- a bevel: the outer 0.05 yd drops 0.028 yd, so the arris is one lit or one shaded pixel;
- up to three planar chips at the edges and corners, each a cut at its own angle (radius 0.16 to 0.32 yd from the
  centre, slope 0.3 to 0.75), so each takes its own tone;
- joints 0.05 yd down; cracks across the short span with the far piece dropped 0.018 yd;
- heave lifts (up to 0.18 yd) and tips (0.22 slope per unit of heave) the stones near its cause;
- the same rule for other stone: `flat_stone.py:stamp` (a slab split on its bed), the stump's axe facets
  (`vein_stump.py`, three big planes on its top), the gate posts' chisel facets and the columnar basalt walls.

**The value-only test** (MASTER_RULES 0.4; chapter 4 section 5F): take the colour away and look at value alone,
posterised to four steps, and at a thumbnail. Every stone must show a top tone, a facet of another tone, a lit lip
and a dark joint; for any stone you can say where the light comes from. There is no switch for this in the code yet;
render the frame, convert to luminance, posterise, and look at it beside the colour frame every pass.

**Normals are never blurred.** `wood_scene.NORMAL_BLUR` is the number of cells of Gaussian blur on `H` before its
gradient. Blur rounds every facet into a pillow. The engine's default (1.0) is for the old judge scene; the Gate
sets 0.35 and the ritual glade 0.6. Chapter 4 says never blurred; any value above 0 is a debt to clear (library
README, "settled by the latest evidence").

**The craggy floor (LOCKED, MASTER_RULES 0b).** `ground.py:craggy_height(px, py, seed, source_dist, path)` with
`CRAGGY = dict(relief=1.6, heave_reach=1.3, heave_pow=1.6)`: old polygon paving heaved and tipped by something
beneath, every stone a lit top and a shaded face casting on its neighbour. `source_dist` is yards to whatever heaves
it (a distance transform of the flesh, a fault, roots); where it is small everywhere the whole floor goes craggy. Use
it where ground has been torn up from below. Keep or improve only; never fork a copy.

**Colour only for what is smaller than a pixel** (chapter 4 section 2): grain, vesicles in sparse one-pixel
clusters, stain, moss, wet, polish, lichen, a per-stone shift of about 5 percent in value and 3 degrees in hue.
Anything a pixel or larger (a 5 cm chip, a joint, a rut, a tilt) is height. Never put sub-pixel noise into height: it
only makes speckle.

## What worked
- The Gate's floor, passes 89 and 90: paving and flesh heights into the world, colour without self-shade. "3D at
  last (lit tops, shaded sides, stones casting on their neighbours, the flesh sunk dark between)".
- Pass 93: stones faceted (planes tilted 2 to 8 degrees, one-pixel bevel, up to three chips) "read as chiselled
  stone, each its own tone".
- Pass 94: the cave walls as columnar basalt prisms (flat tops at broken heights, bevelled, dark joints).
- Pass 97: the gate posts rough-hewn as chisel facets, each its own tone in the fires' light.
- The woodcutter's stump, pass 6: the top simplified to three big planes ("a face about 30 px wide holds three
  tones"); the value test reads lit top, lit lobes, dark flank.
- The fen floor: tussocks and hummocks as height, pools lying level at their own rims; the stump, bones and stones
  stand on the same height.

## What failed, and why
- **Height used only for colour** (the Gate's floor before pass 89): `ground.py` computed every stone's height and
  the flesh's lumps but only shaded colour with them, so the world stayed a smooth sheet: "1 dimensional".
- **Heave from the distance to any flesh** (pass 89): the cracks run everywhere, so every stone tipped into a
  boulder field. Fixed by heaving only near the god's own parts; the look itself was kept as the craggy floor.
- **Pillowed domes** (passes 57 to 59, chapter 2's recipe): read as paving at first, then as "cartoony" pillow
  shading; normal blur made it worse. Fixed by planes (pass 93).
- **A painted lip and fall on the flags**: "smeared plaster", colour pretending to be form (report 1).
- **Form in deep shadow** (pass 94): the basalt prisms were real but read only as a faint dark honeycomb. Form shows
  only where light grazes it; pass 95 added low fissure lights grazing the columns.
- **The stump's clamped flare** (stump pass 1): cutting the tall flare flat at the cut made a flat cream shelf, one
  white blob in the value test; its facets were too small to read. Fixed with the stump's own modest flare and bigger,
  steeper facets (0.24 x 0.55, then 0.36 x 0.8 radii).
- **Features finer than the grid**: Cap Hollow's skeleton bones (one pixel) were lost in the 0.04 yd height field
  (hollow_camp pass 5). Below the grid, draw by hand in whole pixels, depth-tested (hollow_camp pass 6).
- **A height field cannot overhang** (STUDY round 13): a branch held out becomes a column to the ground. Overhangs,
  cavities and anything sideways into a trunk are ray-cast instead.
- **A piece lit for one world, left in another** (report 1, technique 20): pieces made under an open sky kept their
  sky terms after the scene became a cavern, and the scene read as a collage. Re-light every piece when the premise
  changes.

## Derek's rulings and grades
- 2026-10-07: "Add the form rule to the rules. It's important because it gives depth and realness, not flat painted
  bullshit."
- 2026-10-07, on the Gate's floor: "it's 1 dimensional, there's no depth to it, no 3D, which is why everything looks
  so flat."
- 2026-10-07: "do another study on stone and caves, because it looks cartoony. I get the impression you aren't using
  enough pixels, whereas your desert sands look great".
- 2026-10-07, after pass 90: "The craggy look looked really good. Lock that tech for later areas. Much better, make
  note of what you did here and have the rules updated with the depth effect".
- 2026-10-07, after pass 93: "so why can't we apply that to everything? look at the flat shitty texture of the back
  walls".
- 2026-10-07, after pass 95: "still looks mono toned and flat, and so does the bone and gate pillars."
- 2026-10-07, on the stump (pass 11, graded B- in the glade's table): "Looks good."

## Used by
- Scenes: `tools/art_study/flesh_scene.py` (paving, flesh, craggy, basalt walls), `tools/art_study/vigil.py`
  (fen floor, flat stones, stump, vein-trees).
- Landkit: `ground.py` (`paving_height`, `paving_poly`, `flesh_height`, `flesh`, `craggy_height`), `fen_ground.py`,
  `flat_stone.py`, `vein_stump.py`, `vein_tree.py`, `gate.py`, `column.py`.

## Sources
- [MASTER_RULES](../../../../docs/MASTER_RULES.md) sections 0, 0b; [PAINTED_STANDARD](../../../../docs/PAINTED_STANDARD.md)
- [Chapter 4: stone and caves](../../chapters/04-stone-and-caves.md); [chapter 1](../../chapters/01-detail-and-nuance.md);
  [chapter 2](../../chapters/02-ruins-ash-rock-scree.md) (superseded on domes); [chapter 5](../../chapters/05-cut-wood-and-stumps.md)
- [Report 1: the Gate in the Flesh](../../reports/01-gate-in-the-flesh.md), techniques 12, 14, 20, 24
- Pass logs: [flesh_scene.md](../../../landkit/passes/flesh_scene.md) (passes 57 to 97),
  [vigil.md](../../../landkit/passes/vigil.md) (stump, fen floor, flat stones),
  [hollow_camp.md](../../../landkit/passes/hollow_camp.md) (passes 5, 6)
- [STUDY.md](../../STUDY.md) rounds 10, 13
