# Effects and weather

Effects (blood, fire, wax, wisp-fire, fog, rain) are made by one method: a value field snapped to a short ramp with
the ordered dither, in whole world pixels, lit by the scene's own light and lighting it where they glow. They live
in the world: they run downhill over real surfaces, pool level, stain, soak in, set, and are hidden by what stands
nearer. Weather happens in the world, not on it: every drop lands somewhere and does something there by material.
Use this page for every effect, every liquid and every kind of weather or air.

## The rule
- [MASTER_RULES](../../../../docs/MASTER_RULES.md) section 6: weather IN the world (rain wets and runs, canopy
  shelters, rain seen only where lit, wind moves what it touches, snow settles on tops, fog lies in the lows); one
  method under all effects; restrained, no glow for its own sake, no red light; effects run, pool, stain and are lit.
- MASTER_RULES 2b.0: environmental conditions, weather and animation are assets like objects, made in graded passes.
- MASTER_RULES 5: "Sap is dark blood, everywhere in the world": deep red-black, glossy where fresh, crusted brown
  where old.
- [PAINTED_STANDARD](../../../../docs/PAINTED_STANDARD.md) rule 3 (pigment pools at the wet edge, then a lit lip) and
  rule 5 (highlights a loaded brush dragged across, never square dabs).

## How it is done
**The effects method** (STUDY, effects library): a flowing value field (warped fbm) snapped to a short ramp through
the 4x4 ordered dither, in whole world pixels, lit by and lighting the scene. The liquid fire (`shaders/ground_fire.gdshader`)
and the heat shimmer are the bar for detail. Size noise to the sprite's own texel grid; hold a creature's death frame
while an effect plays on it; a pool must run out past the body that hides it.

**Blood** (`tools/landkit/blood.py`, the same as `shaders/blood_pool.gdshader`, one blood everywhere):
- `edge(px, py, seed, reach)`: a lobed seep with fingers that run further;
- `shade(depth, px, py, sx, sy, T, dry, light_side, light)`: depth (0 edge, 1 heart) plus a slow churn, through the
  Bayer, onto four tones (`C0` clot near-black to `C3` lit red); drying browns it and cracks its edge; a wet rim on
  the side toward the lantern; glints; then `* (0.35 + light * 0.75)`, lit only by what lights it;
- **the lake test's rules** for pools (`fen_ground.py:paint` with `depth`): the pigment pooled dark at the wet edge
  (`depth < 0.12` set to `C0 * 0.9`), clots drifting (`fbm > 0.68` where `depth > 0.25`), a skin wrinkling slowly,
  the moon in it as **dull broken dabs** (two thresholded noises, a dull red-grey), the shore's lip stained; light
  capped (`clip(v * 0.5, 0.04, 0.38)`) and depth halved: dark blood;
- blood that travels: `vein_stump.py` traces each bore's blood downhill over the real height field to pool at the
  foot; `paint_blood` soaks it in at its edges (alpha `B * 1.8`), never a block.

**Wisp-fire** (`tools/landkit/wisp_fire.py`, made then removed from the glade by Derek, kept as an asset): a cold
teardrop flame (white core, pale blue-white body, dim edge) torn at its tip by moving noise, dithered only at its
border; it flares, burns 0.3 of the loop and dies (`LIFE`); a faint cold glow and a broken reflection on the blood
beneath; seven over the deepest blood, one or two burning at a time. The game calls it wisp-fire, never an animal word.

**Candles and wax** (`tools/landkit/candle.py`, `hollow.py`, `vigil.py:wax_pour`):
- red wax (`R_WAXRED`, six tones from #1c0507 to #b83a36), lit only where light reaches (`v = lit * 0.55 + 0.04`);
- a ground candle is a 2 px column lit on its left, a drip catching the flame, a 2 to 3 px teardrop flame, a dithered
  warm glow, shed wax pooled at its foot;
- altar candles arranged as a rite arranges them, then centuries of it (`_altar_candles`): a broken ring round the
  rune spiral (13 places, 18 percent gone, one in five a stub melted low, taller at the back), a jittered row before
  the slab, a few on the lip with wax running down the bark below each;
- pours: nine curtains over the sill down the bark plus one below each lip candle, some reaching the ground, a gloss
  line only where lit; where it meets the blood at the foot it **sets in skins and lumps** on the pool;
- centuries of burning: mounds of set wax on the hollow's floor, wax stalagmites under the roof's drips, sap dripping
  from the roof and setting as it falls (the candles never burn down), soot on the roof and a plume of soot climbing
  the bark over the arch, narrowing upward.

**Rain in the world** (`tools/landkit/rain.py`; `vigil.py:draw_rain`, `wet_world`; run
`python vigil.py OUT.webp rain`):
- **shelter**: `drops(seed, centre, n, span, top, openness)` keeps drops by canopy openness (`0.18 + op * 0.82`);
  under the leaves (`op < 0.45`) they are sparse heavier drips;
- **seen only where lit**: a drop is drawn as a short slanting streak only where `light(x, y, z) >= 0.08` (the
  lantern, `LIGHTS`, the moon where the canopy opens); dark air shows nothing;
- **landing by material**: on blood a ring opening and fading, flattened by the view, its far rim catching the
  light; on ground, stump, stone or bone a small crown of beads, only where lit; nothing where it lands behind
  something;
- **wet surfaces** (`rain.wet`, before the grade): every rained-on surface 12 percent darker; flat wet tops catch
  the lantern warm and the moon cool in **broken dabs**; **stemflow**: water films down the trunks' channels with
  beads trickling down where lit;
- **dry hollows**: `wet_world` is inserted before `draw_hollows`, so the niches and the altar are drawn after the
  wetting and stay dry;
- **seamless**: each drop falls `FALLS = 3` times a loop from a fixed phase; the wind slants every drop the same way.

**Retired 2026-10-08 (no fog or mist layers; Derek on the bog's fog: "its ugly"):** the fog below is kept for the
record only. **Fog lies in the lows** (`tools/landkit/fog.py`; `vigil.py:ground_fog`): density from two fbm layers sliding
round a loop, times `low` (how far the resting ground lies below its blur, plus the blurred pools), times `above`
(thinning up to 0.8 yd above the ground, so it never climbs the trunks); three alpha steps (0.05, 0.11, 0.2),
dithered only at the thin edge; coloured by the moon and warm near the lantern and candles.

**Wind** (`wood_scene.py:gust`, from the game's `core/gust.gd`): one wind, a steady breath and once a loop a gust
`1 + 1.6 exp(-(d / 0.09)^2)` round T = 0.6. A gentle breeze for a calm render replaces it
(`vigil.py:gentle_gust`: `1 + 0.45 exp(-(d / 0.14)^2)`, set as `ws.gust`). The trees lean with it, the fog and
rain slant with `wind = (0.3, -0.3)`.

## What worked
- "A+ on the gore" (Gate, after pass 61): the flesh, the vein, the eye's pus and pool, the fangs' blood.
- The blood along the vein in the game's own effect (pass 91): seeping in lobes and fingers and down the cracks,
  wet at its heart and toward the lantern, drying brown and cracked at its edges.
- Pus and blood that travel over real surfaces with a wet trail behind each drop (report 1, technique 5).
- The blood pools, held dark: "dark blood, clots and dull moon dabs" (C).
- The altar's wax and soot: the glade's altar at B- after 12 passes; the candle alcoves at B-.
- Rain in the world (B-): water runs down the trunks, drops show in the lantern's pool and the gap, the ground darker.
- Fog in the lows (C+): calm, low, lit by the moon and warm near the candles.

## What failed, and why
- **Ketchup**: bright red blood near the lantern (fang pass 41, stump pass 1, pools pass 1). Real old blood is dark
  red-black and thin. Fix: cap the light, halve the depth, soak edges.
- **Blood pooling on a slope**: the stump's trace stuck on the face and pooled in bright blobs. Liquid pools only on
  the ground; a liquid surface is level (the Gate's pool on the socket's folds read as a gold bell).
- **The pool as a dithered block** (stump passes 5 to 10): fixed by soaking in at its edges.
- **Pus as broad gold bands**: a gold sign or rug (Gate passes 33 to 38). Fine, dull, sour, the edge soaked in.
- **Drips as straight lines through the air**: read as scratches. Every drop rides the surface.
- **Rain without its work** (first build, graded C as a still): lit streaks and rings on the blood, but no canopy
  shelter, no crowns elsewhere, nothing wet and no stemflow, so it sat on the picture. Derek's law followed, and the
  rebuild added all of them.
- **The warm altar light on the whole floor**: tinted the fen orange; it must fall off with the light.
- **The pustules' light** flooding the cavern yellow (pass 65): too many long-reach lights summed.
- **Reused air**: the old scene's mist, moonbeams and falling leaves played over the new glade until switched off
  (`MIST`, `BEAMS`, `FOREST_LIFE`) and replaced by its own fog.
- **A starfield of dust** (Gate pass 63): motes everywhere instead of a few soft ones in the beam.

## Derek's rulings and grades
- 2026-10-06: "your liquid fire looks good but fire comes in many forms ... blood can borrow from it too. You'll need
  many types of effects and animations, movements".
- 2026-10-07: "Dither the blood within the blood effect along the veins"; "remember you have blood effects made
  already too".
- 2026-10-07: "Your water could definitely use a lot of work ... I want the puddles here to be blood ... I like the
  depth, but instead of the black water, let's make it dark blood with the occasional wisp of white fire flaring up."
  Then, of the wisp-fire: "I don't think it's necessary".
- 2026-10-07: "Create an altar inside of a large hollow, many dripping red wax candles, wax pour out and into the
  blood, and the first hint of the blood tendrils creeping up the tree and a tiny amount on the others."; "a few
  burning on the lip ... with the wax dripping down the sides"; "ritualistic", then "randomize the arrangement a
  little more"; "a couple sparingly on the ground outside of it".
- 2026-10-07: "an animated image of this scene at night with a gentle breeze blowing and a very light rain"; then the
  law: "weather happens in the world, not on the world."

## Used by
- Landkit: `blood.py`, `fen_ground.py`, `vein_stump.py` (`paint_blood`), `wisp_fire.py`, `candle.py`, `hollow.py`
  (altar, niche), `rain.py`, `fog.py`, `vessel.py` (tendrils).
- Scenes: `vigil.py` (`wax_pour`, `stump_blood`, `draw_rain`, `wet_world`, `ground_fog`, `ground_candles`,
  `draw_wisps` kept but off), `flesh_scene.py` (pus, pool, blood along the vein).
- Game shaders: `shaders/blood_pool.gdshader`, `shaders/ground_fire.gdshader`, `shaders/lake.gdshader`.

## Sources
- [MASTER_RULES](../../../../docs/MASTER_RULES.md) sections 5, 6, 8; [STUDY.md](../../STUDY.md) effects library
  sections
- [vigil.md](../../../landkit/passes/vigil.md): the pools become blood, the altar, night rain, the critique
  acted on
- [flesh_scene.md](../../../landkit/passes/flesh_scene.md) passes 12, 21, 29 to 39, 63, 65, 91;
  [report 1](../../reports/01-gate-in-the-flesh.md) technique 5 and the failed-techniques table
- [Chapter 5](../../chapters/05-cut-wood-and-stumps.md) section 3 (the stump that still bleeds)
