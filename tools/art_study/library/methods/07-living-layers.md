# Living layers

Every scene is still alive: it is rendered as a seamless loop in which the trees lean in the one wind, flames
flicker, glows breathe, eyes blink and look about, fog drifts, rain falls and the canopy's flecks move. Each motion
is a periodic function of the loop's time, each layer keeps its own fixed random sequence, rigid things move a whole
pixel at a time so nothing shimmers, and the layers are drawn in a set order round the scene's grade. Use this page
for every animated scene, object and effect, and before showing any loop.

## The rule
- [PAINTED_STANDARD](../../../../docs/PAINTED_STANDARD.md) rule 8, "Still alive": everything moves a little in the
  one wind (`core/gust.gd`); glows breathe. Checklist line 10: "nothing pasted".
- [MASTER_RULES](../../../../docs/MASTER_RULES.md) 2b.0: animation and movement (wind and gusts, grass, flames,
  drifting mist, spores and leaves, breathing glows) are assets, each made to perfection in graded passes.
- MASTER_RULES section 6: effects are lit by the scene and live in it.

## How it is done
**The loop.** `tools/art_study/wood_scene.py:animate(out, n=24)`: 24 frames, `t = i / n`, 110 ms a frame (a loop
of 2.64 s), saved as a lossless animated WebP plus a PNG of frame 0. For each frame the scene is re-cast with the
trees' lean (`cast(W, t)`), then shaded, painted and given its living layers; the Ossuarch idles through his eight
frames (`i % 8`).

**Every motion periodic in T.** A term is seamless only if it returns to its start at T = 1:
- `sin(2 * pi * k * T + phase)` with whole numbers `k`: the lantern's breath `1 + 0.09 sin(2) + 0.05 sin(5) +
  0.04 sin(11)` cycles a loop; a light's flicker `1 + 0.12 sin(3) + 0.06 sin(7)`; the canopy's sway
  `(cos(2 pi t) * 0.9, sin(2 pi t) * 0.6)`; fog's two layers slide round a circle (`fog.py`);
- `(T * k + phase) % 1` with whole `k`: rain falls `FALLS = 3` times a loop (`rain.py`); the vessel's pulse
  `(s * 0.5 - T * 2) % 1` (`vessel.py`);
- a wrapped distance for one-off events: `gust(T)` uses `min(|T - 0.6|, 1 - |T - 0.6|)`; a blink
  `((T + ph) % 1) - 0.8`, opened as `clip(1 - |tb| / 0.11)^0.7` (`vigil.py:tree_eyes`); a wisp lives
  `((T + ph) % 1) / 0.3` (`wisp_fire.py`);
- a drifting field that cannot cycle is cross-faded: `wood_scene.py:drift(fn, T)` returns
  `fn(T) * (1 - T) + fn(T - 1) * T`, so frame 0 and the last frame meet.

**Per-layer fixed random sequences.** Every layer seeds its own generator, the same every frame:
`np.random.default_rng(101)` for the fresh fall, 202 ferns, 303 grass, 404 saplings, 505 fungi, 606 and so on in
`wood_scene.py:living`; scene layers likewise (`vigil.py`: 44 for the wax runs, `700 + ti * 13 + k` per tendril,
171 for the three lights). A layer draws all its randomness up front, before any test that could skip a draw.

**Trees lean in whole pixels.** `wood_scene.py:lean(x, y, z, t)`: a slow sway, each tree in its own phase, much more
in the gust, little at the foot and most at the crown (`A * clip(z / 10, 0, 1.6)^2`). The lean is rounded so its
screen shift is a whole number of pixels: `px_shift = round(1.414 * k * KX)`. The wood moves rigidly a pixel at a
time and its bark never resamples (on a thin trunk a sub-pixel lean resampled most of the tree each frame). Anything
on a trunk moves with it: `draw_hollows`, `tree_eyes` and `_tendril_paths` add `ws.lean(...)` at their height.

**Blinks and wandering gaze** (`vigil.py:tree_eyes`, after the approved eye's slow pus blink): each eye blinks
once a loop at its own phase (`ph` 0.08 and 0.58); its gaze wanders across (`yaw0 + 0.5 sin(2 pi (T + ph))`) and up
and down (`0.1 + 0.22 sin(2 pi (T + 1.7 ph) + 1.3)`), with a pull toward the camera (`view * 0.35`). The Gate's eye:
`clip(1 - |T - 0.62| / 0.13)^0.8`, once a loop.

**Flame flicker** (`hollow.py`, `candle.py`): `fl = 1 + 0.18 sin(3) + 0.08 sin(7)` with a per-candle phase; the
flame is 2 to 3 px, its top pixel shown only when `fl >= 1.05`; the light it casts scales its reach by the same
flicker.

**Breathing glows**: the three lights' caps `0.85 + 0.15 sin(2 pi T + 1.7 i)` (`wood_lights.py`); the pustules
breathe slowly (Gate pass 65); the lantern's breath above.

**The order of the living layers.** The engine's `living` draws its own layers (the fresh fall, ferns, grass and
saplings, bracket fungi and clusters, falling and skittering leaves, ground mist, foxfire, a wisp-fire, moonbeams,
the mist and spores lit in the beams, spores in the lantern; switchable by `FOREST_LIFE`, `GRASS`, `FERNS`, `MIST`,
`BEAMS`; see [the scene engine](08-scene-engine.md)), then
the scene's `LIVING` list in order. The ritual glade's order (`vigil.py`):
1. `wood_pale.tree_eyes` (installed first; none in this glade), `draw_bones`, `stump_blood`, `tree_eyes`;
2. with rain, `wet_world` **inserted before** `draw_hollows`, so everything before it is wetted and the hollows,
   drawn after, stay dry;
3. `draw_hollows`, `wax_pour`, `blood_tendrils`, `ground_fog`;
4. `grim`: the scene's grade, draining colour toward ash and umber except where the moon and lantern reach;
5. **after the grade, the lights**: `draw_stone_caps`, `ground_candles`, `draw_three_lights`, so small glows are
   not drained by it;
6. with rain, `draw_rain` last: drops are only seen where light catches them.
Rule: surfaces and their wetting before the grade; anything that is itself light after it.

**Checking a loop.** Render the WebP and look at it moving. Then measure: the mean absolute difference between the
last frame and frame 0 should equal the typical difference between neighbouring frames. A seam larger than a frame
step is a term that is not periodic. Also step through single frames on a zoomed crop: nothing may jump from one
place to another between frames (the "teleport"), and lit facets must not flicker (the "shimmer").

## What worked
- The stump's loop (stump pass 9): "no shimmer on the facets. The lantern breathes, the moonflecks move, the blood
  churns faintly. Graded C: alive and stable".
- Whole-pixel lean: trunks move as solid wood.
- Two eyes on one tree, each blinking at its own time with a wandering gaze (eye tree passes 1 and 2).
- Rain falling three times a loop from fixed phases, fog sliding round a circle: both loop without a seam.
- The wisp-fire's lifetime: one or two burning at a time across the loop.

## What failed, and why
- **The grass that teleported**: every living layer drew from one shared random sequence; the swaying trees changed
  which pixels earlier layers rejected, which reshuffled everything after them. Each layer now has its own fixed
  sequence, and the fallen leaves draw all their randomness up front (old-growth chapter).
- **Sub-pixel lean**: a thin trunk resampled each frame and its bark shimmered. Lean in whole pixels.
- **Reused living layers**: the old scene's falling leaves, mist and moonbeams kept playing over the glade's new
  floor (2b: animation is an asset too) until `FOREST_LIFE`, `MIST` and `BEAMS` were turned off.
- **Life left unchecked**: the Gate's rules checks marked "Life: not checked animated" from pass 40 to 48 and the
  glade "not checked as a loop since the floor changed". Check the loop every time something under it changes.
- **Seams found by reading the code (2026-10-07, not yet confirmed by render)**: these terms are linear in T, so
  frame 23 does not lead back into frame 0:
  - `blood.py:shade`: the churn (`T * 0.15`, `T * 0.1`) and the glints (`T * 0.4`);
  - `fen_ground.py:paint`: clots (`T * 0.05`), skin (`T * 0.02`), moon dabs (`T * 0.1`), water (`T * 0.05`,
    `T * 0.3`);
  - `hollow.py:draw` (the mouth's gleam, `T * 0.6`) and `bark_face.py:draw` (`T * 0.4`);
  - `rain.py:wet`: the stemflow beads (`T * FALLS * 0.6` = 1.8 a loop, not a whole number);
  - `wisp_fire.py` (the tear, `T * 18`) and `wood_scene.py:paint` (the water glint, `- t`).
  Most are small, slow drifts; fix them with `drift`, with whole-number cycles, or by sliding round a circle as
  `fog.py` does, then measure the seam.

## Derek's rulings and grades
- 2026-10-07, on the eye: "3 dimensional and slowly blink a pus filled blink then drips into the pool"
  (organic_notes, the eye's brief).
- 2026-10-07, on the tree eyes: "bulbous, slowly slowly blinking or looking around and/or both"; earlier, the bark's
  eyes "overlap and they shouldn't ... that same three-dimensional blinking quality ... true for basically any organic
  stuff."
- 2026-10-07: "update the workbench with an animated picture of the area" (the Gate).
- 2026-10-07: "an animated image of this scene at night with a gentle breeze blowing and a very light rain".

## Used by
- Engine: `tools/art_study/wood_scene.py` (`animate`, `lean`, `gust`, `drift`, `living`, `LIVING`).
- Scenes: `vigil.py` (the order above, `gentle_gust`), `flesh_scene.py` (blink, pus runs, pulse, breathing
  pustules), `wood_pale.py` (`tree_eyes`).
- Landkit: `eye.py`, `hollow.py`, `candle.py`, `wood_lights.py`, `wisp_fire.py`, `rain.py`, `fog.py`, `vessel.py`,
  `blood.py`.

## Sources
- [Old-growth chapter](../../ecosystems/old_growth_forest.md): living layers and light, "Grass that teleported"
- [vigil.md](../../../landkit/passes/vigil.md): stump pass 9, the eye tree, night rain
- [flesh_scene.md](../../../landkit/passes/flesh_scene.md) rules checks at 40 and 48; [organic_notes.md](../../../landkit/passes/organic_notes.md)
- [STUDY.md](../../STUDY.md) round 13, motion pass
- [PAINTED_STANDARD](../../../../docs/PAINTED_STANDARD.md) rule 8
