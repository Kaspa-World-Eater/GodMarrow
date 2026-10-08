# Hollows, alcoves and altars

Holes in the god's veins. A real tree hollow begins where a limb tore off and heart rot got in; the tree rolls
woundwood round the opening, and that rolled lip is what makes a hollow look like a mouth. In the Hollow Wood the
lore's landmarks include the Niche Candle (candles burning deep in a trunk), and in the ritual glade a hero-sized hollow
holds an altar where the rites to bring the god back up out of the earth were held: a stone slab with a spiral of runes
and old blood, red candles that never go out, and a ring of dark runes cut into the tree's flesh round the arch. This
page covers `hollow.py` (mouth, niche and altar kinds) and the relief tool `bark_face.py`.

## The real thing
- **Chapter 5, [cut wood and stumps](../../chapters/05-cut-wood-and-stumps.md):** heart rot hollows a trunk; woundwood
  rolls round every wound.
- **The old-growth ecosystem:** snags holed, crumbled hearts, foxfire in the softest dead wood.
- **The real hollow:** smooth rolled lips of new bark folding in over the edge; inside, soft punky brown rot, darker
  with depth; candles leave wax runs over the sill and soot on the roof above the flames.
- **Chapter 7, [faces in trees](../../chapters/07-faces-in-trees.md):** a mouth in a tree is a hollow with rolled lips;
  any relief grown in bark is stretched smooth and pale over a swelling and stays fissured in the hollows between.
- **Gothic lancet:** a pointed arch of two equal arcs meeting at a sharp apex over straight jambs.

## How it is made
**`tools/landkit/hollow.py:draw(img, zb, dep_scene, to_px, C, u, W, H, D, T, lights, moon, kind, candles, seed,
ambient=0.12, moonlit=0.6, tol=0.5, axis, rc)`**, ray-marched along the game's camera (a height field cannot carve
sideways into a trunk; see [ray-casting](../methods/02-ray-casting.md)):
- `C` the opening's centre on the bark, `u` the trunk's outward normal, `W`/`H` half-width and half-height, `D` depth.
- **The frame** `(out of the bark, across, up)`; the trunk's face is a plane at the hollow, and the scene's own bark shows
  wherever the ray meets that plane, so this draws only the lips, the cavity and what stands in it.
- **Wrapped round the trunk:** with `axis` and `rc` (the trunk's centre and radius at the hollow) the frame wraps round
  the cylinder, so a wide opening sits on a round trunk instead of running off its edge.
- **`_sdf(Q, W, H, D, kind, candles)`** returns `(distance, part)`: 1 lip, 2 cavity wall, 3 floor, 4 candle, 5 slab,
  6 roof drip, 7 rune cut, 8 set wax, 0 bark plane.
- **The woundwood lip:** a rolled tube round the opening, radius `rl = min(W, H) * 0.34` on a mouth, `0.22` otherwise,
  in `R_LIP` (smooth new bark, pale like the bark and lit by the moon).
- **The cavity:** an ellipsoid of depth `D` behind the opening; `R_ROT` punky rot, lit at the rim and dark deeper; the
  moon dims with depth.
- **Kinds:**
  - **mouth:** wide; the lower lip sags (`H * 1.45` below the centre), the upper lip's corners drawn down; a thick lip; a
    wet red gleam deep in the throat (`THROAT`);
  - **niche:** tall, a flat floor and sill at `-0.62 H`, candles on the floor (see [fire, candles,
    wax](fire-candles-wax.md)), soot on its roof;
  - **altar:** a **lancet arch**: straight jambs, then two arcs of radius `2.5 W` centred `1.5 W` either side, meeting at
    an apex `2 W` above the spring line; the cavity follows the arch straight back (`max(cav, (rho - 1) * min(W, H) *
    0.9)`); a stone slab set inside (`R_SLAB`) with the rune spiral, old blood dried in its grooves and flecks of bone;
    the centuries of wax (mounds, stalagmites, roof drips setting as they fall).
- **`rune_mask(xe, xz, rho, W, H)`:** a band a hand's width outside the lips (0.32 yd out, ±0.12 yd across, 5 px tall),
  following the arch exactly (up the jambs, then along both lancet arcs over the point, down to the sill); glyphs 0.22
  yd (about 4 px) wide of whole-pixel strokes (stem, branch, cross-stroke, chevron), chosen glyph by glyph by a hash
  of the cell, no two neighbours alike, a gap between glyphs; cut 5 cm into the bark (`min(xu + 0.05, ring)`), the raw
  dark flesh showing in the cuts.
- **Light:** the candles are point lights inside; one warm light just outside the mouth joins the scene's `LIGHTS`;
  the cavity's visibility is tested where the ray enters the opening, not at the rot behind the bark.
- **Placement** (`vigil.place_hollows`, `_surface`): found on the warped trunk's canonical column and carried out
  through `Warp.from_canon`; the facing chosen in the world, then the twist undone.

**`tools/landkit/bark_face.py:draw(..., canon, tree, a0c, zc, T, lights, moon, moonlit, seed, ambient, tol, relief_fn,
hu, hw, extra)`**: any relief grown in a vein-tree's bark, ray-marched in the trunk's own canonical frame (so it sits
exactly on the warped bark). `relief_fn(u, w) -> (f, eyes, mouth, lips, smooth, seam)` gives the height proud of the
bark and the masks; the default is the old Blind Face; the closed lids above the altar (`vigil.closed_lids`) were
another relief_fn, drawn only where it rises so no patch shows. The trunk's channels are stretched smooth across a
relief and kept only in its hollows.

## Variants and parameters
| Piece | Size | Notes |
|---|---|---|
| Altar hollow | 2.6 yd to its apex, 1.3 yd wide, the sill a step up, deep | lancet, runes, slab, wax, soot; "hero size" |
| Niche Candle | five candles; spill light 1.6 yd | faces the camera, leaning a little into the glade |
| The mouth, now an alcove | three candles | was kind "mouth" (lower lip 1.45) |
| `bark_face` relief | Blind Face 2.1 x 2.7 yd, chin 0.9 yd, brow 3.1 yd | turned 62 degrees toward us; scrapped |

## What worked
- **Woundwood as a real rolled tube:** the lips made the opening read as a hollow and not a hole.
- **A real cavity with depth** and the moon dimming into it; candles as point lights inside.
- **Wrapping the frame round the trunk** (`axis`, `rc`): no flat face on a round trunk.
- **Testing visibility at the opening's entry** (pass 6): the niche glows deep in its trunk.
- **The lancet arch,** the cavity following it back, the runes following it exactly: a ritual opening.
- **Runes as glyphs of whole pixels** about 4 x 5 px.
- **Tendrils routed round the arch, never across its mouth** (see [tendrils and vessels](tendrils-and-vessels.md)).

## What failed, and why (traps)
- **The mouth hidden behind a foreground trunk** (pass 1); **the niche facing away and the mouth edge-on** (pass 2).
- **The mouth read as a knothole** (pass 3): dark lips, black inside. Wider, a sagging lower lip, thicker pale woundwood,
  rot lit at the rim and a red gleam deep in made it a mouth, but it ran off the trunk's edge (pass 4) and stayed
  somewhat side-on. Derek disliked it; it became a small candle alcove.
- **The twist turned the mouth edge-on:** choose the facing in the world, then undo the twist.
- **The opening stayed round** because the round cavity cut the hole, not the arch.
- **The altar placed 18 yd up its trunk:** the stump's roots overwrote the resting ground at the tree's centre; placed
  things take their tree's ground from the warp's record.
- **The rune carving written backwards** (the bark left solid in the cut); then the band ran a yard out round the
  trunk's curve; then the strokes were a third of a pixel.
- **The closed wooden eyes** above the arch: "hate the eyes" (see [eyes](eyes.md)).
- **The Blind Face** on `bark_face.py`: a symmetric sculpted face in profile on the trunk's edge, too small and dark
  (pass 1, D+); turned and enlarged it read (C+), then "the chad face"; scrapped.

## Derek's rulings and grades (verbatim)
- 2026-10-07: "On a different tree, create a mouth that looks like a hollow. And then I want some candles inside the
  hollow of another tree with depth so you can see it glowing."
- 2026-10-07: "Create an altar inside of a large hollow, many dripping red wax candles, wax pour out and into the blood,
  and the first hint of the blood tendrils creeping up the tree and a tiny amount on the others."
- 2026-10-07: "hero size"; "not round ... an arch at the top, pointed"; "a spiral made of runes with a little bit of
  blood and bone stuck to it".
- 2026-10-07: "hate the eyes, instead carve a ring of dark runes into the flesh of the tree around the hollow".
- 2026-10-07: "change that other tree with the weird mouth hole into a small candle alcove".
- 2026-10-07: **"really like the candles in the tree"**.

## Where it is used
- [The ritual glade](../environments/the-vigil.md): the altar tree at the glade's back, the Niche Candle by the path,
  the alcove on the great trunk at the right edge.
- `giant.py`'s heart-rot hollow at the foot (painted, its lip lit, black inside) and the blighted-tree study's foot
  hollow are older painted hollows.

## Status
- **Altar hollow:** 12 passes, **B-**. **Candle alcoves:** 6 passes, **B-**.
- **`bark_face.py`:** kept (removed things are kept) as the tool for any relief grown in bark; the Blind Face is out of
  the scene and the lore, but the tool's default and docstring still describe it.
- **Doc lag:** `hollow.py`'s header lists only "mouth" and "niche"; the altar kind and `rune_mask` are documented in
  the code only.
- **Duplicates to merge:** `giant.py`'s painted heart-rot hollow should become `hollow.py` geometry.
