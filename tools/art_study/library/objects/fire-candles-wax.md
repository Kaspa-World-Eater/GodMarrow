# Fire, candles and wax

Fire in Godmarrow is small, warm and local: the pilgrim's lantern, candles in a tree's hollow, banked offering-fires at
the Gate's posts ("Bank it, Tam. Ash over the coals"), and, in combat, fire that runs over dry litter and takes dead
wood. In the ritual glade the candles never burn down: long ago the rites to bring the god back up out of the earth
were held there, and the wax is the trees' red sap, dripping from the hollow's roof and setting as it falls. Sap or
blood? Nobody knows. One law over all of it: **no red light** (MASTER_RULES 6). This page covers the candles and flames
of `hollow.py` and `candle.py`, red wax and centuries of it, soot, `wisp_fire.py`, `fire_study.py` and the effects
library's fire.

## The real thing
- **Fire** (`fire_study.py`, from Blasphemous, Dead Cells and Diablo II's fire walls): a wide base hugging its fuel,
  brightest and most solid there, narrowing unevenly; torn into licks by turbulence that rises faster than the flame,
  each lick stretching and thinning and breaking off near the top; colour by heat (a small white-yellow core low in the
  middle, yellow, orange, a red edge, the coolest tips darkening into smoke); ragged edges, see-through only where thin
  and cool; the turbulence racing up, the base breathing slowly, the whole leaning more the higher it is.
- **A candle at true scale** is a few pixels: a wax column two pixels wide, a teardrop flame of two or three.
- **Candles in a niche** leave wax runs over the sill and soot on the roof above the flames; centuries leave mounds of
  set wax where it ran, stalagmites under the drips, and a plume of soot up the bark above the opening, narrowing
  upward.
- **The effects library's lesson** (STUDY): a column at full heat saturates to one tone; the hot core must be narrow and
  the body torn by a second, faster noise, or it reads as a solid bar.

## How it is made
**Candles in a hollow** (`tools/landkit/hollow.py:draw(..., kind, candles)`): each candle a real cylinder in the
hollow's SDF, `(across, height, radius, depth, base)`; wax `R_WAX` (cream, the niche) or `R_REDWAX` (`#1c0507` to
`#b83a36`, the altar), lit by `lum * 1.2 + 0.05`; a drip one step lighter; wax run over the sill.
- **The flame:** a teardrop of two or three pixels, white-gold at its core (`FLAME[0]` `(1.0, 0.93, 0.66)`, then
  `(1.0, 0.66, 0.24)`, then `(0.8, 0.3, 0.08)`), seen only where not hidden.
- **Flicker:** `fl = 1 + 0.18 sin(3 * 2πT + i * 1.7) + 0.08 sin(7 * 2πT + i)`, each candle its own phase; the glow
  breathes with it.
- **Light inside:** each flame lights the cavity through real normals, `k^0.8 / (1 + (d / (0.35 fl))^2)`, warm
  `(1.0, 0.62, 0.26)` (0.9 in a niche, 0.2 per candle at the altar, where there are many); many flames are rolled off
  (`warm / (1 + mean(warm))`) so the inside never goes flat orange; the moon dims with depth into the cavity.
- **Light outside:** `draw` returns `flames`; the scene adds one warm light just outside the mouth to the engine's
  `LIGHTS` (cast with shadows), so the glow spills down the bark and onto the ground; the altar's sits out over the
  ground before it (reach 3.6 yd), and the fen ground takes a warm tint only near the flames.
- **Soot:** on the niche's roof over the flames (rot darkened by 0.6); on the altar tree a plume up the bark above the
  arch (`vigil.wax_pour`, width `0.55 - hz * 0.22`, clamped 0.12 to 0.55, over 2.2 yd).

**Centuries of wax** (`hollow._sdf`, kind "altar"): six mounds of set wax on the floor where it ran; four wax stalagmites
under the roof's drips; four drips of sap seeping from the roof and setting as they fall (part 6); set wax layered on
the slab and the floor; red wax pouring over the sill in curtains down the bark (`vigil.wax_pour`: nine runs plus one
below each lip candle, some reaching the ground, gloss only where lit above 0.4) into the blood at the foot, setting in
skins and lumps.

**The rite's arrangement** (`vigil._altar_candles`): a broken ring of 13 round the rune spiral (18 percent gone),
tall at the back (`0.06 + 0.22 * back`), stubs melted low (20 percent at 0.02 to 0.04 yd); a jittered row of seven
before the slab; five on the lip (`ALTAR_SILL`) with their wax down the bark.

**A candle on the ground** (`tools/landkit/candle.py:draw(img, to_px, dep, pos, height, T, seed)`): a wax column two
pixels wide, `height * 21` px tall, lit on its left by its own flame and the lantern, shadowed right, a drip catching
the flame; a teardrop flame of 2 to 3 px with the same flicker; the wax it shed pooled at its foot; a little warm light
dithered round it (added `(0.3, 0.17, 0.07)`); hidden by whatever stands nearer.

**Wisp-fire** (`tools/landkit/wisp_fire.py`, kept, removed from the glade): a cold teardrop flame off the blood, white
core (`CORE`), pale blue-white body, dim blue-grey edge, torn at the tip, the dither only at its border; it flares,
burns about a third of the loop (`LIFE = 0.3`) and dies; a faint cold glow on the blood and a broken reflection. Never
"fireflies": the game says wisp-fire or foxfire.

**The effects library:** `shaders/ground_fire.gdshader` (fire as liquid: spreads, veins, tongues, scorch);
`ai_world.gd wildfire()` (a flame front over dry ground with the wind, scorch with dying embers);
`shaders/radiant_blaze.gdshader` (white core, gold body, torn tongues, heat shimmer); `shaders/burn.gdshader` (char,
ember cracks sized to the sprite's texel grid, crumble to ash; hold the death frame while it burns). One method: a value
field snapped to a short ramp with the 4x4 ordered dither, lit by and lighting the scene. See [effects and
weather](../methods/06-effects-and-weather.md) and [light](../methods/04-light.md).

## Variants and parameters
| Piece | Where | Key parameters |
|---|---|---|
| Niche / altar candles | `hollow.draw` | `candles` tuples, `kind`; returns `flames` for the scene's lights |
| Ground candle | `candle.draw` | `pos`, `height` (yd), `T`, `seed` |
| Wisp-fire | `wisp_fire.draw` | `wisps` `(x, y, z, phase, seed)`, `pool` |
| Study fires | `fire_study.py` | `fire_field(base_pts, height, t, wind, seed, breath)`; log fire, blaze, burning crown |

## What worked
- **Depth you can see glowing into:** the niche's orange deep in the trunk, the woundwood rim, the candles (alcove pass
  3); Derek liked it.
- **Light spilled from just outside the opening** into the engine's light list, so bark and ground take it with shadows.
- **Rolled-off warm light** with many flames, never a flat glow.
- **The rite, then centuries:** a broken ring and an uneven row, stubs, gaps, wax mounds and soot made it old.
- **The banked fires from the lore** lit the Gate's kneelers from below and solved the unlit frieze.
- **The altar as the one strong statement of light** in the glade, the worn way leading the eye to it.

## What failed, and why (traps)
- **Candlelight counted twice:** a flat orange inside the altar.
- **The first warm ground tint** turned the whole floor orange; only the ground near the flames.
- **The cathedral's flames were teardrops** with pasted tongues, all alike (`fire_study.py` was made to answer it).
- **The niche facing away, then seen edge-on** (alcove passes 1 to 2): face it to the camera, leaning a little into the
  glade.
- **The gate's red glow:** broke "no red light"; dim amber. **Red caps cast no light** for the same reason.
- **The pustules' 25 lights summed with long reach** flooded the cavern yellow: local lights stay small.
- **Wisp-fire over the blood:** not needed (Derek).
- **Added warm light stacked on warm colour** made the fangs blaze "as if on fire": halve and cap it.

## Derek's rulings and grades (verbatim)
- 2026-10-06: "your liquid fire looks good but fire comes in many forms"; the heat shimmer is the bar for detail.
- 2026-10-07: "I want some candles inside the hollow of another tree with depth so you can see it glowing."
- 2026-10-07: "Create an altar inside of a large hollow, many dripping red wax candles, wax pour out and into the blood".
- 2026-10-07: "ritualistic", then "randomize the arrangement a little more"; "a few burning on the lip ... with the wax
  dripping down the sides"; "a couple sparingly on the ground outside of it".
- 2026-10-07: "change that other tree with the weird mouth hole into a small candle alcove".
- 2026-10-07: **"really like the candles in the tree"**.
- 2026-10-07, on the wisp-fire: "I don't think it's necessary".

## Where it is used
- [The ritual glade](../environments/the-vigil.md): the altar, the Niche Candle and the mouth-turned-alcove, the
  ground candles, the wax pour, the soot.
- [Caves and the organic deep](../environments/caves-and-the-organic-deep.md): the Gate's banked offering-fires and the
  ember glow in the passage.
- [Ruins and stone](../environments/ruins-and-stone.md): the tenth trunk's candle by the church door (`ruin_scene.py`).
- The game: the fire shaders and `wildfire()`.

## Status
- **Altar (arch, runes, slab, candles, drips, wax, soot):** 12 passes, **B-**. **Candle alcoves:** 6 passes, **B-**.
  **Wax pour:** 3 passes, **C+**. **Ground candles:** 1 pass, **C** (owed nine).
- **To do (MASTER_RULES 8.3):** repaint every fire effect to the painted standard.
- **Duplicates to merge:** `candle.R_WAX`, `hollow.R_REDWAX` and `vigil.R_WAXRED` are one red wax; the flame triple
  and flicker are written out in both `hollow.py` and `candle.py`. One candle (wax, flame, flicker, light) in one place.
