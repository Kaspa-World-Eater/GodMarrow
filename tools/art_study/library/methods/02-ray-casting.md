# Ray-casting forms along the game's camera

A height field holds only what is closed downward: it cannot hold a ball, an overhang, a cavity cut sideways into a
trunk, a tube arching over the ground, or a face grown on a twisting column. Those are ray-marched per pixel along
the game's own orthographic camera, as true solids, lit through their real normals, and composited into the scene
by depth. This is how the approved eye was made, and the fangs, bone, vessels, hollows, the altar and the grown
reliefs on bark. Use it for any organic or carved form, anything that must hide what is behind it and be hidden by
what is in front, and anything a height field cannot hold.

## The rule
- [MASTER_RULES](../../../../docs/MASTER_RULES.md) section 0 (FORM IS LAW: "It goes either into the scene's height
  field at fine resolution or into a ray-cast form"), 2b.1 (every object a reusable landkit asset) and 2.3 (no
  primitive stand-ins: no tubes for limbs or trunks).
- [PAINTED_STANDARD](../../../../docs/PAINTED_STANDARD.md) rule 12: "a height field or model, ray-cast and lit through
  normals".
- Report 1, technique 1: ray-casting along the game's camera is the method that turned the eye from D- to B+.

## How it is done
**The camera** (every module repeats it: `KX, KY, KZ = 18.0, 9.0, 21.0`, world px per yard across, deep and up):
- `VIEW = normalise(1, 1, 2*KY/KZ)`, pointing toward the camera; depth is `x + y`, **larger is nearer**;
- `tools/art_study/wood_scene.py:to_px((x, y, z))` gives screen `((x - y)*KX + ox, (x + y)*KY + oy - z*KZ)`;
- a screen pixel back to a world point at height z: `a = (SX - ox)/KX`, `b = (SY - oy + z*KZ)/KY`,
  `x = (a + b)/2`, `y = (b - a)/2`.

**The pattern** (`tools/landkit/eye.py:draw`, `fang.py:draw`, `bone.py:draw`, `vessel.py:draw`, `hollow.py:draw`,
`bark_face.py:draw`); each is called as `draw(img, zb, dep_scene, to_px, ..., lights, moon, ...)`:
1. A screen window round the object from `to_px` of its bounds (return at once if it falls off the screen).
2. For each pixel, a ray origin `O` on the camera ray at the object's height, pushed toward the camera by
   `VIEW * span`; march away from the camera, `P = O - VIEW * t`.
3. Distance to the shape (an SDF, or an analytic hit): step `t += max(d * 0.8, 0.004)` (hollow; bark_face uses
   `d * 0.4` because the warp bends its field), hit when `d < 0.003` to `0.004`, 90 to 150 iterations. The eye
   uses exact sphere hits (`eye.py:_sphere`, the largest root, nearest the camera).
4. **Part classification:** the SDF returns `(distance, part)` so one march paints many materials. `hollow.py:_sdf`:
   0 the bark plane (not drawn, the scene's own bark shows), 1 woundwood lip, 2 cavity wall, 3 floor or sill,
   4 candle, 5 slab, 6 sap drip from the roof, 7 rune cut, 8 set wax.
5. **Numeric normals** by central differences of the SDF (`eps` 0.006 in `hollow.py`, 0.008 in `bark_face.py`),
   in world space, so the moon and the lamps light the real surface.
6. **Light:** the moon (`SUN`/`MOON`, with `kit.skylit` for a cavern's shaft), then each scene light as
   `(xyz, rgb, reach)` with inverse-square falloff `1 / (1 + (d/reach)^2)`. Scenes pass their `wood_scene.LIGHTS`
   as `[((x, y, z), (0.95, 0.6, 0.32), reach * 1.4)]` and the lantern at `HERO + (0.25, -0.25)`, 0.7 yd up. See
   [light](04-light.md).
7. **Compositing:** draw a pixel only if `depth >= dep_scene - tol` (the scene's surface is not nearer) and
   `depth > zb` (no nearer ray-cast piece), then write `zb`. One shared z-buffer per family of pieces drawn in one
   layer (the Gate's `living_flesh`); the tolerance `tol` is 0.4 to 0.7 yd for solids (eye 0.4, hollow 0.5, bone
   0.5, fang 0.7), 0.06 for a vein lying on the ground, 0.35 for tendrils on bark.

**Testing hidden cavities by the ray's entry depth.** A cavity's back wall lies behind the trunk's surface, which is
what the scene's depth buffer holds, so it would always fail the depth test. `hollow.py:draw` records `t_in`, the
`t` where the ray first passed into the trunk's face (local `x < 0`), and tests cavity parts (`part >= 2`) at that
entry depth instead: the inside is seen through the opening. `bark_face.py:draw` does the same with
`min(t, t_in)`, where the ray passed the bark's own line.

**Signed-distance carving.** To cut into a surface, push the surface inward where the mark is:
`hollow.py:_sdf` takes the bark plane `xu` and, inside the rune mask, uses `min(xu + 0.05, ring)`, so the solid
begins 5 cm deeper there; the cut's walls and floor are real geometry and the raw dark flesh of the vein is painted
in it (part 7). `hollow.py:rune_mask` lays the band a hand's width outside the lips, following the pointed arch
exactly (jambs, then two lancet arcs of 2.5 W), each glyph about 4 x 5 px with whole-pixel strokes (stem, branch,
cross-stroke, chevron; neighbours never alike).

**Wrapping round a trunk.** A flat frame on a round trunk runs off its edge. Two ways:
- `hollow.py:draw(..., axis, rc)`: the local frame becomes cylindrical, `(r - r0, angle * r0, z)`, so the opening
  wraps the trunk; flames are placed round the trunk too;
- `bark_face.py:draw(canon, ...)`: every ray point is sent through the scene's `canon(x, y, z)` (the wind's lean
  undone, then `vein_tree.Warp.to_canon_one`), and the relief is added to the trunk's own lobed, channelled radius
  (`vein_tree._lobe`, `_channels`), so it sits exactly on the warped bark. See [the warped column](03-warped-column.md).
- Draw a relief only where it rises or sinks (`bark_face.py`: `|f| > 0.003`, the seams, or pixels an `extra`
  painter changed): drawing its whole window paints a visible patch of different bark.

**Organic forms built on this method:** the eye (lid shell 1.13 R with an almond opening, ball R, cornea 0.5 R set
0.66 R forward, rays refracted at index 1.34 onto the iris plane), the fang (oval section, ridges and keel, its
height field sampled from the same SDF for shadows), bone (`bone.py:_tube` along a polyline, `_skull` by smooth
unions), vessels (`vessel.py`: dense lit spheres along a 3D path that dives under the ground and is hidden there by
depth), hollows and the altar (`hollow.py`), grown reliefs (`bark_face.py` with `relief_fn`).

## What worked
- The eye: D- as a painted ellipse, B+ as a ray-cast ball with lids, cornea and refraction (passes 26 to 39).
- Sinking: the eye's ball centre 0.12 R above its socket; the tree eyes sunk to 0.72 R so only the bulge stands out
  (eye tree pass 2: "they read as eyes").
- Thickness shows a lid: a lid shell standing proud of the ball (1.13 R) made the far lid visible.
- Hollows facing the camera, leaning a little into the glade; the cavity's visibility tested at `t_in` (hollow
  pass 6): "the niche glows deep in its trunk".
- The pointed arch: the cavity follows the arch straight back (`max(cav, (rho - 1) * ...)`), so the opening is the
  arch, not the bowl behind it.
- One shared z-buffer and a depth tolerance against the scene: nearer trunks hide the pieces, and the pieces hide
  each other correctly.

## What failed, and why
- **The tube SDF overshoot bug** (Gate pass 50): the rib's distance used only the perpendicular offset, so every
  point measured against the fat end head; the rib read as "a dark brown gable, all sinew". Fix in `bone.py:_tube`:
  `max(ellipse distance, along-segment overshoot)`. Any polyline SDF must count the overshoot along each segment.
- **Carving written backwards** (runes, 2026-10-07): the first cut left the bark solid where the cut should be.
  Carving moves the surface inward inside the mark; check the sign on a test strip first.
- **The band round the curve**: laid in a flat frame, the rune band ran a yard out round the trunk's curve. It must
  follow the opening in the hollow's own frame.
- **Strokes smaller than a pixel**: the first runes' strokes were a third of a pixel and vanished. A rune at this
  scale is a 4 x 5 px glyph with whole-pixel strokes (see [values](05-values-ramps-dither.md)).
- **Off-screen windows**: the high tree eye at 6.3 yd was out of frame (moved to 4.5 yd); the mouth sat behind the
  left foreground trunk; the niche first faced away and the mouth was seen edge-on. Check every placed piece's
  screen point before judging it. `bark_face.py` computes its window from an approximate facing with a 30 px margin;
  if the warp turns the face more than that, it is clipped.
- **The flat face on a round trunk** (hollow pass 4): the mouth ran off the trunk's edge until the frame wrapped
  round the cylinder.
- **The round cavity cut the hole, not the arch**: the opening stayed round until the cavity followed the arch.
- **A ball resting on the ground** read as a helmet; a gaze pointed at the camera stared.
- **Stamped height and ray-cast twin disagreeing** (Gate pass 64): the columns' ground was read after they were
  stamped, so each shaft began on top of itself. Read the ground before stamping.
- **`np.where` evaluates both branches** on the whole array: guard divisions and NaNs where rays miss.
- **Ghosts on key pieces**: a plinth's see-through ghost lay over the eye. Give key pieces room.

## Derek's rulings and grades
- 2026-10-07: "Eye is rated at d- needs a ton more work"; after passes 25 to 39, "Eye looks great, document it",
  graded B+. The eye is approved; changes must keep or raise it (`eye.py`).
- 2026-10-07: "the eye should be 3 dimensional and slowly blink a pus filled blink"; "elliptical and seen slightly
  from the side, looking up, so we can see the vitreous fluid transparency"; "more bulbous".
- 2026-10-07, on the tree eyes: "if you're going to put eyeballs on a tree they need to be spaced out pretty well.
  So like maybe two eyeballs oriented differently on the tree, bulbous, slowly slowly blinking or looking around
  and/or both".
- 2026-10-07: "on a different tree, create a mouth that looks like a hollow"; "candles inside the hollow of another
  tree with depth so you can see it glowing"; later, "really like the candles in the tree".
- 2026-10-07, on the Blind Face (pass 2): "The face needs a ton of work. Looks like the chad face." Then: "Make it
  look like a withered, wretched moaning face ... Better yet, no face, scratch it from the lore too."
- 2026-10-07: "hate the eyes, instead carve a ring of dark runes into the flesh of the tree around the hollow".
- 2026-10-07: "the bone sucks too, I agree"; after pass 61, "A+ on the gore".

## Used by
- Landkit: `eye.py`, `fang.py`, `bone.py`, `beast_bones.py`, `vessel.py`, `hollow.py`, `bark_face.py`, `column.py`,
  `gate.py`, `gore_pillar.py`.
- Scenes: `tools/art_study/flesh_scene.py` (eye, fangs, rib and skull, vein, columns, gate),
  `tools/art_study/vigil.py` (`tree_eyes`, `draw_hollows`, `draw_bones`, `blood_tendrils`, `draw_lids`),
  `tools/art_study/wood_pale.py:tree_eyes` (the weeping sockets in every wood-engine scene).

## Sources
- [Report 1](../../reports/01-gate-in-the-flesh.md): techniques 1 to 5, 15, 19; the failed-techniques table; bugs
  and traps
- [organic_notes.md](../../../landkit/passes/organic_notes.md) (the eye in full)
- Pass logs: [flesh_scene.md](../../../landkit/passes/flesh_scene.md) (passes 26 to 50),
  [vigil.md](../../../landkit/passes/vigil.md) (eye tree, hollows, altar, runes)
- [Chapter 7: faces in trees](../../chapters/07-faces-in-trees.md); [chapter 5](../../chapters/05-cut-wood-and-stumps.md)
- [STUDY.md](../../STUDY.md) round 6 (depth: occlusion, light from within)
