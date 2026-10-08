# Light

Light tells the story and carves the form. Every scene has a cool key (the moon, from the screen's upper left) and
warm local lights (the pilgrim's lantern, candles, fires), each casting real shadows through the height field and
lighting every ray-cast piece through its normals. Light raises the value first and tints second. A scene makes one
or two strong statements of light and keeps the rest dark; the dark stays blue-black, never red, and blood is held
dark however close the lamp. Use this page for every scene and every object's shading.

## The rule
- [PAINTED_STANDARD](../../../../docs/PAINTED_STANDARD.md) rules 10 and 11: a cool key and a warm local light, each
  casting shadows, temperature tinting in steps; the light from the screen's upper left (world -x, a little +y),
  "Get this wrong and every prop reads black."
- [MASTER_RULES](../../../../docs/MASTER_RULES.md) 0.2 (the light comes from the form), checklist line 4, section 5
  (light rays by the hour), section 6 ("no red light").
- Wiki [06 art direction](../../../../docs/wiki/06-art-direction.md) section 3: motivated light, low key, restraint
  ("take light away rather than add it"), the brightest spot leads the eye, rims separate figures from the dark.
- Wiki [01 rules](../../../../docs/wiki/01-rules-and-decisions.md): "No red lighting."

## How it is done
**The moon** (`wood_scene.SUN = normalise(-0.62, 0.22, 0.75)`; `kit.MOON` the same):
- in `wood_scene.py:shade`: `ndl = clip(n . SUN)`; shadow marched 70 steps of 0.08 yd from 0.12 yd out along the
  normal (bias 0.03), shadowed pixels keep 0.12 of the key; times `moonlit`;
- `moonlit` under a canopy: `clip(0.42 + canopy * 0.75)` plus moonflecks (+0.24 where the canopy is closed) moving
  with the swaying canopy; a floor of 0.42 so forms still read under the leaves (STUDY round 13: a faithful "5% of
  daylight" left trunks as navy poles);
- a scene replaces it with `wood_scene.MOONLIT(px, py, pz, t)` and, for ray-cast pieces, `kit.SKY` (the Gate's
  cavern shaft: `flesh_scene.py:shaft`);
- the value: `v = 0.16 + moon*0.7 + skyfill + bounce + lamp*1.1 - ao*0.25` (`wood_scene.py:paint`), with a sky fill
  from above and the floor's bounce on walls.

**The lantern and LIGHTS** (`wood_scene.py:shade`):
- the lantern at `HERO + (0.25, -0.25)`, 0.7 yd above the ground; `clip(n . l)^0.7 / (1 + (d / (2.6 * breath))^2)`,
  shadowed pixels keep 0.1; `breath` is the loop's slow swell (see [living layers](07-living-layers.md));
- `wood_scene.LIGHTS`: `(x, y, z, reach)` tuples cast exactly like the lantern (24-step shadow march, 0.08 kept in
  shadow), each with its own flicker `1 + 0.12 sin(3) + 0.06 sin(7)` over the loop;
- the ritual glade's lights are placed by their source: each candle niche one light 0.3 yd out of the opening, reach
  1.6 yd; the altar one light 0.9 yd out over the ground before it, reach 3.6 yd; each ground candle reach 0.6 yd
  (`vigil.py:place_hollows`);
- ray-cast pieces take the same lights as `((x, y, z), (0.95, 0.6, 0.32), reach * 1.4)`.

**Light must ADD, then tint** (report 1, technique 18). Multiplying a dark material by a light's colour leaves it
dark. Raise the value, then tint: `bone.py` `val = (val + clip(wl, 0, 0.5) * 0.6) * occlusion`; `fang.py`
`val + clip(wl, 0, 0.5) * 0.55`; `gate.py` "light adds: dark stone lit is no longer dark". Cap the added light so it
never blazes (fang pass 70 blazed orange until the add was halved and capped).

**Highlight roll-off.** A lit facet must keep its tone rather than saturate to the ramp's top:
`v = 0.9 * (1 - exp(-1.4 v))` (`vein_stump.py:paint`). Many flames in one cavity are rolled off the same way,
`warm / (1 + mean(warm))` (`hollow.py:draw`), so they never become a flat glow.

**Warm tint on generated ground.** The engine tints objects in steps (`lamp > 0.15`: times (1.15, 1.0, 0.78);
otherwise (0.95, 0.97, 1.05)). A scene's own ground painter must add its warmth itself:
`vigil.py:fen_paint` tints only where `lamp > 0.12`, by `(lamp - 0.12) * (0.55, 0.24, 0.02)`, so only the ground
near the flames warms.

**Shafts and rays.**
- Under a canopy: a few defined moonbeams through the gap at the moon's true angle, a bright core and a clean edge
  dithered one band wide, hidden by what stands in front, a pool where each lands, mist and spores lit only inside
  (old-growth chapter). Switch: `wood_scene.BEAMS`.
- In a cavern: one shaft through a hole in the roof, the moon set high (still from the upper left) so the hole stands
  over the floor; the beam seen only against darkness, with a few soft motes; the moon's highlight, rim and glows
  gated by the shaft in every piece (`kit.SKY`).
- Rays by the hour (ecosystems README): only where a low light, an opening and something in the air meet; stepped,
  see-through bands, never a glow laid over the screen.

**One or two strong statements.** The glade's altar is the one strong light; the worn way leads the eye to it; the
lights on the ground are small and placed by cause. The Gate's moon shaft falls on the eye (the star) with the
pilgrim at its edge. Everything else is dark.

**No red light; blood held dark.** Red things smoulder in their own colour but throw no light (`wood_lights.py`:
the red caps have no glow; the Gate's red doorway glow became dim amber). Blood's light is capped: fen pools
`clip(v * 0.5, 0.04, 0.38)` and depth at half; the stump's blood `clip(light, 0, 0.55)`. See
[effects](06-effects-and-weather.md).

**Rims.** `wood_scene.RIM = (1.35, (0.025, 0.025, 0.03))`: one continuous lit line on an object's edge where it stands
in front of something deeper (depth jump over 0.3 yd). `wood_pale.install` softens it to `(1.12, (0.01, 0.015, 0.035))`
for pale trunks. Ray-cast pieces add `(1 - N . VIEW)^3` on the moon's side (`fang.py`, `bone.py`, `gate.py`), and
`bone.py` a rim where a light is behind the bone. Note: the engine's rim pass skips tags 400 and above, so the
glade's vein-trees (600+) get no engine rim.

## What worked
- The Gate as a cavern lit by one shaft (passes 62 to 64): "a scene at last: the eye glistening in the moon's shaft,
  the pilgrim at the edge of its light".
- Local lights from the story: banked offering-fires lighting the kneelers' frieze; the ember glow behind the grille
  so the bars stand black against it (passes 68, 69).
- Light adds, then tints (gate pass 69): black basalt finally read as carved stone in the fires.
- The ritual glade at B-: "the altar is the one strong statement of light; the worn way leads the eye to it".
- The roll-off on the stump's facets (stump pass 4); the hollow's rolled-off candle warmth.
- Low grazing fissure lights on the basalt walls (pass 95): form shows only where light grazes.

## What failed, and why
- **The moon from the wrong side** (STUDY round 13): rule 11 is -x and a little +y.
- **Shadow marches with no normal offset**: every trunk shadowed itself. Start the march out along the normal.
- **Multiplying instead of adding** (gate pass 69): black stone stayed black however lit.
- **Too much summed light**: 25 pustule lights with long reach flooded the cavern yellow (pass 65); their light on
  the ground then tinted the whole yard olive (pass 73). Fix: short reach, weak, halved on the ground.
- **The candlelight counted twice** (the altar): a flat orange inside the hollow.
- **The warm tint on the whole floor**: the first altar spread tinted every pixel of fen orange; it must fall off
  with the light.
- **Sky terms left on in a cavern**: the moon's highlight, rims and tip glows not gated by the shaft made every piece
  glow as under an open sky (pass 63).
- **A low moon over a roof hole**: the hole sat over the side wall, which shadowed the whole floor (pass 62).
- **Canopy light everywhere**: "the light rays and shadows from the canopy are too much"; the sliding leaf shadows are
  now only a hint (moon times 0.89 under them).
- **Red light** (the Gate's red glow, pass 23): broke the rule until a rules check found it.
- **Ketchup**: blood lit to bright red near the lantern (fangs pass 41, stump pass 1, pools pass 1).
- **Tinted rims**: rims tinted per pixel broke into cyan dashes (STUDY round 13); the x1.35 rim over warm pale bark
  made dotted red-pink rims (ruin pass 5).
- **A light that does not reach**: the rib hung 4.5 yd up stayed a dark band until it was hung within the fires'
  light (passes 99 to 101).

## Derek's rulings and grades
- Wiki 06: "Shadows bring life to a world just like light does. Cinematography is key... Lighting drives moods and
  feelings."
- 2026-10-07, after Gate pass 61: "And let's turn this into a cavern. The cinematography is lacking."
- Old-growth chapter: "the light rays and shadows from the canopy are too much … a cinematic beam of light, more
  defined … some mist may pass through or spores".
- Ecosystems README: "light rays occasionally … based on the time of day … as a rule when seed generating".
- 2026-10-07, the Hollow Wood: "i want this part to be dark and grimmer, older, with the god aspects showing up
  subtly".
- Wiki 01: "No red lighting. Ignore Midjourney's red key light; it's the tool's habit."
- 2026-10-07: the ritual glade graded B- with the altar as its one strong light.

## Used by
- Engine: `tools/art_study/wood_scene.py` (`shade`, `paint`, `SUN`, `LIGHTS`, `MOONLIT`, `RIM`, `BEAMS`).
- Scenes: `flesh_scene.py` (shaft, fires, ember glow, pustules, fissures), `vigil.py` (`place_hollows`,
  `fen_paint`, `grim`), `wood_pale.py` (`RIM`).
- Landkit: `kit.py` (`MOON`, `SKY`, `light`, `rim`), `eye.py`, `fang.py`, `bone.py`, `gate.py`, `hollow.py`,
  `vein_stump.py`, `candle.py`, `wood_lights.py`, `fog.py`.

## Sources
- [Report 1](../../reports/01-gate-in-the-flesh.md), techniques 16 to 18, 20
- [flesh_scene.md](../../../landkit/passes/flesh_scene.md) passes 23, 62 to 74, 95, 99 to 103
- [vigil.md](../../../landkit/passes/vigil.md): the stump's roll-off, the altar's bugs, the critique acted on
- [Old-growth chapter](../../ecosystems/old_growth_forest.md), "Light, refined"; [ecosystems README](../../ecosystems/README.md)
- [Chapter 4](../../chapters/04-stone-and-caves.md) section 1 (light in a cave); [STUDY.md](../../STUDY.md) rounds 6, 13
- [ruin_scene.md](../../../landkit/passes/ruin_scene.md) passes 5, 6
