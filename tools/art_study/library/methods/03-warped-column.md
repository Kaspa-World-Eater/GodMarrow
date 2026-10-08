# The warped column

Every trunk is a straight canonical column, stamped once into the world's height field, and then warped by height
when the scene is cast and lit: it swells at the butt, tapers slowly, swells and pinches, its axis leans and
sweeps, and its section twists, so its bark channels wind round it. The engine sees a real solid in every
direction; the outline wavers as the channels pass the edge, the channels cast their own shadow, and the painted
fissures twist with the wood for free. Use it for every standing trunk. Read
[chapter 6](../../chapters/06-old-growth-trunks.md), section 4, before touching any tree.

## The rule
- [MASTER_RULES](../../../../docs/MASTER_RULES.md) 2.3: no primitive stand-ins ("no cones for trees, tubes for limbs
  or trunks"); section 0: every ridge and channel is real geometry; 8.7: rework every older tree with the warped
  column (the judge scene, Cap Hollow, `tree.py`, `giant.py`).
- MASTER_RULES 5: true scale; the forest is felt from under it, crowns above the frame.
- Chapter 6: a height field can only hold a downward-closed solid, so a section that changes with height can't be
  stamped; it must be a warp of a column.

## How it is done
**1. Stamp the canonical column** (`tools/landkit/vein_tree.py:stamp(X, Y, H, trees, north, seed)`; trees are
`(x, y, girth, height, seed)`):
- the section is lobed by 5 to 8 vein-ridges (`_ridges`, `_lobe`: each `amp * exp(-(d/w)^2)`, amp 0.12 to 0.26,
  width 0.16 to 0.3 rad), radius `R * (1 + lobe - 0.06) - _channels(theta)`;
- 9 to 16 bark channels (`_channels`): each 0.035 to 0.08 rad wide and 0.04 to 0.09 R deep, combined by `max` so
  they braid where they meet; at R 1.3 a channel is up to about 0.12 yd, 2 to 3 px;
- the buttress flare runs out along the ridges, `flare = R * (1.15 + lobe * 6)`, sweeping down concave (power 2.4);
- roots leave the ridges facing north and steer to the next tree's foot that way, half buried, sinking as they go;
- tags: `1 + i` on trunk and flare, `-(1 + i)` on roots. The scene writes trunks into `W["HT"]` and roots into
  `W["Hrest"]` (see [the scene engine](08-scene-engine.md)).

**2. The warp** (`vein_tree.Warp(trees, grounds)`; per tree, `_at(T, z)` returns `s, wx, wy, tw` at height z above
its ground `g0`):

| Term | As built | Chapter 6 recipe |
|---|---|---|
| Butt swell | `1 + 0.16 * exp(-z / 1.1)` (on top of the stamped flare) | `1 + 0.45 * exp(-z / 1.2)` |
| Taper | 0.8 percent a yard | about 1 percent a yard |
| Swellings | 2 to 4.5 percent on 3 to 6 yd, plus 1 to 3 percent on 1.5 to 3 yd | plus or minus 4 percent on 3 to 6 yd |
| Lean | 0.008 to 0.022 yd a yard, its own direction | a lean |
| Sweep | 0.12 to 0.3 yd, wavelength 8 to 14 yd, fading in over the first 3 yd | 0.1 to 0.3 yd over 15 |
| Twist | 0.05 to 0.11 rad a yard times `(0.6 + 0.4 R)` (about 2.4 to 7 degrees a yard), plus `0.12 sin(z/5)`; 60 percent turn one way | 3 to 8 degrees a yard, more on bigger trees |

The butt swell is smaller in code because the buttress flare is already in the stamped column; the recipe's 0.45
would double it.

**3. The engine's `TRUNK_WARP` hook** (`tools/art_study/wood_scene.py`):
- `cast`: each ray point is first moved by the wind's lean (`lean`), then `TRUNK_WARP.to_canon(x, y, z)` (un-offset,
  un-twist, un-scale), and looked up in `W["HT"]`; everything else is looked up unwarped in `W["Hrest"]`;
- `shade`: each trunk pixel's normal (from the canonical column's gradient) is turned back out by the twist at its
  height, `TRUNK_WARP.normal_back(n, px, py, pz, tag)`;
- the hit point returned for a trunk pixel is **canonical**: the bark painter paints in the canonical frame, so its
  fissures wind with the twist. The scene's depth `px + py` on a trunk is therefore a few tenths of a yard off the
  world depth; ray-cast pieces' depth tolerance (0.35 to 0.5 yd) covers it.

**4. Placing things on a trunk** (eyes, hollows, tendrils, reliefs):
1. Choose the facing in the **world** (for the glade: toward the camera, `pi/4`, leaning a little into the glade).
2. Undo the twist at that height to get the canonical angle: `ang = world_angle - Warp._at(T, g0 + zh)[3]`.
3. Find the bark's surface on that line in the canonical column (`vigil.py:_surface`: step out until
   `W["HT"]` falls below the height).
4. Carry the point out through the warp: `Warp.from_canon(i, x, y, z)` returns the world point and the twist; turn
   the outward normal by the same twist. `vigil.py:place_eyes`, `place_hollows` and `_tendril_paths` all do this.
5. For a relief drawn on the bark, pass a `canon(X, Y, Z)` that undoes the lean and then calls
   `Warp.to_canon_one(i, X, Y, Z)` (`vigil.py:draw_face`, `draw_lids`).
6. Take the tree's ground from the warp's record (`Warp.t[i]["g0"]`), not from the height field at its centre.

**5. Stills force `t = 0`.** `cast(W)` with no time skips the trees' own lookup; with `TRUNK_WARP` set it forces
`t = 0`, so a still has the warped trunks too.

## What worked
- The vein-trees, warped: "every trunk swells at the foot, wavers along its outline, sweeps off true and carries its
  channels up. No tube left" (C+ at first; B in the glade's closing table).
- The channels as geometry: the moon lights their walls and they shadow themselves, so the outline wavers 1 to 2 px.
- Facing chosen in the world, then the twist undone: the hollows and eyes face the camera on every trunk.
- Tendrils follow the warped bark: their path is laid on the canonical lobed radius, carried out with `from_canon`,
  then moved by the lean, so they climb the real surface.

## What failed, and why
- **Tubes** (the old judge scene and `giant.py`): straight round trunks read as primitives. `giant.py` pass 2
  warped the ray-cast picture by rows instead, which gave "jagged steps from the warp" (giant pass 10).
- **Twist turned the mouth edge-on**: a facing chosen in the canonical frame is turned by the twist at its height.
  Choose in the world, then undo the twist.
- **Things placed without the warp** sat off the bark (in the air or inside the trunk). Everything on a warped
  trunk goes out through `from_canon`.
- **The stump's roots overwrote the resting ground at a tree's centre**, so the tree's ground read about 17 yd and
  the altar was placed 18 yd up its trunk. The roots now never write over a standing trunk (`stamp_stump` writes
  `Hrest` only where `HT < -40`), and hollows and eyes take their ground from `Warp.t[i]["g0"]`.
- **Trunks written into the resting ground** (vein-tree pass 3): the bark measured up from 17 yd and painted every
  tree in the canopy's dark. Trunks go into `HT`; their ground stays in `Hrest`.
- **Build-hook order**: inserting each hook at index 0 one at a time shifted the rest (chapter 6), so the floor, the
  trees, the stump and what grows on the trees no longer ran in that order. Insert the scene's hooks as one ordered
  list.
- **Watch:** `Warp.to_canon` applies each tree within 4 R of its axis, and the last tree in the list wins where two
  overlap. Keep trunks more than 4 R apart, or one tree's warp will bend its neighbour.

## Derek's rulings and grades
- 2026-10-07: "No tree is a perfect tube like you've made. They have changes in thickness. They taper, they twist
  ... do a study on trees, old growth trees like Douglas firs ... channels running down the bark that give it kind
  of a wavy shape."
- 2026-10-07: "great job on the turning trees. More realistic and not just tubes" (the vein-trees graded B).
- 2026-10-07: "we're going to have to go back and edit our old assets with this new information" (MASTER_RULES 8.7).
- 2026-10-07: "you are reusing assets in this scene, against the rules" (why the vein-tree was made new for the glade).

## Used by
- Landkit: `vein_tree.py` (`stamp`, `Warp`, `_ridges`, `_lobe`, `_channels`), `vein_stump.py` (the same section,
  cut), `bark_face.py` (reliefs in the canonical frame), `hollow.py` (with `axis`), `bark.py` (the shared bark).
- Scenes: `tools/art_study/vigil.py` (`stamp_vein_trees`, `place_eyes`, `place_hollows`, `_tendril_paths`,
  `draw_face`, `draw_lids`).
- Still to carry back (MASTER_RULES 8.7): `wood_scene.py`'s own trees, `hollow_camp.py`, `landkit/tree.py`,
  `landkit/giant.py`.

## Sources
- [Chapter 6: old-growth trunks](../../chapters/06-old-growth-trunks.md), sections 3 and 4
- [vigil.md](../../../landkit/passes/vigil.md): "no tree is a perfect tube", vein-tree passes, the altar's
  bugs
- [giant.md](../../../landkit/passes/giant.md) (the row-warp attempt)
- [MASTER_RULES](../../../../docs/MASTER_RULES.md) 2.3, 5, 8.7
